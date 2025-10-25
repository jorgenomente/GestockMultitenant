// src/app/api/admin/users/[id]/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdminClient } from "@/lib/supabaseAdmin";

export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ id: string }> };

/** GET /api/admin/users/[id] — devuelve datos de un usuario por id */
export async function GET(_req: NextRequest, { params }: Ctx) {
  try {
    const { id } = await params;
    if (!id) return NextResponse.json({ error: "Falta id" }, { status: 400 });

    const admin = getSupabaseAdminClient();
    const { data, error } = await admin.auth.admin.getUserById(id);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    if (!data?.user) return NextResponse.json({ error: "Usuario no encontrado" }, { status: 404 });

    const u = data.user;
    return NextResponse.json({
      user: {
        id: u.id,
        email: u.email,
        phone: u.phone ?? null,
        created_at: u.created_at,
        last_sign_in_at: u.last_sign_in_at,
        app_metadata: u.app_metadata,
        user_metadata: u.user_metadata,
      },
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Error inesperado";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

/** DELETE /api/admin/users/[id] — elimina usuario por id */
export async function DELETE(_req: NextRequest, { params }: Ctx) {
  try {
    const { id } = await params;
    if (!id) return NextResponse.json({ error: "Falta id" }, { status: 400 });

    const admin = getSupabaseAdminClient();
    const { error } = await admin.auth.admin.deleteUser(id);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    return NextResponse.json({ ok: true });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Error inesperado";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
