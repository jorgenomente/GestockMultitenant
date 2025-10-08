"use client";

import React from "react";
import { usePathname } from "next/navigation";
import { getSupabaseBrowserClient } from "@/lib/supabaseClient";

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

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_, session) => {
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
    <div className="w-full border-b border-neutral-200 bg-neutral-50/80 px-4 py-2 text-xs text-neutral-600 backdrop-blur-sm dark:border-neutral-800 dark:bg-neutral-900/80 dark:text-neutral-300">
      <div className="mx-auto flex max-w-screen-lg flex-wrap items-center justify-end gap-x-4 gap-y-1">
        <span>
          <strong className="font-medium text-neutral-700 dark:text-neutral-200">Usuario:</strong> {email || "—"}
        </span>
        <span>
          <strong className="font-medium text-neutral-700 dark:text-neutral-200">Sucursal:</strong> {branchSlug || "—"}
        </span>
      </div>
    </div>
  );
}
