"use client";

import { useEffect, useMemo, type JSX } from "react";
import { ArrowUpRight, BarChart3, Building2, LineChart, PackageCheck, ShieldCheck } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import DashboardDemoView from "../views/DashboardDemoView";
import PricesDemoView from "../views/PricesDemoView";
import ProvidersDemoView from "../views/ProvidersDemoView";
import OrdersDemoView from "../views/OrdersDemoView";
import ExpiriesDemoView from "../views/ExpiriesDemoView";
import { useDemoTheme } from "../components/DemoThemeProvider";
import { cn } from "@/lib/utils";
import { DEFAULT_BRANCH_THEME, adjustLightness, type BranchThemeFormValues } from "@/lib/theme/branchTheme";

const NAV_SECTIONS = [
  {
    id: "dashboard",
    label: "Inicio",
    description: "Métricas clave de la operación de tu negocio.",
    icon: LineChart,
    accent: "from-purple-500/20 via-blue-500/10 to-transparent",
  },
  {
    id: "prices",
    label: "Precios",
    description: "Chequea el precio de tus productos al instante con un scanner de código de barras integrado. Ideal para que los vendedores puedan asistir a los clientes en la búsqueda de precios sin abandonar la góndola.",
    icon: BarChart3,
    accent: "from-amber-500/20 via-orange-500/10 to-transparent",
  },
  {
    id: "providers",
    label: "Proveedores",
    description: "Planificación semanal, responsables y alertas críticas para cada socio comercial.",
    icon: Building2,
    accent: "from-emerald-500/20 via-teal-500/10 to-transparent",
  },
  {
    id: "orders",
    label: "Estadísticas",
    description: "Flujo de compras a proveedores y KPIs claves en un mismo lugar.",
    icon: PackageCheck,
    accent: "from-sky-500/20 via-cyan-500/10 to-transparent",
  },
  {
    id: "expiries",
    label: "Vencimientos",
    description: "Lotes críticos y recomendaciones para evitar quiebres o pérdidas.",
    icon: ShieldCheck,
    accent: "from-rose-500/20 via-pink-500/10 to-transparent",
  },
] as const;

type SectionId = typeof NAV_SECTIONS[number]["id"];

const SECTION_RENDERERS: Record<SectionId, () => JSX.Element> = {
  dashboard: () => <DashboardDemoView />,
  prices: () => <PricesDemoView />,
  providers: () => <ProvidersDemoView />,
  orders: () => <OrdersDemoView />,
  expiries: () => <ExpiriesDemoView />,
};

export default function DemoExperience() {
  const { theme, activePresetId, applyPreset, presets } = useDemoTheme();
  const heroTone = useMemo(() => createHeroTone(theme ?? DEFAULT_BRANCH_THEME), [theme]);

  useEffect(() => {
    if (!activePresetId) {
      applyPreset("nocturno");
    }
  }, [activePresetId, applyPreset]);

  return (
    <div className="relative isolate overflow-hidden">
      <div className="pointer-events-none absolute inset-0 -z-20" style={{ background: heroTone.pageBaseBackground }} />
      <div className="pointer-events-none absolute inset-0 -z-10" style={{ background: heroTone.pageRadialOverlay }} />
      <div className="pointer-events-none absolute inset-0 -z-10" style={{ background: heroTone.pageLinearOverlay }} />
      <div
        className="pointer-events-none absolute inset-x-0 top-48 -z-10 h-[70%] blur-[140px]"
        style={{ background: heroTone.pageBlurOverlay }}
      />
      <div className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-24" style={{ background: heroTone.pageTopGlow }} />

      <div className="mx-auto flex max-w-6xl flex-col gap-12 px-4 py-16 text-[color:var(--color-dark-text-primary)] sm:px-6 lg:px-8">
        <header
          className="relative mx-auto flex w-full max-w-5xl flex-col items-center gap-6 rounded-[2.75rem] border px-6 py-10 text-center backdrop-blur-3xl sm:px-12"
          style={{
            background: heroTone.heroBackground,
            borderColor: heroTone.heroBorder,
            boxShadow: heroTone.heroShadow,
          }}
        >
          <Badge
            className="text-[0.65rem] font-semibold uppercase tracking-[0.35em]"
            style={{
              backgroundColor: heroTone.badgeBg,
              borderColor: heroTone.badgeBorder,
              color: heroTone.badgeText,
            }}
          >
            Demo guiada
          </Badge>
          <div className="space-y-5">
            <h1 className="text-balance text-4xl font-semibold tracking-tight text-[color:var(--color-dark-text-primary)] sm:text-5xl">
              Explorá Gestock
            </h1>
            <p className="text-balance text-lg text-[color:var(--color-dark-text-primary)] sm:text-2xl">
              Navegá la interfaz de GeStock, una aplicación web optimizada para organizar tiendas físicas.
            </p>
            <p className="text-balance text-sm text-white sm:text-base">
              Esta es una versión demostrativa, el contenido de los módulos depende de las necesidades de cada negocio.
            </p>
          </div>
          <div className="flex flex-wrap items-center justify-center gap-3">
            <Button
              asChild
              variant="secondary"
              className="border border-white/20 bg-gradient-to-r from-[#0F172A] via-[#1E1B4B] to-[color:var(--color-action-primary)] text-white shadow-[0_25px_55px_rgba(6,11,25,0.75)] transition-all hover:scale-[1.02]"
            >
              <a href="/demo/dashboard" className="flex items-center gap-2 text-base">
                Ver interfaz demo
                <ArrowUpRight className="h-4 w-4" aria-hidden="true" />
              </a>
            </Button>
          </div>
        </header>

        <section
          className="rounded-[2.75rem] border p-6 backdrop-blur-2xl sm:p-10"
          style={{
            background: heroTone.themeSectionBg,
            borderColor: heroTone.themeSectionBorder,
            boxShadow: heroTone.themeSectionShadow,
          }}
        >
          <div className="flex flex-col gap-3 pb-6 sm:flex-row sm:items-center sm:justify-between">
            <div className="space-y-1 text-[color:var(--color-dark-text-primary)]">
              <p className="text-sm font-medium uppercase tracking-[0.4em] text-[color:var(--color-dark-text-secondary)]">
                Personalizá la demo
              </p>
              <h2 className="text-2xl font-semibold">Elegí un tema de colores</h2>
              <p className="text-sm text-[color:var(--color-dark-text-secondary)]">
                Aplicá un estilo y mirá cómo toda la interfaz adopta el mood que más te sirva para la demostración.
              </p>
            </div>
            <span
              className="inline-flex items-center gap-2 rounded-full border px-4 py-2 text-xs uppercase tracking-widest text-[color:var(--color-dark-text-primary)]"
              style={{
                backgroundColor: heroTone.themeSectionLabelBg,
                borderColor: heroTone.themeSectionLabelBorder,
              }}
            >
              3 combinaciones curadas
            </span>
          </div>
          <div className="grid gap-4 md:grid-cols-3">
            {presets.slice(0, 3).map((preset) => {
              const gradient = `linear-gradient(135deg, ${preset.palette[0]} 0%, ${preset.palette[1]} 55%, ${preset.palette[2] ?? preset.palette[0]} 100%)`;
              const isActive = activePresetId === preset.id;

              return (
                <button
                  key={preset.id}
                  type="button"
                  onClick={() => applyPreset(preset.id)}
                  aria-pressed={isActive}
                  className={cn(
                    "group flex h-full flex-col gap-4 rounded-[2rem] border-2 p-5 text-left transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/50",
                    isActive
                      ? "border-white/70 shadow-[0_20px_50px_rgba(2,6,23,0.45)]"
                      : "border-white/20 hover:border-white/40"
                  )}
                  style={{ background: heroTone.presetCardBg }}
                >
                  <div
                    className="rounded-[1.5rem] border border-white/20 p-4 shadow-inner"
                    style={{ background: gradient }}
                  >
                    <p
                      className="text-lg font-semibold"
                      style={{ color: preset.values.textPrimary }}
                    >
                      {preset.name}
                    </p>
                    <p
                      className="text-xs"
                      style={{ color: preset.values.textSecondary }}
                    >
                      {preset.description}
                    </p>
                  </div>
                  <div className="flex items-center justify-between gap-3">
                    <div className="space-y-1">
                      <p className="text-sm font-semibold text-[color:var(--color-dark-text-primary)]">
                        {isActive ? "Aplicado" : "Aplicar preset"}
                      </p>
                      <p className="text-xs text-[color:var(--color-dark-text-secondary)]">
                        Textos se adaptan para mantener contraste ideal.
                      </p>
                    </div>
                    <div className="flex items-center gap-1">
                      {preset.palette.map((color) => (
                        <span
                          key={color}
                          className="h-8 w-8 rounded-full border"
                          style={{
                            background: color,
                            borderColor: isActive ? "rgba(255,255,255,0.6)" : "rgba(255,255,255,0.4)",
                          }}
                          aria-hidden="true"
                        />
                      ))}
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </section>

        <section
          className="rounded-[2.75rem] border"
          style={{
            background: heroTone.accordionShellBg,
            borderColor: heroTone.accordionShellBorder,
            boxShadow: heroTone.accordionShellShadow,
          }}
        >
          <div className="flex items-center justify-between px-6 pb-4 pt-6 text-sm text-[color:var(--color-dark-text-secondary)] sm:px-10">
            <p>Elegí un módulo para desplegar la vista en vivo.</p>
            <span
                className="rounded-full border px-3 py-1 text-xs uppercase tracking-widest"
                style={{
                  background: heroTone.accordionHeaderBadgeBg,
                  borderColor: heroTone.accordionHeaderBadgeBorder,
                  color: heroTone.badgeText,
                }}
              >
                Modo demo
              </span>
            </div>
            <Accordion
              type="single"
              collapsible
              defaultValue="dashboard"
              className="divide-y"
              style={{ borderColor: heroTone.accordionShellBorder }}
            >
              {NAV_SECTIONS.map((section) => {
                const renderView = SECTION_RENDERERS[section.id];
                const Icon = section.icon;

                return (
                  <AccordionItem key={section.id} value={section.id} className="border-0">
                    <AccordionTrigger className="group relative gap-4 overflow-hidden rounded-[2rem] px-4 py-5 text-left text-lg font-semibold tracking-tight text-[color:var(--color-dark-text-primary)] transition-all hover:no-underline sm:px-8">
                      <span
                        aria-hidden="true"
                        className="pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-300 group-data-[state=open]:opacity-100"
                        style={{ background: heroTone.accordionTriggerActiveBg }}
                      />
                      <div className="relative flex w-full items-center gap-4">
                        <div
                          className="relative flex size-12 items-center justify-center rounded-2xl border text-[color:var(--color-dark-text-primary)] shadow-inner"
                          style={{
                            background: heroTone.infoCardBg,
                            borderColor: heroTone.infoCardBorder,
                          }}
                        >
                          <div className={`absolute inset-0 rounded-2xl bg-gradient-to-br ${section.accent} opacity-0 transition-opacity duration-300 group-data-[state=open]:opacity-100`} />
                          <Icon className="relative h-5 w-5" aria-hidden="true" />
                        </div>
                        <div className="flex-1 text-left">
                          <p className="text-base sm:text-lg">{section.label}</p>
                          <p className="text-xs font-normal text-[color:var(--color-dark-text-secondary)]">
                            {section.description}
                          </p>
                        </div>
                        <div className="hidden items-center gap-2 text-xs uppercase tracking-tight text-[color:var(--color-dark-text-secondary)] sm:flex">
                          Desplegar
                        </div>
                      </div>
                    </AccordionTrigger>
                    <AccordionContent className="px-0 text-[color:var(--color-dark-text-primary)]">
                      <div
                        className="rounded-[2.25rem] border p-5 sm:p-8"
                        style={{
                          background: heroTone.accordionContentBg,
                          borderColor: heroTone.accordionContentBorder,
                        }}
                      >
                        <Badge
                          variant="muted"
                          className="mb-3"
                          style={{
                            background: heroTone.accordionHeaderBadgeBg,
                            borderColor: heroTone.accordionHeaderBadgeBorder,
                            color: heroTone.badgeText,
                          }}
                        >
                          Vista demo · {section.label}
                        </Badge>
                        <p className="text-sm text-[color:var(--color-dark-text-secondary)]">
                          {section.description}
                        </p>
                        <div
                          className="mt-6 rounded-[1.75rem] border p-0 sm:p-2"
                          style={{
                            background: heroTone.accordionInnerSurfaceBg,
                            borderColor: heroTone.accordionContentBorder,
                          }}
                        >
                          <div className="rounded-[1.5rem] border bg-background/90 p-2 sm:p-4" style={{ borderColor: heroTone.accordionInnerSurfaceBg }}>
                            {renderView?.()}
                          </div>
                        </div>
                      </div>
                    </AccordionContent>
                  </AccordionItem>
                );
              })}
            </Accordion>
          </section>

        <footer className="mx-auto max-w-4xl text-center text-sm text-[color:var(--color-dark-text-secondary)]">
          Este entorno no ejecuta llamadas reales ni altera datos de producción. Todo el contenido es generado para fines demostrativos.
        </footer>
      </div>
    </div>
  );
}

type HeroTone = {
  heroBackground: string;
  heroBorder: string;
  heroShadow: string;
  badgeBg: string;
  badgeBorder: string;
  badgeText: string;
  themeSectionBg: string;
  themeSectionBorder: string;
  themeSectionShadow: string;
  themeSectionLabelBg: string;
  themeSectionLabelBorder: string;
  presetCardBg: string;
  infoCardBg: string;
  infoCardBorder: string;
  accordionShellBg: string;
  accordionShellBorder: string;
  accordionShellShadow: string;
  accordionHeaderBadgeBg: string;
  accordionHeaderBadgeBorder: string;
  accordionTriggerActiveBg: string;
  accordionContentBg: string;
  accordionContentBorder: string;
  accordionInnerSurfaceBg: string;
  pageBaseBackground: string;
  pageRadialOverlay: string;
  pageLinearOverlay: string;
  pageBlurOverlay: string;
  pageTopGlow: string;
  isLightTheme: boolean;
};

function createHeroTone(theme: BranchThemeFormValues): HeroTone {
  const background = ensureHex(theme.background, DEFAULT_BRANCH_THEME.background);
  const primary = ensureHex(theme.primary, DEFAULT_BRANCH_THEME.primary);
  const textPrimary = ensureHex(theme.textPrimary, DEFAULT_BRANCH_THEME.textPrimary);
  const isLight = isLightColor(background);
  const heroStart = isLight ? adjustLightness(primary, 0.35) : adjustLightness(background, -0.05);
  const heroMid = isLight ? adjustLightness(primary, 0.12) : adjustLightness(primary, -0.02);
  const heroEnd = isLight ? adjustLightness(primary, -0.1) : adjustLightness(primary, 0.22);

  const heroBackground = `linear-gradient(135deg, ${toRgba(heroStart, isLight ? 0.98 : 0.9)}, ${toRgba(heroMid, isLight ? 0.65 : 0.75)}, ${toRgba(heroEnd, 0.55)})`;

  const heroBorder = isLight ? "rgba(15,23,42,0.12)" : "rgba(255,255,255,0.16)";
  const heroShadow = isLight ? "0 25px 60px rgba(15,23,42,0.18)" : "0 30px 90px rgba(2,6,23,0.6)";
  const translucentChipBg = isLight ? "rgba(15,23,42,0.06)" : "rgba(255,255,255,0.08)";
  const translucentChipBorder = isLight ? "rgba(15,23,42,0.12)" : "rgba(255,255,255,0.12)";
  const infoCardBg = isLight ? "rgba(15,23,42,0.05)" : "rgba(255,255,255,0.04)";
  const infoCardBorder = isLight ? "rgba(15,23,42,0.08)" : "rgba(255,255,255,0.08)";
  const accordionShellBg = isLight ? "rgba(255,255,255,0.97)" : toRgba(background, 0.78);
  const accordionShellBorder = isLight ? "rgba(15,23,42,0.12)" : "rgba(255,255,255,0.1)";
  const accordionShellShadow = heroShadow;
  const accordionHeaderBadgeBg = isLight ? "rgba(15,23,42,0.06)" : "rgba(255,255,255,0.08)";
  const accordionHeaderBadgeBorder = isLight ? "rgba(15,23,42,0.14)" : "rgba(255,255,255,0.14)";
  const accordionTriggerActiveBg = isLight ? "rgba(15,23,42,0.08)" : "rgba(255,255,255,0.06)";
  const accordionContentBg = isLight ? "rgba(255,255,255,0.96)" : toRgba(background, 0.82);
  const accordionContentBorder = isLight ? "rgba(15,23,42,0.08)" : "rgba(255,255,255,0.08)";
  const accordionInnerSurfaceBg = isLight ? "rgba(15,23,42,0.05)" : "rgba(255,255,255,0.04)";

  return {
    heroBackground,
    heroBorder,
    heroShadow,
    badgeBg: translucentChipBg,
    badgeBorder: translucentChipBorder,
    badgeText: textPrimary,
    themeSectionBg: isLight ? "rgba(255,255,255,0.95)" : "rgba(15,23,42,0.55)",
    themeSectionBorder: heroBorder,
    themeSectionShadow: heroShadow,
    themeSectionLabelBg: isLight ? "rgba(15,23,42,0.08)" : "rgba(255,255,255,0.12)",
    themeSectionLabelBorder: translucentChipBorder,
    presetCardBg: isLight ? "rgba(15,23,42,0.04)" : "rgba(255,255,255,0.05)",
    infoCardBg,
    infoCardBorder,
    accordionShellBg,
    accordionShellBorder,
    accordionShellShadow,
    accordionHeaderBadgeBg,
    accordionHeaderBadgeBorder,
    accordionTriggerActiveBg,
    accordionContentBg,
    accordionContentBorder,
    accordionInnerSurfaceBg,
    pageBaseBackground: isLight ? "#F8FAFC" : background,
    pageRadialOverlay: isLight
      ? `radial-gradient(circle at 25% 10%, rgba(255,255,255,0.95) 0%, ${toRgba(adjustLightness(primary, 0.35), 0.55)} 40%, ${toRgba(background, 0.92)} 85%)`
      : "radial-gradient(circle at 10% -10%, var(--color-action-secondary-glow) 0%, rgba(2, 6, 23, 0.92) 52%, var(--color-dark-bg-main) 100%)",
    pageLinearOverlay: isLight
      ? `linear-gradient(130deg, rgba(148,163,184,0.25), rgba(148,163,184,0.08))`
      : "linear-gradient(120deg, rgba(64,112,255,0.08), rgba(255,79,133,0.05))",
    pageBlurOverlay: isLight ? "rgba(148,163,184,0.25)" : "rgba(15,23,42,0.55)",
    pageTopGlow: isLight ? "linear-gradient(to bottom, rgba(255,255,255,0.9), transparent)" : "linear-gradient(to bottom, rgba(255,255,255,0.1), transparent)",
    isLightTheme: isLight,
  };
}

function ensureHex(value: string | undefined, fallback: string): string {
  if (typeof value !== "string") return fallback;
  const trimmed = value.trim();
  if (/^#[0-9a-fA-F]{6}$/.test(trimmed)) return trimmed.toUpperCase();
  if (/^#[0-9a-fA-F]{3}$/.test(trimmed)) {
    const r = trimmed[1];
    const g = trimmed[2];
    const b = trimmed[3];
    return `#${r}${r}${g}${g}${b}${b}`.toUpperCase();
  }
  return fallback;
}

function isLightColor(hex: string): boolean {
  return getLuminance(hex) > 0.6;
}

function getLuminance(hex: string): number {
  const rgb = hexToRgb(hex);
  if (!rgb) return 0;
  const transform = (channel: number) => {
    const normalized = channel / 255;
    return normalized <= 0.03928 ? normalized / 12.92 : Math.pow((normalized + 0.055) / 1.055, 2.4);
  };
  const r = transform(rgb.r);
  const g = transform(rgb.g);
  const b = transform(rgb.b);
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

function hexToRgb(hex: string): { r: number; g: number; b: number } | null {
  const match = hex.trim().match(/^#([0-9A-F]{6})$/i);
  if (!match) return null;
  const int = parseInt(match[1], 16);
  return {
    r: (int >> 16) & 255,
    g: (int >> 8) & 255,
    b: int & 255,
  };
}

function toRgba(hex: string, alpha: number): string {
  const rgb = hexToRgb(ensureHex(hex, hex));
  if (!rgb) return hex;
  const clamped = Math.min(Math.max(alpha, 0), 1);
  return `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${clamped})`;
}
