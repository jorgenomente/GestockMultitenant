"use client";

import React from "react";
import clsx from "clsx";
import { useParams, useRouter, useSearchParams, usePathname } from "next/navigation";
import { createPortal } from "react-dom";
import { getSupabaseBrowserClient } from "@/lib/supabaseClient";
import type {
  PostgrestError,
  RealtimePostgresChangesPayload,
  User as SupabaseUser,
} from "@supabase/supabase-js";
import type { StorageError } from "@supabase/storage-js";
import type { CellObject, WorkSheet } from "xlsx";
import { SALES_STORAGE_BUCKET, SALES_STORAGE_DIR } from "@/lib/salesStorage";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import "./redesign.css";

/* UI */
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import type { CheckedState } from "@radix-ui/react-checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
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
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger,
} from "@/components/ui/sheet";
import {
  Popover, PopoverContent, PopoverTrigger,
} from "@/components/ui/popover";
import {
  Plus, Minus, Search, Download, Upload, Trash2, ArrowLeft,
  History, X, Pencil, Check, ChevronUp, ChevronDown, Copy, Package, Loader2, Save,
  CalendarDays, FileText, BookOpen, TrendingUp, TrendingDown, BarChart3,
  Sparkles, CheckCircle2, Circle, Info, MoreHorizontal,
} from "lucide-react";
import { useVisualViewportBottomOffset, isStandaloneDisplayMode } from "@/lib/useVisualViewportBottomOffset";

/* =================== Config =================== */
const VENTAS_URL = "/ventas.xlsx";
const TABLE_SNAPSHOTS = "order_snapshots";
const TABLE_ORDER_SUMMARIES = "order_summaries";
const TABLE_ORDER_SUMMARIES_WEEK = "order_summaries_week";
const TABLE_STOCK_LOGS = "stock_logs";
const TABLE_PROVIDER_WEEKS = "provider_weeks";
const WEEK_STORAGE_PREFIX = "gestock:provider-order-week";
const AUTO_BUFFER_EXTRA_DAYS = 3;
const LEGACY_WEEK_VALUE = "__legacy__";

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
const MIN_GROUP_SEARCH_CHARS = 3;
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

const getVisualViewport = (): VisualViewport | null => {
  if (typeof window === "undefined") return null;
  return window.visualViewport ?? null;
};

const RECT_EPSILON = 0.5;
const areRectsEqual = (
  a: DOMRect | DOMRectReadOnly | null,
  b: DOMRect | DOMRectReadOnly | null,
) => {
  if (a === b) return true;
  if (!a || !b) return false;
  return (
    Math.abs(a.top - b.top) < RECT_EPSILON &&
    Math.abs(a.left - b.left) < RECT_EPSILON &&
    Math.abs(a.width - b.width) < RECT_EPSILON &&
    Math.abs(a.height - b.height) < RECT_EPSILON
  );
};

type ErrorWithStatus = { statusCode?: unknown; status?: unknown; message?: unknown };

const readStatusCode = (error: unknown): number | undefined => {
  if (!error || typeof error !== "object") return undefined;
  const withStatus = error as ErrorWithStatus;
  if (typeof withStatus.statusCode === "number") return withStatus.statusCode;
  if (typeof withStatus.status === "number") return withStatus.status;
  return undefined;
};

const readErrorMessage = (error: unknown): string => {
  if (!error || typeof error !== "object") return "";
  const withMessage = error as ErrorWithStatus;
  return typeof withMessage.message === "string" ? withMessage.message : "";
};

const isMissingProviderError = (error: unknown) => {
  if (typeof error !== "object" || error === null) return false;
  const rawCode = (error as { code?: unknown }).code;
  const rawMessage = (error as { message?: unknown }).message;
  const code = typeof rawCode === "string" ? rawCode : "";
  const message = typeof rawMessage === "string" ? rawMessage.toLowerCase() : "";
  if (!message) return false;
  if (message.includes("proveedor") && message.includes("no existe")) return true;
  if (message.includes("provider") && message.includes("does not exist")) return true;
  return code === "P0001" && message.includes("proveedor");
};

type StockUndoSnapshot = {
  rows: Array<{
    id: string;
    stock_qty: number | null;
    stock_updated_at: string | null;
    stock_signature_at: string | null;
    previous_qty: number | null;
    previous_qty_updated_at: string | null;
  }>;
  lastStockFromInput: string | null;
  lastStockAppliedAt: string | null;
  stockSalesInput: string;
};

/* eslint-disable no-unused-vars */
/* ---------- Subcomponente: Stepper ---------- */
type StepperProps = {
  value: number;
  onChange: (...args: [number]) => void;
  min?: number;
  step?: number;
  suffixLabel?: string;
  disabled?: boolean;
};

function Stepper({ value, onChange, min = 0, step = 1, suffixLabel, disabled = false }: StepperProps) {
  const s = Math.max(1, Math.floor(step));
  const clamp = (n: number) => Math.max(min, n);
  const snap  = (n: number) => clamp(Math.round(n / s) * s);

  return (
    <div className="inline-flex flex-col items-start gap-1">
      {suffixLabel && (
        <span className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[color:var(--order-card-accent)]/70">
          {suffixLabel}
        </span>
      )}

      <div className="inline-flex items-center gap-1.5 sm:gap-2">
        <Button
          variant="outline"
          size="icon"
          className="h-8 w-8 rounded-full border border-[color:var(--order-card-qty-border)] bg-[color:var(--order-card-qty-background)] text-[color:var(--order-card-qty-foreground)] shadow-none transition-colors hover:border-[color:var(--order-card-qty-hover-border)] sm:h-9 sm:w-9"
          aria-label="Restar"
          disabled={disabled}
          onClick={() => onChange(clamp((value || 0) - s))}
        >
          <Minus className="h-3 w-3" />
        </Button>

        <Input
          className="h-8 w-14 rounded-full border border-[color:var(--order-card-qty-border)] bg-[color:var(--order-card-qty-background)] px-0 text-center text-sm font-semibold text-[color:var(--order-card-qty-foreground)] focus-visible:ring-0 sm:h-9 sm:w-16"
          inputMode="numeric"
          value={value ?? 0}
          disabled={disabled}
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
          className="h-8 w-8 rounded-full border border-[color:var(--order-card-qty-border)] bg-[color:var(--order-card-qty-background)] text-[color:var(--order-card-qty-foreground)] shadow-none transition-colors hover:border-[color:var(--order-card-qty-hover-border)] sm:h-9 sm:w-9"
          aria-label="Sumar"
          disabled={disabled}
          onClick={() => onChange(clamp((value || 0) + s))}
        >
          <Plus className="h-3 w-3" />
        </Button>
      </div>
    </div>
  );
}


function useMediaQuery(query: string) {
  const getMatch = React.useCallback(() => {
    if (typeof window === "undefined") return false;
    return window.matchMedia(query).matches;
  }, [query]);

  const [matches, setMatches] = React.useState<boolean>(getMatch);

  React.useEffect(() => {
    if (typeof window === "undefined") return;
    const mql = window.matchMedia(query);
    const handler = (event: MediaQueryListEvent) => setMatches(event.matches);
    setMatches(mql.matches);
    if (mql.addEventListener) mql.addEventListener("change", handler);
    else if (mql.addListener) mql.addListener(handler);
    return () => {
      if (mql.removeEventListener) mql.removeEventListener("change", handler);
      else if (mql.removeListener) mql.removeListener(handler);
    };
  }, [query]);

  return matches;
}

function useHideBarsOnScroll(opts?: {
  threshold?: number;          // delta mínimo para cambiar estado
  revealOnStopMs?: number|null;// null/0 => desactivar "revelar al frenar"
  minYToHide?: number;         // no ocultar hasta scrollear al menos esto
  disabled?: boolean;          // si true, nunca oculta ni agrega listeners
}) {
  const threshold = opts?.threshold ?? 6;
  const revealOnStopMs = opts?.revealOnStopMs ?? null; // ⬅️ por defecto desactivado
  const minYToHide = opts?.minYToHide ?? 0;
  const disabled = opts?.disabled ?? false;

  const [hidden, setHidden] = React.useState(false);
  const lastY = React.useRef(0);
  const raf = React.useRef<number | null>(null);
  const stopTimer = React.useRef<number | null>(null);

  const onScroll = React.useCallback(() => {
    if (disabled) return;
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
  }, [threshold, revealOnStopMs, minYToHide, disabled]);

  React.useEffect(() => {
    if (disabled) {
      setHidden(false);
      return;
    }
    lastY.current = window.scrollY || 0;
    window.addEventListener("scroll", onScroll, { passive: true });
    const viewport = getVisualViewport();
    const viewportScrollHandler = () => onScroll();
    if (viewport) viewport.addEventListener("scroll", viewportScrollHandler, { passive: true });

    return () => {
      window.removeEventListener("scroll", onScroll);
      if (viewport) viewport.removeEventListener("scroll", viewportScrollHandler);
      if (raf.current) cancelAnimationFrame(raf.current);
      if (stopTimer.current) clearTimeout(stopTimer.current);
    };
  }, [onScroll, disabled]);

  return disabled ? false : hidden; // true => oculto
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
    const y = e.clientY;

    let viewTop = 0, viewHeight = 0;
    const el = containerRef.current;
    if (el) { const r = el.getBoundingClientRect(); viewTop = r.top; viewHeight = r.height; }
    else {
      const viewport = getVisualViewport();
      viewTop = viewport?.offsetTop ?? 0;
      viewHeight = viewport?.height ?? window.innerHeight;
    }

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
  week_id?: string | null;
};
type OrderNoteEntry = {
  id: string;
  content: string;
  authorName?: string | null;
  authorId?: string | null;
  createdAt: string;
  updatedAt?: string | null;
  status: "pending" | "resolved";
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
  stock_signature_at?: string | null;

  /* NUEVO: pedido anterior */
  previous_qty?: number | null;
  previous_qty_updated_at?: string | null;
};

type MinStockState = {
  qty: number;
  enabled: boolean;
};

type ProviderFrequency = "SEMANAL" | "QUINCENAL" | "MENSUAL";


type SalesRow = {
  product: string;
  qty: number;
  subtotal?: number;
  date: number;
  category?: string;
  code?: string | null;
};
type PriceCatalogItem = {
  id: string;
  name: string;
  code?: string | null;
};
type CatalogApiResponse = {
  items?: PriceCatalogItem[] | unknown;
};
type Stats = {
  avg4w: number;
  sum3d: number;
  sum7d: number;
  sum2w: number;
  sum30d: number;
  lastQty?: number;
  lastDate?: number;
  lastUnitRetail?: number;
  avgUnitRetail30d?: number;
};
type SalesTrendPoint = { date: number; qty: number };
type ProductStatsEntry = {
  stats: Stats;
  anchor: number;
};
type PendingTotals = {
  orderId: string;
  providerId: string;
  orderTable: string;
  weekId: string | null;
  total: number;
  qty: number;
  updatedAt: string;
};
type FinalizeContext = "new-week" | "close-only";
type XlsxModule = typeof import("xlsx");
type StyledCell = CellObject & { s?: NonNullable<CellObject["s"]> };
type CssVars = React.CSSProperties & Record<`--${string}`, string>;
type ItemUpsertPayload = {
  order_id: string;
  product_name: string;
  qty: number;
  unit_price: number;
  group_name: string | null;
  display_name?: string | null;
  pack_size?: number | null;
  stock_qty?: number | null;
  stock_updated_at?: string | null;
  stock_signature_at?: string | null;
  previous_qty?: number | null;
  previous_qty_updated_at?: string | null;
  price_updated_at?: string | null;
  tenant_id?: string | null;
  branch_id?: string | null;
};
type GroupRenderFn = (
  ...args: [
    string,
    ItemRow[],
    React.HTMLAttributes<HTMLDivElement>,
    { index: number; total: number },
  ]
) => React.ReactNode;
type DraggableGroupListProps = {
  groups: Array<[string, ItemRow[]]>;
  renderGroup: GroupRenderFn;
  onReorder: (...args: [string[]]) => void;
};
const buildGroupOrderSnapshot = (
  currentNames: string[],
  persistedOrder: string[],
) => {
  const snapshot = persistedOrder.length ? [...persistedOrder] : [...currentNames];
  for (const name of currentNames) {
    if (!snapshot.includes(name)) snapshot.push(name);
  }
  return snapshot;
};
const buildGroupItemOrderSnapshot = (
  items: ItemRow[],
  orderMap: Record<string, string[]>,
  groupName: string,
  visibleOrder?: string[],
) => {
  const key = normalizeGroupKey(groupName);
  const groupItems = items.filter(
    (it) => it.product_name !== GROUP_PLACEHOLDER && normalizeGroupKey(it.group_name) === key,
  );
  const fallbackOrder = groupItems.map((it) => it.id);
  const allowed = new Set(fallbackOrder);
  if (!fallbackOrder.length) return { key, order: [] as string[] };

  const visibleBase = Array.isArray(visibleOrder)
    ? visibleOrder.filter((id) => allowed.has(id))
    : [];
  const savedOrder = (orderMap[key] ?? []).filter((id) => allowed.has(id));
  let workingOrderBase = visibleBase.length ? visibleBase : savedOrder;
  if (!workingOrderBase.length) workingOrderBase = fallbackOrder;
  const workingOrder = [...workingOrderBase];
  fallbackOrder.forEach((id) => {
    if (!workingOrder.includes(id)) workingOrder.push(id);
  });
  return { key, order: workingOrder };
};
type AddItemHandler = (...args: [string, string]) => Promise<void>;
type RemoveItemHandler = (id: string) => Promise<void>;
type UpdateQtyHandler = (...args: [string, number]) => Promise<void>;
type UpdateNumberHandler = (...args: [string, number]) => Promise<void>;
type RenameGroupHandler = (...args: [string, string]) => Promise<void>;
type DeleteGroupHandler = (name: string) => Promise<void>;
type UpdatePackSizeHandler = (...args: [string, number | null]) => Promise<void>;
type UpdateStockHandler = (...args: [string, number | null]) => Promise<void>;
type BulkItemsHandler = (...args: [string[], string]) => Promise<void>;
type RenameItemHandler = (...args: [string, string]) => Promise<void> | void;
type ComputeSalesSinceHandler = (...args: [string, number | null]) => number;
type SetItemCheckedHandler = (...args: [string, boolean]) => void;
type SetGroupCheckedHandler = (...args: [string, boolean]) => void;
type ToggleStatsHandler = (...args: [string]) => void;
type ProviderWeekRow = { id: string; week_start: string; label?: string | null };

const addDaysUTC = (iso: string, days: number): string => {
  if (!iso) return iso;
  const base = new Date(`${iso}T00:00:00Z`);
  base.setUTCDate(base.getUTCDate() + days);
  return base.toISOString().slice(0, 10);
};

const formatARShort = (iso: string) => {
  if (!iso) return "";
  return new Intl.DateTimeFormat("es-AR", {
    day: "2-digit",
    month: "2-digit",
    timeZone: "UTC",
  }).format(new Date(`${iso}T00:00:00Z`));
};

const getISOWeekFromISO = (iso: string): number => {
  if (!iso) return 0;
  const d = new Date(`${iso}T00:00:00Z`);
  const target = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
  const day = (target.getUTCDay() + 6) % 7;
  target.setUTCDate(target.getUTCDate() - day + 3);
  const firstThursday = new Date(Date.UTC(target.getUTCFullYear(), 0, 4));
  const firstDay = (firstThursday.getUTCDay() + 6) % 7;
  firstThursday.setUTCDate(firstThursday.getUTCDate() - firstDay + 3);
  return 1 + Math.round((target.getTime() - firstThursday.getTime()) / (7 * 24 * 3600 * 1000));
};

const formatWeekDisplay = (weekStart: string, custom?: string | null) => {
  if (custom?.trim()) return custom.trim();
  const start = weekStart;
  const end = addDaysUTC(start, 6);
  const weekNo = getISOWeekFromISO(start);
  return `Semana ${weekNo} · ${formatARShort(start)}–${formatARShort(end)}`;
};

const weekLabel = (row: ProviderWeekRow) => formatWeekDisplay(row.week_start, row.label);

const startOfWeekISO = (date = new Date()): string => {
  const utc = new Date(Date.UTC(
    date.getUTCFullYear(),
    date.getUTCMonth(),
    date.getUTCDate(),
  ));
  const day = (utc.getUTCDay() + 6) % 7;
  utc.setUTCDate(utc.getUTCDate() - day);
  return utc.toISOString().slice(0, 10);
};
type UpdateUnitPriceHandler = (id: string, price: number) => Promise<void>;

const createNoteId = () => {
  if (typeof globalThis !== "undefined" && globalThis.crypto?.randomUUID) {
    return globalThis.crypto.randomUUID();
  }
  return `note_${Math.random().toString(36).slice(2, 11)}`;
};

const normalizeNoteStatus = (raw: unknown): OrderNoteEntry["status"] =>
  raw === "resolved" ? "resolved" : "pending";

const parseOrderNotesField = (raw: string | null | undefined): OrderNoteEntry[] => {
  if (!raw) return [];
  const trimmed = raw.trim();
  if (!trimmed) return [];

  const mapEntry = (entry: unknown): OrderNoteEntry | null => {
    if (!entry || typeof entry !== "object") return null;
    const draft = entry as Record<string, unknown>;
    const content = typeof draft.content === "string" ? draft.content.trim() : "";
    if (!content) return null;
    const createdAt =
      typeof draft.createdAt === "string"
        ? draft.createdAt
        : typeof draft.timestamp === "string"
        ? draft.timestamp
        : new Date().toISOString();
    return {
      id: typeof draft.id === "string" ? draft.id : createNoteId(),
      content,
      authorName:
        typeof draft.authorName === "string"
          ? draft.authorName
          : typeof draft.author === "string"
          ? draft.author
          : null,
      authorId: typeof draft.authorId === "string" ? draft.authorId : undefined,
      createdAt,
      updatedAt: typeof draft.updatedAt === "string" ? draft.updatedAt : undefined,
      status: normalizeNoteStatus(draft.status),
    };
  };

  try {
    const parsed = JSON.parse(trimmed);
    if (Array.isArray(parsed)) {
      return parsed
        .map(mapEntry)
        .filter((entry): entry is OrderNoteEntry => Boolean(entry))
        .sort((a, b) => {
          const aTime = Date.parse(a.createdAt);
          const bTime = Date.parse(b.createdAt);
          return (Number.isNaN(bTime) ? 0 : bTime) - (Number.isNaN(aTime) ? 0 : aTime);
        });
    }
    if (typeof parsed === "object" && parsed !== null) {
      const entry = mapEntry(parsed);
      return entry ? [entry] : [];
    }
    if (typeof parsed === "string" && parsed.trim()) {
      return [
        {
          id: createNoteId(),
          content: parsed.trim(),
          createdAt: new Date().toISOString(),
          status: "pending",
        },
      ];
    }
  } catch {
    // Fallback handled below
  }

  return [
    {
      id: createNoteId(),
      content: trimmed,
      createdAt: new Date().toISOString(),
      status: "pending",
    },
  ];
};

const serializeOrderNotesField = (notes: OrderNoteEntry[]): string | null => {
  if (!notes.length) return null;
  return JSON.stringify(
    notes.map((note) => ({
      id: note.id,
      content: note.content,
      authorName: note.authorName ?? null,
      authorId: note.authorId ?? null,
      createdAt: note.createdAt,
      updatedAt: note.updatedAt ?? null,
      status: note.status,
    })),
  );
};

const relativeTimeFromNow = (value?: string | null) => {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  const diffMs = Date.now() - date.getTime();
  const minutes = Math.floor(diffMs / 60000);
  if (minutes < 1) return "Ahora";
  if (minutes < 60) return `Hace ${minutes}m`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `Hace ${hours}h`;
  const days = Math.floor(hours / 24);
  if (days === 1) return "Ayer";
  if (days < 7) return `Hace ${days}d`;
  return date.toLocaleDateString("es-AR", { day: "2-digit", month: "short" });
};

type GroupSectionProps = {
  groupName: string;
  items: ItemRow[];
  productNames: string[];
  getSalesRowsForProduct: (productName: string) => SalesRow[];
  getStatsForProduct: (productName: string) => ProductStatsEntry | null;
  margin: number;
  tokenMatch: (...args: [string, string]) => boolean;
  placeholder: string;
  onRenameItemLabel: RenameItemHandler;
  computeSalesSinceStock: ComputeSalesSinceHandler;
  onAddItem: AddItemHandler;
  onRemoveItem: RemoveItemHandler;
  onUpdateQty: UpdateQtyHandler;
  onUpdateUnitPrice: UpdateNumberHandler;
  onRenameGroup: RenameGroupHandler;
  onDeleteGroup: DeleteGroupHandler;
  onUpdatePackSize: UpdatePackSizeHandler;
  onUpdateStock: UpdateStockHandler;
  onBulkAddItems?: BulkItemsHandler;
  onBulkRemoveByNames?: BulkItemsHandler;
  sortMode: SortMode;
  manualOrder: string[];
  manualSortActive: boolean;
  onMoveItem: (itemId: string, dir: "up" | "down", visibleOrder: string[]) => void;
  onReorderItem?: (itemId: string, position: number, visibleOrder: string[]) => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
  checkedMap: Record<string, boolean>;
  setItemChecked: SetItemCheckedHandler;
  groupCheckedMap: Record<string, boolean>;
  setGroupChecked: SetGroupCheckedHandler;
  statsOpenMap: Record<string, boolean>;
  onToggleStats: ToggleStatsHandler;
  minStockMap: Record<string, MinStockState>;
  onUpdateMinStock: (itemId: string, qty: number) => void;
  onToggleMinStock: (itemId: string, enabled: boolean) => void;
  autoQtyMap: Record<string, boolean>;
  onToggleAutoQty: (itemId: string, enabled: boolean) => void;
  onRememberManualQty: (itemId: string, qty: number) => void;
  getManualQtyBackup: (itemId: string) => number | null;
  frequency: ProviderFrequency;
  onChangeFrequency: (freq: ProviderFrequency) => void;
  position: number;
  totalGroups: number;
  onSetPosition: (nextPosition: number) => void;
  containerProps?: React.HTMLAttributes<HTMLDivElement>;
  bottomViewportOffset: number;
  floatingActionBottomOffset: string;
};

type SortMode = "manual" | "alpha_asc" | "alpha_desc" | "avg_desc" | "avg_asc";
const SORT_MODES: SortMode[] = ["manual", "alpha_asc", "alpha_desc", "avg_desc", "avg_asc"];
const EMPTY_ITEM_ORDER: string[] = [];
const isSortMode = (value: unknown): value is SortMode =>
  typeof value === "string" && SORT_MODES.includes(value as SortMode);
const PROVIDER_FREQUENCIES: ProviderFrequency[] = ["SEMANAL", "QUINCENAL", "MENSUAL"];
const isProviderFrequency = (value: unknown): value is ProviderFrequency =>
  typeof value === "string" && PROVIDER_FREQUENCIES.includes(value as ProviderFrequency);
const providerFrequencyLabel = (value: ProviderFrequency): string => {
  if (value === "QUINCENAL") return "Quincenal";
  if (value === "MENSUAL") return "Mensual";
  return "Semanal";
};
const AUTO_FREQUENCY_OPTIONS: Array<{ value: ProviderFrequency; title: string; description: string }> = [
  { value: "SEMANAL", title: "Auto semanal", description: "Ventas últimos 7 días" },
  { value: "QUINCENAL", title: "Auto quincenal", description: "Ventas últimos 14 días" },
  { value: "MENSUAL", title: "Auto mensual", description: "Ventas últimos 30 días" },
];

const UI_STATE_STORAGE_VERSION = 6;

type StoredUiStatePayload = {
  version: number;
  checked?: Record<string, boolean>;
  groupChecked?: Record<string, boolean>;
  sortMode?: SortMode;
  openGroup?: string | null;
  statsOpen?: string[];
  itemOrder?: Record<string, string[]>;
  minStockTargets?: Record<string, MinStockState>;
  autoQtyMap?: Record<string, boolean>;
};

type ParsedUiState = {
  checked: Record<string, boolean>;
  groupCheckedMap: Record<string, boolean>;
  sortMode?: SortMode;
  openGroup?: string | null;
  statsOpenIds: string[];
  itemOrderMap: Record<string, string[]>;
  minStockMap: Record<string, MinStockState>;
  autoQtyMap: Record<string, boolean>;
};

type SnapshotItem = {
  product_name: string;
  display_name?: string | null; // 👈 NUEVO
  qty: number;
  unit_price: number;
  group_name: string | null;
  pack_size?: number | null;
  stock_qty?: number | null;
  stock_updated_at?: string | null;
  stock_signature_at?: string | null;
  stock_signature_label?: string | null;
  previous_qty?: number | null;
  previous_qty_updated_at?: string | null;
  price_updated_at?: string | null;
  tenant_id?: string | null;
  branch_id?: string | null;
};

type SnapshotPayload = {
  items: SnapshotItem[];
};

type SnapshotRow = {
  id: string; order_id: string; title: string; snapshot: SnapshotPayload; created_at: string;
};

type OrderExportFormat = "xlsx" | "json" | "json_xlsx";

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
  stockSignatureAt: string | null;
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
  uiState?: {
    sortMode?: SortMode;
    openGroup?: string | null;
    statsOpenIds?: string[];
    itemOrder?: Record<string, string[]>;
    minStockTargets?: Record<string, MinStockState>;
    autoQtyMap?: Record<string, boolean>;
  };
};

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const normalizeMinStockEntry = (value: unknown): MinStockState | null => {
  if (typeof value === "number" && Number.isFinite(value)) {
    const qty = Math.max(0, Math.round(value));
    if (qty <= 0) return null;
    return { qty, enabled: true };
  }
  if (!isRecord(value)) return null;
  const rawQty = value.qty;
  let qty = 0;
  if (typeof rawQty === "number") qty = rawQty;
  else if (typeof rawQty === "string") {
    const normalized = rawQty.replace(/\s+/g, "").replace(/,/g, ".");
    const parsed = Number(normalized);
    qty = Number.isFinite(parsed) ? parsed : 0;
  } else if (rawQty != null) {
    const coerced = Number(rawQty);
    qty = Number.isFinite(coerced) ? coerced : 0;
  }
  const rounded = Math.max(0, Math.round(qty));
  const enabled = Boolean(value.enabled);
  if (!enabled && rounded <= 0) return null;
  return { qty: rounded, enabled };
};

const sanitizeMinStockMap = (
  raw: unknown,
  validIds?: Set<string>,
): Record<string, MinStockState> => {
  if (!isRecord(raw)) return {};
  return Object.entries(raw).reduce<Record<string, MinStockState>>((acc, [id, value]) => {
    if (validIds && !validIds.has(id)) return acc;
    const entry = normalizeMinStockEntry(value);
    if (entry) acc[id] = entry;
    return acc;
  }, {});
};

const serializeMinStockMap = (
  map: Record<string, MinStockState>,
): Record<string, MinStockState> | undefined => {
  const entries = Object.entries(map).filter(
    ([, value]) => value && (value.qty > 0 || value.enabled),
  );
  if (!entries.length) return undefined;
  return Object.fromEntries(
    entries.map(([id, value]) => ({
      id,
      value: {
        qty: Math.max(0, Math.round(value.qty || 0)),
        enabled: Boolean(value.enabled),
      },
    })).map(({ id, value }) => [id, value]),
  );
};

const areMinStockMapsEqual = (
  a: Record<string, MinStockState>,
  b: Record<string, MinStockState>,
): boolean => {
  const aKeys = Object.keys(a);
  const bKeys = Object.keys(b);
  if (aKeys.length !== bKeys.length) return false;
  return aKeys.every((key) => {
    const av = a[key];
    const bv = b[key];
    if (!bv) return false;
    return av.qty === bv.qty && av.enabled === bv.enabled;
  });
};

const hasEnabledMinStock = (map: Record<string, MinStockState>) =>
  Object.values(map).some((entry) => entry.enabled && entry.qty > 0);

const sanitizeAutoQtyMap = (
  raw: unknown,
  validIds?: Set<string>,
): Record<string, boolean> => {
  if (!isRecord(raw)) return {};
  return Object.entries(raw).reduce<Record<string, boolean>>((acc, [id, value]) => {
    if (validIds && !validIds.has(id)) return acc;
    if (typeof value === "boolean") acc[id] = value;
    return acc;
  }, {});
};

const serializeAutoQtyMap = (
  map: Record<string, boolean>,
): Record<string, boolean> | undefined => {
  const entries = Object.entries(map);
  if (!entries.length) return undefined;
  return Object.fromEntries(entries.map(([id, value]) => [id, Boolean(value)]));
};

const sanitizeGroupCheckedMap = (raw: unknown): Record<string, boolean> => {
  if (!isRecord(raw)) return {};
  return Object.entries(raw).reduce<Record<string, boolean>>((acc, [key, value]) => {
    if (typeof value !== "boolean") return acc;
    const normKey = normalizeGroupKey(key);
    acc[normKey] = value;
    return acc;
  }, {});
};

const serializeGroupCheckedMap = (
  map: Record<string, boolean>,
): Record<string, boolean> | undefined => {
  const entries = Object.entries(map);
  if (!entries.length) return undefined;
  return Object.fromEntries(entries.map(([key, value]) => [key, Boolean(value)]));
};

const statsOpenIdsToMap = (ids: string[]): Record<string, boolean> =>
  ids.reduce<Record<string, boolean>>((acc, id) => {
    if (typeof id === "string" && id) acc[id] = true;
    return acc;
  }, {});

const mapStatsOpenIds = (map: Record<string, boolean>): string[] =>
  Object.entries(map)
    .filter(([, value]) => Boolean(value))
    .map(([key]) => key);

const normalizeGroupKey = (value: string | null | undefined): string => {
  const trimmed = (value ?? "").trim();
  return trimmed.length > 0 ? trimmed : "Sin grupo";
};

const cloneItemOrderMap = (map: Record<string, string[]>): Record<string, string[]> =>
  Object.fromEntries(Object.entries(map).map(([key, ids]) => [key, [...ids]]));

const sanitizeItemOrderMap = (raw: unknown): Record<string, string[]> => {
  if (!isRecord(raw)) return {};
  const result: Record<string, string[]> = {};
  for (const [key, value] of Object.entries(raw)) {
    if (!Array.isArray(value)) continue;
    const normKey = normalizeGroupKey(key);
    const ids = value
      .map((id) => (typeof id === "string" ? id.trim() : ""))
      .filter((id): id is string => id.length > 0);
    if (!ids.length) continue;
    const unique: string[] = [];
    ids.forEach((id) => {
      if (!unique.includes(id)) unique.push(id);
    });
    if (unique.length) result[normKey] = unique;
  }
  return result;
};

const applyManualOrder = (arr: ItemRow[], orderIds?: string[]): ItemRow[] => {
  if (!orderIds || orderIds.length === 0) return arr;
  const map = new Map(arr.map((item) => [item.id, item]));
  if (!map.size) return arr;
  const seen = new Set<string>();
  const ordered: ItemRow[] = [];
  orderIds.forEach((id) => {
    const item = map.get(id);
    if (item) {
      ordered.push(item);
      seen.add(id);
    }
  });
  arr.forEach((item) => {
    if (!seen.has(item.id)) ordered.push(item);
  });
  return ordered;
};

const parseStoredUiState = (raw: unknown): ParsedUiState => {
  const base: ParsedUiState = {
    checked: {},
    groupCheckedMap: {},
    sortMode: undefined,
    openGroup: undefined,
    statsOpenIds: [],
    itemOrderMap: {},
    minStockMap: {},
    autoQtyMap: {},
  };
  if (!isRecord(raw)) return base;

  const looksStructured =
    typeof raw.version === "number" ||
    isRecord(raw.checked) ||
    isRecord(raw.groupChecked) ||
    isRecord(raw.group_checked) ||
    typeof raw.sortMode === "string" ||
    Array.isArray(raw.statsOpen) ||
    raw.openGroup === null ||
    typeof raw.openGroup === "string" ||
    isRecord(raw.itemOrder);

  if (!looksStructured) {
    const legacyChecked = Object.entries(raw).reduce<Record<string, boolean>>((acc, [key, value]) => {
      if (typeof value === "boolean") acc[key] = value;
      return acc;
    }, {});
    return {
      checked: legacyChecked,
      groupCheckedMap: {},
      sortMode: undefined,
      openGroup: undefined,
      statsOpenIds: [],
      itemOrderMap: {},
      minStockMap: {},
      autoQtyMap: {},
    };
  }

  const checkedRaw = isRecord(raw.checked) ? raw.checked : undefined;
  const checked = checkedRaw
    ? Object.entries(checkedRaw).reduce<Record<string, boolean>>((acc, [key, value]) => {
        if (typeof value === "boolean") acc[key] = value;
        return acc;
      }, {})
    : {};

  const sortMode = isSortMode(raw.sortMode) ? (raw.sortMode as SortMode) : undefined;
  const openGroup =
    raw.openGroup === null || typeof raw.openGroup === "string"
      ? (raw.openGroup as string | null)
      : undefined;
  const statsOpenIds = Array.isArray(raw.statsOpen)
    ? (raw.statsOpen as unknown[]).filter((id): id is string => typeof id === "string" && id.length > 0)
    : [];
  const itemOrderMap = sanitizeItemOrderMap(raw.itemOrder);
  const minStockRaw =
    raw.minStockTargets ?? raw.minStockMap ?? raw.minStock ?? raw.min_stock_targets;
  const minStockMap = sanitizeMinStockMap(minStockRaw);
  const autoQtyRaw = raw.autoQtyMap ?? raw.auto_qty_map;
  const autoQtyMap = sanitizeAutoQtyMap(autoQtyRaw);
  const groupCheckedRaw = raw.groupChecked ?? raw.group_checked ?? raw.groupCheckedMap;
  const groupCheckedMap = sanitizeGroupCheckedMap(groupCheckedRaw);

  return { checked, groupCheckedMap, sortMode, openGroup, statsOpenIds, itemOrderMap, minStockMap, autoQtyMap };
};

const buildStoredUiStatePayload = (args: {
  checked: Record<string, boolean>;
  groupCheckedMap: Record<string, boolean>;
  sortMode: SortMode;
  openGroup: string | null;
  statsOpenIds: string[];
  itemOrderMap: Record<string, string[]>;
  minStockMap: Record<string, MinStockState>;
  autoQtyMap: Record<string, boolean>;
}): StoredUiStatePayload => {
  const payload: StoredUiStatePayload = {
    version: UI_STATE_STORAGE_VERSION,
    checked: { ...args.checked },
    sortMode: args.sortMode,
    openGroup: args.openGroup,
    statsOpen: [...args.statsOpenIds],
    itemOrder: cloneItemOrderMap(args.itemOrderMap),
  };

  const minStockTargets = serializeMinStockMap(args.minStockMap);
  if (minStockTargets) payload.minStockTargets = minStockTargets;
  const autoQtySerialized = serializeAutoQtyMap(args.autoQtyMap);
  if (autoQtySerialized) payload.autoQtyMap = autoQtySerialized;
  const groupCheckedSerialized = serializeGroupCheckedMap(args.groupCheckedMap);
  if (groupCheckedSerialized) payload.groupChecked = groupCheckedSerialized;

  return payload;
};

const shallowEqualRecord = (a: Record<string, boolean>, b: Record<string, boolean>): boolean => {
  const aKeys = Object.keys(a);
  const bKeys = Object.keys(b);
  if (aKeys.length !== bKeys.length) return false;
  for (const key of aKeys) {
    if (a[key] !== b[key]) return false;
  }
  return true;
};

const areStringArraysEqual = (a: string[], b: string[]): boolean => {
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i += 1) {
    if (a[i] !== b[i]) return false;
  }
  return true;
};

/* ========= Drag & Drop de grupos (HTML5 nativo) ========= */
function DraggableGroupList({ groups, renderGroup, onReorder }: DraggableGroupListProps) {
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
      document.removeEventListener("dragover", onDocDragOver);
      document.removeEventListener("drop", stopAll);
      document.removeEventListener("dragend", stopAll);
    };
  }, [dragIndex, auto]);

  function handleDragStart(e: React.DragEvent<HTMLDivElement>, index: number) {
    setDragIndex(index);
    e.dataTransfer.effectAllowed = "move";
    e.dataTransfer.setData("text/plain", String(index)); // Firefox
    auto.start(); // 🔛 arranca el loop
  }

  function handleDragOver(e: React.DragEvent<HTMLDivElement>, index: number) {
    e.preventDefault();
    setOverIndex(index);
    e.dataTransfer.dropEffect = "move";
    auto.updateFromEvent(e); // también actualizamos cuando está sobre un grupo
  }

  function handleDrop(e: React.DragEvent<HTMLDivElement>, index: number) {
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

  const total = groups.length;
  return (
    <>
      {groups.map(([groupName, arr], idx) => {
        const isDragging = dragIndex === idx;
        const isOver = overIndex === idx && dragIndex !== null && dragIndex !== idx;

        const containerProps: React.HTMLAttributes<HTMLDivElement> = {
          draggable: true,
          onDragStart: (e) => handleDragStart(e, idx),
          onDragOver: (e) => handleDragOver(e, idx),
          onDrop: (e) => handleDrop(e, idx),
          onDragEnd: handleDragEnd,
          className: [
            "rounded-lg outline-none",
            isDragging ? "opacity-60" : "",
            isOver ? "ring-2 ring-primary/40" : "",
          ].join(" "),
        };

        return (
          <React.Fragment key={groupName}>
            {renderGroup(groupName, arr, containerProps, { index: idx, total })}
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
const normalizeCodeValue = (value: unknown): string | null => {
  if (value == null) return null;
  if (typeof value === "number" && Number.isFinite(value)) {
    return Math.round(value).toLocaleString("en-US", { useGrouping: false });
  }
  const raw = typeof value === "string" ? value : String(value);
  const trimmed = raw.replace(NBSP_RX, " ").trim();
  if (!trimmed) return null;
  const compact = trimmed.replace(/\s+/g, "");
  if (/^\d+(?:[.,]\d+)?$/.test(compact)) {
    const normalized = compact.replace(/\./g, "").replace(",", ".");
    const num = Number(normalized);
    if (Number.isFinite(num)) {
      return Math.round(num).toLocaleString("en-US", { useGrouping: false });
    }
  }
  return trimmed.replace(/\s+/g, " ");
};
const normCodeKey = (code?: string | null) => {
  if (!code) return "";
  return code.replace(/\s+/g, "").toLowerCase();
};
const normalizeCatalogItem = (raw: unknown): PriceCatalogItem | null => {
  if (!raw || typeof raw !== "object") return null;
  const item = raw as Partial<PriceCatalogItem> & Record<string, unknown>;
  const name = typeof item.name === "string" ? item.name.trim() : "";
  if (!name) return null;
  const code = normalizeCodeValue(item.code);
  const id =
    typeof item.id === "string" && item.id.trim()
      ? item.id.trim()
      : code || name;
  return {
    id,
    name,
    code: code ?? null,
  };
};
const nowLocalIso = () => {
  const now = new Date();
  const offsetMs = now.getTimezoneOffset() * 60000;
  return new Date(now.getTime() - offsetMs).toISOString().slice(0, 16);
};
const toLocalInputFromISO = (iso: string | null | undefined) => {
  if (!iso) return nowLocalIso();
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return nowLocalIso();
  const offsetMs = date.getTimezoneOffset() * 60000;
  return new Date(date.getTime() - offsetMs).toISOString().slice(0, 16);
};

const excelSerialToUTC = (s: number) => Date.UTC(1899, 11, 30) + Math.round(s * 86400000);
function parseDateCell(v: unknown): number | null {
  if (v == null) return null;
  if (v instanceof Date) {
    const ts = v.getTime();
    return Number.isNaN(ts) ? null : ts;
  }
  if (typeof v === "number") return v < 100000 ? excelSerialToUTC(v) : v;
  if (typeof v === "string") {
    const normalized = v
      .replace(NBSP_RX, " ")
      .trim()
      .replace(/\./g, "/")
      .replace(/-/g, "/")
      .replace(/\s+hs?$/i, "");
    if (!normalized) return null;
    const parsed = Date.parse(normalized);
    if (!Number.isNaN(parsed)) return parsed;
    const dateTimeMatch = normalized.match(
      /^(\d{1,2})\/(\d{1,2})(?:\/(\d{2,4}))?(?:\s+(\d{1,2}):(\d{2})(?::(\d{2}))?)?$/,
    );
    if (dateTimeMatch) {
      const [, dd, mm, rawYear, rawHour, rawMinute, rawSecond] = dateTimeMatch;
      const day = Math.max(1, Math.min(31, Number(dd)));
      const month = Math.max(1, Math.min(12, Number(mm))) - 1;
      let year = rawYear == null || rawYear === "" ? new Date().getFullYear() : Number(rawYear);
      if (year < 100) year += 2000;
      const hour = rawHour != null ? Math.max(0, Math.min(23, Number(rawHour))) : 0;
      const minute = rawMinute != null ? Math.max(0, Math.min(59, Number(rawMinute))) : 0;
      const second = rawSecond != null ? Math.max(0, Math.min(59, Number(rawSecond))) : 0;
      let timestamp = Date.UTC(year, month, day, hour, minute, second);
      if (!rawYear) {
        const now = Date.now();
        const sixMonths = 180 * 24 * 60 * 60 * 1000;
        if (timestamp - now > sixMonths) {
          timestamp = Date.UTC(year - 1, month, day, hour, minute, second);
        }
      }
      return timestamp;
    }
  }
  return null;
}
const startOfDayUTC = (t: number) => { const d = new Date(t); return Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()); };
const fmtMoney = (n: number) => new Intl.NumberFormat("es-AR", { style: "currency", currency: "ARS", maximumFractionDigits: 0 }).format(n || 0);
const fmtInt = (n: number) => new Intl.NumberFormat("es-AR").format(n || 0);
const formatStockSignatureLabel = (value?: string | null): string | null => {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  const pad = (x: number) => String(Math.floor(Math.abs(x))).padStart(2, "0");
  const dd = pad(date.getDate());
  const mm = pad(date.getMonth() + 1);
  const hh = pad(date.getHours());
  const mins = pad(date.getMinutes());
  return `${dd}/${mm} ${hh}:${mins}`;
};
const qtyFormatter = new Intl.NumberFormat("es-AR", { maximumFractionDigits: 2 });
const round2 = (n: number) => Math.round((Number.isFinite(n) ? n : 0) * 100) / 100;

/** Ajusta una cantidad al múltiplo del paquete (si existe). */
function snapToPack(n: number, pack?: number | null) {
  const v = Math.max(0, Math.round(n || 0));
  const m = pack && pack > 1 ? Math.round(pack) : 1;
  if (m <= 1) return v;
  return Math.max(0, Math.round(v / m) * m); // usar Math.ceil si siempre querés redondear hacia arriba
}
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
  const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(ws, { raw: true });

  const candidates = rows.map((r) => {
    const obj: Record<string, unknown> = {};
    for (const key of Object.keys(r)) {
      obj[key.toLowerCase().replace(NBSP_RX, " ").trim()] = r[key];
    }
    return obj;
  });
  const nameKeys = ["artículo", "articulo", "producto", "nombre", "item", "producto/marca"];
  const dateKeys = ["hora", "fecha", "date", "día", "dia"];
  const qtyKeys  = ["cantidad", "qty", "venta", "ventas"];
  const subKeys  = ["subtotal", "importe", "total", "monto"];
  const catKeys  = ["subfamilia", "categoría", "categoria", "rubro", "grupo", "familia"];
  const codeKeys = ["codigo", "código", "cod", "sku", "cod articulo", "codigo articulo", "cod. articulo"];

  const out: SalesRow[] = [];
  for (const r of candidates) {
    const nk = nameKeys.find((k) => r[k] != null);
    const dk = dateKeys.find((k) => r[k] != null);
    const qk = qtyKeys.find((k) => r[k] != null);
    const sk = subKeys.find((k) => r[k] != null);
    const ck = catKeys.find((k) => r[k] != null);
    const codeKey = codeKeys.find((k) => r[k] != null);
    const product  = nk ? String(r[nk]).trim() : "";
    const date     = dk ? parseDateCell(r[dk]) : null;
    const qty      = qk ? Number(r[qk] ?? 0) || 0 : 0;
    const subtotal = sk ? Number(r[sk]) : undefined;
    const category = ck ? String(r[ck]) : undefined;
    const code = codeKey ? normalizeCodeValue(r[codeKey]) : null;
    if (!product || !date) continue;
    out.push({ product, qty, subtotal, date, category, code });
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

function computeStatsFromRows(rows: SalesRow[], now = Date.now()): Stats {
  if (!rows.length) {
    return {
      avg4w: 0,
      sum3d: 0,
      sum7d: 0,
      sum2w: 0,
      sum30d: 0,
    };
  }

  const ms = 24 * 3600 * 1000;
  const anchor = startOfDayUTC(now);
  const sumIn = (days: number) => {
    const threshold = startOfDayUTC(anchor - days * ms);
    return rows.reduce((acc, row) => (row.date >= threshold ? acc + (row.qty || 0) : acc), 0);
  };

  const sum7d = sumIn(7);
  const sum3d = sumIn(3);
  const sum2w = sumIn(14);
  const sum30d = sumIn(30);
  const sum4w = sumIn(28);
  const avg4w = sum4w / 4;

  const sorted = [...rows].sort((a, b) => b.date - a.date);
  const last = sorted[0];
  const lastUnitRetail =
    last && last.qty && last.subtotal != null && last.qty > 0 ? last.subtotal / last.qty : undefined;

  const threshold30d = startOfDayUTC(anchor - 30 * ms);
  const in30 = rows.filter((s) => s.date >= threshold30d && s.qty > 0 && s.subtotal != null);
  const sumSub = in30.reduce((acc, row) => acc + (row.subtotal || 0), 0);
  const sumQty = in30.reduce((acc, row) => acc + (row.qty || 0), 0);
  const avgUnitRetail30d = sumQty > 0 ? sumSub / sumQty : undefined;

  return {
    avg4w: Math.round(avg4w) || 0,
    sum3d: Math.round(sum3d) || 0,
    sum7d: Math.round(sum7d) || 0,
    sum2w: Math.round(sum2w) || 0,
    sum30d: Math.round(sum30d) || 0,
    lastQty: last?.qty ?? undefined,
    lastDate: last?.date ?? undefined,
    lastUnitRetail,
    avgUnitRetail30d,
  };
}

function buildSalesTrendSeries(rows: SalesRow[], days = 14, anchor = Date.now()): SalesTrendPoint[] {
  if (days <= 0) return [];
  const dayMs = 24 * 3600 * 1000;
  const end = startOfDayUTC(anchor);
  const start = end - (days - 1) * dayMs;
  const buckets: SalesTrendPoint[] = [];
  for (let i = 0; i < days; i += 1) {
    buckets.push({ date: start + i * dayMs, qty: 0 });
  }
  const bucketMap = new Map(buckets.map((point) => [point.date, point.qty]));
  rows.forEach((row) => {
    const day = startOfDayUTC(row.date);
    if (day < start || day > end) return;
    bucketMap.set(day, (bucketMap.get(day) ?? 0) + (row.qty || 0));
  });
  return buckets.map((point) => ({
    date: point.date,
    qty: bucketMap.get(point.date) ?? 0,
  }));
}
const estCost = (st?: Stats, marginPct = 45) =>
  Math.round((st?.lastUnitRetail ?? st?.avgUnitRetail30d ?? 0) * (1 - marginPct / 100));

function latestDateForRows(rows: SalesRow[]): number {
  if (!rows.length) return Date.now();
  const latest = rows.reduce((max, row) => (row.date > max ? row.date : max), rows[0].date);
  return startOfDayUTC(latest);
}

const normalizeSearchParam = (value: string | null) => {
  if (!value) return null;
  const trimmed = value.trim();
  if (!trimmed || trimmed === "null" || trimmed === "undefined") return null;
  return trimmed;
};

const EMPTY_STATS: Stats = {
  avg4w: 0,
  sum3d: 0,
  sum7d: 0,
  sum2w: 0,
  sum30d: 0,
};

/* =================== Página =================== */
export default function ProviderOrderPage() {
  const supabase = React.useMemo(() => getSupabaseBrowserClient(), []);
  const router = useRouter();
  const pathname = usePathname();
  const isDesktop = useMediaQuery("(min-width: 768px)");
  const [isStandalone, setIsStandalone] = React.useState(false);
  React.useEffect(() => {
    setIsStandalone(isStandaloneDisplayMode());
  }, []);

  const barsHidden = useHideBarsOnScroll({
    threshold: 5,
    revealOnStopMs: null,
    minYToHide: 24,
    disabled: isDesktop || isStandalone,
  });
  const viewportBottomOffset = useVisualViewportBottomOffset();
  const effectiveViewportOffset = isStandalone ? 0 : viewportBottomOffset;

  const params = useParams<{ slug: string; provId: string }>();
  const provId = String(params?.provId || "");
  const tenantSlug = String(params?.slug || "");
  const search = useSearchParams();
  const selectedWeekId = search.get("week");
  const tenantIdFromQuery = normalizeSearchParam(search.get("tenantId"));
  const branchIdFromQuery = normalizeSearchParam(search.get("branchId"));
  const providerNameFromQuery = normalizeSearchParam(search.get("name"));
  const providerFrequencyFromQueryRaw = normalizeSearchParam(search.get("freq"));
  const providerFrequencyFromQuery = React.useMemo<ProviderFrequency | null>(() => {
    if (!providerFrequencyFromQueryRaw) return null;
    const upper = providerFrequencyFromQueryRaw.toUpperCase();
    return isProviderFrequency(upper) ? upper : null;
  }, [providerFrequencyFromQueryRaw]);
  const [providerNameOverride, setProviderNameOverride] = React.useState<string | null>(null);
  const providerName = providerNameFromQuery || providerNameOverride || "Proveedor";
  const [providerFrequency, setProviderFrequency] = React.useState<ProviderFrequency>(
    providerFrequencyFromQuery ?? "SEMANAL"
  );
  const autoFrequencyLockedRef = React.useRef<boolean>(providerFrequencyFromQuery != null);
  React.useEffect(() => {
    if (!providerFrequencyFromQuery) return;
    autoFrequencyLockedRef.current = true;
    setProviderFrequency(providerFrequencyFromQuery);
  }, [providerFrequencyFromQuery]);
  const handleChangeAutoFrequency = React.useCallback((next: ProviderFrequency) => {
    autoFrequencyLockedRef.current = true;
    setProviderFrequency(next);
  }, []);
  const handleBackToProviders = React.useCallback(() => {
    if (!tenantSlug) {
      router.back();
      return;
    }
    router.push(`/t/${tenantSlug}/proveedores`);
  }, [router, tenantSlug]);

const [orderNotes, setOrderNotes] = React.useState<OrderNoteEntry[]>([]);
const orderNotesRef = React.useRef<OrderNoteEntry[]>([]);
const [noteInput, setNoteInput] = React.useState("");
const [editingNoteId, setEditingNoteId] = React.useState<string | null>(null);
const [editingContent, setEditingContent] = React.useState("");
const [notesExpanded, setNotesExpanded] = React.useState(false);
const [stockActionsExpanded, setStockActionsExpanded] = React.useState(false);
const [productOrgExpanded, setProductOrgExpanded] = React.useState(false);
const [notesSubmitting, setNotesSubmitting] = React.useState(false);
  const [noteActionState, setNoteActionState] = React.useState<{ id: string; type: "delete" | "toggle" | "edit" } | null>(null);
  const [currentUserName, setCurrentUserName] = React.useState("Equipo");
  const [currentUserId, setCurrentUserId] = React.useState<string | null>(null);
  const lastPersistedNotesRef = React.useRef<string>("");

  const [contextIds, setContextIds] = React.useState<{ tenantId: string | null; branchId: string | null }>({
    tenantId: tenantIdFromQuery,
    branchId: branchIdFromQuery,
  });

  const tenantId = contextIds.tenantId || undefined;
  const branchId = contextIds.branchId || undefined;
  const weekStorageKey = React.useMemo(
    () => `${WEEK_STORAGE_PREFIX}:${tenantId ?? "-"}:${branchId ?? "-"}`,
    [tenantId, branchId],
  );

  const [ordersTable, setOrdersTable] = React.useState<string>(ORDER_TABLE_CANDIDATES[0]);
  const [itemsTable, setItemsTable] = React.useState<string>(ITEM_TABLE_CANDIDATES[0]);

  const [order, setOrder]   = React.useState<OrderRow | null>(null);
  const [items, setItems]   = React.useState<ItemRow[]>([]);
  const [sales, setSales]   = React.useState<SalesRow[]>([]);
  const [priceCatalog, setPriceCatalog] = React.useState<PriceCatalogItem[]>([]);
  const [marginPct, setMarginPct] = React.useState(45);
  const [filter, setFilter] = React.useState("");
  const [isFilterOpen, setIsFilterOpen] = React.useState(false);
  const [isCreateGroupOpen, setIsCreateGroupOpen] = React.useState(false);
  const [sortMode, setSortMode] = React.useState<SortMode>("alpha_asc");
  const [groupOrder, setGroupOrder] = React.useState<string[]>([]);
  const [itemOrderMap, setItemOrderMap] = React.useState<Record<string, string[]>>({});
  const [stockModalOpen, setStockModalOpen] = React.useState(false);
  const [stockProcessing, setStockProcessing] = React.useState(false);
  const [stockAdjustments, setStockAdjustments] = React.useState<Record<string, string>>({});
  const [stockFilter, setStockFilter] = React.useState("");
  const [stockError, setStockError] = React.useState<string | null>(null);
  const [stockSalesInput, setStockSalesInput] = React.useState(() => nowLocalIso());
  const [lastStockFromInput, setLastStockFromInput] = React.useState<string | null>(null);
  const [lastStockAppliedAt, setLastStockAppliedAt] = React.useState<string | null>(null);
  const [stockUndoSnapshot, setStockUndoSnapshot] = React.useState<StockUndoSnapshot | null>(null);
  const [savingSnapshot, setSavingSnapshot] = React.useState(false);
  const [finalizeDialogOpen, setFinalizeDialogOpen] = React.useState(false);
  const [finalizeReceived, setFinalizeReceived] = React.useState<Record<string, number>>({});
  const [finalizingOrder, setFinalizingOrder] = React.useState(false);
  const [finalizeContext, setFinalizeContext] = React.useState<FinalizeContext | null>(null);
  const [statsOpenMap, setStatsOpenMap] = React.useState<Record<string, boolean>>({});
  const [minStockMap, setMinStockMap] = React.useState<Record<string, MinStockState>>({});
  const [autoQtyMap, setAutoQtyMap] = React.useState<Record<string, boolean>>({});
  const [autoBufferDays, setAutoBufferDays] = React.useState<number>(AUTO_BUFFER_EXTRA_DAYS);
  const [autoBufferDialogOpen, setAutoBufferDialogOpen] = React.useState(false);
  const [autoBufferInput, setAutoBufferInput] = React.useState(String(AUTO_BUFFER_EXTRA_DAYS));
  const [autoBufferError, setAutoBufferError] = React.useState<string | null>(null);
  const [autoBufferDialogMode, setAutoBufferDialogMode] = React.useState<"apply" | "edit">("apply");
  const [suggestedMarginInput, setSuggestedMarginInput] = React.useState("0");
  const [suggestedMarginError, setSuggestedMarginError] = React.useState<string | null>(null);
  const autoBufferIndicatorText = `Margen: ${Math.max(0, autoBufferDays)}D`;
  const handleStepAutoBufferInput = React.useCallback((delta: number) => {
    setAutoBufferInput((prev) => {
      const normalized = prev.replace(",", ".").trim();
      const parsed = Number(normalized);
      const base = Number.isFinite(parsed) ? parsed : 0;
      const next = Math.max(0, Math.round(base + delta));
      return String(next);
    });
    setAutoBufferError(null);
  }, []);
  const handleStepSuggestedMargin = React.useCallback((delta: number) => {
    setSuggestedMarginInput((prev) => {
      const normalized = prev.replace(",", ".").trim();
      const parsed = Number(normalized);
      const base = Number.isFinite(parsed) ? parsed : 0;
      const next = Math.max(0, Math.round(base + delta));
      return String(next);
    });
    setSuggestedMarginError(null);
  }, []);

  React.useEffect(() => {
    if (!tenantSlug) return;
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(`/api/t/${tenantSlug}/precios`, { cache: "no-store" });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const body = (await res.json()) as CatalogApiResponse;
        const rawItems = Array.isArray(body.items) ? body.items : [];
        const normalized = rawItems
          .map((item) => normalizeCatalogItem(item))
          .filter((item): item is PriceCatalogItem => Boolean(item));
        if (!cancelled) setPriceCatalog(normalized);
      } catch (err) {
        console.warn("price catalog fetch failed", err);
        if (!cancelled) setPriceCatalog([]);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [tenantSlug]);
  const [peMarginEnabled, setPeMarginEnabled] = React.useState(false);
  const [peApplying, setPeApplying] = React.useState(false);
  const [peSettingsOpen, setPeSettingsOpen] = React.useState(false);
  const [peSimInput, setPeSimInput] = React.useState("");
  const [peSimProviderInput, setPeSimProviderInput] = React.useState("");
  const manualPriceRef = React.useRef<Record<string, number>>({});
  const peApplyPromiseRef = React.useRef<Promise<void> | null>(null);
  const updateUnitPriceRef = React.useRef<UpdateUnitPriceHandler | null>(updateUnitPrice);

  const filterInputRef = React.useRef<HTMLInputElement | null>(null);
  const manualQtyBackupRef = React.useRef<Record<string, number>>({});
  const autoSyncSuspendedRef = React.useRef(false);
  const rememberManualQty = React.useCallback((itemId: string, qty: number) => {
    const safe = Math.max(0, Math.round(Number.isFinite(qty) ? qty : 0));
    manualQtyBackupRef.current[itemId] = safe;
  }, []);
  const getManualQtyBackup = React.useCallback((itemId: string) => {
    const value = manualQtyBackupRef.current[itemId];
    return typeof value === "number" ? value : null;
  }, []);
  React.useEffect(() => {
    const ids = new Set(items.map((it) => it.id));
    const store = manualQtyBackupRef.current;
    Object.keys(store).forEach((itemId) => {
      if (!ids.has(itemId)) delete store[itemId];
    });
  }, [items]);
  const floatingFilterStyle = React.useMemo<React.CSSProperties>(() => ({
    top: isDesktop
      ? "calc(env(safe-area-inset-top) + 1.5rem)"
      : "calc(env(safe-area-inset-top) + 1rem)",
    right: isDesktop
      ? "clamp(1.5rem, calc((100vw - 64rem) / 2 + 2rem), 4rem)"
      : "1rem",
  }), [isDesktop]);

  React.useEffect(() => {
    if (!isFilterOpen) return;
    const id = window.setTimeout(() => {
      filterInputRef.current?.focus();
      filterInputRef.current?.select();
    }, 20);
    return () => window.clearTimeout(id);
  }, [isFilterOpen]);

  React.useEffect(() => {
    lastPersistedNotesRef.current = order?.notes ?? "";
    setOrderNotes(parseOrderNotesField(order?.notes));
  }, [order?.notes]);

  React.useEffect(() => {
    setFinalizeDialogOpen(false);
    setFinalizeReceived({});
    setFinalizeContext(null);
  }, [order?.id]);

  React.useEffect(() => {
    setFinalizeDialogOpen(false);
    setFinalizeReceived({});
    setFinalizeContext(null);
  }, [selectedWeekId]);

  React.useEffect(() => {
    setOrder(null);
    setItems([]);
    setSnapshots([]);
  }, [selectedWeekId]);

  React.useEffect(() => {
    orderNotesRef.current = orderNotes;
  }, [orderNotes]);

  React.useEffect(() => {
    let cancelled = false;
    supabase.auth
      .getUser()
      .then(({ data }: { data: { user: SupabaseUser | null } }) => {
        if (cancelled) return;
        const user = data?.user ?? null;
        if (!user) {
          setCurrentUserId(null);
          setCurrentUserName("Equipo");
          return;
        }
        setCurrentUserId(user.id);
        const rawName = typeof user.user_metadata?.full_name === "string" ? user.user_metadata.full_name : "";
        const fallbackName = typeof user.email === "string" ? user.email : "Equipo";
        setCurrentUserName(rawName?.trim() ? rawName.trim() : fallbackName);
      })
      .catch((err: unknown) => {
        console.warn("getUser for notes failed", err);
      });
    return () => {
      cancelled = true;
    };
  }, [supabase]);

  // Persistir notas del pedido en Supabase para compartirlas entre dispositivos
  const persistOrderNotes = React.useCallback(
    async (value: OrderNoteEntry[]) => {
      if (!order?.id) return;
      const targetTable = ordersTable;
      try {
        const payload = { notes: serializeOrderNotesField(value) };
        const { data, error } = await supabase
          .from(targetTable)
          .update(payload)
          .eq("id", order.id)
          .select("notes")
          .maybeSingle();
        if (error) throw error;
        const stored = data?.notes ?? null;
        lastPersistedNotesRef.current = stored ?? "";
        setOrder((prev) => (prev ? { ...prev, notes: stored } : prev));
      } catch (err) {
        console.error("persist order notes error", err);
        throw err;
      }
    },
    [order?.id, ordersTable, setOrder, supabase]
  );

  const updateNotesList = React.useCallback(
    async (updater: (prev: OrderNoteEntry[]) => OrderNoteEntry[]) => {
      const next = updater(orderNotesRef.current);
      setOrderNotes(next);
      try {
        await persistOrderNotes(next);
      } catch (err) {
        setOrderNotes(parseOrderNotesField(lastPersistedNotesRef.current));
        throw err;
      }
    },
    [persistOrderNotes]
  );

  const handleAddNote = React.useCallback(async () => {
    const message = noteInput.trim();
    if (!message || !order?.id) return;
    const newNote: OrderNoteEntry = {
      id: createNoteId(),
      content: message,
      authorName: currentUserName || null,
      authorId: currentUserId ?? undefined,
      createdAt: new Date().toISOString(),
      status: "pending",
    };
    setNotesSubmitting(true);
    setNoteInput("");
    try {
      await updateNotesList((prev) => [newNote, ...prev]);
    } catch (err) {
      console.error("add note failed", err);
      setNoteInput(message);
    } finally {
      setNotesSubmitting(false);
    }
  }, [currentUserId, currentUserName, noteInput, order?.id, updateNotesList]);

  const handleDeleteNote = React.useCallback(
    async (id: string) => {
      setNoteActionState({ id, type: "delete" });
      try {
        await updateNotesList((prev) => prev.filter((note) => note.id !== id));
        if (editingNoteId === id) {
          setEditingNoteId(null);
          setEditingContent("");
        }
      } catch (err) {
        console.error("delete note failed", err);
      } finally {
        setNoteActionState(null);
      }
    },
    [editingNoteId, updateNotesList]
  );

  const handleToggleResolved = React.useCallback(
    async (id: string) => {
      setNoteActionState({ id, type: "toggle" });
      try {
        await updateNotesList((prev) =>
          prev.map((note) =>
            note.id === id
              ? {
                  ...note,
                  status: note.status === "resolved" ? "pending" : "resolved",
                  updatedAt: new Date().toISOString(),
                }
              : note
          )
        );
      } catch (err) {
        console.error("toggle note failed", err);
      } finally {
        setNoteActionState(null);
      }
    },
    [updateNotesList]
  );

  const handleStartEdit = React.useCallback((note: OrderNoteEntry) => {
    setEditingNoteId(note.id);
    setEditingContent(note.content);
  }, []);

  const handleCancelEdit = React.useCallback(() => {
    setEditingNoteId(null);
    setEditingContent("");
  }, []);

  const handleSaveNoteEdit = React.useCallback(async () => {
    if (!editingNoteId) return;
    const trimmed = editingContent.trim();
    if (!trimmed) return;
    setNoteActionState({ id: editingNoteId, type: "edit" });
    try {
      await updateNotesList((prev) =>
        prev.map((note) =>
          note.id === editingNoteId
            ? { ...note, content: trimmed, updatedAt: new Date().toISOString() }
            : note
        )
      );
      setEditingNoteId(null);
      setEditingContent("");
    } catch (err) {
      console.error("edit note failed", err);
    } finally {
      setNoteActionState(null);
    }
  }, [editingContent, editingNoteId, updateNotesList]);

  React.useEffect(() => {
    setStockUndoSnapshot(null);
  }, [order?.id]);

  const priceCodeByName = React.useMemo(() => {
    const map = new Map<string, string>();
    priceCatalog.forEach((item) => {
      if (!item.code) return;
      const key = normKey(item.name);
      if (!map.has(key)) map.set(key, item.code);
    });
    return map;
  }, [priceCatalog]);

  const salesByProduct = React.useMemo(() => {
    const map = new Map<string, SalesRow[]>();
    sales.forEach((row) => {
      const key = normKey(row.product);
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(row);
    });
    return map;
  }, [sales]);

  const salesByCode = React.useMemo(() => {
    const map = new Map<string, SalesRow[]>();
    sales.forEach((row) => {
      const codeKey = normCodeKey(row.code ?? null);
      if (!codeKey) return;
      if (!map.has(codeKey)) map.set(codeKey, []);
      map.get(codeKey)!.push(row);
    });
    return map;
  }, [sales]);

  const statsByProduct = React.useMemo(() => {
    const map = new Map<string, ProductStatsEntry>();
    const keys = new Set<string>();

    items.forEach((item) => {
      if (item.product_name && item.product_name !== GROUP_PLACEHOLDER) {
        keys.add(normKey(item.product_name));
      }
    });
    salesByProduct.forEach((_rows, key) => {
      keys.add(key);
    });
    priceCatalog.forEach((item) => {
      keys.add(normKey(item.name));
    });

    keys.forEach((key) => {
      const rows = salesByProduct.get(key) ?? [];
      const anchor = latestDateForRows(rows);
      map.set(key, {
        stats: computeStatsFromRows(rows, anchor),
        anchor,
      });
    });

    return map;
  }, [items, priceCatalog, salesByProduct]);

  const statsByCode = React.useMemo(() => {
    const map = new Map<string, ProductStatsEntry>();
    const keys = new Set<string>();
    salesByCode.forEach((_rows, key) => {
      if (key) keys.add(key);
    });
    priceCatalog.forEach((item) => {
      const codeKey = normCodeKey(item.code ?? null);
      if (codeKey) keys.add(codeKey);
    });
    keys.forEach((key) => {
      const rows = key ? salesByCode.get(key) ?? [] : [];
      const anchor = latestDateForRows(rows);
      map.set(key, {
        stats: computeStatsFromRows(rows, anchor),
        anchor,
      });
    });
    return map;
  }, [priceCatalog, salesByCode]);

  const getSalesRowsForProduct = React.useCallback(
    (productName: string) => {
      const key = normKey(productName);
      const byName = salesByProduct.get(key);
      if (byName && byName.length) return byName;
      const code = priceCodeByName.get(key);
      if (code) {
        const codeKey = normCodeKey(code);
        if (codeKey) {
          const byCode = salesByCode.get(codeKey);
          if (byCode && byCode.length) return byCode;
        }
      }
      return byName ?? [];
    },
    [priceCodeByName, salesByCode, salesByProduct],
  );

  const getStatsForProduct = React.useCallback(
    (productName?: string | null): ProductStatsEntry | null => {
      if (!productName) return null;
      const key = normKey(productName);
      const rowsByName = salesByProduct.get(key);
      if (rowsByName && rowsByName.length) {
        return statsByProduct.get(key) ?? null;
      }
      const code = priceCodeByName.get(key);
      if (code) {
        const codeKey = normCodeKey(code);
        if (codeKey) {
          const byCode = salesByCode.get(codeKey);
          if (byCode && byCode.length) {
            return statsByCode.get(codeKey) ?? null;
          }
          return statsByCode.get(codeKey) ?? statsByProduct.get(key) ?? null;
        }
      }
      return statsByProduct.get(key) ?? null;
    },
    [priceCodeByName, salesByCode, salesByProduct, statsByCode, statsByProduct],
  );

  const actionableItems = React.useMemo(
    () => items.filter((item) => item.product_name !== GROUP_PLACEHOLDER),
    [items]
  );
  const finalizeConfirmDisabled = finalizingOrder || (actionableItems.length === 0 && finalizeContext !== "new-week");
  const openFinalizeDialog = React.useCallback((context: FinalizeContext) => {
    const defaults = actionableItems.reduce<Record<string, number>>((acc, item) => {
      const planned = Math.max(0, Math.round(Number(item.qty ?? 0)));
      acc[item.id] = planned;
      return acc;
    }, {});
    setFinalizeContext(context);
    setFinalizeReceived(defaults);
    setFinalizeDialogOpen(true);
  }, [actionableItems]);
  React.useEffect(() => {
    const map = manualPriceRef.current;
    const ids = new Set(actionableItems.map((item) => item.id));
    Object.keys(map).forEach((id) => {
      if (!ids.has(id)) delete map[id];
    });
  }, [actionableItems]);
  const applyMarginPeToItems = React.useCallback(async () => {
    const updater = updateUnitPriceRef.current;
    if (!updater || !actionableItems.length) return;
    const updates: Array<{ id: string; price: number }> = [];

    actionableItems.forEach((item) => {
      const statsEntry = getStatsForProduct(item.product_name);
      const retail = statsEntry?.stats.lastUnitRetail ?? statsEntry?.stats.avgUnitRetail30d;
      if (!retail || !Number.isFinite(retail) || retail <= 0) return;
      const predicted = Math.max(0, Math.round(retail * (1 - marginPct / 100)));
      const current = Math.max(0, Math.round(item.unit_price ?? 0));
      if (predicted === current) return;
      updates.push({ id: item.id, price: predicted });
    });

    for (const entry of updates) {
      await updater(entry.id, entry.price);
    }
  }, [actionableItems, getStatsForProduct, marginPct]);

  const waitForPeApply = React.useCallback(async () => {
    const pending = peApplyPromiseRef.current;
    if (pending) {
      try {
        await pending;
      } catch (err) {
        console.warn("applyMarginPeToItems pending error", err);
      }
    }
  }, []);

  const runMarginPeApply = React.useCallback(() => {
    if (peApplying && peApplyPromiseRef.current) {
      return peApplyPromiseRef.current;
    }
    const promise = (async () => {
      setPeApplying(true);
      try {
        await applyMarginPeToItems();
      } finally {
        setPeApplying(false);
      }
    })();
    peApplyPromiseRef.current = promise.finally(() => {
      if (peApplyPromiseRef.current === promise) {
        peApplyPromiseRef.current = null;
      }
    });
    return peApplyPromiseRef.current;
  }, [applyMarginPeToItems, peApplying]);

  const restoreMarginPePrices = React.useCallback(async () => {
    const updater = updateUnitPriceRef.current;
    if (!updater) return;
    const map = manualPriceRef.current;
    const entries: Array<{ id: string; price: number }> = [];
    actionableItems.forEach((item) => {
      const stored = map[item.id];
      if (typeof stored !== "number") return;
      const safe = Math.max(0, Math.round(stored));
      const current = Math.max(0, Math.round(item.unit_price ?? 0));
      if (safe === current) return;
      entries.push({ id: item.id, price: safe });
    });

    for (const entry of entries) {
      await updater(entry.id, entry.price);
    }
  }, [actionableItems]);

  const handleMarginPeCheckboxChange = React.useCallback((state: CheckedState) => {
    const next = state === true;
    if (next) {
      const snapshot: Record<string, number> = {};
      actionableItems.forEach((item) => {
        snapshot[item.id] = Math.max(0, Math.round(item.unit_price ?? 0));
      });
      manualPriceRef.current = snapshot;
      setPeMarginEnabled(true);
      void runMarginPeApply();
    } else {
      setPeMarginEnabled(false);
      void (async () => {
        await waitForPeApply();
        await restoreMarginPePrices();
        manualPriceRef.current = {};
      })();
    }
  }, [actionableItems, restoreMarginPePrices, runMarginPeApply, waitForPeApply]);
  const peSimBase = React.useMemo(() => parseNumberInput(peSimInput), [peSimInput]);
  const peSimRetail = Number.isFinite(peSimBase) ? Math.max(0, peSimBase) : 0;
  const peSimEstimate = React.useMemo(
    () => Math.max(0, Math.round(peSimRetail * (1 - marginPct / 100))),
    [peSimRetail, marginPct]
  );
  const peSimDiff = Math.max(0, Math.round(peSimRetail - peSimEstimate));
  const peSimProviderBase = React.useMemo(
    () => parseNumberInput(peSimProviderInput),
    [peSimProviderInput]
  );
  const peSimProvider = Number.isFinite(peSimProviderBase) ? Math.max(0, peSimProviderBase) : 0;
  const peSimMarginFromInputs = React.useMemo(() => {
    if (peSimRetail <= 0 || peSimProvider <= 0) return null;
    const ratio = 1 - peSimProvider / peSimRetail;
    if (!Number.isFinite(ratio)) return null;
    return Math.round(ratio * 10000) / 100; // 2 decimales
  }, [peSimRetail, peSimProvider]);

  const stockOrderedItems = React.useMemo(() => {
    if (!actionableItems.length) return [] as ItemRow[];

    const grouped = new Map<string, ItemRow[]>();
    for (const item of actionableItems) {
      const key = (item.group_name || "Sin grupo").trim();
      if (!grouped.has(key)) grouped.set(key, []);
      grouped.get(key)!.push(item);
    }

    const indexOfGroup = (name: string) => {
      const idx = groupOrder.indexOf(name);
      return idx === -1 ? Number.MAX_SAFE_INTEGER : idx;
    };

    const sortedGroupNames = Array.from(grouped.keys()).sort((a, b) => {
      const ia = indexOfGroup(a);
      const ib = indexOfGroup(b);
      if (ia !== ib) return ia - ib;
      return a.localeCompare(b, "es", { sensitivity: "base" });
    });

    const byNameAsc = (a: ItemRow, b: ItemRow) =>
      a.product_name.localeCompare(b.product_name, "es", { sensitivity: "base" });
    const byNameDesc = (a: ItemRow, b: ItemRow) => -byNameAsc(a, b);
    const avg = (name: string) => {
      const entry = getStatsForProduct(name);
      return entry?.stats.avg4w || 0;
    };

    const ordered: ItemRow[] = [];
    for (const name of sortedGroupNames) {
      let arr = [...(grouped.get(name) ?? [])];
      if (sortMode === "manual") {
        arr = applyManualOrder(arr, itemOrderMap[name]);
      } else if (sortMode === "alpha_asc") arr.sort(byNameAsc);
      else if (sortMode === "alpha_desc") arr.sort(byNameDesc);
      else if (sortMode === "avg_desc") {
        arr.sort((a, b) => (avg(b.product_name) - avg(a.product_name)) || byNameAsc(a, b));
      } else if (sortMode === "avg_asc") {
        arr.sort((a, b) => (avg(a.product_name) - avg(b.product_name)) || byNameAsc(a, b));
      }
      ordered.push(...arr);
    }

    return ordered;
  }, [actionableItems, getStatsForProduct, groupOrder, itemOrderMap, sortMode]);

  const computeSalesSinceStock = React.useCallback(
    (productName: string, fromTs: number | null) => {
      if (fromTs == null) return 0;
      const rows = getSalesRowsForProduct(productName);
      if (!rows || !rows.length) return 0;
      const now = Date.now();
      const from = Math.min(fromTs, now);
      return rows
        .filter((row) => row.date >= from && row.date <= now)
        .reduce((acc, row) => acc + (row.qty || 0), 0);
    },
    [getSalesRowsForProduct]
  );

  const applyTimestampMs = React.useMemo(() => {
    const ts = new Date(stockSalesInput);
    if (Number.isNaN(ts.getTime())) return null;
    return Math.min(ts.getTime(), Date.now());
  }, [stockSalesInput]);

  const stockPreviewRows = React.useMemo(() => {
    return stockOrderedItems.map((item) => {
      const stockPrev = round2(Number(item.stock_qty ?? 0));
      const qtyOrdered = round2(Number(item.qty ?? 0));
      const productLabel = (item.display_name?.trim() || item.product_name).trim();
      const storedRaw = stockAdjustments[item.id];
      const raw = storedRaw ?? String(qtyOrdered);
      const trimmed = raw.trim();
      const parsed = trimmed === "" ? 0 : parseNumberInput(trimmed);
      const additionIsValid = !Number.isNaN(parsed) && parsed >= 0;
      const addition = additionIsValid ? round2(parsed) : 0;
      const salesQty =
        applyTimestampMs == null
          ? 0
          : round2(computeSalesSinceStock(productLabel, applyTimestampMs));
      const stockResult = Math.max(0, round2(stockPrev + addition - salesQty));
      return {
        item,
        qtyOrdered,
        raw,
        addition,
        additionIsValid,
        stockPrev,
        salesQty,
        stockResult,
      };
    });
  }, [stockOrderedItems, stockAdjustments, applyTimestampMs, computeSalesSinceStock]);

  const filteredStockPreviewRows = React.useMemo(() => {
    const q = stockFilter.trim().toLowerCase();
    if (!q) return stockPreviewRows;
    return stockPreviewRows.filter(({ item }) => {
      const visible = (item.display_name || item.product_name || "").toLowerCase();
      const canonical = (item.product_name || "").toLowerCase();
      return visible.includes(q) || canonical.includes(q);
    });
  }, [stockPreviewRows, stockFilter]);

  const stockTotals = React.useMemo(() => {
    return stockPreviewRows.reduce(
      (acc, row) => ({
        stockPrev: round2(acc.stockPrev + row.stockPrev),
        addition: round2(acc.addition + (row.additionIsValid ? row.addition : 0)),
        salesQty: round2(acc.salesQty + row.salesQty),
        stockResult: round2(
          acc.stockResult + (row.additionIsValid ? row.stockResult : row.stockPrev)
        ),
      }),
      { stockPrev: 0, addition: 0, salesQty: 0, stockResult: 0 }
    );
  }, [stockPreviewRows]);

  const persistQtyPatch = React.useCallback(
    async (patch: Array<{ id: string; qty: number }>) => {
      if (!patch.length) return true;
      try {
        const CHUNK = 25;
        for (let i = 0; i < patch.length; i += CHUNK) {
          const slice = patch.slice(i, i + CHUNK);
          const results = await Promise.all(
            slice.map((entry) =>
              supabase.from(itemsTable).update({ qty: entry.qty }).eq("id", entry.id),
            ),
          );
          const failed = results.find((res) => res.error);
          if (failed?.error) {
            console.warn("bulk qty update error", failed.error);
            return false;
          }
        }
        return true;
      } catch (error) {
        console.warn("persistQtyPatch exception", error);
        return false;
      }
    },
    [supabase, itemsTable],
  );

  const totalsDebounceRef = React.useRef<number | null>(null);
  const pendingTotalsRef = React.useRef<PendingTotals | null>(null);

  const flushPendingTotals = React.useCallback(async () => {
    const pending = pendingTotalsRef.current;
    if (!pending) return;
    pendingTotalsRef.current = null;

    const { orderId, providerId, orderTable, weekId, total, qty, updatedAt } = pending;

    try {
      const mutations: Array<Promise<unknown>> = [
        supabase.from(orderTable).update({ total }).eq("id", orderId),
        supabase
          .from(TABLE_ORDER_SUMMARIES)
          .upsert(
            { provider_id: providerId, total, items: qty, updated_at: updatedAt },
            { onConflict: "provider_id" },
          ),
      ];
      if (weekId) {
        mutations.push(
          supabase
            .from(TABLE_ORDER_SUMMARIES_WEEK)
            .upsert(
              { week_id: weekId, provider_id: providerId, total, items: qty, updated_at: updatedAt },
              { onConflict: "week_id,provider_id" },
            ),
        );
      }
      await Promise.all(mutations);
    } catch (err) {
      console.error("flushOrderTotals error", err);
    }
  }, [supabase]);

  const recomputeOrderTotal = React.useCallback((newItems?: ItemRow[]) => {
    if (!order) return;

    const rows = newItems ?? items;
    const total = rows.reduce((a, it) => a + (it.unit_price || 0) * (it.qty || 0), 0);
    const qty = rows.reduce((a, it) => a + (it.qty || 0), 0);
    const updatedAt = new Date().toISOString();

    pendingTotalsRef.current = {
      orderId: order.id,
      providerId: order.provider_id,
      orderTable: ordersTable,
      weekId: selectedWeekId ?? null,
      total,
      qty,
      updatedAt,
    };

    if (totalsDebounceRef.current != null) window.clearTimeout(totalsDebounceRef.current);
    totalsDebounceRef.current = window.setTimeout(() => {
      totalsDebounceRef.current = null;
      void flushPendingTotals();
    }, 500);
  }, [order, items, ordersTable, selectedWeekId, flushPendingTotals]);

  React.useEffect(() => {
    return () => {
      if (totalsDebounceRef.current != null) window.clearTimeout(totalsDebounceRef.current);
      void flushPendingTotals();
    };
  }, [flushPendingTotals]);

  React.useEffect(() => {
    if (!order?.id) return;
    void flushPendingTotals();
  }, [order?.id, flushPendingTotals]);

  const computeLiveStock = React.useCallback(
    (item: ItemRow) => {
      const baselineStock = typeof item.stock_qty === "number" ? item.stock_qty : null;
      if (baselineStock == null) return 0;
      const productLabel = (item.display_name?.trim() || item.product_name).trim();
      const lastStockTs =
        item.stock_updated_at && baselineStock != null ? new Date(item.stock_updated_at).getTime() : null;
      const pendingSales =
        lastStockTs != null ? computeSalesSinceStock(productLabel, lastStockTs) : 0;
      return Math.max(0, round2(baselineStock - pendingSales));
    },
    [computeSalesSinceStock],
  );

  const computeAutoTarget = React.useCallback(
    (item: ItemRow) => {
      const statsEntry = getStatsForProduct(item.product_name);
      const stats = statsEntry?.stats ?? EMPTY_STATS;
      let baseTarget = 0;
      let periodDays = 7;
      if (providerFrequency === "QUINCENAL") {
        baseTarget = stats.sum2w || 0;
        periodDays = 14;
      } else if (providerFrequency === "MENSUAL") {
        baseTarget = stats.sum30d || 0;
        periodDays = 30;
      } else {
        baseTarget = stats.sum7d || 0;
        periodDays = 7;
      }

      const minEntry = minStockMap[item.id];
      if (minEntry?.enabled && minEntry.qty > 0) {
        return Math.max(0, minEntry.qty);
      }

      const avgPerDay = periodDays > 0 ? baseTarget / periodDays : 0;
      const marginDays = Math.max(0, autoBufferDays);
      const bufferQty = Math.ceil(avgPerDay * marginDays);
      const targetWithBuffer = baseTarget + bufferQty;

      return Math.max(0, targetWithBuffer);
    },
    [autoBufferDays, getStatsForProduct, minStockMap, providerFrequency],
  );

  React.useEffect(() => {
    if (!items.length) return;
    if (autoSyncSuspendedRef.current) {
      autoSyncSuspendedRef.current = false;
      return;
    }
    const updates: Array<{ id: string; qty: number }> = [];
    const nextItems = items.map((item) => {
      if (item.product_name === GROUP_PLACEHOLDER) return item;
      const minEntry = minStockMap[item.id];
      const minActive = Boolean(minEntry?.enabled && minEntry.qty > 0);
      const autoEnabled = minActive || (autoQtyMap[item.id] ?? true);
      if (!autoEnabled) return item;
      const target = computeAutoTarget(item);
      const liveStock = computeLiveStock(item);
      const qty = snapToPack(Math.max(0, target - liveStock), item.pack_size);
      const currentQty = Math.max(0, Math.round(Number(item.qty ?? 0)));
      if (qty === currentQty) return item;
      updates.push({ id: item.id, qty });
      return { ...item, qty };
    });
    if (!updates.length) return;
    setItems(nextItems);
    recomputeOrderTotal(nextItems);
    void persistQtyPatch(updates);
  }, [
    items,
    autoQtyMap,
    minStockMap,
    computeAutoTarget,
    computeLiveStock,
    persistQtyPatch,
    recomputeOrderTotal,
  ]);

  const previewDateLabel = React.useMemo(() => {
    if (applyTimestampMs == null) return "";
    return new Date(applyTimestampMs).toLocaleString("es-AR");
  }, [applyTimestampMs]);

  const lastStockAppliedLabel = React.useMemo(
    () => (lastStockAppliedAt ? new Date(lastStockAppliedAt).toLocaleString("es-AR") : null),
    [lastStockAppliedAt]
  );

  const hasInvalidAddition = React.useMemo(
    () => stockPreviewRows.some((row) => !row.additionIsValid),
    [stockPreviewRows]
  );

  const hasAnyChange = React.useMemo(
    () =>
      stockPreviewRows.some((row) => {
        if (!row.additionIsValid) return false;
        return row.addition !== 0 || row.salesQty !== 0;
      }),
    [stockPreviewRows]
  );

  const stockConfirmDisabled =
    stockProcessing || hasInvalidAddition || applyTimestampMs == null || !hasAnyChange;

  const applyStockChanges = React.useCallback(async () => {
    if (!actionableItems.length) {
      alert("No hay productos para actualizar.");
      return;
    }

    if (hasInvalidAddition) {
      setStockError("Revisá las cantidades: sólo se permiten números iguales o mayores a 0.");
      return;
    }

    if (applyTimestampMs == null) {
      setStockError("Ingresá una fecha y hora válidas para calcular las ventas.");
      return;
    }

    const rowsToPersist = stockPreviewRows.filter(
      (row) => row.additionIsValid && (row.addition !== 0 || row.salesQty !== 0)
    );

    if (!rowsToPersist.length) {
      setStockError("No hay cambios para aplicar.");
      return;
    }

    const snapshot: StockUndoSnapshot = {
      rows: rowsToPersist.map((row) => ({
        id: row.item.id,
        stock_qty: row.item.stock_qty ?? null,
        stock_updated_at: row.item.stock_updated_at ?? null,
        stock_signature_at: row.item.stock_signature_at ?? null,
        previous_qty: row.item.previous_qty ?? null,
        previous_qty_updated_at: row.item.previous_qty_updated_at ?? null,
      })),
      lastStockFromInput,
      lastStockAppliedAt,
      stockSalesInput,
    };

    setStockProcessing(true);
    setStockError(null);

    const fromIso = new Date(applyTimestampMs).toISOString();
    const fromLocalInput = toLocalInputFromISO(fromIso);
    const nowIso = new Date().toISOString();

    try {
      for (const row of rowsToPersist) {
        const previousQty = row.qtyOrdered;
        const payload = {
          stock_qty: row.stockResult,
          stock_updated_at: nowIso,
          stock_signature_at: fromIso,
          previous_qty: previousQty,
          previous_qty_updated_at: nowIso,
        };
        const { error } = await supabase.from(itemsTable).update(payload).eq("id", row.item.id);
        if (error) throw error;
      }

      if (rowsToPersist.length) {
        const logsPayload = rowsToPersist.map((row) => ({
          order_item_id: row.item.id,
          stock_prev: row.stockPrev,
          stock_in: row.addition,
          stock_out: row.salesQty,
          stock_applied: row.stockResult,
          sales_since: row.salesQty,
          applied_at: nowIso,
          tenant_id: row.item.tenant_id ?? tenantId ?? null,
          branch_id: row.item.branch_id ?? branchId ?? null,
        }));

        const { error: logError } = await supabase.from(TABLE_STOCK_LOGS).insert(logsPayload);
        if (logError && logError.code !== "42P01") {
          console.warn("stock log insert error", logError);
        }
      }

      setItems((prev) =>
        prev.map((item) => {
          const match = rowsToPersist.find((row) => row.item.id === item.id);
          if (!match) return item;
          return {
            ...item,
            stock_qty: match.stockResult,
            stock_updated_at: nowIso,
            stock_signature_at: fromIso,
            previous_qty: match.qtyOrdered,
            previous_qty_updated_at: nowIso,
          };
        })
      );

      setLastStockFromInput(fromLocalInput);
      setStockSalesInput(fromLocalInput);
      setLastStockAppliedAt(nowIso);

      setStockModalOpen(false);
      setStockAdjustments({});
      setStockError(null);
      setStockUndoSnapshot(snapshot);
    } catch (err: unknown) {
      console.error("apply stock error", err);
      const message = err instanceof Error ? err.message : "";
      setStockError(message || "No se pudo actualizar el stock.");
    } finally {
      setStockProcessing(false);
    }
  }, [
    actionableItems,
    hasInvalidAddition,
    applyTimestampMs,
    stockPreviewRows,
    supabase,
    itemsTable,
    tenantId,
    branchId,
    setItems,
    lastStockFromInput,
    lastStockAppliedAt,
    stockSalesInput,
    setStockUndoSnapshot,
  ]);

  const handleUndoStock = React.useCallback(async () => {
    if (stockProcessing) return;
    if (!stockUndoSnapshot || stockUndoSnapshot.rows.length === 0) return;

    setStockProcessing(true);
    setStockError(null);

    try {
      for (const row of stockUndoSnapshot.rows) {
        const payload = {
          stock_qty: row.stock_qty,
          stock_updated_at: row.stock_updated_at,
          stock_signature_at: row.stock_signature_at,
          previous_qty: row.previous_qty,
          previous_qty_updated_at: row.previous_qty_updated_at,
        };
        const { error } = await supabase.from(itemsTable).update(payload).eq("id", row.id);
        if (error) throw error;
      }

      setItems((prev) =>
        prev.map((item) => {
          const match = stockUndoSnapshot.rows.find((row) => row.id === item.id);
          if (!match) return item;
          return {
            ...item,
            stock_qty: match.stock_qty,
            stock_updated_at: match.stock_updated_at ?? null,
            stock_signature_at: match.stock_signature_at ?? null,
            previous_qty: match.previous_qty,
            previous_qty_updated_at: match.previous_qty_updated_at ?? null,
          };
        })
      );

      setLastStockFromInput(stockUndoSnapshot.lastStockFromInput);
      setStockSalesInput(stockUndoSnapshot.stockSalesInput);
      setLastStockAppliedAt(stockUndoSnapshot.lastStockAppliedAt);
      setStockUndoSnapshot(null);
    } catch (err) {
      console.error("undo stock error", err);
      alert("No se pudo deshacer el stock aplicado.");
    } finally {
      setStockProcessing(false);
    }
  }, [
    stockProcessing,
    stockUndoSnapshot,
    supabase,
    itemsTable,
    setItems,
  ]);

  const handleOpenStockModal = React.useCallback(() => {
    if (!actionableItems.length) {
      alert("No hay productos para actualizar.");
      return;
    }

    const defaults = actionableItems.reduce<Record<string, string>>((acc, item) => {
      const base = round2(Number(item.qty ?? 0));
      acc[item.id] = base ? String(base) : "0";
      return acc;
    }, {});

    setStockAdjustments(defaults);
    const suggestedFrom = lastStockFromInput ?? nowLocalIso();
    setStockSalesInput(suggestedFrom);
    setStockError(null);
    setStockModalOpen(true);
  }, [actionableItems, lastStockFromInput]);

  // UI persistente (Supabase)
  const [checkedMap, setCheckedMap] = React.useState<Record<string, boolean>>({});
  const [groupCheckedMap, setGroupCheckedMap] = React.useState<Record<string, boolean>>({});

  // NUEVO: acordeón controlado (todos cerrados al entrar; uno abierto a la vez)
  const [openGroup, setOpenGroup] = React.useState<string>("");

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
  const rootStyle = React.useMemo<CssVars>(
    () => ({
      "--bottom-nav-h": isDesktop ? "0px" : `${bottomNavHeightPx}px`,
    }),
    [isDesktop, bottomNavHeightPx],
  );

  const safeAreaBottom = "env(safe-area-inset-bottom, 0px)";
  const baseBottomOffsetPx = isDesktop ? 0 : bottomNavHeightPx;
  const footerBottomOffset = `calc(${safeAreaBottom} + ${baseBottomOffsetPx}px)`;
  const floatingActionBottomOffset = `calc(${safeAreaBottom} + ${baseBottomOffsetPx + 120}px)`;

  const footerTransform = React.useMemo(() => {
    if (isStandalone) return undefined;
    return effectiveViewportOffset ? `translate3d(0, ${effectiveViewportOffset}px, 0)` : undefined;
  }, [effectiveViewportOffset, isStandalone]);


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
        .select("name, tenant_id, branch_id, freq")
        .eq("id", provId)
        .maybeSingle();
      if (cancelled) return;
      if (error) {
        console.error("load provider meta error", error);
        return;
      }
      if (!data) return;
      if (data.name && !providerNameOverride) setProviderNameOverride(data.name);
      if (data.freq && isProviderFrequency(data.freq) && !autoFrequencyLockedRef.current) setProviderFrequency(data.freq);
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
  const [footerActionsOpen, setFooterActionsOpen] = React.useState(false);
  const [importing, setImporting] = React.useState(false);
  const [exportDialogOpen, setExportDialogOpen] = React.useState(false);
  const [exportFormat, setExportFormat] = React.useState<OrderExportFormat>("xlsx");
  const [exportingOrder, setExportingOrder] = React.useState(false);
  const [weekOptions, setWeekOptions] = React.useState<ProviderWeekRow[]>([]);
  const [weeksLoading, setWeeksLoading] = React.useState(false);
  const [creatingWeek, setCreatingWeek] = React.useState(false);
  const currentWeekLabel = React.useMemo(() => {
    if (selectedWeekId) {
      const found = weekOptions.find((w) => w.id === selectedWeekId);
      if (found) return weekLabel(found);
      return "Semana seleccionada";
    }
    if (weeksLoading) return "Cargando semanas…";
    return "Pedido actual (histórico)";
  }, [selectedWeekId, weekOptions, weeksLoading]);

  React.useEffect(() => {
    if (!editingSnapshotId) return;
    const timer = window.setTimeout(() => {
      snapshotTitleInputRef.current?.focus();
      snapshotTitleInputRef.current?.select();
    }, 20);
    return () => window.clearTimeout(timer);
  }, [editingSnapshotId]);

  const updateWeekParam = React.useCallback((nextWeekId: string | null) => {
    const params = new URLSearchParams(search.toString());
    if (nextWeekId) params.set("week", nextWeekId);
    else params.delete("week");
    const query = params.toString();
    router.replace(query ? `${pathname}?${query}` : pathname);
  }, [router, pathname, search]);

  const ensureWeekForDate = React.useCallback(async (date: Date) => {
    if (!tenantId || !branchId) throw new Error("Falta la sucursal actual");
    const weekStart = startOfWeekISO(date);
    const { data, error } = await supabase
      .from(TABLE_PROVIDER_WEEKS)
      .select("id, week_start, label")
      .eq("tenant_id", tenantId)
      .eq("branch_id", branchId)
      .eq("week_start", weekStart)
      .maybeSingle();
    if (error && error.code !== "PGRST116") throw error;
    if (data) return data as ProviderWeekRow;
    const label = formatWeekDisplay(weekStart, null);
    const { data: inserted, error: insertError } = await supabase
      .from(TABLE_PROVIDER_WEEKS)
      .insert([{ tenant_id: tenantId, branch_id: branchId, week_start: weekStart, label }])
      .select("id, week_start, label")
      .single();
    if (insertError) throw insertError;
    return inserted as ProviderWeekRow;
  }, [supabase, tenantId, branchId]);

  const fetchWeekOptions = React.useCallback(async () => {
    if (!tenantId || !branchId) {
      setWeekOptions([]);
      return;
    }
    const { data, error } = await supabase
      .from(TABLE_PROVIDER_WEEKS)
      .select("id, week_start, label")
      .eq("tenant_id", tenantId)
      .eq("branch_id", branchId)
      .order("week_start", { ascending: false })
      .limit(32);
    if (error) {
      console.warn("provider_weeks load error", error.message);
      setWeekOptions([]);
      return;
    }
    setWeekOptions((data as ProviderWeekRow[] | null) ?? []);
  }, [supabase, tenantId, branchId]);

  React.useEffect(() => {
    let alive = true;
    setWeeksLoading(true);
    (async () => {
      await fetchWeekOptions();
      if (alive) setWeeksLoading(false);
    })();
    return () => { alive = false; };
  }, [fetchWeekOptions]);

  React.useEffect(() => {
    if (!selectedWeekId) {
      if (typeof window !== "undefined") window.localStorage.removeItem(weekStorageKey);
      return;
    }
    if (typeof window === "undefined") return;
    window.localStorage.setItem(weekStorageKey, selectedWeekId);
  }, [selectedWeekId, weekStorageKey]);

  React.useEffect(() => {
    if (selectedWeekId) return;
    if (weeksLoading) return;
    if (!weekOptions.length) return;
    if (typeof window === "undefined") return;
    const stored = window.localStorage.getItem(weekStorageKey);
    if (stored && weekOptions.some((week) => week.id === stored)) {
      updateWeekParam(stored);
    }
  }, [selectedWeekId, weeksLoading, weekOptions, weekStorageKey, updateWeekParam]);

  const handleWeekChange = React.useCallback((nextWeekId: string) => {
    if (nextWeekId === LEGACY_WEEK_VALUE) {
      updateWeekParam(null);
      return;
    }
    updateWeekParam(nextWeekId);
  }, [updateWeekParam]);

  const cloneOrderToNewWeek = React.useCallback(async (options?: { itemsSnapshot?: ItemRow[] }) => {
    if (!tenantId || !branchId) {
      alert("Necesitás seleccionar una sucursal antes de crear el pedido.");
      return;
    }
    if (!provId) {
      alert("No se encontró el proveedor actual. Refrescá la página e intentá nuevamente.");
      return;
    }

    const sourceItems = options?.itemsSnapshot ?? items;
    const itemsSnapshot = sourceItems.map((item) => ({ ...item }));
    const groupOrderSnapshot = [...groupOrder];
    const checkedSnapshot = { ...checkedMap };
    const groupCheckedSnapshot = { ...groupCheckedMap };
    const statsOpenSnapshot = { ...statsOpenMap };
    const itemOrderSnapshot = cloneItemOrderMap(itemOrderMap);
    const minStockSnapshot = Object.entries(minStockMap).reduce<Record<string, MinStockState>>((acc, [key, value]) => {
      acc[key] = { ...value };
      return acc;
    }, {});
    const autoQtySnapshot = { ...autoQtyMap };
    const sortSnapshot = sortMode;
    const openGroupSnapshot = openGroup || null;

    setCreatingWeek(true);
    try {
      const week = await ensureWeekForDate(new Date());

      let targetOrder: OrderRow | null = null;
      const { data: existingWeekOrder, error: existingWeekError } = await supabase
        .from(ordersTable)
        .select("*")
        .eq("provider_id", provId)
        .eq("week_id", week.id)
        .maybeSingle();
      if (existingWeekError && existingWeekError.code !== "PGRST116") throw existingWeekError;
      if (existingWeekOrder) targetOrder = existingWeekOrder as OrderRow;

      if (!targetOrder) {
        type OrderInsertPayload = {
          provider_id: string;
          status: Status;
          notes: string;
          total: number;
          week_id?: string;
          tenant_id?: string;
          branch_id?: string;
        };
        let insertPayload: OrderInsertPayload = {
          provider_id: provId,
          status: "PENDIENTE",
          notes: `${providerName} - ${isoToday()}`,
          total: 0,
          week_id: week.id,
        };
        if (tenantId) insertPayload.tenant_id = tenantId;
        if (branchId) insertPayload.branch_id = branchId;

        let lastInsertError: PostgrestError | Error | null = null;
        for (let attempt = 0; attempt < 2; attempt += 1) {
          const { data, error } = await supabase
            .from(ordersTable)
            .insert([insertPayload])
            .select("*")
            .single();
          if (error?.code === "42703" && (insertPayload.tenant_id || insertPayload.branch_id)) {
            insertPayload = { ...insertPayload };
            delete insertPayload.tenant_id;
            delete insertPayload.branch_id;
            continue;
          }
          if (error) {
            lastInsertError = error;
          } else {
            targetOrder = data as OrderRow;
          }
          break;
        }
        if (!targetOrder) {
          throw lastInsertError ?? new Error("No se pudo crear el pedido de la semana.");
        }
      }

      if (targetOrder && itemsSnapshot.length) {
        const { data: existingItems, error: itemsCheckError } = await supabase
          .from(itemsTable)
          .select("id")
          .eq("order_id", targetOrder.id)
          .limit(1);
        if (itemsCheckError) throw itemsCheckError;
        const hasItems = Array.isArray(existingItems) && existingItems.length > 0;
        if (!hasItems) {
          const idMap = new Map<string, string>();
          const tenantForInsert = targetOrder.tenant_id ?? tenantId ?? null;
          const branchForInsert = targetOrder.branch_id ?? branchId ?? null;
          const insertRows: Array<ItemUpsertPayload & { id?: string }> = itemsSnapshot.map((item) => {
            const newId =
              typeof globalThis !== "undefined" && globalThis.crypto?.randomUUID
                ? globalThis.crypto.randomUUID()
                : `item_${Math.random().toString(36).slice(2, 12)}`;
            idMap.set(item.id, newId);
            const payload: ItemUpsertPayload & { id?: string } = {
              id: newId,
              order_id: targetOrder!.id,
              product_name: item.product_name,
              qty: item.qty ?? 0,
              unit_price: item.unit_price ?? 0,
              group_name: item.group_name ?? null,
            };
            if (item.display_name != null) payload.display_name = item.display_name;
            if (item.pack_size != null) payload.pack_size = item.pack_size;
            if (item.stock_qty != null) payload.stock_qty = item.stock_qty;
            if (item.stock_updated_at) payload.stock_updated_at = item.stock_updated_at;
            if (item.stock_signature_at) payload.stock_signature_at = item.stock_signature_at;
            if (item.previous_qty != null) payload.previous_qty = item.previous_qty;
            if (item.previous_qty_updated_at) payload.previous_qty_updated_at = item.previous_qty_updated_at;
            if (item.price_updated_at) payload.price_updated_at = item.price_updated_at;
            const tenantValue = item.tenant_id ?? tenantForInsert;
            if (tenantValue) payload.tenant_id = tenantValue;
            const branchValue = item.branch_id ?? branchForInsert;
            if (branchValue) payload.branch_id = branchValue;
            return payload;
          });

          if (insertRows.length) {
            const chunkSize = 80;
            for (let start = 0; start < insertRows.length; start += chunkSize) {
              const slice = insertRows.slice(start, start + chunkSize);
              let { error } = await supabase.from(itemsTable).insert(slice);
              if (error?.code === "42703") {
                const fallbackSlice = slice.map(({ tenant_id, branch_id, ...rest }) => rest);
                const fallback = await supabase.from(itemsTable).insert(fallbackSlice);
                error = fallback.error;
              }
              if (error) throw error;
            }
          }

          if (idMap.size) {
            const nextChecked = Object.entries(checkedSnapshot).reduce<Record<string, boolean>>((acc, [oldId, value]) => {
              const mapped = idMap.get(oldId);
              if (mapped) acc[mapped] = value;
              return acc;
            }, {});
            const nextStatsMap = Object.entries(statsOpenSnapshot).reduce<Record<string, boolean>>((acc, [oldId, value]) => {
              const mapped = idMap.get(oldId);
              if (mapped && value) acc[mapped] = true;
              return acc;
            }, {});
            const nextMinStock = Object.entries(minStockSnapshot).reduce<Record<string, MinStockState>>(
              (acc, [oldId, value]) => {
                const mapped = idMap.get(oldId);
                if (mapped) acc[mapped] = { ...value };
                return acc;
              },
              {},
            );
            const nextAutoQty = Object.entries(autoQtySnapshot).reduce<Record<string, boolean>>((acc, [oldId, value]) => {
              const mapped = idMap.get(oldId);
              if (mapped) acc[mapped] = value;
              return acc;
            }, {});
            const nextItemOrder = Object.entries(itemOrderSnapshot).reduce<Record<string, string[]>>((acc, [groupKey, ids]) => {
              const mapped = ids.map((oldId) => idMap.get(oldId)).filter((id): id is string => Boolean(id));
              if (mapped.length) acc[groupKey] = mapped;
              return acc;
            }, {});
            const sanitizedGroupOrder = groupOrderSnapshot
              .map((name) => name?.trim())
              .filter((name): name is string => Boolean(name && name.length > 0));

            const uiPayload = buildStoredUiStatePayload({
              checked: nextChecked,
              groupCheckedMap: groupCheckedSnapshot,
              sortMode: sortSnapshot,
              openGroup: openGroupSnapshot,
              statsOpenIds: mapStatsOpenIds(nextStatsMap),
              itemOrderMap: nextItemOrder,
              minStockMap: nextMinStock,
              autoQtyMap: nextAutoQty,
            });

            const uiRow: {
              order_id: string;
              updated_at: string;
              group_order?: string[];
              checked_map: StoredUiStatePayload;
            } = {
              order_id: targetOrder.id,
              updated_at: new Date().toISOString(),
              checked_map: uiPayload,
            };
            if (sanitizedGroupOrder.length) uiRow.group_order = sanitizedGroupOrder;
            const { error: uiCloneError } = await supabase
              .from(TABLE_UI_STATE)
              .upsert(uiRow, { onConflict: "order_id" });
            if (uiCloneError) console.error("week order ui clone error", uiCloneError);
          }
        }
      }

      await fetchWeekOptions();
      updateWeekParam(week.id);
    } catch (err) {
      console.error("create week error", err);
      alert("No se pudo crear el pedido de esta semana. Probá de nuevo.");
    } finally {
      setCreatingWeek(false);
    }
  }, [
    tenantId,
    branchId,
    provId,
    items,
    groupOrder,
    checkedMap,
    statsOpenMap,
    itemOrderMap,
    minStockMap,
    autoQtyMap,
    sortMode,
    openGroup,
    ensureWeekForDate,
    supabase,
    ordersTable,
    itemsTable,
    providerName,
    fetchWeekOptions,
    updateWeekParam,
  ]);

  const handleCreateWeekOrder = React.useCallback(() => {
    if (!tenantId || !branchId) {
      alert("Necesitás seleccionar una sucursal antes de crear el pedido.");
      return;
    }
    if (!provId) {
      alert("No se encontró el proveedor actual. Refrescá la página e intentá nuevamente.");
      return;
    }
    openFinalizeDialog("new-week");
  }, [tenantId, branchId, provId, openFinalizeDialog]);

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

  const loadUIState = React.useCallback(async (orderId: string) => {
    try {
      const { data, error } = await supabase
        .from(TABLE_UI_STATE)
        .select("group_order, checked_map")
        .eq("order_id", orderId)
        .maybeSingle();
      if (error) {
        console.error("loadUIState error", error);
        return;
      }
      if (Array.isArray(data?.group_order)) {
        const sanitized = (data.group_order as unknown[])
          .filter((val): val is string => typeof val === "string" && val.trim().length > 0)
          .map((val) => val.trim());
        setGroupOrder(sanitized);
      }

      const parsedUI = parseStoredUiState(data?.checked_map);
      setCheckedMap(parsedUI.checked);
      setGroupCheckedMap(parsedUI.groupCheckedMap);
      if (parsedUI.sortMode) setSortMode(parsedUI.sortMode);
      if (parsedUI.openGroup !== undefined) setOpenGroup(parsedUI.openGroup ?? "");
      setStatsOpenMap(statsOpenIdsToMap(parsedUI.statsOpenIds));
      setItemOrderMap(parsedUI.itemOrderMap);
      setMinStockMap(parsedUI.minStockMap);
      setAutoQtyMap(parsedUI.autoQtyMap);
    } catch (err) {
      console.error("loadUIState exception", err);
    }
  }, [supabase]);

  // crear/obtener pedido PENDIENTE + cargar ítems

React.useEffect(() => {
  if (!provId) return;
  let mounted = true;
  (async () => {
    let base: OrderRow | null = null;
    let ordersError: PostgrestError | Error | null = null;
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
        if (selectedWeekId) query = query.eq('week_id', selectedWeekId);
        else query = query.is('week_id', null);
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
      type OrderInsertPayload = {
        provider_id: string;
        status: Status;
        notes: string;
        total: number;
        tenant_id?: string;
        branch_id?: string;
        week_id?: string;
      };

      const creationPayloadBase: OrderInsertPayload = {
        provider_id: provId,
        status: 'PENDIENTE' as Status,
        notes: `${providerName} - ${isoToday()}`,
        total: 0,
        week_id: selectedWeekId ?? undefined,
      };

      for (const table of orderCandidates) {
        let skipTableInsert = false;
        for (const variant of orderVariants) {
          const payload: OrderInsertPayload = { ...creationPayloadBase };
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
    let itemsError: PostgrestError | Error | null = null;

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

    if (rows.length) {
      const latestFromTs = rows.reduce<number | null>((acc, row) => {
        const raw = row.stock_signature_at ?? row.previous_qty_updated_at ?? row.stock_updated_at;
        if (!raw) return acc;
        const ts = Date.parse(raw);
        if (Number.isNaN(ts)) return acc;
        return acc == null || ts > acc ? ts : acc;
      }, null);
      if (latestFromTs != null) {
        const iso = new Date(latestFromTs).toISOString();
        setLastStockFromInput(toLocalInputFromISO(iso));
      } else {
        setLastStockFromInput(null);
      }

      const latestAppliedTs = rows.reduce<number | null>((acc, row) => {
        const raw = row.stock_updated_at;
        if (!raw) return acc;
        const ts = Date.parse(raw);
        if (Number.isNaN(ts)) return acc;
        return acc == null || ts > acc ? ts : acc;
      }, null);
      if (latestAppliedTs != null) {
        setLastStockAppliedAt(new Date(latestAppliedTs).toISOString());
      } else {
        setLastStockAppliedAt(null);
      }
    } else {
      setLastStockFromInput(null);
      setLastStockAppliedAt(null);
    }
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
}, [supabase, provId, providerName, tenantId, branchId, ordersTable, itemsTable, loadUIState, selectedWeekId]);


  // Realtime (escucha cambios en items)
  React.useEffect(() => {
    if (!order) return;
    const chItems = supabase.channel(`order-items-${order.id}`).on(
      "postgres_changes",
      { event: "*", schema: "public", table: itemsTable, filter: `order_id=eq.${order.id}` },
      (payload: RealtimePostgresChangesPayload<ItemRow>) => {
        const { eventType, new: newRow, old: oldRow } = payload;
        setItems((prev) => {
          if (eventType === "DELETE" && oldRow) {
            return prev.filter((r) => r.id !== oldRow.id);
          }
          if (eventType === "INSERT" && newRow) {
            const exists = prev.some((r) => r.id === newRow.id);
            return exists ? prev.map((r) => (r.id === newRow.id ? newRow : r)) : [...prev, newRow];
          }
          if (eventType === "UPDATE" && newRow) {
            return prev.map((r) => (r.id === newRow.id ? newRow : r));
          }
          return prev;
        });
      }
    ).subscribe();
    return () => { supabase.removeChannel(chItems); };
  }, [supabase, order, itemsTable]);

  /* ===== Helpers ===== */
  const productNames = React.useMemo(() => {
    const set = new Set<string>();
    priceCatalog.forEach((item) => {
      if (item.name) set.add(item.name);
    });
    sales.forEach((r) => {
      if (r.product) set.add(r.product);
    });
    items.forEach((it) => {
      if (it.product_name && it.product_name !== GROUP_PLACEHOLDER) set.add(it.product_name);
      if (it.display_name) set.add(it.display_name);
    });
    return Array.from(set.values());
  }, [items, priceCatalog, sales]);

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

  // Totales
  const grandTotal = React.useMemo(() => items.reduce((a, it) => a + (it.unit_price || 0) * (it.qty || 0), 0), [items]);
  const grandQty   = React.useMemo(() => items.reduce((a, it) => a + (it.qty || 0), 0), [items]);
  const visibleGroupNames = React.useMemo(() => groups.map(([name]) => name || "Sin grupo"), [groups]);
  const uniqueGroupNames = React.useMemo(
    () => Array.from(new Set(items.map((it) => (it.group_name || "Sin grupo").trim()))),
    [items],
  );
  const orderedExistingGroupNames = React.useMemo(() => {
    const snapshot = buildGroupOrderSnapshot(uniqueGroupNames, groupOrder);
    const existing = new Set(uniqueGroupNames);
    return snapshot.filter((name) => existing.has(name));
  }, [uniqueGroupNames, groupOrder]);

  const formatDateTime = React.useCallback((value?: string | null) => {
    if (!value) return "—";
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return "—";
    return date.toLocaleString("es-AR", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  }, []);
  const orderStatusLabel = order?.status ?? "PENDIENTE";
  const orderUpdatedAtLabel = formatDateTime(order?.updated_at);
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



    /* ===== UI state en Supabase (multi-dispositivo) ===== */
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



  type UiStatePatch = {
    group_order?: string[];
    checked_map?: StoredUiStatePayload;
  };

  const saveUIState = React.useCallback(async (orderId: string, patch: UiStatePatch) => {
    try {
      type UiStateRow = {
        order_id: string;
        updated_at: string;
        group_order?: string[];
        checked_map?: StoredUiStatePayload;
      };
      const payload: UiStateRow = { order_id: orderId, updated_at: new Date().toISOString() };
      if (patch.group_order) payload.group_order = patch.group_order;
      if (patch.checked_map) payload.checked_map = patch.checked_map;

      const { error } = await supabase
        .from(TABLE_UI_STATE)
        .upsert(payload, { onConflict: "order_id" });
      if (error) console.error("saveUIState error", error);
    } catch (e) {
      console.error("saveUIState exception", e);
    }
  }, [supabase]);

  const persistUiState = React.useCallback(
    (overrides?: {
      checked?: Record<string, boolean>;
      sortMode?: SortMode;
      openGroup?: string | null | undefined;
      statsOpenMap?: Record<string, boolean>;
      itemOrderMap?: Record<string, string[]>;
      minStockMap?: Record<string, MinStockState>;
      autoQtyMap?: Record<string, boolean>;
      groupCheckedMap?: Record<string, boolean>;
    }) => {
      if (!order?.id) return;

      const hasCheckedOverride = overrides ? Object.prototype.hasOwnProperty.call(overrides, "checked") : false;
      const hasSortOverride = overrides ? Object.prototype.hasOwnProperty.call(overrides, "sortMode") : false;
      const hasOpenOverride = overrides ? Object.prototype.hasOwnProperty.call(overrides, "openGroup") : false;
      const hasStatsOverride = overrides ? Object.prototype.hasOwnProperty.call(overrides, "statsOpenMap") : false;
      const hasItemOrderOverride = overrides ? Object.prototype.hasOwnProperty.call(overrides, "itemOrderMap") : false;
      const hasMinOverride = overrides ? Object.prototype.hasOwnProperty.call(overrides, "minStockMap") : false;
      const hasAutoOverride = overrides ? Object.prototype.hasOwnProperty.call(overrides, "autoQtyMap") : false;
      const hasGroupCheckedOverride = overrides ? Object.prototype.hasOwnProperty.call(overrides, "groupCheckedMap") : false;
      const nextChecked = hasCheckedOverride ? overrides!.checked ?? {} : checkedMap;
      const nextSortMode = hasSortOverride ? overrides!.sortMode ?? sortMode : sortMode;
      const nextOpenGroup = hasOpenOverride ? overrides!.openGroup ?? null : openGroup || null;
      const nextStatsMap = hasStatsOverride ? overrides!.statsOpenMap ?? {} : statsOpenMap;
      const nextItemOrderMap = hasItemOrderOverride ? overrides!.itemOrderMap ?? {} : itemOrderMap;
      const nextMinStockMap = hasMinOverride ? overrides!.minStockMap ?? {} : minStockMap;
      const nextAutoQtyMap = hasAutoOverride ? overrides!.autoQtyMap ?? {} : autoQtyMap;
      const nextGroupCheckedMap = hasGroupCheckedOverride ? overrides!.groupCheckedMap ?? {} : groupCheckedMap;

      const payload = buildStoredUiStatePayload({
        checked: nextChecked,
        groupCheckedMap: nextGroupCheckedMap,
        sortMode: nextSortMode,
        openGroup: nextOpenGroup,
        statsOpenIds: mapStatsOpenIds(nextStatsMap),
        itemOrderMap: nextItemOrderMap,
        minStockMap: nextMinStockMap,
        autoQtyMap: nextAutoQtyMap,
      });

      void saveUIState(order.id, { checked_map: payload });
    },
    [order?.id, checkedMap, groupCheckedMap, sortMode, openGroup, statsOpenMap, itemOrderMap, minStockMap, autoQtyMap, saveUIState]
  );

  const hasItems = items.length > 0;

  const autoAllEnabled = React.useMemo(() => {
    if (!hasItems) return true;
    return items.every((item) => {
      const minState = minStockMap[item.id];
      const minQty = Math.max(0, minState?.qty ?? 0);
      const minActive = Boolean(minState?.enabled) && minQty > 0;
      if (minActive) return true;
      return autoQtyMap[item.id] !== false;
    });
  }, [hasItems, items, minStockMap, autoQtyMap]);

  const applyAutoQtyToAll = React.useCallback(
    (mode: "auto" | "manual") => {
      if (mode === "auto") {
        if (!Object.keys(autoQtyMap).length) return;
        items.forEach((item) => {
          if (autoQtyMap[item.id] === false) {
            const safeQty = Math.max(0, Math.round(Number(item.qty ?? 0)));
            rememberManualQty(item.id, safeQty);
          }
        });
        setAutoQtyMap({});
        persistUiState({ autoQtyMap: {} });
        return;
      }

      const next: Record<string, boolean> = {};
      const manualChanges: Array<{ id: string; qty: number }> = [];
      items.forEach((item) => {
        const minState = minStockMap[item.id];
        const minQty = Math.max(0, minState?.qty ?? 0);
        const minActive = Boolean(minState?.enabled) && minQty > 0;
        if (!minActive) {
          next[item.id] = false;
          const manualQty = getManualQtyBackup(item.id);
          const currentQty = Math.max(0, Math.round(Number(item.qty ?? 0)));
          if (manualQty != null && manualQty !== currentQty) {
            manualChanges.push({ id: item.id, qty: manualQty });
          }
        }
      });
      if (shallowEqualRecord(autoQtyMap, next)) return;
      setAutoQtyMap(next);
      persistUiState({ autoQtyMap: next });
      manualChanges.forEach(({ id, qty }) => {
        void updateQty(id, qty);
      });
    },
    [autoQtyMap, items, minStockMap, persistUiState, rememberManualQty, getManualQtyBackup],
  );

  const openAutoBufferDialog = React.useCallback(
    (mode: "apply" | "edit") => {
      setAutoBufferDialogMode(mode);
      setAutoBufferInput(String(autoBufferDays));
      setAutoBufferError(null);
      setAutoBufferDialogOpen(true);
    },
    [autoBufferDays],
  );

  const handleConfirmAutoBuffer = React.useCallback(() => {
    const normalized = autoBufferInput.replace(",", ".").trim();
    if (!normalized) {
      setAutoBufferError("Ingresá un número válido.");
      return;
    }
    const parsed = Number(normalized);
    if (!Number.isFinite(parsed)) {
      setAutoBufferError("Ingresá un número válido.");
      return;
    }
    const safe = Math.max(0, Math.round(parsed));
    setAutoBufferDays(safe);
    setAutoBufferDialogOpen(false);
    setAutoBufferError(null);
    if (autoBufferDialogMode === "apply") {
      applyAutoQtyToAll("auto");
    }
  }, [autoBufferInput, applyAutoQtyToAll, autoBufferDialogMode]);

  const handleBulkAutoToggle = React.useCallback(() => {
    if (!hasItems) return;
    if (autoAllEnabled) {
      applyAutoQtyToAll("manual");
      return;
    }
    openAutoBufferDialog("apply");
  }, [hasItems, autoAllEnabled, applyAutoQtyToAll, openAutoBufferDialog]);

  const handleEditAutoBuffer = React.useCallback(() => {
    if (!hasItems) return;
    openAutoBufferDialog("edit");
  }, [hasItems, openAutoBufferDialog]);

  // Mantener coherencia: si el grupo abierto ya no existe (renombre/eliminación), cerramos
  React.useEffect(() => {
    const names = groups.map(([g]) => g || "Sin grupo");
    if (openGroup && !names.includes(openGroup)) {
      setOpenGroup("");
      persistUiState({ openGroup: null });
    }
  }, [groups, openGroup, persistUiState]);

  React.useEffect(() => {
    const validIds = new Set(items.map((it) => it.id));

    const sanitizedChecked = Object.entries(checkedMap).reduce<Record<string, boolean>>((acc, [id, value]) => {
      if (validIds.has(id)) acc[id] = Boolean(value);
      return acc;
    }, {});

    const sanitizedStats = Object.entries(statsOpenMap).reduce<Record<string, boolean>>((acc, [id, value]) => {
      if (validIds.has(id) && value) acc[id] = true;
      return acc;
    }, {});

    const sanitizedMin = sanitizeMinStockMap(minStockMap, validIds);
    const sanitizedAuto = sanitizeAutoQtyMap(autoQtyMap, validIds);

    const checkedChanged = !shallowEqualRecord(checkedMap, sanitizedChecked);
    const statsChanged = !shallowEqualRecord(statsOpenMap, sanitizedStats);
    const minChanged = !areMinStockMapsEqual(minStockMap, sanitizedMin);
    const autoChanged = !shallowEqualRecord(autoQtyMap, sanitizedAuto);

    if (!checkedChanged && !statsChanged && !minChanged && !autoChanged) return;

    if (checkedChanged) setCheckedMap(sanitizedChecked);
    if (statsChanged) setStatsOpenMap(sanitizedStats);
    if (minChanged) setMinStockMap(sanitizedMin);
    if (autoChanged) setAutoQtyMap(sanitizedAuto);
    persistUiState({
      checked: sanitizedChecked,
      statsOpenMap: sanitizedStats,
      ...(minChanged ? { minStockMap: sanitizedMin } : {}),
      ...(autoChanged ? { autoQtyMap: sanitizedAuto } : {}),
    });
  }, [items, checkedMap, statsOpenMap, minStockMap, autoQtyMap, persistUiState]);

  React.useEffect(() => {
    const validGroups = new Set(groups.map(([name]) => normalizeGroupKey(name)));
    const sanitized = Object.entries(groupCheckedMap).reduce<Record<string, boolean>>((acc, [key, value]) => {
      if (validGroups.has(key)) acc[key] = Boolean(value);
      return acc;
    }, {});
    if (shallowEqualRecord(groupCheckedMap, sanitized)) return;
    setGroupCheckedMap(sanitized);
    persistUiState({ groupCheckedMap: sanitized });
  }, [groups, groupCheckedMap, persistUiState]);

  React.useEffect(() => {
    let nextState: Record<string, string[]> | null = null;
    setItemOrderMap((prev) => {
      const groupsMap = new Map<string, string[]>();
      items.forEach((it) => {
        if (it.product_name === GROUP_PLACEHOLDER) return;
        const key = normalizeGroupKey(it.group_name);
        if (!groupsMap.has(key)) groupsMap.set(key, []);
        groupsMap.get(key)!.push(it.id);
      });

      const next: Record<string, string[]> = {};
      let mutated = false;
      groupsMap.forEach((ids, key) => {
        const prevOrder = prev[key] ?? [];
        const filteredPrev = prevOrder.filter((id) => ids.includes(id));
        const missing = ids.filter((id) => !filteredPrev.includes(id));
        const combined = [...filteredPrev, ...missing];
        next[key] = combined;
        if (!mutated && !areStringArraysEqual(combined, prevOrder)) mutated = true;
      });

      const prevKeys = Object.keys(prev);
      if (!mutated) {
        if (prevKeys.length !== groupsMap.size) mutated = true;
        else {
          for (const key of prevKeys) {
            if (!groupsMap.has(key)) {
              mutated = true;
              break;
            }
          }
        }
      }

      if (!mutated) return prev;
      nextState = next;
      return next;
    });
    if (nextState) persistUiState({ itemOrderMap: nextState });
  }, [items, persistUiState]);

  function applyImportedUIState(opts: {
    groupOrder?: string[];
    checkedMap?: Record<string, boolean>;
    groupCheckedMap?: Record<string, boolean>;
    sortMode?: SortMode;
    openGroup?: string | null;
    statsOpenIds?: string[];
    itemOrderMap?: Record<string, string[]>;
    minStockMap?: Record<string, MinStockState>;
    autoQtyMap?: Record<string, boolean>;
  }) {
    const patch: UiStatePatch = {};
    if (opts.groupOrder !== undefined) {
      setGroupOrder(opts.groupOrder);
      patch.group_order = opts.groupOrder;
    }

    const hasUiOverrides =
      opts.checkedMap !== undefined ||
      opts.groupCheckedMap !== undefined ||
      opts.sortMode !== undefined ||
      opts.openGroup !== undefined ||
      opts.statsOpenIds !== undefined ||
      opts.itemOrderMap !== undefined ||
      opts.minStockMap !== undefined ||
      opts.autoQtyMap !== undefined;

    if (hasUiOverrides) {
      const resolvedChecked = opts.checkedMap ?? checkedMap;
      const resolvedGroupChecked = opts.groupCheckedMap ?? groupCheckedMap;
      const resolvedSortMode = opts.sortMode ?? sortMode;
      const resolvedOpenGroup = opts.openGroup !== undefined ? opts.openGroup : openGroup || null;
      const resolvedStatsMap = opts.statsOpenIds !== undefined ? statsOpenIdsToMap(opts.statsOpenIds) : statsOpenMap;
      const resolvedItemOrder = opts.itemOrderMap ?? itemOrderMap;
      const resolvedMinStock = opts.minStockMap ?? minStockMap;
      const resolvedAutoQty = opts.autoQtyMap ?? autoQtyMap;

      if (opts.checkedMap !== undefined) setCheckedMap(resolvedChecked);
      if (opts.groupCheckedMap !== undefined) setGroupCheckedMap(resolvedGroupChecked);
      if (opts.sortMode !== undefined) setSortMode(resolvedSortMode);
      if (opts.openGroup !== undefined) setOpenGroup(resolvedOpenGroup ?? "");
      if (opts.statsOpenIds !== undefined) setStatsOpenMap(resolvedStatsMap);
      if (opts.itemOrderMap !== undefined) setItemOrderMap(resolvedItemOrder);
      if (opts.minStockMap !== undefined) setMinStockMap(resolvedMinStock);
      if (opts.autoQtyMap !== undefined) setAutoQtyMap(resolvedAutoQty);

      const payload = buildStoredUiStatePayload({
        checked: resolvedChecked,
        groupCheckedMap: resolvedGroupChecked,
        sortMode: resolvedSortMode,
        openGroup: resolvedOpenGroup,
        statsOpenIds: mapStatsOpenIds(resolvedStatsMap),
        itemOrderMap: resolvedItemOrder,
        minStockMap: resolvedMinStock,
        autoQtyMap: resolvedAutoQty,
      });
      patch.checked_map = payload;
    }

    if (order?.id && (patch.group_order !== undefined || patch.checked_map !== undefined)) {
      void saveUIState(order.id, patch);
    }
  }

  const toggleStats = React.useCallback(
    (id: string) => {
      setStatsOpenMap((prev) => {
        const next = { ...prev };
        if (next[id]) delete next[id];
        else next[id] = true;
        persistUiState({ statsOpenMap: next });
        return next;
      });
    },
    [persistUiState]
  );

  // Persistir orden de grupos
  function persistGroupOrder(next: string[]) {
    setGroupOrder(next);
    if (order?.id) void saveUIState(order.id, { group_order: next });
  }

  // Mover grupo ↑/↓ y guardar
  function moveGroup(name: string, dir: "up" | "down") {
    const base = buildGroupOrderSnapshot(uniqueGroupNames, groupOrder);

    const idx = base.indexOf(name);
    if (idx === -1) {
      base.push(name);
      persistGroupOrder(base);
      return;
    }

    const swapWith = dir === "up" ? idx - 1 : idx + 1;
    if (swapWith < 0 || swapWith >= base.length) return;

    [base[idx], base[swapWith]] = [base[swapWith], base[idx]];
    persistGroupOrder(base);
  }

  function moveGroupToPosition(name: string, targetPosition: number) {
    const base = buildGroupOrderSnapshot(uniqueGroupNames, groupOrder);
    if (!base.length) return;

    let idx = base.indexOf(name);
    if (idx === -1) {
      base.push(name);
      idx = base.length - 1;
    }

    if (base.length === 0) return;

    const maxPosition = base.length;
    const desired = Math.min(Math.max(Math.round(targetPosition), 1), maxPosition);
    const zeroBasedTarget = desired - 1;
    if (zeroBasedTarget === idx) {
      persistGroupOrder(base);
      return;
    }

    const [moved] = base.splice(idx, 1);
    base.splice(zeroBasedTarget, 0, moved);
    persistGroupOrder(base);
  }

  function moveItemWithinGroup(
    groupName: string,
    itemId: string,
    dir: "up" | "down",
    visibleOrder?: string[],
  ) {
    const { key, order } = buildGroupItemOrderSnapshot(items, itemOrderMap, groupName, visibleOrder);
    if (order.length < 2) return;

    const fromIdx = order.indexOf(itemId);
    if (fromIdx === -1) return;
    const toIdx = dir === "up"
      ? Math.max(0, fromIdx - 1)
      : Math.min(order.length - 1, fromIdx + 1);
    if (fromIdx === toIdx) return;

    const nextGroupOrder = [...order];
    const [moved] = nextGroupOrder.splice(fromIdx, 1);
    nextGroupOrder.splice(toIdx, 0, moved);

    persistGroupItemOrder(key, nextGroupOrder);
  }

  function moveItemToPosition(
    groupName: string,
    itemId: string,
    targetPosition: number,
    visibleOrder?: string[],
  ) {
    const { key, order } = buildGroupItemOrderSnapshot(items, itemOrderMap, groupName, visibleOrder);
    if (order.length < 2) return;
    const fromIdx = order.indexOf(itemId);
    if (fromIdx === -1) return;
    const maxIndex = order.length - 1;
    const desiredIndex = Math.min(Math.max(Math.round(targetPosition) - 1, 0), maxIndex);
    if (desiredIndex === fromIdx) return;
    const nextGroupOrder = [...order];
    const [moved] = nextGroupOrder.splice(fromIdx, 1);
    nextGroupOrder.splice(desiredIndex, 0, moved);
    persistGroupItemOrder(key, nextGroupOrder);
  }

  function persistGroupItemOrder(groupKey: string, nextGroupOrder: string[]) {
    const sanitizedOrder = nextGroupOrder.filter((id) => typeof id === "string" && id.length > 0);
    const nextMap = { ...itemOrderMap, [groupKey]: sanitizedOrder };
    setItemOrderMap(nextMap);
    const overrides: { itemOrderMap: Record<string, string[]>; sortMode?: SortMode } = { itemOrderMap: nextMap };
    if (sortMode !== "manual") {
      setSortMode("manual");
      overrides.sortMode = "manual";
    }
    persistUiState(overrides);
  }


  // Setear check de ítem y guardar
  function setItemChecked(id: string, val: boolean) {
    setCheckedMap((prev) => {
      const next = { ...prev, [id]: val };
      persistUiState({ checked: next });
      return next;
    });
  }
  function setGroupChecked(name: string | null | undefined, val: boolean) {
    const key = normalizeGroupKey(name);
    setGroupCheckedMap((prev) => {
      const next = { ...prev, [key]: val };
      persistUiState({ groupCheckedMap: next });
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
    persistUiState({ checked: next });
    return next;
  });
}

  /* ===== CRUD (optimista) ===== */

async function createGroup(groupName: string): Promise<boolean> {
  if (!order) return false;
  const tenantForInsert = order?.tenant_id ?? tenantId ?? tenantIdFromQuery ?? null;
  const branchForInsert = order?.branch_id ?? branchId ?? branchIdFromQuery ?? null;

  const candidates = [itemsTable, ...ITEM_TABLE_CANDIDATES.filter((t) => t !== itemsTable)];
  for (const table of candidates) {
    const basePayload: ItemUpsertPayload = {
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
      const fallbackPayload: ItemUpsertPayload = { ...basePayload };
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
    return true;
  }
  alert('No se pudo crear el grupo.');
  return false;
}

  // Estado de trabajo del vaciado
const [zeroing, setZeroing] = React.useState(false);

const [suggesting, setSuggesting] = React.useState(false);

async function handlePickSuggested(mode: "week" | "2w" | "30d") {
  const normalized = suggestedMarginInput.replace(",", ".").trim();
  if (!normalized) {
    setSuggestedMarginError("Ingresá un número válido.");
    return;
  }
  const parsed = Number(normalized);
  if (!Number.isFinite(parsed)) {
    setSuggestedMarginError("Ingresá un número válido.");
    return;
  }
  const bufferDays = Math.max(0, Math.round(parsed));
  setSuggestedMarginInput(String(bufferDays));
  setSuggestedMarginError(null);
  setSuggesting(true);
  const ok = await applySuggested(mode, bufferDays);
  if (!ok) {
    alert("No se pudieron aplicar las cantidades sugeridas. Probá de nuevo.");
  }
  setSuggesting(false);
}

/** Aplica cantidades sugeridas a TODOS los ítems del pedido */
async function applySuggested(mode: "week" | "2w" | "30d", bufferDays = 0): Promise<boolean> {
  try {
    const qtyFor = (it: ItemRow) => {
      const statsEntry = getStatsForProduct(it.product_name);
      const st = statsEntry?.stats ?? EMPTY_STATS;
      let n = 0;
      let periodDays = 7;
      const minConfig = minStockMap[it.id];
      if (minConfig?.enabled && minConfig.qty > 0) {
        n = minConfig.qty;
        periodDays = 0;
      } else if (mode === "week") {
        n = st.sum7d || 0;
        periodDays = 7;
      } else if (mode === "2w") {
        n = st.sum2w || 0;
        periodDays = 14;
      } else {
        n = st.sum30d || 0;
        periodDays = 30;
      }

      const currentStock = computeLiveStock(it);
      let target = Math.max(0, n || 0);
      if (!minConfig?.enabled && periodDays > 0 && bufferDays > 0) {
        const avgPerDay = periodDays > 0 ? target / periodDays : 0;
        const bufferQty = Math.ceil(avgPerDay * Math.max(0, bufferDays));
        target += bufferQty;
      }
      const net = Math.max(0, target - currentStock);

      return Math.max(0, snapToPack(net, it.pack_size));
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
      const persisted = await persistQtyPatch(patch);
      if (!persisted) return false;
    }

    setItems(next);

    recomputeOrderTotal(next);

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
    recomputeOrderTotal(nextItems);
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
      const failed = results.find((res) => res.error);
      if (failed?.error) throw failed.error;
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
  const statsEntry = getStatsForProduct(product);
  const st = statsEntry?.stats ?? EMPTY_STATS;
  const unit = estCost(st, marginPct);

  const candidates = [itemsTable, ...ITEM_TABLE_CANDIDATES.filter((t) => t !== itemsTable)];
  for (const table of candidates) {
    const basePayload: ItemUpsertPayload = {
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
      const fallbackPayload: ItemUpsertPayload = { ...basePayload };
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
    recomputeOrderTotal();
    return;
  }
  alert('No se pudo agregar el producto.');
}



async function bulkAddItems(names: string[], groupName: string) {
  if (!order || !names.length) return;
  const tenantForInsert = order?.tenant_id ?? tenantId ?? tenantIdFromQuery ?? null;
  const branchForInsert = order?.branch_id ?? branchId ?? branchIdFromQuery ?? null;

  const rows = names.map((name) => {
    const statsEntry = getStatsForProduct(name);
    const st = statsEntry?.stats ?? EMPTY_STATS;
    const payload: ItemUpsertPayload = {
      order_id: order.id,
      product_name: name,
      qty: st?.avg4w ?? 0,
      unit_price: estCost(st, marginPct) || 0,
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
        const copy: ItemUpsertPayload = { ...row };
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
    recomputeOrderTotal();
    return;
  }
  alert('No se pudieron agregar los productos.');
}

  async function bulkRemoveByNames(names: string[], groupName: string) {
    if (!order || !names.length) return;
    const toRemove = items.filter((r) => (r.group_name || null) === (groupName || null) && names.includes(r.product_name));
    if (!toRemove.length) return;
    const ids = toRemove.map((r) => r.id);
    const previousItems = items;

    setItems(() => {
      const next = previousItems.filter((r) => !ids.includes(r.id));
      recomputeOrderTotal(next);
      return next;
    });

    try {
      const { error } = await supabase.from(itemsTable).delete().in("id", ids);
      if (error) throw error;
    } catch (error) {
      console.error(error);
      alert("No se pudieron quitar productos.");
      setItems(() => {
        recomputeOrderTotal(previousItems);
        return previousItems;
      });
    }
  }

  async function removeItem(id: string) {
    const previousItems = items;

    setItems((prev) => {
      const next = prev.filter((r) => r.id !== id);
      recomputeOrderTotal(next);
      return next;
    });

    try {
      const { error } = await supabase.from(itemsTable).delete().eq("id", id);
      if (error) throw error;
    } catch (error) {
      console.error(error);
      alert("No se pudo quitar el producto.");
      setItems(() => {
        recomputeOrderTotal(previousItems);
        return previousItems;
      });
    }
  }

async function updateStock(id: string, stock: number | null) {
  const nowIso = new Date().toISOString();
  const payload = { stock_qty: stock, stock_updated_at: nowIso, stock_signature_at: nowIso };

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

  let previous: ItemRow | null = null;
  let nextState: ItemRow[] = [];

  setItems((prev) => {
    nextState = prev.map((item) => {
      if (item.id === id) {
        previous = item;
        return { ...item, unit_price: safe, price_updated_at: nowIso };
      }
      return item;
    });
    return nextState;
  });

  if (!previous) return;

  recomputeOrderTotal(nextState);

  try {
    const { error } = await supabase
      .from(itemsTable)
      .update({ unit_price: safe, price_updated_at: nowIso })
      .eq("id", id);

    if (error) throw error;
  } catch (error) {
    console.error(error);
    alert("No se pudo actualizar el precio.");
    setItems((current) => {
      const rollback = current.map((item) => (item.id === id ? previous! : item));
      recomputeOrderTotal(rollback);
      return rollback;
    });
  }
}

React.useEffect(() => {
  updateUnitPriceRef.current = updateUnitPrice;
}, [updateUnitPrice]);

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

  const updateMinStockValueForItem = React.useCallback(
    (itemId: string, qty: number) => {
      const safeQty = Math.max(0, Math.round(Number.isFinite(qty) ? qty : 0));
      setMinStockMap((prev) => {
        const prevEntry = prev[itemId];
        const shouldStore = safeQty > 0 || prevEntry?.enabled;
        const nextEntry = shouldStore ? { qty: safeQty, enabled: Boolean(prevEntry?.enabled) } : null;
        const noChange =
          (!prevEntry && !nextEntry) ||
          (prevEntry && nextEntry && prevEntry.qty === nextEntry.qty && prevEntry.enabled === nextEntry.enabled);
        if (noChange) return prev;
        const next = { ...prev };
        if (!nextEntry) delete next[itemId];
        else next[itemId] = nextEntry;
        persistUiState({ minStockMap: next });
        return next;
      });
    },
    [persistUiState],
  );

  const toggleMinStockForItem = React.useCallback(
    (itemId: string, enabled: boolean) => {
      setMinStockMap((prev) => {
        const prevEntry = prev[itemId];
        const qty = prevEntry?.qty ?? 0;
        const shouldStore = enabled || qty > 0;
        const nextEntry = shouldStore ? { qty: Math.max(0, qty), enabled } : null;
        const noChange =
          (!prevEntry && !nextEntry) ||
          (prevEntry && nextEntry && prevEntry.qty === nextEntry.qty && prevEntry.enabled === nextEntry.enabled);
        if (noChange) return prev;
        const next = { ...prev };
        if (!nextEntry) delete next[itemId];
        else next[itemId] = nextEntry;
        persistUiState({ minStockMap: next });
        return next;
      });
    },
    [persistUiState],
  );

  const toggleAutoQtyForItem = React.useCallback(
    (itemId: string, enabled: boolean) => {
      setAutoQtyMap((prev) => {
        const hasEntry = Object.prototype.hasOwnProperty.call(prev, itemId);
        if (enabled && !hasEntry) return prev;
        if (!enabled && prev[itemId] === false) return prev;
        const next = { ...prev };
        if (enabled) delete next[itemId];
        else next[itemId] = false;
        persistUiState({ autoQtyMap: next });
        return next;
      });
    },
    [persistUiState],
  );


  async function updateQty(id: string, qty: number) {
    let previous: ItemRow | null = null;
    let nextState: ItemRow[] = [];

    setItems((prev) => {
      nextState = prev.map((item) => {
        if (item.id === id) {
          previous = item;
          return { ...item, qty };
        }
        return item;
      });
      return nextState;
    });

    if (!previous) return;

    recomputeOrderTotal(nextState);

    try {
      const { error } = await supabase.from(itemsTable).update({ qty }).eq("id", id);
      if (error) throw error;
    } catch (error) {
      console.error(error);
      alert("No se pudo actualizar la cantidad.");
      setItems((current) => {
        const rollback = current.map((item) => (item.id === id ? previous! : item));
        recomputeOrderTotal(rollback);
        return rollback;
      });
    }
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

  let renamedOrder: Record<string, string[]> | null = null;
  setItemOrderMap((prev) => {
    const fromKey = normalizeGroupKey(oldName);
    const toKey = normalizeGroupKey(newName);
    if (fromKey === toKey || !prev[fromKey]) return prev;
    const next = { ...prev };
    const snapshot = next[fromKey];
    delete next[fromKey];
    next[toKey] = snapshot;
    renamedOrder = next;
    return next;
  });
  if (renamedOrder) persistUiState({ itemOrderMap: renamedOrder });
  setGroupCheckedMap((prev) => {
    const fromKey = normalizeGroupKey(oldName);
    const toKey = normalizeGroupKey(newName);
    if (fromKey === toKey || prev[fromKey] === undefined) return prev;
    const next = { ...prev };
    next[toKey] = prev[fromKey];
    delete next[fromKey];
    persistUiState({ groupCheckedMap: next });
    return next;
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
    let prunedOrder: Record<string, string[]> | null = null;
    setItemOrderMap((prev) => {
      const key = normalizeGroupKey(name);
      if (!prev[key]) return prev;
      const next = { ...prev };
      delete next[key];
      prunedOrder = next;
      return next;
    });
    if (prunedOrder) persistUiState({ itemOrderMap: prunedOrder });
    setGroupCheckedMap((prev) => {
      const key = normalizeGroupKey(name);
      if (prev[key] === undefined) return prev;
      const next = { ...prev };
      delete next[key];
      persistUiState({ groupCheckedMap: next });
      return next;
    });
    recomputeOrderTotal();
  }

    /* ===== Copiar lista simple (qty + nombre) ===== */
  /* ===== Copiar lista simple (qty + nombre) — respeta orden visible ===== */
async function handleCopySimpleList() {
  try {
    // Helper: ordenar ítems dentro del grupo igual que en la UI
    const sortItemsForCopy = (groupName: string, arr: ItemRow[]) => {
      const byNameAsc = (a: ItemRow, b: ItemRow) =>
        (a.display_name || a.product_name)
          .localeCompare(b.display_name || b.product_name, "es", { sensitivity: "base" });
      const byNameDesc = (a: ItemRow, b: ItemRow) => -byNameAsc(a, b);

      const avg4w = (name: string) => getStatsForProduct(name)?.stats.avg4w || 0;

      let list = [...arr];
      if (sortMode === "manual") list = applyManualOrder(list, itemOrderMap[groupName]);
      else if (sortMode === "alpha_asc") list.sort(byNameAsc);
      else if (sortMode === "alpha_desc") list.sort(byNameDesc);
      else if (sortMode === "avg_desc")
        list.sort((a, b) => (avg4w(b.product_name) - avg4w(a.product_name)) || byNameAsc(a, b));
      else if (sortMode === "avg_asc")
        list.sort((a, b) => (avg4w(a.product_name) - avg4w(b.product_name)) || byNameAsc(a, b));

      return list;
    };

    // Recorremos los GRUPOS en el mismo orden que se renderizan (memo `groups`)
    const lines: string[] = [];
    for (const [rawName, arr] of groups) {
      const visibleGroupName = rawName || "Sin grupo";
      // Ítems reales del grupo, con cantidad > 0
      const visibles = arr
        .filter(it => it.product_name !== GROUP_PLACEHOLDER && (it.qty || 0) > 0);

      if (!visibles.length) continue;

      // Orden interno igual que la UI
      const ordered = sortItemsForCopy(visibleGroupName, visibles);

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
  let XLSX: XlsxModule;
  try {
    XLSX = (await import("xlsx-js-style")) as unknown as XlsxModule;
  } catch {
    XLSX = await import("xlsx");
  }

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
  const sheetWithPane = ws as WorkSheet & {
    "!freeze"?: unknown;
    "!pane"?: unknown;
  };
  sheetWithPane["!freeze"] = { xSplit: 0, ySplit: 1 };
  sheetWithPane["!pane"] = {
    state: "frozen",
    ySplit: 1,
    topLeftCell: "A2",
    activePane: "bottomLeft",
  };

  // ===== Estilos =====
  const HEADER_BG = "FF5B21B6"; // lila oscuro
  const HEADER_FG = "FFFFFFFF";
  const headerStyle: NonNullable<CellObject["s"]> = {
    font: { bold: true, color: { rgb: HEADER_FG } },
    fill: { fgColor: { rgb: HEADER_BG } },
    alignment: { vertical: "center" },
  };

  const COL_LIGHT: NonNullable<CellObject["s"]> = { fill: { fgColor: { rgb: "FFF3F4F6" } } }; // gris claro
  const COL_DARK: NonNullable<CellObject["s"]>  = { fill: { fgColor: { rgb: "FFE5E7EB" } } }; // gris más oscuro
  const colFillFor = (c: number): NonNullable<CellObject["s"]> => (c % 2 === 0 ? COL_LIGHT : COL_DARK);

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
  function setCell(r0: number, c: number, cell: StyledCell) {
    const addr = XLSX.utils.encode_cell({ r: r0, c });
    const zebra = colFillFor(c);
    ws[addr] = { ...cell, s: { ...(cell.s ?? {}), ...zebra } };
  }

  // ---- Volcado de filas ----
  const startRow = 2;
  let r = startRow;

  for (const it of realItems) {
    const row0 = r - 1;

    // Métricas (idéntico a tu versión que funcionaba)
    const statsEntry = getStatsForProduct(it.product_name);
    const anchor = statsEntry?.anchor ?? 0;
    const st = statsEntry?.stats ?? EMPTY_STATS;

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
    const statsOpenIds = mapStatsOpenIds(statsOpenMap).filter((id) => validIds.has(id));
    const currentOpenGroup = openGroup || null;
    const exportedItemOrder = Object.entries(itemOrderMap).reduce<Record<string, string[]>>((acc, [group, ids]) => {
      const filtered = ids.filter((id) => validIds.has(id));
      if (filtered.length) acc[group] = filtered;
      return acc;
    }, {});

    const serializedMinStock = serializeMinStockMap(minStockMap);
    const serializedAutoMap = serializeAutoQtyMap(autoQtyMap);
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
        stockSignatureAt: it.stock_signature_at ?? it.stock_updated_at ?? null,
        previousQty: it.previous_qty ?? null,
        previousQtyUpdatedAt: it.previous_qty_updated_at ?? null,
        priceUpdatedAt: it.price_updated_at ?? null,
        tenantId: it.tenant_id ?? fallbackTenant ?? null,
        branchId: it.branch_id ?? fallbackBranch ?? null,
      })),
      groupOrder: [...groupOrder],
      checkedMap: cleanedCheckedMap,
      uiState: {
        sortMode,
        openGroup: currentOpenGroup,
        statsOpenIds,
        itemOrder: exportedItemOrder,
        ...(serializedMinStock ? { minStockTargets: serializedMinStock } : {}),
        ...(serializedAutoMap ? { autoQtyMap: serializedAutoMap } : {}),
      },
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
    if (format === "json_xlsx") {
      await exportOrderAsJson();
      await exportOrderAsXlsx();
      return;
    }
    await exportOrderAsXlsx();
  }








  async function importOrderFromXlsx(buffer: ArrayBuffer) {
    if (!order) throw new Error("No hay un pedido activo en este momento.");
    const XLSX = await import("xlsx");
    const wb = XLSX.read(buffer, { type: "array" });
    const ws = wb.Sheets[wb.SheetNames[0]];
    const aoa = XLSX.utils.sheet_to_json<unknown[]>(ws, { header: 1 });
    const head = (aoa[0] || []).map((x) => String(x || "").toLowerCase());
    const hasHeader = head.join("|").includes("grupo") && head.join("|").includes("producto");
    const body = hasHeader ? aoa.slice(1) : aoa;

    const itemKey = (product: string, group: string | null) =>
      `${normKey(group || "sin-grupo")}::${normKey(product)}`;

    const existingByKey = new Map(
      items
        .filter((row) => row.product_name !== GROUP_PLACEHOLDER)
        .map((row) => [itemKey(row.product_name, row.group_name), row])
    );

    const tenantForInsert = order?.tenant_id ?? tenantId ?? tenantIdFromQuery ?? null;
    const branchForInsert = order?.branch_id ?? branchId ?? branchIdFromQuery ?? null;

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

    const rowsToInsert = parsed.map((r) => {
      const prev = existingByKey.get(itemKey(r.product_name, r.group_name ?? null));
      const payload: ItemUpsertPayload = {
        order_id: order.id,
        product_name: r.product_name,
        qty: r.qty,
        unit_price: r.unit_price,
        group_name: r.group_name ?? null,
      };

      if (prev) {
        payload.display_name = prev.display_name ?? null;
        payload.pack_size = prev.pack_size ?? null;
        payload.stock_qty = prev.stock_qty ?? null;
        payload.stock_updated_at = prev.stock_updated_at ?? null;
        payload.previous_qty = prev.previous_qty ?? null;
        payload.previous_qty_updated_at = prev.previous_qty_updated_at ?? null;
        payload.price_updated_at = prev.price_updated_at ?? null;
        if (prev.tenant_id !== undefined) payload.tenant_id = prev.tenant_id ?? null;
        if (prev.branch_id !== undefined) payload.branch_id = prev.branch_id ?? null;
      }

      if (payload.tenant_id === undefined && tenantForInsert) payload.tenant_id = tenantForInsert;
      if (payload.branch_id === undefined && branchForInsert) payload.branch_id = branchForInsert;

      return payload;
    });

    const { data: inserted, error: insErr } = await supabase
      .from(itemsTable)
      .insert(rowsToInsert)
      .select("*");
    if (insErr) throw insErr;

    const newItems = (inserted as ItemRow[]) ?? [];
    setItems(newItems);
    recomputeOrderTotal(newItems);
    applyImportedUIState({ checkedMap: {} });
    alert("Archivo importado correctamente ✅");
  }

  async function importOrderFromJson(text: string) {
    if (!order) throw new Error("No hay un pedido activo en este momento.");
    let parsed: unknown;
    try {
      parsed = JSON.parse(text);
    } catch {
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

        const row: ItemUpsertPayload & { id?: string } = {
          order_id: order.id,
          product_name: productName,
          display_name: toNullableString(entry.displayName ?? entry.display_name),
          qty: toNumber(entry.qty ?? entry.quantity ?? 0, 0),
          unit_price: toNumber(entry.unitPrice ?? entry.unit_price ?? 0, 0),
          group_name: normalizeGroupName(entry.groupName ?? entry.group_name),
          pack_size: toNullableNumber(entry.packSize ?? entry.pack_size),
          stock_qty: toNullableNumber(entry.stockQty ?? entry.stock_qty),
          stock_updated_at: toNullableString(entry.stockUpdatedAt ?? entry.stock_updated_at),
          stock_signature_at: toNullableString(
            entry.stockSignatureAt ?? entry.stock_signature_at ?? entry.stockUpdatedAt ?? entry.stock_updated_at,
          ),
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
      .filter((row): row is ItemUpsertPayload & { id?: string } => Boolean(row));

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
    recomputeOrderTotal(newItems);

    const validIds = new Set(newItems.map((it) => it.id));
    const groupOrderRaw = (parsed.groupOrder ?? parsed.group_order) as unknown;
    const sanitizedGroupOrder = Array.isArray(groupOrderRaw)
      ? groupOrderRaw.filter((val): val is string => typeof val === "string").map((val) => val.trim())
      : undefined;

    const checkedMapRaw = (parsed.checkedMap ?? parsed.checked_map) as unknown;
    const legacyChecked = isRecord(checkedMapRaw)
      ? Object.entries(checkedMapRaw).reduce<Record<string, boolean>>((acc, [id, val]) => {
          if (validIds.has(id)) acc[id] = Boolean(val);
          return acc;
        }, {})
      : {};

    const uiStateRaw = isRecord(parsed.uiState) ? parsed.uiState : undefined;
    const importedSortMode = uiStateRaw && isSortMode(uiStateRaw.sortMode) ? (uiStateRaw.sortMode as SortMode) : undefined;
    const importedOpenGroup = uiStateRaw && (uiStateRaw.openGroup === null || typeof uiStateRaw.openGroup === "string")
      ? (uiStateRaw.openGroup as string | null)
      : undefined;
    const importedStatsOpenIds = Array.isArray(uiStateRaw?.statsOpenIds)
      ? (uiStateRaw!.statsOpenIds as unknown[]).filter(
          (id): id is string => typeof id === "string" && validIds.has(id),
        )
      : undefined;
    const importedItemOrderRaw = uiStateRaw?.itemOrder ? sanitizeItemOrderMap(uiStateRaw.itemOrder) : undefined;
    const importedItemOrder = importedItemOrderRaw
      ? Object.entries(importedItemOrderRaw).reduce<Record<string, string[]>>((acc, [group, ids]) => {
          const filtered = ids.filter((id) => validIds.has(id));
          if (filtered.length) acc[group] = filtered;
          return acc;
        }, {})
      : undefined;
    const importedMinStock =
      uiStateRaw?.minStockTargets && isRecord(uiStateRaw.minStockTargets)
        ? sanitizeMinStockMap(uiStateRaw.minStockTargets, validIds)
        : undefined;
    const importedAutoQty =
      uiStateRaw?.autoQtyMap && isRecord(uiStateRaw.autoQtyMap)
        ? sanitizeAutoQtyMap(uiStateRaw.autoQtyMap, validIds)
        : undefined;

    const uiPatch: {
      groupOrder?: string[];
      checkedMap?: Record<string, boolean>;
      groupCheckedMap?: Record<string, boolean>;
      sortMode?: SortMode;
      openGroup?: string | null;
      statsOpenIds?: string[];
      itemOrderMap?: Record<string, string[]>;
      minStockMap?: Record<string, MinStockState>;
      autoQtyMap?: Record<string, boolean>;
    } = {
      checkedMap: legacyChecked,
    };
    if (sanitizedGroupOrder !== undefined) uiPatch.groupOrder = sanitizedGroupOrder;
    if (importedSortMode) uiPatch.sortMode = importedSortMode;
    if (importedOpenGroup !== undefined) uiPatch.openGroup = importedOpenGroup;
    if (importedStatsOpenIds !== undefined) uiPatch.statsOpenIds = importedStatsOpenIds;
    if (importedItemOrder !== undefined && Object.keys(importedItemOrder).length) {
      uiPatch.itemOrderMap = importedItemOrder;
    }
    if (importedMinStock !== undefined) uiPatch.minStockMap = importedMinStock;
    if (importedAutoQty !== undefined) uiPatch.autoQtyMap = importedAutoQty;
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
    } catch (error: unknown) {
      console.error("import error", error);
      const message = error instanceof Error ? error.message : "";
      alert(`No se pudo importar el archivo.\n${message}`);
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
      const safeName = file.name.replace(/[^\w.-]+/g, "_");
      const path = `${STORAGE_DIR_SALES}/sales_${ts}__${safeName}`;

      await ensureSalesBucketOnce();

      let uploadError: StorageError | null = null;
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
        const statusCode = readStatusCode(error);
        const mentionsBucket = readErrorMessage(error).toLowerCase().includes("bucket");
        const shouldRetry = attempt === 0 && (statusCode === 404 || mentionsBucket);
        if (!shouldRetry) break;
        ensureSalesBucketPromise = null;
        await ensureSalesBucketOnce();
      }

      let payload: SalesPersistMeta;
      if (uploadError) {
        const statusCode = readStatusCode(uploadError);
        const isNotFound = statusCode === 404;
        const mentionsBucket =
          readErrorMessage(uploadError).toLowerCase().includes("bucket");
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
        } catch (parseError) {
          console.warn("settings response parse failed", parseError);
        }
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
    } catch (error: unknown) {
      console.error("handleImportSales error", error);
      const message = readErrorMessage(error) || (error instanceof Error ? error.message : "");
      setSalesImportError(message || "No se pudo importar el archivo de ventas.");
      alert(`No se pudo importar el archivo de ventas.\n${message}`);
    } finally {
      setImportingSales(false);
      if (salesUploadRef.current) salesUploadRef.current.value = "";
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
    } catch (err: unknown) {
      console.error(err);
      const message = readErrorMessage(err) || (err instanceof Error ? err.message : "");
      alert(`No se pudo renombrar la versión.\n${message}`);
      snapshotTitleInputRef.current?.focus();
    } finally {
      setRenamingSnapshotId(null);
    }
  }

  async function saveSnapshot(): Promise<boolean> {
    if (!order) return false;
    try {
      const snapshotItems: SnapshotItem[] = items
        .filter((it) => it.product_name !== GROUP_PLACEHOLDER)
        .map((it) => ({
          product_name: it.product_name,
          display_name: it.display_name ?? null,
          qty: it.qty,
          unit_price: it.unit_price,
          group_name: it.group_name,
          pack_size: it.pack_size ?? null,
          stock_qty: it.stock_qty ?? null,
          stock_updated_at: it.stock_updated_at ?? null,
          stock_signature_at: it.stock_signature_at ?? it.stock_updated_at ?? null,
          stock_signature_label: formatStockSignatureLabel(it.stock_signature_at ?? it.stock_updated_at),
          previous_qty: it.previous_qty ?? null,
          previous_qty_updated_at: it.previous_qty_updated_at ?? null,
          price_updated_at: it.price_updated_at ?? null,
          tenant_id: it.tenant_id ?? null,
          branch_id: it.branch_id ?? null,
        }));

      const payload: SnapshotPayload = { items: snapshotItems };
      const title = `${providerName} - ${isoToday()}`;

      // Aseguramos que los totales estén al día
      const totalNow = items.reduce((a, it) => a + (it.unit_price || 0) * (it.qty || 0), 0);
      const qtyNow = items.reduce((a, it) => a + (it.qty || 0), 0);

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
      return true;
    } catch (error: unknown) {
      console.error(error);
      const message = readErrorMessage(error) || (error instanceof Error ? error.message : "");
      alert(`No se pudo guardar en historial.\n${message}`);
      return false;
    }
  }

  const handleSaveDraft = React.useCallback(async () => {
    if (savingSnapshot) return;
    setSavingSnapshot(true);
    try {
      await saveSnapshot();
    } finally {
      setSavingSnapshot(false);
    }
  }, [saveSnapshot, savingSnapshot]);

  const handleFinalizeOrder = React.useCallback(async () => {
    if (!actionableItems.length && finalizeContext !== "new-week") {
      alert("No hay productos para confirmar.");
      return;
    }
    setFinalizingOrder(true);
    let nextAction: FinalizeContext | null = null;
    let updatedItemsSnapshot: ItemRow[] | null = null;
    try {
      const ok = await saveSnapshot();
      if (!ok) return;
      const relevantItems = actionableItems.length ? actionableItems : [];
      const nowIso = new Date().toISOString();
      const updates = relevantItems.map((item) => {
        const receivedQty = Math.max(
          0,
          Math.round(Number(finalizeReceived[item.id] ?? item.qty ?? 0))
        );
        const liveStock = computeLiveStock(item);
        return {
          item,
          receivedQty,
          liveStock,
          stockResult: liveStock + receivedQty,
        };
      });

      for (const entry of updates) {
        const payload = {
          stock_qty: entry.stockResult,
          stock_updated_at: nowIso,
          previous_qty: entry.receivedQty,
          previous_qty_updated_at: nowIso,
        };
        const { error } = await supabase.from(itemsTable).update(payload).eq("id", entry.item.id);
        if (error) throw error;
      }

      if (updates.length) {
        const logsPayload = updates.map((entry) => ({
          order_item_id: entry.item.id,
          stock_prev: entry.liveStock,
          stock_in: entry.receivedQty,
          stock_out: 0,
          stock_applied: entry.stockResult,
          sales_since: 0,
          applied_at: nowIso,
          tenant_id: entry.item.tenant_id ?? tenantId ?? null,
          branch_id: entry.item.branch_id ?? branchId ?? null,
        }));
        const { error: logError } = await supabase.from(TABLE_STOCK_LOGS).insert(logsPayload);
        if (logError && logError.code !== "42P01") {
          console.warn("stock log finalize error", logError);
        }
      }

      if (updates.length) {
        setItems((prev) => {
          const next = prev.map((item) => {
            const entry = updates.find((u) => u.item.id === item.id);
            if (!entry) return item;
            return {
              ...item,
              stock_qty: entry.stockResult,
              stock_updated_at: nowIso,
              previous_qty: entry.receivedQty,
              previous_qty_updated_at: nowIso,
            };
          });
          updatedItemsSnapshot = next;
          return next;
        });
        setLastStockAppliedAt(nowIso);
      }

      nextAction = finalizeContext;
      setFinalizeDialogOpen(false);
      setFinalizeReceived({});
      setFinalizeContext(null);
    } catch (error) {
      console.error("finalize order error", error);
      const message = readErrorMessage(error) || (error instanceof Error ? error.message : "");
      alert(`No se pudo confirmar el pedido.\n${message}`);
    } finally {
      setFinalizingOrder(false);
    }
    if (nextAction === "new-week") {
      await cloneOrderToNewWeek({
        itemsSnapshot: updatedItemsSnapshot ?? undefined,
      });
    }
  }, [
    actionableItems,
    finalizeContext,
    finalizeReceived,
    saveSnapshot,
    computeLiveStock,
    supabase,
    itemsTable,
    tenantId,
    branchId,
    setItems,
    cloneOrderToNewWeek,
  ]);

  async function openSnapshot(snap: SnapshotRow) {
    if (!order) return;
    const itemsPayload = (snap.snapshot?.items ?? []) as SnapshotPayload["items"];
    const { error: delErr } = await supabase.from(itemsTable).delete().eq("order_id", order.id);
    if (delErr) {
      console.error(delErr);
      alert("No se pudo abrir la versión (borrado previo).");
      return;
    }

    type InsertableSnapshotItem = {
      order_id: string;
      product_name: string;
      display_name: string | null;
      qty: number;
      unit_price: number;
      group_name: string | null;
      pack_size: number | null;
      stock_qty: number | null;
      stock_updated_at: string | null;
      stock_signature_at: string | null;
      previous_qty: number | null;
      previous_qty_updated_at: string | null;
      price_updated_at: string | null;
      tenant_id: string | null;
      branch_id: string | null;
    };

    const normalizeNullable = (value: string | null | undefined): string | null => {
      if (typeof value !== "string") return null;
      const trimmed = value.trim();
      return trimmed.length ? trimmed : null;
    };

    const normalizedItems = itemsPayload.reduce<InsertableSnapshotItem[]>((acc, item) => {
      const productName = (item.product_name || "").trim();
      if (!productName || productName === GROUP_PLACEHOLDER) return acc;

        acc.push({
          order_id: order.id,
          product_name: productName,
          display_name: normalizeNullable(item.display_name),
          qty: item.qty,
          unit_price: item.unit_price,
          group_name: normalizeNullable(item.group_name),
          pack_size: item.pack_size ?? null,
          stock_qty: item.stock_qty ?? null,
          stock_updated_at: item.stock_updated_at ?? null,
          stock_signature_at: item.stock_signature_at ?? item.stock_updated_at ?? null,
          previous_qty: item.previous_qty ?? null,
          previous_qty_updated_at: item.previous_qty_updated_at ?? null,
          price_updated_at: item.price_updated_at ?? null,
          tenant_id: item.tenant_id ?? null,
          branch_id: item.branch_id ?? null,
      });
      return acc;
    }, []);

    if (!normalizedItems.length) {
      setItems([]);
      recomputeOrderTotal([]);
      setHistoryOpen(false);
      return;
    }

    const { data: inserted, error: insErr } = await supabase
      .from(itemsTable)
      .insert(normalizedItems)
      .select("*");

    if (insErr) {
      console.error(insErr);
      alert("No se pudo abrir la versión (insert).");
      return;
    }

    const newItems = (inserted as ItemRow[]) ?? [];
    const manualAutoMap = newItems.reduce<Record<string, boolean>>((acc, item) => {
      if (item.product_name === GROUP_PLACEHOLDER) return acc;
      acc[item.id] = false;
      return acc;
    }, {});

    autoSyncSuspendedRef.current = true;
    setAutoQtyMap(manualAutoMap);
    persistUiState({ autoQtyMap: manualAutoMap });

    setItems(newItems);
    recomputeOrderTotal(newItems);
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
    } catch (err: unknown) {
      console.error("export error", err);
      const message = readErrorMessage(err) || (err instanceof Error ? err.message : "");
      alert(`No se pudo exportar el pedido.\n${message}`);
    } finally {
      setExportingOrder(false);
    }
  }

    /* ===== Render ===== */
  if (!order) return null;

  // Ajuste global de alturas: --bottom-nav-h se comparte con el footer
  return (
    <React.Fragment>
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
              <Label htmlFor="export-format" className="text-xs font-medium uppercase text-muted-foreground">
                Formato
              </Label>
              <Select
                value={exportFormat}
                onValueChange={(value) => setExportFormat(value as OrderExportFormat)}
                disabled={exportingOrder}
              >
                <SelectTrigger id="export-format" className="mt-1">
                  <SelectValue placeholder="Seleccionar formato" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="xlsx">Excel (.xlsx)</SelectItem>
                  <SelectItem value="json">Backup (.json)</SelectItem>
                  <SelectItem value="json_xlsx">Excel + backup (.xlsx + .json)</SelectItem>
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

      <Dialog
        open={finalizeDialogOpen}
        onOpenChange={(open) => {
          if (finalizingOrder) return;
          setFinalizeDialogOpen(open);
          if (!open) {
            setFinalizeContext(null);
            setFinalizeReceived({});
          }
        }}
      >
        <DialogContent className="max-w-3xl max-h-[calc(100vh-3rem)] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Cerrar pedido</DialogTitle>
            <DialogDescription>
              {finalizeContext === "new-week"
                ? "Vamos a cerrar el pedido anterior y crear uno nuevo. Confirmá las cantidades recibidas para continuar."
                : "Confirmá las cantidades que realmente esperás recibir. Ajustá la columna “Recibido” si algún producto llega incompleto o no lo envían."}
            </DialogDescription>
          </DialogHeader>
          <div className="mt-4 rounded-3xl border border-[var(--border)] bg-muted/40">
            {actionableItems.length === 0 ? (
              <p className="px-4 py-8 text-sm text-muted-foreground">
                No hay productos en el pedido actual.
              </p>
            ) : (
              <ScrollArea className="max-h-[60vh]">
                <div className="divide-y divide-border/50">
                  {actionableItems.map((item) => {
                    const planned = Math.max(0, Math.round(Number(item.qty ?? 0)));
                    const received = finalizeReceived[item.id] ?? planned;
                    return (
                      <div key={item.id} className="flex flex-wrap items-center gap-4 px-4 py-3">
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-semibold text-[var(--foreground)]">
                            {item.display_name?.trim() || item.product_name}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            Pedido: {fmtInt(planned)} u
                          </p>
                        </div>
                        <Stepper
                          value={received}
                          min={0}
                          step={item.pack_size || 1}
                          suffixLabel="Recibido"
                          onChange={(n) => {
                            setFinalizeReceived((prev) => ({ ...prev, [item.id]: Math.max(0, n) }));
                          }}
                        />
                      </div>
                    );
                  })}
                </div>
              </ScrollArea>
            )}
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                if (finalizingOrder) return;
                setFinalizeDialogOpen(false);
                setFinalizeContext(null);
                setFinalizeReceived({});
              }}
              disabled={finalizingOrder}
            >
              Cancelar
            </Button>
            <Button
              onClick={() => void handleFinalizeOrder()}
              disabled={finalizeConfirmDisabled}
            >
              {finalizingOrder ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              {finalizeContext === "new-week" ? "Confirmar y crear pedido" : "Cerrar pedido"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <div
        className="order-detail-redesign"
        style={rootStyle}
      >
        <div className="pointer-events-none rd-floating-filter z-50" style={floatingFilterStyle}>
          <div className="pointer-events-auto flex flex-col items-end gap-3">
            <Popover open={isFilterOpen} onOpenChange={setIsFilterOpen}>
              <PopoverTrigger asChild>
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  className="h-9 rounded-full bg-[var(--primary)]/90 px-4 text-xs font-semibold uppercase tracking-[0.18em] text-[var(--primary-foreground)] shadow-[0_8px_20px_rgba(32,56,44,0.28)] transition hover:bg-[var(--primary)]"
                  aria-expanded={isFilterOpen}
                  aria-controls="provider-order-filter"
                  title="Buscar productos"
                >
                  <Search className="mr-2 h-4 w-4" />
                  Buscar
                  {filter ? (
                    <Badge
                      variant="secondary"
                      className="ml-2 rounded-full bg-[var(--primary-foreground)]/15 text-[var(--primary-foreground)]"
                    >
                      Activo
                    </Badge>
                  ) : null}
                </Button>
              </PopoverTrigger>

              <PopoverContent
                collisionPadding={16}
                sideOffset={12}
                align="end"
                className="flex items-center gap-2 rounded-full border border-[var(--border)] bg-card/95 px-3 py-2 shadow-[0_18px_38px_-18px_rgba(16,24,20,0.4)]"
              >
                <div className="relative">
                  <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    id="provider-order-filter"
                    ref={filterInputRef}
                    value={filter}
                    onChange={(e) => setFilter(e.target.value)}
                    placeholder="Buscar producto…"
                    className="h-10 w-[220px] rounded-full border border-transparent bg-[var(--input-background)] pl-10 pr-12 text-sm text-[var(--foreground)] shadow-inner focus-visible:ring-0 md:w-[280px]"
                    aria-label="Filtrar productos"
                  />
                  {filter && (
                    <button
                      type="button"
                      className="absolute right-3 top-1/2 -translate-y-1/2 rounded-full p-1.5 text-muted-foreground transition-colors hover:bg-muted/60"
                      aria-label="Limpiar filtro"
                      onClick={() => setFilter("")}
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  )}
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 rounded-full text-muted-foreground transition-colors hover:bg-muted/60"
                  aria-label="Cerrar buscador"
                  onClick={() => setIsFilterOpen(false)}
                >
                  <X className="h-4 w-4" />
                </Button>
              </PopoverContent>
            </Popover>

            <Dialog open={isCreateGroupOpen} onOpenChange={setIsCreateGroupOpen}>
              <DialogTrigger asChild>
                <Button
                  type="button"
                  size="sm"
                  className="h-12 rounded-full bg-[var(--primary)] px-5 text-base font-semibold text-[var(--primary-foreground)] shadow-[0_10px_24px_rgba(32,56,44,0.32)] transition hover:bg-[var(--primary)]/90"
                  aria-label="Crear nuevo grupo"
                  title="Crear nuevo grupo"
                >
                  <Plus className="mr-2 h-5 w-5" />
                  Nuevo grupo
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-md">
                <DialogHeader>
                  <DialogTitle>Crear nuevo grupo</DialogTitle>
                  <DialogDescription>Organizá tus productos en bloques personalizados.</DialogDescription>
                </DialogHeader>
                <GroupCreator
                  autoFocusInput
                  onCreate={async (name) => {
                    const ok = await createGroup(name.trim());
                    if (ok) setIsCreateGroupOpen(false);
                    return ok;
                  }}
                />
              </DialogContent>
            </Dialog>

            <div className="flex w-full justify-end">
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
              <Popover open={footerActionsOpen} onOpenChange={setFooterActionsOpen}>
                <PopoverTrigger asChild>
                  <Button
                    type="button"
                    aria-label="Acciones del pedido"
                    className="h-11 w-11 rounded-full bg-[var(--primary)] text-[var(--primary-foreground)] shadow-[0_18px_32px_rgba(32,56,44,0.32)] transition hover:bg-[var(--primary)]/90 sm:h-12 sm:w-12"
                  >
                    <MoreHorizontal className="h-5 w-5" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent
                  side="bottom"
                  align="end"
                  sideOffset={12}
                  className="w-[min(320px,90vw)] rounded-2xl border border-[var(--border)] bg-card p-3 shadow-2xl"
                >
                  <div className="flex flex-col gap-2">
                    <Button
                      variant="outline"
                      onClick={() => {
                        setFooterActionsOpen(false);
                        fileRef.current?.click();
                      }}
                      disabled={importing}
                      aria-label="Importar pedido"
                      className="h-11 w-full justify-start gap-3 rounded-xl border border-[var(--border)] bg-muted/50 text-[var(--foreground)] transition hover:bg-muted"
                    >
                      {importing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
                      <span>Importar</span>
                    </Button>

                    <Button
                      variant="outline"
                      onClick={() => {
                        setFooterActionsOpen(false);
                        void handleCopySimpleList();
                      }}
                      aria-label="Copiar pedido"
                      className="h-11 w-full justify-start gap-3 rounded-xl border border-[var(--border)] bg-muted/50 text-[var(--foreground)] transition hover:bg-muted"
                    >
                      <Copy className="h-4 w-4" />
                      <span>Copiar</span>
                    </Button>

                    <Button
                      variant="outline"
                      onClick={() => {
                        setFooterActionsOpen(false);
                        setExportFormat("xlsx");
                        setExportDialogOpen(true);
                      }}
                      aria-label="Exportar pedido"
                      className="h-11 w-full justify-start gap-3 rounded-xl border border-[var(--border)] bg-muted/50 text-[var(--foreground)] transition hover:bg-muted"
                    >
                      <Download className="h-4 w-4" />
                      <span>Exportar</span>
                    </Button>

                    <Button
                      onClick={() => {
                        setFooterActionsOpen(false);
                        void handleSaveDraft();
                      }}
                      disabled={savingSnapshot}
                      aria-label="Guardar pedido"
                      className="h-11 w-full justify-start gap-3 rounded-xl bg-[var(--primary)] text-[var(--primary-foreground)] shadow-[0_16px_36px_-24px_rgba(34,60,48,0.55)] transition hover:bg-[var(--primary)]/90 disabled:opacity-70"
                    >
                      {savingSnapshot ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                      <span>Guardar</span>
                    </Button>
                  </div>
                </PopoverContent>
              </Popover>
            </div>
          </div>
        </div>

        <div className="order-shell text-[var(--foreground)]">
          <section
            data-hidden={isDesktop ? barsHidden : undefined}
            className={clsx(
              isDesktop ? "sticky top-4 z-30" : "relative",
              "rd-header-card translate-y-0 transition-transform duration-300 will-change-transform",
              isDesktop && "data-[hidden=true]:-translate-y-full",
            )}
          >
            <div className="rd-header-top">
              <div className="rd-header-left">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={handleBackToProviders}
                  aria-label="Volver"
                  className="rd-back-btn"
                >
                  <ArrowLeft className="h-5 w-5" />
                </Button>
                <div className="rd-header-info">
                  <p>Pedido a</p>
                  <h1>{providerName}</h1>
                  <div className="rd-header-meta">
                    <span className="rd-meta-item">
                      <Package className="h-4 w-4 text-[#788092]" />
                      <span
                        className={clsx("rd-status-pill", {
                          pendiente: orderStatusLabel === "PENDIENTE",
                          confirmado: orderStatusLabel === "CONFIRMADO",
                          recibido: orderStatusLabel === "RECIBIDO",
                        })}
                      >
                        {orderStatusLabel}
                      </span>
                    </span>
                    <span className="rd-header-divider" />
                    <span className="rd-meta-item">
                      <CalendarDays className="h-4 w-4 text-[#788092]" />
                      {orderUpdatedAtLabel}
                    </span>
                    <span className="rd-header-divider" />
                    <span className="rd-meta-item">
                      <FileText className="h-4 w-4 text-[#788092]" />
                      {salesMeta.label}
                    </span>
                  </div>
                </div>
              </div>
            </div>
            <div className="rd-header-bottom">
              <div className="rd-header-links">
                <div className="rd-meta-item">
                  <History className="h-4 w-4 text-[#788092]" />
                  <Sheet
                    open={historyOpen}
                    onOpenChange={(v) => {
                      setHistoryOpen(v);
                      if (v) void loadSnapshots();
                      else cancelEditingSnapshot();
                    }}
                  >
                    <SheetTrigger asChild>
                      <button
                        type="button"
                        className="text-sm font-medium text-[#1f2a37]"
                        aria-label="Abrir historial"
                      >
                        Historial
                      </button>
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
                                      <div className="truncate font-medium" title={s.title}>
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
                                          <AlertDialogAction asChild>
                                            <Button
                                              variant="destructive"
                                              onClick={() => void deleteSnapshot(s.id)}
                                            >
                                              Eliminar
                                            </Button>
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
                </div>
                <span className="rd-header-divider" />
                <div className="rd-meta-item">
                  <Upload className="h-4 w-4 text-[#788092]" />
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
                  <button
                    type="button"
                    className="text-sm font-medium text-[#1f2a37]"
                    onClick={() => salesUploadRef.current?.click()}
                    disabled={importingSales}
                  >
                    {importingSales ? "Importando…" : "Importar ventas"}
                  </button>
                </div>
              </div>
              <div className="mt-4 flex w-full flex-wrap items-center gap-2 sm:gap-3">
                <Select
                  value={selectedWeekId ?? LEGACY_WEEK_VALUE}
                  onValueChange={handleWeekChange}
                  disabled={weeksLoading}
                >
                  <SelectTrigger className="h-11 w-auto max-w-full rounded-2xl border border-[var(--border)] bg-white/80 px-3 text-left text-sm font-medium text-[color:var(--foreground)]">
                    <SelectValue placeholder={weeksLoading ? "Cargando..." : "Seleccioná semana"}>
                      {currentWeekLabel}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent className="max-h-[260px]">
                    <SelectItem value={LEGACY_WEEK_VALUE}>
                      Pedido actual (histórico)
                    </SelectItem>
                    {weekOptions.map((week) => (
                      <SelectItem key={week.id} value={week.id}>
                        {weekLabel(week)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => void handleCreateWeekOrder()}
                  disabled={creatingWeek}
                  className="h-11 min-w-[130px] whitespace-nowrap rounded-2xl border border-[var(--border)] bg-white/80 px-4 text-sm font-semibold text-[color:var(--foreground)] shadow-none hover:bg-white"
                >
                  {creatingWeek ? <Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> : <Plus className="mr-1.5 h-4 w-4" />}
                  Nuevo pedido
                </Button>
              </div>
              <div className="rd-header-total ml-auto w-full text-right sm:w-auto">
                <span>Total del pedido:</span>
                <strong>{fmtMoney(grandTotal)}</strong>
              </div>
            </div>
          </section>


          {salesImportError && (
            <div className="rd-alert mt-4">
              <p className="flex-1 whitespace-pre-wrap break-words">{salesImportError}</p>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleCopySalesError}
                className="rounded-full border border-[var(--destructive)] bg-transparent px-4 text-[var(--destructive)] transition-colors hover:bg-[var(--destructive)]/5"
              >
                Copiar
              </Button>
            </div>
          )}

          <div className="rd-summary-grid mt-6">
            <div className="rd-card rd-notes-card">
              <div className="rd-card-content space-y-4">
                <button
                  type="button"
                  onClick={() => setNotesExpanded((prev) => !prev)}
                  className="flex w-full items-start gap-3 rounded-2xl bg-transparent p-0 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                  aria-label={notesExpanded ? "Ocultar notas" : "Mostrar notas"}
                  aria-expanded={notesExpanded}
                >
                  <span className="rounded-full bg-muted/70 p-2 text-muted-foreground">
                    <BookOpen className="h-4 w-4" />
                  </span>
                  <div className="flex-1">
                    <div className="flex w-full flex-wrap items-center gap-2">
                      <span className="rd-card-title flex-1 text-left">Notas del pedido ({orderNotes.length})</span>
                      <span className="ml-auto flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-transparent text-muted-foreground hover:bg-muted/60">
                        <ChevronDown
                          className={clsx("h-4 w-4 transition-transform", notesExpanded ? "rotate-180" : "rotate-0")}
                        />
                      </span>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      Añadí recordatorios rápidos compartidos con todo el equipo.
                    </p>
                  </div>
                </button>

                {notesExpanded ? (
                  <div className="space-y-4">
                    <div className="flex flex-col gap-2 sm:flex-row">
                      <Input
                        value={noteInput}
                        onChange={(event) => setNoteInput(event.target.value)}
                        onKeyDown={(event) => {
                          if (event.key === "Enter") {
                            event.preventDefault();
                            void handleAddNote();
                          }
                        }}
                        placeholder="Añade nota..."
                        className="flex-1 rounded-2xl border border-[var(--border)] bg-muted/20 px-4 py-5"
                      />
                      <Button
                        type="button"
                        onClick={() => void handleAddNote()}
                        disabled={notesSubmitting || !noteInput.trim() || !order?.id}
                        className="h-12 rounded-2xl bg-emerald-500 text-sm font-semibold text-emerald-50 hover:bg-emerald-600 disabled:opacity-60"
                      >
                        {notesSubmitting ? (
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        ) : (
                          <Plus className="mr-2 h-4 w-4" />
                        )}
                        Añadir
                      </Button>
                    </div>

                    <div className="space-y-3">
                      {orderNotes.length === 0 ? (
                        <div className="rounded-2xl border border-dashed border-[var(--border)] bg-muted/30 px-6 py-8 text-center text-sm text-muted-foreground">
                          No hay notas registradas aún.
                        </div>
                      ) : (
                        orderNotes.map((note) => (
                          <div
                            key={note.id}
                            className={clsx(
                              "rounded-2xl border p-4 shadow-sm transition",
                              note.status === "resolved"
                                ? "border-dashed border-[var(--border)] bg-muted/30"
                                : "border-[var(--border)] bg-background"
                            )}
                          >
                            <div className="flex items-start gap-3">
                              <div className="flex-1">
                                {editingNoteId === note.id ? (
                                  <>
                                    <Textarea
                                      value={editingContent}
                                      onChange={(event) => setEditingContent(event.target.value)}
                                      className="min-h-[88px] rounded-xl border border-[var(--border)] bg-background"
                                    />
                                    <div className="mt-3 flex flex-wrap gap-2">
                                      <Button
                                        size="sm"
                                        onClick={() => void handleSaveNoteEdit()}
                                        disabled={noteActionState?.id === note.id && noteActionState?.type === "edit"}
                                      >
                                        {noteActionState?.id === note.id && noteActionState?.type === "edit" ? (
                                          <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />
                                        ) : (
                                          <Check className="mr-2 h-3.5 w-3.5" />
                                        )}
                                        Guardar
                                      </Button>
                                      <Button
                                        size="sm"
                                        variant="outline"
                                        onClick={handleCancelEdit}
                                        className="border-[var(--border)] text-muted-foreground"
                                      >
                                        Cancelar
                                      </Button>
                                    </div>
                                  </>
                                ) : (
                                  <>
                                    <p
                                      className={clsx(
                                        "text-sm text-[var(--foreground)]",
                                        note.status === "resolved" && "text-muted-foreground line-through"
                                      )}
                                    >
                                      {note.content}
                                    </p>
                                    <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                                      {note.authorName ? (
                                        <span className="font-medium text-foreground/80">{note.authorName}</span>
                                      ) : null}
                                      {note.authorName ? <span>•</span> : null}
                                      <span>{relativeTimeFromNow(note.createdAt)}</span>
                                      {note.updatedAt ? (
                                        <>
                                          <span>•</span>
                                          <span>Editada {relativeTimeFromNow(note.updatedAt)}</span>
                                        </>
                                      ) : null}
                                      {note.status === "resolved" ? (
                                        <>
                                          <span>•</span>
                                          <Badge className="bg-emerald-500 text-[11px] font-semibold text-emerald-50">
                                            Resuelta
                                          </Badge>
                                        </>
                                      ) : null}
                                    </div>
                                  </>
                                )}
                              </div>
                              {editingNoteId !== note.id ? (
                                <div className="flex items-center gap-1">
                                  <Button
                                    type="button"
                                    variant="ghost"
                                    size="icon"
                                    onClick={() => void handleToggleResolved(note.id)}
                                    disabled={noteActionState?.id === note.id && noteActionState?.type === "toggle"}
                                    className={clsx(
                                      "h-8 w-8 rounded-full",
                                      note.status === "resolved"
                                        ? "text-muted-foreground hover:bg-muted hover:text-[var(--destructive)]"
                                        : "text-emerald-600 hover:bg-emerald-50"
                                    )}
                                    title={note.status === "resolved" ? "Marcar como pendiente" : "Marcar como resuelta"}
                                  >
                                    {noteActionState?.id === note.id && noteActionState?.type === "toggle" ? (
                                      <Loader2 className="h-4 w-4 animate-spin" />
                                    ) : note.status === "resolved" ? (
                                      <X className="h-4 w-4" />
                                    ) : (
                                      <Check className="h-4 w-4" />
                                    )}
                                  </Button>
                                  <Button
                                    type="button"
                                    variant="ghost"
                                    size="icon"
                                    onClick={() => handleStartEdit(note)}
                                    className="h-8 w-8 rounded-full text-muted-foreground hover:bg-muted/60 hover:text-foreground"
                                    title="Editar nota"
                                  >
                                    <Pencil className="h-4 w-4" />
                                  </Button>
                                  <Button
                                    type="button"
                                    variant="ghost"
                                    size="icon"
                                    onClick={() => void handleDeleteNote(note.id)}
                                    disabled={noteActionState?.id === note.id && noteActionState?.type === "delete"}
                                    className="h-8 w-8 rounded-full text-[var(--destructive)] hover:bg-[var(--destructive)]/10"
                                    title="Eliminar nota"
                                  >
                                    {noteActionState?.id === note.id && noteActionState?.type === "delete" ? (
                                      <Loader2 className="h-4 w-4 animate-spin" />
                                    ) : (
                                      <Trash2 className="h-4 w-4" />
                                    )}
                                  </Button>
                                </div>
                              ) : null}
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                ) : null}
              </div>
            </div>

          </div>

          <div className="rd-card mt-6">
            <div className="rd-card-content space-y-4">
              <div className="rd-card-header">
                <div>
                  <button
                    type="button"
                    onClick={() => setStockActionsExpanded((prev) => !prev)}
                    className="flex w-full items-center justify-between gap-2 rounded-2xl bg-transparent p-0 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                    aria-label={stockActionsExpanded ? "Ocultar acciones de stock" : "Mostrar acciones de stock"}
                    aria-expanded={stockActionsExpanded}
                  >
                    <span className="rd-card-title flex-1 text-left">Acciones de stock</span>
                    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-transparent text-muted-foreground hover:bg-muted/60">
                      <ChevronDown
                        className={clsx("h-4 w-4 transition-transform", stockActionsExpanded ? "rotate-180" : "rotate-0")}
                      />
                    </span>
                  </button>
                  <p className="text-sm text-muted-foreground">Sincronizá el inventario con las ventas reales.</p>
                </div>
              </div>
              {stockActionsExpanded ? (
                <>
              <div className="rd-actions-grid">
                <AlertDialog
                  onOpenChange={(open) => {
                    if (!open) setSuggestedMarginError(null);
                  }}
                >
                  <AlertDialogTrigger asChild>
                    <Button
                      variant="outline"
                      size="lg"
                      className="h-11 flex-1 rounded-full border border-[var(--border)] bg-muted/60 px-6 text-sm font-medium text-[var(--foreground)] hover:bg-muted disabled:opacity-60"
                      title={
                        autoAllEnabled
                          ? "Desactivá Pedido auto para usar las sugerencias manuales"
                          : "Aplicar cantidades sugeridas"
                      }
                      disabled={suggesting || autoAllEnabled}
                    >
                      Sugerido
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent className="sm:max-w-lg max-h-[85vh] overflow-y-auto z-[90]">
                    <AlertDialogHeader>
                      <AlertDialogTitle>¿Qué tipo de pedido vas a hacer?</AlertDialogTitle>
                      <AlertDialogDescription>
                        Elegí el período para calcular las cantidades:
                        <br />• <b>Semanal</b>: ventas de los últimos 7 días
                        <br />• <b>Quincenal</b>: ventas de las últimas 2 semanas
                        <br />• <b>Mensual</b>: ventas de los últimos 30 días
                        <br />Si un producto tiene “paquete”, se ajusta al múltiplo del pack.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <div className="space-y-3 rounded-2xl border border-[var(--border)] bg-muted/40 p-4">
                      <Label
                        htmlFor="suggested-margin-days"
                        className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground"
                      >
                        Margen adicional (días)
                      </Label>
                      <p className="text-xs text-muted-foreground">
                        Se suma un extra proporcional antes de aplicar las cantidades sugeridas.
                      </p>
                      <div className="flex items-center justify-center gap-3">
                        <Button
                          type="button"
                          variant="outline"
                          size="icon"
                          className="h-10 w-10 rounded-full border-[var(--border)]"
                          onClick={() => handleStepSuggestedMargin(-1)}
                          aria-label="Restar día"
                        >
                          <Minus className="h-4 w-4" />
                        </Button>
                        <Input
                          id="suggested-margin-days"
                          type="number"
                          min={0}
                          inputMode="numeric"
                          value={suggestedMarginInput}
                          onChange={(event) => {
                            setSuggestedMarginInput(event.target.value);
                            setSuggestedMarginError(null);
                          }}
                          className="h-10 w-28 rounded-full border border-[var(--border)] bg-[var(--input-background)] px-4 text-center text-base font-semibold"
                          placeholder="Ej. 2"
                        />
                        <Button
                          type="button"
                          variant="outline"
                          size="icon"
                          className="h-10 w-10 rounded-full border-[var(--border)]"
                          onClick={() => handleStepSuggestedMargin(1)}
                          aria-label="Sumar día"
                        >
                          <Plus className="h-4 w-4" />
                        </Button>
                      </div>
                      {suggestedMarginError ? (
                        <p className="text-sm text-destructive">{suggestedMarginError}</p>
                      ) : null}
                    </div>
                    <div className="flex justify-end gap-2 pt-2">
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
                <Button
                  variant="outline"
                  size="lg"
                  className="h-11 flex-1 rounded-full border border-[var(--border)] bg-muted/60 px-6 text-sm font-medium text-[var(--foreground)] transition hover:bg-muted disabled:opacity-60"
                  onClick={() => void handleUndoStock()}
                  disabled={stockProcessing || !stockUndoSnapshot || stockUndoSnapshot.rows.length === 0}
                >
                  Deshacer
                </Button>
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button
                      variant="outline"
                      size="lg"
                      className="h-11 flex-1 rounded-full border border-[var(--border)] bg-muted/60 px-6 text-sm font-medium text-[var(--foreground)] transition hover:bg-muted disabled:opacity-60"
                      disabled={zeroing}
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
                <div className="flex min-w-[240px] flex-1 flex-col gap-2">
                  <Button
                    type="button"
                    variant="secondary"
                    size="lg"
                    onClick={handleBulkAutoToggle}
                    disabled={!hasItems}
                    aria-pressed={autoAllEnabled}
                    title={
                      autoAllEnabled
                        ? "Pasar todos los productos a modo manual"
                        : "Aplicar sugerido automático a todos los productos"
                    }
                    className={clsx(
                      "h-11 w-full rounded-full border px-6 text-left text-sm font-semibold shadow-none transition",
                      autoAllEnabled
                        ? "border-transparent bg-[var(--primary)] text-[var(--primary-foreground)] hover:bg-[var(--primary)]/90"
                        : "border border-[var(--border)] bg-white/80 text-[color:var(--foreground)] hover:bg-white"
                    )}
                  >
                    <div className="flex items-center gap-3">
                      {autoAllEnabled ? (
                        <CheckCircle2 className="h-5 w-5" />
                      ) : (
                        <Circle className="h-5 w-5 text-muted-foreground" />
                      )}
                      <div className="flex flex-col leading-tight">
                        <span className="text-xs font-semibold uppercase tracking-[0.2em]">
                          Pedido auto
                        </span>
                        <span>
                          {autoAllEnabled ? "Quitar a todos" : "Aplicar a todos"}
                        </span>
                      </div>
                    </div>
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={handleEditAutoBuffer}
                    disabled={!hasItems}
                    className="h-8 w-full justify-center rounded-full border border-dashed border-[var(--border)] px-3 text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground hover:text-[var(--foreground)]"
                  >
                    {autoBufferIndicatorText}
                  </Button>
                </div>
                <Dialog
                  open={autoBufferDialogOpen}
                  onOpenChange={(open) => {
                    setAutoBufferDialogOpen(open);
                    if (!open) setAutoBufferError(null);
                  }}
                >
                  <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                      <DialogTitle>Margen de seguridad</DialogTitle>
                      <DialogDescription>
                        Elegí cuántos días extra querés sumar para evitar que se vacíe la góndola.
                      </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-2">
                      <Label htmlFor="auto-buffer-days" className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                        Días adicionales
                      </Label>
                      <div className="flex items-center justify-center gap-3">
                        <Button
                          type="button"
                          variant="outline"
                          size="icon"
                          className="h-11 w-11 rounded-full border-[var(--border)]"
                          onClick={() => handleStepAutoBufferInput(-1)}
                          aria-label="Restar día"
                        >
                          <Minus className="h-4 w-4" />
                        </Button>
                        <Input
                          id="auto-buffer-days"
                          type="number"
                          min={0}
                          inputMode="numeric"
                          value={autoBufferInput}
                          onChange={(event) => {
                            setAutoBufferInput(event.target.value);
                            setAutoBufferError(null);
                          }}
                          className="h-11 w-28 rounded-full border border-[var(--border)] bg-[var(--input-background)] px-4 text-center text-base font-semibold"
                          placeholder="Ej. 3"
                        />
                        <Button
                          type="button"
                          variant="outline"
                          size="icon"
                          className="h-11 w-11 rounded-full border-[var(--border)]"
                          onClick={() => handleStepAutoBufferInput(1)}
                          aria-label="Sumar día"
                        >
                          <Plus className="h-4 w-4" />
                        </Button>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        Podés ingresar 0 si no querés sumar stock adicional.
                      </p>
                      {autoBufferError ? <p className="text-sm text-destructive">{autoBufferError}</p> : null}
                    </div>
                    <DialogFooter className="gap-2">
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => {
                          setAutoBufferDialogOpen(false);
                          setAutoBufferError(null);
                        }}
                      >
                        Cancelar
                      </Button>
                      <Button type="button" onClick={handleConfirmAutoBuffer}>
                        {autoBufferDialogMode === "apply" ? "Activar automático" : "Guardar margen"}
                      </Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
              </div>
              {actionableItems.length === 0 && (
                <p className="text-xs text-muted-foreground">
                  Agregá productos al pedido para habilitar estas acciones.
                </p>
              )}
                </>
              ) : null}
            </div>
          </div>

          <div className="rd-card mt-6">
            <div className="rd-card-content space-y-4">
              <div className="rd-card-header">
                <div>
                  <button
                    type="button"
                    onClick={() => setProductOrgExpanded((prev) => !prev)}
                    className="flex w-full items-center justify-between gap-2 rounded-2xl bg-transparent p-0 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                    aria-label={productOrgExpanded ? "Ocultar organización de productos" : "Mostrar organización de productos"}
                    aria-expanded={productOrgExpanded}
                  >
                    <span className="rd-card-title flex-1 text-left">Organización de productos</span>
                    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-transparent text-muted-foreground hover:bg-muted/60">
                      <ChevronDown
                        className={clsx("h-4 w-4 transition-transform", productOrgExpanded ? "rotate-180" : "rotate-0")}
                      />
                    </span>
                  </button>
                  <p className="text-sm text-muted-foreground">Definí el orden y margen estimado de cada ítem.</p>
                </div>
              </div>
              {productOrgExpanded ? (
                <div className="rd-sort-card">
                  <div className="flex flex-1 flex-col gap-3">
                  <Label htmlFor="sort-mode" className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                    Ordenar items
                  </Label>
                  <div className="flex flex-col gap-3 md:flex-row md:items-center md:gap-4">
                    <div className="flex-1">
                      <div className="flex flex-col gap-3 md:flex-row md:items-center md:gap-3">
                        <div className="flex-1">
                          <Select
                            value={sortMode}
                            onValueChange={(v) => {
                              const next = v as SortMode;
                              setSortMode(next);
                              persistUiState({ sortMode: next });
                            }}
                          >
                            <SelectTrigger id="sort-mode" className="h-11 rounded-full border border-[var(--border)] bg-[var(--input-background)] px-5 text-sm">
                              <SelectValue placeholder="Ordenar por..." />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="manual">Orden manual</SelectItem>
                              <SelectItem value="alpha_asc">Alfabético A→Z</SelectItem>
                              <SelectItem value="alpha_desc">Alfabético Z→A</SelectItem>
                              <SelectItem value="avg_desc">Prom/sem ↓</SelectItem>
                              <SelectItem value="avg_asc">Prom/sem ↑</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                    </div>
                    <div className="flex flex-col gap-1 md:flex-row md:items-center md:gap-3">
                      <Label className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                        Precio x U
                      </Label>
                      <Dialog open={peSettingsOpen} onOpenChange={setPeSettingsOpen}>
                        <DialogTrigger asChild>
                          <Button
                            type="button"
                            variant="outline"
                            className="inline-flex h-auto rounded-full border border-[var(--border)] bg-[var(--background)] px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.12em]"
                          >
                            Precio x U
                          </Button>
                        </DialogTrigger>
                        <DialogContent className="sm:max-w-xl max-h-[80vh] overflow-y-auto z-[80]">
                          <DialogHeader>
                            <DialogTitle>Precio por unidad (P.E.)</DialogTitle>
                            <DialogDescription>
                              Ajustá el margen estimado para inferir el costo del proveedor y aplicalo sobre todos los productos.
                            </DialogDescription>
                          </DialogHeader>
                          <div className="space-y-6">
                            <div className="space-y-3 rounded-2xl border border-[var(--border)] bg-muted/30 p-4">
                              <div className="flex flex-wrap items-end gap-3">
                                <div className="flex-1">
                                  <Label htmlFor="pe-margin" className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                                    Margen estimado
                                  </Label>
                                  <div className="relative mt-2 text-[var(--foreground)]">
                                    <Input
                                      id="pe-margin"
                                      type="number"
                                      inputMode="decimal"
                                      min={0}
                                      max={100}
                                      step={1}
                                      value={marginPct}
                                      onChange={(e) => {
                                        const raw = e.target.value;
                                        if (raw === "") {
                                          setMarginPct(0);
                                          return;
                                        }
                                        const parsed = Number(raw);
                                        if (Number.isNaN(parsed)) return;
                                        const clamped = Math.max(0, Math.min(100, parsed));
                                        setMarginPct(clamped);
                                      }}
                                      className="h-11 w-full rounded-full border border-[var(--border)] bg-[var(--input-background)] pr-10 text-right text-base font-semibold tabular-nums"
                                      aria-label="Margen para precio estimado"
                                    />
                                    <span className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">%</span>
                                  </div>
                                </div>
                                <Button
                                  type="button"
                                  variant="secondary"
                                  className="h-11 rounded-full px-6 text-xs font-semibold uppercase tracking-[0.16em]"
                                  onClick={() => void runMarginPeApply()}
                                  disabled={!peMarginEnabled || actionableItems.length === 0 || peApplying}
                                >
                                  {peApplying ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                                  Aplicar margen
                                </Button>
                              </div>
                              <p className="text-xs text-muted-foreground">
                                El margen se descuenta del precio promedio de ventas para estimar el costo del proveedor.
                              </p>
                            </div>
                            <div className="space-y-3 rounded-2xl border border-[var(--border)] bg-muted/20 p-4">
                              <Label
                                htmlFor="pe-margin-toggle"
                                className="inline-flex items-center gap-3 text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground"
                              >
                                <Checkbox
                                  id="pe-margin-toggle"
                                  checked={peMarginEnabled}
                                  onCheckedChange={handleMarginPeCheckboxChange}
                                  disabled={actionableItems.length === 0}
                                  aria-label="Aplicar margen automáticamente"
                                />
                                <span className="text-[var(--foreground)]">
                                  {peMarginEnabled ? "Aplicación automática activada" : "Aplicar automáticamente al precio U"}
                                </span>
                              </Label>
                              <p className="text-xs text-muted-foreground">
                                Cuando está activo, el margen se aplica sobre todos los productos utilizando los datos de ventas disponibles.
                              </p>
                            </div>
                            <div className="space-y-4 rounded-2xl border border-[var(--border)] bg-muted/20 p-4">
                              <Label htmlFor="pe-sim" className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                                Simulá un ejemplo
                              </Label>
                              <div className="grid gap-4 sm:grid-cols-2">
                                <div className="space-y-1.5">
                                  <span className="text-[11px] uppercase tracking-[0.2em] text-muted-foreground">
                                    Precio de venta / subtotal
                                  </span>
                                  <Input
                                    id="pe-sim"
                                    inputMode="decimal"
                                    type="number"
                                    value={peSimInput}
                                    onChange={(e) => setPeSimInput(e.target.value)}
                                    placeholder="Ej. 1500"
                                    className="h-11 rounded-full border border-[var(--border)] bg-[var(--input-background)] px-4 text-base font-semibold tabular-nums"
                                  />
                                </div>
                                <div className="space-y-1.5">
                                  <span className="text-[11px] uppercase tracking-[0.2em] text-muted-foreground">
                                    Precio proveedor real (opcional)
                                  </span>
                                  <Input
                                    id="pe-sim-provider"
                                    inputMode="decimal"
                                    type="number"
                                    value={peSimProviderInput}
                                    onChange={(e) => setPeSimProviderInput(e.target.value)}
                                    placeholder="Ej. 900"
                                    className="h-11 rounded-full border border-[var(--border)] bg-[var(--input-background)] px-4 text-base font-semibold tabular-nums"
                                  />
                                </div>
                              </div>
                              <div className="grid gap-4 sm:grid-cols-2">
                                <div className="rounded-2xl border border-[var(--border)] bg-background px-4 py-3 text-sm">
                                  <div className="text-[11px] uppercase tracking-[0.16em] text-muted-foreground">
                                    Precio estimado proveedor
                                  </div>
                                  <div className="text-2xl font-semibold tabular-nums text-[var(--foreground)]">
                                    {fmtMoney(peSimEstimate)}
                                  </div>
                                  <div className="text-xs text-muted-foreground">
                                    Ahorro estimado: {fmtMoney(peSimDiff)}
                                  </div>
                                </div>
                                <div className="rounded-2xl border border-[var(--border)] bg-background px-4 py-3 text-sm flex flex-col gap-2">
                                  <div>
                                    <div className="text-[11px] uppercase tracking-[0.16em] text-muted-foreground">
                                      Margen según tus datos
                                    </div>
                                    <div className="text-2xl font-semibold tabular-nums text-[var(--foreground)]">
                                      {peSimMarginFromInputs != null ? `${peSimMarginFromInputs}%` : "—"}
                                    </div>
                                  </div>
                                  <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-muted-foreground">
                                    <span>Fórmula: 1 - (Proveedor / Venta)</span>
                                    <Button
                                      type="button"
                                      variant="outline"
                                      size="sm"
                                      className="h-8 rounded-full px-3 text-[11px] font-semibold uppercase tracking-[0.16em]"
                                      onClick={() => {
                                        if (peSimMarginFromInputs == null) return;
                                        const safe = Math.max(0, Math.min(100, peSimMarginFromInputs));
                                        setMarginPct(safe);
                                      }}
                                      disabled={peSimMarginFromInputs == null}
                                    >
                                      Usar este
                                    </Button>
                                  </div>
                                </div>
                              </div>
                            </div>
                          </div>
                          <DialogFooter className="gap-2">
                            <Button variant="outline" onClick={() => setPeSettingsOpen(false)}>
                              Cerrar
                            </Button>
                          </DialogFooter>
                        </DialogContent>
                      </Dialog>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Label
                    htmlFor="check-all"
                    className="inline-flex cursor-pointer items-center gap-2 rounded-full border border-[var(--border)] bg-muted/60 px-3 py-1.5 hover:bg-muted"
                    title={allChecked ? "Desmarcar todos" : "Marcar todos"}
                  >
                    <Checkbox
                      id="check-all"
                      checked={bulkState}
                      onCheckedChange={(v) => setAllChecked(v === true)}
                      aria-label={allChecked ? "Desmarcar todos" : "Marcar todos"}
                    />
                    <span className="hidden select-none text-sm sm:inline">
                      {allChecked ? "Todos" : "Marcar todos"}
                    </span>
                  </Label>
                </div>
                </div>
              ) : null}
            </div>
          </div>

          <AlertDialog
        open={stockModalOpen}
        onOpenChange={(open) => {
          if (stockProcessing) return;
          setStockModalOpen(open);
          if (!open) {
            setStockError(null);
            setStockAdjustments({});
            setStockFilter("");
          }
        }}
      >
        <AlertDialogContent className="max-w-4xl w-[min(100vw-2rem,820px)] max-h-[calc(100vh-4rem)] overflow-y-auto">
          <AlertDialogHeader>
            <AlertDialogTitle>Obtener stock real</AlertDialogTitle>
            <AlertDialogDescription>
              Sumá el stock recibido y descontá las ventas desde la fecha seleccionada antes de confirmar.
            </AlertDialogDescription>
            <p className="mt-2 text-sm font-semibold text-lime-400">
              Paso 1: indica la fecha desde la cual vamos a descontar las ventas.
            </p>
          </AlertDialogHeader>

          <div className="mt-4 space-y-4">
            <div className="flex flex-col gap-1 text-sm">
              <Label htmlFor="stock-start-datetime" className="text-muted-foreground">
                Fecha y hora inicial
              </Label>
              <Input
                id="stock-start-datetime"
                type="datetime-local"
                value={stockSalesInput}
                onChange={(event) => {
                  setStockSalesInput(event.target.value);
                  if (stockError) setStockError(null);
                }}
                disabled={stockProcessing}
                className="max-w-xs border-2 border-lime-400 shadow-[0_0_8px_rgba(132,204,22,0.7)] animate-[pulse_1.6s_ease-in-out_infinite] focus-visible:border-lime-500 focus-visible:ring-2 focus-visible:ring-lime-400"
              />
            </div>

            <div className="text-xs text-muted-foreground">
              Stock aplicado última vez: {lastStockAppliedLabel ?? "—"}
            </div>
            <div className="text-sm font-semibold text-lime-400">
              Paso 2: verifica si los ítems que ingresaron en el último pedido para sumarlos al stock y luego restarlo con las ventas para obtener stock final.
            </div>

            {stockPreviewRows.length > 0 && (
              <Input
                value={stockFilter}
                onChange={(event) => setStockFilter(event.target.value)}
                placeholder="Filtrar productos..."
                className="h-9 w-full"
                disabled={stockProcessing}
                aria-label="Filtrar productos"
              />
            )}

            <div className="max-h-72 overflow-y-auto overflow-x-auto rounded-md border">
              <table className="w-full table-fixed border-collapse text-sm">
                <colgroup>
                  <col className="w-[44%]" />
                  <col className="w-[14%]" />
                  <col className="w-[14%]" />
                  <col className="w-[14%]" />
                  <col className="w-[14%]" />
                </colgroup>
                <thead className="bg-muted/60 text-xs uppercase tracking-wide text-muted-foreground">
                  <tr>
                    <th className="px-3 py-2 text-left">Producto</th>
                    <th className="px-3 py-2 text-right">Stock actual</th>
                    <th className="px-3 py-2 text-right">Artículos a sumar</th>
                    <th className="px-3 py-2 text-right">Ventas</th>
                    <th className="px-3 py-2 text-right">Stock final</th>
                  </tr>
                </thead>
                <tbody>
                  {stockPreviewRows.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="px-3 py-4 text-center text-muted-foreground">
                        No hay productos en este pedido.
                      </td>
                    </tr>
                  ) : filteredStockPreviewRows.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="px-3 py-4 text-center text-muted-foreground">
                        No hay productos que coincidan con {stockFilter.trim() || "el filtro actual"}.
                      </td>
                    </tr>
                  ) : (
                    filteredStockPreviewRows.map(({ item, raw, stockPrev, salesQty, stockResult, additionIsValid }) => (
                      <tr key={item.id} className="border-t">
                        <td className="px-3 py-2">
                          <div className="font-medium break-words leading-tight">
                            {item.display_name || item.product_name}
                          </div>
                          <div className="text-[11px] text-muted-foreground">{item.product_name}</div>
                        </td>
                        <td className="px-3 py-2 text-right tabular-nums">{qtyFormatter.format(stockPrev)}</td>
                        <td className="px-3 py-2 text-right">
                          <Input
                            value={raw}
                            onChange={(event) => {
                              setStockAdjustments((prev) => ({ ...prev, [item.id]: event.target.value }));
                              if (stockError) setStockError(null);
                            }}
                            disabled={stockProcessing}
                            className={clsx(
                              "h-8 w-20 text-right tabular-nums",
                              !additionIsValid && "border-destructive text-destructive focus-visible:ring-destructive"
                            )}
                            inputMode="decimal"
                            aria-label={`Cantidad a sumar para ${item.display_name || item.product_name}`}
                          />
                        </td>
                        <td className="px-3 py-2 text-right tabular-nums">{qtyFormatter.format(salesQty)}</td>
                        <td className="px-3 py-2 text-right tabular-nums font-semibold">
                          {qtyFormatter.format(stockResult)}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
                {stockPreviewRows.length > 0 && (
                  <tfoot className="border-t bg-muted/40 text-sm font-medium">
                    <tr>
                      <td className="px-3 py-2 text-right">Totales</td>
                      <td className="px-3 py-2 text-right tabular-nums">{qtyFormatter.format(stockTotals.stockPrev)}</td>
                      <td className="px-3 py-2 text-right tabular-nums">{qtyFormatter.format(stockTotals.addition)}</td>
                      <td className="px-3 py-2 text-right tabular-nums">{qtyFormatter.format(stockTotals.salesQty)}</td>
                      <td className="px-3 py-2 text-right tabular-nums">{qtyFormatter.format(stockTotals.stockResult)}</td>
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

            {hasInvalidAddition && (
              <p className="text-xs text-destructive">
                Revisá las cantidades: sólo se permiten números iguales o mayores a 0.
              </p>
            )}

            {stockError && <p className="text-sm text-destructive">{stockError}</p>}
          </div>

          <AlertDialogFooter>
            <AlertDialogCancel disabled={stockProcessing}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              disabled={stockConfirmDisabled}
              onClick={() => void applyStockChanges()}
            >
              {stockProcessing ? <Loader2 className="h-4 w-4 animate-spin" /> : "Obtener stock"}
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
          onValueChange={(v) => {
            const next = typeof v === "string" ? v : "";
            setOpenGroup(next);
            persistUiState({ openGroup: next || null });
          }}
        >
          <DraggableGroupList
            groups={groups}
            onReorder={(nextNames) => {
              // Persistimos nuevo orden en Supabase (multidispositivo)
              persistGroupOrder(nextNames);
            }}
            renderGroup={(groupName, arr, containerProps, meta) => {
              const orderedIndex = orderedExistingGroupNames.indexOf(groupName);
              const position = orderedIndex === -1 ? meta.index + 1 : orderedIndex + 1;
              const totalGroups = orderedExistingGroupNames.length || Math.max(meta.total, 1);
              return (
                <GroupSection
                  groupName={groupName}
                  items={arr}
                  productNames={productNames}
                  getSalesRowsForProduct={getSalesRowsForProduct}
                  getStatsForProduct={getStatsForProduct}
                  margin={marginPct}
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
                manualOrder={itemOrderMap[groupName] ?? EMPTY_ITEM_ORDER}
                manualSortActive={sortMode === "manual"}
                onMoveItem={(itemId, dir, visibleOrder) => moveItemWithinGroup(groupName, itemId, dir, visibleOrder)}
                onReorderItem={(itemId, position, visibleOrder) =>
                  moveItemToPosition(groupName, itemId, position, visibleOrder)
                }
                onMoveUp={() => moveGroup(groupName, "up")}
                onMoveDown={() => moveGroup(groupName, "down")}
                  checkedMap={checkedMap}
                  groupCheckedMap={groupCheckedMap}
                  onRenameItemLabel={updateDisplayName}
                  setItemChecked={setItemChecked}
                  setGroupChecked={setGroupChecked}
                  onUpdateStock={updateStock}
                  computeSalesSinceStock={computeSalesSinceStock}
                  statsOpenMap={statsOpenMap}
                  onToggleStats={toggleStats}
                  minStockMap={minStockMap}
                  onUpdateMinStock={updateMinStockValueForItem}
                  onToggleMinStock={toggleMinStockForItem}
                  autoQtyMap={autoQtyMap}
                  onToggleAutoQty={toggleAutoQtyForItem}
                  onRememberManualQty={rememberManualQty}
                  getManualQtyBackup={getManualQtyBackup}
                  frequency={providerFrequency}
                  onChangeFrequency={handleChangeAutoFrequency}
                  position={position}
                  totalGroups={totalGroups}
                  onSetPosition={(nextPosition) => moveGroupToPosition(groupName, nextPosition)}
                  containerProps={containerProps} // <-- clave
                  bottomViewportOffset={effectiveViewportOffset}
                  floatingActionBottomOffset={floatingActionBottomOffset}
                />
              );
            }}
          />
        </Accordion>
      </div>



      {/* Footer */}
      <div
        className="order-sticky-bar transition-transform duration-300 will-change-transform"
        style={{
          transform: footerTransform,
          bottom: footerBottomOffset,
        }}
      >
        <div className="rd-shell-constrain rd-sticky-card text-[var(--foreground)]">
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
          <div className="flex flex-wrap items-center justify-center gap-2 sm:flex-nowrap sm:gap-4">
            <div className="rd-sticky-metrics">
              <div className="space-y-1">
                <div className="flex items-center justify-between gap-4 text-[10px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">
                  <span>Total unidades</span>
                  <span className="text-right text-base font-semibold tabular-nums text-[color:var(--foreground)] md:text-lg">{grandQty}</span>
                </div>
              </div>
              <div className="space-y-1">
                <div className="flex items-center justify-between gap-4 text-[10px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">
                  <span>Total a pagar</span>
                  <span className="text-right text-base font-semibold tabular-nums text-[var(--primary)] md:text-lg">{fmtMoney(grandTotal)}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
    </div>
  </React.Fragment>
);
}

type ItemTitleProps = {
  name: string;
  canonical: string;
  onCommit: (...args: [string]) => Promise<void> | void;
};

function ItemTitle({
  name,          // etiqueta visible
  canonical,     // clave real (product_name)
  onCommit,
}: ItemTitleProps) {
  const [editing, setEditing] = React.useState(false);
  const [val, setVal] = React.useState(name);
  const inputRef = React.useRef<HTMLInputElement | null>(null);

  React.useEffect(() => setVal(name), [name]);

  React.useEffect(() => {
    if (editing) inputRef.current?.focus();
  }, [editing]);

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
          className="max-w-full text-left text-lg font-semibold leading-tight text-[color:var(--order-card-accent)] transition-opacity hover:opacity-80 md:text-xl line-clamp-2"
          onClick={() => setEditing(true)}
          title="Tocar para renombrar"
        >
          {name}
        </button>
        {name !== canonical && (
          <span
            className="inline-block rounded-full border border-[color:var(--order-card-pill-border)] bg-[color:var(--order-card-pill-background)] px-2 py-0.5 text-[10px] font-medium uppercase tracking-[0.12em] text-[color:var(--order-card-accent)] opacity-70"
            title={`Clave: ${canonical}`}
          >
            clave: {canonical}
          </span>
        )}
      </div>
    );
  }

  return (
    <div className="inline-flex items-center gap-2 rounded-full border border-[color:var(--order-card-pill-border)] bg-[color:var(--order-card-pill-background)] px-3 py-1 shadow-[inset_0_1px_0_rgba(255,255,255,0.55)]">
      <Input
        ref={inputRef}
        className="h-8 w-48 max-w-full border-none bg-transparent px-0 text-sm text-[color:var(--order-card-accent)] focus-visible:ring-0"
        value={val}
        onChange={(e) => setVal(e.target.value)}
        onBlur={() => void commit()}
        onKeyDown={(e) => {
          if (e.key === "Enter") { e.preventDefault(); void commit(); }
          if (e.key === "Escape") { e.preventDefault(); setVal(name); setEditing(false); }
        }}
        aria-label="Nombre visible del producto"
      />
      <Button
        size="icon"
        className="h-8 w-8 rounded-full border border-[color:var(--order-card-pill-border)] bg-[color:var(--order-card-pill-background)] text-[color:var(--order-card-accent)] shadow-none transition-colors hover:border-[color:var(--order-card-accent)]"
        onClick={() => void commit()}
      >
        <Check className="h-4 w-4" />
      </Button>
    </div>
  );
}
type PackSizeEditorProps = {
  value?: number | null;
  onCommit: (...args: [number | null]) => Promise<void> | void;
};

function PackSizeEditor({
  value,
  onCommit,
}: PackSizeEditorProps) {
  const [editing, setEditing] = React.useState(false);
  const [val, setVal] = React.useState<string>(String(value ?? ""));
  const inputRef = React.useRef<HTMLInputElement | null>(null);

  React.useEffect(() => setVal(String(value ?? "")), [value]);

  React.useEffect(() => {
    if (editing) inputRef.current?.focus();
  }, [editing]);

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
        className="inline-flex items-center gap-1 rounded-full border border-[color:var(--order-card-pill-border)] bg-[color:var(--order-card-pill-background)] px-3 py-1 text-[11px] font-medium text-[color:var(--order-card-accent)] shadow-[inset_0_1px_0_rgba(255,255,255,0.55)] transition-colors hover:border-[color:var(--order-card-accent)]"
        title={value ? `Paquete de ${value}` : "Configurar paquete"}
        onClick={() => setEditing(true)}
      >
        <Package className="h-3.5 w-3.5" />
        {value ? `x${value}` : "paquete"}
      </button>
    );
  }

  return (
    <div className="inline-flex items-center gap-2 rounded-full border border-[color:var(--order-card-pill-border)] bg-[color:var(--order-card-pill-background)] px-3 py-1 text-[color:var(--order-card-accent)] shadow-[inset_0_1px_0_rgba(255,255,255,0.55)]">
      <Input
        ref={inputRef}
        className="h-8 w-16 border-none bg-transparent px-0 text-center text-sm text-[color:var(--order-card-accent)] focus-visible:ring-0"
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
      <Button
        size="icon"
        className="h-8 w-8 rounded-full border border-[color:var(--order-card-pill-border)] bg-[color:var(--order-card-pill-background)] text-[color:var(--order-card-accent)] shadow-none transition-colors hover:border-[color:var(--order-card-accent)]"
        onClick={() => void commit()}
      >
        <Check className="h-4 w-4" />
      </Button>
    </div>
  );
}


/* ---------- PriceEditor ---------- */
type PriceEditorProps = {
  price: number;
  updatedAt?: string | null;    // 👈 NUEVO
  onCommit: (...args: [number]) => Promise<void> | void;
};

function PriceEditor({
  price,
  updatedAt,                    // 👈 NUEVO
  onCommit,
}: PriceEditorProps) {
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
    <div className="w-full text-[color:var(--order-card-accent)]">
      <div className="flex flex-col gap-1">
        <span className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[color:var(--order-card-accent)]/70">
          Precio u.
        </span>

        <div className="inline-flex h-9 w-full max-w-[130px] items-center justify-between rounded-2xl border border-[color:var(--order-card-pill-border)] bg-[color:var(--order-card-pill-background)] px-2.5 shadow-[inset_0_1px_0_rgba(255,255,255,0.55)] sm:h-10 sm:max-w-[140px] sm:px-3">
          <Input
            className="h-6 w-12 border-none bg-transparent pl-1 pr-0 text-right text-sm font-semibold text-[color:var(--order-card-accent)] tabular-nums focus-visible:ring-0 sm:h-7 sm:w-14 sm:text-base"
            inputMode="decimal"
            placeholder="0"
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
            variant="ghost"
            className={clsx(
              "h-6 w-6 rounded-full border border-[color:var(--order-card-pill-border)] bg-white text-[color:var(--order-card-accent)] shadow-none transition-colors sm:h-7 sm:w-7",
              dirty ? "hover:border-[color:var(--order-card-accent)]" : "opacity-60"
            )}
            disabled={!dirty}
            onClick={() => void commit()}
            aria-label="Confirmar precio"
            title="Confirmar precio"
          >
            <Check className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <div className="mt-1 text-[9px] text-right text-[color:var(--order-card-accent)] opacity-60 sm:text-[10px]" title={since.title}>
        {updatedAt ? `act. ${since.text}` : "sin cambios"}
      </div>
    </div>
  );



}

type StockEditorProps = {
  value?: number | null;
  updatedAt?: string | null;
  previousUpdatedAt?: string | null;
  signatureAt?: string | null;
  onCommit: (...args: [number | null]) => Promise<void> | void;
  salesSince?: number;
  onInputMount?: (el: HTMLInputElement | null) => void;
};

function StockEditor({
  value,
  updatedAt,
  previousUpdatedAt,
  signatureAt,
  onCommit,
  salesSince,
  onInputMount,
}: StockEditorProps) {
  const [val, setVal] = React.useState<string>(value == null ? "" : String(value));
  const [dirty, setDirty] = React.useState(false);
  const inputRef = React.useRef<HTMLInputElement | null>(null);
  const handleInputRef = React.useCallback(
    (node: HTMLInputElement | null) => {
      inputRef.current = node;
      onInputMount?.(node);
    },
    [onInputMount],
  );

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
  const signatureSource = signatureAt ?? updatedAt;
  const signatureLabel = formatStockSignatureLabel(signatureSource);
  const hasSalesSinceSignature = typeof salesSince === "number" && !!signatureSource;
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
  const infoLines = React.useMemo(() => {
    const lines: string[] = [];
    lines.push(signatureLabel ? `Firma ${signatureLabel}` : "Sin firma");
    lines.push(updatedAt ? `Aplicado ${since.text}` : "Sin aplicación");
    if (hasSalesSinceSignature) {
      const salesLine =
        typeof salesSince === "number" && salesSince > 0
          ? `Ventas descontadas: -${fmtInt(salesSince)}`
          : "Sin ventas desde la firma";
      lines.push(salesLine);
    }
    if (appliedFrom) {
      lines.push(`Ventas descontadas desde ${appliedFrom.absolute} (${appliedFrom.relative})`);
    }
    return lines;
  }, [signatureLabel, since, hasSalesSinceSignature, salesSince, appliedFrom, updatedAt]);
  return (
    <div className="w-full max-w-[220px] text-[color:var(--order-card-accent)] sm:max-w-none">
      <div className="flex flex-col gap-1">
        <span className="text-[9px] font-semibold uppercase tracking-[0.18em] text-[color:var(--order-card-accent)]/70 sm:text-[10px]">
          Stock actual
        </span>
        <div className="inline-flex h-9 w-full max-w-[130px] items-center justify-end gap-1 rounded-2xl border border-[color:var(--order-card-pill-border)] bg-[color:var(--order-card-pill-background)] px-2 shadow-[inset_0_1px_0_rgba(255,255,255,0.55)] sm:h-10 sm:max-w-[140px] sm:px-3">
          <Input
            ref={handleInputRef}
            className="h-6 w-11 border-none bg-transparent pl-1 pr-0 text-right text-sm font-semibold text-[color:var(--order-card-accent)] tabular-nums focus-visible:ring-0 sm:h-7 sm:w-12 sm:text-base"
            inputMode="numeric"
            placeholder="000"
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
            variant="ghost"
            className={clsx(
              "h-6 w-6 rounded-full border border-[color:var(--order-card-pill-border)] bg-white text-[color:var(--order-card-accent)] shadow-none transition-colors sm:h-7 sm:w-7",
              dirty ? "hover:border-[color:var(--order-card-accent)]" : "opacity-60"
            )}
            disabled={!dirty}
            onClick={() => void commit()}
            aria-label="Confirmar stock"
            title="Confirmar stock"
          >
            <Check className="h-4 w-4" />
          </Button>
          <Popover>
            <PopoverTrigger asChild>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-6 w-6 rounded-full border border-[color:var(--order-card-pill-border)] bg-white text-[color:var(--order-card-accent)] shadow-none transition-colors hover:border-[color:var(--order-card-accent)] sm:h-7 sm:w-7"
                aria-label="Detalles del stock"
              >
                <Info className="h-4 w-4" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-56 max-w-[80vw] rounded-2xl border border-[color:var(--border)] bg-card/90 p-3 text-[11px] leading-snug shadow-lg" align="end">
              {infoLines.map((line, idx) => (
                <p key={`${line}-${idx}`} className="m-0 text-[color:var(--foreground)]">
                  {line}
                </p>
              ))}
            </PopoverContent>
          </Popover>
        </div>
      </div>
    </div>
  );
}


/* =================== GroupSection =================== */
function GroupSection(props: GroupSectionProps) {
  const {
    groupName, items, productNames, getSalesRowsForProduct, getStatsForProduct, margin, tokenMatch, placeholder,
    onAddItem, onRemoveItem, onUpdateQty, onUpdateUnitPrice, onRenameGroup, onDeleteGroup,
    onBulkAddItems, onBulkRemoveByNames, sortMode,
    manualOrder, manualSortActive, onMoveItem, onReorderItem,
    onMoveUp, onMoveDown, checkedMap, setItemChecked,
    groupCheckedMap, setGroupChecked,
    containerProps, onUpdatePackSize, onUpdateStock,
    onRenameItemLabel, computeSalesSinceStock,
    statsOpenMap, onToggleStats,
    minStockMap, onUpdateMinStock, onToggleMinStock,
    autoQtyMap, onToggleAutoQty, onRememberManualQty, getManualQtyBackup,
    frequency, onChangeFrequency,
    position, totalGroups, onSetPosition,
    margin: marginPct,
    bottomViewportOffset,
    floatingActionBottomOffset,
  } = props;

  const frequencyLabelText = React.useMemo(() => providerFrequencyLabel(frequency), [frequency]);
  const normalizedGroupKey = normalizeGroupKey(groupName);
  const groupChecked = Boolean(groupCheckedMap[normalizedGroupKey]);

  // === Estado del texto del buscador (queda ARRIBA del bloque nuevo)
  const [q, setQ] = React.useState("");

  // ========= Refs/estado del dropdown + seguridad con teclado móvil =========
  const [open, setOpen] = React.useState(false);
  const [isSearchFocused, setIsSearchFocused] = React.useState(false);
  const inputRef = React.useRef<HTMLInputElement | null>(null);
  const portalRef = React.useRef<HTMLDivElement | null>(null);
  const [rect, setRect] = React.useState<DOMRect | null>(null);
  const handleInputRef = React.useCallback((node: HTMLInputElement | null) => {
    inputRef.current = node;
    if (!node) return;
    const nextRect = node.getBoundingClientRect();
    setRect((prev) => {
      if (areRectsEqual(prev, nextRect)) return prev;
      return nextRect;
    });
  }, []);
  const isMobileSearch = useMediaQuery("(max-width: 767px)");
  const showFullscreenSearch = isMobileSearch && open;
  const canUseDOM = typeof document !== "undefined";
  const portalTarget = canUseDOM ? document.body : null;
  const floatingActionTransform = bottomViewportOffset
    ? `translate3d(0, ${bottomViewportOffset}px, 0)`
    : undefined;


  const readRect = React.useCallback(() => {
    if (!inputRef.current) return;
    setRect(inputRef.current.getBoundingClientRect());
  }, []);

  const ensureInputVisible = React.useCallback(() => {
    if (!inputRef.current) return;
    const r = inputRef.current.getBoundingClientRect();
    const viewport = getVisualViewport();
    const viewportHeight = viewport?.height ?? window.innerHeight;
    const viewportOffsetTop = viewport?.offsetTop ?? 0;
    const safeTop = viewportOffsetTop + 8;
    const safeBottom = viewportOffsetTop + viewportHeight - 12;
    if (r.top >= safeTop && r.bottom <= safeBottom) return;
    inputRef.current.scrollIntoView({ block: "nearest", inline: "nearest", behavior: "auto" });
  }, []);

  const scrollInputToTop = React.useCallback(() => {
    if (!inputRef.current || typeof window === "undefined") return;

    const prefersTop = window.innerWidth < 1024;
    if (!prefersTop) {
      ensureInputVisible();
      return;
    }

    const rectNow = inputRef.current.getBoundingClientRect();
    const top = Math.max(window.scrollY + rectNow.top - 16, 0);
    window.scrollTo({ top, behavior: "smooth" });
  }, [ensureInputVisible]);

  React.useEffect(() => {
    if (!open) return;
    const update = () => readRect();

    window.addEventListener("resize", update, true);
    window.addEventListener("scroll", update, true);

    const viewport = getVisualViewport();
    const onViewportChange = () => {
      update();
      scrollInputToTop();
    };
    if (viewport) {
      viewport.addEventListener("resize", onViewportChange);
      viewport.addEventListener("scroll", onViewportChange);
    }

    update();
    scrollInputToTop();
    const t = setTimeout(() => {
      update();
      scrollInputToTop();
    }, 80);

    return () => {
      window.removeEventListener("resize", update, true);
      window.removeEventListener("scroll", update, true);
      if (viewport) {
        viewport.removeEventListener("resize", onViewportChange);
        viewport.removeEventListener("scroll", onViewportChange);
      }
      clearTimeout(t);
    };
  }, [open, readRect, scrollInputToTop]);

  React.useLayoutEffect(() => {
    if (!inputRef.current) return;
    readRect();
  }, [readRect]);

  React.useLayoutEffect(() => {
    if (!open) return;
    if (typeof window === "undefined" || typeof ResizeObserver === "undefined") {
      readRect();
      return;
    }

    const el = inputRef.current;
    if (!el) return;

    const observer = new ResizeObserver(() => {
      readRect();
    });
    observer.observe(el);

    return () => {
      observer.disconnect();
    };
  }, [open, readRect]);

  React.useEffect(() => {
    function onDocDown(e: MouseEvent | TouchEvent) {
      if (!open) return;
      const t = e.target as Node;
      if (!inputRef.current?.contains(t) && !portalRef.current?.contains(t)) setOpen(false);
    }
    document.addEventListener("mousedown", onDocDown);
    const onDocTouch = (event: TouchEvent) => onDocDown(event);
    document.addEventListener("touchstart", onDocTouch, { passive: true });
    return () => {
      document.removeEventListener("mousedown", onDocDown);
      document.removeEventListener("touchstart", onDocTouch);
    };
  }, [open]);

  React.useEffect(() => {
    if (!showFullscreenSearch) return;
    if (typeof document === "undefined") return;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prevOverflow;
    };
  }, [showFullscreenSearch]);

  const SUGGESTION_VISIBLE_ROWS = 6;
  const SUGGESTION_ROW_HEIGHT = 64;
  const SUGGESTION_HEADER_HEIGHT = 52;
  const SUGGESTION_INLINE_MAX_HEIGHT = SUGGESTION_HEADER_HEIGHT + SUGGESTION_ROW_HEIGHT * SUGGESTION_VISIBLE_ROWS;

  const portalStyle: React.CSSProperties = React.useMemo(() => {
    if (!rect || showFullscreenSearch) return { display: "none" };
    const viewport = getVisualViewport();
    const viewportHeight = viewport?.height ?? window.innerHeight;
    const viewportOffsetTop = viewport?.offsetTop ?? 0;

    const top = rect.bottom + 8;
    const available = Math.max(160, Math.floor(viewportHeight - (rect.bottom - viewportOffsetTop) - 16));
    const maxHeight = Math.min(available, SUGGESTION_INLINE_MAX_HEIGHT);

    return {
      position: "fixed",
      left: rect.left,
      top,
      width: rect.width,
      maxHeight,
      overflowY: "auto",
      zIndex: 60,
    } as React.CSSProperties;
  }, [rect, showFullscreenSearch, SUGGESTION_INLINE_MAX_HEIGHT]);

  const [editing, setEditing] = React.useState(false);
  const [editValue, setEditValue] = React.useState(groupName || "Sin grupo");
  const [confirmOpen, setConfirmOpen] = React.useState(false);
  const triggerRef = React.useRef<HTMLButtonElement | null>(null);
  const groupNameInputRef = React.useRef<HTMLInputElement | null>(null);
  React.useEffect(() => setEditValue(groupName || "Sin grupo"), [groupName]);
  const [positionInput, setPositionInput] = React.useState(String(position));
  React.useEffect(() => setPositionInput(String(position)), [position]);

  const commitPositionChange = React.useCallback(() => {
    const normalized = (positionInput || "").replace(",", ".").trim();
    if (!normalized) {
      setPositionInput(String(position));
      return;
    }
    const parsed = Number(normalized);
    if (!Number.isFinite(parsed)) {
      setPositionInput(String(position));
      return;
    }
    const maxPosition = Math.max(totalGroups, 1);
    const desired = Math.min(Math.max(Math.round(parsed), 1), maxPosition);
    if (desired === position) {
      setPositionInput(String(position));
      return;
    }
    setPositionInput(String(desired));
    onSetPosition(desired);
  }, [positionInput, position, totalGroups, onSetPosition]);

  React.useEffect(() => {
    if (editing) groupNameInputRef.current?.focus();
  }, [editing]);

  const arrVisible = items.filter((x) => x.product_name !== placeholder);
  const confirmedCount = React.useMemo(
    () => arrVisible.reduce((acc, it) => acc + (checkedMap[it.id] ? 1 : 0), 0),
    [arrVisible, checkedMap]
  );

  const groupStats = React.useMemo(() => {
    return arrVisible.reduce(
      (acc, it) => {
        const qty = round2(Number(it.qty ?? 0));
        const price = round2(Number(it.unit_price ?? 0));
        const subtotal = price * qty;
        const label = (it.display_name?.trim() || it.product_name).trim();
        const lastStockTs = it.stock_updated_at ? new Date(it.stock_updated_at).getTime() : null;
        const pendingSales = lastStockTs ? computeSalesSinceStock(label, lastStockTs) : 0;
        const baselineStock = typeof it.stock_qty === "number" ? round2(it.stock_qty) : null;
        const currentStock =
          baselineStock == null ? 0 : Math.max(0, round2(baselineStock - pendingSales));
        const projected = currentStock + qty;

        return {
          subtotal: acc.subtotal + subtotal,
          units: acc.units + qty,
          stockBalance: acc.stockBalance + projected,
          currentStock: acc.currentStock + currentStock,
        };
      },
      { subtotal: 0, units: 0, stockBalance: 0, currentStock: 0 }
    );
  }, [arrVisible, computeSalesSinceStock]);

  const groupSubtotal = groupStats.subtotal;
  const groupUnits = groupStats.units;
  const groupAvgPrice = groupUnits > 0 ? groupSubtotal / groupUnits : 0;
  const groupStockBalance = groupStats.stockBalance;
  const groupCurrentStock = groupStats.currentStock;
  const groupOrderDisplaySuffix =
    groupUnits === 0
      ? ""
      : groupUnits > 0
        ? ` + ${fmtInt(groupUnits)}`
        : ` - ${fmtInt(Math.abs(groupUnits))}`;
  const trimmedQuery = q.trim();
  const meetsSearchThreshold = trimmedQuery.length >= MIN_GROUP_SEARCH_CHARS;
  const suggestions = React.useMemo(() => {
    if (!meetsSearchThreshold) return [] as string[];
    const matches = productNames.filter((n) => tokenMatch(n, trimmedQuery));
    return matches;
  }, [meetsSearchThreshold, productNames, trimmedQuery, tokenMatch]);
  const shouldRenderInlineDropdown =
    !showFullscreenSearch && open && rect && portalTarget && suggestions.length > 0;
  const shouldScrollInlineDropdown = suggestions.length > SUGGESTION_VISIBLE_ROWS;

  const sortedVisible = React.useMemo(() => {
    let arr = [...arrVisible];
    const byNameAsc = (a: ItemRow, b: ItemRow) =>
      a.product_name.localeCompare(b.product_name, "es", { sensitivity: "base" });
    const byNameDesc = (a: ItemRow, b: ItemRow) => -byNameAsc(a, b);
    const avg = (name: string) => getStatsForProduct(name)?.stats.avg4w || 0;
    if (sortMode === "manual") arr = applyManualOrder(arr, manualOrder);
    else if (sortMode === "alpha_asc") arr.sort(byNameAsc);
    else if (sortMode === "alpha_desc") arr.sort(byNameDesc);
    else if (sortMode === "avg_desc") arr.sort((a, b) => (avg(b.product_name) - avg(a.product_name)) || byNameAsc(a, b));
    else if (sortMode === "avg_asc") arr.sort((a, b) => (avg(a.product_name) - avg(b.product_name)) || byNameAsc(a, b));
    return arr;
  }, [arrVisible, getStatsForProduct, manualOrder, sortMode]);

  const visibleOrderIds = React.useMemo(
    () => sortedVisible.map((item) => item.id),
    [sortedVisible],
  );

  const manualSequence = React.useMemo(() => {
    if (sortMode === "manual") {
      if (manualOrder.length) return manualOrder;
      return arrVisible.map((item) => item.id);
    }
    return visibleOrderIds;
  }, [sortMode, manualOrder, arrVisible, visibleOrderIds]);
  const totalItemsInGroup = sortedVisible.length;
  const [positionEditing, setPositionEditing] = React.useState<{ id: string | null; value: string }>({
    id: null,
    value: "",
  });
  const resetPositionEditing = React.useCallback(() => setPositionEditing({ id: null, value: "" }), []);
  React.useEffect(() => {
    setPositionEditing((prev) => {
      if (!prev.id) return prev;
      const stillExists = arrVisible.some((item) => item.id === prev.id);
      return stillExists ? prev : { id: null, value: "" };
    });
  }, [arrVisible]);
  const commitItemPosition = React.useCallback(
    (itemId: string, rawValue: string, currentPosition: number, total: number, visibleOrder: string[]) => {
      const normalized = (rawValue || "").replace(",", ".").trim();
      if (!normalized) {
        resetPositionEditing();
        return;
      }
      const parsed = Number(normalized);
      if (!Number.isFinite(parsed)) {
        resetPositionEditing();
        return;
      }
      const limit = Math.max(total, 1);
      const desired = Math.min(Math.max(Math.round(parsed), 1), limit);
      resetPositionEditing();
      if (!onReorderItem || desired === currentPosition) return;
      onReorderItem(itemId, desired, visibleOrder);
    },
    [onReorderItem, resetPositionEditing],
  );

  const stockInputRefs = React.useRef<Record<string, HTMLInputElement | null>>({});
  const setStockInputRef = React.useCallback((itemId: string, node: HTMLInputElement | null) => {
    if (node) stockInputRefs.current[itemId] = node;
    else delete stockInputRefs.current[itemId];
  }, []);
  const focusStockInput = React.useCallback((itemId: string) => {
    stockInputRefs.current[itemId]?.focus();
  }, []);

  async function commitRename() {
    const nv = (editValue || "").trim() || "Sin grupo";
    setEditing(false);
    if (nv === (groupName || "Sin grupo")) return;
    await onRenameGroup(groupName, nv === "Sin grupo" ? "" : nv);
  }

  const renderSearchInput = React.useCallback((className?: string) => (
    <div className={clsx("relative", className)}>
      <Input
        ref={handleInputRef}
        value={q}
        onFocus={() => {
          setIsSearchFocused(true);
          setOpen(true);
          scrollInputToTop();
          setTimeout(() => {
            readRect();
            scrollInputToTop();
          }, 50);
        }}
        onChange={(e) => {
          const text = e.target.value;
          setQ(text);
          if (!open) setOpen(true);
          scrollInputToTop();
          setTimeout(() => {
            readRect();
            scrollInputToTop();
          }, 20);
        }}
        onBlur={() => {
          setIsSearchFocused(false);
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
        className="h-10 rounded-full border border-[var(--border)] bg-[var(--input-background)] pl-12 pr-12 text-sm shadow-inner"
        aria-expanded={open}
        aria-controls={`suggestions-${groupName || "sin"}`}
        onFocusCapture={scrollInputToTop}
        style={!showFullscreenSearch ? { scrollMarginTop: "calc(env(safe-area-inset-top) + 56px)" } : undefined}
      />
      <Search className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
      {q && (
        <button
          type="button"
          className="absolute right-3 top-1/2 -translate-y-1/2 rounded-full p-1.5 text-muted-foreground transition-colors hover:bg-muted"
          aria-label="Limpiar búsqueda"
          onClick={() => { setQ(""); setOpen(false); inputRef.current?.focus(); }}
        >
          <X className="h-3.5 w-3.5" />
        </button>
      )}
    </div>
  ), [arrVisible, groupName, handleInputRef, onAddItem, open, q, readRect, scrollInputToTop, showFullscreenSearch]);

  const SuggestionsContent = ({ scrollable }: { scrollable?: boolean }) => {
    const entries = suggestions;
    const inner = (
      <>
        <div className="sticky top-0 z-10 flex items-center justify-between gap-2 border-b border-[var(--border)] bg-muted/40 px-3 py-2">
          <div className="text-xs text-muted-foreground">
            {meetsSearchThreshold ? `${suggestions.length} resultados` : `Escribí al menos ${MIN_GROUP_SEARCH_CHARS} letras`}
          </div>
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
          {!meetsSearchThreshold && (
            <p className="px-3 py-2 text-xs text-muted-foreground">
              Para acelerar el buscador, mostramos resultados cuando cargas al menos {MIN_GROUP_SEARCH_CHARS} letras.
            </p>
          )}
          {entries.map((name, idx) => {
            const checked = arrVisible.some((it) => it.product_name === name);
            const statsEntry = getStatsForProduct(name);
            const stats = statsEntry?.stats ?? EMPTY_STATS;
            const pv = stats.lastUnitRetail ?? stats.avgUnitRetail30d ?? 0;
            const pe = Math.round(pv * (1 - marginPct / 100));
            const suggestionId = `suggestion-${normKey(groupName || "sin-grupo")}-${idx}`;
            return (
              <Label
                key={name}
                htmlFor={suggestionId}
                className="flex items-center gap-2 px-3 py-2 hover:bg-accent cursor-pointer"
              >
                <Checkbox
                  id={suggestionId}
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
                  <div className="text-sm font-medium leading-snug text-[var(--foreground)] whitespace-normal break-words">
                    {name}
                  </div>
                  <div className="mt-0.5 flex flex-wrap gap-2 text-xs text-muted-foreground font-medium">
                    <span>P.V.: {fmtMoney(pv)}</span>
                    <span>P.E.: {fmtMoney(pe)}</span>
                  </div>
                </div>
              </Label>
            );
          })}
        </div>
      </>
    );

    if (scrollable) {
      return <div className="flex-1 overflow-y-auto">{inner}</div>;
    }

    return inner;
  };

const mergedClassName = clsx(
  "mb-5 overflow-visible rounded-[28px] border border-[color:var(--border)] bg-[color:var(--order-group-background,var(--card))] shadow-[0_18px_40px_rgba(12,24,20,0.12)]",
  groupChecked && "border-[color:var(--order-card-highlight)] ring-1 ring-[color:var(--order-card-highlight)]/40",
  containerProps?.className,
);
const groupHighlightStyle = groupChecked
  ? { boxShadow: "0 18px 45px rgba(15,23,42,0.15), 0 18px 48px var(--order-card-highlight)" }
  : undefined;
type DragHandleProps = {
  draggable?: boolean;
  onDragStart?: React.DragEventHandler<HTMLButtonElement>;
  onDragOver?: React.DragEventHandler<HTMLButtonElement>;
  onDrop?: React.DragEventHandler<HTMLButtonElement>;
  onDragEnd?: React.DragEventHandler<HTMLButtonElement>;
};
  const dragHandleProps = React.useMemo<DragHandleProps>(() => {
    if (!containerProps) return {};
    const adaptHandler = (
      handler?: React.DragEventHandler<HTMLDivElement>,
    ): React.DragEventHandler<HTMLButtonElement> | undefined => {
      if (!handler) return undefined;
      return (event) => handler(event as unknown as React.DragEvent<HTMLDivElement>);
    };
    const {
      className: _ignoredClassName,
      draggable,
      onDragStart,
      onDragOver,
      onDrop,
      onDragEnd,
    } = containerProps;
    return {
      draggable: Boolean(draggable),
      onDragStart: adaptHandler(onDragStart),
      onDragOver: adaptHandler(onDragOver),
      onDrop: adaptHandler(onDrop),
      onDragEnd: adaptHandler(onDragEnd),
    };
  }, [containerProps]);

  return (
  <AccordionItem
    value={groupName || "Sin grupo"}
    className={mergedClassName}
    style={groupHighlightStyle}
  >
    {/* HEADER */}
    <AccordionTrigger
      ref={triggerRef}
      draggable={dragHandleProps.draggable}
      onDragStart={dragHandleProps.onDragStart}
      onDragOver={dragHandleProps.onDragOver}
      onDrop={dragHandleProps.onDrop}
      onDragEnd={dragHandleProps.onDragEnd}
      className={clsx(
        "group cursor-pointer select-none rounded-t-[28px] bg-[color:var(--order-group-header,var(--muted)/30)] px-4 py-4 text-left text-base font-semibold text-[var(--foreground)] transition-colors data-[state=open]:rounded-b-none sm:px-6 sm:py-5",
        groupChecked && "bg-[color:var(--order-card-highlight)]/10",
      )}
    >
      <div className="flex w-full flex-col gap-3 sm:gap-4">
        <div className="flex flex-col gap-3 md:flex-row md:items-start md:gap-4">
          <div className="flex min-w-0 flex-1 flex-col gap-2">
            <div className="flex w-full flex-wrap items-center gap-2.5 sm:gap-3">
              <div className="flex flex-col items-start gap-1 text-[10px] text-muted-foreground">
                <span className="text-[9px] font-semibold uppercase tracking-[0.2em]">Orden</span>
                <div className="flex items-center gap-0.5 sm:gap-1">
                  <Input
                    type="number"
                    inputMode="numeric"
                    min={1}
                    max={Math.max(totalGroups, 1)}
                    value={positionInput}
                    className="h-8 w-12 rounded-xl text-center text-sm sm:w-14"
                    aria-label="Posición del grupo"
                    title="Editar posición del grupo"
                    onClick={(e) => e.stopPropagation()}
                    onPointerDown={(e) => e.stopPropagation()}
                    onChange={(e) => setPositionInput(e.target.value.replace(/[^0-9]/g, ""))}
                    onBlur={() => { void commitPositionChange(); }}
                    onKeyDown={(e) => {
                      e.stopPropagation();
                      if (e.key === "Enter") {
                        e.preventDefault();
                        void commitPositionChange();
                      }
                      if (e.key === "Escape") {
                        e.preventDefault();
                        setPositionInput(String(position));
                      }
                    }}
                  />
                  <span className="text-[11px] text-muted-foreground">/ {Math.max(totalGroups, 1)}</span>
                </div>
              </div>
              <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground sm:text-sm">
                <Badge className="shrink-0 rounded-full bg-[color:var(--surface-accent-soft)] px-3 py-1 text-[11px] font-semibold text-[color:var(--surface-accent-strong)]">
                  {arrVisible.length} {arrVisible.length === 1 ? "producto" : "productos"}
                </Badge>
                <Badge
                  className={clsx(
                    "shrink-0 rounded-full px-3 py-1 text-[11px]",
                    confirmedCount > 0
                      ? "border border-[var(--surface-success-strong)] bg-[var(--surface-success-soft)] text-[color:var(--success)]"
                      : "border border-[var(--border)] bg-muted/60 text-muted-foreground"
                  )}
                  title="Productos confirmados"
                >
                  <span className="inline-flex items-center gap-1">
                    <Check className="h-3.5 w-3.5" />
                    {confirmedCount}
                  </span>
                </Badge>
              </div>
              <div className="ml-auto flex flex-shrink-0 items-center">
                <div
                  role="button"
                  tabIndex={0}
                  onClick={(e) => {
                    e.stopPropagation();
                    setGroupChecked(groupName || "Sin grupo", !groupChecked);
                  }}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      e.stopPropagation();
                      setGroupChecked(groupName || "Sin grupo", !groupChecked);
                    }
                  }}
                  onPointerDown={(e) => e.stopPropagation()}
                  className={clsx(
                    "flex h-11 w-11 items-center justify-center rounded-2xl border-2 border-[color:var(--border)] bg-[color:var(--order-card-pill-background)] text-[color:var(--order-card-accent)] shadow-inner transition-all duration-200 hover:border-[color:var(--order-card-accent)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--order-card-highlight)] focus-visible:ring-offset-2 focus-visible:ring-offset-background",
                    groupChecked &&
                      "scale-105 border-transparent bg-[color:var(--order-card-highlight)] text-[var(--primary-foreground)] shadow-[0_14px_30px_rgba(15,23,42,0.35)] ring-4 ring-[color:var(--order-card-highlight)]/40"
                  )}
                  aria-label={groupChecked ? "Marcar grupo como pendiente" : "Marcar grupo como gestionado"}
                  aria-pressed={groupChecked}
                  title={groupChecked ? "Marcar grupo como pendiente" : "Marcar grupo como gestionado"}
                >
                  {groupChecked ? (
                    <Check className="h-5 w-5 text-[#0f172a]" />
                  ) : (
                    <Circle className="h-5 w-5" />
                  )}
                </div>
              </div>
            </div>
            <div className="min-w-0">
              {!editing ? (
                <span
                  role="button"
                  tabIndex={0}
                  className="inline-flex w-full min-w-0 items-center gap-2 truncate text-left text-lg font-semibold hover:opacity-80 focus:outline-none focus-visible:ring-2 focus-visible:ring-ring/70 md:w-auto"
                  title="Renombrar grupo"
                  onClick={(e) => { e.stopPropagation(); setEditing(true); }}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault(); e.stopPropagation(); setEditing(true);
                    }
                  }}
                >
                  <span className="truncate">{groupName || "Sin grupo"}</span>
                  <Pencil className="h-4 w-4 opacity-70 flex-shrink-0" />
                </span>
              ) : (
                <Input
                  ref={groupNameInputRef}
                  className="h-9 w-full rounded-2xl md:w-[11rem]"
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
            </div>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-y-2 gap-x-4 text-sm text-muted-foreground">
          <div className="flex flex-wrap items-center gap-2 sm:gap-4">
            <div className="inline-flex items-center gap-1 font-medium text-[color:var(--foreground)]">
              {fmtInt(groupUnits)} unidades
            </div>
            <span className="hidden text-muted-foreground sm:inline">•</span>
            <div
              className={clsx(
                "inline-flex items-center gap-1 font-semibold",
                groupStockBalance > 0
                  ? "text-[var(--success)]"
                  : groupStockBalance < 0
                    ? "text-[var(--destructive)]"
                    : "text-muted-foreground"
              )}
            >
              {groupStockBalance > 0 ? <TrendingUp className="h-3.5 w-3.5" /> : null}
              {groupStockBalance < 0 ? <TrendingDown className="h-3.5 w-3.5" /> : null}
              <span>
                Stock: {fmtInt(groupCurrentStock)}
                {groupOrderDisplaySuffix}
              </span>
            </div>
          </div>
          <div className="ml-auto flex flex-col items-end gap-1 text-right">
            <span className="text-[11px] uppercase tracking-[0.2em] text-muted-foreground">Subtotal</span>
            <span className="text-2xl font-semibold tabular-nums text-[var(--foreground)]">{fmtMoney(groupSubtotal)}</span>
          </div>
        </div>
      </div>
    </AccordionTrigger>


      {/* TOOLBAR */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[var(--border)] bg-[color:var(--order-group-toolbar,var(--background))] px-6 py-3 text-sm text-muted-foreground">
        <div className="flex flex-1 items-center gap-2">
          <Button
            variant="ghost"
            size="icon"
            className="h-9 w-9 rounded-2xl text-destructive hover:bg-destructive/10"
            aria-label="Eliminar grupo"
            onClick={() => setConfirmOpen(true)}
            title="Eliminar grupo"
          >
            <Trash2 className="h-4 w-4" />
          </Button>
          <div className="ml-auto flex items-center gap-2">
            <Button
              type="button"
              size="icon"
              variant="secondary"
              className="h-9 w-9 rounded-2xl border border-[var(--border)] bg-card/80 text-[var(--foreground)] hover:bg-muted/60"
              aria-label="Mover grupo arriba"
              onClick={() => onMoveUp()}
              title="Mover hacia arriba"
            >
              <ChevronUp className="h-4 w-4" />
            </Button>
            <Button
              type="button"
              size="icon"
              variant="secondary"
              className="h-9 w-9 rounded-2xl border border-[var(--border)] bg-card/80 text-[var(--foreground)] hover:bg-muted/60"
              aria-label="Mover grupo abajo"
              onClick={() => onMoveDown()}
              title="Mover hacia abajo"
            >
              <ChevronDown className="h-4 w-4" />
            </Button>
          </div>
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
      <AccordionContent
        className={clsx(
          "!overflow-visible rounded-b-3xl bg-card/70 px-5 pb-6",
          groupChecked && "ring-1 ring-[color:var(--order-card-highlight)]/20",
        )}
      >
          <div className="space-y-4 sm:space-y-5">
          {/* Buscador */}
          {!showFullscreenSearch && renderSearchInput()}

          {/* Dropdown */}
          {shouldRenderInlineDropdown && createPortal(
            <div
              id={`suggestions-${groupName || "sin"}`}
              ref={portalRef}
              style={portalStyle}
              className="rounded-md border bg-popover text-popover-foreground shadow"
              role="listbox"
            >
              <SuggestionsContent scrollable={shouldScrollInlineDropdown} />
              {q && !suggestions.find((s) => s.toLowerCase() === q.toLowerCase()) && (
                <button
                  className="w-full border-t px-3 py-2 text-left hover:bg-accent"
                  onClick={() => {
                    const name = q.trim(); if (!name) return;
                    void onAddItem(name, groupName);
                    setQ("");
                    setOpen(false);
                  }}
                >
                  <div className="text-xs text-muted-foreground">Agregar producto nuevo:</div>
                  <div className="font-medium">“{q}”</div>
                </button>
              )}
            </div>,
            portalTarget
          )}

          {showFullscreenSearch && portalTarget && createPortal(
            <div ref={portalRef} className="fixed inset-0 z-[80] bg-[var(--background)]/95 backdrop-blur-sm">
              <div className="mx-auto flex h-full w-full max-w-md flex-col px-4 pb-[calc(env(safe-area-inset-bottom)+16px)] pt-[calc(env(safe-area-inset-top)+16px)]">
                <div className="flex items-center gap-2">
                  <div className="flex-1">{renderSearchInput()}</div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    aria-label="Cerrar buscador"
                    className="h-10 w-10 rounded-full text-muted-foreground"
                    onClick={() => { setOpen(false); inputRef.current?.blur(); }}
                  >
                    <X className="h-5 w-5" />
                  </Button>
                </div>

                <div className="mt-4 flex flex-1 flex-col overflow-hidden rounded-3xl border border-[var(--border)] bg-card shadow-xl">
                  <SuggestionsContent scrollable />
                  {q && !suggestions.find((s) => s.toLowerCase() === q.toLowerCase()) && (
                    <button
                      className="w-full border-t px-4 py-3 text-left text-sm hover:bg-accent"
                      onClick={() => {
                        const name = q.trim(); if (!name) return;
                        void onAddItem(name, groupName);
                        setQ("");
                        setOpen(false);
                      }}
                    >
                      <div className="text-xs text-muted-foreground">Agregar producto nuevo:</div>
                      <div className="font-medium">“{q}”</div>
                    </button>
                  )}
                </div>
              </div>
            </div>,
            portalTarget
          )}

          {/* Items */}
          {arrVisible.length === 0 && (
            <div className="text-sm text-muted-foreground">No hay productos aún. Busca arriba y tilda para agregar.</div>
          )}

          {sortedVisible.map((it, idx) => {
            const subtotal = (it.unit_price || 0) * (it.qty || 0);
            const key = normKey(it.product_name);
            const entry = getStatsForProduct(it.product_name);
            const anchor = entry?.anchor ?? 0;
            const st = entry?.stats ?? EMPTY_STATS;
            const productLabel = (it.display_name?.trim() || it.product_name).trim();
            const lastStockTs = it.stock_updated_at ? new Date(it.stock_updated_at).getTime() : null;
            const pendingSales = lastStockTs ? computeSalesSinceStock(productLabel, lastStockTs) : 0;
            const baselineStock = typeof it.stock_qty === "number" ? it.stock_qty : null;
            const liveStock =
              baselineStock == null ? null : Math.max(0, round2(baselineStock - pendingSales));
            const isChecked = !!checkedMap[it.id];
            const orderIndex = manualSequence.indexOf(it.id);
            const canMoveUp = manualSequence.length > 1 && orderIndex > 0;
            const canMoveDown = manualSequence.length > 1 && orderIndex !== -1 && orderIndex < manualSequence.length - 1;
            const projectedStock = round2((liveStock ?? 0) + (it.qty ?? 0));
            const orderDelta = round2(it.qty ?? 0);
            const statusBadgeClass = isChecked
              ? "border border-[var(--surface-success-strong)] bg-[var(--surface-success-soft)] text-[var(--success)]"
              : "border border-[var(--border)] bg-white text-muted-foreground";
            const metricChipClass =
              "rounded-2xl border border-[var(--border)] bg-white/70 px-3 py-2 text-[11px] text-muted-foreground";
            const salesRows = getSalesRowsForProduct(it.product_name);
            const sparklineSeries = buildSalesTrendSeries(salesRows, 14, anchor);
            const latestTrend = sparklineSeries.length ? sparklineSeries[sparklineSeries.length - 1]?.qty ?? 0 : 0;
            const statsOpen = !!statsOpenMap[it.id];
            const minState = minStockMap[it.id];
            const minQtyDefined = Math.max(0, minState?.qty ?? 0);
            const minActive = Boolean(minState?.enabled) && minQtyDefined > 0;
            const autoMinSuggestion = minActive
              ? snapToPack(Math.max(0, minQtyDefined - (liveStock ?? 0)), it.pack_size)
              : null;
            const autoEnabled = minActive || (autoQtyMap[it.id] ?? true);
            const autoHelperText = autoEnabled
              ? minActive
                ? `Sugerido por mínimo (${fmtInt(minQtyDefined)} u)`
                : `Sugerido auto ${frequencyLabelText.toLowerCase()}`
              : "Modo manual: podés editar la cantidad";
            const autoControlClasses = clsx(
              "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-semibold shadow-sm transition-colors",
              autoEnabled
                ? "border-[color:var(--order-card-highlight)] bg-[color:var(--order-card-highlight)]/10 text-[color:var(--order-card-highlight)]"
                : "border-[color:var(--order-card-pill-border)] bg-white text-[color:var(--order-card-accent)]",
              minActive && "opacity-70"
            );
            const autoSelectLabel = "Auto";
            const autoSelectAriaLabel = `Auto ${frequencyLabelText.toLowerCase()}`;

            return (
              <Card
                key={it.id}
                className={clsx(
                  "group relative mb-3 overflow-hidden rounded-[26px] border border-[color:var(--border)] bg-white px-0 py-0 shadow-[0_8px_24px_rgba(15,23,42,0.08)] transition-all duration-200 sm:mb-4",
                  isChecked && "border-[color:var(--order-card-highlight)] ring-1 ring-[color:var(--order-card-highlight)]/40"
                )}
                style={
                  isChecked
                    ? {
                        boxShadow: "0 8px 24px rgba(15,23,42,0.08), 0 18px 48px var(--order-card-highlight)",
                      }
                    : undefined
                }
              >
                <CardContent
                  className={clsx(
                    "relative m-1.5 rounded-[22px] border border-[color:var(--border)] bg-white px-3 py-3 transition-all duration-200 sm:m-2 sm:px-4 sm:py-4",
                    isChecked &&
                      "border-[color:var(--order-card-highlight)] ring-1 ring-inset ring-[color:var(--order-card-highlight)]/40"
                  )}
                >
                  <div className="space-y-3 sm:space-y-4">
                    <div className="flex flex-wrap items-start gap-3 sm:gap-4">
                      <div className="min-w-0 flex-1 space-y-2">
                        <div className="flex w-full flex-wrap items-center gap-2 sm:gap-2.5">
                          <div className="flex flex-none items-center gap-1 text-[10px] text-muted-foreground">
                            <Input
                              type="number"
                              inputMode="numeric"
                              min={1}
                              max={Math.max(totalItemsInGroup, 1)}
                              value={
                                positionEditing.id === it.id
                                  ? positionEditing.value
                                  : String(idx + 1)
                              }
                              className="h-8 w-12 rounded-lg px-0 text-center text-sm"
                              aria-label="Posición del producto dentro del grupo"
                              title="Editar posición del producto"
                              onClick={(e) => e.stopPropagation()}
                              onPointerDown={(e) => e.stopPropagation()}
                              onFocus={(e) => {
                                e.stopPropagation();
                                setPositionEditing((prev) =>
                                  prev.id === it.id ? prev : { id: it.id, value: String(idx + 1) },
                                );
                              }}
                              onChange={(e) => {
                                const digits = e.target.value.replace(/[^0-9]/g, "");
                                setPositionEditing({ id: it.id, value: digits });
                              }}
                              onKeyDown={(e) => {
                                e.stopPropagation();
                                if (e.key === "Enter") {
                                  e.preventDefault();
                                  if (positionEditing.id === it.id) {
                                    commitItemPosition(
                                      it.id,
                                      positionEditing.value,
                                      idx + 1,
                                      totalItemsInGroup,
                                      visibleOrderIds,
                                    );
                                  }
                                }
                                if (e.key === "Escape") {
                                  e.preventDefault();
                                  resetPositionEditing();
                                }
                              }}
                              onBlur={() => {
                                if (positionEditing.id === it.id) {
                                  commitItemPosition(
                                    it.id,
                                    positionEditing.value,
                                    idx + 1,
                                    totalItemsInGroup,
                                    visibleOrderIds,
                                  );
                                }
                              }}
                            />
                            <span className="text-[11px] text-muted-foreground">
                              / {Math.max(totalItemsInGroup, 1)}
                            </span>
                          </div>
                          <div className="flex-none">
                            <PackSizeEditor value={it.pack_size} onCommit={(n) => onUpdatePackSize(it.id, n)} />
                          </div>
                          <div className="ml-auto flex items-center">
                            <label
                              htmlFor={`item-check-${it.id}`}
                              className={clsx(
                                "inline-flex cursor-pointer items-center gap-1.5 rounded-full px-3 py-1 text-[11px] font-semibold",
                                statusBadgeClass,
                              )}
                            >
                              <span>{isChecked ? "Completo" : "Pendiente"}</span>
                              <Checkbox
                                id={`item-check-${it.id}`}
                                checked={isChecked}
                                onCheckedChange={(v) => setItemChecked(it.id, v === true)}
                                className={clsx(
                                  "size-5 shrink-0 rounded-full border-2 border-[color:var(--border)] bg-white shadow-none transition-colors",
                                  isChecked &&
                                    "data-[state=checked]:border-[color:var(--order-card-highlight)] data-[state=checked]:bg-[color:var(--order-card-highlight)]"
                                )}
                                aria-label="Marcar como cargado"
                              />
                            </label>
                          </div>
                        </div>
                        <div className="min-w-0">
                          <ItemTitle
                            name={it.display_name || it.product_name}
                            canonical={it.product_name}
                            onCommit={(label) => onRenameItemLabel(it.id, label)}
                          />
                        </div>
                        {it.display_name && it.display_name.trim() !== it.product_name ? (
                          <p className="text-[11px] text-muted-foreground">{it.product_name}</p>
                        ) : null}
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-2.5 sm:gap-4">
                      <div className="flex flex-1 flex-wrap items-center gap-2.5 sm:gap-4">
                        <div className="flex-1 min-w-[95px] max-w-[160px] sm:min-w-[120px]">
                          <StockEditor
                            value={liveStock}
                            updatedAt={it.stock_updated_at}
              previousUpdatedAt={it.previous_qty_updated_at}
                            signatureAt={it.stock_signature_at}
                            onCommit={(n) => onUpdateStock(it.id, n)}
                            salesSince={pendingSales}
                            onInputMount={(node) => setStockInputRef(it.id, node)}
                          />
                        </div>
                        <div className="inline-flex flex-none min-w-[110px] max-w-[180px] items-center gap-1.5 rounded-2xl border border-[color:var(--surface-success-strong)] bg-[color:var(--surface-success-soft)] px-2 py-1.5 text-[color:var(--success)] sm:min-w-[150px] sm:gap-3 sm:px-4 sm:py-3">
                          <div className="flex flex-col">
                            <div className="text-[9px] font-semibold uppercase tracking-[0.15em] opacity-70 leading-tight">
                              Stock&nbsp;proj.
                            </div>
                            <div className="flex items-baseline gap-1">
                              <div className="text-lg font-semibold tabular-nums">{fmtInt(projectedStock)}</div>
                              <div className="text-[10px] font-semibold text-[color:var(--order-card-highlight)]">
                                {orderDelta === 0 ? "—" : orderDelta > 0 ? `+${fmtInt(orderDelta)}` : `-${fmtInt(Math.abs(orderDelta))}`}
                              </div>
                            </div>
                          </div>
          </div>
        </div>
        <div className="flex flex-col items-end gap-1.5 sm:gap-2">
                        <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
                          <div className={autoControlClasses}>
                            <Checkbox
                              checked={autoEnabled}
                              onCheckedChange={(value) => {
                                if (minActive) return;
                                const nextAuto = value === true;
                                const currentQty = Math.max(0, Math.round(Number(it.qty ?? 0)));
                                if (nextAuto) {
                                  onRememberManualQty(it.id, currentQty);
                                  onToggleAutoQty(it.id, true);
                                  return;
                                }
                                onToggleAutoQty(it.id, false);
                                const manualQty = getManualQtyBackup(it.id);
                                if (manualQty != null && manualQty !== currentQty) {
                                  void onUpdateQty(it.id, manualQty);
                                }
                              }}
                              disabled={minActive}
                              className="size-4 rounded-full border-2 border-[color:var(--order-card-pill-border)] bg-white text-white data-[state=checked]:border-[color:var(--order-card-highlight)] data-[state=checked]:bg-[color:var(--order-card-highlight)]"
                              aria-label="Activar pedido sugerido automático"
                            />
                            <Select value={frequency} onValueChange={(value) => onChangeFrequency(value as ProviderFrequency)}>
                              <SelectTrigger
                                className="h-auto border-none bg-transparent px-0 py-0 text-current shadow-none hover:bg-transparent focus-visible:ring-0 focus-visible:ring-offset-0"
                                aria-label={autoSelectAriaLabel}
                                title={`Cambiar periodo: ${autoSelectAriaLabel}`}
                              >
                                <span className="inline-flex items-center gap-1">
                                  <Sparkles className="h-3 w-3" />
                                  <span className="leading-none">{autoSelectLabel}</span>
                                </span>
                              </SelectTrigger>
                              <SelectContent className="min-w-[220px]">
                                {AUTO_FREQUENCY_OPTIONS.map((option) => (
                                  <SelectItem key={option.value} value={option.value} className="flex flex-col items-start gap-0.5">
                                    <span className="text-sm font-semibold text-[color:var(--foreground)]">{option.title}</span>
                                    <span className="text-xs font-normal text-muted-foreground">{option.description}</span>
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                          <Stepper
                            value={it.qty}
                            min={0}
                            step={it.pack_size || 1}
                            suffixLabel="pedido"
                            disabled={autoEnabled}
                            onChange={(n: number) => {
                              onToggleAutoQty(it.id, false);
                              onRememberManualQty(it.id, n);
                              void onUpdateQty(it.id, n);
                            }}
                          />
                        </div>
                        <span className="text-[10px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">
                          {autoHelperText}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center justify-between gap-2 border-t border-[color:var(--border)] pt-3 text-[10px] sm:text-[11px]">
                      <div className="flex items-center gap-1.5 min-w-0">
                        <span className="font-semibold text-[color:var(--foreground)] whitespace-nowrap">Stats:</span>
                        <span className="truncate text-muted-foreground">
                          Prom/sem (4s) {fmtInt(st.avg4w)} · 7d {fmtInt(st.sum7d)}
                        </span>
                      </div>
                      <button
                        type="button"
                        className="flex-shrink-0 inline-flex items-center gap-1 text-[color:var(--primary)] text-[10px] sm:text-[11px] hover:underline whitespace-nowrap"
                        onClick={() => onToggleStats(it.id)}
                      >
                        <BarChart3 className="h-4 w-4" />
                        {statsOpen ? "Ocultar" : "Ver más"}
                      </button>
                    </div>
                    {statsOpen && (
                      <div className="space-y-3 rounded-3xl border border-[color:var(--border)] bg-muted/20 p-4">
                        <div className="flex flex-wrap items-center gap-3 rounded-2xl border border-[color:var(--border)] bg-white/90 p-3">
                          <div className="min-w-0 flex-1">
                            <div className="text-[10px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">
                              Definir mínimo
                            </div>
                            <p className="text-xs text-muted-foreground">
                              {minActive
                                ? `El pedido se ajusta solo para llegar a ${fmtInt(minQtyDefined)} u.`
                                : "Guardá un mínimo para calcular cuánto falta sin depender de las ventas."}
                            </p>
                            {minActive ? (
                              <p className="text-xs font-semibold text-[color:var(--foreground)]">
                                Sugerido actual: {fmtInt(autoMinSuggestion ?? 0)} u
                              </p>
                            ) : null}
                          </div>
                          <div className="flex items-center gap-2">
                            <Input
                              className="h-8 w-20 rounded-2xl text-right text-sm font-semibold tabular-nums sm:h-9 sm:w-24"
                              inputMode="numeric"
                              placeholder="Ej: 120"
                              value={minQtyDefined > 0 ? String(minQtyDefined) : ""}
                              onChange={(event) => {
                                const parsed = parseNumberInput(event.target.value);
                                onUpdateMinStock(it.id, Number.isFinite(parsed) ? parsed : 0);
                              }}
                            />
                            <Checkbox
                              checked={Boolean(minState?.enabled)}
                              onCheckedChange={(value) => onToggleMinStock(it.id, value === true)}
                              className="size-6 rounded-lg border-2"
                              aria-label="Activar mínimo automático"
                            />
                          </div>
                        </div>
                        <div className="flex items-center justify-between text-xs text-muted-foreground">
                          <span>Tendencia 14 días</span>
                          <span className="font-semibold text-[color:var(--foreground)]">{fmtInt(latestTrend)} u</span>
                        </div>
                        <div className="grid grid-cols-2 gap-3 text-xs text-muted-foreground lg:grid-cols-3">
                          {[
                            { label: "Prom/sem (4s)", value: fmtInt(st.avg4w) },
                            { label: "Ventas 7 días", value: fmtInt(st.sum7d) },
                            { label: "Ventas 2 sem", value: fmtInt(st.sum2w) },
                            { label: "Ventas 30d", value: fmtInt(st.sum30d) },
                            {
                              label: "Últ. venta",
                              value:
                                typeof st.lastDate === "number"
                                  ? `${formatUTCWeekday(st.lastDate)} ${formatUTCDate(st.lastDate)}`
                                  : "—",
                            },
                            { label: "Pedido anterior", value: it.previous_qty != null ? fmtInt(it.previous_qty) : "—" },
                          ].map((metric) => (
                            <div key={metric.label} className={metricChipClass}>
                              <div className="text-[10px] uppercase tracking-[0.16em]">{metric.label}</div>
                              <div className="font-semibold tabular-nums text-[color:var(--foreground)]">{metric.value}</div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    <div className="flex w-full flex-nowrap items-center justify-between gap-2 border-t border-[color:var(--border)] pt-3 text-[10px] sm:text-[11px] pr-3 sm:pr-4">
                      <div className="flex items-center gap-1.5">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 rounded-full text-destructive hover:bg-destructive/10 sm:h-9 sm:w-9"
                          onClick={() => void onRemoveItem(it.id)}
                          aria-label="Quitar producto"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                        <div
                          className={clsx(
                            "flex items-center gap-1 rounded-full border border-[color:var(--border)] bg-muted/40 p-0.5",
                            !manualSortActive && "opacity-85"
                          )}
                          title={manualSortActive ? "Reordenar este producto" : "Al mover se activa el orden manual"}
                        >
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-6 w-6 rounded-full border border-transparent text-[color:var(--order-card-accent)] hover:border-[color:var(--order-card-accent)] sm:h-7 sm:w-7"
                            onClick={() => onMoveItem(it.id, "up", visibleOrderIds)}
                            aria-label={`Mover ${productLabel} hacia arriba`}
                            disabled={!canMoveUp}
                          >
                            <ChevronUp className="h-4 w-4" />
                          </Button>
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-6 w-6 rounded-full border border-transparent text-[color:var(--order-card-accent)] hover:border-[color:var(--order-card-accent)] sm:h-7 sm:w-7"
                            onClick={() => onMoveItem(it.id, "down", visibleOrderIds)}
                            aria-label={`Mover ${productLabel} hacia abajo`}
                            disabled={!canMoveDown}
                          >
                            <ChevronDown className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 sm:gap-3 flex-shrink-0">
                        <div className="min-w-[110px] sm:min-w-[130px]">
                          <PriceEditor
                            price={it.unit_price}
                            updatedAt={it.price_updated_at}
                            onCommit={(n) => onUpdateUnitPrice(it.id, n)}
                          />
                        </div>
                        <div className="text-right min-w-[70px] pr-2">
                          <div className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground">Subtotal</div>
                          <div className="text-lg font-semibold tabular-nums text-[color:var(--foreground)]">
                            {fmtMoney(subtotal)}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}

          {/* Botón flotante para cerrar el grupo */}
          {!open && (
            <div
              className="fixed inset-x-0 z-70 pointer-events-none px-3 md:px-6 lg:px-8"
              style={{
                bottom: floatingActionBottomOffset,
                transform: floatingActionTransform,
              }}
            >
              <div className="rd-shell-constrain flex justify-end">
                <Button
                  size="icon"
                  variant="default"
                  className="h-11 w-11 rounded-full bg-[var(--primary)] text-[var(--primary-foreground)] shadow-[0_10px_20px_var(--surface-action-primary-strong)] pointer-events-auto hover:bg-[var(--primary)]/90"
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
type GroupCreatorProps = {
  onCreate: (name: string) => Promise<boolean> | boolean;
  autoFocusInput?: boolean;
};
/* eslint-enable no-unused-vars */

function GroupCreator({ onCreate, autoFocusInput = false }: GroupCreatorProps) {
  const [name, setName] = React.useState("");
  const [submitting, setSubmitting] = React.useState(false);
  const inputRef = React.useRef<HTMLInputElement | null>(null);

  React.useEffect(() => {
    if (!autoFocusInput) return;
    const node = inputRef.current;
    if (node) node.focus();
  }, [autoFocusInput]);

  const handleCreate = React.useCallback(async () => {
    const n = name.trim();
    if (!n || submitting) return;
    setSubmitting(true);
    try {
      const ok = await onCreate(n);
      if (ok !== false) {
        setName("");
      }
    } finally {
      setSubmitting(false);
    }
  }, [name, onCreate, submitting]);

  return (
    <form
      className="mt-3 flex flex-col gap-3 sm:flex-row sm:items-center"
      onSubmit={(e) => {
        e.preventDefault();
        e.stopPropagation();
        void handleCreate();
      }}
    >
      <Input
        id="new-group-name"
        ref={inputRef}
        placeholder="Ej: Budines, Galletas..."
        value={name}
        onChange={(e) => setName(e.target.value)}
        aria-label="Nombre del nuevo grupo"
        onKeyDown={(e) => {
          if (e.key === "Enter") e.stopPropagation();
        }}
        disabled={submitting}
        className="h-11 rounded-full border border-[var(--border)] bg-[var(--input-background)] px-4 shadow-inner"
      />
      <Button
        type="submit"
        disabled={submitting}
        className="h-11 rounded-full bg-[var(--primary)] px-6 text-[var(--primary-foreground)] shadow-[0_8px_18px_var(--surface-action-primary-strong)] hover:bg-[var(--primary)]/90"
      >
        {submitting ? (
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
        ) : (
          <Plus className="mr-2 h-4 w-4" />
        )}
        {submitting ? "Creando" : "Crear"}
      </Button>
    </form>
  );
}
