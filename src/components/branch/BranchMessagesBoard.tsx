"use client";

import React from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, RefreshCw, Send, Trash2 } from "lucide-react";

export type BranchMessage = {
  id: string;
  message: string;
  authorId: string;
  authorName: string | null;
  createdAt: string;
};

type Role = "owner" | "admin" | "staff";

type Props = {
  tenantSlug: string;
  branchSlug: string;
  currentUserId: string;
  role: Role;
  initialMessages: BranchMessage[];
};

const API_BASE = "/api/t";

export function BranchMessagesBoard({ tenantSlug, branchSlug, currentUserId, role, initialMessages }: Props) {
  const [messages, setMessages] = React.useState<BranchMessage[]>(initialMessages);
  const [draft, setDraft] = React.useState("");
  const [error, setError] = React.useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [refreshing, setRefreshing] = React.useState(false);
  const [deletingIds, setDeletingIds] = React.useState<Set<string>>(new Set());

  const endpoint = React.useMemo(() => `${API_BASE}/${tenantSlug}/b/${branchSlug}/dashboard/messages`, [tenantSlug, branchSlug]);

  const canDelete = React.useCallback(
    (message: BranchMessage) => role === "owner" || role === "admin" || message.authorId === currentUserId,
    [role, currentUserId]
  );

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const trimmed = draft.trim();
    if (!trimmed) {
      setError("Escribe un mensaje antes de enviar");
      return;
    }

    setIsSubmitting(true);
    setError(null);
    try {
      const response = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: trimmed }),
      });

      if (!response.ok) {
        const payload = await response.json().catch(() => ({}));
        throw new Error(payload.error || "No se pudo guardar el mensaje");
      }

      const payload = (await response.json()) as { message: BranchMessage };
      setMessages((prev) => [payload.message, ...prev]);
      setDraft("");
    } catch (err) {
      const message = err instanceof Error ? err.message : "Error inesperado";
      setError(message);
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleRefresh() {
    setRefreshing(true);
    setError(null);
    try {
      const response = await fetch(endpoint, { cache: "no-store" });
      if (!response.ok) {
        const payload = await response.json().catch(() => ({}));
        throw new Error(payload.error || "No se pudieron obtener los mensajes");
      }
      const payload = (await response.json()) as { messages: BranchMessage[] };
      setMessages(payload.messages);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Error inesperado";
      setError(message);
    } finally {
      setRefreshing(false);
    }
  }

  async function handleDelete(id: string) {
    setError(null);
    setDeletingIds((prev) => new Set(prev).add(id));
    try {
      const response = await fetch(`${endpoint}?id=${encodeURIComponent(id)}`, { method: "DELETE" });
      if (!response.ok) {
        const payload = await response.json().catch(() => ({}));
        throw new Error(payload.error || "No se pudo borrar el mensaje");
      }
      setMessages((prev) => prev.filter((msg) => msg.id !== id));
    } catch (err) {
      const message = err instanceof Error ? err.message : "Error inesperado";
      setError(message);
    } finally {
      setDeletingIds((prev) => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
    }
  }

  return (
    <Card className="h-full">
      <CardHeader className="flex flex-row items-center justify-between space-y-0">
        <CardTitle className="text-lg font-semibold">Mensajes del equipo</CardTitle>
        <Button variant="ghost" size="icon" onClick={handleRefresh} disabled={refreshing} aria-label="Actualizar mensajes">
          {refreshing ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
        </Button>
      </CardHeader>
      <CardContent className="space-y-4">
        <form onSubmit={handleSubmit} className="space-y-2">
          <label htmlFor="dashboard-message" className="sr-only">
            Nuevo mensaje
          </label>
          <textarea
            id="dashboard-message"
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            className="w-full min-h-[80px] rounded-xl border border-border bg-background px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-primary"
            placeholder="Escribe una nota para el equipo"
            maxLength={800}
            disabled={isSubmitting}
          />
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>{draft.trim().length}/800</span>
            <Button type="submit" size="sm" disabled={isSubmitting}>
              {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Send className="mr-2 h-4 w-4" />}
              Publicar
            </Button>
          </div>
        </form>

        {error && <p className="text-sm text-destructive">{error}</p>}

        <div className="space-y-3">
          {messages.length === 0 && <p className="text-sm text-muted-foreground">Aún no hay mensajes. ¡Escribe el primero!</p>}
          {messages.map((message) => {
            const created = new Date(message.createdAt);
            const formatted = created.toLocaleString("es-AR", {
              day: "2-digit",
              month: "2-digit",
              hour: "2-digit",
              minute: "2-digit",
            });
            const deleting = deletingIds.has(message.id);
            return (
              <div key={message.id} className="rounded-xl border border-border bg-muted/50 p-3 text-sm">
                <div className="flex items-center justify-between gap-2">
                  <div className="font-medium text-foreground">
                    {message.authorName ?? "Equipo"}
                  </div>
                  <span className="text-xs text-muted-foreground whitespace-nowrap">{formatted}</span>
                </div>
                <p className="mt-2 whitespace-pre-wrap leading-relaxed text-foreground/90">{message.message}</p>
                {canDelete(message) && (
                  <div className="mt-2 flex justify-end">
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="h-8 text-xs text-destructive hover:text-destructive"
                      onClick={() => handleDelete(message.id)}
                      disabled={deleting}
                    >
                      {deleting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Trash2 className="mr-2 h-4 w-4" />}
                      Borrar
                    </Button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
