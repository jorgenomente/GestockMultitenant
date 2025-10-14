"use client";

import React from "react";
import { v4 as uuid } from "uuid";
import { z } from "zod";
import { useRouter } from "next/navigation";
import { getSupabaseBrowserClient } from "@/lib/supabaseClient";
import { useBranch } from "@/components/branch/BranchProvider";
import type { PostgrestError } from "@supabase/supabase-js";

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

const SALES_KEY_ROOT = "sales_url";
const salesKeyForScope = (tenantId?: string | null, branchId?: string | null) => {
  const tid = tenantId?.trim() || "";
  const bid = branchId?.trim() || "";
  if (tid && bid) return `${SALES_KEY_ROOT}:${tid}:${bid}`;
  if (tid) return `${SALES_KEY_ROOT}:${tid}`;
  return SALES_KEY_ROOT;
};

const BACKUP_KEY_ROOT = "providers_backup";
const backupKeyForScope = (tenantId: string, branchId: string) => `${BACKUP_KEY_ROOT}:${tenantId}:${branchId}`;

const formatBackupTimestamp = (iso: string | null | undefined) => {
  if (!iso) return "Sin copia guardada";
  try {
    return new Date(iso).toLocaleString("es-AR");
  } catch {
    return iso;
  }
};

type ProviderExportTableKey =
  | "providers"
  | "provider_weeks"
  | "provider_week_providers"
  | "provider_week_states"
  | "orders"
  | "order_items"
  | "order_snapshots"
  | "order_ui_state"
  | "order_summaries"
  | "order_summaries_week"
  | "app_settings";

type ImportTableConfig = {
  key: ProviderExportTableKey;
  table: string;
  conflict?: string;
  forceTenant?: boolean;
  forceBranch?: boolean;
  drop?: string[];
};

const IMPORT_TABLE_SEQUENCE: ImportTableConfig[] = [
  { key: "providers", table: "providers", conflict: "id", forceTenant: true, forceBranch: true, drop: ["user_id", "created_at", "updated_at"] },
  { key: "provider_weeks", table: "provider_weeks", conflict: "id", forceTenant: true, forceBranch: true, drop: ["created_at", "updated_at"] },
  { key: "provider_week_providers", table: "provider_week_providers", conflict: "id", forceTenant: true, forceBranch: true, drop: ["created_at", "updated_at"] },
  { key: "provider_week_states", table: "provider_week_states", conflict: "id", forceTenant: true, forceBranch: true, drop: ["created_at", "updated_at"] },
  { key: "orders", table: "orders", conflict: "id", forceTenant: true, forceBranch: true, drop: ["user_id", "created_at", "updated_at"] },
  { key: "order_items", table: "order_items", conflict: "id", forceTenant: true, forceBranch: true, drop: ["user_id", "subtotal", "created_at", "updated_at"] },
  { key: "order_snapshots", table: "order_snapshots", conflict: "id", drop: ["user_id", "tenant_id", "branch_id", "created_at", "updated_at"] },
  { key: "order_ui_state", table: "order_ui_state", conflict: "order_id" },
  { key: "order_summaries", table: "order_summaries", conflict: "provider_id" },
  { key: "order_summaries_week", table: "order_summaries_week", conflict: "week_id,provider_id", drop: ["id"] },
  { key: "app_settings", table: "app_settings", conflict: "key", forceTenant: true, forceBranch: true, drop: ["created_at", "updated_at"] },
];

const IMPORT_TABLE_LOOKUP = new Map<ProviderExportTableKey, ImportTableConfig>(
  IMPORT_TABLE_SEQUENCE.map((cfg) => [cfg.key, cfg])
);

const IMPORT_CHUNK_SIZE = 200;

const CLEANUP_ORDER_TABLES = ["orders", "provider_orders", "branch_orders"] as const;
const CLEANUP_ITEM_TABLES = ["order_items", "provider_order_items", "branch_order_items"] as const;
const ORDER_TABLE_CANDIDATES = ["orders", "provider_orders", "branch_orders"] as const;
const ITEM_TABLE_CANDIDATES = ["order_items", "provider_order_items", "branch_order_items"] as const;

const TENANT_SCOPED_TABLES = new Set([
  "orders",
  "provider_orders",
  "branch_orders",
  "order_items",
  "provider_order_items",
  "branch_order_items",
  "order_snapshots",
  "order_ui_state",
  "order_summaries",
  "order_summaries_week",
  "provider_weeks",
  "provider_week_providers",
  "provider_week_states",
  "app_settings",
]);

const BRANCH_SCOPED_TABLES = new Set([
  "providers",
  "orders",
  "provider_orders",
  "branch_orders",
  "order_items",
  "provider_order_items",
  "branch_order_items",
  "order_snapshots",
  "order_ui_state",
  "order_summaries",
  "order_summaries_week",
  "provider_weeks",
  "provider_week_providers",
  "provider_week_states",
  "app_settings",
]);

const isMissingTableError = (error: PostgrestError | null | undefined) => {
  if (!error) return false;
  const code = error.code ?? "";
  if (code === "42P01" || code === "42703" || code === "PGRST302") return true;
  const msg = (error.message ?? "").toLowerCase();
  return msg.includes("could not find the table");
};

const matchesScope = (
  row: Record<string, unknown>,
  tenantId: string,
  _branchId: string,
  _branchSlug: string,
) => {
  const rowTenant = typeof row.tenant_id === "string" ? row.tenant_id : null;
  if (rowTenant && rowTenant !== tenantId) return false;
  return true;
};

type ProvidersExportPayload = {
  version: number;
  exportedAt: string;
  source: string;
  tables: Record<string, unknown>;
};

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value != null && !Array.isArray(value);
}

async function showAlert(message: string, copyToClipboard = false) {
  if (copyToClipboard && typeof navigator !== "undefined" && navigator.clipboard?.writeText) {
    try {
      await navigator.clipboard.writeText(message);
      window.alert(`${message}\n\n(El contenido se copió al portapapeles)`);
      return;
    } catch {}
  }
  window.alert(message);
}

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

const stripBranchSuffix = (name: string) => name.replace(/\s*\([^()]*\)\s*$/, '').trim();
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
function toTimestamp(value: unknown): number {
  if (typeof value === "string") {
    const ts = Date.parse(value);
    if (Number.isFinite(ts)) return ts;
  }
  return 0;
}

/* =================== COMPONENTE =================== */
export default function ProvidersPageClient({ slug, branch, tenantId, branchId }: Props) {
  const supabase = React.useMemo(() => getSupabaseBrowserClient(), []);
  const router = useRouter();
  const { setCurrentBranch, role } = useBranch();

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
  const importInputRef = React.useRef<HTMLInputElement | null>(null);
  const [importingData, setImportingData] = React.useState(false);
  const [copyingData, setCopyingData] = React.useState(false);
  const [exportDialogOpen, setExportDialogOpen] = React.useState(false);
  const [exportBranchId, setExportBranchId] = React.useState<string | null>(branchId ?? null);
  const [branchOptions, setBranchOptions] = React.useState<Array<{ id: string; slug: string | null; name: string | null }>>([]);
  const [loadingBranches, setLoadingBranches] = React.useState(false);
  const [savingBackup, setSavingBackup] = React.useState(false);
  const [restoringBackup, setRestoringBackup] = React.useState(false);
  const [loadingBackupMeta, setLoadingBackupMeta] = React.useState(false);
  const [backupMeta, setBackupMeta] = React.useState<{ updatedAt: string | null } | null>(null);
  const isOwner = role === "owner";

  const loadBackupInfo = React.useCallback(async () => {
    if (!tenantId || !branchId) {
      setBackupMeta(null);
      return;
    }
    setLoadingBackupMeta(true);
    try {
      const key = backupKeyForScope(tenantId, branchId);
      const { data, error } = await supabase
        .from("app_settings")
        .select("value, updated_at")
        .eq("tenant_id", tenantId)
        .eq("branch_id", branchId)
        .eq("key", key)
        .maybeSingle();
      if (error) {
        if (isMissingTableError(error)) {
          setBackupMeta(null);
          return;
        }
        throw error;
      }
      const row = (data ?? null) as { value: string | null; updated_at: string | null } | null;
      setBackupMeta(row ? { updatedAt: row.updated_at ?? null } : null);
    } catch (err) {
      console.error("load backup info error", err);
    } finally {
      setLoadingBackupMeta(false);
    }
  }, [branchId, supabase, tenantId]);

  const persistBranchSnapshot = React.useCallback(async (payload: ProvidersExportPayload) => {
    if (!tenantId || !branchId) {
      await showAlert("Seleccioná una sucursal antes de guardar la copia.");
      return false;
    }
    const key = backupKeyForScope(tenantId, branchId);
    try {
      const { data, error } = await supabase
        .from("app_settings")
        .upsert({
          key,
          tenant_id: tenantId,
          branch_id: branchId,
          value: JSON.stringify(payload),
        }, { onConflict: "key" })
        .select("updated_at")
        .maybeSingle();
      if (error) throw error;
      const row = (data ?? null) as { updated_at: string | null } | null;
      const updatedAt = row?.updated_at ?? null;
      setBackupMeta({ updatedAt });
      return true;
    } catch (err) {
      console.error("save backup error", err);
      const message = err instanceof Error ? err.message : String(err);
      await showAlert(`No se pudo guardar la copia de seguridad.\n${message}`);
      return false;
    }
  }, [branchId, showAlert, supabase, tenantId]);

  const fetchBranchSnapshot = React.useCallback(async (): Promise<ProvidersExportPayload | null> => {
    if (!tenantId || !branchId) {
      await showAlert("Seleccioná una sucursal antes de restaurar.");
      return null;
    }
    const key = backupKeyForScope(tenantId, branchId);
    try {
      const { data, error } = await supabase
        .from("app_settings")
        .select("value, updated_at")
        .eq("tenant_id", tenantId)
        .eq("branch_id", branchId)
        .eq("key", key)
        .maybeSingle();
      if (error) {
        if (isMissingTableError(error)) {
          await showAlert("Todavía no guardaste una copia de esta sucursal.");
          return null;
        }
        throw error;
      }
      const row = (data ?? null) as { value: string | null; updated_at: string | null } | null;
      if (!row?.value) {
        await showAlert("No encontramos una copia guardada para esta sucursal.");
        return null;
      }
      try {
        const parsed = JSON.parse(row.value) as ProvidersExportPayload;
        setBackupMeta({ updatedAt: row.updated_at ?? null });
        return parsed;
      } catch (parseErr) {
        console.error("parse backup error", parseErr);
        await showAlert("La copia guardada está dañada o tiene un formato inválido.");
        return null;
      }
    } catch (err) {
      console.error("load backup error", err);
      const message = err instanceof Error ? err.message : String(err);
      await showAlert(`No se pudo cargar la copia guardada.\n${message}`);
      return null;
    }
  }, [branchId, showAlert, supabase, tenantId]);

  React.useEffect(() => {
    void loadBackupInfo();
  }, [loadBackupInfo]);

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

  const handleImportClick = React.useCallback(() => {
    importInputRef.current?.click();
  }, []);

const clearGestockCaches = React.useCallback(() => {
  if (typeof window === "undefined") return;
  try {
    const toRemove: string[] = [];
    for (let i = 0; i < window.localStorage.length; i += 1) {
      const key = window.localStorage.key(i);
      if (key && key.startsWith("gestock:")) toRemove.push(key);
    }
    toRemove.forEach((key) => window.localStorage.removeItem(key));
  } catch {}
}, []);

const applyProvidersPayload = React.useCallback(async (
  payload: ProvidersExportPayload,
  options: ApplyPayloadOptions,
): Promise<boolean> => {
  if (!tenantId) {
    await showAlert("Seleccioná una sucursal antes de aplicar datos.");
    return false;
  }

  if (!isValidTables(payload.tables)) {
    await showAlert("Formato de tablas inválido en el archivo.");
    return false;
  }

  const showMessages = options.showMessages ?? true;
  const targetBranchId = options.target.id;
  const targetBranchSlug = options.target.slug ?? null;
  const tables = payload.tables;

  const cleanupErrors: string[] = [];

  const providerIdsResp = await supabase
    .from("providers")
    .select("id")
    .eq("tenant_id", tenantId)
    .eq("branch_id", targetBranchId);
  if (providerIdsResp.error) cleanupErrors.push(`Limpieza providers: ${providerIdsResp.error.message}`);
  const existingProviderIds = (providerIdsResp.data as { id: string | null }[] | null ?? [])
    .map((row) => row?.id)
    .filter((id): id is string => Boolean(id));

  const weekIdsResp = await supabase
    .from("provider_weeks")
    .select("id")
    .eq("tenant_id", tenantId)
    .eq("branch_id", targetBranchId);
  if (weekIdsResp.error) cleanupErrors.push(`Limpieza provider_weeks: ${weekIdsResp.error.message}`);
  const existingWeekIds = (weekIdsResp.data as { id: string | null }[] | null ?? [])
    .map((row) => row?.id)
    .filter((id): id is string => Boolean(id));

  const existingOrderIdsSet = new Set<string>();
  if (existingProviderIds.length) {
    for (const table of CLEANUP_ORDER_TABLES) {
      const { data, error } = await supabase
        .from(table)
        .select("id")
        .in("provider_id", existingProviderIds);
      if (error) {
        if (!isMissingTableError(error)) cleanupErrors.push(`Limpieza ${table}: ${error.message}`);
        continue;
      }
      (data as { id: string | null }[] | null ?? []).forEach((row) => {
        if (row?.id) existingOrderIdsSet.add(row.id);
      });
    }
  }
  const existingOrderIds = Array.from(existingOrderIdsSet);

  const runDelete = async (table: string, column: string, values: string[]) => {
    if (!values.length) return;
    const { error } = await supabase.from(table).delete().in(column, values);
    if (error) {
      if (isMissingTableError(error)) return;
      cleanupErrors.push(`Limpieza ${table}: ${error.message}`);
    }
  };

  await runDelete("order_ui_state", "order_id", existingOrderIds);
  await runDelete("order_snapshots", "order_id", existingOrderIds);
  for (const table of CLEANUP_ITEM_TABLES) await runDelete(table, "order_id", existingOrderIds);
  await runDelete("order_summaries", "provider_id", existingProviderIds);
  await runDelete("order_summaries_week", "provider_id", existingProviderIds);
  await runDelete("order_summaries_week", "week_id", existingWeekIds);
  await runDelete("provider_week_states", "provider_id", existingProviderIds);
  await runDelete("provider_week_states", "week_id", existingWeekIds);
  await runDelete("provider_week_providers", "provider_id", existingProviderIds);
  await runDelete("provider_week_providers", "week_id", existingWeekIds);
  await runDelete("provider_weeks", "id", existingWeekIds);
  for (const table of CLEANUP_ORDER_TABLES) await runDelete(table, "id", existingOrderIds);
  const { error: deleteProvidersError } = await supabase
    .from("providers")
    .delete()
    .eq("tenant_id", tenantId)
    .eq("branch_id", targetBranchId);
  if (deleteProvidersError) cleanupErrors.push(`Limpieza providers: ${deleteProvidersError.message}`);
  const { error: deleteSettingsError } = await supabase
    .from("app_settings")
    .delete()
    .eq("tenant_id", tenantId)
    .eq("branch_id", targetBranchId);
  if (deleteSettingsError && !isMissingTableError(deleteSettingsError)) {
    cleanupErrors.push(`Limpieza app_settings: ${deleteSettingsError.message}`);
  }
  const { error: deleteSettingsKeyErr } = await supabase
    .from("app_settings")
    .delete()
    .in("key", [salesKeyForScope(tenantId, targetBranchId)]);
  if (deleteSettingsKeyErr && !isMissingTableError(deleteSettingsKeyErr) && (deleteSettingsKeyErr.code ?? "") !== "PGRST116") {
    cleanupErrors.push(`Limpieza app_settings (key): ${deleteSettingsKeyErr.message}`);
  }

  const errors: string[] = [...cleanupErrors];
  const applyDrops = applyDropsFactory(tenantId, targetBranchId);

  const preparedTables = new Map<ProviderExportTableKey, Record<string, unknown>[]>();
  IMPORT_TABLE_SEQUENCE.forEach((cfg) => preparedTables.set(cfg.key, []));

  const providerIdMap = new Map<string, string>();
  const weekIdMap = new Map<string, string>();
  const orderIdMap = new Map<string, string>();

  const providerCfg = IMPORT_TABLE_LOOKUP.get("providers")!;
  const providerRowsRaw = ensureArray<Record<string, unknown>>(tables.providers);
  if (providerRowsRaw.length) {
    const { data: existingProvidersData, error: existingProvidersError } = await supabase
      .from("providers")
      .select("id,name,branch_id")
      .eq("tenant_id", tenantId)
      .eq("branch_id", targetBranchId);
    if (existingProvidersError && !isMissingTableError(existingProvidersError)) {
      errors.push(`Tabla providers: ${existingProvidersError.message}`);
    }
    const existingProviders = (existingProvidersData as { id: string; name: string | null }[] | null) ?? [];
    const existingByName = new Map<string, string>();
    existingProviders.forEach((row) => {
      if (!row?.id || !row?.name) return;
      const norm = buildNameKey(row.name);
      if (norm) existingByName.set(norm, row.id);
    });

    const targetTable = preparedTables.get("providers")!;
    const importedByName = new Map<string, string>();
    const scheduledProviderIds = new Set<string>();
    for (const rawRow of providerRowsRaw) {
      if (!isPlainObject(rawRow)) continue;
      const baseName = ensureName(rawRow.name);
      if (!baseName) {
        errors.push("Tabla providers: fila sin nombre omitida");
        continue;
      }
      const originalId = ensureId(rawRow.id);
      const norm = baseName.toLowerCase();
      const reuseId = existingByName.get(norm) ?? importedByName.get(norm) ?? null;
      const mappedId = reuseId ?? uuid();
      providerIdMap.set(originalId, mappedId);
      providerIdMap.set(mappedId, mappedId);
      importedByName.set(norm, mappedId);
      if (scheduledProviderIds.has(mappedId)) continue;
      const sanitized: Record<string, unknown> = {
        ...rawRow,
        id: mappedId,
        name: baseName,
        tenant_id: tenantId,
        branch_id: targetBranchId,
      };
      applyDrops(sanitized, providerCfg);
      targetTable.push(sanitized);
      scheduledProviderIds.add(mappedId);
    }
  }

  const weekCfg = IMPORT_TABLE_LOOKUP.get("provider_weeks")!;
  const weekRowsRaw = ensureArray<Record<string, unknown>>(tables.provider_weeks);
  if (weekRowsRaw.length) {
    const existingWeeksResp = await supabase
      .from("provider_weeks")
      .select("id,week_start")
      .eq("tenant_id", tenantId)
      .eq("branch_id", targetBranchId);
    if (existingWeeksResp.error && !isMissingTableError(existingWeeksResp.error)) {
      errors.push(`Tabla provider_weeks: ${existingWeeksResp.error.message}`);
    }
    const existingWeekByKey = new Map<string, string>();
    (existingWeeksResp.data as { id: string | null; week_start: string | null }[] | null ?? []).forEach((row) => {
      if (row?.week_start && row?.id) existingWeekByKey.set(String(row.week_start), row.id);
    });

    const targetTable = preparedTables.get("provider_weeks")!;
    const importedWeekByKey = new Map<string, string>();
    for (const rawRow of weekRowsRaw) {
      if (!isPlainObject(rawRow)) continue;
      const originalId = ensureId(rawRow.id);
      const weekStart = typeof rawRow.week_start === "string" ? rawRow.week_start : null;
      if (!weekStart) {
        errors.push("Tabla provider_weeks: fila sin week_start omitida");
        continue;
      }
      const reusedId = existingWeekByKey.get(weekStart) ?? importedWeekByKey.get(weekStart) ?? null;
      const mappedId = reusedId ?? uuid();
      weekIdMap.set(originalId, mappedId);
      weekIdMap.set(mappedId, mappedId);
      if (reusedId) continue;
      importedWeekByKey.set(weekStart, mappedId);
      const sanitized: Record<string, unknown> = {
        ...rawRow,
        id: mappedId,
        week_start: weekStart,
        tenant_id: tenantId,
        branch_id: targetBranchId,
      };
      applyDrops(sanitized, weekCfg);
      targetTable.push(sanitized);
    }
  }

  const weekProvidersCfg = IMPORT_TABLE_LOOKUP.get("provider_week_providers")!;
  const weekProvidersRaw = ensureArray<Record<string, unknown>>(tables.provider_week_providers);
  if (weekProvidersRaw.length) {
    const targetTable = preparedTables.get("provider_week_providers")!;
    const seenWeekProviderIds = new Set<string>();
    const seenWeekProviderKeys = new Set<string>();
    for (const rawRow of weekProvidersRaw) {
      if (!isPlainObject(rawRow)) continue;
      const providerRef = typeof rawRow.provider_id === "string" ? rawRow.provider_id : "";
      const mappedProvider = providerIdMap.get(providerRef);
      if (!mappedProvider) {
        errors.push(`Tabla provider_week_providers: proveedor ${providerRef} no existe`);
        continue;
      }
      const weekRef = typeof rawRow.week_id === "string" ? rawRow.week_id : "";
      const mappedWeek = weekIdMap.get(weekRef);
      if (!mappedWeek) {
        errors.push(`Tabla provider_week_providers: semana ${weekRef} no existe`);
        continue;
      }
      const key = `${mappedWeek}::${mappedProvider}`;
      if (seenWeekProviderKeys.has(key)) continue;
      const mappedId = ensureId(rawRow.id);
      if (seenWeekProviderIds.has(mappedId)) continue;
      const sanitized: Record<string, unknown> = {
        ...rawRow,
        id: mappedId,
        provider_id: mappedProvider,
        week_id: mappedWeek,
        tenant_id: tenantId,
        branch_id: targetBranchId,
      };
      applyDrops(sanitized, weekProvidersCfg);
      targetTable.push(sanitized);
      seenWeekProviderKeys.add(key);
      seenWeekProviderIds.add(mappedId);
    }
  }

  const weekStatesCfg = IMPORT_TABLE_LOOKUP.get("provider_week_states")!;
  const weekStatesRaw = ensureArray<Record<string, unknown>>(tables.provider_week_states);
  if (weekStatesRaw.length) {
    const targetTable = preparedTables.get("provider_week_states")!;
    const seenWeekStateIds = new Set<string>();
    const seenWeekStateKeys = new Set<string>();
    for (const rawRow of weekStatesRaw) {
      if (!isPlainObject(rawRow)) continue;
      const providerRef = typeof rawRow.provider_id === "string" ? rawRow.provider_id : "";
      const mappedProvider = providerIdMap.get(providerRef);
      if (!mappedProvider) {
        errors.push(`Tabla provider_week_states: proveedor ${providerRef} no existe`);
        continue;
      }
      const weekRef = typeof rawRow.week_id === "string" ? rawRow.week_id : "";
      const mappedWeek = weekIdMap.get(weekRef);
      if (!mappedWeek) {
        errors.push(`Tabla provider_week_states: semana ${weekRef} no existe`);
        continue;
      }
      const key = `${mappedWeek}::${mappedProvider}`;
      if (seenWeekStateKeys.has(key)) continue;
      const mappedId = ensureId(rawRow.id);
      if (seenWeekStateIds.has(mappedId)) continue;
      const sanitized: Record<string, unknown> = {
        ...rawRow,
        id: mappedId,
        provider_id: mappedProvider,
        week_id: mappedWeek,
        tenant_id: tenantId,
        branch_id: targetBranchId,
      };
      applyDrops(sanitized, weekStatesCfg);
      targetTable.push(sanitized);
      seenWeekStateKeys.add(key);
      seenWeekStateIds.add(mappedId);
    }
  }

  const ordersCfg = IMPORT_TABLE_LOOKUP.get("orders")!;
  const ordersRaw = ensureArray<Record<string, unknown>>(tables.orders);
  if (ordersRaw.length) {
    const targetTable = preparedTables.get("orders")!;
    for (const rawRow of ordersRaw) {
      if (!isPlainObject(rawRow)) continue;
      const providerRef = typeof rawRow.provider_id === "string" ? rawRow.provider_id : "";
      const mappedProvider = providerIdMap.get(providerRef);
      if (!mappedProvider) {
        errors.push(`Tabla orders: Proveedor ${providerRef} no existe`);
        continue;
      }
      const originalId = ensureId(rawRow.id);
      const mappedOrderId = uuid();
      orderIdMap.set(originalId, mappedOrderId);
      orderIdMap.set(mappedOrderId, mappedOrderId);
      const sanitized: Record<string, unknown> = {
        ...rawRow,
        id: mappedOrderId,
        provider_id: mappedProvider,
        tenant_id: tenantId,
        branch_id: targetBranchId,
      };
      applyDrops(sanitized, ordersCfg);
      targetTable.push(sanitized);
    }
  }

  const itemsCfg = IMPORT_TABLE_LOOKUP.get("order_items")!;
  const itemsRaw = ensureArray<Record<string, unknown>>(tables.order_items);
  if (itemsRaw.length) {
    const targetTable = preparedTables.get("order_items")!;
    for (const rawRow of itemsRaw) {
      if (!isPlainObject(rawRow)) continue;
      const orderRef = typeof rawRow.order_id === "string" ? rawRow.order_id : "";
      const mappedOrder = orderIdMap.get(orderRef);
      if (!mappedOrder) {
        errors.push(`Tabla order_items: Pedido ${orderRef} no existe`);
        continue;
      }
      const sanitized: Record<string, unknown> = {
        ...rawRow,
        order_id: mappedOrder,
        tenant_id: tenantId,
        branch_id: targetBranchId,
      };
      applyDrops(sanitized, itemsCfg);
      targetTable.push(sanitized);
    }
  }

  const snapshotsCfg = IMPORT_TABLE_LOOKUP.get("order_snapshots")!;
  const snapshotsRaw = ensureArray<Record<string, unknown>>(tables.order_snapshots);
  if (snapshotsRaw.length) {
    const targetTable = preparedTables.get("order_snapshots")!;
    for (const rawRow of snapshotsRaw) {
      if (!isPlainObject(rawRow)) continue;
      const orderRef = typeof rawRow.order_id === "string" ? rawRow.order_id : "";
      const mappedOrder = orderIdMap.get(orderRef);
      if (!mappedOrder) {
        errors.push(`Tabla order_snapshots: Pedido ${orderRef} no existe`);
        continue;
      }
      const sanitized: Record<string, unknown> = {
        ...rawRow,
        order_id: mappedOrder,
      };
      if (snapshotsCfg.forceTenant) sanitized.tenant_id = tenantId;
      applyDrops(sanitized, snapshotsCfg);
      targetTable.push(sanitized);
    }
  }

  const uiStateCfg = IMPORT_TABLE_LOOKUP.get("order_ui_state")!;
  const uiStateRaw = ensureArray<Record<string, unknown>>(tables.order_ui_state);
  if (uiStateRaw.length) {
    const targetTable = preparedTables.get("order_ui_state")!;
    for (const rawRow of uiStateRaw) {
      if (!isPlainObject(rawRow)) continue;
      const orderRef = typeof rawRow.order_id === "string" ? rawRow.order_id : "";
      const mappedOrder = orderIdMap.get(orderRef);
      if (!mappedOrder) {
        errors.push(`Tabla order_ui_state: Pedido ${orderRef} no existe`);
        continue;
      }
      const sanitized: Record<string, unknown> = {
        ...rawRow,
        order_id: mappedOrder,
      };
      applyDrops(sanitized, uiStateCfg);
      targetTable.push(sanitized);
    }
  }

  const orderSummaryCfg = IMPORT_TABLE_LOOKUP.get("order_summaries")!;
  const orderSummaryRaw = ensureArray<Record<string, unknown>>(tables.order_summaries);
  if (orderSummaryRaw.length) {
    const targetTable = preparedTables.get("order_summaries")!;
    const summariesByProvider = new Map<string, Record<string, unknown>>();
    for (const rawRow of orderSummaryRaw) {
      if (!isPlainObject(rawRow)) continue;
      const providerRef = typeof rawRow.provider_id === "string" ? rawRow.provider_id : "";
      const mappedProvider = providerIdMap.get(providerRef);
      if (!mappedProvider) {
        errors.push(`Tabla order_summaries: Proveedor ${providerRef} no existe`);
        continue;
      }
      const sanitized: Record<string, unknown> = {
        ...rawRow,
        provider_id: mappedProvider,
      };
      if (!sanitized.updated_at) sanitized.updated_at = new Date().toISOString();
      applyDrops(sanitized, orderSummaryCfg);

      const prev = summariesByProvider.get(mappedProvider);
      if (!prev) {
        summariesByProvider.set(mappedProvider, sanitized);
        continue;
      }
      const prevTs = toTimestamp(prev.updated_at ?? prev.created_at ?? null);
      const nextTs = toTimestamp(sanitized.updated_at ?? sanitized.created_at ?? null);
      if (nextTs >= prevTs) summariesByProvider.set(mappedProvider, sanitized);
    }
    targetTable.push(...summariesByProvider.values());
  }

  const orderWeekCfg = IMPORT_TABLE_LOOKUP.get("order_summaries_week")!;
  const orderWeekRaw = ensureArray<Record<string, unknown>>(tables.order_summaries_week);
  if (orderWeekRaw.length) {
    const targetTable = preparedTables.get("order_summaries_week")!;
    const summariesByKey = new Map<string, Record<string, unknown>>();
    for (const rawRow of orderWeekRaw) {
      if (!isPlainObject(rawRow)) continue;
      const providerRef = typeof rawRow.provider_id === "string" ? rawRow.provider_id : "";
      const mappedProvider = providerIdMap.get(providerRef);
      if (!mappedProvider) {
        errors.push(`Tabla order_summaries_week: Proveedor ${providerRef} no existe`);
        continue;
      }
      const weekRef = typeof rawRow.week_id === "string" ? rawRow.week_id : "";
      const mappedWeek = weekIdMap.get(weekRef);
      if (!mappedWeek) {
        errors.push(`Tabla order_summaries_week: Semana ${weekRef} no existe`);
        continue;
      }
      const key = `${mappedWeek}::${mappedProvider}`;
      const sanitized: Record<string, unknown> = {
        ...rawRow,
        provider_id: mappedProvider,
        week_id: mappedWeek,
      };
      if (!sanitized.updated_at) sanitized.updated_at = new Date().toISOString();
      applyDrops(sanitized, orderWeekCfg);

      const prev = summariesByKey.get(key);
      if (!prev) {
        summariesByKey.set(key, sanitized);
        continue;
      }
      const prevTs = toTimestamp(prev.updated_at ?? prev.created_at ?? null);
      const nextTs = toTimestamp(sanitized.updated_at ?? sanitized.created_at ?? null);
      if (nextTs >= prevTs) summariesByKey.set(key, sanitized);
    }
    targetTable.push(...summariesByKey.values());
  }

  const appSettingsCfg = IMPORT_TABLE_LOOKUP.get("app_settings")!;
  const appSettingsRaw = ensureArray<Record<string, unknown>>(tables.app_settings);
  if (appSettingsRaw.length) {
    const targetTable = preparedTables.get("app_settings")!;
    for (const rawRow of appSettingsRaw) {
      if (!isPlainObject(rawRow)) continue;
      const keyRaw = typeof rawRow.key === "string" ? rawRow.key : "";
      const scopeKey = keyRaw === "sales_url" ? salesKeyForScope(tenantId, targetBranchId) : keyRaw;
      const sanitized: Record<string, unknown> = {
        ...rawRow,
        key: scopeKey || rawRow.key || SALES_KEY_ROOT,
        tenant_id: tenantId,
        branch_id: targetBranchId,
      };
      applyDrops(sanitized, appSettingsCfg);
      targetTable.push(sanitized);
    }
  }

  for (const cfg of IMPORT_TABLE_SEQUENCE) {
    const rows = preparedTables.get(cfg.key) ?? [];
    if (!rows.length) continue;

    for (let offset = 0; offset < rows.length; offset += IMPORT_CHUNK_SIZE) {
      const chunk = rows.slice(offset, offset + IMPORT_CHUNK_SIZE);
      let error: PostgrestError | null = null;
      if (cfg.conflict) {
        ({ error } = await supabase.from(cfg.table).upsert(chunk, { onConflict: cfg.conflict }));
      } else {
        ({ error } = await supabase.from(cfg.table).upsert(chunk));
      }
      if (error) {
        const message = error.message ?? "Error desconocido";
        errors.push(`Tabla ${cfg.key}: ${message}`);
        break;
      }
    }
  }

  if (errors.length) {
    if (showMessages) await showAlert(`Operación completada con errores:\n${errors.join("\n")}`, true);
  } else if (showMessages) {
    await showAlert("Datos aplicados correctamente.");
  }

  if (targetBranchId === branchId) {
    clearGestockCaches();
    router.refresh();
  }

  return errors.length === 0;
}, [branchId, clearGestockCaches, router, showAlert, supabase, tenantId]);

const applyDropsFactory = (
  tenantId: string,
  branchId: string,
) => (row: Record<string, unknown>, cfg: ImportTableConfig) => {
  if (Array.isArray(cfg.drop)) {
    for (const key of cfg.drop) delete row[key];
  }
  if (cfg.forceTenant) row.tenant_id = tenantId;
  if (cfg.forceBranch) row.branch_id = branchId;
};

const ensureArray = <T,>(value: unknown): T[] => (Array.isArray(value) ? value as T[] : []);

const readPayloadFromFile = async (file: File): Promise<ProvidersExportPayload> => {
  const raw = await file.text();
  const parsed = JSON.parse(raw) as ProvidersExportPayload;
  if (parsed.version !== 1) throw new Error("Versión de exportación no soportada.");
  if (!isPlainObject(parsed.tables)) throw new Error("Formato de tablas inválido en el archivo.");
  return parsed;
};

const cloneSet = <T,>(value: Set<T>) => new Set(Array.from(value));

const ensureName = (name: unknown) => {
  if (typeof name !== "string") return "";
  return stripBranchSuffix(name.trim());
};

const ensureId = (value: unknown) => (typeof value === "string" && value.length ? value : uuid());

interface ApplyPayloadOptions {
  target: { id: string; slug: string | null };
  showMessages?: boolean;
}

const isValidTables = (tables: unknown): tables is Record<string, unknown> =>
  typeof tables === "object" && tables != null && !Array.isArray(tables);

const PROVIDER_TABLES = [
  "providers",
  "provider_weeks",
  "provider_week_providers",
  "provider_week_states",
] as const;

const ORDER_TABLES = [
  "orders",
  "order_items",
  "order_snapshots",
  "order_ui_state",
  "order_summaries",
  "order_summaries_week",
] as const;

const buildNameKey = (name: string) => stripBranchSuffix(name).toLowerCase();

  // Para repetir: exportá en el proyecto anterior (gestock-v2) y seleccioná aquí el .json resultante.
  const handleImportFile = React.useCallback(async (file: File) => {
    if (!tenantId || !branchId) {
      await showAlert("Seleccioná una sucursal antes de importar.");
      return;
    }
    if (!file) return;

    setImportingData(true);
    try {
      const raw = await file.text();

      let parsed: ProvidersExportPayload;
      try {
        parsed = JSON.parse(raw) as ProvidersExportPayload;
      } catch {
        throw new Error("El archivo no es un JSON válido.");
      }

      if (parsed.version !== 1) {
        throw new Error("Versión de exportación no soportada.");
      }

      if (!isPlainObject(parsed.tables)) {
        throw new Error("Formato de tablas inválido en el archivo importado.");
      }

      await applyProvidersPayload(parsed, {
        target: { id: branchId, slug: branch ?? null },
        showMessages: true,
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      await showAlert(`No se pudo importar el archivo.\n${message}`, true);
    } finally {
      setImportingData(false);
      if (importInputRef.current) importInputRef.current.value = "";
    }
  }, [applyProvidersPayload, branch, branchId, showAlert, tenantId]);
  const onImportFileChange = React.useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) void handleImportFile(file);
  }, [handleImportFile]);

const buildExportPayload = React.useCallback(async (
    target: { id: string; slug: string | null } | null,
  ): Promise<ProvidersExportPayload | null> => {
    if (!tenantId || !branchId) {
      await showAlert("Seleccioná una sucursal antes de copiar.");
      return null;
    }
    const targetBranch = target ?? { id: branchId, slug: branch ?? null };
    try {
      const payload: ProvidersExportPayload = {
        version: 1,
        exportedAt: new Date().toISOString(),
        source: "gestock/proveedores",
        tables: {},
      };

      const supa = supabase;
      const targetSlug = targetBranch.slug?.trim() || "";

      const ensureScope = (row: Record<string, unknown>) => {
        const cleanName = typeof row.name === "string" ? stripBranchSuffix(row.name) : undefined;
        return {
          ...row,
          ...(cleanName ? { name: cleanName } : {}),
          tenant_id: (row.tenant_id as string | null | undefined) ?? tenantId,
          branch_id: targetBranch.id,
        };
      };

      const fetchScoped = async <T extends Record<string, unknown>>(table: string) => {
        let query = supa
          .from(table)
          .select("*")
          .eq("tenant_id", tenantId);

        if (BRANCH_SCOPED_TABLES.has(table)) {
          if (branchId) {
            query = query.or(`branch_id.eq.${branchId},branch_id.is.null`);
          } else {
            query = query.is("branch_id", null);
          }
        }

        const { data, error } = await query;
        if (error) {
          if (isMissingTableError(error)) return [] as T[];
          throw error;
        }
        return (data ?? []) as T[];
      };

      const providersRaw = (await fetchScoped("providers")) as Array<Record<string, unknown>>;
      const providers = providersRaw.map(ensureScope);
      if (!providers.length) {
        await showAlert("No hay proveedores en esta sucursal para copiar.");
        return null;
      }
      payload.tables.providers = providers;

      const providerIds = providersRaw
        .map((p) => (typeof p.id === "string" ? p.id : null))
        .filter((id): id is string => Boolean(id && id.length));

      const providerWeeks = (await fetchScoped("provider_weeks")).map(ensureScope);
      if (providerWeeks.length) payload.tables.provider_weeks = providerWeeks;

      const providerWeekProviders = (await fetchScoped("provider_week_providers")).map(ensureScope);
      if (providerWeekProviders.length) payload.tables.provider_week_providers = providerWeekProviders;

      const providerWeekStates = (await fetchScoped("provider_week_states")).map(ensureScope);
      if (providerWeekStates.length) payload.tables.provider_week_states = providerWeekStates;

      let orders: Record<string, unknown>[] = [];
      if (providerIds.length) {
        for (const table of ORDER_TABLE_CANDIDATES) {
          let query = supa
            .from(table)
            .select("*")
            .in("provider_id", providerIds)
            .eq("tenant_id", tenantId);

          if (BRANCH_SCOPED_TABLES.has(table)) {
            if (branchId) {
              query = query.or(`branch_id.eq.${branchId},branch_id.is.null`);
            } else {
              query = query.is("branch_id", null);
            }
          }

          const { data, error } = await query;
          if (error) {
            if (isMissingTableError(error)) continue;
            throw error;
          }
          if (data && data.length) {
            orders = data.map((row: any) => ensureScope(row));
            break;
          }
        }
        if (orders.length) payload.tables.orders = orders;
      }

      const orderIds = orders
        .map((o) => (typeof o.id === "string" ? o.id : null))
        .filter((id): id is string => Boolean(id && id.length));

      if (orderIds.length) {
        for (const table of ITEM_TABLE_CANDIDATES) {
          const { data, error } = await supa
            .from(table)
            .select("*")
            .in("order_id", orderIds);
          if (error) {
            if (isMissingTableError(error)) continue;
            throw error;
          }
          if (data && data.length) {
            payload.tables.order_items = data.map((row: any) => ensureScope(row));
            break;
          }
        }

        const { data: snapshots, error: snapErr } = await supa
          .from("order_snapshots")
          .select("*")
          .in("order_id", orderIds)
          .order("created_at", { ascending: true });
        if (snapErr && !isMissingTableError(snapErr)) throw snapErr;
        if (snapshots?.length) payload.tables.order_snapshots = snapshots.map((row: any) => ensureScope(row));

        const { data: uiState, error: uiErr } = await supa
          .from("order_ui_state")
          .select("*")
          .in("order_id", orderIds);
        if (uiErr && !isMissingTableError(uiErr)) throw uiErr;
        if (uiState?.length) payload.tables.order_ui_state = uiState.map((row: any) => ensureScope(row));
      }

      if (providerIds.length) {
        const { data: orderSummaries, error: sumErr } = await supa
          .from("order_summaries")
          .select("*")
          .in("provider_id", providerIds);
        if (sumErr && !isMissingTableError(sumErr)) throw sumErr;
        if (orderSummaries?.length) payload.tables.order_summaries = orderSummaries.map((row: any) => ensureScope(row));

        const { data: orderSummariesWeek, error: sumWeekErr } = await supa
          .from("order_summaries_week")
          .select("*")
          .in("provider_id", providerIds);
        if (sumWeekErr && !isMissingTableError(sumWeekErr)) throw sumWeekErr;
        if (orderSummariesWeek?.length) payload.tables.order_summaries_week = orderSummariesWeek.map((row: any) => ensureScope(row));
      }

      const appSettings = (await fetchScoped("app_settings")).map((row: any) => ensureScope(row));
      if (appSettings.length) payload.tables.app_settings = appSettings;

      return payload;
    } catch (err) {
      console.error("copy error", err);
      const message = err instanceof Error ? err.message : String(err);
      await showAlert(`No se pudieron copiar los datos.\n${message}`);
      return null;
    }
  }, [branchId, branch, slug, supabase, tenantId]);

  const handleSaveSnapshot = React.useCallback(async () => {
    if (!tenantId || !branchId) {
      await showAlert("Seleccioná una sucursal antes de guardar la copia.");
      return;
    }
    setSavingBackup(true);
    try {
      const snapshot = await buildExportPayload({ id: branchId, slug: branch ?? null });
      if (!snapshot) return;
      const ok = await persistBranchSnapshot(snapshot);
      if (ok) {
        await showAlert("Copia guardada correctamente.");
      }
    } finally {
      setSavingBackup(false);
    }
  }, [branch, branchId, buildExportPayload, persistBranchSnapshot, showAlert, tenantId]);

  const handleRestoreSnapshot = React.useCallback(async () => {
    if (!tenantId || !branchId) {
      await showAlert("Seleccioná una sucursal antes de restaurar.");
      return;
    }
    setRestoringBackup(true);
    try {
      const snapshot = await fetchBranchSnapshot();
      if (!snapshot) return;
      const applied = await applyProvidersPayload(snapshot, {
        target: { id: branchId, slug: branch ?? null },
        showMessages: false,
      });
      if (applied) {
        clearGestockCaches();
        await showAlert("Configuración restaurada correctamente.");
        await loadBackupInfo();
      } else {
        await showAlert("No se pudo restaurar la configuración. Reintentá más tarde.");
      }
    } finally {
      setRestoringBackup(false);
    }
  }, [applyProvidersPayload, branch, branchId, clearGestockCaches, fetchBranchSnapshot, loadBackupInfo, showAlert, tenantId]);

  const loadBranches = React.useCallback(async () => {
    if (!tenantId) return [] as Array<{ id: string; slug: string | null; name: string | null }>;
    const { data, error } = await supabase
      .from("branches")
      .select("id, slug, name")
      .eq("tenant_id", tenantId)
      .order("name", { ascending: true });
    if (error) throw error;
    const rows = (data ?? []) as Array<{ id: string; slug: string | null; name: string | null }>;
    return rows.map((row) => ({ id: row.id, slug: row.slug ?? null, name: row.name ?? row.slug ?? row.id }));
  }, [supabase, tenantId]);

  const openExportDialog = React.useCallback(async () => {
    if (!tenantId) {
      await showAlert("Seleccioná una sucursal antes de copiar.");
      return;
    }
    setExportDialogOpen(true);
    setExportBranchId((prev) => prev ?? branchId ?? null);
    if (branchOptions.length === 0 && !loadingBranches) {
      setLoadingBranches(true);
      try {
        const options = await loadBranches();
        setBranchOptions(options);
        if (options.length && !options.some((o) => o.id === (exportBranchId ?? branchId ?? ""))) {
          setExportBranchId(options[0].id);
        }
      } catch (err) {
        console.error("load branches error", err);
        const message = err instanceof Error ? err.message : String(err);
        await showAlert(`No se pudieron cargar las sucursales.\n${message}`);
        setExportDialogOpen(false);
      } finally {
        setLoadingBranches(false);
      }
    }
  }, [branchId, branchOptions.length, exportBranchId, loadBranches, loadingBranches, showAlert, tenantId]);

  const handleConfirmExport = React.useCallback(async () => {
    if (!exportBranchId) {
      await showAlert("Elegí una sucursal destino.");
      return;
    }
    setCopyingData(true);
    try {
      const target = branchOptions.find((opt) => opt.id === exportBranchId)
        ?? { id: exportBranchId, slug: null, name: null };

      if (target.id === branchId) {
        await showAlert("Seleccioná una sucursal distinta para copiar los datos.");
        return;
      }

      const payload = await buildExportPayload({ id: branchId, slug: branch ?? null });
      if (!payload) return;

      const backupOk = await persistBranchSnapshot(payload);
      if (!backupOk) return;

      const applied = await applyProvidersPayload(payload, {
        target: { id: target.id, slug: target.slug ?? null },
        showMessages: true,
      });
      if (!applied) return;

      const restoredSource = await applyProvidersPayload(payload, {
        target: { id: branchId, slug: branch ?? null },
        showMessages: false,
      });
      if (!restoredSource) {
        await showAlert(
          "Los datos se copiaron en la sucursal destino, pero no pudimos sincronizar nuevamente la sucursal original. Revisá Primera Junta o usá 'Restaurar copia'."
        );
      }
      await loadBackupInfo();
      setExportDialogOpen(false);

      const destinationSlug = target.slug ?? null;
      if (!destinationSlug) {
        await showAlert("Los datos se copiaron, pero no encontramos la sucursal destino para abrirla automáticamente.");
        return;
      }

      setCurrentBranch(destinationSlug);
      router.push(`/t/${slug}/b/${destinationSlug}/proveedores`);
    } finally {
      setCopyingData(false);
    }
  }, [applyProvidersPayload, branch, branchId, branchOptions, buildExportPayload, exportBranchId, loadBackupInfo, persistBranchSnapshot, router, setCurrentBranch, showAlert, slug]);

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
    <>
      <Dialog open={exportDialogOpen} onOpenChange={(open) => {
        if (!open) setExportDialogOpen(false);
      }}>
        <DialogContent showCloseButton={!copyingData}>
          <DialogHeader>
            <DialogTitle>Copiar datos a otra sucursal</DialogTitle>
            <DialogDescription>
              Elegí la sucursal destino para copiar los proveedores y pedidos actuales.
            </DialogDescription>
          </DialogHeader>
          {loadingBranches ? (
            <p className="text-sm text-muted-foreground">Cargando sucursales…</p>
          ) : branchOptions.length ? (
            <div className="space-y-3">
              <Select
                value={exportBranchId ?? ""}
                onValueChange={(value) => setExportBranchId(value)}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Elegí la sucursal" />
                </SelectTrigger>
                <SelectContent>
                  {branchOptions.map((opt) => (
                    <SelectItem key={opt.id} value={opt.id}>
                      {opt.name ?? opt.slug ?? opt.id}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">No encontramos sucursales para este tenant.</p>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setExportDialogOpen(false)} disabled={copyingData}>
              Cancelar
            </Button>
            <Button onClick={() => void handleConfirmExport()} disabled={copyingData || !exportBranchId || loadingBranches}>
              {copyingData ? "Copiando…" : "Copiar y abrir"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

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

      {isOwner && (
        <>
          <div className="mb-3 flex flex-wrap items-center justify-end gap-2">
            <input
              ref={importInputRef}
              type="file"
              accept="application/json,.json"
              className="hidden"
              onChange={onImportFileChange}
            />
            <Button
              variant="outline"
              size="sm"
              className="rounded-lg"
              onClick={handleImportClick}
              disabled={importingData}
            >
              {importingData ? "Importando…" : "Importar datos"}
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="rounded-lg"
              onClick={() => { void openExportDialog(); }}
              disabled={copyingData}
            >
              {copyingData ? "Copiando…" : "Copiar datos"}
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="rounded-lg"
              onClick={() => { void handleSaveSnapshot(); }}
              disabled={savingBackup || copyingData || importingData}
            >
              {savingBackup ? "Guardando…" : "Guardar copia"}
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="rounded-lg"
              onClick={() => { void handleRestoreSnapshot(); }}
              disabled={restoringBackup || copyingData}
            >
              {restoringBackup ? "Restaurando…" : "Restaurar copia"}
            </Button>
          </div>

          <div className="mb-4 text-right text-xs text-muted-foreground">
            {loadingBackupMeta
              ? "Consultando últimas copias…"
              : `Última copia: ${formatBackupTimestamp(backupMeta?.updatedAt ?? null)}`}
          </div>
        </>
      )}

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
                            const qs = new URLSearchParams();
                            if (p.name) qs.set("name", p.name);
                            if (selectedWeek?.id) qs.set("week", selectedWeek.id);
                            if (branch) qs.set("branch", branch);
                            if (branchId) qs.set("branchId", branchId);
                            if (tenantId) qs.set("tenantId", tenantId);
                            const qsString = qs.toString();
                            router.push(qsString ? `${basePath}?${qsString}` : basePath);
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
    </>
  );
}
