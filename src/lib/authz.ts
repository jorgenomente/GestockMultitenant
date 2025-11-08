// src/lib/authz.ts
import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";

export async function getSupabaseServer() {
  const cookieStore = await cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll().map(({ name, value }) => ({ name, value }));
        },
      },
    }
  );
}

export async function getTenantBySlug(slug: string) {
  const supabase = await getSupabaseServer();
  const { data, error } = await supabase
    .from("tenants")
    .select("id, slug, name")
    .eq("slug", slug)
    .single();
  if (error || !data) throw new Error("Tenant no encontrado");
  return data;
}

export async function getBranchBySlug(tenantId: string, branchSlug: string) {
  const supabase = await getSupabaseServer();
  const { data, error } = await supabase
    .from("branches")
    .select("id, name, slug, tenant_id")
    .eq("tenant_id", tenantId)
    .eq("slug", branchSlug)
    .single();
  if (error || !data) throw new Error("Sucursal no encontrada");
  return data;
}
