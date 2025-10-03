"use client";

import { useParams } from "next/navigation";
import { useMembers } from "../_hooks/useMembers";
import { useUpsertMember } from "../_hooks/useUpsertMember";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils"; // opcional; si no lo tenés, quitá 'cn' y usa className directo

export default function MembersSection() {
  const { slug } = useParams<{ slug: string }>();
  const { data, isLoading, error } = useMembers(slug);
  const upsert = useUpsertMember(slug);

  // form
  const [userId, setUserId] = useState("");
  const [role, setRole] = useState<"owner" | "admin" | "staff">("staff");
  const [branchIds, setBranchIds] = useState("");

  const handleAssign = async () => {
    const ids = branchIds.split(",").map(s => s.trim()).filter(Boolean);
    await upsert.mutateAsync({ userId, role, branchIds: ids.length ? ids : [] });
    setUserId(""); setBranchIds("");
  };

  return (
    <section className="space-y-3">
      <h3 className="text-base font-semibold">Miembros</h3>

      {/* Form */}
      <div className="flex gap-2">
        <Input placeholder="user_id (UUID)" value={userId} onChange={(e) => setUserId(e.target.value)} />
        <Select value={role} onValueChange={(v) => setRole(v as any)}>
          <SelectTrigger className="w-36"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="owner">owner</SelectItem>
            <SelectItem value="admin">admin</SelectItem>
            <SelectItem value="staff">staff</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <div className="flex gap-2">
        <Input
          placeholder="branch_ids separados por coma"
          value={branchIds}
          onChange={(e) => setBranchIds(e.target.value)}
        />
        <Button onClick={handleAssign} disabled={upsert.isPending}>Asignar</Button>
      </div>

      {/* Lista */}
      <Card>
        <CardContent className="p-2 space-y-2">
          {isLoading && <p className="text-sm text-muted-foreground">Cargando...</p>}
          {error && <p className="text-sm text-red-600">Error: {(error as Error).message}</p>}
          {!isLoading && !error && (!data || data.length === 0) && (
            <p className="text-sm text-muted-foreground">No hay miembros aún.</p>
          )}

          {data?.map((m) => {
            // 👇 usamos email del API (fallback a UUID truncado)
            const title = m.email ?? `${m.user_id.slice(0, 8)}…`;
            // 👇 usamos branch_names del API (null=todas; []=ninguna)
            const branches =
              m.branch_names === null ? ["(todas)"]
              : m.branch_names.length ? m.branch_names
              : ["(sin sucursales)"];

            return (
              <div key={m.user_id} className="rounded-md border px-3 py-2">
                <div className="flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <div className="font-medium truncate">{title}</div>
                    <div className="text-xs text-muted-foreground truncate">
                      Sucursales: {branches.join(", ")}
                    </div>
                  </div>
                  <span className={cn("text-xs rounded-full bg-gray-100 px-2 py-0.5 shrink-0")}>
                    {m.role}
                  </span>
                </div>

                {/* Línea auxiliar pequeña con UUID + copiar (opcional) */}
                <div className="mt-1 flex items-center gap-2 text-[11px] text-muted-foreground">
                  <span className="truncate">{m.user_id}</span>
                  <button
                    className="underline"
                    onClick={() => navigator.clipboard.writeText(m.user_id)}
                  >
                    copiar id
                  </button>
                </div>
              </div>
            );
          })}
        </CardContent>
      </Card>
    </section>
  );
}
