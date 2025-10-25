// src/app/api/bootstrap/tenant/route.ts
import { NextResponse } from "next/server";
import { getSupabaseRouteClient } from "@/lib/supabaseServer";

type Body = {
  name: string;
  slug: string;
  branchName?: string;
  branchSlug?: string;
};

export async function POST(req: Request) {
  const supabase = await getSupabaseRouteClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { name, slug, branchName, branchSlug } = (await req.json()) as Body;
  if (!name || !slug) {
    return NextResponse.json({ error: "name y slug son requeridos" }, { status: 400 });
  }

  // 1) Intentar crear el tenant
  let tenant: { id: string; slug: string } | null = null;

  const insertRes = await supabase
    .from("tenants")
    .insert({ name, slug })
    .select("id, slug")
    .single();

  if (insertRes.data) {
    tenant = insertRes.data;
  } else {
    // Si falla, puede ser por unique_violation (slug ya existe) o por otra razón.
    // Código de Postgres para unique_violation = '23505'
    const code = insertRes.error?.code;
    if (code === "23505") {
      // Ya existe: lo buscamos por slug
      const getRes = await supabase
        .from("tenants")
        .select("id, slug")
        .eq("slug", slug)
        .single();

      if (!getRes.data) {
        return NextResponse.json(
          { error: "El tenant existe pero no se pudo obtener." },
          { status: 400 }
        );
      }
      tenant = getRes.data;
    } else {
      // Otro error distinto a conflicto de slug
      return NextResponse.json(
        { error: insertRes.error?.message || "Error creando tenant" },
        { status: 400 }
      );
    }
  }

  // Seguridad: si aún no lo tenemos, abortamos
  if (!tenant) {
    return NextResponse.json({ error: "No se pudo obtener tenant" }, { status: 400 });
  }

  // 2) Hacer al usuario actual OWNER de este tenant
  const upsertMember = await supabase
    .from("memberships")
    .upsert(
      { tenant_id: tenant.id, user_id: user.id, role: "owner", branch_ids: [] },
      { onConflict: "tenant_id,user_id" }
    )
    .select("tenant_id")
    .single();

  if (upsertMember.error) {
    return NextResponse.json({ error: upsertMember.error.message }, { status: 400 });
  }

  // 3) (Opcional) crear sucursal inicial
  if (branchName && branchSlug) {
    const createBranch = await supabase
      .from("branches")
      .insert({ tenant_id: tenant.id, name: branchName, slug: branchSlug })
      .select("id")
      .single();

    if (createBranch.error) {
      // No detenemos el bootstrap si falla la sucursal; devolvemos warning
      return NextResponse.json({
        ok: true,
        tenantSlug: tenant.slug,
        warning: `Tenant creado, membership ok, pero falló branches: ${createBranch.error.message}`,
      });
    }
  }

  return NextResponse.json({ ok: true, tenantSlug: tenant.slug });
}
