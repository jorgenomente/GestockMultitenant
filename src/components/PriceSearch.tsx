"use client";

import React from "react";
import BarcodeScanner from "@/components/BarcodeScanner";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Camera, Upload, RefreshCcw, Search } from "lucide-react";

/** ===================== Config ===================== */
const DENSITY_COMPACT = true;
const LS_KEY = "gestock:prices:v6"; // bump cache
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

type PriceApiInput = Record<string, unknown> & {
  name?: unknown;
  code?: unknown;
  barcode?: unknown;
  price?: unknown;
  updatedAt?: unknown;
  updatedAtMs?: unknown;
  updated?: unknown;
  updatedAtLabel?: unknown;
  fechaUltimaActualizacion?: unknown;
  "fecha ultima actualización"?: unknown;
  "ultima actualizacion"?: unknown;
  "última actualización"?: unknown;
};

type CatalogApiResponse = Partial<Omit<Catalog, "items">> & {
  items?: unknown;
};

const errorMessageFrom = (error: unknown, fallback: string) => {
  if (error instanceof Error) return error.message;
  if (typeof error === "string" && error.trim()) return error.trim();
  return fallback;
};

const logDebug = (context: string, error: unknown) => {
  if (process.env.NODE_ENV !== "production") {
    console.warn(context, error);
  }
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
const NBSP_RX = /[\u202F\u00A0]/g;

const fmtMoney = (n: number) =>
  n.toLocaleString("es-AR", { style: "currency", currency: "ARS", maximumFractionDigits: 0 });

const stripInvisibles = (s: string) => s.replace(NBSP_RX, " ");

const normText = (s: unknown) =>
  !s
    ? ""
    : String(s).normalize("NFD").replace(/\p{Diacritic}/gu, "").toLowerCase().replace(/\s+/g, " ").trim();

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
function normalizeFromApi(rawItem: unknown): PriceItem {
  const item: PriceApiInput =
    typeof rawItem === "object" && rawItem !== null ? (rawItem as PriceApiInput) : {};

  const name = String(item.name ?? "").trim();
  const codeValue = item.code;
  const code =
    codeValue == null
      ? undefined
      : String(codeValue).trim() || undefined;
  const barcode = item.barcode != null ? normBarcode(item.barcode) : undefined;

  // precio robusto
  let priceNum = 0;
  const priceRaw = item.price;
  if (typeof priceRaw === "number") priceNum = priceRaw;
  else if (typeof priceRaw === "string") {
    const clean = priceRaw.replace(/\./g, "").replace(/,/g, ".");
    const n = Number(clean.replace(/[^\d.]/g, ""));
    priceNum = Number.isFinite(n) ? n : 0;
  }

  // candidatos de fecha que puede traer el backend
  const dateCandidates: unknown[] = [
    item.updatedAt,
    item.updatedAtMs,
    item.updated,
    item.updatedAtLabel,
    item.fechaUltimaActualizacion,
    item["fecha ultima actualización"],
    item["ultima actualizacion"],
    item["última actualización"],
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
    typeof item.updatedAtLabel === "string" && item.updatedAtLabel.trim()
      ? item.updatedAtLabel
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
  } catch (fullCacheError) {
    logDebug("No se pudo cachear catálogo completo", fullCacheError);
    try {
      const lite: Catalog = {
        ...catalog,
        items: [], // sin items para no superar 5MB
      };
      localStorage.setItem(LS_KEY, JSON.stringify(lite));
    } catch (liteCacheError) {
      logDebug("No se pudo cachear metadatos de catálogo", liteCacheError);
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
    } catch (storageError) {
      logDebug("No se pudo restaurar cache local de precios", storageError);
    }
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
      const rawCat = (await res.json()) as CatalogApiResponse;

      const rawItems = Array.isArray(rawCat.items) ? rawCat.items : [];
      const normalized = rawItems.map((item) => normalizeFromApi(item));

      const canonItems = reduceLatestByDate(normalized);
      const canon: Catalog = {
        items: canonItems,
        rowCount: rawCat.rowCount ?? canonItems.length,
        importedAt: rawCat.importedAt ?? Date.now(),
        sourceMode: "api",
        sourceKey: typeof rawCat.sourceKey === "string" ? rawCat.sourceKey : undefined,
      };

      setItems(canon.items);
      setCount(canon.rowCount);
      setImportedAt(canon.importedAt ?? null);
      setSourceMode("api");
      safeSaveCache(canon);
    } catch (apiErr: unknown) {
      // ✅ Multitenant: no caer a /public si forzamos API
      if (FORCE_SOURCE === "api") {
        setError(errorMessageFrom(apiErr, "No se pudo cargar precios."));
        logDebug("Fallo al cargar catálogo de precios", apiErr);
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
            const parsed = await up.json();
            if (parsed && typeof parsed === "object") {
              const data = parsed as Record<string, unknown>;
              if (typeof data.error === "string") {
                serverMsg = data.error;
              } else if (typeof data.message === "string") {
                serverMsg = data.message;
              }
            }
          } catch (jsonError) {
            logDebug("No se pudo interpretar respuesta de subida de catálogo", jsonError);
          }
          throw new Error(serverMsg || "No se pudo subir el archivo");
        }
        setNotice("Catálogo actualizado en la nube.");
        await fetchCatalog(); // refresca desde la API
      } catch (uploadError: unknown) {
        setError(errorMessageFrom(uploadError, "Error actualizando precios."));
        logDebug("Fallo al subir catálogo de precios", uploadError);
      } finally {
        setLoading(false);
      }
    },
    [fetchCatalog, slug]
  );

  return { items, count, importedAt, sourceMode, loading, error, notice, onUpload, refresh: fetchCatalog };
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
  const { items, count, importedAt, sourceMode, loading, error, notice, onUpload, refresh } = usePrices(slug);
  const [q, setQ] = React.useState("");
  const qDebounced = useDebounced(q, 180);
  const LIMIT = 10;

  const fileRef = React.useRef<HTMLInputElement | null>(null);
  const searchSectionRef = React.useRef<HTMLElement | null>(null);
  const [scannerOpen, setScannerOpen] = React.useState(false);

  const scrollSearchIntoView = React.useCallback(() => {
    if (typeof window === "undefined") return;
    if (window.innerWidth >= 768) return;
    const node = searchSectionRef.current;
    if (!node) return;
    window.requestAnimationFrame(() => {
      const rect = node.getBoundingClientRect();
      const desiredTop = Math.max(rect.top + window.scrollY - 12, 0);
      if (Math.abs(window.scrollY - desiredTop) < 4) return;
      window.scrollTo({ top: desiredTop, behavior: "smooth" });
    });
  }, []);

  const focusSearchInput = React.useCallback(() => {
    if (typeof window === "undefined") return;
    scrollSearchIntoView();
    window.requestAnimationFrame(() => {
      const node = document.getElementById(INPUT_ID) as HTMLInputElement | null;
      if (!node) return;
      node.focus();
      try {
        const len = node.value.length;
        node.setSelectionRange(len, len);
      } catch (selectionError) {
        logDebug("No se pudo posicionar el cursor en la búsqueda", selectionError);
      }
    });
  }, [scrollSearchIntoView]);

  const handleSearchFocus = React.useCallback(() => {
    scrollSearchIntoView();
  }, [scrollSearchIntoView]);

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

  const listPadding = DENSITY_COMPACT ? "pb-24" : "pb-28";

  return (
    <>
      <div className="w-full bg-background">
        <div className="mx-auto max-w-5xl space-y-6 px-4 py-6 md:space-y-8 md:py-8">
          <section
            ref={searchSectionRef}
            className="sticky top-0 z-40 rounded-3xl border border-border/50 bg-background/95 p-5 shadow-[0_25px_60px_-35px_rgba(0,0,0,0.45)] backdrop-blur supports-[backdrop-filter]:bg-background/80 md:static md:bg-muted/20 md:p-7 md:backdrop-blur-none"
          >
            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
              <div className="space-y-1">
                <h1 className="text-2xl font-semibold text-foreground md:text-3xl">Consulta de precios</h1>
                <p className="text-xs text-muted-foreground">
                  Actualizado: {lastLabel} · Fuente: {sourceLabel}
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <span className="rounded-full border border-border/60 bg-background px-3 py-1 text-xs text-muted-foreground">
                  Ítems cargados: <span className="font-semibold text-foreground">{count.toLocaleString("es-AR")}</span>
                </span>
                <span className="rounded-full border border-border/60 bg-background px-3 py-1 text-xs text-muted-foreground uppercase tracking-wide">
                  Resultados máx.: {LIMIT}
                </span>
                <Button
                  variant="outline"
                  className="h-10 rounded-xl px-3 text-xs font-medium"
                  title="Actualizar precios (subir archivo)"
                  onClick={() => fileRef.current?.click()}
                  disabled={loading}
                  aria-busy={loading}
                >
                  <Upload className="mr-2 h-4 w-4" /> Importar precios
                </Button>
              </div>
            </div>

            <div className="mt-6 flex flex-col gap-3 md:flex-row md:items-center">
              <div className="relative flex-1">
                <Search className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground" />
                <Input
                  value={q}
                  onChange={(e) => setQ(e.target.value)}
                  onFocus={handleSearchFocus}
                  onClick={handleSearchFocus}
                  placeholder="Buscar producto, categoría o código…"
                  className="h-12 rounded-2xl border border-border/50 bg-background/70 pl-11 pr-4 text-base shadow-sm"
                  inputMode="search"
                  id={INPUT_ID}
                />
              </div>

              {/* Input file oculto */}
              <input
                ref={fileRef}
                type="file"
                accept=".xlsx,.xls,.csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,text/csv"
                className="hidden"
                onChange={(e) => {
                  const input = e.currentTarget;
                  const f = input.files?.[0];
                  if (f) {
                    (async () => {
                      try {
                        await onUpload(f);
                      } finally {
                        input.value = "";
                      }
                    })();
                  } else {
                    input.value = "";
                  }
                }}
              />

              <div className="flex shrink-0 items-center gap-2">
                <Button
                  variant="outline"
                  className="h-12 rounded-2xl px-4"
                  title="Refrescar catálogo"
                  onClick={() => void refresh()}
                  disabled={loading}
                  aria-busy={loading}
                >
                  <RefreshCcw className="h-5 w-5" />
                </Button>
                <Button
                  variant="outline"
                  className="h-12 rounded-2xl px-4"
                  title="Escanear código de barras"
                  onClick={() => setScannerOpen(true)}
                  aria-label="Escanear código de barras"
                >
                  <Camera className="h-5 w-5" />
                </Button>
              </div>
            </div>

            {infoToShow ? (
              <div className="mt-3 rounded-2xl border border-accent/40 bg-accent/15 px-4 py-2 text-xs text-accent-foreground">
                {infoToShow}
              </div>
            ) : !q ? (
              <div className="mt-3 text-xs text-muted-foreground">
                Se cargaron {count.toLocaleString("es-AR")} ítems. Escribí para buscar (máx. {LIMIT} coincidencias mostradas).
              </div>
            ) : null}

            {!hasData && error && (
              <div className="mt-3 rounded-2xl border border-destructive/40 bg-destructive/10 px-4 py-2 text-xs text-destructive">
                {error}
              </div>
            )}
          </section>

          <section className={`space-y-4 md:space-y-5 ${listPadding}`}>
            {loading && <div className="text-sm text-muted-foreground">Cargando precios…</div>}

            {!loading && q && filtered.length === 0 && (
              <div className="rounded-2xl border border-border/60 bg-background px-4 py-3 text-sm text-muted-foreground">
                No encontramos resultados para el término {q}.
              </div>
            )}

            {filtered.map((it) => {
              const updatedLabel = it.updatedAt > 0
                ? `${new Date(it.updatedAt).toLocaleDateString("es-AR")} · ${new Date(it.updatedAt).toLocaleTimeString("es-AR", {
                    hour: "2-digit",
                    minute: "2-digit",
                  })}`
                : null;

              return (
                <Card
                  key={it.id}
                  className="rounded-3xl border border-border/40 bg-card/60 shadow-[0_25px_60px_-45px_rgba(0,0,0,0.45)] transition-transform hover:-translate-y-0.5"
                >
                  <CardContent className="flex flex-col gap-4 p-5 md:gap-5 md:p-7">
                    <div className="flex flex-wrap items-center justify-between gap-3 text-xs uppercase tracking-wide text-muted-foreground">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="rounded-full bg-accent/15 px-3 py-1 text-accent-foreground">Producto</span>
                        {it.code && (
                          <span className="rounded-full bg-background px-3 py-1 font-medium text-foreground shadow-sm">#{it.code}</span>
                        )}
                        {it.barcode && (
                          <span className="rounded-full bg-background px-3 py-1 font-mono text-[11px] text-foreground/80 shadow-sm">
                            {it.barcode}
                          </span>
                        )}
                      </div>
                      {updatedLabel && (
                        <span className="rounded-full bg-muted/60 px-3 py-1 text-[11px] text-muted-foreground">
                          Actualizado · {updatedLabel}
                        </span>
                      )}
                    </div>

                    <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
                      <div className="space-y-2 md:max-w-[70%]">
                        <h2 className="text-xl font-semibold leading-snug text-foreground md:text-2xl">
                          <Highlight text={it.name} q={q} />
                        </h2>
                        <p className="text-sm text-muted-foreground">
                          Precio sugerido para el último registro disponible.
                        </p>
                      </div>
                      <div className="text-right">
                        <div className="text-3xl font-bold tracking-tight text-destructive md:text-4xl">
                          {fmtMoney(it.price)}
                        </div>
                        <div className="text-xs text-muted-foreground">Precio venta</div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </section>
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
