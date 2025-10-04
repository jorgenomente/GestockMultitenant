// src/app/api/logout/route.ts
import { NextResponse } from "next/server";
import { getSupabaseRouteClient } from "@/lib/supabaseServer";

/**
 * POST /api/logout
 * Hace signOut y limpia cookies (requiere helper con set/remove).
 */
export async function POST() {
  const supabase = await getSupabaseRouteClient();
  await supabase.auth.signOut();
  return NextResponse.json({ ok: true });
}
