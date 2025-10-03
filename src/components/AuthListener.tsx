"use client";

import { useEffect } from "react";
import { getSupabaseBrowserClient } from "@/lib/supabaseClient";
import type { AuthChangeEvent, Session } from "@supabase/supabase-js";

export default function AuthListener() {
  useEffect(() => {
    const supabase = getSupabaseBrowserClient();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event: AuthChangeEvent, session: Session | null) => {
        // Enviamos SOLO los tokens (lo mínimo necesario) al servidor
        await fetch("/api/auth/set", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({
            event,
            session: session
              ? {
                  access_token: session.access_token,
                  refresh_token: session.refresh_token,
                }
              : null,
          }),
        });
      }
    );

    return () => {
      // protege si por algún motivo no existe
      subscription?.unsubscribe();
    };
  }, []);

  return null;
}
