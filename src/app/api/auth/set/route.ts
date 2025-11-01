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

  if (!session.access_token || !session.refresh_token) {
    try {
      await supabase.auth.signOut();
    } catch (signOutError) {
      console.warn("auth/set: signOut on missing tokens failed", signOutError);
    }
    return NextResponse.json(
      {
        ok: false,
        cleared: true,
        error: "missing_tokens",
      },
      { status: 400 }
    );
  }

  // Setear/actualizar cookies httpOnly con los tokens
  const { error } = await supabase.auth.setSession({
    access_token: session.access_token,
    refresh_token: session.refresh_token,
  });

  if (error) {
    if (error.message.toLowerCase().includes("refresh token")) {
      try {
        await supabase.auth.signOut();
      } catch (signOutError) {
        console.warn("auth/set: signOut fallback failed", signOutError);
      }
    }
    return NextResponse.json({ ok: false, error: error.message }, { status: 400 });
  }

  return NextResponse.json({ ok: true });
}
