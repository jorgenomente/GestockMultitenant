// src/lib/paths.ts

/** Helpers de rutas. Evita hardcodear URLs en la app. */
export const paths = {
  // Nivel tenant
  tenant: (tenant: string) => `/t/${tenant}`,
  admin:  (tenant: string) => `/t/${tenant}/admin`,

  // Nivel sucursal
  branch: (tenant: string, branch: string) => `/t/${tenant}/b/${branch}`,

  // Módulos por sucursal (1 sola page dinámica sirve para todas las sucursales)
  dashboard: (tenant: string, branch: string) => `/t/${tenant}/b/${branch}`,
  stock:     (tenant: string, branch: string) => `/t/${tenant}/b/${branch}/stock`,
  stats:     (tenant: string, branch: string) => `/t/${tenant}/b/${branch}/stats`,
  priceSearch:(tenant: string, branch: string) => `/t/${tenant}/b/${branch}/price-search`,
  invoices:  (tenant: string, branch: string) => `/t/${tenant}/b/${branch}/invoices`,
  payments:  (tenant: string, branch: string) => `/t/${tenant}/b/${branch}/payments`,
  depoFreezer:(tenant: string, branch: string) => `/t/${tenant}/b/${branch}/depo/freezer`,
  tasks:     (tenant: string, branch: string) => `/t/${tenant}/b/${branch}/tasks`,
  expirations:(tenant: string, branch: string) => `/t/${tenant}/b/${branch}/expirations`,
  settings:  (tenant: string, branch: string) => `/t/${tenant}/b/${branch}/settings`,
} as const;

// Utilidades convenientes
export type TenantSlug = string;
export type BranchSlug = string;

export function ensureBranchPath(tenant: TenantSlug, branch: BranchSlug, subpath = "") {
  const base = paths.branch(tenant, branch);
  return subpath ? `${base}/${subpath.replace(/^\/+/, "")}` : base;
}
