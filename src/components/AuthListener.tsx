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
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event: AuthChangeEvent, session: Session | null) => {
        // Ignora eventos no relevantes
        if (!RELEVANT_EVENTS.includes(event)) return;

        // Evita postear lo mismo repetidamente
        if (lastEvent.current === event && event !== "TOKEN_REFRESHED") return;
        lastEvent.current = event;

        try {
          // Enviamos tokens mínimos al server (SIN esperar redirección del server)
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
            keepalive: true,
          });

          // Refresca el árbol de Server Components una sola vez
          if (!ticking.current) {
            ticking.current = true;
            router.refresh();
            // libera el lock un poquitito después
            setTimeout(() => { ticking.current = false; }, 250);
          }
        } catch (err) {
          console.error("auth/set error", err);
        }
      }
    );

    return () => {
      try { subscription?.unsubscribe(); } catch {}
    };
  }, [router]);

  return null;
}
