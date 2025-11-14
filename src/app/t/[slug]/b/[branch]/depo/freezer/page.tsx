import { notFound, redirect } from "next/navigation";
import DepoFreezerPageClient from "@/components/depo/DepoFreezerPageClient";
import { getSupabaseUserServerClient } from "@/lib/supabaseServer";

export const dynamic = "force-dynamic";
export const revalidate = 0;

interface RouteParams {
  slug: string;
  branch: string;
}

interface PageProps {
  params: Promise<RouteParams>;
}

export default async function DepoFreezerPage({ params }: PageProps) {
  const { slug, branch: branchSlug } = await params;
  const supabase = await getSupabaseUserServerClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect(`/login?next=/t/${slug}/b/${branchSlug}/depo/freezer`);
  }

  const { data: tenant } = await supabase
    .from("tenants")
    .select("id, slug, name")
    .eq("slug", slug)
    .maybeSingle();

  if (!tenant) {
    notFound();
  }

  const { data: branch } = await supabase
    .from("branches")
    .select("id, slug, name, tenant_id")
    .eq("tenant_id", tenant.id)
    .eq("slug", branchSlug)
    .maybeSingle();

  if (!branch) {
    notFound();
  }

  const { data: membership } = await supabase
    .from("memberships")
    .select("role, branch_ids")
    .eq("tenant_id", tenant.id)
    .eq("user_id", user.id)
    .maybeSingle();

  if (!membership) {
    notFound();
  }

  const allowedBranches = membership.branch_ids as string[] | null;
  const hasBranchAccess =
    allowedBranches === null ||
    (Array.isArray(allowedBranches) && allowedBranches.includes(branch.id));

  if (!hasBranchAccess) {
    notFound();
  }

  return (
    <DepoFreezerPageClient
      tenantId={tenant.id}
      tenantSlug={tenant.slug}
      branchId={branch.id}
      branchSlug={branch.slug}
      branchName={branch.name}
      userEmail={user.email ?? ""}
    />
  );
}
