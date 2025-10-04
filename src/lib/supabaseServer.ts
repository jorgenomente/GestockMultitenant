// src/lib/supabaseServer.ts
import { cookies } from "next/headers";
import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { createClient } from "@supabase/supabase-js";

/**
 * Cliente "user-scope" (lee cookies del usuario; RLS con la sesión actual).
 * Úsalo en Server Components y Routes donde NO necesites escribir cookies.
 */
export async function getSupabaseUserServerClient() {
  const cookieStore = await cookies(); // en tu proyecto es Promise<ReadonlyRequestCookies>
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return cookieStore.get(name)?.value;
        },
        // En RSC no escribimos cookies
        set() {},
        remove() {},
      },
    }
  );
  return supabase;
}

/**
 * Cliente "route" (lectura/escritura de cookies).
 * Úsalo en Route Handlers cuando necesites signIn/signOut (set/remove cookies).
 */
export async function getSupabaseRouteClient() {
  const cookieStore = await cookies(); // mutable en routes en tu tipado
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

/**
 * Cliente "service role" (SERVER ONLY).
 * Bypassa RLS; no usa cookies. NUNCA lo importes en componentes cliente.
 */
export function getSupabaseServiceRoleClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
  return createClient(url, serviceKey, {
    auth: { persistSession: false },
    global: { headers: { "X-Client-Info": "gestock-server" } },
  });
}

/**
 * Alias retrocompatible: muchas partes esperan `getSupabaseServerClient`.
 */
export async function getSupabaseServerClient() {
  return getSupabaseUserServerClient();
}
