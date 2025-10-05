// src/app/api/t/[slug]/precios/route.ts
import { NextRequest, NextResponse } from "next/server";
import {
  getSupabaseUserServerClient,
  getSupabaseServiceRoleClient,
} from "@/lib/supabaseServer";

export const runtime = "nodejs";        // Service Role -> Node, no Edge
export const dynamic = "force-dynamic"; // evita cache en endpoints con DB

/** ===================== Helpers parsing/normalización ===================== */
const STOPWORDS = new Set(["de", "del", "la", "el", "los", "las"]);
const NBSP_RX = /[\u202F\u00A0]/g;
const excelSerialToMs = (n: number) => Date.UTC(1899, 11, 30) + Math.round(n * 86400000);

const stripInvisibles = (s: string) => s.replace(NBSP_RX, " ");
const normText = (s: unknown) =>
  !s ? "" : String(s).normalize("NFD").replace(/\p{Diacritic}/gu, "").toLowerCase().replace(/\s+/g, " ").trim();

function headerMatches(header: string, alias: string) {
  const norm = (s: string) =>
    s.normalize("NFD").replace(/\p{Diacritic}/gu, "").toLowerCase().replace(/\s+/g, " ").trim();
  const h = norm(header);
  const a = norm(alias);
  if (h === a) return true;
  const hTok = h.split(" ").filter((t) => t && !STOPWORDS.has(t));
  const aTok = a.split(" ").filter((t) => t && !STOPWORDS.has(t));
  return aTok.every((t) => hTok.includes(t));
}

function normBarcode(val: unknown): string | undefined {
  if (val == null) return undefined;
  let s =
    typeof val === "number"
      ? Math.round(val).toLocaleString("en-US", { useGrouping: false })
      : stripInvisibles(String(val));
  s = s.trim();
  if (!s) return undefined;
  const digits = s.replace(/\D+/g, "");
  return digits || undefined;
}

function parseUpdatedAt(value: unknown): number {
  if (value == null) return 0;
  if (typeof value === "number" && Number.isFinite(value)) {
    const n = value;
    if (n > 1e11) return n;                     // ms epoch
    if (n > 1e9 && n < 1e11) return n * 1000;   // s epoch
    if (n > 20000 && n < 80000) {
      const t = excelSerialToMs(n);             // Excel serial
      return t < Date.UTC(2005, 0, 1) ? 0 : t;
    }
    return 0;
  }
  if (typeof value !== "string") return 0;

  const raw = stripInvisibles(value).trim();
  if (!raw) return 0;
  if (/^0?1\/0?1\/0{2}(\s+0{2}:0{2}(:0{2})?)?$/i.test(raw)) return 0; // 01/01/00 => ignora
  const s = raw.replace(/\s+/g, " ");

  // Quick wins y formato ambiguo dd/MM
  const parsed = Date.parse(s.replace(/(\d{1,2})\/(\d{1,2})\//, "$2/$1/"));
  return Number.isFinite(parsed) && parsed >= Date.UTC(2005, 0, 1) ? parsed : 0;
}

type PriceItem = {
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
  importedAt: number;
  sourceMode: "api" | "public" | "local-upload";
  sourceKey?: string;
};

const keyFor = (name: string, barcode?: string, code?: string) =>
  (barcode && barcode.trim()) || (code && code.trim()) || normText(name);

function reduceLatestByDate(list: PriceItem[]): PriceItem[] {
  const m = new Map<string, PriceItem>();
  for (const it of list) {
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
  return Array.from(m.values()).sort((x, y) => (y.updatedAt || 0) - (x.updatedAt || 0));
}

async function parseWorkbook(buf: ArrayBuffer) {
  const XLSX = await import("xlsx");
  const wb = XLSX.read(buf, { type: "array" });
  const wsName = wb.SheetNames[0];
  const ws = wb.Sheets[wsName];
  const rows: Record<string, unknown>[] = XLSX.utils.sheet_to_json(ws, { defval: "" });
  return rows;
}

function buildCatalog(rows: Record<string, unknown>[]): Catalog {
  const aliases: Record<string, string[]> = {
    name: ["descripcion", "descripción", "nombre", "detalle", "producto", "articulo", "artículo"],
    code: ["codigo", "código", "id", "sku", "código interno", "cod interno"],
    barcode: [
      "barcode","barra","barras","codigo barras","código barras","codigo de barras","código de barras","cod barras","cod. barras","ean"
    ],
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

  const all: PriceItem[] = [];
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

    all.push({
      id: (barcode || code || normText(rawName) || rawName) as string,
      name: rawName,
      code,
      barcode,
      price: priceNum,
      updatedAt: updatedAt || 0,
      updatedAtLabel,
    });
  }

  const items = reduceLatestByDate(all);
  return { items, rowCount, importedAt: Date.now(), sourceMode: "api" };
}

/** ===================== Supabase utils ===================== */
async function getTenantBySlug(userClient: any, slug: string) {
  const { data, error } = await userClient.from("tenants").select("id, slug").eq("slug", slug).single();
  if (error || !data) throw new Error("Tenant no encontrado");
  return data as { id: string; slug: string };
}

async function assertMember(userClient: any, tenantId: string) {
  const { data: { user } } = await userClient.auth.getUser();
  if (!user) throw new Error("No autenticado");
  const { data, error } = await userClient
    .from("memberships")
    .select("role")
    .eq("user_id", user.id)
    .eq("tenant_id", tenantId)
    .limit(1);
  if (error || !data || data.length === 0) throw new Error("Sin permisos");
  return { user, role: data[0].role as "owner" | "admin" | "staff" };
}

/** ===================== GET ===================== */
type Ctx = { params: Promise<{ slug: string }> };

export async function GET(_req: NextRequest, { params }: Ctx) {
  try {
    const { slug } = await params;

    const userClient = await getSupabaseUserServerClient();
    const service = getSupabaseServiceRoleClient();

    const tenant = await getTenantBySlug(userClient, slug);
    await assertMember(userClient, tenant.id);

    const path = `${tenant.id}/prices.json`;
    const { data: file, error } = await service.storage.from("catalogs").download(path);
    if (error || !file) {
      const empty: Catalog = { items: [], rowCount: 0, importedAt: Date.now(), sourceMode: "api" };
      return NextResponse.json(empty, { status: 200 });
    }

    const text = await file.text();
    const cat: Catalog = JSON.parse(text);
    const items = Array.isArray(cat.items) ? cat.items : [];
    const canon = reduceLatestByDate(items);
    const out: Catalog = {
      items: canon,
      rowCount: cat.rowCount ?? canon.length,
      importedAt: cat.importedAt ?? Date.now(),
      sourceMode: "api",
    };
    return NextResponse.json(out, { status: 200 });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message ?? "Error leyendo catálogo" }, { status: 500 });
  }
}

/** ===================== POST (subir XLSX/CSV) ===================== */
export async function POST(req: NextRequest, { params }: Ctx) {
  try {
    const { slug } = await params;

    const userClient = await getSupabaseUserServerClient();
    const service = getSupabaseServiceRoleClient();

    const tenant = await getTenantBySlug(userClient, slug);
    const { role } = await assertMember(userClient, tenant.id);
    if (role === "staff") throw new Error("Solo owner/admin pueden actualizar el catálogo.");

    const form = await req.formData();
    const file = form.get("file");
    if (!(file instanceof File)) throw new Error("Archivo no enviado");

    const buf = await file.arrayBuffer();
    const rows = await parseWorkbook(buf);
    const cat = buildCatalog(rows);

    const json = new Blob([JSON.stringify(cat)], { type: "application/json" });
    const path = `${tenant.id}/prices.json`;

    const { error } = await service.storage.from("catalogs").upload(path, json, {
      contentType: "application/json",
      upsert: true,
    });
    if (error) throw error;

    return NextResponse.json({ ok: true, imported: cat.items.length }, { status: 200 });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message ?? "Error subiendo catálogo" }, { status: 500 });
  }
}
