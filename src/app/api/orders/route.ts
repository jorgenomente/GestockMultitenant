import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

/** Asegura runtime Node (no Edge) porque usamos service role */
export const runtime = "nodejs";

/** Evita que Next intente “optimizar” estáticamente este handler */
export const dynamic = "force-dynamic";

function getClient() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    // No explotamos en build; devolvemos 503 en runtime si falta config
    return null;
  }
  return createClient(url, key, { auth: { persistSession: false } });
}

export async function GET(req: Request) {
  const client = getClient();
  if (!client) {
    return NextResponse.json(
      { error: "Supabase no está configurado en el servidor." },
      { status: 503 }
    );
  }

  const { searchParams } = new URL(req.url);
  const tenant = searchParams.get("tenant") ?? "default";

  const { data, error } = await client
    .from("orders_store")
    .select("data")
    .eq("tenant_id", tenant)
    .single();

  if (error && error.code !== "PGRST116") {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ data: data?.data ?? {} });
}

export async function POST(req: Request) {
  const client = getClient();
  if (!client) {
    return NextResponse.json(
      { error: "Supabase no está configurado en el servidor." },
      { status: 503 }
    );
  }

  const body = await req.json();
  const tenantId = body.tenantId ?? "default";
  const data = body.data ?? {};

  const { error } = await client
    .from("orders_store")
    .upsert({
      tenant_id: tenantId,
      data,
      updated_at: new Date().toISOString(),
    });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}
