// src/app/admin/page.tsx
import { redirect } from "next/navigation";
import {
  getSupabaseServiceRoleClient,
  getSupabaseUserServerClient,
} from "@/lib/supabaseServer";

export const dynamic = "force-dynamic";
export const revalidate = 0;

type Role = "owner" | "admin" | "staff";
type TenantRow = { slug: string };
type MembershipRow = { tenant_id: string; role: Role };

const ROLE_PRIORITY: Role[] = ["owner", "admin", "staff"];

function pickPreferredMembership(rows: (Partial<MembershipRow> | null | undefined)[] | null | undefined) {
  if (!rows?.length) return null;

  const valid = rows.filter((row): row is MembershipRow => {
    if (!row?.tenant_id) return false;
    if (!row.role) return false;
    return true;
  });

  if (!valid.length) return null;

  return [...valid].sort((a, b) => {
    const aIdx = ROLE_PRIORITY.indexOf(a.role);
    const bIdx = ROLE_PRIORITY.indexOf(b.role);
    return aIdx - bIdx;
  })[0];
}

export default async function AdminRedirect() {
  const supabase = await getSupabaseUserServerClient();

  // 1) Sesión
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login?next=/admin");

  // 2) Membership (prioriza owner/admin)
  const fetchMembership = async (client: Awaited<ReturnType<typeof getSupabaseUserServerClient>>) => {
    return client
      .from("memberships")
      .select("tenant_id, role")
      .eq("user_id", user.id)
      .in("role", ["owner", "admin"] satisfies Role[])
      .returns<MembershipRow[]>();
  };

  let membership: MembershipRow | null = null;
  let membershipError: unknown;
  let tenantClient: Awaited<ReturnType<typeof getSupabaseUserServerClient>> | null = supabase;

  const firstAttempt = await fetchMembership(supabase);
  membershipError = firstAttempt.error ?? null;
  membership = pickPreferredMembership(firstAttempt.data);

  if (!membership) {
    try {
      const adminClient = getSupabaseServiceRoleClient();
      const secondAttempt = await fetchMembership(adminClient);
      if (secondAttempt.error) {
        membershipError = secondAttempt.error;
      }
      const fallback = pickPreferredMembership(secondAttempt.data);
      if (fallback) {
        membership = fallback;
        tenantClient = adminClient;
        membershipError = null;
      }
    } catch (err) {
      membershipError = membershipError ?? err;
    }
  }

  if (!membership) {
    if (membershipError) {
      console.error("/admin membership lookup failed", membershipError);
    }
    // Sin membership owner/admin → regresamos al flujo general (home decide destino).
    redirect("/");
  }

  const client = tenantClient ?? supabase;

  // 3) Traer el slug del tenant (¡IMPORTANTE: .single()!)
  const { data: tenant, error: tErr } = await client
    .from("tenants")
    .select("slug")
    .eq("id", membership.tenant_id)
    .single<TenantRow>();
  if (tErr || !tenant?.slug) {
    if (tErr) {
      console.error("/admin tenant lookup failed", tErr);
    }
    redirect("/");
  }

  // 4) Redirigir al admin del tenant correspondiente
  redirect(`/t/${tenant.slug}/admin`);
}
