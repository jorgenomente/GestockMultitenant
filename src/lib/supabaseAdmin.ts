// src/lib/supabaseAdmin.ts
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

// Server-side only (no exponer service_role al cliente)
const SUPABASE_URL =
  process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";

export const hasSupabaseAdmin = Boolean(SUPABASE_URL && SERVICE_ROLE_KEY);

let _admin: SupabaseClient | null = null;

// No arrojes si faltan envs: devolvés null y la API hará fallback a /public
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

export const supabaseAdmin = _admin;
