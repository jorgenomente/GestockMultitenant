"use client";

export const dynamic = "force-dynamic";

import React from "react";
import * as XLSX from "xlsx";
import { getSupabaseBrowserClient } from "@/lib/supabaseClient";
import { useBranch } from "@/components/branch/BranchProvider";
import type { RealtimePostgresChangesPayload } from "@supabase/supabase-js";
/* UI */
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Check,
  Trash2,
  Archive,
  History as HistoryIcon,
  Snowflake,
  ChevronDown,
  ChevronRight,
  X as XIcon,
  Search as SearchIcon,
  ChevronUp,
} from "lucide-react";

/* =================== Config =================== */
const PRECIOS_URL = "/precios.xlsx";
const LS_KEY_BASE = "gestock:vencimientos:v5";
const LS_COMPACT_KEY_BASE = "gestock:vencimientos:compact:v1";
const LS_ARCHIVE_KEY_BASE = "gestock:vencimientos:archive:v1";

/* ===== NEW: Outbox ===== */
const LS_OUTBOX_KEY_BASE = "gestock:vencimientos:outbox:v1";

/* =================== Tipos =================== */
type ExpItem = {
  id: string;
  name: string;
  expDate: string;   // dd-mm-aa
  qty: number;
  confirmed: boolean;
  freezer?: boolean;
  updatedAt: number;
};

type ArchivedItem = {
  id: string;
  sourceId?: string | null;
  name: string;
  expDate: string;
  qty: number;
  confirmed: boolean;
  freezer?: boolean;
  archivedAt: number;
};

type ExpRow = {
  id: string;
  name: string;
  exp_date: string;
  qty: number;
  confirmed: boolean;
  freezer?: boolean | null;
  updated_at?: string | null;
};

type ExpArchiveRow = {
  id: string;
  source_id?: string | null;
  name: string;
  exp_date: string;
  qty: number;
  confirmed: boolean;
  freezer?: boolean | null;
  archived_at: string | null;
};

type Draft = (
  Partial<Pick<ExpItem, "name" | "expDate" | "freezer">> & {
    qty?: number | ""; // "" = usuario borró y todavía no escribió número
  }
);

/* Outbox */
type OutboxOp = "insert" | "update" | "delete";
type OutboxEntry = {
  op: OutboxOp;
  item?: ExpItem;
  id?: string;
  ts: number;
  tenantId?: string | null;
  branchId?: string | null;
};

/* =================== Utils =================== */
const NBSP_RX = /[\u00A0\u202F]/g;
const hasFreezerErr = (msg?: string) =>
  !!msg && /freezer/i.test(msg) && /column|schema/i.test(msg);

function normText(s: string) {
  return s
    .replace(NBSP_RX, " ")
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
}

function maskDdMmAaLoose(raw: string) {
  const digits = raw.replace(/\D/g, "").slice(0, 6);
  if (digits.length === 0) return "";
  if (digits.length <= 2) return digits;
  if (digits.length <= 4) return `${digits.slice(0, 2)}-${digits.slice(2)}`;
  let mm = digits.slice(2, 4);
  if (mm.length === 2) {
    let m = parseInt(mm, 10); if (!Number.isFinite(m)) m = 1;
    m = Math.min(12, Math.max(1, m)); mm = String(m).padStart(2, "0");
  }
  return `${digits.slice(0, 2)}-${mm}-${digits.slice(4, 6)}`;
}
function maskWithCaretLoose(prev: string, nextRaw: string, selStart: number) {
  const beforeDigits = nextRaw.slice(0, selStart).replace(/\D/g, "");
  const masked = maskDdMmAaLoose(nextRaw);
  let target = beforeDigits.length, caret = 0, seen = 0;
  for (let i = 0; i < masked.length; i++) {
    if (/\d/.test(masked[i])) { seen++; if (seen === target) { caret = i + 1; break; } }
  }
  if (target === 0) caret = 0;
  return { masked, caret };
}
function isValidDdMmAa(s: string) {
  if (!/^\d{2}-\d{2}-\d{2}$/.test(s)) return false;
  const [dd, mm] = s.split("-").map((x) => parseInt(x, 10));
  return mm >= 1 && mm <= 12 && dd >= 1 && dd <= 31;
}
function parseDdMmAaToDate(s: string): Date | null {
  const m = /^(\d{2})-(\d{2})-(\d{2})$/.exec(s); if (!m) return null;
  const dd = +m[1], mm = +m[2], aa = +m[3], y = 2000 + aa;
  const d = new Date(y, mm - 1, dd);
  return d.getFullYear() === y && d.getMonth() === mm - 1 && d.getDate() === dd ? d : null;
}
function startOfDay(d: Date) { return new Date(d.getFullYear(), d.getMonth(), d.getDate()); }
function daysUntil(expStr: string): number | null {
  const d = parseDdMmAaToDate(expStr); if (!d) return null;
  return Math.floor((startOfDay(d).getTime() - startOfDay(new Date()).getTime()) / 86400000);
}
type Severity = "red" | "orange" | "green" | "unknown";
function getSeverity(expStr: string): Severity {
  const left = daysUntil(expStr);
  if (left === null) return "unknown";
  if (left <= 1) return "red";
  if (left >= 2 && left <= 5) return "orange";
  return "green";
}
function isExpired(expStr: string) { const l = daysUntil(expStr); return l !== null && l < 0; }
function severityAccentColor(sev: Severity): string {
  switch (sev) {
    case "red":
      return "var(--color-alert)";
    case "orange":
      return "var(--color-action-secondary)";
    case "green":
      return "var(--color-success)";
    default:
      return "var(--border)";
  }
}
function severityLabel(expStr: string) {
  const left = daysUntil(expStr);
  if (left === null) return "Fecha inválida";
  if (left < 0) return `Vencido hace ${Math.abs(left)} d`;
  if (left === 0) return "Vence hoy";
  if (left === 1) return "Vence mañana";
  return `Faltan ${left} d`;
}
function epoch(d: Date | string) { return typeof d === "string" ? new Date(d).getTime() : d.getTime(); }
function mergeByIdPreferNewer(local: ExpItem[], remote: ExpItem[]) {
  const map = new Map<string, ExpItem>();
  local.forEach((it) => map.set(it.id, it));
  remote.forEach((it) => {
    const prev = map.get(it.id);
    map.set(it.id, !prev ? it : ((it.updatedAt ?? 0) > (prev.updatedAt ?? 0) ? it : prev));
  });
  return Array.from(map.values());
}
function downloadJSON(filename: string, data: unknown) {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob); const a = document.createElement("a");
  a.href = url; a.download = filename; a.click(); URL.revokeObjectURL(url);
}
function downloadArchivesXLSX(rows: ArchivedItem[]) {
  const data = rows.map((r) => ({
    Producto: r.name,
    Cantidad: r.qty,
    "Vencimiento (dd-mm-aa)": r.expDate,
    Freezer: r.freezer ? "Sí" : "No",
    "Cambios aplicados": r.confirmed ? "Sí" : "No",
    "Archivado el": new Date(r.archivedAt).toLocaleString(),
    "ID origen": r.sourceId ?? "",
  }));
  const ws = XLSX.utils.json_to_sheet(data);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Archivados");
  XLSX.writeFile(wb, `vencimientos-archivados-${new Date().toISOString().slice(0,10)}.xlsx`);
}

/* =================== Page =================== */
export default function VencimientosPage() {
  const { tenantId, currentBranch } = useBranch();
  const branchId = currentBranch?.id ?? null;
  const supabaseRef = React.useRef(getSupabaseBrowserClient());

  const storageSuffix = React.useMemo(() => (
    tenantId && branchId ? `:${tenantId}:${branchId}` : null
  ), [tenantId, branchId]);

  const lsKey = React.useMemo(() => (
    storageSuffix ? `${LS_KEY_BASE}${storageSuffix}` : null
  ), [storageSuffix]);
  const lsArchiveKey = React.useMemo(() => (
    storageSuffix ? `${LS_ARCHIVE_KEY_BASE}${storageSuffix}` : null
  ), [storageSuffix]);
  const lsOutboxKey = React.useMemo(() => (
    storageSuffix ? `${LS_OUTBOX_KEY_BASE}${storageSuffix}` : null
  ), [storageSuffix]);
  const lsCompactKey = React.useMemo(() => (
    storageSuffix ? `${LS_COMPACT_KEY_BASE}${storageSuffix}` : null
  ), [storageSuffix]);

  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [supabaseStatus, setSupabaseStatus] =
    React.useState<"online" | "offline" | "unknown">("unknown");

  // columnas opcionales
  const [hasFreezerCol, setHasFreezerCol] = React.useState<boolean>(true);
  const [hasArchiveFreezerCol, setHasArchiveFreezerCol] = React.useState<boolean>(true);

  const [compact, setCompact] = React.useState<boolean>(true);
  React.useEffect(() => {
    if (!lsCompactKey) return;
    try {
      const raw = localStorage.getItem(lsCompactKey);
      if (raw !== null) {
        const parsed = JSON.parse(raw);
        if (typeof parsed === "boolean") setCompact(parsed);
        else setCompact(true);
      } else {
        setCompact(true);
      }
    } catch {
      setCompact(true);
    }
  }, [lsCompactKey]);
  React.useEffect(() => {
    if (!lsCompactKey) return;
    try { localStorage.setItem(lsCompactKey, JSON.stringify(compact)); } catch {}
  }, [compact, lsCompactKey]);

  // Buscador global
  const [searchQuery, setSearchQuery] = React.useState("");

  // Autocomplete
  const [suggestions, setSuggestions] = React.useState<string[]>([]);
  const suggestionsRef = React.useRef<string[]>([]);
  const autoBoxRef = React.useRef<HTMLDivElement>(null);
  const [openDrop, setOpenDrop] = React.useState(false);
  const [activeIdx, setActiveIdx] = React.useState<number>(-1);

  // Drafts
  const [drafts, setDrafts] = React.useState<Record<string, Draft>>({});
  function getDraftValue<T>(id: string, key: keyof Draft, fallback: T): T {
    const d = drafts[id];
    return (d && d[key] !== undefined ? (d[key] as T) : fallback) as T;
  }
  function setDraft(id: string, patch: Draft) {
    setDrafts((prev) => ({ ...prev, [id]: { ...(prev[id] || {}), ...patch } }));
  }
  function clearDraft(id: string) {
    setDrafts((prev) => { const n = { ...prev }; delete n[id]; return n; });
  }

  // alta
  const [name, setName] = React.useState("");
  const [expDate, setExpDate] = React.useState("");
  const [qty, setQty] = React.useState<number | "">(1);
  const [newFreezer, setNewFreezer] = React.useState<boolean>(false);

  const [items, setItems] = React.useState<ExpItem[]>([]);
  const [archives, setArchives] = React.useState<ArchivedItem[]>([]);
  const [showArchivePanel, setShowArchivePanel] = React.useState(false);
  const [archiveErr, setArchiveErr] = React.useState<string | null>(null);
  const [archiveQuery, setArchiveQuery] = React.useState("");

  React.useEffect(() => {
    if (!lsArchiveKey) { setArchives([]); return; }
    try {
      const raw = localStorage.getItem(lsArchiveKey);
      setArchives(raw ? JSON.parse(raw) as ArchivedItem[] : []);
    } catch {
      setArchives([]);
    }
  }, [lsArchiveKey]);

  React.useEffect(() => {
    if (!lsArchiveKey) return;
    try { localStorage.setItem(lsArchiveKey, JSON.stringify(archives)); } catch {}
  }, [archives, lsArchiveKey]);

  /* ===== Helpers persistentes dentro del componente ===== */
  function setItemsLocal(updater: (prev: ExpItem[]) => ExpItem[]) {
    setItems((prev) => {
      const next = updater(prev);
      if (lsKey) {
        try { localStorage.setItem(lsKey, JSON.stringify(next)); } catch {}
      }
      return next;
    });
  }
  function readOutbox(): OutboxEntry[] {
    if (!lsOutboxKey) return [];
    try { return JSON.parse(localStorage.getItem(lsOutboxKey) || "[]"); } catch { return []; }
  }
  function writeOutbox(entries: OutboxEntry[]) {
    if (!lsOutboxKey) return;
    try { localStorage.setItem(lsOutboxKey, JSON.stringify(entries)); } catch {}
  }
  function pushOutbox(entry: OutboxEntry) {
    if (!lsOutboxKey) return;
    const enriched: OutboxEntry = {
      ...entry,
      tenantId: entry.tenantId ?? tenantId ?? null,
      branchId: entry.branchId ?? branchId ?? null,
    };
    const cur = readOutbox();
    cur.push(enriched);
    writeOutbox(cur);
  }
  function adoptLocalTmpAsOutbox(localItems: ExpItem[]) {
    if (!lsOutboxKey) return;
    if (!tenantId || !branchId) return;
    const queue = readOutbox();
    const hasTmp = localItems.filter((it) => it.id.startsWith("tmp_"));
    let changed = false;
    for (const it of hasTmp) {
      const already = queue.some((e) => e.op === "insert" && e.item?.id === it.id);
      if (!already) {
        queue.push({ op: "insert", item: it, ts: Date.now(), tenantId, branchId });
        changed = true;
      }
    }
    if (changed) writeOutbox(queue);
  }
  async function syncOutbox() {
    const supabase = supabaseRef.current;
    if (!supabase || supabaseStatus !== "online") return;
    if (!lsOutboxKey) return;
    let queue = readOutbox();
    if (queue.length === 0) return;

    queue.sort((a, b) => a.ts - b.ts);
    const next: OutboxEntry[] = [];

    for (const e of queue) {
      try {
        const entryTenantId = e.tenantId ?? tenantId;
        const entryBranchId = e.branchId ?? branchId;
        if ((e.op === "insert" || e.op === "delete" || e.op === "update") && (!entryTenantId || !entryBranchId)) {
          next.push(e);
          continue;
        }
        if (e.op === "insert" && e.item) {
          const payload: any = {
            name: e.item.name,
            exp_date: e.item.expDate,
            qty: e.item.qty,
            confirmed: !!e.item.confirmed,
            tenant_id: entryTenantId,
            branch_id: entryBranchId,
          };
          if (e.item.freezer !== undefined) payload.freezer = !!e.item.freezer;

          const { data, error } = await supabase.from("expirations").insert(payload).select("*").single();
          if (error) throw error;

          const newId = data.id;
          setItemsLocal((prev) =>
            prev.map((x) =>
              x.id === e.item!.id
                ? {
                    id: newId,
                    name: data.name,
                    expDate: data.exp_date,
                    qty: data.qty,
                    confirmed: !!data.confirmed,
                    freezer: !!data.freezer,
                    updatedAt: epoch(data.updated_at),
                  }
                : x
            )
          );
        } else if (e.op === "update" && e.item) {
          const upd: any = {
            name: e.item.name,
            exp_date: e.item.expDate,
            qty: e.item.qty,
            confirmed: e.item.confirmed,
          };
          if (e.item.freezer !== undefined) upd.freezer = e.item.freezer;
          const { error } = await supabase
            .from("expirations")
            .update(upd)
            .eq("id", e.item.id)
            .eq("tenant_id", entryTenantId)
            .eq("branch_id", entryBranchId);
          if (error) throw error;
        } else if (e.op === "delete" && e.id) {
          const { error } = await supabase
            .from("expirations")
            .delete()
            .eq("id", e.id)
            .eq("tenant_id", entryTenantId)
            .eq("branch_id", entryBranchId);
          if (error) throw error;
        }
        // éxito → no se re-agrega
      } catch {
        next.push(e);
      }
    }
    writeOutbox(next);
  }

  /* ---------- Carga local + migración ---------- */
  React.useEffect(() => {
    if (!lsKey) {
      setItems([]);
      return;
    }
    try {
      const raw = localStorage.getItem(lsKey);
      if (raw) {
        const parsed = JSON.parse(raw) as ExpItem[];
        setItems(parsed.map((it) => ({ freezer: false, ...it })));
      } else {
        setItems([]);
      }
    } catch {
      setItems([]);
    }
  }, [lsKey]);

  React.useEffect(() => {
    if (!lsKey) return;
    try { localStorage.setItem(lsKey, JSON.stringify(items)); } catch {}
  }, [items, lsKey]);

  /* ---------- Precios.xlsx (autocomplete) ---------- */
  React.useEffect(() => {
    (async () => {
      try {
        const res = await fetch(PRECIOS_URL);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const buf = await res.arrayBuffer();
        const wb = XLSX.read(buf, { type: "array" });
        const ws = wb.Sheets[wb.SheetNames[0]];
        const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(ws, { defval: "" });
        const descKey = Object.keys(rows[0] || {}).find((k) => {
          const nk = normText(String(k));
          return nk === "descripcion" || nk.includes("descripcion");
        });
        if (!descKey) throw new Error("No se encontró la columna DESCRIPCIÓN");
        const uniq = Array.from(new Set(rows.map((r) => String(r[descKey] ?? "").trim()).filter(Boolean)))
          .sort((a, b) => a.localeCompare(b));
        suggestionsRef.current = uniq;
      } catch (e:any) { setError(e.message || "No pude leer precios.xlsx"); }
    })();
  }, []);

  /* ---------- Supabase: expirations ---------- */
  React.useEffect(() => {
    const supabase = supabaseRef.current;
    if (!supabase || !tenantId || !currentBranch?.id) { setLoading(false); setSupabaseStatus("offline"); return; }
    const branchIdValue = currentBranch.id;

    (async () => {
      setLoading(true);
      const { data, error } = await supabase
        .from("expirations")
        .select("*")
        .eq("tenant_id", tenantId)
        .eq("branch_id", branchIdValue)
        .order("updated_at", { ascending: false });
      if (error) { setError(error.message); setSupabaseStatus("offline"); setLoading(false); return; }

      setHasFreezerCol(!!data?.[0] && Object.prototype.hasOwnProperty.call(data[0], "freezer"));
      const remote = (data ?? []).map((r: any) => ({
        id: r.id, name: r.name, expDate: r.exp_date, qty: r.qty,
        confirmed: !!r.confirmed, freezer: !!r.freezer, updatedAt: epoch(r.updated_at),
      })) as ExpItem[];

      setItemsLocal((prev) => {
        const merged = mergeByIdPreferNewer(prev, remote);
        adoptLocalTmpAsOutbox(merged);
        return merged;
      });
      setSupabaseStatus("online");
      setLoading(false);

      // Adoptar tmp_* antiguos a la cola y sincronizar
      await syncOutbox();
    })();

    const ch = supabase
  .channel(`expirations-${tenantId}-${branchIdValue}`)
  .on(
    "postgres_changes",
    { event: "*", schema: "public", table: "expirations", filter: `tenant_id=eq.${tenantId},branch_id=eq.${branchIdValue}` },
    (payload: RealtimePostgresChangesPayload<ExpRow>) => {
      setSupabaseStatus("online");
      const r = (payload.eventType === "DELETE" ? payload.old : payload.new) as ExpRow;

      if (payload.eventType === "INSERT") {
        setItemsLocal((prev) => {
          if (prev.some((x) => x.id === r.id)) return prev;
          return mergeByIdPreferNewer(prev, [{
            id: r.id,
            name: r.name,
            expDate: r.exp_date,
            qty: r.qty,
            confirmed: !!r.confirmed,
            freezer: !!r.freezer,
            updatedAt: epoch(r.updated_at ?? new Date()),
          }]);
        });
      } else if (payload.eventType === "UPDATE") {
        setItemsLocal((prev) =>
          prev.map((x) =>
            x.id === r.id
              ? {
                  id: r.id,
                  name: r.name,
                  expDate: r.exp_date,
                  qty: r.qty,
                  confirmed: !!r.confirmed,
                  freezer: !!r.freezer,
                  updatedAt: epoch(r.updated_at ?? new Date()),
                }
              : x
          )
        );
        clearDraft(r.id);
      } else if (payload.eventType === "DELETE") {
        setItemsLocal((prev) => prev.filter((x) => x.id !== r.id));
        clearDraft(r.id);
      }
    }
  )
  .subscribe();


    return () => { supabase.removeChannel(ch); };
  }, [tenantId, currentBranch?.id]);

  // Reintentar Outbox al volver online
  React.useEffect(() => { if (supabaseStatus === "online") syncOutbox(); }, [supabaseStatus, tenantId, branchId]);

  /* ---------- Supabase: expirations_archive ---------- */
  React.useEffect(() => {
    const supabase = supabaseRef.current; if (!supabase || !tenantId || !currentBranch?.id) return;
    const branchIdValue = currentBranch.id;
    (async () => {
      const { data, error } = await supabase
        .from("expirations_archive")
        .select("*")
        .eq("tenant_id", tenantId)
        .eq("branch_id", branchIdValue)
        .order("archived_at", { ascending: false });
      if (error) { setArchiveErr(error.message); return; }
      setHasArchiveFreezerCol(!!data?.[0] && Object.prototype.hasOwnProperty.call(data[0], "freezer"));
      const remote = (data ?? []).map((r: any) => ({
        id: r.id, sourceId: r.source_id ?? null, name: r.name, expDate: r.exp_date, qty: r.qty,
        confirmed: !!r.confirmed, freezer: !!r.freezer, archivedAt: epoch(r.archived_at),
      })) as ArchivedItem[];
      if (remote.length > 0) {
        const map = new Map<string, ArchivedItem>();
        [...archives, ...remote].forEach((a) => map.set(a.id, a));
        setArchives(Array.from(map.values()).sort((a,b)=>b.archivedAt-a.archivedAt));
      }
    })();
    
    const ch = supabase
  .channel(`expirations-archive-${tenantId}-${branchIdValue}`)
  .on(
    "postgres_changes",
    { event: "*", schema: "public", table: "expirations_archive", filter: `tenant_id=eq.${tenantId},branch_id=eq.${branchIdValue}` },
    (payload: RealtimePostgresChangesPayload<ExpArchiveRow>) => {
      const r = (payload.eventType === "DELETE" ? payload.old : payload.new) as ExpArchiveRow;

      if (payload.eventType === "INSERT") {
        setArchives((prev) =>
          prev.some((x) => x.id === r.id)
            ? prev
            : [
                {
                  id: r.id,
                  sourceId: r.source_id ?? null,
                  name: r.name,
                  expDate: r.exp_date,
                  qty: r.qty,
                  confirmed: !!r.confirmed,
                  freezer: !!r.freezer,
                  archivedAt: epoch(r.archived_at ?? new Date()),
                },
                ...prev,
              ]
        );
      } else if (payload.eventType === "DELETE") {
        setArchives((prev) => prev.filter((x) => x.id !== r.id));
      }
    }
  )
  .subscribe();

    return () => { supabase.removeChannel(ch); };
  }, [tenantId, currentBranch?.id]);

  /* ---------- Handlers ---------- */
  function updateSuggestions(query: string) {
    const q = normText(query);
    if (!q) { setSuggestions([]); setOpenDrop(false); setActiveIdx(-1); return; }
    const found = suggestionsRef.current.filter((s) => normText(s).includes(q)).slice(0, 20);
    setSuggestions(found);
    setOpenDrop(found.length > 0);
    setActiveIdx(found.length ? 0 : -1);
  }
  function onSelectSuggestion(s: string) { setName(s); setOpenDrop(false); setActiveIdx(-1); }
  function onKeyDownName(e: React.KeyboardEvent<HTMLInputElement>) {
    if (!openDrop || suggestions.length === 0) return;
    if (e.key === "ArrowDown") { e.preventDefault(); setActiveIdx((i) => Math.min(i + 1, suggestions.length - 1)); }
    else if (e.key === "ArrowUp") { e.preventDefault(); setActiveIdx((i) => Math.max(i - 1, 0)); }
    else if (e.key === "Enter") { e.preventDefault(); if (activeIdx >= 0) onSelectSuggestion(suggestions[activeIdx]); }
    else if (e.key === "Escape") { setOpenDrop(false); setActiveIdx(-1); }
  }
  function onChangeQty(e: React.ChangeEvent<HTMLInputElement>) {
    const onlyDigits = e.target.value.replace(/[^\d]/g, "");
    setQty(onlyDigits === "" ? "" : parseInt(onlyDigits, 10));
  }

  async function onAdd() {
    if (!name.trim()) return alert("Ingresá un producto.");
    if (!isValidDdMmAa(expDate)) return alert("Fecha inválida. Usa dd-mm-aa.");
    if (qty === "" || (typeof qty === "number" && qty <= 0)) return alert("Cantidad inválida.");
    if (!tenantId || !branchId) {
      alert("Seleccioná una sucursal válida.");
      return;
    }

    const supabase = supabaseRef.current;
    const tempId = `tmp_${Math.random().toString(36).slice(2, 8)}`;
    const optimistic: ExpItem = {
      id: tempId,
      name: name.trim(),
      expDate,
      qty: Number(qty),
      confirmed: false,
      freezer: !!newFreezer,
      updatedAt: Date.now()
    };

    setItemsLocal((old) => [optimistic, ...old]);

    if (!supabase || supabaseStatus !== "online") {
      // Offline → Outbox insert
      pushOutbox({ op: "insert", item: optimistic, ts: Date.now(), tenantId, branchId });
      onClear();
      return;
    }

    // Online → insert directo
    const payload: any = {
      name: optimistic.name,
      exp_date: optimistic.expDate,
      qty: optimistic.qty,
      confirmed: optimistic.confirmed,
      freezer: optimistic.freezer ?? false,
      tenant_id: tenantId,
      branch_id: branchId,
    };
    let { data, error } = await supabase.from("expirations").insert(payload).select("*").single();
    if (error && hasFreezerErr(error.message)) {
      ({ data, error } = await supabase.from("expirations")
        .insert({
          name: optimistic.name,
          exp_date: optimistic.expDate,
          qty: optimistic.qty,
          confirmed: optimistic.confirmed,
          tenant_id: tenantId,
          branch_id: branchId,
        })
        .select("*").single());
    }
    if (error) {
      // Falla puntual → Outbox
      pushOutbox({ op: "insert", item: optimistic, ts: Date.now(), tenantId, branchId });
      onClear();
      return;
    }
    setItemsLocal((old) => old.map((x) => x.id === tempId
      ? { id: data.id, name: data.name, expDate: data.exp_date, qty: data.qty, confirmed: !!data.confirmed, freezer: !!data.freezer, updatedAt: epoch(data.updated_at) }
      : x));
    onClear();
  }

  function onClear() {
    setName("");
    setExpDate("");
    setQty(1);
    setNewFreezer(false);
    setSuggestions([]);
    setOpenDrop(false);
    setActiveIdx(-1);
  }

  function onEditNameDraft(id: string, value: string) { setDraft(id, { name: value }); }
  function onEditQtyDraft(id: string, e: React.ChangeEvent<HTMLInputElement>) {
    const digits = e.target.value.replace(/[^\d]/g, "");
    setDraft(id, { qty: digits === "" ? "" : parseInt(digits, 10) });
  }
  function onEditExpDateDraft(id: string, e: React.ChangeEvent<HTMLInputElement>) {
    const el = e.currentTarget;
    const selStart = el.selectionStart ?? el.value.length;
    const current = getDraftValue(id, "expDate", items.find((x) => x.id === id)?.expDate ?? "");
    const { masked, caret } = maskWithCaretLoose(current, e.target.value, selStart);
    setDraft(id, { expDate: masked });
    requestAnimationFrame(() => { try { el.setSelectionRange(caret, caret); } catch {} });
  }

  async function updateItemRemote(id: string, patch: Partial<ExpItem>) {
    const supabase = supabaseRef.current;
    if (!tenantId || !branchId) return;

    // Local optimista
    setItemsLocal((prev) =>
      prev.map((it) => (it.id === id ? { ...it, ...patch, updatedAt: Date.now() } : it))
    );

    // Offline → Outbox update
    if (!supabase || supabaseStatus !== "online") {
      const cur = items.find((x) => x.id === id);
      if (cur) pushOutbox({ op: "update", item: { ...cur, ...patch, id }, ts: Date.now(), tenantId, branchId });
      return;
    }

    // Online
    const upd: any = {};
    if (patch.name !== undefined) upd.name = patch.name;
    if (patch.expDate !== undefined) upd.exp_date = patch.expDate;
    if (patch.qty !== undefined) upd.qty = patch.qty;
    if (patch.confirmed !== undefined) upd.confirmed = patch.confirmed;
    if (patch.freezer !== undefined && hasFreezerCol) upd.freezer = patch.freezer;

    let { error } = await supabase
      .from("expirations")
      .update(upd)
      .eq("id", id)
      .eq("tenant_id", tenantId ?? null)
      .eq("branch_id", branchId ?? null);
    if (error && hasFreezerErr(error.message)) {
      const { freezer, ...updBase } = upd;
      ({ error } = await supabase
        .from("expirations")
        .update(updBase)
        .eq("id", id)
        .eq("tenant_id", tenantId ?? null)
        .eq("branch_id", branchId ?? null));
    }
    if (error) {
      const cur = items.find((x) => x.id === id);
      if (cur) pushOutbox({ op: "update", item: { ...cur, ...patch, id }, ts: Date.now(), tenantId, branchId });
    }
  }

  async function applyChanges(id: string) {
    const base = items.find((x) => x.id === id); if (!base) return;
    const d = drafts[id] || {};
    if (d.qty === "") { alert("Ingresá una cantidad válida."); return; }
    const nextQty = typeof d.qty === "number" ? d.qty : base.qty;

    const next: ExpItem = {
      ...base,
      name: d.name ?? base.name,
      expDate: d.expDate ?? base.expDate,
      qty: nextQty,
      freezer: d.freezer ?? base.freezer,
      confirmed: true,
      updatedAt: Date.now(),
    };

    setItemsLocal((prev) => prev.map((it) => (it.id === id ? next : it)));
    clearDraft(id);

    await updateItemRemote(id, {
      name: next.name,
      expDate: next.expDate,
      qty: next.qty,
      freezer: next.freezer,
      confirmed: true,
    });
  }

  async function deleteItem(id: string) {
    if (!tenantId || !branchId) {
      alert("Seleccioná una sucursal válida.");
      return;
    }
    const prev = items;
    // Local
    setItemsLocal((old) => old.filter((it) => it.id !== id));
    clearDraft(id);

    const supabase = supabaseRef.current;
    if (!supabase || supabaseStatus !== "online") {
      pushOutbox({ op: "delete", id, ts: Date.now(), tenantId, branchId });
      return;
    }

    const { error } = await supabase
      .from("expirations")
      .delete()
      .eq("id", id)
      .eq("tenant_id", tenantId)
      .eq("branch_id", branchId);
    if (error) {
      alert("No pude eliminar en servidor: " + error.message);
      setItemsLocal(() => prev); // rollback
    }
  }

  async function toggleFreezer(id: string) {
    const it = items.find((x) => x.id === id); if (!it) return;
    const newVal = !it.freezer;
    setItemsLocal((old) => old.map((x) => (x.id === id ? { ...x, freezer: newVal, confirmed: false } : x)));
    setDraft(id, { freezer: newVal });
    await updateItemRemote(id, { freezer: newVal, confirmed: false });
  }

  async function archiveItem(id: string) {
    const it = items.find((x) => x.id === id); if (!it) return;
    if (!tenantId || !branchId) {
      alert("Seleccioná una sucursal válida.");
      return;
    }
    const effectiveExp = drafts[id]?.expDate ?? it.expDate;
    if (!isExpired(effectiveExp)) return alert("Solo se pueden archivar productos vencidos.");
    const arch: ArchivedItem = {
      id: `tmpa_${Math.random().toString(36).slice(0,8)}`,
      sourceId: it.id,
      name: drafts[id]?.name ?? it.name,
      expDate: effectiveExp,
      qty: typeof drafts[id]?.qty === "number" ? (drafts[id]!.qty as number) : it.qty,
      confirmed: it.confirmed,
      freezer: drafts[id]?.freezer ?? it.freezer,
      archivedAt: Date.now(),
    };
    setArchives((prev) => [arch, ...prev]);
    setItemsLocal((prev) => prev.filter((x) => x.id !== id));
    clearDraft(id);

    const supabase = supabaseRef.current; if (!supabase) return;
    const base: any = {
      source_id: it.id, name: arch.name, exp_date: arch.expDate, qty: arch.qty,
      confirmed: arch.confirmed, archived_at: new Date(arch.archivedAt).toISOString(),
      tenant_id: tenantId,
      branch_id: branchId,
    };
    let payload = hasArchiveFreezerCol ? { ...base, freezer: arch.freezer ?? false } : base;
    let { data, error } = await supabase.from("expirations_archive").insert(payload).select("*").single();
    if (error && hasFreezerErr(error.message)) {
      ({ data, error } = await supabase.from("expirations_archive").insert(base).select("*").single());
    }
    if (error) {
      setArchives((prev) => prev.filter((a) => a.id !== arch.id));
      setItemsLocal((prev) => [it, ...prev]);
      setArchiveErr("No pude archivar en servidor: " + error.message);
      return;
    }
    setArchives((prev) => prev.map((a) => a.id === arch.id ? {
      id: data.id, sourceId: data.source_id ?? null, name: data.name, expDate: data.exp_date, qty: data.qty,
      confirmed: !!data.confirmed, freezer: !!data.freezer, archivedAt: epoch(data.archived_at),
    } : a));

    const del = await supabase
      .from("expirations")
      .delete()
      .eq("id", id)
      .eq("tenant_id", tenantId)
      .eq("branch_id", branchId);
    if (del.error) setArchiveErr("Archivado ok, pero no pude borrar el original: " + del.error.message);
  }

  /* ---------- Derivados: orden, búsqueda y grupos ---------- */
  const sortedItems = React.useMemo(() => {
    return [...items].sort((a, b) => {
      const da = daysUntil(a.expDate), db = daysUntil(b.expDate);
      if (da === null && db === null) return 0;
      if (da === null) return 1;
      if (db === null) return -1;
      return da - db;
    });
  }, [items]);

  const filteredItems = React.useMemo(() => {
    const q = normText(searchQuery);
    if (!q) return sortedItems;
    return sortedItems.filter((it) => {
      const nameShown = getDraftValue(it.id, "name", it.name);
      const expShown  = getDraftValue(it.id, "expDate", it.expDate);
      return normText(nameShown).includes(q) || normText(expShown).includes(q);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sortedItems, searchQuery, drafts]);

  // NUEVA clave de grupo
  type GroupKey = "gx" | "g1" | "g2" | "g3" | "gf"; // gx=vencidos, g1=1-3d, g2=4-10d, g3=11+d/invalid

  function groupKey(it: ExpItem): Exclude<GroupKey,"gf"> {
    const d = daysUntil(it.expDate);
    if (d === null) return "g3";
    if (d < 0) return "gx";        // Vencidos
    if (d >= 1 && d <= 3) return "g1";
    if (d <= 10) return "g2";
    return "g3";
  }

  const groups = React.useMemo(() => {
    const acc: Record<Exclude<GroupKey,"gf">, ExpItem[]> = { gx: [], g1: [], g2: [], g3: [] };
    for (const it of filteredItems) acc[groupKey(it)].push(it);
    return acc;
  }, [filteredItems]);

  const freezerItems = React.useMemo(() => {
    return filteredItems.filter((it) => (drafts[it.id]?.freezer ?? it.freezer) === true);
  }, [filteredItems, drafts]);

  const [open, setOpen] = React.useState<{ gx: boolean; g1: boolean; g2: boolean; g3: boolean; gf: boolean }>({
    gx: true, g1: true, g2: false, g3: false, gf: false,
  });
  function toggle(key: GroupKey) { setOpen((o) => ({ ...o, [key]: !o[key] })); }

  // Clases de tamaños
  const labelCls = compact ? "text-[10px]" : "text-[11px]";
  const inputCls = compact ? "h-8 px-2 text-xs" : "h-9 text-sm";
  const chipCls = compact ? "text-[10px] px-2 py-0.5" : "text-[11px] px-2 py-1";
  const timeCls = compact ? "text-[10px]" : "text-[11px]";

  // Botón flotante: volver arriba
  const ScrollTopFab: React.FC = () => {
    const [visible, setVisible] = React.useState(false);
    React.useEffect(() => {
      const onScroll = () => setVisible(window.scrollY > 300);
      onScroll();
      window.addEventListener("scroll", onScroll, { passive: true });
      return () => window.removeEventListener("scroll", onScroll);
    }, []);
    if (!visible) return null;
    return (
      <Button
        size="icon"
        onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
        aria-label="Volver arriba"
        title="Volver arriba"
        className="fixed right-4 sm:right-6 h-12 w-12 rounded-full shadow-lg z-50"
        style={{ bottom: "calc(env(safe-area-inset-bottom, 0px) + 72px)" }}
      >
        <ChevronUp className="h-6 w-6" />
      </Button>
    );
  };

  /* ---------- Render helpers ---------- */
  const renderItemCard = (it: ExpItem) => {
    const nameShown = getDraftValue(it.id, "name", it.name);
    const expShown  = getDraftValue(it.id, "expDate", it.expDate);
    const qtyShown = getDraftValue<number | "">(it.id, "qty", it.qty);
    const freezerShown = getDraftValue(it.id, "freezer", it.freezer ?? false);

    const sev = getSeverity(expShown);
    const accentColor = severityAccentColor(sev);
    const sevText = severityLabel(expShown);
    const hasDraft = !!drafts[it.id];

    const cardStyle: React.CSSProperties = {
      backgroundColor: "var(--card)",
      borderColor: "var(--border)",
      borderLeftColor: accentColor,
      borderLeftWidth: compact ? 4 : 6,
    };

    const chipStyle: React.CSSProperties = {
      backgroundColor: accentColor,
      color: "var(--card-foreground)",
      borderColor: accentColor,
    };

    return (
      <Card
        key={it.id}
        className={`${compact ? "shadow-none" : "shadow-sm"} border bg-[var(--card)] ${it.confirmed && !hasDraft ? "ring-2 ring-offset-0" : ""}`}
        style={cardStyle}
      >
        <CardContent className={`${compact ? "p-2" : "p-3 pt-0 pb-0"} space-y-2`}>
          {/* Fila 1 */}
          <div className="grid grid-cols-12 gap-2 sm:flex sm:items-center">
            <div className="col-span-12 sm:flex-1">
              <Input
                value={nameShown as string}
                onChange={(e) => onEditNameDraft(it.id, e.target.value)}
                className={`w-full h-10 text-sm sm:h-8 sm:text-sm`}
                aria-label="Producto"
              />
            </div>

            <div className="col-span-6 sm:ml-2 sm:mr-2 sm:shrink-0 sm:self-center">
              <span
                className={`inline-block rounded-full border font-semibold ${chipCls}`}
                title={sevText}
                style={chipStyle}
              >
                {sevText}
              </span>
            </div>

            <div className="col-span-6 sm:ml-auto sm:flex sm:items-center sm:gap-1 justify-end space-x-1">
              <Button
                size="icon"
                variant={freezerShown ? undefined : "secondary"}
                onClick={() => toggleFreezer(it.id)}
                aria-label="Marcar como Freezer"
                title="Marcar como Freezer"
                className={`${compact ? "h-8 w-8" : "h-8 w-8"}`}
                style={freezerShown ? { backgroundColor: "var(--color-action-secondary)", color: "var(--accent-foreground)" } : undefined}
              >
                <Snowflake className="h-4 w-4" />
              </Button>

              {isExpired(expShown) && (
                <Button size="icon" variant="secondary" onClick={() => archiveItem(it.id)}
                  aria-label="Archivar (solo vencidos)" title="Archivar (solo vencidos)"
                  className={`${compact ? "h-8 w-8" : "h-8 w-8"}`}>
                  <Archive className="h-4 w-4" />
                </Button>
              )}

              <Button
                size="icon"
                onClick={() => applyChanges(it.id)}
                aria-label={(!hasDraft && it.confirmed) ? "Cambios aplicados" : "Aplicar cambios"}
                title={(!hasDraft && it.confirmed) ? "Cambios aplicados" : "Aplicar cambios"}
                className={`${compact ? "h-8 w-8" : "h-8 w-8"}`}
                style={{
                  backgroundColor: "var(--color-success)",
                  color: "var(--success-foreground)",
                  opacity: !hasDraft && it.confirmed ? 0.65 : 1,
                }}
              >
                <Check className="h-4 w-4" />
              </Button>

              <Button size="icon" variant="destructive" onClick={() => deleteItem(it.id)}
                aria-label="Eliminar" title="Eliminar" className={`${compact ? "h-8 w-8" : "h-8 w-8"}`}>
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {/* Fila 2 */}
          <div className="grid grid-cols-12 gap-2 items-center">
            <div className="col-span-7 sm:col-span-6">
              <label className={`block text-muted-foreground ${labelCls} mb-0.5`}>
                Vencimiento (dd-mm-aa)
              </label>
              <Input
                inputMode="numeric"
                pattern="[0-9\\-]*"
                value={expShown as string}
                onChange={(e) => onEditExpDateDraft(it.id, e)}
                className={inputCls}
                aria-label="Vencimiento dd-mm-aa"
              />
            </div>

            <div className="col-span-5 sm:col-span-3">
              <label className={`block text-muted-foreground ${labelCls} mb-0.5`}>Cant.</label>
              <Input
                inputMode="numeric"
                pattern="\\d*"
                value={qtyShown === "" ? "" : String(qtyShown)}
                onChange={(e) => onEditQtyDraft(it.id, e)}
                className={inputCls}
                aria-label="Cantidad"
              />
            </div>

            <div className="col-span-12 sm:col-span-3 text-right">
              <p className={`text-muted-foreground ${timeCls}`}>
                { drafts[it.id] ? "Pendiente de aplicar" : (it.confirmed ? "Cambios aplicados" : "Pendiente de aplicar") }
                {" · "}
                {new Date(it.updatedAt).toLocaleString()}
                {freezerShown ? " · Freezer" : ""}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  };

  /* =================== Render =================== */
  return (
    <div className={`p-4 pb-24 mx-auto ${compact ? "max-w-screen-sm" : "max-w-screen-sm"}`}>
      {/* Header + Acciones */}
      <div className="relative flex items-center gap-2 mb-3">
        <h1 className="text-lg font-semibold">Vencimientos</h1>

        <div className="ml-auto flex items-center gap-2">
          <Button size="sm" variant={compact ? "default" : "secondary"}
            onClick={() => setCompact((v) => !v)} title="Alternar vista compacta">
            {compact ? "Vista compacta: ON" : "Vista compacta: OFF"}
          </Button>

          <Button size="sm" variant="secondary"
            onClick={() => setShowArchivePanel((v) => !v)}
            title="Ver historial" className="flex items-center gap-2">
            <HistoryIcon className="h-4 w-4" /> Historial
          </Button>

          {showArchivePanel && (
            <div className="absolute right-0 top-full mt-2 w-[min(100vw,640px)] rounded-lg border bg-background shadow-lg z-30"
                role="dialog" aria-label="Histórico archivados">
              <div className="p-3 flex items-center gap-2 border-b">
                <span className="font-semibold">Histórico</span>
                <span className="text-sm text-muted-foreground">({archives.length})</span>
                <Input placeholder="Buscar en histórico…" value={archiveQuery}
                  onChange={(e)=>setArchiveQuery(e.target.value)} className="ml-auto h-8" />
                <Button size="sm" variant="secondary" onClick={() => downloadArchivesXLSX(archives)}>
                  Exportar Excel
                </Button>
                <Button size="sm" variant="secondary"
                  onClick={() => downloadJSON(`vencimientos-archivados-${new Date().toISOString().slice(0,10)}.json`, archives)}>
                  Exportar JSON
                </Button>
              </div>
              {archiveErr && <p className="px-3 pt-2 text-xs text-red-600">{archiveErr}</p>}
              <div className="max-h-[50vh] overflow-auto p-2">
                {archives.length === 0 ? (
                  <p className="text-sm text-muted-foreground px-1 py-2">No hay productos archivados.</p>
                ) : (
                  archives
                    .filter(a => {
                      const q = normText(archiveQuery);
                      if (!q) return true;
                      return normText(a.name).includes(q) || normText(a.expDate).includes(q);
                    })
                    .map((a) => (
                      <div
                        key={a.id}
                        className="grid grid-cols-12 gap-2 items-center px-1 py-2 border-b last:border-b-0 text-sm"
                      >
                        <div className="col-span-5 truncate" title={a.name}>{a.name}</div>
                        <div className="col-span-2 text-right">{a.qty}</div>
                        <div className="col-span-2 text-right">{a.expDate}</div>
                        <div className="col-span-2 text-right">{a.freezer ? "Freezer" : ""}</div>
                        <div className="col-span-1 flex justify-end">
                          <Button
                            size="icon"
                            variant="destructive"
                            className="h-7 w-7"
                            title="Eliminar de historial"
                            onClick={async () => {
                              if (!confirm(`¿Seguro que querés borrar "${a.name}" del historial?`)) return;
                              setArchives((prev) => prev.filter((x) => x.id !== a.id));
                              const supabase = supabaseRef.current;
                              if (supabase) {
                                const { error } = await supabase.from("expirations_archive").delete().eq("id", a.id);
                                if (error) {
                                  alert("No pude borrar en servidor: " + error.message);
                                  setArchives((prev) => [a, ...prev]); // rollback si falla
                                }
                              }
                            }}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    ))
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Formulario alta */}
      <Card className={`mb-4 shadow-sm ${compact ? "border" : ""}`}>
        <CardContent className={`space-y-2 ${compact ? "p-3 pt-2 pb-2" : "p-4 pt-0 pb-0"}`}>
          <div className="relative" ref={autoBoxRef}>
            <label htmlFor="prod" className={`block font-medium text-muted-foreground mb-1 ${labelCls}`}>
              Producto (autocompletar por DESCRIPCIÓN)
            </label>
            <Input
              id="prod"
              value={name}
              onChange={(e)=>{setName(e.target.value); updateSuggestions(e.target.value);}}
              onKeyDown={onKeyDownName}
              placeholder="Escribe para buscar…"
              autoComplete="off"
              aria-autocomplete="list"
              aria-expanded={openDrop}
              aria-controls="prod-suggestions"
              className={inputCls}
            />
            {openDrop && suggestions.length > 0 && (
              <div
                id="prod-suggestions"
                role="listbox"
                aria-label="Sugerencias de producto"
                className="absolute z-20 mt-1 max-h-56 w-full overflow-auto rounded-md border bg-popover text-popover-foreground shadow"
              >
                {suggestions.map((s, i) => (
                  <button
                    key={s + i}
                    type="button"
                    role="option"
                    aria-selected={i === activeIdx}
                    onMouseDown={(e) => { e.preventDefault(); setName(s); onSelectSuggestion(s); }}
                    onMouseEnter={() => setActiveIdx(i)}
                    className={`w-full text-left px-3 py-2 text-sm hover:bg-accent hover:text-accent-foreground ${
                      i === activeIdx ? "bg-accent" : ""
                    }`}
                  >
                    {s}
                  </button>
                ))}
              </div>
            )}
            {error && <p className="mt-1 text-xs text-red-600">{error} (ruta: {PRECIOS_URL})</p>}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label htmlFor="fecha" className={`block font-medium text-muted-foreground mb-1 ${labelCls}`}>Vencimiento (dd-mm-aa)</label>
              <Input id="fecha" inputMode="numeric" pattern="[0-9\\-]*" placeholder="dd-mm-aa" value={expDate}
                onChange={(e)=>{ const el=e.currentTarget; const sel=el.selectionStart ?? el.value.length;
                  const { masked, caret } = maskWithCaretLoose(expDate, e.target.value, sel);
                  setExpDate(masked); requestAnimationFrame(()=>{ try{ el.setSelectionRange(caret, caret);}catch{} }); }}
                className={inputCls}/>
            </div>
            <div>
              <label htmlFor="qty" className={`block font-medium text-muted-foreground mb-1 ${labelCls}`}>Cantidad</label>
              <div className="flex items-center gap-2">
                <Input id="qty" inputMode="numeric" pattern="\\d*" placeholder="1" value={qty} onChange={onChangeQty} className={`${inputCls} flex-1`}/>
                <Button
                  type="button"
                  size="icon"
                  variant={newFreezer ? undefined : "secondary"}
                  aria-pressed={newFreezer}
                  onClick={() => setNewFreezer((v) => !v)}
                  title={newFreezer ? "Marcado como Freezer" : "Marcar como Freezer"}
                  className={`${compact ? "h-8 w-8" : "h-9 w-9"} ${newFreezer ? "bg-sky-500 hover:bg-sky-600 text-white" : ""}`}
                >
                  <Snowflake className="h-4 w-4" />
                </Button>
              </div>
              <p className="mt-1 text-[10px] text-muted-foreground">
                Consejo: marcá Freezer si va directo a frío y querés separarlo visualmente.
              </p>
            </div>
          </div>

          <div className="flex gap-2 mt-1 items-center">
            <Button onClick={onAdd} className={`flex-1 ${compact ? "h-8 text-xs" : ""}`}>Agregar</Button>
            <Button variant="secondary" onClick={onClear} className={`flex-1 ${compact ? "h-8 text-xs" : ""}`}>Limpiar</Button>
            <span className={`ml-auto text-muted-foreground ${compact ? "text-[10px]" : "text-xs"}`}>
              Estado servidor: {supabaseStatus === "online" ? "🟢 online" : supabaseStatus === "offline" ? "🔴 offline" : "⚪︎ ..."}
            </span>
          </div>
        </CardContent>
      </Card>

      {/* Buscador global */}
      <div className="mb-3">
        <div className="relative">
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Buscar producto o fecha (dd-mm-aa)…"
            className={`${compact ? "h-8 text-xs pr-8" : "pr-10"}`}
            aria-label="Buscar productos"
          />
          {searchQuery ? (
            <button
              type="button"
              onClick={() => setSearchQuery("")}
              className="absolute right-2 top-1/2 -translate-y-1/2 p-1 rounded hover:bg-muted"
              aria-label="Limpiar búsqueda"
              title="Limpiar búsqueda"
            >
              <XIcon className="h-4 w-4" />
            </button>
          ) : (
            <span className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 opacity-60">
              <SearchIcon className="h-4 w-4" />
            </span>
          )}
        </div>
        {searchQuery && (
          <p className="mt-1 text-xs text-muted-foreground">
            Filtrando por: <span className="font-medium">{searchQuery}</span>
          </p>
        )}
      </div>

      {/* ====== Acordeones ====== */}
      <div className="space-y-3">
        {/* Freezer */}
        <div className="border rounded-lg">
          <button onClick={() => toggle("gf")} className="w-full flex items-center justify-between px-3 py-2 text-left" aria-expanded={open.gf}>
            <div className="flex items-center gap-2">
              {open.gf ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
              <span className="font-semibold flex items-center gap-1"><Snowflake className="h-4 w-4" /> Freezer</span>
              <span className="text-sm text-muted-foreground">({freezerItems.length})</span>
            </div>
          </button>
          {open.gf && (
            <div className="p-2 space-y-2">
              {freezerItems.length === 0 ? (
                <p className="text-sm text-muted-foreground px-1">No hay productos marcados como Freezer.</p>
              ) : freezerItems.map(renderItemCard)}
            </div>
          )}
        </div>

        {/* Vencidos */}
        <div className="border rounded-lg">
          <button onClick={() => toggle("gx")} className="w-full flex items-center justify-between px-3 py-2 text-left" aria-expanded={open.gx}>
            <div className="flex items-center gap-2">
              {open.gx ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
              <span className="font-semibold">Vencidos</span>
              <span className="text-sm text-muted-foreground">({groups.gx.length})</span>
            </div>
          </button>
          {open.gx && (
            <div className="p-2 space-y-2">
              {groups.gx.length === 0 ? (
                <p className="text-sm text-muted-foreground px-1">Sin productos en este rango.</p>
              ) : groups.gx.map(renderItemCard)}
            </div>
          )}
        </div>

        {/* 1 a 3 días */}
        <div className="border rounded-lg">
          <button onClick={() => toggle("g1")} className="w-full flex items-center justify-between px-3 py-2 text-left" aria-expanded={open.g1}>
            <div className="flex items-center gap-2">
              {open.g1 ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
              <span className="font-semibold">Vence en 1 a 3 días</span>
              <span className="text-sm text-muted-foreground">({groups.g1.length})</span>
            </div>
          </button>
          {open.g1 && (
            <div className="p-2 space-y-2">
              {groups.g1.length === 0 ? (
                <p className="text-sm text-muted-foreground px-1">Sin productos en este rango.</p>
              ) : groups.g1.map(renderItemCard)}
            </div>
          )}
        </div>

        {/* 4 a 10 días */}
        <div className="border rounded-lg">
          <button onClick={() => toggle("g2")} className="w-full flex items-center justify-between px-3 py-2 text-left" aria-expanded={open.g2}>
            <div className="flex items-center gap-2">
              {open.g2 ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
              <span className="font-semibold">Faltan 4 a 10 días</span>
              <span className="text-sm text-muted-foreground">({groups.g2.length})</span>
            </div>
          </button>
          {open.g2 && (
            <div className="p-2 space-y-2">
              {groups.g2.length === 0 ? (
                <p className="text-sm text-muted-foreground px-1">Sin productos en este rango.</p>
              ) : groups.g2.map(renderItemCard)}
            </div>
          )}
        </div>

        {/* 11+ días */}
        <div className="border rounded-lg">
          <button onClick={() => toggle("g3")} className="w-full flex items-center justify-between px-3 py-2 text-left" aria-expanded={open.g3}>
            <div className="flex items-center gap-2">
              {open.g3 ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
              <span className="font-semibold">Más adelante (11+ días)</span>
              <span className="text-sm text-muted-foreground">({groups.g3.length})</span>
            </div>
          </button>
          {open.g3 && (
            <div className="p-2 space-y-2">
              {groups.g3.length === 0 ? (
                <p className="text-sm text-muted-foreground px-1">Sin productos en este rango.</p>
              ) : groups.g3.map(renderItemCard)}
            </div>
          )}
        </div>
      </div>

      <ScrollTopFab />
    </div>
  );
}
