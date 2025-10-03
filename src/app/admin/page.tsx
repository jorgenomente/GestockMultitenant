// app/admin/page.tsx  (SERVER COMPONENT)
import { redirect } from "next/navigation";
import { getSupabaseServerClient } from "@/lib/supabaseServer";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function AdminRedirect() {
  const supabase = await getSupabaseServerClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login?next=/admin");

  const { data: membership } = await supabase
    .from("memberships")
    .select("tenant_id, role")
    .eq("user_id", user.id)
    .in("role", ["owner", "admin"])
    .order("role", { ascending: true })
    .limit(1)
    .maybeSingle();

  if (!membership) {
    const fallback = process.env.NEXT_PUBLIC_DEFAULT_TENANT_SLUG || "demo";
    redirect(`/t/${fallback}/admin`);
  }

  const { data: tenant } = await supabase
    .from("tenants")
    .select("slug")
    .eq("id", membership!.tenant_id)
    .single();

  const slug = tenant?.slug || process.env.NEXT_PUBLIC_DEFAULT_TENANT_SLUG || "demo";
  redirect(`/t/${slug}/admin`);
}
