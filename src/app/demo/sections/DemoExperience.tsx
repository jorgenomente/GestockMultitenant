"use client";

import { useEffect, useMemo, useState, type JSX } from "react";
import clsx from "clsx";
import { ArrowUpRight, CalendarClock } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import DashboardDemoView from "../views/DashboardDemoView";
import PricesDemoView from "../views/PricesDemoView";
import ProvidersDemoView from "../views/ProvidersDemoView";
import OrdersDemoView from "../views/OrdersDemoView";
import ExpiriesDemoView from "../views/ExpiriesDemoView";
import { useDemoTheme } from "../components/DemoThemeProvider";

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
  const { activePresetId, applyPreset } = useDemoTheme();

  useEffect(() => {
    if (activePresetId !== "nocturno") {
      applyPreset("nocturno");
    }
  }, [activePresetId, applyPreset]);

  return (
    <div className="relative isolate">
      <div className="pointer-events-none absolute inset-0 -z-20 bg-[color:var(--surface-overlay-strong)]" />
      <div
        className="pointer-events-none absolute inset-0 -z-10 opacity-90"
        style={{
          background:
            "radial-gradient(circle at 10% -10%, var(--color-action-secondary-glow) 0%, rgba(2, 6, 23, 0.92) 52%, var(--color-dark-bg-main) 100%)",
        }}
      />
      <div
        className="pointer-events-none absolute inset-x-0 top-[35%] -z-10 h-[65%] bg-[color:var(--surface-background-overlay)]/70 blur-3xl"
      />

      <div className="mx-auto flex max-w-6xl flex-col gap-12 px-4 py-16 text-[color:var(--color-dark-text-primary)] sm:px-6 lg:px-8">
        <header className="mx-auto flex max-w-4xl flex-col items-center text-center gap-4">
          <h1 className="text-balance text-4xl font-semibold tracking-tight text-[color:var(--color-dark-text-primary)] sm:text-5xl">
          Explorá Gestock
          </h1>
          <p className="text-balance text-lg text-[color:var(--color-dark-text-primary)] sm:text-xl">
          Navegá la interfaz de GeStock, una solución creada para optimizar la organización de tiendas físicas.
Esta es una versión demostrativa, por lo que algunos módulos y funciones no están habilitados
          </p>
          <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
            <Button
              asChild
              variant="secondary"
              className="border-transparent bg-[color:var(--surface-action-primary-strong)] text-[color:var(--color-action-secondary)] hover:bg-[color:var(--surface-action-primary-strong)]/90"
            >
              <a href="/demo/dashboard" className="flex items-center gap-2">
                Ver interfaz demo
                <ArrowUpRight className="h-4 w-4" aria-hidden="true" />
              </a>
            </Button>
          </div>
        </header>

        <div className="grid gap-6 lg:grid-cols-[320px,1fr]">
          <aside className="self-start rounded-3xl border border-[color:var(--color-dark-divider)] bg-[color:var(--surface-overlay-soft)]/80 p-6 shadow-[var(--shadow-card)] backdrop-blur-xl">
            <div className="space-y-4">
              <div>
                <h2 className="text-lg font-semibold tracking-tight text-[color:var(--color-dark-text-primary)]">
                  Mapa interactivo
                </h2>
                <p className="text-sm text-[color:var(--color-dark-text-secondary)]">
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
                      "rounded-2xl border border-transparent bg-[color:var(--surface-nav-soft)]/60 p-4 text-left transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-action-secondary)] focus-visible:ring-offset-2 focus-visible:ring-offset-[color:var(--surface-nav-soft)]",
                      "text-[color:var(--color-dark-text-secondary)] hover:border-[color:var(--color-action-secondary)]/40 hover:bg-[color:var(--surface-nav-hover)]/70",
                      activeSection === section.id &&
                        "border-[color:var(--color-action-secondary)] bg-[color:var(--surface-action-primary-soft)] text-[color:var(--color-dark-text-primary)] shadow-[var(--shadow-elevated)]"
                    )}
                  >
                    <p className="text-sm font-semibold text-[color:var(--color-dark-text-primary)]">{section.label}</p>
                    <p className="mt-1 text-xs text-[color:var(--color-dark-text-secondary)]">{section.description}</p>
                  </button>
                ))}
              </div>
            </div>
          </aside>

          <section className="rounded-[2.5rem] border border-[color:var(--color-dark-divider)] bg-[color:var(--surface-overlay-strong)] shadow-[var(--shadow-elevated)]">
            <div className="border-b border-[color:var(--color-dark-divider)]/60 p-6 sm:p-8">
              <Badge
                variant="muted"
                className="mb-3 border-transparent bg-[color:var(--surface-secondary-soft)] text-[color:var(--color-dark-text-secondary)]"
              >
                Vista demo · {activeCopy?.label ?? ""}
              </Badge>
              <h2 className="text-2xl font-semibold tracking-tight text-[color:var(--color-dark-text-primary)] sm:text-3xl">
                {activeCopy?.label}
              </h2>
              <p className="mt-2 max-w-3xl text-sm text-[color:var(--color-dark-text-secondary)]">
                {activeCopy?.description}
              </p>
            </div>
            <div className="p-6 sm:p-8">
              {renderer?.render()}
            </div>
          </section>
        </div>

        <footer className="mx-auto max-w-4xl text-center text-sm text-[color:var(--color-dark-text-secondary)]">
          Este entorno no ejecuta llamadas reales ni altera datos de producción. Todo el contenido es generado para fines demostrativos.
        </footer>
      </div>
    </div>
  );
}
