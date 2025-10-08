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
    <div className="border-b border-neutral-200 bg-white/80 backdrop-blur supports-[backdrop-filter]:backdrop-blur dark:border-neutral-800 dark:bg-neutral-900/80">
      <div className="mx-auto flex w-full max-w-screen-lg items-center justify-end px-4 py-2">
        <label className="mr-3 text-xs font-medium uppercase tracking-wide text-neutral-500 dark:text-neutral-300">
          Sucursal
        </label>
        <Select value={currentValue} onValueChange={handleChange}>
          <SelectTrigger className="w-48 text-sm">
            <SelectValue placeholder="Seleccionar sucursal" />
          </SelectTrigger>
          <SelectContent>
            {branches.map((branch) => (
              <SelectItem key={branch.id} value={branch.slug}>
                {branch.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}
