// src/app/layout.tsx
import type { Metadata } from "next";
import { Suspense, type ReactNode } from "react";
import "./globals.css";
import Providers from "@/lib/providers";
import { BranchProvider } from "@/components/branch/BranchProvider";
import UserBranchIndicator from "@/components/UserBranchIndicator";

export const metadata: Metadata = {
  title: "Gestock Multitenant",
  description: "Gestión interna de precios, vencimientos y pedidos.",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="es">
      <body className="antialiased min-h-dvh bg-background text-foreground">
        <Providers>
          <BranchProvider>
            <div className="min-h-dvh">
              <Suspense
                fallback={
                  <div className="border-b border-border/70 bg-card/90 px-4 py-3 text-xs text-muted-foreground">
                    Cargando navegación…
                  </div>
                }
              >
                <UserBranchIndicator />
              </Suspense>
              {/* sin padding por BottomNav global */}
              <main>{children}</main>
            </div>
          </BranchProvider>
        </Providers>
      </body>
    </html>
  );
}
