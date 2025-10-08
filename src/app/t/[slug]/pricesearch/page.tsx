// src/app/t/[slug]/pricesearch/page.tsx
import { notFound, redirect } from "next/navigation";
import PriceSearch from "@/components/PriceSearch";
import { getSupabaseUserServerClient } from "@/lib/supabaseServer";

export const dynamic = "force-dynamic";
export const revalidate = 0;

type PageProps = { params: Promise<{ slug: string }> };

export default async function TenantPriceSearchPage({ params }: PageProps) {
  const { slug } = await params;
  const supabase = await getSupabaseUserServerClient();

  // 1) Validar tenant por slug
  const { data: tenant, error: tenantErr } = await supabase
    .from("tenants")
    .select("id, slug")
    .eq("slug", slug)
    .maybeSingle();

  if (tenantErr) {
    notFound();
  }
  if (!tenant) {
    notFound();
  }

  // 2) Usuario autenticado
  const {
    data: { user },
    error: userErr,
  } = await supabase.auth.getUser();
  if (userErr) throw userErr;
  if (!user) {
    const next = `/t/${slug}/pricesearch`;
    redirect(`/login?next=${encodeURIComponent(next)}`);
  }

  // 3) Verificar membresía al tenant
  const { data: membership, error: mErr } = await supabase
    .from("memberships")
    .select("user_id")
    .eq("tenant_id", tenant.id)
    .eq("user_id", user.id)
    .maybeSingle();

  if (mErr) {
    notFound();
  }
  if (!membership) {
    notFound();
  }

  // 4) Render: PriceSearch necesita slug
  return <PriceSearch slug={slug} />;
}
