// src/app/t/[slug]/layout.tsx
import type { ReactNode } from "react";
import BottomNav from "@/components/BottomNav";
import { BranchProvider } from "@/components/branch/BranchProvider";
import BranchSelector from "@/components/branch/BranchSelector";

export default function TenantLayout({ children }: { children: ReactNode }) {
  return (
    <BranchProvider>
      <div className="min-h-dvh">
        <BranchSelector />
        {/* Padding para no tapar contenido con la barra */}
        <main
          className="pb-24"
          style={{ paddingBottom: "calc(env(safe-area-inset-bottom, 0px) + 6rem)" }}
        >
          {children}
        </main>
        <BottomNav />
      </div>
    </BranchProvider>
  );
}
