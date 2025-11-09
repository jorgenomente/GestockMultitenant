// src/app/t/[slug]/layout.tsx
import type { CSSProperties, ReactNode } from "react";
import BottomNav from "@/components/BottomNav";
import { BranchProvider } from "@/components/branch/BranchProvider";
import BranchSelector from "@/components/branch/BranchSelector";
import { BranchThemeProvider } from "@/components/theme/BranchThemeProvider";
import { getSupabaseUserServerClient } from "@/lib/supabaseServer";

export default async function TenantLayout({ children }: { children: ReactNode }) {
  const supabase = await getSupabaseUserServerClient();
  const { data: { user } } = await supabase.auth.getUser();

  const unauthenticatedLayout = (
    <div className="min-h-dvh md:bg-background">
      <main
        className="pb-[calc(var(--bottom-safe,0px)+6rem)] md:pb-12 md:pl-0"
        style={{ "--bottom-safe": "env(safe-area-inset-bottom)" } as CSSProperties}
      >
        {children}
      </main>
    </div>
  );

  const authenticatedLayout = (
    <div className="min-h-dvh md:flex md:bg-background">
      <BottomNav />
      <div className="flex-1 md:min-h-dvh md:overflow-x-hidden md:pl-0">
        <BranchSelector />
        {/* Padding móvil compensando el BottomNav */}
        <main
          className="pb-[calc(var(--bottom-safe,0px)+6rem)] md:pb-12 md:pl-0"
          style={{ "--bottom-safe": "env(safe-area-inset-bottom)" } as CSSProperties}
        >
          {children}
        </main>
      </div>
    </div>
  );

  return (
    <BranchProvider>
      <BranchThemeProvider>{user ? authenticatedLayout : unauthenticatedLayout}</BranchThemeProvider>
    </BranchProvider>
  );
}
