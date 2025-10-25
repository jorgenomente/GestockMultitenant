// src/app/api/admin/branches/[id]/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdminClient } from "@/lib/supabaseAdmin";

export const dynamic = "force-dynamic";

/**
 * DELETE /api/admin/branches/[id]
 * Elimina una sucursal por id (uso administrativo).
 * Requiere SUPABASE_SERVICE_ROLE_KEY en el entorno del servidor.
 */
export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    if (!id) {
      return NextResponse.json({ error: "Falta id" }, { status: 400 });
    }

    const db = getSupabaseAdminClient();

    const { error } = await db.from("branches").delete().eq("id", id);
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ ok: true });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Error inesperado";
    return NextResponse.json(
      { error: message },
      { status: 500 }
    );
  }
}
