import { notFound, redirect } from "next/navigation";
import { getSupabaseUserServerClient } from "@/lib/supabaseServer";
import PaymentsPageClient from "@/components/mobile/PaymentsPageClient";

export const dynamic = "force-dynamic";
export const revalidate = 0;

type Params = { params: Promise<{ slug: string; branch: string }> };

export default async function BranchPaymentsPage({ params }: Params) {
  const { slug, branch: branchSlug } = await params;
  const supabase = await getSupabaseUserServerClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    redirect(`/login?next=/t/${slug}/b/${branchSlug}/payments`);
  }

  const { data: tenant } = await supabase
    .from("tenants")
    .select("id, slug")
    .eq("slug", slug)
    .single();
  if (!tenant) notFound();

  const { data: branch } = await supabase
    .from("branches")
    .select("id, slug, tenant_id, name")
    .eq("slug", branchSlug)
    .single();
  if (!branch || branch.tenant_id !== tenant.id) notFound();

  const { data: membership } = await supabase
    .from("memberships")
    .select("role, branch_ids")
    .eq("tenant_id", tenant.id)
    .eq("user_id", user.id)
    .maybeSingle();
  if (!membership) notFound();

  const allowed =
    membership.branch_ids === null ||
    (Array.isArray(membership.branch_ids) && membership.branch_ids.includes(branch.id));
  if (!allowed) notFound();

  return (
    <PaymentsPageClient
      slug={slug}
      branch={branchSlug}
      tenantId={tenant.id}
      branchId={branch.id}
      branchName={branch.name ?? branch.slug}
    />
  );
}
