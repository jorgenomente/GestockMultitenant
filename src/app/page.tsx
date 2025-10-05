// src/app/page.tsx
import { redirect } from "next/navigation";
import { getSupabaseUserServerClient } from "@/lib/supabaseServer";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function Home() {
  const supabase = await getSupabaseUserServerClient();
  const { data: { user } } = await supabase.auth.getUser();

  const fallback = process.env.NEXT_PUBLIC_DEFAULT_TENANT_SLUG || "demo";

  // No logueado → a login con retorno a precios
  if (!user) {
    redirect(`/login?next=/t/${fallback}/prices`);
  }

  // Logueado → buscar 1 membresía válida
  const { data: membership } = await supabase
    .from("memberships")
    .select("tenant_id, role")
    .in("role", ["owner", "admin", "staff"])
    .limit(1)
    .maybeSingle();

  if (membership?.tenant_id) {
    const { data: tenant } = await supabase
      .from("tenants")
      .select("slug")
      .eq("id", membership.tenant_id)
      .single();

    if (tenant?.slug) {
      redirect(`/t/${tenant.slug}/prices`);
    }
  }

  // Fallback si no tiene memberships
  redirect(`/t/${fallback}/prices`);
}
