"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { getSupabaseBrowserClient } from "@/lib/supabaseClient";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

/* ================= Tipos locales ================= */
type Branch = { id: string; slug: string; name: string; tenant_id?: string };
type Role = "owner" | "admin" | "staff";
type Membership = {
  tenant_id: string;
  user_id: string;
  role: Role;
  branch_ids: string[] | null; // uuid[] en PG -> string[] en JS
};

export default function WhoAmIPage() {
  const { slug } = useParams<{ slug: string }>();
  const supabase = getSupabaseBrowserClient();

  const [email, setEmail] = useState<string>("");
  const [role, setRole] = useState<Role | "">("");
  const [branches, setBranches] = useState<Branch[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string>("");

  useEffect(() => {
    (async () => {
      setLoading(true);
      setErr("");
      try {
        // 1) Usuario actual
        const { data: u } = await supabase.auth.getUser();
        if (!u?.user) { setErr("No hay sesión"); setLoading(false); return; }
        setEmail(u.user.email ?? "");

        // 2) Tenant por slug
        const { data: tenantRow, error: et } = await supabase
          .from("tenants")
          .select("id")
          .eq("slug", slug)
          .single();
        if (et || !tenantRow) { setErr("Tenant no encontrado"); setLoading(false); return; }

        // 3) Membership del usuario en este tenant (sin genérico, casteo luego)
        const { data: mRows, error: em } = await supabase
          .from("memberships")
          .select("tenant_id,user_id,role,branch_ids")
          .eq("tenant_id", tenantRow.id)
          .eq("user_id", u.user.id)
          .limit(1);
        if (em || !mRows || mRows.length === 0) { setErr("Sin membership en este tenant"); setLoading(false); return; }

        // Casteo defensivo
        const m = (mRows[0] ?? null) as unknown as Membership;
        setRole(m.role);

        // 4) Branches visibles (RLS hará su parte) — sin genérico, casteo luego
        const { data: bRows, error: eb } = await supabase
          .from("branches")
          .select("id, slug, name, tenant_id")
          .eq("tenant_id", tenantRow.id)
          .order("slug", { ascending: true });
        if (eb) { setErr(eb.message); setLoading(false); return; }

        const allBranches = (bRows ?? []) as unknown as Branch[];

        // 5) Si querés mostrar solo las del membership (branch_ids), filtramos:
        const onlyMine = Array.isArray(m.branch_ids) && m.branch_ids.length > 0;
        const memberBranchIds = (m.branch_ids ?? []) as string[];

        const vis: Branch[] = onlyMine
          ? allBranches.filter((b) => memberBranchIds.includes(b.id))
          : allBranches;

        setBranches(vis);
      } catch (e) {
        const message = e instanceof Error ? e.message : "Error inesperado";
        setErr(message);
      } finally {
        setLoading(false);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [slug]);

  if (loading) return <p className="p-4">Cargando…</p>;
  if (err) return <p className="p-4 text-red-600">Error: {err}</p>;

  return (
    <div className="p-4 grid gap-4">
      <Card className="shadow-sm">
        <CardContent className="p-4">
          <div className="text-sm text-muted-foreground">Usuario</div>
          <div className="text-lg font-medium break-all">{email}</div>

          <div className="mt-2 flex items-center gap-2">
            <span className="text-sm text-muted-foreground">Rol:</span>
            <Badge variant="secondary" className="capitalize">{role}</Badge>
          </div>

          <div className="mt-3 text-sm text-muted-foreground">Sucursales asignadas</div>
          <div className="mt-2 flex flex-wrap gap-2">
            {branches.map((b) => (
              <Badge key={b.id} variant="outline">{b.slug}</Badge>
            ))}
            {branches.length === 0 && <span className="text-sm">— (ninguna)</span>}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
