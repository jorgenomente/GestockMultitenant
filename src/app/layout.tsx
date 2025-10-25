// src/app/layout.tsx
import type { Metadata } from "next";
import type { ReactNode } from "react";
import { Inter, Manrope, Roboto_Mono } from "next/font/google";
import "./globals.css";
import Providers from "@/lib/providers";
import UserBranchIndicator from "@/components/UserBranchIndicator";

const manrope = Manrope({ subsets: ["latin"], display: "swap", variable: "--font-family-heading" });
const inter = Inter({ subsets: ["latin"], display: "swap", variable: "--font-family-body" });
const robotoMono = Roboto_Mono({ subsets: ["latin"], display: "swap", variable: "--font-family-mono" });

export const metadata: Metadata = {
  title: "Gestock Multitenant",
  description: "Gestión interna de precios, vencimientos y pedidos.",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="es">
      <body
        className={`${manrope.variable} ${inter.variable} ${robotoMono.variable} antialiased min-h-dvh bg-background text-foreground`}
      >
        <Providers>
          <div className="min-h-dvh">
            <UserBranchIndicator />
            {/* sin padding por BottomNav global */}
            <main>{children}</main>
          </div>
        </Providers>
      </body>
    </html>
  );
}
