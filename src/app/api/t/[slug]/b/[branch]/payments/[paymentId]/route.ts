import { NextRequest, NextResponse } from "next/server";
import { getSupabaseRouteClient, getSupabaseServiceRoleClient } from "@/lib/supabaseServer";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type RouteParams = { slug: string; branch: string; paymentId: string };

type MembershipRow = {
  branch_ids: string[] | null;
  role: string | null;
};

type TenantRow = { id: string };
type BranchRow = { id: string; tenant_id: string };

type PaymentRow = { id: string };

export async function DELETE(
  _request: NextRequest,
  context: { params: Promise<RouteParams> }
) {
  const { slug, branch, paymentId } = await context.params;
  const supabase = await getSupabaseRouteClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "No autenticado." }, { status: 401 });
  }

  const { data: tenant, error: tenantError } = await supabase
    .from("tenants")
    .select("id")
    .eq("slug", slug)
    .maybeSingle<TenantRow>();

  if (tenantError) {
    return NextResponse.json({ error: tenantError.message }, { status: 500 });
  }
  if (!tenant) {
    return NextResponse.json({ error: "Tenant no encontrado." }, { status: 404 });
  }

  const { data: branchRow, error: branchError } = await supabase
    .from("branches")
    .select("id, tenant_id")
    .eq("slug", branch)
    .eq("tenant_id", tenant.id)
    .maybeSingle<BranchRow>();

  if (branchError) {
    return NextResponse.json({ error: branchError.message }, { status: 500 });
  }
  if (!branchRow) {
    return NextResponse.json({ error: "Sucursal no encontrada." }, { status: 404 });
  }

  const { data: membership, error: membershipError } = await supabase
    .from("memberships")
    .select("branch_ids, role")
    .eq("tenant_id", tenant.id)
    .eq("user_id", user.id)
    .maybeSingle<MembershipRow>();

  if (membershipError) {
    return NextResponse.json({ error: membershipError.message }, { status: 500 });
  }
  const authorized =
    membership != null &&
    (membership.branch_ids === null || membership.branch_ids.includes(branchRow.id));

  if (!authorized) {
    return NextResponse.json({ error: "No autorizado a operar sobre esta sucursal." }, { status: 403 });
  }

  const { data: payment, error: paymentLookupError } = await supabase
    .from("payments")
    .select("id")
    .eq("id", paymentId)
    .eq("tenant_id", tenant.id)
    .eq("branch_id", branchRow.id)
    .maybeSingle<PaymentRow>();

  if (paymentLookupError) {
    return NextResponse.json({ error: paymentLookupError.message }, { status: 500 });
  }
  if (!payment) {
    return NextResponse.json({ error: "Factura inexistente." }, { status: 404 });
  }

  const serviceClient = getSupabaseServiceRoleClient();
  const { error: deleteError } = await serviceClient
    .from("payments")
    .delete()
    .eq("id", paymentId)
    .eq("tenant_id", tenant.id)
    .eq("branch_id", branchRow.id);

  if (deleteError) {
    return NextResponse.json({ error: deleteError.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
