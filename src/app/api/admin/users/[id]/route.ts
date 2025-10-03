import { NextResponse } from "next/server";
import { z } from "zod";
import { getSupabaseAdminClient } from "@/lib/supabaseAdmin";
import { createClient } from "@supabase/supabase-js";

const EMAIL_SUFFIX = "tn"; // mismo sufijo que usás en login

function getServiceDb() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY!;
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

  // Listamos todos y filtramos @tn para simplificar (también podrías cruzar por memberships/tenant)
  const { data, error } = await admin.auth.admin.listUsers({ page: 1, perPage: 100 });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const users = (data?.users ?? []).filter(u => u.email?.endsWith(`@${EMAIL_SUFFIX}`));
  return NextResponse.json({ users });
}

export async function POST(req: Request, { params }: Params) {
  const body = await req.json();
  const parsed = CreateUserSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }
  const { username, password, role, branch_id } = parsed.data;

  const admin = getSupabaseAdminClient();
  const email = `${username}@${EMAIL_SUFFIX}`;

  // 1) usuario en Auth
  const { data: created, error: cErr } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { username },
  });
  if (cErr || !created?.user) {
    return NextResponse.json({ error: cErr?.message ?? "No se pudo crear el usuario" }, { status: 500 });
  }

  // 2) membership opcional (role+branch) validando que branch pertenezca al tenant
  if (role && branch_id) {
    const db = getServiceDb();

    const { data: tenant, error: tErr } = await db
      .from("tenants")
      .select("id")
      .eq("slug", params.slug)
      .single();
    if (tErr || !tenant) {
      return NextResponse.json({ user: created.user, membership_error: "Tenant no encontrado" }, { status: 207 });
    }

    const { data: branch, error: bErr } = await db
      .from("branches")
      .select("id, tenant_id")
      .eq("id", branch_id)
      .single();

    if (bErr || !branch || branch.tenant_id !== tenant.id) {
      return NextResponse.json({ user: created.user, membership_error: "Branch no pertenece al tenant" }, { status: 207 });
    }

    const { error: mErr } = await db.from("memberships").insert({
      user_id: created.user.id,
      branch_id,
      role,
    });
    if (mErr) {
      return NextResponse.json({ user: created.user, membership_error: mErr.message }, { status: 207 });
    }
  }

  return NextResponse.json({ user: created.user });
}
