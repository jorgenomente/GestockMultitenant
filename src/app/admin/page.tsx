// src/app/admin/page.tsx  (SERVER COMPONENT)
import { redirect } from "next/navigation";
import { getSupabaseServerClient } from "@/lib/supabaseServer";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function AdminRedirect() {
  // 👇 tu helper devuelve una Promise => usar await
  const supabase = await getSupabaseServerClient();

  const {
    data: { user },
    error: userErr,
  } = await supabase.auth.getUser();
  if (userErr) throw userErr;
  if (!user) redirect("/login?next=/admin");

  const { data: membership, error: mErr } = await supabase
    .from("memberships")
    .select("tenant_id, role")
    .eq("user_id", user.id)
    .in("role", ["owner", "admin"])
    .order("role", { ascending: true })
    .limit(1)
    .maybeSingle();
  if (mErr) throw mErr;

  if (!membership) {
    const fallback = process.env.NEXT_PUBLIC_DEFAULT_TENANT_SLUG || "demo";
    redirect(`/t/${fallback}/admin`);
  }

  const { data: tenant, error: tErr } = await supabase
    .from("tenants")
    .select("slug")
    .eq("id", membership.tenant_id)
    .single();
  if (tErr) throw tErr;

  const slug = tenant?.slug || process.env.NEXT_PUBLIC_DEFAULT_TENANT_SLUG || "demo";
  redirect(`/t/${slug}/admin`);
}
