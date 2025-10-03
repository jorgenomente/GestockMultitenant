// src/app/layout.tsx
import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import BottomNav from "@/components/BottomNav";
import Providers from "@/lib/providers"; // 👈 este es el wrapper de React Query (NO providers-data)

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
  display: "swap",
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "GeStock V2",
  description: "Gestión interna de precios, vencimientos y pedidos.",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="es">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased min-h-dvh bg-white text-neutral-900 dark:bg-neutral-950 dark:text-neutral-100`}
      >
        {/* React Query Provider para toda la app */}
        <Providers>
          {/* Importante: este padding-bottom evita que el contenido quede oculto tras el BottomNav */}
          <main className="pb-24">{children}</main>

          {/* Barra de navegación inferior (global: mobile y desktop) */}
          <BottomNav />
        </Providers>
      </body>
    </html>
  );
}
