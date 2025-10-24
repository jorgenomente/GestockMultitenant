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
/* Icons */
import {
  ChevronsDown,
  CalendarDays,
  Truck,
  Check,
  Loader2,
  AlertCircle,
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

/* =================== Constantes =================== */
const CACHE_KEY_PREFIX = "gestock:proveedores_cache:v5";
const TABLE_PROVIDERS = "providers";
const TABLE_SUMMARIES = "order_summaries";
const TABLE_SUMMARIES_WEEK = "order_summaries_week";

/* === Presupuesto (propio) === */
const TABLE_WEEKS = "budget_weeks";
const TABLE_OVERRIDES = "budget_overrides";

/* === Semana + inclusión (desde Proveedores) === */
const TABLE_PW_WEEKS = "provider_weeks";               // semanas “fuente”
const TABLE_PW_INCLUDED = "provider_week_providers";   // inclusión por semana
const WEEK_CACHE_KEY_PREFIX = "gestock:proveedores:selected_week"; // pista local (no bloqueante)

const BUDGET_KEY_ROOT = "budget_cap";
const budgetKeyForScope = (
  tenantId?: string | null,
  branchId?: string | null,
  weekId?: string | null,
) => {
  const tid = tenantId?.trim() || "-";
  const bid = branchId?.trim() || "-";
  const wid = weekId?.trim() || "global";
  return `${BUDGET_KEY_ROOT}:${tid}:${bid}:${wid}`;
};

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
type WeekMeta = { weekStart: string; weekEnd: string };

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

  /* Fila de semana de trabajo (para persistir overrides si hace falta) — fija al cargar */
  const [weekRow, setWeekRow] = React.useState<WeekRow | null>(null);

  /* Presupuesto */
  const [budget, setBudget] = React.useState<number>(0);
  const [budgetInput, setBudgetInput] = React.useState<string>("0");
  const [persistedBudget, setPersistedBudget] = React.useState<number>(0);

  /* Datos y overrides */
  const [data, setData] = React.useState<BudgetProvider[]>([]);
  const [overrides, setOverrides] = React.useState<Overrides>({});

  const [budgetSaveState, setBudgetSaveState] = React.useState<"idle" | "saving" | "saved" | "error">("idle");

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
  const budgetKey = React.useMemo(
    () => budgetKeyForScope(tenantId, branchId, activeWeekId),
    [tenantId, branchId, activeWeekId]
  );

  React.useEffect(() => {
    setWeekOptions([]);
    setWeekRow(null);
    setBudget(0);
    setBudgetInput("0");
    setPersistedBudget(0);
    setBudgetSaveState("idle");
    setData([]);
    setOverrides({});
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
    if (!tenantId || !branchId) return;

    if (!activeWeekId) {
      // Vista global (sin semana seleccionada) — recupera presupuesto general si existe.
      setBudget(0);
      setBudgetInput("0");
      setPersistedBudget(0);
      setWeekRow(null);
      setBudgetSaveState("idle");
      try {
        const { data, error } = await supabase
          .from("app_settings")
          .select("value")
          .eq("tenant_id", tenantId)
          .eq("branch_id", branchId)
          .eq("key", budgetKey)
          .maybeSingle();
        if (!alive) return;
        if (error && error.code !== "PGRST116") throw error;
        const stored = data?.value != null ? Number(data.value) : null;
        if (stored != null && Number.isFinite(stored)) {
          setBudget(stored);
          setBudgetInput(stored ? stored.toLocaleString("es-AR") : "0");
          setPersistedBudget(stored);
          setWeekRow((prev) => (prev ? { ...prev, budget_cap: stored } : prev));
        }
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        console.warn("[presupuesto] budget load (global):", message);
      }
      return;
    }

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


    let row: WeekRow | null = null;
    try {
      row = await ensureWeekRow(meta);
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      console.warn("[presupuesto] ensureWeekRow (active):", message);
      row = null;
    }

    if (!alive) return;

    setWeekRow(row);
    let resolvedBudget = row?.budget_cap || 0;

    try {
      const { data: settingsRow, error: settingsErr } = await supabase
        .from("app_settings")
        .select("value")
        .eq("tenant_id", tenantId)
        .eq("branch_id", branchId)
        .eq("key", budgetKey)
        .maybeSingle();
      if (settingsErr && settingsErr.code !== "PGRST116") throw settingsErr;
      if (settingsRow?.value != null) {
        const parsed = Number(settingsRow.value);
        if (Number.isFinite(parsed)) resolvedBudget = parsed;
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      console.warn("[presupuesto] budget load (week):", message);
    }

    if (!alive) return;
    setBudget(resolvedBudget);
    setBudgetInput(resolvedBudget ? resolvedBudget.toLocaleString("es-AR") : "0");
    setPersistedBudget(resolvedBudget);
    if (row && resolvedBudget !== row.budget_cap) {
      setWeekRow({ ...row, budget_cap: resolvedBudget });
    }
    setBudgetSaveState("idle");
  })();
  return () => { alive = false; };
}, [activeWeekId, supabase, tenantId, branchId, ensureWeekRow, budgetKey]);

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

  function setOverrideAmount(id: string, value: number) {
    setOverrides((prev) => ({ ...prev, [id]: { enabled: prev[id]?.enabled ?? false, amount: value } }));
  }
  function toggleOverride(id: string, enabled: boolean) {
    setOverrides((prev) => {
      const cur = prev[id] ?? { enabled: false, amount: 0 };
      const nextOv = { ...cur, enabled };
      if (weekRow) upsertOverride(weekRow.id, id, nextOv).catch(console.error);
      return { ...prev, [id]: nextOv };
    });
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
    if (budgetSaveState !== "idle") setBudgetSaveState("idle");
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
    if (!tenantId || !branchId) return;
    if (n === persistedBudget && budgetSaveState === "idle") return;

    setBudgetSaveState("saving");
    const updatedAt = new Date().toISOString();

    if (weekRow) {
      try {
        const { error } = await supabase
          .from(TABLE_WEEKS)
          .update({ budget_cap: n, updated_at: updatedAt })
          .eq("id", weekRow.id)
          .eq("tenant_id", tenantId)
          .eq("branch_id", branchId);
        if (error && error.code !== "PGRST116") {
          console.warn("[presupuesto] budget save (weeks):", error.message);
        } else if (!error) {
          setWeekRow((prev) => (prev ? { ...prev, budget_cap: n, updated_at: updatedAt } : prev));
        }
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        console.warn("[presupuesto] budget save (weeks):", message);
      }
    }

    let settingsOk = false;
    try {
      const { error: settingsError } = await supabase
        .from("app_settings")
        .upsert({
          key: budgetKey,
          tenant_id: tenantId,
          branch_id: branchId,
          value: String(n),
        }, { onConflict: "key" })
        .select("updated_at")
        .maybeSingle();
      if (settingsError && settingsError.code !== "PGRST116") {
        console.warn("[presupuesto] budget save (settings):", settingsError.message);
      } else {
        settingsOk = true;
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      console.warn("[presupuesto] budget save (settings):", message);
    }

    if (settingsOk) {
      setPersistedBudget(n);
      setBudgetSaveState("saved");
      setTimeout(() => setBudgetSaveState("idle"), 1800);
    } else {
      setBudgetSaveState("error");
      setTimeout(() => setBudgetSaveState("idle"), 3000);
    }
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

          <div className="flex items-center gap-3">
          <div
            className="flex items-center gap-2 rounded-xl border px-2 py-1"
            style={{
              backgroundColor: "var(--input-background)",
              borderColor: "var(--border)",
            }}
          >
            <Input
              aria-label="Presupuesto semanal"
              inputMode="numeric"
                enterKeyHint="done"
                pattern="[0-9]*"
                className="h-10 font-mono text-lg border-0 shadow-none focus-visible:ring-0 p-0 bg-transparent"
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
              <Button
                size="icon"
                className="h-8 w-8 rounded-full transition-colors"
                aria-label="Guardar presupuesto"
                title={budgetSaveState === "saved" ? "Presupuesto guardado" : budgetSaveState === "error" ? "Hubo un problema al guardar" : "Guardar presupuesto"}
                disabled={budgetSaveState === "saving"}
                style={{
                  backgroundColor:
                    budgetSaveState === "saved"
                      ? "var(--color-success)"
                      : budgetSaveState === "error"
                      ? "var(--color-alert)"
                      : "var(--color-primary)",
                  color: "var(--primary-foreground)",
                  opacity: budgetSaveState === "saved" ? 0.85 : 1,
                }}
                onClick={() => {
                  handleBudgetSave().catch((err) => {
                    const message = err instanceof Error ? err.message : String(err);
                    console.warn("[presupuesto] budget save (click):", message);
                  });
                }}
              >
                {budgetSaveState === "saving" ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : budgetSaveState === "error" ? (
                  <AlertCircle className="h-4 w-4" />
                ) : (
                  <Check className="h-4 w-4" />
                )}
              </Button>
            </div>

            <span className="text-indigo-600 font-semibold">Presupuesto</span>
          </div>
        </div>

        {/* Barra segmentada por frecuencia */}
        <div
          className="w-full h-4 rounded-full overflow-hidden"
          style={{
            backgroundColor: "var(--muted)",
            boxShadow: "inset 0 0 0 1px var(--border)",
          }}
        >
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
        className="rounded-full px-2 py-0.5 text-xs tabular-nums"
        style={{
          backgroundColor: "var(--muted)",
          color: "var(--muted-foreground)",
          borderColor: "var(--border)",
        }}
        aria-label={`Cantidad de proveedores ${FREQ_LABEL[freq].toLowerCase()}`}
        title={`Proveedores ${FREQ_LABEL[freq].toLowerCase()}: ${items.length}`}
      >
        {items.length}
      </Badge>
                    <Badge
                      className={`rounded-full px-3 py-1 text-sm ${FREQ_BADGE[freq]}`}
                      style={{ backgroundColor: "var(--accent)", color: "var(--accent-foreground)" }}
                    >
                      {fmtARS(total)}
                    </Badge>
                    <div
                      className="h-9 w-9 grid place-items-center rounded-full border"
                      style={{ borderColor: "var(--border)", color: "var(--muted-foreground)" }}
                    >
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
        <Card>
          <CardContent className="px-4 py-4 grid grid-cols-[1fr_auto] items-center gap-x-3 min-w-0">
            <span
              className="font-semibold leading-tight text-sm sm:text-base"
              style={{ color: diferencia >= 0 ? "var(--color-success)" : "var(--color-alert)" }}
            >
              Diferencia
            </span>
            <span
              className="tabular-nums whitespace-nowrap text-right font-semibold text-[15px] sm:text-base justify-self-end"
              style={{ color: diferencia >= 0 ? "var(--color-success)" : "var(--color-alert)" }}
            >
              {fmtARS(diferencia)}
            </span>
          </CardContent>
        </Card>
      </section>
    </div>
  );
}
