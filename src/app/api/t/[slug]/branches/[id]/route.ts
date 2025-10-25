// src/app/api/t/[slug]/branches/[id]/route.ts
import { NextRequest, NextResponse } from "next/server";
import { authorizeTenant } from "@/app/api/t/[slug]/_utils/tenantAuth";

export const dynamic = "force-dynamic"; // evita cache
export const runtime = "nodejs";        // Service Role no debe correr en Edge

type Ctx = { params: Promise<{ slug: string; id: string }> };

export async function DELETE(_req: NextRequest, { params }: Ctx) {
  try {
    const { slug, id } = await params;

    // logs útiles en dev
    console.log("[DELETE] /api/t/[slug]/branches/[id]", { slug, id });

    const auth = await authorizeTenant(slug);
    if (!auth.ok) return auth.response;

    const { admin: db, tenant } = auth;

    // Borrar branch perteneciente a ese tenant
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
  } catch (error: unknown) {
    console.error("Route crash:", error);
    const message = error instanceof Error ? error.message : "Unexpected server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// No exportamos GET/POST/PUT “dummy” para evitar incompatibilidades de tipos.
// Next responderá 405 automáticamente para otros métodos.
