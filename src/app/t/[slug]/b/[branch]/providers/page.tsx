import { notFound, redirect } from "next/navigation";
import { getSupabaseUserServerClient } from "@/lib/supabaseServer";
import ProvidersPageClient from "@/components/mobile/ProvidersPageClient";

export const dynamic = "force-dynamic";
export const revalidate = 0;

type Params = { params: { slug: string; branch: string } };

export default async function BranchProvidersPage({ params }: Params) {
  const supa = await getSupabaseUserServerClient();

  const { data: { user } } = await supa.auth.getUser();
  if (!user) {
    redirect(`/login?next=/t/${params.slug}/b/${params.branch}/providers`);
  }

  // Tenant por slug
  const { data: tenant } = await supa
    .from("tenants")
    .select("id, slug")
    .eq("slug", params.slug)
    .single();
  if (!tenant) notFound();

  // Branch por slug y que pertenezca al tenant
  const { data: branch } = await supa
    .from("branches")
    .select("id, tenant_id, slug")
    .eq("slug", params.branch)
    .single();
  if (!branch || branch.tenant_id !== tenant.id) notFound();

  // Membership del usuario en ese tenant
  const { data: membership } = await supa
    .from("memberships")
    .select("role, branch_ids")
    .eq("tenant_id", tenant.id)
    .eq("user_id", user.id)
    .maybeSingle();
  if (!membership) notFound();

  // ¿Tiene acceso a esta branch?
  const allowed =
    membership.branch_ids === null ||
    (Array.isArray(membership.branch_ids) && membership.branch_ids.includes(branch.id));
  if (!allowed) notFound();

  // OK -> render del cliente
  return <ProvidersPageClient slug={params.slug} branch={params.branch} />;
}
