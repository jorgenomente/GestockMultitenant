// app/api/precios/route.ts
import { NextResponse } from "next/server";
import * as XLSX from "xlsx";
import { createClient } from "@supabase/supabase-js";
import { normBarcode } from "@/lib/pricesServer";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;
export const maxDuration = 60;

/* ==================== Supabase admin ==================== */
function getSupabaseAdmin() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE; // SERVICE ROLE
  if (!url || !key) return null;
  return createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
}

/* ==================== Utils ==================== */
type Row = Record<string, unknown>;
const NBSP_RX = /[\u202F\u00A0]/g;
const stripInvisibles = (s: string) => s.replace(NBSP_RX, " ");
const norm = (s: string) =>
  s.normalize("NFD").replace(/\p{Diacritic}/gu, "").toLowerCase().replace(/\s+/g, " ").trim();

/* ======= precio robusto ======= */
function parsePrice(val: unknown): number {
  if (val == null) return 0;
  if (typeof val === "number" && Number.isFinite(val)) return val;

  const raw = stripInvisibles(String(val)).trim();
  if (!raw) return 0;

  // Quitar moneda y espacios, conservar dígitos y separadores
  let s = raw.replace(/[^\d.,-]/g, "");
  if (!s) return 0;

  const neg = s.trim().startsWith("-");
  s = s.replace(/-/g, "");

  const hasDot = s.includes(".");
  const hasComma = s.includes(",");

  let canonical = s;

  if (hasDot && hasComma) {
    // Tomar el ÚLTIMO separador como decimal
    const lastDot = s.lastIndexOf(".");
    const lastComma = s.lastIndexOf(",");
    const decimalSep = lastDot > lastComma ? "." : ",";
    const thousandsSep = decimalSep === "." ? "," : ".";
    canonical = s.replace(new RegExp("\\" + thousandsSep, "g"), "");
    if (decimalSep === ",") canonical = canonical.replace(/,/g, ".");
  } else if (hasComma || hasDot) {
    const sep = hasComma ? "," : ".";
    const parts = s.split(sep);
    const tail = parts[parts.length - 1];
    if (/^\d{2,3}$/.test(tail)) {
      canonical = s.replace(new RegExp("\\" + sep, "g"), ".");
    } else {
      canonical = s.replace(new RegExp("\\" + sep, "g"), "");
    }
  }

  canonical = canonical.replace(/[^0-9.]/g, "");
  const n = Number(canonical);
  if (!Number.isFinite(n)) return 0;
  return neg ? -n : n;
}

/* ==================== Fechas robustas ==================== */
const excelSerialToMs = (n: number) => Date.UTC(1899, 11, 30) + Math.round(n * 86400000);

function parseUpdatedAt(value: unknown): number {
  if (value == null) return 0;
  if (value instanceof Date) {
    const t = value.getTime();
    return Number.isFinite(t) && t >= Date.UTC(2005, 0, 1) ? t : 0;
  }
  if (typeof value === "number" && Number.isFinite(value)) {
    const n = value;
    if (n > 1e11) return n;                    // epoch ms
    if (n > 1e9 && n < 1e11) return n * 1000;  // epoch s
    if (n > 20000 && n < 80000) {              // Excel serial
      const t = excelSerialToMs(n);
      return t < Date.UTC(2005, 0, 1) ? 0 : t;
    }
    return 0;
  }
  if (typeof value !== "string") return 0;

  const raw = stripInvisibles(value).trim();
  if (!raw) return 0;
  const s = raw.replace(/\s+/g, " ");

  // dd/MM/yyyy hh:mm[:ss] AM/PM
  let m =
    /^(\d{1,2})\/(\d{1,2})\/(\d{4})\s+(\d{1,2}):(\d{2})(?::(\d{2}))?\s*([AP]M)$/i.exec(s);
  if (m) {
    const [, dd, MM, yyyy, hh, mm, ssOpt, ap] = m;
    let H = parseInt(hh, 10);
    if (/PM/i.test(ap) && H !== 12) H += 12;
    if (/AM/i.test(ap) && H === 12) H = 0;
    const t = Date.UTC(+yyyy, +MM - 1, +dd, H, +mm, ssOpt ? +ssOpt : 0);
    return t < Date.UTC(2005, 0, 1) ? 0 : t;
  }

  // dd/MM/yyyy hh:mm[:ss] a. m./p. m.
  m =
    /^(\d{1,2})\/(\d{1,2})\/(\d{4})\s+(\d{1,2}):(\d{2})(?::(\d{2}))?\s*([ap])\s*\.?\s*m\.?$/i.exec(s);
  if (m) {
    const [, dd, MM, yyyy, hh, mm, ssOpt, ap] = m;
    let H = parseInt(hh, 10);
    if (/p/i.test(ap) && H !== 12) H += 12;
    if (/a/i.test(ap) && H === 12) H = 0;
    const t = Date.UTC(+yyyy, +MM - 1, +dd, H, +mm, ssOpt ? +ssOpt : 0);
    return t < Date.UTC(2005, 0, 1) ? 0 : t;
  }

  // dd/MM/yyyy HH:mm[:ss]
  m = /^(\d{1,2})\/(\d{1,2})\/(\d{4})\s+(\d{1,2}):(\d{2})(?::(\d{2}))?$/.exec(s);
  if (m) {
    const [, dd, MM, yyyy, HH, mm, ssOpt] = m;
    const t = Date.UTC(+yyyy, +MM - 1, +dd, +HH, +mm, ssOpt ? +ssOpt : 0);
    return t < Date.UTC(2005, 0, 1) ? 0 : t;
  }

  // dd-MM-yyyy HH:mm[:ss]
  m = /^(\d{1,2})-(\d{1,2})-(\d{4})\s+(\d{1,2}):(\d{2})(?::(\d{2}))?$/.exec(s);
  if (m) {
    const [, dd, MM, yyyy, HH, mm, ssOpt] = m;
    const t = Date.UTC(+yyyy, +MM - 1, +dd, +HH, +mm, ssOpt ? +ssOpt : 0);
    return t < Date.UTC(2005, 0, 1) ? 0 : t;
  }

  // dd/MM/yy HH:mm
  m = /^(\d{1,2})\/(\d{1,2})\/(\d{2})\s+(\d{1,2}):(\d{2})$/.exec(s);
  if (m) {
    const [, dd, MM, yy, HH, mm] = m;
    const yyyy = 2000 + parseInt(yy, 10);
    const t = Date.UTC(+yyyy, +MM - 1, +dd, +HH, +mm);
    return t < Date.UTC(2005, 0, 1) ? 0 : t;
  }

  // fallback dd/MM -> MM/dd
  const parsed = Date.parse(s.replace(/(\d{1,2})\/(\d{1,2})\//, "$2/$1/"));
  return Number.isFinite(parsed) && parsed >= Date.UTC(2005, 0, 1) ? parsed : 0;
}

type PriceRow = {
  id: string | null;
  name: string | null;
  code: string | null;
  barcode: string | null;
  price: number | string | null;
  ts: string | Date | null;
  imported_at?: string | null;
};

type PriceItem = {
  id: string;
  name: string | null;
  code?: string;
  barcode?: string;
  price: number;
  updatedAt: number;
  updatedAtLabel: string;
};

/* ==================== HEAD/ETag ==================== */
function makeWeakEtag(rowCount: number, maxTsMs: number) {
  return `W/"${rowCount}-${maxTsMs}"`;
}

async function getMeta(s: NonNullable<ReturnType<typeof getSupabaseAdmin>>) {
  let rowCount = 0;
  let maxTsMs = 0;

  const head = await s.from("v_prices_latest").select("id", { head: true, count: "exact" });
  if (!head.error && typeof head.count === "number") rowCount = head.count ?? 0;

  const { data: maxV } = await s
    .from("v_prices_latest")
    .select("ts")
    .order("ts", { ascending: false })
    .limit(1);
  if (maxV && maxV[0]?.ts) maxTsMs = Date.parse(String(maxV[0].ts)) || 0;

  if (rowCount === 0 || maxTsMs === 0) {
    const head2 = await s.from("prices_raw").select("ts", { head: true, count: "exact" });
    if (!head2.error && typeof head2.count === "number") rowCount = head2.count ?? 0;

    const { data: maxR } = await s.from("prices_raw").select("ts").order("ts", { ascending: false }).limit(1);
    if (maxR && maxR[0]?.ts) maxTsMs = Date.parse(String(maxR[0].ts)) || 0;
  }
  return { rowCount, maxTsMs, etag: makeWeakEtag(rowCount, maxTsMs) };
}

export async function HEAD() {
  const s = getSupabaseAdmin();
  if (!s) return NextResponse.json({ error: "Supabase envs faltantes" }, { status: 503 });
  const { rowCount, maxTsMs, etag } = await getMeta(s);
  return new Response(null, {
    status: 200,
    headers: {
      ETag: etag,
      "X-RowCount": String(rowCount),
      "X-MaxTs": String(maxTsMs),
      "Cache-Control": "public, max-age=120, stale-while-revalidate=86400",
    },
  });
}

/* ==================== GET ==================== */
export async function GET() {
  const s = getSupabaseAdmin();
  if (!s) {
    return NextResponse.json(
      { error: "Supabase no está configurado (faltan envs)." },
      { status: 503, headers: { "Cache-Control": "public, max-age=60" } }
    );
  }

  const PAGE = 1000;
  let from = 0;
  let total = 0;
  const items: PriceItem[] = [];

  const head = await s.from("v_prices_latest").select("id", { head: true, count: "exact" });
  if (!head.error && typeof head.count === "number") total = head.count ?? 0;

  while (true) {
    const to = from + PAGE - 1;
    const { data, error } = await s
      .from("v_prices_latest")
      .select("id,name,code,barcode,price,ts,imported_at")
      .order("ts", { ascending: false })
      .range(from, to);

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    const pageRows = (data ?? []) as PriceRow[];
    if (pageRows.length === 0) break;

    for (const r of pageRows) {
      const name =
        typeof r.name === "string"
          ? r.name
          : r.name != null
          ? String(r.name)
          : null;
      const codeValue = typeof r.code === "string" ? r.code : undefined;
      const barcodeValue = typeof r.barcode === "string" ? r.barcode : undefined;
      const fallbackName = name ?? "";
      const ms = r.ts ? Date.parse(String(r.ts)) : 0;
      const updatedAt = Number.isFinite(ms) ? ms : 0;
      const priceRaw = r.price;
      const price =
        typeof priceRaw === "number"
          ? priceRaw
          : typeof priceRaw === "string"
          ? Number(priceRaw) || 0
          : 0;
      const id =
        (typeof r.id === "string" && r.id) ||
        barcodeValue ||
        codeValue ||
        (fallbackName ? norm(fallbackName) : "");

      items.push({
        id,
        name,
        code: codeValue,
        barcode: barcodeValue,
        price,
        updatedAt,
        updatedAtLabel: updatedAt
          ? new Date(updatedAt).toLocaleString("es-AR")
          : "",
      });
    }
    if (pageRows.length < PAGE) break;
    from += PAGE;
  }

  const { etag } = await getMeta(s);
  return NextResponse.json(
    { items, rowCount: total || items.length, importedAt: Date.now(), sourceMode: "api" },
    { headers: { ETag: etag, "Cache-Control": "public, max-age=120, stale-while-revalidate=86400" } }
  );
}

/* ==================== POST: usar **DESDE** (ignorar VIGENCIA) ==================== */
const ALIASES = {
  name:    ["descripcion","descripción","nombre","detalle","producto","articulo","artículo"],
  code:    ["codigo","código","id","sku","código interno","cod interno"],
  barcode: ["codigo barras","código barras","codigo de barras","código de barras","barcode","barra","barras","ean","cod barras","cod. barras"],
  price:   ["precio","precio venta","precio final","pvp","importe"],
  // ¡VIGENCIA NO APARECE AQUÍ!
  updated: ["desde","fecha desde","válido desde","valido desde","desde vigencia","inicio","start","fecha inicio"],
} as const;

/** match estricto:
 * - alias de 1 palabra => token exacto
 * - alias 2+ palabras => incluye la frase completa
 */
function headerMatches(key: string, alias: string) {
  const K = norm(key);
  const A = norm(alias);
  if (!A) return false;
  if (A.includes(" ")) return K.includes(A);
  const tokens = new Set(K.split(" ").filter(Boolean));
  return tokens.has(A);
}

function pickHeaders(keys: string[]) {
  const found: Record<"name"|"code"|"barcode"|"price"|"updated", string | null> =
    { name: null, code: null, barcode: null, price: null, updated: null };

  for (const k of keys) {
    if (!found.name)    for (const a of ALIASES.name)    { if (headerMatches(k, a)) { found.name = k; break; } }
    if (!found.code)    for (const a of ALIASES.code)    { if (headerMatches(k, a)) { found.code = k; break; } }
    if (!found.barcode) for (const a of ALIASES.barcode) { if (headerMatches(k, a)) { found.barcode = k; break; } }
    if (!found.price)   for (const a of ALIASES.price)   { if (headerMatches(k, a)) { found.price = k; break; } }
    if (!found.updated) for (const a of ALIASES.updated) { if (headerMatches(k, a)) { found.updated = k; break; } }
  }
  return found;
}

export async function POST(req: Request) {
  const s = getSupabaseAdmin();
  if (!s) return NextResponse.json({ error: "Supabase no está configurado en el servidor." }, { status: 503 });

  // Modo debug opcional: /api/precios?debug=map
  const url = new URL(req.url);
  const debugMode = url.searchParams.get("debug") === "map";

  const form = await req.formData();
  const file = form.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "Falta 'file' en multipart/form-data" }, { status: 400 });
  }

  const buf = await file.arrayBuffer();
  const wb = XLSX.read(buf, { type: "array", cellDates: true });

  type MapShape = Record<"name"|"code"|"barcode"|"price"|"updated", string | null>;
  let chosen: { sheet: XLSX.WorkSheet; map: MapShape } | null = null;
  const debug: Array<{ sheet: string; map: MapShape }> = [];

  for (const sheetName of wb.SheetNames) {
    const ws = wb.Sheets[sheetName];
    const rows: Row[] = XLSX.utils.sheet_to_json(ws, { defval: "" });
    if (!rows.length) {
      debug.push({ sheet: sheetName, map: { name: null, code: null, barcode: null, price: null, updated: null } });
      continue;
    }
    const keys = Object.keys(rows[0] ?? {});
    const map = pickHeaders(keys);
    debug.push({ sheet: sheetName, map });
    if (map.price && map.updated) {
      if (!chosen) {
        chosen = { sheet: ws, map };
      } else {
        const score = (m: MapShape) => (m.name ? 1 : 0) + (m.code ? 1 : 0) + (m.barcode ? 1 : 0);
        if (score(map) > score(chosen.map)) chosen = { sheet: ws, map };
      }
    }
  }

  if (debugMode) {
    return NextResponse.json({ debug, chosenMap: chosen?.map ?? null }, { status: 200 });
  }

  if (!chosen) {
    return NextResponse.json(
      { error: "No se encontraron encabezados válidos. Se requiere PRECIO y **DESDE**.", hint: debug },
      { status: 400 }
    );
  }

  const rows: Row[] = XLSX.utils.sheet_to_json(chosen.sheet, { defval: "" });

  type InsertRow = { name: string | null; code: string | null; barcode: string | null; price: number; ts: string };
  const toInsert: InsertRow[] = [];
  let skipped = 0;

  for (const r of rows) {
    const rawName = chosen.map.name ? String(r[chosen.map.name] ?? "").trim() : "";
    const rawCode = chosen.map.code ? String(r[chosen.map.code] ?? "").trim() : "";
    const rawBar  = chosen.map.barcode ? String(r[chosen.map.barcode] ?? "").trim() : "";
    const cleanedBarcode = rawBar ? normBarcode(rawBar) : undefined;

    // necesitamos al menos UN identificador
    if (!rawName && !rawCode && !cleanedBarcode) { skipped++; continue; }

    const priceNum = parsePrice(r[chosen.map.price as string]);
    const tms = parseUpdatedAt(r[chosen.map.updated as string]);
    if (!tms) { skipped++; continue; }

    toInsert.push({
      name: rawName || null,
      code: rawCode || null,
      barcode: cleanedBarcode ?? null,
      price: priceNum,
      ts: new Date(tms).toISOString(),
    });
  }

  if (!toInsert.length) {
    return NextResponse.json(
      {
        error: "No se pudieron extraer filas válidas (sin fechas válidas en DESDE).",
        sheetSelected: chosen.map,
      },
      { status: 400 }
    );
  }

  // Insertar en lotes
  const CHUNK = 1000;
  let inserted = 0;
  for (let i = 0; i < toInsert.length; i += CHUNK) {
    const chunk = toInsert.slice(i, i + CHUNK);
    const { error } = await s.from("prices_raw").insert(chunk);
    if (error) return NextResponse.json({ error: error.message, inserted, skipped, chosenMap: chosen.map }, { status: 500 });
    inserted += chunk.length;
  }

  return NextResponse.json({ ok: true, inserted, skipped, chosenMap: chosen.map }, { status: 200 });
}
