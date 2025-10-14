"use client";

import React, { Suspense } from "react";
import { getSupabaseBrowserClient } from "@/lib/supabaseClient";
import { useBranch } from "@/components/branch/BranchProvider";

import { useSearchParams, useRouter } from "next/navigation";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";


/* UI */
import { Card, CardContent } from "@/components/ui/card";
import { Accordion, AccordionItem, AccordionTrigger, AccordionContent } from "@/components/ui/accordion";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import {
  Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription, SheetTrigger,
} from "@/components/ui/sheet";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";

/* Icons */
import {
  ChevronsDown,
  History as HistoryIcon,
  CalendarPlus,
  Trash2,
  CalendarDays,
  Truck,
  Check,
  FolderOpen as OpenIcon,
  Loader2,
} from "lucide-react";

/* =================== Tipos =================== */
type Freq = "SEMANAL" | "QUINCENAL" | "MENSUAL";
type Status = "PENDIENTE" | "REALIZADO";
type PayMethod = "EFECTIVO" | "TRANSFER" | "TRANSFERENCIA";

type ProviderCache = {
  id: string;
  name: string;
  freq: Freq;
  order_day: number | null;
  receive_day: number | null;
  responsible: string;
  status: Status;
  payment_method?: "EFECTIVO" | "TRANSFERENCIA" | null;
};

type OrderSummary = { provider_id: string; total: number | null };

type BudgetProvider = {
  id: string;
  name: string;
  freq: Freq;
  status: Status;
  payment: "EFECTIVO" | "TRANSFER";
  amount: number;
  responsible?: string | null;
  order_day?: number | null;
  receive_day?: number | null;
};

/** Lo que guardamos por proveedor en el snapshot (historial) */
type SnapshotProvider = {
  id: string;
  name: string;
  freq: Freq;
  status: Status;
  payment: "EFECTIVO" | "TRANSFER";
  responsible?: string | null;
  usedOverride: boolean;
  overrideAmount?: number;
  amount: number;
};

/* ====== Snapshots (Historial) ====== */
type SnapshotPayload = {
  totalsByFreq?: Record<Freq, number> | null;
  totalsByMethod?: { EFECTIVO?: number; TRANSFER?: number } | null;
  totalSemana?: number | null;
  diferencia?: number | null;
  providersByFreq?: Record<Freq, SnapshotProvider[]> | null;
};

type BudgetSnapshot = {
  id: string;
  weekStart: string;
  weekEnd: string;
  label?: string;
  budgetCap: number;
  totalsByFreq: Record<Freq, number>;
  totalsByMethod: { EFECTIVO: number; TRANSFER: number };
  totalSemana: number;
  diferencia: number;
  providersByFreq?: Record<Freq, SnapshotProvider[]>;
  createdAt: string;
};

function snapshotTitle(h: BudgetSnapshot) {
  return h.label?.trim() || `${formatAR(h.weekStart)}–${formatAR(h.weekEnd)}`;
}

/* =================== Constantes =================== */
const CACHE_KEY_PREFIX = "gestock:proveedores_cache:v5";
const TABLE_PROVIDERS = "providers";
const TABLE_SUMMARIES = "order_summaries";
const TABLE_SUMMARIES_WEEK = "order_summaries_week";

/* === Presupuesto (propio) === */
const TABLE_WEEKS = "budget_weeks";
const TABLE_OVERRIDES = "budget_overrides";
const TABLE_SNAPS = "budget_snapshots";

/* === Semana + inclusión (desde Proveedores) === */
const TABLE_PW_WEEKS = "provider_weeks";               // semanas “fuente”
const TABLE_PW_INCLUDED = "provider_week_providers";   // inclusión por semana
const WEEK_CACHE_KEY_PREFIX = "gestock:proveedores:selected_week"; // pista local (no bloqueante)

type PWWeekRow = { id: string; week_start: string; label?: string | null };
type PWIncludedRow = { id: string; week_id: string; provider_id: string; added_at: string | null };

/* === Tipos presupuesto (ya tuyos) === */
type WeekRow = {
  id: string;
  week_start: string;  // YYYY-MM-DD
  week_end: string;    // YYYY-MM-DD
  label: string | null;
  budget_cap: number;
  created_at: string;
  updated_at: string;
};

type SnapshotRow = {
  id: string;
  week_start: string;
  week_end: string;
  label: string | null;
  budget_cap: number;
  payload: SnapshotPayload | null;
  created_at: string;
};

const FREQ_LABEL: Record<Freq, string> = {
  SEMANAL: "Semanales",
  QUINCENAL: "Quincenales",
  MENSUAL: "Mensuales",
};

const FREQ_COLOR_BAR: Record<Freq, string> = {
  SEMANAL: "bg-emerald-500",
  QUINCENAL: "bg-amber-500",
  MENSUAL: "bg-rose-500",
};

const FREQ_BADGE: Record<Freq, string> = {
  SEMANAL: "bg-emerald-100 text-emerald-900",
  QUINCENAL: "bg-amber-100 text-amber-900",
  MENSUAL: "bg-rose-100 text-rose-900",
};

const ORDER: Freq[] = ["SEMANAL", "QUINCENAL", "MENSUAL"];

/* =================== Utils =================== */
function fmtARS(n: number) {
  return new Intl.NumberFormat("es-AR", {
    style: "currency",
    currency: "ARS",
    maximumFractionDigits: 0,
  }).format(n || 0);
}
// >>> Ponelo junto a los otros utils (fuera del componente)
function weekOptLabel(w: PWWeekRow) {
  const monday = new Date(w.week_start);
  const sunday = addDays(monday, 6);
  return (w.label?.trim())
    || `Semana ${getISOWeekFromISO(w.week_start)} · ${formatAR(monday.toISOString())}–${formatAR(sunday.toISOString())}`;
}

const DAYS = ["Domingo","Lunes","Martes","Miércoles","Jueves","Viernes","Sábado"] as const;
function normalizeDay(d: unknown) {
  const n = Number(d);
  return Number.isFinite(n) && n >= 0 && n <= 6 ? n : -1;
}
function dayLabel(d?: number | null) {
  const n = normalizeDay(d ?? -1);
  return n === -1 ? "—" : DAYS[n];
}
function getISOWeekFromISO(dateISO: string): number {
  if (!dateISO) return 0;
  const d = new Date(dateISO);
  const target = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
  const day = (target.getUTCDay() + 6) % 7;
  target.setUTCDate(target.getUTCDate() - day + 3);
  const firstThursday = new Date(Date.UTC(target.getUTCFullYear(), 0, 4));
  const firstDay = (firstThursday.getUTCDay() + 6) % 7;
  firstThursday.setUTCDate(firstThursday.getUTCDate() - firstDay + 3);
  const weekNo = 1 + Math.round((target.getTime() - firstThursday.getTime()) / (7 * 24 * 3600 * 1000));
  return weekNo;
}
const parseMoney = (s: string) => Number(String(s).replace(/[^\d]/g, "")) || 0;
const normPayment = (v?: PayMethod | null): "EFECTIVO" | "TRANSFER" =>
  v === "TRANSFERENCIA" ? "TRANSFER" : v === "TRANSFER" ? "TRANSFER" : "EFECTIVO";
function startOfMonday(d: Date) {
  const day = d.getDay();
  const diff = (day + 6) % 7;
  const res = new Date(d);
  res.setDate(d.getDate() - diff);
  res.setHours(0, 0, 0, 0);
  return res;
}
function addDays(d: Date, days: number) {
  const res = new Date(d);
  res.setDate(res.getDate() + days);
  return res;
}
function formatAR(dateISO: string) {
  if (!dateISO) return "";
  return new Intl.DateTimeFormat("es-AR", {
    day: "2-digit",
    month: "2-digit",
    timeZone: "UTC",
  }).format(new Date(dateISO));
}
const toDateStr = (iso: string) => new Date(iso).toISOString().slice(0, 10);

/* Overrides (presupuestado) - en memoria; se persisten sólo si hay weekRow */
type Overrides = Record<string, { enabled: boolean; amount: number }>;

/* =================== Page =================== */
export default function PresupuestoPage() {
  return (
    <Suspense fallback={<div className="p-4">Cargando presupuesto…</div>}>
      <PresupuestoContent />
    </Suspense>
  );
}
function PresupuestoContent() {
  const supabase = React.useMemo(() => getSupabaseBrowserClient(), []);
  const [loading, setLoading] = React.useState(true);
const router = useRouter();
const search = useSearchParams();
const urlWeekId = search.get("week"); // ?week=<provider_weeks.id>

const [weekOptions, setWeekOptions] = React.useState<PWWeekRow[]>([]);

  /* Semana SOLO como etiqueta/título (no afecta datos) */
  type WeekMeta = { weekStart: string; weekEnd: string };
  const [week, setWeek] = React.useState<WeekMeta>(() => {
    const monday = startOfMonday(new Date());
    const sunday = addDays(monday, 6);
    return { weekStart: monday.toISOString(), weekEnd: sunday.toISOString() };
  });
  /* Fila de semana de trabajo (para persistir overrides si hace falta) — fija al cargar */
  const [weekRow, setWeekRow] = React.useState<WeekRow | null>(null);

  /* Presupuesto */
  const [budget, setBudget] = React.useState<number>(0);
  const [budgetInput, setBudgetInput] = React.useState<string>("0");
  const [persistedBudget, setPersistedBudget] = React.useState<number>(0);

  /* Datos y overrides */
  const [data, setData] = React.useState<BudgetProvider[]>([]);
  const [overrides, setOverrides] = React.useState<Overrides>({});

  /* Historial */
  const [historyOpen, setHistoryOpen] = React.useState(false);
  const [history, setHistory] = React.useState<BudgetSnapshot[]>([]);
  const [confirmDelete, setConfirmDelete] = React.useState<{ open: boolean; id?: string; title?: string }>({ open: false });

  /* Cambios sin guardar y estado del botón Guardar */
  const [dirty, setDirty] = React.useState(false);
  const [saveState, setSaveState] = React.useState<"idle" | "saving" | "saved">("idle");

  /* Confirmación para cambiar de snapshot con cambios pendientes */
  const [pendingOpen, setPendingOpen] = React.useState<{ open: boolean; target?: BudgetSnapshot | null }>({ open: false, target: null });

  /* ===== Semana ACTIVA para inclusión (cross-device) ===== */
  const [activeWeekId, setActiveWeekId] = React.useState<string | null>(null);
  const [includedIds, setIncludedIds] = React.useState<Set<string>>(new Set());
  const [includedLoading, setIncludedLoading] = React.useState(true);

  const { currentBranch, tenantId, loading: branchLoading, error: branchError } = useBranch();
  const branchId = currentBranch?.id ?? null;

  const cacheKey = React.useMemo(
    () => `${CACHE_KEY_PREFIX}:${tenantId ?? "-"}:${branchId ?? "-"}`,
    [tenantId, branchId]
  );
  const weekCacheKey = React.useMemo(
    () => `${WEEK_CACHE_KEY_PREFIX}:${tenantId ?? "-"}:${branchId ?? "-"}`,
    [tenantId, branchId]
  );

  React.useEffect(() => {
    setWeekOptions([]);
    setWeekRow(null);
    setBudget(0);
    setBudgetInput("0");
    setPersistedBudget(0);
    setData([]);
    setOverrides({});
    setHistory([]);
    setDirty(false);
    setSaveState("idle");
    setActiveWeekId(null);
    setIncludedIds(new Set());
    setLoading(true);
    setIncludedLoading(true);
  }, [cacheKey]);

  /* ===== Helpers Supabase ===== */
  const ensureWeekRow = React.useCallback(async (meta: WeekMeta) => {
    if (!tenantId || !branchId) throw new Error("Falta la sucursal actual");
    const ws = toDateStr(meta.weekStart);
    const we = toDateStr(meta.weekEnd);

    const { data: found, error: e1 } = await supabase
      .from(TABLE_WEEKS)
      .select("*")
      .eq("tenant_id", tenantId)
      .eq("branch_id", branchId)
      .eq("week_start", ws)
      .eq("week_end", we)
      .maybeSingle();

    if (e1 && e1.code !== "PGRST116") throw e1;
    if (found) return found as WeekRow;

    const label = `Semana ${getISOWeekFromISO(meta.weekStart)} · ${formatAR(meta.weekStart)}–${formatAR(meta.weekEnd)}`;
    const { data: inserted, error: e2 } = await supabase
      .from(TABLE_WEEKS)
      .insert([{ week_start: ws, week_end: we, label, budget_cap: 10_000_000, tenant_id: tenantId, branch_id: branchId }])
      .select("*")
      .single();

    if (e2) throw e2;
    return inserted as WeekRow;
  }, [supabase, tenantId, branchId]);

  async function upsertOverride(weekId: string, providerId: string, ov: { amount: number; enabled: boolean }) {
    if (!tenantId || !branchId) return;
    await supabase.from(TABLE_OVERRIDES).upsert(
      {
        week_id: weekId,
        provider_id: providerId,
        amount: ov.amount || 0,
        enabled: !!ov.enabled,
        tenant_id: tenantId,
        branch_id: branchId,
      },
      { onConflict: "week_id,provider_id" }
    );
  }

  const fetchHistory = React.useCallback(async () => {
    if (!tenantId || !branchId) return;
    const { data, error } = await supabase
      .from(TABLE_SNAPS)
      .select("*")
      .eq("tenant_id", tenantId)
      .eq("branch_id", branchId)
      .order("created_at", { ascending: false });

    if (error) {
      console.warn("[presupuesto] snapshots:", error.message);
      return;
    }

    const list: BudgetSnapshot[] = (data as SnapshotRow[]).map((r) => {
      const payload = r.payload || {};
      const byFreq: Record<Freq, number> = { SEMANAL: 0, QUINCENAL: 0, MENSUAL: 0 };
      ORDER.forEach((freq) => {
        byFreq[freq] = Number(payload.totalsByFreq?.[freq] ?? 0);
      });

      const totalsByMethod = {
        EFECTIVO: Number(payload.totalsByMethod?.EFECTIVO ?? 0),
        TRANSFER: Number(payload.totalsByMethod?.TRANSFER ?? 0),
      };

      const providersByFreq = payload.providersByFreq
        ? (Object.fromEntries(
            ORDER.map((freq) => [freq, payload.providersByFreq?.[freq] ?? []])
          ) as Record<Freq, SnapshotProvider[]>)
        : undefined;

      return {
        id: r.id,
        weekStart: new Date(r.week_start).toISOString(),
        weekEnd: new Date(r.week_end).toISOString(),
        label: r.label ?? undefined,
        budgetCap: Number(r.budget_cap) || 0,
        totalsByFreq: byFreq,
        totalsByMethod,
        totalSemana: Number(payload.totalSemana ?? 0),
        diferencia: Number(payload.diferencia ?? 0),
        providersByFreq,
        createdAt: r.created_at,
      };
    });

    setHistory(list);
  }, [supabase, tenantId, branchId]);
// Cargar opciones de semanas (provider_weeks)
React.useEffect(() => {
  if (!tenantId || !branchId) return;
  let alive = true;
  (async () => {
    const { data, error } = await supabase
      .from(TABLE_PW_WEEKS)
      .select("id, week_start, label")
      .eq("tenant_id", tenantId)
      .eq("branch_id", branchId)
      .order("week_start", { ascending: false })
      .limit(52);
    if (!alive) return;
    if (error) {
      console.warn("[presupuesto] provider_weeks:", error.message);
      setWeekOptions([]);
      return;
    }
    const list = (data as PWWeekRow[] | null) ?? [];
    setWeekOptions(list);
  })();
  return () => { alive = false; };
}, [supabase, tenantId, branchId]);

// Si no hay week en la URL, usar la cache/local o la primera disponible
React.useEffect(() => {
  if (!tenantId || !branchId) return;
  if (urlWeekId) return;
  if (!weekOptions.length) {
    if (activeWeekId !== null) setActiveWeekId(null);
    return;
  }
  if (activeWeekId && weekOptions.some((w) => w.id === activeWeekId)) return;

  let stored: string | null = null;
  if (typeof window !== "undefined") stored = window.localStorage.getItem(weekCacheKey);
  const fallback = stored && weekOptions.some((w) => w.id === stored)
    ? stored
    : weekOptions[0]?.id ?? null;

  if (fallback && fallback !== activeWeekId) setActiveWeekId(fallback);
}, [tenantId, branchId, weekOptions, weekCacheKey, urlWeekId, activeWeekId]);

// Si viene ?week= en la URL, tomarlo como activo y guardarlo en local
React.useEffect(() => {
  if (!urlWeekId) return;
  if (!tenantId || !branchId) return;
  setActiveWeekId(urlWeekId);
  if (typeof window !== "undefined") localStorage.setItem(weekCacheKey, urlWeekId);
}, [urlWeekId, tenantId, branchId, weekCacheKey]);

React.useEffect(() => {
  if (!tenantId || !branchId) return;
  if (typeof window === "undefined") return;
  if (activeWeekId) {
    window.localStorage.setItem(weekCacheKey, activeWeekId);
  } else {
    window.localStorage.removeItem(weekCacheKey);
  }
}, [activeWeekId, tenantId, branchId, weekCacheKey]);

// Al cambiar la semana activa: sincronizar rango visual + budget_week
React.useEffect(() => {
  let alive = true;
  (async () => {
    if (!activeWeekId || !tenantId || !branchId) return;
    const { data, error } = await supabase
      .from(TABLE_PW_WEEKS)
      .select("week_start")
      .eq("id", activeWeekId)
      .eq("tenant_id", tenantId)
      .eq("branch_id", branchId)
      .maybeSingle();
    if (error || !data) return;

    const monday = new Date(data.week_start);
    const sunday = addDays(monday, 6);
    const meta = { weekStart: monday.toISOString(), weekEnd: sunday.toISOString() };
    if (!alive) return;

    setWeek(meta); // etiqueta/rango visual

    try {
      const row = await ensureWeekRow(meta); // fila en budget_weeks
      if (!alive) return;
      setWeekRow(row);
      setBudget(row.budget_cap || 0);
      setBudgetInput((row.budget_cap || 0).toLocaleString("es-AR"));
      setPersistedBudget(row.budget_cap || 0);
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      console.warn("[presupuesto] ensureWeekRow (active):", message);
    }
  })();
  return () => { alive = false; };
}, [activeWeekId, supabase, tenantId, branchId, ensureWeekRow]);

  /* ===== Cargar proveedores y montos ===== */
  React.useEffect(() => {
    let alive = true;
    (async () => {
      if (!tenantId || !branchId) {
        if (alive) {
          setData([]);
          setLoading(false);
        }
        return;
      }
      try {
        // cache local para render rápido
        if (typeof window !== "undefined") {
          const raw = localStorage.getItem(cacheKey);
          if (raw) {
            const cached = JSON.parse(raw) as ProviderCache[];
            const mapped: BudgetProvider[] = cached.map((p) => ({
              id: p.id,
              name: p.name,
              freq: p.freq,
              status: p.status,
              payment: normPayment(p.payment_method ?? null),
              amount: 0,
              responsible: p.responsible,
              order_day: typeof p.order_day === "number" ? p.order_day : null,
              receive_day: typeof p.receive_day === "number" ? p.receive_day : null,
            }));
            if (alive) setData(mapped);
          }
        }

        // remoto
        const { data: prov, error: e1 } = await supabase
          .from(TABLE_PROVIDERS)
          .select("id,name,freq,status,payment_method,responsible,order_day,receive_day")
          .eq("tenant_id", tenantId)
          .eq("branch_id", branchId)
          .order("name", { ascending: true });

        if (e1) throw e1;

        let sums: OrderSummary[] | null = null;

if (activeWeekId) {
  const { data, error } = await supabase
    .from(TABLE_SUMMARIES_WEEK)
    .select("provider_id,total")
    .eq("week_id", activeWeekId)
    .eq("tenant_id", tenantId)
    .eq("branch_id", branchId);
  if (error) console.warn("[presupuesto] order_summaries_week:", error.message);
  sums = (data as OrderSummary[] | null) ?? null;
} else {
  const { data, error } = await supabase
    .from(TABLE_SUMMARIES)
    .select("provider_id,total")
    .eq("tenant_id", tenantId)
    .eq("branch_id", branchId);
  if (error) console.warn("[presupuesto] order_summaries:", error.message);
  sums = (data as OrderSummary[] | null) ?? null;
}

const mapSum = new Map<string, number>();
(sums ?? []).forEach((s) => {
  if (s?.provider_id) mapSum.set(s.provider_id, Number(s.total ?? 0));
});


        const provRows = (prov as ProviderCache[] | null) ?? [];
        const mapped: BudgetProvider[] = provRows.map((p) => ({
          id: p.id,
          name: p.name,
          freq: p.freq as Freq,
          status: p.status as Status,
          payment: normPayment(p.payment_method ?? null),
          amount: mapSum.get(p.id) ?? 0,
          responsible: p.responsible ?? null,
          order_day: typeof p.order_day === "number" ? p.order_day : null,
          receive_day: typeof p.receive_day === "number" ? p.receive_day : null,
        }));

        if (!alive) return;
        setData((prev) => {
          const prevMap = new Map(prev.map((x) => [x.id, x]));
          const merged = mapped.map((m) => {
            const old = prevMap.get(m.id);
            return old ? { ...old, ...m, amount: m.amount ?? old.amount ?? 0 } : m;
          });
          prev.forEach((old) => {
            if (!merged.find((m) => m.id === old.id)) merged.push(old);
          });
          if (typeof window !== "undefined") {
            try {
              localStorage.setItem(cacheKey, JSON.stringify(merged));
            } catch (err) {
              const message = err instanceof Error ? err.message : String(err);
              console.warn("[presupuesto] cache save:", message);
            }
          }
          return merged;
        });
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        console.warn("[presupuesto] proveedores:", message);
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => { alive = false; };
  }, [supabase, activeWeekId, tenantId, branchId, cacheKey]);


  /* ===== Included IDs por semana ACTIVA (cross-device) ===== */
  React.useEffect(() => {
    let cancelled = false;
    (async () => {
      setIncludedLoading(true);
      try {
        if (!activeWeekId || !tenantId || !branchId) {
          if (!cancelled) setIncludedIds(new Set());
          return;
        }

        const { data, error } = await supabase
          .from(TABLE_PW_INCLUDED)
          .select("provider_id")
          .eq("week_id", activeWeekId)
          .eq("tenant_id", tenantId)
          .eq("branch_id", branchId);

        if (error) throw error;
        const set = new Set<string>((data as PWIncludedRow[]).map(r => r.provider_id));
        if (!cancelled) setIncludedIds(set);
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        console.warn("[presupuesto] included providers:", message);
        if (!cancelled) setIncludedIds(new Set());
      } finally {
        if (!cancelled) setIncludedLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [activeWeekId, supabase, tenantId, branchId]);

  /* ===== Helpers de cálculo ===== */
  const amountFor = React.useCallback(
    (p: BudgetProvider) => {
      const ov = overrides[p.id];
      return ov?.enabled ? ov.amount : p.amount || 0;
    },
    [overrides]
  );

  /* === DATA VISIBLE según inclusión === */
  const visibleData = React.useMemo(() => {
    return data.filter(p => p.freq === "SEMANAL" || includedIds.has(p.id));
  }, [data, includedIds]);

  const totalsByFreq = ORDER.reduce<Record<Freq, number>>((acc, f) => {
    const items = visibleData.filter((p) => p.freq === f);
    acc[f] = items.reduce((s, p) => s + amountFor(p), 0);
    return acc;
  }, { SEMANAL: 0, QUINCENAL: 0, MENSUAL: 0 });

  const totalEfectivo = visibleData.filter((p) => p.payment === "EFECTIVO").reduce((s, p) => s + amountFor(p), 0);
  const totalTransfer = visibleData.filter((p) => p.payment === "TRANSFER").reduce((s, p) => s + amountFor(p), 0);

  const totalSemana = totalEfectivo + totalTransfer;
  const diferencia = budget - totalSemana;

  const segments = ORDER.map((f) => {
    const amount = totalsByFreq[f];
    const pct = budget > 0 ? Math.min(100, Math.max(0, (amount / budget) * 100)) : 0;
    return { f, amount, pct };
  });

  /* ===== Cambios ===== */
  function markDirty() {
    setDirty(true);
    if (saveState === "saved") setSaveState("idle");
  }
  function setOverrideAmount(id: string, value: number) {
    setOverrides((prev) => ({ ...prev, [id]: { enabled: prev[id]?.enabled ?? false, amount: value } }));
    markDirty();
  }
  function toggleOverride(id: string, enabled: boolean) {
    setOverrides((prev) => {
      const cur = prev[id] ?? { enabled: false, amount: 0 };
      const nextOv = { ...cur, enabled };
      if (weekRow) upsertOverride(weekRow.id, id, nextOv).catch(console.error);
      return { ...prev, [id]: nextOv };
    });
    markDirty();
  }

  /* ===== Presupuesto (editable con check) ===== */
  function handleBudgetChange(e: React.ChangeEvent<HTMLInputElement>) {
    const raw = e.target.value;
    const digits = raw.replace(/[^\d]/g, "");
    if (!digits) {
      setBudget(0);
      setBudgetInput("");
    } else {
      const n = Number(digits);
      setBudget(n);
      setBudgetInput(n.toLocaleString("es-AR"));
    }
    markDirty();
  }
  function handleBudgetBlur() {
    const n = parseMoney(budgetInput);
    setBudget(n);
    setBudgetInput(n ? n.toLocaleString("es-AR") : "0");
    if (n !== persistedBudget) {
      handleBudgetSave(n).catch((err) => {
        const message = err instanceof Error ? err.message : String(err);
        console.warn("[presupuesto] budget save (blur):", message);
      });
    }
  }
  async function handleBudgetSave(nextValue?: number) {
    const n = typeof nextValue === "number" ? nextValue : parseMoney(budgetInput);
    setBudget(n);
    setBudgetInput(n ? n.toLocaleString("es-AR") : "0");
    if (n === persistedBudget) return;
    if (!weekRow || !tenantId || !branchId) return;
    const updatedAt = new Date().toISOString();
    const { error } = await supabase
      .from(TABLE_WEEKS)
      .update({ budget_cap: n, updated_at: updatedAt })
      .eq("id", weekRow.id)
      .eq("tenant_id", tenantId)
      .eq("branch_id", branchId);
    if (error) throw error;
    setPersistedBudget(n);
    setWeekRow((prev) => (prev ? { ...prev, budget_cap: n, updated_at: updatedAt } : prev));
  }

  /* ===== Guardar snapshot (botón Guardar) ===== */
  function snapshotCurrentPayload() {
    const snapProvidersByFreq: Record<Freq, SnapshotProvider[]> = { SEMANAL: [], QUINCENAL: [], MENSUAL: [] };
    visibleData.forEach((p) => {
      const ov = overrides[p.id];
      const usedOverride = !!ov?.enabled;
      const finalAmount = usedOverride ? ov!.amount : (p.amount || 0);
      snapProvidersByFreq[p.freq].push({
        id: p.id,
        name: p.name,
        freq: p.freq,
        status: p.status,
        payment: p.payment,
        responsible: p.responsible,
        usedOverride,
        overrideAmount: usedOverride ? ov!.amount : undefined,
        amount: finalAmount,
      });
    });
    ORDER.forEach((f) => snapProvidersByFreq[f].sort((a, b) => a.name.localeCompare(b.name, "es")));
    return {
      totalsByFreq,
      totalsByMethod: { EFECTIVO: totalEfectivo, TRANSFER: totalTransfer },
      totalSemana,
      diferencia,
      providersByFreq: snapProvidersByFreq,
    };
  }

  async function saveSnapshot() {
    if (!week.weekStart || !week.weekEnd) return;
    if (!tenantId || !branchId) return;
    setSaveState("saving");
    const weekNo = getISOWeekFromISO(week.weekStart);
    const label = `Semana ${weekNo} · ${formatAR(week.weekStart)}–${formatAR(week.weekEnd)}`;
    const payload = snapshotCurrentPayload();

    await supabase.from(TABLE_SNAPS).insert([{
      week_start: toDateStr(week.weekStart),
      week_end:   toDateStr(week.weekEnd),
      label,
      budget_cap: budget,
      payload,
      tenant_id: tenantId,
      branch_id: branchId,
    }]);

    if (historyOpen) fetchHistory();
    setDirty(false);
    setSaveState("saved");
    setTimeout(() => setSaveState("idle"), 2500);
  }

  /* ===== Abrir snapshot ===== */
  function buildOverridesFromSnapshot(h: BudgetSnapshot): Overrides {
    const map: Overrides = {};
    ORDER.forEach((f) => {
      (h.providersByFreq?.[f] ?? []).forEach((p) => {
        map[p.id] = { enabled: true, amount: Number(p.amount || 0) };
      });
    });
    return map;
  }

  async function openSnapshotNow(h: BudgetSnapshot) {
    setWeek({ weekStart: new Date(h.weekStart).toISOString(), weekEnd: new Date(h.weekEnd).toISOString() });
    setBudget(h.budgetCap || 0);
    setBudgetInput((h.budgetCap || 0).toLocaleString("es-AR"));
    setPersistedBudget(h.budgetCap || 0);
    const ov = buildOverridesFromSnapshot(h);
    setOverrides(ov);
    setDirty(false);
    setSaveState("idle");
    try {
      const row = await ensureWeekRow({ weekStart: h.weekStart, weekEnd: h.weekEnd });
      setWeekRow(row);
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      console.warn("[presupuesto] openSnapshot ensureWeekRow:", message);
    }
    setHistoryOpen(false);
  }

  function onRequestOpenSnapshot(h: BudgetSnapshot) {
    if (dirty) {
      setPendingOpen({ open: true, target: h });
    } else {
      openSnapshotNow(h);
    }
  }

  /* ===== Historial: abrir, renombrar, borrar ===== */
  React.useEffect(() => {
    if (historyOpen) fetchHistory();
  }, [historyOpen, fetchHistory]);

  async function updateHistoryLabel(id: string, label: string) {
    setHistory((prev) => prev.map((s) => (s.id === id ? { ...s, label } : s)));
    if (!tenantId || !branchId) return;
    await supabase
      .from(TABLE_SNAPS)
      .update({ label })
      .eq("id", id)
      .eq("tenant_id", tenantId)
      .eq("branch_id", branchId);
  }
  function askDeleteSnapshot(s: BudgetSnapshot) {
    setConfirmDelete({ open: true, id: s.id, title: snapshotTitle(s) });
  }
  async function doDeleteSnapshot() {
    const id = confirmDelete.id;
    setConfirmDelete({ open: false });
    if (!id) return;
    if (!tenantId || !branchId) return;
    await supabase
      .from(TABLE_SNAPS)
      .delete()
      .eq("id", id)
      .eq("tenant_id", tenantId)
      .eq("branch_id", branchId);
    fetchHistory();
  }

  /* =================== Render =================== */
  const inputCh = Math.max(8, budgetInput.replace(/\s/g, "").length + 1);

  if (branchLoading) {
    return <div className="p-4 text-sm text-neutral-500">Cargando sucursales…</div>;
  }

  if (branchError) {
    return <div className="p-4 text-sm text-red-600">{branchError}</div>;
  }

  if (!tenantId || !branchId || !currentBranch) {
    return <div className="p-4 text-sm text-neutral-500">No hay sucursal seleccionada.</div>;
  }

  return (
    <div className="p-4 pb-24 space-y-4 max-w-md mx-auto">
      <header className="space-y-3">
  <div className="flex items-center justify-between gap-2">
    <div className="flex-1">
      <Select
        value={activeWeekId ?? undefined}
        onValueChange={(id) => {
          const sp = new URLSearchParams(search.toString());
          sp.set("week", id);
          router.replace(`?${sp.toString()}`, { scroll: false });
          setActiveWeekId(id);
          if (typeof window !== "undefined") localStorage.setItem(weekCacheKey, id);
        }}
      >
        <SelectTrigger className="h-10 w-full">
          <SelectValue placeholder="Elegí una semana" />
        </SelectTrigger>
        <SelectContent>
          {weekOptions.map((w) => (
            <SelectItem key={w.id} value={w.id}>
              {weekOptLabel(w)}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>

    {/* Botón Historial */}
    <Sheet open={historyOpen} onOpenChange={setHistoryOpen}>
      <SheetTrigger asChild>
        <Button variant="outline" size="icon" className="h-9 w-9 rounded-full" aria-label="Historial">
          <HistoryIcon className="h-4 w-4" />
        </Button>
      </SheetTrigger>


            <SheetContent side="left" className="w-[85vw] sm:w-[420px] max-h-[100svh] overflow-y-auto overscroll-contain">
              <SheetHeader>
                <SheetTitle>Historial de semanas</SheetTitle>
                <SheetDescription>Snapshots guardados manualmente con “Guardar” o al iniciar una nueva semana.</SheetDescription>
              </SheetHeader>

              <div className="mt-4 space-y-3 pb-10">
                {history.length === 0 && (
                  <div className="text-sm text-muted-foreground">Aún no hay registros.</div>
                )}

                {history.map((h) => {
                  const snapSum = (list?: SnapshotProvider[]) =>
                    (list ?? []).reduce((s, it) => s + (it.amount || 0), 0);

                  return (
                    <Card key={h.id} className="border-slate-200">
                      <CardContent className="py-3 space-y-3">
                        {/* Encabezado editable + abrir + borrar */}
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex-1">
                            <Input
                              value={snapshotTitle(h)}
                              onChange={(e) => updateHistoryLabel(h.id, e.target.value)}
                              className="h-8 text-sm font-medium"
                              aria-label="Nombre de la semana"
                            />
                            <div className="text-xs text-slate-500 mt-1">
                              Guardado: {new Date(h.createdAt).toLocaleString("es-AR")}
                            </div>
                          </div>
                          <div className="flex items-center gap-1">
                            <Button size="icon" variant="ghost" className="h-8 w-8 rounded-full"
                              onClick={() => onRequestOpenSnapshot(h)} aria-label="Abrir presupuesto" title="Abrir">
                              <OpenIcon className="h-4 w-4" />
                            </Button>
                            <Button size="icon" variant="ghost" className="h-8 w-8 rounded-full"
                              onClick={() => askDeleteSnapshot(h)} aria-label="Eliminar snapshot" title="Eliminar">
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>

                        {/* Resumen numérico */}
                        <div className="flex items-center justify-between text-sm">
                          <div className="text-slate-600">Presupuesto:</div>
                          <div className="font-bold">{fmtARS(h.budgetCap)}</div>
                        </div>
                        <div className="flex items-center justify-between text-sm">
                          <div className="text-slate-600">Total:</div>
                          <div className="font-bold">{fmtARS(h.totalSemana)}</div>
                        </div>
                        <div className="flex items-center justify-between text-sm">
                          <div className="text-slate-600">Dif.:</div>
                          <div className="font-bold">{fmtARS(h.diferencia)}</div>
                        </div>

                        <div className="grid grid-cols-3 gap-2 text-xs">
                          <div className="rounded-md p-2 bg-emerald-50">
                            <div className="text-slate-500">Semanales</div>
                            <div className="font-semibold">{fmtARS(h.totalsByFreq.SEMANAL)}</div>
                          </div>
                          <div className="rounded-md p-2 bg-amber-50">
                            <div className="text-slate-500">Quincenales</div>
                            <div className="font-semibold">{fmtARS(h.totalsByFreq.QUINCENAL)}</div>
                          </div>
                          <div className="rounded-md p-2 bg-rose-50">
                            <div className="text-slate-500">Mensuales</div>
                            <div className="font-semibold">{fmtARS(h.totalsByFreq.MENSUAL)}</div>
                          </div>
                        </div>

                        {/* Desplegables del snapshot */}
                        {h.providersByFreq ? (
                          <Accordion type="multiple" className="mt-2">
                            {ORDER.map((f) => {
                              const list = h.providersByFreq?.[f] ?? [];
                              if (list.length === 0) return null;
                              const total = snapSum(list);
                              return (
                                <AccordionItem key={f} value={`${h.id}-${f}`} className="border rounded-lg">
                                  <AccordionTrigger className="px-3 py-2 hover:no-underline">
                                    <div className="w-full flex items-center justify-between">
                                      <div className="text-sm font-medium">{FREQ_LABEL[f]}</div>
                                      <Badge className={`rounded-full px-2 py-0.5 text-xs ${FREQ_BADGE[f]}`}>
                                        {fmtARS(total)}
                                      </Badge>
                                    </div>
                                  </AccordionTrigger>
                                  <AccordionContent className="px-3 pb-2 space-y-2">
                                    {list.map((p) => (
                                      <div key={p.id} className="rounded-md border border-slate-200 px-3 py-2 flex items-start justify-between">
                                        <div>
                                          <div className="text-[15px] font-semibold">{p.name}</div>
                                          <div className="text-[11px] text-slate-500 flex flex-wrap gap-2 mt-0.5">
                                            <span>• {p.payment === "EFECTIVO" ? "Efectivo" : "Transferencia"}</span>
                                            {p.responsible ? <span>• {p.responsible}</span> : null}
                                            <span className={p.status === "REALIZADO" ? "uppercase text-emerald-700" : "uppercase text-orange-600"}>
                                              • {p.status.toLowerCase()}
                                            </span>
                                            {p.usedOverride && (
                                              <span className="uppercase text-sky-700">
                                                • presupuestado ({fmtARS(p.overrideAmount ?? 0)})
                                              </span>
                                            )}
                                          </div>
                                        </div>
                                        <div className="font-semibold">{fmtARS(p.amount)}</div>
                                      </div>
                                    ))}
                                  </AccordionContent>
                                </AccordionItem>
                              );
                            })}
                          </Accordion>
                        ) : null}
                      </CardContent>
                    </Card>
                  );
                })}
              </div>

              {/* Confirmación borrar */}
              <AlertDialog open={confirmDelete.open} onOpenChange={(open) => setConfirmDelete((s) => ({ ...s, open }))}>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Eliminar semana</AlertDialogTitle>
                    <AlertDialogDescription>
                      ¿Seguro que querés eliminar <b>{confirmDelete.title}</b> del historial? Esta acción no se puede deshacer.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancelar</AlertDialogCancel>
                    <AlertDialogAction onClick={doDeleteSnapshot}>Eliminar</AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>

              {/* Confirmación de abrir con cambios pendientes */}
              <AlertDialog open={pendingOpen.open} onOpenChange={(open) => setPendingOpen((s) => ({ ...s, open }))}>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Tienes cambios sin guardar</AlertDialogTitle>
                    <AlertDialogDescription>
                      ¿Querés <b>guardar y abrir</b> el otro presupuesto, <b>descartar y abrir</b>, o <b>cancelar</b>?
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter className="gap-2">
                    <AlertDialogCancel>Cancelar</AlertDialogCancel>
                    <Button
                      variant="secondary"
                      onClick={() => {
                        const t = pendingOpen.target!;
                        setPendingOpen({ open: false, target: null });
                        openSnapshotNow(t); // descartar y abrir
                      }}
                    >
                      Descartar y abrir
                    </Button>
                    <AlertDialogAction
                      onClick={async () => {
                        await saveSnapshot();
                        const t = pendingOpen.target!;
                        setPendingOpen({ open: false, target: null });
                        openSnapshotNow(t); // guardar y abrir
                      }}
                    >
                      Guardar y abrir
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </SheetContent>
          </Sheet>
        </div>

        {/* Presupuesto (editable) + Guardar */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 rounded-xl border border-slate-300 px-2 py-1 bg-white">
            <Input
              aria-label="Presupuesto semanal"
              inputMode="numeric"
              enterKeyHint="done"
              pattern="[0-9]*"
              className="h-10 font-mono text-lg border-0 shadow-none focus-visible:ring-0 p-0"
              style={{ width: `${inputCh}ch` }}
              value={budgetInput}
              onChange={handleBudgetChange}
              onBlur={handleBudgetBlur}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  handleBudgetSave().catch((err) => {
                    const message = err instanceof Error ? err.message : String(err);
                    console.warn("[presupuesto] budget save (enter):", message);
                  });
                }
              }}
            />
            <Button size="icon" className="h-8 w-8 rounded-full" aria-label="Guardar presupuesto base"
              title="Guardar presupuesto base"
              onClick={() => {
                handleBudgetSave().catch((err) => {
                  const message = err instanceof Error ? err.message : String(err);
                  console.warn("[presupuesto] budget save (click):", message);
                });
              }}
            >
              <Check className="h-4 w-4" />
            </Button>
          </div>

          <span className="text-indigo-600 font-semibold">Presupuesto</span>

          <Button
            size="sm"
            className={`ml-auto rounded-full ${saveState === "saved" ? "bg-emerald-600 hover:bg-emerald-600" : ""}`}
            onClick={saveSnapshot}
            aria-label="Guardar (agregar al historial)"
            title={saveState === "saved" ? "Guardado" : "Guardar (agrega al historial)"}
            disabled={saveState === "saving"}
          >
            {saveState === "saving" ? (
              <>
                <Loader2 className="h-4 w-4 mr-1 animate-spin" /> Guardando…
              </>
            ) : saveState === "saved" ? (
              <>
                <Check className="h-4 w-4 mr-1" /> Guardado
              </>
            ) : (
              <>
                <CalendarPlus className="h-4 w-4 mr-1" /> Guardar
              </>
            )}
          </Button>
        </div>

        {/* Barra segmentada por frecuencia */}
        <div className="w-full h-4 rounded-full bg-slate-200 overflow-hidden ring-1 ring-slate-300">
          <div className="flex h-full w-full">
            {segments.map((s) => (
              <div
                key={s.f}
                className={`${FREQ_COLOR_BAR[s.f]} h-full`}
                style={{ width: `${s.pct}%` }}
                title={`${FREQ_LABEL[s.f]} · ${fmtARS(s.amount)} (${s.pct.toFixed(0)}%)`}
              />
            ))}
          </div>
        </div>
      </header>

      {/* Estado vacío / cargando */}
      {loading || includedLoading ? (
        <div className="text-sm text-slate-500">Cargando proveedores…</div>
      ) : visibleData.length === 0 ? (
        <div className="text-sm text-slate-500">
          No hay proveedores para esta semana. Agregá quincenales/mensuales desde “Proveedores”.
        </div>
      ) : null}

      {/* Desplegables por frecuencia (ordenados por monto desc) */}
      <Accordion type="multiple" className="space-y-3">
        {ORDER.map((freq) => {
          const effAmount = (p: BudgetProvider) => (overrides[p.id]?.enabled ? overrides[p.id]!.amount : (p.amount || 0));

          const items = visibleData
            .filter((p) => p.freq === freq)
            .sort((a, b) => {
              const db = effAmount(b);
              const da = effAmount(a);
              if (db !== da) return db - da;
              return a.name.localeCompare(b.name, "es");
            });

          const total = items.reduce((s, p) => s + effAmount(p), 0);

          return (
            <AccordionItem key={freq} value={freq} className="border rounded-xl">
              <AccordionTrigger className="px-4 py-3 hover:no-underline">
                <div className="w-full flex items-center justify-between">
                  <div className="text-base font-medium">{FREQ_LABEL[freq]}</div>
                  <div className="flex items-center gap-2">
                    {/* NUEVO: contador de tarjetas por frecuencia */}
      <Badge
        variant="outline"
        className="rounded-full px-2 py-0.5 text-xs bg-slate-100 text-slate-700 border-slate-300 tabular-nums"
        aria-label={`Cantidad de proveedores ${FREQ_LABEL[freq].toLowerCase()}`}
        title={`Proveedores ${FREQ_LABEL[freq].toLowerCase()}: ${items.length}`}
      >
        {items.length}
      </Badge>
                    <Badge className={`rounded-full px-3 py-1 text-sm ${FREQ_BADGE[freq]}`}>
                      {fmtARS(total)}
                    </Badge>
                    <div className="h-9 w-9 grid place-items-center rounded-full border border-slate-300 text-slate-600">
                      <ChevronsDown className="h-4 w-4" />
                    </div>
                  </div>
                </div>
              </AccordionTrigger>

              <AccordionContent className="px-3 pb-3">
                {items.length === 0 ? (
                  <div className="text-sm text-slate-500 px-2 py-2">Sin proveedores en esta frecuencia.</div>
                ) : (
                  <div className="space-y-2">
                    {items.map((p) => {
                      const ov = overrides[p.id];
                      const amountBase = p.amount || 0;

                      return (
                        <Card key={p.id} className="shadow-none border-slate-200">
                          <CardContent className="py-3 space-y-2">
                            {/* Nombre + monto arriba */}
                            <div className="flex items-start justify-between">
                              <div className="text-[15px] sm:text-base font-semibold">{p.name}</div>
                              <div className="tabular-nums whitespace-nowrap font-semibold">
                                {fmtARS(amountBase)}
                              </div>
                            </div>

                            {/* Meta compacta + días */}
                            <div className="text-xs text-slate-500 flex flex-wrap items-center gap-x-2 gap-y-1">
                              <span className="inline-flex items-center gap-1">
                                <CalendarDays className="h-3.5 w-3.5" aria-hidden />
                                Pide: {dayLabel(p.order_day)}
                              </span>
                              <span className="inline-flex items-center gap-1">
                                <Truck className="h-3.5 w-3.5" aria-hidden />
                                Recibe: {dayLabel(p.receive_day)}
                              </span>
                              <span>• {p.payment === "EFECTIVO" ? "Efectivo" : "Transferencia"}</span>
                              {p.responsible ? <span>• {p.responsible}</span> : null}
                              <span className={p.status === "REALIZADO" ? "uppercase text-emerald-700" : "uppercase text-orange-600"}>
                                • {p.status.toLowerCase()}
                              </span>
                              {ov?.enabled && <span className="uppercase text-sky-700">• usando presupuestado</span>}
                            </div>

                            {/* Línea presupuestado (debajo) */}
                            <div className="mt-2 flex items-center justify-between gap-3">
                              <span className="text-xs text-slate-600">Monto presupuestado</span>
                              <div className="flex items-center gap-2">
                                <Input
                                  inputMode="numeric"
                                  pattern="[0-9]*"
                                  placeholder="$ 0"
                                  className="h-8 w-36 text-right font-mono"
                                  value={ov?.amount ? ov.amount.toString() : ""}
                                  onChange={(e) => setOverrideAmount(p.id, parseMoney(e.target.value))}
                                  onBlur={(e) => {
                                    const val = parseMoney(e.target.value);
                                    setOverrideAmount(p.id, val);
                                    if (weekRow) upsertOverride(weekRow.id, p.id, { amount: val, enabled: !!ov?.enabled }).catch(console.error);
                                  }}
                                />
                                <div className="flex items-center gap-1">
                                  <Checkbox
                                    id={`use-${p.id}`}
                                    checked={!!ov?.enabled}
                                    onCheckedChange={(checked) => toggleOverride(p.id, Boolean(checked))}
                                  />
                                  <label htmlFor={`use-${p.id}`} className="text-xs select-none">
                                    Usar en presupuesto
                                  </label>
                                </div>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      );
                    })}
                  </div>
                )}
              </AccordionContent>
            </AccordionItem>
          );
        })}
      </Accordion>

      {/* Totales inferiores */}
      <section className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-2">
        <Card>
          <CardContent className="px-4 py-4 grid grid-cols-[1fr_auto] items-center gap-x-3 min-w-0">
            <span className="font-medium text-emerald-700 leading-tight text-sm sm:text-base">Total efectivo</span>
            <span className="tabular-nums whitespace-nowrap text-right font-semibold text-[15px] sm:text-base justify-self-end">
              {fmtARS(totalEfectivo)}
            </span>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="px-4 py-4 grid grid-cols-[1fr_auto] items-center gap-x-3 min-w-0">
            <span className="font-medium text-purple-700 leading-tight text-sm sm:text-base">Total transfer.</span>
            <span className="tabular-nums whitespace-nowrap text-right font-semibold text-[15px] sm:text-base justify-self-end">
              {fmtARS(totalTransfer)}
            </span>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="px-4 py-4 grid grid-cols-[1fr_auto] items-center gap-x-3 min-w-0">
            <span className="font-semibold text-emerald-800 leading-tight text-sm sm:text-base">Total semana</span>
            <span className="tabular-nums whitespace-nowrap text-right font-semibold text-[15px] sm:text-base justify-self-end">
              {fmtARS(totalSemana)}
            </span>
          </CardContent>
        </Card>
        <Card className="bg-amber-50">
          <CardContent className="px-4 py-4 grid grid-cols-[1fr_auto] items-center gap-x-3 min-w-0">
            <span className="font-semibold leading-tight text-sm sm:text-base">Diferencia</span>
            <span className="tabular-nums whitespace-nowrap text-right font-semibold text-[15px] sm:text-base justify-self-end">
              {fmtARS(diferencia)}
            </span>
          </CardContent>
        </Card>
      </section>
    </div>
  );
}
