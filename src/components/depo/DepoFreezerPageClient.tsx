"use client";

import React from "react";
import clsx from "clsx";
import { Check, Info, Loader2, Minus, Pencil, Plus, RefreshCw, Search, Snowflake, Trash2, X } from "lucide-react";
import { getSupabaseBrowserClient } from "@/lib/supabaseClient";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Separator } from "@/components/ui/separator";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import type { PostgrestError, UserResponse } from "@supabase/supabase-js";

const DEFAULT_GROUP_SLUG = "freezer";
const DEFAULT_GROUP_NAME = "Freezer";
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
  groupId: string;
  quantity: number;
  updatedAt: string | null;
  updatedByName?: string | null;
  updatedByEmail?: string | null;
  product: ProductRow | null;
};

type DepoItemQueryRow = {
  id: string;
  group_id: string;
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

type LoadedData = {
  groups: DepoGroup[];
  products: ProductRow[];
  itemsMap: Record<string, DepoItem[]>;
  draftMap: Record<string, string>;
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
  const [groups, setGroups] = React.useState<DepoGroup[]>([]);
  const [groupError, setGroupError] = React.useState<string | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [itemsByGroup, setItemsByGroup] = React.useState<Record<string, DepoItem[]>>({});
  const [products, setProducts] = React.useState<ProductRow[]>([]);
  const [catalog, setCatalog] = React.useState<Catalog | null>(null);
  const [catalogLoading, setCatalogLoading] = React.useState(true);
  const [catalogError, setCatalogError] = React.useState<string | null>(null);
  const [groupQueries, setGroupQueries] = React.useState<Record<string, string>>({});
  const [listFilterOpen, setListFilterOpen] = React.useState(false);
  const [listFilterQuery, setListFilterQuery] = React.useState("");
  const listFilterInputRef = React.useRef<HTMLInputElement | null>(null);
  const [openDropdownGroupId, setOpenDropdownGroupId] = React.useState<string | null>(null);
  const [creatingCustomProductFor, setCreatingCustomProductFor] = React.useState<string | null>(null);
  const catalogSearchRefs = React.useRef<Record<string, HTMLDivElement | null>>({});
  const [editingProductNames, setEditingProductNames] = React.useState<Set<string>>(new Set());
  const [productNameDrafts, setProductNameDrafts] = React.useState<Record<string, string>>({});
  const [productNameSavingIds, setProductNameSavingIds] = React.useState<Set<string>>(new Set());
  const [draftQuantities, setDraftQuantities] = React.useState<Record<string, string>>({});
  const [savingIds, setSavingIds] = React.useState<Set<string>>(new Set());
  const [togglingTargets, setTogglingTargets] = React.useState<Record<string, string | null>>({});
  const [removingId, setRemovingId] = React.useState<string | null>(null);
  const [addingSection, setAddingSection] = React.useState(false);
  const [newSectionName, setNewSectionName] = React.useState("");
  const [creatingSection, setCreatingSection] = React.useState(false);
  const [userInfo, setUserInfo] = React.useState<UserInfo>({
    id: null,
    email: userEmail,
    displayName: formatUserName(userEmail),
  });

  React.useEffect(() => {
    let active = true;
    supabase.auth.getUser().then((res: UserResponse) => {
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

  const fetchGroups = React.useCallback(async () => {
    const { data, error } = await supabase
      .from("depo_groups")
      .select("id, name, slug, updated_at")
      .eq("tenant_id", tenantId)
      .eq("branch_id", branchId)
      .order("name", { ascending: true });

    if (error) throw error;
    return (data ?? []) as DepoGroup[];
  }, [branchId, supabase, tenantId]);

  const createGroup = React.useCallback(
    async (name: string, slug?: string) => {
      const finalSlug = slug ?? generateGroupSlug(name);
      const { data, error } = await supabase
        .from("depo_groups")
        .insert({
          tenant_id: tenantId,
          branch_id: branchId,
          slug: finalSlug,
          name,
        })
        .select("id, name, slug, updated_at")
        .single();

      if (error || !data) {
        throw error ?? new Error("No se pudo crear la sección");
      }

      return data as DepoGroup;
    },
    [branchId, supabase, tenantId]
  );

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
      .select("id, group_id, product_id, quantity, updated_at, updated_by_name, updated_by_email, products(id, name, sku, price)")
      .eq("group_id", groupId);

    if (error) throw error;
    const rows = (data ?? []) as DepoItemQueryRow[];
    return rows.map(mapItemRow);
  }, [supabase]);

  const loadAllData = React.useCallback(async (): Promise<LoadedData> => {
    let existingGroups = await fetchGroups();
    if (!existingGroups.length) {
      const defaultGroup = await createGroup(DEFAULT_GROUP_NAME, DEFAULT_GROUP_SLUG);
      existingGroups = [defaultGroup];
    }
    const sorted = sortGroups(existingGroups);
    const [productRows, itemEntries] = await Promise.all([
      fetchProducts(),
      Promise.all(sorted.map(async (group) => {
        const rows = await fetchItems(group.id);
        return [group.id, sortItems(rows)] as const;
      })),
    ]);
    const map: Record<string, DepoItem[]> = {};
    const allItems: DepoItem[] = [];
    for (const [groupId, list] of itemEntries) {
      map[groupId] = list;
      allItems.push(...list);
    }
    return {
      groups: sorted,
      products: productRows,
      itemsMap: map,
      draftMap: buildDraftMap(allItems),
    };
  }, [createGroup, fetchGroups, fetchItems, fetchProducts]);

  const applyLoadedData = React.useCallback((data: LoadedData) => {
    setGroups(data.groups);
    setProducts(data.products);
    setItemsByGroup(data.itemsMap);
    setDraftQuantities(data.draftMap);
    setGroupQueries((prev) => {
      const next: Record<string, string> = {};
      for (const group of data.groups) {
        next[group.id] = prev[group.id] ?? "";
      }
      return next;
    });
  }, []);

  React.useEffect(() => {
    let cancelled = false;
    async function bootstrap() {
      setLoading(true);
      setGroupError(null);
      try {
        const data = await loadAllData();
        if (cancelled) return;
        applyLoadedData(data);
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
  }, [applyLoadedData, loadAllData]);

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

  React.useEffect(() => {
    if (!openDropdownGroupId) return;
    const dropdownId = openDropdownGroupId;
    function handlePointerDown(event: PointerEvent) {
      const target = event.target as Node;
      const ref = catalogSearchRefs.current[dropdownId];
      if (ref && !ref.contains(target)) {
        setOpenDropdownGroupId(null);
      }
    }
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setOpenDropdownGroupId(null);
      }
    }
    window.addEventListener("pointerdown", handlePointerDown);
    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("pointerdown", handlePointerDown);
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [openDropdownGroupId]);

  const closeFilterBar = React.useCallback(() => {
    setListFilterOpen(false);
    setListFilterQuery("");
  }, []);

  React.useEffect(() => {
    if (!listFilterOpen) return;
    const raf = requestAnimationFrame(() => {
      listFilterInputRef.current?.focus();
      listFilterInputRef.current?.select();
    });
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        closeFilterBar();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [closeFilterBar, listFilterOpen]);

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

  const itemsByGroupProduct = React.useMemo(() => {
    const map = new Map<string, Map<string, DepoItem>>();
    for (const [groupId, groupItems] of Object.entries(itemsByGroup)) {
      const inner = new Map<string, DepoItem>();
      for (const item of groupItems) {
        if (item.productId) {
          inner.set(item.productId, item);
        }
      }
      map.set(groupId, inner);
    }
    return map;
  }, [itemsByGroup]);

  const listFilterTerm = React.useMemo(() => {
    if (!listFilterOpen) return "";
    return normText(listFilterQuery);
  }, [listFilterOpen, listFilterQuery]);

  const listFilterTokens = React.useMemo(() => {
    if (!listFilterTerm) return [];
    return listFilterTerm
      .split(" ")
      .map((token) => token.trim())
      .filter(Boolean);
  }, [listFilterTerm]);

  const filteredItemsByGroup = React.useMemo(() => {
    if (!listFilterTokens.length) return itemsByGroup;
    const filtered: Record<string, DepoItem[]> = {};
    for (const [groupId, groupItems] of Object.entries(itemsByGroup)) {
      filtered[groupId] = groupItems.filter((item) => {
        const name = normText(item.product?.name);
        const sku = normText(item.product?.sku);
        const haystack = [name, sku].filter(Boolean).join(" ").trim();
        if (!haystack) return false;
        return listFilterTokens.every((token) => haystack.includes(token));
      });
    }
    return filtered;
  }, [itemsByGroup, listFilterTokens]);

  const getSearchResults = React.useCallback((input: string) => {
    if (!indexedCatalog.length) return [];
    const norm = normText(input);
    const tokens = norm ? norm.split(" ").filter(Boolean) : [];
    const barcodeDigits = input.replace(/\D+/g, "");

    const filtered = indexedCatalog.filter((entry) => {
      if (!tokens.length && !barcodeDigits) return true;
      if (barcodeDigits && entry.barcodeKey.includes(barcodeDigits)) return true;
      if (!tokens.length) return false;
      return tokens.every((token) =>
        entry.searchKey.includes(token) || entry.codeKey.includes(token) || entry.barcodeKey.includes(token)
      );
    });

    return filtered.slice(0, 12);
  }, [indexedCatalog]);

  const allItems = React.useMemo(() => {
    return Object.values(itemsByGroup).flat();
  }, [itemsByGroup]);

  const lastActivity = React.useMemo(() => {
    if (!allItems.length) return null;
    return allItems.reduce<DepoItem | null>((latest, item) => {
      if (!item.updatedAt) return latest;
      if (!latest?.updatedAt) return item;
      return new Date(item.updatedAt).getTime() > new Date(latest.updatedAt).getTime() ? item : latest;
    }, null);
  }, [allItems]);

  const refreshing = loading;

  const handleQueryChange = React.useCallback((groupId: string, value: string) => {
    setGroupQueries((prev) => ({ ...prev, [groupId]: value }));
    const trimmed = value.trim();
    setOpenDropdownGroupId((prev) => {
      if (trimmed.length > 0) return groupId;
      return prev === groupId ? null : prev;
    });
  }, []);

  async function handleRefresh() {
    setLoading(true);
    try {
      const data = await loadAllData();
      applyLoadedData(data);
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

  async function toggleProduct(group: DepoGroup, item: IndexedCatalogItem) {
    setTogglingTargets((prev) => ({ ...prev, [group.id]: item.id }));
    try {
      const product = await ensureProductForSuggestion(item);
      if (!product) {
        throw new Error("No encontramos el producto en esta sucursal");
      }

      const map = itemsByGroupProduct.get(group.id);
      const existing = map?.get(product.id);
      if (existing) {
        await supabase.from("depo_items").delete().eq("id", existing.id);
        setItemsByGroup((prev) => {
          const current = prev[group.id] ?? [];
          return { ...prev, [group.id]: current.filter((row) => row.id !== existing.id) };
        });
        setDraftQuantities((prev) => {
          const next = { ...prev };
          delete next[existing.id];
          return next;
        });
      } else {
        await insertDepoItem(group, product);
      }
    } catch (err) {
      const rawMessage = errorMessageFrom(err, "No pudimos actualizar la lista");
      setGroupError(friendlyDepoError(rawMessage));
    } finally {
      setTogglingTargets((prev) => ({ ...prev, [group.id]: null }));
    }
  }

  async function insertDepoItem(group: DepoGroup, product: ProductRow) {
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
      .select("id, group_id, product_id, quantity, updated_at, updated_by_name, updated_by_email, products(id, name, sku, price)")
      .single();

    if (insert.error || !insert.data) {
      throw insert.error ?? new Error("No se pudo agregar el producto");
    }

    const mapped = mapItemRow(insert.data as DepoItemQueryRow);
    setItemsByGroup((prev) => {
      const current = prev[group.id] ?? [];
      return { ...prev, [group.id]: sortItems([...current, mapped]) };
    });
    setDraftQuantities((prev) => ({ ...prev, [mapped.id]: formatQuantityInput(mapped.quantity) }));
    return mapped;
  }

  async function handleSaveProductName(productId: string) {
    const draft = productNameDrafts[productId]?.trim();
    if (!draft) {
      setGroupError("Ingresá un nombre válido para el producto.");
      return;
    }
    setProductNameSavingIds((prev) => {
      const next = new Set(prev);
      next.add(productId);
      return next;
    });
    try {
      const { data, error } = await supabase
        .from("products")
        .update({ name: draft })
        .eq("id", productId)
        .select("id, name, sku, price")
        .single();

      if (error || !data) {
        throw error ?? new Error("No pudimos actualizar el nombre");
      }

      const updated = data as ProductRow;
      setProducts((prev) => sortProducts(prev.map((prod) => (prod.id === productId ? updated : prod))));
      setItemsByGroup((prev) => {
        const next: Record<string, DepoItem[]> = {};
        for (const [groupId, list] of Object.entries(prev)) {
          let changed = false;
          const updatedList = list.map((row) => {
            if (row.productId !== productId) return row;
            changed = true;
            const nextProduct = row.product
              ? { ...row.product, name: updated.name }
              : { id: updated.id, name: updated.name, sku: updated.sku, price: updated.price };
            return { ...row, product: nextProduct };
          });
          next[groupId] = changed ? sortItems(updatedList) : updatedList;
        }
        return next;
      });
      cancelEditingProductName(productId);
    } catch (err) {
      const rawMessage = errorMessageFrom(err, "No pudimos guardar el nombre");
      setGroupError(friendlyDepoError(rawMessage));
    } finally {
      setProductNameSavingIds((prev) => {
        const next = new Set(prev);
        next.delete(productId);
        return next;
      });
    }
  }

  async function handleCreateCustomProduct(group: DepoGroup) {
    const name = (groupQueries[group.id] ?? "").trim();
    if (!name) return;
    setCreatingCustomProductFor(group.id);
    try {
      const { data, error } = await supabase
        .from("products")
        .insert({
          tenant_id: tenantId,
          branch_id: branchId,
          name,
          sku: null,
          price: 0,
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
      await insertDepoItem(group, created);
      setGroupQueries((prev) => ({ ...prev, [group.id]: "" }));
      setOpenDropdownGroupId((prev) => (prev === group.id ? null : prev));
    } catch (err) {
      const rawMessage = errorMessageFrom(err, "No pudimos crear el producto");
      setGroupError(friendlyDepoError(rawMessage));
    } finally {
      setCreatingCustomProductFor(null);
    }
  }

  async function handleCreateSectionSubmit() {
    const name = newSectionName.trim();
    if (!name) {
      setGroupError("Ingresá un nombre válido para la nueva sección.");
      return;
    }
    setCreatingSection(true);
    try {
      const created = await createGroup(name);
      setGroups((prev) => sortGroups([...prev, created]));
      setItemsByGroup((prev) => ({ ...prev, [created.id]: [] }));
      setGroupQueries((prev) => ({ ...prev, [created.id]: "" }));
      setAddingSection(false);
      setNewSectionName("");
    } catch (err) {
      const rawMessage = errorMessageFrom(err, "No pudimos crear la sección");
      setGroupError(friendlyDepoError(rawMessage));
    } finally {
      setCreatingSection(false);
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
        .select("id, group_id, product_id, quantity, updated_at, updated_by_name, updated_by_email, products(id, name, sku, price)")
        .single();

      if (error || !data) {
        throw error ?? new Error("No se pudo guardar");
      }

      const updated = mapItemRow(data as DepoItemQueryRow);
      setItemsByGroup((prev) => {
        const groupItems = prev[updated.groupId] ?? [];
        return {
          ...prev,
          [updated.groupId]: sortItems(groupItems.map((row) => (row.id === updated.id ? updated : row))),
        };
      });
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
      setItemsByGroup((prev) => {
        const groupItems = prev[item.groupId] ?? [];
        return {
          ...prev,
          [item.groupId]: groupItems.filter((row) => row.id !== item.id),
        };
      });
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

  function handleToggleFilterBar() {
    if (listFilterOpen) {
      closeFilterBar();
    } else {
      setListFilterOpen(true);
    }
  }

  function startEditingProductName(productId: string, currentName: string) {
    setEditingProductNames((prev) => {
      const next = new Set(prev);
      next.add(productId);
      return next;
    });
    setProductNameDrafts((prev) => ({ ...prev, [productId]: currentName }));
  }

  function cancelEditingProductName(productId: string) {
    setEditingProductNames((prev) => {
      const next = new Set(prev);
      next.delete(productId);
      return next;
    });
    setProductNameDrafts((prev) => {
      const next = { ...prev };
      delete next[productId];
      return next;
    });
  }

  const itemCount = allItems.length;
  const filterActive = listFilterOpen && !!listFilterTerm;
  const filteredCount = filterActive
    ? Object.values(filteredItemsByGroup).reduce((sum, list) => sum + list.length, 0)
    : itemCount;
  const floatingBottomOffset = "calc(env(safe-area-inset-bottom, 0px) + 24px)";
  const filterBarBottomOffset = "calc(env(safe-area-inset-bottom, 0px) + 96px)";

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
        <div className="flex flex-wrap items-center gap-3">
          <h2 className="text-lg font-semibold">
            Productos en el depósito ({filterActive ? `${filteredCount} de ${itemCount}` : itemCount})
          </h2>
          {filterActive && (
            <span className="text-sm text-muted-foreground">
              Filtrando por &ldquo;{listFilterQuery}&rdquo;
            </span>
          )}
        </div>
        <Accordion
          type="multiple"
          defaultValue={groups.map((group) => group.id)}
          className="rounded-2xl border bg-card text-card-foreground"
        >
          {groups.map((group) => {
            const query = groupQueries[group.id] ?? "";
            const trimmedQuery = query.trim();
            const dropdownOpen = openDropdownGroupId === group.id && trimmedQuery.length > 0;
            const searchResults = getSearchResults(query);
            const canCreateCustomProduct = !catalogLoading && trimmedQuery.length > 0 && searchResults.length === 0;
            const creatingCustomProduct = creatingCustomProductFor === group.id;
            const groupItems = itemsByGroup[group.id] ?? [];
            const visibleItems = filterActive ? filteredItemsByGroup[group.id] ?? [] : groupItems;
            const showLoadingState = loading && !groupItems.length;
            const showEmptyState = !loading && groupItems.length === 0;
            const showFilterEmptyState = !showLoadingState && !showEmptyState && filterActive && visibleItems.length === 0;
            const togglingId = togglingTargets[group.id];
            return (
              <AccordionItem key={group.id} value={group.id} className="border-none">
                <AccordionTrigger className="flex-col gap-1 px-4 py-4 text-left hover:no-underline">
                  <div className="flex w-full flex-wrap items-center gap-2">
                    <h3 className="text-base font-semibold">
                      {group.name} ({filterActive ? `${visibleItems.length} de ${groupItems.length}` : groupItems.length})
                    </h3>
                  </div>
                  <p className="text-sm font-normal text-muted-foreground">
                    Buscá y administrá los productos de esta sección.
                  </p>
                </AccordionTrigger>
                <AccordionContent className="space-y-4 px-4 pb-4 pt-0">
                  <div
                    className="relative"
                    ref={(node) => {
                      catalogSearchRefs.current[group.id] = node;
                    }}
                  >
                    <Command shouldFilter={false} className="relative overflow-visible rounded-2xl border bg-background shadow-sm">
                      <div className="flex items-center gap-2 px-3 py-2">
                        <Search className="h-4 w-4 text-muted-foreground" />
                        <CommandInput
                          placeholder={`Buscá para agregar a ${group.name}`}
                          value={query}
                          onValueChange={(value) => handleQueryChange(group.id, value)}
                          onFocus={() => {
                            if (trimmedQuery.length > 0) {
                              setOpenDropdownGroupId(group.id);
                            }
                          }}
                          className="border-0 bg-transparent px-0 text-base focus-visible:ring-0"
                        />
                      </div>
                      <CommandList
                        className={clsx(
                          "absolute left-0 right-0 top-full z-30 mt-2 max-h-80 overflow-y-auto rounded-2xl border bg-popover text-sm shadow-2xl",
                          !dropdownOpen && "hidden"
                        )}
                      >
                        {catalogLoading && <CommandEmpty>Cargando catálogo…</CommandEmpty>}
                        {!catalogLoading && searchResults.length === 0 && (
                          <div className="space-y-3 px-4 py-6">
                            <p className="text-sm text-muted-foreground">
                              {catalogError ? catalogError : trimmedQuery ? "No encontramos resultados con ese texto." : "Empezá a escribir para buscar"}
                            </p>
                            {canCreateCustomProduct && (
                              <Button
                                type="button"
                                className="w-full justify-center"
                                onClick={() => handleCreateCustomProduct(group)}
                                disabled={creatingCustomProduct}
                              >
                                {creatingCustomProduct && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                Agregar &ldquo;{trimmedQuery}&rdquo;
                              </Button>
                            )}
                          </div>
                        )}
                        {!catalogLoading && searchResults.length > 0 && (
                          <CommandGroup heading={`Sugerencias (${searchResults.length})`}>
                            {searchResults.map((item) => {
                              const product = findProductForSuggestion(item);
                              const exists = product ? itemsByGroupProduct.get(group.id)?.has(product.id) : false;
                              const busy = togglingId === item.id;
                              return (
                                <CommandItem
                                  key={item.id}
                                  value={item.id}
                                  onSelect={() => toggleProduct(group, item)}
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
                                      {exists && <Badge variant="secondary">En lista</Badge>}
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
                  </div>
                  {showLoadingState ? (
                    <Card>
                      <CardContent className="py-10 text-center text-sm text-muted-foreground">
                        Cargando inventario…
                      </CardContent>
                    </Card>
                  ) : showEmptyState ? (
                    <Card className="border-dashed">
                      <CardContent className="py-12 text-center text-sm text-muted-foreground">
                        No hay productos cargados en esta sección. Usá el buscador para agregar los primeros ítems.
                      </CardContent>
                    </Card>
                  ) : showFilterEmptyState ? (
                    <Card className="border-dashed">
                      <CardContent className="py-12 text-center text-sm text-muted-foreground">
                        No encontramos productos que coincidan con ese filtro.
                      </CardContent>
                    </Card>
                  ) : (
                    <div className="space-y-4">
                      {visibleItems.map((item) => {
                        const productId = item.productId;
                        const productName = item.product?.name ?? "Producto sin nombre";
                        const isEditingName = !!productId && editingProductNames.has(productId);
                        const draftName = productId ? productNameDrafts[productId] ?? productName : productName;
                        const nameSaving = productId ? productNameSavingIds.has(productId) : false;
                        return (
                          <Card key={item.id} className="shadow-sm">
                            <CardContent className="flex flex-col gap-4 py-4 sm:flex-row sm:items-center sm:justify-between">
                              <div className="space-y-2 sm:w-1/2">
                                {isEditingName && productId ? (
                                  <div className="space-y-2">
                                    <Input
                                      value={draftName}
                                      onChange={(event) =>
                                        setProductNameDrafts((prev) => ({ ...prev, [productId]: event.target.value }))
                                      }
                                      onKeyDown={(event) => {
                                        if (event.key === "Enter") {
                                          event.preventDefault();
                                          handleSaveProductName(productId);
                                        } else if (event.key === "Escape") {
                                          event.preventDefault();
                                          cancelEditingProductName(productId);
                                        }
                                      }}
                                      className="text-base font-semibold"
                                    />
                                    <div className="flex flex-wrap gap-2">
                                      <Button
                                        type="button"
                                        size="sm"
                                        onClick={() => handleSaveProductName(productId)}
                                        disabled={nameSaving}
                                      >
                                        {nameSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                        Guardar nombre
                                      </Button>
                                      <Button
                                        type="button"
                                        size="sm"
                                        variant="ghost"
                                        onClick={() => cancelEditingProductName(productId)}
                                      >
                                        Cancelar
                                      </Button>
                                    </div>
                                  </div>
                                ) : (
                                  <div className="flex items-start gap-2">
                                    <div className="flex-1">
                                      <p className="text-base font-semibold text-foreground">
                                        {productName}
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
                                    {productId && (
                                      <Button
                                        type="button"
                                        size="icon"
                                        variant="ghost"
                                        onClick={() => startEditingProductName(productId, productName)}
                                      >
                                        <Pencil className="h-4 w-4" />
                                      </Button>
                                    )}
                                  </div>
                                )}
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
                        );
                      })}
                    </div>
                  )}
                </AccordionContent>
              </AccordionItem>
            );
          })}
        </Accordion>
        <div className="rounded-2xl border border-dashed p-4">
          {addingSection ? (
            <div className="space-y-3">
              <p className="text-sm font-medium">Nueva sección</p>
              <Input
                placeholder="Nombre de la nueva sección"
                value={newSectionName}
                onChange={(event) => setNewSectionName(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter") {
                    event.preventDefault();
                    handleCreateSectionSubmit();
                  } else if (event.key === "Escape") {
                    event.preventDefault();
                    setAddingSection(false);
                    setNewSectionName("");
                  }
                }}
              />
              <div className="flex flex-wrap gap-2">
                <Button onClick={handleCreateSectionSubmit} disabled={creatingSection}>
                  {creatingSection && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Crear sección
                </Button>
                <Button type="button" variant="ghost" onClick={() => {
                  setAddingSection(false);
                  setNewSectionName("");
                }}>
                  Cancelar
                </Button>
              </div>
            </div>
          ) : (
            <Button variant="ghost" className="w-full justify-center" onClick={() => setAddingSection(true)}>
              <Plus className="mr-2 h-4 w-4" />
              Agregar sección
            </Button>
          )}
        </div>
      </section>

      {listFilterOpen && (
        <div
          className="fixed inset-x-4 z-40 rounded-2xl border bg-background p-4 shadow-2xl md:inset-x-auto md:right-6 md:w-96"
          style={{ bottom: filterBarBottomOffset }}
        >
          <div className="flex items-center gap-2">
            <Search className="h-4 w-4 text-muted-foreground" />
            <Input
              ref={listFilterInputRef}
              value={listFilterQuery}
              onChange={(event) => setListFilterQuery(event.target.value)}
              placeholder="Filtrar productos de todas las secciones"
              className="flex-1 border-0 bg-transparent px-0 text-sm focus-visible:ring-0"
            />
            {listFilterQuery && (
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                onClick={() => setListFilterQuery("")}
              >
                <X className="h-4 w-4" />
              </Button>
            )}
          </div>
          <div className="mt-2 flex items-center justify-between text-xs text-muted-foreground">
            <span>
              {filterActive
                ? `${filteredCount} coincidencia${filteredCount === 1 ? "" : "s"}`
                : `Mostrando ${itemCount} productos`}
            </span>
            <button
              type="button"
              className="font-medium text-primary hover:underline"
              onClick={closeFilterBar}
            >
              Cerrar
            </button>
          </div>
        </div>
      )}
      <div className="fixed right-5 z-40 md:right-8" style={{ bottom: floatingBottomOffset }}>
        <Button
          type="button"
          size="icon"
          className="h-14 w-14 rounded-full shadow-lg"
          onClick={handleToggleFilterBar}
          aria-pressed={listFilterOpen}
        >
          <Search className="h-6 w-6" />
        </Button>
      </div>
    </div>
  );

  function mapItemRow(row: DepoItemQueryRow): DepoItem {
    return {
      id: row.id,
      groupId: row.group_id,
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

  function sortGroups(list: DepoGroup[]) {
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

function generateGroupSlug(name: string) {
  const normalized = normText(name);
  const dashed = normalized.replace(/\s+/g, "-");
  if (dashed) return dashed;
  return `seccion-${Math.random().toString(36).slice(2, 8)}`;
}
