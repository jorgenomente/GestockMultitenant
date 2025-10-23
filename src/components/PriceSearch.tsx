"use client";

import React from "react";
import BarcodeScanner from "@/components/BarcodeScanner";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Camera, Upload } from "lucide-react";

/** ===================== Config ===================== */
const DENSITY_COMPACT = true;
const LS_KEY = "gestock:prices:v6"; // bump cache
const PRECIOS_FILENAME = "precios.xlsx";
const BASE_PATH = (process.env.NEXT_PUBLIC_BASE_PATH ?? "").replace(/\/$/, "");
const PRECIOS_URL = `${BASE_PATH ? BASE_PATH : ""}/${PRECIOS_FILENAME}`;
const INPUT_ID = "price-search-input";

/** ===================== Tipos ===================== */
export type PriceItem = {
  id: string;
  name: string;
  code?: string;
  barcode?: string;
  price: number;
  updatedAt: number;
  updatedAtLabel: string;
};

type Catalog = {
  items: PriceItem[];
  rowCount: number;
  importedAt: number; // epoch ms
  sourceMode: "api" | "public" | "local-upload";
  sourceKey?: string;
};

const MIN_BARCODE_DIGITS_FOR_KEY = 8;

const barcodeKeyValue = (barcode?: string) => {
  if (!barcode) return "";
  const trimmed = stripInvisibles(barcode).trim();
  if (!trimmed) return "";
  if (/[A-Za-z]/.test(trimmed)) return normText(trimmed);
  const digits = trimmed.replace(/\D+/g, "");
  return digits.length >= MIN_BARCODE_DIGITS_FOR_KEY ? digits : "";
};

/** Clave estable por producto */
const keyFor = (name: string, barcode?: string, code?: string) => {
  const barKey = barcodeKeyValue(barcode);
  if (barKey) return barKey;

  const codeKey = code ? normText(code) : "";
  if (codeKey) return codeKey;

  const nameKey = normText(name);
  return nameKey || name.trim();
};

/** Quedate SIEMPRE con la fila de fecha más nueva. Si empata EXACTO, prioriza la que tenga barcode/code. */
function reduceLatestByDate(list: PriceItem[]): PriceItem[] {
  const m = new Map<string, PriceItem>();

  for (const it of list) {
    const k = keyFor(it.name, it.barcode, it.code);
    const cur = m.get(k);
    if (!cur) { m.set(k, it); continue; }

    const a = cur.updatedAt || 0;
    const b = it.updatedAt || 0;

    if (b > a) {
      // Fecha más nueva → reemplaza SIEMPRE
      m.set(k, it);
      continue;
    }

    if (b === a) {
      // Empate de timestamp: primero quien tenga más identificadores…
      const curScore = (cur.barcode ? 1 : 0) + (cur.code ? 1 : 0);
      const itScore  = (it.barcode ? 1 : 0) + (it.code ? 1 : 0);
      if (itScore > curScore) { m.set(k, it); continue; }

      // …y si siguen empatadas, quedate con el PRECIO MÁS BAJO
      if (it.price < cur.price) { m.set(k, it); }
    }
  }

  // Orden final por fecha desc
  return Array.from(m.values()).sort((x, y) => (y.updatedAt || 0) - (x.updatedAt || 0));
}

/** ===================== Utils ===================== */
const STOPWORDS = new Set(["de", "del", "la", "el", "los", "las"]);
const NBSP_RX = /[\u202F\u00A0]/g;

const fmtMoney = (n: number) =>
  n.toLocaleString("es-AR", { style: "currency", currency: "ARS", maximumFractionDigits: 0 });

const stripInvisibles = (s: string) => s.replace(NBSP_RX, " ");

const normKey = (key: string) =>
  key.normalize("NFD").replace(/\p{Diacritic}/gu, "").toLowerCase().replace(/\s+/g, " ").trim();

const normText = (s: unknown) =>
  !s
    ? ""
    : String(s).normalize("NFD").replace(/\p{Diacritic}/gu, "").toLowerCase().replace(/\s+/g, " ").trim();

function headerMatches(header: string, alias: string) {
  const h = normKey(header);
  const a = normKey(alias);
  if (h === a) return true;
  const hTok = h.split(" ").filter((t) => t && !STOPWORDS.has(t));
  const aTok = a.split(" ").filter((t) => t && !STOPWORDS.has(t));
  return aTok.every((t) => hTok.includes(t));
}

const excelSerialToMs = (n: number) => Date.UTC(1899, 11, 30) + Math.round(n * 86400000);

/** Normaliza código de barras, preservando letras cuando existan. */
function normBarcode(val: unknown): string | undefined {
  if (val == null) return undefined;
  let s =
    typeof val === "number"
      ? Math.round(val).toLocaleString("en-US", { useGrouping: false })
      : stripInvisibles(String(val));
  s = s.trim();
  if (!s) return undefined;
  const compact = s.replace(/\s+/g, " ");
  const hasLetters = /[A-Za-z]/.test(compact);
  if (hasLetters) return compact;
  const digits = compact.replace(/\D+/g, "");
  return digits || undefined;
}

/** Parser de fecha MUY tolerante a formatos locales */
function parseUpdatedAt(value: unknown): number {
  if (value == null) return 0;

  if (typeof value === "number" && Number.isFinite(value)) {
    const n = value;

    // 1) Epoch en milisegundos (1970->hoy ~ 1e12 a 2e12)
    if (n > 1e11) return n;

    // 2) Epoch en segundos (10^9..10^10): pasamos a ms
    if (n > 1e9 && n < 1e11) return n * 1000;

    // 3) Serial Excel (~20.000..80.000 días desde 1899-12-30)
    if (n > 20000 && n < 80000) {
      const t = excelSerialToMs(n);
      return t < Date.UTC(2005, 0, 1) ? 0 : t;
    }

    // Desconocido
    return 0;
  }

  if (typeof value !== "string") return 0;

  const raw = stripInvisibles(value).trim();
  if (!raw) return 0;
  if (/^0?1\/0?1\/0{2}(\s+0{2}:0{2}(:0{2})?)?$/i.test(raw)) return 0;
  const s = raw.replace(/\s+/g, " ");

  // 1) dd/MM/yyyy h:mm[:ss] AM/PM
  let m =
    /^(\d{1,2})\/(\d{1,2})\/(\d{4})\s+(\d{1,2}):(\d{2})(?::(\d{2}))?\s*([AP]M)$/i.exec(
      s
    );
  if (m) {
    const [, dd, MM, yyyy, hh, mm, ssOpt, ap] = m;
    let H = parseInt(hh, 10);
    const min = parseInt(mm, 10);
    const sec = ssOpt ? parseInt(ssOpt, 10) : 0;
    if (/PM/i.test(ap) && H !== 12) H += 12;
    if (/AM/i.test(ap) && H === 12) H = 0;
    const t = Date.UTC(+yyyy, +MM - 1, +dd, H, min, sec);
    return t < Date.UTC(2005, 0, 1) ? 0 : t;
  }

  // 2) dd/MM/yyyy h:mm[:ss] a. m./p. m.
  m =
    /^(\d{1,2})\/(\d{1,2})\/(\d{4})\s+(\d{1,2}):(\d{2})(?::(\d{2}))?\s*([ap])\s*\.?\s*m\.?$/i.exec(
      s
    );
  if (m) {
    const [, dd, MM, yyyy, hh, mm, ssOpt, ap] = m;
    let H = parseInt(hh, 10);
    const min = parseInt(mm, 10);
    const sec = ssOpt ? parseInt(ssOpt, 10) : 0;
    if (/p/i.test(ap) && H !== 12) H += 12;
    if (/a/i.test(ap) && H === 12) H = 0;
    const t = Date.UTC(+yyyy, +MM - 1, +dd, H, min, sec);
    return t < Date.UTC(2005, 0, 1) ? 0 : t;
  }

  // 3) dd/MM/yyyy HH:mm[:ss]
  m =
    /^(\d{1,2})\/(\d{1,2})\/(\d{4})\s+(\d{1,2}):(\d{2})(?::(\d{2}))?$/.exec(s);
  if (m) {
    const [, dd, MM, yyyy, HH, mm, ssOpt] = m;
    const t = Date.UTC(
      +yyyy,
      +MM - 1,
      +dd,
      parseInt(HH, 10),
      parseInt(mm, 10),
      ssOpt ? parseInt(ssOpt, 10) : 0
    );
    return t < Date.UTC(2005, 0, 1) ? 0 : t;
  }

  // 4) dd-MM-yyyy HH:mm[:ss]
  m =
    /^(\d{1,2})-(\d{1,2})-(\d{4})\s+(\d{1,2}):(\d{2})(?::(\d{2}))?$/.exec(s);
  if (m) {
    const [, dd, MM, yyyy, HH, mm, ssOpt] = m;
    const t = Date.UTC(
      +yyyy,
      +MM - 1,
      +dd,
      parseInt(HH, 10),
      parseInt(mm, 10),
      ssOpt ? parseInt(ssOpt, 10) : 0
    );
    return t < Date.UTC(2005, 0, 1) ? 0 : t;
  }

  // 5) dd/MM/yy HH:mm
  m = /^(\d{1,2})\/(\d{1,2})\/(\d{2})\s+(\d{1,2}):(\d{2})$/.exec(s);
  if (m) {
    const [, dd, MM, yy, HH, mm] = m;
    const yyyy = 2000 + parseInt(yy, 10);
    const t = Date.UTC(+yyyy, +MM - 1, +dd, parseInt(HH, 10), parseInt(mm, 10));
    return t < Date.UTC(2005, 0, 1) ? 0 : t;
  }

  const parsed = Date.parse(s.replace(/(\d{1,2})\/(\d{1,2})\//, "$2/$1/"));
  return Number.isFinite(parsed) && parsed >= Date.UTC(2005, 0, 1) ? parsed : 0;
}

/** Reconstruye price y updatedAt de lo que venga del API (string, Excel serial, etc.) */
function normalizeFromApi(x: any): PriceItem {
  const name = String(x?.name ?? "").trim();
  const code = x?.code ? String(x.code).trim() : undefined;
  const barcode = x?.barcode ? normBarcode(x.barcode) : undefined;

  // precio robusto
  let priceNum = 0;
  const p = x?.price;
  if (typeof p === "number") priceNum = p;
  else if (typeof p === "string") {
    const clean = p.replace(/\./g, "").replace(/,/g, ".");
    const n = Number(clean.replace(/[^\d.]/g, ""));
    priceNum = Number.isFinite(n) ? n : 0;
  }

  // candidatos de fecha que puede traer el backend
  const dateCandidates: unknown[] = [
    x?.updatedAt,
    x?.updatedAtMs,
    x?.updated,
    x?.updatedAtLabel,
    x?.fechaUltimaActualizacion,
    x?.["fecha ultima actualización"],
    x?.["ultima actualizacion"],
    x?.["última actualización"],
  ];

  let bestTs = 0;
  for (const cand of dateCandidates) {
    if (cand == null || cand === "") continue;
    if (typeof cand === "number" && Number.isFinite(cand)) {
      bestTs = Math.max(bestTs, parseUpdatedAt(cand));
    } else if (typeof cand === "string") {
      bestTs = Math.max(bestTs, parseUpdatedAt(cand));
    }
  }

  const updatedAt = bestTs || 0;
  const updatedAtLabel =
    (typeof x?.updatedAtLabel === "string" && x.updatedAtLabel.trim())
      ? String(x.updatedAtLabel)
      : updatedAt
      ? new Date(updatedAt).toLocaleString("es-AR")
      : "";

  const id = keyFor(name, barcode, code);

  return {
    id,
    name,
    code,
    barcode,
    price: priceNum,
    updatedAt,
    updatedAtLabel,
  };
}

/** ===================== XLSX helpers ===================== */
async function parseWorkbook(buf: ArrayBuffer) {
  const XLSX = await import("xlsx");
  const wb = XLSX.read(buf, { type: "array" });
  const wsName = wb.SheetNames[0];
  const ws = wb.Sheets[wsName];
  const rows: Record<string, unknown>[] = XLSX.utils.sheet_to_json(ws, { defval: "" });
  return rows;
}

function buildCatalog(rows: Record<string, unknown>[], sourceMode: Catalog["sourceMode"]): Catalog {
  const aliases: Record<string, string[]> = {
    name: ["descripcion", "descripción", "nombre", "detalle", "producto", "articulo", "artículo"],
    code: ["codigo", "código", "id", "sku", "código interno", "cod interno"],
    barcode: [
      "barcode",
      "barra",
      "barras",
      "codigo barras",
      "código barras",
      "codigo de barras",
      "código de barras",
      "cod barras",
      "cod. barras",
      "ean",
    ],
    price: ["precio", "precio venta", "precio final", "pvp", "importe"],
    updated: [
      "desde",
    ],
  };

  const first = rows[0] ?? {};
  const keys = Object.keys(first);
  const colMap: Record<"name" | "code" | "barcode" | "price" | "updated", string | null> = {
    name: null,
    code: null,
    barcode: null,
    price: null,
    updated: null,
  };

  for (const k of keys) {
    for (const [field, list] of Object.entries(aliases)) {
      if ((list as string[]).some((a) => headerMatches(k, a))) {
        if (!(colMap as any)[field]) (colMap as any)[field] = k;
      }
    }
  }

  if (!colMap.name) colMap.name = keys[0] ?? "nombre";
  if (!colMap.price) colMap.price = "precio";
  if (!colMap.updated && keys.length > 0) colMap.updated = keys[keys.length - 1];

  const all: PriceItem[] = [];
  let rowCount = 0;

  for (const r of rows) {
    rowCount++;
    const rawName = String(r[colMap.name as string] ?? "").trim();
    if (!rawName) continue;

    const code = r[colMap.code as string] ? String(r[colMap.code as string]).trim() : undefined;
    const barcode = colMap.barcode ? normBarcode(r[colMap.barcode]) : undefined;

    // precio
    let priceNum = 0;
    const priceRaw = r[colMap.price as string];
    if (typeof priceRaw === "number") priceNum = priceRaw;
    else if (typeof priceRaw === "string") {
      const clean = priceRaw.replace(/\./g, "").replace(/,/g, ".");
      const n = Number(clean.replace(/[^\d.]/g, ""));
      priceNum = Number.isFinite(n) ? n : 0;
    }

    // fecha
    const updRaw = colMap.updated ? r[colMap.updated] : undefined;
    const updatedAt = parseUpdatedAt(updRaw);
    const updatedAtLabel =
      typeof updRaw === "string"
        ? String(updRaw)
        : updatedAt
        ? new Date(updatedAt).toLocaleString("es-AR")
        : "";

    const next: PriceItem = {
      id: keyFor(rawName, barcode, code),
      name: rawName,
      code,
      barcode,
      price: priceNum,
      updatedAt: updatedAt || 0,
      updatedAtLabel,
    };

    all.push(next);
  }

  const items = reduceLatestByDate(all);
  return { items, rowCount, importedAt: Date.now(), sourceMode };
}

/** ===================== Debounce ===================== */
function useDebounced<T>(value: T, ms = 180) {
  const [debounced, setDebounced] = React.useState(value);
  React.useEffect(() => {
    const t = setTimeout(() => setDebounced(value), ms);
    return () => clearTimeout(t);
  }, [value, ms]);
  return debounced;
}

function safeSaveCache(catalog: Catalog) {
  // Intenta guardar completo; si excede la cuota (iOS), guarda solo metadatos
  try {
    localStorage.setItem(LS_KEY, JSON.stringify(catalog));
  } catch {
    try {
      const lite: Catalog = {
        ...catalog,
        items: [], // sin items para no superar 5MB
      };
      localStorage.setItem(LS_KEY, JSON.stringify(lite));
    } catch {
      // última chance: no cacheamos nada
    }
  }
}

// ✅ Forzar fuente temporalmente para multitenant
const FORCE_SOURCE: "api" | "public" | null = "api";

/** ===================== Hook de datos con fallbacks ===================== */
function usePrices(slug?: string) {
  const [items, setItems] = React.useState<PriceItem[]>([]);
  const [count, setCount] = React.useState<number>(0);
  const [importedAt, setImportedAt] = React.useState<number | null>(null);
  const [sourceMode, setSourceMode] = React.useState<Catalog["sourceMode"] | null>(null);
  const [loading, setLoading] = React.useState(false);

  // Separar “nota” informativa de “error duro”
  const [notice, setNotice] = React.useState<string | null>(null);
  const [error, setError] = React.useState<string | null>(null);

  // 1) Cargar desde LS para arranque rápido
  React.useEffect(() => {
    try {
      const raw = localStorage.getItem(LS_KEY);
      if (raw) {
        const cat: Catalog = JSON.parse(raw);
        if (Array.isArray(cat.items)) {
          setItems(cat.items);
          setCount(cat.rowCount ?? cat.items.length);
          setImportedAt(cat.importedAt ?? null);
          setSourceMode(cat.sourceMode ?? null);
        }
      }
    } catch {}
  }, []);

  // 2) Intentar API por tenant; si falla y estamos en multitenant, NO hacemos fallback
  const fetchCatalog = React.useCallback(async () => {
    setLoading(true);
    setError(null);
    setNotice(null);
    try {
      // ✅ API por tenant
      const res = await fetch(`/api/t/${slug}/precios`, { cache: "no-store" });
      if (!res.ok) throw new Error(`API HTTP ${res.status}`);
      const rawCat: Catalog = await res.json();

      const normalized = Array.isArray(rawCat.items)
        ? rawCat.items.map((x: any) => normalizeFromApi(x))  // tu normalizador
        : [];

      const canonItems = reduceLatestByDate(normalized);
      const canon: Catalog = {
        ...rawCat,
        sourceMode: "api",
        items: canonItems,
        rowCount: rawCat.rowCount ?? canonItems.length,
        importedAt: rawCat.importedAt ?? Date.now(),
      };

      setItems(canon.items);
      setCount(canon.rowCount);
      setImportedAt(canon.importedAt ?? null);
      setSourceMode("api");
      safeSaveCache(canon);
      return;

    } catch (apiErr: any) {
      // ✅ Multitenant: no caer a /public si forzamos API
      if (FORCE_SOURCE === "api") {
        setError(apiErr?.message || "No se pudo cargar precios.");
      } else {
        // (Dejamos el fallback vacío a propósito para otros contextos)
      }
    } finally {
      setLoading(false);
    }
  }, [slug]);

  React.useEffect(() => {
    fetchCatalog();
  }, [fetchCatalog]);

  // 3) Subida: POST al endpoint del tenant
  const onUpload = React.useCallback(
    async (file: File) => {
      setLoading(true);
      setError(null);
      setNotice(null);
      try {
        const fd = new FormData();
        fd.append("file", file);
        const up = await fetch(`/api/t/${slug}/precios`, { method: "POST", body: fd });
        if (!up.ok) {
          // Mostrar mensaje real si viene en JSON
          let serverMsg = "";
          try {
            const j = await up.json();
            serverMsg = j?.error || j?.message || "";
          } catch {}
          throw new Error(serverMsg || "No se pudo subir el archivo");
        }
        setNotice("Catálogo actualizado en la nube.");
        await fetchCatalog(); // refresca desde la API
      } catch (e: any) {
        setError(e?.message ?? "Error actualizando precios.");
      } finally {
        setLoading(false);
      }
    },
    [fetchCatalog, slug]
  );

  return { items, count, importedAt, sourceMode, loading, error, notice, onUpload };
}

/** ===================== UI ===================== */
function Highlight({ text, q }: { text: string; q: string }) {
  if (!q) return <>{text}</>;
  const words = q
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .map((w) => w.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"));
  if (words.length === 0) return <>{text}</>;
  const re = new RegExp("(" + words.join("|") + ")", "ig");
  const parts = text.split(re);
  return (
    <>
      {parts.map((part, i) =>
        re.test(part) ? (
          <mark key={i} className="rounded bg-accent/40 px-1 text-foreground">
            {part}
          </mark>
        ) : (
          <span key={i}>{part}</span>
        )
      )}
    </>
  );
}

/** ✅ ÚNICO cambio de firma: recibe slug */
export default function PriceSearch({ slug }: { slug: string }) {
  const { items, count, importedAt, sourceMode, loading, error, notice, onUpload } = usePrices(slug);
  const [q, setQ] = React.useState("");
  const qDebounced = useDebounced(q, 180);
  const LIMIT = 10;

  const fileRef = React.useRef<HTMLInputElement | null>(null);
  const [scannerOpen, setScannerOpen] = React.useState(false);

  const focusSearchInput = React.useCallback(() => {
    if (typeof window === "undefined") return;
    window.requestAnimationFrame(() => {
      const node = document.getElementById(INPUT_ID) as HTMLInputElement | null;
      if (!node) return;
      node.focus();
      try {
        const len = node.value.length;
        node.setSelectionRange(len, len);
      } catch {}
    });
  }, []);

  const handleScannerClose = React.useCallback(() => {
    setScannerOpen(false);
    focusSearchInput();
  }, [focusSearchInput]);

  const handleScan = React.useCallback(
    (value: string) => {
      const trimmed = stripInvisibles(value).trim();
      const normalized = barcodeKeyValue(value) || trimmed;
      if (normalized) {
        setQ(normalized);
      }
      handleScannerClose();
    },
    [handleScannerClose]
  );

  const filtered = React.useMemo(() => {
    if (!qDebounced) return [];
    const tokens = qDebounced.trim().toLowerCase().split(/\s+/).filter(Boolean);
    if (tokens.length === 0) return [];

    const hits: PriceItem[] = [];
    for (const it of items) {
      const haystack = [normText(it.name), normText(it.code), normText(it.barcode)]
        .filter(Boolean)
        .join(" ");
      let ok = true;
      for (const t of tokens) {
        if (!haystack.includes(normText(t))) {
          ok = false;
          break;
        }
      }
      if (ok) {
        hits.push(it);
        if (hits.length >= LIMIT) break;
      }
    }
    return hits;
  }, [items, qDebounced]);

  const styles = DENSITY_COMPACT
    ? {
        card: "transition-transform hover:-translate-y-0.5",
        content: "p-3",
        row: "flex items-start justify-between gap-3",
        name: "text-[14px] font-medium leading-tight text-foreground line-clamp-2",
        meta: "mt-1 flex flex-wrap gap-x-2 gap-y-0.5 text-[11px] text-muted-foreground",
        price: "text-base font-semibold tabular-nums text-secondary-foreground",
        priceSub: "text-[10px] text-muted-foreground",
        listSpace: "mt-3 space-y-2 pb-24",
      }
    : {
        card: "transition-transform hover:-translate-y-0.5",
        content: "p-4",
        row: "flex items-start justify-between gap-4",
        name: "text-[15px] font-semibold leading-snug text-foreground line-clamp-2 break-words",
        meta: "mt-1 flex flex-wrap gap-x-3 gap-y-1 text-xs text-muted-foreground",
        price: "text-lg font-semibold tabular-nums text-secondary-foreground",
        priceSub: "text-[11px] text-muted-foreground",
        listSpace: "mt-3 space-y-3 pb-28",
      };

  const lastLabel =
    importedAt != null
      ? new Date(importedAt).toLocaleString("es-AR", {
          year: "numeric",
          month: "2-digit",
          day: "2-digit",
          hour: "2-digit",
          minute: "2-digit",
        })
      : "—";

  const sourceLabel =
    sourceMode === "api"
      ? "API"
      : sourceMode === "public"
      ? "Archivo público"
      : sourceMode === "local-upload"
      ? "Subida local"
      : "—";

  // Mostrar “error duro” sólo si NO hay datos; si hay datos, mostrar “nota”.
  const hasData = items.length > 0;
  const infoToShow = notice || (hasData ? error : null);

  return (
    <>
      <div className="w-full">
        <div className="mx-auto max-w-screen-sm px-3 sm:px-4 md:max-w-2xl">
        <div className="sticky top-0 z-20 border-b border-border/60 bg-card/90 pt-3 pb-2 backdrop-blur supports-[backdrop-filter]:bg-card/70">
          <div className="flex items-center justify-between gap-2">
            <h1 className="text-lg font-semibold">Buscador de Precios</h1>
            <div className="text-right">
              <div className="text-xs text-muted-foreground">
                Cargados: {count.toLocaleString("es-AR")}
              </div>
              <div className="text-[11px] text-muted-foreground">
                Última actualización: {lastLabel} · Fuente: {sourceLabel}
              </div>
            </div>
          </div>

          <div className="mt-3 flex items-center gap-2">
            <Input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Buscar por nombre, código o barras…"
              className="h-11 rounded-xl bg-inputBackground/90 text-base shadow-[var(--shadow-card)]"
              inputMode="search"
              id={INPUT_ID}
            />

            {/* Input file oculto */}
            <input
              ref={fileRef}
              type="file"
              accept=".xlsx,.xls,.csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,text/csv"
              className="hidden"
              onChange={(e) => {
                const input = e.currentTarget; // snapshot ANTES del await
                const f = input.files?.[0];
                if (f) {
                  (async () => {
                    try {
                      await onUpload(f);
                    } finally {
                      input.value = ""; // permitir volver a elegir el mismo archivo
                    }
                  })();
                } else {
                  input.value = "";
                }
              }}
            />

            <Button
              variant="outline"
              className="h-11 rounded-xl px-4"
              title="Escanear código de barras"
              onClick={() => setScannerOpen(true)}
              aria-label="Escanear código de barras"
            >
              <Camera className="h-5 w-5" />
            </Button>

            <Button
              variant="outline"
              className="h-11 rounded-xl px-4"
              title="Actualizar precios (subir archivo)"
              onClick={() => fileRef.current?.click()}
              disabled={loading}
              aria-busy={loading}
            >
              <Upload className="h-5 w-5" />
            </Button>
          </div>

          {infoToShow ? (
            <div className="mt-2 text-xs text-accent-foreground">
              {infoToShow}
            </div>
          ) : !q ? (
            <div className="mt-1 text-xs text-muted-foreground">
              Se cargaron {count.toLocaleString("es-AR")} ítems. Escribe para buscar (máx. {LIMIT} resultados).
            </div>
          ) : null}

          {!hasData && error && (
            <div className="mt-2 text-xs text-destructive">{error}</div>
          )}
        </div>

        <div className={styles.listSpace}>
          {loading && <div className="text-sm text-muted-foreground">Cargando precios…</div>}

          {!loading && q && filtered.length === 0 && (
            <div className="text-sm text-muted-foreground">Sin resultados.</div>
          )}

          {filtered.map((it) => (
            <Card key={it.id} className={styles.card}>
              <CardContent className={styles.content}>
                <div className={styles.row}>
                  <div className="min-w-0">
                    <div className={styles.name}>
                      <Highlight text={it.name} q={q} />
                    </div>
                    <div className={styles.meta}>
                      {it.code && <span>#{it.code}</span>}
                      {it.barcode && <span className="font-mono text-[11px]">{it.barcode}</span>}
                      {it.updatedAt > 0 && (
                        <span title={it.updatedAtLabel}>
                          {new Date(it.updatedAt).toLocaleDateString("es-AR")}{" "}
                          {new Date(it.updatedAt).toLocaleTimeString("es-AR", {
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="shrink-0 text-right">
                    <div className={styles.price}>{fmtMoney(it.price)}</div>
                    <div className={styles.priceSub}>Precio más reciente</div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </div>

      <Dialog
        open={scannerOpen}
        onOpenChange={(open) => {
          if (open) {
            setScannerOpen(true);
          } else {
            handleScannerClose();
          }
        }}
      >
        <DialogContent className="max-w-xl w-full border-none bg-transparent p-0 shadow-none" showCloseButton={false}>
          <div className="mx-auto max-w-xl space-y-4 rounded-2xl bg-background/95 p-4 shadow-xl">
            <div className="px-1">
              <h2 className="text-base font-semibold">Escanear código de barras</h2>
              <p className="text-sm text-muted-foreground">
                Alineá el código dentro del recuadro. El resultado completa la búsqueda al instante.
              </p>
            </div>
            <BarcodeScanner onDetected={handleScan} onClose={handleScannerClose} />
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
