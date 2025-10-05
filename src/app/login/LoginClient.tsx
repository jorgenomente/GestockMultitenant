// src/app/login/LoginClient.tsx
"use client";

import * as React from "react";
import { useSearchParams } from "next/navigation";

// (Opcional) usa tus propios inputs/botón si ya existen:
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

export default function LoginClient() {
  const searchParams = useSearchParams();
  const next = searchParams.get("next") || "/";

  const [email, setEmail] = React.useState("");
  const [password, setPassword] = React.useState("");

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    // TODO: integra tu auth real (Supabase / NextAuth). Placeholder:
    window.location.href = next;
  }

  return (
    <main className="mx-auto max-w-sm p-6">
      <h1 className="mb-4 text-xl font-semibold">Iniciar sesión</h1>
      <form onSubmit={onSubmit} className="space-y-3">
        <Input
          type="email"
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.currentTarget.value)}
          required
        />
        <Input
          type="password"
          placeholder="Contraseña"
          value={password}
          onChange={(e) => setPassword(e.currentTarget.value)}
          required
        />
        <Button type="submit" className="w-full">Entrar</Button>
      </form>
    </main>
  );
}
