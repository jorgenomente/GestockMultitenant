import { createClient } from "@supabase/supabase-js";
export function getSupabaseServiceRoleClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!, // ¡solo servidor!
    { auth: { persistSession: false } }
  );
}
