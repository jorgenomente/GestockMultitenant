// src/app/admin/page.tsx
import { redirect } from "next/navigation";
import { getSupabaseUserServerClient } from "@/lib/supabaseServer";

export const dynamic = "force-dynamic";
export const revalidate = 0;

type Role = "owner" | "admin" | "staff";
type TenantRow = { slug: string };

export default async function AdminRedirect() {
  const supabase = await getSupabaseUserServerClient();

  // 1) Sesión
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login?next=/admin");

  // 2) Membership (prioriza owner/admin)
  const { data: membership, error: mErr } = await supabase
    .from("memberships")
    .select("tenant_id, role")
    .eq("user_id", user.id)
    .in("role", ["owner", "admin"] satisfies Role[])
    .order("role", { ascending: true })
    .limit(1)
    .maybeSingle();
  if (mErr) throw mErr;

  if (!membership) {
    // Sin membership owner/admin → decide tu UX; aquí redirigimos a login otra vez
    redirect("/login?next=/admin");
  }

  // 3) Traer el slug del tenant (¡IMPORTANTE: .single()!)
  const { data: tenant, error: tErr } = await supabase
    .from("tenants")
    .select("slug")
    .eq("id", membership.tenant_id)
    .single<TenantRow>();
  if (tErr || !tenant?.slug) {
    redirect("/login?next=/admin");
  }

  // 4) Redirigir al admin del tenant correspondiente
  redirect(`/t/${tenant.slug}/admin`);
}
