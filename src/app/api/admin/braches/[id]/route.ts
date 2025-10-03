import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

function getServiceDb() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY!;
  return createClient(url, key);
}

type Params = { params: { slug: string; id: string } };

export async function DELETE(_req: Request, { params }: Params) {
  const db = getServiceDb();

  // Aseguramos que la branch pertenezca al tenant del slug
  const { data: tenant, error: tErr } = await db
    .from("tenants")
    .select("id")
    .eq("slug", params.slug)
    .single();

  if (tErr || !tenant) {
    return NextResponse.json({ error: "Tenant no encontrado" }, { status: 404 });
  }

  const { error } = await db
    .from("branches")
    .delete()
    .eq("id", params.id)
    .eq("tenant_id", tenant.id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
