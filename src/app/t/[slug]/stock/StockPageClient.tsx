"use client";

import React from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useBranch } from "@/components/branch/BranchProvider";
import { cn } from "@/lib/utils";
import { getSupabaseBrowserClient } from "@/lib/supabaseClient";
import { getActiveSalesMeta, loadSalesFromMeta, SalesRow } from "@/lib/sales-client";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { CheckCircle2, ChevronsUpDown, Clock, Loader2, MapPin } from "lucide-react";

type ProviderOption = {
  id: string;
  name: string;
  updated_at: string | null;
};

type ProviderRowDb = {
  id: string | null;
  name: string | null;
  updated_at: string | null;
};

type OrderRow = {
  id: string;
  status: string | null;
  total: number | null;
  created_at: string | null;
  notes?: string | null;
  tenant_id?: string | null;
  branch_id?: string | null;
};

type OrderItemRow = {
  id: string;
  order_id: string;
  product_name: string;
  display_name?: string | null;
  qty: number | null;
  stock_qty?: number | null;
  stock_updated_at?: string | null;
  tenant_id?: string | null;
  branch_id?: string | null;
  updated_at?: string | null;
};

type OrderRowDb = {
  id: string | null;
  status: string | null;
  total: number | null;
  created_at: string | null;
  notes?: string | null;
  tenant_id?: string | null;
  branch_id?: string | null;
};

type OrderItemRowDb = {
  id: string | null;
  order_id: string | null;
  product_name: string | null;
  display_name?: string | null;
  qty: number | null;
  stock_qty?: number | null;
  stock_updated_at?: string | null;
  tenant_id?: string | null;
  branch_id?: string | null;
  updated_at?: string | null;
};

const ORDERS_TABLE_ENV = process.env.NEXT_PUBLIC_PROVIDER_ORDERS_TABLE?.trim();
const ORDER_TABLE_CANDIDATES = [
  ...(ORDERS_TABLE_ENV ? [ORDERS_TABLE_ENV] : []),
  "orders",
  "provider_orders",
  "branch_orders",
];

const ITEMS_TABLE_ENV = process.env.NEXT_PUBLIC_PROVIDER_ORDER_ITEMS_TABLE?.trim();
const ITEM_TABLE_CANDIDATES = [
  ...(ITEMS_TABLE_ENV ? [ITEMS_TABLE_ENV] : []),
  "order_items",
  "provider_order_items",
  "branch_order_items",
];

const ORDER_HISTORY_LIMIT = 20;
const TABLE_STOCK_LOGS = "stock_logs";

const NBSP_RX_LOCAL = /[\u00A0\u202F]/g;
const DIAC_RX_LOCAL = /\p{Diacritic}/gu;
const normText = (s: string) => s.replace(NBSP_RX_LOCAL, " ").trim();
const normKey = (s: string) => normText(s).normalize("NFD").replace(DIAC_RX_LOCAL, "").toLowerCase();

function toLocalDateTimeInputValue(date: Date) {
  const pad = (value: number) => String(value).padStart(2, "0");
  const year = date.getFullYear();
  const month = pad(date.getMonth() + 1);
  const day = pad(date.getDate());
  const hours = pad(date.getHours());
  const minutes = pad(date.getMinutes());
  return `${year}-${month}-${day}T${hours}:${minutes}`;
}

function formatQty(value: number | null | undefined) {
  if (value == null || Number.isNaN(value)) return "—";
  try {
    return new Intl.NumberFormat("es-AR", { maximumFractionDigits: 2 }).format(Number(value));
  } catch {
    return String(Number(value));
  }
}

function parseQtyInput(value: string | undefined) {
  const raw = (value ?? "").trim();
  if (!raw) return 0;
  const normalized = raw.replace(/,/g, ".");
  const parsed = Number(normalized);
  if (!Number.isFinite(parsed)) return NaN;
  return Math.max(0, parsed);
}

export default function StockPageClient() {
  const supabase = React.useMemo(() => {
    if (typeof window === "undefined") return null;
    try {
      return getSupabaseBrowserClient();
    } catch (err) {
      console.error("supabase client init error", err);
      return null;
    }
  }, []);

  const { currentBranch, tenantId, loading: branchLoading } = useBranch();

  const branchId = currentBranch?.id ?? null;

  const [providers, setProviders] = React.useState<ProviderOption[]>([]);
  const [providersLoading, setProvidersLoading] = React.useState(false);
  const [providersError, setProvidersError] = React.useState<string | null>(null);
  const [selectedProviderId, setSelectedProviderId] = React.useState<string | null>(null);
  const [providerPickerOpen, setProviderPickerOpen] = React.useState(false);

  const [ordersTable, setOrdersTable] = React.useState(ORDERS_TABLE_ENV || "orders");
  const [orders, setOrders] = React.useState<OrderRow[]>([]);
  const [ordersLoading, setOrdersLoading] = React.useState(false);
  const [ordersError, setOrdersError] = React.useState<string | null>(null);
  const [selectedOrderId, setSelectedOrderId] = React.useState<string | null>(null);

  const [itemsTable, setItemsTable] = React.useState(ITEMS_TABLE_ENV || "order_items");
  const [items, setItems] = React.useState<OrderItemRow[]>([]);
  const [itemsLoading, setItemsLoading] = React.useState(false);
  const [itemsError, setItemsError] = React.useState<string | null>(null);
  const [stockInDrafts, setStockInDrafts] = React.useState<Record<string, string>>({});

  const [salesRows, setSalesRows] = React.useState<SalesRow[]>([]);
  const [salesLoading, setSalesLoading] = React.useState(false);
  const [salesError, setSalesError] = React.useState<string | null>(null);

  const [entryDateInput, setEntryDateInput] = React.useState(() => toLocalDateTimeInputValue(new Date()));
  const [applyLoading, setApplyLoading] = React.useState(false);
  const [applyError, setApplyError] = React.useState<string | null>(null);
  const [applySuccess, setApplySuccess] = React.useState<string | null>(null);

  const dateTimeFormatter = React.useMemo(() => {
    try {
      return new Intl.DateTimeFormat("es-AR", { dateStyle: "medium", timeStyle: "short" });
    } catch {
      return null;
    }
  }, []);

  const currencyFormatter = React.useMemo(() => {
    try {
      return new Intl.NumberFormat("es-AR", {
        style: "currency",
        currency: "ARS",
        maximumFractionDigits: 0,
      });
    } catch {
      return null;
    }
  }, []);

  const formatDateTime = React.useCallback(
    (iso: string | null | undefined) => {
      if (!iso) return "Sin fecha";
      if (!dateTimeFormatter) return iso;
      try {
        return dateTimeFormatter.format(new Date(iso));
      } catch {
        return iso;
      }
    },
    [dateTimeFormatter]
  );

  const formatTotal = React.useCallback(
    (total: number | null | undefined) => {
      if (typeof total !== "number" || Number.isNaN(total)) return "—";
      if (!currencyFormatter) return String(total);
      try {
        return currencyFormatter.format(total);
      } catch {
        return String(total);
      }
    },
    [currencyFormatter]
  );

  React.useEffect(() => {
    let cancelled = false;
    if (!supabase || !tenantId || !branchId) {
      setProviders([]);
      setSelectedProviderId(null);
      setProvidersError(null);
      return () => {
        cancelled = true;
      };
    }

    (async () => {
      setProvidersLoading(true);
      setProvidersError(null);
      try {
        const { data, error } = await supabase
          .from("providers")
          .select("id,name,updated_at")
          .eq("tenant_id", tenantId)
          .eq("branch_id", branchId)
          .order("name", { ascending: true });

        if (cancelled) return;

        if (error) {
          console.error("providers fetch error", error);
          setProvidersError(error.message ?? "No se pudo cargar la lista de proveedores.");
          setProviders([]);
          setSelectedProviderId(null);
          return;
        }

        const list = ((data ?? []) as ProviderRowDb[])
          .filter((row): row is ProviderRowDb & { id: string } => Boolean(row.id))
          .map((row) => ({
            id: row.id,
            name: row.name ?? "Sin nombre",
            updated_at: row.updated_at ?? null,
          }));

        setProviders(list);
        setSelectedProviderId((prev) => {
          if (prev && list.some((p) => p.id === prev)) return prev;
          return list.length ? list[0]!.id : null;
        });
      } catch (err: any) {
        if (cancelled) return;
        console.error("providers fetch exception", err);
        setProvidersError("No se pudo cargar la lista de proveedores.");
        setProviders([]);
        setSelectedProviderId(null);
      } finally {
        if (!cancelled) setProvidersLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [supabase, tenantId, branchId]);

  React.useEffect(() => {
    if (!supabase || !selectedProviderId || !tenantId || !branchId) {
      setOrders([]);
      setOrdersError(null);
      setSelectedOrderId(null);
      return;
    }

    let cancelled = false;
    (async () => {
      setOrdersLoading(true);
      setOrdersError(null);

      const variants: Array<{ useTenant: boolean; useBranch: boolean }> = [];
      const keys = new Set<string>();
      const pushVariant = (useTenant: boolean, useBranch: boolean) => {
        const key = `${useTenant ? "t" : "not"}:${useBranch ? "b" : "not"}`;
        if (keys.has(key)) return;
        keys.add(key);
        variants.push({ useTenant, useBranch });
      };
      pushVariant(true, true);
      pushVariant(true, false);
      pushVariant(false, true);
      pushVariant(false, false);

      let resolvedTable: string | null = null;
      let resolvedRows: OrderRow[] = [];
      let lastError: any = null;

      const candidates = [ordersTable, ...ORDER_TABLE_CANDIDATES.filter((t) => t !== ordersTable)];

      for (const table of candidates) {
        let skipTable = false;
      for (let i = 0; i < variants.length; i += 1) {
        const variant = variants[i];
        const isLastVariant = i === variants.length - 1;
        let query = supabase
          .from(table)
          .select("id,status,total,created_at,notes,tenant_id,branch_id")
          .eq("provider_id", selectedProviderId)
          .order("created_at", { ascending: false })
            .limit(ORDER_HISTORY_LIMIT);

          if (variant.useTenant && tenantId) query = query.eq("tenant_id", tenantId);
          if (variant.useBranch && branchId) query = query.eq("branch_id", branchId);

          let { data, error } = await query;

          if (error?.code === "42703") {
            const fallback = await supabase
              .from(table)
              .select("id,status,total,created_at,notes,tenant_id,branch_id")
              .eq("provider_id", selectedProviderId)
              .order("created_at", { ascending: false })
              .limit(ORDER_HISTORY_LIMIT);
            data = fallback.data;
            error = fallback.error;
          }

          if (error) {
            if (error.code === "42P01" || error.message?.includes("Could not find the table")) {
              skipTable = true;
              break;
            }
            lastError = error;
            continue;
          }

          const raw = ((data ?? []) as OrderRowDb[])
            .filter((row): row is OrderRowDb & { id: string } => Boolean(row.id));
          const mapped = raw.map((row) => ({
            id: row.id!,
            status: row.status,
            total: row.total,
            created_at: row.created_at,
            notes: row.notes,
            tenant_id: row.tenant_id,
            branch_id: row.branch_id,
          }));

          if (mapped.length || isLastVariant) {
            resolvedTable = table;
            resolvedRows = mapped;
            break;
          }
        }
        if (skipTable) continue;
        if (resolvedTable) break;
      }

      if (cancelled) return;

      if (!resolvedTable) {
        setOrders([]);
        setSelectedOrderId(null);
        setOrdersError(
          lastError?.message ?? "No encontramos pedidos previos para este proveedor en la sucursal seleccionada."
        );
      } else {
        setOrders(resolvedRows);
        setOrdersTable(resolvedTable);
        setSelectedOrderId((prev) => {
          if (prev && resolvedRows.some((row) => row.id === prev)) return prev;
          return resolvedRows.length ? resolvedRows[0]!.id : null;
        });
      }
      setOrdersLoading(false);
    })();

    return () => {
      cancelled = true;
    };
  }, [supabase, selectedProviderId, tenantId, branchId, ordersTable]);

  React.useEffect(() => {
    if (!supabase || !selectedOrderId) {
      setItems([]);
      setItemsError(null);
      setStockInDrafts({});
      return;
    }

    let cancelled = false;
    (async () => {
      setItemsLoading(true);
      setItemsError(null);

      const variants: Array<{ useTenant: boolean; useBranch: boolean }> = [];
      const keys = new Set<string>();
      const pushVariant = (useTenant: boolean, useBranch: boolean) => {
        const key = `${useTenant ? "t" : "not"}:${useBranch ? "b" : "not"}`;
        if (keys.has(key)) return;
        keys.add(key);
        variants.push({ useTenant, useBranch });
      };
      pushVariant(true, true);
      pushVariant(true, false);
      pushVariant(false, true);
      pushVariant(false, false);

      let resolvedTable: string | null = null;
      let resolvedRows: OrderItemRow[] = [];
      let lastError: any = null;

      const candidates = [itemsTable, ...ITEM_TABLE_CANDIDATES.filter((t) => t !== itemsTable)];

      for (const table of candidates) {
        let skipTable = false;
      for (let i = 0; i < variants.length; i += 1) {
        const variant = variants[i];
        const isLastVariant = i === variants.length - 1;
        let query = supabase
          .from(table)
          .select("id,order_id,product_name,display_name,qty,stock_qty,stock_updated_at,tenant_id,branch_id,updated_at")
          .eq("order_id", selectedOrderId)
          .order("product_name", { ascending: true });

          if (variant.useTenant && tenantId) query = query.eq("tenant_id", tenantId);
          if (variant.useBranch && branchId) query = query.eq("branch_id", branchId);

          let { data, error } = await query;

          if (error?.code === "42703") {
            const fallback = await supabase
              .from(table)
              .select("id,order_id,product_name,display_name,qty,stock_qty,stock_updated_at,tenant_id,branch_id,updated_at")
              .eq("order_id", selectedOrderId)
              .order("product_name", { ascending: true });
            data = fallback.data;
            error = fallback.error;
          }

          if (error) {
            if (error.code === "42P01" || error.message?.includes("Could not find the table")) {
              skipTable = true;
              break;
            }
            lastError = error;
            continue;
          }

          const raw = ((data ?? []) as OrderItemRowDb[])
            .filter((row): row is OrderItemRowDb & { id: string; order_id: string; product_name: string } =>
              Boolean(row.id) && Boolean(row.order_id) && Boolean(row.product_name)
            );
          const mapped = raw.map((row) => ({
            id: row.id!,
            order_id: row.order_id!,
            product_name: row.product_name!,
            display_name: row.display_name ?? null,
            qty: row.qty != null ? Number(row.qty) : null,
            stock_qty: row.stock_qty != null ? Number(row.stock_qty) : null,
            stock_updated_at: row.stock_updated_at ?? null,
            tenant_id: row.tenant_id ?? null,
            branch_id: row.branch_id ?? null,
            updated_at: row.updated_at ?? null,
          }));

          if (mapped.length || isLastVariant) {
            resolvedTable = table;
            resolvedRows = mapped;
            break;
          }
        }
        if (skipTable) continue;
        if (resolvedTable) break;
      }

      if (cancelled) return;

      if (!resolvedTable) {
        setItems([]);
        setStockInDrafts({});
        setItemsError(lastError?.message ?? "No pudimos cargar los ítems del pedido seleccionado.");
      } else {
        setItems(resolvedRows);
        setItemsTable(resolvedTable);
        setStockInDrafts(() => {
          const next: Record<string, string> = {};
          resolvedRows.forEach((row) => {
            const suggested = row.qty != null ? Number(row.qty) : null;
            next[row.id] =
              suggested != null && !Number.isNaN(suggested) ? String(suggested) : "";
          });
          return next;
        });
      }

      setItemsLoading(false);
    })();

    return () => {
      cancelled = true;
    };
  }, [supabase, selectedOrderId, tenantId, branchId, itemsTable]);

  React.useEffect(() => {
    if (!supabase || !tenantId || !branchId) {
      setSalesRows([]);
      setSalesError(null);
      return;
    }

    let cancelled = false;
    (async () => {
      setSalesLoading(true);
      setSalesError(null);
      try {
        const meta = await getActiveSalesMeta(supabase, tenantId, branchId);
        const rows = await loadSalesFromMeta(meta);
        if (!cancelled) setSalesRows(rows);
      } catch (err: any) {
        if (!cancelled) {
          console.error("load sales error", err);
          setSalesRows([]);
          setSalesError("No pudimos cargar las ventas para estimar el stock.");
        }
      } finally {
        if (!cancelled) setSalesLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [supabase, tenantId, branchId]);

  React.useEffect(() => {
    setApplyError(null);
    setApplySuccess(null);
  }, [selectedOrderId]);

  const entryTimestamp = React.useMemo(() => {
    const dt = new Date(entryDateInput);
    return Number.isNaN(dt.getTime()) ? null : dt.getTime();
  }, [entryDateInput]);

  const salesByProduct = React.useMemo(() => {
    const map = new Map<string, SalesRow[]>();
    salesRows.forEach((row) => {
      const key = normKey(row.product);
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(row);
    });
    return map;
  }, [salesRows]);

  const computeSalesSince = React.useCallback(
    (productName: string, fromTs: number | null) => {
      if (fromTs == null || !salesByProduct.size) return 0;
      const key = normKey(productName);
      const rows = salesByProduct.get(key);
      if (!rows || !rows.length) return 0;
      const now = Date.now();
      return rows
        .filter((row) => row.date >= fromTs && row.date <= now)
        .reduce((acc, row) => acc + (row.qty || 0), 0);
    },
    [salesByProduct]
  );

  const selectedProvider = React.useMemo(
    () => providers.find((p) => p.id === selectedProviderId) ?? null,
    [providers, selectedProviderId]
  );

  const selectedOrder = React.useMemo(
    () => orders.find((row) => row.id === selectedOrderId) ?? null,
    [orders, selectedOrderId]
  );

  const hasInvalidStockInput = React.useMemo(
    () =>
      items.some((item) => {
        const raw = stockInDrafts[item.id];
        if (!raw) return false;
        const parsed = parseQtyInput(raw);
        return Number.isNaN(parsed);
      }),
    [items, stockInDrafts]
  );

  const applyDisabled =
    applyLoading ||
    itemsLoading ||
    !selectedOrder ||
    !items.length ||
    !entryDateInput ||
    salesLoading ||
    hasInvalidStockInput;

  const handleApplyStock = React.useCallback(async () => {
    if (!supabase) {
      setApplyError("Supabase no disponible en este dispositivo.");
      return;
    }
    if (!selectedOrder || !items.length) return;
    if (!entryDateInput) {
      setApplyError("Elegí la fecha y hora de ingreso del stock.");
      return;
    }

    const isoDate = new Date(entryDateInput);
    if (Number.isNaN(isoDate.getTime())) {
      setApplyError("Fecha y hora inválidas.");
      return;
    }

    setApplyLoading(true);
    setApplyError(null);
    setApplySuccess(null);

    const iso = isoDate.toISOString();
    const entryMs = isoDate.getTime();

    const computed = items.map((item) => {
      const stockPrev = Number(item.stock_qty ?? 0) || 0;
      const stockInRaw = stockInDrafts[item.id] ?? "";
      const stockInParsed = parseQtyInput(stockInRaw);
      const stockIn = Number.isNaN(stockInParsed) ? NaN : Math.round(stockInParsed * 100) / 100;
      const productLabel = item.display_name?.trim() || item.product_name;
      const salesSince = Math.round(computeSalesSince(productLabel, entryMs) * 100) / 100;
      const sum = stockPrev + (Number.isNaN(stockIn) ? 0 : stockIn) - salesSince;
      const stockApplied = Math.max(0, Math.round(sum * 100) / 100);
      return { item, stockPrev, stockIn, salesSince, stockApplied };
    });

    if (computed.some((row) => Number.isNaN(row.stockIn))) {
      setApplyLoading(false);
      setApplyError("Revisá las cantidades ingresadas: hay valores inválidos.");
      return;
    }

    try {
      for (const row of computed) {
        const { item, stockApplied } = row;
        const { error } = await supabase
          .from(itemsTable)
          .update({ stock_qty: stockApplied, stock_updated_at: iso })
          .eq("id", item.id);
        if (error) {
          throw error;
        }
      }

      if (computed.length) {
        const logsPayload = computed.map((row) => ({
          order_item_id: row.item.id,
          stock_prev: row.stockPrev,
          stock_in: row.stockIn,
          stock_out: row.salesSince,
          stock_applied: row.stockApplied,
          sales_since: row.salesSince,
          applied_at: iso,
          tenant_id: row.item.tenant_id ?? tenantId ?? null,
          branch_id: row.item.branch_id ?? branchId ?? null,
        }));

        const { error: logError } = await supabase.from(TABLE_STOCK_LOGS).insert(logsPayload);
        if (logError && logError.code !== "42P01") {
          console.warn("stock log insert error", logError);
        }
      }

      setItems((prev) =>
        prev.map((item) => {
          const next = computed.find((row) => row.item.id === item.id);
          if (!next) return item;
          return { ...item, stock_qty: next.stockApplied, stock_updated_at: iso };
        })
      );

      setStockInDrafts((prev) => {
        const next = { ...prev };
        computed.forEach((row) => {
          next[row.item.id] = "";
        });
        return next;
      });

      setApplySuccess("Stock aplicado correctamente.");
    } catch (err: any) {
      console.error("apply stock error", err);
      setApplyError(err?.message ?? "No se pudo aplicar el stock.");
    } finally {
      setApplyLoading(false);
    }
  }, [branchId, computeSalesSince, entryDateInput, items, itemsTable, selectedOrder, stockInDrafts, supabase, tenantId]);

  return (
    <main className="mx-auto flex w-full max-w-4xl flex-col gap-6 px-4 py-6">
      <header className="space-y-1">
        <h1 className="text-2xl font-semibold">Stock de proveedores</h1>
        <p className="text-sm text-muted-foreground">
          Seleccioná un proveedor para trabajar con su historial de pedidos y actualizar el stock real.
        </p>
      </header>

      {branchLoading ? (
        <Card>
          <CardContent className="flex items-center gap-3 py-8 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            Cargando sucursales…
          </CardContent>
        </Card>
      ) : !tenantId || !branchId ? (
        <Card>
          <CardContent className="flex items-start gap-3 py-6 text-sm text-muted-foreground">
            <MapPin className="mt-0.5 h-4 w-4" />
            <div>
              <p className="font-medium text-foreground">Seleccioná una sucursal</p>
              <p>Elegí primero una sucursal para ver los proveedores asociados y gestionar el stock.</p>
            </div>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader className="space-y-1">
            <CardTitle className="text-lg">Proveedor</CardTitle>
            <p className="text-sm text-muted-foreground">
              Estamos trabajando sobre <span className="font-medium">{currentBranch?.name}</span>.
            </p>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium" htmlFor="stock-provider-select">
                Elegí un proveedor
              </label>
              <Popover open={providerPickerOpen} onOpenChange={setProviderPickerOpen}>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    role="combobox"
                    className="w-full max-w-sm justify-between"
                    disabled={providersLoading || providers.length === 0}
                    id="stock-provider-select"
                  >
                    <span className="truncate text-left">
                      {selectedProviderId
                        ? providers.find((p) => p.id === selectedProviderId)?.name ?? "Proveedor desconocido"
                        : providersLoading
                        ? "Cargando…"
                        : "Seleccioná un proveedor"}
                    </span>
                    <ChevronsUpDown className="ml-2 h-4 w-4 opacity-50" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="p-0 w-[var(--radix-popover-trigger-width,16rem)]">
                  <Command>
                    <CommandInput placeholder="Buscar proveedor…" />
                    <CommandList>
                      <CommandEmpty>No encontramos resultados.</CommandEmpty>
                      <CommandGroup>
                        {providers.map((provider) => (
                          <CommandItem
                            key={provider.id}
                            value={provider.name}
                            onSelect={() => {
                              setSelectedProviderId(provider.id);
                              setProviderPickerOpen(false);
                            }}
                          >
                            {provider.name}
                          </CommandItem>
                        ))}
                      </CommandGroup>
                    </CommandList>
                  </Command>
                </PopoverContent>
              </Popover>
              {providersLoading && (
                <p className="flex items-center gap-2 text-xs text-muted-foreground">
                  <Loader2 className="h-3.5 w-3.5 animate-spin" /> Buscando proveedores…
                </p>
              )}
              {!providersLoading && providers.length === 0 && (
                <p className="text-xs text-muted-foreground">
                  No encontramos proveedores cargados para esta sucursal todavía.
                </p>
              )}
              {providersError && (
                <p className="text-xs text-red-600">{providersError}</p>
              )}
            </div>

            {selectedProvider && (
              <div className="flex items-start gap-3 rounded-md border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-900">
                <CheckCircle2 className="mt-0.5 h-4 w-4" />
                <div>
                  <p className="font-semibold">{selectedProvider.name}</p>
                  <p>
                    Elegí un pedido del historial para importar cantidades y ajustar el stock real.
                  </p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {selectedProvider && tenantId && branchId && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Historial de pedidos</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {ordersLoading ? (
              <p className="flex items-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" /> Cargando pedidos del proveedor…
              </p>
            ) : ordersError ? (
              <p className="text-sm text-red-600">{ordersError}</p>
            ) : orders.length === 0 ? (
              <p className="flex items-center gap-2 text-sm text-muted-foreground">
                <Clock className="h-4 w-4" />
                Todavía no tenemos pedidos registrados para este proveedor en la sucursal.
              </p>
            ) : (
              <div className="space-y-3">
                {orders.map((order) => {
                  const isSelected = order.id === selectedOrderId;
                  return (
                    <button
                      key={order.id}
                      type="button"
                      onClick={() => setSelectedOrderId(order.id)}
                      className={cn(
                        "w-full rounded-md border p-3 text-left transition",
                        isSelected
                          ? "border-emerald-500 bg-emerald-50"
                          : "border-border bg-card hover:border-emerald-300"
                      )}
                    >
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <Badge variant={isSelected ? "default" : "secondary"} className="uppercase">
                            {order.status ?? "Sin estado"}
                          </Badge>
                          <span className="text-sm text-muted-foreground">
                            {formatDateTime(order.created_at)}
                          </span>
                        </div>
                        <span className="text-sm font-medium">{formatTotal(order.total)}</span>
                      </div>
                      {order.notes && (
                        <p className="mt-2 text-sm text-muted-foreground line-clamp-2">{order.notes}</p>
                      )}
                    </button>
                  );
                })}
              </div>
            )}

            {selectedOrder && (
              <div className="rounded-md border border-dashed border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-900">
                <p>
                  Pedido seleccionado: <span className="font-semibold">{formatDateTime(selectedOrder.created_at)}</span> · Total {formatTotal(selectedOrder.total)}
                </p>
                {selectedOrder.notes && (
                  <p className="mt-1 line-clamp-2 text-xs text-emerald-900/80">{selectedOrder.notes}</p>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {selectedOrder && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Detalle del pedido</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {itemsLoading ? (
              <p className="flex items-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" /> Cargando ítems del pedido…
              </p>
            ) : itemsError ? (
              <p className="text-sm text-red-600">{itemsError}</p>
            ) : items.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                Este pedido todavía no tiene artículos cargados.
              </p>
            ) : (
              <div className="space-y-3">
                {salesError && (
                  <p className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-900">
                    {salesError}
                  </p>
                )}
                {items.map((item) => {
                  const productLabel = item.display_name?.trim() || item.product_name;
                  const stockPrev = Number(item.stock_qty ?? 0) || 0;
                  const stockInRaw = stockInDrafts[item.id] ?? "";
                  const stockInParsed = parseQtyInput(stockInRaw);
                  const stockInSafe = Number.isNaN(stockInParsed) ? 0 : stockInParsed;
                  const salesSince = Math.round(computeSalesSince(productLabel, entryTimestamp) * 100) / 100;
                  const stockPreview = Math.max(0, Math.round((stockPrev + stockInSafe - salesSince) * 100) / 100);
                  const hasInputError = stockInRaw.trim().length > 0 && Number.isNaN(stockInParsed);

                  return (
                    <div key={item.id} className="rounded-md border p-3">
                      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                        <div className="space-y-2">
                          <p className="font-medium leading-tight">{productLabel}</p>
                          <div className="text-xs text-muted-foreground space-y-1">
                            <p>Pedido original: {formatQty(item.qty)}</p>
                            {item.stock_qty != null && (
                              <p>
                                Stock previo guardado: {formatQty(item.stock_qty)} · {formatDateTime(item.stock_updated_at)}
                              </p>
                            )}
                            {salesLoading ? (
                              <p>Calculando ventas…</p>
                            ) : salesSince > 0 ? (
                              <p>Ventas desde ingreso: {formatQty(salesSince)}</p>
                            ) : null}
                          </div>
                        </div>

                        <div className="w-full max-w-[220px] space-y-3">
                          <div className="space-y-1">
                            <label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                              Stock previo
                            </label>
                            <Input value={formatQty(stockPrev)} readOnly className="text-right" />
                          </div>

                          <div className="space-y-1">
                            <label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                              Ingreso actual
                            </label>
                            <Input
                              inputMode="decimal"
                              value={stockInRaw}
                              onChange={(event) => {
                                const value = event.target.value;
                                setStockInDrafts((prev) => ({ ...prev, [item.id]: value }));
                              }}
                              placeholder="0"
                              className={cn(hasInputError && "border-red-500 focus-visible:ring-red-500")}
                            />
                            {hasInputError && (
                              <p className="text-xs text-red-500">Valor inválido</p>
                            )}
                          </div>

                          <div className="space-y-1">
                            <label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                              Stock final estimado
                            </label>
                            <Input value={formatQty(stockPreview)} readOnly className="text-right" />
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            <div className="grid gap-3 border-t border-border pt-4">
              <div className="grid gap-2 sm:grid-cols-[minmax(0,1fr)_220px] sm:items-end sm:gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Fecha y hora de ingreso</label>
                  <Input
                    type="datetime-local"
                    value={entryDateInput}
                    onChange={(event) => setEntryDateInput(event.target.value)}
                  />
                  <p className="text-xs text-muted-foreground">
                    Se guardará como sello en cada artículo para sincronizar con la página de pedidos.
                  </p>
                </div>

                <Button
                  className="mt-2 w-full sm:mt-0"
                  onClick={handleApplyStock}
                  disabled={applyDisabled}
                >
                  {applyLoading ? (
                    <span className="flex items-center justify-center gap-2">
                      <Loader2 className="h-4 w-4 animate-spin" /> Aplicando…
                    </span>
                  ) : (
                    "Aplicar stock"
                  )}
                </Button>
              </div>

              {applyError && <p className="text-sm text-red-600">{applyError}</p>}
              {applySuccess && <p className="text-sm text-emerald-600">{applySuccess}</p>}
            </div>
          </CardContent>
        </Card>
      )}
    </main>
  );
}
