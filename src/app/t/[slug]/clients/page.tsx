"use client";

import React from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import type { SupabaseClient } from "@supabase/supabase-js";
import { getSupabaseBrowserClient } from "@/lib/supabaseClient";
import { useBranch } from "@/components/branch/BranchProvider";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { X, Edit2, Save, Trash2, Search } from "lucide-react";

/* ========= Schema ========= */
const ClientSchema = z
  .object({
    name: z.string().min(1, "Nombre requerido").max(80),
    phone: z.string().min(6, "Teléfono muy corto").max(30),
    articles: z.array(z.string().min(1)).min(1, "Añade al menos un artículo"),
  })
  .strict();

type ClientForm = z.input<typeof ClientSchema>;

/* ========= Tipos de datos ========= */
type Client = { id: string; name: string; phone: string | null; created_at: string };

type ClientOrder = {
  id: string;
  client_id: string;
  status: "pendiente" | "guardado" | "entregado" | "cancelado";
  created_at: string;
};

type ClientOrderItem = {
  id: string;
  order_id: string;
  article: string;
  done: boolean;
  provider: string | null; // por ítem
  created_at: string;
};

/** NUEVO: comentarios por pedido */
type ClientOrderComment = {
  id: string;
  order_id: string;
  comment: string;
  created_at: string;
};

type ClientWithOrders = Client & {
  orders: Array<ClientOrder & { items: ClientOrderItem[]; comments?: ClientOrderComment[] }>;
};

/* ========= Utils ========= */
const NBSP_RX = /[\u00A0\u202F]/g;
const norm = (s: string) =>
  (s ?? "")
    .replace(NBSP_RX, " ")
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase()
    .trim();

const onlyDigits = (s: string) => (s ?? "").replace(/\D/g, "");

/** Parsea "Artículo @ Proveedor" -> { article, provider } */
function parseArticleProvider(raw: string): { article: string; provider: string | null } {
  const t = (raw ?? "").trim();
  const at = t.indexOf("@");
  if (at === -1) return { article: t, provider: null };
  const left = t.slice(0, at).trim();
  const right = t.slice(at + 1).trim();
  return { article: left, provider: right || null };
}

type TagsInputProps = {
  value: string[];
  // eslint-disable-next-line no-unused-vars
  onChange(value: string[]): void;
  placeholder?: string;
  hint?: React.ReactNode;
  providerOptions?: string[];
  inputId?: string;
};

/* ========= TagsInput con Autocomplete de proveedor (@) ========= */
function TagsInput({
  value,
  onChange,
  placeholder = "Escribe y Enter…",
  hint,
  providerOptions = [],
  inputId,
}: TagsInputProps) {
  const [text, setText] = React.useState("");
  const [openSug, setOpenSug] = React.useState(false);
  const [activeIdx, setActiveIdx] = React.useState(0);
  const listboxId = React.useId();

  // Detectar si estamos después de '@'
  const atPos = text.indexOf("@");
  const afterAt = atPos >= 0 ? text.slice(atPos + 1).trimStart() : "";
  const hasAt = atPos >= 0;

  const filteredSuggestions = React.useMemo(() => {
    if (!hasAt) return [];
    const q = norm(afterAt);
    if (!q) return [];
    const uniq = Array.from(new Set(providerOptions)); // dedup por las dudas
    const res = uniq.filter((opt) => norm(opt).startsWith(q)).slice(0, 6);
    return res;
  }, [providerOptions, hasAt, afterAt]);

  React.useEffect(() => {
    setOpenSug(filteredSuggestions.length > 0);
    setActiveIdx(0);
  }, [filteredSuggestions.length]);

  const pushTag = (raw: string) => {
    const t = raw.trim();
    if (!t) return;
    if (value.includes(t)) return;
    onChange([...value, t]);
    setText("");
    setOpenSug(false);
  };

  const applySuggestion = (s: string) => {
    if (!hasAt) return;
    const before = text.slice(0, atPos + 1); // incluye '@'
    const next = `${before} ${s}`.replace(/\s+/g, " ").trim(); // normaliza espacios
    setText(next);
    setOpenSug(false);
  };

  const onKeyDown: React.KeyboardEventHandler<HTMLInputElement> = (e) => {
    if (openSug && (e.key === "ArrowDown" || e.key === "ArrowUp")) {
      e.preventDefault();
      const max = filteredSuggestions.length;
      setActiveIdx((prev) => {
        if (e.key === "ArrowDown") return (prev + 1) % max;
        return (prev - 1 + max) % max;
      });
      return;
    }

    if ((e.key === "Enter" || e.key === "Tab") && hasAt) {
      if (openSug && filteredSuggestions[activeIdx]) {
        e.preventDefault();
        applySuggestion(filteredSuggestions[activeIdx]);
        // si presionó Enter nuevamente sin '@', agrega el chip
        if (e.key === "Enter" && text.indexOf("@") === -1) {
          pushTag(text);
        }
        return;
      }
    }

    if (e.key === "Enter" || e.key === "," || e.key === "Tab") {
      e.preventDefault();
      pushTag(text);
    } else if (e.key === "Backspace" && !text && value.length) {
      onChange(value.slice(0, -1));
    } else if (e.key === "Escape") {
      setOpenSug(false);
    }
  };

  return (
    <div className="space-y-1 relative">
      <div className="flex flex-wrap gap-2 rounded-md border border-border p-2 bg-[color:var(--surface-overlay-strong)]">
        {value.map((t) => (
          <span
            key={t}
            className="inline-flex items-center gap-1 rounded-full bg-[color:var(--surface-overlay-soft)] px-2 py-1 text-sm text-muted-foreground"
          >
            {t}
            <button
              type="button"
              aria-label={`Quitar ${t}`}
              onClick={() => onChange(value.filter((x) => x !== t))}
              className="opacity-70 hover:opacity-100"
            >
              <X className="w-3 h-3" />
            </button>
          </span>
        ))}
        <input
          className="flex-1 min-w-[120px] outline-none text-sm"
          placeholder={placeholder}
          value={text}
          id={inputId}
          onChange={(e) => {
            setText(e.target.value);
            // mostrar sugerencias cuando hay '@' y prefijo
            const v = e.target.value;
            const p = v.indexOf("@");
            const post = p >= 0 ? v.slice(p + 1).trimStart() : "";
            setOpenSug(p >= 0 && post.length > 0);
          }}
          onKeyDown={onKeyDown}
          aria-autocomplete="list"
          aria-expanded={openSug}
          aria-controls={listboxId}
          role="combobox"
        />
      </div>

      {/* Sugerencias */}
      {openSug && filteredSuggestions.length > 0 && (
        <ul
          id={listboxId}
          role="listbox"
          className="absolute z-20 mt-1 max-h-60 w-full overflow-auto rounded-md border border-border bg-[color:var(--surface-overlay-strong)] shadow-md"
        >
          {filteredSuggestions.map((opt, i) => (
            <li
              key={opt}
              role="option"
              aria-selected={i === activeIdx}
              className={`cursor-pointer px-3 py-2 text-sm transition-colors ${
                i === activeIdx ? "bg-[color:var(--surface-overlay-soft)]" : ""
              }`}
              onMouseEnter={() => setActiveIdx(i)}
              onMouseDown={(e) => {
                // onMouseDown para que no pierda el foco antes de aplicar
                e.preventDefault();
                applySuggestion(opt);
              }}
            >
              {opt}
            </li>
          ))}
        </ul>
      )}

      {hint && <p className="text-[11px] text-muted-foreground">{hint}</p>}
    </div>
  );
}

/* ========= Estado → estilos ========= */
function OrderStatusBadge({ status }: { status: ClientOrder["status"] }) {
  const map = {
    pendiente:
      "border border-[color:var(--surface-secondary-strong)] bg-[color:var(--surface-secondary-soft)] text-[color:var(--color-secondary)]",
    guardado:
      "border border-[color:var(--surface-accent-strong)] bg-[color:var(--surface-accent-soft)] text-[color:var(--color-data-primary)]",
    entregado:
      "border border-[color:var(--surface-success-strong)] bg-[color:var(--surface-success-soft)] text-[color:var(--color-success)]",
    cancelado:
      "border border-[color:var(--surface-alert-strong)] bg-[color:var(--surface-alert-subtle)] text-[color:var(--destructive)]",
  } as const;
  return <span className={`${map[status]} rounded-full px-2 py-0.5 text-xs`}>{status}</span>;
}

/* ========= Página ========= */
export default function ClientsPage() {
  const sb = React.useMemo<SupabaseClient>(() => getSupabaseBrowserClient(), []);
  const { currentBranch, tenantId, loading: branchLoading, error: branchError } = useBranch();

  const branchId = currentBranch?.id ?? null;

  const [loading, setLoading] = React.useState(false);
  const [saving, setSaving] = React.useState(false);
  const [clients, setClients] = React.useState<ClientWithOrders[]>([]);
  const [q, setQ] = React.useState("");
  const searchRef = React.useRef<HTMLInputElement>(null);

  const form = useForm<ClientForm>({
    resolver: zodResolver(ClientSchema),
    defaultValues: { name: "", phone: "", articles: [] },
  });

  const fetchData = React.useCallback(async () => {
    if (!tenantId || !branchId) {
      setClients([]);
      return;
    }

    setLoading(true);
    try {
      const { data: cData, error: cErr } = await sb
        .from("clients")
        .select("*")
        .eq("tenant_id", tenantId)
        .eq("branch_id", branchId);
      if (cErr) throw cErr;
      const ids = (cData ?? []).map((c) => c.id);

      const ordersByClient: Record<string, Array<ClientOrder & { items: ClientOrderItem[]; comments: ClientOrderComment[] }>> = {};
      let oData: ClientOrder[] = [];
      if (ids.length) {
        const { data, error } = await sb
          .from("client_orders")
          .select("*")
          .eq("tenant_id", tenantId)
          .eq("branch_id", branchId)
          .in("client_id", ids)
          .order("created_at", { ascending: false });
        if (error) throw error;
        oData = (data ?? []) as ClientOrder[];
      }

      const orderIds = oData.map((o) => o.id);

      const itemsByOrder: Record<string, ClientOrderItem[]> = {};
      if (orderIds.length) {
        const { data: oiData, error: oiErr } = await sb
          .from("client_order_items")
          .select("*")
          .eq("tenant_id", tenantId)
          .eq("branch_id", branchId)
          .in("order_id", orderIds)
          .order("created_at", { ascending: false });
        if (oiErr) throw oiErr;
        (oiData ?? []).forEach((oi) => {
          (itemsByOrder[oi.order_id] ??= []).push(oi as ClientOrderItem);
        });
      }

      const commentsByOrder: Record<string, ClientOrderComment[]> = {};
      if (orderIds.length) {
        const { data: ocData, error: ocErr } = await sb
          .from("client_order_comments")
          .select("*")
          .eq("tenant_id", tenantId)
          .eq("branch_id", branchId)
          .in("order_id", orderIds)
          .order("created_at", { ascending: true });
        if (ocErr) throw ocErr;
        (ocData ?? []).forEach((oc) => {
          (commentsByOrder[oc.order_id] ??= []).push(oc as ClientOrderComment);
        });
      }

      (oData ?? []).forEach((o) => {
        const mergedOrder = {
          ...o,
          items: itemsByOrder[o.id] ?? [],
          comments: commentsByOrder[o.id] ?? [],
        };
        (ordersByClient[o.client_id] ??= []).push(mergedOrder);
      });

      const merged: ClientWithOrders[] = (cData ?? []).map((c) => ({
        ...c,
        orders: ordersByClient[c.id] ?? [],
      }));

      merged.sort((a, b) => a.name.localeCompare(b.name, "es", { sensitivity: "base" }));
      setClients(merged);
    } catch (e) {
      console.error(e);
      alert("Error cargando clientes/pedidos.");
    } finally {
      setLoading(false);
    }
  }, [sb, tenantId, branchId]);

  React.useEffect(() => {
    void fetchData();
  }, [fetchData]);

  async function onSubmit(values: ClientForm) {
    if (!tenantId || !branchId) {
      alert("Seleccioná una sucursal antes de guardar.");
      return;
    }

    setSaving(true);
    try {
      const trimmedName = values.name.trim();
      const trimmedPhone = values.phone.trim();
      const phoneValue = trimmedPhone ? trimmedPhone : null;

      let finder = sb
        .from("clients")
        .select("*")
        .eq("tenant_id", tenantId)
        .eq("branch_id", branchId)
        .eq("name", trimmedName)
        .limit(1);

      finder = phoneValue ? finder.eq("phone", phoneValue) : finder.is("phone", null);

      const { data: existing, error: findErr } = await finder.maybeSingle();
      if (findErr) throw findErr;

      let clientRow: Client;
      if (existing) {
        clientRow = existing as Client;
      } else {
        const { data: inserted, error: insertErr } = await sb
          .from("clients")
          .insert({
            name: trimmedName,
            phone: phoneValue,
            tenant_id: tenantId,
            branch_id: branchId,
          })
          .select("*")
          .single();
        if (insertErr) throw insertErr;
        clientRow = inserted as Client;
      }

      const { data: order, error: oErr } = await sb
        .from("client_orders")
        .insert({
          client_id: clientRow.id,
          status: "pendiente",
          tenant_id: tenantId,
          branch_id: branchId,
        })
        .select("*")
        .single();
      if (oErr) throw oErr;

      const rows = values.articles.map((raw) => {
        const parsed = parseArticleProvider(raw);
        return {
          order_id: order.id,
          article: parsed.article,
          done: false,
          provider: parsed.provider,
          tenant_id: tenantId,
          branch_id: branchId,
        };
      });

      if (rows.length) {
        const { error: oiErr } = await sb.from("client_order_items").insert(rows);
        if (oiErr) throw oiErr;
      }

      form.reset({ name: "", phone: "", articles: [] });
      await fetchData();
    } catch (error: unknown) {
      console.error(error);
      const message = error instanceof Error ? error.message : "sin detalle";
      alert(`No se pudo guardar el pedido: ${message}`);
    } finally {
      setSaving(false);
    }
  }



  /* 🔎 Filtrado en memoria (Nombre, Teléfono o Proveedor) */
  const filteredClients = React.useMemo(() => {
    if (!q.trim()) return clients;
    const nq = norm(q);
    const qDigits = onlyDigits(q);

    return clients.filter((c) => {
      const nameMatch = norm(c.name ?? "").includes(nq);
      const phoneMatch = !!qDigits && onlyDigits(c.phone ?? "").includes(qDigits);

      let providerMatch = false;
      for (const o of c.orders) {
        for (const it of o.items) {
          if (it.provider && norm(it.provider).includes(nq)) {
            providerMatch = true;
            break;
          }
        }
        if (providerMatch) break;
      }

      return nameMatch || phoneMatch || providerMatch;
    });
  }, [clients, q]);

  /* 🧾 Lista global de proveedores (deduplicada) — para autocomplete */
  const providerList = React.useMemo(() => {
    const set = new Set<string>();
    for (const c of clients) {
      for (const o of c.orders) {
        for (const it of o.items) {
          if (it.provider && it.provider.trim()) set.add(it.provider.trim());
        }
      }
    }
    return Array.from(set).sort((a, b) => a.localeCompare(b, "es", { sensitivity: "base" }));
  }, [clients]);

  /* 🗑️ Borrar cliente */
  async function deleteClient(clientId: string) {
    if (!tenantId || !branchId) return;
    const ok = window.confirm(
      "¿Eliminar cliente y TODOS sus pedidos e ítems?\nEsta acción no se puede deshacer."
    );
    if (!ok) return;
    const { error } = await sb
      .from("clients")
      .delete()
      .eq("id", clientId)
      .eq("tenant_id", tenantId)
      .eq("branch_id", branchId);
    if (error) {
      alert("No se pudo eliminar el cliente.");
      return;
    }
    await fetchData();
  }

  if (branchLoading) {
    return <div className="p-4 text-sm text-muted-foreground">Cargando sucursales…</div>;
  }

  if (branchError) {
    return <div className="p-4 text-sm text-[color:var(--destructive)]">{branchError}</div>;
  }

  if (!currentBranch) {
    return <div className="p-4 text-sm text-muted-foreground">No hay sucursal seleccionada.</div>;
  }

  if (!tenantId || !branchId) {
    return <div className="p-4 text-sm text-muted-foreground">No hay tenant disponible.</div>;
  }

  return (
    <div className="pb-24">
      <header className="sticky top-0 z-10 border-b bg-[color:var(--surface-overlay)] backdrop-blur">
        <div className="p-4 flex items-center justify-between gap-3">
          <div>
            <h1 className="text-xl font-bold">Clientes</h1>
            <p className="text-sm text-muted-foreground">
              Crea pedidos (checklist) y asigna proveedor por ítem usando <b>@</b>.
            </p>
          </div>
          {/* 🔥 Botón de Proveedores eliminado */}
        </div>
      </header>

      {/* Form principal -> crea un pedido inicial */}
      <section className="p-4">
        <Card>
          <CardContent className="p-4 space-y-3">
            <form onSubmit={form.handleSubmit(onSubmit)} className="grid grid-cols-1 gap-3">
              <Input placeholder="Nombre" {...form.register("name")} />
              {form.formState.errors.name && (
                <p className="text-xs text-[color:var(--destructive)]">{form.formState.errors.name.message}</p>
              )}

              <Input placeholder="Teléfono" {...form.register("phone")} />
              {form.formState.errors.phone && (
                <p className="text-xs text-[color:var(--destructive)]">{form.formState.errors.phone.message}</p>
              )}

              <div className="space-y-1">
                <label className="text-sm font-medium" htmlFor="client-articles-input">
                  Artículos (lista)
                </label>
                <TagsInput
                  value={form.watch("articles")}
                  onChange={(arr) => form.setValue("articles", arr, { shouldValidate: true })}
                  placeholder='Escribe: "Harina 1kg @ Dicomere" o solo "Harina 1kg"…'
                  hint={
                    <>
                      Tip: escribí <b>@</b> para autocompletar proveedores ya usados.
                    </>
                  }
                  providerOptions={providerList}
                  inputId="client-articles-input"
                />
                {form.formState.errors.articles && (
                  <p className="text-xs text-[color:var(--destructive)]">
                    {form.formState.errors.articles.message as string}
                  </p>
                )}
              </div>

              <Button type="submit" disabled={saving}>
                {saving ? "Guardando..." : "Guardar y crear tarjeta"}
              </Button>
            </form>
          </CardContent>
        </Card>
      </section>

      {/* 🔎 Buscador global */}
<section className="px-4 -mt-2">
  <div className="relative">
    {/* Icono izquierda */}
    <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />

    {/* Input */}
    <Input
      ref={searchRef}
      value={q}
      onChange={(e) => setQ(e.target.value)}
      onKeyDown={(e) => {
        if (e.key === "Escape" && q) {
          e.preventDefault();
          setQ("");
          searchRef.current?.focus();
        }
      }}
      placeholder="Buscar por nombre, teléfono o proveedor…"
      className="pl-9 pr-12"
      inputMode="search"
      aria-label="Buscar por nombre, teléfono o proveedor"
    />

    {/* Botón Clear (derecha) */}
    {q && (
      <button
        type="button"
        onClick={() => {
          setQ("");
          searchRef.current?.focus();
        }}
        aria-label="Limpiar búsqueda"
        title="Limpiar"
        className="absolute right-2 top-1/2 -translate-y-1/2 rounded-md p-2
                   text-muted-foreground hover:text-foreground
                   focus-visible:ring-2 focus-visible:ring-[color:var(--ring)] focus-visible:ring-offset-2
                   focus:outline-none"
      >
        <X className="w-4 h-4" />
      </button>
    )}
  </div>

  <p className="mt-1 text-[11px] text-muted-foreground">{filteredClients.length} resultado(s)</p>
</section>



      {/* Tarjetas por cliente */}
      <section className="p-4 space-y-4">
        {loading && <p className="text-sm text-muted-foreground">Cargando…</p>}
        {!loading && filteredClients.length === 0 && (
          <p className="text-sm text-muted-foreground">Sin resultados.</p>
        )}
        {filteredClients.map((c) => (
          <ClientCard
            key={c.id}
            client={c}
            sb={sb}
            onChange={fetchData}
            onDeleteClient={deleteClient}
            providerList={providerList}
            tenantId={tenantId}
            branchId={branchId}
          />
        ))}
      </section>
    </div>
  );
}

/* ========= Subcomponentes ========= */

type ClientCardProps = {
  client: ClientWithOrders;
  sb: SupabaseClient;
  onChange(): Promise<void>;
  // eslint-disable-next-line no-unused-vars
  onDeleteClient(clientId: string): Promise<void>;
  providerList: string[];
  tenantId: string;
  branchId: string;
};

function ClientCard({
  client,
  sb,
  onChange,
  onDeleteClient,
  providerList,
  tenantId,
  branchId,
}: ClientCardProps) {
  const [orderItems, setOrderItems] = React.useState<string[]>([]);

  // === Edición inline de nombre/teléfono ===
  const [editMode, setEditMode] = React.useState(false);
  const [editName, setEditName] = React.useState(client.name);
  const [editPhone, setEditPhone] = React.useState(client.phone ?? "");
  const [savingClient, setSavingClient] = React.useState(false);
  const editNameInputRef = React.useRef<HTMLInputElement>(null);

  React.useEffect(() => {
    if (editMode) {
      editNameInputRef.current?.focus();
      editNameInputRef.current?.select();
    }
  }, [editMode]);

  const normalizePhone = (v: string) => v.replace(/[^\d+()\-\s]/g, "").replace(/\s+/g, " ");

  async function saveClientEdits() {
    const nextName = editName.trim();
    const nextPhone = editPhone.trim();
    if (!nextName) return alert("El nombre no puede estar vacío.");
    if (nextPhone && nextPhone.replace(/\D/g, "").length < 6) {
      return alert("El teléfono parece muy corto.");
    }

    setSavingClient(true);
    try {
      const { error } = await sb
        .from("clients")
        .update({ name: nextName, phone: nextPhone || null })
        .eq("id", client.id);
      if (error) {
        alert(`No se pudo actualizar el cliente: ${error.message}`);
        return;
      }
      setEditMode(false);
      await onChange();
    } finally {
      setSavingClient(false);
    }
  }

  function cancelClientEdits() {
    setEditMode(false);
    setEditName(client.name);
    setEditPhone(client.phone ?? "");
  }

  const onKeyDownEdit: React.KeyboardEventHandler<HTMLInputElement> = (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      void saveClientEdits();
    } else if (e.key === "Escape") {
      e.preventDefault();
      cancelClientEdits();
    }
  };

  // === Proveedores pendientes (ítems sin chequear) ===
  const pendingProviders: string[] = React.useMemo(() => {
    const set = new Set<string>();
    for (const o of client.orders) {
      for (const it of o.items) {
        if (!it.done && it.provider && it.provider.trim()) set.add(it.provider.trim());
      }
    }
    return Array.from(set).sort((a, b) => a.localeCompare(b, "es", { sensitivity: "base" }));
  }, [client.orders]);

  async function createOrder() {
    if (!orderItems.length) return;
    const { data: order, error: oErr } = await sb
      .from("client_orders")
      .insert({ client_id: client.id, status: "pendiente", tenant_id: tenantId, branch_id: branchId })
      .select("*")
      .single();
    if (oErr) return alert("No se pudo crear el pedido");

    const rows = orderItems.map((raw) => {
      const parsed = parseArticleProvider(raw);
      return {
        order_id: order.id,
        article: parsed.article,
        done: false,
        provider: parsed.provider,
        tenant_id: tenantId,
        branch_id: branchId,
      };
    });

    const { error: iErr } = await sb.from("client_order_items").insert(rows);
    if (iErr) return alert("No se pudieron agregar ítems del pedido");

    setOrderItems([]);
    await onChange();
  }

  return (
    <Card className="relative rounded-lg shadow-sm">
      {/* 🗑️ Eliminar cliente (icono discreto) */}
      <button
        type="button"
        title="Eliminar cliente"
        aria-label="Eliminar cliente"
        className="absolute right-2 top-2 rounded-md p-1 text-muted-foreground hover:text-[color:var(--destructive)]
                   focus-visible:ring-2 focus-visible:ring-[color:var(--ring)] focus-visible:ring-offset-2 focus:outline-none"
        onClick={() => onDeleteClient(client.id)}
      >
        <Trash2 className="w-4 h-4" />
      </button>

      <CardContent className="p-3 space-y-3">
        {/* Chips de proveedores pendientes (más chicos) */}
        {pendingProviders.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {pendingProviders.map((p) => (
              <span
                key={p}
                className="inline-flex items-center rounded-full border border-[color:var(--surface-secondary-strong)]
                           bg-[color:var(--surface-secondary-soft)] px-1.5 py-0.5 text-[10px] leading-none text-[color:var(--color-secondary)]"
                title="Proveedor con ítems pendientes"
              >
                {p}
              </span>
            ))}
          </div>
        )}

        {/* Encabezado compacto */}
        <div className="flex items-start justify-between pr-7">
          <div className="min-w-0">
            {editMode ? (
              <div className="flex flex-col gap-1.5">
                <Input
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  onKeyDown={onKeyDownEdit}
                  placeholder="Nombre"
                  className="h-8 text-sm"
                  ref={editNameInputRef}
                />
                <Input
                  value={editPhone}
                  onChange={(e) => setEditPhone(normalizePhone(e.target.value))}
                  onKeyDown={onKeyDownEdit}
                  placeholder="Teléfono"
                  className="h-8 text-sm"
                />
                <div className="flex gap-1.5">
                  <Button size="sm" className="h-8 px-3" onClick={saveClientEdits} disabled={savingClient}>
                    {savingClient ? "Guardando…" : "Guardar"}
                  </Button>
                  <Button size="sm" variant="secondary" className="h-8 px-3" onClick={cancelClientEdits} disabled={savingClient}>
                    Cancelar
                  </Button>
                </div>
              </div>
            ) : (
              <>
                <h2 className="text-sm font-semibold truncate">{client.name}</h2>
                <p className="text-[11px] text-muted-foreground truncate">{client.phone || "Sin teléfono"}</p>
              </>
            )}
          </div>

          <div className="ml-2 flex items-center gap-2 text-[11px] text-muted-foreground">
            <span>{client.orders.length} pedido(s)</span>
            {!editMode && (
              <Button size="sm" variant="secondary" className="h-8 px-3" onClick={() => setEditMode(true)}>
                Editar
              </Button>
            )}
          </div>
        </div>

        {/* Agregar pedido (lista) — títulos y márgenes más chicos */}
        <div className="space-y-1.5">
          <p className="text-xs font-medium">Agregar pedido (lista)</p>
          <TagsInput
            value={orderItems}
            onChange={setOrderItems}
            placeholder='Ítems… usá "Producto @ Proveedor" si corresponde'
            hint={<span className="text-[10px] text-muted-foreground">Escribí <b>@</b> para autocompletar proveedores ya cargados.</span>}
            providerOptions={providerList}
          />
          <div className="flex justify-end">
            <Button type="button" size="sm" className="h-8 px-3" onClick={createOrder} disabled={!orderItems.length}>
              Crear pedido
            </Button>
          </div>
        </div>

        {/* Pedidos del cliente — más compacto */}
        <div className="space-y-2">
          <p className="text-xs font-medium">Pedidos</p>
          {client.orders.length === 0 && <p className="text-[11px] text-muted-foreground">Sin pedidos.</p>}
          {client.orders.map((o) => (
            <OrderAccordion
              key={o.id}
              order={o}
              sb={sb}
              onChange={onChange}
              tenantId={tenantId}
              branchId={branchId}
            />
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

function OrderAccordion({
  order,
  sb,
  onChange,
  tenantId,
  branchId,
}: {
  order: ClientOrder & { items: ClientOrderItem[]; comments?: ClientOrderComment[] }; // comments opcional
  sb: SupabaseClient;
  onChange: () => Promise<void>;
  tenantId: string;
  branchId: string;
}) {
  const [open, setOpen] = React.useState(false);

  // 🎨 estilos por estado
  const tone = {
    pendiente: {
      border: "border-[color:var(--surface-secondary-strong)]",
      header: "bg-[color:var(--surface-secondary-soft)]",
      ring: "focus-visible:outline-[color:var(--surface-secondary-strong)]",
    },
    guardado: {
      border: "border-[color:var(--surface-accent-strong)]",
      header: "bg-[color:var(--surface-accent-soft)]",
      ring: "focus-visible:outline-[color:var(--surface-accent-strong)]",
    },
    entregado: {
      border: "border-[color:var(--surface-success-strong)]",
      header: "bg-[color:var(--surface-success-soft)]",
      ring: "focus-visible:outline-[color:var(--surface-success-strong)]",
    },
    cancelado: {
      border: "border-[color:var(--surface-alert-strong)]",
      header: "bg-[color:var(--surface-alert-subtle)]",
      ring: "focus-visible:outline-[color:var(--surface-alert-strong)]",
    },
  } as const;

  const currentTone = tone[order.status];

  async function deleteOrder() {
    const ok = window.confirm("¿Eliminar este pedido y todos sus ítems?");
    if (!ok) return;
    const { error } = await sb
      .from("client_orders")
      .delete()
      .eq("id", order.id)
      .eq("tenant_id", tenantId)
      .eq("branch_id", branchId);
    if (error) {
      alert("No se pudo eliminar el pedido.");
      return;
    }
    await onChange();
  }

  // === Comentarios (histórico) ===
  const [newComment, setNewComment] = React.useState("");
  const [savingComment, setSavingComment] = React.useState(false);

  async function addComment() {
    if (!newComment.trim()) return;
    setSavingComment(true);
    try {
      const { error } = await sb.from("client_order_comments").insert({
        order_id: order.id,
        comment: newComment.trim(),
        tenant_id: tenantId,
        branch_id: branchId,
      });
      if (error) {
        alert("No se pudo guardar el comentario");
        return;
      }
      setNewComment("");
      await onChange();
    } finally {
      setSavingComment(false);
    }
  }

  async function deleteComment(commentId: string) {
    const { error } = await sb
      .from("client_order_comments")
      .delete()
      .eq("id", commentId)
      .eq("tenant_id", tenantId)
      .eq("branch_id", branchId);
    if (error) {
      alert("No se pudo borrar el comentario");
      return;
    }
    await onChange();
  }

  const comments = order.comments ?? []; // fallback seguro

  return (
    <details
      open={open}
      onToggle={(e) => setOpen((e.target as HTMLDetailsElement).open)}
      className={`rounded-md border border-border ${currentTone.border} transition-colors`}
    >
      <summary
        className={`flex cursor-pointer items-center justify-between rounded-md p-2 ${currentTone.header}
                    list-none outline-none focus-visible:outline-2 ${currentTone.ring}`}
      >
        <div className="flex items-center gap-2">
          <button
            type="button"
            title="Eliminar pedido"
            aria-label="Eliminar pedido"
            className="text-muted-foreground hover:text-[color:var(--destructive)]"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              deleteOrder();
            }}
          >
            <X className="w-4 h-4" />
          </button>

          <span className="text-sm font-semibold">
            Pedido del {new Date(order.created_at).toLocaleString()}
          </span>
          <OrderStatusBadge status={order.status} />
        </div>

        <span className="text-xs text-muted-foreground">{order.items.length} ítem(s)</span>
      </summary>

      <div className="p-2 border-t border-transparent space-y-3">
        <OrderStatusSelector order={order} sb={sb} onChange={onChange} />
        <OrderItemsList order={order} sb={sb} onChange={onChange} tenantId={tenantId} branchId={branchId} />

        {/* === Comentarios === */}
        <div className="space-y-2">
          <p className="text-xs text-muted-foreground">Comentarios</p>

          <ul className="space-y-2">
            {comments.map((c) => (
              <li
                key={c.id}
                className="flex items-start justify-between gap-2 rounded border border-border bg-[color:var(--surface-overlay-strong)] p-2"
              >
                <div className="flex flex-col">
                  <span className="text-sm">{c.comment}</span>
                  <span className="text-[10px] text-muted-foreground">
                    {new Date(c.created_at).toLocaleString()}
                  </span>
                </div>
                <button
                  type="button"
                  className="text-muted-foreground hover:text-[color:var(--destructive)]"
                  onClick={() => deleteComment(c.id)}
                >
                  <X className="w-4 h-4" />
                </button>
              </li>
            ))}

            {comments.length === 0 && (
              <li className="text-xs text-muted-foreground">Sin comentarios.</li>
            )}
          </ul>

          <div className="flex gap-2">
            <Input
              value={newComment}
              onChange={(e) => setNewComment(e.target.value)}
              placeholder="Escribir comentario…"
            />
            <Button type="button" onClick={addComment} disabled={savingComment}>
              {savingComment ? "Guardando…" : "Guardar"}
            </Button>
          </div>
        </div>
      </div>
    </details>
  );
}





function OrderStatusSelector({
  order,
  sb,
  onChange,
}: {
  order: ClientOrder;
  sb: SupabaseClient;
  onChange: () => Promise<void>;
}) {
  async function setStatus(status: ClientOrder["status"]) {
    if (status === order.status) return;
    const { error } = await sb.from("client_orders").update({ status }).eq("id", order.id);
    if (error) return alert("No se pudo cambiar el estado del pedido");
    await onChange();
  }

  const base = "px-2 py-1 rounded text-xs border transition-colors";
  const active = "border-[color:var(--color-action-secondary)] bg-[var(--color-action-secondary)] text-[var(--background)]";
  const inactive = "border-border bg-[color:var(--surface-overlay-soft)] text-muted-foreground";

  return (
    <div className="flex items-center gap-2">
      <button type="button" className={`${base} ${order.status === "pendiente" ? active : inactive}`} onClick={() => setStatus("pendiente")}>
        pendiente
      </button>
      <button type="button" className={`${base} ${order.status === "guardado" ? active : inactive}`} onClick={() => setStatus("guardado")}>
        guardado
      </button>
      <button type="button" className={`${base} ${order.status === "entregado" ? active : inactive}`} onClick={() => setStatus("entregado")}>
        entregado
      </button>
      <button type="button" className={`${base} ${order.status === "cancelado" ? active : inactive}`} onClick={() => setStatus("cancelado")}>
        cancelado
      </button>
    </div>
  );
}

function OrderItemsList({
  order,
  sb,
  onChange,
  tenantId,
  branchId,
}: {
  order: ClientOrder & { items: ClientOrderItem[] };
  sb: SupabaseClient;
  onChange: () => Promise<void>;
  tenantId: string;
  branchId: string;
}) {
  const [editingId, setEditingId] = React.useState<string | null>(null);
  const [editingText, setEditingText] = React.useState("");
  const [editingProviderId, setEditingProviderId] = React.useState<string | null>(null);
  const [editingProviderText, setEditingProviderText] = React.useState("");

  const disabled = order.status === "cancelado";

  async function toggle(oi: ClientOrderItem) {
    if (disabled) return;
    const { error } = await sb.from("client_order_items").update({ done: !oi.done }).eq("id", oi.id);
    if (error) return alert("No se pudo cambiar el check");
    await onChange();
  }

  function startEdit(oi: ClientOrderItem) {
    if (disabled) return;
    setEditingId(oi.id);
    setEditingText(oi.article);
  }
  async function saveEdit() {
    if (!editingId) return;
    const { error } = await sb.from("client_order_items").update({ article: editingText.trim() }).eq("id", editingId);
    if (error) return alert("No se pudo editar el ítem");
    setEditingId(null);
    setEditingText("");
    await onChange();
  }

  async function remove(oi: ClientOrderItem) {
    if (disabled) return;
    const { error } = await sb.from("client_order_items").delete().eq("id", oi.id);
    if (error) return alert("No se pudo borrar el ítem");
    await onChange();
  }

  // Editar proveedor por ítem
  function startProviderEdit(oi: ClientOrderItem) {
    if (disabled) return;
    setEditingProviderId(oi.id);
    setEditingProviderText(oi.provider ?? "");
  }
  async function saveProviderEdit() {
    if (!editingProviderId) return;
    const next = editingProviderText.trim() || null;
    const { error } = await sb.from("client_order_items").update({ provider: next }).eq("id", editingProviderId);
    if (error) return alert("No se pudo editar el proveedor");
    setEditingProviderId(null);
    setEditingProviderText("");
    await onChange();
  }

  // Agregar más ítems a este pedido (solo @)
  const [newItems, setNewItems] = React.useState<string[]>([]);
  async function addItems() {
    if (disabled || !newItems.length) return;
    const rows = newItems.map((raw) => {
      const parsed = parseArticleProvider(raw);
      return {
        order_id: order.id,
        article: parsed.article,
        done: false,
        provider: parsed.provider,
        tenant_id: tenantId,
        branch_id: branchId,
      };
    });
    const { error } = await sb.from("client_order_items").insert(rows);
    if (error) return alert("No se pudieron agregar ítems");
    setNewItems([]);
    await onChange();
  }

  return (
    <div className="space-y-3">
      <ul className="space-y-2">
        {order.items.map((oi) => (
          <li key={oi.id} className="flex flex-col gap-2 rounded border p-2">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2 min-w-0">
                <input
                  type="checkbox"
                  className="h-4 w-4"
                  checked={oi.done}
                  onChange={() => toggle(oi)}
                  disabled={disabled}
                />
                {editingId === oi.id ? (
                  <input
                    value={editingText}
                    onChange={(e) => setEditingText(e.target.value)}
                    className="border rounded px-2 py-1 text-sm w-full"
                    disabled={disabled}
                  />
                ) : (
                  <span className={`text-sm truncate ${oi.done ? "line-through text-muted-foreground" : ""}`}>{oi.article}</span>
                )}
              </div>
              <div className="flex items-center gap-2">
                {editingId === oi.id ? (
                  <Button size="sm" variant="secondary" onClick={saveEdit} disabled={disabled} className="flex items-center gap-1">
                    <Save className="w-4 h-4" /> <span className="text-xs">Guardar</span>
                  </Button>
                ) : (
                  <Button size="sm" variant="secondary" onClick={() => startEdit(oi)} disabled={disabled} className="flex items-center gap-1">
                    <Edit2 className="w-4 h-4" /> <span className="text-xs">Editar</span>
                  </Button>
                )}
                <Button size="sm" variant="secondary" onClick={() => remove(oi)} disabled={disabled} title="Borrar">
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            </div>

            {/* Proveedor por ítem */}
            <div className="flex items-center justify-between gap-2 pl-6">
              {editingProviderId === oi.id ? (
                <div className="flex items-center gap-2 w-full">
                  <Input
                    value={editingProviderText}
                    onChange={(e) => setEditingProviderText(e.target.value)}
                    placeholder="Proveedor (ej: Dicomere)"
                    className="h-8 text-sm"
                  />
                  <Button size="sm" variant="secondary" onClick={saveProviderEdit} disabled={disabled}>
                    <Save className="w-4 h-4" />
                  </Button>
                </div>
              ) : (
                <div className="flex items-center gap-2 w-full">
                  <span className="text-xs text-muted-foreground">
                    Proveedor:{" "}
                    <span className="rounded-full border border-[color:var(--surface-muted-strong)] bg-[color:var(--surface-overlay-soft)] px-2 py-0.5 text-xs text-foreground">
                      {oi.provider ?? "—"}
                    </span>
                  </span>
                  <Button size="sm" variant="ghost" onClick={() => startProviderEdit(oi)} disabled={disabled}>
                    <Edit2 className="w-4 h-4" />
                  </Button>
                </div>
              )}
            </div>
          </li>
        ))}
      </ul>

      {/* Agregar más ítems a este pedido */}
      <div className="space-y-2">
        <p className="text-xs text-muted-foreground">Agregar más ítems a este pedido</p>
        <TagsInput
          value={newItems}
          onChange={setNewItems}
          placeholder='Nuevo ítem… usá "Producto @ Proveedor"'
          hint={<>Escribí <b>@</b> para autocompletar proveedores ya cargados.</>}
          providerOptions={
            // Opcional: podrías pasar aquí una lista más específica por cliente si quisieras
            Array.from(new Set(order.items.map((i) => i.provider).filter(Boolean) as string[]))
          }
        />
        <div className="flex justify-end">
          <Button type="button" onClick={addItems} disabled={disabled || !newItems.length}>
            Agregar ítems
          </Button>
        </div>
      </div>
    </div>
  );
}
