// src/lib/pricesServer.ts
import { Readable } from "node:stream";
import * as XLSX from "xlsx";

// ======= Utils compartidos (copiados de tu cliente y adaptados a server) =======
const NBSP_RX = /[\u202F\u00A0]/g;
const STOPWORDS = new Set(["de", "del", "la", "el", "los", "las"]);

export const stripInvisibles = (s: string) => s.replace(NBSP_RX, " ");
export const normText = (s: unknown) =>
  !s ? "" : String(s).normalize("NFD").replace(/\p{Diacritic}/gu, "").toLowerCase().replace(/\s+/g, " ").trim();

const MIN_BARCODE_DIGITS_FOR_KEY = 8;

const barcodeKeyValue = (barcode?: string) => {
  if (!barcode) return "";
  const trimmed = stripInvisibles(barcode).trim();
  if (!trimmed) return "";
  if (/[A-Za-z]/.test(trimmed)) return normText(trimmed);
  const digits = trimmed.replace(/\D+/g, "");
  return digits.length >= MIN_BARCODE_DIGITS_FOR_KEY ? digits : "";
};

export const keyFor = (name: string, barcode?: string, code?: string) => {
  const barKey = barcodeKeyValue(barcode);
  if (barKey) return barKey;

  const codeKey = code ? normText(code) : "";
  if (codeKey) return codeKey;

  const nameKey = normText(name);
  return nameKey || name.trim();
};

const excelSerialToMs = (n: number) => Date.UTC(1899, 11, 30) + Math.round(n * 86400000);

export function normBarcode(val: unknown): string | undefined {
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

export function parseUpdatedAt(value: unknown): number {
  if (value == null) return 0;

  if (typeof value === "number" && Number.isFinite(value)) {
    const n = value;
    if (n > 1e11) return n;                  // ms epoch
    if (n > 1e9 && n < 1e11) return n * 1000; // s epoch
    if (n > 20000 && n < 80000) {             // excel serial
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
    /^(\d{1,2})\/(\d{1,2})\/(\d{4})\s+(\d{1,2}):(\d{2})(?::(\d{2}))?\s*([AP]M)$/i.exec(s);
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
    /^(\d{1,2})\/(\d{1,2})\/(\d{4})\s+(\d{1,2}):(\d{2})(?::(\d{2}))?\s*([ap])\s*\.?\s*m\.?$/i.exec(s);
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

  m = /^(\d{1,2})\/(\d{1,2})\/(\d{4})\s+(\d{1,2}):(\d{2})(?::(\d{2}))?$/.exec(s);
  if (m) {
    const [, dd, MM, yyyy, HH, mm, ssOpt] = m;
    const t = Date.UTC(+yyyy, +MM - 1, +dd, parseInt(HH, 10), parseInt(mm, 10), ssOpt ? parseInt(ssOpt, 10) : 0);
    return t < Date.UTC(2005, 0, 1) ? 0 : t;
  }

  m = /^(\d{1,2})-(\d{1,2})-(\d{4})\s+(\d{1,2}):(\d{2})(?::(\d{2}))?$/.exec(s);
  if (m) {
    const [, dd, MM, yyyy, HH, mm, ssOpt] = m;
    const t = Date.UTC(+yyyy, +MM - 1, +dd, parseInt(HH, 10), parseInt(mm, 10), ssOpt ? parseInt(ssOpt, 10) : 0);
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

export type PriceItem = {
  id: string;
  name: string;
  code?: string;
  barcode?: string;
  price: number;
  updatedAt: number;
  updatedAtLabel: string;
};

export type Catalog = {
  items: PriceItem[];
  rowCount: number;
  importedAt: number;
  sourceMode: "api" | "public" | "local-upload";
  sourceKey?: string;
};

function headerMatches(header: string, alias: string) {
  const norm = (s: string) => s.normalize("NFD").replace(/\p{Diacritic}/gu, "").toLowerCase().replace(/\s+/g, " ").trim();
  const h = norm(header), a = norm(alias);
  if (h === a) return true;
  const hTok = h.split(" ").filter((t) => t && !STOPWORDS.has(t));
  const aTok = a.split(" ").filter((t) => t && !STOPWORDS.has(t));
  return aTok.every((t) => hTok.includes(t));
}

export async function parseWorkbookFromFile(file: File) {
  const buf = Buffer.from(await file.arrayBuffer());
  const wb = XLSX.read(buf, { type: "buffer" });
  const wsName = wb.SheetNames[0];
  const ws = wb.Sheets[wsName];
  const rows: Record<string, unknown>[] = XLSX.utils.sheet_to_json(ws, { defval: "" });
  return rows;
}

export function buildCatalog(rows: Record<string, unknown>[]): Catalog {
  const aliases: Record<string, string[]> = {
    name: ["descripcion", "descripción", "nombre", "detalle", "producto", "articulo", "artículo"],
    code: ["codigo", "código", "id", "sku", "código interno", "cod interno"],
    barcode: ["barcode","barra","barras","codigo barras","código barras","codigo de barras","código de barras","cod barras","cod. barras","ean"],
    price: ["precio", "precio venta", "precio final", "pvp", "importe"],
    updated: ["desde"],
  };

  const first = rows[0] ?? {};
  const keys = Object.keys(first);
  const colMap: Record<"name" | "code" | "barcode" | "price" | "updated", string | null> = {
    name: null, code: null, barcode: null, price: null, updated: null,
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

  const items: PriceItem[] = [];
  let rowCount = 0;

  for (const r of rows) {
    rowCount++;
    const rawName = String(r[colMap.name as string] ?? "").trim();
    if (!rawName) continue;

    const code = r[colMap.code as string] ? String(r[colMap.code as string]).trim() : undefined;
    const barcode = colMap.barcode ? normBarcode(r[colMap.barcode as string]) : undefined;

    let priceNum = 0;
    const priceRaw = r[colMap.price as string];
    if (typeof priceRaw === "number") priceNum = priceRaw;
    else if (typeof priceRaw === "string") {
      const clean = priceRaw.replace(/\./g, "").replace(/,/g, ".");
      const n = Number(clean.replace(/[^\d.]/g, ""));
      priceNum = Number.isFinite(n) ? n : 0;
    }

    const updRaw = colMap.updated ? r[colMap.updated as string] : undefined;
    const updatedAt = parseUpdatedAt(updRaw);
    const updatedAtLabel =
      typeof updRaw === "string" ? String(updRaw) : updatedAt ? new Date(updatedAt).toLocaleString("es-AR") : "";

    items.push({
      id: keyFor(rawName, barcode, code),
      name: rawName,
      code,
      barcode,
      price: priceNum,
      updatedAt: updatedAt || 0,
      updatedAtLabel,
    });
  }

  // quedate siempre con fecha más nueva; empate => más identificadores; empate total => precio más bajo
  const m = new Map<string, PriceItem>();
  for (const it of items) {
    const k = keyFor(it.name, it.barcode, it.code);
    const cur = m.get(k);
    if (!cur) { m.set(k, it); continue; }
    const a = cur.updatedAt || 0;
    const b = it.updatedAt || 0;
    if (b > a) { m.set(k, it); continue; }
    if (b === a) {
      const curScore = (cur.barcode ? 1 : 0) + (cur.code ? 1 : 0);
      const itScore  = (it.barcode ? 1 : 0) + (it.code ? 1 : 0);
      if (itScore > curScore) { m.set(k, it); continue; }
      if (it.price < cur.price) { m.set(k, it); }
    }
  }

  const canon = Array.from(m.values()).sort((x, y) => (y.updatedAt || 0) - (x.updatedAt || 0));
  return { items: canon, rowCount, importedAt: Date.now(), sourceMode: "api" };
}
