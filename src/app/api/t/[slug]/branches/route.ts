// src/app/api/t/[slug]/branches/route.ts
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { authorizeTenant } from "@/app/api/t/[slug]/_utils/tenantAuth";

export const dynamic = "force-dynamic"; // evita cache accidental
export const runtime = "nodejs";        // Service Role no debe correr en Edge

const BodySchema = z.object({
  name: z.string().min(2),
  slug: z.string().min(2).regex(/^[a-z0-9-]+$/),
});

type Ctx = { params: Promise<{ slug: string }> };

export async function POST(req: NextRequest, { params }: Ctx) {
  try {
    const { slug } = await params;

    const auth = await authorizeTenant(slug);
    if (!auth.ok) return auth.response;

    const { admin: db, tenant } = auth;

    // 1) validar body
    const json = await req.json().catch(() => ({}));
    const parsed = BodySchema.safeParse(json);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
    }
    const { name, slug: branchSlug } = parsed.data;

    // 2) chequear duplicado (opcional pero con mejor mensaje)
    const { data: exists, error: eErr } = await db
      .from("branches")
      .select("id")
      .eq("tenant_id", tenant.id)
      .eq("slug", branchSlug)
      .maybeSingle();
    if (eErr) return NextResponse.json({ error: eErr.message }, { status: 500 });
    if (exists) {
      return NextResponse.json(
        { error: "Ya existe una sucursal con ese slug en este tenant" },
        { status: 409 }
      );
    }

    // 3) insertar
    const { data: inserted, error: iErr } = await db
      .from("branches")
      .insert({ name, slug: branchSlug, tenant_id: tenant.id })
      .select("id, name, slug, tenant_id")
      .single();
    if (iErr) return NextResponse.json({ error: iErr.message }, { status: 500 });

    return NextResponse.json({ branch: inserted }, { status: 201 });
  } catch (error: unknown) {
    console.error("POST /api/t/[slug]/branches", error);
    const message = error instanceof Error ? error.message : "Unexpected server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// GET para listar sucursales del tenant
export async function GET(_req: NextRequest, { params }: Ctx) {
  try {
    const { slug } = await params;
    const auth = await authorizeTenant(slug);
    if (!auth.ok) return auth.response;

    const { admin: db, tenant } = auth;

    const { data, error } = await db
      .from("branches")
      .select("id, name, slug")
      .eq("tenant_id", tenant.id)
      .order("name", { ascending: true });
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    return NextResponse.json({ branches: data ?? [] });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unexpected server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
