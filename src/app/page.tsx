// src/app/page.tsx
import { redirect } from "next/navigation";
import {
  getSupabaseUserServerClient,
  getSupabaseServiceRoleClient,
} from "@/lib/supabaseServer";
import type { SupabaseClient } from "@supabase/supabase-js";

export const dynamic = "force-dynamic";
export const revalidate = 0;

type Role = "owner" | "admin" | "staff";
type MembershipRow = {
  tenant_id: string;
  role: Role;
  tenant_slug: string | null;
  branch_ids: string[] | null;
};

type MembershipQueryRow = {
  tenant_id: string;
  role: Role;
  tenants?: { slug?: string | null } | null;
  branch_ids?: string[] | null;
};

const ROLE_PRIORITY: Role[] = ["owner", "admin", "staff"];

function normalizeMembershipRows(rows: MembershipQueryRow[] | null | undefined): MembershipRow[] {
  if (!rows?.length) return [];
  return rows.map((row) => ({
    tenant_id: row.tenant_id,
    role: (row.role ?? "staff") as Role,
    tenant_slug: row.tenants?.slug ?? null,
    branch_ids: Array.isArray(row.branch_ids) ? row.branch_ids : row.branch_ids ?? null,
  }));
}

function pickPreferredMembership(rows: MembershipRow[] | null | undefined) {
  if (!rows || rows.length === 0) return null;
  return [...rows].sort((a, b) => {
    const aIdx = ROLE_PRIORITY.indexOf(a.role);
    const bIdx = ROLE_PRIORITY.indexOf(b.role);
    return (aIdx === -1 ? ROLE_PRIORITY.length : aIdx) -
      (bIdx === -1 ? ROLE_PRIORITY.length : bIdx);
  })[0];
}

async function resolvePreferredBranchSlug(
  client: SupabaseClient,
  tenantId: string,
  allowedBranchIds: string[] | null | undefined
): Promise<string | null> {
  try {
    let query = client
      .from("branches")
      .select("slug")
      .eq("tenant_id", tenantId)
      .order("name", { ascending: true })
      .limit(1);

    if (Array.isArray(allowedBranchIds) && allowedBranchIds.length > 0) {
      query = query.in("id", allowedBranchIds);
    }

    const { data, error } = await query.maybeSingle<{ slug: string }>();
    if (error) {
      console.error("resolvePreferredBranchSlug", error);
      return null;
    }
    return data?.slug ?? null;
  } catch (err) {
    console.error("resolvePreferredBranchSlug unexpected", err);
    return null;
  }
}

export default async function Home() {
  const supa = await getSupabaseUserServerClient();

  // 1) Autenticación
  const { data: { user } } = await supa.auth.getUser();
  if (!user) {
    // Importante: que el login vuelva al Home para decidir tenant
    redirect("/login?next=/");
  }

  // 2) Intento A: memberships visibles con el cliente del usuario (RLS)
  const { data: memUserRows } = await supa
    .from("memberships")
    .select("tenant_id, role, branch_ids, tenants(slug)")
    .eq("user_id", user.id);

  let membership = pickPreferredMembership(normalizeMembershipRows(memUserRows as MembershipQueryRow[] | null));
  let adminClient: ReturnType<typeof getSupabaseServiceRoleClient> | undefined;

  // 3) Intento B: Service Role (bypass RLS) si no hubo datos
  if (!membership) {
    try {
      adminClient = getSupabaseServiceRoleClient();
      const { data: memAdminRows } = await adminClient
        .from("memberships")
        .select("tenant_id, role, branch_ids, tenants(slug)")
        .eq("user_id", user.id);
      membership = pickPreferredMembership(
        normalizeMembershipRows(memAdminRows as MembershipQueryRow[] | null),
      );
    } catch {
      // ignorar errores silenciosamente; usamos fallback abajo
    }
  }

  // 4) Resolver slug y redirigir según rol
  const tenantClient = adminClient ?? supa;
  let tenantSlug = membership?.tenant_slug ?? null;

  if (membership?.tenant_id && !tenantSlug) {
    const { data: tenant } = await tenantClient
      .from("tenants")
      .select("slug")
      .eq("id", membership.tenant_id)
      .maybeSingle();
    tenantSlug = tenant?.slug ?? null;
  }

  if (membership?.tenant_id && tenantSlug) {
    const branchSlug = await resolvePreferredBranchSlug(
      tenantClient,
      membership.tenant_id,
      membership.branch_ids
    );

    if (branchSlug) {
      redirect(`/t/${tenantSlug}/b/${branchSlug}`);
    }

    const role = membership.role;
    const fallbackTarget = role === "owner" || role === "admin"
      ? `/t/${tenantSlug}/admin`
      : `/t/${tenantSlug}/prices`;
    redirect(fallbackTarget);
  }

  // 5) Último recurso: slug por defecto (crea membership staff si no existe)
  const fallbackSlug =
    process.env.NEXT_PUBLIC_DEFAULT_TENANT_SLUG ||
    process.env.DEFAULT_TENANT_SLUG ||
    null;

  if (fallbackSlug) {
    try {
      const admin = adminClient ?? getSupabaseServiceRoleClient();
      const { data: fallbackTenant } = await admin
        .from("tenants")
        .select("id, slug")
        .eq("slug", fallbackSlug)
        .maybeSingle();

      if (fallbackTenant?.id && fallbackTenant.slug) {
        await admin
          .from("memberships")
          .upsert(
            {
              tenant_id: fallbackTenant.id,
              user_id: user.id,
              role: "staff",
              branch_ids: [],
            },
            { onConflict: "tenant_id,user_id" }
          );
        const defaultBranchSlug = await resolvePreferredBranchSlug(admin, fallbackTenant.id, null);
        if (defaultBranchSlug) {
          redirect(`/t/${fallbackTenant.slug}/b/${defaultBranchSlug}`);
        }
        redirect(`/t/${fallbackTenant.slug}/prices`);
      }
    } catch {
      // ignorar y caer al mensaje de ayuda
    }
  }

  redirect(`/missing-membership`);
}
