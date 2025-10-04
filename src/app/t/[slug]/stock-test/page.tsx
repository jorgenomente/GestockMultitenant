"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { getSupabaseBrowserClient } from "@/lib/supabaseClient";
import { Card, CardContent } from "@/components/ui/card";

type Row = { id: string; name: string; price: number };

export default function StockTestPage() {
  const { slug } = useParams<{ slug: string }>();
  const supabase = getSupabaseBrowserClient();

  const [rows, setRows] = useState<Row[]>([]);
  const [err, setErr] = useState<string>("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      setLoading(true); setErr("");
      try {
        // tenant id por slug
        const { data: t, error: et } = await supabase
          .from("tenants").select("id").eq("slug", slug).single();
        if (et || !t) { setErr("Tenant no visible"); setLoading(false); return; }

        // productos visibles (RLS decide)
        const { data, error } = await supabase
          .from("products_test")
          .select("id,name,price")
          .eq("tenant_id", t.id)
          .order("name", { ascending: true });

        if (error) throw error;
        setRows((data ?? []) as Row[]);
      } catch (e: any) {
        setErr(e?.message ?? "Error inesperado");
      } finally { setLoading(false); }
    })();
  }, [slug]);

  if (loading) return <p className="p-4">Cargando…</p>;
  if (err) return <p className="p-4 text-red-600">Error: {err}</p>;

  return (
    <div className="p-4 grid gap-3">
      <h1 className="text-lg font-semibold">Stock test · {slug}</h1>
      <Card>
        <CardContent className="p-0">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 text-left">
                <th className="px-3 py-2">Producto</th>
                <th className="px-3 py-2">Precio</th>
                <th className="px-3 py-2">ID</th>
              </tr>
            </thead>
            <tbody>
              {rows.map(r => (
                <tr key={r.id} className="border-t">
                  <td className="px-3 py-2">{r.name}</td>
                  <td className="px-3 py-2">${r.price.toFixed(2)}</td>
                  <td className="px-3 py-2 text-xs text-neutral-500">{r.id.slice(0,8)}…</td>
                </tr>
              ))}
              {rows.length === 0 && (
                <tr><td className="px-3 py-6 text-neutral-500" colSpan={3}>Sin filas visibles</td></tr>
              )}
            </tbody>
          </table>
        </CardContent>
      </Card>
    </div>
  );
}
