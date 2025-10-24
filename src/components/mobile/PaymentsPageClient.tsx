"use client";

import React from "react";
import { v4 as uuid } from "uuid";
import { getSupabaseBrowserClient } from "@/lib/supabaseClient";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
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
import { cn } from "@/lib/utils";

type PaymentMethod = "EFECTIVO" | "TRANSFERENCIA" | "ECHEQ";

type PaymentPriority = "days" | "day" | "none";

type ProviderConfig = {
  priority: PaymentPriority;
  days: number | null;
  dayOfWeek: string | null;
};

type PaymentMeta = {
  priority: PaymentPriority;
  days?: number | null;
  dayOfWeek?: string | null;
  dueDate?: string | null;
  paidAt?: string | null;
  urgent?: boolean | null;
};

type PaymentNotePayload = {
  text?: string | null;
  meta?: PaymentMeta | null;
};

type PaymentRecord = {
  id: string;
  payment_date: string;
  invoice_number: string;
  provider_name: string;
  payment_method: PaymentMethod;
  rawNote: string | null;
  noteText: string | null;
  meta: PaymentMeta;
  created_at: string | null;
  provider_id: string;
  provider: PaymentProvider | null;
  amount: number;
};

type EnrichedPayment = PaymentRecord & {
  config: ProviderConfig;
  dueDate: string | null;
  dueDateObj: Date | null;
  dueDayLabel: string | null;
  status: "pending" | "paid";
  paidDate: string | null;
  isOverdue: boolean;
  isUrgent: boolean;
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
  paymentDay: string;
  contactInfo: string;
  priority: PaymentPriority;
  days: string;
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
  paymentDay: "",
  contactInfo: "",
  priority: "days",
  days: "",
};

const WEEKDAY_INDEX: Record<string, number> = {
  lunes: 1,
  martes: 2,
  miercoles: 3,
  miércoles: 3,
  jueves: 4,
  viernes: 5,
  sabado: 6,
  sábado: 6,
  domingo: 0,
};

function normalizeDayName(day: string | null | undefined): string | null {
  if (!day) return null;
  const trimmed = day.trim().toLowerCase();
  return trimmed || null;
}

function capitalize(word: string | null | undefined): string {
  if (!word) return "";
  return word.charAt(0).toUpperCase() + word.slice(1);
}

function parseProviderConfig(provider: PaymentProvider | null): ProviderConfig {
  let priority: PaymentPriority = "none";
  let days: number | null = null;
  const dayOfWeek = normalizeDayName(provider?.payment_day) ?? null;

  if (provider?.payment_terms) {
    try {
      const parsed = JSON.parse(provider.payment_terms);
      if (typeof parsed?.priority === "string") {
        const pr = parsed.priority as PaymentPriority;
        if (pr === "day" || pr === "days") priority = pr;
      }
      if (parsed?.days != null) {
        const num = Number(parsed.days);
        if (Number.isFinite(num) && num > 0) days = Math.round(num);
      }
    } catch {
      const digits = provider.payment_terms.match(/\d+/);
      if (digits) {
        const num = Number(digits[0]);
        if (Number.isFinite(num) && num > 0) {
          priority = "days";
          days = Math.round(num);
        }
      }
    }
  }

  if (priority === "none") {
    if (dayOfWeek) priority = "day";
    else if (days) priority = "days";
  }

  return { priority, days, dayOfWeek };
}

function computeDueDate(invoiceIso: string, config: ProviderConfig): string | null {
  if (!invoiceIso) return null;
  const base = new Date(invoiceIso);
  if (Number.isNaN(base.getTime())) return null;

  if (config.priority === "day" && config.dayOfWeek) {
    const idx = WEEKDAY_INDEX[config.dayOfWeek] ?? null;
    if (idx == null) return null;
    const current = base.getDay();
    let diff = idx - current;
    if (diff < 0) diff += 7;
    if (diff === 0) {
      // mismo día -> se paga hoy
      return base.toISOString().slice(0, 10);
    }
    const due = new Date(base);
    due.setDate(base.getDate() + diff);
    return due.toISOString().slice(0, 10);
  }

  if (config.priority === "days" && typeof config.days === "number" && config.days > 0) {
    const due = new Date(base);
    due.setDate(base.getDate() + config.days);
    return due.toISOString().slice(0, 10);
  }

  return null;
}

function parsePaymentNote(note: string | null): { text: string | null; meta: PaymentMeta } {
  if (!note) {
    return { text: null, meta: { priority: "none", urgent: false } };
  }
  try {
    const parsed = JSON.parse(note) as PaymentNotePayload;
    const text = typeof parsed?.text === "string" ? parsed.text : null;
    const meta = parsed?.meta ?? { priority: "none" };
    return {
      text,
      meta: {
        priority: meta.priority ?? "none",
        days: meta.days ?? null,
        dayOfWeek: meta.dayOfWeek ?? null,
        dueDate: meta.dueDate ?? null,
        paidAt: meta.paidAt ?? null,
        urgent: Boolean(meta.urgent),
      },
    };
  } catch {
    return { text: note, meta: { priority: "none", urgent: false } };
  }
}

function buildPaymentNote(text: string | null, meta: PaymentMeta | null): string | null {
  const sanitizedText = text?.trim() || null;
  let sanitizedMeta = meta ? { ...meta } : null;
  if (sanitizedMeta) {
    sanitizedMeta.priority = sanitizedMeta.priority ?? "none";
    const hasMetaInfo =
      sanitizedMeta.priority !== "none" ||
      sanitizedMeta.days != null ||
      sanitizedMeta.dayOfWeek != null ||
      sanitizedMeta.dueDate != null ||
      sanitizedMeta.paidAt != null ||
      Boolean(sanitizedMeta.urgent);
    if (!hasMetaInfo) {
      sanitizedMeta = null;
    }
  }
  if (!sanitizedText && !sanitizedMeta) return null;
  return JSON.stringify({
    text: sanitizedText,
    meta: sanitizedMeta,
  } satisfies PaymentNotePayload);
}

function formatIsoDate(iso: string | null): string {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleDateString("es-AR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });
  } catch {
    return iso;
  }
}

function formatIsoWeekday(iso: string | null): string | null {
  if (!iso) return null;
  try {
    return new Date(iso).toLocaleDateString("es-AR", { weekday: "long" });
  } catch {
    return null;
  }
}

function toTimestamp(iso: string | null): number | null {
  if (!iso) return null;
  const d = new Date(iso);
  const t = d.getTime();
  return Number.isNaN(t) ? null : t;
}

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
  const [showProviderForm, setShowProviderForm] = React.useState(false);
  const [editingProviderId, setEditingProviderId] = React.useState<string | null>(null);
  const [deletingProviderId, setDeletingProviderId] = React.useState<string | null>(null);

  const [savingPayment, setSavingPayment] = React.useState(false);
  const [savingProvider, setSavingProvider] = React.useState(false);

  const [paymentSuccess, setPaymentSuccess] = React.useState<string | null>(null);
  const [providerSuccess, setProviderSuccess] = React.useState<string | null>(null);
  const [paymentFormError, setPaymentFormError] = React.useState<string | null>(null);

  const [markDialogOpen, setMarkDialogOpen] = React.useState(false);
  const [selectedPayment, setSelectedPayment] = React.useState<PaymentRecord | null>(null);
  const [markDate, setMarkDate] = React.useState<string>(new Date().toISOString().slice(0, 10));
  const [markSaving, setMarkSaving] = React.useState(false);
  const [markError, setMarkError] = React.useState<string | null>(null);
  const [editingPaymentId, setEditingPaymentId] = React.useState<string | null>(null);
  const [deletingPaymentId, setDeletingPaymentId] = React.useState<string | null>(null);
  const [togglingUrgentId, setTogglingUrgentId] = React.useState<string | null>(null);

  const primaryProviderId = React.useMemo(() => providers[0]?.id ?? "", [providers]);

  const resetPaymentForm = React.useCallback(() => {
    setPaymentForm(buildInitialPaymentForm(primaryProviderId));
    setEditingPaymentId(null);
  }, [primaryProviderId, setEditingPaymentId]);

  const resetProviderForm = React.useCallback(() => {
    setProviderForm(INITIAL_PROVIDER_FORM);
    setEditingProviderId(null);
  }, [setEditingProviderId]);

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

  const enrichedPayments = React.useMemo<EnrichedPayment[]>(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return payments.map((payment) => {
      const config = parseProviderConfig(payment.provider);
      const dueDate = payment.meta.dueDate ?? computeDueDate(payment.payment_date, config);
      const dueDateObj = dueDate ? new Date(dueDate) : null;
      const isImmediate = payment.payment_method === "EFECTIVO";
      const status: "pending" | "paid" = !isImmediate && !payment.meta.paidAt ? "pending" : "paid";
      const paidDate = payment.meta.paidAt ?? (status === "paid" ? payment.payment_date : null);
      const isOverdue = status === "pending" && dueDateObj
        ? dueDateObj.getTime() < today.getTime()
        : false;

      return {
        ...payment,
        config,
        dueDate: dueDate ?? null,
        dueDateObj: dueDateObj && !Number.isNaN(dueDateObj.getTime()) ? dueDateObj : null,
        dueDayLabel: formatIsoWeekday(dueDate),
        status,
        paidDate,
        isOverdue,
        isUrgent: Boolean(payment.meta.urgent),
      } as EnrichedPayment;
    });
  }, [payments]);

  const pendingPayments = React.useMemo(() => {
    return enrichedPayments
      .filter((payment) => payment.status === "pending")
      .slice()
      .sort((a, b) => {
        if (a.isUrgent && !b.isUrgent) return -1;
        if (!a.isUrgent && b.isUrgent) return 1;
        const ta = a.dueDateObj ? a.dueDateObj.getTime() : Number.POSITIVE_INFINITY;
        const tb = b.dueDateObj ? b.dueDateObj.getTime() : Number.POSITIVE_INFINITY;
        if (ta !== tb) return ta - tb;
        const fa = toTimestamp(a.payment_date) ?? Number.POSITIVE_INFINITY;
        const fb = toTimestamp(b.payment_date) ?? Number.POSITIVE_INFINITY;
        return fa - fb;
      });
  }, [enrichedPayments]);

  const paidPayments = React.useMemo(() => {
    return enrichedPayments
      .filter((payment) => payment.status === "paid")
      .slice()
      .sort((a, b) => {
        if (a.isUrgent && !b.isUrgent) return -1;
        if (!a.isUrgent && b.isUrgent) return 1;
        const ta = toTimestamp(a.meta.paidAt ?? a.payment_date) ?? Number.NEGATIVE_INFINITY;
        const tb = toTimestamp(b.meta.paidAt ?? b.payment_date) ?? Number.NEGATIVE_INFINITY;
        if (tb !== ta) return tb - ta;
        return (toTimestamp(b.payment_date) ?? 0) - (toTimestamp(a.payment_date) ?? 0);
      });
  }, [enrichedPayments]);

  const handleOpenMarkDialog = React.useCallback((payment: PaymentRecord, initialDate?: string | null) => {
    const fallbackDate = payment.meta.paidAt ?? payment.payment_date ?? new Date().toISOString().slice(0, 10);
    setSelectedPayment(payment);
    setMarkDate(initialDate ?? fallbackDate);
    setMarkError(null);
    setMarkDialogOpen(true);
  }, []);

  const handleConfirmMarkPaid = React.useCallback(async () => {
    if (!selectedPayment) return;
    if (!markDate) {
      setMarkError("Seleccioná una fecha válida.");
      return;
    }
    const isoDate = markDate;
    setMarkSaving(true);
    setMarkError(null);
    const updatedMeta: PaymentMeta = { ...selectedPayment.meta, paidAt: isoDate };
    const newNote = buildPaymentNote(selectedPayment.noteText, updatedMeta);

    try {
      const { data, error } = await supabase
        .from(PAYMENTS_TABLE)
        .update({ note: newNote })
        .eq("id", selectedPayment.id)
        .select(
          `id, payment_date, invoice_number, provider_name, payment_method, note, created_at, provider_id, amount,
           payment_providers:provider_id (id, name, alias, payment_terms, payment_day, contact_info, created_at)`
        )
        .single();

      if (error) {
        console.error("payment mark paid failed", error);
        setMarkError("No pudimos actualizar el pago.");
      } else if (data) {
        setPayments((prev) => prev.map((item) => (item.id === data.id ? normalizePaymentRow(data) : item)));
        setMarkDialogOpen(false);
        setSelectedPayment(null);
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      console.error("payment mark paid exception", message);
      setMarkError("Ocurrió un error inesperado.");
    } finally {
      setMarkSaving(false);
    }
  }, [selectedPayment, markDate, supabase]);

  const handleSubmitPayment = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSavingPayment(true);
    setPaymentSuccess(null);
    setPaymentFormError(null);
    setPaymentsError(null);

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
    const existingPayment = editingPaymentId
      ? payments.find((item) => item.id === editingPaymentId) ?? null
      : null;

    const providerConfig = parseProviderConfig(selectedProvider);
    const dueDate = computeDueDate(paymentForm.date, providerConfig);
    const autoPaid = paymentForm.method === "EFECTIVO";
    const meta: PaymentMeta = {
      priority: providerConfig.priority,
      days: providerConfig.days,
      dayOfWeek: providerConfig.dayOfWeek,
      dueDate,
      paidAt: autoPaid ? paymentForm.date : existingPayment?.meta.paidAt ?? null,
      urgent: existingPayment?.meta.urgent ?? false,
    };
    const notePayload = buildPaymentNote(paymentForm.note.trim() || null, meta);

    const basePayload = {
      payment_date: paymentForm.date,
      invoice_number: paymentForm.invoiceNumber.trim(),
      provider_name: selectedProvider.name,
      payment_method: paymentForm.method,
      note: notePayload,
      provider_id: selectedProvider.id,
      amount,
    } as const;

    try {
      if (editingPaymentId) {
        const { data, error } = await supabase
          .from(PAYMENTS_TABLE)
          .update(basePayload)
          .eq("id", editingPaymentId)
          .eq("tenant_id", tenantId)
          .eq("branch_id", branchId)
          .select(
            `id, payment_date, invoice_number, provider_name, payment_method, note, created_at, provider_id, amount,
             payment_providers:provider_id (id, name, alias, payment_terms, payment_day, contact_info, created_at)`
          )
          .single();

        if (error) {
          throw error;
        }

        if (data) {
          setPayments((prev) => prev.map((item) => (item.id === data.id ? normalizePaymentRow(data) : item)));
          setPaymentSuccess("Pago actualizado");
          setRegisterOpen(false);
          resetPaymentForm();
        }
      } else {
        const payload = {
          id: uuid(),
          tenant_id: tenantId,
          branch_id: branchId,
          ...basePayload,
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
          throw error;
        }

        if (data) {
          setPayments((prev) => [normalizePaymentRow(data), ...prev]);
          setPaymentSuccess("Pago registrado");
          resetPaymentForm();
          setRegisterOpen(false);
        }
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      console.error("payment upsert failed", message);
      setPaymentFormError(
        editingPaymentId
          ? "No pudimos actualizar el pago. Intentá nuevamente."
          : "No pudimos registrar el pago. Intentá nuevamente."
      );
    } finally {
      setSavingPayment(false);
    }
  };

  const handleEditPayment = React.useCallback((payment: PaymentRecord) => {
    setPaymentForm({
      date: payment.payment_date,
      invoiceNumber: payment.invoice_number,
      providerId: payment.provider_id,
      method: payment.payment_method,
      note: payment.noteText ?? "",
      amount: Number.isFinite(payment.amount) ? String(payment.amount) : "",
    });
    setEditingPaymentId(payment.id);
    setPaymentSuccess(null);
    setPaymentFormError(null);
    setRegisterOpen(true);
  }, []);

  const handleDeletePayment = React.useCallback(async (payment: PaymentRecord) => {
    if (!window.confirm(`¿Eliminar la factura ${payment.invoice_number}?`)) return;
    setDeletingPaymentId(payment.id);
    setPaymentsError(null);
    try {
      const { error } = await supabase
        .from(PAYMENTS_TABLE)
        .delete()
        .eq("id", payment.id)
        .eq("tenant_id", tenantId)
        .eq("branch_id", branchId);

      if (error) throw error;

      setPayments((prev) => prev.filter((item) => item.id !== payment.id));

      if (editingPaymentId === payment.id) {
        resetPaymentForm();
        setRegisterOpen(false);
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      console.error("payment delete failed", message);
      setPaymentsError("No pudimos eliminar la factura seleccionada.");
    } finally {
      setDeletingPaymentId(null);
    }
  }, [supabase, tenantId, branchId, editingPaymentId, resetPaymentForm]);

  const handleToggleUrgent = React.useCallback(async (payment: PaymentRecord) => {
    const nextUrgent = !payment.meta.urgent;
    setTogglingUrgentId(payment.id);
    setPaymentsError(null);

    const updatedMeta: PaymentMeta = { ...payment.meta, urgent: nextUrgent };
    const newNote = buildPaymentNote(payment.noteText, updatedMeta);

    try {
      const { data, error } = await supabase
        .from(PAYMENTS_TABLE)
        .update({ note: newNote })
        .eq("id", payment.id)
        .eq("tenant_id", tenantId)
        .eq("branch_id", branchId)
        .select(
          `id, payment_date, invoice_number, provider_name, payment_method, note, created_at, provider_id, amount,
           payment_providers:provider_id (id, name, alias, payment_terms, payment_day, contact_info, created_at)`
        )
        .single();

      if (error) throw error;

      if (data) {
        setPayments((prev) => prev.map((item) => (item.id === data.id ? normalizePaymentRow(data) : item)));
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      console.error("payment urgent toggle failed", message);
      setPaymentsError("No pudimos actualizar la prioridad de la factura.");
    } finally {
      setTogglingUrgentId(null);
    }
  }, [supabase, tenantId, branchId]);

  const handleEditProvider = React.useCallback((provider: PaymentProvider) => {
    const config = parseProviderConfig(provider);
    const priority: PaymentPriority =
      config.priority !== "none"
        ? config.priority
        : config.dayOfWeek
        ? "day"
        : config.days
        ? "days"
        : "days";

    setProviderForm({
      name: provider.name,
      alias: provider.alias ?? "",
      days: config.days ? String(config.days) : "",
      paymentDay: provider.payment_day ?? "",
      contactInfo: provider.contact_info ?? "",
      priority,
    });
    setEditingProviderId(provider.id);
    setShowProviderForm(true);
    setProviderSuccess(null);
    setProvidersError(null);
  }, []);

  const handleDeleteProvider = React.useCallback(
    async (provider: PaymentProvider) => {
      if (!window.confirm(`¿Eliminar ${provider.name}?`)) return;
      setDeletingProviderId(provider.id);
      setProvidersError(null);
      setProviderSuccess(null);
      try {
        const { error } = await supabase
          .from(PROVIDERS_TABLE)
          .delete()
          .eq("id", provider.id)
          .eq("tenant_id", tenantId)
          .eq("branch_id", branchId);
        if (error) throw error;

        setProviders((prev) =>
          prev
            .filter((p) => p.id !== provider.id)
            .sort((a, b) => a.name.localeCompare(b.name))
        );
        setProviderSuccess("Proveedor eliminado.");

        setPaymentForm((prev) =>
          prev.providerId === provider.id
            ? { ...prev, providerId: "" }
            : prev
        );

        if (editingProviderId === provider.id) {
          resetProviderForm();
          setShowProviderForm(false);
        }
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        console.error("provider delete failed", message);
        setProvidersError("No pudimos eliminar el proveedor.");
      } finally {
        setDeletingProviderId(null);
      }
    },
    [supabase, tenantId, branchId, editingProviderId, resetProviderForm, setShowProviderForm]
  );

  const handleSubmitProvider = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSavingProvider(true);
    setProviderSuccess(null);
    setProvidersError(null);

    const rawDays = Number(providerForm.days);
    const normalizedDays = Number.isFinite(rawDays) && rawDays > 0 ? Math.round(rawDays) : null;
    const normalizedDay = providerForm.paymentDay || null;

    let effectivePriority: PaymentPriority = providerForm.priority;
    if (effectivePriority === "day" && !normalizedDay) {
      effectivePriority = normalizedDays ? "days" : "none";
    }
    if (effectivePriority === "days" && !normalizedDays) {
      effectivePriority = normalizedDay ? "day" : "none";
    }

    const termsPayload = effectivePriority === "none"
      ? null
      : JSON.stringify({ priority: effectivePriority, days: normalizedDays });

    const basePayload = {
      name: providerForm.name.trim(),
      alias: providerForm.alias.trim() || null,
      payment_terms: termsPayload,
      payment_day: normalizedDay,
      contact_info: providerForm.contactInfo.trim() || null,
    };

    if (editingProviderId) {
      const { data, error } = await supabase
        .from(PROVIDERS_TABLE)
        .update(basePayload)
        .eq("id", editingProviderId)
        .eq("tenant_id", tenantId)
        .eq("branch_id", branchId)
        .select("id, name, alias, payment_terms, payment_day, contact_info, created_at")
        .single();

      if (error) {
        console.error("provider update failed", error);
        setProvidersError("No pudimos actualizar el proveedor.");
      } else if (data) {
        setProviders((prev) =>
          prev
            .map((item) => (item.id === data.id ? data : item))
            .sort((a, b) => a.name.localeCompare(b.name))
        );
        setProviderSuccess("Proveedor actualizado");
        resetProviderForm();
        setShowProviderForm(false);
      }
    } else {
      const payload = {
        id: uuid(),
        tenant_id: tenantId,
        branch_id: branchId,
        ...basePayload,
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
        setPaymentForm((prev) =>
          prev.providerId ? prev : { ...prev, providerId: data.id }
        );
        resetProviderForm();
        setShowProviderForm(false);
      }
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
              <DialogTitle>{editingPaymentId ? "Editar factura" : "Registrar factura"}</DialogTitle>
              <DialogDescription>
                {editingPaymentId
                  ? "Actualizá los datos de la factura seleccionada."
                  : "Cargá los datos de la factura pagada para mantener un historial ordenado."}
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
                  <Textarea
                    id="payment-note"
                    value={paymentForm.note}
                    onChange={(event) =>
                      setPaymentForm((prev) => ({ ...prev, note: event.target.value }))
                    }
                    placeholder="Detalle adicional, referencia interna, etc."
                    rows={3}
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
                  {savingPayment
                    ? "Guardando..."
                    : editingPaymentId
                    ? "Guardar cambios"
                    : "Agregar"}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>

        <Dialog open={providersOpen} onOpenChange={(open) => {
          setProvidersOpen(open);
          if (!open) {
            setProviderSuccess(null);
            setProvidersError(null);
            resetProviderForm();
            setShowProviderForm(false);
            setDeletingProviderId(null);
          }
        }}>
          <DialogTrigger asChild>
            <Button variant="outline">Ver proveedores</Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Proveedores</DialogTitle>
              <DialogDescription>
                Listado de proveedores vinculados a la sucursal y formulario para sumar nuevos.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-medium text-neutral-700">Registrados</h3>
                <div className="flex items-center gap-2">
                  {providersLoading && <span className="text-xs text-neutral-400">Cargando...</span>}
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      if (showProviderForm) {
                        resetProviderForm();
                        setShowProviderForm(false);
                        setProviderSuccess(null);
                        setProvidersError(null);
                      } else {
                        resetProviderForm();
                        setShowProviderForm(true);
                        setProviderSuccess(null);
                        setProvidersError(null);
                      }
                    }}
                  >
                    {showProviderForm ? "Ocultar formulario" : "Agregar proveedor"}
                  </Button>
                </div>
              </div>
              {providersError && (
                <p className="text-sm text-rose-600">{providersError}</p>
              )}
              {providerSuccess && !showProviderForm && (
                <p className="text-sm text-emerald-600">{providerSuccess}</p>
              )}
              <ScrollArea className="h-64 rounded-md border">
                <div className="divide-y">
                  {providers.length === 0 && !providersLoading && (
                    <p className="p-4 text-sm text-neutral-500">
                      Todavía no agregaste proveedores.
                    </p>
                  )}
                  {providers.map((provider) => {
                    const config = parseProviderConfig(provider);
                    const termsLabel = config.days ? `${config.days} días` : null;
                    const dayLabel = config.dayOfWeek ? capitalize(config.dayOfWeek) : null;
                    return (
                      <article key={provider.id} className="space-y-2 p-4 text-sm">
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <h4 className="font-medium text-neutral-900">{provider.name}</h4>
                            <dl className="mt-1 space-y-1 text-neutral-600">
                              {provider.alias && (
                                <div>
                                  <dt className="uppercase tracking-wide text-[10px] text-neutral-400">Alias / Cuenta</dt>
                                  <dd>{provider.alias}</dd>
                                </div>
                              )}
                              {termsLabel && (
                                <div>
                                  <dt className="uppercase tracking-wide text-[10px] text-neutral-400">Plazo</dt>
                                  <dd>{termsLabel}</dd>
                                </div>
                              )}
                              {dayLabel && (
                                <div>
                                  <dt className="uppercase tracking-wide text-[10px] text-neutral-400">Día de pago</dt>
                                  <dd>{dayLabel}</dd>
                                </div>
                              )}
                              {provider.contact_info && (
                                <div>
                                  <dt className="uppercase tracking-wide text-[10px] text-neutral-400">Contacto</dt>
                                  <dd>{provider.contact_info}</dd>
                                </div>
                              )}
                            </dl>
                          </div>
                          <div className="flex flex-col gap-2">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleEditProvider(provider)}
                            >
                              Editar
                            </Button>
                            <Button
                              size="sm"
                              variant="destructive"
                              onClick={() => handleDeleteProvider(provider)}
                              disabled={deletingProviderId === provider.id}
                            >
                              {deletingProviderId === provider.id ? "Eliminando..." : "Eliminar"}
                            </Button>
                          </div>
                        </div>
                      </article>
                    );
                  })}
                </div>
              </ScrollArea>
              {showProviderForm && (
                <form className="space-y-3" onSubmit={handleSubmitProvider}>
                  <h3 className="text-sm font-medium text-neutral-700">
                    {editingProviderId ? "Editar proveedor" : "Agregar proveedor"}
                  </h3>
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
                    <Label htmlFor="provider-days">Plazo (días)</Label>
                    <Input
                      id="provider-days"
                      type="number"
                      min={0}
                      value={providerForm.days}
                      onChange={(event) =>
                        setProviderForm((prev) => ({ ...prev, days: event.target.value }))
                      }
                      placeholder="Ej: 30"
                    />
                    <p className="text-[11px] text-neutral-500">
                      Si preferís pagar por día fijo, dejá este campo vacío.
                    </p>
                  </div>
                  <div className="space-y-1">
                    <Label>Día de pago (opcional)</Label>
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
                    <Label>Prioridad</Label>
                    <div className="flex flex-col gap-1 text-sm text-neutral-600">
                      <label className="flex items-center gap-2">
                        <input
                          type="radio"
                          name="provider-priority"
                          value="days"
                          checked={providerForm.priority === "days"}
                          onChange={() => setProviderForm((prev) => ({ ...prev, priority: "days" }))}
                        />
                        Usar plazo de pago
                      </label>
                      <label className="flex items-center gap-2">
                        <input
                          type="radio"
                          name="provider-priority"
                          value="day"
                          checked={providerForm.priority === "day"}
                          onChange={() => setProviderForm((prev) => ({ ...prev, priority: "day" }))}
                        />
                        Usar día fijo de pago
                      </label>
                    </div>
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="provider-contact">Información de contacto</Label>
                    <Textarea
                      id="provider-contact"
                      value={providerForm.contactInfo}
                      onChange={(event) =>
                        setProviderForm((prev) => ({ ...prev, contactInfo: event.target.value }))
                      }
                      rows={3}
                      placeholder="Nombre, teléfono, email"
                    />
                  </div>
                  {providerSuccess && (
                    <p className="text-sm text-emerald-600">{providerSuccess}</p>
                  )}
                  <div className="flex justify-end gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => {
                        resetProviderForm();
                        setShowProviderForm(false);
                      }}
                      disabled={savingProvider}
                    >
                      Cancelar
                    </Button>
                    <Button type="submit" disabled={savingProvider}>
                      {savingProvider
                        ? "Guardando..."
                        : editingProviderId
                        ? "Guardar cambios"
                        : "Agregar proveedor"}
                    </Button>
                  </div>
                </form>
              )}
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {paymentsError && !paymentsLoading && (
        <p className="text-sm text-rose-600">{paymentsError}</p>
      )}

      <section className="space-y-3">
        <h2 className="text-sm font-medium text-neutral-700">Facturas por pagar</h2>
        {paymentsLoading ? (
          <div className="space-y-3">
            {Array.from({ length: 2 }).map((_, idx) => (
              <PlaceholderCard key={idx} />
            ))}
          </div>
        ) : pendingPayments.length === 0 ? (
          <p className="text-sm text-neutral-500">No hay facturas pendientes.</p>
        ) : (
          <div className="space-y-3">
            {pendingPayments.map((payment) => {
              const dayLabel = payment.dueDayLabel ? capitalize(payment.dueDayLabel) : null;
              const dueLabel = payment.dueDate
                ? dayLabel
                  ? `${dayLabel} · ${formatIsoDate(payment.dueDate)}`
                  : formatIsoDate(payment.dueDate)
                : "Sin fecha de vencimiento";
              return (
                <Card
                  key={payment.id}
                  className={cn(
                    payment.isOverdue ? "border-rose-200" : undefined,
                    payment.isUrgent ? "border-amber-300 bg-amber-50" : undefined
                  )}
                >
                  <CardHeader className="space-y-2">
                    <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                      <div>
                        <div className="flex items-center gap-2">
                          <CardTitle className="text-base">
                            {payment.provider?.name ?? payment.provider_name}
                          </CardTitle>
                          {payment.isUrgent && (
                            <span className="inline-flex items-center rounded-full bg-amber-100 px-2 py-0.5 text-[11px] font-medium text-amber-700">
                              Urgente
                            </span>
                          )}
                        </div>
                        <CardDescription>
                          Factura {payment.invoice_number} · {methodLabel(payment.payment_method)}
                        </CardDescription>
                      </div>
                      <div className="text-right space-y-1">
                        <div className="text-lg font-semibold text-neutral-900">
                          {formatCurrency(payment.amount)}
                        </div>
                        <p className={`text-xs ${payment.isOverdue ? "text-rose-600 font-semibold" : "text-neutral-500"}`}>
                          Vence: {dueLabel}
                        </p>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {payment.provider && (
                      <dl className="grid gap-2 text-sm text-neutral-600 sm:grid-cols-2">
                        {payment.provider.alias && (
                          <div>
                            <dt className="uppercase tracking-wide text-[10px] text-neutral-400">Alias / Cuenta</dt>
                            <dd>{payment.provider.alias}</dd>
                          </div>
                        )}
                        {payment.config.days && (
                          <div>
                            <dt className="uppercase tracking-wide text-[10px] text-neutral-400">Plazo</dt>
                            <dd>{payment.config.days} días</dd>
                          </div>
                        )}
                        {payment.config.dayOfWeek && (
                          <div>
                            <dt className="uppercase tracking-wide text-[10px] text-neutral-400">Día de pago</dt>
                            <dd>{capitalize(payment.config.dayOfWeek)}</dd>
                          </div>
                        )}
                        {payment.provider.contact_info && (
                          <div className="sm:col-span-2">
                            <dt className="uppercase tracking-wide text-[10px] text-neutral-400">Contacto</dt>
                            <dd>{payment.provider.contact_info}</dd>
                          </div>
                        )}
                      </dl>
                    )}
                    {payment.noteText && (
                      <p className="text-sm text-neutral-700">{payment.noteText}</p>
                    )}
                    <div className="flex flex-wrap items-center justify-end gap-2">
                      <Button size="sm" variant="outline" onClick={() => handleEditPayment(payment)}>
                        Editar
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className={cn(
                          payment.isUrgent
                            ? "border-amber-500 text-amber-700 hover:bg-amber-100 hover:text-amber-700"
                            : undefined
                        )}
                        onClick={() => handleToggleUrgent(payment)}
                        disabled={togglingUrgentId === payment.id}
                      >
                        {togglingUrgentId === payment.id
                          ? "Actualizando..."
                          : payment.isUrgent
                          ? "Quitar urgente"
                          : "Marcar urgente"}
                      </Button>
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={() => handleDeletePayment(payment)}
                        disabled={deletingPaymentId === payment.id}
                      >
                        {deletingPaymentId === payment.id ? "Eliminando..." : "Eliminar"}
                      </Button>
                      <Button
                        size="sm"
                        onClick={() => handleOpenMarkDialog(payment, new Date().toISOString().slice(0, 10))}
                      >
                        Marcar pagado
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </section>

      <section className="space-y-3">
        <h2 className="text-sm font-medium text-neutral-700">Facturas pagadas</h2>
        {paymentsLoading ? (
          <div className="space-y-3">
            {Array.from({ length: 2 }).map((_, idx) => (
              <PlaceholderCard key={idx} />
            ))}
          </div>
        ) : paidPayments.length === 0 ? (
          <p className="text-sm text-neutral-500">Aún no registraste pagos.</p>
        ) : (
          <div className="space-y-3">
            {paidPayments.map((payment) => {
              const paidLabel = formatIsoDate(payment.paidDate);
              const dayLabel = payment.dueDayLabel ? capitalize(payment.dueDayLabel) : null;
              const dueLabel = payment.dueDate
                ? dayLabel
                  ? `${dayLabel} · ${formatIsoDate(payment.dueDate)}`
                  : formatIsoDate(payment.dueDate)
                : null;
              return (
                <Card
                  key={payment.id}
                  className={cn(payment.isUrgent ? "border-amber-300 bg-amber-50" : undefined)}
                >
                  <CardHeader className="space-y-2">
                    <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                      <div>
                        <div className="flex items-center gap-2">
                          <CardTitle className="text-base">
                            {payment.provider?.name ?? payment.provider_name}
                          </CardTitle>
                          {payment.isUrgent && (
                            <span className="inline-flex items-center rounded-full bg-amber-100 px-2 py-0.5 text-[11px] font-medium text-amber-700">
                              Urgente
                            </span>
                          )}
                        </div>
                        <CardDescription>
                          Factura {payment.invoice_number} · {methodLabel(payment.payment_method)}
                        </CardDescription>
                      </div>
                      <div className="text-right space-y-1">
                        <div className="text-lg font-semibold text-neutral-900">
                          {formatCurrency(payment.amount)}
                        </div>
                        <p className="text-xs text-neutral-500">Pagado: {paidLabel}</p>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {dueLabel && (
                      <p className="text-xs text-neutral-500">Vencimiento: {dueLabel}</p>
                    )}
                    {payment.provider && (
                      <dl className="grid gap-2 text-sm text-neutral-600 sm:grid-cols-2">
                        {payment.provider.alias && (
                          <div>
                            <dt className="uppercase tracking-wide text-[10px] text-neutral-400">Alias / Cuenta</dt>
                            <dd>{payment.provider.alias}</dd>
                          </div>
                        )}
                        {payment.provider.contact_info && (
                          <div className="sm:col-span-2">
                            <dt className="uppercase tracking-wide text-[10px] text-neutral-400">Contacto</dt>
                            <dd>{payment.provider.contact_info}</dd>
                          </div>
                        )}
                      </dl>
                    )}
                    {payment.noteText && (
                      <p className="text-sm text-neutral-700">{payment.noteText}</p>
                    )}
                    <div className="flex flex-wrap items-center justify-end gap-2">
                      <Button size="sm" variant="outline" onClick={() => handleEditPayment(payment)}>
                        Editar
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className={cn(
                          payment.isUrgent
                            ? "border-amber-500 text-amber-700 hover:bg-amber-100 hover:text-amber-700"
                            : undefined
                        )}
                        onClick={() => handleToggleUrgent(payment)}
                        disabled={togglingUrgentId === payment.id}
                      >
                        {togglingUrgentId === payment.id
                          ? "Actualizando..."
                          : payment.isUrgent
                          ? "Quitar urgente"
                          : "Marcar urgente"}
                      </Button>
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={() => handleDeletePayment(payment)}
                        disabled={deletingPaymentId === payment.id}
                      >
                        {deletingPaymentId === payment.id ? "Eliminando..." : "Eliminar"}
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleOpenMarkDialog(payment, payment.meta.paidAt ?? payment.payment_date)}
                      >
                        Editar pago
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </section>

      <Dialog
        open={markDialogOpen}
        onOpenChange={(open) => {
          setMarkDialogOpen(open);
          if (!open) {
            setMarkError(null);
            setMarkSaving(false);
            setSelectedPayment(null);
          }
        }}
      >
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>{selectedPayment?.meta.paidAt ? "Editar pago" : "Registrar pago"}</DialogTitle>
            <DialogDescription>
              Confirmá la fecha en la que se pagó la factura seleccionada.
            </DialogDescription>
          </DialogHeader>
          {selectedPayment && (
            <div className="space-y-3">
              <div className="rounded-lg border bg-muted/40 px-3 py-2">
                <p className="text-sm font-medium text-neutral-900">
                  {selectedPayment.provider?.name ?? selectedPayment.provider_name}
                </p>
                <p className="text-xs text-neutral-500">
                  Factura {selectedPayment.invoice_number} · {formatCurrency(selectedPayment.amount)}
                </p>
              </div>
              <div className="space-y-1">
                <Label htmlFor="mark-date">Fecha de pago</Label>
                <Input
                  id="mark-date"
                  type="date"
                  value={markDate}
                  onChange={(event) => setMarkDate(event.target.value)}
                  max={new Date().toISOString().slice(0, 10)}
                />
              </div>
              {markError && <p className="text-sm text-rose-600">{markError}</p>}
            </div>
          )}
          <DialogFooter className="gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setMarkDialogOpen(false);
                setSelectedPayment(null);
              }}
              disabled={markSaving}
            >
              Cancelar
            </Button>
            <Button onClick={handleConfirmMarkPaid} disabled={markSaving || !selectedPayment}>
              {markSaving ? "Guardando..." : "Guardar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
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
  const provider = row.payment_providers ?? null;
  const config = parseProviderConfig(provider);
  const parsedNote = parsePaymentNote(row.note ?? null);
  const computedDueDate = parsedNote.meta?.dueDate ?? computeDueDate(row.payment_date, config);
  const paidAtFallback =
    parsedNote.meta?.paidAt ??
    (row.payment_method === "EFECTIVO" ? row.payment_date : null);

  const meta: PaymentMeta = {
    priority: parsedNote.meta.priority ?? config.priority,
    days: parsedNote.meta.days ?? config.days,
    dayOfWeek: parsedNote.meta.dayOfWeek ?? config.dayOfWeek,
    dueDate: computedDueDate ?? null,
    paidAt: paidAtFallback ?? null,
    urgent: parsedNote.meta.urgent ?? false,
  };

  return {
    id: row.id,
    payment_date: row.payment_date,
    invoice_number: row.invoice_number,
    provider_name: row.provider_name,
    payment_method: row.payment_method,
    rawNote: row.note ?? null,
    noteText: parsedNote.text,
    meta,
    created_at: row.created_at,
    provider_id: row.provider_id,
    provider,
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
