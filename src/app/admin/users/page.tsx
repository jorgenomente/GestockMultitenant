"use client";

import { useEffect, useId, useMemo, useState } from "react";

/* =================== Tipos =================== */
type AuthUser = {
  id: string;
  email?: string | null;
  user_metadata?: Record<string, unknown> | null;
  created_at?: string;
};

type CreatePayload = {
  username: string;
  password: string;
  role?: "owner" | "admin" | "staff";
  branch_id?: string;
};

type RoleOption = "" | "owner" | "admin" | "staff";

/* =================== Constantes =================== */
const EMAIL_SUFFIX = "tn"; // 👈 debe coincidir con el login y con /api/admin/users

/* =================== Página =================== */
export default function AdminUsersPage() {
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [users, setUsers] = useState<AuthUser[]>([]);

  // Form
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [branchId, setBranchId] = useState("");
  const [role, setRole] = useState<RoleOption>("");

  const usernameId = useId();
  const passwordId = useId();
  const roleId = useId();
  const branchIdInput = useId();

  const canSubmit =
    username.trim().length >= 2 && password.length >= 4 && !submitting;

  /* -------- Helpers -------- */
  const prettyUsers = useMemo(() => {
    return users.map((u) => {
      const metaUsername =
        (u.user_metadata?.username as string | undefined) ?? null;
      // si no hay metadata, intento inferir del email
      const inferred =
        !metaUsername && u.email?.endsWith(`@${EMAIL_SUFFIX}`)
          ? u.email.replace(`@${EMAIL_SUFFIX}`, "")
          : null;
      return { ...u, metaUsername: metaUsername ?? inferred ?? "" };
    });
  }, [users]);

  async function load() {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/users", { cache: "no-store" });
      if (!res.ok) throw new Error(await res.text());
      const json = (await res.json()) as { users: AuthUser[] };
      setUsers(json.users ?? []);
    } catch (e) {
      console.error(e);
      alert("No se pudo cargar el listado de usuarios.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function createUser() {
    if (!canSubmit) return;
    setSubmitting(true);
    try {
      const payload: CreatePayload = {
        username: username.trim(),
        password,
      };
      if (branchId && role) {
        payload.branch_id = branchId.trim();
        payload.role = role;
      }

      const res = await fetch("/api/admin/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok && res.status !== 207) {
        const err = await safeJson(res);
        throw new Error(err?.error ?? res.statusText);
      }

      const json = await res.json().catch(() => ({}));
      if (res.status === 207) {
        alert(
          `Usuario creado, pero membership falló: ${json?.membership_error ?? "verificar"}`
        );
      }

      // Reset form
      setUsername("");
      setPassword("");
      setBranchId("");
      setRole("");

      await load();
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Error inesperado";
      alert(`Error al crear: ${msg}`);
    } finally {
      setSubmitting(false);
    }
  }

  async function deleteUser(id: string) {
    if (!confirm("¿Eliminar este usuario?")) return;
    try {
      const res = await fetch(`/api/admin/users/${id}`, { method: "DELETE" });
      if (!res.ok) {
        const err = await safeJson(res);
        throw new Error(err?.error ?? res.statusText);
      }
      await load();
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Error inesperado";
      alert(`Error al eliminar: ${msg}`);
    }
  }

  return (
    <main className="p-6 space-y-8 max-w-2xl mx-auto">
      <header className="space-y-1">
        <h1 className="text-2xl font-semibold">Usuarios</h1>
        <p className="text-sm text-muted-foreground">
          Crea usuarios simples (<strong>username</strong> + <strong>contraseña</strong>).
          El sistema usa emails ficticios <code>@{EMAIL_SUFFIX}</code>.
        </p>
      </header>

      {/* ===== Crear ===== */}
      <section className="space-y-3 border rounded-lg p-4">
        <h2 className="font-medium">Crear usuario</h2>
        <div className="grid grid-cols-1 gap-3">
          <div className="grid grid-cols-1 gap-2">
            <label className="text-sm font-medium" htmlFor={usernameId}>
              Username
            </label>
            <input
              id={usernameId}
              className="border rounded p-2"
              placeholder="ej: cab1"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              autoComplete="off"
            />
            <p className="text-xs text-muted-foreground">
              Email generado:{" "}
              <code className="font-mono">
                {username ? `${username}@${EMAIL_SUFFIX}` : `usuario@${EMAIL_SUFFIX}`}
              </code>
            </p>
          </div>

          <div className="grid grid-cols-1 gap-2">
            <label className="text-sm font-medium" htmlFor={passwordId}>
              Contraseña
            </label>
            <input
              id={passwordId}
              className="border rounded p-2"
              placeholder="mín. 4 caracteres"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              type="password"
              autoComplete="new-password"
            />
          </div>

          {/* Opcional: role + branch */}
          <div className="grid grid-cols-2 gap-3">
            <div className="grid grid-cols-1 gap-2">
              <label className="text-sm font-medium" htmlFor={roleId}>
                Rol (opcional)
              </label>
              <select
                id={roleId}
                className="border rounded p-2"
                value={role}
                onChange={(event) => setRole(event.target.value as RoleOption)}
              >
                <option value="">(sin rol)</option>
                <option value="staff">staff</option>
                <option value="admin">admin</option>
                <option value="owner">owner</option>
              </select>
            </div>

            <div className="grid grid-cols-1 gap-2">
              <label className="text-sm font-medium" htmlFor={branchIdInput}>
                Branch ID (UUID)
              </label>
              <input
                id={branchIdInput}
                className="border rounded p-2"
                placeholder="opcional"
                value={branchId}
                onChange={(e) => setBranchId(e.target.value)}
              />
            </div>
          </div>

          <button
            onClick={createUser}
            disabled={!canSubmit}
            className="bg-emerald-600 disabled:bg-emerald-300 text-white rounded p-2"
            aria-busy={submitting}
          >
            {submitting ? "Creando…" : "Crear"}
          </button>
        </div>
      </section>

      {/* ===== Listado ===== */}
      <section className="space-y-3">
        <h2 className="font-medium">Listado</h2>
        {loading ? (
          <p>Cargando…</p>
        ) : prettyUsers.length === 0 ? (
          <p>No hay usuarios con @{EMAIL_SUFFIX}</p>
        ) : (
          <ul className="divide-y">
            {prettyUsers.map((u) => (
              <li
                key={u.id}
                className="py-2 flex items-center justify-between gap-3"
              >
                <div className="min-w-0">
                  <div className="font-mono text-sm truncate">{u.email}</div>
                  {u.metaUsername ? (
                    <div className="text-xs text-muted-foreground truncate">
                      username: {u.metaUsername}
                    </div>
                  ) : null}
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <button
                    onClick={() => navigator.clipboard.writeText(u.id)}
                    className="text-xs underline"
                    title="Copiar user_id"
                  >
                    copiar id
                  </button>
                  <button
                    onClick={() => deleteUser(u.id)}
                    className="text-red-600 border border-red-200 rounded px-2 py-1 text-sm hover:bg-red-50"
                  >
                    Borrar
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </main>
  );
}

/* =================== Utils =================== */
type ErrorResponse = { error?: string };

async function safeJson(res: Response): Promise<ErrorResponse | null> {
  try {
    return await res.json();
  } catch {
    return null;
  }
}
