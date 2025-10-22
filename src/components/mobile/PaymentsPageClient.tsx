"use client";

import React from "react";
import { v4 as uuid } from "uuid";
import { getSupabaseBrowserClient } from "@/lib/supabaseClient";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";

type PaymentMethod = "EFECTIVO" | "TRANSFERENCIA" | "ECHEQ";

type PaymentRecord = {
  id: string;
  payment_date: string;
  invoice_number: string;
  provider_name: string;
  payment_method: PaymentMethod;
  note: string | null;
  created_at: string | null;
  provider_id: string;
  provider: PaymentProvider | null;
  amount: number;
};

type PaymentProvider = {
  id: string;
  name: string;
  alias: string | null;
  payment_terms: string | null;
  payment_day: string | null;
  contact_info: string | null;
  created_at: string | null;
};

type Props = {
  slug: string;
  branch: string;
  tenantId: string;
  branchId: string;
  branchName: string;
};

const PAYMENTS_TABLE = "payments";
const PROVIDERS_TABLE = "payment_providers";

const PAYMENT_METHOD_OPTIONS: { value: PaymentMethod; label: string }[] = [
  { value: "EFECTIVO", label: "Efectivo" },
  { value: "TRANSFERENCIA", label: "Transferencia" },
  { value: "ECHEQ", label: "Echeq" },
];

const DAYS_OF_WEEK = [
  "Lunes",
  "Martes",
  "Miércoles",
  "Jueves",
  "Viernes",
  "Sábado",
  "Domingo",
];

type PaymentFormState = {
  date: string;
  invoiceNumber: string;
  providerId: string;
  method: PaymentMethod;
  note: string;
  amount: string;
};

type ProviderFormState = {
  name: string;
  alias: string;
  paymentTerms: string;
  paymentDay: string;
  contactInfo: string;
};

const buildInitialPaymentForm = (providerId = ""): PaymentFormState => ({
  date: new Date().toISOString().slice(0, 10),
  invoiceNumber: "",
  providerId,
  method: "EFECTIVO",
  note: "",
  amount: "",
});

const INITIAL_PROVIDER_FORM: ProviderFormState = {
  name: "",
  alias: "",
  paymentTerms: "",
  paymentDay: "",
  contactInfo: "",
};

export default function PaymentsPageClient({ branchName, tenantId, branchId }: Props) {
  const supabase = React.useMemo(() => getSupabaseBrowserClient(), []);

  const [payments, setPayments] = React.useState<PaymentRecord[]>([]);
  const [providers, setProviders] = React.useState<PaymentProvider[]>([]);
  const [paymentsLoading, setPaymentsLoading] = React.useState(true);
  const [providersLoading, setProvidersLoading] = React.useState(true);
  const [paymentsError, setPaymentsError] = React.useState<string | null>(null);
  const [providersError, setProvidersError] = React.useState<string | null>(null);

  const [registerOpen, setRegisterOpen] = React.useState(false);
  const [providersOpen, setProvidersOpen] = React.useState(false);

  const [paymentForm, setPaymentForm] = React.useState<PaymentFormState>(buildInitialPaymentForm);
  const [providerForm, setProviderForm] = React.useState<ProviderFormState>(INITIAL_PROVIDER_FORM);

  const [savingPayment, setSavingPayment] = React.useState(false);
  const [savingProvider, setSavingProvider] = React.useState(false);

  const [paymentSuccess, setPaymentSuccess] = React.useState<string | null>(null);
  const [providerSuccess, setProviderSuccess] = React.useState<string | null>(null);
  const [paymentFormError, setPaymentFormError] = React.useState<string | null>(null);

  const primaryProviderId = React.useMemo(() => providers[0]?.id ?? "", [providers]);

  const resetPaymentForm = React.useCallback(() => {
    setPaymentForm(buildInitialPaymentForm(primaryProviderId));
  }, [primaryProviderId]);

  const resetProviderForm = React.useCallback(() => {
    setProviderForm(INITIAL_PROVIDER_FORM);
  }, []);

  const loadPayments = React.useCallback(async () => {
    setPaymentsLoading(true);
    setPaymentsError(null);
    const { data, error } = await supabase
      .from(PAYMENTS_TABLE)
      .select(
        `id, payment_date, invoice_number, provider_name, payment_method, note, created_at, provider_id, amount,
          payment_providers:provider_id (id, name, alias, payment_terms, payment_day, contact_info, created_at)`
      )
      .eq("tenant_id", tenantId)
      .eq("branch_id", branchId)
      .order("payment_date", { ascending: false })
      .order("created_at", { ascending: false });

    if (error) {
      console.error("payments fetch failed", error);
      setPaymentsError("No pudimos cargar los pagos.");
      setPayments([]);
    } else {
      setPayments((data ?? []).map(normalizePaymentRow));
    }
    setPaymentsLoading(false);
  }, [supabase, tenantId, branchId]);

  const loadProviders = React.useCallback(async () => {
    setProvidersLoading(true);
    setProvidersError(null);
    const { data, error } = await supabase
      .from(PROVIDERS_TABLE)
      .select("id, name, alias, payment_terms, payment_day, contact_info, created_at")
      .eq("tenant_id", tenantId)
      .eq("branch_id", branchId)
      .order("name", { ascending: true });

    if (error) {
      console.error("payment providers fetch failed", error);
      setProvidersError("No pudimos cargar los proveedores.");
      setProviders([]);
    } else {
      setProviders(data ?? []);
    }
    setProvidersLoading(false);
  }, [supabase, tenantId, branchId]);

  React.useEffect(() => {
    void loadPayments();
    void loadProviders();
  }, [loadPayments, loadProviders]);

  React.useEffect(() => {
    if (!paymentForm.providerId && primaryProviderId) {
      setPaymentForm((prev) => ({ ...prev, providerId: primaryProviderId }));
    }
  }, [primaryProviderId, paymentForm.providerId]);

  const handleSubmitPayment = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSavingPayment(true);
    setPaymentSuccess(null);
    setPaymentFormError(null);

    if (!paymentForm.providerId) {
      setPaymentFormError("Seleccioná un proveedor antes de guardar.");
      setSavingPayment(false);
      return;
    }

    const selectedProvider = providers.find((provider) => provider.id === paymentForm.providerId);
    if (!selectedProvider) {
      setPaymentFormError("El proveedor elegido ya no está disponible.");
      setSavingPayment(false);
      return;
    }

    const parsedAmount = Number(paymentForm.amount.replace(/,/g, "."));
    if (!Number.isFinite(parsedAmount) || parsedAmount <= 0) {
      setPaymentFormError("Ingresá un monto válido mayor a 0.");
      setSavingPayment(false);
      return;
    }

    const amount = Math.round(parsedAmount * 100) / 100;

    const payload = {
      id: uuid(),
      tenant_id: tenantId,
      branch_id: branchId,
      payment_date: paymentForm.date,
      invoice_number: paymentForm.invoiceNumber.trim(),
      provider_name: selectedProvider.name,
      payment_method: paymentForm.method,
      note: paymentForm.note.trim() || null,
      provider_id: selectedProvider.id,
      amount,
    } as const;

    const { data, error } = await supabase
      .from(PAYMENTS_TABLE)
      .insert(payload)
      .select(
        `id, payment_date, invoice_number, provider_name, payment_method, note, created_at, provider_id, amount,
         payment_providers:provider_id (id, name, alias, payment_terms, payment_day, contact_info, created_at)`
      )
      .single();

    if (error) {
      console.error("payment insert failed", error);
      setPaymentFormError("No pudimos registrar el pago. Intentá nuevamente.");
    } else if (data) {
      setPayments((prev) => [normalizePaymentRow(data), ...prev]);
      setPaymentSuccess("Pago registrado");
      resetPaymentForm();
      setRegisterOpen(false);
    }

    setSavingPayment(false);
  };

  const handleSubmitProvider = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSavingProvider(true);
    setProviderSuccess(null);
    setProvidersError(null);

    const payload = {
      id: uuid(),
      tenant_id: tenantId,
      branch_id: branchId,
      name: providerForm.name.trim(),
      alias: providerForm.alias.trim() || null,
      payment_terms: providerForm.paymentTerms.trim() || null,
      payment_day: providerForm.paymentDay || null,
      contact_info: providerForm.contactInfo.trim() || null,
    } as const;

    const { data, error } = await supabase
      .from(PROVIDERS_TABLE)
      .insert(payload)
      .select("id, name, alias, payment_terms, payment_day, contact_info, created_at")
      .single();

    if (error) {
      console.error("provider insert failed", error);
      setProvidersError("No pudimos guardar el proveedor.");
    } else if (data) {
      setProviders((prev) => [...prev, data].sort((a, b) => a.name.localeCompare(b.name)));
      setProviderSuccess("Proveedor agregado");
      resetProviderForm();
    }

    setSavingProvider(false);
  };

  return (
    <section className="mx-auto flex w-full max-w-2xl flex-col gap-6 p-4 pb-20">
      <header className="space-y-1">
        <p className="text-xs uppercase tracking-wide text-neutral-500">{branchName}</p>
        <h1 className="text-2xl font-semibold">Pagos</h1>
        <p className="text-sm text-neutral-500">
          Registrá facturas y llevá el control de los pagos realizados en la sucursal.
        </p>
      </header>

      <div className="flex flex-wrap gap-2">
        <Dialog open={registerOpen} onOpenChange={(open) => {
          setRegisterOpen(open);
          if (!open) {
            setPaymentSuccess(null);
            setPaymentFormError(null);
            resetPaymentForm();
          }
        }}>
          <DialogTrigger asChild>
            <Button>Registrar factura</Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>Registrar factura</DialogTitle>
              <DialogDescription>
                Cargá los datos de la factura pagada para mantener un historial ordenado.
              </DialogDescription>
            </DialogHeader>
            <form className="space-y-4" onSubmit={handleSubmitPayment}>
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-1">
                  <Label htmlFor="payment-date">Fecha</Label>
                  <Input
                    id="payment-date"
                    type="date"
                    value={paymentForm.date}
                    onChange={(event) =>
                      setPaymentForm((prev) => ({ ...prev, date: event.target.value }))
                    }
                    required
                  />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="payment-invoice">Factura / Remito</Label>
                  <Input
                    id="payment-invoice"
                    placeholder="0001-000000"
                    value={paymentForm.invoiceNumber}
                    onChange={(event) =>
                      setPaymentForm((prev) => ({ ...prev, invoiceNumber: event.target.value }))
                    }
                    required
                  />
                </div>
                <div className="space-y-1 sm:col-span-2">
                  <Label>Proveedor</Label>
                  <Select
                    value={paymentForm.providerId}
                    onValueChange={(value) =>
                      setPaymentForm((prev) => ({ ...prev, providerId: value }))
                    }
                    disabled={providers.length === 0}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Seleccioná un proveedor" />
                    </SelectTrigger>
                    <SelectContent>
                      {providers.map((provider) => (
                        <SelectItem key={provider.id} value={provider.id}>
                          {provider.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {providers.length === 0 && (
                    <p className="text-xs text-neutral-500">
                      Primero agregá un proveedor desde “Ver proveedores”.
                    </p>
                  )}
                </div>
                <div className="space-y-1 sm:col-span-2">
                  <Label>Método de pago</Label>
                  <Select
                    value={paymentForm.method}
                    onValueChange={(value) =>
                      setPaymentForm((prev) => ({ ...prev, method: value as PaymentMethod }))
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Seleccioná un método" />
                    </SelectTrigger>
                    <SelectContent>
                      {PAYMENT_METHOD_OPTIONS.map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1 sm:col-span-2">
                  <Label htmlFor="payment-amount">Monto</Label>
                  <Input
                    id="payment-amount"
                    type="number"
                    inputMode="decimal"
                    min="0"
                    step="0.01"
                    placeholder="0,00"
                    value={paymentForm.amount}
                    onChange={(event) =>
                      setPaymentForm((prev) => ({ ...prev, amount: event.target.value }))
                    }
                    required
                  />
                </div>
                <div className="space-y-1 sm:col-span-2">
                  <Label htmlFor="payment-note">Observación</Label>
                  <textarea
                    id="payment-note"
                    value={paymentForm.note}
                    onChange={(event) =>
                      setPaymentForm((prev) => ({ ...prev, note: event.target.value }))
                    }
                    placeholder="Detalle adicional, referencia interna, etc."
                    rows={3}
                    className="w-full rounded-md border border-neutral-300 bg-white px-3 py-2 text-sm shadow-sm focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-500/40"
                  />
                </div>
              </div>
              {paymentFormError && (
                <p className="text-sm text-rose-600">{paymentFormError}</p>
              )}
              {paymentSuccess && (
                <p className="text-sm text-emerald-600">{paymentSuccess}</p>
              )}
              <DialogFooter className="gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setRegisterOpen(false)}
                  disabled={savingPayment}
                >
                  Cancelar
                </Button>
                <Button
                  type="submit"
                  disabled={savingPayment || providers.length === 0}
                >
                  {savingPayment ? "Guardando..." : "Agregar"}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>

        <Dialog open={providersOpen} onOpenChange={(open) => {
          setProvidersOpen(open);
          if (!open) {
            setProviderSuccess(null);
            resetProviderForm();
          }
        }}>
          <DialogTrigger asChild>
            <Button variant="outline">Ver proveedores</Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Proveedores</DialogTitle>
              <DialogDescription>
                Listado de proveedores vinculados a la sucursal y formulario para sumar nuevos.
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-6 lg:grid-cols-[1fr_280px]">
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-medium text-neutral-700">Registrados</h3>
                  {providersLoading && <span className="text-xs text-neutral-400">Cargando...</span>}
                </div>
                {providersError && (
                  <p className="text-sm text-rose-600">{providersError}</p>
                )}
                <ScrollArea className="h-64 rounded-md border">
                  <div className="divide-y">
                  {providers.length === 0 && !providersLoading && (
                      <p className="p-4 text-sm text-neutral-500">
                        Todavía no agregaste proveedores.
                      </p>
                    )}
                    {providers.map((provider) => (
                      <article key={provider.id} className="p-4 text-sm">
                        <h4 className="font-medium text-neutral-900">{provider.name}</h4>
                        <dl className="mt-1 space-y-1 text-neutral-600">
                          {provider.alias && (
                            <div>
                              <dt className="uppercase tracking-wide text-[10px] text-neutral-400">Alias / Cuenta</dt>
                              <dd>{provider.alias}</dd>
                            </div>
                          )}
                          {provider.payment_terms && (
                            <div>
                              <dt className="uppercase tracking-wide text-[10px] text-neutral-400">Plazo</dt>
                              <dd>{provider.payment_terms}</dd>
                            </div>
                          )}
                          {provider.payment_day && (
                            <div>
                              <dt className="uppercase tracking-wide text-[10px] text-neutral-400">Día de pago</dt>
                              <dd>{provider.payment_day}</dd>
                            </div>
                          )}
                          {provider.contact_info && (
                            <div>
                              <dt className="uppercase tracking-wide text-[10px] text-neutral-400">Contacto</dt>
                              <dd>{provider.contact_info}</dd>
                            </div>
                          )}
                        </dl>
                      </article>
                    ))}
                  </div>
                </ScrollArea>
              </div>

              <form className="space-y-3" onSubmit={handleSubmitProvider}>
                <h3 className="text-sm font-medium text-neutral-700">Agregar proveedor</h3>
                <div className="space-y-1">
                  <Label htmlFor="provider-name">Nombre</Label>
                  <Input
                    id="provider-name"
                    value={providerForm.name}
                    onChange={(event) =>
                      setProviderForm((prev) => ({ ...prev, name: event.target.value }))
                    }
                    required
                  />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="provider-alias">Alias o número de cuenta</Label>
                  <Input
                    id="provider-alias"
                    value={providerForm.alias}
                    onChange={(event) =>
                      setProviderForm((prev) => ({ ...prev, alias: event.target.value }))
                    }
                    placeholder="ALIAS.EJEMPLO" 
                  />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="provider-terms">Plazo de pago</Label>
                  <Input
                    id="provider-terms"
                    value={providerForm.paymentTerms}
                    onChange={(event) =>
                      setProviderForm((prev) => ({ ...prev, paymentTerms: event.target.value }))
                    }
                    placeholder="Ej: 30 días"
                  />
                </div>
                <div className="space-y-1">
                  <Label>Día de pago</Label>
                  <Select
                    value={providerForm.paymentDay}
                    onValueChange={(value) =>
                      setProviderForm((prev) => ({ ...prev, paymentDay: value }))
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Seleccioná un día" />
                    </SelectTrigger>
                    <SelectContent>
                      {DAYS_OF_WEEK.map((day) => (
                        <SelectItem key={day} value={day}>
                          {day}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <Label htmlFor="provider-contact">Información de contacto</Label>
                  <textarea
                    id="provider-contact"
                    value={providerForm.contactInfo}
                    onChange={(event) =>
                      setProviderForm((prev) => ({ ...prev, contactInfo: event.target.value }))
                    }
                    rows={3}
                    placeholder="Nombre, teléfono, email"
                    className="w-full rounded-md border border-neutral-300 bg-white px-3 py-2 text-sm shadow-sm focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-500/40"
                  />
                </div>
                {providersError && !savingProvider && (
                  <p className="text-sm text-rose-600">{providersError}</p>
                )}
                {providerSuccess && (
                  <p className="text-sm text-emerald-600">{providerSuccess}</p>
                )}
                <div className="flex justify-end gap-2">
                  <Button type="submit" disabled={savingProvider}>
                    {savingProvider ? "Guardando..." : "Agregar proveedor"}
                  </Button>
                </div>
              </form>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <section className="space-y-3">
        <h2 className="text-sm font-medium text-neutral-700">Historial de pagos</h2>
        {paymentsLoading && (
          <div className="space-y-3">
            {Array.from({ length: 3 }).map((_, idx) => (
              <PlaceholderCard key={idx} />
            ))}
          </div>
        )}
        {paymentsError && !paymentsLoading && (
          <p className="text-sm text-rose-600">{paymentsError}</p>
        )}
        {!paymentsLoading && payments.length === 0 && !paymentsError && (
          <p className="text-sm text-neutral-500">Aún no registraste pagos.</p>
        )}
        <div className="space-y-3">
          {payments.map((payment) => (
            <Card key={payment.id}>
              <CardHeader>
                <CardTitle className="flex items-center justify-between text-base">
                  <span>{payment.provider?.name ?? payment.provider_name}</span>
                  <span className="text-sm font-normal text-neutral-500">
                    {formatDate(payment.payment_date)}
                  </span>
                </CardTitle>
                <CardDescription>
                  Factura {payment.invoice_number} · {methodLabel(payment.payment_method)} · {formatCurrency(payment.amount)}
                </CardDescription>
              </CardHeader>
              {(payment.provider || payment.note) && (
                <CardContent className="space-y-3">
                  {payment.provider && (
                    <dl className="grid gap-2 text-sm text-neutral-600 sm:grid-cols-2">
                      {payment.provider.alias && (
                        <div>
                          <dt className="text-[11px] uppercase tracking-wide text-neutral-400">
                            Alias / Cuenta
                          </dt>
                          <dd>{payment.provider.alias}</dd>
                        </div>
                      )}
                      {payment.provider.payment_terms && (
                        <div>
                          <dt className="text-[11px] uppercase tracking-wide text-neutral-400">
                            Plazo de pago
                          </dt>
                          <dd>{payment.provider.payment_terms}</dd>
                        </div>
                      )}
                      {payment.provider.payment_day && (
                        <div>
                          <dt className="text-[11px] uppercase tracking-wide text-neutral-400">
                            Día de pago
                          </dt>
                          <dd>{payment.provider.payment_day}</dd>
                        </div>
                      )}
                      {payment.provider.contact_info && (
                        <div className="sm:col-span-2">
                          <dt className="text-[11px] uppercase tracking-wide text-neutral-400">
                            Contacto
                          </dt>
                          <dd>{payment.provider.contact_info}</dd>
                        </div>
                      )}
                    </dl>
                  )}
                  {payment.note && (
                    <p className="text-sm text-neutral-700">{payment.note}</p>
                  )}
                </CardContent>
              )}
            </Card>
          ))}
        </div>
      </section>
    </section>
  );
}

type PaymentRow = {
  id: string;
  payment_date: string;
  invoice_number: string;
  provider_name: string;
  payment_method: PaymentMethod;
  note: string | null;
  created_at: string | null;
  provider_id: string;
  payment_providers?: PaymentProvider | null;
  amount: string | number;
};

function normalizePaymentRow(row: PaymentRow): PaymentRecord {
  return {
    id: row.id,
    payment_date: row.payment_date,
    invoice_number: row.invoice_number,
    provider_name: row.provider_name,
    payment_method: row.payment_method,
    note: row.note,
    created_at: row.created_at,
    provider_id: row.provider_id,
    provider: row.payment_providers ?? null,
    amount: typeof row.amount === "number" ? row.amount : Number(row.amount ?? 0),
  };
}

function PlaceholderCard() {
  return (
    <div className="animate-pulse rounded-xl border bg-white p-5 shadow-sm">
      <div className="flex justify-between">
        <span className="h-4 w-28 rounded bg-neutral-200" />
        <span className="h-4 w-16 rounded bg-neutral-200" />
      </div>
      <div className="mt-3 h-4 w-48 rounded bg-neutral-200" />
      <div className="mt-3 h-3 w-3/4 rounded bg-neutral-100" />
    </div>
  );
}

function methodLabel(method: PaymentMethod) {
  const entry = PAYMENT_METHOD_OPTIONS.find((option) => option.value === method);
  return entry ? entry.label : method;
}

function formatDate(iso: string | null) {
  if (!iso) return "Sin fecha";
  try {
    return new Date(iso).toLocaleDateString("es-AR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });
  } catch (error) {
    console.warn("date parsing failed", { iso, error });
    return iso;
  }
}

const currencyFormatter = new Intl.NumberFormat("es-AR", {
  style: "currency",
  currency: "ARS",
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

function formatCurrency(amount: number) {
  if (!Number.isFinite(amount)) return "-";
  return currencyFormatter.format(amount);
}
