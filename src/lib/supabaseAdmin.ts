// src/lib/supabaseAdmin.ts
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

/**
 * Cliente Supabase con SERVICE ROLE.
 * ⚠️ Usar SOLO en servidor (API routes, server actions, cron).
 * NUNCA exponer SUPABASE_SERVICE_ROLE_KEY al cliente.
 */

const SUPABASE_URL =
  process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";

export const hasSupabaseAdmin = Boolean(SUPABASE_URL && SERVICE_ROLE_KEY);

let _admin: SupabaseClient | null = null;

if (hasSupabaseAdmin) {
  _admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
    global: { headers: { "X-Client-Info": "gestock-admin" } },
  });
}

/** Acceso directo (puede ser null si faltan env vars) */
export const supabaseAdmin = _admin;

/**
 * Helper para obtener SIEMPRE un cliente válido o lanzar error claro.
 * Coincide con tu import actual: `getSupabaseAdminClient`.
 */
export function getSupabaseAdminClient(): SupabaseClient {
  if (!_admin) {
    throw new Error(
      "supabaseAdmin no está configurado. Revisa SUPABASE_URL/NEXT_PUBLIC_SUPABASE_URL y SUPABASE_SERVICE_ROLE_KEY."
    );
  }
  return _admin;
}
