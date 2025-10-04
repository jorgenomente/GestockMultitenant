// src/app/t/[slug]/layout.tsx
import type { ReactNode } from "react";
import BottomNav from "@/components/BottomNav";

export default function TenantLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-dvh">
      {/* Padding para no tapar contenido con la barra */}
      <main className="pb-24 md:pb-0">{children}</main>
      <BottomNav />
    </div>
  );
}
