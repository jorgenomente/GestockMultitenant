"use client";

import React from "react";
import * as XLSX from "xlsx";
import { useParams } from "next/navigation";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Slider } from "@/components/ui/slider";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Checkbox } from "@/components/ui/checkbox";
import { ArrowDown, ArrowUp, Loader2, Upload } from "lucide-react";
import { useBranch } from "@/components/branch/BranchProvider";
import { getSupabaseBrowserClient } from "@/lib/supabaseClient";

/* ========= Config ========= */
const VENTAS_URL = "/ventas.xlsx";

const SALES_LS_KEY_LEGACY_BASE = "gestock:sales:last";
const SALES_META_LS_KEY_BASE = "gestock:sales:meta:v3";
const IDB_SALES_KEY_BASE = "sales:last:v2";
const SALES_BC_NAME_BASE = "gestock:sales:bc";
const UI_LS_KEY_BASE = "gestock:stats:ui:v1";
const WEIGHT_SETTINGS_KEY_BASE = "gestock:stats:weight:v1";

/* ========= Tipos ========= */
type SalesRow = {
  product: string;
  qty: number;
  date: number;
  subtotal?: number;
  unitPrice?: number;
};

type Stats = {
  avg4w: number;
  sum2w: number;
  sum30d: number;
  lastUnitPrice?: number;
  lastDate?: number;
};

type Granularity = "week" | "day" | "month";

type SavedMeta = {
  filename?: string;
  ts?: number;
  size?: number;
  storage: "idb" | "local-b64" | "default";
};

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

type WeightProductInfo = {
  key: string;
  name: string;
  searchKey: string;
  rows: SalesRow[];
  stats: Stats;
  unitKg: number | null;
};

type SelectedProduct = {
  key: string;
  name: string;
  rows: SalesRow[];
};

const EMPTY_STATS: Stats = { avg4w: 0, sum2w: 0, sum30d: 0, lastUnitPrice: undefined, lastDate: undefined };

const DRY_FRUIT_KEYWORDS = [
  "almendra",
  "nuez",
  "nueces",
  "pistacho",
  "avellana",
  "mani",
  "manies",
  "caju",
  "anacardo",
  "pecan",
  "pasas",
  "fruto seco",
  "frutos secos",
  "mix frutos",
  "mix seco",
  "mix semillas",
  "semilla",
  "chia",
  "sesamo",
  "lino",
  "girasol",
  "calabaza",
  "pepita",
  "cranberry",
  "arandano",
  "datil",
  "ciruela",
  "higo",
  "coco rallado",
];

const WEIGHT_AMOUNT_REGEX = /(^|\s)\d+([.,]\d+)?\s*(kg|kilo|kilogram|gr|g|gram)\b/;

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

/* ========= Utils ========= */
const NBSP_RX = /[\u00A0\u202F]/g;
const DIAC_RX = /\p{Diacritic}/gu;
const normText = (s: string) => s.replace(NBSP_RX, " ").trim();
const normKey = (s: string) =>
  normText(s).normalize("NFD").replace(DIAC_RX, "").toLowerCase();

const makeKey = (base: string, suffix: string | null) =>
  suffix ? `${base}:${suffix}` : base;

const isVersionError = (error: unknown): boolean =>
  typeof error === "object" && error !== null && "name" in error && (error as { name?: string }).name === "VersionError";

const extractErrorMessage = (error: unknown, fallback: string): string => {
  if (error instanceof Error && typeof error.message === "string" && error.message.trim()) {
    return error.message;
  }
  if (typeof error === "string" && error.trim()) {
    return error;
  }
  return fallback;
};

function toEpochMs(v: unknown): number | null {
  if (v == null || v === "") return null;
  if (typeof v === "number") {
    const d = XLSX.SSF.parse_date_code(v);
    if (!d) return null;
    const hour = Number.isFinite(d.H) ? d.H : 12;
    const minute = Number.isFinite(d.M) ? d.M : 0;
    const second = Number.isFinite(d.S) ? Math.floor(d.S) : 0;
    return Date.UTC(d.y, d.m - 1, d.d, hour, minute, second);
  }
  if (typeof v === "string") {
    const t = Date.parse(v);
    if (!Number.isNaN(t)) return t;
    const s = v.replaceAll(".", "/").replaceAll("-", "/").trim();
    const m = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{2,4})/);
    if (m) {
      const [, dd, mm, yyyy] = m;
      let year = parseInt(yyyy, 10);
      if (year < 100) year += 2000;
      return Date.UTC(year, parseInt(mm, 10) - 1, parseInt(dd, 10), 12);
    }
    return null;
  }
  return null;
}
function b642ab(b64: string) {
  const bin = atob(b64);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return bytes.buffer;
}

const TIMEZONE = "America/Argentina/Buenos_Aires";
const dateShortFmt = new Intl.DateTimeFormat("es-AR", { timeZone: TIMEZONE, day: "2-digit", month: "2-digit", year: "numeric" });
const dateTimeShortFmt = new Intl.DateTimeFormat("es-AR", {
  timeZone: TIMEZONE,
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
  hour12: false,
});
const weekdayFmt = new Intl.DateTimeFormat("es-AR", { weekday: "long", timeZone: TIMEZONE });
const dateFmt = new Intl.DateTimeFormat("es-AR", { day: "2-digit", month: "2-digit", year: "numeric", timeZone: TIMEZONE });
const dateShort = (ts: number) => dateShortFmt.format(new Date(ts));
const dateTimeShort = (ts: number) => dateTimeShortFmt.format(new Date(ts));
const formatLastSale = (ts?: number) => (!ts ? "—" : `${weekdayFmt.format(new Date(ts))} ${dateFmt.format(new Date(ts))}`);
const formatKg = (value: number) => {
  if (!Number.isFinite(value)) return "—";
  return value.toLocaleString("es-AR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 3,
  });
};
const formatQuantity = (value: number) => {
  if (!Number.isFinite(value)) return "—";
  const isInteger = Math.abs(value - Math.round(value)) < 1e-3;
  return value.toLocaleString("es-AR", {
    minimumFractionDigits: isInteger ? 0 : 2,
    maximumFractionDigits: 2,
  });
};
const formatCurrency = (value: number) => {
  if (!Number.isFinite(value)) return "—";
  return `$${value.toLocaleString("es-AR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
};
const FRACTION_THRESHOLD = 1e-3;
const isFractionalQuantity = (qty: number) => Math.abs(qty - Math.round(qty)) > FRACTION_THRESHOLD;

function parseFraction(text: string): number | null {
  const fractionMatch = text.match(/^(\d+)\/(\d+)$/);
  if (!fractionMatch) return null;
  const num = parseFloat(fractionMatch[1]);
  const den = parseFloat(fractionMatch[2]);
  if (!Number.isFinite(num) || !Number.isFinite(den) || den === 0) return null;
  return num / den;
}

function extractUnitKgFromName(name: string): number | null {
  const cleaned = name.replace(/\s+/g, " ");
  const match = cleaned.match(/(\d+(?:\/\d+)?|\d*(?:[.,]\d+)?)(?:\s*x\s*(\d+(?:[.,]\d+)?))?\s*(kg|kilo|kilogramos?|gr|g|gramos?|mg|miligramos?)\b/i);
  if (!match) return null;
  const [, firstPart, multiplierRaw, unitRaw] = match;
  let value: number | null = null;
  if (firstPart?.includes("/")) {
    value = parseFraction(firstPart);
  } else {
    const parsed = parseFloat(firstPart?.replace(",", ".") ?? "");
    value = Number.isFinite(parsed) ? parsed : null;
  }
  if (value == null) return null;
  let multiplier = 1;
  if (multiplierRaw) {
    const parsedMult = parseFloat(multiplierRaw.replace(",", "."));
    if (Number.isFinite(parsedMult)) multiplier = parsedMult;
  }
  const unit = (unitRaw ?? "").toLowerCase();
  let kg = value;
  if (unit.startsWith("mg") || unit.includes("milig")) {
    kg = value / 1_000_000;
  } else if (unit.startsWith("g")) {
    kg = value / 1000;
  } else if (unit.startsWith("kg") || unit.startsWith("kilo")) {
    kg = value;
  } else {
    return null;
  }
  return kg * multiplier;
}

function looksLikeWeightProduct(nameKey: string, rows: SalesRow[]): boolean {
  if (rows.some((r) => r.qty > 0 && isFractionalQuantity(r.qty))) return true;
  if (extractUnitKgFromName(nameKey)) return true;
  if (WEIGHT_AMOUNT_REGEX.test(nameKey)) return true;
  for (const keyword of DRY_FRUIT_KEYWORDS) {
    if (nameKey.includes(keyword)) return true;
  }
  return false;
}

/* ========= IndexedDB helpers ========= */
const IDB_DB_NAME = "gestock";
const IDB_STORE = "blobs";

async function idbOpenSmart(): Promise<IDBDatabase> {
  try {
    const db = await new Promise<IDBDatabase>((resolve, reject) => {
      const req = indexedDB.open(IDB_DB_NAME);
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
      req.onupgradeneeded = () => {
        const database = req.result;
        if (!database.objectStoreNames.contains(IDB_STORE)) database.createObjectStore(IDB_STORE);
      };
    });

    if (!db.objectStoreNames.contains(IDB_STORE)) {
      const nextVersion = (db.version || 1) + 1;
      db.close();
      return await new Promise<IDBDatabase>((resolve, reject) => {
        const req2 = indexedDB.open(IDB_DB_NAME, nextVersion);
        req2.onupgradeneeded = () => {
          const db2 = req2.result;
          if (!db2.objectStoreNames.contains(IDB_STORE)) db2.createObjectStore(IDB_STORE);
        };
        req2.onsuccess = () => resolve(req2.result);
        req2.onerror = () => reject(req2.error);
      });
    }

    return db;
  } catch (err: unknown) {
    if (isVersionError(err)) {
      return await new Promise<IDBDatabase>((resolve, reject) => {
        const req = indexedDB.open(IDB_DB_NAME);
        req.onsuccess = () => resolve(req.result);
        req.onerror = () => reject(req.error);
      });
    }
    throw err;
  }
}

async function idbGet<T = unknown>(key: string): Promise<T | undefined> {
  const db = await idbOpenSmart();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(IDB_STORE, "readonly");
    const st = tx.objectStore(IDB_STORE);
    const req = st.get(key);
    req.onsuccess = () => resolve(req.result as T | undefined);
    req.onerror = () => reject(req.error);
  });
}

async function idbSet<T>(key: string, value: T): Promise<void> {
  const db = await idbOpenSmart();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(IDB_STORE, "readwrite");
    const st = tx.objectStore(IDB_STORE);
    const req = st.put(value, key);
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
  });
}

async function idbDel(key: string): Promise<void> {
  const db = await idbOpenSmart();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(IDB_STORE, "readwrite");
    const st = tx.objectStore(IDB_STORE);
    const req = st.delete(key);
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
  });
}

/* ========= Parseo ventas ========= */
async function parseVentasArrayBuffer(buf: ArrayBuffer): Promise<Map<string, SalesRow[]>> {
  const wb = XLSX.read(buf, { type: "array" });
  const sheet = wb.Sheets[wb.SheetNames[0]];
  const raw = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, { defval: "" });

  const parsed: SalesRow[] = [];
  for (const r of raw) {
    const name = (r["ARTÍCULO"] ?? r["ARTICULO"] ?? r["Artículo"] ?? "") as string;
    const qtyV = r["CANTIDAD"] ?? r["Cantidad"] ?? 0;
    const dateV = r["HORA"] ?? r["Hora"] ?? r["FECHA"] ?? "";
    const subtotalV = r["SUBTOTAL"] ?? r["Subtotal"] ?? r["Importe"] ?? null;

    const product = normText(String(name));
    const qty = Number(String(qtyV).replace(",", "."));
    const epoch = toEpochMs(dateV);
    const subtotal = subtotalV != null && subtotalV !== "" ? Number(String(subtotalV).replace(",", ".")) : undefined;
    if (!product || !epoch || Number.isNaN(qty)) continue;

    const unitPrice = subtotal != null && !Number.isNaN(subtotal) && qty > 0 ? subtotal / qty : undefined;
    parsed.push({ product, qty, date: epoch, subtotal, unitPrice });
  }

  const map = new Map<string, SalesRow[]>();
  for (const row of parsed) {
    const key = normKey(row.product);
    if (!map.has(key)) map.set(key, []);
    map.get(key)!.push(row);
  }
  for (const arr of map.values()) arr.sort((a, b) => b.date - a.date);
  return map;
}

/* ========= Stats ========= */
const weeksAgoMs = (n: number) => Date.now() - n * 7 * 24 * 3600 * 1000;
const daysAgoMs = (n: number) => Date.now() - n * 24 * 3600 * 1000;

function computeStats(arr: SalesRow[]): Stats {
  const t4 = weeksAgoMs(4), t2 = weeksAgoMs(2), t30 = daysAgoMs(30);
  let sum28 = 0, sum14 = 0, sum30 = 0;
  let lastUnitPrice: number | undefined, lastDate: number | undefined;

  for (const r of arr) {
    const q = r.qty > 0 ? r.qty : 0;
    if (r.date >= t4) sum28 += q;
    if (r.date >= t2) sum14 += q;
    if (r.date >= t30) sum30 += q;
    if (lastDate == null) lastDate = r.date;
  }
  for (const r of arr) {
    if (r.unitPrice != null && !Number.isNaN(r.unitPrice)) {
      lastUnitPrice = r.unitPrice;
      if (lastDate == null) lastDate = r.date;
      break;
    }
  }
  return { avg4w: +(sum28 / 4).toFixed(2), sum2w: +sum14.toFixed(2), sum30d: +sum30.toFixed(2), lastUnitPrice, lastDate };
}

/* ========= Persistencia ventas ========= */
function readMeta(key: string): SavedMeta | null {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return null;
    const v = JSON.parse(raw) as SavedMeta;
    if (!v.storage) return null;
    return v;
  } catch {
    return null;
  }
}
function writeMeta(key: string, meta: SavedMeta) {
  localStorage.setItem(key, JSON.stringify(meta));
}
function clearMeta(key: string) {
  localStorage.removeItem(key);
}

const base64ToArrayBuffer = (base64: string): ArrayBuffer => {
  const binary = atob(base64);
  const len = binary.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i += 1) bytes[i] = binary.charCodeAt(i);
  return bytes.buffer;
};

async function fetchActiveSalesMeta(
  supabase: ReturnType<typeof getSupabaseBrowserClient>,
  tenantId?: string | null,
  branchId?: string | null,
): Promise<SalesPersistMeta | null> {
  if (!tenantId) return null;
  const keys = salesKeysForLookup(tenantId ?? null, branchId ?? null);
  for (const key of keys) {
    try {
      const { data, error } = await supabase
        .from("app_settings")
        .select("value")
        .eq("key", key)
        .maybeSingle();
      if (error) {
        const code = error.code ?? "";
        if (code === "PGRST302") continue;
        if (code === "42P01") break;
        console.warn("fetchActiveSalesMeta warning", error);
        continue;
      }
      const raw = data?.value as SalesPersistMeta | undefined;
      if (raw && (raw.url || raw.base64)) {
        return { ...raw, scope_key: key, tenant_id: tenantId ?? null, branch_id: branchId ?? null };
      }
    } catch (err) {
      console.warn("fetchActiveSalesMeta exception", err);
      break;
    }
  }
  return null;
}

/* ========= Hook: ventas compartidas ========= */
function useSharedSales(
  storageSuffix: string | null,
  opts: {
    supabase?: ReturnType<typeof getSupabaseBrowserClient>;
    tenantId?: string | null;
    branchId?: string | null;
  } = {}
) {
  const metaKey = makeKey(SALES_META_LS_KEY_BASE, storageSuffix);
  const legacyKey = makeKey(SALES_LS_KEY_LEGACY_BASE, storageSuffix);
  const idbKey = makeKey(IDB_SALES_KEY_BASE, storageSuffix);
  const bcName = makeKey(SALES_BC_NAME_BASE, storageSuffix);
  const supabaseClient = opts.supabase;
  const tenantId = opts.tenantId ?? null;
  const branchId = opts.branchId ?? null;

  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [byProduct, setByProduct] = React.useState<Map<string, SalesRow[]>>(new Map());
  const [source, setSource] = React.useState<{ kind: "imported" | "default"; filename?: string; meta?: SavedMeta }>({ kind: "default" });

  const bcRef = React.useRef<BroadcastChannel | null>(null);

  React.useEffect(() => {
    if (typeof window === "undefined" || typeof BroadcastChannel === "undefined") return;
    const channel = new BroadcastChannel(bcName);
    bcRef.current = channel;
    channel.onmessage = async (ev) => {
      if (ev?.data?.type === "sales-updated" || ev?.data?.type === "sales-cleared") {
        await loadFromBestSource();
      }
    };
    return () => {
      channel.close();
      bcRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bcName]);

  React.useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (e.key === metaKey || e.key === legacyKey) loadFromBestSource();
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [metaKey, legacyKey]);

  async function loadFromBestSource() {
    try {
      setLoading(true);
      setError(null);

      if (supabaseClient && tenantId) {
        const meta = await fetchActiveSalesMeta(supabaseClient, tenantId, branchId);
        if (meta && (meta.base64 || meta.url)) {
          try {
            let buffer: ArrayBuffer | null = null;
            if (meta.base64) {
              buffer = base64ToArrayBuffer(meta.base64);
            } else if (meta.url) {
              const res = await fetch(meta.url, { cache: "no-store" });
              if (!res.ok) throw new Error(`No se pudo cargar ${meta.url}`);
              buffer = await res.arrayBuffer();
            }

            if (buffer) {
              const map = await parseVentasArrayBuffer(buffer);
              setByProduct(map);
              const filename = meta.filename || "ventas.xlsx";
              const savedMeta: SavedMeta = {
                filename,
                ts: meta.uploaded_at ? Date.parse(meta.uploaded_at) : Date.now(),
                size: buffer.byteLength,
                storage: "idb",
              };
              try {
                await idbSet(idbKey, buffer);
                writeMeta(metaKey, savedMeta);
              } catch (cacheErr) {
                console.warn("No se pudo cachear ventas", cacheErr);
              }
              setSource({ kind: "imported", filename, meta: savedMeta });
              setLoading(false);
              return;
            }
          } catch (remoteErr: unknown) {
            console.warn("No se pudo cargar ventas remotas", remoteErr);
          }
        }
      }

      const bufFromIdb = await idbGet<ArrayBuffer>(idbKey);
      const meta = readMeta(metaKey);
      if (bufFromIdb && meta?.storage === "idb") {
        const map = await parseVentasArrayBuffer(bufFromIdb);
        setByProduct(map);
        setSource({ kind: "imported", filename: meta.filename, meta });
        setLoading(false);
        return;
      }

      const rawLegacy = localStorage.getItem(legacyKey);
      if (rawLegacy) {
        try {
          const saved = JSON.parse(rawLegacy) as { filename?: string; ts?: number; bufB64: string };
          if (saved?.bufB64) {
            const buf = b642ab(saved.bufB64);
            await idbSet(idbKey, buf);
            const newMeta: SavedMeta = {
              filename: saved.filename,
              ts: saved.ts ?? Date.now(),
              size: buf.byteLength,
              storage: "idb",
            };
            writeMeta(metaKey, newMeta);
            const map = await parseVentasArrayBuffer(buf);
            setByProduct(map);
            setSource({ kind: "imported", filename: saved.filename, meta: newMeta });
            setLoading(false);
            return;
          }
        } catch {
          /* ignore */
        }
      }

      const res = await fetch(VENTAS_URL, { cache: "no-store" });
      if (!res.ok) throw new Error(`No se pudo cargar ${VENTAS_URL}`);
      const buf = await res.arrayBuffer();
      const map = await parseVentasArrayBuffer(buf);
      setByProduct(map);
      setSource({ kind: "default", meta: { storage: "default" } });
    } catch (error: unknown) {
      setError(extractErrorMessage(error, "Error cargando ventas"));
    } finally {
      setLoading(false);
    }
  }

  React.useEffect(() => {
    let alive = true;
    (async () => {
      if (!alive) return;
      await loadFromBestSource();
    })();
    return () => { alive = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [storageSuffix, supabaseClient, tenantId, branchId]);

  async function importVentas(file: File) {
    try {
      setLoading(true);
      const buf = await file.arrayBuffer();
      const map = await parseVentasArrayBuffer(buf);
      setByProduct(map);
      setError(null);

      await idbSet(idbKey, buf);
      const meta: SavedMeta = {
        filename: file.name,
        ts: Date.now(),
        size: buf.byteLength,
        storage: "idb",
      };
      writeMeta(metaKey, meta);
      setSource({ kind: "imported", filename: file.name, meta });

      bcRef.current?.postMessage({ type: "sales-updated" });
      window.alert("Ventas actualizadas y persistidas (disponibles al recargar y en otras pestañas).");
    } catch (error: unknown) {
      const message = extractErrorMessage(error, "No se pudo importar el archivo de ventas.");
      setError(message);
      window.alert(message);
    } finally {
      setLoading(false);
    }
  }

  async function clearVentas() {
    try {
      setLoading(true);
      await idbDel(idbKey);
      clearMeta(metaKey);
      localStorage.removeItem(legacyKey);

      const res = await fetch(VENTAS_URL, { cache: "no-store" });
      if (!res.ok) throw new Error(`No se pudo cargar ${VENTAS_URL}`);
      const buf = await res.arrayBuffer();
      const map = await parseVentasArrayBuffer(buf);
      setByProduct(map);
      setSource({ kind: "default", meta: { storage: "default" } });

      bcRef.current?.postMessage({ type: "sales-cleared" });
    } catch (error: unknown) {
      setError(extractErrorMessage(error, "No se pudo volver a la fuente por defecto."));
    } finally {
      setLoading(false);
    }
  }

  return { loading, error, byProduct, importVentas, clearVentas, source };
}

/* ========= Página ========= */
export default function EstadisticaPage() {
  const params = useParams<{ slug?: string }>();
  const tenantSlug = (params?.slug ?? "").toString();
  const { currentBranch, tenantId } = useBranch();
  const branchId = currentBranch?.id ?? null;
  const storageSuffix = tenantId && branchId ? `${tenantId}:${branchId}` : null;
  const weightSettingsKey = makeKey(WEIGHT_SETTINGS_KEY_BASE, storageSuffix);
  const supabase = React.useMemo(() => getSupabaseBrowserClient(), []);
  const { loading, error, byProduct, importVentas, clearVentas, source } = useSharedSales(storageSuffix, {
    supabase,
    tenantId,
    branchId,
  });
  const handleCopyError = React.useCallback(async () => {
    if (!error) return;
    try {
      if (typeof navigator !== "undefined" && navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(error);
        return;
      }
    } catch (err) {
      console.warn("copy error message failed", err);
    }
    try {
      if (typeof document !== "undefined") {
        const textarea = document.createElement("textarea");
        textarea.value = error;
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
      console.warn("fallback copy failed", fallbackErr);
    }
    if (typeof window !== "undefined") {
      window.prompt("Copiá el mensaje de error:", error);
    }
  }, [error]);

  type UiState = {
    selectedNames: string[];
    from: string;
    to: string;
    gran: Granularity;
    colCount: number;
  };

  const TODAY_ISO = new Date().toISOString().slice(0, 10);
  const THIRTY_AGO_ISO = new Date(Date.now() - 30 * 24 * 3600 * 1000).toISOString().slice(0, 10);

  const UI_DEFAULTS: UiState = {
    selectedNames: [],
    from: THIRTY_AGO_ISO,
    to: TODAY_ISO,
    gran: "week",
    colCount: 8,
  };

  const uiKey = makeKey(UI_LS_KEY_BASE, storageSuffix);
  const [hydrated, setHydrated] = React.useState(false);
  const [ui, setUi] = React.useState<UiState>(UI_DEFAULTS);

  React.useEffect(() => {
    setHydrated(true);
    try {
      const raw = localStorage.getItem(uiKey);
      if (raw) {
        const saved = JSON.parse(raw) as Partial<UiState & { selectedName?: string }>;
        setUi((prev) => {
          const nextSelectedNames = Array.isArray(saved?.selectedNames)
            ? saved.selectedNames.filter((name): name is string => typeof name === "string" && name.trim().length > 0)
            : typeof saved?.selectedName === "string" && saved.selectedName.trim().length > 0
              ? [saved.selectedName]
              : prev.selectedNames;
          return {
            ...prev,
            ...saved,
            selectedNames: nextSelectedNames,
            gran:
              saved?.gran === "day" || saved?.gran === "month"
                ? saved.gran
                : saved?.gran === "week"
                  ? "week"
                  : prev.gran,
            colCount:
              typeof saved?.colCount === "number"
                ? Math.min(15, Math.max(1, saved.colCount))
                : prev.colCount,
          };
        });
      }
    } catch {
      /* ignore */
    }
  }, [uiKey]);

  React.useEffect(() => {
    if (!hydrated) return;
    try {
      localStorage.setItem(uiKey, JSON.stringify(ui));
    } catch (err) {
      console.warn("No se pudo persistir el estado de estadísticas", err);
    }
  }, [ui, hydrated, uiKey]);

  const selectedNames = ui.selectedNames;
  const from = ui.from;
  const to = ui.to;
  const gran = ui.gran;
  const colCount = ui.colCount;

  const setSelectedNames = React.useCallback((updater: React.SetStateAction<string[]>) => {
    setUi((s) => {
      const next =
        typeof updater === "function"
          ? // eslint-disable-next-line no-unused-vars
            (updater as (prev: string[]) => string[])(s.selectedNames)
          : updater;
      if (next === s.selectedNames) return s;
      return { ...s, selectedNames: next };
    });
  }, []);
  const setFrom = (v: string) => setUi((s) => ({ ...s, from: v }));
  const setTo = (v: string) => setUi((s) => ({ ...s, to: v }));
  const setGran = (v: Granularity) => setUi((s) => ({ ...s, gran: v }));
  const setColCount = (v: number) => setUi((s) => ({ ...s, colCount: v }));

  const [query, setQuery] = React.useState("");
  const [openDropdown, setOpenDropdown] = React.useState(false);
  const productSearchRef = React.useRef<HTMLDivElement | null>(null);

  React.useEffect(() => {
    if (!openDropdown) return;

    const handleClickOutside = (event: MouseEvent | TouchEvent) => {
      const container = productSearchRef.current;
      if (!container) return;
      const target = event.target;
      if (!(target instanceof Node)) return;
      if (container.contains(target)) return;
      setOpenDropdown(false);
    };

    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("touchstart", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("touchstart", handleClickOutside);
    };
  }, [openDropdown]);

  const productInputId = React.useId();
  const fromInputId = React.useId();
  const toInputId = React.useId();
  const granularitySelectId = React.useId();
  const columnsSliderId = React.useId();

  const productOptions = React.useMemo(() => {
    const names: string[] = [];
    for (const [, arr] of byProduct.entries()) if (arr.length > 0) names.push(arr[0].product);
    names.sort((a, b) => a.localeCompare(b));
    return names;
  }, [byProduct]);

  const filtered = React.useMemo(() => {
    const q = normKey(query);
    const words = q
      .split(/\s+/)
      .map((w) => w.trim())
      .filter(Boolean);
    if (!words.length) return productOptions.slice(0, 200);
    return productOptions
      .filter((n) => {
        const nk = normKey(n);
        return words.every((word) => nk.includes(word));
      })
      .slice(0, 200);
  }, [query, productOptions]);

  React.useEffect(() => {
    const validKeys = new Set<string>();
    for (const key of byProduct.keys()) validKeys.add(key);
    setSelectedNames((prev) => {
      if (!prev.length) return prev;
      const next = prev.filter((name) => validKeys.has(normKey(name)));
      if (next.length === prev.length) return prev;
      return next;
    });
  }, [byProduct, setSelectedNames]);

  const toggleProductSelection = React.useCallback(
    (name: string) => {
      setSelectedNames((prev) => {
        const has = prev.includes(name);
        const nextSet = new Set(prev);
        if (has) {
          nextSet.delete(name);
        } else {
          nextSet.add(name);
        }
        const ordered = productOptions.filter((opt) => nextSet.has(opt));
        if (ordered.length === prev.length && ordered.every((n, i) => n === prev[i])) return prev;
        return ordered;
      });
    },
    [productOptions, setSelectedNames]
  );

  const selectVisibleProducts = React.useCallback(() => {
    if (!filtered.length) return;
    setSelectedNames((prev) => {
      const nextSet = new Set(prev);
      for (const name of filtered) nextSet.add(name);
      const ordered = productOptions.filter((opt) => nextSet.has(opt));
      if (ordered.length === prev.length && ordered.every((n, i) => n === prev[i])) return prev;
      return ordered;
    });
  }, [filtered, productOptions, setSelectedNames]);

  const deselectVisibleProducts = React.useCallback(() => {
    if (!filtered.length) return;
    const visibleKeys = new Set(filtered.map((name) => normKey(name)));
    setSelectedNames((prev) => {
      if (!prev.length) return prev;
      const next = prev.filter((name) => !visibleKeys.has(normKey(name)));
      if (next.length === prev.length) return prev;
      return next;
    });
  }, [filtered, setSelectedNames]);

  const [weightQuery, setWeightQuery] = React.useState("");
  const [weightDropdownOpen, setWeightDropdownOpen] = React.useState(false);
  const weightSearchRef = React.useRef<HTMLDivElement | null>(null);
  const [weightSelectedIds, setWeightSelectedIds] = React.useState<string[]>([]);
  const [weightSelectedFilter, setWeightSelectedFilter] = React.useState("");
  const [weightPositionDrafts, setWeightPositionDrafts] = React.useState<Record<string, string>>({});

  React.useEffect(() => {
    if (!weightDropdownOpen) return;

    const handleClickOutside = (event: MouseEvent | TouchEvent) => {
      const container = weightSearchRef.current;
      if (!container) return;
      const target = event.target;
      if (!(target instanceof Node)) return;
      if (container.contains(target)) return;
      setWeightDropdownOpen(false);
    };

    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("touchstart", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("touchstart", handleClickOutside);
    };
  }, [weightDropdownOpen]);

  const todayIso = React.useMemo(() => new Date().toISOString().slice(0, 10), []);
  const defaultFromIso = React.useMemo(
    () => new Date(Date.now() - 7 * 24 * 3600 * 1000).toISOString().slice(0, 10),
    []
  );

  const [weightFrom, setWeightFrom] = React.useState(defaultFromIso);
  const [weightTo, setWeightTo] = React.useState(todayIso);
  const [weightHydrated, setWeightHydrated] = React.useState(false);
  const weightPersistRef = React.useRef<string | null>(null);

  const weightProducts = React.useMemo<WeightProductInfo[]>(() => {
    const entries: WeightProductInfo[] = [];
    for (const [key, arr] of byProduct.entries()) {
      if (!arr.length) continue;
      const name = arr[0].product;
      const searchKey = normKey(name);
      const unitKg = extractUnitKgFromName(name) ?? null;
      if (!looksLikeWeightProduct(searchKey, arr) && unitKg == null) continue;
      entries.push({
        key,
        name,
        searchKey,
        rows: arr,
        stats: computeStats(arr),
        unitKg,
      });
    }
    entries.sort((a, b) => a.name.localeCompare(b.name));
    return entries;
  }, [byProduct]);

  React.useEffect(() => {
    setWeightSelectedIds((prev) => {
      if (!prev.length) return prev;
      if (!weightProducts.length) return prev;
      const allowed = new Set(weightProducts.map((p) => p.key));
      const filteredIds = prev.filter((id) => allowed.has(id));
      return filteredIds.length === prev.length ? prev : filteredIds;
    });
  }, [weightProducts]);

  React.useEffect(() => {
    setWeightPositionDrafts((prev) => {
      const next = { ...prev };
      let changed = false;
      for (const key of Object.keys(next)) {
        if (!weightSelectedIds.includes(key)) {
          delete next[key];
          changed = true;
        }
      }
      return changed ? next : prev;
    });
  }, [weightSelectedIds]);

  React.useEffect(() => {
    if (!tenantId || !branchId || !supabase) {
      setWeightSelectedIds([]);
      setWeightFrom(defaultFromIso);
      setWeightTo(todayIso);
      setWeightHydrated(false);
      weightPersistRef.current = null;
      return;
    }

    setWeightHydrated(false);
    weightPersistRef.current = null;

    let alive = true;
    (async () => {
      try {
        const { data, error } = await supabase
          .from("app_settings")
          .select("value")
          .eq("tenant_id", tenantId)
          .eq("branch_id", branchId)
          .eq("key", weightSettingsKey)
          .maybeSingle();
        if (!alive) return;
        if (error && error.code !== "PGRST116") throw error;

        const raw = (data?.value ?? null) as { selectedIds?: unknown; from?: unknown; to?: unknown } | null;
        const nextSelected = Array.isArray(raw?.selectedIds)
          ? raw!.selectedIds.filter((id): id is string => typeof id === "string" && id.trim().length > 0)
          : [];
        const parsedFrom = typeof raw?.from === "string" && raw.from ? raw.from : defaultFromIso;
        const parsedTo = typeof raw?.to === "string" && raw.to ? raw.to : todayIso;
        const normalizedTo = parsedTo;
        const normalizedFrom = parsedFrom > normalizedTo ? normalizedTo : parsedFrom;

        setWeightSelectedIds(nextSelected);
        setWeightFrom(normalizedFrom);
        setWeightTo(normalizedTo);
        weightPersistRef.current = JSON.stringify({ selectedIds: nextSelected, from: normalizedFrom, to: normalizedTo });
        setWeightHydrated(true);
      } catch (err) {
        if (!alive) return;
        console.warn("[stats] weight settings load:", err instanceof Error ? err.message : String(err));
        setWeightSelectedIds([]);
        setWeightFrom(defaultFromIso);
        setWeightTo(todayIso);
        weightPersistRef.current = null;
        setWeightHydrated(true);
      }
    })();

    return () => {
      alive = false;
    };
  }, [tenantId, branchId, supabase, weightSettingsKey, defaultFromIso, todayIso]);

  const weightProductByKey = React.useMemo(() => {
    const map = new Map<string, WeightProductInfo>();
    for (const item of weightProducts) map.set(item.key, item);
    return map;
  }, [weightProducts]);

  const weightFiltered = React.useMemo(() => {
    if (!weightProducts.length) return [];
    const q = normKey(weightQuery);
    const words = q
      .split(/\s+/)
      .map((w) => w.trim())
      .filter(Boolean);
    if (!words.length) return weightProducts.slice(0, 200);
    return weightProducts
      .filter((item) => words.every((word) => item.searchKey.includes(word)))
      .slice(0, 200);
  }, [weightQuery, weightProducts]);

  const weightSelectedProducts = React.useMemo(() => {
    const selected: WeightProductInfo[] = [];
    for (const id of weightSelectedIds) {
      const item = weightProductByKey.get(id);
      if (item) selected.push(item);
    }
    return selected;
  }, [weightSelectedIds, weightProductByKey]);

  const selectVisibleWeights = React.useCallback(() => {
    if (!weightFiltered.length) return;
    setWeightSelectedIds((prev) => {
      const prevSet = new Set(prev);
      const additions = weightFiltered
        .map((item) => item.key)
        .filter((key) => !prevSet.has(key));
      if (!additions.length) return prev;
      return [...prev, ...additions];
    });
  }, [weightFiltered]);

  const deselectVisibleWeights = React.useCallback(() => {
    if (!weightFiltered.length) return;
    const visible = new Set(weightFiltered.map((item) => item.key));
    setWeightSelectedIds((prev) => {
      if (!prev.length) return prev;
      const filteredIds = prev.filter((id) => !visible.has(id));
      return filteredIds.length === prev.length ? prev : filteredIds;
    });
  }, [weightFiltered]);

  const toggleWeightSelection = React.useCallback((key: string, checked: boolean) => {
    setWeightSelectedIds((prev) => {
      const index = prev.indexOf(key);
      if (checked) {
        if (index !== -1) return prev;
        return [...prev, key];
      }
      if (index === -1) return prev;
      const next = [...prev];
      next.splice(index, 1);
      return next;
    });
  }, []);

  const moveWeightSelection = React.useCallback((key: string, delta: number) => {
    setWeightPositionDrafts((prev) => {
      if (!(key in prev)) return prev;
      const next = { ...prev };
      delete next[key];
      return next;
    });
    setWeightSelectedIds((prev) => {
      const currentIndex = prev.indexOf(key);
      if (currentIndex === -1) return prev;
      const nextIndex = currentIndex + delta;
      if (nextIndex < 0 || nextIndex >= prev.length) return prev;
      const next = [...prev];
      const [item] = next.splice(currentIndex, 1);
      next.splice(nextIndex, 0, item);
      return next;
    });
  }, []);

  const setWeightSelectionIndex = React.useCallback((key: string, targetIndex: number) => {
    setWeightPositionDrafts((prev) => {
      if (!(key in prev)) return prev;
      const next = { ...prev };
      delete next[key];
      return next;
    });
    setWeightSelectedIds((prev) => {
      const currentIndex = prev.indexOf(key);
      if (currentIndex === -1) return prev;
      if (!Number.isFinite(targetIndex)) return prev;
      const bounded = Math.min(Math.max(Math.round(targetIndex), 0), prev.length - 1);
      if (bounded === currentIndex) return prev;
      const next = [...prev];
      const [item] = next.splice(currentIndex, 1);
      next.splice(bounded, 0, item);
      return next;
    });
  }, []);

  const handleWeightPositionInputChange = React.useCallback((key: string, value: string) => {
    setWeightPositionDrafts((prev) => ({ ...prev, [key]: value }));
  }, []);

  const commitWeightPositionInput = React.useCallback(
    (key: string, rawValue: string) => {
      const parsed = Number.parseInt(rawValue, 10);
      if (Number.isFinite(parsed)) {
        setWeightSelectionIndex(key, parsed - 1);
      }
      setWeightPositionDrafts((prev) => {
        if (!(key in prev)) return prev;
        const next = { ...prev };
        delete next[key];
        return next;
      });
    },
    [setWeightSelectionIndex]
  );

  React.useEffect(() => {
    if (weightFrom && weightTo && weightFrom > weightTo) {
      setWeightFrom(weightTo);
    }
  }, [weightFrom, weightTo]);

  const weightRange = React.useMemo(() => {
    if (!weightFrom || !weightTo) return null;
    const start = new Date(weightFrom + "T00:00:00Z").getTime();
    const end = new Date(weightTo + "T00:00:00Z").getTime() + 24 * 3600 * 1000;
    return { start, end };
  }, [weightFrom, weightTo]);

  const computeWeightSummary = React.useCallback(
    (item: WeightProductInfo) => {
      if (!weightRange) {
        return { units: 0, kg: 0, subtotal: 0, usedFractional: false };
      }
      let totalUnits = 0;
      let totalKg = 0;
      let totalSubtotal = 0;
      let usedFractional = false;
      for (const row of item.rows) {
        if (row.date < weightRange.start || row.date >= weightRange.end) continue;
        if (row.qty <= 0) continue;
        const qty = row.qty;
        const fractional = isFractionalQuantity(qty);
        if (row.subtotal != null && Number.isFinite(row.subtotal)) {
          totalSubtotal += row.subtotal;
        }
        if (fractional) usedFractional = true;
        totalUnits += qty;
        if (fractional) {
          totalKg += qty;
        } else if (item.unitKg != null) {
          totalKg += qty * item.unitKg;
        } else {
          totalKg += qty;
        }
      }
      return { units: totalUnits, kg: totalKg, subtotal: totalSubtotal, usedFractional };
    },
    [weightRange]
  );

  const weightSummaries = React.useMemo(() => {
    return weightSelectedProducts.map((item) => ({
      item,
      summary: computeWeightSummary(item),
    }));
  }, [weightSelectedProducts, computeWeightSummary]);

  const filteredWeightSummaries = React.useMemo(() => {
    const trimmed = normKey(weightSelectedFilter);
    const words = trimmed
      .split(/\s+/)
      .map((w) => w.trim())
      .filter(Boolean);
    if (!words.length) return weightSummaries;
    return weightSummaries.filter(({ item }) => words.every((word) => item.searchKey.includes(word)));
  }, [weightSummaries, weightSelectedFilter]);

  const weightTotals = React.useMemo(() => {
    return weightSummaries.reduce(
      (acc, { summary }) => {
        acc.units += summary.units;
        acc.kg += summary.kg;
        acc.subtotal += summary.subtotal;
        return acc;
      },
      { units: 0, kg: 0, subtotal: 0 }
    );
  }, [weightSummaries]);

  const filteredWeightTotals = React.useMemo(() => {
    return filteredWeightSummaries.reduce(
      (acc, { summary }) => {
        acc.units += summary.units;
        acc.kg += summary.kg;
        acc.subtotal += summary.subtotal;
        return acc;
      },
      { units: 0, kg: 0, subtotal: 0 }
    );
  }, [filteredWeightSummaries]);

  const filteredWeightTotalsHaveFractional = React.useMemo(
    () => filteredWeightSummaries.some(({ summary }) => summary.usedFractional),
    [filteredWeightSummaries]
  );

  const setWeightQuick = React.useCallback(
    (days: number) => {
      if (!weightTo) return;
      const end = new Date(weightTo + "T00:00:00");
      const start = new Date(end.getTime() - days * 24 * 3600 * 1000);
      setWeightFrom(start.toISOString().slice(0, 10));
    },
    [weightTo]
  );

  React.useEffect(() => {
    if (!weightHydrated) return;
    if (!tenantId || !branchId || !tenantSlug) return;

    const payload = {
      selectedIds: weightSelectedIds,
      from: weightFrom,
      to: weightTo,
    };
    const serialized = JSON.stringify(payload);
    if (weightPersistRef.current === serialized) return;

    if (typeof window === "undefined") return;

    const controller = new AbortController();
    const timeout = window.setTimeout(() => {
      fetch(`/api/t/${tenantSlug}/settings`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          scope: "branch",
          key: weightSettingsKey,
          branchId,
          value: payload,
        }),
        signal: controller.signal,
      })
        .then((res) => {
          if (!res.ok) throw new Error(`HTTP ${res.status}`);
          weightPersistRef.current = serialized;
        })
        .catch((err) => {
          if (controller.signal.aborted) return;
          console.warn("[stats] weight settings save:", err instanceof Error ? err.message : String(err));
        });
    }, 500);

    return () => {
      clearTimeout(timeout);
      controller.abort();
    };
  }, [weightHydrated, tenantId, branchId, tenantSlug, weightSettingsKey, weightSelectedIds, weightFrom, weightTo]);

  const canShowStats = Boolean(tenantId && currentBranch);

  const selectedProducts = React.useMemo<SelectedProduct[]>(() => {
    if (!selectedNames.length) return [];
    const entries: SelectedProduct[] = [];
    for (const name of selectedNames) {
      const key = normKey(name);
      const rows = byProduct.get(key);
      if (!rows || rows.length === 0) continue;
      entries.push({ key, name, rows });
    }
    return entries;
  }, [selectedNames, byProduct]);

  const combinedRows = React.useMemo(() => {
    if (!selectedProducts.length) return [] as SalesRow[];
    const merged = selectedProducts.flatMap((item) => item.rows);
    return merged.slice().sort((a, b) => b.date - a.date);
  }, [selectedProducts]);

  const productStats = React.useMemo(
    () => selectedProducts.map((item) => ({ ...item, stats: computeStats(item.rows) })),
    [selectedProducts]
  );

  const combinedStats = React.useMemo<Stats>(
    () => (combinedRows.length ? computeStats(combinedRows) : EMPTY_STATS),
    [combinedRows]
  );

  function setQuick(days: number) {
    const end = new Date(to + "T00:00:00");
    const start = new Date(end.getTime() - days * 24 * 3600 * 1000);
    setFrom(start.toISOString().slice(0, 10));
  }

  type Bin = { key: string; label: string; start: number; end: number };
  const bins: Bin[] = React.useMemo(() => {
    if (!from || !to) return [];
    const start = new Date(from + "T00:00:00Z").getTime();
    const endIncl = new Date(to + "T00:00:00Z").getTime() + 24 * 3600 * 1000;

    if (gran === "day") {
      const tmp: Bin[] = [];
      for (let t = endIncl - 24 * 3600 * 1000; t >= start; t -= 24 * 3600 * 1000) {
        const label = new Date(t).toLocaleDateString("es-AR");
        tmp.push({ key: `d:${label}`, label, start: t, end: t + 24 * 3600 * 1000 });
      }
      return tmp.slice(0, colCount);
    }

    if (gran === "month") {
      const fmt = new Intl.DateTimeFormat("es-AR", { month: "short", year: "numeric" });
      const startOfMonthUTC = (ms: number) => {
        const d = new Date(ms);
        return Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), 1);
      };
      const addMonthsUTC = (ms: number, delta: number) => {
        const d = new Date(ms);
        return Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + delta, 1);
      };
      let t = startOfMonthUTC(endIncl - 1);
      const tmp: Bin[] = [];
      for (let i = 0; i < 120; i++) {
        const s = t;
        const e = addMonthsUTC(s, 1);
        if (e <= start) break;
        const label = fmt.format(new Date(s));
        tmp.push({ key: `m:${s}`, label, start: s, end: e });
        t = addMonthsUTC(s, -1);
      }
      return tmp.slice(0, colCount);
    }

    const startOfISOWeek = (ms: number) => {
      const d = new Date(ms);
      const day = (d.getUTCDay() + 6) % 7;
      const monday = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
      monday.setUTCDate(monday.getUTCDate() - day);
      return monday.getTime();
    };
    let t = startOfISOWeek(endIncl - 1);
    const tmp: Bin[] = [];
    for (let i = 0; i < 120; i++) {
      const s = t;
      const e = t + 7 * 24 * 3600 * 1000;
      if (e <= start) break;
      const label = `Sem ${new Date(s).toLocaleDateString("es-AR")}`;
      tmp.push({ key: `w:${s}`, label, start: s, end: e });
      t = s - 7 * 24 * 3600 * 1000;
    }
    return tmp.slice(0, colCount);
  }, [from, to, gran, colCount]);

  const pivotRows = React.useMemo(() => {
    if (!bins.length || !productStats.length) return [] as { key: string; name: string; values: number[] }[];
    return productStats.map((item) => {
      const values = bins.map((b) => {
        let sum = 0;
        for (const r of item.rows) if (r.date >= b.start && r.date < b.end && r.qty > 0) sum += r.qty;
        return sum;
      });
      return { key: item.key, name: item.name, values };
    });
  }, [bins, productStats]);

  const pivotTotals = React.useMemo(() => {
    if (!bins.length || !combinedRows.length) return [] as number[];
    return bins.map((b) => {
      let sum = 0;
      for (const r of combinedRows) if (r.date >= b.start && r.date < b.end && r.qty > 0) sum += r.qty;
      return sum;
    });
  }, [bins, combinedRows]);

  const rangeRows = React.useMemo(() => {
    if (!combinedRows.length) return [] as SalesRow[];
    const s = new Date(from + "T00:00:00Z").getTime();
    const e = new Date(to + "T00:00:00Z").getTime() + 24 * 3600 * 1000;
    return combinedRows.filter((r) => r.date >= s && r.date < e);
  }, [combinedRows, from, to]);
  const sumQtyInRange = rangeRows.reduce((acc, r) => acc + (r.qty > 0 ? r.qty : 0), 0);

  const ventasInputRef = React.useRef<HTMLInputElement | null>(null);
  const meta = source.meta ?? undefined;
  const metaLabel =
    source.kind === "imported"
      ? `Importada${meta?.filename ? ` · ${meta.filename}` : ""}${meta?.ts ? ` · ${new Date(meta.ts).toLocaleString("es-AR")}` : ""}${meta?.size ? ` · ${(meta.size / 1024).toFixed(0)} KB` : ""}`
      : `Default ${VENTAS_URL}`;

  return (
    <main className="p-3 max-w-screen-lg mx-auto space-y-3">
      {!canShowStats ? (
        <Card>
          <CardContent className="p-4 text-sm text-muted-foreground">
            Seleccioná una sucursal para ver las estadísticas de ventas.
          </CardContent>
        </Card>
      ) : (
        <>
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <h1 className="text-xl font-semibold">Estadística</h1>
            <div className="flex flex-col sm:flex-row sm:items-center gap-2 w-full sm:w-auto">
              <div className="text-xs text-muted-foreground break-words">
                Fuente ventas: <span className="font-medium">{metaLabel}</span>
              </div>
              <div className="flex items-center gap-2">
                <input
                  ref={ventasInputRef}
                  type="file"
                  accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
                  className="hidden"
                  onChange={async (e) => {
                    const input = e.currentTarget;
                    const f = input.files?.[0];
                    if (!f) {
                      input.value = "";
                      return;
                    }
                    try {
                      await importVentas(f);
                    } finally {
                      input.value = "";
                    }
                  }}
                />
                <Button variant="outline" onClick={() => ventasInputRef.current?.click()} disabled={loading}>
                  {loading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Upload className="w-4 h-4 mr-2" />}
                  Importar ventas
                </Button>
                <Button variant="ghost" onClick={clearVentas} disabled={loading}>
                  Borrar fuente
                </Button>
              </div>
            </div>
          </div>

          <Card>
            <CardContent className="p-3 space-y-4">
              <div className="grid gap-3 lg:grid-cols-12 lg:items-end">
                <div ref={productSearchRef} className="relative lg:col-span-4 min-w-0">
                  <label className="text-sm font-medium" htmlFor={productInputId}>Elegí artículos</label>
                  <Input
                    id={productInputId}
                    className="w-full"
                    placeholder="Buscar productos…"
                    value={query}
                    onChange={(e) => {
                      setQuery(e.target.value);
                      setOpenDropdown(true);
                    }}
                    onFocus={() => setOpenDropdown(true)}
                    onKeyDown={(event) => {
                      if (event.key === "Escape") {
                        setOpenDropdown(false);
                        (event.currentTarget as HTMLInputElement).blur();
                      }
                    }}
                  />
                  {openDropdown && (
                    <div className="absolute z-50 mt-1 w-full rounded-md border bg-popover text-popover-foreground shadow-md">
                      {filtered.length === 0 ? (
                        <div className="p-2 text-sm text-muted-foreground">Sin resultados…</div>
                      ) : (
                        <>
                          <div className="sticky top-0 z-10 flex flex-wrap gap-2 border-b bg-popover/95 p-2 backdrop-blur supports-[backdrop-filter]:bg-popover/60">
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={selectVisibleProducts}
                              disabled={!filtered.length}
                            >
                              Seleccionar visibles
                            </Button>
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={deselectVisibleProducts}
                              disabled={!filtered.length || selectedNames.length === 0}
                            >
                              Deseleccionar visibles
                            </Button>
                          </div>
                          <div className="max-h-64 overflow-auto">
                            {filtered.map((name) => {
                              const checked = selectedNames.includes(name);
                              const safeId = `product-${normKey(name)}`;
                              const lastSale = byProduct.get(normKey(name))?.[0]?.date;
                              return (
                                <div key={name} className="flex items-start gap-3 px-3 py-2 text-sm hover:bg-muted/60">
                                  <Checkbox
                                    id={safeId}
                                    checked={checked}
                                    onCheckedChange={() => toggleProductSelection(name)}
                              />
                              <label htmlFor={safeId} className="flex-1 cursor-pointer select-none">
                                <p className="font-medium leading-tight">{name}</p>
                                <p className="text-xs text-muted-foreground">
                                  Última venta: {formatLastSale(lastSale)}
                                </p>
                              </label>
                            </div>
                          );
                        })}
                      </div>
                    </>
                  )}
                </div>
              )}
              {selectedNames.length > 0 && (
                <div className="mt-2 flex flex-wrap gap-2">
                  {selectedNames.map((name) => (
                    <Button
                      key={name}
                      type="button"
                      size="sm"
                      variant="secondary"
                      className="h-7 rounded-full px-3 text-xs"
                      onClick={() => toggleProductSelection(name)}
                    >
                      <span className="truncate max-w-[160px]" title={name}>{name}</span>
                      <span className="ml-1 text-[10px] uppercase tracking-wide">x</span>
                    </Button>
                  ))}
                </div>
              )}
            </div>

            <div className="lg:col-span-4">
              <div className="flex flex-wrap gap-2">
                <Button variant="outline" onClick={() => setQuick(7)}>7d</Button>
                <Button variant="outline" onClick={() => setQuick(14)}>14d</Button>
                <Button variant="outline" onClick={() => setQuick(30)}>30d</Button>
                <Button variant="outline" onClick={() => setQuick(60)}>60d</Button>
                <Button variant="outline" onClick={() => setQuick(90)}>90d</Button>
                <Button variant="outline" onClick={() => setQuick(180)}>180d</Button>
              </div>
            </div>

            <div className="min-w-0 lg:col-span-2">
              <label className="text-sm font-medium" htmlFor={fromInputId}>Desde</label>
              <Input id={fromInputId} className="w-full" type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
            </div>

            <div className="min-w-0 lg:col-span-2">
              <label className="text-sm font-medium" htmlFor={toInputId}>Hasta</label>
              <Input id={toInputId} className="w-full" type="date" value={to} onChange={(e) => setTo(e.target.value)} />
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-2">
              <label className="text-sm font-medium" htmlFor={granularitySelectId}>Granularidad</label>
              <select
                id={granularitySelectId}
                className="border rounded-md p-2 text-sm bg-background"
                value={gran}
                onChange={(e) => setGran(e.target.value as Granularity)}
              >
                <option value="week">Semana (ISO)</option>
                <option value="day">Día</option>
                <option value="month">Mes</option>
              </select>
            </div>
            <div className="flex items-center gap-2 min-w-0">
              <label className="text-sm font-medium" htmlFor={columnsSliderId}>Columnas</label>
              <div className="w-48">
                <Slider
                  id={columnsSliderId}
                  value={[colCount]}
                  min={1}
                  max={15}
                  step={1}
                  onValueChange={(v) => setColCount(v[0])}
                />
              </div>
              <span className="text-xs text-muted-foreground">{colCount}</span>
            </div>
          </div>

          {productStats.length > 0 && (
            <div className="space-y-1 text-sm text-muted-foreground">
              <div className="break-words">
                <span className="font-medium">Productos seleccionados ({productStats.length}):</span> {productStats.map((item) => item.name).join(", ")}
              </div>
              <div>
                <span className="font-medium">Total seleccionado:</span> Promedio 4 semanas {combinedStats.avg4w.toFixed(2)} • Ventas 14 días {combinedStats.sum2w.toFixed(2)} • Ventas 30 días {combinedStats.sum30d.toFixed(2)}
              </div>
              <div>
                Último precio registrado: {combinedStats.lastUnitPrice != null ? `$${combinedStats.lastUnitPrice.toFixed(2)}` : "—"} • Última venta: {formatLastSale(combinedStats.lastDate)}
              </div>
            </div>
          )}

          {productStats.length > 0 && (
            <div className="rounded-md border overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="[&>th]:px-3 [&>th]:py-2 border-b">
                    <th className="w-[220px] min-w-[220px] text-left">Producto</th>
                    {bins.map((b) => (
                      <th
                        key={b.key}
                        className="text-center min-w-[90px] w-[90px] px-2"
                        title={`${dateShort(b.start)} → ${dateShort(b.end - 1)}`}
                      >
                        {b.label}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {pivotRows.map((row) => (
                    <tr key={row.key} className="[&>td]:px-3 [&>td]:py-2 border-b">
                      <td className="text-left">{row.name}</td>
                      {row.values.map((v, i) => (
                        <td key={`${row.key}-${i}`} className="text-center tabular-nums">{v}</td>
                      ))}
                    </tr>
                  ))}
                </tbody>
                {pivotTotals.length > 0 && (
                  <tfoot>
                    <tr className="font-semibold [&>td]:px-3 [&>td]:py-2">
                      <td>Total seleccionado</td>
                      {pivotTotals.map((v, i) => (
                        <td key={`total-${i}`} className="text-center tabular-nums">{v}</td>
                      ))}
                    </tr>
                  </tfoot>
                )}
              </table>
            </div>
          )}

          {productStats.length > 0 && (
            <div className="rounded-md border">
              <div className="px-3 py-2 border-b font-semibold">Ventas en el período</div>
              <div className="max-h-[50vh] overflow-auto">
                <table className="w-full text-sm">
                  <thead className="sticky top-0 bg-background">
                    <tr className="[&>th]:px-3 [&>th]:py-2 border-b">
                      <th className="text-left">Fecha</th>
                      <th className="text-left">Producto</th>
                      <th className="text-right">Cantidad</th>
                      <th className="text-right">Subtotal</th>
                      <th className="text-right">Precio unitario</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rangeRows.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="p-3 text-center text-muted-foreground">
                          No hay ventas en el período seleccionado.
                        </td>
                      </tr>
                    ) : (
                      rangeRows.map((r, i) => (
                        <tr key={i} className="[&>td]:px-3 [&>td]:py-2 border-b">
                          <td>{dateTimeShort(r.date)}</td>
                          <td>{r.product}</td>
                          <td className="text-right tabular-nums">{r.qty}</td>
                          <td className="text-right tabular-nums">{r.subtotal != null ? `$${r.subtotal.toFixed(2)}` : "—"}</td>
                          <td className="text-right tabular-nums">{r.unitPrice != null ? `$${r.unitPrice.toFixed(2)}` : "—"}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                  <tfoot>
                    <tr className="font-semibold">
                      <td className="px-3 py-2" colSpan={2}>
                        Total del período
                      </td>
                      <td className="px-3 py-2 text-right tabular-nums">{sumQtyInRange}</td>
                      <td></td>
                      <td></td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>
          )}

          {error && (
            <div className="flex items-start gap-3 rounded-md border border-amber-300 bg-amber-50 px-3 py-2 text-sm text-amber-900">
              <p className="flex-1 whitespace-pre-wrap break-words">{error}</p>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleCopyError}
                className="shrink-0 border-amber-400 text-amber-900 hover:bg-amber-100"
              >
                Copiar
              </Button>
            </div>
          )}
          </CardContent>
        </Card>

        <Accordion type="single" collapsible className="rounded-xl border bg-card text-card-foreground">
          <AccordionItem value="peso">
            <AccordionTrigger className="px-4 py-3 text-left hover:no-underline">
            <div className="flex w-full items-center justify-between gap-3">
              <div className="min-w-0">
                <p className="text-sm font-semibold">Artículos por peso</p>
                <p className="text-xs text-muted-foreground">
                  {weightProducts.length === 0
                    ? "Sin artículos identificados en la fuente actual"
                    : `Seleccionados ${weightSelectedIds.length} · Kg en rango ${formatKg(weightTotals.kg)} · Coincidencias ${weightFiltered.length}/${weightProducts.length}`}
                </p>
              </div>
            </div>
          </AccordionTrigger>
          <AccordionContent className="px-4 pb-4 space-y-4" style={{ overflow: "visible" }}>
            <div className="space-y-3">
              <div ref={weightSearchRef} className="relative min-w-0">
                <label className="text-sm font-medium" htmlFor="weight-search">
                  Buscar artículo
                </label>
                <Input
                  id="weight-search"
                  className="w-full"
                  placeholder="Buscar producto por peso…"
                  value={weightQuery}
                  onChange={(e) => {
                    setWeightQuery(e.target.value);
                    setWeightDropdownOpen(true);
                  }}
                  onFocus={() => setWeightDropdownOpen(true)}
                  onKeyDown={(event) => {
                    if (event.key === "Escape") {
                      setWeightDropdownOpen(false);
                      (event.currentTarget as HTMLInputElement).blur();
                    }
                  }}
                />
                {weightDropdownOpen && (
                  <div className="absolute z-50 mt-1 w-full rounded-md border bg-popover text-popover-foreground shadow-md">
                    {weightProducts.length === 0 ? (
                      <div className="p-2 text-sm text-muted-foreground">
                        No encontramos artículos que parezcan venderse por peso en la fuente actual.
                      </div>
                    ) : weightFiltered.length === 0 ? (
                      <div className="p-2 text-sm text-muted-foreground">Sin resultados…</div>
                    ) : (
                      <>
                        <div className="sticky top-0 z-10 flex flex-wrap gap-2 border-b bg-popover/95 p-2 backdrop-blur supports-[backdrop-filter]:bg-popover/60">
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={selectVisibleWeights}
                            disabled={!weightFiltered.length}
                          >
                            Seleccionar visibles
                          </Button>
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={deselectVisibleWeights}
                            disabled={!weightFiltered.length}
                          >
                            Deseleccionar visibles
                          </Button>
                        </div>
                        <div className="max-h-64 overflow-auto divide-y">
                          {weightFiltered.map((item) => {
                            const checked = weightSelectedIds.includes(item.key);
                            const lastDateLabel = formatLastSale(item.stats.lastDate);
                            const safeId = `weight-${item.key.replace(/[^a-z0-9_-]/g, "-")}`;
                            return (
                              <div
                                key={item.key}
                                className="flex items-start gap-3 px-3 py-2 text-sm hover:bg-muted/60"
                              >
                                <Checkbox
                                  id={safeId}
                                  checked={checked}
                                  onCheckedChange={(state) => toggleWeightSelection(item.key, state === true)}
                                />
                                <label htmlFor={safeId} className="flex-1 cursor-pointer select-none">
                                  <p className="font-medium leading-tight">{item.name}</p>
                                  <p className="text-xs text-muted-foreground">
                                    Última venta: {lastDateLabel}
                                    {item.unitKg != null ? ` · ${formatKg(item.unitKg)} kg/unidad` : ""}
                                  </p>
                                </label>
                              </div>
                            );
                          })}
                        </div>
                      </>
                    )}
                  </div>
                )}
              </div>

              <div className="flex flex-wrap items-end gap-3">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium">Rango rápido</span>
                  <Button type="button" size="sm" variant="secondary" onClick={() => setWeightQuick(7)}>
                    7d
                  </Button>
                  <Button type="button" size="sm" variant="outline" onClick={() => setWeightQuick(14)}>
                    14d
                  </Button>
                  <Button type="button" size="sm" variant="outline" onClick={() => setWeightQuick(30)}>
                    30d
                  </Button>
                </div>
                <div className="flex items-center gap-2">
                  <label className="text-sm font-medium" htmlFor="weight-from">
                    Desde
                  </label>
                  <Input
                    id="weight-from"
                    type="date"
                    value={weightFrom}
                    max={weightTo}
                    onChange={(e) => setWeightFrom(e.target.value)}
                    className="w-40"
                  />
                </div>
                <div className="flex items-center gap-2">
                  <label className="text-sm font-medium" htmlFor="weight-to">
                    Hasta
                  </label>
                  <Input
                    id="weight-to"
                    type="date"
                    value={weightTo}
                    min={weightFrom}
                    max={todayIso}
                    onChange={(e) => setWeightTo(e.target.value)}
                    className="w-40"
                  />
                </div>
              </div>
            </div>
            {weightSummaries.length > 0 && (
              <div className="rounded-md border">
                <div className="space-y-2 border-b px-3 py-2">
                  <div className="text-sm font-semibold">
                    Artículos seleccionados ({filteredWeightSummaries.length}/{weightSummaries.length})
                  </div>
                  <Input
                    placeholder="Filtrar artículos seleccionados…"
                    value={weightSelectedFilter}
                    onChange={(event) => setWeightSelectedFilter(event.target.value)}
                  />
                </div>
                <div className="overflow-auto">
                  <table className="w-full text-sm">
                    <thead className="sticky top-0 bg-background">
                      <tr className="border-b text-xs font-medium text-muted-foreground uppercase tracking-wide">
                        <th className="px-3 py-2 text-left">Posición</th>
                        <th className="px-3 py-2 text-left">Producto</th>
                        <th className="px-3 py-2 text-left">Última venta</th>
                        <th className="px-3 py-2 text-right">Kg vendidos</th>
                        <th className="px-3 py-2 text-right">Unidades registradas</th>
                        <th className="px-3 py-2 text-right">Kg / unidad</th>
                        <th className="px-3 py-2 text-right">Subtotal</th>
                        <th className="px-3 py-2 text-right">Acciones</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredWeightSummaries.length === 0 ? (
                        <tr>
                          <td colSpan={8} className="px-3 py-4 text-center text-muted-foreground">
                            Sin coincidencias para esta búsqueda.
                          </td>
                        </tr>
                      ) : (
                        filteredWeightSummaries.map(({ item, summary }) => {
                          const position = weightSelectedIds.indexOf(item.key);
                          const displayValue = weightPositionDrafts[item.key] ?? String(position + 1);
                          const isFirst = position <= 0;
                          const isLast = position === weightSelectedIds.length - 1;

                          return (
                            <tr key={`selected-${item.key}`} className="border-b [&>td]:py-2">
                              <td className="px-3 align-top">
                                <div className="flex items-center gap-2">
                                  <Input
                                    type="number"
                                    min={1}
                                    max={weightSelectedIds.length}
                                    value={displayValue}
                                    onChange={(event) => handleWeightPositionInputChange(item.key, event.target.value)}
                                    onBlur={(event) => commitWeightPositionInput(item.key, event.target.value)}
                                    onKeyDown={(event) => {
                                      if (event.key === "Enter") {
                                        event.preventDefault();
                                        commitWeightPositionInput(item.key, event.currentTarget.value);
                                        (event.currentTarget as HTMLInputElement).blur();
                                      }
                                    }}
                                    className="h-8 w-16"
                                  />
                                  <div className="flex flex-col gap-1">
                                    <Button
                                      type="button"
                                      size="icon"
                                      variant="ghost"
                                      className="h-7 w-7"
                                      onClick={() => moveWeightSelection(item.key, -1)}
                                      disabled={isFirst}
                                    >
                                      <ArrowUp className="h-4 w-4" />
                                    </Button>
                                    <Button
                                      type="button"
                                      size="icon"
                                      variant="ghost"
                                      className="h-7 w-7"
                                      onClick={() => moveWeightSelection(item.key, 1)}
                                      disabled={isLast}
                                    >
                                      <ArrowDown className="h-4 w-4" />
                                    </Button>
                                  </div>
                                </div>
                              </td>
                              <td className="px-3 font-medium">{item.name}</td>
                              <td className="px-3 text-xs text-muted-foreground">{formatLastSale(item.stats.lastDate)}</td>
                              <td className="px-3 text-right tabular-nums">{formatKg(summary.kg)}</td>
                              <td className="px-3 text-right tabular-nums">{formatQuantity(summary.units)}</td>
                              <td className="px-3 text-right tabular-nums">
                                {item.unitKg != null
                                  ? formatKg(item.unitKg)
                                  : summary.usedFractional || summary.units <= 0
                                    ? "—"
                                    : formatKg(summary.kg / summary.units)}
                              </td>
                              <td className="px-3 text-right tabular-nums">{formatCurrency(summary.subtotal)}</td>
                              <td className="px-3 text-right">
                                <Button
                                  type="button"
                                  size="sm"
                                  variant="ghost"
                                  className="h-7 px-2 text-xs"
                                  onClick={() => toggleWeightSelection(item.key, false)}
                                >
                                  Quitar
                                </Button>
                              </td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                    {filteredWeightSummaries.length > 0 && (
                      <tfoot>
                        <tr className="font-semibold">
                          <td className="px-3 py-2 text-left" colSpan={3}>
                            Totales
                          </td>
                          <td className="px-3 py-2 text-right tabular-nums">{formatKg(filteredWeightTotals.kg)}</td>
                          <td className="px-3 py-2 text-right tabular-nums">{formatQuantity(filteredWeightTotals.units)}</td>
                          <td className="px-3 py-2 text-right tabular-nums">
                            {filteredWeightTotalsHaveFractional || filteredWeightTotals.units <= 0
                              ? "—"
                              : formatKg(filteredWeightTotals.kg / filteredWeightTotals.units)}
                          </td>
                          <td className="px-3 py-2 text-right tabular-nums">{formatCurrency(filteredWeightTotals.subtotal)}</td>
                          <td></td>
                        </tr>
                      </tfoot>
                    )}
                  </table>
                </div>
              </div>
            )}
          </AccordionContent>
        </AccordionItem>
      </Accordion>
        </>
      )}
    </main>
  );
}
