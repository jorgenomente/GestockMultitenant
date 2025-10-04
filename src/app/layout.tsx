// src/app/layout.tsx
import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import Providers from "@/lib/providers";

const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin"], display: "swap" });
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"], display: "swap" });

export const metadata: Metadata = {
  title: "GeStock V2",
  description: "Gestión interna de precios, vencimientos y pedidos.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es">
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased min-h-dvh bg-white text-neutral-900 dark:bg-neutral-950 dark:text-neutral-100`}>
        <Providers>
          {/* sin padding por BottomNav global */}
          <main>{children}</main>
        </Providers>
      </body>
    </html>
  );
}
