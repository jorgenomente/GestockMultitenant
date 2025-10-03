// app/api/admin/users/route.ts
import { NextResponse } from "next/server";
import { z } from "zod";
import { getSupabaseAdminClient } from "@/lib/supabaseAdmin";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

const EMAIL_SUFFIX = "tn"; // usa el mismo sufijo que en tu login

// Tipado mínimo del usuario de Supabase que usamos en la UI
type SupaUser = {
  id: string;
  email?: string | null;
  user_metadata?: Record<string, unknown>;
  created_at?: string;
};

const CreateUserSchema = z.object({
  username: z.string().min(2),
  password: z.string().min(4),
  role: z.enum(["owner", "admin", "staff"]).optional(),
  branch_id: z.string().uuid().optional(),
});

function getServiceDb(): SupabaseClient {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY!;
  return createClient(url, key);
}

export async function GET() {
  const admin = getSupabaseAdminClient();

  const { data, error } = await admin.auth.admin.listUsers({
    page: 1,
    perPage: 100,
  });
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const usersRaw = (data?.users ?? []) as SupaUser[];
  const users: SupaUser[] = usersRaw.filter(
    (u: SupaUser) => (u.email ?? "").endsWith(`@${EMAIL_SUFFIX}`)
  );

  return NextResponse.json({ users });
}

export async function POST(req: Request) {
  const admin = getSupabaseAdminClient();
  const body = await req.json();
  const parsed = CreateUserSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const { username, password, role, branch_id } = parsed.data;
  const email = `${username}@${EMAIL_SUFFIX}`;

  // 1) Crear usuario en Auth
  const { data: created, error: createErr } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { username },
  });

  if (createErr || !created?.user) {
    return NextResponse.json(
      { error: createErr?.message ?? "No se pudo crear el usuario" },
      { status: 500 }
    );
  }

  // 2) (Opcional) crear membership
  if (role && branch_id) {
    const db = getServiceDb();
    const { error: mErr } = await db.from("memberships").insert({
      user_id: created.user.id,
      branch_id,
      role,
    });
    if (mErr) {
      // 207 Multi-Status: usuario creado, membership falló
      return NextResponse.json(
        { user: created.user, membership_error: mErr.message },
        { status: 207 }
      );
    }
  }

  return NextResponse.json({ user: created.user });
}
