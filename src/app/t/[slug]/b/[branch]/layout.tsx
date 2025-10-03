import Link from "next/link";
import { getSupabaseServer } from "@/lib/authz";
import { paths } from "@/lib/paths";

type BranchRow = { id: string; name: string; slug: string };

export default async function TenantLayout({
  children, params,
}: { children: React.ReactNode; params: { slug: string } }) {
  const supabase = getSupabaseServer();

  const { data: branches, error } = await supabase
    .rpc("branches_for_current_user", { p_tenant_slug: params.slug });

  if (error) throw error;

  const list = (branches ?? []) as BranchRow[];

  return (
    <div className="min-h-dvh">
      <nav className="flex gap-3 border-b p-3 overflow-x-auto">
        {list.map((b) => (
          <Link key={b.id} href={paths.stock(params.slug, b.slug)} className="underline text-sm">
            {b.name}
          </Link>
        ))}
        <div className="ml-auto">
          <Link href={paths.admin(params.slug)} className="text-sm">Admin</Link>
        </div>
      </nav>
      {children}
    </div>
  );
}
