// src/app/api/t/[slug]/tenant/route.ts
import { NextRequest, NextResponse } from "next/server";
import { authorizeTenant } from "@/app/api/t/[slug]/_utils/tenantAuth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ slug: string }> };

export async function GET(_req: NextRequest, { params }: Ctx) {
  const { slug } = await params;
  const auth = await authorizeTenant(slug);
  if (!auth.ok) return auth.response;

  return NextResponse.json(auth.tenant);
}
