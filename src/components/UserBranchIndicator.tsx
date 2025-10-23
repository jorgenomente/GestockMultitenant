"use client";

import React from "react";
import { usePathname } from "next/navigation";
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

  return (
    <header className="border-b border-border/70 bg-card/90 shadow-[0_20px_45px_-35px_rgba(31,31,31,0.45)] backdrop-blur supports-[backdrop-filter]:backdrop-blur">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-4 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary font-semibold text-primary-foreground shadow-sm">
            G
          </span>
          <div className="leading-tight">
            <p className="text-sm font-semibold tracking-tight text-foreground">GeStock</p>
            <p className="text-xs text-muted-foreground">Gestión cálida para datos precisos</p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-xs sm:text-sm">
          <span className="flex items-center gap-1 text-muted-foreground">
            <span className="text-foreground">Usuario</span>
            <span className="text-muted-foreground">·</span>
            <span className="font-medium text-foreground/90">{email || "—"}</span>
          </span>
          <span className="flex items-center gap-2 text-muted-foreground">
            <span className="text-foreground">Sucursal</span>
            <span className="text-muted-foreground">·</span>
            <span className="rounded-full bg-accent/20 px-2 py-0.5 text-[0.7rem] font-medium uppercase tracking-wide text-accent-foreground">
              {branchSlug || "—"}
            </span>
          </span>
        </div>
      </div>
    </header>
  );
}
