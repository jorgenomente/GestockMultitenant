// src/components/ui/AuthListener.tsx
"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { getSupabaseBrowserClient } from "@/lib/supabaseClient";
import type { AuthChangeEvent, Session } from "@supabase/supabase-js";

const RELEVANT_EVENTS: AuthChangeEvent[] = [
  "SIGNED_IN",
  "SIGNED_OUT",
  "TOKEN_REFRESHED",
  "USER_UPDATED",
];

export default function AuthListener() {
  const router = useRouter();
  const subscribed = useRef(false);
  const lastEvent = useRef<AuthChangeEvent | null>(null);
  const ticking = useRef(false); // evita refresh en cascada

  useEffect(() => {
    if (subscribed.current) return; // StrictMode: evita doble suscripción
    subscribed.current = true;

    const supabase = getSupabaseBrowserClient();

    const clearClientSession = async (reason: string) => {
      console.warn("AuthListener: clearing invalid session", reason);
      try {
        await supabase.auth.signOut({ scope: "local" });
      } catch (signOutError) {
        console.warn("AuthListener: local signOut failed", signOutError);
      }

      if (typeof window !== "undefined") {
        try {
          const localKeys = Object.keys(window.localStorage);
          for (const key of localKeys) {
            if (key.startsWith("sb-")) {
              window.localStorage.removeItem(key);
            }
          }
          const sessionKeys = Object.keys(window.sessionStorage);
          for (const key of sessionKeys) {
            if (key.startsWith("sb-")) {
              window.sessionStorage.removeItem(key);
            }
          }
        } catch (storageError) {
          console.warn("AuthListener: storage cleanup failed", storageError);
        }
      }

      if (!ticking.current) {
        ticking.current = true;
        router.refresh();
        setTimeout(() => {
          ticking.current = false;
        }, 250);
      }
    };

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event: AuthChangeEvent, session: Session | null) => {
        // Ignora eventos no relevantes
        if (!RELEVANT_EVENTS.includes(event)) return;

        // Evita postear lo mismo repetidamente
        if (lastEvent.current === event && event !== "TOKEN_REFRESHED") return;
        lastEvent.current = event;

        try {
          // Enviamos tokens mínimos al server (SIN esperar redirección del server)
          const response = await fetch("/api/auth/set", {
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
            keepalive: true,
          });

          const payload: { ok?: boolean; error?: string } | null = await response
            .json()
            .catch(() => null);

          if (!response.ok || (payload && payload.ok === false)) {
            const reason = payload?.error ?? `status_${response.status}`;
            await clearClientSession(reason);
            return;
          }

          // Refresca el árbol de Server Components una sola vez
          if (!ticking.current) {
            ticking.current = true;
            router.refresh();
            // libera el lock un poquitito después
            setTimeout(() => {
              ticking.current = false;
            }, 250);
          }
        } catch (err) {
          console.error("auth/set error", err);
          await clearClientSession("fetch_exception");
        }
      }
    );

    return () => {
      try {
        subscription?.unsubscribe();
      } catch (err) {
        console.warn("AuthListener cleanup failed", err);
      }
    };
  }, [router]);

  return null;
}
