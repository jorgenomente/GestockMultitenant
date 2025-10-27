// src/lib/useLogout.ts
"use client";

import { useRouter } from "next/navigation";
import { getSupabaseBrowserClient } from "@/lib/supabaseClient";

export function useLogout() {
  const router = useRouter();

  async function logout() {
    try {
      const supabase = getSupabaseBrowserClient();
      await supabase.auth.signOut();
    } catch (err) {
      console.error("Error al cerrar sesión:", err);
    } finally {
      try {
        localStorage.clear();
        sessionStorage.clear();
      } catch (storageError) {
        console.warn("No se pudo limpiar el storage durante logout", storageError);
      }
      router.push("/login");
    }
  }

  return { logout };
}
