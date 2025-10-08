// src/app/t/[slug]/b/[branch]/orders/page.tsx
import { getSupabaseServer } from "@/lib/authz";

export default async function OrdersPage({
  params,
}: { params: Promise<{ slug: string; branch: string }> }) {
  const { slug, branch: branchSlug } = await params;
  const supabase = await getSupabaseServer();

  // Opcional: podrías obtener tenantId/branchId antes (o usar un RPC)
  const { data: tenant } = await supabase
    .from("tenants").select("id").eq("slug", slug).single();
  const { data: branchRecord } = await supabase
    .from("branches")
    .select("id")
    .eq("slug", branchSlug)
    .eq("tenant_id", tenant?.id)
    .single();

  // Listado de órdenes SOLO de esta sucursal (RLS también filtra)
  const { data: orders, error } = await supabase
    .from("orders")
    .select("id, created_at, total")
    .eq("tenant_id", tenant!.id)
    .eq("branch_id", branchRecord!.id)
    .order("created_at", { ascending: false });

  if (error) throw error;

  return (
    <main className="p-4 space-y-2">
      <h1 className="text-lg font-semibold">Órdenes · {branchSlug}</h1>
      <ul className="rounded border divide-y">
        {(orders ?? []).map(o => (
          <li key={o.id} className="px-3 py-2 flex items-center justify-between">
            <span className="font-mono text-xs">{o.id.slice(0,8)}…</span>
            <span>{new Date(o.created_at!).toLocaleString()}</span>
            <span className="font-mono">${o.total?.toFixed(2)}</span>
          </li>
        ))}
        {(orders ?? []).length === 0 && (
          <li className="p-3 text-sm text-neutral-500">Sin órdenes</li>
        )}
      </ul>
    </main>
  );
}
