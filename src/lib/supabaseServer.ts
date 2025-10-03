// lib/supabaseServer.ts
import { cookies } from "next/headers";
import { createServerClient, type CookieOptions } from "@supabase/ssr";

/**
 * Server Components (RSC):
 * - SOLO lectura de cookies (no set/remove).
 * - En tu versión, cookies() devuelve una Promesa -> usamos await.
 */
export async function getSupabaseServerClient() {
  const cookieStore = await cookies(); // ReadonlyRequestCookies

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return cookieStore.get(name)?.value;
        },
        // No escribir cookies en RSC
        set() {},
        remove() {},
      },
    }
  );

  return supabase;
}

/**
 * Route Handlers (app/api/.../route.ts):
 * - Aquí SÍ podemos leer/escribir cookies.
 * - En tu versión, cookies() también es async -> await.
 */
export async function getSupabaseRouteClient() {
  const cookieStore = await cookies(); // Mutable en routes

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return cookieStore.get(name)?.value;
        },
        set(name: string, value: string, options: CookieOptions) {
          cookieStore.set({ name, value, ...options });
        },
        remove(name: string, options: CookieOptions) {
          cookieStore.set({ name, value: "", ...options });
        },
      },
    }
  );

  return supabase;
}
