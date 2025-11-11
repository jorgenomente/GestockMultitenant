"use client";

import React from "react";
import { useParams, usePathname, useRouter, useSearchParams } from "next/navigation";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { useBranch } from "./BranchProvider";
type BranchSelectorProps = {
  className?: string;
  label?: string;
  hideLabel?: boolean;
  hideWhenSingle?: boolean;
};

export default function BranchSelector({
  className,
  label = "Sucursal",
  hideLabel = false,
  hideWhenSingle = true,
}: BranchSelectorProps) {
  const { branches, currentBranch, loading, error, setCurrentBranch } = useBranch();
  const { slug } = useParams<{ slug?: string }>();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const router = useRouter();

  const isProviderOrderPage = pathname?.includes("/proveedores/") && pathname?.includes("/pedido");

  if (isProviderOrderPage) return null;

  if (error) {
    return (
      <div className={cn("rounded-md border border-destructive/50 bg-destructive/10 px-3 py-2 text-xs text-destructive", className)}>
        {error}
      </div>
    );
  }

  if (loading || !branches.length) return null;
  if (hideWhenSingle && branches.length === 1) return null;

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
    <div className={cn("flex min-w-[14rem] flex-col gap-1", hideLabel && "gap-0", className)}>
      {!hideLabel && label && (
        <span className="text-[0.65rem] font-semibold uppercase tracking-[0.25em] text-muted-foreground">
          {label}
        </span>
      )}
      <Select value={currentValue} onValueChange={handleChange}>
        <SelectTrigger className="h-10 w-full rounded-lg border border-border/70 bg-card text-sm font-medium text-foreground shadow-[0_8px_20px_-16px_rgba(31,31,31,0.4)] focus:border-ring focus:ring-2 focus:ring-ring/30 focus:ring-offset-2 focus:ring-offset-card">
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
  );
}
