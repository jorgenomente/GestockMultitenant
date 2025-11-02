"use client";

import React from "react";

export type DemoBranch = {
  id: string;
  name: string;
  slug: string;
};

export type DemoTenant = {
  id: string;
  name: string;
  slug: string;
};

// eslint-disable-next-line no-unused-vars
type DemoBranchSetter = (branchSlug: DemoBranch["slug"]) => void;

interface DemoBranchContextValue {
  tenant: DemoTenant;
  branches: DemoBranch[];
  currentBranch: DemoBranch;
  role: "owner" | "admin" | "staff";
  loading: boolean;
  error: string | null;
  setCurrentBranch: DemoBranchSetter;
}

const DEMO_TENANT: DemoTenant = {
  id: "tenant-demo-001",
  name: "Gestock Demo Holdings",
  slug: "gestock-demo",
};

const DEMO_BRANCHES: DemoBranch[] = [
  { id: "branch-demo-central", name: "Casa Central", slug: "casa-central" },
  { id: "branch-demo-norte", name: "Sucursal Norte", slug: "sucursal-norte" },
  { id: "branch-demo-mayorista", name: "Mayorista", slug: "mayorista" },
];

const STORAGE_KEY = "gestock:demo:branch";

const DemoBranchContext = React.createContext<DemoBranchContextValue | undefined>(undefined);

export function DemoBranchProvider({ children }: { children: React.ReactNode }) {
  const [currentBranch, setCurrentBranch] = React.useState<DemoBranch>(() => {
    if (typeof window !== "undefined") {
      const stored = window.localStorage.getItem(STORAGE_KEY);
      const match = stored ? DEMO_BRANCHES.find((branch) => branch.slug === stored) : null;
      if (match) return match;
    }
    return DEMO_BRANCHES[0];
  });

  const setCurrentBranchSafe = React.useCallback((nextSlug: DemoBranch["slug"]) => {
    const match = DEMO_BRANCHES.find((branch) => branch.slug === nextSlug) ?? DEMO_BRANCHES[0];
    setCurrentBranch(match);
    if (typeof window !== "undefined") {
      try {
        window.localStorage.setItem(STORAGE_KEY, match.slug);
      } catch {
        /* ignore storage errors */
      }
    }
  }, []);

  const value = React.useMemo<DemoBranchContextValue>(
    () => ({
      tenant: DEMO_TENANT,
      branches: DEMO_BRANCHES,
      currentBranch,
      role: "owner",
      loading: false,
      error: null,
      setCurrentBranch: setCurrentBranchSafe,
    }),
    [currentBranch, setCurrentBranchSafe]
  );

  return <DemoBranchContext.Provider value={value}>{children}</DemoBranchContext.Provider>;
}

export function useDemoBranch() {
  const ctx = React.useContext(DemoBranchContext);
  if (!ctx) {
    throw new Error("useDemoBranch debe usarse dentro de DemoBranchProvider");
  }
  return ctx;
}

export { DEMO_BRANCHES, DEMO_TENANT };
