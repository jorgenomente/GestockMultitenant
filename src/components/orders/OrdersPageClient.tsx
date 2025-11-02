"use client";

import React from "react";
import * as XLSX from "xlsx";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Slider } from "@/components/ui/slider";
import { Loader2, Upload } from "lucide-react";
import { createDemoSalesMap } from "./demoData";

/* ========= Tipos ========= */
type SalesRow = {
  product: string;
  qty: number;
  date: number; // epoch ms UTC
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
  ts?: number; // epoch ms
  size?: number; // bytes
  storage: "idb" | "local-b64" | "default" | "demo";
};

type RawSalesRow = Record<string, string | number | null | undefined>;

type OrdersPageClientProps = {
  variant?: "real" | "demo";
  defaultData?: Map<string, SalesRow[]>;
};

type OrdersPageClientConfig = {
  ventasUrl: string | null;
  salesLegacyKey: string;
  salesMetaKey: string;
  broadcastChannel: string;
  uiKey: string;
  idbDatabase: string;
  idbStore: string;
  idbSalesKey: string;
};

const CONFIGS: Record<"real" | "demo", OrdersPageClientConfig> = {
  real: {
    ventasUrl: "/ventas.xlsx",
    salesLegacyKey: "gestock:sales:last",
    salesMetaKey: "gestock:sales:meta:v2",
    broadcastChannel: "gestock:sales:bc",
    uiKey: "gestock:stats:ui:v1",
    idbDatabase: "gestock",
    idbStore: "blobs",
    idbSalesKey: "sales:last",
  },
  demo: {
    ventasUrl: null,
    salesLegacyKey: "gestock-demo:sales:last",
    salesMetaKey: "gestock-demo:sales:meta:v2",
    broadcastChannel: "gestock-demo:sales:bc",
    uiKey: "gestock-demo:stats:ui:v1",
    idbDatabase: "gestock-demo",
    idbStore: "blobs",
    idbSalesKey: "sales:last",
  },
};

/* ========= Utils ========= */
const NBSP_RX = /[\u00A0\u202F]/g;
const DIAC_RX = /\p{Diacritic}/gu;
const normText = (s: string) => s.replace(NBSP_RX, " ").trim();
const normKey = (s: string) =>
  normText(s).normalize("NFD").replace(DIAC_RX, "").toLowerCase();

function toEpochMs(v: string | number | Date | null | undefined): number | null {
  if (v == null || v === "") return null;
  if (v instanceof Date) {
    const time = v.getTime();
    return Number.isNaN(time) ? null : time;
  }
  if (typeof v === "number") {
    const d = XLSX.SSF.parse_date_code(v);
    if (!d) return null;
    return Date.UTC(d.y, d.m - 1, d.d);
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
      return Date.UTC(year, parseInt(mm, 10) - 1, parseInt(dd, 10));
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

const dateShort = (ts: number) => new Date(ts).toLocaleDateString("es-AR");
const weekdayFmt = new Intl.DateTimeFormat("es-AR", { weekday: "long" });
const dateFmt = new Intl.DateTimeFormat("es-AR", { day: "2-digit", month: "2-digit", year: "numeric" });
const formatLastSale = (ts?: number) => (!ts ? "—" : `${weekdayFmt.format(new Date(ts))} ${dateFmt.format(new Date(ts))}`);

const getErrorMessage = (error: unknown) => {
  if (error instanceof Error) return error.message;
  if (error == null) return "Error desconocido";
  return String(error);
};

function cloneSalesMap(map: Map<string, SalesRow[]>): Map<string, SalesRow[]> {
  return new Map(
    Array.from(map.entries(), ([key, rows]) => [key, rows.map((row) => ({ ...row }))])
  );
}

/* ========= IndexedDB helpers (smart open & auto-upgrade) ========= */
function createIdbHelpers(config: OrdersPageClientConfig) {
  const { idbDatabase, idbStore } = config;

  async function idbOpenSmart(): Promise<IDBDatabase> {
    try {
      const db = await new Promise<IDBDatabase>((resolve, reject) => {
        const req = indexedDB.open(idbDatabase);
        req.onsuccess = () => resolve(req.result);
        req.onerror = () => reject(req.error);
        req.onupgradeneeded = () => {
          const dbRef = req.result;
          if (!dbRef.objectStoreNames.contains(idbStore)) dbRef.createObjectStore(idbStore);
        };
      });

      if (!db.objectStoreNames.contains(idbStore)) {
        const nextVersion = (db.version || 1) + 1;
        db.close();
        return await new Promise<IDBDatabase>((resolve, reject) => {
          const req2 = indexedDB.open(idbDatabase, nextVersion);
          req2.onupgradeneeded = () => {
            const db2 = req2.result;
            if (!db2.objectStoreNames.contains(idbStore)) db2.createObjectStore(idbStore);
          };
          req2.onsuccess = () => resolve(req2.result);
          req2.onerror = () => reject(req2.error);
        });
      }

      return db;
    } catch (err: unknown) {
      if (err instanceof DOMException && err.name === "VersionError") {
        return await new Promise<IDBDatabase>((resolve, reject) => {
          const req = indexedDB.open(idbDatabase);
          req.onsuccess = () => resolve(req.result);
          req.onerror = () => reject(req.error);
        });
      }
      if (typeof err === "object" && err && "name" in err && (err as { name?: string }).name === "VersionError") {
        return await new Promise<IDBDatabase>((resolve, reject) => {
          const req = indexedDB.open(idbDatabase);
          req.onsuccess = () => resolve(req.result);
          req.onerror = () => reject(req.error);
        });
      }
      throw err;
    }
  }

  return {
    async get<T = unknown>(key: string): Promise<T | undefined> {
      const db = await idbOpenSmart();
      return new Promise((resolve, reject) => {
        const tx = db.transaction(idbStore, "readonly");
        const st = tx.objectStore(idbStore);
        const req = st.get(key);
        req.onsuccess = () => resolve(req.result as T | undefined);
        req.onerror = () => reject(req.error);
      });
    },
    async set(key: string, value: ArrayBuffer): Promise<void> {
      const db = await idbOpenSmart();
      return new Promise((resolve, reject) => {
        const tx = db.transaction(idbStore, "readwrite");
        const st = tx.objectStore(idbStore);
        const req = st.put(value, key);
        req.onsuccess = () => resolve();
        req.onerror = () => reject(req.error);
      });
    },
    async del(key: string): Promise<void> {
      const db = await idbOpenSmart();
      return new Promise((resolve, reject) => {
        const tx = db.transaction(idbStore, "readwrite");
        const st = tx.objectStore(idbStore);
        const req = st.delete(key);
        req.onsuccess = () => resolve();
        req.onerror = () => reject(req.error);
      });
    },
  } as const;
}


/* ========= Parseo ventas ========= */
async function parseVentasArrayBuffer(buf: ArrayBuffer): Promise<Map<string, SalesRow[]>> {
  const wb = XLSX.read(buf, { type: "array" });
  const sheet = wb.Sheets[wb.SheetNames[0]];
  const raw = XLSX.utils.sheet_to_json<RawSalesRow>(sheet, { defval: "" });

  const parsed: SalesRow[] = [];
  for (const r of raw) {
    const name = r["ARTÍCULO"] ?? r["ARTICULO"] ?? r["Artículo"] ?? "";
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
function weeksAgoMs(n: number) { return Date.now() - n * 7 * 24 * 3600 * 1000; }
function daysAgoMs(n: number) { return Date.now() - n * 24 * 3600 * 1000; }

function computeStats(arr: SalesRow[]): Stats {
  const t4 = weeksAgoMs(4), t2 = weeksAgoMs(2), t30 = daysAgoMs(30);
  let sum28 = 0, sum14 = 0, sum30 = 0;
  let lastUnitPrice: number | undefined, lastDate: number | undefined;

  for (const r of arr) {
    const q = r.qty > 0 ? r.qty : 0; // ignora notas de crédito
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

/* ========= Persistencia ventas (IDB + meta + sync) ========= */
/* ========= Hook: venta compartida + import ========= */
function useSharedSales(config: OrdersPageClientConfig, fallbackData?: Map<string, SalesRow[]>) {
  const idb = React.useMemo(() => createIdbHelpers(config), [config]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [byProduct, setByProduct] = React.useState<Map<string, SalesRow[]>>(new Map());
  const [source, setSource] = React.useState<{ kind: "imported" | "default"; filename?: string; meta?: SavedMeta }>({ kind: "default" });

  // Broadcast entre pestañas
  const bcRef = React.useRef<BroadcastChannel | null>(null);
  const readMeta = React.useCallback((): SavedMeta | null => {
    try {
      const raw = localStorage.getItem(config.salesMetaKey);
      if (!raw) return null;
      const v = JSON.parse(raw) as SavedMeta;
      if (!v.storage) return null;
      return v;
    } catch {
      return null;
    }
  }, [config.salesMetaKey]);

  const writeMeta = React.useCallback((meta: SavedMeta) => {
    localStorage.setItem(config.salesMetaKey, JSON.stringify(meta));
  }, [config.salesMetaKey]);

  const clearMeta = React.useCallback(() => {
    localStorage.removeItem(config.salesMetaKey);
  }, [config.salesMetaKey]);

  const loadFromBestSource = React.useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      // 1) Intentar IndexedDB
      const bufFromIdb = await idb.get<ArrayBuffer>(config.idbSalesKey);
      const meta = readMeta();
      if (bufFromIdb && meta?.storage === "idb") {
        const map = await parseVentasArrayBuffer(bufFromIdb);
        setByProduct(map);
        setSource({ kind: "imported", filename: meta.filename, meta });
        return;
      }

      // 2) Compat: localStorage Base64 (migrar a IDB si existe)
      const raw = localStorage.getItem(config.salesLegacyKey);
      if (raw) {
        try {
          const saved = JSON.parse(raw) as { filename?: string; ts?: number; bufB64: string };
          if (saved?.bufB64) {
            const buf = b642ab(saved.bufB64);
            // Migrar a IDB
            await idb.set(config.idbSalesKey, buf);
            writeMeta({
              filename: saved.filename,
              ts: saved.ts ?? Date.now(),
              size: buf.byteLength,
              storage: "idb",
            });
            const map = await parseVentasArrayBuffer(buf);
            setByProduct(map);
            setSource({ kind: "imported", filename: saved.filename, meta: readMeta() ?? undefined });
            return;
          }
        } catch {
          // ignore
        }
      }

      // 3) Fallback: archivo por defecto o dataset demo
      if (config.ventasUrl) {
        const res = await fetch(config.ventasUrl, { cache: "no-store" });
        if (!res.ok) throw new Error(`No se pudo cargar ${config.ventasUrl}`);
        const buf = await res.arrayBuffer();
        const map = await parseVentasArrayBuffer(buf);
        setByProduct(map);
        const defMeta: SavedMeta = { storage: "default" };
        writeMeta(defMeta);
        setSource({ kind: "default", meta: defMeta });
      } else if (fallbackData && fallbackData.size) {
        const clone = cloneSalesMap(fallbackData);
        setByProduct(clone);
        const demoMeta: SavedMeta = { storage: "demo" };
        writeMeta(demoMeta);
        setSource({ kind: "default", meta: demoMeta });
      } else {
        setByProduct(new Map());
        clearMeta();
        setSource({ kind: "default" });
      }
    } catch (error: unknown) {
      setError(getErrorMessage(error) || "Error cargando ventas");
    } finally {
      setLoading(false);
    }
  }, [clearMeta, config, fallbackData, idb, readMeta, writeMeta]);

  React.useEffect(() => {
    if (typeof window === "undefined" || typeof BroadcastChannel === "undefined") return undefined;
    bcRef.current = new BroadcastChannel(config.broadcastChannel);
    const bc = bcRef.current;
    bc.onmessage = async (ev) => {
      if (ev?.data?.type === "sales-updated" || ev?.data?.type === "sales-cleared") {
        await loadFromBestSource(); // recarga al recibir cambios
      }
    };
    return () => { bc.close(); bcRef.current = null; };
  }, [config.broadcastChannel, loadFromBestSource]);

  // Evento storage (por si cambia el meta desde otra pestaña)
  React.useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (e.key === config.salesMetaKey || e.key === config.salesLegacyKey) {
        loadFromBestSource();
      }
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, [config.salesLegacyKey, config.salesMetaKey, loadFromBestSource]);

  React.useEffect(() => {
    let alive = true;
    (async () => {
      if (!alive) return;
      await loadFromBestSource();
    })();
    return () => { alive = false; };
  }, [loadFromBestSource]);

  async function importVentas(file: File) {
    try {
      setLoading(true);
      const buf = await file.arrayBuffer();
      const map = await parseVentasArrayBuffer(buf);
      setByProduct(map);
      setError(null);

      // Guardar en IndexedDB + meta
      await idb.set(config.idbSalesKey, buf);
      const meta: SavedMeta = {
        filename: file.name,
        ts: Date.now(),
        size: buf.byteLength,
        storage: "idb",
      };
      writeMeta(meta);
      setSource({ kind: "imported", filename: file.name, meta });

      // Avisar a otras pestañas
      bcRef.current?.postMessage({ type: "sales-updated" });

      alert("Ventas actualizadas y persistidas (disponibles al recargar y en otras pestañas).");
    } catch (error: unknown) {
      const message = getErrorMessage(error) || "No se pudo importar el archivo de ventas.";
      setError(message);
      alert(message);
    } finally {
      setLoading(false);
    }
  }

  async function clearVentas() {
    try {
      setLoading(true);
      await idb.del(config.idbSalesKey);
      clearMeta();
      // Mantengo compat… por si existía legado
      localStorage.removeItem(config.salesLegacyKey);

      // Vuelvo a default
      if (config.ventasUrl) {
        const res = await fetch(config.ventasUrl, { cache: "no-store" });
        if (!res.ok) throw new Error(`No se pudo cargar ${config.ventasUrl}`);
        const buf = await res.arrayBuffer();
        const map = await parseVentasArrayBuffer(buf);
        setByProduct(map);
        writeMeta({ storage: "default" });
        setSource({ kind: "default", meta: { storage: "default" } });
      } else if (fallbackData && fallbackData.size) {
        const clone = cloneSalesMap(fallbackData);
        setByProduct(clone);
        const demoMeta: SavedMeta = { storage: "demo" };
        writeMeta(demoMeta);
        setSource({ kind: "default", meta: demoMeta });
      } else {
        setByProduct(new Map());
        setSource({ kind: "default" });
      }

      bcRef.current?.postMessage({ type: "sales-cleared" });
    } catch (error: unknown) {
      setError(getErrorMessage(error) || "No se pudo volver a la fuente por defecto.");
    } finally {
      setLoading(false);
    }
  }

  return { loading, error, byProduct, importVentas, clearVentas, source };
}

/* ========= Página ========= */
export default function OrdersPageClient({ variant = "real", defaultData }: OrdersPageClientProps = {}) {
  const config = CONFIGS[variant] ?? CONFIGS.real;
  const fallbackData = React.useMemo(() => {
    if (defaultData) return defaultData;
    if (variant === "demo") return createDemoSalesMap();
    return undefined;
  }, [defaultData, variant]);

  const { loading, error, byProduct, importVentas, clearVentas, source } = useSharedSales(
    config,
    fallbackData
  );
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

  /* ----- UI persistente (fix SSR hydration) ----- */
  type UiState = {
    selectedName: string;
    from: string;
    to: string;
    gran: Granularity;
    colCount: number;
  };

  // Defaults deterministas (idénticos en server y client)
  const TODAY_ISO = new Date().toISOString().slice(0, 10);
  const THIRTY_AGO_ISO = new Date(Date.now() - 30 * 24 * 3600 * 1000)
    .toISOString()
    .slice(0, 10);

  const UI_DEFAULTS: UiState = {
    selectedName: "",
    from: THIRTY_AGO_ISO,
    to: TODAY_ISO,
    gran: "week",
    colCount: 8,
  };

  // Guard de hidratación: evitamos leer localStorage antes del mount
  const [hydrated, setHydrated] = React.useState(false);
  const [ui, setUi] = React.useState<UiState>(UI_DEFAULTS);

  // Al montar, mergeamos con lo guardado en localStorage (si existe)
  React.useEffect(() => {
    setHydrated(true);
    try {
      const raw = localStorage.getItem(config.uiKey);
      if (raw) {
        const saved = JSON.parse(raw) as Partial<UiState>;
        setUi((prev) => ({
          ...prev,
          ...saved,
  // sanity bounds
  gran: saved?.gran === "day" || saved?.gran === "month" ? saved.gran : "week",
  colCount:
    typeof saved?.colCount === "number"
      ? Math.min(15, Math.max(1, saved.colCount))
      : prev.colCount,
}));

      }
    } catch {
      // ignoro errores de parseo
    }
  }, [config.uiKey]);

  // Persistimos los cambios SOLO luego de estar hidratados
  React.useEffect(() => {
    if (!hydrated) return;
    localStorage.setItem(config.uiKey, JSON.stringify(ui));
  }, [config.uiKey, ui, hydrated]);

  // Helpers para no tocar mucho el resto del componente
  const selectedName = ui.selectedName;
  const from = ui.from;
  const to = ui.to;
  const gran = ui.gran;
  const colCount = ui.colCount;

  const setSelectedName = (v: string) =>
    setUi((s) => ({ ...s, selectedName: v }));
  const setFrom = (v: string) => setUi((s) => ({ ...s, from: v }));
  const setTo = (v: string) => setUi((s) => ({ ...s, to: v }));
  const setGran = (v: Granularity) => setUi((s) => ({ ...s, gran: v }));
  const setColCount = (v: number) => setUi((s) => ({ ...s, colCount: v }));


  /* ----- Autocomplete ----- */
  const [query, setQuery] = React.useState("");
  const [openDropdown, setOpenDropdown] = React.useState(false);
  const productInputId = React.useId();
  const fromInputId = React.useId();
  const toInputId = React.useId();
  const granSelectId = React.useId();
  const columnsSliderId = React.useId();
  const productOptions = React.useMemo(() => {
    const names: string[] = [];
    for (const [, arr] of byProduct.entries()) if (arr.length > 0) names.push(arr[0].product);
    names.sort((a, b) => a.localeCompare(b));
    return names;
  }, [byProduct]);
  const filtered = React.useMemo(() => {
    const q = normKey(query);
    if (!q) return [];
    return productOptions.filter((n) => normKey(n).includes(q)).slice(0, 200);
  }, [query, productOptions]);

  const selectedId = normKey(selectedName);
  const rows = React.useMemo(() => byProduct.get(selectedId) ?? [], [byProduct, selectedId]);
  const stats = React.useMemo<Stats>(() => {
    if (!rows.length) return { avg4w: 0, sum2w: 0, sum30d: 0 };
    return computeStats(rows);
  }, [rows]);

  /* ----- Quick buttons ----- */
  function setQuick(days: number) {
    const end = new Date(to + "T00:00:00");
    const start = new Date(end.getTime() - days * 24 * 3600 * 1000);
    setFrom(start.toISOString().slice(0, 10));
  }

  /* ----- Bins recientes→antiguos ----- */
  type Bin = { key: string; label: string; start: number; end: number };
  const bins: Bin[] = React.useMemo(() => {
    if (!from || !to) return [];
    const start = new Date(from + "T00:00:00Z").getTime();
    const endIncl = new Date(to + "T00:00:00Z").getTime() + 24 * 3600 * 1000; // incluir el día "to"

    if (gran === "day") {
      const tmp: Bin[] = [];
      for (let t = endIncl - 24 * 3600 * 1000; t >= start; t -= 24 * 3600 * 1000) {
        const label = new Date(t).toLocaleDateString("es-AR");
        tmp.push({ key: `d:${label}`, label, start: t, end: t + 24 * 3600 * 1000 });
      }
      return tmp.slice(0, colCount);
    }

    // === NUEVO: Granularidad por mes ===
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

    let t = startOfMonthUTC(endIncl - 1); // mes que contiene "to"
    const tmp: Bin[] = [];
    for (let i = 0; i < 120; i++) {
      const s = t;
      const e = addMonthsUTC(s, 1);      // fin exclusivo del mes
      if (e <= start) break;
      const label = fmt.format(new Date(s)); // ej. "sep 2025"
      tmp.push({ key: `m:${s}`, label, start: s, end: e });
      t = addMonthsUTC(s, -1); // mes anterior
    }
    return tmp.slice(0, colCount);
  }

    function startOfISOWeek(ms: number) {
      const d = new Date(ms);
      const day = (d.getUTCDay() + 6) % 7; // 0=lunes
      const monday = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
      monday.setUTCDate(monday.getUTCDate() - day);
      return monday.getTime();
    }
    let t = startOfISOWeek(endIncl - 1); // semana que contiene "to"
    const tmp: Bin[] = [];
    for (let i = 0; i < 120; i++) {
      const s = t;
      const e = t + 7 * 24 * 3600 * 1000;
      if (e <= start) break;
      const label = `Sem ${new Date(s).toLocaleDateString("es-AR")}`;
      tmp.push({ key: `w:${s}`, label, start: s, end: e });
      t = s - 7 * 24 * 3600 * 1000; // semana anterior
    }
    return tmp.slice(0, colCount);
  }, [from, to, gran, colCount]);

  /* ----- Pivot por bin ----- */
  const pivotRow = React.useMemo(() => {
    const arr: number[] = [];
    for (const b of bins) {
      let sum = 0;
      for (const r of rows) if (r.date >= b.start && r.date < b.end && r.qty > 0) sum += r.qty;
      arr.push(sum);
    }
    return arr;
  }, [bins, rows]);

  /* ----- Ventas del período + subtotal cantidades ----- */
  const rangeRows = React.useMemo(() => {
    const s = new Date(from + "T00:00:00Z").getTime();
    const e = new Date(to + "T00:00:00Z").getTime() + 24 * 3600 * 1000;
    return rows.filter((r) => r.date >= s && r.date < e).sort((a, b) => b.date - a.date);
  }, [rows, from, to]);
  const sumQtyInRange = rangeRows.reduce((acc, r) => acc + (r.qty > 0 ? r.qty : 0), 0);

  /* ----- Import manual (opcional) ----- */
  const ventasInputRef = React.useRef<HTMLInputElement | null>(null);

  const meta = source.meta ?? undefined;
  const defaultMetaLabel = (() => {
    if (meta?.storage === "demo" || (!config.ventasUrl && variant === "demo")) {
      return "Demo prearmada";
    }
    if (config.ventasUrl) return `Default ${config.ventasUrl}`;
    return "Fuente desconocida";
  })();
  const metaLabel =
    source.kind === "imported"
      ? `Importada${meta?.filename ? ` · ${meta.filename}` : ""}${meta?.ts ? ` · ${new Date(meta.ts).toLocaleString("es-AR")}` : ""}${meta?.size ? ` · ${(meta.size / 1024).toFixed(0)} KB` : ""}`
      : defaultMetaLabel;

  return (
    <main className="mx-auto w-full max-w-5xl space-y-4 px-4 pb-16 pt-6">
      <section className="space-y-3 rounded-2xl border border-border/60 bg-card/95 px-4 py-4 shadow-[var(--shadow-card)] backdrop-blur supports-[backdrop-filter]:bg-card/80">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-xl font-semibold tracking-tight text-foreground">Estadística</h1>
            <p className="text-xs text-muted-foreground">
              Fuente ventas: <span className="font-medium text-foreground">{metaLabel}</span>
            </p>
          </div>

          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-end">
            <input
              ref={ventasInputRef}
              type="file"
              accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
              className="hidden"
              onChange={async (e) => {
                const input = e.currentTarget;
                const f = input.files?.[0];
                if (!f) { input.value = ""; return; }
                try { await importVentas(f); } finally { input.value = ""; }
              }}
            />
            <Button
              variant="outline"
              size="sm"
              className="rounded-lg"
              onClick={() => ventasInputRef.current?.click()}
              disabled={loading}
            >
              {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Upload className="mr-2 h-4 w-4" />}
              Importar ventas
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="rounded-lg text-muted-foreground hover:bg-muted/30"
              onClick={clearVentas}
              disabled={loading}
            >
              Borrar fuente
            </Button>
          </div>
        </div>
      </section>


      <Card className="border border-border/60 bg-card/95">
        <CardContent className="space-y-4 p-4">
          {/* Filtros: producto, quick ranges, fechas */}
<div className="grid gap-3 lg:grid-cols-12 lg:items-end">
  {/* Autocomplete (siempre ocupa la fila completa en mobile) */}
  <div className="relative lg:col-span-4 min-w-0">
    <label className="text-sm font-medium" htmlFor={productInputId}>Elegí un artículo</label>
    <Input
      id={productInputId}
      className="w-full"
      placeholder="Buscar producto…"
      value={selectedName || query}
      onChange={(e) => {
        setSelectedName("");
        setQuery(e.target.value);
        setOpenDropdown(true);
      }}
      onFocus={() => setOpenDropdown(true)}
    />
    {openDropdown && (query.trim().length > 0 || !selectedName) && (
      <div
        className="absolute z-50 mt-1 max-h-72 w-full overflow-auto rounded-xl border border-border/60 bg-card/98 text-foreground shadow-[var(--shadow-elevated)]"
        onMouseLeave={() => setOpenDropdown(false)}
      >
        {filtered.length === 0 ? (
          <div className="p-2 text-sm text-muted-foreground">Sin resultados…</div>
        ) : (
          filtered.map((name) => (
            <button
              key={name}
              className="w-full rounded-lg p-2 text-left text-sm text-foreground hover:bg-muted/40"
              onClick={() => {
                setSelectedName(name);
                setQuery("");
                setOpenDropdown(false);
              }}
            >
              {name}
            </button>
          ))
        )}
      </div>
    )}
  </div>

  {/* Quick ranges: envuelven y no desbordan en mobile */}
  <div className="lg:col-span-4">
    <div className="flex flex-wrap gap-2">
      <Button variant="outline" size="sm" className="rounded-lg" onClick={() => setQuick(7)}>7d</Button>
      <Button variant="outline" size="sm" className="rounded-lg" onClick={() => setQuick(14)}>14d</Button>
      <Button variant="outline" size="sm" className="rounded-lg" onClick={() => setQuick(30)}>30d</Button>
      <Button variant="outline" size="sm" className="rounded-lg" onClick={() => setQuick(60)}>60d</Button>
      <Button variant="outline" size="sm" className="rounded-lg" onClick={() => setQuick(90)}>90d</Button>
      <Button variant="outline" size="sm" className="rounded-lg" onClick={() => setQuick(180)}>180d</Button>
    </div>
  </div>

  {/* Desde */}
  <div className="min-w-0 lg:col-span-2">
    <label className="text-sm font-medium" htmlFor={fromInputId}>Desde</label>
    <Input id={fromInputId} className="w-full" type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
  </div>

  {/* Hasta */}
  <div className="min-w-0 lg:col-span-2">
    <label className="text-sm font-medium" htmlFor={toInputId}>Hasta</label>
    <Input id={toInputId} className="w-full" type="date" value={to} onChange={(e) => setTo(e.target.value)} />
  </div>
</div>


          {/* Granularidad + columnas */}
<div className="flex flex-wrap items-center gap-3">
  <div className="flex items-center gap-2">
    <label className="text-sm font-medium" htmlFor={granSelectId}>Granularidad</label>
    <select
      id={granSelectId}
      className="rounded-lg border border-border/60 bg-card px-3 py-2 text-sm text-foreground shadow-[var(--shadow-card)]"
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

          {/* Meta producto */}
          {selectedName && (
            <div className="text-sm text-muted-foreground">
              <span className="font-medium">Producto:</span> {selectedName} • Último precio:{" "}
              {stats.lastUnitPrice != null ? `$${stats.lastUnitPrice.toFixed(2)}` : "—"} • Última venta: {formatLastSale(stats.lastDate)}
            </div>
          )}

          {/* Tabla dinámica */}
          {selectedName && (
            <div className="overflow-x-auto rounded-2xl border border-border/60 bg-card">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b [&>th]:px-3 [&>th]:py-2">
                    <th className="w-[220px] min-w-[220px] text-left">Período</th>
                    {bins.map((b) => (
                      <th key={b.key} className="text-center min-w-[90px] w-[90px] px-2"
                          title={`${dateShort(b.start)} → ${dateShort(b.end - 1)}`}>
                        {b.label}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  <tr className="[&>td]:px-3 [&>td]:py-2">
                    <td className="text-left">{selectedName}</td>
                    {pivotRow.map((v, i) => (
                      <td key={i} className="text-center tabular-nums">{v}</td>
                    ))}
                  </tr>
                </tbody>
              </table>
            </div>
          )}

          {/* Lista de ventas + subtotal cantidades */}
          {selectedName && (
            <div className="overflow-hidden rounded-2xl border border-border/60">
              <div className="border-b bg-muted/25 px-3 py-2 text-sm font-semibold text-foreground">Ventas en el período</div>
              <div className="max-h-[50vh] overflow-auto">
                <table className="w-full text-sm">
                  <thead className="sticky top-0 bg-card">
                    <tr className="border-b [&>th]:px-3 [&>th]:py-2">
                      <th className="text-left">Fecha</th>
                      <th className="text-right">Cantidad</th>
                      <th className="text-right">Subtotal</th>
                      <th className="text-right">Precio unitario</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rangeRows.length === 0 ? (
                      <tr><td colSpan={4} className="p-3 text-center text-muted-foreground">No hay ventas en el período seleccionado.</td></tr>
                    ) : (
                      rangeRows.map((r, i) => (
                        <tr key={i} className="border-b [&>td]:px-3 [&>td]:py-2">
                          <td>{dateShort(r.date)}</td>
                          <td className="text-right tabular-nums">{r.qty}</td>
                          <td className="text-right tabular-nums">{r.subtotal != null ? `$${r.subtotal.toFixed(2)}` : "—"}</td>
                          <td className="text-right tabular-nums">{r.unitPrice != null ? `$${r.unitPrice.toFixed(2)}` : "—"}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                  <tfoot>
                    <tr className="font-semibold text-foreground">
                      <td className="px-3 py-2">Total del período</td>
                      <td className="px-3 py-2 text-right tabular-nums">{sumQtyInRange}</td>
                      <td></td><td></td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>
          )}

          {error && (
            <div className="flex items-start gap-3 rounded-xl border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">
              <p className="flex-1 whitespace-pre-wrap break-words">{error}</p>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleCopyError}
                className="shrink-0 rounded-lg border border-destructive/40 text-destructive hover:bg-destructive/10"
              >
                Copiar
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </main>
  );
}
