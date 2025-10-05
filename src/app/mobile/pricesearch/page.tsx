// src/app/mobile/pricesearch/page.tsx
import { redirect } from "next/navigation";
import PriceSearch from "@/components/PriceSearch";
import { getSupabaseServerClient } from "@/lib/supabaseServer";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function Page() {
  // El helper devuelve Promise => usar await
  const supabase = await getSupabaseServerClient();

  // 1) Usuario autenticado
  const {
    data: { user },
    error: userErr,
  } = await supabase.auth.getUser();
  if (userErr) throw userErr;
  if (!user) redirect("/login?next=/mobile/pricesearch");

  // 2) Membership (cualquiera) para obtener tenant_id
  const { data: membership, error: mErr } = await supabase
    .from("memberships")
    .select("tenant_id, role")
    .eq("user_id", user.id)
    .order("role", { ascending: true })
    .limit(1)
    .maybeSingle();
  if (mErr) throw mErr;

  // 3) Resolver slug del tenant o usar fallback
  let slug = process.env.NEXT_PUBLIC_DEFAULT_TENANT_SLUG || "demo";
  if (membership?.tenant_id) {
    const { data: tenant, error: tErr } = await supabase
      .from("tenants")
      .select("slug")
      .eq("id", membership.tenant_id)
      .single();
    if (tErr) throw tErr;
    if (tenant?.slug) slug = tenant.slug;
  }

  // 4) Render: PriceSearch necesita slug
  return <PriceSearch slug={slug} />;
}
