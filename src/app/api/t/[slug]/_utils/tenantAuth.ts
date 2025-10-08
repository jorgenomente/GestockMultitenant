// src/app/api/t/[slug]/_utils/tenantAuth.ts
import { NextResponse } from "next/server";
import type { SupabaseClient } from "@supabase/supabase-js";
import { getSupabaseRouteClient } from "@/lib/supabaseServer";
import { supabaseAdmin, hasSupabaseAdmin } from "@/lib/supabaseAdmin";

export type Role = "owner" | "admin" | "staff";

type TenantRow = { id: string; slug: string; name?: string | null };

type AuthorizeSuccess = {
  ok: true;
  admin: SupabaseClient;
  tenant: TenantRow;
  userId: string;
  role: Role;
};

type AuthorizeFailure = {
  ok: false;
  response: NextResponse;
};

export async function authorizeTenant(
  slug: string,
  allowedRoles: Role[] = ["owner", "admin"]
): Promise<AuthorizeSuccess | AuthorizeFailure> {
  if (!hasSupabaseAdmin || !supabaseAdmin) {
    return {
      ok: false,
      response: NextResponse.json({ error: "Service Role no configurado" }, { status: 500 }),
    };
  }

  const admin = supabaseAdmin as SupabaseClient;

  const route = await getSupabaseRouteClient();
  const {
    data: { user },
  } = await route.auth.getUser();

  if (!user) {
    return { ok: false, response: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) };
  }

  const { data: tenant, error: tErr } = await admin
    .from("tenants")
    .select("id, slug, name")
    .eq("slug", slug)
    .maybeSingle();

  if (tErr) {
    return { ok: false, response: NextResponse.json({ error: tErr.message }, { status: 400 }) };
  }

  if (!tenant) {
    return { ok: false, response: NextResponse.json({ error: "Tenant no encontrado" }, { status: 404 }) };
  }

  const { data: membership, error: mErr } = await admin
    .from("memberships")
    .select("role")
    .eq("tenant_id", tenant.id)
    .eq("user_id", user.id)
    .maybeSingle();

  if (mErr) {
    return { ok: false, response: NextResponse.json({ error: mErr.message }, { status: 400 }) };
  }

  const role = membership?.role as Role | undefined;

  if (!role || !allowedRoles.includes(role)) {
    return { ok: false, response: NextResponse.json({ error: "Permiso denegado" }, { status: 403 }) };
  }

  return { ok: true, admin, tenant, userId: user.id, role };
}
