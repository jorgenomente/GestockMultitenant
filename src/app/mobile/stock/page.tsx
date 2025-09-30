"use client";

import React from "react";
import { getSupabaseBrowserClient } from "@/lib/supabaseClient";

/* UI */
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger,
} from "@/components/ui/sheet";

/* Icons */
import {
  Boxes, Check, X as XIcon, CalendarDays, Search as SearchIcon,
  Loader2, Save, Truck, PlusCircle,
} from "lucide-react";

/* =================== Config y tipos =================== */
const VENTAS_URL_FALLBACK = "/ventas.xlsx";
const TABLE_SETTINGS = "app_settings";
const SALES_KEY = "sales_url"; // { url, filename?, uploaded_at? }

const LS_PROVIDER_KEY = "gestock:stock:lastProviderName";
const LS_DATETIME_KEY = "gestock:stock:lastDateTime";

type Provider = { id: string; name: string };

type SalesRow = { product: string; qty: number; date: number }; // date = ms UTC (día/hora)
type PendingItem = {
  key: string;
  name: string;
  code?: string | null;
  barcode?: string | null;

  // Estado local
  baselineQty?: number;        // qty guardada en DB (representa stock al corte)
  actual?: number;             // stock actual editable (prefill = baseline - ventasDesdeCorte)
  incoming?: number;           // stock que ingresa
  confirmed?: boolean;         // si ya está en DB (baseline)
};

const norm = (s: string) =>
  (s || "").toLowerCase().normalize("NFD").replace(/\p{Diacritic}/gu, "");
const itemKey = (name: string, code?: string | null, barcode?: string | null) =>
  `${code ?? ""}::${barcode ?? ""}::${name}`;

const NBSP_RX = /[\u00A0\u202F]/g;
const excelSerialToUTC = (s: number) => Date.UTC(1899, 11, 30) + Math.round(s * 86400000);
function parseDateCell(v: unknown): number | null {
  if (v == null) return null;
  if (v instanceof Date) return v.getTime();
  if (typeof v === "number") return v < 100000 ? excelSerialToUTC(v) : v;
  if (typeof v === "string") {
    const s = v.replace(NBSP_RX, " ").trim().replace(/\./g, "/").replace(/-/g, "/");
    const m = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{2,4})$/);
    if (m) { const dd = +m[1], mm = +m[2] - 1; let yy = +m[3]; if (yy < 100) yy += 2000; return Date.UTC(yy, mm, dd); }
  }
  return null;
}

/* =================== Ventas: misma fuente que Pedido =================== */
type SalesPersistMeta = { url: string; filename?: string; uploaded_at?: string };

async function getActiveSalesURL(supabase: ReturnType<typeof getSupabaseBrowserClient>): Promise<SalesPersistMeta> {
  const { data } = await supabase.from(TABLE_SETTINGS).select("value").eq("key", SALES_KEY).maybeSingle();
  const meta = (data?.value as SalesPersistMeta | undefined);
  if (meta?.url) return meta;
  return { url: VENTAS_URL_FALLBACK, filename: "ventas.xlsx" };
}

async function parseSalesArrayBuffer(ab: ArrayBuffer): Promise<SalesRow[]> {
  const XLSX = await import("xlsx");
  const wb = XLSX.read(ab, { type: "array" });
  const ws = wb.Sheets[wb.SheetNames[0]];
  const rows: any[] = XLSX.utils.sheet_to_json(ws, { raw: true });

  const candidates = rows.map((r) => {
    const obj: any = {};
    for (const k of Object.keys(r))
      obj[k.toLowerCase().replace(NBSP_RX, " ").trim()] = r[k];
    return obj;
  });

  const nameKeys = ["artículo","articulo","producto","nombre","item","producto/marca"];
  const dateKeys = ["hora","fecha","date","día","dia"];
  const qtyKeys  = ["cantidad","qty","venta","ventas"];

  const out: SalesRow[] = [];
  for (const r of candidates) {
    const nk = nameKeys.find((k) => r[k] != null);
    const dk = dateKeys.find((k) => r[k] != null);
    const qk = qtyKeys.find((k) => r[k] != null);
    const product  = nk ? String(r[nk]).trim() : "";
    const date     = dk ? parseDateCell(r[dk]) : null;
    const qty      = qk ? Number(r[qk] ?? 0) || 0 : 0;
    if (!product || !date) continue;
    out.push({ product, qty, date });
  }
  return out;
}

async function loadSalesFromURL(url: string): Promise<SalesRow[]> {
  const res = await fetch(url, { cache: "no-store" });
  const ab = await res.arrayBuffer();
  return parseSalesArrayBuffer(ab);
}

const fmtInt = (n: number) => new Intl.NumberFormat("es-AR").format(n || 0);

/* =================== Página =================== */
export default function StockPage() {
  const supabase = getSupabaseBrowserClient();

  /* Hydration fix */
  const [isHydrated, setIsHydrated] = React.useState(false);
  React.useEffect(() => setIsHydrated(true), []);

  /* Proveedor + fecha/hora */
  const [providerName, setProviderName] = React.useState<string>(() =>
    typeof window !== "undefined" ? localStorage.getItem(LS_PROVIDER_KEY) ?? "" : ""
  );
  const [providerId, setProviderId] = React.useState<string | null>(null);
  const [stockWhen, setStockWhen] = React.useState<string>(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem(LS_DATETIME_KEY);
      if (saved) return saved;
    }
    const d = new Date(); d.setSeconds(0,0);
    const pad = (n: number) => String(n).padStart(2, "0");
    return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
  });
  React.useEffect(() => { if (typeof window !== "undefined") localStorage.setItem(LS_PROVIDER_KEY, providerName); }, [providerName]);
  React.useEffect(() => { if (typeof window !== "undefined") localStorage.setItem(LS_DATETIME_KEY, stockWhen); }, [stockWhen]);

  /* Sesión de stock */
  const [sessionId, setSessionId] = React.useState<string | null>(null);
  const [savingSession, setSavingSession] = React.useState(false);
  const [savedOnce, setSavedOnce] = React.useState(false);

  /* Ventas activas */
  const [sales, setSales] = React.useState<SalesRow[]>([]);
  const [salesMeta, setSalesMeta] = React.useState<{ source: "default" | "imported"; label: string }>({
    source: "default", label: "ventas.xlsx",
  });

  /* Lista seleccionada (ítems) */
  const [pending, setPending] = React.useState<PendingItem[]>([]);
  const [listQuery, setListQuery] = React.useState("");

  /* Proveedores (sheet) */
  const [provOpen, setProvOpen] = React.useState(false);
  const [providers, setProviders] = React.useState<Provider[]>([]);
  const [provQuery, setProvQuery] = React.useState("");

  /* ===== Ventas: misma fuente que Pedido ===== */
  React.useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const meta = await getActiveSalesURL(supabase);
        const rows = await loadSalesFromURL(meta.url);
        if (!mounted) return;
        setSales(rows);
        setSalesMeta({
          source: meta.url === VENTAS_URL_FALLBACK ? "default" : "imported",
          label: meta.filename || (meta.url === VENTAS_URL_FALLBACK ? "ventas.xlsx" : "archivo importado"),
        });
      } catch (e) {
        if (mounted) setSales([]);
      }
    })();
    return () => { mounted = false; };
  }, [supabase]);

  /* ===== Panel de proveedores ===== */
  React.useEffect(() => {
    if (!provOpen) return;
    (async () => {
      const { data } = await supabase.from("providers").select("id,name").order("name",{ascending:true});
      setProviders((data ?? []) as Provider[]);
    })();
  }, [provOpen, supabase]);
  const filteredProviders = React.useMemo(() => providers.filter(p => norm(p.name).includes(norm(provQuery))), [providers, provQuery]);

  /* ===== Helpers ===== */
  const cutoffMs = React.useMemo(() => {
    // "YYYY-MM-DDTHH:mm" (local) → ms
    return stockWhen ? new Date(stockWhen).getTime() : Date.now();
  }, [stockWhen]);

  function salesSince(product: string): number {
    if (!product) return 0;
    const p = product.trim();
    return sales.reduce((a, r) => (r.product === p && r.date >= cutoffMs ? a + (r.qty || 0) : a), 0);
  }

  /* ===== Upsert proveedor si se tipea ===== */
  async function upsertProviderByName(name: string): Promise<string> {
    const { data: found } = await supabase.from("providers").select("id").eq("name", name).maybeSingle();
    if (found?.id) return found.id as string;
    const { data: created, error } = await supabase.from("providers").insert({ name }).select("id").single();
    if (error) throw error;
    return created.id as string;
  }

  /* ===== Crear sesión ===== */
  async function ensureSession() {
    if (sessionId) return sessionId;
    if (!providerName.trim()) throw new Error("Ingresa un proveedor");
    if (!stockWhen) throw new Error("Selecciona fecha y hora");
    setSavingSession(true);
    try {
      const pid = providerId ?? (await upsertProviderByName(providerName.trim()));
      setProviderId(pid);
      const { data, error } = await supabase
        .from("stock_sessions")
        .insert({ provider_id: pid, stock_date: stockWhen })
        .select("id")
        .single();
      if (error) throw error;
      setSessionId(data.id as string);
      setSavedOnce(true);

      // Cargar ítems ya guardados (si reingresás a la sesión)
      const { data: items } = await supabase
        .from("stock_items")
        .select("product_name, product_code, barcode, qty, incoming_qty")
        .eq("session_id", data.id);
      const mapped: PendingItem[] = (items ?? []).map((r: any) => {
        const name = String(r.product_name || "").trim();
        const key = itemKey(name, r.product_code, r.barcode);
        return {
          key, name, code: r.product_code ?? null, barcode: r.barcode ?? null,
          baselineQty: r.qty ?? 0, incoming: r.incoming_qty ?? 0, confirmed: true,
          actual: Math.max(0, (r.qty ?? 0) - salesSince(name)), // estimado editable
        };
      });
      setPending((prev) => {
        // evitar duplicados si ya había ítems precargados
        const keys = new Set(prev.map(p => p.key));
        const toAdd = mapped.filter(m => !keys.has(m.key));
        return [...prev, ...toAdd];
      });

      return data.id as string;
    } finally {
      setSavingSession(false);
    }
  }

  /* ===== Precarga desde Pedido del proveedor ===== */
  async function preloadFromProvider(pid: string) {
    // 1) pendiente
    const { data: pend } = await supabase
      .from("orders").select("id,status,created_at").eq("provider_id", pid)
      .eq("status", "PENDIENTE").order("created_at",{ascending:false}).limit(1);

    let orderId: string | null = pend?.[0]?.id ?? null;
    if (!orderId) {
      const { data: last } = await supabase
        .from("orders").select("id").eq("provider_id", pid).order("created_at",{ascending:false}).limit(1);
      orderId = last?.[0]?.id ?? null;
    }
    if (!orderId) return;

    const { data: items } = await supabase.from("order_items").select("product_name").eq("order_id", orderId);

    setPending((prev) => {
      const existing = new Set(prev.map(p => p.key));
      const toAdd: PendingItem[] = (items ?? [])
        .map((r: any) => {
          const name = String(r.product_name || "").trim();
          const key = itemKey(name);
          return { key, name };
        })
        .filter(p => p.name && !existing.has(p.key));
      return [...prev, ...toAdd];
    });
  }

  async function handleSelectProvider(p: Provider) {
    setProviderId(p.id);
    setProviderName(p.name);
    setProvOpen(false);
    await preloadFromProvider(p.id);
  }

  /* ===== Guardar por ítem =====
     - Guardamos baseline (qty) como: actual + ventasDesdeCorte
     - Guardamos incoming_qty
     Si ya existe row, hacemos update; si no, insert.
  */
  async function saveItemRow(row: PendingItem) {
    const sid = await ensureSession();
    const ventas = salesSince(row.name);
    const actual = Math.max(0, Number(row.actual ?? 0));
    const incoming = Math.max(0, Number(row.incoming ?? 0));
    const baseline = actual + ventas;

    // ¿existe?
    const { data: found } = await supabase
      .from("stock_items")
      .select("product_name")
      .eq("session_id", sid)
      .eq("product_name", row.name)
      .maybeSingle();

    if (found) {
      const { error } = await supabase
        .from("stock_items")
        .update({ qty: baseline, incoming_qty: incoming })
        .eq("session_id", sid)
        .eq("product_name", row.name);
      if (error) throw error;
    } else {
      const { error } = await supabase.from("stock_items").insert({
        session_id: sid,
        product_code: row.code ?? null,
        product_name: row.name,
        barcode: row.barcode ?? null,
        qty: baseline,
        incoming_qty: incoming,
      });
      if (error) throw error;
    }

    setPending((prev) =>
      prev.map((p) =>
        p.key === row.key
          ? { ...p, baselineQty: baseline, confirmed: true, actual, incoming }
          : p
      )
    );
  }

  /* ===== Aplicar ingreso (suma incoming_qty al baseline y limpia a 0) ===== */
  // Reemplaza toda tu función applyIncoming por esta
async function applyIncoming(row: PendingItem) {
  if (!row.confirmed) return;

  const sid = await ensureSession();
  const inc = Math.max(0, Number(row.incoming ?? 0));

  // 1) Intento con la RPC (si existe)
  try {
    const { error } = await supabase.rpc("apply_incoming_to_stock", {
      p_session_id: sid,
      p_product_name: row.name,
    });
    if (error) throw error; // forzamos fallback si hay error
  } catch {
    // 2) Fallback: hacemos el update manual en 2 pasos
    const { data: curr, error: selErr } = await supabase
      .from("stock_items")
      .select("qty, incoming_qty")
      .eq("session_id", sid)
      .eq("product_name", row.name)
      .maybeSingle();

    if (selErr) {
      console.error(selErr);
      alert("No se pudo leer el item para aplicar ingreso.");
      return;
    }

    const currentQty = Number(curr?.qty ?? 0);
    const currentIncoming = Number(curr?.incoming_qty ?? inc);
    const newQty = currentQty + currentIncoming;

    const { error: updErr } = await supabase
      .from("stock_items")
      .update({ qty: newQty, incoming_qty: 0 })
      .eq("session_id", sid)
      .eq("product_name", row.name);

    if (updErr) {
      console.error(updErr);
      alert("No se pudo aplicar el ingreso.");
      return;
    }
  }

  // 3) Actualizamos estado local (UI)
  setPending((prev) =>
    prev.map((p) =>
      p.key === row.key
        ? {
            ...p,
            baselineQty: (p.baselineQty ?? 0) + (row.incoming ?? 0),
            incoming: 0,
            actual: Math.max(0, (p.actual ?? 0) + (row.incoming ?? 0)),
          }
        : p
    )
  );
}


  /* ===== Filtro local ===== */
  const listFiltered = React.useMemo(() => {
    const q = norm(listQuery).split(/\s+/).filter(Boolean);
    if (!q.length) return pending;
    return pending.filter((p) => {
      const hay = norm(`${p.name} ${p.code ?? ""} ${p.barcode ?? ""}`);
      return q.every((t) => hay.includes(t));
    });
  }, [pending, listQuery]);

  /* ===== UI ===== */
  return (
    <div className="p-3 max-w-3xl mx-auto">
      <div className="flex items-center gap-2 mb-2">
        <Boxes className="w-5 h-5" />
        <h1 className="text-lg font-semibold">Cargar Stock</h1>
      </div>

      {/* Proveedor + fecha/hora + ventas fuente */}
      <Card className="mb-3">
        <CardContent className="p-3 space-y-2">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="sm:col-span-2">
              <div className="flex items-center justify-between">
                <label className="text-xs text-muted-foreground">Proveedor</label>
                <Sheet open={provOpen} onOpenChange={setProvOpen}>
                  <SheetTrigger asChild>
                    <Button variant="outline" size="sm" className="h-7 gap-1">
                      <Truck className="w-3.5 h-3.5" />
                      Elegir
                    </Button>
                  </SheetTrigger>
                  <SheetContent side="left" className="w-[85vw] sm:w-96">
                    <SheetHeader><SheetTitle>Elegir proveedor</SheetTitle></SheetHeader>
                    <div className="mt-4 space-y-3">
                      <div className="relative">
                        <SearchIcon className="w-4 h-4 absolute left-2 top-1/2 -translate-y-1/2 text-muted-foreground"/>
                        <Input value={provQuery} onChange={(e)=>setProvQuery(e.target.value)} placeholder="Buscar proveedor…" className="pl-8"/>
                      </div>
                      <Separator />
                      <div className="max-h-[60vh] overflow-auto space-y-1">
                        {filteredProviders.length === 0 ? (
                          <p className="text-sm text-muted-foreground px-1">Sin resultados.</p>
                        ) : (
                          filteredProviders.map((p) => (
                            <button key={p.id} onClick={() => void handleSelectProvider(p)}
                              className="w-full text-left px-2 py-2 rounded-md hover:bg-accent">
                              {p.name}
                            </button>
                          ))
                        )}
                      </div>
                    </div>
                  </SheetContent>
                </Sheet>
              </div>
              <Input value={providerName} onChange={(e)=>{ setProviderName(e.target.value); setProviderId(null); }}
                     placeholder="Ej: Molens" aria-label="Proveedor"/>
            </div>

            <div>
              <label className="text-xs text-muted-foreground">Fecha y hora de corte</label>
              <div className="flex items-center gap-2">
                <Input type="datetime-local" value={stockWhen} onChange={(e)=>setStockWhen(e.target.value)}
                       aria-label="Fecha y hora de corte"/>
                <CalendarDays className="w-4 h-4 text-muted-foreground" />
              </div>
              <div className="mt-1 text-[11px] text-muted-foreground">
                Fuente ventas: {salesMeta.source === "imported" ? "Importada" : "Por defecto"} · {salesMeta.label}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant={savedOnce ? "secondary" : "default"}
              disabled={!isHydrated || savingSession || !providerName.trim() || !stockWhen}
              onClick={ensureSession}
              className="gap-2"
              suppressHydrationWarning
            >
              {savingSession ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              {savedOnce ? "Sesión guardada" : "Guardar sesión"}
            </Button>
            {savedOnce && <Badge variant="secondary">OK</Badge>}
          </div>
        </CardContent>
      </Card>

      {/* Buscar dentro de la lista */}
      <Card className="mb-3">
        <CardContent className="p-3">
          <div className="relative">
            <SearchIcon className="w-4 h-4 absolute left-2 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input value={listQuery} onChange={(e)=>setListQuery(e.target.value)}
                   placeholder="Buscar dentro de los ítems…" className="pl-8" aria-label="Buscar en la lista"/>
          </div>
        </CardContent>
      </Card>

      {/* Lista con dos columnas */}
      <Card>
        <CardContent className="p-3">
          <div className="mb-2 flex items-center justify-between">
            <h2 className="text-sm font-medium">Items seleccionados</h2>
            <Badge variant="outline">{listFiltered.length}</Badge>
          </div>
          <Separator className="mb-2" />

          {listFiltered.length === 0 ? (
            <div className="text-sm text-muted-foreground">
              No hay ítems. Elegí un proveedor (botón “Elegir”) para precargar desde su pedido.
            </div>
          ) : (
            <ul className="space-y-2">
              {listFiltered.map((p) => {
                const ventas = salesSince(p.name);
                const actualPrefill =
                  p.actual ?? (p.baselineQty != null ? Math.max(0, p.baselineQty - ventas) : undefined);
                const incoming = p.incoming ?? 0;
                const final = (Number.isFinite(actualPrefill || 0) ? (actualPrefill as number) : 0) + (incoming || 0);

                return (
                  <li key={p.key} className="p-2 rounded-lg border bg-card">
                    {/* header */}
                    <div className="flex items-center justify-between gap-3">
                      <div className="min-w-0">
                        <div className="font-medium truncate">{p.name}</div>
                        <div className="text-[11px] text-muted-foreground">
                          Ventas desde el corte: <b>{fmtInt(ventas)}</b>
                          {p.baselineQty != null && (
                            <> · Baseline: <b>{fmtInt(p.baselineQty)}</b></>
                          )}
                        </div>
                      </div>

                      <Button variant="ghost" size="icon" aria-label="Quitar"
                        onClick={() => setPending((prev) => prev.filter((x) => x.key !== p.key))}>
                        <XIcon className="w-4 h-4" />
                      </Button>
                    </div>

                    {/* grid columnas */}
                    <div className="mt-2 grid grid-cols-12 gap-2 items-end">
                      {/* Actual */}
                      <div className="col-span-4">
                        <label className="text-xs text-muted-foreground">Stock actual</label>
                        <Input
                          inputMode="numeric"
                          value={actualPrefill ?? ""}
                          onChange={(e) => {
                            const n = e.target.value === "" ? undefined : Math.max(0, parseInt(e.target.value || "0", 10));
                            setPending((prev) => prev.map((x) => (x.key === p.key ? { ...x, actual: n } : x)));
                          }}
                          placeholder="0"
                          aria-label={`Stock actual de ${p.name}`}
                        />
                      </div>

                      {/* Ingresa */}
                      <div className="col-span-4">
                        <label className="text-xs text-muted-foreground">Stock que ingresa</label>
                        <Input
                          inputMode="numeric"
                          value={incoming}
                          onChange={(e) => {
                            const n = e.target.value === "" ? 0 : Math.max(0, parseInt(e.target.value || "0", 10));
                            setPending((prev) => prev.map((x) => (x.key === p.key ? { ...x, incoming: n } : x)));
                          }}
                          placeholder="0"
                          aria-label={`Stock que ingresa para ${p.name}`}
                        />
                      </div>

                      {/* Final */}
                      <div className="col-span-4">
                        <label className="text-xs text-muted-foreground">Final = Actual + Ingresa</label>
                        <Input readOnly value={fmtInt(final)} className="font-semibold tabular-nums" />
                      </div>

                      {/* Acciones */}
                      <div className="col-span-12 flex gap-2 pt-1">
                        <Button
                          onClick={() => void saveItemRow(p)}
                          className="gap-1"
                        >
                          <Save className="w-4 h-4" /> Guardar
                        </Button>

                        <Button
                          variant="secondary"
                          onClick={() => void applyIncoming(p)}
                          disabled={!p.confirmed || (p.incoming ?? 0) <= 0}
                          className="gap-1"
                          title="Suma el ingreso al baseline y lo pone en 0"
                        >
                          <PlusCircle className="w-4 h-4" /> Aplicar ingreso
                        </Button>
                      </div>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
