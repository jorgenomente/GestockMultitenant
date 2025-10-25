import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdminClient } from "@/lib/supabaseAdmin";
import { createClient } from "@supabase/supabase-js";
import type { SupabaseClient } from "@supabase/supabase-js";

export const dynamic = "force-dynamic";

function getServiceDb(): SupabaseClient {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY!;
  return createClient(url, key);
}

type Ctx = { params: Promise<{ slug: string; id: string }> };

/**
 * DELETE /api/t/[slug]/users/[id]
 * Valida que el usuario pertenezca al tenant (por memberships) y lo elimina.
 */
export async function DELETE(_req: NextRequest, { params }: Ctx) {
  try {
    const { slug, id } = await params;
    if (!slug || !id) {
      return NextResponse.json({ error: "Faltan parámetros" }, { status: 400 });
    }

    const admin = getSupabaseAdminClient();
    const db = getServiceDb();

    // 1) Tenant por slug
    const { data: tenant, error: tErr } = await db
      .from("tenants")
      .select("id")
      .eq("slug", slug)
      .single<{ id: string }>();
    if (tErr || !tenant) {
      return NextResponse.json({ error: "Tenant no encontrado" }, { status: 404 });
    }

    // 2) Verificar pertenencia (usuario ↔ branches ↔ tenant)
    const { data: branches, error: bErr } = await db
      .from("branches")
      .select("id")
      .eq("tenant_id", tenant.id);
    if (bErr) {
      return NextResponse.json({ error: bErr.message }, { status: 500 });
    }
    const branchRows = (branches ?? []) as Array<{ id: string }>;
    const branchIds = branchRows.map((b) => b.id);
    if (branchIds.length === 0) {
      return NextResponse.json({ error: "Tenant sin sucursales" }, { status: 404 });
    }

    const { data: link, error: mErr } = await db
      .from("membership_branches")
      .select("user_id")
      .eq("user_id", id)
      .in("branch_id", branchIds)
      .limit(1)
      .maybeSingle<{ user_id: string }>();
    if (mErr) {
      return NextResponse.json({ error: mErr.message }, { status: 500 });
    }
    if (!link) {
      return NextResponse.json({ error: "Usuario no pertenece a este tenant" }, { status: 404 });
    }

    // 3) (defensivo) Borrar vínculos a branches del tenant
    await db.from("membership_branches").delete().eq("user_id", id).in("branch_id", branchIds);

    // 4) (opcional) Borrar fila de memberships del tenant
    await db.from("memberships").delete().eq("user_id", id).eq("tenant_id", tenant.id);

    // 5) Borrar el usuario en Auth
    const { error: delErr } = await admin.auth.admin.deleteUser(id);
    if (delErr) return NextResponse.json({ error: delErr.message }, { status: 500 });

    return NextResponse.json({ ok: true });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Error inesperado";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
