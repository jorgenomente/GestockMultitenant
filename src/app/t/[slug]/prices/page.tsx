// src/app/t/[slug]/prices/page.tsx
import { notFound, redirect } from "next/navigation";
import { getSupabaseUserServerClient } from "@/lib/supabaseServer";
import PriceSearch from "@/components/PriceSearch";

type Props = { params: { slug: string } };

export default async function TenantPriceSearchPage({ params }: Props) {
  const supabase = await getSupabaseUserServerClient();

  // 1) Validar tenant por slug
  const { data: tenant, error: tenantErr } = await supabase
    .from("tenants")
    .select("id, slug")
    .eq("slug", params.slug)
    .single();

  if (tenantErr || !tenant) notFound();

  // 2) Usuario autenticado → si NO, redirigir a /login con next
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    const next = `/t/${params.slug}/prices`;
    redirect(`/login?next=${encodeURIComponent(next)}`);
  }

  // 3) Verificar membresía al tenant
  const { data: memb, error: membErr } = await supabase
    .from("memberships")
    .select("user_id")
    .eq("user_id", user.id)
    .eq("tenant_id", tenant.id)
    .limit(1);

  if (membErr || !memb || memb.length === 0) notFound();

  // 4) Render del buscador
  return <PriceSearch slug={params.slug} />;
}
