"use client";

import React from "react";
import { useQuery } from "@tanstack/react-query";
import { useBranch } from "@/components/branch/BranchProvider";
import { getSupabaseBrowserClient } from "@/lib/supabaseClient";
import {
  applyTheme,
  DEFAULT_BRANCH_THEME,
  sanitizeStoredTheme,
  BranchThemeFormValues,
  THEME_SETTINGS_KEY,
  BRANCH_THEME_FIELDS,
} from "@/lib/theme/branchTheme";

type BranchThemeContextValue = {
  theme: BranchThemeFormValues;
  source: "default" | "custom";
  loading: boolean;
  branchId: string | null;
  tenantId: string | null;
  uploadedAt: string | null;
  refetch: () => Promise<unknown>;
};

const BranchThemeContext = React.createContext<BranchThemeContextValue | null>(null);

type QueryResult = {
  overrides: BranchThemeFormValues;
  source: "default" | "custom";
  uploadedAt: string | null;
};

export function BranchThemeProvider({ children }: { children: React.ReactNode }) {
  const { currentBranch, tenantId, loading: branchLoading } = useBranch();
  const branchId = currentBranch?.id ?? null;
  const supabase = React.useMemo(() => getSupabaseBrowserClient(), []);

  const enabled = Boolean(tenantId && branchId);

  const themeQuery = useQuery<QueryResult>({
    queryKey: ["branch-theme", tenantId, branchId],
    enabled,
    queryFn: async () => {
      if (!tenantId || !branchId) {
        return { overrides: DEFAULT_BRANCH_THEME, source: "default" as const, uploadedAt: null };
      }

      const { data, error } = await supabase
        .from("app_settings")
        .select("value")
        .eq("tenant_id", tenantId)
        .eq("branch_id", branchId)
        .eq("key", THEME_SETTINGS_KEY)
        .maybeSingle();

      if (error && error.code !== "PGRST116") {
        throw error;
      }

      if (!data?.value) {
        return { overrides: DEFAULT_BRANCH_THEME, source: "default" as const, uploadedAt: null };
      }

      const rawValue = data.value as Record<string, unknown>;
      const uploadedAt = typeof rawValue?.uploadedAt === "string" ? rawValue.uploadedAt : null;
      const overrides = sanitizeStoredTheme(rawValue);
      const isDefault = BRANCH_THEME_FIELDS.every((field) => overrides[field] === DEFAULT_BRANCH_THEME[field]);
      return {
        overrides: isDefault ? DEFAULT_BRANCH_THEME : overrides,
        source: isDefault ? "default" : ("custom" as const),
        uploadedAt,
      };
    },
    staleTime: 1000 * 30,
  });

  const overrides = themeQuery.data?.overrides ?? DEFAULT_BRANCH_THEME;
  const source = themeQuery.data?.source ?? "default";
  const uploadedAt = themeQuery.data?.uploadedAt ?? null;

  React.useEffect(() => {
    if (branchLoading) {
      applyTheme(DEFAULT_BRANCH_THEME);
      return;
    }
    if (!branchId) {
      applyTheme(DEFAULT_BRANCH_THEME);
      return;
    }
    applyTheme(overrides);
  }, [branchId, branchLoading, overrides]);

  const { refetch: refetchTheme, isLoading } = themeQuery;
  const refetch = React.useCallback(() => refetchTheme(), [refetchTheme]);

  const contextValue = React.useMemo<BranchThemeContextValue>(
    () => ({
      theme: overrides,
      source,
      loading: branchLoading || isLoading,
      branchId,
      tenantId: tenantId ?? null,
      uploadedAt,
      refetch,
    }),
    [overrides, source, branchLoading, isLoading, branchId, tenantId, uploadedAt, refetch]
  );

  return <BranchThemeContext.Provider value={contextValue}>{children}</BranchThemeContext.Provider>;
}

export function useBranchTheme() {
  const ctx = React.useContext(BranchThemeContext);
  if (!ctx) throw new Error("useBranchTheme debe usarse dentro de BranchThemeProvider");
  return ctx;
}
