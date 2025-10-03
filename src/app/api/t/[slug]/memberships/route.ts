import { NextResponse } from "next/server";
import { getSupabaseRouteClient } from "@/lib/supabaseServer";
import { supabaseAdmin, hasSupabaseAdmin } from "@/lib/supabaseAdmin";

type UpsertBody = {
  userId: string;
  role: "owner" | "admin" | "staff";
  branchIds?: string[];
};

// GET: lista de memberships del tenant (solo owner/admin)
export async function GET(_req: Request, ctx: { params: { slug: string } }) {
  // Guard: Service Role disponible
  if (!hasSupabaseAdmin || !supabaseAdmin) {
    return NextResponse.json({ error: "Service Role no configurado" }, { status: 500 });
  }
  // Rebind seguro para evitar warnings de TS
  const admin = supabaseAdmin!;

  // Usuario actual
  const route = await getSupabaseRouteClient();
  const { data: { user } } = await route.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  // Tenant por slug (RLS permite leer si sos miembro)
  const { data: tenant, error: tErr } = await route
    .from("tenants")
    .select("id, slug")
    .eq("slug", ctx.params.slug)
    .single();
  if (tErr || !tenant) return NextResponse.json({ error: "Tenant no encontrado" }, { status: 404 });

  // Validar que el actor sea owner/admin (bypass RLS con Service Role)
  const { data: me, error: meErr } = await admin
    .from("memberships")
    .select("role")
    .eq("tenant_id", tenant.id)
    .eq("user_id", user.id)
    .maybeSingle();
  if (meErr) return NextResponse.json({ error: meErr.message }, { status: 400 });
  if (!me || !["owner", "admin"].includes(me.role)) {
    return NextResponse.json({ error: "Permiso denegado" }, { status: 403 });
  }

  // Listar memberships del tenant
  const { data: rows, error } = await admin
    .from("memberships")
    .select("user_id, role, branch_ids")
    .eq("tenant_id", tenant.id)
    .order("role", { ascending: true });

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  const members = rows ?? [];

  // ---- Enriquecer con email (Auth Admin) ----
  const userIds = Array.from(new Set(members.map((m) => m.user_id)));
  const userEmailMap = new Map<string, string | null>();
  await Promise.all(
    userIds.map(async (id) => {
      try {
        const { data, error: uErr } = await admin.auth.admin.getUserById(id);
        if (!uErr && data?.user) userEmailMap.set(id, data.user.email ?? null);
        else userEmailMap.set(id, null);
      } catch {
        userEmailMap.set(id, null);
      }
    })
  );

  // ---- Enriquecer con nombres de sucursal ----
  const allBranchIds = Array.from(
    new Set(
      members.flatMap((m) => (Array.isArray(m.branch_ids) ? m.branch_ids : []))
    )
  );

  let branchNameMap = new Map<string, string>();
  if (allBranchIds.length) {
    const { data: branches, error: bErr } = await admin
      .from("branches")
      .select("id, name")
      .eq("tenant_id", tenant.id)
      .in("id", allBranchIds);
    if (!bErr && branches) {
      branchNameMap = new Map(branches.map((b) => [b.id, b.name]));
    }
  }

  // ---- Respuesta amigable ----
  const data = members.map((m) => {
    const names =
      m.branch_ids === null
        ? null // null = sin restricción (interpretable como "todas")
        : (Array.isArray(m.branch_ids) && m.branch_ids.length
            ? m.branch_ids.map((id: string) => branchNameMap.get(id) ?? id)
            : []); // [] = ninguna

    return {
      user_id: m.user_id,
      email: userEmailMap.get(m.user_id) ?? null,
      role: m.role as "owner" | "admin" | "staff",
      branch_ids: m.branch_ids ?? null,
      branch_names: names as string[] | null,
    };
  });

  return NextResponse.json(data);
}

// POST: upsert de membership (solo owner/admin)
export async function POST(req: Request, ctx: { params: { slug: string } }) {
  // Guard: Service Role disponible
  if (!hasSupabaseAdmin || !supabaseAdmin) {
    return NextResponse.json({ error: "Service Role no configurado" }, { status: 500 });
  }
  // Rebind seguro
  const admin = supabaseAdmin!;

  // Usuario actual
  const route = await getSupabaseRouteClient();
  const { data: { user } } = await route.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  // Body básico
  const body = (await req.json()) as UpsertBody;
  if (!body.userId || !body.role) {
    return NextResponse.json({ error: "userId y role son requeridos" }, { status: 400 });
  }

  // Tenant
  const { data: tenant, error: tErr } = await route
    .from("tenants")
    .select("id, slug")
    .eq("slug", ctx.params.slug)
    .single();
  if (tErr || !tenant) return NextResponse.json({ error: "Tenant no encontrado" }, { status: 404 });

  // Permisos del actor
  const { data: me } = await admin
    .from("memberships")
    .select("role")
    .eq("tenant_id", tenant.id)
    .eq("user_id", user.id)
    .maybeSingle();
  if (!me || !["owner", "admin"].includes(me.role)) {
    return NextResponse.json({ error: "Permiso denegado" }, { status: 403 });
  }

  // Validar branchIds del tenant
  const branchIds = body.branchIds ?? [];
  if (branchIds.length) {
    const { data: ok } = await admin
      .from("branches")
      .select("id")
      .eq("tenant_id", tenant.id)
      .in("id", branchIds);
    const valid = new Set((ok ?? []).map((b) => b.id));
    const invalid = branchIds.filter((id) => !valid.has(id));
    if (invalid.length) {
      return NextResponse.json(
        { error: `branch_ids inválidos: ${invalid.join(", ")}` },
        { status: 400 }
      );
    }
  }

  // Upsert
  const { data, error } = await admin
    .from("memberships")
    .upsert(
      { tenant_id: tenant.id, user_id: body.userId, role: body.role, branch_ids: branchIds },
      { onConflict: "tenant_id,user_id" }
    )
    .select("tenant_id, user_id, role, branch_ids")
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json(data);
}
