import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import type { SupabaseClient } from "@supabase/supabase-js";
import { authorizeTenant } from "@/app/api/t/[slug]/_utils/tenantAuth";
import { getSupabaseRouteClient } from "@/lib/supabaseServer";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MessageBodySchema = z.object({
  message: z
    .string({ required_error: "Mensaje requerido" })
    .trim()
    .min(1, "El mensaje no puede estar vacío")
    .max(800, "Máximo 800 caracteres"),
});

type BranchRow = { id: string; name: string; slug: string; tenant_id: string };
type MembershipRow = { branch_ids: string[] | null };
type Role = "owner" | "admin" | "staff";

type AccessSuccess = {
  ok: true;
  admin: SupabaseClient;
  tenant: { id: string; slug: string };
  branch: BranchRow;
  role: Role;
  userId: string;
};

type AccessFailure = {
  ok: false;
  response: NextResponse;
};

async function resolveBranchAccess(
  tenantSlug: string,
  branchSlug: string,
  allowedRoles: Role[]
): Promise<AccessSuccess | AccessFailure> {
  const auth = await authorizeTenant(tenantSlug, allowedRoles);
  if (!auth.ok) return { ok: false, response: auth.response };

  const { admin, tenant, role, userId } = auth;

  const { data: branch, error: branchError } = await admin
    .from("branches")
    .select("id, name, slug, tenant_id")
    .eq("tenant_id", tenant.id)
    .eq("slug", branchSlug)
    .maybeSingle<BranchRow>();

  if (branchError) {
    return { ok: false, response: NextResponse.json({ error: branchError.message }, { status: 400 }) };
  }

  if (!branch) {
    return { ok: false, response: NextResponse.json({ error: "Sucursal no encontrada" }, { status: 404 }) };
  }

  const { data: membership, error: membershipError } = await admin
    .from("memberships")
    .select("branch_ids")
    .eq("tenant_id", tenant.id)
    .eq("user_id", userId)
    .maybeSingle<MembershipRow>();

  if (membershipError) {
    return { ok: false, response: NextResponse.json({ error: membershipError.message }, { status: 400 }) };
  }

  const branchIds = membership?.branch_ids;
  if (Array.isArray(branchIds) && branchIds.length > 0 && !branchIds.includes(branch.id)) {
    return { ok: false, response: NextResponse.json({ error: "Permiso denegado" }, { status: 403 }) };
  }

  return { ok: true, admin, tenant: { id: tenant.id, slug: tenant.slug }, branch, role, userId };
}

async function getActiveUser() {
  const route = await getSupabaseRouteClient();
  const {
    data: { user },
  } = await route.auth.getUser();
  if (!user) {
    return { ok: false as const, response: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) };
  }
  return { ok: true as const, user };
}

export async function GET(req: NextRequest, context: { params: Promise<{ slug: string; branch: string }> }) {
  const params = await context.params;
  const access = await resolveBranchAccess(params.slug, params.branch, ["owner", "admin", "staff"]);
  if (!access.ok) return access.response;

  const { admin, branch, tenant, role } = access;

  const { data, error } = await admin
    .from("branch_messages")
    .select("id, message, author_id, author_name, created_at")
    .eq("tenant_id", tenant.id)
    .eq("branch_id", branch.id)
    .order("created_at", { ascending: false })
    .limit(50);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  const messages = (data ?? []).map((row) => ({
    id: row.id,
    message: row.message,
    authorId: row.author_id,
    authorName: row.author_name,
    createdAt: row.created_at,
  }));

  return NextResponse.json({
    messages,
    branch: { id: branch.id, name: branch.name, slug: branch.slug },
    role,
  });
}

export async function POST(req: NextRequest, context: { params: Promise<{ slug: string; branch: string }> }) {
  const params = await context.params;
  const bodyParse = MessageBodySchema.safeParse(await req.json());
  if (!bodyParse.success) {
    const firstError = bodyParse.error.errors[0]?.message ?? "Datos inválidos";
    return NextResponse.json({ error: firstError }, { status: 400 });
  }

  const [access, activeUser] = await Promise.all([
    resolveBranchAccess(params.slug, params.branch, ["owner", "admin", "staff"]),
    getActiveUser(),
  ]);

  if (!access.ok) return access.response;
  if (!activeUser.ok) return activeUser.response;

  const { admin, tenant, branch } = access;
  const { user } = activeUser;

  const displayName =
    (user.user_metadata?.full_name as string | undefined)?.trim() ||
    (user.user_metadata?.name as string | undefined)?.trim() ||
    user.email ||
    "Usuario";

  const { data, error } = await admin
    .from("branch_messages")
    .insert({
      tenant_id: tenant.id,
      branch_id: branch.id,
      author_id: user.id,
      author_name: displayName,
      message: bodyParse.data.message,
    })
    .select("id, message, author_id, author_name, created_at")
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json({
    message: {
      id: data.id,
      message: data.message,
      authorId: data.author_id,
      authorName: data.author_name,
      createdAt: data.created_at,
    },
  }, { status: 201 });
}

export async function DELETE(req: NextRequest, context: { params: Promise<{ slug: string; branch: string }> }) {
  const params = await context.params;
  const messageId = req.nextUrl.searchParams.get("id");
  if (!messageId) {
    return NextResponse.json({ error: "id requerido" }, { status: 400 });
  }

  const access = await resolveBranchAccess(params.slug, params.branch, ["owner", "admin", "staff"]);
  if (!access.ok) return access.response;

  const { admin, tenant, branch, role, userId } = access;

  const { data: existing, error: lookupErr } = await admin
    .from("branch_messages")
    .select("id, author_id")
    .eq("tenant_id", tenant.id)
    .eq("branch_id", branch.id)
    .eq("id", messageId)
    .maybeSingle<{ id: string; author_id: string }>();

  if (lookupErr) {
    return NextResponse.json({ error: lookupErr.message }, { status: 400 });
  }

  if (!existing) {
    return NextResponse.json({ error: "Mensaje no encontrado" }, { status: 404 });
  }

  const canDelete = role === "owner" || role === "admin" || existing.author_id === userId;
  if (!canDelete) {
    return NextResponse.json({ error: "Permiso denegado" }, { status: 403 });
  }

  const { error: deleteErr } = await admin
    .from("branch_messages")
    .delete()
    .eq("id", existing.id)
    .eq("tenant_id", tenant.id)
    .eq("branch_id", branch.id);

  if (deleteErr) {
    return NextResponse.json({ error: deleteErr.message }, { status: 400 });
  }

  return NextResponse.json({ ok: true });
}
