import { NextResponse } from "next/server";
import { getSupabaseRouteClient } from "@/lib/supabaseServer";
import { supabaseAdmin, hasSupabaseAdmin } from "@/lib/supabaseAdmin";

type Role = "owner" | "admin" | "staff";

type UpsertBody = {
  userId: string;
  role: Role;
  // IMPORTANTE: null = TODAS; [] = NINGUNA; array = algunas
  branchIds?: string[] | null;
};

type MembershipRow = {
  user_id: string;
  email: string | null;
  role: Role;
  branch_ids: string[] | null;
  branch_names: string[] | null; // null = todas, [] = ninguna
};

/* ========================= GET =========================
   Lista de memberships del tenant (solo owner/admin)
=========================================================*/
export async function GET(
  _req: Request,
  { params }: { params: { slug: string } }
) {
  if (!hasSupabaseAdmin || !supabaseAdmin) {
    return NextResponse.json({ error: "Service Role no configurado" }, { status: 500 });
  }
  const admin = supabaseAdmin!;

  // Usuario actual (cliente con RLS)
  const route = await getSupabaseRouteClient();
  const { data: { user } } = await route.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  // Tenant por slug (RLS sobre tenants habilitada)
  const { data: tenant, error: tErr } = await route
    .from("tenants")
    .select("id, slug")
    .eq("slug", params.slug)
    .single();
  if (tErr || !tenant) {
    return NextResponse.json({ error: "Tenant no encontrado" }, { status: 404 });
  }

  // Verificar permisos del actor (bypass RLS con service role)
  const { data: me, error: meErr } = await admin
    .from("memberships")
    .select("role")
    .eq("tenant_id", tenant.id)
    .eq("user_id", user.id)
    .maybeSingle();
  if (meErr) return NextResponse.json({ error: meErr.message }, { status: 400 });
  if (!me || !["owner", "admin"].includes(me.role as Role)) {
    return NextResponse.json({ error: "Permiso denegado" }, { status: 403 });
  }

  // Traer memberships del tenant (service role)
  const { data: rows, error } = await admin
    .from("memberships")
    .select("user_id, role, branch_ids")
    .eq("tenant_id", tenant.id)
    .order("role", { ascending: true });
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });

  const members = rows ?? [];

  // Emails (Auth Admin) — resuelve por id; paralelo
  const userIds = Array.from(new Set(members.map((m) => m.user_id)));
  const emailById = new Map<string, string | null>();
  await Promise.all(
    userIds.map(async (id) => {
      try {
        const { data, error: uErr } = await admin.auth.admin.getUserById(id);
        if (!uErr && data?.user) emailById.set(id, data.user.email ?? null);
        else emailById.set(id, null);
      } catch {
        emailById.set(id, null);
      }
    })
  );

  // Nombres de sucursal: solo para ids explícitos; si branch_ids=null -> branch_names=null
  const explicitBranchIds = Array.from(
    new Set(members.flatMap((m) => (Array.isArray(m.branch_ids) ? m.branch_ids : [])))
  );

  let nameById = new Map<string, string>();
  if (explicitBranchIds.length > 0) {
    const { data: branches, error: bErr } = await admin
      .from("branches")
      .select("id, name")
      .eq("tenant_id", tenant.id)
      .in("id", explicitBranchIds);
    if (!bErr && branches) {
      nameById = new Map(branches.map((b) => [b.id, b.name]));
    }
  }

  const data: MembershipRow[] = members.map((m) => {
    let branch_names: string[] | null;
    if (m.branch_ids === null) {
      branch_names = null; // TODAS
    } else if (Array.isArray(m.branch_ids) && m.branch_ids.length > 0) {
      branch_names = m.branch_ids.map((id: string) => nameById.get(id) ?? id);
    } else {
      branch_names = []; // NINGUNA
    }

    return {
      user_id: m.user_id,
      email: emailById.get(m.user_id) ?? null,
      role: m.role as Role,
      branch_ids: (m.branch_ids ?? null) as string[] | null,
      branch_names,
    };
  });

  return NextResponse.json(data);
}

/* ========================= POST =========================
   Upsert de membership (solo owner/admin)
   Semántica:
   - branchIds === null  -> guarda NULL (todas)
   - branchIds === []    -> guarda [] (ninguna)
   - branchIds === [..]  -> guarda esas
=========================================================*/
export async function POST(
  req: Request,
  { params }: { params: { slug: string } }
) {
  if (!hasSupabaseAdmin || !supabaseAdmin) {
    return NextResponse.json({ error: "Service Role no configurado" }, { status: 500 });
  }
  const admin = supabaseAdmin!;

  const route = await getSupabaseRouteClient();
  const { data: { user } } = await route.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  // Body
  let body: UpsertBody;
  try {
    body = (await req.json()) as UpsertBody;
  } catch {
    return NextResponse.json({ error: "JSON inválido" }, { status: 400 });
  }
  if (!body.userId || !body.role) {
    return NextResponse.json({ error: "userId y role son requeridos" }, { status: 400 });
  }

  // Tenant
  const { data: tenant, error: tErr } = await route
    .from("tenants")
    .select("id, slug")
    .eq("slug", params.slug)
    .single();
  if (tErr || !tenant) return NextResponse.json({ error: "Tenant no encontrado" }, { status: 404 });

  // Permisos del actor
  const { data: me } = await admin
    .from("memberships")
    .select("role")
    .eq("tenant_id", tenant.id)
    .eq("user_id", user.id)
    .maybeSingle();
  if (!me || !["owner", "admin"].includes(me.role as Role)) {
    return NextResponse.json({ error: "Permiso denegado" }, { status: 403 });
  }

  // Normalizar branchIds según presencia en el body
  // - Si viene `null` explícito => NULL
  // - Si viene array => array
  // - Si viene undefined => interpretamos como [] (tu formulario siempre envía algo)
  const hasBranchIdsProp = Object.prototype.hasOwnProperty.call(body, "branchIds");
  const normalizedBranchIds: string[] | null =
    hasBranchIdsProp ? (body.branchIds === null ? null : (body.branchIds ?? [])) : [];

  // Validar branchIds del tenant (solo si es array con elementos)
  if (Array.isArray(normalizedBranchIds) && normalizedBranchIds.length > 0) {
    const { data: ok, error: bErr } = await admin
      .from("branches")
      .select("id")
      .eq("tenant_id", tenant.id)
      .in("id", normalizedBranchIds);
    if (bErr) return NextResponse.json({ error: bErr.message }, { status: 400 });

    const valid = new Set((ok ?? []).map((b) => b.id));
    const invalid = normalizedBranchIds.filter((id) => !valid.has(id));
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
      {
        tenant_id: tenant.id,
        user_id: body.userId,
        role: body.role,
        branch_ids: normalizedBranchIds, // <-- NULL / [] / array
      },
      { onConflict: "tenant_id,user_id" }
    )
    .select("tenant_id, user_id, role, branch_ids")
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json(data);
}
