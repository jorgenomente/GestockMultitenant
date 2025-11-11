"use client";

import React from "react";
import Link from "next/link";
import { useParams, usePathname } from "next/navigation";
import { Bell, Shield } from "lucide-react";
import BranchSelector from "@/components/branch/BranchSelector";
import { useBranch } from "@/components/branch/BranchProvider";
import { paths } from "@/lib/paths";
import { getSupabaseBrowserClient } from "@/lib/supabaseClient";
import type { AuthChangeEvent, Session } from "@supabase/supabase-js";

export default function UserBranchIndicator() {
  const pathname = usePathname();
  const isDemo = pathname?.startsWith("/demo") ?? false;
  const supabase = React.useMemo(() => getSupabaseBrowserClient(), []);
  const [email, setEmail] = React.useState<string>("");
  const { slug: slugParam } = useParams<{ slug?: string }>();
  const tenantSlug = (slugParam ?? "").toString();
  const { role } = useBranch();
  const canViewAdmin = role === "owner" && Boolean(tenantSlug);
  const adminHref = canViewAdmin ? paths.admin(tenantSlug) : null;

  React.useEffect(() => {
    if (isDemo) {
      setEmail("demo@gestock.app");
      return;
    }

    let active = true;
    (async () => {
      try {
        const { data } = await supabase.auth.getUser();
        if (active) setEmail(data?.user?.email ?? "");
      } catch {
        if (active) setEmail("");
      }
    })();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_: AuthChangeEvent, session: Session | null) => {
      setEmail(session?.user?.email ?? "");
    });

    return () => {
      active = false;
      subscription.unsubscribe();
    };
  }, [supabase, isDemo]);

  const branchSlug = React.useMemo(() => {
    if (isDemo) return "demo-sandbox";
    if (!pathname) return "";
    const match = pathname.match(/^\/t\/[^/]+\/b\/([^/]+)/);
    if (!match || match.length < 2) return "";
    try {
      return decodeURIComponent(match[1]);
    } catch {
      return match[1];
    }
  }, [pathname, isDemo]);

  const displayName = React.useMemo(
    () => (isDemo ? "Invitado Demo" : formatDisplayName(email)),
    [email, isDemo]
  );
  const initials = React.useMemo(
    () => (isDemo ? "ID" : extractInitials(email)),
    [email, isDemo]
  );

  return (
    <header className="border-b border-border/70 bg-card/90 shadow-[0_20px_45px_-35px_rgba(31,31,31,0.45)] backdrop-blur supports-[backdrop-filter]:backdrop-blur">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-4 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary font-semibold text-primary-foreground shadow-sm">
            G
          </span>
          <div className="leading-tight">
            <p className="text-sm font-semibold tracking-tight text-foreground">GeStock</p>
            <p className="text-xs text-muted-foreground">
              Gestión simple{isDemo ? " · modo demo" : ""}
            </p>
          </div>
        </div>
        <div className="flex flex-1 flex-col gap-4 text-xs sm:flex-row sm:items-center sm:justify-end sm:text-sm">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-3">
            <BranchSelector className="w-full sm:w-64" hideLabel />
            {canViewAdmin && adminHref && (
              <Link
                href={adminHref}
                className="inline-flex h-10 w-full items-center justify-center gap-2 rounded-lg border border-border/70 bg-card px-4 text-sm font-semibold text-foreground shadow-sm transition hover:bg-primary/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-card sm:w-auto"
              >
                <Shield className="h-4 w-4" aria-hidden="true" />
                <span>Admin</span>
              </Link>
            )}
          </div>
          <div className="flex flex-1 flex-wrap items-center justify-end gap-3 text-foreground sm:flex-none">
            <button
              type="button"
              aria-label="Notificaciones"
              className="relative flex h-8 w-8 items-center justify-center rounded-full text-muted-foreground transition hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-card"
            >
              <Bell className="h-4 w-4" aria-hidden="true" />
              <span className="absolute -right-0.5 -top-0.5 h-2 w-2 rounded-full bg-destructive" aria-hidden="true" />
            </button>
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary/20 text-sm font-semibold uppercase tracking-wide text-primary">
              {initials || "—"}
            </div>
            <div className="flex flex-col items-end leading-tight text-right">
              <span className="text-xs text-muted-foreground">Usuario</span>
              <span className="text-sm font-medium text-foreground/90">{displayName}</span>
            </div>
            <span className="flex items-center gap-2 text-muted-foreground">
              <span className="rounded-full bg-accent/20 px-2 py-0.5 text-[0.7rem] font-medium uppercase tracking-wide text-accent-foreground">
                {isDemo ? "demo virtual" : branchSlug || "—"}
              </span>
              {isDemo && (
                <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[0.65rem] font-semibold uppercase tracking-wide text-primary">
                  Demo
                </span>
              )}
            </span>
          </div>
        </div>
      </div>
    </header>
  );
}

function extractInitials(email: string): string {
  if (!email) return "";
  const localPart = email.split("@")[0] ?? "";
  if (!localPart) return "";
  const tokens = localPart.replace(/[^a-zA-Z0-9]+/g, " ").trim().split(/\s+/).filter(Boolean);
  if (!tokens.length) return localPart.slice(0, 2).toUpperCase();
  const initials = tokens
    .slice(0, 2)
    .map((token) => token.charAt(0).toUpperCase())
    .join("");
  return initials || localPart.slice(0, 2).toUpperCase();
}

function formatDisplayName(email: string): string {
  if (!email) return "—";
  const localPart = email.split("@")[0] ?? "";
  if (!localPart) return email;
  const tokens = localPart.replace(/[^a-zA-Z0-9]+/g, " ").trim().split(/\s+/).filter(Boolean);
  if (!tokens.length) return email;
  const formatted = tokens
    .map((token) => token.charAt(0).toUpperCase() + token.slice(1))
    .join(" ");
  return formatted || email;
}
