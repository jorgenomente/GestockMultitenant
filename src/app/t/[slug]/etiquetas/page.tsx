"use client";

import React from "react";
import * as XLSX from "xlsx";
import { v4 as uuid } from "uuid";

/* UI (shadcn/ui) */
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";

/* Icons */
import {
  Search as SearchIcon,
  ChevronDown,
  ChevronUp,
  X as XIcon,
  Download,
  Plus,
  ListChecks,
  ListX,
  ClipboardCopy,
  Check as CheckIcon,
  Trash2,
} from "lucide-react";

/* =================== Config =================== */
const VENTAS_URL = "/ventas.xlsx";
const TEMPLATE_URL = "/TablaPrecios.xlsx"; // template con estilos, opcional
const LS_KEY = "gestock:etiquetas:v3"; // bump por cambios

/* === Config para usar MISMA fuente que PriceSearch === */
const PRECIOS_LS_KEY = "gestock:prices:v4"; // misma key que PriceSearch
const PRECIOS_API_URL = "/api/precios";     // misma API
const PRECIOS_FILENAME = "precios.xlsx";
const BASE_PATH = (process.env.NEXT_PUBLIC_BASE_PATH ?? "").replace(/\/$/, "");
const PRECIOS_PUBLIC_URL = `${BASE_PATH ? BASE_PATH : ""}/${PRECIOS_FILENAME}`;

/* =================== Tipos =================== */
type Product = {
  id: string;
  name: string;
  unitPrice: number; // calculado o precio vigente
};

type LabelItem = {
  id: string;
  name: string;
  unitPrice: number;
  /** Para poder quitar desde el dropdown incluso si el nombre fue editado */
  sourceKey?: string; // id del Product
};

type PriceItemFromAny = {
  id?: string;
  name: string;
  code?: string;
  barcode?: string;
  price: number;
  updatedAt?: number;
  updatedAtLabel?: string;
};

/* ===== Helpers compartidos con PriceSearch para deduplicar ===== */
const NBSP_RX = /[\u202F\u00A0]/g;

const stripInvisibles = (s: string) => s.replace(NBSP_RX, " ");

const normText = (s: unknown) =>
  !s
    ? ""
    : String(s)
        .normalize("NFD")
        .replace(/\p{Diacritic}/gu, "")
        .toLowerCase()
        .replace(/\s+/g, " ")
        .trim();

const excelSerialToMs = (n: number) => Date.UTC(1899, 11, 30) + Math.round(n * 86400000);

const MIN_BARCODE_DIGITS_FOR_KEY = 8;

const barcodeKeyValue = (barcode?: string) => {
  if (!barcode) return "";
  const trimmed = stripInvisibles(barcode).trim();
  if (!trimmed) return "";
  if (/[A-Za-z]/.test(trimmed)) return normText(trimmed);
  const digits = trimmed.replace(/\D+/g, "");
  return digits.length >= MIN_BARCODE_DIGITS_FOR_KEY ? digits : "";
};

const keyFor = (name: string, barcode?: string, code?: string) => {
  const barKey = barcodeKeyValue(barcode);
  if (barKey) return barKey;
  const codeKey = code ? normText(code) : "";
  if (codeKey) return codeKey;
  const nameKey = normText(name);
  return nameKey || name.trim();
};

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

function parseUpdatedAt(value: unknown): number {
  if (value == null) return 0;

  if (typeof value === "number" && Number.isFinite(value)) {
    const n = value;

    if (n > 1e11) return n;

    if (n > 1e9 && n < 1e11) return n * 1000;

    if (n > 20000 && n < 80000) {
      const t = excelSerialToMs(n);
      return t < Date.UTC(2005, 0, 1) ? 0 : t;
    }

    return 0;
  }

  if (typeof value !== "string") return 0;

  const raw = stripInvisibles(value).trim();
  if (!raw) return 0;
  if (/^0?1\/0?1\/0{2}(\s+0{2}:0{2}(:0{2})?)?$/i.test(raw)) return 0;
  const s = raw.replace(/\s+/g, " ");

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

  m =
    /^(\d{1,2})\/(\d{1,2})\/(\d{4})\s+(\d{1,2}):(\d{2})(?::(\d{2}))?$/.exec(
      s
    );
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

  m =
    /^(\d{1,2})-(\d{1,2})-(\d{4})\s+(\d{1,2}):(\d{2})(?::(\d{2}))?$/.exec(
      s
    );
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

function reduceLatestByDate(list: PriceItemFromAny[]): PriceItemFromAny[] {
  const map = new Map<string, PriceItemFromAny>();

  for (const it of list) {
    const key = keyFor(it.name ?? "", it.barcode, it.code);
    if (!key) continue;

    const current = map.get(key);
    if (!current) {
      map.set(key, it);
      continue;
    }

    const currentTs = current.updatedAt ?? 0;
    const candidateTs = it.updatedAt ?? 0;

    if (candidateTs > currentTs) {
      map.set(key, it);
      continue;
    }

    if (candidateTs === currentTs) {
      const currentScore = (current.barcode ? 1 : 0) + (current.code ? 1 : 0);
      const candidateScore = (it.barcode ? 1 : 0) + (it.code ? 1 : 0);
      if (candidateScore > currentScore) {
        map.set(key, it);
        continue;
      }

      if (it.price < current.price) {
        map.set(key, it);
      }
    }
  }

  return Array.from(map.values()).sort(
    (a, b) => (b.updatedAt ?? 0) - (a.updatedAt ?? 0)
  );
}

/* =================== Utils =================== */
function normalize(str: string) {
  return (str || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .trim();
}
function tokensMatch(query: string, target: string) {
  const q = normalize(query).split(/\s+/).filter(Boolean);
  const t = normalize(target);
  return q.every((tok) => t.includes(tok));
}
function numberOrZero(n: unknown) {
  const v = Number(n);
  return Number.isFinite(v) ? v : 0;
}
function dedupeByName(arr: LabelItem[]): LabelItem[] {
  const seen = new Set<string>();
  const out: LabelItem[] = [];
  for (const it of arr) {
    const key = normalize(it.name);
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(it);
  }
  return out;
}
function round2(n: number) {
  return Math.round((Number(n) || 0) * 100) / 100;
}
function fmtDate(d: Date) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}${m}${day}`;
}
/** Evita que tabs o saltos rompan celdas al pegar en Excel */
function sanitizeCell(s: string) {
  return (s ?? "")
    .replace(/\t/g, " ")
    .replace(/\r?\n/g, " ");
}

/* ===== Textarea auto-alto (multilínea, sin scroll) ===== */
function AutoGrowTextarea({
  value,
  onChange,
  "aria-label": ariaLabel,
  className,
}: {
  value: string;
  onChange: React.ChangeEventHandler<HTMLTextAreaElement>;
  "aria-label"?: string;
  className?: string;
}) {
  const ref = React.useRef<HTMLTextAreaElement>(null);

  const resize = React.useCallback(() => {
    const el = ref.current;
    if (!el) return;
    el.style.height = "0px";
    const max = 200; // px
    el.style.height = Math.min(el.scrollHeight, max) + "px";
  }, []);

  React.useEffect(() => {
    resize();
  }, [value, resize]);

  React.useEffect(() => {
    const ro = new ResizeObserver(resize);
    if (ref.current) ro.observe(ref.current);
    return () => ro.disconnect();
  }, [resize]);

  return (
    <textarea
      ref={ref}
      value={value}
      onChange={onChange}
      aria-label={ariaLabel}
      rows={1}
      className={`block w-full resize-none overflow-hidden rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 ${className ?? ""}`}
    />
  );
}

/* =================== Helpers para cargar catálogo (misma fuente que PriceSearch) =================== */

/** Lee catálogo desde el LS que usa PriceSearch */
function readCatalogFromLS(): PriceItemFromAny[] | null {
  try {
    const raw = localStorage.getItem(PRECIOS_LS_KEY);
    if (!raw) return null;
    const cat = JSON.parse(raw) as { items?: PriceItemFromAny[] };
    if (Array.isArray(cat?.items) && cat.items.length) return cat.items;
    return null;
  } catch {
    return null;
  }
}

/** Normaliza un arreglo de PriceItem a Product[] */
function asProducts(arr: PriceItemFromAny[] | null | undefined): Product[] {
  if (!arr?.length) return [];

  const normalized = arr
    .map((raw) => {
      if (!raw) return null;

      const name = String(raw.name ?? "").trim();
      if (!name) return null;

      const priceValue = Number(raw.price);
      if (!Number.isFinite(priceValue)) return null;

      const codeValue = raw.code;
      const code = codeValue != null ? String(codeValue).trim() || undefined : undefined;

      const barcodeValue = raw.barcode;
      const barcode = barcodeValue != null ? normBarcode(barcodeValue) : undefined;

      const rawRecord = raw as Record<string, unknown>;
      const updatedCandidates: unknown[] = [
        raw.updatedAt,
        rawRecord["updatedAtMs"],
        rawRecord["updated"],
        rawRecord["updatedAtLabel"],
        rawRecord["fechaUltimaActualizacion"],
        rawRecord["fecha ultima actualización"],
        rawRecord["ultima actualizacion"],
        rawRecord["última actualización"],
        rawRecord["desde"],
      ];

      let updatedAt = 0;
      for (const cand of updatedCandidates) {
        const ts = parseUpdatedAt(cand);
        if (ts > updatedAt) updatedAt = ts;
      }

      const id = keyFor(name, barcode, code);
      if (!id) return null;

      return {
        id,
        name,
        code,
        barcode,
        price: priceValue,
        updatedAt,
      } satisfies PriceItemFromAny;
    })
    .filter(Boolean) as PriceItemFromAny[];

  if (!normalized.length) return [];

  const latest = reduceLatestByDate(normalized);

  return latest
    .map((item) => ({
      id: item.id ?? keyFor(item.name, item.barcode, item.code),
      name: item.name,
      unitPrice: Number(item.price),
    }))
    .filter((product) => product.id && Number.isFinite(product.unitPrice))
    .sort((a, b) => a.name.localeCompare(b.name, "es"));
}

/** Fallback a /precios.xlsx (público) usando detección flexible de columnas */
async function readCatalogFromPublicXlsx(): Promise<PriceItemFromAny[]> {
  try {
    const res = await fetch(`${PRECIOS_PUBLIC_URL}?v=${Date.now()}`, { cache: "no-store" });
    if (!res.ok) throw new Error("PUBLIC precios.xlsx HTTP " + res.status);
    const buf = await res.arrayBuffer();
    const wb = XLSX.read(buf, { type: "array" });
    const ws = wb.Sheets[wb.SheetNames[0]];
    const rows: Record<string, unknown>[] = XLSX.utils.sheet_to_json(ws, { defval: "" });

    const STOPWORDS = new Set(["de", "del", "la", "el", "los", "las"]);
    const norm = (s: string) =>
      s.normalize("NFD").replace(/\p{Diacritic}/gu, "").toLowerCase().replace(/\s+/g, " ").trim();
    const headerMatches = (h: string, a: string) => {
      const H = norm(h), A = norm(a);
      if (H === A) return true;
      const ht = H.split(" ").filter((t) => t && !STOPWORDS.has(t));
      const at = A.split(" ").filter((t) => t && !STOPWORDS.has(t));
      return at.every((t) => ht.includes(t));
    };

    const aliases = {
      name: ["descripcion", "descripción", "nombre", "detalle", "producto", "articulo", "artículo"],
      price: ["precio", "precio venta", "precio final", "pvp", "importe"],
      code: ["codigo", "código", "cod", "sku"],
      barcode: ["codigo barras", "código barras", "cod barras", "barcode", "ean"],
      since: ["desde", "vigencia desde", "fecha desde", "inicio vigencia"],
    } as const;
    const keys = Object.keys(rows[0] ?? {});
    let nameCol: string | null = null;
    let priceCol: string | null = null;
    let codeCol: string | null = null;
    let barcodeCol: string | null = null;
    let sinceCol: string | null = null;
    for (const k of keys) {
      if (!nameCol && aliases.name.some((a) => headerMatches(k, a))) nameCol = k;
      if (!priceCol && aliases.price.some((a) => headerMatches(k, a))) priceCol = k;
      if (!codeCol && aliases.code.some((a) => headerMatches(k, a))) codeCol = k;
      if (!barcodeCol && aliases.barcode.some((a) => headerMatches(k, a))) barcodeCol = k;
      if (!sinceCol && aliases.since.some((a) => headerMatches(k, a))) sinceCol = k;
    }
    if (!nameCol) nameCol = keys[0] ?? "nombre";
    if (!priceCol) priceCol = "precio";

    const list: PriceItemFromAny[] = rows
      .map((r) => {
        const rawName = String(r[nameCol as string] ?? "").trim();
        if (!rawName) return null;

        const rawPrice = r[priceCol as string];
        let price = 0;
        if (typeof rawPrice === "number") price = rawPrice;
        else if (typeof rawPrice === "string") {
          const clean = rawPrice.replace(/\./g, "").replace(/,/g, ".");
          const n = Number(clean.replace(/[^\d.]/g, ""));
          price = Number.isFinite(n) ? n : 0;
        }
        if (!Number.isFinite(price) || price <= 0) return null;

        const codeValue = codeCol ? r[codeCol] : undefined;
        const barcodeValue = barcodeCol ? r[barcodeCol] : undefined;
        const sinceValue = sinceCol ? r[sinceCol] : undefined;

        return {
          name: rawName,
          price,
          code: codeValue != null ? String(codeValue).trim() || undefined : undefined,
          barcode: barcodeValue != null ? String(barcodeValue).trim() || undefined : undefined,
          updatedAt: parseUpdatedAt(sinceValue ?? undefined),
        } satisfies PriceItemFromAny;
      })
      .filter(Boolean) as PriceItemFromAny[];

    return list;
  } catch {
    return [];
  }
}

/** ÚLTIMO fallback: tu ventas.xlsx actual (consolidado por ARTÍCULO) */
async function readFromVentasXlsx(): Promise<PriceItemFromAny[]> {
  try {
    const res = await fetch(VENTAS_URL, { cache: "no-store" });
    if (!res.ok) throw new Error("VENTAS HTTP " + res.status);
    const buf = await res.arrayBuffer();
    const wb = XLSX.read(buf, { type: "array" });
    const ws = wb.Sheets[wb.SheetNames[0]];
    const raw = XLSX.utils.sheet_to_json<Record<string, unknown>>(ws, { defval: null });

    const map = new Map<string, number>();
    for (const row of raw) {
      const name = String(row?.["ARTÍCULO"] ?? "").trim();
      const qty = numberOrZero(row?.["CANTIDAD"]);
      const subtotal = numberOrZero(row?.["SUBTOTAL"]);
      if (!name) continue;
      if (qty > 0) {
        const unit = subtotal / qty;
        if (Number.isFinite(unit) && unit > 0) map.set(name, unit);
      }
    }
    const items: PriceItemFromAny[] = Array.from(map.entries()).map(([name, unitPrice]) => ({
      name,
      price: unitPrice,
      updatedAt: 0,
    }));
    return items;
  } catch {
    return [];
  }
}

/** Carga catálogo como PriceSearch: LS → API → /precios.xlsx → ventas.xlsx */
async function loadCatalogFromPrecios(): Promise<Product[]> {
  // 1) LS
  const lsItems = readCatalogFromLS();
  if (lsItems?.length) return asProducts(lsItems);

  // 2) API
  try {
    const res = await fetch(`${PRECIOS_API_URL}`, { cache: "no-store" });
    if (res.ok) {
      const cat = await res.json(); // { items: PriceItem[] } o similar
      const rawItems = Array.isArray(cat?.items)
        ? (cat.items as PriceItemFromAny[])
        : Array.isArray(cat)
        ? (cat as PriceItemFromAny[])
        : [];
      const prods = asProducts(rawItems);
      if (prods.length) return prods;
    }
  } catch (error) {
    console.warn("No se pudo cargar catálogo desde la API de precios", error);
  }

  // 3) /precios.xlsx público
  const fromPublic = await readCatalogFromPublicXlsx();
  const publicProducts = asProducts(fromPublic);
  if (publicProducts.length) return publicProducts;

  // 4) ventas.xlsx (fallback final)
  const fromVentas = await readFromVentasXlsx();
  return asProducts(fromVentas);
}

/* =================== Página =================== */
export default function EtiquetasPage() {
  const [loading, setLoading] = React.useState(false);
  const [source, setSource] = React.useState<Product[]>([]);
  const [query, setQuery] = React.useState("");
  const [openDrop, setOpenDrop] = React.useState(false);

  // refs para detectar click afuera
  const wrapperRef = React.useRef<HTMLDivElement>(null);
  const dropdownRef = React.useRef<HTMLDivElement>(null);

  // visibles (para select/deselect masivo)
  const [visibleIds, setVisibleIds] = React.useState<Set<string>>(new Set());

  // lista final para imprimir
  const [items, setItems] = React.useState<LabelItem[]>([]);

  // feedback copiar
  const [copiedExcel, setCopiedExcel] = React.useState(false);
  const [copiedList, setCopiedList] = React.useState(false);

  /* ====== Cerrar dropdown al click afuera ====== */
  React.useEffect(() => {
    const onDown = (e: MouseEvent | TouchEvent) => {
      if (!openDrop) return;
      const target = e.target as Node;
      const inWrapper = wrapperRef.current?.contains(target);
      const inDrop = dropdownRef.current?.contains(target);
      if (!inWrapper && !inDrop) setOpenDrop(false);
    };
    document.addEventListener("mousedown", onDown);
    document.addEventListener("touchstart", onDown);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("touchstart", onDown);
    };
  }, [openDrop]);

  /* ====== Carga inicial: restaurar lista + cargar catálogo de Precios ====== */
  React.useEffect(() => {
    // Restaurar lista final (LS de Etiquetas)
    const persisted = localStorage.getItem(LS_KEY);
    if (persisted) {
      try {
        const parsed = JSON.parse(persisted) as LabelItem[];
        setItems(parsed);
      } catch (error) {
        console.warn("No se pudieron restaurar las etiquetas guardadas", error);
      }
    }

    // Cargar fuente del buscador desde el mismo catálogo que PriceSearch
    (async () => {
      setLoading(true);
      try {
        const products = await loadCatalogFromPrecios();
        setSource(products);
      } catch (e) {
        console.error("Error cargando catálogo para Etiquetas:", e);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  /* ====== Persistencia LS ====== */
  React.useEffect(() => {
    localStorage.setItem(LS_KEY, JSON.stringify(items));
  }, [items]);

  /* ====== Sugerencias filtradas ====== */
  const suggestions = React.useMemo(() => {
    if (!query.trim()) return source.slice(0, 30);
    return source.filter((p) => tokensMatch(query, p.name)).slice(0, 50);
  }, [query, source]);

  /* set de visibles */
  React.useEffect(() => {
    const ids = new Set<string>(suggestions.map((s) => s.id));
    setVisibleIds(ids);
  }, [suggestions]);

  /* ====== Handlers dropdown (toggle agrega/quita directo) ====== */
  const inListBySourceKey = React.useCallback(
    (key: string) => items.some((it) => it.sourceKey === key),
    [items]
  );

  const addProduct = React.useCallback((p: Product) => {
    setItems((prev) =>
      dedupeByName([
        ...prev,
        { id: uuid(), name: p.name, unitPrice: p.unitPrice, sourceKey: p.id },
      ])
    );
  }, []);

  const removeBySourceKey = React.useCallback((key: string) => {
    setItems((prev) => prev.filter((it) => it.sourceKey !== key));
  }, []);

  const toggleById = (id: string) => {
    const p = source.find((x) => x.id === id);
    if (!p) return;
    if (inListBySourceKey(id)) removeBySourceKey(id);
    else addProduct(p);
  };

  /** Seleccionar visibles = agregar todos los visibles a la lista */
  const addVisible = () => {
    setItems((prev) => {
      const merged = [...prev];
      for (const p of source) {
        if (!visibleIds.has(p.id)) continue;
        const yaEsta =
          merged.some((it) => it.sourceKey === p.id) ||
          merged.some((it) => normalize(it.name) === normalize(p.name));
        if (!yaEsta) merged.push({ id: uuid(), name: p.name, unitPrice: p.unitPrice, sourceKey: p.id });
      }
      return dedupeByName(merged);
    });
  };

  /** Deseleccionar visibles = quitar todos los visibles de la lista */
  const removeVisible = () => {
    setItems((prev) => prev.filter((it) => !(it.sourceKey && visibleIds.has(it.sourceKey))));
  };

  const addFreeItem = () => {
    const name = query.trim();
    if (!name) return;
    setItems((prev) => dedupeByName([...prev, { id: uuid(), name, unitPrice: 0 }]));
    setQuery("");
    setOpenDrop(false);
  };

  /* ====== Lista final (edit/reorder/delete) ====== */
  const updateItem = (id: string, patch: Partial<LabelItem>) => {
    setItems((prev) => prev.map((it) => (it.id === id ? { ...it, ...patch } : it)));
  };
  const moveUp = (idx: number) => {
    if (idx <= 0) return;
    setItems((prev) => {
      const arr = prev.slice();
      [arr[idx - 1], arr[idx]] = [arr[idx], arr[idx - 1]];
      return arr;
    });
  };
  const moveDown = (idx: number) => {
    setItems((prev) => {
      if (idx >= prev.length - 1) return prev;
      const arr = prev.slice();
      [arr[idx + 1], arr[idx]] = [arr[idx], arr[idx + 1]];
      return arr;
    });
  };
  const removeItem = (id: string) => {
    setItems((prev) => prev.filter((it) => it.id !== id));
  };

  /* ====== Export XLSX: una sola columna (A:B:C) ====== */
  const exportXlsx = async () => {
    const ExcelJS = (await import("exceljs")).default;

    try {
      const res = await fetch(TEMPLATE_URL, { cache: "no-store" });
      let wb = new ExcelJS.Workbook();

      if (res.ok) {
        const buf = await res.arrayBuffer();
        await wb.xlsx.load(buf);
      } else {
        wb = createFallbackWorkbook(ExcelJS.Workbook);
      }

      const ws = wb.worksheets[0] || wb.addWorksheet("TablaPrecios");

      // Limpieza manteniendo estilos: solo columnas A-C
      const maxRows = Math.max(ws.rowCount, items.length);
      for (let r = 1; r <= maxRows; r++) {
        (["A", "B", "C"] as const).forEach((c) => {
          const cell = ws.getCell(`${c}${r}`);
          if (!cell) return;
          if (c === "B") cell.value = "$";
          else cell.value = null;
        });
        // Si el template tenía columnas D-G, las vacío y achico
        (["D", "E", "F", "G"] as const).forEach((c) => {
          const cell = ws.getCell(`${c}${r}`);
          if (cell) cell.value = null;
        });
      }

      // Escribir ítems 1 por fila
      items.forEach((it, i) => {
        const row = i + 1;
        const safeName = sanitizeCell(it.name);
        ws.getCell(`A${row}`).value = safeName;
        ws.getCell(`B${row}`).value = "$";
        ws.getCell(`C${row}`).value = round2(it.unitPrice);
      });

      applyStylesAndBreaks(ws, items.length);

      const buffer = await wb.xlsx.writeBuffer();
      const blob = new Blob([buffer], {
        type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      });
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = `TablaPrecios_${fmtDate(new Date())}.xlsx`;
      a.click();
      URL.revokeObjectURL(a.href);
    } catch (err) {
      console.error("Error exportando XLSX:", err);
      exportPlainXlsxFallback(items);
    }
  };

/* ====== Fallback Workbook: 1 columna ====== */
function createFallbackWorkbook(WorkbookCtor: typeof import("exceljs").Workbook) {
  const wb = new WorkbookCtor();
  const ws = wb.addWorksheet("TablaPrecios");

  // Solo A (nombre), B ($), C (precio)
  ws.columns = [
    { key: "name",  width: 42 },
    { key: "sign",  width: 4 },
    { key: "price", width: 10 },
  ];

  const BORDER_WHITE: Partial<import("exceljs").Borders> = {
    top: { style: "thin", color: { argb: "FFFFFFFF" } },
    left: { style: "thin", color: { argb: "FFFFFFFF" } },
    bottom: { style: "thin", color: { argb: "FFFFFFFF" } },
    right: { style: "thin", color: { argb: "FFFFFFFF" } },
  };
  const BORDER_BLACK: Partial<import("exceljs").Borders> = {
    top: { style: "thin", color: { argb: "FF000000" } },
    left: { style: "thin", color: { argb: "FF000000" } },
    bottom: { style: "thin", color: { argb: "FF000000" } },
    right: { style: "thin", color: { argb: "FF000000" } },
  };

  for (let r = 1; r <= 800; r++) {
    ws.getRow(r).height = 30;

    // A: nombre (fondo negro texto blanco)
    const a = ws.getCell(`A${r}`);
    a.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF000000" } };
    a.font = { name: "Roboto Mono", size: 14, color: { argb: "FFFFFFFF" } };
    a.alignment = { vertical: "middle", wrapText: true };
    a.border = { ...BORDER_WHITE };

    // B: $
    const b = ws.getCell(`B${r}`);
    b.value = "$";
    b.font = { name: "Roboto Mono", size: 14, bold: true, color: { argb: "FF000000" } };
    b.alignment = { vertical: "middle", horizontal: "center" };
    b.border = { ...BORDER_BLACK };

    // C: precio
    const c = ws.getCell(`C${r}`);
    c.font = { name: "Roboto Mono", size: 14, color: { argb: "FF000000" } };
    c.alignment = { vertical: "middle", horizontal: "left" };
    c.border = { ...BORDER_BLACK };
  }

  ws.pageSetup = {
    orientation: "portrait",
    fitToPage: false,
    paperSize: 9, // A4
    margins: { left: 0.25, right: 0.25, top: 0.25, bottom: 0.25, header: 0.1, footer: 0.1 },
  };

  return wb;
}

/* ====== Estilos + quiebres (1 ítem por fila) ====== */
function applyStylesAndBreaks(ws: import("exceljs").Worksheet, itemCount: number) {
  const totalRows = itemCount;

  const BORDER_WHITE: Partial<import("exceljs").Borders> = {
    top: { style: "thin", color: { argb: "FFFFFFFF" } },
    left: { style: "thin", color: { argb: "FFFFFFFF" } },
    bottom: { style: "thin", color: { argb: "FFFFFFFF" } },
    right: { style: "thin", color: { argb: "FFFFFFFF" } },
  };
  const BORDER_BLACK: Partial<import("exceljs").Borders> = {
    top: { style: "thin", color: { argb: "FF000000" } },
    left: { style: "thin", color: { argb: "FF000000" } },
    bottom: { style: "thin", color: { argb: "FF000000" } },
    right: { style: "thin", color: { argb: "FF000000" } },
  };

  for (let r = 1; r <= totalRows; r++) {
    const row = ws.getRow(r);
    if (!row.height) row.height = 30;

    // A (nombre) con mismo estilo que fallback
    const A = ws.getCell(`A${r}`);
    A.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF000000" } };
    A.font = { name: "Roboto Mono", size: 14, color: { argb: "FFFFFFFF" } };
    A.alignment = { vertical: "middle", wrapText: true };
    A.border = { ...BORDER_WHITE };

    const B = ws.getCell(`B${r}`);
    B.value = "$";
    B.font = { name: "Roboto Mono", size: 14, bold: true, color: { argb: "FF000000" } };
    B.alignment = { vertical: "middle", horizontal: "center" };
    B.border = { ...BORDER_BLACK };

    const C = ws.getCell(`C${r}`);
    if (C.value == null) C.value = "";
    C.font = { name: "Roboto Mono", size: 14, color: { argb: "FF000000" } };
    C.alignment = { vertical: "middle", horizontal: "left" };
    C.border = { ...BORDER_BLACK };
  }

  // Ajuste de columnas a 1 bloque (A-C). Si el template tenía D-G, las achico.
  ws.columns = [
    { key: "name",  width: 42 },
    { key: "sign",  width: 4 },
    { key: "price", width: 10 },
    { key: "gap",   width: 2 }, // por compatibilidad si existía D
  ];
  // Si existían E-G, poner width mínimo
  ["E","F","G"].forEach((col) => {
    const c = ws.getColumn(col);
    if (c) c.width = 2;
  });

  // Quiebres: mantener misma altura física ⇒ 38 ítems por página
  const breaks: number[] = [];
  for (let r = 38; r < totalRows; r += 38) breaks.push(r + 1);
  if (breaks.length && typeof ws.getRow(1).addPageBreak === "function") {
    breaks.forEach((rowNumber) => {
      ws.getRow(rowNumber).addPageBreak();
    });
  } else if (ws.pageSetup) {
    ws.pageSetup.fitToPage = false;
    ws.pageSetup.printArea = `A1:C${totalRows}`;
  }
}

/* ====== Fallback simple (sin estilos) en 1 columna ====== */
function exportPlainXlsxFallback(items: LabelItem[]) {
  const rows: Array<{ A: string; B: string; C: number }> = [];
  for (let i = 0; i < items.length; i++) {
    const it = items[i];
    rows.push({
      A: sanitizeCell(it.name),
      B: "$",
      C: round2(it.unitPrice),
    });
  }

  const ws = XLSX.utils.json_to_sheet(rows, {
    header: ["A", "B", "C"],
    skipHeader: true,
  });

  ws["!cols"] = [
    { wch: 42 },
    { wch: 4 },
    { wch: 10 },
  ];

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "TablaPrecios");
  XLSX.writeFile(wb, `TablaPrecios_${fmtDate(new Date())}.xlsx`);
}


  /* ====== Copiar en formato Excel (TSV con CRLF) ====== */
  const copiarTablaExcel = async () => {
    const rows: string[] = [];
    for (let i = 0; i < items.length; i += 2) {
      const left = items[i];
      const right = items[i + 1];

      const A = left ? sanitizeCell(left.name) : "";
      const B = left ? "$" : "";
      const C = left ? String(round2(left.unitPrice)) : "";
      const D = ""; // columna separadora
      const E = right ? sanitizeCell(right.name) : "";
      const F = right ? "$" : "";
      const G = right ? String(round2(right.unitPrice)) : "";

      rows.push([A, B, C, D, E, F, G].join("\t"));
    }
    const tsv = rows.join("\r\n") + "\r\n";

    try {
      await navigator.clipboard.writeText(tsv);
      setCopiedExcel(true);
      setTimeout(() => setCopiedExcel(false), 1600);
    } catch (e) {
      console.error("No se pudo copiar al portapapeles (Excel)", e);
      window.prompt("Copiá con ⌘/Ctrl+C y Enter:", tsv);
    }
  };

  /* ====== Copiar como lista simple (una por línea) ====== */
  const copiarListaSimple = async () => {
    const text = items.map((it) => sanitizeCell(it.name)).join("\n") + "\n";
    try {
      await navigator.clipboard.writeText(text);
      setCopiedList(true);
      setTimeout(() => setCopiedList(false), 1600);
    } catch (e) {
      console.error("No se pudo copiar al portapapeles (lista)", e);
      window.prompt("Copiá con ⌘/Ctrl+C y Enter:", text);
    }
  };

  /* ====== Vaciar lista ====== */
  const clearAll = () => {
    if (!items.length) return;
    const ok = window.confirm("¿Vaciar la lista de etiquetas?");
    if (!ok) return;
    setItems([]);
  };

  /* ====== Render ====== */
  return (
    <div className="p-3 max-w-2xl mx-auto space-y-3">
      <h1 className="text-xl font-semibold">Etiquetas</h1>
      <Card ref={wrapperRef}>
        <CardContent className="p-3 space-y-3">
          <div className="flex items-center gap-2">
            <div className="relative flex-1">
              <Input
                placeholder="Buscar artículo (palabras en cualquier orden)..."
                value={query}
                onChange={(e) => {
                  setQuery(e.target.value);
                  setOpenDrop(true);
                }}
                onFocus={() => setOpenDrop(true)}
                onKeyDown={(e) => {
                  if (e.key === "Escape") setOpenDrop(false);
                  if (e.key === "Enter") addFreeItem();
                }}
                aria-label="Buscar artículo"
                className="pr-16"
              />

              {/* Botón para limpiar el input */}
              {query && (
                <Button
                  type="button"
                  size="icon"
                  variant="ghost"
                  className="absolute right-2 top-1/2 -translate-y-1/2 h-7 w-7"
                  onClick={() => setQuery("")}
                  aria-label="Limpiar búsqueda"
                >
                  <XIcon className="h-4 w-4" />
                </Button>
              )}
              <SearchIcon className="absolute right-10 top-2.5 h-4 w-4 text-muted-foreground pointer-events-none" />

              {openDrop && (
                <div
                  ref={dropdownRef}
                  className="absolute z-20 mt-1 w-full rounded-xl border bg-background shadow-lg max-h-[300px] overflow-auto"
                >
                  {/* Barra superior del dropdown */}
                  <div className="sticky top-0 z-10 bg-background p-2 flex items-center gap-2 border-b">
                    <Button size="sm" variant="secondary" onClick={addVisible} className="gap-1">
                      <ListChecks className="h-4 w-4" /> Seleccionar visibles
                    </Button>
                    <Button size="sm" variant="secondary" onClick={removeVisible} className="gap-1">
                      <ListX className="h-4 w-4" /> Deseleccionar visibles
                    </Button>
                    <div className="ml-auto flex items-center gap-2">
                      {query.trim() && (
                        <Button size="sm" onClick={addFreeItem} className="gap-1">
                          <Plus className="h-4 w-4" />
                          Agregar
                        </Button>
                      )}
                      <Button size="sm" variant="ghost" onClick={() => setOpenDrop(false)}>
                        Cerrar
                      </Button>
                    </div>
                  </div>

                  {/* Lista de sugerencias */}
                  <ul className="divide-y">
                    {loading && (
                      <li className="p-3 text-sm text-muted-foreground">Cargando catálogo…</li>
                    )}
                    {!loading && suggestions.length === 0 && (
                      <li className="p-3 text-sm">
                        Sin coincidencias.
                        {query.trim() && (
                          <Button
                            size="sm"
                            variant="link"
                            className="pl-2"
                            onClick={addFreeItem}
                            aria-label="Agregar ítem libre"
                          >
                            Agregar “{query.trim()}”
                          </Button>
                        )}
                      </li>
                    )}
                    {suggestions.map((s) => (
                      <li key={s.id} className="p-2 hover:bg-muted/50">
                        {/* alineamos desde arriba por si el nombre ocupa 2 líneas */}
                        <label className="flex items-start gap-2">
                          <Checkbox
                            checked={inListBySourceKey(s.id)}
                            onCheckedChange={() => toggleById(s.id)}
                            aria-label={inListBySourceKey(s.id) ? "Quitar de la lista" : "Agregar a la lista"}
                          />
                          <div className="flex-1 min-w-0">
                            {/* 2 líneas con ellipsis, sin plugin */}
                            <div
                              className={[
                                "font-medium leading-tight whitespace-normal break-words pr-2",
                                "[display:-webkit-box] [-webkit-line-clamp:2] [-webkit-box-orient:vertical] overflow-hidden",
                              ].join(" ")}
                            >
                              {s.name}
                            </div>
                            <div className="text-xs text-muted-foreground">
                              Precio: ${round2(s.unitPrice).toLocaleString("es-AR")}
                            </div>
                          </div>
                          <Badge variant="outline" className="shrink-0 self-start">ARS</Badge>
                        </label>
                      </li>
                    ))}
                  </ul>

                  {/* Footer del dropdown */}
                  <div className="sticky bottom-0 z-10 bg-background p-2 border-t flex gap-2">
                    <Button size="sm" variant="secondary" onClick={() => query.trim() && addFreeItem()}>
                      <Plus className="h-4 w-4 mr-1" />
                      Agregar
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => setOpenDrop(false)}>
                      Cerrar
                    </Button>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Lista final (sin precio visible) */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-medium">Lista para imprimir</h2>
              <Badge variant="secondary">{items.length} ítems</Badge>
            </div>

            <ul className="space-y-2">
              {items.map((it, idx) => (
                <li key={it.id} className="border rounded-xl p-2">
                  <div className="flex items-start gap-2 flex-wrap">
                    <Button
                      size="icon"
                      variant="secondary"
                      onClick={() => moveUp(idx)}
                      aria-label="Subir"
                    >
                      <ChevronUp className="h-4 w-4" />
                    </Button>
                    <Button
                      size="icon"
                      variant="secondary"
                      onClick={() => moveDown(idx)}
                      aria-label="Bajar"
                    >
                      <ChevronDown className="h-4 w-4" />
                    </Button>

                    {/* textarea que muestra TODO el nombre (multilínea) */}
                    <div className="flex-1 min-w-[140px]">
                      <AutoGrowTextarea
                        value={it.name}
                        onChange={(e) => updateItem(it.id, { name: e.target.value })}
                        aria-label="Nombre artículo"
                      />
                    </div>

                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={() => removeItem(it.id)}
                      aria-label="Borrar"
                    >
                      <XIcon className="h-4 w-4" />
                    </Button>
                  </div>
                </li>
              ))}
            </ul>

            <div className="pt-2 flex items-center justify-between gap-2 flex-wrap">
              <div className="text-xs text-muted-foreground">
                Editá nombre. Usá ↑↓ para ordenar. Enter en el buscador crea ítem.
              </div>
              <div className="flex gap-2 flex-wrap">
                <Button onClick={copiarTablaExcel} variant="secondary" className="gap-2" aria-label="Copiar para Excel">
                  {copiedExcel ? <CheckIcon className="h-4 w-4" /> : <ClipboardCopy className="h-4 w-4" />}
                  {copiedExcel ? "Copiado (Excel)" : "Copiar Excel"}
                </Button>
                <Button onClick={copiarListaSimple} variant="secondary" className="gap-2" aria-label="Copiar lista simple">
                  {copiedList ? <CheckIcon className="h-4 w-4" /> : <ClipboardCopy className="h-4 w-4" />}
                  {copiedList ? "Copiada" : "Copiar lista"}
                </Button>
                <Button onClick={exportXlsx} className="gap-2" aria-label="Exportar XLSX">
                  <Download className="h-4 w-4" />
                  Exportar XLSX
                </Button>
                <Button onClick={clearAll} variant="destructive" className="gap-2" aria-label="Vaciar lista">
                  <Trash2 className="h-4 w-4" />
                  Vaciar
                </Button>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
