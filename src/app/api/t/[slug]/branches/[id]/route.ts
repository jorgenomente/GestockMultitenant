// src/app/api/t/[slug]/branches/[id]/route.ts
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const dynamic = "force-dynamic"; // evita cache
export const runtime = "nodejs";        // Service Role no debe correr en Edge

function getServiceDb() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY!;
  if (!url || !key) {
    throw new Error("Faltan NEXT_PUBLIC_SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY");
  }
  return createClient(url, key);
}

type Ctx = { params: Promise<{ slug: string; id: string }> };

export async function DELETE(_req: NextRequest, { params }: Ctx) {
  try {
    const { slug, id } = await params;

    // logs útiles en dev
    console.log("[DELETE] /api/t/[slug]/branches/[id]", { slug, id });

    const db = getServiceDb();

    // 1) validar tenant por slug
    const { data: tenant, error: tErr } = await db
      .from("tenants")
      .select("id")
      .eq("slug", slug)
      .single();

    if (tErr) {
      console.error("Tenant error:", tErr);
      return NextResponse.json({ error: tErr.message }, { status: 500 });
    }
    if (!tenant) {
      return NextResponse.json({ error: "Tenant no encontrado" }, { status: 404 });
    }

    // 2) borrar branch perteneciente a ese tenant
    const { error: delErr } = await db
      .from("branches")
      .delete()
      .eq("id", id)
      .eq("tenant_id", tenant.id);

    if (delErr) {
      console.error("Delete error:", delErr);
      return NextResponse.json({ error: delErr.message }, { status: 500 });
    }

    return NextResponse.json({ ok: true });
  } catch (e: any) {
    console.error("Route crash:", e);
    return NextResponse.json(
      { error: e?.message ?? "Unexpected server error" },
      { status: 500 }
    );
  }
}

// No exportamos GET/POST/PUT “dummy” para evitar incompatibilidades de tipos.
// Next responderá 405 automáticamente para otros métodos.
