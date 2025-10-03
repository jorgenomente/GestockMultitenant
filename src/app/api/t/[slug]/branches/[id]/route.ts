// src/app/api/t/[slug]/branches/[id]/route.ts
import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

function getServiceDb() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY!;
  if (!url || !key) {
    throw new Error("Faltan NEXT_PUBLIC_SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY");
  }
  return createClient(url, key);
}

type Params = { params: { slug: string; id: string } };

export async function DELETE(_req: Request, { params }: Params) {
  try {
    // 0) sanity logs (se ven en terminal del dev server)
    console.log("[DELETE] /api/t/[slug]/branches/[id]", params);

    const db = getServiceDb();

    // 1) tenant por slug
    const { data: tenant, error: tErr } = await db
      .from("tenants")
      .select("id")
      .eq("slug", params.slug)
      .maybeSingle();

    if (tErr) {
      console.error("Tenant error:", tErr);
      return NextResponse.json({ error: tErr.message }, { status: 500 });
    }
    if (!tenant) {
      return NextResponse.json({ error: "Tenant no encontrado" }, { status: 404 });
    }

    // 2) borrar branch de ese tenant
    const { error: delErr } = await db
      .from("branches")
      .delete()
      .eq("id", params.id)
      .eq("tenant_id", tenant.id);

    if (delErr) {
      console.error("Delete error:", delErr);
      return NextResponse.json({ error: delErr.message }, { status: 500 });
    }

    return NextResponse.json({ ok: true });
  } catch (e: any) {
    console.error("Route crash:", e);
    // Siempre devolver JSON, nunca HTML
    return NextResponse.json(
      { error: e?.message ?? "Unexpected server error" },
      { status: 500 }
    );
  }
}

// (Opcional) Manejo 405 para otros métodos: ayuda a detectar hits incorrectos
export function GET() {
  return NextResponse.json({ error: "Method Not Allowed" }, { status: 405 });
}
export function POST() {
  return NextResponse.json({ error: "Method Not Allowed" }, { status: 405 });
}
export function PUT() {
  return NextResponse.json({ error: "Method Not Allowed" }, { status: 405 });
}
