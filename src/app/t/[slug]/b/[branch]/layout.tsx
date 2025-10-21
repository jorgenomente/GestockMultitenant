// src/app/t/[slug]/b/[branch]/layout.tsx
import Link from "next/link";
import { redirect } from "next/navigation";
import { getSupabaseServer } from "@/lib/authz";
import { paths } from "@/lib/paths";
import type { ReactNode } from "react";

type BranchRow = { id: string; name: string; slug: string };
type MembershipRow = { branch_ids: string[] | null; role: string | null };
type TenantRow = { id: string };

type LayoutProps = {
  children: ReactNode;
  params: Promise<{ slug: string; branch: string }>;
};

export default async function TenantLayout({ children, params }: LayoutProps) {
  // En este proyecto, params es Promise; incluye slug y branch para este path
  const { slug, branch: branchSlug } = await params;

  const supabase = await getSupabaseServer();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    const next = paths.branch(slug, branchSlug);
    redirect(`/login?next=${encodeURIComponent(next)}`);
  }

  const { data: tenantRow, error: tenantError } = await supabase
    .from("tenants")
    .select("id")
    .eq("slug", slug)
    .maybeSingle<TenantRow>();

  if (tenantError) throw tenantError;

  const tenantId = tenantRow?.id;
  if (!tenantId) {
    redirect("/missing-membership");
  }

  const { data: membershipRow, error: membershipError } = await supabase
    .from("memberships")
    .select("branch_ids, role")
    .eq("user_id", user.id)
    .eq("tenant_id", tenantId)
    .maybeSingle<MembershipRow>();

  if (membershipError) throw membershipError;

  let list: BranchRow[] = [];
  const role = membershipRow?.role ?? null;

  const branchIds = membershipRow?.branch_ids;

  if (branchIds === null) {
    const { data, error } = await supabase
      .from("branches")
      .select("id, name, slug")
      .eq("tenant_id", tenantId)
      .order("name", { ascending: true });
    if (error) throw error;
    list = (data ?? []) as BranchRow[];
  } else if (Array.isArray(branchIds) && branchIds.length > 0) {
    const { data, error } = await supabase
      .from("branches")
      .select("id, name, slug")
      .eq("tenant_id", tenantId)
      .in("id", branchIds);
    if (error) throw error;
    const byId = new Map((data ?? []).map((b) => [b.id, b] as const));
    list = branchIds
      .map((id) => byId.get(id))
      .filter((b): b is BranchRow => Boolean(b));
  } else {
    list = [];
  }

  if (list.length === 0) {
    redirect("/missing-membership");
  }

  if (!list.some((b) => b.slug === branchSlug)) {
    const fallback = list[0];
    redirect(paths.dashboard(slug, fallback.slug));
  }

  return (
    <div className="min-h-dvh">
      <nav className="flex gap-3 border-b p-3 overflow-x-auto">
        {list.map((b) => (
          <Link key={b.id} href={paths.stock(slug, b.slug)} className="underline text-sm">
            {b.name}
          </Link>
        ))}

        {role === "owner" && (
          <div className="ml-auto">
            <Link href={paths.admin(slug)} className="text-sm">
              Admin
            </Link>
          </div>
        )}
      </nav>
      {children}
    </div>
  );
}
