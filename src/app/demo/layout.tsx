// src/app/demo/layout.tsx
import type { Metadata } from "next";
import type { ReactNode } from "react";

export const metadata: Metadata = {
  title: "Gestock · Demo interactiva",
  description: "Navegá una versión sandbox de Gestock con datos ficticios.",
};

export default function DemoLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-dvh bg-muted/20 text-foreground">
      {children}
    </div>
  );
}
