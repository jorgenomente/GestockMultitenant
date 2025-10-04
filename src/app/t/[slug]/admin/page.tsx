"use client";

import { useMemo, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm, Controller } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { getSupabaseBrowserClient } from "@/lib/supabaseClient";
import { useParams } from "next/navigation";

/* shadcn/ui */
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui/popover";
import {
  Command, CommandList, CommandEmpty, CommandGroup, CommandItem, CommandInput,
} from "@/components/ui/command";
import { Checkbox } from "@/components/ui/checkbox";
import { cn } from "@/lib/utils";

/* =================== Tipos =================== */
type Branch = { id: string; name: string; slug: string };
type MembershipRow = {
  user_id: string;
  email: string | null;
  role: "owner" | "admin" | "staff";
  branch_ids: string[] | null;
  branch_names: string[] | null; // null = todas, [] = ninguna
};
type AuthUser = {
  id: string;
  email?: string | null;
  user_metadata?: Record<string, unknown> | null;
  created_at?: string;
};

/* =================== Schemas =================== */
const BranchFormSchema = z.object({
  name: z.string().min(2, "Mínimo 2 caracteres"),
  slug: z.string().min(2, "Mínimo 2 caracteres"),
});
type BranchFormValues = z.infer<typeof BranchFormSchema>;

const MemberFormSchema = z.object({
  userId: z.string().uuid("Usuario requerido"),
  role: z.enum(["owner", "admin", "staff"]),
  branchIds: z.array(z.string().uuid()).nullable(), // null = todas
});
type MemberFormValues = z.infer<typeof MemberFormSchema>;

const CreateUserSchema = z.object({
  username: z.string().min(2),
  password: z.string().min(4),
  role: z.enum(["owner", "admin", "staff"]).optional(),
  branch_id: z.string().uuid().optional(),
});
type CreateUserValues = z.infer<typeof CreateUserSchema>;

/* =================== Utils =================== */
function useClipboard() {
  return (text: string) => navigator.clipboard?.writeText(text).catch(() => {});
}
function slugify(s: string) {
  return s
    .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    .toLowerCase().trim().replace(/\s+/g, "-")
    .replace(/[^a-z0-9-]/g, "").replace(/-+/g, "-");
}

/* ======= UI helpers: Combobox y MultiSelect ======= */
type Option = { value: string; label: string; hint?: string };

function Combobox({
  value, onChange, options, placeholder = "Buscar...", empty = "Sin resultados",
}: {
  value?: string; onChange: (v: string) => void; options: Option[];
  placeholder?: string; empty?: string;
}) {
  const selected = options.find(o => o.value === value);
  const [open, setOpen] = useState(false);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="outline" role="combobox" className="justify-between w-full">
          {selected ? (
            <span className="truncate text-left">
              {selected.label}
              {selected.hint && <span className="ml-1 text-xs text-neutral-500">({selected.hint})</span>}
            </span>
          ) : (
            <span className="text-neutral-500">{placeholder}</span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="p-0 w-[--radix-popover-trigger-width]">
        <Command filter={(v, s) => (s as string).toLowerCase().includes(v.toLowerCase()) ? 1 : 0}>
          <CommandInput placeholder="Escribe para filtrar…" />
          <CommandList>
            <CommandEmpty>{empty}</CommandEmpty>
            <CommandGroup>
              {options.map((o) => (
                <CommandItem
                  key={o.value}
                  value={`${o.label} ${o.hint ?? ""}`}
                  onSelect={() => { onChange(o.value); setOpen(false); }}
                  className="flex items-center justify-between"
                >
                  <span>{o.label}</span>
                  {o.hint && <span className="text-xs text-neutral-500">{o.hint}</span>}
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}

function MultiSelect({
  values, onChange, options, placeholder = "Seleccionar…",
}: {
  values: string[]; onChange: (v: string[]) => void; options: Option[]; placeholder?: string;
}) {
  const [open, setOpen] = useState(false);
  const toggle = (val: string) => {
    if (values.includes(val)) onChange(values.filter(v => v !== val));
    else onChange([...values, val]);
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="outline" className="justify-between w-full">
          <div className="flex gap-1 flex-wrap">
            {values.length === 0 ? (
              <span className="text-neutral-500">{placeholder}</span>
            ) : values.map(v => {
              const o = options.find(o => o.value === v);
              return <Badge key={v} variant="secondary" className="rounded-full">{o?.label ?? v}</Badge>;
            })}
          </div>
        </Button>
      </PopoverTrigger>
      <PopoverContent className="p-0 w-[--radix-popover-trigger-width]">
        <Command>
          <CommandInput placeholder="Escribe para filtrar…" />
          <CommandList>
            <CommandEmpty>Sin resultados</CommandEmpty>
            <CommandGroup>
              {options.map((o) => (
                <CommandItem key={o.value} onSelect={() => toggle(o.value)}>
                  <div className="mr-2">
                    <Checkbox checked={values.includes(o.value)} />
                  </div>
                  <span className="flex-1">{o.label}</span>
                  {o.hint && <span className="text-xs text-neutral-500">{o.hint}</span>}
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}

function MemberRow({
  m,
  branchOptions,
  onApply,
}: {
  m: MembershipRow;
  branchOptions: { value: string; label: string; hint?: string }[];
  onApply: (args: { userId: string; role: MembershipRow["role"]; branchIds: string[] | null }) => void;
}) {
  const [editing, setEditing] = useState(false);

  const [temp, setTemp] = useState<string[] | null>(
    m.branch_ids === null ? null : (m.branch_ids ?? [])
  );

  const title = m.email ?? `${m.user_id.slice(0, 8)}…`;
  const viewBranches =
    m.branch_names === null
      ? ["(todas)"]
      : m.branch_names?.length
      ? m.branch_names
      : ["(sin sucursales)"];

  const apply = () => {
    onApply({ userId: m.user_id, role: m.role, branchIds: temp });
    setEditing(false);
  };

  return (
    <li className="py-2 px-3 space-y-2">
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <div className="font-medium truncate">{title}</div>

          {!editing ? (
            <div className="text-xs text-neutral-600 truncate">
              Sucursales: {viewBranches.join(", ")}
            </div>
          ) : (
            <div className="pt-1">
              <MultiSelect
                values={Array.isArray(temp) ? temp : []}
                onChange={(vals) => setTemp(vals)}
                options={branchOptions}
                placeholder="Seleccionar sucursales…"
              />
              <div className="flex gap-2 mt-2 flex-wrap">
                <Button size="sm" onClick={apply}>
                  Aplicar
                </Button>
                <Button size="sm" variant="secondary" onClick={() => setEditing(false)}>
                  Cancelar
                </Button>
                <Button size="sm" variant="outline" onClick={() => setTemp([])}>
                  Ninguna
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setTemp(branchOptions.map((o) => o.value))}
                >
                  Todas visibles
                </Button>
                <Button size="sm" variant="outline" onClick={() => setTemp(null)}>
                  Todas (null)
                </Button>
              </div>
              <p className="text-[11px] text-neutral-500 mt-1">
                Tip: “Todas (null)” guarda <span className="font-mono">null</span> en DB (todas las sucursales).
              </p>
            </div>
          )}
        </div>

        <span className="text-xs rounded-full bg-gray-100 px-2 py-0.5 shrink-0">
          {m.role}
        </span>
      </div>

      <div className="text-[11px] text-neutral-500 flex items-center justify-between">
        <div className="flex items-center gap-2 min-w-0">
          <span className="truncate">{m.user_id}</span>
          <button
            type="button"
            onClick={() => navigator.clipboard.writeText(m.user_id)}
            className="underline"
            title="Copiar user_id"
          >
            copiar id
          </button>
        </div>
        <Button size="sm" variant="secondary" onClick={() => setEditing((v) => !v)}>
          {editing ? "Cerrar" : "Editar sucursales"}
        </Button>
      </div>
    </li>
  );
}

/* =================== Página =================== */
export default function AdminPage() {
  const { slug } = useParams<{ slug: string }>();
  const qc = useQueryClient();
  const supabase = useMemo(() => getSupabaseBrowserClient(), []);
  const copy = useClipboard();

  /* --- Sesión (debug) --- */
  const meQ = useQuery({
    queryKey: ["me"],
    queryFn: async () => (await supabase.auth.getUser()).data.user ?? null,
  });

  /* --- Tenant por slug (usa maybeSingle) --- */
  const tenantQ = useQuery<{ id: string; slug: string; name: string } | null>({
    queryKey: ["tenant", slug],
    enabled: !!slug,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("tenants")
        .select("id, slug, name")
        .eq("slug", slug)
        .maybeSingle();
      if (error) throw new Error(error.message);
      return data ?? null; // null => no visible por RLS o no existe
    },
  });

  // ⬇️ Derivamos tenantId DESPUÉS de tenantQ
  const tenantId: string | null = tenantQ.data?.id ?? null;

  /* --- Branches --- */
  const branchesQ = useQuery<Branch[]>({
    queryKey: ["branches", tenantId],
    enabled: !!tenantId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("branches")
        .select("id, name, slug")
        .eq("tenant_id", tenantId)
        .order("name", { ascending: true });
      if (error) throw error;
      return (data ?? []) as Branch[];
    },
  });

  /* --- Memberships (API, service role) --- */
  const membershipsQ = useQuery<MembershipRow[]>({
    queryKey: ["memberships", slug],
    enabled: !!slug,
    queryFn: async () => {
      const res = await fetch(`/api/t/${slug}/memberships`, { method: "GET", cache: "no-store" });
      const txt = await res.text();
      let json: any = null;
      try { json = JSON.parse(txt); } catch {}
      if (!res.ok) throw new Error(json?.error || `HTTP ${res.status}`);
      return json as MembershipRow[];
    },
  });

  /* --- Usuarios (API, service role) --- */
  const usersQ = useQuery<{ users: AuthUser[] }>({
    queryKey: ["users", slug],
    enabled: !!slug,
    queryFn: async () => {
      const res = await fetch(`/api/t/${slug}/users`);
      if (!res.ok) throw new Error(await res.text());
      return (await res.json()) as { users: AuthUser[] };
    },
  });

  /* --- Mapas --- */
  const branchNameById = useMemo(() => {
    const map = new Map<string, string>();
    for (const b of branchesQ.data ?? []) map.set(b.id, b.name);
    return map;
  }, [branchesQ.data]);

  const userOptions: Option[] = useMemo(() => {
    const list = usersQ.data?.users ?? [];
    return list.map((u) => {
      const username =
        (u.user_metadata?.username as string | undefined) ??
        (u.email?.includes("@") ? u.email.split("@")[0] : undefined);
      return {
        value: u.id,
        label: u.email ?? username ?? u.id,
        hint: username && username !== u.email ? username : undefined,
      };
    });
  }, [usersQ.data]);

  const branchOptions: Option[] = useMemo(() => {
    return (branchesQ.data ?? []).map((b) => ({ value: b.id, label: b.name, hint: b.slug }));
  }, [branchesQ.data]);

  /* =================== Mutations =================== */
  const createBranch = useMutation<any, Error, BranchFormValues>({
    mutationFn: async (values) => {
      const res = await fetch(`/api/t/${slug}/branches`, {
        method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(values),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}: ${(await res.text()).slice(0, 400)}`);
      return res.json();
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["branches", tenantId] }),
    onError: (err) => alert(err instanceof Error ? err.message : String(err)),
  });

  const deleteBranch = useMutation<any, Error, string>({
    mutationFn: async (branchId) => {
      const res = await fetch(`/api/t/${slug}/branches/${branchId}`, { method: "DELETE" });
      if (!res.ok) throw new Error(`HTTP ${res.status}: ${(await res.text()).slice(0, 400)}`);
      return res.json();
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["branches", tenantId] }),
    onError: (err) => alert(`No se pudo borrar: ${err instanceof Error ? err.message : String(err)}`),
  });

  const upsertMember = useMutation<any, Error, MemberFormValues>({
    mutationFn: async (values) => {
      const res = await fetch(`/api/t/${slug}/memberships`, {
        method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(values),
      });
      if (!res.ok) throw new Error(await res.text());
      return res.json();
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["memberships", slug] }),
  });

  const createUser = useMutation<any, Error, CreateUserValues>({
    mutationFn: async (values) => {
      const res = await fetch(`/api/t/${slug}/users`, {
        method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(values),
      });
      if (!res.ok && res.status !== 207) throw new Error(await res.text());
      return res.json();
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["users", slug] }),
  });

  const deleteUser = useMutation<any, Error, string>({
    mutationFn: async (userId) => {
      const res = await fetch(`/api/t/${slug}/users/${userId}`, { method: "DELETE" });
      if (!res.ok) throw new Error(await res.text());
      return res.json();
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["users", slug] }),
  });

  /* =================== Forms =================== */
  const bf = useForm<BranchFormValues>({
    resolver: zodResolver(BranchFormSchema),
    defaultValues: { name: "", slug: "" },
  });

  const mf = useForm<MemberFormValues>({
    resolver: zodResolver(MemberFormSchema),
    defaultValues: { userId: "" as any, role: "staff", branchIds: [] },
  });

  const uf = useForm<CreateUserValues>({
    resolver: zodResolver(CreateUserSchema),
    defaultValues: { username: "", password: "", role: "staff", branch_id: undefined },
  });

  /* =================== UI =================== */
  return (
    <main className="mx-auto max-w-screen-sm p-4 space-y-8">
      <header className="space-y-1">
        <h1 className="text-xl font-semibold">Admin · {slug}</h1>
        <p className="text-sm text-neutral-500">
          {tenantQ.isLoading && "Cargando tenant…"}
          {tenantQ.isError && (
            <span className="text-red-600">
              Error cargando tenant: {(tenantQ.error as Error).message}
            </span>
          )}
          {tenantQ.data === null && !tenantQ.isLoading && !tenantQ.isError && (
            <span className="text-red-600">Tenant no encontrado o no visible por permisos.</span>
          )}
          {tenantQ.data && (
            <>Tenant: <span className="font-mono">{tenantQ.data.name}</span>{" "}
              <span className="text-xs text-neutral-400">(id {tenantQ.data.id})</span></>
          )}
        </p>
        {meQ.data && (
          <p className="text-xs text-neutral-500">Sesión: <span className="font-mono">{meQ.data.id}</span></p>
        )}
      </header>

      {/* ========= Sucursales ========= */}
      <section className="space-y-3 rounded-2xl border p-4">
        <h2 className="font-medium">Sucursales</h2>

        <form
          onSubmit={bf.handleSubmit((v) => createBranch.mutate(v))}
          className="grid gap-2 sm:grid-cols-3"
        >
          <label className="sr-only" htmlFor="branch-name">Nombre</label>
          <input
            id="branch-name"
            className="border p-2 rounded"
            placeholder="Nombre"
            {...bf.register("name")}
            onBlur={(e) => {
              const auto = slugify(e.currentTarget.value);
              if (!bf.getValues("slug") && auto) bf.setValue("slug", auto);
            }}
          />
          <label className="sr-only" htmlFor="branch-slug">Slug</label>
          <input
            id="branch-slug"
            className="border p-2 rounded"
            placeholder="slug"
            {...bf.register("slug")}
            onBlur={(e) => bf.setValue("slug", slugify(e.currentTarget.value))}
          />
          <Button type="submit" className="p-2" disabled={!tenantId || createBranch.isPending} aria-busy={createBranch.isPending}>
            {createBranch.isPending ? "Creando…" : "Crear"}
          </Button>
          {createBranch.isError && (
            <p className="col-span-full p-2 text-sm text-red-600 rounded bg-red-50 mt-2">
              {(createBranch.error as Error).message}
            </p>
          )}
        </form>

        <div className="rounded-lg border">
          {branchesQ.isLoading && <div className="p-3 text-sm text-neutral-500">Cargando sucursales…</div>}
          {branchesQ.error && <div className="p-3 text-sm text-red-600">Error cargando sucursales.</div>}
          {(branchesQ.data ?? []).length > 0 ? (
            <ul className="divide-y">
              {(branchesQ.data ?? []).map((b) => (
                <li key={b.id} className="py-2 px-3 flex items-center justify-between gap-2">
                  <div className="truncate">
                    <span className="font-medium">{b.name}</span>{" "}
                    <span className="text-xs text-neutral-500">({b.slug})</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <button type="button" onClick={() => navigator.clipboard.writeText(b.id)} className="text-xs font-mono text-neutral-500 hover:text-neutral-700" title="Copiar ID">
                      {b.id.slice(0, 8)}… copiar
                    </button>
                    <button
                      type="button"
                      onClick={() => { if (!confirm(`¿Eliminar sucursal ${b.name}?`)) return; deleteBranch.mutate(b.id); }}
                      className="text-red-600 border border-red-200 rounded px-2 py-1 text-xs hover:bg-red-50"
                      aria-label={`Eliminar sucursal ${b.name}`}
                    >
                      Borrar
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          ) : (!branchesQ.isLoading && <div className="p-3 text-sm text-neutral-500">No hay sucursales aún.</div>)}
        </div>
      </section>

      {/* ========= Usuarios ========= */}
      <section className="space-y-3 rounded-2xl border p-4">
        <h2 className="font-medium">Usuarios</h2>

        <form onSubmit={uf.handleSubmit((v) => createUser.mutate(v))} className="grid gap-2 sm:grid-cols-3">
          <input className="border p-2 rounded" placeholder="username (ej: cab1)" {...uf.register("username")} />
          <input className="border p-2 rounded" placeholder="contraseña (min 4)" type="password" {...uf.register("password")} />
          <Button type="submit" className="p-2" disabled={createUser.isPending} aria-busy={createUser.isPending}>
            {createUser.isPending ? "Creando…" : "Crear"}
          </Button>

          <select className="border p-2 rounded" {...uf.register("role")}>
            <option value="">(sin rol)</option>
            <option value="staff">staff</option>
            <option value="admin">admin</option>
            <option value="owner">owner</option>
          </select>
          <select className="border p-2 rounded" {...uf.register("branch_id")}>
            <option value="">(sin sucursal)</option>
            {(branchesQ.data ?? []).map((b) => (
              <option key={b.id} value={b.id}>{b.name}</option>
            ))}
          </select>

          {createUser.isError && (
            <p className="col-span-full p-2 text-sm text-red-600 rounded bg-red-50 mt-2">
              {(createUser.error as Error).message}
            </p>
          )}
        </form>

        <div className="rounded-lg border">
          {usersQ.isLoading && <div className="p-3 text-sm text-neutral-500">Cargando usuarios…</div>}
          {usersQ.error && <div className="p-3 text-sm text-red-600">Error cargando usuarios.</div>}
          {(usersQ.data?.users ?? []).length > 0 ? (
            <ul className="divide-y">
              {(usersQ.data?.users ?? []).map((u) => {
                const username =
                  (u.user_metadata?.username as string | undefined) ??
                  (u.email?.includes("@") ? u.email.split("@")[0] : "");
                return (
                  <li key={u.id} className="py-2 px-3 flex items-center justify-between">
                    <div className="space-y-0.5 min-w-0">
                      <div className="font-mono text-sm truncate">{u.email}</div>
                      {username && <div className="text-xs text-neutral-500 truncate">username: {username}</div>}
                    </div>
                    <div className="flex items-center gap-2">
                      <button type="button" onClick={() => navigator.clipboard.writeText(u.id)} className="text-xs underline" title="Copiar user_id">
                        copiar id
                      </button>
                      <button
                        type="button"
                        onClick={() => { if (!confirm("¿Eliminar este usuario?")) return; deleteUser.mutate(u.id); }}
                        className="text-red-600 border border-red-200 rounded px-2 py-1 text-sm hover:bg-red-50"
                      >
                        Borrar
                      </button>
                    </div>
                  </li>
                );
              })}
            </ul>
          ) : (!usersQ.isLoading && <div className="p-3 text-sm text-neutral-500">No hay usuarios aún.</div>)}
        </div>
      </section>

      {/* ========= Miembros ========= */}
      <section className="space-y-3 rounded-2xl border p-4">
        <h2 className="font-medium">Miembros</h2>

        {/* Form con Combobox usuario + MultiSelect sucursales */}
        <form onSubmit={mf.handleSubmit((v) => upsertMember.mutate(v))} className="grid gap-2">
          <div className="grid sm:grid-cols-2 gap-2">
            <Controller
              control={mf.control}
              name="userId"
              render={({ field }) => (
                <Combobox
                  value={field.value}
                  onChange={field.onChange}
                  options={userOptions}
                  placeholder="Seleccionar usuario…"
                  empty="No hay usuarios"
                />
              )}
            />
            <select className="border p-2 rounded" {...mf.register("role")}>
              <option value="owner">owner</option>
              <option value="admin">admin</option>
              <option value="staff" defaultValue="staff">staff</option>
            </select>
          </div>

          <div className="grid sm:grid-cols-2 gap-2">
            <Controller
              control={mf.control}
              name="branchIds"
              render={({ field }) => (
                <div className="space-y-1">
                  <MultiSelect
                    values={Array.isArray(field.value ?? []) ? field.value ?? [] : []}
                    onChange={(vals) => field.onChange(vals)}
                    options={branchOptions}
                    placeholder="Sucursales (dejar vacío = ninguna)"
                  />
                  <div className="text-[11px] text-neutral-500">
                    Consejo: si quieres <b>todas</b> las sucursales, deja <span className="font-mono">null</span> (usa el botón).
                  </div>
                  <div className="flex gap-2">
                    <Button type="button" variant="secondary" onClick={() => mf.setValue("branchIds", [])}>
                      Ninguna
                    </Button>
                    <Button type="button" variant="secondary" onClick={() => mf.setValue("branchIds", null as any)}>
                      Todas
                    </Button>
                  </div>
                </div>
              )}
            />
            <div className="flex sm:items-end">
              <Button type="submit" className="w-full sm:w-auto" disabled={upsertMember.isPending} aria-busy={upsertMember.isPending}>
                {upsertMember.isPending ? "Asignando…" : "Asignar / Actualizar"}
              </Button>
            </div>
          </div>

          {upsertMember.isError && (
            <p className="col-span-full p-2 text-sm text-red-600 rounded bg-red-50 mt-2">
              {(upsertMember.error as Error).message}
            </p>
          )}
        </form>

        {/* Listado con edición inline de sucursales */}
        <div className="rounded-lg border">
          {membershipsQ.isLoading && <div className="p-3 text-sm text-neutral-500">Cargando miembros…</div>}
          {membershipsQ.error && (
            <div className="p-3 text-sm text-red-600">
              Error: {(membershipsQ.error as Error).message}
            </div>
          )}
          {(membershipsQ.data ?? []).length > 0 ? (
            <ul className="divide-y">
              {(membershipsQ.data ?? []).map((m) => (
                <MemberRow
                  key={`${m.user_id}-${m.role}`}
                  m={m}
                  branchOptions={branchOptions}
                  onApply={({ userId, role, branchIds }) =>
                    upsertMember.mutate({ userId, role, branchIds })
                  }
                />
              ))}
            </ul>
          ) : (
            !membershipsQ.isLoading && <div className="p-3 text-sm text-neutral-500">No hay miembros aún.</div>
          )}
        </div>
      </section>
    </main>
  );
}
