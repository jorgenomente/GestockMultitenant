// src/lib/authz.ts
import { cookies as _cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";

// Tipamos el store de cookies que esperamos de next/headers
type CookieStore = { get: (name: string) => { value?: string } | undefined };

export function getSupabaseServer() {
  // 👇 Forzamos el tipo de cookies() para evitar que TS lo infiera como Promise
  const cookieStore = (_cookies as unknown as () => CookieStore)();

  return createServerClient<any>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return cookieStore.get(name)?.value;
        },
        // Si en algún momento necesitás set/remove en Server Actions, podemos agregarlos aquí.
      },
    }
  );
}

export async function getTenantBySlug(slug: string) {
  const supabase = getSupabaseServer();
  const { data, error } = await supabase
    .from("tenants")
    .select("id, slug, name")
    .eq("slug", slug)
    .single();
  if (error || !data) throw new Error("Tenant no encontrado");
  return data;
}

export async function getBranchBySlug(tenantId: string, branchSlug: string) {
  const supabase = getSupabaseServer();
  const { data, error } = await supabase
    .from("branches")
    .select("id, name, slug, tenant_id")
    .eq("tenant_id", tenantId)
    .eq("slug", branchSlug)
    .single();
  if (error || !data) throw new Error("Sucursal no encontrada");
  return data;
}
