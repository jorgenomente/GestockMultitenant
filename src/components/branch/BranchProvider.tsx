"use client";

import React from "react";
import { useParams, usePathname } from "next/navigation";
import { getSupabaseBrowserClient } from "@/lib/supabaseClient";

type BranchRow = { id: string; name: string; slug: string };
type Role = "owner" | "admin" | "staff" | string;

type BranchContextValue = {
  branches: BranchRow[];
  currentBranch: BranchRow | null;
  loading: boolean;
  role: Role | null;
  error: string | null;
  tenantId: string | null;
  // eslint-disable-next-line no-unused-vars
  setCurrentBranch: (slug: string) => void;
};

export const BranchContext = React.createContext<BranchContextValue | undefined>(undefined);

function extractBranchFromPath(pathname: string | null, tenant: string | null) {
  if (!pathname || !tenant) return null;
  const safeTenant = tenant.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const rx = new RegExp(`^/t/${safeTenant}/b/([^/]+)`, "i");
  const match = pathname.match(rx);
  if (!match || match.length < 2) return null;
  try {
    return decodeURIComponent(match[1]);
  } catch {
    return match[1];
  }
}

function readStoredBranch(key: string | null) {
  if (!key) return null;
  if (typeof window === "undefined") return null;
  try {
    return window.localStorage.getItem(key);
  } catch {
    return null;
  }
}

function writeStoredBranch(key: string | null, slug: string) {
  if (!key) return;
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(key, slug);
  } catch {
    // ignore storage errors silently
  }
}

export function BranchProvider({ children }: { children: React.ReactNode }) {
  const params = useParams<{ slug?: string }>();
  const tenantSlugParam = params?.slug;
  const pathname = usePathname();
  const supabase = React.useMemo(() => getSupabaseBrowserClient(), []);

  const tenantSlug = (tenantSlugParam ?? "").toString();
  const storageKey = tenantSlug ? `gestock:tenant:${tenantSlug}:branch` : null;

  const [branches, setBranches] = React.useState<BranchRow[]>([]);
  const [currentBranch, setCurrentBranchState] = React.useState<BranchRow | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [role, setRole] = React.useState<Role | null>(null);
  const [error, setError] = React.useState<string | null>(null);
  const [tenantId, setTenantId] = React.useState<string | null>(null);

  const pathBranch = React.useMemo(() => extractBranchFromPath(pathname, tenantSlug || null), [pathname, tenantSlug]);
  const latestPathBranch = React.useRef<string | null>(pathBranch);

  React.useEffect(() => {
    latestPathBranch.current = pathBranch;
  }, [pathBranch]);

  React.useEffect(() => {
    if (!tenantSlug) return;
    let cancelled = false;

    async function load() {
      setLoading(true);
      setError(null);
      try {
        const { data: userRes, error: userErr } = await supabase.auth.getUser();
        if (userErr) throw userErr;
        const user = userRes?.user;
        if (!user) throw new Error("No hay sesión activa");

        const { data: tenantRow, error: tenantErr } = await supabase
          .from("tenants")
          .select("id")
          .eq("slug", tenantSlug)
          .maybeSingle();
        if (tenantErr) throw tenantErr;
        if (!tenantRow) throw new Error("Tenant no encontrado");

        const { data: membershipRow, error: membershipErr } = await supabase
          .from("memberships")
          .select("role, branch_ids")
          .eq("tenant_id", tenantRow.id)
          .eq("user_id", user.id)
          .maybeSingle();
        if (membershipErr) throw membershipErr;
        if (!membershipRow) throw new Error("Sin membership en este tenant");

        const { data: branchRows, error: branchErr } = await supabase
          .from("branches")
          .select("id, name, slug")
          .eq("tenant_id", tenantRow.id)
          .order("name", { ascending: true });
        if (branchErr) throw branchErr;

        let available = (branchRows ?? []) as BranchRow[];
        const allowedIds = membershipRow.branch_ids as string[] | null;
        if (Array.isArray(allowedIds) && allowedIds.length > 0) {
          const allowedSet = new Set(allowedIds);
          available = available.filter((b) => allowedSet.has(b.id));
        }

        if (!available.length) {
          throw new Error("No hay sucursales disponibles para este usuario");
        }

        let initialSlug: string | null = latestPathBranch.current ?? readStoredBranch(storageKey);
        if (!initialSlug && Array.isArray(allowedIds) && allowedIds.length === 1) {
          const soleId = allowedIds[0];
          initialSlug = available.find((b) => b.id === soleId)?.slug ?? null;
        }
        if (!initialSlug) {
          initialSlug = available[0]?.slug ?? null;
        }

        const initialBranch = initialSlug
          ? available.find((b) => b.slug === initialSlug) ?? available[0]
          : available[0];

        if (!cancelled) {
          setBranches(available);
          setRole(membershipRow.role as Role);
          setCurrentBranchState(initialBranch);
          setLoading(false);
          setTenantId(tenantRow.id);
          writeStoredBranch(storageKey, initialBranch.slug);
        }
      } catch (err: unknown) {
        if (cancelled) return;
        const fallbackMessage = "Error cargando sucursales";
        const message =
          err instanceof Error
            ? err.message
            : typeof err === "string"
              ? err
              : fallbackMessage;
        setBranches([]);
        setCurrentBranchState(null);
        setRole(null);
        setLoading(false);
        setError(message || fallbackMessage);
        setTenantId(null);
      }
    }

    load();

    return () => {
      cancelled = true;
    };
  }, [storageKey, supabase, tenantSlug]);

  React.useEffect(() => {
    if (!pathBranch) return;
    setCurrentBranchState((prev) => {
      if (prev?.slug === pathBranch) return prev;
      const match = branches.find((b) => b.slug === pathBranch);
      if (!match) return prev;
      writeStoredBranch(storageKey, match.slug);
      return match;
    });
  }, [branches, pathBranch, storageKey]);

  const setCurrentBranch = React.useCallback(
    (slug: string) => {
      setCurrentBranchState((prev) => {
        if (prev?.slug === slug) {
          writeStoredBranch(storageKey, slug);
          return prev;
        }
        const match = branches.find((b) => b.slug === slug);
        if (!match) return prev;
        writeStoredBranch(storageKey, match.slug);
        return match;
      });
    },
    [branches, storageKey]
  );

  const value = React.useMemo<BranchContextValue>(() => ({
    branches,
    currentBranch,
    loading,
    role,
    error,
    tenantId,
    setCurrentBranch,
  }), [branches, currentBranch, loading, role, error, tenantId, setCurrentBranch]);

  return <BranchContext.Provider value={value}>{children}</BranchContext.Provider>;
}

export function useBranch() {
  const ctx = React.useContext(BranchContext);
  if (!ctx) {
    throw new Error("useBranch debe usarse dentro de BranchProvider");
  }
  return ctx;
}
