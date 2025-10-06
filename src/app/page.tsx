// src/app/page.tsx
import { redirect } from "next/navigation";
import {
  getSupabaseUserServerClient,
  getSupabaseServiceRoleClient,
} from "@/lib/supabaseServer";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function Home() {
  const supa = await getSupabaseUserServerClient();

  // 1) Autenticación
  const { data: { user } } = await supa.auth.getUser();
  if (!user) {
    // Importante: que el login vuelva al Home para decidir tenant
    redirect("/login?next=/");
  }

  // 2) Intento A: leer membership con el cliente del usuario (RLS)
  const { data: memUser } = await supa
    .from("memberships")
    .select("tenant_id")
    .eq("user_id", user.id)
    .limit(1)
    .maybeSingle();

  let tenantId = memUser?.tenant_id as string | undefined;

  // 3) Intento B (fallback): Service Role (bypass RLS) si no hubo datos
  if (!tenantId) {
    try {
      const admin = getSupabaseServiceRoleClient();
      const { data: memAdmin } = await admin
        .from("memberships")
        .select("tenant_id")
        .eq("user_id", user.id)
        .limit(1)
        .maybeSingle();
      tenantId = memAdmin?.tenant_id as string | undefined;
    } catch {
      // ignorar errores silenciosamente; usamos fallback abajo
    }
  }

  // 4) Resolver slug y redirigir a precios
  if (tenantId) {
    const { data: tenant } = await supa
      .from("tenants")
      .select("slug")
      .eq("id", tenantId)
      .single();

    if (tenant?.slug) {
      redirect(`/t/${tenant.slug}/prices`);
    }
  }

  // 5) Último recurso: slug por defecto
  const fallbackSlug = process.env.NEXT_PUBLIC_DEFAULT_TENANT_SLUG || "demo";
  redirect(`/t/${fallbackSlug}/prices`);
}
