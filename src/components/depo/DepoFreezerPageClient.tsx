"use client";

import React from "react";
import clsx from "clsx";
import { Check, Info, Loader2, Minus, Plus, RefreshCw, Search, Snowflake, Trash2 } from "lucide-react";
import { getSupabaseBrowserClient } from "@/lib/supabaseClient";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Separator } from "@/components/ui/separator";
import type { PostgrestError } from "@supabase/supabase-js";

const GROUP_SLUG = "freezer";
const GROUP_NAME = "Freezer";
const CATALOG_LS_KEY = "gestock:prices:v6";

type Props = {
  tenantId: string;
  tenantSlug: string;
  branchId: string;
  branchSlug: string;
  branchName: string;
  userEmail: string;
};

type DepoGroup = {
  id: string;
  name: string;
  slug: string;
  updated_at?: string | null;
};

type ProductRow = {
  id: string;
  name: string;
  sku?: string | null;
  price?: number | string | null;
};

type DepoItem = {
  id: string;
  productId: string;
  quantity: number;
  updatedAt: string | null;
  updatedByName?: string | null;
  updatedByEmail?: string | null;
  product: ProductRow | null;
};

type DepoItemQueryRow = {
  id: string;
  product_id: string;
  quantity: number | string | null;
  updated_at: string | null;
  updated_by_name?: string | null;
  updated_by_email?: string | null;
  products?: ProductRow | null;
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

type Catalog = {
  items: PriceItem[];
  rowCount: number;
  importedAt: number;
  sourceMode: "api" | "public" | "local-upload";
};

type IndexedCatalogItem = PriceItem & {
  searchKey: string;
  codeKey: string;
  barcodeKey: string;
};

type UserInfo = {
  id: string | null;
  email: string;
  displayName: string;
};

export default function DepoFreezerPageClient({
  tenantId,
  tenantSlug,
  branchId,
  branchSlug,
  branchName,
  userEmail,
}: Props) {
  const supabase = React.useMemo(() => getSupabaseBrowserClient(), []);
  const [group, setGroup] = React.useState<DepoGroup | null>(null);
  const [groupError, setGroupError] = React.useState<string | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [items, setItems] = React.useState<DepoItem[]>([]);
  const [products, setProducts] = React.useState<ProductRow[]>([]);
  const [catalog, setCatalog] = React.useState<Catalog | null>(null);
  const [catalogLoading, setCatalogLoading] = React.useState(true);
  const [catalogError, setCatalogError] = React.useState<string | null>(null);
  const [query, setQuery] = React.useState("");
  const [draftQuantities, setDraftQuantities] = React.useState<Record<string, string>>({});
  const [savingIds, setSavingIds] = React.useState<Set<string>>(new Set());
  const [togglingId, setTogglingId] = React.useState<string | null>(null);
  const [removingId, setRemovingId] = React.useState<string | null>(null);
  const [userInfo, setUserInfo] = React.useState<UserInfo>({
    id: null,
    email: userEmail,
    displayName: formatUserName(userEmail),
  });

  React.useEffect(() => {
    let active = true;
    supabase.auth.getUser().then((res) => {
      if (!active) return;
      const email = res.data.user?.email ?? userEmail;
      setUserInfo({
        id: res.data.user?.id ?? null,
        email,
        displayName: formatUserName(email),
      });
    });
    return () => {
      active = false;
    };
  }, [supabase, userEmail]);

  const ensureGroup = React.useCallback(async () => {
    const { data, error } = await supabase
      .from("depo_groups")
      .select("id, name, slug, updated_at")
      .eq("tenant_id", tenantId)
      .eq("branch_id", branchId)
      .eq("slug", GROUP_SLUG)
      .maybeSingle();

    if (error && error.code !== "PGRST116") {
      throw error;
    }

    if (data) return data as DepoGroup;

    const insert = await supabase
      .from("depo_groups")
      .insert({
        tenant_id: tenantId,
        branch_id: branchId,
        slug: GROUP_SLUG,
        name: GROUP_NAME,
      })
      .select("id, name, slug, updated_at")
      .single();

    if (insert.error || !insert.data) {
      throw insert.error ?? new Error("No se pudo crear el grupo Freezer");
    }

    return insert.data as DepoGroup;
  }, [branchId, supabase, tenantId]);

  const fetchProducts = React.useCallback(async () => {
    const { data, error } = await supabase
      .from("products")
      .select("id, name, sku, price")
      .eq("tenant_id", tenantId)
      .eq("branch_id", branchId)
      .order("name", { ascending: true });

    if (error) throw error;
    return (data ?? []) as ProductRow[];
  }, [branchId, supabase, tenantId]);

  const fetchItems = React.useCallback(async (groupId: string) => {
    const { data, error } = await supabase
      .from("depo_items")
      .select("id, product_id, quantity, updated_at, updated_by_name, updated_by_email, products(id, name, sku, price)")
      .eq("group_id", groupId);

    if (error) throw error;
    const rows = (data ?? []) as DepoItemQueryRow[];
    return rows.map(mapItemRow);
  }, [supabase]);

  React.useEffect(() => {
    let cancelled = false;
    async function bootstrap() {
      setLoading(true);
      setGroupError(null);
      try {
        const freezer = await ensureGroup();
        if (cancelled) return;
        setGroup(freezer);
        const [productRows, itemRows] = await Promise.all([
          fetchProducts(),
          fetchItems(freezer.id),
        ]);
        if (cancelled) return;
        setProducts(productRows);
        setItems(sortItems(itemRows));
        setDraftQuantities(buildDraftMap(itemRows));
      } catch (err) {
        if (cancelled) return;
        const rawMessage = errorMessageFrom(err, "No pudimos cargar el depósito");
        setGroupError(friendlyDepoError(rawMessage));
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }
    bootstrap();
    return () => {
      cancelled = true;
    };
  }, [ensureGroup, fetchItems, fetchProducts]);

  React.useEffect(() => {
    let cancelled = false;
    async function loadCatalog() {
      setCatalogLoading(true);
      const cached = readCatalogFromStorage();
      if (cached && !cancelled) {
        setCatalog(cached);
      }
      try {
        const res = await fetch("/api/precios", { cache: "no-store" });
        if (!res.ok) {
          throw new Error("No se pudo cargar el catálogo (" + res.status + ")");
        }
        const json = (await res.json()) as Catalog;
        if (cancelled) return;
        setCatalog(json);
        writeCatalogToStorage(json);
      } catch (err) {
        if (!cancelled) {
          setCatalogError(errorMessageFrom(err, "No pudimos cargar el catálogo"));
        }
      } finally {
        if (!cancelled) {
          setCatalogLoading(false);
        }
      }
    }
    loadCatalog();
    return () => {
      cancelled = true;
    };
  }, []);

  const productByNameKey = React.useMemo(() => {
    const map = new Map<string, ProductRow>();
    for (const prod of products) {
      const nameKey = normText(prod.name);
      if (nameKey && !map.has(nameKey)) {
        map.set(nameKey, prod);
      }
      const skuKey = normText(prod.sku ?? "");
      if (skuKey && !map.has(`sku:${skuKey}`)) {
        map.set(`sku:${skuKey}`, prod);
      }
    }
    return map;
  }, [products]);

  const indexedCatalog = React.useMemo<IndexedCatalogItem[]>(() => {
    if (!catalog) return [];
    return catalog.items.map((item) => ({
      ...item,
      searchKey: normText(item.name),
      codeKey: normText(item.code ?? ""),
      barcodeKey: barcodeKeyValue(item.barcode),
    }));
  }, [catalog]);

  const itemByProductId = React.useMemo(() => {
    const map = new Map<string, DepoItem>();
    for (const item of items) {
      if (item.productId) {
        map.set(item.productId, item);
      }
    }
    return map;
  }, [items]);

  const searchResults = React.useMemo(() => {
    if (!indexedCatalog.length) return [];
    const norm = normText(query);
    const tokens = norm ? norm.split(" ").filter(Boolean) : [];
    const barcodeDigits = query.replace(/\D+/g, "");

    const filtered = indexedCatalog.filter((entry) => {
      if (!tokens.length && !barcodeDigits) return true;
      if (barcodeDigits && entry.barcodeKey.includes(barcodeDigits)) return true;
      if (!tokens.length) return false;
      return tokens.every((token) =>
        entry.searchKey.includes(token) || entry.codeKey.includes(token) || entry.barcodeKey.includes(token)
      );
    });

    return filtered.slice(0, 12);
  }, [indexedCatalog, query]);

  const lastActivity = React.useMemo(() => {
    if (!items.length) return null;
    return items.reduce<DepoItem | null>((latest, item) => {
      if (!item.updatedAt) return latest;
      if (!latest?.updatedAt) return item;
      return new Date(item.updatedAt).getTime() > new Date(latest.updatedAt).getTime() ? item : latest;
    }, null);
  }, [items]);

  const refreshing = loading;

  async function handleRefresh() {
    if (!group) return;
    setLoading(true);
    try {
      const [productRows, itemRows] = await Promise.all([
        fetchProducts(),
        fetchItems(group.id),
      ]);
      setProducts(productRows);
      setItems(sortItems(itemRows));
      setDraftQuantities(buildDraftMap(itemRows));
    } catch (err) {
      const rawMessage = errorMessageFrom(err, "No pudimos actualizar");
      setGroupError(friendlyDepoError(rawMessage));
    } finally {
      setLoading(false);
    }
  }

  function findProductForSuggestion(item: IndexedCatalogItem): ProductRow | null {
    const codeKey = item.codeKey ? productByNameKey.get(`sku:${item.codeKey}`) : null;
    if (codeKey) return codeKey;
    const barcodeKey = item.barcodeKey ? productByNameKey.get(`sku:${item.barcodeKey}`) : null;
    if (barcodeKey) return barcodeKey;
    const byName = item.searchKey ? productByNameKey.get(item.searchKey) : null;
    return byName ?? null;
  }

  async function ensureProductForSuggestion(item: IndexedCatalogItem) {
    let product = findProductForSuggestion(item);
    if (product) return product;

    const { data, error } = await supabase
      .from("products")
      .insert({
        tenant_id: tenantId,
        branch_id: branchId,
        name: item.name ?? "Producto sin nombre",
        sku: item.code ?? null,
        price: item.price ?? 0,
        pack_size: 1,
        stock: 0,
      })
      .select("id, name, sku, price")
      .single();

    if (error || !data) {
      throw error ?? new Error("No se pudo crear el producto");
    }

    const created = data as ProductRow;
    setProducts((prev) => sortProducts([...prev, created]));
    return created;
  }

  async function toggleProduct(item: IndexedCatalogItem) {
    if (!group) return;
    setTogglingId(item.id);
    try {
      const product = await ensureProductForSuggestion(item);
      if (!product) {
        throw new Error("No encontramos el producto en esta sucursal");
      }

      const existing = itemByProductId.get(product.id);
      if (existing) {
        await supabase.from("depo_items").delete().eq("id", existing.id);
        setItems((prev) => prev.filter((row) => row.id !== existing.id));
        setDraftQuantities((prev) => {
          const next = { ...prev };
          delete next[existing.id];
          return next;
        });
      } else {
        const displayName = userInfo.displayName || userInfo.email;
        const insert = await supabase
          .from("depo_items")
          .insert({
            tenant_id: tenantId,
            branch_id: branchId,
            group_id: group.id,
            product_id: product.id,
            quantity: 0,
            updated_by: userInfo.id,
            updated_by_name: displayName,
            updated_by_email: userInfo.email,
          })
          .select("id, product_id, quantity, updated_at, updated_by_name, updated_by_email, products(id, name, sku, price)")
          .single();

        if (insert.error || !insert.data) {
          throw insert.error ?? new Error("No se pudo agregar el producto");
        }

        const mapped = mapItemRow(insert.data as DepoItemQueryRow);
        setItems((prev) => sortItems([...prev, mapped]));
        setDraftQuantities((prev) => ({ ...prev, [mapped.id]: formatQuantityInput(mapped.quantity) }));
      }
    } catch (err) {
      const rawMessage = errorMessageFrom(err, "No pudimos actualizar la lista");
      setGroupError(friendlyDepoError(rawMessage));
    } finally {
      setTogglingId(null);
    }
  }

  async function handleSave(item: DepoItem) {
    const draft = (draftQuantities[item.id] ?? "").replace(",", ".");
    const parsed = Number(draft);
    if (!Number.isFinite(parsed) || parsed < 0) {
      setGroupError("Ingresá una cantidad válida (>= 0)");
      return;
    }
    setSavingIds((prev) => {
      const next = new Set(prev);
      next.add(item.id);
      return next;
    });
    try {
      const displayName = userInfo.displayName || userInfo.email;
      const { data, error } = await supabase
        .from("depo_items")
        .update({
          quantity: parsed,
          updated_by: userInfo.id,
          updated_by_name: displayName,
          updated_by_email: userInfo.email,
        })
        .eq("id", item.id)
        .select("id, product_id, quantity, updated_at, updated_by_name, updated_by_email, products(id, name, sku, price)")
        .single();

      if (error || !data) {
        throw error ?? new Error("No se pudo guardar");
      }

      const updated = mapItemRow(data as DepoItemQueryRow);
      setItems((prev) => sortItems(prev.map((row) => (row.id === updated.id ? updated : row))));
      setDraftQuantities((prev) => ({ ...prev, [updated.id]: formatQuantityInput(updated.quantity) }));
    } catch (err) {
      const rawMessage = errorMessageFrom(err, "No pudimos guardar la cantidad");
      setGroupError(friendlyDepoError(rawMessage));
    } finally {
      setSavingIds((prev) => {
        const next = new Set(prev);
        next.delete(item.id);
        return next;
      });
    }
  }

  async function handleRemove(item: DepoItem) {
    setRemovingId(item.id);
    try {
      await supabase.from("depo_items").delete().eq("id", item.id);
      setItems((prev) => prev.filter((row) => row.id !== item.id));
      setDraftQuantities((prev) => {
        const next = { ...prev };
        delete next[item.id];
        return next;
      });
    } catch (err) {
      const rawMessage = errorMessageFrom(err, "No pudimos quitar el producto");
      setGroupError(friendlyDepoError(rawMessage));
    } finally {
      setRemovingId(null);
    }
  }

  function adjustQuantity(item: DepoItem, delta: number) {
    setDraftQuantities((prev) => {
      const current = Number((prev[item.id] ?? formatQuantityInput(item.quantity)).replace(",", "."));
      const nextValue = Number.isFinite(current) ? Math.max(0, Math.round((current + delta) * 1000) / 1000) : Math.max(0, delta);
      return { ...prev, [item.id]: formatQuantityInput(nextValue) };
    });
  }

  const itemCount = items.length;

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-6 px-4 py-6">
      <header className="space-y-3">
        <div className="flex flex-wrap items-center gap-3">
          <Badge variant="secondary" className="text-sm">
            <Snowflake className="mr-1 h-4 w-4" /> Freezer
          </Badge>
          <Badge variant="outline">{branchName}</Badge>
          <Badge variant="outline">{tenantSlug} / {branchSlug}</Badge>
        </div>
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">
            Depósito · Freezer
          </h1>
          <p className="text-sm text-muted-foreground">
            Gestioná el inventario del freezer de esta sucursal. Podés agregar productos, registrar cantidades y ver quién actualizó por última vez.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
          <span>
            Última actualización:&nbsp;
            {lastActivity ? (
              <strong className="text-foreground">
                {formatTimestamp(lastActivity.updatedAt)} por {lastActivity.updatedByName || lastActivity.updatedByEmail || "—"}
              </strong>
            ) : (
              <span>Aún no hay movimientos</span>
            )}
          </span>
          <Separator orientation="vertical" className="hidden h-4 sm:inline-flex" />
          <span>{itemCount} productos</span>
          <Button
            variant="ghost"
            size="sm"
            className="ml-auto flex items-center gap-2"
            onClick={handleRefresh}
            disabled={refreshing}
          >
            {refreshing ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
            Actualizar
          </Button>
        </div>
        {groupError && (
          <div className="flex items-start gap-2 rounded-lg border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">
            <Info className="mt-0.5 h-4 w-4 flex-none" />
            <span>{groupError}</span>
          </div>
        )}
      </header>

      <section className="space-y-4">
        <Card className="border-dashed">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base font-semibold">
              <Search className="h-4 w-4" /> Buscador de productos
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <Command className="rounded-xl border">
              <CommandInput
                placeholder="Nombre, código o código de barras"
                value={query}
                onValueChange={setQuery}
              />
              <CommandList>
                {catalogLoading && <CommandEmpty>Cargando catálogo…</CommandEmpty>}
                {!catalogLoading && searchResults.length === 0 && (
                  <CommandEmpty>
                    {catalogError ? catalogError : query ? "Sin resultados" : "Empezá a escribir para buscar"}
                  </CommandEmpty>
                )}
                {!catalogLoading && searchResults.length > 0 && (
                  <CommandGroup heading={`Sugerencias (${searchResults.length})`}>
                    {searchResults.map((item) => {
                      const product = findProductForSuggestion(item);
                      const exists = product ? itemByProductId.has(product.id) : false;
                      const busy = togglingId === item.id;
                      return (
                        <CommandItem
                          key={item.id}
                          value={item.id}
                          onSelect={() => toggleProduct(item)}
                          disabled={busy}
                        >
                          <div className="flex w-full items-center gap-3">
                            <div className="flex-1">
                              <p className="font-medium text-foreground">{item.name ?? "Sin nombre"}</p>
                              <p className="text-xs text-muted-foreground">
                                {item.code ? `Código ${item.code}` : "Sin código"}
                                {item.price ? ` · $${formatPrice(item.price)}` : ""}
                              </p>
                            </div>
                            <div className="flex items-center gap-2">
                              {exists && <Badge variant="secondary">En freezer</Badge>}
                              {busy ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                              ) : (
                                <span
                                  className={clsx(
                                    "flex h-8 w-8 items-center justify-center rounded-full border",
                                    exists ? "border-primary bg-primary/10 text-primary" : "border-border"
                                  )}
                                >
                                  {exists ? <Check className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
                                </span>
                              )}
                            </div>
                          </div>
                        </CommandItem>
                      );
                    })}
                  </CommandGroup>
                )}
              </CommandList>
            </Command>
            <p className="text-xs text-muted-foreground">
              El buscador usa el mismo catálogo que el módulo de precios. Seleccioná un producto para incorporarlo o quitarlo rápidamente del freezer.
            </p>
          </CardContent>
        </Card>
      </section>

      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">Productos en el freezer ({itemCount})</h2>
        </div>
        {loading && !items.length ? (
          <Card>
            <CardContent className="py-10 text-center text-sm text-muted-foreground">
              Cargando inventario…
            </CardContent>
          </Card>
        ) : items.length === 0 ? (
          <Card className="border-dashed">
            <CardContent className="py-12 text-center text-sm text-muted-foreground">
              No hay productos cargados aún. Usá el buscador para agregar los primeros ítems al freezer.
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {items.map((item) => (
              <Card key={item.id} className="shadow-sm">
                <CardContent className="flex flex-col gap-4 py-4 sm:flex-row sm:items-center sm:justify-between">
                  <div className="space-y-1">
                    <p className="text-base font-semibold text-foreground">
                      {item.product?.name ?? "Producto"}
                    </p>
                    <div className="text-xs text-muted-foreground">
                      {item.product?.sku ? `Código ${item.product.sku}` : "Sin código"}
                      {item.product?.price ? ` · $${formatPrice(item.product.price)}` : ""}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      Última edición: {item.updatedByName || item.updatedByEmail || "—"}
                      {item.updatedAt ? ` · ${formatTimestamp(item.updatedAt)}` : ""}
                    </div>
                  </div>
                  <div className="flex flex-col items-stretch gap-3 sm:min-w-[260px]">
                    <div className="flex items-center gap-2">
                      <Button
                        type="button"
                        variant="outline"
                        size="icon"
                        className="h-10 w-10"
                        onClick={() => adjustQuantity(item, -1)}
                      >
                        <Minus className="h-4 w-4" />
                      </Button>
                      <Input
                        type="text"
                        inputMode="decimal"
                        className="text-center text-lg font-semibold"
                        value={draftQuantities[item.id] ?? formatQuantityInput(item.quantity)}
                        onChange={(ev) =>
                          setDraftQuantities((prev) => ({ ...prev, [item.id]: ev.target.value }))
                        }
                      />
                      <Button
                        type="button"
                        variant="outline"
                        size="icon"
                        className="h-10 w-10"
                        onClick={() => adjustQuantity(item, 1)}
                      >
                        <Plus className="h-4 w-4" />
                      </Button>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      <Button
                        onClick={() => handleSave(item)}
                        disabled={savingIds.has(item.id)}
                        className="flex-1"
                      >
                        {savingIds.has(item.id) && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        Guardar
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => handleRemove(item)}
                        disabled={removingId === item.id}
                      >
                        {removingId === item.id ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <Trash2 className="h-4 w-4" />
                        )}
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </section>
    </div>
  );

  function mapItemRow(row: DepoItemQueryRow): DepoItem {
    return {
      id: row.id,
      productId: row.product_id,
      quantity: parseQuantity(row.quantity),
      updatedAt: row.updated_at,
      updatedByName: row.updated_by_name,
      updatedByEmail: row.updated_by_email,
      product: row.products ?? null,
    };
  }

  function sortItems(list: DepoItem[]) {
    return [...list].sort((a, b) => {
      const aName = (a.product?.name ?? "").toLowerCase();
      const bName = (b.product?.name ?? "").toLowerCase();
      if (aName === bName) {
        return (a.productId ?? "").localeCompare(b.productId ?? "");
      }
      return aName.localeCompare(bName);
    });
  }

  function sortProducts(list: ProductRow[]) {
    return [...list].sort((a, b) => a.name.localeCompare(b.name));
  }

  function buildDraftMap(list: DepoItem[]) {
    return list.reduce<Record<string, string>>((acc, item) => {
      acc[item.id] = formatQuantityInput(item.quantity);
      return acc;
    }, {});
  }
}

function parseQuantity(value: number | string | null | undefined) {
  if (typeof value === "number") return value;
  if (typeof value === "string") {
    const n = Number(value);
    return Number.isFinite(n) ? n : 0;
  }
  return 0;
}

function formatQuantityInput(value: number) {
  if (!Number.isFinite(value)) return "0";
  const rounded = Math.round(value * 1000) / 1000;
  return rounded.toString();
}

function formatPrice(value: number | string | null | undefined) {
  if (value == null) return "0";
  const n = typeof value === "number" ? value : Number(value) || 0;
  return n.toLocaleString("es-AR", { minimumFractionDigits: 0, maximumFractionDigits: 0 });
}

function formatTimestamp(value: string | null) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString("es-AR", { dateStyle: "short", timeStyle: "short" });
}

function formatUserName(email: string | null | undefined) {
  if (!email) return "";
  const [local] = email.split("@");
  if (!local) return email;
  return local
    .split(/[._-]+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function readCatalogFromStorage(): Catalog | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(CATALOG_LS_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Catalog;
    if (!parsed || !Array.isArray(parsed.items)) return null;
    return parsed;
  } catch {
    return null;
  }
}

function writeCatalogToStorage(catalog: Catalog) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(CATALOG_LS_KEY, JSON.stringify(catalog));
  } catch {
    // ignore
  }
}

function errorMessageFrom(error: unknown, fallback: string) {
  if (error == null) return fallback;
  if (typeof error === "string") return error;
  if (error instanceof Error) return error.message;
  const pg = error as Partial<PostgrestError>;
  return (typeof pg.message === "string" && pg.message) || fallback;
}

function friendlyDepoError(message: string) {
  if (/depo_(groups|items)/i.test(message) || message.includes("schema cache")) {
    return "Falta aplicar la migración 20250519_add_depo_tables en Supabase para crear las tablas depo_groups y depo_items.";
  }
  return message;
}

const NBSP_RX = /[\u202F\u00A0]/g;

function stripInvisibles(s: string) {
  return s.replace(NBSP_RX, " ");
}

function normText(value: string | null | undefined) {
  if (!value) return "";
  return stripInvisibles(value)
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
}

function barcodeKeyValue(barcode?: string | null) {
  if (!barcode) return "";
  const trimmed = stripInvisibles(barcode).replace(/\s+/g, "").trim();
  if (!trimmed) return "";
  if (/[A-Za-z]/.test(trimmed)) return normText(trimmed);
  return trimmed.replace(/\D+/g, "");
}
