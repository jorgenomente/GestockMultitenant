import { NextResponse } from "next/server";
import { z } from "zod";
import { getSupabaseAdminClient } from "@/lib/supabaseAdmin";
import { createClient } from "@supabase/supabase-js";

const EMAIL_SUFFIX = "tn"; // debe coincidir con tu login

function getServiceDb() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY!;
  if (!url || !key) throw new Error("Faltan NEXT_PUBLIC_SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY");
  return createClient(url, key);
}

type Params = { params: { slug: string } };

const CreateUserSchema = z.object({
  username: z.string().min(2),
  password: z.string().min(4),
  role: z.enum(["owner", "admin", "staff"]).optional(),
  branch_id: z.string().uuid().optional(),
});

export async function GET(_req: Request, { params }: Params) {
  const admin = getSupabaseAdminClient();
  const { data, error } = await admin.auth.admin.listUsers({ page: 1, perPage: 100 });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const users = (data?.users ?? []).filter(u => u.email?.endsWith(`@${EMAIL_SUFFIX}`));
  return NextResponse.json({ users });
}

export async function POST(req: Request, { params }: Params) {
  try {
    const admin = getSupabaseAdminClient();
    const db = getServiceDb();

    // 1) body
    const body = await req.json().catch(() => ({}));
    const parsed = CreateUserSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
    }
    const { username, password, role, branch_id } = parsed.data;

    // 2) crear en Auth
    const email = `${username}@${EMAIL_SUFFIX}`;
    const { data: created, error: cErr } = await admin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { username },
    });
    if (cErr || !created?.user) {
      return NextResponse.json({ error: cErr?.message ?? "No se pudo crear el usuario" }, { status: 500 });
    }

    // 3) si mandaron rol + branch, validar y asignar
    if (role && branch_id) {
      // tenant
      const { data: tenant, error: tErr } = await db
        .from("tenants").select("id").eq("slug", params.slug).maybeSingle();
      if (tErr) return NextResponse.json({ user: created.user, membership_error: tErr.message }, { status: 207 });
      if (!tenant) return NextResponse.json({ user: created.user, membership_error: "Tenant no encontrado" }, { status: 207 });

      // branch pertenece al tenant
      const { data: branch, error: bErr } = await db
        .from("branches").select("id, tenant_id").eq("id", branch_id).maybeSingle();
      if (bErr) return NextResponse.json({ user: created.user, membership_error: bErr.message }, { status: 207 });
      if (!branch || branch.tenant_id !== tenant.id) {
        return NextResponse.json({ user: created.user, membership_error: "Branch no pertenece al tenant" }, { status: 207 });
      }

      // upsert rol por tenant (si usás memberships por tenant)
      const { error: upErr } = await db
        .from("memberships")
        .upsert({ user_id: created.user.id, tenant_id: tenant.id, role }, { onConflict: "user_id,tenant_id" });
      if (upErr) {
        return NextResponse.json({ user: created.user, membership_error: upErr.message }, { status: 207 });
      }

      // vincular user-branch en tabla puente
      const { error: linkErr } = await db
        .from("membership_branches")
        .insert({ user_id: created.user.id, branch_id });
      if (linkErr) {
        return NextResponse.json({ user: created.user, membership_error: linkErr.message }, { status: 207 });
      }
    }

    return NextResponse.json({ user: created.user });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message ?? "Unexpected server error" }, { status: 500 });
  }
}
