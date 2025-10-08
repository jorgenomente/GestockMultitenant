"use client";

import React from "react";
import { v4 as uuid } from "uuid";
import { z } from "zod";
import { useRouter } from "next/navigation";
import { getSupabaseBrowserClient } from "@/lib/supabaseClient";

/* UI */
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription, DialogTrigger,
} from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Accordion, AccordionItem, AccordionTrigger, AccordionContent } from "@/components/ui/accordion";

/* Icons */
import {
  Plus, Trash2, Pencil, CalendarDays, Truck, UserRound, CheckCircle2, Clock3,
  Banknote, Landmark, History as HistoryIcon
} from "lucide-react";

/* =================== Props =================== */
type Props = { slug: string; branch: string; tenantId: string; branchId: string };

/* =================== Tipos y tablas (NIVEL MÓDULO) =================== */
type DayIdx = 0|1|2|3|4|5|6;
type Freq = "SEMANAL" | "QUINCENAL" | "MENSUAL";
type Status = "PENDIENTE" | "REALIZADO";
type PaymentMethod = "EFECTIVO" | "TRANSFERENCIA";
type ViewTab = "TODOS" | "PENDIENTES" | Freq;

export type Provider = {
  id: string;
  name: string;
  freq: Freq;
  order_day: DayIdx | number | null;
  receive_day: DayIdx | number | null;
  responsible: string;
  status: Status;
  payment_method?: PaymentMethod | null;
  created_at?: string;
  updated_at?: string;
  tenant_id?: string | null;
  branch_id?: string | null;
};

type OrderSummary = {
  provider_id: string;
  total: number | null;
  items: number | null;
  updated_at: string | null;
};

type WeekRow = {
  id: string;
  week_start: string;        // YYYY-MM-DD
  label?: string | null;
  created_at?: string | null;
};

type WeekProviderRow = {
  id: string;
  week_id: string;
  provider_id: string;
  added_at: string | null;
};

type WeekStateRow = {
  id: string;
  week_id: string;
  provider_id: string;
  status: Status;
  updated_at: string | null;
};

type WeekSummaryRow = {
  id: string;
  week_id: string;
  provider_id: string;
  total: number | null;
  items: number | null;
  updated_at: string | null;
};

/** Payload genérico para realtime (evitamos imports del SDK para tipos) */
type PgPayload<T> = {
  eventType: "INSERT" | "UPDATE" | "DELETE";
  new: T | null;
  old: T | null;
};

/* =================== Constantes =================== */
const TABLE = "providers";
const ORDER_SUM_TABLE = "order_summaries";
const WEEK_STATES_TABLE = "provider_week_states";
const WEEK_SUM_TABLE = "order_summaries_week";
const WEEKS_TABLE = "provider_weeks";
const WEEK_PROVIDERS_TABLE = "provider_week_providers";

const DEFAULT_RESPONSIBLE = "General";
const PENDING_PREFIX = "tmp_";
const CACHE_KEY_PREFIX = "gestock:proveedores_cache:v5";
const WEEK_CACHE_KEY_PREFIX = "gestock:proveedores:selected_week";

const DAYS = ["Domingo","Lunes","Martes","Miércoles","Jueves","Viernes","Sábado"] as const;
const DAY_LABELS_EXT: Record<number, string> = {
  0: DAYS[0], 1: DAYS[1], 2: DAYS[2], 3: DAYS[3], 4: DAYS[4], 5: DAYS[5], 6: DAYS[6],
  [-1]: "Sin día",
};

/* =================== Utils =================== */
function fmtMoney(n: number | null | undefined) {
  const val = typeof n === "number" ? n : 0;
  try {
    return new Intl.NumberFormat("es-AR", {
      style: "currency", currency: "ARS", maximumFractionDigits: 0,
    }).format(val);
  } catch {
    return `$ ${Math.round(val).toLocaleString("es-AR")}`;
  }
}
const byName = (a: Provider, b: Provider) =>
  a.name.localeCompare(b.name, "es", { sensitivity: "base" });

function saveCache(key: string, list: Provider[]) {
  if (typeof window === "undefined") return;
  localStorage.setItem(key, JSON.stringify(list));
}
function loadCache(key: string): Provider[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as Provider[]).sort(byName) : [];
  } catch {
    return [];
  }
}
function saveSelectedWeek(key: string, id: string) {
  if (typeof window === "undefined") return;
  localStorage.setItem(key, id);
}
function loadSelectedWeek(key: string): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(key);
}
function normalizeDay(d: unknown) {
  const n = Number(d);
  return Number.isFinite(n) && n >= 0 && n <= 6 ? n : -1;
}
function normalizePayment(v: unknown): PaymentMethod {
  return v === "TRANSFERENCIA" ? "TRANSFERENCIA" : "EFECTIVO";
}
function toYMDLocal(d: Date) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${dd}`;
}
function fromYMDLocal(ymd: string) {
  const [y, m, d] = ymd.split("-").map(Number);
  return new Date((y ?? 1970), (m ?? 1) - 1, (d ?? 1));
}
function startOfWeekMondayLocal(date = new Date()) {
  const d = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const dow = d.getDay();
  const diff = (dow === 0 ? -6 : 1 - dow);
  d.setDate(d.getDate() + diff);
  d.setHours(0, 0, 0, 0);
  return d;
}
function addDaysLocal(base: Date, days: number) {
  const d = new Date(base);
  d.setDate(d.getDate() + days);
  return d;
}
function formatRange(weekStartYMD: string) {
  const s = fromYMDLocal(weekStartYMD);
  const e = addDaysLocal(s, 6);
  const fmt = (dt: Date) => dt.toLocaleDateString("es-AR", { day: "2-digit", month: "2-digit" });
  return `Semana del ${fmt(s)} al ${fmt(e)}`;
}
function toMondayYMD(ymd: string) {
  const s = fromYMDLocal(ymd);
  return toYMDLocal(startOfWeekMondayLocal(s));
}

/* =================== COMPONENTE =================== */
export default function ProvidersPageClient({ slug, branch, tenantId, branchId }: Props) {
  const supabase = React.useMemo(() => getSupabaseBrowserClient(), []);
  const router = useRouter();

  const cacheKey = React.useMemo(
    () => `${CACHE_KEY_PREFIX}:${tenantId ?? "-"}:${branchId ?? "-"}`,
    [tenantId, branchId]
  );
  const weekCacheKey = React.useMemo(
    () => `${WEEK_CACHE_KEY_PREFIX}:${tenantId ?? "-"}:${branchId ?? "-"}`,
    [tenantId, branchId]
  );

  const [providers, setProviders] = React.useState<Provider[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [query, setQuery] = React.useState("");
  const [tab, setTab] = React.useState<ViewTab>("TODOS");

  const [, setSummaries] = React.useState<Record<string, OrderSummary>>({});

  const [weeks, setWeeks] = React.useState<WeekRow[]>([]);
  const [selectedWeek, setSelectedWeek] = React.useState<WeekRow | null>(null);
  const [weekProviders, setWeekProviders] = React.useState<Set<string>>(new Set());
  const [lastAddedByProvider, setLastAddedByProvider] = React.useState<Record<string, string | null>>({});

  const [weekStates, setWeekStates] = React.useState<Record<string, Status>>({});
  const [weekSummaries, setWeekSummaries] =
    React.useState<Record<string, { total: number|null; items: number|null; updated_at: string|null }>>({});

  const statusFor = React.useCallback((provId: string): Status => (weekStates[provId] ?? "PENDIENTE"), [weekStates]);

  const [createOpen, setCreateOpen] = React.useState(false);
  const [name, setName] = React.useState("");
  const [freq, setFreq] = React.useState<Freq>("QUINCENAL");
  const [orderDay, setOrderDay] = React.useState<DayIdx>(1);
  const [receiveDay, setReceiveDay] = React.useState<DayIdx>(3);
  const [responsible, setResponsible] = React.useState<string>(DEFAULT_RESPONSIBLE);
  const [status, setStatus] = React.useState<Status>("PENDIENTE");
  const [paymentMethod, setPaymentMethod] = React.useState<PaymentMethod>("EFECTIVO");

  const [editOpen, setEditOpen] = React.useState(false);
  const [editing, setEditing] = React.useState<Provider | null>(null);

  const [confirmDelete, setConfirmDelete] =
    React.useState<{ open: boolean; id?: string; name?: string; }>({ open: false });

  const [confirmNewWeek, setConfirmNewWeek] = React.useState(false);
  const [newWeekDate, setNewWeekDate] = React.useState<string>(() => {
    const thisMonday = startOfWeekMondayLocal(new Date());
    const nextMonday = addDaysLocal(thisMonday, 7);
    return toYMDLocal(nextMonday);
  });

  /* ===== Realtime week summaries ===== */
  React.useEffect(() => {
    if (!selectedWeek) return;

    const ch = supabase
      .channel(`week-summaries-${selectedWeek.id}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: WEEK_SUM_TABLE, filter: `week_id=eq.${selectedWeek.id}` },
        (payload: PgPayload<WeekSummaryRow>) => {
          setWeekSummaries((prev) => {
            const next = { ...prev };
            const row = payload.new ?? payload.old;

            if (payload.eventType === "DELETE") {
              if (row?.provider_id) delete next[row.provider_id];
              return next;
            }

            if ((payload.eventType === "INSERT" || payload.eventType === "UPDATE") && row?.provider_id) {
              next[row.provider_id] = {
                total: row.total ?? 0,
                items: row.items ?? 0,
                updated_at: row.updated_at ?? null,
              };
              return next;
            }
            return prev;
          });
        }
      )
      .subscribe();

    return () => { supabase.removeChannel(ch); };
  }, [selectedWeek, supabase, tenantId, branchId]);

  /* ===== Carga inicial ===== */
  React.useEffect(() => {
    if (!tenantId || !branchId) {
      setProviders([]);
      setWeeks([]);
      setSelectedWeek(null);
      setLoading(false);
      return;
    }
    let mounted = true;
    (async () => {
      const cached = loadCache(cacheKey);
      if (mounted && cached.length) setProviders(cached);

      // 1) providers
      let provQuery = supabase
        .from(TABLE)
        .select("*")
        .eq("tenant_id", tenantId)
        .eq("branch_id", branchId)
        .order("order_day", { ascending: true })
        .order("name", { ascending: true });

      const { data: provData, error: provError } = await provQuery;

      if (!mounted) return;
      if (provError) {
        console.error("fetch providers error:", provError);
        setLoading(false);
        return;
      }

      const remoteRaw = (provData as Provider[]) ?? [];
      const remote = remoteRaw.map(p => ({ ...p, payment_method: normalizePayment(p.payment_method) }));
      const pendings = cached.filter((p) => p.id?.startsWith(PENDING_PREFIX));
      const final = [...remote, ...pendings].sort(byName);
      setProviders(final);
      saveCache(cacheKey, final);

      // 2) weeks
      const { data: wkData, error: wkErr } = await supabase
        .from(WEEKS_TABLE)
        .select("*")
        .eq("tenant_id", tenantId)
        .eq("branch_id", branchId)
        .order("week_start", { ascending: false });
      if (wkErr) console.error("fetch weeks error:", wkErr);
      const allWeeks = (wkData as WeekRow[] | null) ?? [];

      let selected: WeekRow | null = null;
      if (allWeeks.length === 0) {
        const ws = toYMDLocal(startOfWeekMondayLocal(new Date()));
        const { data: created, error: cErr } = await supabase
          .from(WEEKS_TABLE)
          .insert([{ week_start: ws, label: null, tenant_id: tenantId, branch_id: branchId }])
          .select("*")
          .single();
        if (!cErr && created) {
          selected = created as WeekRow;
          allWeeks.unshift(selected);
        }
      } else {
        const fromLS = loadSelectedWeek(weekCacheKey);
        selected = allWeeks.find(w => w.id === fromLS) ?? allWeeks[0];
      }

      setWeeks(allWeeks);
      if (selected) {
        setSelectedWeek(selected);
        saveSelectedWeek(weekCacheKey, selected.id);
      }

      // 3) summaries
      const { data: sumData, error: sumError } = await supabase
        .from(ORDER_SUM_TABLE)
        .select("provider_id,total,items,updated_at");
      if (sumError) console.error("fetch order summaries error:", sumError);
      const map: Record<string, OrderSummary> = {};
      (sumData as OrderSummary[] | null)?.forEach((row) => {
        if (!row?.provider_id) return;
        map[row.provider_id] = row;
      });
      if (mounted) setSummaries(map);

      setLoading(false);
    })();
    return () => { mounted = false; };
  }, [supabase, tenantId, branchId, cacheKey, weekCacheKey]);

  /* ===== Datos derivados por semana ===== */
  React.useEffect(() => {
    if (!selectedWeek) return;

    (async () => {
      // Incluidos en la semana
      const { data: wps, error } = await supabase
        .from(WEEK_PROVIDERS_TABLE)
        .select("*")
        .eq("week_id", selectedWeek.id)
        .eq("tenant_id", tenantId)
        .eq("branch_id", branchId);

      if (error) {
        console.error("fetch week providers error:", error);
        setWeekProviders(new Set());
      } else {
        const set = new Set<string>((wps as WeekProviderRow[]).map(r => r.provider_id));
        setWeekProviders(set);
      }

      // Última vez agregado
      const { data: lastRows, error: lastErr } = await supabase
        .from(WEEK_PROVIDERS_TABLE)
        .select("provider_id, added_at")
        .eq("tenant_id", tenantId)
        .eq("branch_id", branchId)
        .order("added_at", { ascending: false });

      if (lastErr) {
        console.error("fetch last-added error:", lastErr);
        setLastAddedByProvider({});
      } else {
        const m: Record<string, string | null> = {};
        (lastRows as WeekProviderRow[]).forEach(r => {
          if (!m[r.provider_id]) m[r.provider_id] = r.added_at;
        });
        setLastAddedByProvider(m);
      }
    })();
  }, [selectedWeek, supabase, tenantId, branchId]);

  /* ===== Estado y resúmenes por semana ===== */
  React.useEffect(() => {
    if (!selectedWeek) {
      setWeekStates({});
      setWeekSummaries({});
      return;
    }
    let cancelled = false;

    (async () => {
      // estados
      const { data: stRows, error: stErr } = await supabase
        .from(WEEK_STATES_TABLE)
        .select("provider_id,status")
        .eq("week_id", selectedWeek.id)
        .eq("tenant_id", tenantId)
        .eq("branch_id", branchId);

      if (!cancelled) {
        if (stErr) {
          console.error("fetch week states error:", stErr);
          setWeekStates({});
        } else {
          const map: Record<string, Status> = {};
          (stRows as WeekStateRow[] | null)?.forEach(r => {
            if (r?.provider_id) map[r.provider_id] = r.status;
          });
          setWeekStates(map);
        }
      }

      // resúmenes
      const { data: sumRows, error: sumErr } = await supabase
        .from(WEEK_SUM_TABLE)
        .select("provider_id,total,items,updated_at")
        .eq("week_id", selectedWeek.id)
        .eq("tenant_id", tenantId)
        .eq("branch_id", branchId);

      if (!cancelled) {
        if (sumErr) {
          console.error("fetch week summaries error:", sumErr);
          setWeekSummaries({});
        } else {
          const m: Record<string, { total:number|null; items:number|null; updated_at:string|null }> = {};
          (sumRows as WeekSummaryRow[] | null)?.forEach(r => {
            if (!r?.provider_id) return;
            m[r.provider_id] = { total: r.total ?? 0, items: r.items ?? 0, updated_at: r.updated_at ?? null };
          });
          setWeekSummaries(m);
        }
      }
    })();

    return () => { cancelled = true; };
  }, [selectedWeek, supabase, tenantId, branchId]);

  /* ===== Realtime (providers) ===== */
  React.useEffect(() => {
    if (!branchId || !tenantId) return;

    const filter = `branch_id=eq.${branchId}`;
    const channel = supabase
      .channel(`providers-${tenantId}-${branchId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: TABLE, filter },
        (payload: PgPayload<Provider>) => {
          const { eventType, new: newRow, old: oldRow } = payload;

          const matchesContext = (row: Provider | null) => {
            if (!row) return false;
            const sameTenant = !row.tenant_id || row.tenant_id === tenantId;
            const sameBranch = !row.branch_id || row.branch_id === branchId;
            return sameTenant && sameBranch;
          };

          setProviders((prev) => {
            if (eventType === "DELETE") {
              const row = (oldRow as Provider) ?? null;
              if (!row) return prev;
              if (!matchesContext(row)) return prev;
              const next = prev.filter((p) => p.id !== row.id).sort(byName);
              saveCache(cacheKey, next);
              return next;
            }
            if (eventType === "INSERT") {
              const row = (newRow as Provider) ?? null;
              if (!row) return prev;
              if (!matchesContext(row)) return prev;
              const incoming: Provider = {
                ...row,
                payment_method: normalizePayment(row.payment_method),
              };
              const withoutTmp = prev.filter((p) => !p.id.startsWith(PENDING_PREFIX));
              const exists = withoutTmp.some((p) => p.id === incoming.id);
              const next = exists
                ? withoutTmp.map((p) => (p.id === incoming.id ? incoming : p))
                : [...withoutTmp, incoming];
              const sorted = next.sort(byName);
              saveCache(cacheKey, sorted);
              return sorted;
            }
            if (eventType === "UPDATE") {
              const row = (newRow as Provider) ?? null;
              if (!row) return prev;
              if (!matchesContext(row)) return prev;
              const incoming: Provider = {
                ...row,
                payment_method: normalizePayment(row.payment_method),
              };
              const next = prev.map((p) => (p.id === incoming.id ? incoming : p)).sort(byName);
              saveCache(cacheKey, next);
              return next;
            }
            return prev;
          });
        }
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [supabase, tenantId, branchId, cacheKey]);

  /* ===== Realtime (order_summaries) ===== */
  React.useEffect(() => {
    const channel = supabase
      .channel("order-summaries-realtime")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: ORDER_SUM_TABLE },
        (payload: PgPayload<OrderSummary>) => {
          const { eventType, new: newRow, old: oldRow } = payload;
          setSummaries((prev) => {
            const next = { ...prev };
            if (eventType === "DELETE") {
              if (oldRow?.provider_id) delete next[oldRow.provider_id];
              return next;
            }
            if ((eventType === "INSERT" || eventType === "UPDATE") && newRow?.provider_id) {
              next[newRow.provider_id] = {
                provider_id: newRow.provider_id,
                total: newRow.total ?? 0,
                items: newRow.items ?? 0,
                updated_at: newRow.updated_at ?? null,
              };
              return next;
            }
            return prev;
          });
        }
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [supabase]);

  /* ===== Derivados ===== */
  const visibleProviders = React.useMemo(() => {
    return providers.filter(p => (p.freq === "SEMANAL") || weekProviders.has(p.id));
  }, [providers, weekProviders]);

  const filtered = React.useMemo(() => {
    const q = query.trim().toLowerCase();
    let base = visibleProviders;
    if (tab === "PENDIENTES") {
      base = base.filter((p) => statusFor(p.id) === "PENDIENTE");
    } else if (tab === "SEMANAL" || tab === "QUINCENAL" || tab === "MENSUAL") {
      base = base.filter((p) => p.freq === tab);
    }
    const byQ = q
      ? base.filter((p) =>
          p.name.toLowerCase().includes(q) ||
          p.responsible.toLowerCase().includes(q)
        )
      : base;
    return byQ.sort(byName);
  }, [visibleProviders, tab, query, statusFor]);

  const groupedByDay = React.useMemo(() => {
    const map = new Map<number, Provider[]>();
    for (let i = 0; i <= 6; i++) map.set(i, []);
    map.set(-1, []);
    for (const p of filtered) {
      const key = normalizeDay(p.order_day);
      const bucket = map.get(key);
      if (bucket) bucket.push(p);
      else map.set(key, [p]);
    }
    for (const k of map.keys()) map.get(k)!.sort(byName);
    return map;
  }, [filtered]);

  const totalProviders = visibleProviders.length;
  const todayIdx = new Date().getDay();

  function resetCreateForm() {
    setName("");
    setFreq("QUINCENAL");
    setOrderDay(1);
    setReceiveDay(3);
    setResponsible(DEFAULT_RESPONSIBLE);
    setStatus("PENDIENTE");
    setPaymentMethod("EFECTIVO");
  }

  const providerSchema = z.object({
    name: z.string().min(2, "Nombre demasiado corto"),
    freq: z.enum(["SEMANAL", "QUINCENAL", "MENSUAL"]),
    order_day: z.coerce.number().int().min(0).max(6),
    receive_day: z.coerce.number().int().min(0).max(6),
    responsible: z.string().min(1, "Responsable requerido"),
    status: z.enum(["PENDIENTE", "REALIZADO"]),
    payment_method: z.enum(["EFECTIVO", "TRANSFERENCIA"]),
  });

  async function addProvider() {
    const parsed = providerSchema.safeParse({
      name,
      freq,
      order_day: orderDay,
      receive_day: receiveDay,
      responsible,
      status,
      payment_method: paymentMethod,
    });
    if (!parsed.success) {
      alert(parsed.error.issues.map((i) => i.message).join("\n"));
      return;
    }

    const activeWeek = selectedWeek;

    const temp: Provider = {
      id: `${PENDING_PREFIX}${uuid()}`,
      name: name.trim(),
      freq,
      order_day: orderDay,
      receive_day: receiveDay,
      responsible: responsible.trim(),
      status,
      payment_method: paymentMethod,
    };

    const optimisticAddedAt = new Date().toISOString();
    const optimistic = [...providers, temp].sort(byName);

    setProviders(optimistic);
    saveCache(cacheKey, optimistic);
    setCreateOpen(false);
    resetCreateForm();

    if (activeWeek) {
      setWeekProviders((prev) => {
        if (prev.has(temp.id)) return prev;
        const next = new Set(prev);
        next.add(temp.id);
        return next;
      });
      setLastAddedByProvider((prev) => ({ ...prev, [temp.id]: optimisticAddedAt }));
    }

    const { data, error } = await supabase
      .from(TABLE)
      .insert([{
        name: temp.name,
        freq: temp.freq,
        order_day: temp.order_day,
        receive_day: temp.receive_day,
        responsible: temp.responsible,
        status: temp.status,
        payment_method: temp.payment_method,
        tenant_id: tenantId,
        branch_id: branchId,
      }])
      .select("*")
      .single();

    if (error) {
      console.error("Insert error:", error);
      const code = (error as { code?: string; message?: string })?.code;
      const duplicate = code === "23505";
      const alertMsg = duplicate
        ? "Ya existe un proveedor con ese nombre. Cambiá el nombre o reutilizá el existente."
        : "No se pudo guardar en la nube. Reintentá.\n" + (error.message ?? "");
      alert(alertMsg);

      setProviders((prev) => {
        const reverted = prev.filter((p) => p.id !== temp.id).sort(byName);
        saveCache(cacheKey, reverted);
        return reverted;
      });

      if (activeWeek) {
        setWeekProviders((prev) => {
          if (!prev.has(temp.id)) return prev;
          const next = new Set(prev);
          next.delete(temp.id);
          return next;
        });
        setLastAddedByProvider((prev) => {
          if (!prev[temp.id]) return prev;
          const next = { ...prev };
          delete next[temp.id];
          return next;
        });
      }
      return;
    }

    const inserted = data as Provider;
    const real: Provider = { ...inserted, payment_method: normalizePayment(inserted.payment_method) };

    setProviders((prev) => {
      const withoutTemp = prev.filter((p) => p.id !== temp.id);
      const withoutDup = withoutTemp.filter((p) => p.id !== real.id);
      const merged = [...withoutDup, real].sort(byName);
      saveCache(cacheKey, merged);
      return merged;
    });

    if (activeWeek) {
      const addedAt = new Date().toISOString();
      setWeekProviders((prev) => {
        const next = new Set(prev);
        next.delete(temp.id);
        next.add(real.id);
        return next;
      });
      setLastAddedByProvider((prev) => {
        const next = { ...prev };
        delete next[temp.id];
        next[real.id] = addedAt;
        return next;
      });

      const { error: linkError } = await supabase
        .from(WEEK_PROVIDERS_TABLE)
        .upsert(
          [
            {
              week_id: activeWeek.id,
              provider_id: real.id,
              tenant_id: tenantId,
              branch_id: branchId,
            },
          ],
          { onConflict: "week_id,provider_id" },
        );

      if (linkError) {
        if (linkError.code === "23505") {
          return;
        }
        console.error("Link provider to week error:", linkError);
        alert(
          'El proveedor se creó pero no se pudo sumar a la semana actual. Podés agregarlo manualmente desde "Agregar".\n' +
            (linkError.message ?? ""),
        );
        setWeekProviders((prev) => {
          const next = new Set(prev);
          next.delete(real.id);
          return next;
        });
        setLastAddedByProvider((prev) => {
          const next = { ...prev };
          delete next[real.id];
          return next;
        });
      }
    }
  }


  async function removeProvider(id: string) {
    if (id.startsWith(PENDING_PREFIX)) {
      const next = providers.filter((p) => p.id !== id).sort(byName);
      setProviders(next);
      saveCache(cacheKey, next);
      return;
    }

    const prev = providers;
    const next = prev.filter((p) => p.id !== id).sort(byName);
    setProviders(next);
    saveCache(cacheKey, next);

    const { error } = await supabase.from(TABLE).delete().eq("id", id);
    if (error) {
      console.error("Delete error:", error);
      alert("No se pudo borrar en la nube. Reintentá.\n" + (error.message ?? ""));
      setProviders(prev);
      saveCache(cacheKey, prev);
    }
  }

  function openEdit(p: Provider) {
    setEditing(p);
    setEditOpen(true);
  }

  async function saveEdit() {
    if (!editing) return;

    const editingNorm: Provider = {
      ...editing,
      payment_method: normalizePayment(editing.payment_method),
      name: editing.name ?? "",
      responsible: editing.responsible ?? "",
    };

    if (editingNorm.id.startsWith(PENDING_PREFIX)) {
      const next = providers.map((it) => (it.id === editingNorm.id ? editingNorm : it)).sort(byName);
      setProviders(next);
      saveCache(cacheKey, next);
      setEditOpen(false);
      return;
    }

    const parsed = providerSchema.safeParse({
      name: editingNorm.name,
      freq: editingNorm.freq,
      order_day: editingNorm.order_day,
      receive_day: editingNorm.receive_day,
      responsible: editingNorm.responsible,
      status: editingNorm.status,
      payment_method: editingNorm.payment_method,
    });
    if (!parsed.success) {
      alert(parsed.error.issues.map((i) => i.message).join("\n"));
      return;
    }

    const prev = providers;
    const next = prev.map((it) => (it.id === editingNorm.id ? editingNorm : it)).sort(byName);
    setProviders(next);
    saveCache(cacheKey, next);
    setEditOpen(false);

    const { error } = await supabase
      .from(TABLE)
      .update({
        name: editingNorm.name.trim(),
        freq: editingNorm.freq,
        order_day: editingNorm.order_day,
        receive_day: editingNorm.receive_day,
        responsible: editingNorm.responsible.trim(),
        status: editingNorm.status,
        payment_method: editingNorm.payment_method,
      })
      .eq("id", editingNorm.id);

    if (error) {
      console.error("Update error:", error);
      alert("No se pudo actualizar en la nube. Reintentá.\n" + (error.message ?? ""));
      setProviders(prev);
      saveCache(cacheKey, prev);
    }
  }

  async function toggleStatus(p: Provider) {
    if (!selectedWeek) {
      alert("Seleccioná una semana primero.");
      return;
    }
    const prev = weekStates[p.id] ?? "PENDIENTE";
    const next: Status = prev === "PENDIENTE" ? "REALIZADO" : "PENDIENTE";

    setWeekStates(s => ({ ...s, [p.id]: next }));

    const { error } = await supabase
      .from(WEEK_STATES_TABLE)
      .upsert({
        week_id: selectedWeek.id,
        provider_id: p.id,
        status: next,
        updated_at: new Date().toISOString(),
        tenant_id: tenantId,
        branch_id: branchId,
      }, { onConflict: "week_id,provider_id" });

    if (error) {
      console.error("Update week state error:", error);
      alert("No se pudo cambiar el estado en la nube. Reintentá.\n" + (error.message ?? ""));
      setWeekStates(s => ({ ...s, [p.id]: prev }));
    }
  }

  async function createNewWeekAndReset() {
    if (!newWeekDate) return;
    const weekStart = toMondayYMD(newWeekDate);

    const { data: created, error } = await supabase
      .from(WEEKS_TABLE)
      .insert([{ week_start: weekStart, tenant_id: tenantId, branch_id: branchId }])
      .select("*")
      .single();

    if (error) {
      alert("No se pudo crear la semana.\n" + (error.message ?? ""));
      return;
    }

    const newW = created as WeekRow;
    const nextWeeks = [newW, ...weeks].sort((a,b) => (a.week_start > b.week_start ? -1 : 1));
    setWeeks(nextWeeks);
    setSelectedWeek(newW);
    saveSelectedWeek(weekCacheKey, newW.id);
    setConfirmNewWeek(false);

    setWeekStates({});
    setWeekSummaries({});
  }

  async function addProviderToCurrentWeek(providerId: string) {
    if (!selectedWeek) return;
    if (weekProviders.has(providerId)) return;

    const { error } = await supabase
      .from(WEEK_PROVIDERS_TABLE)
      .upsert([
        {
          week_id: selectedWeek.id,
          provider_id: providerId,
          tenant_id: tenantId,
          branch_id: branchId,
        },
      ], { onConflict: 'week_id,provider_id' });
    if (error) {
      if (error.code === '23505') {
        return;
      }
      alert("No se pudo agregar el proveedor a la semana.\n" + (error.message ?? ""));
      return;
    }
    const next = new Set(weekProviders);
    next.add(providerId);
    setWeekProviders(next);
    setLastAddedByProvider(prev => ({ ...prev, [providerId]: new Date().toISOString() }));
  }

  async function removeProviderFromCurrentWeek(providerId: string) {
    if (!selectedWeek) return;
    const { error } = await supabase
      .from(WEEK_PROVIDERS_TABLE)
      .delete()
      .eq("week_id", selectedWeek.id)
      .eq("provider_id", providerId);
    if (error) {
      alert("No se pudo quitar el proveedor de la semana.\n" + (error.message ?? ""));
      return;
    }
    const next = new Set(weekProviders);
    next.delete(providerId);
    setWeekProviders(next);
  }

  /* =================== Render =================== */
  const headerRange = selectedWeek ? formatRange(selectedWeek.week_start) : "Semana";

  return (
    <main className="mx-auto max-w-md px-4 pb-28 pt-4 sm:max-w-lg">
      {/* Header con semana */}
      <div className="mb-2 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold">Proveedores</h1>
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <HistoryIcon className="h-3.5 w-3.5" />
            <span>{headerRange}</span>
          </div>
        </div>

        {/* Selector de semana */}
        <Select
          value={selectedWeek?.id ?? ""}
          onValueChange={(id) => {
            const wk = weeks.find(w => w.id === id) || null;
            setSelectedWeek(wk);
            if (wk) saveSelectedWeek(weekCacheKey, wk.id);
          }}
        >
          <SelectTrigger className="h-8 w-[180px] rounded-xl text-xs">
            <SelectValue placeholder="Elegir semana" />
          </SelectTrigger>
          <SelectContent>
            {weeks.map(w => (
              <SelectItem key={w.id} value={w.id}>
                {formatRange(w.week_start)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Total visible */}
      <div className="mb-2 flex items-center justify-between">
        <Badge variant="secondary" className="rounded-md">Total: {totalProviders}</Badge>
      </div>

      {/* Tabs */}
      <Tabs value={tab} onValueChange={(v) => setTab(v as ViewTab)} className="mb-2">
        <TabsList className="grid w-full grid-cols-5 h-9 rounded-xl">
          <TabsTrigger className="text-xs h-9 px-2" value="TODOS">Todos</TabsTrigger>
          <TabsTrigger className="text-xs h-9 px-2" value="PENDIENTES">Pendientes</TabsTrigger>
          <TabsTrigger className="text-xs h-9 px-2" value="SEMANAL">Semanal</TabsTrigger>
          <TabsTrigger className="text-xs h-9 px-2" value="QUINCENAL">Quincenal</TabsTrigger>
          <TabsTrigger className="text-xs h-9 px-2" value="MENSUAL">Mensual</TabsTrigger>
        </TabsList>

        {/* Panel “Agregar a esta semana” */}
        {(tab === "QUINCENAL" || tab === "MENSUAL") && (() => {
          const candidates = providers.filter(p => p.freq === tab).sort(byName);
          const addedCount = candidates.filter(p => weekProviders.has(p.id)).length;

          return (
            <Accordion type="single" collapsible className="mt-3">
              <AccordionItem value="agregar-panel" className="rounded-xl border">
                <AccordionTrigger className="px-3 py-2">
                  <div className="flex w-full items-center justify-between gap-3">
                    <div className="text-left">
                      <p className="text-sm font-medium">
                        Agregar {tab.toLowerCase()}s a <span className="font-semibold">{headerRange}</span>
                      </p>
                      <p className="text-[11px] text-muted-foreground">
                        Agregados {addedCount} / {candidates.length}
                      </p>
                    </div>
                    <Badge variant="secondary" className="rounded-md">
                      {addedCount} / {candidates.length}
                    </Badge>
                  </div>
                </AccordionTrigger>

                <AccordionContent>
                  <div className="space-y-2 px-3 pb-3 max-h-80 overflow-y-auto">
                    {candidates.map((p) => {
                      const included = weekProviders.has(p.id);
                      const lastISO = lastAddedByProvider[p.id];
                      const last = lastISO ? new Date(lastISO) : null;

                      return (
                        <div key={p.id} className="flex items-center justify-between rounded-lg border px-3 py-2">
                          <div className="min-w-0">
                            <p className="truncate text-sm font-medium">{p.name}</p>
                            <p className="text-xs text-muted-foreground">
                              Última vez agregado: {last ? last.toLocaleDateString("es-AR") : "—"}
                            </p>
                          </div>

                          <div className="flex items-center gap-2">
                            {included ? (
                              <>
                                <Badge className="h-6 rounded-md bg-emerald-600 text-white">Agregado</Badge>
                                <Button
                                  variant="outline" size="sm" className="h-8 rounded-lg"
                                  onClick={() => removeProviderFromCurrentWeek(p.id)}
                                >
                                  Quitar
                                </Button>
                              </>
                            ) : (
                              <Button
                                size="sm" className="h-8 rounded-lg"
                                onClick={() => addProviderToCurrentWeek(p.id)}
                              >
                                Agregar
                              </Button>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </AccordionContent>
              </AccordionItem>
            </Accordion>
          );
        })()}
      </Tabs>

      {/* Buscador */}
      <div className="mb-3">
        <Input
          placeholder={loading ? "Cargando..." : "Buscar proveedor o responsable"}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="h-9 text-sm rounded-xl"
          aria-label="Buscar proveedor"
          disabled={loading}
        />
      </div>

      {/* Acordeones por día */}
      <Accordion type="multiple" defaultValue={[`day-${todayIdx}`]} className="w-full">
        {[0,1,2,3,4,5,6,-1].map((idx) => {
          const list = groupedByDay.get(idx)!;
          if (!list || list.length === 0) return null;

          return (
            <AccordionItem key={`day-${idx}`} value={`day-${idx}`} className="border-b">
              <AccordionTrigger className="py-3">
                <div className="flex w-full items-center justify-between">
                  <span className="text-left font-medium">{DAY_LABELS_EXT[idx]}</span>
                  <Badge variant="outline" className="ml-2">
                    {list.length} {list.length === 1 ? "proveedor" : "proveedores"}
                  </Badge>
                </div>
              </AccordionTrigger>
              <AccordionContent className="space-y-2 pb-4">
                {list.map((p) => (
                  <Card key={p.id} className="rounded-xl shadow-sm border border-border/70">
                    <CardContent className="p-3">
                      {/* Chips */}
                      {(() => {
                        const s = weekSummaries[p.id];
                        const showTotal = (s?.total ?? 0) > 0;
                        const showItems = (s?.items ?? 0) > 0;
                        const showDate = !!s?.updated_at;
                        if (!showTotal && !showItems && !showDate) return null;
                        const updatedAt = s?.updated_at ? new Date(s.updated_at as string) : null;
                        return (
                          <div className="mb-1 flex flex-wrap items-center gap-1.5">
                            {showTotal && (
                              <span className="inline-flex items-center gap-1 rounded-full bg-muted px-2 py-[2px] text-[11px] text-foreground/80">
                                💰 {fmtMoney(s?.total ?? 0)}
                              </span>
                            )}
                            {showItems && (
                              <span className="inline-flex items-center gap-1 rounded-full bg-muted px-2 py-[2px] text-[11px] text-foreground/80">
                                📦 {s?.items ?? 0} art.
                              </span>
                            )}
                            {updatedAt && (
                              <span className="inline-flex items-center gap-1 rounded-full bg-muted px-2 py-[2px] text-[11px] text-foreground/80">
                                🕒 {updatedAt.toLocaleString("es-AR", {
                                  day: "2-digit", month: "2-digit", year: "2-digit", hour: "2-digit", minute: "2-digit",
                                })}
                              </span>
                            )}
                          </div>
                        );
                      })()}

                      {/* Nombre + Estado */}
                      {(() => {
                        const st = statusFor(p.id);
                        return (
                          <div className="flex items-center gap-2">
                            <p className="truncate text-sm font-semibold leading-none flex-1">{p.name}</p>
                            <Badge
                              className={
                                st === "REALIZADO"
                                  ? "h-5 text-[10px] bg-green-600 hover:bg-green-700 text-white rounded-md"
                                  : "h-5 text-[10px] bg-orange-500 hover:bg-orange-600 text-white rounded-md"
                              }
                            >
                              {st === "REALIZADO" ? "Realizado" : "Pendiente"}
                            </Badge>
                          </div>
                        );
                      })()}

                      {/* Meta compacta */}
                      <div className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-1 text-[11px] text-muted-foreground">
                        <span className="inline-flex items-center gap-1">
                          <CalendarDays className="h-3 w-3" aria-hidden />
                          {p.freq.toLowerCase()}
                        </span>
                        <span aria-hidden>•</span>
                        <span className="inline-flex items-center gap-1">
                          <Truck className="h-3 w-3" aria-hidden />
                          Recibe: {DAYS[normalizeDay(p.receive_day) as DayIdx] ?? "—"}
                        </span>
                        <span className="inline-flex items-center gap-1 rounded-full bg-muted px-2 py-[2px] text-foreground/80">
                          {normalizePayment(p.payment_method) === "EFECTIVO" ? (
                            <Banknote className="h-3 w-3" aria-hidden />
                          ) : (
                            <Landmark className="h-3 w-3" aria-hidden />
                          )}
                          {normalizePayment(p.payment_method) === "EFECTIVO" ? "Efectivo" : "Transferencia"}
                        </span>
                        <span className="inline-flex items-center gap-1 rounded-full bg-muted px-2 py-[2px] text-foreground/80">
                          <UserRound className="h-3 w-3" aria-hidden />
                          {p.responsible}
                        </span>
                      </div>

                      {/* Acciones */}
                      <div className="mt-3 grid grid-cols-2 gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          className="h-8 text-xs rounded-lg"
                          aria-label={`Ver pedido de ${p.name}`}
                          onClick={() => {
                            const basePath = branch
                              ? `/t/${slug}/b/${branch}/proveedores/${p.id}/pedido`
                              : `/t/${slug}/proveedores/${p.id}/pedido`;
                            const qs = new URLSearchParams({
                              name: p.name,
                              week: selectedWeek?.id ?? "",
                              branch: branch ?? "",
                              branchId,
                              tenantId,
                            });
                            router.push(`${basePath}?${qs.toString()}`);
                          }}
                        >
                          Ver Pedido
                        </Button>

                        {(() => {
                          const st = statusFor(p.id);
                          const isPending = st === "PENDIENTE";
                          return (
                            <Button
                              size="sm"
                              onClick={() => toggleStatus(p)}
                              className={
                                "h-8 text-xs rounded-lg " +
                                (isPending
                                  ? "bg-orange-500 text-white hover:bg-orange-600"
                                  : "bg-green-600 text-white hover:bg-green-700")
                              }
                              aria-label={isPending ? "Marcar realizado" : "Marcar pendiente"}
                            >
                              {isPending ? (
                                <span className="inline-flex items-center gap-1">
                                  <CheckCircle2 className="h-3.5 w-3.5" aria-hidden /> Realizar
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1">
                                  <Clock3 className="h-3.5 w-3.5" aria-hidden /> Pendiente
                                </span>
                              )}
                            </Button>
                          );
                        })()}

                        <div className="col-span-2 -mt-1 flex justify-end gap-1.5">
                          <Button size="icon" variant="ghost" className="h-8 w-8 rounded-lg border border-border"
                            aria-label={`Editar ${p.name}`} onClick={() => openEdit(p)} title="Editar">
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button size="icon" variant="ghost" className="h-8 w-8 rounded-lg border border-border"
                            aria-label={`Eliminar ${p.name}`}
                            onClick={() => setConfirmDelete({ open: true, id: p.id, name: p.name })}
                            title="Eliminar">
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </AccordionContent>
            </AccordionItem>
          );
        })}
      </Accordion>

      {/* Sin resultados */}
      {Array.from(groupedByDay.values()).every((arr) => arr.length === 0) && !loading && (
        <div className="py-8 text-center text-sm text-muted-foreground" role="status">
          No hay proveedores para esta vista. Usá “Agregar” o sumá quincenales/mensuales a la semana actual.
        </div>
      )}

      {/* FAB secundaria: Nueva semana */}
      <Button
        onClick={() => setConfirmNewWeek(true)}
        className="fixed bottom-40 right-6 h-10 rounded-full px-4 shadow-lg"
        variant="secondary"
        aria-label="Iniciar nueva semana"
        title="Iniciar nueva semana"
      >
        Nueva semana
      </Button>

      {/* Confirmación Nueva semana */}
      <AlertDialog open={confirmNewWeek} onOpenChange={setConfirmNewWeek}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Iniciar nueva semana</AlertDialogTitle>
            <AlertDialogDescription>
              Elegí el <b>lunes</b> de la semana que querés crear. Esto pondrá <b>todos los proveedores en Pendiente</b> y
              reiniciará <b>montos/ítems</b> a 0. Los <b>semanales</b> se verán automáticamente; los
              <b> quincenales/mensuales</b> los podés sumar desde sus pestañas.
            </AlertDialogDescription>
          </AlertDialogHeader>

          <div className="mt-2">
            <label htmlFor="new-week-date" className="mb-1 block text-sm">Fecha (lunes de la semana)</label>
            <Input id="new-week-date" type="date" value={newWeekDate} onChange={(e) => setNewWeekDate(e.target.value)} />
          </div>

          <AlertDialogFooter className="mt-3">
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={createNewWeekAndReset}>
              Confirmar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* FAB (+) */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogTrigger asChild>
          <Button size="icon" className="fixed bottom-24 right-6 h-14 w-14 rounded-full shadow-lg" aria-label="Agregar proveedor">
            <Plus className="h-6 w-6" />
          </Button>
        </DialogTrigger>

        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Registrar proveedor</DialogTitle>
            <DialogDescription>Se guardará en la nube y se verá desde cualquier dispositivo.</DialogDescription>
          </DialogHeader>

          <div className="grid gap-3">
            <div className="grid gap-1.5">
              <label htmlFor="create-name" className="text-sm">Nombre</label>
              <Input id="create-name" placeholder="Ej: Ankas del Sur" value={name} onChange={(e) => setName(e.target.value)} />
            </div>

            <div className="grid gap-1.5 text-sm">
              <span>Frecuencia</span>
              <Select value={freq} onValueChange={(v) => setFreq(v as Freq)}>
                <SelectTrigger><SelectValue placeholder="Elige frecuencia" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="SEMANAL">Semanal</SelectItem>
                  <SelectItem value="QUINCENAL">Quincenal</SelectItem>
                  <SelectItem value="MENSUAL">Mensual</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="grid gap-1.5 text-sm">
              <span>Día que se pide</span>
              <Select value={String(orderDay)} onValueChange={(v) => setOrderDay(Number(v) as DayIdx)}>
                <SelectTrigger><SelectValue placeholder="Selecciona un día" /></SelectTrigger>
                <SelectContent>
                  {DAYS.map((d, i) => (<SelectItem key={i} value={String(i)}>{d}</SelectItem>))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid gap-1.5 text-sm">
              <span>Día que se recibe</span>
              <Select value={String(receiveDay)} onValueChange={(v) => setReceiveDay(Number(v) as DayIdx)}>
                <SelectTrigger><SelectValue placeholder="Selecciona un día" /></SelectTrigger>
                <SelectContent>
                  {DAYS.map((d, i) => (<SelectItem key={i} value={String(i)}>{d}</SelectItem>))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid gap-1.5">
              <label htmlFor="create-responsible" className="text-sm">Responsable</label>
              <Input id="create-responsible" placeholder="Ej: Jorge / Mariana" value={responsible} onChange={(e) => setResponsible(e.target.value)} />
            </div>

            <div className="grid gap-1.5 text-sm">
              <span>Método de pago</span>
              <Select value={paymentMethod} onValueChange={(v) => setPaymentMethod(v as PaymentMethod)}>
                <SelectTrigger><SelectValue placeholder="Selecciona método" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="EFECTIVO">Efectivo</SelectItem>
                  <SelectItem value="TRANSFERENCIA">Transferencia</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="grid gap-1.5 text-sm">
              <span>Estado inicial</span>
              <Select value={status} onValueChange={(v) => setStatus(v as Status)}>
                <SelectTrigger><SelectValue placeholder="Selecciona estado" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="PENDIENTE">Pendiente</SelectItem>
                  <SelectItem value="REALIZADO">Realizado</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <DialogFooter className="mt-2">
            <Button variant="secondary" onClick={() => { resetCreateForm(); setCreateOpen(false); }}>Cancelar</Button>
            <Button onClick={addProvider}>Guardar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Editar */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Editar proveedor</DialogTitle>
            <DialogDescription>Actualiza los datos del proveedor.</DialogDescription>
          </DialogHeader>

          {editing && (
            <div className="grid gap-3">
              <div className="grid gap-1.5">
                <label htmlFor="edit-name" className="text-sm">Nombre</label>
                <Input id="edit-name" value={editing.name} onChange={(e) => setEditing({ ...editing, name: e.target.value })} />
              </div>

              <div className="grid gap-1.5 text-sm">
                <span>Frecuencia</span>
                <Select value={editing.freq} onValueChange={(v) => setEditing({ ...editing, freq: v as Freq })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="SEMANAL">Semanal</SelectItem>
                    <SelectItem value="QUINCENAL">Quincenal</SelectItem>
                    <SelectItem value="MENSUAL">Mensual</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="grid gap-1.5 text-sm">
                <span>Día que se pide</span>
                <Select value={String(normalizeDay(editing.order_day))}
                        onValueChange={(v) => setEditing({ ...editing, order_day: Number(v) as DayIdx })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {DAYS.map((d, i) => (<SelectItem key={i} value={String(i)}>{d}</SelectItem>))}
                  </SelectContent>
                </Select>
              </div>

              <div className="grid gap-1.5 text-sm">
                <span>Día que se recibe</span>
                <Select value={String(normalizeDay(editing.receive_day))}
                        onValueChange={(v) => setEditing({ ...editing, receive_day: Number(v) as DayIdx })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {DAYS.map((d, i) => (<SelectItem key={i} value={String(i)}>{d}</SelectItem>))}
                  </SelectContent>
                </Select>
              </div>

              <div className="grid gap-1.5">
                <label htmlFor="edit-responsible" className="text-sm">Responsable</label>
                <Input id="edit-responsible" value={editing.responsible} onChange={(e) => setEditing({ ...editing, responsible: e.target.value })} />
              </div>

              <div className="grid gap-1.5 text-sm">
                <span>Método de pago</span>
                <Select value={normalizePayment(editing.payment_method)}
                        onValueChange={(v) => setEditing({ ...editing, payment_method: v as PaymentMethod })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="EFECTIVO">Efectivo</SelectItem>
                    <SelectItem value="TRANSFERENCIA">Transferencia</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="grid gap-1.5 text-sm">
                <span>Estado</span>
                <Select value={editing.status} onValueChange={(v) => setEditing({ ...editing, status: v as Status })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="PENDIENTE">Pendiente</SelectItem>
                    <SelectItem value="REALIZADO">Realizado</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}

          <DialogFooter className="mt-2">
            <Button variant="secondary" onClick={() => setEditOpen(false)}>Cancelar</Button>
            <Button onClick={saveEdit}>Guardar cambios</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Confirmación de borrado */}
      <AlertDialog open={confirmDelete.open} onOpenChange={(open) => setConfirmDelete((s) => ({ ...s, open }))}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Eliminar proveedor</AlertDialogTitle>
            <AlertDialogDescription>
              ¿Seguro que querés borrar <b>{confirmDelete.name}</b>? Esta acción no se puede deshacer.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => { if (confirmDelete.id) removeProvider(confirmDelete.id); setConfirmDelete({ open: false }); }}>
              Borrar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </main>
  );
}
