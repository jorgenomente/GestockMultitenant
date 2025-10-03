import { NextResponse } from "next/server";
import { getSupabaseRouteClient } from "@/lib/supabaseServer";
import type { AuthChangeEvent } from "@supabase/supabase-js";

type Payload = {
  event: AuthChangeEvent;
  session: { access_token: string; refresh_token: string } | null;
};

export async function POST(req: Request) {
  const supabase = await getSupabaseRouteClient();
  const { event, session } = (await req.json()) as Payload;

  // Cerrar sesión (borra cookies) si el cliente se desloguea o no hay sesión
  if (event === "SIGNED_OUT" || !session) {
    await supabase.auth.signOut();
    return NextResponse.json({ ok: true, cleared: true });
  }

  // Setear/actualizar cookies httpOnly con los tokens
  const { error } = await supabase.auth.setSession({
    access_token: session.access_token,
    refresh_token: session.refresh_token,
  });

  if (error) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 400 });
  }

  return NextResponse.json({ ok: true });
}
