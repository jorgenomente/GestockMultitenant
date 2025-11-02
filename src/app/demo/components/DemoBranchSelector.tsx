"use client";

import React from "react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useDemoBranch } from "./DemoBranchProvider";

export default function DemoBranchSelector() {
  const { branches, currentBranch, setCurrentBranch } = useDemoBranch();

  const handleChange = React.useCallback(
    (value: string) => {
      setCurrentBranch(value);
    },
    [setCurrentBranch]
  );

  return (
    <div className="border-b border-border/60 bg-card/95 backdrop-blur supports-[backdrop-filter]:backdrop-blur">
      <div className="mx-auto flex w-full max-w-6xl items-center justify-between gap-3 px-4 py-3">
        <div className="flex flex-col">
          <span className="text-[0.65rem] font-semibold uppercase tracking-[0.2em] text-muted-foreground">
            Demo de sucursales
          </span>
          <span className="text-xs text-muted-foreground">
            Seleccioná cuál recorrer mientras navegás la plataforma ficticia.
          </span>
        </div>
        <Select value={currentBranch.slug} onValueChange={handleChange}>
          <SelectTrigger className="w-56 rounded-lg border border-border/70 bg-card text-sm font-medium text-foreground shadow-[0_8px_20px_-16px_rgba(31,31,31,0.4)] focus:border-ring focus:ring-2 focus:ring-ring/30 focus:ring-offset-2 focus:ring-offset-card">
            <SelectValue placeholder="Elegí una sucursal" />
          </SelectTrigger>
          <SelectContent className="rounded-xl border border-border bg-card text-foreground shadow-[0_20px_45px_-30px_rgba(31,31,31,0.55)]">
            {branches.map((branch) => (
              <SelectItem key={branch.id} value={branch.slug} className="text-sm">
                {branch.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}
