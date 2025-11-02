"use client";

import { useMemo, useState, type JSX } from "react";
import clsx from "clsx";
import { ArrowUpRight, CalendarClock } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import DashboardDemoView from "../views/DashboardDemoView";
import PricesDemoView from "../views/PricesDemoView";
import ProvidersDemoView from "../views/ProvidersDemoView";
import OrdersDemoView from "../views/OrdersDemoView";
import ExpiriesDemoView from "../views/ExpiriesDemoView";

const NAV_SECTIONS = [
  {
    id: "dashboard",
    label: "Inicio",
    description: "Métricas clave y actividad reciente en todas las sucursales.",
  },
  {
    id: "prices",
    label: "Precios",
    description: "Listas sincronizadas, márgenes sugeridos y simulaciones de cambio.",
  },
  {
    id: "providers",
    label: "Proveedores",
    description: "Planificación semanal, responsables y alertas críticas para cada socio comercial.",
  },
  {
    id: "orders",
    label: "Estadísticas",
    description: "Flujo de compras a proveedores y KPIs claves en un mismo lugar.",
  },
  {
    id: "expiries",
    label: "Vencimientos",
    description: "Lotes críticos y recomendaciones para evitar quiebres o pérdidas.",
  },
] as const;

type SectionId = typeof NAV_SECTIONS[number]["id"];

type SectionRenderer = {
  id: SectionId;
  render: () => JSX.Element;
};

const SECTION_RENDERERS: SectionRenderer[] = [
  { id: "dashboard", render: () => <DashboardDemoView /> },
  { id: "prices", render: () => <PricesDemoView /> },
  { id: "providers", render: () => <ProvidersDemoView /> },
  { id: "orders", render: () => <OrdersDemoView /> },
  { id: "expiries", render: () => <ExpiriesDemoView /> },
];

export default function DemoExperience() {
  const [activeSection, setActiveSection] = useState<SectionId>("dashboard");
  const activeCopy = useMemo(
    () => NAV_SECTIONS.find((section) => section.id === activeSection),
    [activeSection]
  );
  const renderer = SECTION_RENDERERS.find((section) => section.id === activeSection);

  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-12 px-4 py-16 sm:px-6 lg:px-8">
      <header className="mx-auto flex max-w-4xl flex-col items-center text-center gap-4">
        <Badge variant="secondary">Demo pública · Datos ficticios</Badge>
        <h1 className="text-balance text-4xl font-semibold tracking-tight sm:text-5xl">
          Explorá Gestock sin credenciales
        </h1>
        <p className="text-balance text-lg text-muted-foreground sm:text-xl">
          Navegá por un entorno aislado que replica la experiencia real: métricas, listas de precios, pedidos y alertas con información de ejemplo lista para mostrar en tu portafolio.
        </p>
        <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
          <Button asChild variant="secondary">
            <a href="/demo/dashboard" className="flex items-center gap-2">
              Ver interfaz demo
              <ArrowUpRight className="h-4 w-4" aria-hidden="true" />
            </a>
          </Button>
          <Button asChild>
            <a href="/login" className="flex items-center gap-2">
              Ir a la app real
              <ArrowUpRight className="h-4 w-4" aria-hidden="true" />
            </a>
          </Button>
          <Button asChild variant="outline">
            <a href="mailto:hola@gestock.app" className="flex items-center gap-2">
              Coordinar demo guiada
              <CalendarClock className="h-4 w-4" aria-hidden="true" />
            </a>
          </Button>
        </div>
      </header>

      <div className="grid gap-6 lg:grid-cols-[320px,1fr]">
        <aside className="self-start rounded-3xl border border-border/60 bg-card/90 p-6 shadow-[var(--shadow-card)] backdrop-blur-md">
          <div className="space-y-4">
            <div>
              <h2 className="text-lg font-semibold tracking-tight">Mapa interactivo</h2>
              <p className="text-sm text-muted-foreground">
                Seleccioná una sección para ver cómo opera Gestock con información simulada.
              </p>
            </div>
            <div className="flex flex-col gap-3">
              {NAV_SECTIONS.map((section) => (
                <button
                  key={section.id}
                  type="button"
                  onClick={() => setActiveSection(section.id)}
                  className={clsx(
                    "rounded-2xl border border-transparent p-4 text-left transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-card",
                    "bg-card/40 hover:border-border/70 hover:bg-card/70",
                    activeSection === section.id &&
                      "border-primary bg-primary/10 shadow-[var(--shadow-elevated)]"
                  )}
                >
                  <p className="text-sm font-semibold text-foreground">{section.label}</p>
                  <p className="mt-1 text-xs text-muted-foreground">{section.description}</p>
                </button>
              ))}
            </div>
          </div>
        </aside>

        <section className="rounded-[2.5rem] border border-border/60 bg-card/95 shadow-[var(--shadow-elevated)]">
          <div className="border-b border-border/50 p-6 sm:p-8">
            <Badge variant="muted" className="mb-3">
              Vista demo · {activeCopy?.label ?? ""}
            </Badge>
            <h2 className="text-2xl font-semibold tracking-tight sm:text-3xl">
              {activeCopy?.label}
            </h2>
            <p className="mt-2 max-w-3xl text-sm text-muted-foreground">
              {activeCopy?.description}
            </p>
          </div>
          <div className="p-6 sm:p-8">
            {renderer?.render()}
          </div>
        </section>
      </div>

      <footer className="mx-auto max-w-4xl text-center text-sm text-muted-foreground">
        Este entorno no ejecuta llamadas reales ni altera datos de producción. Todo el contenido es generado para fines demostrativos.
      </footer>
    </div>
  );
}



