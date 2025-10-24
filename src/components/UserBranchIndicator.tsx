"use client";

import React from "react";
import { usePathname } from "next/navigation";
import { Bell } from "lucide-react";
import { getSupabaseBrowserClient } from "@/lib/supabaseClient";
import type { AuthChangeEvent, Session } from "@supabase/supabase-js";

export default function UserBranchIndicator() {
  const pathname = usePathname();
  const supabase = React.useMemo(() => getSupabaseBrowserClient(), []);
  const [email, setEmail] = React.useState<string>("");

  React.useEffect(() => {
    let active = true;
    (async () => {
      try {
        const { data } = await supabase.auth.getUser();
        if (active) setEmail(data?.user?.email ?? "");
      } catch {
        if (active) setEmail("");
      }
    })();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event: AuthChangeEvent, session: Session | null) => {
      setEmail(session?.user?.email ?? "");
    });

    return () => {
      active = false;
      subscription.unsubscribe();
    };
  }, [supabase]);

  const branchSlug = React.useMemo(() => {
    if (!pathname) return "";
    const match = pathname.match(/^\/t\/[^/]+\/b\/([^/]+)/);
    if (!match || match.length < 2) return "";
    try {
      return decodeURIComponent(match[1]);
    } catch {
      return match[1];
    }
  }, [pathname]);

  const displayName = React.useMemo(() => formatDisplayName(email), [email]);
  const initials = React.useMemo(() => extractInitials(email), [email]);

  return (
    <header className="border-b border-border/70 bg-card/90 shadow-[0_20px_45px_-35px_rgba(31,31,31,0.45)] backdrop-blur supports-[backdrop-filter]:backdrop-blur">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-4 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary font-semibold text-primary-foreground shadow-sm">
            G
          </span>
          <div className="leading-tight">
            <p className="text-sm font-semibold tracking-tight text-foreground">GeStock</p>
            <p className="text-xs text-muted-foreground">Gestión simple</p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-4 text-xs sm:text-sm">
          <span className="flex items-center gap-2 text-muted-foreground">
            <span className="text-foreground">Sucursal</span>
            <span className="text-muted-foreground">·</span>
            <span className="rounded-full bg-accent/20 px-2 py-0.5 text-[0.7rem] font-medium uppercase tracking-wide text-accent-foreground">
              {branchSlug || "—"}
            </span>
          </span>
          <div className="flex items-center gap-3 text-foreground">
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
            <div className="flex flex-col leading-tight">
              <span className="text-xs text-muted-foreground">Usuario</span>
              <span className="text-sm font-medium text-foreground/90">{displayName}</span>
            </div>
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
