"use client";

import ProvidersPageClient from "@/components/mobile/ProvidersPageClient";
import { useBranch } from "@/components/branch/BranchProvider";
import { useParams } from "next/navigation";

export default function ProvidersPage() {
  const { slug } = useParams<{ slug?: string }>();
  const { currentBranch, loading, error, tenantId } = useBranch();

  const tenantSlug = (slug ?? "").toString();

  if (!tenantSlug) {
    return <div className="p-4 text-sm text-neutral-500">Falta el tenant en la URL.</div>;
  }

  if (loading) {
    return <div className="p-4 text-sm text-neutral-500">Cargando sucursales…</div>;
  }

  if (error) {
    return <div className="p-4 text-sm text-red-600">{error}</div>;
  }

  if (!currentBranch) {
    return <div className="p-4 text-sm text-neutral-500">No hay sucursal seleccionada.</div>;
  }

  if (!tenantId) {
    return <div className="p-4 text-sm text-neutral-500">No hay tenant disponible.</div>;
  }

  return (
    <ProvidersPageClient
      slug={tenantSlug}
      branch={currentBranch.slug}
      tenantId={tenantId}
      branchId={currentBranch.id}
    />
  );
}
