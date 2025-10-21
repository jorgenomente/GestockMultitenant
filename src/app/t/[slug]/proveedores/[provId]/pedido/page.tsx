"use client";

import React from "react";
import clsx from "clsx";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { createPortal } from "react-dom";
import { getSupabaseBrowserClient } from "@/lib/supabaseClient";
import { SALES_STORAGE_BUCKET, SALES_STORAGE_DIR } from "@/lib/salesStorage";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";

/* UI */
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import type { CheckedState } from "@radix-ui/react-checkbox";
import {
  Accordion, AccordionItem, AccordionTrigger, AccordionContent,
} from "@/components/ui/accordion";
import {
  AlertDialog, AlertDialogContent, AlertDialogHeader, AlertDialogTitle,
  AlertDialogDescription, AlertDialogFooter, AlertDialogCancel,
  AlertDialogAction, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger,
} from "@/components/ui/sheet";
import {
  Plus, Minus, Search, Download, Upload, Trash2, ArrowLeft,
  History, X, Pencil, Check, ChevronUp, ChevronDown, Copy, Package, Loader2,
} from "lucide-react";

/* =================== Config =================== */
const VENTAS_URL = "/ventas.xlsx";
const TABLE_SNAPSHOTS = "order_snapshots";
const TABLE_ORDER_SUMMARIES = "order_summaries";
const TABLE_ORDER_SUMMARIES_WEEK = "order_summaries_week";
const TABLE_STOCK_LOGS = "stock_logs";

const ORDERS_TABLE_ENV = process.env.NEXT_PUBLIC_PROVIDER_ORDERS_TABLE?.trim();
const ITEMS_TABLE_ENV = process.env.NEXT_PUBLIC_PROVIDER_ORDER_ITEMS_TABLE?.trim();
const ORDER_TABLE_CANDIDATES = [
  ...(ORDERS_TABLE_ENV ? [ORDERS_TABLE_ENV] : []),
  "orders",
  "provider_orders",
  "branch_orders",
];
const ITEM_TABLE_CANDIDATES = [
  ...(ITEMS_TABLE_ENV ? [ITEMS_TABLE_ENV] : []),
  "order_items",
  "provider_order_items",
  "branch_order_items",
];





/** NUEVO: Config persistencia multi-dispositivo */
const STORAGE_BUCKET = SALES_STORAGE_BUCKET;
const STORAGE_DIR_SALES = SALES_STORAGE_DIR;
const TABLE_SETTINGS = "app_settings";
const TABLE_UI_STATE = "order_ui_state";

const PENDING_PREFIX = "tmp_";
const GROUP_PLACEHOLDER = "__group__placeholder__";

let ensureSalesBucketPromise: Promise<boolean> | null = null;

async function ensureSalesBucketOnce() {
  if (!ensureSalesBucketPromise) {
    ensureSalesBucketPromise = (async () => {
      try {
        const res = await fetch("/api/storage/sales/ensure", { method: "POST" });
        if (!res.ok) {
          const errorText = await res.text().catch(() => "");
          console.warn("ensureSalesBucket failed", res.status, errorText);
          return false;
        }
        return true;
      } catch (err) {
        console.warn("ensureSalesBucket error", err);
        return false;
      }
    })();
  }
  const ok = await ensureSalesBucketPromise;
  if (!ok) ensureSalesBucketPromise = null;
  return ok;
}

const isMissingProviderError = (error: unknown) => {
  if (!error || typeof error !== "object") return false;
  const code = typeof (error as any).code === "string" ? (error as any).code : "";
  const message = typeof (error as any).message === "string" ? (error as any).message.toLowerCase() : "";
  if (!message) return false;
  if (message.includes("proveedor") && message.includes("no existe")) return true;
  if (message.includes("provider") && message.includes("does not exist")) return true;
  return code === "P0001" && message.includes("proveedor");
};

/* ---------- Subcomponente: Stepper ---------- */
type StepperProps = { value: number; onChange: (n: number) => void; min?: number; step?: number; };

function Stepper({ value, onChange, min = 0, step = 1 }: StepperProps) {
  const s = Math.max(1, Math.floor(step));
  const clamp = (n: number) => Math.max(min, n);
  const snap  = (n: number) => clamp(Math.round(n / s) * s);

  return (
    <div className="inline-flex items-center gap-1.5">
      <Button
        variant="outline"
        size="icon"
        className="h-8 w-8"
        aria-label="Restar"
        onClick={() => onChange(clamp((value || 0) - s))}
      >
        <Minus className="h-3.5 w-3.5" />
      </Button>

      <Input
        className="w-14 h-8 text-center"
        inputMode="numeric"
        value={value ?? 0}
        onChange={(e) => {
          const n = parseInt(e.target.value || "0", 10) || 0;
          onChange(snap(n));
        }}
        onBlur={(e) => {
          const n = parseInt(e.target.value || "0", 10) || 0;
          if (n !== value) onChange(snap(n));
        }}
      />

      <Button
        variant="outline"
        size="icon"
        className="h-8 w-8"
        aria-label="Sumar"
        onClick={() => onChange(clamp((value || 0) + s))}
      >
        <Plus className="h-3.5 w-3.5" />
      </Button>
    </div>
  );
}


function useHideBarsOnScroll(opts?: {
  threshold?: number;          // delta mínimo para cambiar estado
  revealOnStopMs?: number|null;// null/0 => desactivar "revelar al frenar"
  minYToHide?: number;         // no ocultar hasta scrollear al menos esto
}) {
  const threshold = opts?.threshold ?? 6;
  const revealOnStopMs = opts?.revealOnStopMs ?? null; // ⬅️ por defecto desactivado
  const minYToHide = opts?.minYToHide ?? 0;

  const [hidden, setHidden] = React.useState(false);
  const lastY = React.useRef(0);
  const raf = React.useRef<number | null>(null);
  const stopTimer = React.useRef<number | null>(null);

  const onScroll = React.useCallback(() => {
    const yNow = window.scrollY || document.documentElement.scrollTop || 0;

    if (raf.current) cancelAnimationFrame(raf.current);
    raf.current = requestAnimationFrame(() => {
      const dy = yNow - lastY.current;

      // Arriba de todo: mostrarlas
      if (yNow <= 2) {
        setHidden(false);
      } else {
        // Bajando (y ya pasamos minYToHide): ocultar
        if (yNow >= minYToHide && dy > threshold) setHidden(true);
        // Subiendo: mostrar
        else if (dy < -threshold) setHidden(false);
      }

      lastY.current = yNow;

      // Solo si expresamente querés "revelar al frenar"
      if (revealOnStopMs && revealOnStopMs > 0) {
        if (stopTimer.current) clearTimeout(stopTimer.current);
        stopTimer.current = window.setTimeout(() => setHidden(false), revealOnStopMs);
      }
    });
  }, [threshold, revealOnStopMs, minYToHide]);

  React.useEffect(() => {
    lastY.current = window.scrollY || 0;
    window.addEventListener("scroll", onScroll, { passive: true });
    const vv = (window as any).visualViewport as VisualViewport | undefined;
    if (vv) vv.addEventListener("scroll", onScroll as any, { passive: true } as any);

    return () => {
      window.removeEventListener("scroll", onScroll);
      const vv2 = (window as any).visualViewport as VisualViewport | undefined;
      if (vv2) vv2.removeEventListener("scroll", onScroll as any);
      if (raf.current) cancelAnimationFrame(raf.current);
      if (stopTimer.current) clearTimeout(stopTimer.current);
    };
  }, [onScroll]);

  return hidden; // true => oculto
}



/* ====== Hook: autoscroll mientras se arrastra ====== */
function useDragAutoscroll(opts?: {
  edge?: number;              // distancia desde el borde que activa el scroll
  maxSpeed?: number;          // px por frame aprox. al pegarse al borde
  minSpeed?: number;          // px por frame mínimo cuando entra en la zona
  power?: number;             // curva de aceleración (1=linear, >1 más suave al principio)
  container?: HTMLElement | null;
}) {
  const edge = opts?.edge ?? 160;          // ↑ más grande = empieza antes
  const maxSpeed = opts?.maxSpeed ?? 36;   // ↑ más rápido pegado al borde
  const minSpeed = opts?.minSpeed ?? 3;    // ↑ un empujón apenas entra a la zona
  const power = opts?.power ?? 1.3;        // 1.2–1.5 suele sentirse bien
  const containerRef = React.useRef<HTMLElement | null>(opts?.container ?? null);

  const animRef = React.useRef<number | null>(null);
  const vyRef = React.useRef(0);

  const step = React.useCallback(() => {
    const vy = vyRef.current;
    if (vy !== 0) {
      const el = containerRef.current;
      if (el) el.scrollTop += vy;
      else window.scrollBy(0, vy);
    }
    animRef.current = requestAnimationFrame(step);
  }, []);

  const start = React.useCallback(() => {
    if (animRef.current == null) animRef.current = requestAnimationFrame(step);
  }, [step]);

  const stop = React.useCallback(() => {
    if (animRef.current != null) cancelAnimationFrame(animRef.current);
    animRef.current = null;
    vyRef.current = 0;
  }, []);

  const updateFromEvent = React.useCallback((e: DragEvent | React.DragEvent) => {
    const y = (e as DragEvent).clientY ?? (e as React.DragEvent).clientY;

    let viewTop = 0, viewHeight = 0;
    const el = containerRef.current;
    if (el) { const r = el.getBoundingClientRect(); viewTop = r.top; viewHeight = r.height; }
    else { const vv = (window as any).visualViewport as VisualViewport | undefined;
           viewTop = vv?.offsetTop ?? 0; viewHeight = vv?.height ?? window.innerHeight; }

    const topZone = viewTop + edge;
    const botZone = viewTop + viewHeight - edge;

    let vy = 0;
    if (y < topZone) {
      const t = Math.min(1, (topZone - y) / edge);          // 0..1
      const speed = Math.max(minSpeed, maxSpeed * Math.pow(t, power));
      vy = -Math.round(speed);
    } else if (y > botZone) {
      const t = Math.min(1, (y - botZone) / edge);
      const speed = Math.max(minSpeed, maxSpeed * Math.pow(t, power));
      vy = Math.round(speed);
    }
    vyRef.current = vy;
  }, [edge, maxSpeed, minSpeed, power]);

  React.useEffect(() => stop, [stop]);

  return { start, stop, updateFromEvent, setContainer: (el: HTMLElement | null) => (containerRef.current = el) };
}



/* =================== Tipos =================== */
type Status = "PENDIENTE" | "CONFIRMADO" | "RECIBIDO";
type OrderRow = {
  id: string; provider_id: string; status: Status; notes: string | null;
  total: number | null; created_at?: string; updated_at?: string;
  tenant_id?: string | null; branch_id?: string | null;
};
type ItemRow = {
  id: string;
  order_id: string;
  product_name: string;          // clave real
  display_name?: string | null;  // etiqueta visible editable
  qty: number;
  unit_price: number;
  group_name: string | null;
  subtotal?: number;
  price_updated_at?: string | null;
  pack_size?: number | null;
  tenant_id?: string | null;
  branch_id?: string | null;

  /* NUEVO: stock multi-dispositivo */
  stock_qty?: number | null;
  stock_updated_at?: string | null;

  /* NUEVO: pedido anterior */
  previous_qty?: number | null;
  previous_qty_updated_at?: string | null;
};


type SalesRow = { product: string; qty: number; subtotal?: number; date: number; category?: string; };
type Stats = { avg4w: number; sum2w: number; sum30d: number; lastQty?: number; lastDate?: number; lastUnitRetail?: number; avgUnitRetail30d?: number; };

type SortMode = "alpha_asc" | "alpha_desc" | "avg_desc" | "avg_asc";

type SnapshotPayload = {
  items: Array<{
    product_name: string;
    display_name?: string | null; // 👈 NUEVO
    qty: number;
    unit_price: number;
    group_name: string | null;
  }>;
};

type SnapshotRow = {
  id: string; order_id: string; title: string; snapshot: SnapshotPayload; created_at: string;
};

type OrderExportFormat = "xlsx" | "json";

const ORDER_EXPORT_KIND = "gestock-order" as const;
const ORDER_EXPORT_VERSION = 1;

type OrderExportJsonItem = {
  id: string;
  productName: string;
  displayName: string | null;
  qty: number;
  unitPrice: number;
  groupName: string | null;
  packSize: number | null;
  stockQty: number | null;
  stockUpdatedAt: string | null;
  previousQty: number | null;
  previousQtyUpdatedAt: string | null;
  priceUpdatedAt: string | null;
  tenantId: string | null;
  branchId: string | null;
};

type OrderExportJsonPayload = {
  kind: typeof ORDER_EXPORT_KIND;
  version: number;
  generatedAt: string;
  order: {
    id: string;
    tenantId: string | null;
    branchId: string | null;
    status?: Status;
    notes?: string | null;
  };
  provider: {
    id: string;
    name: string | null;
  };
  items: OrderExportJsonItem[];
  groupOrder: string[];
  checkedMap: Record<string, boolean>;
};

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

/* ========= Drag & Drop de grupos (HTML5 nativo) ========= */
import { GripVertical } from "lucide-react";

function DraggableGroupList({
  groups,
  renderGroup,
  onReorder,
}: {
  groups: Array<[string, ItemRow[]]>;
  renderGroup: (
    name: string,
    items: ItemRow[],
    containerProps: React.HTMLAttributes<HTMLDivElement>
  ) => React.ReactNode;
  onReorder: (nextNames: string[]) => void;
}) {
  const [dragIndex, setDragIndex] = React.useState<number | null>(null);
  const [overIndex, setOverIndex] = React.useState<number | null>(null);

  const names = React.useMemo(
    () => groups.map(([g]) => g || "Sin grupo"),
    [groups]
  );

const auto = useDragAutoscroll({
  edge: 170,     // 150–200 activa más lejos del borde
  maxSpeed: 36,  // 32–40 si querés que “vuele” al final
  minSpeed: 3,   // empujón inicial
  power: 1.25,   // suave al principio, acelera cerca del borde
});



  // 👇 listeners globales mientras haya un drag activo
  React.useEffect(() => {
    if (dragIndex == null) return;

    const onDocDragOver = (e: DragEvent) => {
      // Necesario para que el navegador permita "drop" y siga emitiendo dragover
      e.preventDefault();
      auto.updateFromEvent(e);
    };
    const stopAll = () => {
      auto.stop();
      setDragIndex(null);
      setOverIndex(null);
    };

    document.addEventListener("dragover", onDocDragOver, { passive: false });
    document.addEventListener("drop", stopAll, { passive: false });
    document.addEventListener("dragend", stopAll, { passive: true });

    return () => {
      document.removeEventListener("dragover", onDocDragOver as any);
      document.removeEventListener("drop", stopAll as any);
      document.removeEventListener("dragend", stopAll as any);
    };
  }, [dragIndex, auto]);

  function handleDragStart(e: React.DragEvent, index: number) {
    setDragIndex(index);
    e.dataTransfer.effectAllowed = "move";
    e.dataTransfer.setData("text/plain", String(index)); // Firefox
    auto.start(); // 🔛 arranca el loop
  }

  function handleDragOver(e: React.DragEvent, index: number) {
    e.preventDefault();
    setOverIndex(index);
    e.dataTransfer.dropEffect = "move";
    auto.updateFromEvent(e); // también actualizamos cuando está sobre un grupo
  }

  function handleDrop(e: React.DragEvent, index: number) {
    e.preventDefault();
    const from = dragIndex;
    const to = index;

    auto.stop();            // 🛑
    setDragIndex(null);
    setOverIndex(null);

    if (from == null || to == null || from === to) return;
    const next = [...names];
    const [m] = next.splice(from, 1);
    next.splice(to, 0, m);
    onReorder(next);
  }

  function handleDragEnd() {
    auto.stop();            // 🛑 por si se cancela
    setDragIndex(null);
    setOverIndex(null);
  }

  return (
    <>
      {groups.map(([groupName, arr], idx) => {
        const isDragging = dragIndex === idx;
        const isOver = overIndex === idx && dragIndex !== null && dragIndex !== idx;

        const containerProps: React.HTMLAttributes<HTMLDivElement> = {
          draggable: true,
          onDragStart: (e) => handleDragStart(e as any, idx),
          onDragOver: (e) => handleDragOver(e as any, idx),
          onDrop: (e) => handleDrop(e as any, idx),
          onDragEnd: handleDragEnd,
          className: [
            "rounded-lg outline-none",
            isDragging ? "opacity-60" : "",
            isOver ? "ring-2 ring-primary/40" : "",
          ].join(" "),
        };

        return (
          <React.Fragment key={groupName}>
            {renderGroup(groupName, arr, containerProps)}
          </React.Fragment>
        );
      })}
    </>
  );
}







/** NUEVO: tipos para settings de la app */
type SalesPersistMeta = {
  url?: string;
  base64?: string;
  mime_type?: string;
  filename?: string;
  uploaded_at?: string;
  tenant_id?: string | null;
  branch_id?: string | null;
  scope_key?: string;
};

const SALES_KEY_ROOT = "sales_url";
const salesKeyForScope = (tenantId?: string | null, branchId?: string | null) => {
  const tid = tenantId?.trim() || "";
  const bid = branchId?.trim() || "";
  if (tid && bid) return `${SALES_KEY_ROOT}:${tid}:${bid}`;
  if (tid) return `${SALES_KEY_ROOT}:${tid}`;
  return SALES_KEY_ROOT;
};
const salesKeysForLookup = (tenantId?: string | null, branchId?: string | null) => {
  const keys: string[] = [];
  if (tenantId && branchId) keys.push(salesKeyForScope(tenantId, branchId));
  if (tenantId) keys.push(salesKeyForScope(tenantId, null));
  keys.push(SALES_KEY_ROOT);
  return Array.from(new Set(keys));
};

const base64ToArrayBuffer = (base64: string): ArrayBuffer => {
  const binary = atob(base64);
  const len = binary.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i += 1) bytes[i] = binary.charCodeAt(i);
  return bytes.buffer;
};
const arrayBufferToBase64 = (buffer: ArrayBuffer): string => {
  const bytes = new Uint8Array(buffer);
  let binary = "";
  for (let i = 0; i < bytes.byteLength; i += 1) binary += String.fromCharCode(bytes[i]);
  return btoa(binary);
};

/** ==== Format helpers (mostrar fechas “date-only” guardadas en UTC) ==== */
const formatUTCDate = (t: number) =>
  new Date(t).toLocaleDateString("es-AR", { timeZone: "UTC" });

const formatUTCWeekday = (t: number) =>
  new Date(t).toLocaleDateString("es-AR", { weekday: "long", timeZone: "UTC" });



/* =================== Utils =================== */
const NBSP_RX = /[\u00A0\u202F]/g;
const DIAC_RX = /\p{Diacritic}/gu;
const normText = (s: string) => s.replace(NBSP_RX, " ").trim();
const normKey = (s: string) => normText(s).normalize("NFD").replace(DIAC_RX, "").toLowerCase();
const nowLocalIso = () => {
  const now = new Date();
  const offsetMs = now.getTimezoneOffset() * 60000;
  return new Date(now.getTime() - offsetMs).toISOString().slice(0, 16);
};

const excelSerialToUTC = (s: number) => Date.UTC(1899, 11, 30) + Math.round(s * 86400000);
function parseDateCell(v: unknown): number | null {
  if (v == null) return null;
  if (v instanceof Date) return v.getTime();
  if (typeof v === "number") return v < 100000 ? excelSerialToUTC(v) : v;
  if (typeof v === "string") {
    const s = v.replace(NBSP_RX, " ").trim().replace(/\./g, "/").replace(/-/g, "/");
    const m = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{2,4})$/);
    if (m) { const dd = +m[1], mm = +m[2] - 1; let yy = +m[3]; if (yy < 100) yy += 2000; return Date.UTC(yy, mm, dd); }
  }
  return null;
}
const startOfDayUTC = (t: number) => { const d = new Date(t); return Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()); };
const fmtMoney = (n: number) => new Intl.NumberFormat("es-AR", { style: "currency", currency: "ARS", maximumFractionDigits: 0 }).format(n || 0);
const fmtInt = (n: number) => new Intl.NumberFormat("es-AR").format(n || 0);
const round2 = (n: number) => Math.round((Number.isFinite(n) ? n : 0) * 100) / 100;
const parseNumberInput = (value: string): number => {
  if (!value) return 0;
  const normalized = value.replace(/\s+/g, "").replace(/,/g, ".");
  if (!normalized) return 0;
  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : NaN;
};
const isoToday = () => new Date().toISOString().slice(0, 10);

/* =================== Ventas.xlsx y métricas =================== */
/** NUEVO: parse genérico desde ArrayBuffer */
async function parseSalesArrayBuffer(ab: ArrayBuffer): Promise<SalesRow[]> {
  const XLSX = await import("xlsx");
  const wb = XLSX.read(ab, { type: "array" });
  const ws = wb.Sheets[wb.SheetNames[0]];
  const rows: any[] = XLSX.utils.sheet_to_json(ws, { raw: true });

  const candidates = rows.map((r) => { const obj: any = {}; for (const k of Object.keys(r)) obj[k.toLowerCase().replace(NBSP_RX, " ").trim()] = r[k]; return obj; });
  const nameKeys = ["artículo", "articulo", "producto", "nombre", "item", "producto/marca"];
  const dateKeys = ["hora", "fecha", "date", "día", "dia"];
  const qtyKeys  = ["cantidad", "qty", "venta", "ventas"];
  const subKeys  = ["subtotal", "importe", "total", "monto"];
  const catKeys  = ["subfamilia", "categoría", "categoria", "rubro", "grupo", "familia"];

  const out: SalesRow[] = [];
  for (const r of candidates) {
    const nk = nameKeys.find((k) => r[k] != null);
    const dk = dateKeys.find((k) => r[k] != null);
    const qk = qtyKeys.find((k) => r[k] != null);
    const sk = subKeys.find((k) => r[k] != null);
    const ck = catKeys.find((k) => r[k] != null);
    const product  = nk ? String(r[nk]).trim() : "";
    const date     = dk ? parseDateCell(r[dk]) : null;
    const qty      = qk ? Number(r[qk] ?? 0) || 0 : 0;
    const subtotal = sk ? Number(r[sk]) : undefined;
    const category = ck ? String(r[ck]) : undefined;
    if (!product || !date) continue;
    out.push({ product, qty, subtotal, date: startOfDayUTC(date), category });
  }
  return out;
}

/** NUEVO: carga desde URL activa (Storage o fallback a /public) */
async function loadSalesFromURL(url: string): Promise<SalesRow[]> {
  const res = await fetch(url, { cache: "no-store" });
  const ab = await res.arrayBuffer();
  return parseSalesArrayBuffer(ab);
}

async function loadSalesFromMeta(meta: SalesPersistMeta): Promise<SalesRow[]> {
  if (meta.base64) {
    const buffer = base64ToArrayBuffer(meta.base64);
    return parseSalesArrayBuffer(buffer);
  }
  if (meta.url) return loadSalesFromURL(meta.url);
  return loadSalesFromURL(VENTAS_URL);
}

/** NUEVO: lee en DB la URL activa de ventas (scoped por tenant/branch, fallback) */
async function getActiveSalesMeta(
  supabase: ReturnType<typeof getSupabaseBrowserClient>,
  tenantId?: string | null,
  branchId?: string | null,
): Promise<SalesPersistMeta> {
  const keys = salesKeysForLookup(tenantId ?? null, branchId ?? null);
  for (const key of keys) {
    try {
      const { data, error } = await supabase
        .from(TABLE_SETTINGS)
        .select('value')
        .eq('key', key)
        .maybeSingle();
      if (error) {
        const code = error.code ?? "";
        if (code === 'PGRST302') continue; // not found
        if (code === '42P01') break;       // table missing -> fallback default
        if (error.message) console.warn('getActiveSalesMeta warning', error);
        continue;
      }
      const raw = data?.value as SalesPersistMeta | undefined;
      if (raw && (raw.url || raw.base64)) {
        return { ...raw, tenant_id: tenantId ?? null, branch_id: branchId ?? null, scope_key: key };
      }
    } catch (err) {
      console.warn('getActiveSalesMeta exception', err);
      break;
    }
  }
  return { url: VENTAS_URL, tenant_id: tenantId ?? null, branch_id: branchId ?? null, scope_key: SALES_KEY_ROOT };
}

function computeStats(sales: SalesRow[], product: string, now = Date.now()): Stats {
  const rows = sales.filter((s) => s.product === product);
  const ms = 24 * 3600 * 1000;
  const sumIn = (from: number) => rows.filter((s) => s.date >= startOfDayUTC(from)).reduce((a, b) => a + (b.qty || 0), 0);
  const sum2w = sumIn(now - 14 * ms), sum30d = sumIn(now - 30 * ms), sum4w = sumIn(now - 28 * ms), avg4w = sum4w / 4;
  const last = [...rows].sort((a, b) => b.date - a.date)[0];
  const lastUnitRetail = last && last.qty && last.subtotal != null && last.qty > 0 ? last.subtotal / last.qty : undefined;
  const in30 = rows.filter((s) => s.date >= startOfDayUTC(now - 30 * ms) && s.qty > 0 && s.subtotal != null);
  const sumSub = in30.reduce((a, b) => a + (b.subtotal || 0), 0);
  const sumQty = in30.reduce((a, b) => a + (b.qty || 0), 0);
  const avgUnitRetail30d = sumQty > 0 ? sumSub / sumQty : undefined;
  return { avg4w: Math.round(avg4w) || 0, sum2w: Math.round(sum2w) || 0, sum30d: Math.round(sum30d) || 0,
           lastQty: last?.qty ?? undefined, lastDate: last?.date ?? undefined, lastUnitRetail, avgUnitRetail30d };
}
const estCost = (st?: Stats, marginPct = 48) =>
  Math.round((st?.lastUnitRetail ?? st?.avgUnitRetail30d ?? 0) * (1 - marginPct / 100));

/** Devuelve la última fecha registrada para un producto; si no hay, usa “hoy”. */
function latestDateForProduct(sales: SalesRow[], product: string): number {
  const rows = sales.filter((s) => s.product === product);
  if (!rows.length) return Date.now();
  return rows.reduce((max, r) => (r.date > max ? r.date : max), rows[0].date);
}

const normalizeSearchParam = (value: string | null) => {
  if (!value) return null;
  const trimmed = value.trim();
  if (!trimmed || trimmed === "null" || trimmed === "undefined") return null;
  return trimmed;
};

/* =================== Página =================== */
export default function ProviderOrderPage() {
  const supabase = React.useMemo(() => getSupabaseBrowserClient(), []);
  const router = useRouter();
  const barsHidden = useHideBarsOnScroll({
  threshold: 5,       // podés bajarlo si querés más sensibilidad
  revealOnStopMs: null, // ⬅️ importante: NO revelar al frenar
  minYToHide: 24,     // no ocultar hasta pasar ~24px
});

  const params = useParams<{ slug: string; provId: string }>();
  const provId = String(params?.provId || "");
  const tenantSlug = String(params?.slug || "");
  const search = useSearchParams();
  const selectedWeekId = search.get("week");
  const tenantIdFromQuery = normalizeSearchParam(search.get("tenantId"));
  const branchIdFromQuery = normalizeSearchParam(search.get("branchId"));
  const providerNameFromQuery = normalizeSearchParam(search.get("name"));

  const [providerNameOverride, setProviderNameOverride] = React.useState<string | null>(null);
  const providerName = providerNameFromQuery || providerNameOverride || "Proveedor";

  const [contextIds, setContextIds] = React.useState<{ tenantId: string | null; branchId: string | null }>({
    tenantId: tenantIdFromQuery,
    branchId: branchIdFromQuery,
  });

  const tenantId = contextIds.tenantId || undefined;
  const branchId = contextIds.branchId || undefined;

  const [ordersTable, setOrdersTable] = React.useState<string>(ORDER_TABLE_CANDIDATES[0]);
  const [itemsTable, setItemsTable] = React.useState<string>(ITEM_TABLE_CANDIDATES[0]);

  const [order, setOrder]   = React.useState<OrderRow | null>(null);
  const [items, setItems]   = React.useState<ItemRow[]>([]);
  const [sales, setSales]   = React.useState<SalesRow[]>([]);
  const [margin, setMargin] = React.useState<number>(48);
  const [filter, setFilter] = React.useState("");
  const [sortMode, setSortMode] = React.useState<SortMode>("alpha_asc");
  const [batchSalesModalOpen, setBatchSalesModalOpen] = React.useState(false);
  const [batchSalesInput, setBatchSalesInput] = React.useState(() => nowLocalIso());
  const [batchApplying, setBatchApplying] = React.useState(false);
  const [sumStockLoading, setSumStockLoading] = React.useState(false);
  const [batchError, setBatchError] = React.useState<string | null>(null);
  const [sumModalOpen, setSumModalOpen] = React.useState(false);
  const [sumAdjustments, setSumAdjustments] = React.useState<Record<string, string>>({});
  const [sumError, setSumError] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (batchSalesModalOpen) {
      setBatchSalesInput(nowLocalIso());
      setBatchError(null);
    }
  }, [batchSalesModalOpen]);

  const salesByProduct = React.useMemo(() => {
    const map = new Map<string, SalesRow[]>();
    sales.forEach((row) => {
      const key = normKey(row.product);
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(row);
    });
    return map;
  }, [sales]);

  const actionableItems = React.useMemo(
    () => items.filter((item) => item.product_name !== GROUP_PLACEHOLDER),
    [items]
  );

  const computeSalesSinceStock = React.useCallback(
    (productName: string, fromTs: number | null) => {
      if (fromTs == null) return 0;
      const rows = salesByProduct.get(normKey(productName));
      if (!rows || !rows.length) return 0;
      const now = Date.now();
      return rows
        .filter((row) => row.date >= fromTs && row.date <= now)
        .reduce((acc, row) => acc + (row.qty || 0), 0);
    },
    [salesByProduct]
  );

  const qtyFormatter = React.useMemo(
    () => new Intl.NumberFormat("es-AR", { maximumFractionDigits: 2 }),
    []
  );

  const applyTimestampMs = React.useMemo(() => {
    const ts = new Date(batchSalesInput);
    if (Number.isNaN(ts.getTime())) return null;
    return Math.min(ts.getTime(), Date.now());
  }, [batchSalesInput]);

  const batchPreviewRows = React.useMemo(() => {
    return actionableItems.map((item) => {
      const qtyOrdered = round2(Number(item.qty ?? 0));
      const stockPrev = round2(Number(item.stock_qty ?? 0));
      const productLabel = (item.display_name?.trim() || item.product_name).trim();
      const salesQty =
        applyTimestampMs == null
          ? 0
          : round2(computeSalesSinceStock(productLabel, applyTimestampMs));
      const stockResult = Math.max(0, round2(stockPrev - salesQty));
      return { item, qtyOrdered, stockPrev, salesQty, stockResult };
    });
  }, [actionableItems, applyTimestampMs, computeSalesSinceStock]);

  const batchTotals = React.useMemo(() => {
    return batchPreviewRows.reduce(
      (acc, row) => ({
        qtyOrdered: round2(acc.qtyOrdered + row.qtyOrdered),
        stockPrev: round2(acc.stockPrev + row.stockPrev),
        salesQty: round2(acc.salesQty + row.salesQty),
        stockResult: round2(acc.stockResult + row.stockResult),
      }),
      { qtyOrdered: 0, stockPrev: 0, salesQty: 0, stockResult: 0 }
    );
  }, [batchPreviewRows]);

  const sumPreviewRows = React.useMemo(() => {
    return actionableItems.map((item) => {
      const stockPrev = round2(Number(item.stock_qty ?? 0));
      const qtyOrdered = round2(Number(item.qty ?? 0));
      const storedRaw = sumAdjustments[item.id];
      const raw = storedRaw ?? String(qtyOrdered);
      const trimmed = raw.trim();
      const parsed = trimmed === "" ? 0 : parseNumberInput(trimmed);
      const isValid = !Number.isNaN(parsed) && parsed >= 0;
      const addition = isValid ? round2(parsed) : 0;
      const stockResult = round2(stockPrev + addition);
      return {
        item,
        qtyOrdered,
        raw,
        addition,
        stockPrev,
        stockResult,
        isValid,
      };
    });
  }, [actionableItems, sumAdjustments]);

  const sumTotals = React.useMemo(() => {
    return sumPreviewRows.reduce(
      (acc, row) => ({
        qtyOrdered: round2(acc.qtyOrdered + row.qtyOrdered),
        addition: round2(acc.addition + (row.isValid ? row.addition : 0)),
        stockPrev: round2(acc.stockPrev + row.stockPrev),
        stockResult: round2(acc.stockResult + (row.isValid ? row.stockResult : row.stockPrev)),
      }),
      { qtyOrdered: 0, addition: 0, stockPrev: 0, stockResult: 0 }
    );
  }, [sumPreviewRows]);

  const previewDateLabel = React.useMemo(() => {
    if (applyTimestampMs == null) return "";
    return new Date(applyTimestampMs).toLocaleString("es-AR");
  }, [applyTimestampMs]);

  React.useEffect(() => {
    if (batchError && applyTimestampMs != null) setBatchError(null);
  }, [applyTimestampMs, batchError]);

  const sumHasInvalid = React.useMemo(
    () => sumPreviewRows.some((row) => !row.isValid),
    [sumPreviewRows]
  );

  const sumHasChanges = React.useMemo(
    () => sumPreviewRows.some((row) => row.addition !== 0),
    [sumPreviewRows]
  );

  const sumConfirmDisabled = sumStockLoading || sumHasInvalid || !sumHasChanges;

  const applySalesToAll = React.useCallback(async () => {
    if (!actionableItems.length) {
      alert("No hay productos para actualizar.");
      return;
    }

    const ts = new Date(batchSalesInput);
    if (Number.isNaN(ts.getTime())) {
      setBatchError("Ingresá una fecha y hora válidas.");
      return;
    }

    const fromMs = Math.min(ts.getTime(), Date.now());
    const fromIso = new Date(fromMs).toISOString();
    const nowIso = new Date().toISOString();

    const selection = actionableItems.map((item) => {
      const productLabel = (item.display_name?.trim() || item.product_name).trim();
      const stockPrev = round2(Number(item.stock_qty ?? 0));
      const qtyOrdered = round2(Number(item.qty ?? 0));
      const salesQty = round2(computeSalesSinceStock(productLabel, fromMs));
      const stockApplied = Math.max(0, round2(stockPrev - salesQty));
      return { item, stockPrev, qtyOrdered, salesQty, stockApplied };
    });

    setBatchApplying(true);
    setBatchError(null);
    try {
      for (const row of selection) {
        const payload = {
          stock_qty: row.stockApplied,
          stock_updated_at: nowIso,
          previous_qty: row.qtyOrdered,
          previous_qty_updated_at: fromIso,
        };
        const { error } = await supabase.from(itemsTable).update(payload).eq("id", row.item.id);
        if (error) throw error;
      }

      const logsPayload = selection.map((row) => ({
        order_item_id: row.item.id,
        stock_prev: row.stockPrev,
        stock_in: 0,
        stock_out: row.salesQty,
        stock_applied: row.stockApplied,
        sales_since: row.salesQty,
        applied_at: nowIso,
        tenant_id: row.item.tenant_id ?? tenantId ?? null,
        branch_id: row.item.branch_id ?? branchId ?? null,
      }));

      if (logsPayload.length) {
        const { error: logError } = await supabase.from(TABLE_STOCK_LOGS).insert(logsPayload);
        if (logError && logError.code !== "42P01") {
          console.warn("stock log insert error", logError);
        }
      }

      setItems((prev) =>
        prev.map((item) => {
          const next = selection.find((row) => row.item.id === item.id);
          if (!next) return item;
          return {
            ...item,
            stock_qty: next.stockApplied,
            stock_updated_at: nowIso,
            previous_qty: next.qtyOrdered,
            previous_qty_updated_at: fromIso,
          };
        })
      );

      setBatchError(null);
      setBatchSalesModalOpen(false);
    } catch (err: any) {
      console.error("apply sales batch error", err);
      setBatchError(err?.message ?? "No se pudo aplicar las ventas.");
    } finally {
      setBatchApplying(false);
    }
  }, [actionableItems, batchSalesInput, computeSalesSinceStock, itemsTable, supabase, tenantId, branchId, setItems, setBatchError]);

  const applySumAdjustments = React.useCallback(async () => {
    if (!actionableItems.length) {
      alert("No hay productos para actualizar.");
      return;
    }

    if (sumHasInvalid) {
      setSumError("Revisá las cantidades: sólo se permiten números iguales o mayores a 0.");
      return;
    }

    if (!sumHasChanges) {
      setSumError("Ingresá alguna cantidad a sumar antes de confirmar.");
      return;
    }

    setSumError(null);
    setSumStockLoading(true);
    const nowIso = new Date().toISOString();

    try {
      const rows = actionableItems.map((item) => {
        const current = Number(item.stock_qty ?? 0) || 0;
        const storedRaw = sumAdjustments[item.id] ?? String(round2(Number(item.qty ?? 0)));
        const trimmed = storedRaw.trim();
        const parsed = trimmed === "" ? 0 : parseNumberInput(trimmed);
        if (Number.isNaN(parsed) || parsed < 0) {
          throw new Error("Revisá las cantidades: hay valores inválidos.");
        }
        const addition = round2(parsed);
        const nextStock = round2(current + addition);
        return { item, addition, nextStock };
      });

      const updates = rows.filter((row) => row.addition !== 0);

      if (updates.length) {
        const results = await Promise.all(
          updates.map(({ item, nextStock }) =>
            supabase
              .from(itemsTable)
              .update({ stock_qty: nextStock, stock_updated_at: nowIso })
              .eq("id", item.id)
          )
        );
        const failure = results.find((res: any) => res?.error);
        if (failure?.error) throw failure.error;
      }

      setItems((prev) =>
        prev.map((item) => {
          const match = rows.find((row) => row.item.id === item.id);
          if (!match) return item;
          return { ...item, stock_qty: match.nextStock, stock_updated_at: nowIso };
        })
      );

      setSumError(null);
      setSumModalOpen(false);
      setSumAdjustments({});
    } catch (err: any) {
      console.error("sum stock error", err);
      setSumError(err?.message ?? "No se pudo sumar el stock.");
    } finally {
      setSumStockLoading(false);
    }
  }, [actionableItems, sumAdjustments, sumHasInvalid, sumHasChanges, supabase, itemsTable, setItems]);

  const handleOpenSumModal = React.useCallback(() => {
    if (!actionableItems.length) {
      alert("No hay productos para actualizar.");
      return;
    }
    const defaults = actionableItems.reduce<Record<string, string>>((acc, item) => {
      const base = round2(Number(item.qty ?? 0));
      acc[item.id] = base ? String(base) : "0";
      return acc;
    }, {});
    setSumAdjustments(defaults);
    setSumError(null);
    setSumModalOpen(true);
  }, [actionableItems]);

  const handleOpenApplyModal = React.useCallback(() => {
    if (!actionableItems.length) {
      alert("No hay productos para actualizar.");
      return;
    }
    setBatchError(null);
    setBatchSalesInput(nowLocalIso());
    setBatchSalesModalOpen(true);
  }, [actionableItems, setBatchSalesInput, setBatchError, setBatchSalesModalOpen]);

  // UI persistente (Supabase)
  const [groupOrder, setGroupOrder] = React.useState<string[]>([]);
  const [checkedMap, setCheckedMap] = React.useState<Record<string, boolean>>({});

  // NUEVO: acordeón controlado (todos cerrados al entrar; uno abierto a la vez)
  const [openGroup, setOpenGroup] = React.useState<string | undefined>(undefined);

  // NUEVO: meta + input file para Importar Ventas (Storage)
  const [salesMeta, setSalesMeta] = React.useState<{ source: "default" | "imported"; label: string }>({
    source: "default",
    label: "ventas.xlsx",
  });
  const salesUploadRef = React.useRef<HTMLInputElement | null>(null);
  const [importingSales, setImportingSales] = React.useState(false);
  const [salesImportError, setSalesImportError] = React.useState<string | null>(null);
  const handleCopySalesError = React.useCallback(async () => {
    if (!salesImportError) return;
    try {
      if (typeof navigator !== "undefined" && navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(salesImportError);
        return;
      }
    } catch (err) {
      console.warn("copy sales error failed", err);
    }
    try {
      if (typeof document !== "undefined") {
        const textarea = document.createElement("textarea");
        textarea.value = salesImportError;
        textarea.style.position = "fixed";
        textarea.style.opacity = "0";
        document.body.appendChild(textarea);
        textarea.focus();
        textarea.select();
        document.execCommand("copy");
        document.body.removeChild(textarea);
        return;
      }
    } catch (fallbackErr) {
      console.warn("fallback copy sales error failed", fallbackErr);
    }
    if (typeof window !== "undefined") window.prompt("Copiá el mensaje de error:", salesImportError);
  }, [salesImportError]);
  // ===== Altura del BottomNav y estilo root (variable CSS global en la página) =====
const bottomNavHeightPx = 76; // ajustá 72–84px según mida tu BottomNav real
const rootStyle: React.CSSProperties = {
  ["--bottom-nav-h" as any]: `${bottomNavHeightPx}px`,
};

  React.useEffect(() => {
    if (tenantIdFromQuery && tenantIdFromQuery !== contextIds.tenantId) {
      setContextIds((prev) => ({ tenantId: tenantIdFromQuery, branchId: prev.branchId }));
    }
    if (branchIdFromQuery && branchIdFromQuery !== contextIds.branchId) {
      setContextIds((prev) => ({ tenantId: prev.tenantId, branchId: branchIdFromQuery }));
    }
  }, [tenantIdFromQuery, branchIdFromQuery, contextIds.tenantId, contextIds.branchId]);

  React.useEffect(() => {
    if (!provId) return;
    if (contextIds.tenantId && contextIds.branchId) return;
    let cancelled = false;
    (async () => {
      const { data, error } = await supabase
        .from("providers")
        .select("name, tenant_id, branch_id")
        .eq("id", provId)
        .maybeSingle();
      if (cancelled) return;
      if (error) {
        console.error("load provider meta error", error);
        return;
      }
      if (!data) return;
      if (data.name && !providerNameOverride) setProviderNameOverride(data.name);
      setContextIds((prev) => ({
        tenantId: prev.tenantId ?? data.tenant_id ?? null,
        branchId: prev.branchId ?? data.branch_id ?? null,
      }));
    })();
    return () => { cancelled = true; };
  }, [supabase, provId, contextIds.tenantId, contextIds.branchId, providerNameOverride]);



  // Historial
  const [historyOpen, setHistoryOpen] = React.useState(false);
  const [snapshots, setSnapshots] = React.useState<SnapshotRow[]>([]);
  const [editingSnapshotId, setEditingSnapshotId] = React.useState<string | null>(null);
  const [snapshotTitleDraft, setSnapshotTitleDraft] = React.useState("");
  const [renamingSnapshotId, setRenamingSnapshotId] = React.useState<string | null>(null);
  const snapshotTitleInputRef = React.useRef<HTMLInputElement | null>(null);
  const fileRef = React.useRef<HTMLInputElement | null>(null);
  const [importing, setImporting] = React.useState(false);
  const [exportDialogOpen, setExportDialogOpen] = React.useState(false);
  const [exportFormat, setExportFormat] = React.useState<OrderExportFormat>("xlsx");
  const [exportingOrder, setExportingOrder] = React.useState(false);

  React.useEffect(() => {
    if (!editingSnapshotId) return;
    const timer = window.setTimeout(() => {
      snapshotTitleInputRef.current?.focus();
      snapshotTitleInputRef.current?.select();
    }, 20);
    return () => window.clearTimeout(timer);
  }, [editingSnapshotId]);

  /** NUEVO: cargar ventas desde la fuente activa en DB (o por defecto) */
  React.useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const meta = await getActiveSalesMeta(supabase, tenantId ?? null, branchId ?? null);
        const rows = await loadSalesFromMeta(meta);
        if (!mounted) return;
        setSales(rows);
        setSalesMeta({
          source: meta.url === VENTAS_URL && !meta.base64 ? "default" : "imported",
          label: meta.filename || (meta.url === VENTAS_URL && !meta.base64 ? "ventas.xlsx" : "archivo importado"),
        });
      } catch (e) {
        console.error("load active sales error", e);
        if (mounted) setSales([]);
      }
    })();

    return () => { mounted = false; };
  }, [supabase, tenantId, branchId]);

  // crear/obtener pedido PENDIENTE + cargar ítems

React.useEffect(() => {
  if (!provId) return;
  let mounted = true;
  (async () => {
    let base: OrderRow | null = null;
    let ordersError: any = null;
    const orderCandidates = [ordersTable, ...ORDER_TABLE_CANDIDATES.filter((t) => t !== ordersTable)];

    const variantKeys = new Set<string>();
    const orderVariants: Array<{ useTenant: boolean; useBranch: boolean }> = [];
    const addVariant = (useTenant: boolean, useBranch: boolean) => {
      const key = `${useTenant ? 't' : 'no'}:${useBranch ? 'b' : 'no'}`;
      if (variantKeys.has(key)) return;
      variantKeys.add(key);
      orderVariants.push({ useTenant, useBranch });
    };

    addVariant(!!tenantId, !!branchId);
    if (branchId) addVariant(!!tenantId, false);
    if (tenantId) addVariant(false, false);
    addVariant(false, false);

    let resolvedOrderTable = ordersTable;
    for (const table of orderCandidates) {
      let skipTable = false;
      for (const variant of orderVariants) {
        let query = supabase
          .from(table)
          .select('*')
          .eq('provider_id', provId)
          .order('created_at', { ascending: false })
          .limit(1);
        if (variant.useTenant && tenantId) query = query.eq('tenant_id', tenantId);
        if (variant.useBranch && branchId) query = query.eq('branch_id', branchId);

        let { data, error } = await query;
        if (error?.code === '42703') {
          const fallback = await supabase
            .from(table)
            .select('*')
            .eq('provider_id', provId)
            .order('created_at', { ascending: false })
            .limit(1);
          data = fallback.data;
          error = fallback.error;
        }
        if (error && (error.code === '42P01' || error.message?.includes('Could not find the table'))) {
          skipTable = true;
          break;
        }
        if (error) {
          if (isMissingProviderError(error)) {
            skipTable = true;
            break;
          }
          ordersError = error;
          break;
        }
        if (data && data.length) {
          base = data[0] as OrderRow;
          if (table !== ordersTable) setOrdersTable(table);
          resolvedOrderTable = table;
          break;
        }
      }
      if (skipTable) {
        skipTable = false;
        continue;
      }
      if (base || ordersError) break;
    }

    if (!base && !ordersError) {
      const creationPayloadBase: Record<string, any> = {
        provider_id: provId,
        status: 'PENDIENTE' as Status,
        notes: `${providerName} - ${isoToday()}`,
        total: 0,
      };

      for (const table of orderCandidates) {
        let skipTableInsert = false;
        for (const variant of orderVariants) {
          const payload = { ...creationPayloadBase } as Record<string, any>;
          if (variant.useTenant && tenantId) payload.tenant_id = tenantId;
          if (variant.useBranch && branchId) payload.branch_id = branchId;

          let { data, error } = await supabase
            .from(table)
            .insert([payload])
            .select('*')
            .single();

          if (error?.code === '42703') {
            const fallbackPayload = { ...payload };
            delete fallbackPayload.tenant_id;
            delete fallbackPayload.branch_id;
            const fallback = await supabase
              .from(table)
              .insert([fallbackPayload])
              .select('*')
              .single();
            data = fallback.data;
            error = fallback.error;
          }

          if (error && (error.code === '42P01' || error.message?.includes('Could not find the table'))) {
            skipTableInsert = true;
            break;
          }
          if (error) {
            if (isMissingProviderError(error)) {
              skipTableInsert = true;
              break;
            }
            ordersError = error;
            break;
          }
          if (data) {
            base = data as OrderRow;
            if (table !== ordersTable) setOrdersTable(table);
            resolvedOrderTable = table;
            break;
          }
        }
        if (base || ordersError) break;
        if (skipTableInsert) continue;
      }
    }

    if (!mounted) return;
    if (!base) {
      if (ordersError) console.error('load orders error', ordersError?.message ?? ordersError);
      return;
    }

    const shouldPatchTenant = !base.tenant_id && tenantId;
    const shouldPatchBranch = !base.branch_id && branchId;
    if (shouldPatchTenant) base = { ...base, tenant_id: tenantId };
    if (shouldPatchBranch) base = { ...base, branch_id: branchId };

    if (shouldPatchTenant || shouldPatchBranch) {
      void supabase
        .from(resolvedOrderTable)
        .update({
          tenant_id: shouldPatchTenant ? tenantId : base.tenant_id ?? null,
          branch_id: shouldPatchBranch ? branchId : base.branch_id ?? null,
        })
        .eq('id', base.id)
        .catch((err: unknown) => {
          console.warn('order context patch failed', err);
        });
    }

    if (base.tenant_id || base.branch_id) {
      setContextIds((prev) => ({
        tenantId: prev.tenantId ?? base!.tenant_id ?? null,
        branchId: prev.branchId ?? base!.branch_id ?? null,
      }));
    }

    setOrder(base);

    const itemCandidates = [itemsTable, ...ITEM_TABLE_CANDIDATES.filter((t) => t !== itemsTable)];
    let rows: ItemRow[] | null = null;
    let itemsError: any = null;

    const itemVariants: Array<{ useTenant: boolean; useBranch: boolean }> = [];
    const itemVariantKeys = new Set<string>();
    const pushItemVariant = (useTenant: boolean, useBranch: boolean) => {
      const key = `${useTenant ? 't' : 'no'}:${useBranch ? 'b' : 'no'}`;
      if (itemVariantKeys.has(key)) return;
      itemVariantKeys.add(key);
      itemVariants.push({ useTenant, useBranch });
    };
    pushItemVariant(!!tenantId, !!branchId);
    if (branchId) pushItemVariant(!!tenantId, false);
    if (tenantId) pushItemVariant(false, false);
    pushItemVariant(false, false);

    rows = null;
    let resolvedItemsTable = itemsTable;
    for (const table of itemCandidates) {
      let skipTable = false;
      for (let i = 0; i < itemVariants.length; i += 1) {
        const variant = itemVariants[i];
        const isLastVariant = i === itemVariants.length - 1;
        let query = supabase
          .from(table)
          .select('*')
          .eq('order_id', base.id)
          .order('id', { ascending: true });
        if (variant.useTenant && tenantId) query = query.eq('tenant_id', tenantId);
        if (variant.useBranch && branchId) query = query.eq('branch_id', branchId);

        let { data, error } = await query;
        if (error?.code === '42703') {
          const fallbackItems = await supabase
            .from(table)
            .select('*')
            .eq('order_id', base.id)
            .order('id', { ascending: true });
          data = fallbackItems.data;
          error = fallbackItems.error;
        }
        if (error && (error.code === '42P01' || error.message?.includes('Could not find the table'))) {
          skipTable = true;
          break;
        }
        if (error) {
          itemsError = error;
          break;
        }
        const list = (data as ItemRow[]) ?? [];
        if (list.length || isLastVariant) {
          rows = list;
          if (table !== itemsTable) setItemsTable(table);
          resolvedItemsTable = table;
          break;
        }
      }
      if (skipTable) {
        skipTable = false;
        continue;
      }
      if (rows != null || itemsError) break;
    }

    if (!mounted) return;
    if (rows == null) {
      if (itemsError) console.error('load items error', itemsError?.message ?? itemsError);
      rows = [];
    }
    setItems(rows);
    if (rows.length && (shouldPatchTenant || shouldPatchBranch)) {
      const pendingPatchIds = rows
        .filter((r) =>
          (shouldPatchTenant && !r.tenant_id) ||
          (shouldPatchBranch && !r.branch_id)
        )
        .map((r) => r.id);
      if (pendingPatchIds.length) {
        const patchPayload: Partial<Pick<ItemRow, 'tenant_id' | 'branch_id'>> = {};
        if (shouldPatchTenant) patchPayload.tenant_id = tenantId ?? null;
        if (shouldPatchBranch) patchPayload.branch_id = branchId ?? null;
        void supabase
          .from(resolvedItemsTable)
          .update(patchPayload)
          .in('id', pendingPatchIds)
          .catch((err: unknown) => {
            console.warn('item context patch failed', err);
          });
      }
    }
    if (base.id) {
      void loadUIState(base.id);
    }
  })();
  return () => { mounted = false; };
}, [supabase, provId, providerName, tenantId, branchId, ordersTable, itemsTable]);


  // Realtime (escucha cambios en items)
  React.useEffect(() => {
    if (!order) return;
    const chItems = supabase.channel(`order-items-${order.id}`).on(
      "postgres_changes",
      { event: "*", schema: "public", table: itemsTable, filter: `order_id=eq.${order.id}` },
      (payload: any) => {
        const { eventType, new: n, old: o } = payload;
        setItems((prev) => {
          if (eventType === "DELETE") return prev.filter((r) => r.id !== o.id);
          if (eventType === "INSERT") {
            const exists = prev.some((r) => r.id === n.id);
            return exists ? prev.map((r) => (r.id === n.id ? n : r)) : [...prev, n];
          }
          if (eventType === "UPDATE") return prev.map((r) => (r.id === n.id ? n : r));
          return prev;
        });
      }
    ).subscribe();
    return () => { supabase.removeChannel(chItems); };
  }, [supabase, order, itemsTable]);

  /* ===== Helpers ===== */
  const productNames = React.useMemo(() => {
    const set = new Set<string>(); for (const r of sales) if (r.product) set.add(r.product);
    return Array.from(set.values());
  }, [sales]);

  const tokenMatch = (name: string, q: string) =>
    q.toLowerCase().trim().split(/\s+/).filter(Boolean).every((t) => name.toLowerCase().includes(t));

    // Agrupar por group_name + filtrar + ORDENAR según groupOrder (persistente)
  const groups = React.useMemo(() => {
    const map = new Map<string, ItemRow[]>();
    for (const it of items) {
      const k = (it.group_name || "Sin grupo").trim();
      if (!map.has(k)) map.set(k, []);
      map.get(k)!.push(it);
    }
    if (filter.trim()) {
  const q = filter.toLowerCase().trim();

  for (const [k, arr] of Array.from(map.entries())) {
    // Si el nombre del grupo matchea, dejamos todos sus ítems
    const keepWholeGroup = tokenMatch(k, q);

    // Si no matchea el grupo, filtramos por ítems (nombre visible o canonical)
    const filteredArr = keepWholeGroup
      ? arr
      : arr.filter((it) => {
          const visible = it.display_name || it.product_name;
          return tokenMatch(visible, q);
        });

    if (filteredArr.length > 0) {
      map.set(k, filteredArr);
    } else {
      map.delete(k);
    }
  }
}

    const entries = Array.from(map.entries());
    const indexOf = (name: string) => {
      const i = groupOrder.indexOf(name);
      return i === -1 ? Number.MAX_SAFE_INTEGER : i;
    };
    entries.sort((a, b) => {
      const ia = indexOf(a[0]); const ib = indexOf(b[0]);
      if (ia !== ib) return ia - ib;
      return a[0].localeCompare(b[0], "es", { sensitivity: "base" });
    });
    return entries;
  }, [items, filter, groupOrder]);

  // Mantener coherencia: si el grupo abierto ya no existe (renombre/eliminación), cerramos
  React.useEffect(() => {
    const names = groups.map(([g]) => g || "Sin grupo");
    if (openGroup && !names.includes(openGroup)) setOpenGroup(undefined);
  }, [groups, openGroup]);

  // Totales
  const grandTotal = React.useMemo(() => items.reduce((a, it) => a + (it.unit_price || 0) * (it.qty || 0), 0), [items]);
  const grandQty   = React.useMemo(() => items.reduce((a, it) => a + (it.qty || 0), 0), [items]);

  // Estado de selección global (para la casilla maestra)
const selectableItems = React.useMemo(
  () => items.filter((it) => it.product_name !== GROUP_PLACEHOLDER),
  [items]
);
const totalSelectable = selectableItems.length;
const checkedCount = React.useMemo(
  () => selectableItems.reduce((acc, it) => acc + (checkedMap[it.id] ? 1 : 0), 0),
  [selectableItems, checkedMap]
);
const allChecked = totalSelectable > 0 && checkedCount === totalSelectable;
const someChecked = checkedCount > 0 && checkedCount < totalSelectable;
const bulkState: CheckedState = allChecked ? true : someChecked ? "indeterminate" : false;

  // Actualiza el total del pedido en DB y sincroniza el resumen en order_summaries
async function recomputeOrderTotal(newItems?: ItemRow[]) {
  const rows = newItems ?? items;
  const total = rows.reduce((a, it) => a + (it.unit_price || 0) * (it.qty || 0), 0);
  const qty   = rows.reduce((a, it) => a + (it.qty || 0), 0);
  if (!order) return;

  const updated_at = new Date().toISOString();

  await supabase.from(ordersTable).update({ total }).eq('id', order.id);

  await supabase
    .from(TABLE_ORDER_SUMMARIES)
    .upsert(
      { provider_id: order.provider_id, total, items: qty, updated_at },
      { onConflict: 'provider_id' }
    );

  if (selectedWeekId) {
    await supabase
      .from(TABLE_ORDER_SUMMARIES_WEEK)
      .upsert(
        { week_id: selectedWeekId, provider_id: order.provider_id, total, items: qty, updated_at },
        { onConflict: 'week_id,provider_id' }
      );
  }
}



    /* ===== UI state en Supabase (multi-dispositivo) ===== */
  async function loadUIState(orderId: string) {
    try {
      const { data, error } = await supabase
        .from(TABLE_UI_STATE)
        .select("group_order, checked_map")
        .eq("order_id", orderId)
        .maybeSingle();
      if (error) { console.error("loadUIState error", error); return; }
      if (data?.group_order) setGroupOrder(data.group_order as string[]);
      if (data?.checked_map) setCheckedMap(data.checked_map as Record<string, boolean>);
    } catch (e) {
      console.error("loadUIState exception", e);
    }
  }
// Guarda (o actualiza) el resumen del pedido para este proveedor
async function saveOrderSummary(totalArg?: number, itemsArg?: number) {
  if (!provId) return;

  const total = typeof totalArg === 'number'
    ? totalArg
    : items.reduce((a, it) => a + (it.unit_price || 0) * (it.qty || 0), 0);

  const itemsCount = typeof itemsArg === 'number'
    ? itemsArg
    : items.reduce((a, it) => a + (it.qty || 0), 0);

  const updated_at = new Date().toISOString();

  await supabase
    .from(TABLE_ORDER_SUMMARIES)
    .upsert(
      { provider_id: provId, total, items: itemsCount, updated_at },
      { onConflict: 'provider_id' }
    );

  if (selectedWeekId) {
    await supabase
      .from(TABLE_ORDER_SUMMARIES_WEEK)
      .upsert(
        { week_id: selectedWeekId, provider_id: provId, total, items: itemsCount, updated_at },
        { onConflict: 'week_id,provider_id' }
      );
  }
}



  async function saveUIState(orderId: string, patch: {
    group_order?: string[];
    checked_map?: Record<string, boolean>;
  }) {
    try {
      const payload: any = { order_id: orderId, updated_at: new Date().toISOString() };
      if (patch.group_order) payload.group_order = patch.group_order;
      if (patch.checked_map) payload.checked_map = patch.checked_map;

      const { error } = await supabase
        .from(TABLE_UI_STATE)
        .upsert(payload, { onConflict: "order_id" });
      if (error) console.error("saveUIState error", error);
    } catch (e) {
      console.error("saveUIState exception", e);
    }
  }

  function applyImportedUIState(opts: {
    groupOrder?: string[];
    checkedMap?: Record<string, boolean>;
  }) {
    const patch: { group_order?: string[]; checked_map?: Record<string, boolean> } = {};
    if (opts.groupOrder !== undefined) {
      setGroupOrder(opts.groupOrder);
      patch.group_order = opts.groupOrder;
    }
    if (opts.checkedMap !== undefined) {
      setCheckedMap(opts.checkedMap);
      patch.checked_map = opts.checkedMap;
    }
    if (order?.id && (patch.group_order !== undefined || patch.checked_map !== undefined)) {
      void saveUIState(order.id, patch);
    }
  }

  // Persistir orden de grupos
  function persistGroupOrder(next: string[]) {
    setGroupOrder(next);
    if (order?.id) void saveUIState(order.id, { group_order: next });
  }

  // Mover grupo ↑/↓ y guardar
  function moveGroup(name: string, dir: "up" | "down") {
  // Todos los grupos visibles actuales
  const currentNames = Array.from(
    new Set(items.map((it) => (it.group_name || "Sin grupo").trim()))
  );

  // Semilla: lo guardado, o lo visible si aún no hay guardado
  const base = (groupOrder.length ? [...groupOrder] : [...currentNames]);

  // Asegurar que no falte ninguno (p. ej. grupos nuevos o renombrados)
  for (const n of currentNames) {
    if (!base.includes(n)) base.push(n);
  }

  const idx = base.indexOf(name);
  if (idx === -1) {
    // Si por algún motivo aún no está, lo agregamos al final y persistimos
    base.push(name);
    persistGroupOrder(base);
    return;
  }

  const swapWith = dir === "up" ? idx - 1 : idx + 1;
  if (swapWith < 0 || swapWith >= base.length) return;

  [base[idx], base[swapWith]] = [base[swapWith], base[idx]];
  persistGroupOrder(base);
}


  // Setear check de ítem y guardar
  function setItemChecked(id: string, val: boolean) {
    setCheckedMap((prev) => {
      const next = { ...prev, [id]: val };
      if (order?.id) void saveUIState(order.id, { checked_map: next });
      return next;
    });
  }
// ✅ Marcar / desmarcar todos los ítems visibles del pedido
function setAllChecked(val: boolean) {
  setCheckedMap((prev) => {
    const next = { ...prev };
    for (const it of items) {
      if (it.product_name !== GROUP_PLACEHOLDER) {
        next[it.id] = val;
      }
    }
    if (order?.id) void saveUIState(order.id, { checked_map: next });
    return next;
  });
}

  /* ===== CRUD (optimista) ===== */

async function createGroup(groupName: string) {
  if (!order) return;
  const tenantForInsert = order?.tenant_id ?? tenantId ?? tenantIdFromQuery ?? null;
  const branchForInsert = order?.branch_id ?? branchId ?? branchIdFromQuery ?? null;

  const candidates = [itemsTable, ...ITEM_TABLE_CANDIDATES.filter((t) => t !== itemsTable)];
  for (const table of candidates) {
    const basePayload: Record<string, any> = {
      order_id: order.id,
      product_name: GROUP_PLACEHOLDER,
      qty: 0,
      unit_price: 0,
      group_name: groupName || null,
    };
    if (tenantForInsert) basePayload.tenant_id = tenantForInsert;
    if (branchForInsert) basePayload.branch_id = branchForInsert;

    let { data, error } = await supabase.from(table).insert([basePayload]).select('*').single();
    if (error?.code === '42703') {
      const fallbackPayload = { ...basePayload } as Record<string, any>;
      delete fallbackPayload.tenant_id;
      delete fallbackPayload.branch_id;
      const fallback = await supabase.from(table).insert([fallbackPayload]).select('*').single();
      data = fallback.data;
      error = fallback.error;
    }
    if (error?.code === '42P01') {
      continue;
    }
    if (error) {
      console.error('createGroup error', error);
      continue;
    }
    if (table !== itemsTable) setItemsTable(table);
    setItems((prev) => [...prev, data as ItemRow]);
    return;
  }
  alert('No se pudo crear el grupo.');
}

  // Estado de trabajo del vaciado
const [zeroing, setZeroing] = React.useState(false);

const [suggesting, setSuggesting] = React.useState(false);

async function handlePickSuggested(mode: "week" | "2w" | "30d") {
  setSuggesting(true);
  const ok = await applySuggested(mode);
  if (!ok) {
    alert("No se pudieron aplicar las cantidades sugeridas. Probá de nuevo.");
  }
  setSuggesting(false);
}




/** Ajusta una cantidad al múltiplo del paquete (si existe).
 *  Por defecto redondea al múltiplo MÁS CERCANO.
 *  Si preferís redondear siempre hacia arriba, cambiá Math.round -> Math.ceil
 */
function snapToPack(n: number, pack?: number | null) {
  const v = Math.max(0, Math.round(n || 0));
  const m = pack && pack > 1 ? Math.round(pack) : 1;
  if (m <= 1) return v;
  return Math.max(0, Math.round(v / m) * m); // ⇐ usa ceil para “siempre para arriba”
}

/** Aplica cantidades sugeridas a TODOS los ítems del pedido */
async function applySuggested(mode: "week" | "2w" | "30d"): Promise<boolean> {
  try {
    const qtyFor = (it: ItemRow) => {
      const st = computeStats(sales, it.product_name, latestDateForProduct(sales, it.product_name));
      let n = 0;
      if (mode === "week") n = st.avg4w || 0;
      else if (mode === "2w") n = st.sum2w || 0;
      else n = st.sum30d || 0;

      const pack = it.pack_size || 1;
      if (pack > 1) {
        // redondeo al múltiplo más cercano; cambiá a Math.ceil si querés “hacia arriba”
        n = Math.round(n / pack) * pack;
      }
      return Math.max(0, Math.trunc(n));
    };

    // nuevo estado local
    const next = items.map((it) =>
      it.product_name === GROUP_PLACEHOLDER ? it : { ...it, qty: qtyFor(it) }
    );

    // parche para DB (solo id + qty)
    const patch = next
      .filter((it) => it.product_name !== GROUP_PLACEHOLDER)
      .map((it) => ({ id: it.id, qty: it.qty }));

    if (patch.length) {
     // actualizar en lotes para no saturar la red
  const CHUNK = 25;
  for (let i = 0; i < patch.length; i += CHUNK) {
    const slice = patch.slice(i, i + CHUNK);
    const results = await Promise.all(
      slice.map((p) =>
        supabase.from(itemsTable).update({ qty: p.qty }).eq("id", p.id)
      )
    );
    const err = results.find((r: any) => r.error);
    if (err) {
      console.warn("bulk update error", err.error);
      return false; // dispara tu alert
    }
  }
}

    setItems(next);

    // si falla el recálculo del total, no lo tratamos como error fatal
    await recomputeOrderTotal(next).catch((e) => {
      console.warn("recomputeOrderTotal warning", e);
    });

    return true;
  } catch (e) {
    console.warn("applySuggested warning", e);
    return false;
  }
}




/** Pone en 0 la cantidad de TODOS los ítems (de este pedido) */
async function zeroAllQuantities() {
  if (!order) return;
  setZeroing(true);

  // Optimista: reflejamos en UI primero
  const nextItems = items.map((it) =>
    it.product_name === GROUP_PLACEHOLDER ? it : { ...it, qty: 0 }
  );
  setItems(nextItems);

  try {
    // Un solo UPDATE en DB para todas las filas del pedido (excluyendo placeholders de grupo)
    const { error } = await supabase
      .from(itemsTable)
      .update({ qty: 0 })
      .eq("order_id", order.id)
      .neq("product_name", GROUP_PLACEHOLDER);

    if (error) throw error;

    // Recalcular total y sincronizar resumen
    await recomputeOrderTotal(nextItems);
  } catch (e) {
    console.error("zeroAllQuantities error", e);
    alert("No se pudo poner todo en 0. Volvé a intentar.");
    // (opcional) revertir UI si querés
    // setItems(items);
  } finally {
    setZeroing(false);
  }
}

/** Copia las cantidades actuales (qty) a previous_qty para todos los ítems reales */
async function snapshotPreviousQuantities() {
  if (!order) return;
  try {
    // estado optimista en UI
    const nowIso = new Date().toISOString();
    const next = items.map(it =>
      it.product_name === GROUP_PLACEHOLDER
        ? it
        : { ...it, previous_qty: it.qty ?? 0, previous_qty_updated_at: nowIso }
    );
    setItems(next);

    // parche en DB en lotes
    const patch = next
      .filter(it => it.product_name !== GROUP_PLACEHOLDER)
      .map(it => ({ id: it.id, previous_qty: it.qty ?? 0, previous_qty_updated_at: nowIso }));

    const CHUNK = 25;
    for (let i = 0; i < patch.length; i += CHUNK) {
      const slice = patch.slice(i, i + CHUNK);
      const results = await Promise.all(
        slice.map(p =>
          supabase
            .from(itemsTable)
            .update({ previous_qty: p.previous_qty, previous_qty_updated_at: p.previous_qty_updated_at })
            .eq("id", p.id)
        )
      );
      const err = results.find((r: any) => r.error);
      if (err) throw err.error;
    }

    alert("Se guardó el pedido anterior ✅");
  } catch (e) {
    console.error("snapshotPreviousQuantities error", e);
    alert("No se pudo guardar el pedido anterior. Probá de nuevo.");
  }
}




async function addItem(product: string, groupName: string) {
  if (!order) return;
  const tenantForInsert = order?.tenant_id ?? tenantId ?? tenantIdFromQuery ?? null;
  const branchForInsert = order?.branch_id ?? branchId ?? branchIdFromQuery ?? null;
  const st = computeStats(sales, product, latestDateForProduct(sales, product));
  const unit = estCost(st, margin);

  const candidates = [itemsTable, ...ITEM_TABLE_CANDIDATES.filter((t) => t !== itemsTable)];
  for (const table of candidates) {
    const basePayload: Record<string, any> = {
      order_id: order.id,
      product_name: product,
      qty: st?.avg4w ?? 0,
      unit_price: unit || 0,
      group_name: groupName || null,
    };
    if (tenantForInsert) basePayload.tenant_id = tenantForInsert;
    if (branchForInsert) basePayload.branch_id = branchForInsert;

    let { data, error } = await supabase.from(table).insert([basePayload]).select('*').single();
    if (error?.code === '42703') {
      const fallbackPayload = { ...basePayload } as Record<string, any>;
      delete fallbackPayload.tenant_id;
      delete fallbackPayload.branch_id;
      const fallback = await supabase.from(table).insert([fallbackPayload]).select('*').single();
      data = fallback.data;
      error = fallback.error;
    }
    if (error?.code === '42P01') continue;
    if (error) {
      console.error('addItem error', error);
      continue;
    }
    if (table !== itemsTable) setItemsTable(table);
    setItems((prev) => [...prev, data as ItemRow]);
    await recomputeOrderTotal();
    return;
  }
  alert('No se pudo agregar el producto.');
}



async function bulkAddItems(names: string[], groupName: string) {
  if (!order || !names.length) return;
  const tenantForInsert = order?.tenant_id ?? tenantId ?? tenantIdFromQuery ?? null;
  const branchForInsert = order?.branch_id ?? branchId ?? branchIdFromQuery ?? null;

  const rows = names.map((name) => {
    const st = computeStats(sales, name, latestDateForProduct(sales, name));
    const payload: Record<string, any> = {
      order_id: order.id,
      product_name: name,
      qty: st?.avg4w ?? 0,
      unit_price: estCost(st, margin) || 0,
      group_name: groupName || null,
    };
    if (tenantForInsert) payload.tenant_id = tenantForInsert;
    if (branchForInsert) payload.branch_id = branchForInsert;
    return payload;
  });

  const candidates = [itemsTable, ...ITEM_TABLE_CANDIDATES.filter((t) => t !== itemsTable)];
  for (const table of candidates) {
    let { data, error } = await supabase.from(table).insert(rows).select('*');
    if (error?.code === '42703') {
      const fallbackRows = rows.map((row) => {
        const copy = { ...row } as Record<string, any>;
        delete copy.tenant_id;
        delete copy.branch_id;
        return copy;
      });
      const fallback = await supabase.from(table).insert(fallbackRows).select('*');
      data = fallback.data;
      error = fallback.error;
    }
    if (error?.code === '42P01') continue;
    if (error) {
      console.error('bulkAddItems error', error);
      continue;
    }
    if (table !== itemsTable) setItemsTable(table);
    setItems((prev) => [...prev, ...((data as ItemRow[]) ?? [])]);
    await recomputeOrderTotal();
    return;
  }
  alert('No se pudieron agregar los productos.');
}

  async function bulkRemoveByNames(names: string[], groupName: string) {
    if (!order || !names.length) return;
    const toRemove = items.filter((r) => (r.group_name || null) === (groupName || null) && names.includes(r.product_name));
    if (!toRemove.length) return;
    const ids = toRemove.map((r) => r.id);
    const { error } = await supabase.from(itemsTable).delete().in("id", ids);
    if (error) { console.error(error); alert("No se pudieron quitar productos."); return; }
    setItems((prev) => prev.filter((r) => !ids.includes(r.id)));
    await recomputeOrderTotal();
  }

  async function removeItem(id: string) {
    const { error } = await supabase.from(itemsTable).delete().eq("id", id);
    if (error) { console.error(error); alert("No se pudo quitar el producto."); return; }
    setItems((prev) => prev.filter((r) => r.id !== id));
    await recomputeOrderTotal();
  }

  async function updateStock(id: string, stock: number | null) {
  const nowIso = new Date().toISOString();
  const payload = { stock_qty: stock, stock_updated_at: nowIso };

  const { error } = await supabase
    .from(itemsTable)
    .update(payload)
    .eq("id", id);

  if (error) {
    console.error(error);
    alert("No se pudo actualizar el stock.");
    return;
  }

  setItems((prev) =>
    prev.map((r) => (r.id === id ? { ...r, ...payload } : r))
  );
}

  async function updateUnitPrice(id: string, unit_price: number) {
  const safe = Math.max(0, Number.isFinite(unit_price) ? Math.round(unit_price) : 0);
  const nowIso = new Date().toISOString();

  const { error } = await supabase
    .from(itemsTable)
    .update({ unit_price: safe, price_updated_at: nowIso }) // 👈 guarda sello de tiempo
    .eq("id", id);

  if (error) {
    console.error(error);
    alert("No se pudo actualizar el precio.");
    return;
  }

  setItems((prev) =>
    prev.map((r) =>
      r.id === id ? { ...r, unit_price: safe, price_updated_at: nowIso } : r
    )
  );

  await recomputeOrderTotal();
}

async function updatePackSize(id: string, pack: number | null) {
  const value = pack && pack > 1 ? Math.round(pack) : null;
  const { error } = await supabase
    .from(itemsTable)
    .update({ pack_size: value })
    .eq("id", id);

  if (error) {
    console.error(error);
    alert("No se pudo actualizar el tamaño del paquete.");
    return;
  }

  setItems((prev) => prev.map((r) => (r.id === id ? { ...r, pack_size: value } : r)));
}


  async function updateQty(id: string, qty: number) {
    const { error } = await supabase.from(itemsTable).update({ qty }).eq("id", id);
    if (error) { console.error(error); alert("No se pudo actualizar la cantidad."); return; }
    setItems((prev) => prev.map((r) => (r.id === id ? { ...r, qty } : r)));
    await recomputeOrderTotal();
  }
  async function updateDisplayName(id: string, label: string) {
  const clean = (label || "").trim();
  const { error } = await supabase
    .from(itemsTable)
    .update({ display_name: clean || null })
    .eq("id", id);

  if (error) {
    console.error(error);
    alert("No se pudo actualizar el nombre.");
    return;
  }

  setItems((prev) =>
    prev.map((r) => (r.id === id ? { ...r, display_name: clean || null } : r))
  );
}


  async function updateGroupName(oldName: string, newName: string) {
  const oldKey = oldName || null;
  const newKey = newName || null;

  const { error } = await supabase
    .from(itemsTable)
    .update({ group_name: newKey })
    .eq("order_id", order?.id)
    .eq("group_name", oldKey);

  if (error) { console.error(error); alert("No se pudo renombrar el grupo."); return; }

  // Actualizar items en memoria
  setItems((prev) => prev.map((r) => (r.group_name === oldKey ? { ...r, group_name: newKey } : r)));

  // 🔧 Mantener el orden guardado en sincronía
  setGroupOrder((prev) => {
    const visibleOld = (oldName || "Sin grupo").trim();
    const visibleNew = (newName || "Sin grupo").trim();
    const arr = prev.length ? [...prev] : Array.from(new Set(items.map(it => (it.group_name || "Sin grupo").trim())));
    const i = arr.indexOf(visibleOld);
    if (i !== -1) arr[i] = visibleNew; else if (!arr.includes(visibleNew)) arr.push(visibleNew);
    // Persistir
    if (order?.id) void saveUIState(order.id, { group_order: arr });
    return arr;
  });
}


  async function deleteGroup(name: string) {
    const gKey = name === "Sin grupo" ? null : name;
    const groupIds = items
      .filter((r) => r.group_name === gKey || (gKey === null && (r.group_name === null || r.group_name === undefined)))
      .map((r) => r.id);
    const { error } = await supabase
      .from(itemsTable)
      .delete()
      .eq("order_id", order?.id)
      .eq("group_name", gKey);
    if (error) { console.error(error); alert("No se pudo eliminar el grupo."); return; }
    setItems((prev) => prev.filter((r) => !groupIds.includes(r.id)));
    await recomputeOrderTotal();
  }

    /* ===== Copiar lista simple (qty + nombre) ===== */
  /* ===== Copiar lista simple (qty + nombre) — respeta orden visible ===== */
async function handleCopySimpleList() {
  try {
    // Helper: ordenar ítems dentro del grupo igual que en la UI
    const sortItemsForCopy = (arr: ItemRow[]) => {
      const byNameAsc = (a: ItemRow, b: ItemRow) =>
        (a.display_name || a.product_name)
          .localeCompare(b.display_name || b.product_name, "es", { sensitivity: "base" });
      const byNameDesc = (a: ItemRow, b: ItemRow) => -byNameAsc(a, b);

      const avg4w = (name: string) =>
        computeStats(sales, name, latestDateForProduct(sales, name)).avg4w || 0;

      const list = [...arr];
      if (sortMode === "alpha_asc") list.sort(byNameAsc);
      else if (sortMode === "alpha_desc") list.sort(byNameDesc);
      else if (sortMode === "avg_desc")
        list.sort((a, b) => (avg4w(b.product_name) - avg4w(a.product_name)) || byNameAsc(a, b));
      else if (sortMode === "avg_asc")
        list.sort((a, b) => (avg4w(a.product_name) - avg4w(b.product_name)) || byNameAsc(a, b));

      return list;
    };

    // Recorremos los GRUPOS en el mismo orden que se renderizan (memo `groups`)
    const lines: string[] = [];
    for (const [groupName, arr] of groups) {
      // Ítems reales del grupo, con cantidad > 0
      const visibles = arr
        .filter(it => it.product_name !== GROUP_PLACEHOLDER && (it.qty || 0) > 0);

      if (!visibles.length) continue;

      // Orden interno igual que la UI
      const ordered = sortItemsForCopy(visibles);

      // (Opcional) si querés incluir el título del grupo, descomentá:
      // lines.push(`[${groupName || "Sin grupo"}]`);

      for (const it of ordered) {
        const label = it.display_name || it.product_name;
        lines.push(`${it.qty} ${label}`);
      }
    }

    const text = lines.join("\n") || "(sin items)";

    if (navigator.clipboard && window.isSecureContext) {
      await navigator.clipboard.writeText(text);
    } else {
      const ta = document.createElement("textarea");
      ta.value = text;
      ta.style.position = "fixed";
      ta.style.opacity = "0";
      document.body.appendChild(ta);
      ta.focus();
      ta.select();
      document.execCommand("copy");
      document.body.removeChild(ta);
    }

    alert(`Copiado ${lines.length} línea${lines.length === 1 ? "" : "s"} al portapapeles`);
  } catch (e) {
    console.error("copy error", e);
    alert("No se pudo copiar. Probá nuevamente o verificá permisos del portapapeles.");
  }
}


  /* ===== Export / Import de items ===== */
  // ⬇️ Reemplaza tu handleExport actual por este
// ⬇️ Reemplaza COMPLETO por esta versión
// ⬇️ Reemplaza COMPLETO por esta versión: fecha real de Excel en "Últ. venta"
// ⬇️ Reemplaza COMPLETO: día ES separado + fecha real Excel + estilos forzados
// ✅ SAME lógica que tu versión estable (estadísticas OK)
// ✅ "Últ. venta" = día (ES) + fecha en UNA SOLA columna (fecha real Excel)
// ✅ Encabezado lila + zebra gris por columnas
async function exportOrderAsXlsx() {
  if (!order) throw new Error("El pedido todavía no está listo para exportar.");
  // Estilos si están; si no, cae a xlsx puro (sin romper)
  let XLSX: any;
  try { XLSX = await import("xlsx-js-style"); }
  catch { XLSX = await import("xlsx"); }

  // ---- Helpers fecha (serial Excel) ----
  const EXCEL_EPOCH_UTC = Date.UTC(1899, 11, 30);
  const msToExcelSerial = (msUtc: number) => (msUtc - EXCEL_EPOCH_UTC) / 86400000;

  // ====== Encabezados (¡una sola columna para Día + Fecha!) ======
  const HEAD = [
    "Grupo",
    "Producto",
    "Pedido",
    "Precio",
    "Stock actual",
    "Subtotal",
    "Últ. venta",       // 👈 día + fecha (número Excel con formato ES)
    "Prom/sem (4s)",
    "Ventas 2 sem",
    "Ventas 30 días",
    "Pedido anterior",
  ];
  const ws = XLSX.utils.aoa_to_sheet([HEAD]);

  // Anchos de columna
  ws["!cols"] = [
    { wch: 14 }, // A
    { wch: 40 }, // B
    { wch: 8  }, // C
    { wch: 10 }, // D
    { wch: 9  }, // E
    { wch: 12 }, // F
    { wch: 22 }, // G  Últ. venta (día + fecha)
    { wch: 12 }, // H
    { wch: 12 }, // I
    { wch: 12 }, // J
    { wch: 12 }, // K
  ];

  // Autofiltro + freeze (A..K)
  ws["!autofilter"] = { ref: "A1:K1" };
  (ws as any)["!freeze"] = { xSplit: 0, ySplit: 1 };
  (ws as any)["!pane"]   = { state: "frozen", ySplit: 1, topLeftCell: "A2", activePane: "bottomLeft" };

  // ===== Estilos =====
  const HEADER_BG = "FF5B21B6"; // lila oscuro
  const HEADER_FG = "FFFFFFFF";
  const headerStyle = {
    font: { bold: true, color: { rgb: HEADER_FG } },
    fill: { fgColor: { rgb: HEADER_BG } },
    alignment: { vertical: "center" },
  } as any;

  const COL_LIGHT = { fill: { fgColor: { rgb: "FFF3F4F6" } } }; // gris claro
  const COL_DARK  = { fill: { fgColor: { rgb: "FFE5E7EB" } } }; // gris más oscuro
  const colFillFor = (c: number) => (c % 2 === 0 ? COL_LIGHT : COL_DARK);

  // Encabezado
  for (let c = 0; c < HEAD.length; c++) {
    const addr = XLSX.utils.encode_cell({ r: 0, c });
    ws[addr] = { t: "s", v: HEAD[c], s: headerStyle };
  }
  ws["!rows"] = [{ hpt: 24 }];

  // Formatos
  const INT_FMT      = "#,##0";
  const ARS_FMT      = '"$"#,##0';
  // 👇 Un único número Excel con máscara que muestra día (ES) + fecha
  // [$-C0A] -> locale español
  const LASTSALE_FMT = '[$-C0A]dddd dd/mm/yyyy';

  // Orden A→Z por Grupo y Producto (sin placeholders)
  const realItems = items
    .filter((it) => it.product_name !== GROUP_PLACEHOLDER)
    .sort((a, b) => {
      const ga = (a.group_name || "Sin grupo");
      const gb = (b.group_name || "Sin grupo");
      const gcmp = ga.localeCompare(gb, "es", { sensitivity: "base" });
      if (gcmp !== 0) return gcmp;
      const na = (a.display_name || a.product_name);
      const nb = (b.display_name || b.product_name);
      return na.localeCompare(nb, "es", { sensitivity: "base" });
    });

  // Helper para escribir celda con zebra por columna
  function setCell(r0: number, c: number, cell: any) {
    const addr = XLSX.utils.encode_cell({ r: r0, c });
    const zebra = colFillFor(c);
    ws[addr] = { ...cell, s: { ...(cell.s || {}), ...(zebra as any) } };
  }

  // ---- Volcado de filas ----
  const startRow = 2;
  let r = startRow;

  for (const it of realItems) {
    const row0 = r - 1;

    // Métricas (idéntico a tu versión que funcionaba)
    const anchor = latestDateForProduct(sales, it.product_name);
    const st = computeStats(sales, it.product_name, anchor);

    // A: Grupo
    setCell(row0, 0, { t: "s", v: it.group_name || "Sin grupo" });

    // B: Producto (visible si existe etiqueta)
    setCell(row0, 1, { t: "s", v: it.display_name || it.product_name });

    // C: Pedido
    setCell(row0, 2, { t: "n", v: Number(it.qty || 0), z: INT_FMT });

    // D: Precio
    setCell(row0, 3, { t: "n", v: Number(it.unit_price || 0), z: ARS_FMT });

    // E: Stock actual
    setCell(row0, 4, { t: "n", v: Number(it.stock_qty ?? 0), z: INT_FMT });

    // F: Subtotal = C * D
    setCell(row0, 5, { t: "n", f: `C${r}*D${r}`, z: ARS_FMT });

    // G: Últ. venta — número Excel con formato español (día + fecha)
    if (typeof st.lastDate === "number") {
      const serial = msToExcelSerial(st.lastDate);
      setCell(row0, 6, { t: "n", v: serial, z: LASTSALE_FMT });
    } else {
      setCell(row0, 6, { t: "s", v: "" });
    }

    // H: Prom/sem (4s)
    setCell(row0, 7, { t: "n", v: Number(st.avg4w || 0),  z: INT_FMT });

    // I: Ventas 2 sem
    setCell(row0, 8, { t: "n", v: Number(st.sum2w || 0),  z: INT_FMT });

    // J: Ventas 30 días
    setCell(row0, 9, { t: "n", v: Number(st.sum30d || 0), z: INT_FMT });

    // K: Pedido anterior
    if (it.previous_qty == null) {
      setCell(row0, 10, { t: "s", v: "" });
    } else {
      setCell(row0, 10, { t: "n", v: Number(it.previous_qty), z: INT_FMT });
    }

    r++;
  }

  // ---- Totales (C, E, F) ----
  const lastDataRow = r - 1;
  const totalsRow = r;

  setCell(totalsRow - 1, 0, { t: "s", v: "Totales", s: { font: { bold: true } } });
  setCell(totalsRow - 1, 2, { t: "n", f: `SUM(C${startRow}:C${lastDataRow})`, z: INT_FMT, s: { font: { bold: true } } });
  setCell(totalsRow - 1, 4, { t: "n", f: `SUM(E${startRow}:E${lastDataRow})`, z: INT_FMT, s: { font: { bold: true } } });
  setCell(totalsRow - 1, 5, { t: "n", f: `SUM(F${startRow}:F${lastDataRow})`, z: ARS_FMT, s: { font: { bold: true } } });

  // Rango A..K
  ws["!ref"] = XLSX.utils.encode_range({ s: { r: 0, c: 0 }, e: { r: totalsRow - 1, c: 10 } });

  // Libro y guardado
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Pedido");
  const safeProv = (providerName || "Proveedor").replace(/[\\/:*?"<>|]+/g, "_");
  XLSX.writeFile(wb, `pedido_${safeProv}_${isoToday()}.xlsx`);
}

  function buildOrderExportJsonPayload(): OrderExportJsonPayload {
    const effectiveOrderId = order?.id ?? "";
    const fallbackTenant = order?.tenant_id ?? tenantId ?? tenantIdFromQuery ?? null;
    const fallbackBranch = order?.branch_id ?? branchId ?? branchIdFromQuery ?? null;

    const realItems = items.filter((it) => it.product_name !== GROUP_PLACEHOLDER);
    const validIds = new Set(realItems.map((it) => it.id));
    const cleanedCheckedMap = Object.fromEntries(
      Object.entries(checkedMap).filter(([id]) => validIds.has(id)).map(([id, val]) => [id, Boolean(val)])
    );

    return {
      kind: ORDER_EXPORT_KIND,
      version: ORDER_EXPORT_VERSION,
      generatedAt: new Date().toISOString(),
      order: {
        id: effectiveOrderId,
        tenantId: fallbackTenant ?? null,
        branchId: fallbackBranch ?? null,
        status: order?.status,
        notes: order?.notes ?? null,
      },
      provider: {
        id: order?.provider_id ?? provId ?? "",
        name: providerName ?? null,
      },
      items: realItems.map<OrderExportJsonItem>((it) => ({
        id: it.id,
        productName: it.product_name,
        displayName: it.display_name ?? null,
        qty: it.qty ?? 0,
        unitPrice: it.unit_price ?? 0,
        groupName: it.group_name ?? null,
        packSize: it.pack_size ?? null,
        stockQty: it.stock_qty ?? null,
        stockUpdatedAt: it.stock_updated_at ?? null,
        previousQty: it.previous_qty ?? null,
        previousQtyUpdatedAt: it.previous_qty_updated_at ?? null,
        priceUpdatedAt: it.price_updated_at ?? null,
        tenantId: it.tenant_id ?? fallbackTenant ?? null,
        branchId: it.branch_id ?? fallbackBranch ?? null,
      })),
      groupOrder: [...groupOrder],
      checkedMap: cleanedCheckedMap,
    };
  }

  async function exportOrderAsJson() {
    if (!order) throw new Error("El pedido todavía no está listo para exportar.");
    const payload = buildOrderExportJsonPayload();
    const safeProv = (providerName || "Proveedor").replace(/[\\/:*?"<>|]+/g, "_");
    const blob = new Blob([JSON.stringify(payload, null, 2)], {
      type: "application/json;charset=utf-8",
    });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `pedido_${safeProv}_${isoToday()}.json`;
    document.body.appendChild(anchor);
    anchor.click();
    document.body.removeChild(anchor);
    URL.revokeObjectURL(url);
  }

  async function handleExport(format: OrderExportFormat) {
    if (format === "json") {
      await exportOrderAsJson();
      return;
    }
    await exportOrderAsXlsx();
  }








  async function importOrderFromXlsx(buffer: ArrayBuffer) {
    if (!order) throw new Error("No hay un pedido activo en este momento.");
    const XLSX = await import("xlsx");
    const wb = XLSX.read(buffer, { type: "array" });
    const ws = wb.Sheets[wb.SheetNames[0]];
    const aoa: any[][] = XLSX.utils.sheet_to_json(ws, { header: 1 });
    const head = (aoa[0] || []).map((x) => String(x || "").toLowerCase());
    const hasHeader = head.join("|").includes("grupo") && head.join("|").includes("producto");
    const body = hasHeader ? aoa.slice(1) : aoa;

    const parsed = body
      .map((row) => {
        const [g, p, q, u] = row;
        const product_name = p ? String(p).trim() : "";
        if (!product_name) return null;
        const qty = Number(q ?? 0) || 0;
        const unit_price = Number(u ?? 0) || 0;
        const group_name = g != null && String(g).trim() ? String(g).trim() : null;
        return { product_name, qty, unit_price, group_name };
      })
      .filter(Boolean) as SnapshotPayload["items"];

    const { error: delErr } = await supabase.from(itemsTable).delete().eq("order_id", order.id);
    if (delErr) throw delErr;

    const { data: inserted, error: insErr } = await supabase
      .from(itemsTable)
      .insert(parsed.map((r) => ({ order_id: order.id, ...r })))
      .select("*");
    if (insErr) throw insErr;

    const newItems = (inserted as ItemRow[]) ?? [];
    setItems(newItems);
    await recomputeOrderTotal(newItems);
    applyImportedUIState({ checkedMap: {} });
    alert("Archivo importado correctamente ✅");
  }

  async function importOrderFromJson(text: string) {
    if (!order) throw new Error("No hay un pedido activo en este momento.");
    let parsed: unknown;
    try {
      parsed = JSON.parse(text);
    } catch (err) {
      throw new Error("El archivo JSON no tiene un formato válido.");
    }
    if (!isRecord(parsed)) throw new Error("Formato de backup inválido.");
    if (typeof parsed.kind === "string" && parsed.kind !== ORDER_EXPORT_KIND) {
      throw new Error("El archivo JSON no corresponde a un backup de pedidos de Gestock.");
    }
    const version = typeof parsed.version === "number" ? parsed.version : 0;
    if (version < 1) throw new Error("Versión de backup no soportada.");

    const itemsRaw = Array.isArray(parsed.items) ? parsed.items : [];
    if (!itemsRaw.length) throw new Error("El archivo no contiene productos.");

    const toNullableString = (val: unknown): string | null => {
      if (val === null || val === undefined) return null;
      const str = String(val).trim();
      return str.length ? str : null;
    };
    const toNullableNumber = (val: unknown): number | null => {
      if (val === null || val === undefined || val === "") return null;
      const num = Number(val);
      return Number.isFinite(num) ? num : null;
    };
    const toNumber = (val: unknown, fallback = 0) => {
      const num = Number(val);
      return Number.isFinite(num) ? num : fallback;
    };
    const normalizeGroupName = (val: unknown): string | null => {
      if (val === null || val === undefined) return null;
      const str = String(val).trim();
      return str.length ? str : null;
    };

    const fallbackTenant = order?.tenant_id ?? tenantId ?? tenantIdFromQuery ?? null;
    const fallbackBranch = order?.branch_id ?? branchId ?? branchIdFromQuery ?? null;

    const rows = itemsRaw
      .map((entry) => {
        if (!isRecord(entry)) return null;
        const productRaw = entry.productName ?? entry.product_name;
        if (typeof productRaw !== "string") return null;
        const productName = productRaw.trim();
        if (!productName) return null;

        const row: Record<string, any> = {
          order_id: order.id,
          product_name: productName,
          display_name: toNullableString(entry.displayName ?? entry.display_name),
          qty: toNumber(entry.qty ?? entry.quantity ?? 0, 0),
          unit_price: toNumber(entry.unitPrice ?? entry.unit_price ?? 0, 0),
          group_name: normalizeGroupName(entry.groupName ?? entry.group_name),
          pack_size: toNullableNumber(entry.packSize ?? entry.pack_size),
          stock_qty: toNullableNumber(entry.stockQty ?? entry.stock_qty),
          stock_updated_at: toNullableString(entry.stockUpdatedAt ?? entry.stock_updated_at),
          previous_qty: toNullableNumber(entry.previousQty ?? entry.previous_qty),
          previous_qty_updated_at: toNullableString(entry.previousQtyUpdatedAt ?? entry.previous_qty_updated_at),
          price_updated_at: toNullableString(entry.priceUpdatedAt ?? entry.price_updated_at),
        };

        if (typeof entry.id === "string" && entry.id.trim()) row.id = entry.id.trim();

        const tenantValue = entry.tenantId ?? entry.tenant_id ?? fallbackTenant;
        if (tenantValue !== undefined) row.tenant_id = toNullableString(tenantValue) ?? null;

        const branchValue = entry.branchId ?? entry.branch_id ?? fallbackBranch;
        if (branchValue !== undefined) row.branch_id = toNullableString(branchValue) ?? null;

        return row;
      })
      .filter((row): row is Record<string, any> => Boolean(row));

    if (!rows.length) throw new Error("No se encontraron productos válidos en el archivo.");

    const { error: delErr } = await supabase.from(itemsTable).delete().eq("order_id", order.id);
    if (delErr) throw delErr;

    const { data: inserted, error: insErr } = await supabase
      .from(itemsTable)
      .insert(rows)
      .select("*");
    if (insErr) throw insErr;

    const newItems = (inserted as ItemRow[]) ?? [];
    setItems(newItems);
    await recomputeOrderTotal(newItems);

    const validIds = new Set(newItems.map((it) => it.id));
    const groupOrderRaw = (parsed.groupOrder ?? parsed.group_order) as unknown;
    const sanitizedGroupOrder = Array.isArray(groupOrderRaw)
      ? groupOrderRaw.filter((val): val is string => typeof val === "string").map((val) => val.trim())
      : undefined;

    const checkedMapRaw = (parsed.checkedMap ?? parsed.checked_map) as unknown;
    const sanitizedCheckedMap = isRecord(checkedMapRaw)
      ? Object.entries(checkedMapRaw).reduce<Record<string, boolean>>((acc, [id, val]) => {
          if (validIds.has(id)) acc[id] = Boolean(val);
          return acc;
        }, {})
      : {};

    const uiPatch: { groupOrder?: string[]; checkedMap?: Record<string, boolean> } = {
      checkedMap: sanitizedCheckedMap,
    };
    if (sanitizedGroupOrder !== undefined) uiPatch.groupOrder = sanitizedGroupOrder;
    applyImportedUIState(uiPatch);

    alert("Pedido importado correctamente ✅");
  }

  async function handleImportFile(file: File) {
    if (!order) return;
    setImporting(true);
    try {
      const extension = file.name.toLowerCase().split(".").pop();
      if (extension === "json" || file.type === "application/json" || file.type === "text/json") {
        const text = await file.text();
        await importOrderFromJson(text);
      } else {
        const buffer = await file.arrayBuffer();
        await importOrderFromXlsx(buffer);
      }
    } catch (e: any) {
      console.error("import error", e);
      alert(`No se pudo importar el archivo.\n${e?.message ?? ""}`);
    } finally {
      setImporting(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  /* ===== NUEVO: Importar VENTAS a Storage + activar URL ===== */
  async function handleImportSales(file: File) {
    setImportingSales(true);
    try {
      setSalesImportError(null);
      const ts  = Date.now();
      const safeName = file.name.replace(/[^\w.\-]+/g, "_");
      const path = `${STORAGE_DIR_SALES}/sales_${ts}__${safeName}`;

      await ensureSalesBucketOnce();

      let uploadError: any = null;
      for (let attempt = 0; attempt < 2; attempt += 1) {
        const { error } = await supabase.storage.from(STORAGE_BUCKET).upload(path, file, {
          cacheControl: "3600",
          upsert: false,
          contentType:
            file.type || "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        });

        if (!error) {
          uploadError = null;
          break;
        }

        uploadError = error;
        const statusCode =
          typeof error.statusCode === "number"
            ? error.statusCode
            : typeof (error as any)?.status === "number"
            ? (error as any).status
            : undefined;
        const mentionsBucket =
          typeof error.message === "string" && error.message.toLowerCase().includes("bucket");
        const shouldRetry = attempt === 0 && (statusCode === 404 || mentionsBucket);
        if (!shouldRetry) break;
        ensureSalesBucketPromise = null;
        await ensureSalesBucketOnce();
      }

      let payload: SalesPersistMeta;
      if (uploadError) {
        const statusCode =
          typeof uploadError.statusCode === "number"
            ? uploadError.statusCode
            : typeof (uploadError as any)?.status === "number"
            ? (uploadError as any).status
            : undefined;
        const isNotFound = statusCode === 404;
        const mentionsBucket =
          typeof uploadError.message === "string" && uploadError.message.toLowerCase().includes("bucket");
        if (!isNotFound && !mentionsBucket) throw uploadError;

        const buffer = await file.arrayBuffer();
        payload = {
          base64: arrayBufferToBase64(buffer),
          mime_type:
            file.type || "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
          filename: file.name,
          uploaded_at: new Date().toISOString(),
          tenant_id: tenantId ?? null,
          branch_id: branchId ?? null,
        };
      } else {
        const { data: pub } = supabase.storage.from(STORAGE_BUCKET).getPublicUrl(path);
        const url = pub.publicUrl;
        payload = {
          url,
          filename: file.name,
          uploaded_at: new Date().toISOString(),
          tenant_id: tenantId ?? null,
          branch_id: branchId ?? null,
        };
      }

      const salesKey = salesKeyForScope(tenantId ?? null, branchId ?? null);
      payload.scope_key = salesKey;
      if (!tenantSlug) throw new Error("No se pudo determinar el tenant actual.");

      const scope = branchId ? "branch" : "global";
      const response = await fetch(`/api/t/${tenantSlug}/settings`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          scope,
          key: salesKey,
          value: payload,
          ...(branchId ? { branchId } : {}),
        }),
      });

      if (!response.ok) {
        let message = "No se pudo guardar las ventas importadas.";
        try {
          const errJson = await response.json();
          if (errJson?.error) message = String(errJson.error);
        } catch {}
        throw new Error(message);
      }

      const usedInlineStorage = Boolean(payload.base64);
      const rows = await loadSalesFromMeta(payload);
      setSales(rows);
      setSalesMeta({ source: "imported", label: file.name || "archivo importado" });
      alert(
        usedInlineStorage
          ? "Ventas importadas y guardadas localmente (no se encontró el bucket de Storage). ✅"
          : "Ventas actualizadas desde el archivo importado ✅"
      );
    } catch (e: any) {
      console.error("handleImportSales error", e);
      const message = e?.message ? String(e.message) : "";
      setSalesImportError(message || "No se pudo importar el archivo de ventas.");
      alert(`No se pudo importar el archivo de ventas.\n${message}`);
    } finally {
      setImportingSales(false);
      if (salesUploadRef.current) salesUploadRef.current.value = "";
    }
  }

  async function resetSalesSource() {
    try {
      const salesKey = salesKeyForScope(tenantId ?? null, branchId ?? null);
      await supabase.from(TABLE_SETTINGS).delete().eq("key", salesKey);
      const rows = await loadSalesFromURL(VENTAS_URL);
      setSales(rows);
      setSalesMeta({ source: "default", label: "ventas.xlsx" });
      alert("Se restableció la fuente de ventas por defecto.");
    } catch (e: any) {
      console.error(e);
      alert(`No se pudo restablecer la fuente por defecto.\n${e?.message ?? ""}`);
    }
  }

  const startEditingSnapshot = React.useCallback((snap: SnapshotRow) => {
    setEditingSnapshotId(snap.id);
    setSnapshotTitleDraft(snap.title);
  }, []);

  const cancelEditingSnapshot = React.useCallback(() => {
    setEditingSnapshotId(null);
    setSnapshotTitleDraft("");
  }, []);

  /* ===== Historial ===== */
  async function loadSnapshots() {
    if (!order) return;
    const { data, error } = await supabase
      .from(TABLE_SNAPSHOTS)
      .select("*")
      .eq("order_id", order.id)
      .order("created_at", { ascending: false })
      .limit(200);
    if (error) { console.error(error); alert(`No se pudo cargar el historial: ${error.message}`); return; }
    setSnapshots((data ?? []) as SnapshotRow[]);
  }

  async function commitSnapshotTitle() {
    if (!editingSnapshotId) return;
    const trimmed = snapshotTitleDraft.trim();
    if (!trimmed) {
      alert("El nombre no puede estar vacío.");
      snapshotTitleInputRef.current?.focus();
      return;
    }

    const currentSnapshot = snapshots.find((snap) => snap.id === editingSnapshotId);
    if (!currentSnapshot) {
      cancelEditingSnapshot();
      return;
    }

    if (currentSnapshot.title === trimmed) {
      cancelEditingSnapshot();
      return;
    }

    setRenamingSnapshotId(editingSnapshotId);
    try {
      const { error } = await supabase
        .from(TABLE_SNAPSHOTS)
        .update({ title: trimmed })
        .eq("id", editingSnapshotId);
      if (error) throw error;

      setSnapshots((prev) =>
        prev.map((snap) => (snap.id === editingSnapshotId ? { ...snap, title: trimmed } : snap))
      );

      cancelEditingSnapshot();
    } catch (err: any) {
      console.error(err);
      alert(`No se pudo renombrar la versión.\n${err?.message ?? ""}`);
      snapshotTitleInputRef.current?.focus();
    } finally {
      setRenamingSnapshotId(null);
    }
  }

  async function saveSnapshot() {
  if (!order) return;
  try {
    const payload: SnapshotPayload = {
      items: items
  .filter((it) => it.product_name !== GROUP_PLACEHOLDER)
  .map((it) => ({
    product_name: it.product_name,
    display_name: it.display_name ?? null,   // 👈 NUEVO
    qty: it.qty,
    unit_price: it.unit_price,
    group_name: it.group_name,
  })),

    };
    const title = `${providerName} - ${isoToday()}`;

    // Aseguramos que los totales estén al día
    const totalNow = items.reduce((a, it) => a + (it.unit_price || 0) * (it.qty || 0), 0);
    const qtyNow   = items.reduce((a, it) => a + (it.qty || 0), 0);

    // 1) Guardar snapshot
    const { error } = await supabase
      .from(TABLE_SNAPSHOTS)
      .insert([{ order_id: order.id, title, snapshot: payload }])
      .select("*")
      .single();
    if (error) throw error;

    // 2) Sincronizar resumen (por si aún no se había recalculado)
    await saveOrderSummary(totalNow, qtyNow);

    await loadSnapshots();
    setHistoryOpen(true);
  } catch (e: any) {
    console.error(e);
    alert(`No se pudo guardar en historial.\n${e?.message ?? ""}`);
  }
}


  async function openSnapshot(snap: SnapshotRow) {
    if (!order) return;
    const itemsPayload = (snap.snapshot?.items ?? []) as SnapshotPayload["items"];
    const { error: delErr } = await supabase.from(itemsTable).delete().eq("order_id", order.id);
    if (delErr) { console.error(delErr); alert("No se pudo abrir la versión (borrado previo)."); return; }
    
const { data: inserted, error: insErr } = await supabase
  .from(itemsTable)
  .insert(itemsPayload.map((r) => ({
    order_id: order.id,
    product_name: r.product_name,
    display_name: r.display_name ?? null,   // 👈 NUEVO
    qty: r.qty,
    unit_price: r.unit_price,
    group_name: r.group_name,
  })))
  .select("*");


    if (insErr) { console.error(insErr); alert("No se pudo abrir la versión (insert)."); return; }
    const newItems = (inserted as ItemRow[]) ?? [];
    setItems(newItems);
    await recomputeOrderTotal(newItems);
    setHistoryOpen(false);
  }

  async function deleteSnapshot(snapId: string) {
    const { error } = await supabase.from(TABLE_SNAPSHOTS).delete().eq("id", snapId);
    if (error) { console.error(error); alert("No se pudo borrar."); return; }
    await loadSnapshots();
  }

  async function confirmExport() {
    try {
      setExportingOrder(true);
      await handleExport(exportFormat);
      setExportDialogOpen(false);
    } catch (err: any) {
      console.error("export error", err);
      alert(`No se pudo exportar el pedido.\n${err?.message ?? ""}`);
    } finally {
      setExportingOrder(false);
    }
  }

    /* ===== Render ===== */
  if (!order) return null;

  // Ajuste global de alturas: --bottom-nav-h se comparte con el footer
  return (
    <>
      <Dialog
        open={exportDialogOpen}
        onOpenChange={(open) => {
          if (exportingOrder) return;
          setExportDialogOpen(open);
        }}
      >
        <DialogContent showCloseButton={!exportingOrder} className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Exportar pedido</DialogTitle>
            <DialogDescription>
              Elegí el formato para descargar el pedido actual.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-xs font-medium uppercase text-muted-foreground">Formato</label>
              <Select
                value={exportFormat}
                onValueChange={(value) => setExportFormat(value as OrderExportFormat)}
                disabled={exportingOrder}
              >
                <SelectTrigger className="mt-1">
                  <SelectValue placeholder="Seleccionar formato" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="xlsx">Excel (.xlsx)</SelectItem>
                  <SelectItem value="json">Backup (.json)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <p className="text-xs text-muted-foreground">
              El backup JSON incluye nombres, grupos, paquetes, stock y estados de verificación para restaurar este pedido más adelante.
            </p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setExportDialogOpen(false)} disabled={exportingOrder}>
              Cancelar
            </Button>
            <Button onClick={() => void confirmExport()} disabled={exportingOrder}>
              {exportingOrder ? <Loader2 className="h-4 w-4 animate-spin" /> : "Descargar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <main
        className="mx-auto max-w-md px-3 pb-[calc(156px+env(safe-area-inset-bottom)+var(--bottom-nav-h))]"
        style={rootStyle}
      >
     {/* Header */}
<div
  data-hidden={barsHidden}
  className={[
    "sticky top-0 z-20",
    "bg-background/90 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-b",
    "transform transition-transform duration-300 will-change-transform",
    "translate-y-0",
    "data-[hidden=true]:-translate-y-full",
  ].join(" ")}
>
  <div className="p-3">
    {/* Fila 1: volver + título */}
    <div className="flex items-center gap-2">
      <Button variant="ghost" size="icon" onClick={() => router.back()} aria-label="Volver">
        <ArrowLeft className="h-5 w-5" />
      </Button>

      <div className="flex-1 min-w-0">
        <div className="text-xs text-muted-foreground">Detalle de pedido</div>
        <div className="font-semibold text-lg leading-tight truncate">{providerName}</div>
        <div className="text-[11px] text-muted-foreground">
          Fuente ventas: {salesMeta.source === "imported" ? "Importada" : "Por defecto"} · {salesMeta.label}
        </div>
      </div>
    </div>

    {/* Fila 2: 4 botones en línea */}
    <div className="mt-2 flex items-center gap-2">
      {/* 1) Historial */}
      <Sheet
        open={historyOpen}
        onOpenChange={(v) => {
          setHistoryOpen(v);
          if (v) {
            void loadSnapshots();
          } else {
            cancelEditingSnapshot();
          }
        }}
      >
        <SheetTrigger asChild>
          <Button variant="outline" size="icon" aria-label="Historial" title="Historial">
            <History className="h-4 w-4" />
          </Button>
        </SheetTrigger>
        <SheetContent side="right" className="flex w-[85vw] max-w-sm flex-col">
          <SheetHeader>
            <SheetTitle>Historial</SheetTitle>
          </SheetHeader>
          <div className="mt-4 flex-1 space-y-3 overflow-y-auto pr-2">
            {snapshots.length === 0 && (
              <div className="text-sm text-muted-foreground">Aún no hay versiones guardadas.</div>
            )}
            {snapshots.map((s) => {
              const isEditing = editingSnapshotId === s.id;
              const isRenaming = renamingSnapshotId === s.id;
              return (
                <Card key={s.id}>
                  <CardContent className="p-3">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        {isEditing ? (
                          <Input
                            ref={isEditing ? snapshotTitleInputRef : undefined}
                            value={snapshotTitleDraft}
                            onChange={(e) => setSnapshotTitleDraft(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === "Enter") {
                                e.preventDefault();
                                void commitSnapshotTitle();
                              } else if (e.key === "Escape") {
                                e.preventDefault();
                                cancelEditingSnapshot();
                              }
                            }}
                            onBlur={() => void commitSnapshotTitle()}
                            disabled={isRenaming}
                            className="h-8"
                          />
                        ) : (
                          <div className="font-medium truncate" title={s.title}>
                            {s.title}
                          </div>
                        )}
                        <div className="text-xs text-muted-foreground">
                          {new Date(s.created_at).toLocaleString()}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {isEditing ? (
                          <>
                            <Button
                              variant="ghost"
                              size="icon"
                              aria-label="Guardar nombre"
                              onMouseDown={(e) => e.preventDefault()}
                              onClick={() => void commitSnapshotTitle()}
                              disabled={isRenaming}
                            >
                              {isRenaming ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                              ) : (
                                <Check className="h-4 w-4" />
                              )}
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              aria-label="Cancelar edición"
                              onMouseDown={(e) => e.preventDefault()}
                              onClick={() => cancelEditingSnapshot()}
                              disabled={isRenaming}
                            >
                              <X className="h-4 w-4" />
                            </Button>
                          </>
                        ) : (
                          <Button
                            variant="ghost"
                            size="icon"
                            aria-label="Renombrar versión"
                            onClick={() => startEditingSnapshot(s)}
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                        )}
                        <Button size="sm" onClick={() => void openSnapshot(s)} disabled={isRenaming}>
                          Abrir
                        </Button>
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="text-destructive"
                              aria-label="Eliminar"
                              disabled={isRenaming}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Eliminar versión</AlertDialogTitle>
                              <AlertDialogDescription>
                                ¿Seguro querés eliminar esta versión del historial?
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancelar</AlertDialogCancel>
                              <AlertDialogAction
                                className="bg-red-600 hover:bg-red-700"
                                onClick={() => void deleteSnapshot(s.id)}
                              >
                                Eliminar
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </SheetContent>
      </Sheet>

      {/* 2) Importar ventas (Storage) */}
      <input
        ref={salesUploadRef}
        type="file"
        accept=".xlsx,.xls,.csv"
        className="hidden"
        onChange={(e) => {
          const f = e.currentTarget.files?.[0];
          if (f) void handleImportSales(f);
        }}
      />
      <Button
        variant="outline"
        size="icon"
        aria-label="Importar ventas actualizadas"
        onClick={() => salesUploadRef.current?.click()}
        disabled={importingSales}
        title="Importar ventas actualizadas"
      >
        <Upload className="h-4 w-4" />
      </Button>

      {/* 3) Todo en 0 */}
      <AlertDialog>
        <AlertDialogTrigger asChild>
          <Button
            variant="outline"
            size="sm"
            className="h-8 rounded-lg shrink-0"
            disabled={zeroing}
            title="Poner todas las cantidades en 0"
          >
            Cant.0
          </Button>
        </AlertDialogTrigger>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Poner todas las cantidades en 0?</AlertDialogTitle>
            <AlertDialogDescription>
              Esto pondrá en 0 la cantidad de <b>todos</b> los productos del pedido.
              No afecta precios ni grupos. ¿Confirmás?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={() => void zeroAllQuantities()} disabled={zeroing}>
              Sí, poner todo en 0
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* 4) Sugerido */}
      <AlertDialog>
        <AlertDialogTrigger asChild>
          <Button
            variant="outline"
            size="sm"
            className="h-8 rounded-lg shrink-0"
            title="Aplicar cantidades sugeridas"
          >
            Sugerido
          </Button>
        </AlertDialogTrigger>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Qué tipo de pedido vas a hacer?</AlertDialogTitle>
            <AlertDialogDescription>
              Elegí el período para calcular las cantidades:
              <br />• <b>Semanal</b>: promedio semanal (últimas 4 semanas)
              <br />• <b>Quincenal</b>: ventas de las últimas 2 semanas
              <br />• <b>Mensual</b>: ventas de los últimos 30 días
              <br />Si un producto tiene “paquete”, se ajusta al múltiplo del pack.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="flex gap-2 justify-end pt-2">
            <AlertDialogCancel asChild>
              <Button variant="outline">Cancelar</Button>
            </AlertDialogCancel>

            <AlertDialogAction asChild>
              <Button disabled={suggesting} onClick={() => void handlePickSuggested("week")}>
                Semanal
              </Button>
            </AlertDialogAction>
            <AlertDialogAction asChild>
              <Button disabled={suggesting} onClick={() => void handlePickSuggested("2w")}>
                Quincenal
              </Button>
            </AlertDialogAction>
            <AlertDialogAction asChild>
              <Button disabled={suggesting} onClick={() => void handlePickSuggested("30d")}>
                Mensual
              </Button>
            </AlertDialogAction>
          </div>
        </AlertDialogContent>
      </AlertDialog>

      {salesImportError && (
        <div className="mt-3 flex items-start gap-3 rounded-md border border-amber-300 bg-amber-50 px-3 py-2 text-xs text-amber-900">
          <p className="flex-1 whitespace-pre-wrap break-words">{salesImportError}</p>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleCopySalesError}
            className="shrink-0 border-amber-400 text-amber-900 hover:bg-amber-100"
          >
            Copiar
          </Button>
        </div>
      )}

      {/* 5) Ped Ant.  ← NUEVO: guarda qty → previous_qty para todos */}
  <Button
    variant="outline"
    size="sm"
    className="h-8 rounded-lg shrink-0"
    title="Guardar el pedido anterior (copia las cantidades actuales)"
    onClick={() => void snapshotPreviousQuantities()}
  >
    Ped Ant.
  </Button>
          {/* === Buscador global: filtra dentro de todos los grupos === */}
    <div className="mt-2 relative">
      <Input
        value={filter}
        onChange={(e) => setFilter(e.target.value)}
        placeholder="Filtrar productos en todos los grupos…"
        className="pl-9 pr-9"
        aria-label="Filtrar productos"
      />
      <Search className="pointer-events-none absolute left-2 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
      {filter && (
        <button
          type="button"
          className="absolute right-2 top-1/2 -translate-y-1/2 rounded-md p-1 text-muted-foreground hover:bg-muted"
          aria-label="Limpiar filtro"
          onClick={() => setFilter("")}
        >
          <X className="h-4 w-4" />
        </button>
      )}
    </div>
    </div>
  </div>
</div>


      {/* Crear grupo */}
      <div className="mt-3">
        <label className="text-xs text-muted-foreground">Crear grupo</label>
        <GroupCreator onCreate={(name) => { if (name.trim()) void createGroup(name.trim()); }} />
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-2">
        <Button
          variant="secondary"
          size="sm"
          onClick={handleOpenSumModal}
          disabled={sumStockLoading || batchApplying || actionableItems.length === 0}
        >
          {sumStockLoading ? <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" /> : null}
          Sumar stock
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={handleOpenApplyModal}
          disabled={batchApplying || sumStockLoading || actionableItems.length === 0}
        >
          Aplicar ventas
        </Button>
        {actionableItems.length === 0 && (
          <span className="text-xs text-muted-foreground">
            Agregá productos al pedido para habilitar estas acciones.
          </span>
        )}
      </div>

      {/* Ordenar items + Casilla maestra */}
      <div className="mt-2">
        <label className="text-xs text-muted-foreground">Ordenar items</label>
        <div className="mt-1 flex items-center gap-2">
          {/* Select de orden, ocupa el espacio */}
          <div className="flex-1">
            <Select value={sortMode} onValueChange={(v) => setSortMode(v as SortMode)}>
              <SelectTrigger className="h-9">
                <SelectValue placeholder="Ordenar por..." />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="alpha_asc">Alfabético A→Z</SelectItem>
                <SelectItem value="alpha_desc">Alfabético Z→A</SelectItem>
                <SelectItem value="avg_desc">Prom/sem ↓</SelectItem>
                <SelectItem value="avg_asc">Prom/sem ↑</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center gap-2">
            {/* Casilla maestra a la derecha */}
            <label
              className="inline-flex items-center gap-2 px-2 py-1 rounded-md border hover:bg-muted cursor-pointer"
              title={allChecked ? "Desmarcar todos" : "Marcar todos"}
            >
              <Checkbox
                checked={bulkState}
                onCheckedChange={(v) => setAllChecked(v === true)}
                aria-label={allChecked ? "Desmarcar todos" : "Marcar todos"}
              />
              <span className="text-sm select-none hidden sm:inline">
                {allChecked ? "Todos" : "Marcar todos"}
              </span>
            </label>
          </div>
        </div>
      </div>

      <AlertDialog
        open={sumModalOpen}
        onOpenChange={(open) => {
          if (sumStockLoading) return;
          setSumModalOpen(open);
          if (!open) {
            setSumError(null);
          }
        }}
      >
        <AlertDialogContent className="max-w-3xl w-[min(100vw-2rem,720px)]">
          <AlertDialogHeader>
            <AlertDialogTitle>Sumar stock a todos los productos</AlertDialogTitle>
            <AlertDialogDescription>
              Ajustá las cantidades que se sumarán al stock actual antes de confirmar.
            </AlertDialogDescription>
          </AlertDialogHeader>

          <div className="mt-3 space-y-4">
            <div className="max-h-72 overflow-y-auto overflow-x-auto rounded-md border">
              <table className="w-full table-fixed border-collapse text-sm">
                <colgroup>
                  <col className="w-[48%]" />
                  <col className="w-[13%]" />
                  <col className="w-[15%]" />
                  <col className="w-[12%]" />
                  <col className="w-[12%]" />
                </colgroup>
                <thead className="bg-muted/60 text-xs uppercase tracking-wide text-muted-foreground">
                  <tr>
                    <th className="px-3 py-2 text-left">Producto</th>
                    <th className="px-3 py-2 text-right">Pedido</th>
                    <th className="px-3 py-2 text-right">Sumar</th>
                    <th className="px-3 py-2 text-right">Stock actual</th>
                    <th className="px-3 py-2 text-right">Stock final</th>
                  </tr>
                </thead>
                <tbody>
                  {sumPreviewRows.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="px-3 py-4 text-center text-muted-foreground">
                        No hay productos en este pedido.
                      </td>
                    </tr>
                  ) : (
                    sumPreviewRows.map(({ item, qtyOrdered, raw, addition, stockPrev, stockResult, isValid }) => (
                      <tr key={item.id} className="border-t">
                        <td className="px-3 py-2">
                          <div className="font-medium break-words leading-tight">
                            {item.display_name || item.product_name}
                          </div>
                          <div className="text-[11px] text-muted-foreground">{item.product_name}</div>
                        </td>
                        <td className="px-3 py-2 text-right tabular-nums">{qtyFormatter.format(qtyOrdered)}</td>
                        <td className="px-3 py-2 text-right">
                          <Input
                            value={raw}
                            onChange={(event) =>
                              setSumAdjustments((prev) => ({ ...prev, [item.id]: event.target.value }))
                            }
                            disabled={sumStockLoading}
                            className={clsx(
                              "h-8 w-20 text-right tabular-nums",
                              !isValid && "border-destructive text-destructive focus-visible:ring-destructive"
                            )}
                            inputMode="decimal"
                            aria-label={`Cantidad a sumar para ${item.display_name || item.product_name}`}
                          />
                        </td>
                        <td className="px-3 py-2 text-right tabular-nums">{qtyFormatter.format(stockPrev)}</td>
                        <td className="px-3 py-2 text-right tabular-nums font-semibold">
                          {qtyFormatter.format(stockResult)}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
                {sumPreviewRows.length > 0 && (
                  <tfoot className="border-t bg-muted/40 text-sm font-medium">
                    <tr>
                      <td className="px-3 py-2 text-right">Totales</td>
                      <td className="px-3 py-2 text-right tabular-nums">{qtyFormatter.format(sumTotals.qtyOrdered)}</td>
                      <td className="px-3 py-2 text-right tabular-nums">{qtyFormatter.format(sumTotals.addition)}</td>
                      <td className="px-3 py-2 text-right tabular-nums">{qtyFormatter.format(sumTotals.stockPrev)}</td>
                      <td className="px-3 py-2 text-right tabular-nums">{qtyFormatter.format(sumTotals.stockResult)}</td>
                    </tr>
                  </tfoot>
                )}
              </table>
            </div>

            {sumHasInvalid && (
              <p className="text-xs text-destructive">
                Revisá las cantidades: sólo se permiten números iguales o mayores a 0.
              </p>
            )}

            {sumError && <p className="text-sm text-destructive">{sumError}</p>}
          </div>

          <AlertDialogFooter>
            <AlertDialogCancel disabled={sumStockLoading}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              disabled={sumConfirmDisabled}
              onClick={() => void applySumAdjustments()}
            >
              {sumStockLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Sumar stock"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog
        open={batchSalesModalOpen}
        onOpenChange={(open) => {
          setBatchSalesModalOpen(open);
          if (!open) setBatchError(null);
        }}
      >
        <AlertDialogContent className="max-w-4xl w-[min(100vw-2rem,820px)]">
          <AlertDialogHeader>
            <AlertDialogTitle>Aplicar ventas a todos los productos</AlertDialogTitle>
            <AlertDialogDescription>
              Seleccioná la fecha y hora desde la que querés descontar ventas para todo el pedido. Revisá el resumen antes de confirmar.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="mt-4 space-y-4">
            <label className="flex flex-col gap-1 text-sm">
              <span className="text-muted-foreground">Fecha y hora inicial</span>
              <Input
                type="datetime-local"
                value={batchSalesInput}
                onChange={(event) => setBatchSalesInput(event.target.value)}
                disabled={batchApplying}
                className="max-w-xs"
              />
            </label>

            <div className="max-h-72 overflow-y-auto overflow-x-auto rounded-md border">
              <table className="w-full table-fixed border-collapse text-sm">
                <colgroup>
                  <col className="w-[48%]" />
                  <col className="w-[13%]" />
                  <col className="w-[13%]" />
                  <col className="w-[13%]" />
                  <col className="w-[13%]" />
                </colgroup>
                <thead className="bg-muted/60 text-xs uppercase tracking-wide text-muted-foreground">
                  <tr>
                    <th className="px-3 py-2 text-left">Producto</th>
                    <th className="px-3 py-2 text-right">Pedido</th>
                    <th className="px-3 py-2 text-right">Stock base</th>
                    <th className="px-3 py-2 text-right">Ventas</th>
                    <th className="px-3 py-2 text-right">Stock final</th>
                  </tr>
                </thead>
                <tbody>
                  {batchPreviewRows.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="px-3 py-4 text-center text-muted-foreground">
                        No hay productos en este pedido.
                      </td>
                    </tr>
                  ) : (
                    batchPreviewRows.map(({ item, qtyOrdered, stockPrev, salesQty, stockResult }) => (
                      <tr key={item.id} className="border-t">
                        <td className="px-3 py-2">
                          <div className="font-medium break-words leading-tight">
                            {item.display_name || item.product_name}
                          </div>
                          <div className="text-[11px] text-muted-foreground">{item.product_name}</div>
                        </td>
                        <td className="px-3 py-2 text-right tabular-nums">{qtyFormatter.format(qtyOrdered)}</td>
                        <td className="px-3 py-2 text-right tabular-nums">{qtyFormatter.format(stockPrev)}</td>
                        <td className="px-3 py-2 text-right tabular-nums">{qtyFormatter.format(salesQty)}</td>
                        <td className="px-3 py-2 text-right tabular-nums font-semibold">{qtyFormatter.format(stockResult)}</td>
                      </tr>
                    ))
                  )}
                </tbody>
                {batchPreviewRows.length > 0 && (
                  <tfoot className="border-t bg-muted/40 text-sm font-medium">
                    <tr>
                      <td className="px-3 py-2 text-right">Totales</td>
                      <td className="px-3 py-2 text-right tabular-nums">{qtyFormatter.format(batchTotals.qtyOrdered)}</td>
                      <td className="px-3 py-2 text-right tabular-nums">{qtyFormatter.format(batchTotals.stockPrev)}</td>
                      <td className="px-3 py-2 text-right tabular-nums">{qtyFormatter.format(batchTotals.salesQty)}</td>
                      <td className="px-3 py-2 text-right tabular-nums">{qtyFormatter.format(batchTotals.stockResult)}</td>
                    </tr>
                  </tfoot>
                )}
              </table>
            </div>

            <div className="text-xs text-muted-foreground">
              {applyTimestampMs == null
                ? "Ingresá una fecha válida para calcular las ventas a descontar."
                : `Ventas descontadas desde ${previewDateLabel}.`}
            </div>

            <p className="text-xs text-muted-foreground">
              Se copiará la cantidad pedida a "Pedido anterior" y se registrará un log de stock por cada producto.
            </p>

            {batchError && <p className="text-sm text-destructive">{batchError}</p>}
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={batchApplying}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              disabled={batchApplying || applyTimestampMs == null || !batchPreviewRows.length}
              onClick={() => void applySalesToAll()}
            >
              {batchApplying ? <Loader2 className="h-4 w-4 animate-spin" /> : "Aplicar ventas"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>


      {/* Grupos con drag & drop */}
      {/* Grupos — todos cerrados por defecto; uno abierto a la vez */}
      <div className="mt-3">
        <Accordion
          type="single"
          collapsible
          value={openGroup}
          onValueChange={(v) => setOpenGroup((v as string) || undefined)}
        >
          <DraggableGroupList
            groups={groups}
            onReorder={(nextNames) => {
              // Persistimos nuevo orden en Supabase (multidispositivo)
              persistGroupOrder(nextNames);
            }}
            renderGroup={(groupName, arr, containerProps) => (
              <GroupSection
                groupName={groupName}
                items={arr}
                productNames={productNames}
                sales={sales}
                margin={margin}
                tokenMatch={tokenMatch}
                placeholder={GROUP_PLACEHOLDER}
                onAddItem={addItem}
                onBulkAddItems={bulkAddItems}
                onBulkRemoveByNames={bulkRemoveByNames}
                onRemoveItem={removeItem}
                onUpdateQty={updateQty}
                onUpdateUnitPrice={updateUnitPrice}
                onRenameGroup={updateGroupName}
                onDeleteGroup={deleteGroup}
                onUpdatePackSize={updatePackSize}
                sortMode={sortMode}
                onMoveUp={() => moveGroup(groupName, "up")}
                onMoveDown={() => moveGroup(groupName, "down")}
                checkedMap={checkedMap}
                onRenameItemLabel={updateDisplayName}
                setItemChecked={setItemChecked}
                onUpdateStock={updateStock}
                computeSalesSinceStock={computeSalesSinceStock}
                containerProps={containerProps} // <-- clave
              />
            )}
          />
        </Accordion>
      </div>



      {/* Footer */}
      <div
  className={
    `fixed left-0 right-0 border-t bg-background/95 backdrop-blur px-3 py-2 z-50
     bottom-[calc(env(safe-area-inset-bottom)+var(--bottom-nav-h))]
     transition-transform duration-300 will-change-transform ${barsHidden ? "translate-y-full" : ""}`
  }
>

        <div className="mx-auto max-w-md">
          <div className="grid grid-cols-2 gap-2 mb-2">
            <div>
              <div className="text-xs text-muted-foreground">Total unidades</div>
              <div className="font-semibold tabular-nums">{grandQty}</div>
            </div>
            <div className="text-right">
              <div className="text-xs text-muted-foreground">Total</div>
              <div className="font-semibold text-lg tabular-nums">{fmtMoney(grandTotal)}</div>
            </div>
          </div>

          {/* Import/Copy/Export/Save — todos en una sola fila */}
<div className="mt-2 flex gap-2">
  {/* Importar */}
  <div className="relative flex-1">
      <input
        ref={fileRef}
        type="file"
        accept=".xlsx,.xls,.csv,.json"
        className="hidden"
        onChange={(e) => {
          const f = e.currentTarget.files?.[0];
        if (f) void handleImportFile(f);
      }}
    />
    <Button
      variant="outline"
      onClick={() => fileRef.current?.click()}
      disabled={importing}
      className="w-full text-sm"
    >
      <Upload className="h-4 w-4 mr-1" /> Importar
    </Button>
  </div>

  {/* Copiar */}
  <Button
    variant="outline"
    onClick={() => void handleCopySimpleList()}
    className="flex-1 w-full text-sm"
  >
    <Copy className="h-4 w-4 mr-1" /> Copiar
  </Button>

  {/* Exportar */}
  <Button
    variant="outline"
    onClick={() => {
      setExportFormat("xlsx");
      setExportDialogOpen(true);
    }}
    className="flex-1 w-full text-sm"
  >
    <Download className="h-4 w-4 mr-1" /> Exportar
  </Button>

  {/* Guardar en historial */}
  <Button
    onClick={() => void saveSnapshot()}
    className="flex-1 w-full text-sm"
  >
    Guardar
  </Button>
</div>

        </div>
      </div>
    </main>
    </>
  );
}

function ItemTitle({
  name,          // etiqueta visible
  canonical,     // clave real (product_name)
  onCommit,
}: {
  name: string;
  canonical: string;
  onCommit: (label: string) => Promise<void> | void;
}) {
  const [editing, setEditing] = React.useState(false);
  const [val, setVal] = React.useState(name);

  React.useEffect(() => setVal(name), [name]);

  const commit = async () => {
    const next = (val || "").trim();
    if (next !== name) await onCommit(next);
    setEditing(false);
  };

  if (!editing) {
    return (
      <div className="flex items-start gap-2">
        <button
          type="button"
            className="font-semibold text-lg md:text-xl leading-tight text-left hover:opacity-80"
          onClick={() => setEditing(true)}
          title="Tocar para renombrar"
        >
          {name}
        </button>
        {name !== canonical && (
          <span
            className="mt-px inline-block rounded bg-muted px-1.5 py-0.5 text-[10px] text-muted-foreground"
            title={`Clave: ${canonical}`}
          >
            clave: {canonical}
          </span>
        )}
      </div>
    );
  }

  return (
    <div className="flex items-center gap-1">
      <Input
        autoFocus
        className="h-8"
        value={val}
        onChange={(e) => setVal(e.target.value)}
        onBlur={() => void commit()}
        onKeyDown={(e) => {
          if (e.key === "Enter") { e.preventDefault(); void commit(); }
          if (e.key === "Escape") { e.preventDefault(); setVal(name); setEditing(false); }
        }}
        aria-label="Nombre visible del producto"
      />
      <Button size="icon" className="h-8 w-8" onClick={() => void commit()}>
        <Check className="h-4 w-4" />
      </Button>
    </div>
  );
}
function PackSizeEditor({
  value,
  onCommit,
}: {
  value?: number | null;
  onCommit: (n: number | null) => Promise<void> | void;
}) {
  const [editing, setEditing] = React.useState(false);
  const [val, setVal] = React.useState<string>(String(value ?? ""));

  React.useEffect(() => setVal(String(value ?? "")), [value]);

  const commit = async () => {
    const n = parseInt(val || "0", 10);
    const next = Number.isFinite(n) && n > 1 ? n : null;
    await onCommit(next);
    setEditing(false);
  };

  if (!editing) {
    return (
      <button
        type="button"
        className="inline-flex items-center gap-1 rounded-md border px-2 py-1 text-[11px] hover:bg-muted"
        title={value ? `Paquete de ${value}` : "Configurar paquete"}
        onClick={() => setEditing(true)}
      >
        <Package className="h-3.5 w-3.5" />
        {value ? `x${value}` : "paquete"}
      </button>
    );
  }

  return (
    <div className="inline-flex items-center gap-1">
      <Input
        autoFocus
        className="h-8 w-16 text-center"
        inputMode="numeric"
        placeholder="ej. 12"
        value={val}
        onChange={(e) => setVal(e.target.value)}
        onBlur={() => void commit()}
        onKeyDown={(e) => {
          if (e.key === "Enter") { e.preventDefault(); void commit(); }
          if (e.key === "Escape") { e.preventDefault(); setVal(String(value ?? "")); setEditing(false); }
        }}
        aria-label="Tamaño del paquete"
      />
      <Button size="icon" className="h-8 w-8" onClick={() => void commit()}>
        <Check className="h-4 w-4" />
      </Button>
    </div>
  );
}


/* ---------- PriceEditor ---------- */
function PriceEditor({
  price,
  updatedAt,                    // 👈 NUEVO
  onCommit,
}: {
  price: number;
  updatedAt?: string | null;    // 👈 NUEVO
  onCommit: (n: number) => Promise<void> | void;
}) {
  const [val, setVal] = React.useState<string>(String(price ?? 0));
  const [dirty, setDirty] = React.useState(false);

  // fuerza un re-render cada 60s para que el “hace X min” se refresque
  React.useEffect(() => {
    const id = setInterval(() => setDirty((d) => d), 60000);
    return () => clearInterval(id);
  }, []);

  React.useEffect(() => {
    setVal(String(price ?? 0));
    setDirty(false);
  }, [price]);

  const normalize = (s: string) => Number(s.replace(/[^\d]/g, "")) || 0;

  const commit = async () => {
    const n = normalize(val);
    await onCommit(n);       // 👈 SIEMPRE sellamos, aunque el número no cambie
    setDirty(false);
  };

  // --- Helpers de formato ---
  const rtf = React.useMemo(
    () => new Intl.RelativeTimeFormat("es-AR", { numeric: "auto" }),
    []
  );

  function formatSince(iso?: string | null): { text: string; title: string } {
    if (!iso) return { text: "—", title: "" };
    const t = new Date(iso).getTime();
    const diffMs = Date.now() - t;
    const abs = Math.abs(diffMs);
    const minutes = Math.round(abs / 60000);
    const hours   = Math.round(abs / 3600000);
    const days    = Math.round(abs / 86400000);
    let rel: string;
    if (minutes < 60) rel = rtf.format(-Math.sign(diffMs) * minutes, "minute");
    else if (hours < 24) rel = rtf.format(-Math.sign(diffMs) * hours, "hour");
    else rel = rtf.format(-Math.sign(diffMs) * days, "day");
    return { text: rel, title: new Date(iso).toLocaleString("es-AR") };
  }

  const since = formatSince(updatedAt);

  return (
  <div className="space-y-1 w-full">
    <div className="flex items-center justify-between gap-2">
      {/* Label */}
      <span className="text-[11px] text-muted-foreground">Precio</span>

      {/* Input + botón */}
      <div className="flex items-center gap-2">
        <Input
          className="h-8 w-24 text-right tabular-nums"
          inputMode="decimal"
          placeholder="$0"
          value={val}
          onChange={(e) => {
            setVal(e.target.value);
            setDirty(true);
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter" && dirty) { e.preventDefault(); void commit(); }
            if (e.key === "Escape") { e.preventDefault(); setVal(fmtMoney(price ?? 0)); setDirty(false); }
          }}
          aria-label="Precio unitario"
        />
        <Button
          size="icon"
          className="h-8 w-8"
          variant={dirty ? "default" : "secondary"}
          disabled={!dirty}
          onClick={() => void commit()}
          aria-label="Confirmar precio"
          title="Confirmar precio"
        >
          <Check className="h-4 w-4" />
        </Button>
      </div>
    </div>

    {/* Firma */}
    <div className="text-[11px] text-muted-foreground text-right" title={since.title}>
      {updatedAt ? `act. ${since.text}` : "sin cambios"}
    </div>
  </div>
);



}

function StockEditor({
  value,
  updatedAt,
  previousUpdatedAt,
  onCommit,
  salesSince,
}: {
  value?: number | null;
  updatedAt?: string | null;
  previousUpdatedAt?: string | null;
  onCommit: (n: number | null) => Promise<void> | void;
  salesSince?: number;
}) {
  const [val, setVal] = React.useState<string>(value == null ? "" : String(value));
  const [dirty, setDirty] = React.useState(false);

  React.useEffect(() => {
    setVal(value == null ? "" : String(value));
    setDirty(false);
  }, [value]);

  const toNumber = React.useCallback((input: string): number => {
    if (!input) return 0;
    const normalized = input.replace(/\s+/g, "").replace(/,/g, ".");
    const n = Number(normalized);
    return Number.isFinite(n) ? n : 0;
  }, []);

  const normalize = (s: string) => {
    const n = toNumber(s);
    return Number.isFinite(n) ? round2(n) : 0;
  };

  const commit = async () => {
    const trimmed = (val ?? "").trim();
    const n = trimmed === "" ? null : normalize(trimmed);
    await onCommit(n);
    setDirty(false);
  };

  const rtf = React.useMemo(
    () => new Intl.RelativeTimeFormat("es-AR", { numeric: "auto" }),
    []
  );

  function sinceText(iso?: string | null) {
    if (!iso) return { text: "—", title: "" };
    const t = new Date(iso).getTime();
    const diff = Date.now() - t;
    const min = Math.round(diff / 60000);
    const hr = Math.round(diff / 3600000);
    const dy = Math.round(diff / 86400000);
    const text =
      min < 60 ? rtf.format(-min, "minute") : hr < 24 ? rtf.format(-hr, "hour") : rtf.format(-dy, "day");
    return { text, title: new Date(iso).toLocaleString("es-AR") };
  }

  const since = sinceText(updatedAt);
  let appliedFrom: { absolute: string; relative: string; title: string } | null = null;
  if (previousUpdatedAt) {
    const date = new Date(previousUpdatedAt);
    if (!Number.isNaN(date.getTime())) {
      const rel = sinceText(previousUpdatedAt);
      appliedFrom = {
        absolute: date.toLocaleString("es-AR"),
        relative: rel.text,
        title: rel.title,
      };
    }
  }
  const qtyFormatter = React.useMemo(() => new Intl.NumberFormat("es-AR", { maximumFractionDigits: 2 }), []);

  return (
    <div className="w-full space-y-2">
      <div className="flex items-center justify-between gap-2">
        <span className="text-[11px] text-muted-foreground">Stock</span>
        <div className="flex items-center gap-2">
          <Input
            className="h-8 w-24 text-right tabular-nums"
            inputMode="numeric"
            placeholder="0"
            value={val}
            onChange={(e) => {
              setVal(e.target.value);
              setDirty(true);
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter" && dirty) {
                e.preventDefault();
                void commit();
              }
              if (e.key === "Escape") {
                e.preventDefault();
                setVal(value == null ? "" : String(value));
                setDirty(false);
              }
            }}
            aria-label="Stock actual"
          />
          <Button
            size="icon"
            className="h-8 w-8"
            variant={dirty ? "default" : "secondary"}
            disabled={!dirty}
            onClick={() => void commit()}
            aria-label="Confirmar stock"
            title="Confirmar stock"
          >
            <Check className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <div className="flex flex-col items-end gap-1">
        <div className="text-[11px] text-muted-foreground text-right" title={since.title}>
          {updatedAt ? `Aplicado ${since.text}` : "sin aplicación"}
        </div>
        {appliedFrom && (
          <div className="text-[11px] text-muted-foreground text-right" title={appliedFrom.title}>
            Ventas descontadas desde {appliedFrom.absolute} ({appliedFrom.relative})
          </div>
        )}

        {typeof salesSince === "number" && (
          <div className="flex w-full items-center justify-between gap-2 text-[11px] text-muted-foreground">
            <span>Ventas pendientes:</span>
            <span className="font-medium text-foreground">
              {qtyFormatter.format(Math.max(0, salesSince))}
            </span>
          </div>
        )}
      </div>
    </div>
  );
}


/* =================== GroupSection =================== */
function GroupSection(props: {
  groupName: string;
  items: ItemRow[];
  productNames: string[];
  sales: SalesRow[];
  margin: number;
  tokenMatch: (name: string, q: string) => boolean;
  placeholder: string;
  onRenameItemLabel: (id: string, label: string) => Promise<void> | void; // 👈 NUEVO
  computeSalesSinceStock: (product: string, fromTs: number | null) => number;
  

  // CRUD base
  onAddItem: (name: string, groupName: string) => Promise<void>;
  onRemoveItem: (id: string) => Promise<void>;
  onUpdateQty: (id: string, qty: number) => Promise<void>;
  onUpdateUnitPrice: (id: string, price: number) => Promise<void>;
  onRenameGroup: (oldName: string, newName: string) => Promise<void>;
  onDeleteGroup: (name: string) => Promise<void>;

  onUpdatePackSize: (id: string, pack: number | null) => Promise<void>;
  onUpdateStock: (id: string, stock: number | null) => Promise<void>;


  // Selección masiva
  onBulkAddItems?: (names: string[], groupName: string) => Promise<void>;
  onBulkRemoveByNames?: (names: string[], groupName: string) => Promise<void>;
  sortMode: SortMode;

  // NUEVO: mover grupos
  onMoveUp: () => void;
  onMoveDown: () => void;

  // NUEVO: checks visuales por ítem
  checkedMap: Record<string, boolean>;
  setItemChecked: (id: string, val: boolean) => void;

  // NUEVO: props del contenedor para DnD aplicados al AccordionItem
  containerProps?: React.HTMLAttributes<HTMLDivElement>;
}) {
  const {
    groupName, items, productNames, sales, margin, tokenMatch, placeholder,
    onAddItem, onRemoveItem, onUpdateQty, onUpdateUnitPrice, onRenameGroup, onDeleteGroup,
    onBulkAddItems, onBulkRemoveByNames, sortMode,
    onMoveUp, onMoveDown, checkedMap, setItemChecked,
    containerProps, onUpdatePackSize, onUpdateStock,
    onRenameItemLabel, computeSalesSinceStock
  } = props;

  // === Estado del texto del buscador (queda ARRIBA del bloque nuevo)
  const [q, setQ] = React.useState("");

  // ========= Refs/estado del dropdown + seguridad con teclado móvil =========
  const [open, setOpen] = React.useState(false);
  const inputRef = React.useRef<HTMLInputElement | null>(null);
  const portalRef = React.useRef<HTMLDivElement | null>(null);
  const [rect, setRect] = React.useState<DOMRect | null>(null);

  const readRect = React.useCallback(() => {
    if (!inputRef.current) return;
    setRect(inputRef.current.getBoundingClientRect());
  }, []);

  function ensureInputVisible() {
    if (!inputRef.current) return;
    const r = inputRef.current.getBoundingClientRect();
    const vv = (window as any).visualViewport as VisualViewport | undefined;
    const vvHeight = vv?.height ?? window.innerHeight;
    const vvOffsetTop = vv?.offsetTop ?? 0;
    const safeTop = vvOffsetTop + 8;
    const safeBottom = vvOffsetTop + vvHeight - 12;
    if (r.top >= safeTop && r.bottom <= safeBottom) return;
    inputRef.current.scrollIntoView({ block: "nearest", inline: "nearest", behavior: "auto" });
  }

  React.useEffect(() => {
    if (!open) return;
    const update = () => readRect();

    window.addEventListener("resize", update, true);
    window.addEventListener("scroll", update, true);

    const vv = (window as any).visualViewport as VisualViewport | undefined;
    const onVV = () => {
      update();
      ensureInputVisible();
    };
    if (vv) {
      vv.addEventListener("resize", onVV);
      vv.addEventListener("scroll", onVV);
    }

    update();
    const t = setTimeout(() => {
      update();
      ensureInputVisible();
    }, 80);

    return () => {
      window.removeEventListener("resize", update, true);
      window.removeEventListener("scroll", update, true);
      if (vv) {
        vv.removeEventListener("resize", onVV);
        vv.removeEventListener("scroll", onVV);
      }
      clearTimeout(t);
    };
  }, [open, readRect]);

  React.useEffect(() => {
    function onDocDown(e: MouseEvent | TouchEvent) {
      if (!open) return;
      const t = e.target as Node;
      if (!inputRef.current?.contains(t) && !portalRef.current?.contains(t)) setOpen(false);
    }
    document.addEventListener("mousedown", onDocDown);
    document.addEventListener("touchstart", onDocDown as any, { passive: true } as any);
    return () => {
      document.removeEventListener("mousedown", onDocDown);
      document.removeEventListener("touchstart", onDocDown as any);
    };
  }, [open]);

  const portalStyle: React.CSSProperties = React.useMemo(() => {
    if (!rect) return {};
    const vv = (window as any).visualViewport as VisualViewport | undefined;
    const vvHeight = vv?.height ?? window.innerHeight;
    const vvOffsetTop = vv?.offsetTop ?? 0;

    const top = rect.bottom + 8;
    const available = Math.max(160, Math.floor(vvHeight - (rect.bottom - vvOffsetTop) - 16));

    return {
      position: "fixed",
      left: rect.left,
      top,
      width: rect.width,
      maxHeight: available,
      overflow: "auto",
      zIndex: 60,
    } as React.CSSProperties;
  }, [rect]);

  const [editing, setEditing] = React.useState(false);
  const [editValue, setEditValue] = React.useState(groupName || "Sin grupo");
  const [confirmOpen, setConfirmOpen] = React.useState(false);
  const triggerRef = React.useRef<HTMLButtonElement | null>(null);
  const sectionRef = React.useRef<HTMLDivElement | null>(null);
  const [showFloater, setShowFloater] = React.useState(false);
  const qtyFormatter = React.useMemo(
    () => new Intl.NumberFormat("es-AR", { maximumFractionDigits: 2 }),
    []
  );

  React.useEffect(() => setEditValue(groupName || "Sin grupo"), [groupName]);

  React.useEffect(() => {
    const el = sectionRef.current;
    if (!el) return;
    const io = new IntersectionObserver(
      ([entry]) => setShowFloater(entry.isIntersecting),
      { threshold: 0.001 }
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  const arrVisible = items.filter((x) => x.product_name !== placeholder);
  // Items visibles (sin placeholder) ya existe:
// const arrVisible = items.filter((x) => x.product_name !== placeholder);

// 👉 Confirmados dentro del grupo (según checkedMap)
const confirmedCount = React.useMemo(
  () => arrVisible.reduce((acc, it) => acc + (checkedMap[it.id] ? 1 : 0), 0),
  [arrVisible, checkedMap]
);

  const groupSubtotal = arrVisible.reduce((a, it) => a + (it.unit_price || 0) * (it.qty || 0), 0);
  const suggestions = q ? productNames.filter((n) => tokenMatch(n, q)).slice(0, 50) : [];

  const sortedVisible = React.useMemo(() => {
    const arr = [...arrVisible];
    const byNameAsc = (a: ItemRow, b: ItemRow) =>
      a.product_name.localeCompare(b.product_name, "es", { sensitivity: "base" });
    const byNameDesc = (a: ItemRow, b: ItemRow) => -byNameAsc(a, b);
    const avg = (name: string) =>
      computeStats(sales, name, latestDateForProduct(sales, name)).avg4w || 0;
    if (sortMode === "alpha_asc") arr.sort(byNameAsc);
    else if (sortMode === "alpha_desc") arr.sort(byNameDesc);
    else if (sortMode === "avg_desc") arr.sort((a, b) => (avg(b.product_name) - avg(a.product_name)) || byNameAsc(a, b));
    else if (sortMode === "avg_asc") arr.sort((a, b) => (avg(a.product_name) - avg(b.product_name)) || byNameAsc(a, b));
    return arr;
  }, [arrVisible, sortMode, sales]);

  async function commitRename() {
    const nv = (editValue || "").trim() || "Sin grupo";
    setEditing(false);
    if (nv === (groupName || "Sin grupo")) return;
    await onRenameGroup(groupName, nv === "Sin grupo" ? "" : nv);
  }

  function scrollInputToTop() {
    ensureInputVisible();
  }

const mergedClassName = [
  "border rounded mb-3 overflow-visible",
  props.containerProps?.className || "",
].join(" ");

  return (
  <AccordionItem
    value={groupName || "Sin grupo"}
    // aplicamos DnD sin pisar className
    draggable={props.containerProps?.draggable}
    onDragStart={props.containerProps?.onDragStart as any}
    onDragOver={props.containerProps?.onDragOver as any}
    onDrop={props.containerProps?.onDrop as any}
    onDragEnd={props.containerProps?.onDragEnd as any}
    className={mergedClassName}
  >
    {/* HEADER */}
    <AccordionTrigger ref={triggerRef} className="px-3">
      <div className="flex w-full items-center gap-3">
        <div className="flex items-center gap-2 min-w-0">
          {!editing ? (
            <span
              role="button"
              tabIndex={0}
              className="inline-flex items-center gap-1 font-semibold truncate hover:opacity-80 focus:outline-none"
              title="Tocar para renombrar"
              onClick={(e) => { e.stopPropagation(); setEditing(true); }}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault(); e.stopPropagation(); setEditing(true);
                }
              }}
            >
              <span className="truncate">{groupName || "Sin grupo"}</span>
              <Pencil className="h-3.5 w-3.5 opacity-70" />
            </span>
          ) : (
            <Input
              autoFocus
              className="h-8 w-[10.5rem]"
              value={editValue}
              onClick={(e) => e.stopPropagation()}
              onChange={(e) => setEditValue(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") { e.preventDefault(); void commitRename(); }
                if (e.key === "Escape") {
                  e.preventDefault(); setEditing(false); setEditValue(groupName || "Sin grupo");
                }
              }}
              onBlur={() => void commitRename()}
            />
          )}
          <Badge variant="secondary" className="shrink-0">{arrVisible.length}</Badge>
        {/* NUEVO: cantidad de confirmados */}
  <Badge
    className={[
      "shrink-0 border",
      confirmedCount > 0
        ? "bg-green-100 text-green-700 border-green-200"
        : "bg-muted text-muted-foreground border-muted"
    ].join(" ")}
    title="Productos confirmados"
  >
    <span className="inline-flex items-center gap-1">
      <Check className="h-3.5 w-3.5" />
      {confirmedCount}
    </span>
  </Badge>
        </div>

        {/* Handle de DnD dentro del header (no crea nodos fuera del AccordionItem) */}
        <span
          className="ml-auto inline-flex items-center gap-1 text-[11px] text-muted-foreground select-none"
          title="Arrastrar para mover"
          onPointerDown={(e) => e.stopPropagation()} // evita toggle al empezar drag
        >
          <GripVertical className="h-3.5 w-3.5" />
          mover
        </span>
      </div>
    </AccordionTrigger>


      {/* TOOLBAR */}
      <div className="px-3 py-2 flex items-center justify-between border-b bg-muted/30">
        <div className="text-sm tabular-nums">{fmtMoney(groupSubtotal)}</div>
        <div className="flex items-center gap-2">
          <Button type="button" size="icon" variant="secondary" className="h-8 w-8" aria-label="Mover grupo arriba" onClick={() => onMoveUp()} title="Mover hacia arriba">
            <ChevronUp className="h-4 w-4" />
          </Button>
          <Button type="button" size="icon" variant="secondary" className="h-8 w-8" aria-label="Mover grupo abajo" onClick={() => onMoveDown()} title="Mover hacia abajo">
            <ChevronDown className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="icon" className="text-destructive" aria-label="Eliminar grupo" onClick={() => setConfirmOpen(true)} title="Eliminar grupo">
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Confirmación de borrado */}
      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Eliminar grupo</AlertDialogTitle>
            <AlertDialogDescription>
              ¿Seguro que querés eliminar el grupo “{groupName || "Sin grupo"}”? Se quitarán todos sus productos del pedido.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              className="bg-red-600 hover:bg-red-700"
              onClick={() => { setConfirmOpen(false); void onDeleteGroup(groupName || "Sin grupo"); }}
            >
              Eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* CONTENIDO */}
      {/* CONTENIDO */}
      <AccordionContent className="!overflow-visible">
        <div ref={sectionRef} className="relative px-3 pb-3">
          {/* Buscador */}
          <div className="relative mb-3">
            <Input
              ref={inputRef}
              value={q}
              onFocus={() => {
                setOpen(Boolean(q));
                ensureInputVisible();
                setTimeout(readRect, 50);
              }}
              onChange={(e) => {
                const text = e.target.value;
                setQ(text);
                setOpen(Boolean(text));
                //ensureInputVisible();
                setTimeout(readRect, 20);
              }}
              onKeyDown={(e) => {
                if (e.key === "Escape") setOpen(false);
                if (e.key === "Enter") {
                  const name = q.trim(); if (!name) return;
                  const exists = arrVisible.some((it) => it.product_name === name);
                  if (!exists) void onAddItem(name, groupName);
                  setQ(""); setOpen(false);
                }
              }}
              placeholder="Buscar producto…"
              className="pl-9 pr-9"
              aria-expanded={open}
              aria-controls={`suggestions-${groupName || "sin"}`}
              onFocusCapture={scrollInputToTop}
            />
            <Search className="pointer-events-none absolute left-2 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            {q && (
              <button
                type="button"
                className="absolute right-2 top-1/2 -translate-y-1/2 rounded-md p-1 text-muted-foreground hover:bg-muted"
                aria-label="Limpiar búsqueda"
                onClick={() => { setQ(""); setOpen(false); inputRef.current?.focus(); }}
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>

          {/* Dropdown en portal */}
          {open && q && rect && createPortal(
            <div
              id={`suggestions-${groupName || "sin"}`}
              ref={portalRef}
              style={portalStyle}
              className="rounded-md border bg-popover text-popover-foreground shadow"
              role="listbox"
            >
              <div className="flex items-center justify-between gap-2 p-2 border-b bg-muted/40 sticky top-0">
                <div className="text-xs text-muted-foreground">{suggestions.length} resultados</div>
                <div className="flex gap-2">
                  <Button size="sm" variant="secondary" onClick={async () => {
                    if (onBulkAddItems) {
                      const toAdd = suggestions.filter((n) => !arrVisible.some((it) => it.product_name === n));
                      await onBulkAddItems(toAdd, groupName);
                    }
                  }}>
                    Seleccionar visibles
                  </Button>
                  <Button size="sm" variant="outline" onClick={async () => {
                    if (!onBulkRemoveByNames) return;
                    const names = suggestions.filter((n) => arrVisible.some((it) => it.product_name === n));
                    await onBulkRemoveByNames(names, groupName);
                  }}>
                    Deseleccionar visibles
                  </Button>
                </div>
              </div>

              <div className="py-1">
                {suggestions.map((name) => {
                  const checked = arrVisible.some((it) => it.product_name === name);
                  const st = computeStats(sales, name, latestDateForProduct(sales, name));
                  const uEst = Math.round((st?.lastUnitRetail ?? st?.avgUnitRetail30d ?? 0) * (1 - (margin / 100)));
                  return (
                    <label key={name} className="flex items-center gap-2 px-3 py-2 hover:bg-accent cursor-pointer">
                      <Checkbox
                        checked={checked}
                        onCheckedChange={async (v: CheckedState) => {
                          if (v === true) {
                            await onAddItem(name, groupName);
                          } else {
                            const it = arrVisible.find((r) => r.product_name === name);
                            if (it) await onRemoveItem(it.id);
                          }
                        }}
                        aria-label={`Seleccionar ${name}`}
                      />
                      <div className="min-w-0 flex-1">
                        <div className="font-medium truncate">{name}</div>
                        <div className="text-xs text-muted-foreground">Precio est.: {fmtMoney(uEst)}</div>
                      </div>
                    </label>
                  );
                })}
              </div>

              {q && !suggestions.find((s) => s.toLowerCase() === q.toLowerCase()) && (
                <button
                  className="w-full px-3 py-2 text-left hover:bg-accent border-t"
                  onClick={() => { const name = q.trim(); if (!name) return; void onAddItem(name, groupName); setQ(""); setOpen(false); }}
                >
                  <div className="text-xs text-muted-foreground">Agregar producto nuevo:</div>
                  <div className="font-medium">“{q}”</div>
                </button>
              )}
            </div>,
            document.body
          )}

          {/* Items */}
          {arrVisible.length === 0 && (
            <div className="text-sm text-muted-foreground">No hay productos aún. Busca arriba y tilda para agregar.</div>
          )}

          {sortedVisible.map((it) => {
            const subtotal = (it.unit_price || 0) * (it.qty || 0);
            const anchor = latestDateForProduct(sales, it.product_name);
            const st = computeStats(sales, it.product_name, anchor);
            const productLabel = (it.display_name?.trim() || it.product_name).trim();
            const lastStockTs = it.stock_updated_at ? new Date(it.stock_updated_at).getTime() : null;
            const pendingSales = lastStockTs ? computeSalesSinceStock(productLabel, lastStockTs) : 0;
            const isChecked = !!checkedMap[it.id];

            return (
              <Card
                key={it.id}
                className={`mb-2 rounded-2xl transition-colors ${
                  isChecked ? "bg-green-50 border-green-200" : ""
                }`}
              >
                <CardContent className="p-3 relative">
                  <div className="absolute right-3 top-3">
                    <label className="inline-flex items-center gap-2">
                      <Checkbox
                        checked={isChecked}
                        onCheckedChange={(v) => setItemChecked(it.id, v === true)}
                        className={isChecked ? "data-[state=checked]:text-green-600" : ""}
                        aria-label="Marcar como cargado"
                      />
                    </label>
                  </div>

                  <div className="grid grid-cols-1 items-start">
                    <ItemTitle
  name={it.display_name || it.product_name}
  canonical={it.product_name}
  onCommit={(label) => onRenameItemLabel(it.id, label)}
/>
{/* 👇 NUEVO: botón/entrada de paquete */}
    <PackSizeEditor
  value={it.pack_size}
  onCommit={(n) => onUpdatePackSize(it.id, n)}  // ⬅️ reemplaza updatePackSize(...)
 />

                  </div>

                  {/* LAYOUT: izquierda = métricas; derecha = Cantidad → Precio → Stock */}
<div className="mt-2 flex items-start justify-between gap-3">
  {/* IZQUIERDA: métricas una debajo de otra */}
  <div className="flex-1 space-y-1">
    <div className="rounded-md border px-2 py-1 text-[11px]">
      <span className="text-muted-foreground">Prom/sem (4s): </span>
      <span className="font-medium tabular-nums">{fmtInt(st.avg4w)}</span>
    </div>
    <div className="rounded-md border px-2 py-1 text-[11px]">
      <span className="text-muted-foreground">Ventas 2 sem: </span>
      <span className="font-medium tabular-nums">{fmtInt(st.sum2w)}</span>
    </div>
    <div className="rounded-md border px-2 py-1 text-[11px]">
      <span className="text-muted-foreground">Ventas 30 días: </span>
      <span className="font-medium tabular-nums">{fmtInt(st.sum30d)}</span>
    </div>
    <div className="rounded-md border px-2 py-1 text-[11px]">
      <span className="text-muted-foreground">Últ. venta: </span>
      <span className="font-medium">
        {typeof st.lastDate === "number"
          ? `${formatUTCWeekday(st.lastDate)} ${formatUTCDate(st.lastDate)}`
          : "—"}
      </span>
      {/* NUEVO: Pedido anterior */}
<div className="rounded-md border px-2 py-1 text-[11px]">
  <span className="text-muted-foreground">Pedido anterior: </span>
  <span className="font-medium tabular-nums">
    {it.previous_qty != null ? fmtInt(it.previous_qty) : "—"}
  </span>
</div>

    </div>
  </div>

  {/* DERECHA: columna vertical alineada */}
<div className="w-40 sm:w-48 flex flex-col items-end gap-3">
  {/* Cantidad */}
  <div className="w-full flex justify-end">
    <Stepper
      value={it.qty}
      min={0}
      step={it.pack_size || 1}
      onChange={(n: number) => { void onUpdateQty(it.id, n); }}
    />
  </div>

  {/* Precio */}
  <div className="w-full flex justify-end">
    <PriceEditor
      price={it.unit_price}
      updatedAt={it.price_updated_at}
      onCommit={(n) => onUpdateUnitPrice(it.id, n)}
    />
  </div>

  {/* Stock */}
  <div className="w-full flex justify-end">
    <StockEditor
      value={it.stock_qty ?? null}
      updatedAt={it.stock_updated_at}
      previousUpdatedAt={it.previous_qty_updated_at}
      onCommit={(n) => onUpdateStock(it.id, n)}
      salesSince={pendingSales}
    />
  </div>
</div>

</div>


                  <div className="mt-2 pt-2 border-t flex items-center justify-between">
                    <div className="flex items-baseline gap-2">
                      <span className="text-[11px] text-muted-foreground">Subtotal</span>
                      <span className="font-semibold tabular-nums text-base">{fmtMoney(subtotal)}</span>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="text-destructive"
                      onClick={() => void onRemoveItem(it.id)}
                      aria-label="Quitar producto"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}

          {/* Botón flotante para cerrar el grupo */}
          {true && !open && (
            <div className="fixed inset-x-0 z-70 pointer-events-none bottom-[calc(env(safe-area-inset-bottom)+var(--bottom-nav-h)+120px)]">
              <div className="mx-auto max-w-md px-3 flex justify-end">
                <Button
                  size="icon"
                  variant="default"
                  className="h-11 w-11 rounded-full shadow-lg pointer-events-auto"
                  aria-label="Cerrar este grupo"
                  title="Cerrar este grupo"
                  onClick={() => triggerRef.current?.click()}
                >
                  <ChevronUp className="h-5 w-5" />
                </Button>
              </div>
            </div>
          )}
        </div>
      </AccordionContent>
    </AccordionItem>
  );
}

/* ---------- Crear grupo ---------- */
function GroupCreator({ onCreate }: { onCreate: (name: string) => void }) {
  const [name, setName] = React.useState("");

  function handleCreate() {
    const n = name.trim();
    if (!n) return;
    onCreate(n);
    setName("");
  }

  return (
    <form
      className="mt-1 flex gap-2"
      onSubmit={(e) => {
        e.preventDefault();
        handleCreate();
      }}
    >
      <Input
        placeholder="Ej: Budines, Galletas..."
        value={name}
        onChange={(e) => setName(e.target.value)}
        aria-label="Nombre del nuevo grupo"
        onKeyDown={(e) => {
          // Evitamos submits raros si la lista de sugerencias abre algún día
          if (e.key === "Enter") e.stopPropagation();
        }}
      />
      <Button type="submit" onClick={handleCreate}>
        <Plus className="h-4 w-4 mr-1" /> Crear
      </Button>
    </form>
  );
}
