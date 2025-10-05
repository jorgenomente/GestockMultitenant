// src/app/api/t/[slug]/branches/route.ts
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@supabase/supabase-js";

export const dynamic = "force-dynamic"; // evita cache accidental
export const runtime = "nodejs";        // Service Role no debe correr en Edge

const BodySchema = z.object({
  name: z.string().min(2),
  slug: z.string().min(2).regex(/^[a-z0-9-]+$/),
});

function getServiceDb() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY!;
  if (!url || !key) throw new Error("Faltan env: NEXT_PUBLIC_SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY");
  return createClient(url, key);
}

type Ctx = { params: Promise<{ slug: string }> };

export async function POST(req: NextRequest, { params }: Ctx) {
  try {
    const { slug } = await params;
    const db = getServiceDb();

    // 1) validar body
    const json = await req.json().catch(() => ({}));
    const parsed = BodySchema.safeParse(json);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
    }
    const { name, slug: branchSlug } = parsed.data;

    // 2) obtener tenant por slug de la URL
    const { data: tenant, error: tErr } = await db
      .from("tenants")
      .select("id")
      .eq("slug", slug)
      .maybeSingle();
    if (tErr) return NextResponse.json({ error: tErr.message }, { status: 500 });
    if (!tenant) return NextResponse.json({ error: "Tenant no encontrado" }, { status: 404 });

    // 3) chequear duplicado (opcional pero con mejor mensaje)
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

    // 4) insertar
    const { data: inserted, error: iErr } = await db
      .from("branches")
      .insert({ name, slug: branchSlug, tenant_id: tenant.id })
      .select("id, name, slug, tenant_id")
      .single();
    if (iErr) return NextResponse.json({ error: iErr.message }, { status: 500 });

    return NextResponse.json({ branch: inserted }, { status: 201 });
  } catch (e: any) {
    console.error("POST /api/t/[slug]/branches", e);
    return NextResponse.json({ error: e?.message ?? "Unexpected server error" }, { status: 500 });
  }
}

// GET para listar sucursales del tenant
export async function GET(_req: NextRequest, { params }: Ctx) {
  try {
    const { slug } = await params;
    const db = getServiceDb();

    const { data: tenant, error: tErr } = await db
      .from("tenants")
      .select("id")
      .eq("slug", slug)
      .maybeSingle();
    if (tErr) return NextResponse.json({ error: tErr.message }, { status: 500 });
    if (!tenant) return NextResponse.json({ error: "Tenant no encontrado" }, { status: 404 });

    const { data, error } = await db
      .from("branches")
      .select("id, name, slug")
      .eq("tenant_id", tenant.id)
      .order("name", { ascending: true });
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    return NextResponse.json({ branches: data ?? [] });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message ?? "Unexpected server error" }, { status: 500 });
  }
}
