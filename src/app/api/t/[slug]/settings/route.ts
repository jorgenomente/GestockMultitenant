import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { authorizeTenant } from "@/app/api/t/[slug]/_utils/tenantAuth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const BodySchema = z.object({
  scope: z.enum(["global", "branch"]),
  key: z.string().min(1),
  value: z.unknown(),
  branchId: z.string().uuid().optional(),
});

const ensureSerializable = (value: unknown): Record<string, unknown> => {
  if (value && typeof value === "object" && !Array.isArray(value)) {
    return value as Record<string, unknown>;
  }
  return {};
};

export async function POST(req: NextRequest, context: { params: Promise<{ slug: string }> }) {
  const params = await context.params;
  const auth = await authorizeTenant(params.slug, ["owner", "admin"]);
  if (!auth.ok) return auth.response;

  const { admin, tenant, role, userId } = auth;
  console.log("[settings] authorized", { tenant: tenant.slug, role, userId });
  const body = BodySchema.parse(await req.json());

  const baseValue = ensureSerializable(body.value);
  const uploadedAt = new Date().toISOString();
  const value = { ...baseValue, uploadedAt };

  if (body.scope === "global") {
    const { data: existing, error: lookupErr } = await admin
      .from("app_settings")
      .select("id")
      .eq("tenant_id", tenant.id)
      .is("branch_id", null)
      .eq("key", body.key)
      .maybeSingle();

    if (lookupErr && lookupErr.code !== "PGRST116") {
      console.error("[settings] global lookup error", lookupErr);
      return NextResponse.json({ error: lookupErr.message }, { status: 400 });
    }

    if (existing) {
      const { error: updateErr } = await admin
        .from("app_settings")
        .update({ value, updated_at: uploadedAt })
        .eq("id", existing.id);
      if (updateErr) {
        console.error("[settings] global update error", updateErr);
        return NextResponse.json({ error: updateErr.message }, { status: 400 });
      }
    } else {
      const { error: insertErr } = await admin
        .from("app_settings")
        .insert({ tenant_id: tenant.id, branch_id: null, key: body.key, value, created_at: uploadedAt, updated_at: uploadedAt });
      if (insertErr) {
        console.error("[settings] global insert error", insertErr);
        return NextResponse.json({ error: insertErr.message }, { status: 400 });
      }
    }

    return NextResponse.json({ ok: true, scope: "global", uploadedAt });
  }

  if (!body.branchId) {
    return NextResponse.json({ error: "branchId requerido para scope=branch" }, { status: 400 });
  }

  const { data: branch, error: branchError } = await admin
    .from("branches")
    .select("id, slug")
    .eq("tenant_id", tenant.id)
    .eq("id", body.branchId)
    .maybeSingle();

  if (branchError) {
    return NextResponse.json({ error: branchError.message }, { status: 400 });
  }
  if (!branch) {
    return NextResponse.json({ error: "Sucursal no encontrada" }, { status: 404 });
  }

  const { data: existing, error: lookupErr } = await admin
    .from("app_settings")
    .select("id")
    .eq("tenant_id", tenant.id)
    .eq("branch_id", branch.id)
    .eq("key", body.key)
    .maybeSingle();

  if (lookupErr && lookupErr.code !== "PGRST116") {
    console.error("[settings] branch lookup error", lookupErr);
    return NextResponse.json({ error: lookupErr.message }, { status: 400 });
  }

  if (existing) {
    const { error: updateErr } = await admin
      .from("app_settings")
      .update({ value, updated_at: uploadedAt })
      .eq("id", existing.id);
    if (updateErr) {
      console.error("[settings] branch update error", updateErr);
      return NextResponse.json({ error: updateErr.message }, { status: 400 });
    }
  } else {
    const { error: insertErr } = await admin
      .from("app_settings")
      .insert({ tenant_id: tenant.id, branch_id: branch.id, key: body.key, value, created_at: uploadedAt, updated_at: uploadedAt });
    if (insertErr) {
      console.error("[settings] branch insert error", insertErr);
      return NextResponse.json({ error: insertErr.message }, { status: 400 });
    }
  }

  return NextResponse.json({ ok: true, scope: "branch", branch: branch.slug, uploadedAt });
}
