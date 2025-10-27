"use client";

import type { PostgrestError } from "@supabase/supabase-js";
import { getSupabaseBrowserClient } from "@/lib/supabaseClient";

export type SalesRow = {
  product: string;
  qty: number;
  subtotal?: number;
  date: number;
  category?: string;
};

export type SalesPersistMeta = {
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

export const salesKeyForScope = (tenantId?: string | null, branchId?: string | null) => {
  const tid = tenantId?.trim() || "";
  const bid = branchId?.trim() || "";
  if (tid && bid) return `${SALES_KEY_ROOT}:${tid}:${bid}`;
  if (tid) return `${SALES_KEY_ROOT}:${tid}`;
  return SALES_KEY_ROOT;
};

export const salesKeysForLookup = (tenantId?: string | null, branchId?: string | null) => {
  const keys: string[] = [];
  if (tenantId && branchId) keys.push(salesKeyForScope(tenantId, branchId));
  if (tenantId) keys.push(salesKeyForScope(tenantId, null));
  keys.push(SALES_KEY_ROOT);
  return Array.from(new Set(keys));
};

const NBSP_RX = /[\u00A0\u202F]/g;

const excelSerialToUTC = (s: number) => Date.UTC(1899, 11, 30) + Math.round(s * 86400000);

const parseDateCell = (v: unknown): number | null => {
  if (v == null) return null;
  if (v instanceof Date) return v.getTime();
  if (typeof v === "number") return v < 100000 ? excelSerialToUTC(v) : v;
  if (typeof v === "string") {
    const s = v.replace(NBSP_RX, " ").trim().replace(/\./g, "/").replace(/-/g, "/");
    const m = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{2,4})$/);
    if (m) {
      const dd = Number(m[1]);
      const mm = Number(m[2]) - 1;
      let yy = Number(m[3]);
      if (yy < 100) yy += 2000;
      return Date.UTC(yy, mm, dd);
    }
  }
  return null;
};

export const base64ToArrayBuffer = (base64: string): ArrayBuffer => {
  const binary = atob(base64);
  const len = binary.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i += 1) bytes[i] = binary.charCodeAt(i);
  return bytes.buffer;
};

export const arrayBufferToBase64 = (buffer: ArrayBuffer): string => {
  const bytes = new Uint8Array(buffer);
  let binary = "";
  for (let i = 0; i < bytes.byteLength; i += 1) binary += String.fromCharCode(bytes[i]);
  return btoa(binary);
};

export async function parseSalesArrayBuffer(ab: ArrayBuffer): Promise<SalesRow[]> {
  const XLSX = await import("xlsx");
  const wb = XLSX.read(ab, { type: "array" });
  const ws = wb.Sheets[wb.SheetNames[0]];
  const rows: Record<string, unknown>[] = XLSX.utils.sheet_to_json(ws, { raw: true });

  const candidates = rows.map((r) => {
    const obj: Record<string, unknown> = {};
    for (const k of Object.keys(r)) obj[k.toLowerCase().replace(NBSP_RX, " ").trim()] = r[k];
    return obj;
  });

  const nameKeys = ["artículo", "articulo", "producto", "nombre", "item", "producto/marca"];
  const dateKeys = ["hora", "fecha", "date", "día", "dia"];
  const qtyKeys = ["cantidad", "qty", "venta", "ventas"];
  const subKeys = ["subtotal", "importe", "total", "monto"];
  const catKeys = ["subfamilia", "categoría", "categoria", "rubro", "grupo", "familia"];

  const out: SalesRow[] = [];
  for (const r of candidates) {
    const nk = nameKeys.find((k) => r[k] != null);
    const dk = dateKeys.find((k) => r[k] != null);
    const qk = qtyKeys.find((k) => r[k] != null);
    const sk = subKeys.find((k) => r[k] != null);
    const ck = catKeys.find((k) => r[k] != null);
    const product = nk ? String(r[nk]).trim() : "";
    const date = dk ? parseDateCell(r[dk]) : null;
    const qty = qk ? Number(r[qk] ?? 0) || 0 : 0;
    const subtotal = sk ? Number(r[sk]) : undefined;
    const category = ck ? String(r[ck]) : undefined;
    if (!product || !date) continue;
    const dayStart = new Date(date);
    const utc = Date.UTC(dayStart.getUTCFullYear(), dayStart.getUTCMonth(), dayStart.getUTCDate());
    out.push({ product, qty, subtotal, date: utc, category });
  }
  return out;
}

async function loadSalesFromURL(url: string): Promise<SalesRow[]> {
  const res = await fetch(url, { cache: "no-store" });
  const ab = await res.arrayBuffer();
  return parseSalesArrayBuffer(ab);
}

export async function loadSalesFromMeta(meta: SalesPersistMeta): Promise<SalesRow[]> {
  if (meta.base64) {
    const buffer = base64ToArrayBuffer(meta.base64);
    return parseSalesArrayBuffer(buffer);
  }
  if (meta.url) return loadSalesFromURL(meta.url);
  return loadSalesFromURL("/ventas.xlsx");
}

export async function getActiveSalesMeta(
  supabase = getSupabaseBrowserClient(),
  tenantId?: string | null,
  branchId?: string | null
): Promise<SalesPersistMeta> {
  const keys = salesKeysForLookup(tenantId ?? null, branchId ?? null);
  for (const key of keys) {
    try {
      const { data, error } = await supabase
        .from("app_settings")
        .select("value")
        .eq("key", key)
        .maybeSingle();

      if (error) {
        const code = (error as PostgrestError | undefined)?.code ?? "";
        if (code === "PGRST302") continue;
        if (code === "42P01") break;
        console.warn("getActiveSalesMeta warning", error);
        continue;
      }

      const raw = data?.value as SalesPersistMeta | undefined;
      if (raw && (raw.url || raw.base64)) {
        return { ...raw, tenant_id: tenantId ?? null, branch_id: branchId ?? null, scope_key: key };
      }
    } catch (err) {
      console.warn("getActiveSalesMeta exception", err);
      break;
    }
  }

  return { url: "/ventas.xlsx", tenant_id: tenantId ?? null, branch_id: branchId ?? null, scope_key: SALES_KEY_ROOT };
}

export const sumSalesBetween = (rows: SalesRow[], product: string, from: number, to: number) => {
  return rows
    .filter((row) => row.product === product && row.date >= from && row.date <= to)
    .reduce((acc, row) => acc + (row.qty || 0), 0);
};
