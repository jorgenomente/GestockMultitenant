// src/app/t/[slug]/prices/page.tsx
import { notFound, redirect } from "next/navigation";
import { getSupabaseUserServerClient } from "@/lib/supabaseServer";
import PriceSearch from "@/components/PriceSearch";

export const dynamic = "force-dynamic";
export const revalidate = 0;

type PageProps = { params: { slug: string } };

export default async function TenantPriceSearchPage({ params }: PageProps) {
  const supabase = await getSupabaseUserServerClient();

  // 1) Validar tenant por slug
  const { data: tenant, error: tenantErr } = await supabase
    .from("tenants")
    .select("id, slug")
    .eq("slug", params.slug)
    .maybeSingle();

  if (tenantErr) {
    // Si hay error de DB, muestra 404 para no filtrar detalles
    notFound();
  }
  if (!tenant) {
    notFound();
  }

  // 2) Usuario autenticado → si NO, redirigir a /login con ?next
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    const next = `/t/${params.slug}/prices`;
    redirect(`/login?next=${encodeURIComponent(next)}`);
  }

  // 3) Verificar membresía al tenant
  const { data: membership, error: membErr } = await supabase
    .from("memberships")
    .select("user_id")
    .eq("tenant_id", tenant.id)
    .eq("user_id", user.id)
    .maybeSingle();

  if (membErr) {
    notFound();
  }
  if (!membership) {
    // Usuario logueado pero sin acceso a este tenant
    notFound();
  }

  // 4) Render
  return <PriceSearch slug={params.slug} />;
}
