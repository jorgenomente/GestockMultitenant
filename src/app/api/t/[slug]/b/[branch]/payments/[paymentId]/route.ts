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

type PaymentMethod = "EFECTIVO" | "TRANSFERENCIA" | "ECHEQ";

type PaymentUpdatePayload = Partial<{
  payment_date: string;
  invoice_number: string;
  provider_name: string;
  provider_id: string;
  payment_method: PaymentMethod;
  note: string | null;
  amount: number;
}>;

type AuthorizedContext = {
  userId: string;
  tenant: TenantRow;
  branch: BranchRow;
};

async function authorizeRequest(
  context: { params: Promise<RouteParams> }
): Promise<{ error?: NextResponse; data?: AuthorizedContext; params?: RouteParams }> {
  const params = await context.params;
  const supabase = await getSupabaseRouteClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: NextResponse.json({ error: "No autenticado." }, { status: 401 }) };
  }

  const { data: tenant, error: tenantError } = await supabase
    .from("tenants")
    .select("id")
    .eq("slug", params.slug)
    .maybeSingle<TenantRow>();

  if (tenantError) {
    return { error: NextResponse.json({ error: tenantError.message }, { status: 500 }) };
  }
  if (!tenant) {
    return { error: NextResponse.json({ error: "Tenant no encontrado." }, { status: 404 }) };
  }

  const { data: branch, error: branchError } = await supabase
    .from("branches")
    .select("id, tenant_id")
    .eq("slug", params.branch)
    .eq("tenant_id", tenant.id)
    .maybeSingle<BranchRow>();

  if (branchError) {
    return { error: NextResponse.json({ error: branchError.message }, { status: 500 }) };
  }
  if (!branch) {
    return { error: NextResponse.json({ error: "Sucursal no encontrada." }, { status: 404 }) };
  }

  const { data: membership, error: membershipError } = await supabase
    .from("memberships")
    .select("branch_ids, role")
    .eq("tenant_id", tenant.id)
    .eq("user_id", user.id)
    .maybeSingle<MembershipRow>();

  if (membershipError) {
    return { error: NextResponse.json({ error: membershipError.message }, { status: 500 }) };
  }
  const authorized =
    membership != null &&
    (membership.branch_ids === null || membership.branch_ids.includes(branch.id));

  if (!authorized) {
    return { error: NextResponse.json({ error: "No autorizado a operar sobre esta sucursal." }, { status: 403 }) };
  }

  return { data: { userId: user.id, tenant, branch }, params };
}

function sanitizeUpdatePayload(payload: unknown): { data?: PaymentUpdatePayload; error?: string } {
  if (!payload || typeof payload !== "object") {
    return { error: "Payload inválido" };
  }

  const cast = payload as Record<string, unknown>;
  const result: PaymentUpdatePayload = {};

  if ("payment_date" in cast) {
    if (typeof cast.payment_date !== "string" || cast.payment_date.trim().length === 0) {
      return { error: "payment_date inválida" };
    }
    result.payment_date = cast.payment_date.trim();
  }

  if ("invoice_number" in cast) {
    if (typeof cast.invoice_number !== "string" || cast.invoice_number.trim().length === 0) {
      return { error: "invoice_number inválido" };
    }
    result.invoice_number = cast.invoice_number.trim();
  }

  if ("payment_method" in cast) {
    if (
      typeof cast.payment_method !== "string" ||
      !["EFECTIVO", "TRANSFERENCIA", "ECHEQ"].includes(cast.payment_method)
    ) {
      return { error: "payment_method inválido" };
    }
    result.payment_method = cast.payment_method as PaymentMethod;
  }

  if ("note" in cast) {
    if (cast.note !== null && typeof cast.note !== "string") {
      return { error: "note inválida" };
    }
    result.note = cast.note as string | null;
  }

  if ("amount" in cast) {
    const amount = typeof cast.amount === "number" ? cast.amount : Number(cast.amount);
    if (!Number.isFinite(amount)) {
      return { error: "amount inválido" };
    }
    result.amount = amount;
  }

  if ("provider_id" in cast) {
    if (typeof cast.provider_id !== "string" || cast.provider_id.trim().length === 0) {
      return { error: "provider_id inválido" };
    }
    result.provider_id = cast.provider_id.trim();
  }

  if ("provider_name" in cast) {
    if (typeof cast.provider_name !== "string" || cast.provider_name.trim().length === 0) {
      return { error: "provider_name inválido" };
    }
    result.provider_name = cast.provider_name.trim();
  }

  if (Object.keys(result).length === 0) {
    return { error: "No se enviaron campos para actualizar." };
  }

  return { data: result };
}

async function ensureProviderBelongs(
  providerId: string,
  tenantId: string,
  branchId: string
) {
  const serviceClient = getSupabaseServiceRoleClient();
  const { data, error } = await serviceClient
    .from("payment_providers")
    .select("id, name")
    .eq("id", providerId)
    .eq("tenant_id", tenantId)
    .eq("branch_id", branchId)
    .maybeSingle<{ id: string; name: string }>();

  if (error) {
    throw new Error(error.message);
  }
  if (!data) {
    throw new Error("El proveedor elegido no pertenece a la sucursal actual.");
  }

  return data;
}

async function updatePaymentRow(
  paymentId: string,
  tenantId: string,
  branchId: string,
  payload: PaymentUpdatePayload
) {
  const serviceClient = getSupabaseServiceRoleClient();
  return serviceClient
    .from("payments")
    .update(payload)
    .eq("id", paymentId)
    .eq("tenant_id", tenantId)
    .eq("branch_id", branchId)
    .select(
      `id, payment_date, invoice_number, provider_name, payment_method, note, created_at, provider_id, amount,
       payment_providers:provider_id (id, name, alias, whatsapp, payment_terms, payment_day, contact_info, created_at)`
    )
    .maybeSingle();
}

export async function DELETE(
  _request: NextRequest,
  context: { params: Promise<RouteParams> }
) {
  const authResult = await authorizeRequest(context);
  if (authResult.error) return authResult.error;
  const { tenant, branch } = authResult.data!;
  const { params } = authResult;
  const paymentId = params!.paymentId;

  const serviceClient = getSupabaseServiceRoleClient();
  const { data: payment, error: paymentLookupError } = await serviceClient
    .from("payments")
    .select("id")
    .eq("id", paymentId)
    .eq("tenant_id", tenant.id)
    .eq("branch_id", branch.id)
    .maybeSingle<PaymentRow>();

  if (paymentLookupError) {
    return NextResponse.json({ error: paymentLookupError.message }, { status: 500 });
  }
  if (!payment) {
    return NextResponse.json({ error: "Factura inexistente." }, { status: 404 });
  }
  const { error: deleteError } = await serviceClient
    .from("payments")
    .delete()
    .eq("id", paymentId)
    .eq("tenant_id", tenant.id)
    .eq("branch_id", branch.id);

  if (deleteError) {
    return NextResponse.json({ error: deleteError.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}

export async function PATCH(request: NextRequest, context: { params: Promise<RouteParams> }) {
  const authResult = await authorizeRequest(context);
  if (authResult.error) return authResult.error;
  const { tenant, branch } = authResult.data!;
  const { params } = authResult;
  const paymentId = params!.paymentId;

  let payload: PaymentUpdatePayload | undefined;
  try {
    const json = await request.json();
    const parsed = sanitizeUpdatePayload(json);
    if (parsed.error) {
      return NextResponse.json({ error: parsed.error }, { status: 400 });
    }
    payload = parsed.data;
  } catch {
    return NextResponse.json({ error: "Body inválido o malformado." }, { status: 400 });
  }

  if (!payload || Object.keys(payload).length === 0) {
    return NextResponse.json({ error: "No se enviaron campos para actualizar." }, { status: 400 });
  }

  try {
    if (payload.provider_id) {
      const provider = await ensureProviderBelongs(payload.provider_id, tenant.id, branch.id);
      payload.provider_name = provider.name;
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: message }, { status: 400 });
  }

  const { data, error } = await updatePaymentRow(paymentId, tenant.id, branch.id, payload);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  if (!data) {
    return NextResponse.json({ error: "No encontramos el pago solicitado." }, { status: 404 });
  }

  return NextResponse.json({ data });
}
