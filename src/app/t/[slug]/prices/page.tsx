// src/app/t/[slug]/prices/page.tsx
import { notFound, redirect } from "next/navigation";
import {
  getSupabaseUserServerClient,
  getSupabaseServiceRoleClient,
} from "@/lib/supabaseServer";
import PriceSearch from "@/components/PriceSearch";
import PrefetchedBranchTheme from "@/components/theme/PrefetchedBranchTheme";
import {
  THEME_SETTINGS_KEY,
  sanitizeStoredTheme,
  type BranchThemeFormValues,
} from "@/lib/theme/branchTheme";

export const dynamic = "force-dynamic";
export const revalidate = 0;

type PageProps = { params: Promise<{ slug: string }> };
type Role = "owner" | "admin" | "staff";
type MembershipRow = { tenant_id: string; user_id: string; role: Role };
type MembershipQueryRow = {
  tenant_id: string;
  user_id: string;
  role: Role;
  tenants?: { id?: string; slug?: string | null } | null;
};

type TenantInfo = { id: string; slug: string };
type BranchRow = { id: string; slug: string };

const parseMembership = (row: MembershipQueryRow | null | undefined) => {
  if (!row) return null;
  const role = (row.role ?? "staff") as Role;
  const tenantId = row.tenant_id;
  const tenantObj = row.tenants ?? null;
  const tenantSlug = tenantObj?.slug ?? null;
  const tenant: TenantInfo | null = tenantSlug
    ? {
      id: tenantObj?.id ?? tenantId,
      slug: tenantSlug,
    }
    : null;

  return {
    membership: { tenant_id: tenantId, user_id: row.user_id, role },
    tenant,
  } satisfies { membership: MembershipRow; tenant: TenantInfo | null };
};

export default async function TenantPriceSearchPage({ params }: PageProps) {
  const { slug } = await params;
  const supabase = await getSupabaseUserServerClient();
  const { data: { user } } = await supabase.auth.getUser();

  let adminClient: ReturnType<typeof getSupabaseServiceRoleClient> | undefined;

  const ensureAdminClient = () => {
    adminClient ??= getSupabaseServiceRoleClient();
    return adminClient;
  };

  if (!user) {
    const admin = ensureAdminClient();
    const { data: tenantRow, error: tenantErr } = await admin
      .from("tenants")
      .select("id, slug")
      .eq("slug", slug)
      .maybeSingle<TenantInfo>();

    if (tenantErr || !tenantRow) {
      notFound();
    }

    const theme = await loadTenantTheme(admin, tenantRow.id, slug);

    return (
      <>
        {theme ? <PrefetchedBranchTheme theme={theme} /> : null}
        <PriceSearch slug={slug} canManageCatalog={false} />
      </>
    );
  }

  // 2) Intento A: membership + tenant por slug con cliente del usuario
  const { data: membershipRow } = await supabase
    .from("memberships")
    .select("tenant_id, user_id, role, tenants!inner(id, slug)")
    .eq("user_id", user.id)
    .eq("tenants.slug", slug)
    .maybeSingle<MembershipQueryRow>();

  let parsed = parseMembership(membershipRow);
  let membership = parsed?.membership ?? null;
  let tenant = parsed?.tenant ?? null;

  // 3) Intento B: Service Role (bypass RLS) si no hubo datos
  if (!tenant) {
    try {
      const admin = ensureAdminClient();
      const { data: serviceRow } = await admin
        .from("memberships")
        .select("tenant_id, user_id, role, tenants!inner(id, slug)")
        .eq("user_id", user.id)
        .eq("tenants.slug", slug)
        .maybeSingle<MembershipQueryRow>();
      parsed = parseMembership(serviceRow ?? null);
      membership = parsed?.membership ?? membership;
      tenant = parsed?.tenant ?? tenant;
    } catch {
      // ignorar y caer a fallback por slug
    }
  }

  // 4) Si aún no tenemos tenant, verificar existencia y opcionalmente crear membresía por slug por defecto
  if (!tenant) {
    const admin = ensureAdminClient();
    const { data: tenantRow, error: tenantErr } = await admin
      .from("tenants")
      .select("id, slug")
      .eq("slug", slug)
      .maybeSingle<TenantInfo>();

    if (tenantErr || !tenantRow) {
      notFound();
    }

    tenant = tenantRow;

    const fallbackSlug =
      process.env.NEXT_PUBLIC_DEFAULT_TENANT_SLUG ||
      process.env.DEFAULT_TENANT_SLUG ||
      "";

    if (!membership && fallbackSlug && slug === fallbackSlug) {
      try {
        const upsert = await admin
          .from("memberships")
          .upsert(
            {
              tenant_id: tenant.id,
              user_id: user.id,
              role: "staff",
              branch_ids: [],
            },
            { onConflict: "tenant_id,user_id" }
          )
          .select("tenant_id")
          .maybeSingle();

        if (upsert?.data?.tenant_id) {
          membership = {
            tenant_id: upsert.data.tenant_id,
            user_id: user.id,
            role: "staff",
          } satisfies MembershipRow;
        }
      } catch {
        // Ignorar; caerá en redirect a missing-membership
      }
    }

    if (!membership) {
      redirect("/missing-membership");
    }
  }

  // 5) Render
  const canManageCatalog = membership?.role === "owner" || membership?.role === "admin";
  return <PriceSearch slug={slug} canManageCatalog={canManageCatalog} />;
}

async function loadTenantTheme(
  admin: ReturnType<typeof getSupabaseServiceRoleClient>,
  tenantId: string,
  tenantSlug: string
): Promise<BranchThemeFormValues | null> {
  try {
    const { data: branches, error: branchesError } = await admin
      .from("branches")
      .select("id, slug")
      .eq("tenant_id", tenantId)
      .order("created_at", { ascending: true });

    if (branchesError) {
      console.error("[prices] branch lookup error", branchesError);
      return null;
    }

    const branchList = (branches ?? []) as BranchRow[];
    if (!branchList.length) {
      return null;
    }

    const fallbackBranch = branchList[0];
    const matchingBranch = branchList.find((branch) => branch.slug === tenantSlug) ?? fallbackBranch;

    const theme = await fetchThemeForBranch(admin, tenantId, matchingBranch.id);
    if (theme) return theme;

    const globalTheme = await fetchGlobalTenantTheme(admin, tenantId);
    return globalTheme;
  } catch (error) {
    console.error("[prices] tenant theme error", error);
    return null;
  }
}

async function fetchThemeForBranch(
  admin: ReturnType<typeof getSupabaseServiceRoleClient>,
  tenantId: string,
  branchId: string
): Promise<BranchThemeFormValues | null> {
  const { data, error } = await admin
    .from("app_settings")
    .select("value")
    .eq("tenant_id", tenantId)
    .eq("branch_id", branchId)
    .eq("key", THEME_SETTINGS_KEY)
    .maybeSingle<{ value: Record<string, unknown> | null }>();

  if (error && error.code !== "PGRST116") {
    console.error("[prices] branch theme lookup error", error);
    return null;
  }

  const value = data?.value;
  if (!value) return null;
  return sanitizeStoredTheme(value);
}

async function fetchGlobalTenantTheme(
  admin: ReturnType<typeof getSupabaseServiceRoleClient>,
  tenantId: string
): Promise<BranchThemeFormValues | null> {
  const { data, error } = await admin
    .from("app_settings")
    .select("value")
    .eq("tenant_id", tenantId)
    .is("branch_id", null)
    .eq("key", THEME_SETTINGS_KEY)
    .maybeSingle<{ value: Record<string, unknown> | null }>();

  if (error && error.code !== "PGRST116") {
    console.error("[prices] global theme lookup error", error);
    return null;
  }

  const value = data?.value;
  if (!value) return null;
  return sanitizeStoredTheme(value);
}
