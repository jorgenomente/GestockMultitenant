// src/app/api/whoami/route.ts
import { NextResponse } from "next/server";
import { getSupabaseServerClient } from "@/lib/supabaseServer";

/**
 * GET /api/whoami
 * Devuelve el usuario autenticado (vía cookies).
 */
export async function GET() {
  const supabase = await getSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  return NextResponse.json({ user });
}
