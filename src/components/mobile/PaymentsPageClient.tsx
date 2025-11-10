"use client";

import React from "react";
import { v4 as uuid } from "uuid";
import { Check, ChevronDown, ChevronUp, Loader2, Search, Trash2, X } from "lucide-react";
import { getSupabaseBrowserClient } from "@/lib/supabaseClient";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
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
type DocumentType = "factura" | "remito";

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
  documentType?: DocumentType;
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
  whatsapp: string | null;
  payment_terms: string | null;
  payment_day: string | null;
  contact_info: string | null;
  created_at: string | null;
};

type ViewMode = "weekly" | "cards" | "table";

type Props = {
  slug: string;
  branch: string;
  tenantId: string;
  branchId: string;
  branchName: string;
};

function formatSupabaseError(error: unknown): string | null {
  if (!error) return null;
  if (typeof error === "string") return error;
  if (typeof error !== "object") return null;
  const maybe = error as Partial<{
    message: unknown;
    details: unknown;
    hint: unknown;
    code: unknown;
  }>;
  const message = typeof maybe.message === "string" ? maybe.message : null;
  const details = typeof maybe.details === "string" ? maybe.details : null;
  const hint = typeof maybe.hint === "string" ? maybe.hint : null;
  const code = typeof maybe.code === "string" ? maybe.code : null;
  const parts = [message, details, hint].filter((part): part is string => Boolean(part));
  if (code && parts.length === 0) {
    return `Error ${code}`;
  }
  if (parts.length === 0) return null;
  return parts.join(" · ");
}

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

type WeeklyBucketKey = "monday" | "tuesday" | "wednesday" | "thursday" | "friday" | "saturday";

type WeeklyBucket = {
  key: WeeklyBucketKey;
  label: string;
  dayIndex: number;
};

const WEEKLY_BUCKETS: WeeklyBucket[] = [
  { key: "monday", label: "Lunes", dayIndex: 1 },
  { key: "tuesday", label: "Martes", dayIndex: 2 },
  { key: "wednesday", label: "Miércoles", dayIndex: 3 },
  { key: "thursday", label: "Jueves", dayIndex: 4 },
  { key: "friday", label: "Viernes", dayIndex: 5 },
  { key: "saturday", label: "Sábado", dayIndex: 6 },
];

const UNSCHEDULED_WEEKLY_BUCKET = { key: "unscheduled", label: "Sin día asignado" } as const;

const VIEW_MODE_OPTIONS: { value: ViewMode; label: string }[] = [
  { value: "weekly", label: "Vista semanal" },
  { value: "cards", label: "Vista tarjetas" },
  { value: "table", label: "Vista tabla" },
];

const WHATSAPP_MESSAGE = encodeURIComponent("Hola buenas! Les dejo comprobante");
const GOOGLE_FORM_URL = process.env.NEXT_PUBLIC_PAYMENTS_FORM_URL ??
  "https://docs.google.com/forms/d/e/1FAIpQLSdrdlf9FP41NkgK40CP9bredyZxqFAPm1bd2_kx6kEfslHmdw/viewform";
const GOOGLE_PHOTOS_SHEET_URL = process.env.NEXT_PUBLIC_PAYMENTS_PHOTOS_URL ??
  "https://docs.google.com/spreadsheets/u/0/d/1vk9K5L_eHbbvmOmoAST7OPoyrz0P0J6K83gG1ZDcvdM/htmlview#gid=676882683";
const LINKS_STORAGE_KEY = "gestock-payments-links";
const RECEIPTS_STORAGE_KEY = "gestock-payments-sent";

type PaymentFormState = {
  date: string;
  dueDate: string;
  invoiceNumber: string;
  providerId: string;
  method: PaymentMethod;
  note: string;
  amount: string;
  markAsPaid: boolean;
  markAsPaidDirty: boolean;
  documentType: DocumentType;
};

type ProviderFormState = {
  name: string;
  alias: string;
  whatsapp: string;
  paymentDay: string;
  contactInfo: string;
  priority: PaymentPriority;
  days: string;
};

const buildInitialPaymentForm = (providerId = ""): PaymentFormState => {
  const method: PaymentMethod = "EFECTIVO";
  return {
    date: new Date().toISOString().slice(0, 10),
    dueDate: "",
    invoiceNumber: "",
    providerId,
    method,
    note: "",
    amount: "",
    markAsPaid: method === "EFECTIVO",
    markAsPaidDirty: false,
    documentType: "factura",
  };
};

const INITIAL_PROVIDER_FORM: ProviderFormState = {
  name: "",
  alias: "",
  whatsapp: "",
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
    return { text: null, meta: { priority: "none", urgent: false, documentType: "factura" } };
  }
  try {
    const parsed = JSON.parse(note) as PaymentNotePayload;
    const text = typeof parsed?.text === "string" ? parsed.text : null;
    const meta = parsed?.meta ?? { priority: "none" };
    const documentType: DocumentType = meta?.documentType === "remito" ? "remito" : "factura";
    return {
      text,
      meta: {
        priority: meta.priority ?? "none",
        days: meta.days ?? null,
        dayOfWeek: meta.dayOfWeek ?? null,
        dueDate: meta.dueDate ?? null,
        paidAt: meta.paidAt ?? null,
        urgent: Boolean(meta.urgent),
        documentType,
      },
    };
  } catch {
    return { text: note, meta: { priority: "none", urgent: false, documentType: "factura" } };
  }
}

function buildPaymentNote(text: string | null, meta: PaymentMeta | null): string | null {
  const sanitizedText = text?.trim() || null;
  let sanitizedMeta = meta ? { ...meta } : null;
  if (sanitizedMeta) {
    sanitizedMeta.priority = sanitizedMeta.priority ?? "none";
    sanitizedMeta.documentType = sanitizedMeta.documentType === "remito" ? "remito" : "factura";
    const hasMetaInfo =
      sanitizedMeta.priority !== "none" ||
      sanitizedMeta.days != null ||
      sanitizedMeta.dayOfWeek != null ||
      sanitizedMeta.dueDate != null ||
      sanitizedMeta.paidAt != null ||
      Boolean(sanitizedMeta.urgent) ||
      sanitizedMeta.documentType !== "factura";
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

function buildWhatsappLink(rawNumber: string | null | undefined): string | null {
  if (!rawNumber) return null;
  const digits = rawNumber.replace(/\D+/g, "");
  if (!digits) return null;
  return `https://wa.me/${digits}?text=${WHATSAPP_MESSAGE}`;
}

function toTimestamp(iso: string | null): number | null {
  if (!iso) return null;
  const d = new Date(iso);
  const t = d.getTime();
  return Number.isNaN(t) ? null : t;
}

export default function PaymentsPageClient({ slug, branch, branchName, tenantId, branchId }: Props) {
  const supabase = React.useMemo(() => getSupabaseBrowserClient(), []);

  const paymentsEndpointBase = React.useMemo(() => `/api/t/${slug}/b/${branch}/payments`, [slug, branch]);
  const todayIso = React.useMemo(() => new Date().toISOString().slice(0, 10), []);
  const yesterdayIso = React.useMemo(() => {
    const d = new Date();
    d.setDate(d.getDate() - 1);
    return d.toISOString().slice(0, 10);
  }, []);

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
  const [markDate, setMarkDate] = React.useState<string>(todayIso);
  const [markSaving, setMarkSaving] = React.useState(false);
  const [markError, setMarkError] = React.useState<string | null>(null);
  const [editingPaymentId, setEditingPaymentId] = React.useState<string | null>(null);
  const [deletingPaymentId, setDeletingPaymentId] = React.useState<string | null>(null);
  const [togglingUrgentId, setTogglingUrgentId] = React.useState<string | null>(null);
  const [expandedDetails, setExpandedDetails] = React.useState<Record<string, boolean>>({});
  const [weeklyExpandedSections, setWeeklyExpandedSections] = React.useState<Record<string, boolean>>(() => {
    const todayIndex = new Date().getDay();
    return WEEKLY_BUCKETS.reduce<Record<string, boolean>>((acc, bucket) => {
      acc[bucket.key] = bucket.dayIndex === todayIndex;
      return acc;
    }, {});
  });
  const [searchQuery, setSearchQuery] = React.useState("");
  const [viewMode, setViewMode] = React.useState<ViewMode>("weekly");


  const isTodaySelected = markDate === todayIso;
  const isFormDateToday = paymentForm.date === todayIso;
  const isFormDateYesterday = paymentForm.date === yesterdayIso;
  const isWeeklyView = viewMode === "weekly";
  const isTableView = viewMode === "table";
  const [customLinks, setCustomLinks] = React.useState<{ formUrl?: string; photosUrl?: string }>({});
  const [sentReceipts, setSentReceipts] = React.useState<Record<string, boolean>>({});
  const hasGoogleFormUrl = Boolean(GOOGLE_FORM_URL);
  const hasPhotoSheetUrl = Boolean(GOOGLE_PHOTOS_SHEET_URL);
  const effectiveFormUrl = customLinks.formUrl?.trim() || (hasGoogleFormUrl ? GOOGLE_FORM_URL : "");
  const effectivePhotosUrl = customLinks.photosUrl?.trim() || (hasPhotoSheetUrl ? GOOGLE_PHOTOS_SHEET_URL : "");

  const primaryProviderId = React.useMemo(() => providers[0]?.id ?? "", [providers]);
  const activeProvider = React.useMemo(() => {
    if (!paymentForm.providerId) return null;
    return providers.find((provider) => provider.id === paymentForm.providerId) ?? null;
  }, [providers, paymentForm.providerId]);

  const resetPaymentForm = React.useCallback(() => {
    setPaymentForm(() => buildInitialPaymentForm(primaryProviderId));
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
          payment_providers:provider_id (id, name, alias, whatsapp, payment_terms, payment_day, contact_info, created_at)`
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
      .select("id, name, alias, whatsapp, payment_terms, payment_day, contact_info, created_at")
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
    if (typeof window === "undefined") return;
    try {
      const stored = window.localStorage.getItem(LINKS_STORAGE_KEY);
      if (!stored) return;
      const parsed = JSON.parse(stored) as { formUrl?: string; photosUrl?: string };
      if (parsed && typeof parsed === "object") {
        setCustomLinks({
          formUrl: typeof parsed.formUrl === "string" ? parsed.formUrl : undefined,
          photosUrl: typeof parsed.photosUrl === "string" ? parsed.photosUrl : undefined,
        });
      }
    } catch (err) {
      console.error("links load failed", err);
    }
  }, []);

  React.useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      const payload = JSON.stringify(customLinks);
      window.localStorage.setItem(LINKS_STORAGE_KEY, payload);
    } catch (err) {
      console.error("links persist failed", err);
    }
  }, [customLinks]);

  React.useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      const stored = window.localStorage.getItem(RECEIPTS_STORAGE_KEY);
      if (!stored) return;
      const parsed = JSON.parse(stored) as Record<string, boolean>;
      if (parsed && typeof parsed === "object") {
        setSentReceipts(parsed);
      }
    } catch (err) {
      console.error("receipts load failed", err);
    }
  }, []);

  React.useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      window.localStorage.setItem(RECEIPTS_STORAGE_KEY, JSON.stringify(sentReceipts));
    } catch (err) {
      console.error("receipts persist failed", err);
    }
  }, [sentReceipts]);

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
      const status: "pending" | "paid" = payment.meta.paidAt ? "paid" : "pending";
      const paidDate = payment.meta.paidAt ?? null;
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

  const normalizedSearch = searchQuery.trim().toLowerCase();
  const numericSearch = searchQuery.replace(/[^0-9]/g, "");
  const hasSearch = Boolean(normalizedSearch || numericSearch);

  const filteredPayments = React.useMemo(() => {
    if (!hasSearch) return enrichedPayments;
    return enrichedPayments.filter((payment) => {
      const providerName = (payment.provider?.name ?? payment.provider_name ?? "").toLowerCase();
      const invoiceNumber = (payment.invoice_number ?? "").toLowerCase();
      const amountDigits = Number.isFinite(payment.amount)
        ? Math.abs(payment.amount).toFixed(2).replace(/[^0-9]/g, "")
        : "";
      const matchesText = normalizedSearch
        ? providerName.includes(normalizedSearch) || invoiceNumber.includes(normalizedSearch)
        : false;
      const matchesAmount = numericSearch ? amountDigits.includes(numericSearch) : false;
      return matchesText || matchesAmount;
    });
  }, [enrichedPayments, hasSearch, normalizedSearch, numericSearch]);

  const pendingPayments = React.useMemo(() => {
    return filteredPayments
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
  }, [filteredPayments]);

  const weeklyPendingGroups = React.useMemo(() => {
    const buckets = WEEKLY_BUCKETS.map((bucket) => ({ ...bucket, payments: [] as EnrichedPayment[] }));
    const bucketByIndex = buckets.reduce<Record<number, (typeof buckets)[number]>>((acc, bucket) => {
      acc[bucket.dayIndex] = bucket;
      return acc;
    }, {});
    const unscheduled: EnrichedPayment[] = [];

    pendingPayments.forEach((payment) => {
      const idx = getPaymentWeekdayIndex(payment);
      const target = idx != null ? bucketByIndex[idx] : null;
      if (target) {
        target.payments.push(payment);
      } else {
        unscheduled.push(payment);
      }
    });

    return { buckets, unscheduled };
  }, [pendingPayments]);

  const paidPayments = React.useMemo(() => {
    return filteredPayments
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
  }, [filteredPayments]);

  const handleOpenMarkDialog = React.useCallback((payment: PaymentRecord, initialDate?: string | null) => {
    const fallbackDate = payment.meta.paidAt ?? payment.payment_date ?? todayIso;
    setSelectedPayment(payment);
    setMarkDate(initialDate ?? fallbackDate);
    setMarkError(null);
    setMarkDialogOpen(true);
  }, [todayIso]);

  const handleToggleDetails = React.useCallback((paymentId: string) => {
    setExpandedDetails((prev) => ({
      ...prev,
      [paymentId]: !prev[paymentId],
    }));
  }, []);

  const handleToggleWeeklySection = React.useCallback((sectionKey: string) => {
    setWeeklyExpandedSections((prev) => ({
      ...prev,
      [sectionKey]: !prev[sectionKey],
    }));
  }, []);

  const renderPendingCard = (payment: EnrichedPayment) => {
    const dayLabel = payment.dueDayLabel ? capitalize(payment.dueDayLabel) : null;
    const dueLabel = payment.dueDate
      ? dayLabel
        ? `${dayLabel} · ${formatIsoDate(payment.dueDate)}`
        : formatIsoDate(payment.dueDate)
      : "Sin fecha de vencimiento";
    const dueCountdown = formatDueCountdown(payment.dueDate, todayIso);
    const showAlias = Boolean(payment.provider?.alias);
    const showPlazo = Boolean(payment.provider && payment.config.days);
    const showDayOfWeek = Boolean(payment.provider && payment.config.dayOfWeek);
    const showContact = Boolean(payment.provider?.contact_info);
    const showWhatsapp = Boolean(payment.provider?.whatsapp);
    const noteContent = payment.noteText?.trim() ? payment.noteText.trim() : null;
    const documentLabel = documentTypeLabel(payment.meta.documentType);
    const providerDetailsPending =
      payment.provider && (showAlias || showPlazo || showDayOfWeek || showContact || showWhatsapp) ? (
        <dl className="grid gap-2 text-sm text-neutral-600 sm:grid-cols-2">
          {showAlias && (
            <div>
              <dt className="uppercase tracking-wide text-[10px] text-neutral-400">Alias / Cuenta</dt>
              <dd>{payment.provider?.alias}</dd>
            </div>
          )}
          {showWhatsapp && (
            <div>
              <dt className="uppercase tracking-wide text-[10px] text-neutral-400">WhatsApp</dt>
              <dd>{payment.provider?.whatsapp}</dd>
            </div>
          )}
          {showPlazo && (
            <div>
              <dt className="uppercase tracking-wide text-[10px] text-neutral-400">Plazo</dt>
              <dd>{payment.config.days} días</dd>
            </div>
          )}
          {showDayOfWeek && (
            <div>
              <dt className="uppercase tracking-wide text-[10px] text-neutral-400">Día de pago</dt>
              <dd>{capitalize(payment.config.dayOfWeek)}</dd>
            </div>
          )}
          {showContact && (
            <div className="sm:col-span-2">
              <dt className="uppercase tracking-wide text-[10px] text-neutral-400">Contacto</dt>
              <dd>{payment.provider?.contact_info}</dd>
            </div>
          )}
        </dl>
      ) : null;
    const hasExtraInfo = Boolean(providerDetailsPending);
    const isDetailsExpanded = expandedDetails[payment.id] ?? false;
    const detailsLabel = isDetailsExpanded ? "Ocultar detalles" : "Ver detalles";

    return (
      <Card
        key={payment.id}
        className={cn(
          "relative",
          payment.isOverdue ? "border-rose-200" : undefined,
          payment.isUrgent ? "border-amber-300 bg-amber-50" : undefined
        )}
      >
        <Button
          type="button"
          size="icon"
          variant="ghost"
          className="absolute right-2 top-2 h-8 w-8 rounded-full text-neutral-400 hover:bg-rose-50 hover:text-rose-600"
          onClick={() => handleDeletePayment(payment)}
          disabled={deletingPaymentId === payment.id}
          aria-label={`Eliminar ${documentLabel} ${payment.invoice_number}`}
          title="Eliminar"
        >
          {deletingPaymentId === payment.id ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Trash2 className="h-4 w-4" />
          )}
        </Button>
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
                {documentLabel} {payment.invoice_number} · {methodLabel(payment.payment_method)}
              </CardDescription>
              {noteContent && <ObservationHighlight text={noteContent} />}
            </div>
            <div className="text-right space-y-1">
              <div className="text-lg font-semibold text-neutral-900">
                {formatCurrency(payment.amount)}
              </div>
              <p className={`text-xs ${payment.isOverdue ? "text-rose-600 font-semibold" : "text-neutral-500"}`}>
                Vence: {dueLabel}
                {dueCountdown ? ` (${dueCountdown})` : ""}
              </p>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          {hasExtraInfo && (
            <div className="space-y-2">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="flex w-full items-center justify-between px-0 text-sm font-medium text-neutral-700 hover:bg-transparent"
                onClick={() => handleToggleDetails(payment.id)}
                aria-expanded={isDetailsExpanded}
              >
                <span>{detailsLabel}</span>
                {isDetailsExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
              </Button>
              {isDetailsExpanded && <div className="space-y-3">{providerDetailsPending}</div>}
            </div>
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
            <Button size="sm" onClick={() => handleOpenMarkDialog(payment, todayIso)}>
              Marcar pagado
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  };

  const handleSendWhatsapp = React.useCallback((rawNumber: string | null | undefined) => {
    const url = buildWhatsappLink(rawNumber);
    if (!url) return;
    window.open(url, "_blank", "noopener,noreferrer");
  }, []);

  const handleEditLink = React.useCallback((type: "form" | "photos") => {
    const current = type === "form" ? effectiveFormUrl : effectivePhotosUrl;
    const next = window.prompt("Ingresá el nuevo link", current || "");
    if (next === null) return;
    const trimmed = next.trim();
    setCustomLinks((prev) => {
      const base = { ...prev };
      if (!trimmed) {
        if (type === "form") delete base.formUrl;
        else delete base.photosUrl;
      } else if (type === "form") {
        base.formUrl = trimmed;
      } else {
        base.photosUrl = trimmed;
      }
      return base;
    });
  }, [effectiveFormUrl, effectivePhotosUrl]);

  const toggleReceiptSent = React.useCallback((paymentId: string) => {
    setSentReceipts((prev) => ({
      ...prev,
      [paymentId]: !prev[paymentId],
    }));
  }, []);

  const apiUpdatePayment = React.useCallback(
    async (
      paymentId: string,
      payload: Partial<{
        payment_date: string;
        invoice_number: string;
        provider_id: string;
        provider_name: string;
        payment_method: PaymentMethod;
        note: string | null;
        amount: number;
      }>
    ) => {
      const response = await fetch(`${paymentsEndpointBase}/${paymentId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      let body: unknown = null;
      try {
        body = await response.json();
      } catch {
        // Ignore body parse errors
      }

      if (!response.ok) {
        const errorMessage =
          body && typeof body === "object" && "error" in body && typeof (body as { error?: unknown }).error === "string"
            ? (body as { error: string }).error
            : "No pudimos actualizar el pago. Intentá nuevamente.";
        throw new Error(errorMessage);
      }

      const data =
        body && typeof body === "object" && "data" in body ? (body as { data: PaymentRow }).data : null;
      if (!data) {
        throw new Error("Respuesta inválida del servidor.");
      }

      return normalizePaymentRow(data);
    },
    [paymentsEndpointBase]
  );

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
      const updatedPayment = await apiUpdatePayment(selectedPayment.id, { note: newNote });
      setPayments((prev) => prev.map((item) => (item.id === updatedPayment.id ? updatedPayment : item)));
      setMarkDialogOpen(false);
      setSelectedPayment(null);
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      console.error("payment mark paid failed", message);
      setMarkError(message || "No pudimos actualizar el pago.");
    } finally {
      setMarkSaving(false);
    }
  }, [selectedPayment, markDate, apiUpdatePayment]);

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

    const selectedProvider = activeProvider;
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
    const manualDueDate = paymentForm.dueDate?.trim() ? paymentForm.dueDate : null;
    const dueDate = manualDueDate ?? computeDueDate(paymentForm.date, providerConfig);
    const existingPaidAt = existingPayment?.meta.paidAt ?? null;
    const autoPaid = paymentForm.method === "EFECTIVO" && !paymentForm.markAsPaidDirty;
    const shouldMarkAsPaid = paymentForm.markAsPaid || (autoPaid && !existingPaidAt);
    const paidAtValue = shouldMarkAsPaid ? (existingPaidAt ?? paymentForm.date) : null;
    const documentType = paymentForm.documentType ?? "factura";

    const meta: PaymentMeta = {
      priority: providerConfig.priority,
      days: providerConfig.days,
      dayOfWeek: providerConfig.dayOfWeek,
      dueDate,
      paidAt: paidAtValue,
      urgent: existingPayment?.meta.urgent ?? false,
      documentType,
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
        const updatedPayment = await apiUpdatePayment(editingPaymentId, basePayload);
        setPayments((prev) => prev.map((item) => (item.id === updatedPayment.id ? updatedPayment : item)));
        setPaymentSuccess("Pago actualizado");
        setRegisterOpen(false);
        resetPaymentForm();
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
             payment_providers:provider_id (id, name, alias, whatsapp, payment_terms, payment_day, contact_info, created_at)`
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
      const supabaseMessage = formatSupabaseError(err);
      const fallback = err instanceof Error ? err.message : String(err);
      const baseMessage = editingPaymentId
        ? "No pudimos actualizar el pago. Intentá nuevamente."
        : "No pudimos registrar el pago. Intentá nuevamente.";
      setPaymentFormError(supabaseMessage || fallback ? `${baseMessage} Detalle: ${supabaseMessage || fallback}` : baseMessage);
    } finally {
      setSavingPayment(false);
    }
  };

  const handleEditPayment = React.useCallback((payment: PaymentRecord) => {
    const providerConfig = parseProviderConfig(payment.provider);
    const fallbackDueDate = payment.meta.dueDate ?? computeDueDate(payment.payment_date, providerConfig) ?? "";
    setPaymentForm((prev) => ({
      ...prev,
      date: payment.payment_date,
      dueDate: fallbackDueDate,
      invoiceNumber: payment.invoice_number,
      providerId: payment.provider_id,
      method: payment.payment_method,
      note: payment.noteText ?? "",
      amount: Number.isFinite(payment.amount) ? String(payment.amount) : "",
      markAsPaid: Boolean(payment.meta.paidAt),
      markAsPaidDirty: true,
      documentType: payment.meta.documentType ?? "factura",
    }));
    setEditingPaymentId(payment.id);
    setPaymentSuccess(null);
    setPaymentFormError(null);
    setRegisterOpen(true);
  }, []);

  const handleDeletePayment = React.useCallback(async (payment: PaymentRecord) => {
    const docLabel = documentTypeLabel(payment.meta.documentType);
    if (!window.confirm(`¿Eliminar la ${docLabel.toLowerCase()} ${payment.invoice_number}?`)) return;
    setDeletingPaymentId(payment.id);
    setPaymentsError(null);
    try {
      const response = await fetch(`${paymentsEndpointBase}/${payment.id}`, { method: "DELETE" });
      if (!response.ok && response.status !== 404) {
        let errorMessage = "No pudimos eliminar la factura seleccionada.";
        try {
          const body = await response.json();
          if (body && typeof body.error === "string" && body.error.trim()) {
            errorMessage = body.error.trim();
          }
        } catch {
          // Ignoramos errores de parseo de respuesta
        }
        throw new Error(errorMessage);
      }

      setPayments((prev) => prev.filter((item) => item.id !== payment.id));

      if (editingPaymentId === payment.id) {
        resetPaymentForm();
        setRegisterOpen(false);
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      console.error("payment delete failed", message);
      setPaymentsError(message || "No pudimos eliminar la factura seleccionada.");
    } finally {
      setDeletingPaymentId(null);
    }
  }, [paymentsEndpointBase, editingPaymentId, resetPaymentForm]);

  const handleToggleUrgent = React.useCallback(async (payment: PaymentRecord) => {
    const nextUrgent = !payment.meta.urgent;
    setTogglingUrgentId(payment.id);
    setPaymentsError(null);

    const updatedMeta: PaymentMeta = { ...payment.meta, urgent: nextUrgent };
    const newNote = buildPaymentNote(payment.noteText, updatedMeta);

    try {
      const updatedPayment = await apiUpdatePayment(payment.id, { note: newNote });
      setPayments((prev) => prev.map((item) => (item.id === updatedPayment.id ? updatedPayment : item)));
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      console.error("payment urgent toggle failed", message);
      setPaymentsError(message || "No pudimos actualizar la prioridad de la factura.");
    } finally {
      setTogglingUrgentId(null);
    }
  }, [apiUpdatePayment]);

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
      whatsapp: provider.whatsapp ?? "",
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
      whatsapp: providerForm.whatsapp.trim() || null,
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
        .select("id, name, alias, whatsapp, payment_terms, payment_day, contact_info, created_at")
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
        .select("id, name, alias, whatsapp, payment_terms, payment_day, contact_info, created_at")
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

      <div className="flex justify-end">
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
          <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
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
                  <div className="flex items-center justify-between gap-2">
                    <Label htmlFor="payment-date">Fecha</Label>
                    <div className="flex items-center gap-1">
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="h-7 px-2 text-xs"
                        onClick={() =>
                          setPaymentForm((prev) => ({ ...prev, date: todayIso }))
                        }
                        disabled={isFormDateToday}
                      >
                        Hoy
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="h-7 px-2 text-xs"
                        onClick={() =>
                          setPaymentForm((prev) => ({ ...prev, date: yesterdayIso }))
                        }
                        disabled={isFormDateYesterday}
                      >
                        Ayer
                      </Button>
                    </div>
                  </div>
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
                  <Label htmlFor="payment-due-date">Fecha de vencimiento</Label>
                  <Input
                    id="payment-due-date"
                    type="date"
                    value={paymentForm.dueDate}
                    onChange={(event) =>
                      setPaymentForm((prev) => ({ ...prev, dueDate: event.target.value }))
                    }
                  />
                  <p className="text-xs text-neutral-500">
                    Dejá en blanco para usar la fecha automática según la configuración del proveedor.
                  </p>
                </div>
                <div className="space-y-1">
                  <div className="flex items-center justify-between gap-2">
                    <Label htmlFor="payment-invoice">Factura / Remito</Label>
                    <Select
                      value={paymentForm.documentType}
                      onValueChange={(value) =>
                        setPaymentForm((prev) => ({
                          ...prev,
                          documentType: (value as DocumentType) ?? "factura",
                        }))
                      }
                    >
                      <SelectTrigger className="h-8 w-28 text-xs">
                        <SelectValue placeholder="Tipo" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="factura">Factura</SelectItem>
                        <SelectItem value="remito">Remito</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
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
                      setPaymentForm((prev) => {
                        const nextMethod = value as PaymentMethod;
                        if (!prev.markAsPaidDirty) {
                          return {
                            ...prev,
                            method: nextMethod,
                            markAsPaid: nextMethod === "EFECTIVO",
                          };
                        }
                        return { ...prev, method: nextMethod };
                      })
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
                <div className="space-y-2 sm:col-span-2">
                  <Label>Foto de la factura</Label>
                  <div className="rounded-lg border border-dashed border-neutral-300 bg-neutral-50/80 p-4 text-sm text-neutral-700">
                    <p className="mb-3">
                      Tomá la foto desde el formulario externo para que quede guardada en Google. Volvé acá después de completarlo para registrar el pago.
                    </p>
                    {effectiveFormUrl ? (
                      <div className="group inline-flex items-center gap-2">
                        <Button asChild size="sm" variant="outline">
                          <a
                            href={effectiveFormUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                          >
                            Abrir formulario
                          </a>
                        </Button>
                        <Button
                          type="button"
                          size="sm"
                          variant="ghost"
                          className="pointer-events-none opacity-0 transition-opacity group-hover:pointer-events-auto group-hover:opacity-100"
                          onClick={() => handleEditLink("form")}
                        >
                          Editar link
                        </Button>
                      </div>
                    ) : (
                      <p className="text-sm text-rose-600">No hay un formulario configurado.</p>
                    )}
                  </div>
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
                {editingPaymentId && (
                  <div className="sm:col-span-2 rounded-lg border border-emerald-200 bg-emerald-50/70 px-4 py-3">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div>
                        <p className="text-sm font-medium text-neutral-800">Estado del pago</p>
                        <p className="text-xs text-neutral-500">
                          Desmarcá la casilla para volver a “Facturas por pagar”.
                        </p>
                      </div>
                      <Label
                        htmlFor="payment-mark-paid"
                        className="flex items-center gap-2 text-sm font-medium"
                      >
                        <Checkbox
                          id="payment-mark-paid"
                          checked={paymentForm.markAsPaid}
                          onCheckedChange={(checked) =>
                            setPaymentForm((prev) => ({
                              ...prev,
                              markAsPaid: Boolean(checked),
                              markAsPaidDirty: true,
                            }))
                          }
                        />
                        Pagada
                      </Label>
                    </div>
                  </div>
                )}
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

        <div className="w-full sm:w-[220px]">
          <Select value={viewMode} onValueChange={(value) => setViewMode(value as ViewMode)}>
            <SelectTrigger aria-label="Seleccionar vista">
              <SelectValue placeholder="Seleccionar vista" />
            </SelectTrigger>
            <SelectContent align="end">
              {VIEW_MODE_OPTIONS.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {effectivePhotosUrl && (
          <div className="group inline-flex items-center gap-2">
            <Button asChild variant="outline">
              <a
                href={effectivePhotosUrl}
                target="_blank"
                rel="noopener noreferrer"
              >
                Ver fotos
              </a>
            </Button>
            <Button
              type="button"
              size="sm"
              variant="ghost"
              className="pointer-events-none opacity-0 transition-opacity group-hover:pointer-events-auto group-hover:opacity-100"
              onClick={() => handleEditLink("photos")}
            >
              Editar link
            </Button>
          </div>
        )}

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
                              {provider.whatsapp && (
                                <div>
                                  <dt className="uppercase tracking-wide text-[10px] text-neutral-400">WhatsApp</dt>
                                  <dd>{provider.whatsapp}</dd>
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
                    <Label htmlFor="provider-whatsapp">WhatsApp</Label>
                    <Input
                      id="provider-whatsapp"
                      type="tel"
                      inputMode="tel"
                      value={providerForm.whatsapp}
                      onChange={(event) =>
                        setProviderForm((prev) => ({ ...prev, whatsapp: event.target.value }))
                      }
                      placeholder="54911XXXXXXX"
                    />
                    <p className="text-[11px] text-neutral-500">
                      Usá el formato internacional sin espacios ni guiones.
                    </p>
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
        <div className="space-y-2">
          <div className="relative w-full">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-400" />
            <Input
              type="search"
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
              placeholder="Buscar por proveedor, factura o monto"
              className="w-full pl-9 pr-9"
            />
            {searchQuery && (
              <button
                type="button"
                aria-label="Limpiar búsqueda"
                className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-400 transition hover:text-neutral-600"
                onClick={() => setSearchQuery("")}
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>
          <h2 className="text-sm font-medium text-neutral-700">Facturas por pagar</h2>
        </div>
        {paymentsLoading ? (
          <div className="space-y-3">
            {Array.from({ length: 2 }).map((_, idx) => (
              <PlaceholderCard key={idx} />
            ))}
          </div>
        ) : pendingPayments.length === 0 ? (
          <p className="text-sm text-neutral-500">
            {hasSearch ? "No hay facturas que coincidan con tu búsqueda." : "No hay facturas pendientes."}
          </p>
        ) : isWeeklyView ? (
          <div className="space-y-3">
            {weeklyPendingGroups.buckets.map((bucket) => {
              const isExpanded = weeklyExpandedSections[bucket.key] ?? false;
              const countLabel = bucket.payments.length === 1 ? "1 pago" : `${bucket.payments.length} pagos`;
              return (
                <div key={bucket.key} className="rounded-xl border bg-white shadow-sm">
                  <button
                    type="button"
                    className="flex w-full items-center justify-between px-4 py-3 text-left"
                    onClick={() => handleToggleWeeklySection(bucket.key)}
                    aria-expanded={isExpanded}
                  >
                    <div>
                      <p className="text-sm font-semibold text-neutral-800">{bucket.label}</p>
                      <p className="text-xs text-neutral-500">{countLabel}</p>
                    </div>
                    <ChevronDown
                      className={cn(
                        "h-4 w-4 text-neutral-500 transition-transform",
                        isExpanded ? "rotate-180" : undefined
                      )}
                    />
                  </button>
                  {isExpanded && (
                    bucket.payments.length > 0 ? (
                      <div className="space-y-3 border-t px-4 py-4">
                        {bucket.payments.map((payment) => renderPendingCard(payment))}
                      </div>
                    ) : (
                      <p className="border-t px-4 py-4 text-sm text-neutral-500">
                        No hay pagos asignados.
                      </p>
                    )
                  )}
                </div>
              );
            })}
            {weeklyPendingGroups.unscheduled.length > 0 && (
              <div className="rounded-xl border border-dashed bg-white shadow-sm">
                <button
                  type="button"
                  className="flex w-full items-center justify-between px-4 py-3 text-left"
                  onClick={() => handleToggleWeeklySection(UNSCHEDULED_WEEKLY_BUCKET.key)}
                  aria-expanded={weeklyExpandedSections[UNSCHEDULED_WEEKLY_BUCKET.key] ?? false}
                >
                  <div>
                    <p className="text-sm font-semibold text-neutral-800">{UNSCHEDULED_WEEKLY_BUCKET.label}</p>
                    <p className="text-xs text-neutral-500">
                      {weeklyPendingGroups.unscheduled.length === 1
                        ? "1 pago"
                        : `${weeklyPendingGroups.unscheduled.length} pagos`}
                    </p>
                  </div>
                  <ChevronDown
                    className={cn(
                      "h-4 w-4 text-neutral-500 transition-transform",
                      weeklyExpandedSections[UNSCHEDULED_WEEKLY_BUCKET.key] ? "rotate-180" : undefined
                    )}
                  />
                </button>
                {weeklyExpandedSections[UNSCHEDULED_WEEKLY_BUCKET.key] && (
                  <div className="space-y-3 border-t px-4 py-4">
                    {weeklyPendingGroups.unscheduled.map((payment) => renderPendingCard(payment))}
                  </div>
                )}
              </div>
            )}
          </div>
        ) : isTableView ? (
          <PaymentsTable
            variant="pending"
            payments={pendingPayments}
            todayIso={todayIso}
            onEdit={handleEditPayment}
            onDelete={handleDeletePayment}
            onToggleUrgent={handleToggleUrgent}
            onMark={handleOpenMarkDialog}
            togglingUrgentId={togglingUrgentId}
            deletingPaymentId={deletingPaymentId}
          />
        ) : (
          <div className="space-y-3">
            {pendingPayments.map((payment) => renderPendingCard(payment))}
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
          <p className="text-sm text-neutral-500">
            {hasSearch ? "No hay facturas pagadas que coincidan con tu búsqueda." : "Aún no registraste pagos."}
          </p>
        ) : isTableView ? (
          <PaymentsTable
            variant="paid"
            payments={paidPayments}
            todayIso={todayIso}
            onEdit={handleEditPayment}
            onDelete={handleDeletePayment}
            onToggleUrgent={handleToggleUrgent}
            onMark={handleOpenMarkDialog}
            onSendWhatsapp={(payment) => handleSendWhatsapp(payment.provider?.whatsapp ?? null)}
            togglingUrgentId={togglingUrgentId}
            deletingPaymentId={deletingPaymentId}
          />
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
              const dueCountdown = formatDueCountdown(payment.dueDate, todayIso);
              const showAlias = Boolean(payment.provider?.alias);
              const showContact = Boolean(payment.provider?.contact_info);
              const showWhatsapp = Boolean(payment.provider?.whatsapp);
              const noteContent = payment.noteText?.trim() ? payment.noteText.trim() : null;
              const documentLabel = documentTypeLabel(payment.meta.documentType);
              const providerDetailsPaid =
                payment.provider && (showAlias || showContact || showWhatsapp) ? (
                  <dl className="grid gap-2 text-sm text-neutral-600 sm:grid-cols-2">
                    {showAlias && (
                      <div>
                        <dt className="uppercase tracking-wide text-[10px] text-neutral-400">Alias / Cuenta</dt>
                        <dd>{payment.provider?.alias}</dd>
                      </div>
                    )}
                    {showWhatsapp && (
                      <div>
                        <dt className="uppercase tracking-wide text-[10px] text-neutral-400">WhatsApp</dt>
                        <dd>{payment.provider?.whatsapp}</dd>
                      </div>
                    )}
                    {showContact && (
                      <div className="sm:col-span-2">
                        <dt className="uppercase tracking-wide text-[10px] text-neutral-400">Contacto</dt>
                        <dd>{payment.provider?.contact_info}</dd>
                      </div>
                    )}
                  </dl>
                ) : null;
              const hasExtraInfo = Boolean(providerDetailsPaid);
              const isDetailsExpanded = expandedDetails[payment.id] ?? false;
              const detailsLabel = isDetailsExpanded ? "Ocultar detalles" : "Ver detalles";
              const canSendWhatsapp = Boolean(payment.provider?.whatsapp);
              const isReceiptSent = sentReceipts[payment.id] ?? false;
              return (
                <Card
                  key={payment.id}
                  className={cn(
                    "relative border-emerald-200 bg-emerald-50/80",
                    payment.isUrgent && "border-amber-300 bg-amber-50"
                  )}
                >
                  <Button
                    type="button"
                    size="icon"
                    variant="ghost"
                    className="absolute right-2 top-2 h-8 w-8 rounded-full text-neutral-400 hover:bg-rose-50 hover:text-rose-600"
                    onClick={() => handleDeletePayment(payment)}
                    disabled={deletingPaymentId === payment.id}
                    aria-label={`Eliminar ${documentLabel} ${payment.invoice_number}`}
                    title="Eliminar"
                  >
                    {deletingPaymentId === payment.id ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Trash2 className="h-4 w-4" />
                    )}
                  </Button>
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
                          {documentLabel} {payment.invoice_number} · {methodLabel(payment.payment_method)}
                        </CardDescription>
                        {noteContent && <ObservationHighlight text={noteContent} />}
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
                      <p className="text-xs text-neutral-500">
                        Vencimiento: {dueLabel}
                        {dueCountdown ? ` (${dueCountdown})` : ""}
                      </p>
                    )}
                    {hasExtraInfo && (
                      <div className="space-y-2">
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="flex w-full items-center justify-between px-0 text-sm font-medium text-neutral-700 hover:bg-transparent"
                          onClick={() => handleToggleDetails(payment.id)}
                          aria-expanded={isDetailsExpanded}
                        >
                          <span>{detailsLabel}</span>
                          {isDetailsExpanded ? (
                            <ChevronUp className="h-4 w-4" />
                          ) : (
                            <ChevronDown className="h-4 w-4" />
                          )}
                        </Button>
                        {isDetailsExpanded && (
                          <div className="space-y-3">
                            {providerDetailsPaid}
                          </div>
                        )}
                      </div>
                    )}
                    <div className="flex flex-wrap items-center justify-end gap-2">
                      {canSendWhatsapp && (
                        <div className="group relative inline-flex">
                          <Button
                            size="sm"
                            variant="outline"
                            type="button"
                            className={cn(
                              isReceiptSent
                                ? "border-emerald-500 bg-emerald-50 text-emerald-700"
                                : undefined
                            )}
                            onClick={() => handleSendWhatsapp(payment.provider?.whatsapp ?? null)}
                          >
                            {isReceiptSent ? "Comprobante enviado" : "Enviar comprobante"}
                          </Button>
                          <button
                            type="button"
                            aria-label={isReceiptSent ? "Marcar como no enviado" : "Marcar como enviado"}
                            onClick={(event) => {
                              event.preventDefault();
                              event.stopPropagation();
                              toggleReceiptSent(payment.id);
                            }}
                            className="pointer-events-none absolute -right-2 -top-2 flex h-5 w-5 items-center justify-center rounded-full border border-neutral-300 bg-white text-emerald-600 opacity-0 shadow-sm transition group-hover:pointer-events-auto group-hover:opacity-100"
                          >
                            <Check className={cn("h-3 w-3", isReceiptSent ? "opacity-100" : "opacity-50")} />
                          </button>
                        </div>
                      )}
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
                  {documentTypeLabel(selectedPayment.meta.documentType)} {selectedPayment.invoice_number} · {formatCurrency(selectedPayment.amount)}
                </p>
              </div>
              <div className="space-y-1">
                <div className="flex items-center justify-between gap-2">
                  <Label htmlFor="mark-date">Fecha de pago</Label>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-7 px-2 text-xs"
                    onClick={() => setMarkDate(todayIso)}
                    disabled={markSaving || isTodaySelected}
                  >
                    Hoy
                  </Button>
                </div>
                <Input
                  id="mark-date"
                  type="date"
                  value={markDate}
                  onChange={(event) => setMarkDate(event.target.value)}
                  max={todayIso}
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
    documentType: parsedNote.meta.documentType ?? "factura",
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

/* eslint-disable no-unused-vars */
type PaymentsTableProps = {
  payments: EnrichedPayment[];
  variant: "pending" | "paid";
  todayIso: string;
  onEdit: (payment: PaymentRecord) => void;
  onDelete: (payment: PaymentRecord) => void;
  onToggleUrgent: (payment: PaymentRecord) => void;
  onMark: (payment: PaymentRecord, initialDate?: string | null) => void;
  onSendWhatsapp?: (payment: EnrichedPayment) => void;
  togglingUrgentId: string | null;
  deletingPaymentId: string | null;
};
/* eslint-enable no-unused-vars */

function PaymentsTable({
  payments,
  variant,
  todayIso,
  onEdit,
  onDelete,
  onToggleUrgent,
  onMark,
  onSendWhatsapp,
  togglingUrgentId,
  deletingPaymentId,
}: PaymentsTableProps) {
  if (payments.length === 0) return null;

  return (
    <div className="overflow-x-auto rounded-xl border bg-white shadow-sm">
      <table className="w-full min-w-[720px] text-sm">
        <thead className="bg-neutral-50 text-[11px] uppercase tracking-wide text-neutral-500">
          <tr>
            <th className="py-2 pl-4 pr-3 text-left font-medium">Proveedor</th>
            <th className="px-3 py-2 text-left font-medium">Documento</th>
            <th className="px-3 py-2 text-left font-medium">Importe</th>
            {variant === "paid" && (
              <th className="px-3 py-2 text-left font-medium">Pagada</th>
            )}
            <th className="px-3 py-2 text-left font-medium">
              {variant === "paid" ? "Vencimiento" : "Vence"}
            </th>
            <th className="py-2 pl-3 pr-4 text-left font-medium">Acciones</th>
          </tr>
        </thead>
        <tbody>
          {payments.map((payment) => {
            const dayLabel = payment.dueDayLabel ? capitalize(payment.dueDayLabel) : null;
            const dueLabel = payment.dueDate
              ? dayLabel
                ? `${dayLabel} · ${formatIsoDate(payment.dueDate)}`
                : formatIsoDate(payment.dueDate)
              : variant === "pending"
              ? "Sin fecha de vencimiento"
              : "—";
            const dueCountdown = formatDueCountdown(payment.dueDate, todayIso);
            const dueClass = cn(
              "text-sm text-neutral-700",
              variant === "pending" && payment.isOverdue && !payment.isUrgent
                ? "font-semibold text-rose-600"
                : undefined
            );
            const noteContent = payment.noteText?.trim() ? payment.noteText.trim() : null;
            const documentLabel = documentTypeLabel(payment.meta.documentType);
            const whatsappReady = Boolean(onSendWhatsapp && payment.provider?.whatsapp);
            const rowClass = cn(
              "border-b last:border-b-0",
              payment.isUrgent
                ? "bg-amber-50/80"
                : variant === "pending" && payment.isOverdue
                ? "bg-rose-50/70"
                : undefined
            );
            return (
              <tr key={payment.id} className={rowClass}>
                <td className="py-3 pl-4 pr-3 align-top">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-neutral-900">
                      {payment.provider?.name ?? payment.provider_name}
                    </span>
                    {payment.isUrgent && (
                      <span className="inline-flex items-center rounded-full bg-amber-100 px-2 py-0.5 text-[11px] font-medium text-amber-700">
                        Urgente
                      </span>
                    )}
                  </div>
                  {noteContent && <ObservationHighlight text={noteContent} size="sm" />}
                </td>
                <td className="px-3 py-3 align-top">
                  <div className="font-medium text-neutral-900">
                    {documentLabel} {payment.invoice_number}
                  </div>
                  <p className="text-xs text-neutral-500">{methodLabel(payment.payment_method)}</p>
                </td>
                <td className="px-3 py-3 align-top">
                  <div className="font-semibold text-neutral-900">
                    {formatCurrency(payment.amount)}
                  </div>
                </td>
                {variant === "paid" && (
                  <td className="px-3 py-3 align-top">
                    <p className="text-sm text-neutral-700">
                      {payment.paidDate ? formatIsoDate(payment.paidDate) : "—"}
                    </p>
                  </td>
                )}
                <td className="px-3 py-3 align-top">
                  <p className={dueClass}>
                    {dueLabel}
                    {dueCountdown ? ` (${dueCountdown})` : ""}
                  </p>
                </td>
                <td className="py-3 pl-3 pr-4 align-top">
                  <div className="flex flex-wrap gap-1">
                    {variant === "paid" && whatsappReady && (
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        onClick={() => onSendWhatsapp?.(payment)}
                      >
                        Enviar comprobante
                      </Button>
                    )}
                    <Button size="sm" variant="outline" onClick={() => onEdit(payment)}>
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
                      onClick={() => onToggleUrgent(payment)}
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
                      onClick={() => onDelete(payment)}
                      disabled={deletingPaymentId === payment.id}
                    >
                      {deletingPaymentId === payment.id ? "Eliminando..." : "Eliminar"}
                    </Button>
                    <Button
                      size="sm"
                      onClick={() =>
                        onMark(
                          payment,
                          variant === "pending"
                            ? todayIso
                            : payment.meta.paidAt ?? payment.payment_date
                        )
                      }
                    >
                      {variant === "pending" ? "Marcar pagado" : "Editar pago"}
                    </Button>
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

type ObservationHighlightProps = {
  text: string;
  size?: "md" | "sm";
};

function ObservationHighlight({ text, size = "md" }: ObservationHighlightProps) {
  return (
    <div
      className={cn(
        "rounded-lg border border-sky-200/80 bg-sky-50 text-sky-900 shadow-[inset_0_1px_0_rgba(255,255,255,0.7)]",
        size === "sm" ? "mt-1 px-2.5 py-1.5 text-xs" : "mt-2 px-3 py-2 text-sm"
      )}
    >
      <p
        className={cn(
          "font-semibold uppercase tracking-wide text-sky-700",
          size === "sm" ? "text-[10px]" : "text-[11px]"
        )}
      >
        Observación
      </p>
      <p
        className={cn(
          "leading-relaxed",
          size === "sm" ? "text-[12px]" : "mt-0.5 text-sm"
        )}
      >
        {text}
      </p>
    </div>
  );
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

function documentTypeLabel(type?: DocumentType | null) {
  return type === "remito" ? "Remito" : "Factura";
}

const MS_IN_DAY = 1000 * 60 * 60 * 24;

function getPaymentWeekdayIndex(payment: EnrichedPayment): number | null {
  if (payment.dueDateObj && !Number.isNaN(payment.dueDateObj.getTime())) {
    const day = payment.dueDateObj.getDay();
    return day === 0 ? null : day;
  }
  if (payment.config.dayOfWeek) {
    const normalized = payment.config.dayOfWeek;
    const idx = normalized ? WEEKDAY_INDEX[normalized] : null;
    if (idx == null || idx === 0) return null;
    return idx;
  }
  return null;
}

function toUtcDayTimestamp(value: string | null): number | null {
  if (!value) return null;
  const iso = value.length === 10 ? `${value}T00:00:00` : value;
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return null;
  return Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate());
}

function formatDueCountdown(dueDate: string | null, todayIso: string): string | null {
  const targetTs = toUtcDayTimestamp(dueDate);
  const todayTs = toUtcDayTimestamp(todayIso);
  if (targetTs === null || todayTs === null) return null;
  const diffDays = Math.round((targetTs - todayTs) / MS_IN_DAY);
  if (diffDays === 0) return "hoy";
  if (diffDays > 0) {
    return diffDays === 1 ? "en 1 día" : `en ${diffDays} días`;
  }
  const past = Math.abs(diffDays);
  return past === 1 ? "hace 1 día" : `hace ${past} días`;
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
