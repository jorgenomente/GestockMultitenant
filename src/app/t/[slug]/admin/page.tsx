import { redirect } from "next/navigation";
import {
  getSupabaseServiceRoleClient,
  getSupabaseUserServerClient,
} from "@/lib/supabaseServer";
import AdminPageClient from "./AdminPageClient";

export const dynamic = "force-dynamic";
export const revalidate = 0;

type Role = "owner" | "admin" | "staff";
type MembershipRow = {
  tenant_id: string;
  role: Role;
  tenants?: { slug?: string | null } | null;
};

type PageProps = { params: Promise<{ slug: string }> };

type SupabaseServerClient = Awaited<ReturnType<typeof getSupabaseUserServerClient>>;

type MembershipResult = {
  data: MembershipRow | null;
  error: unknown;
};

async function fetchMembershipForSlug(
  client: SupabaseServerClient,
  userId: string,
  slug: string
): Promise<MembershipResult> {
  const res = await client
    .from("memberships")
    .select("tenant_id, role, tenants!inner(slug)")
    .eq("user_id", userId)
    .eq("tenants.slug", slug)
    .eq("role", "owner")
    .maybeSingle<MembershipRow>();

  return {
    data: res.data ?? null,
    error: res.error ?? null,
  };
}

export default async function TenantAdminPage({ params }: PageProps) {
  const { slug } = await params;
  const supabase = await getSupabaseUserServerClient();

  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    const next = `/t/${slug}/admin`;
    redirect(`/login?next=${encodeURIComponent(next)}`);
  }

  let membership: MembershipRow | null = null;
  let membershipError: unknown = null;

  const firstAttempt = await fetchMembershipForSlug(supabase, user.id, slug);
  membership = firstAttempt.data;
  membershipError = firstAttempt.error;

  if (!membership) {
    try {
      const adminClient = getSupabaseServiceRoleClient() as SupabaseServerClient;
      const secondAttempt = await fetchMembershipForSlug(adminClient, user.id, slug);
      if (secondAttempt.data) {
        membership = secondAttempt.data;
        membershipError = null;
      } else if (secondAttempt.error) {
        membershipError = secondAttempt.error;
      }
    } catch (err) {
      membershipError = membershipError ?? err;
    }
  }

  if (!membership) {
    if (membershipError) {
      console.error(`Tenant admin guard failed for slug=${slug}`, membershipError);
    }
    redirect("/");
  }

  return <AdminPageClient slug={slug} />;
}
