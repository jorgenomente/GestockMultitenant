"use client";

import React from "react";
import { useParams, usePathname, useRouter, useSearchParams } from "next/navigation";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useBranch } from "./BranchProvider";

export default function BranchSelector() {
  const { branches, currentBranch, loading, error, setCurrentBranch } = useBranch();
  const { slug } = useParams<{ slug?: string }>();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const router = useRouter();

  const isProviderOrderPage = pathname?.includes("/proveedores/") && pathname?.includes("/pedido");

  if (isProviderOrderPage) return null;

  if (error) {
    return (
      <div className="border-b border-red-200 bg-red-50 px-4 py-2 text-sm text-red-700 dark:border-red-900/60 dark:bg-red-950/40 dark:text-red-200">
        {error}
      </div>
    );
  }

  if (loading || !branches.length) return null;
  if (branches.length === 1) return null;

  const tenantSlug = (slug ?? "").toString();
  const currentValue = currentBranch?.slug ?? "";

  const buildNextPath = (nextSlug: string) => {
    if (!tenantSlug) return "/";
    const query = searchParams?.toString();
    const basePrefix = `/t/${tenantSlug}/b/`;
    if (pathname && pathname.startsWith(basePrefix)) {
      const rest = pathname.slice(basePrefix.length);
      const slashIdx = rest.indexOf("/");
      const suffix = slashIdx >= 0 ? rest.slice(slashIdx) : "";
      const next = `${basePrefix}${nextSlug}${suffix}`;
      return query ? `${next}?${query}` : next;
    }

    const fallback = `${basePrefix}${nextSlug}`;
    return query ? `${fallback}?${query}` : fallback;
  };

  const handleChange = (nextSlug: string) => {
    setCurrentBranch(nextSlug);
    const nextPath = buildNextPath(nextSlug);
    router.push(nextPath);
  };

  return (
    <div className="border-b border-border/60 bg-card/95 backdrop-blur supports-[backdrop-filter]:backdrop-blur">
      <div className="mx-auto flex w-full max-w-6xl items-center justify-end gap-3 px-4 py-3">
        <label className="text-[0.7rem] font-semibold uppercase tracking-[0.2em] text-muted-foreground">
          Sucursal
        </label>
        <Select value={currentValue} onValueChange={handleChange}>
          <SelectTrigger className="w-52 rounded-lg border border-border/70 bg-card text-sm font-medium text-foreground shadow-[0_8px_20px_-16px_rgba(31,31,31,0.4)] focus:border-ring focus:ring-2 focus:ring-ring/30 focus:ring-offset-2 focus:ring-offset-card">
            <SelectValue placeholder="Seleccionar sucursal" />
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
