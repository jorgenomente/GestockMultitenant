// src/app/api/t/[slug]/branches/[id]/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdminClient } from "@/lib/supabaseAdmin";

/**
 * DELETE /api/t/[slug]/branches/[id]
 * Elimina una sucursal por id verificando que pertenezca al tenant del slug.
 * Requiere SUPABASE_SERVICE_ROLE_KEY en el entorno del servidor.
 */
export async function DELETE(
  _req: NextRequest,
  ctx: { params: Promise<{ slug: string; id: string }> }
) {
  try {
    const { slug, id } = await ctx.params;

    if (!slug || !id) {
      return NextResponse.json({ error: "Faltan parámetros" }, { status: 400 });
    }

    const db = getSupabaseAdminClient();

    // 1) Validar tenant por slug
    const { data: tenant, error: tErr } = await db
      .from("tenants")
      .select("id")
      .eq("slug", slug)
      .single();

    if (tErr || !tenant) {
      return NextResponse.json({ error: "Tenant no encontrado" }, { status: 404 });
    }

    // 2) Borrar branch solo si pertenece a ese tenant
    const { error } = await db
      .from("branches")
      .delete()
      .eq("id", id)
      .eq("tenant_id", tenant.id);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json(
      { error: e?.message ?? "Error inesperado" },
      { status: 500 }
    );
  }
}
