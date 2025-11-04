// src/components/BottomNav.tsx
"use client";

import Link from "next/link";
import { usePathname, useParams } from "next/navigation";
import {
  CalendarClock,
  Truck,
  BarChart3,
  LogOut,
  Wallet,
  LayoutDashboard,
  Users,
  Tag,
  BadgePercent,
  Palette,
  LineChart,
  ChevronsLeft,
  ChevronsRight,
} from "lucide-react";
import React from "react";
import clsx from "clsx";
import { useBranch } from "@/components/branch/BranchProvider";
import { useLogout } from "@/lib/useLogout";

type NavItem = {
  label: string;
  icon: React.ComponentType<React.SVGProps<SVGSVGElement>>;
  testId?: string;
  onClick?: () => void;
  // eslint-disable-next-line no-unused-vars
  buildHref?(slug: string, branchSlug: string | null): string | null;
  requiresBranch?: boolean;
  onlyRoles?: Array<string>;
};

export default function BottomNav() {
  // 1) Hooks SIEMPRE primero (evita “change in order of Hooks”)
  const pathname = usePathname();
  const { slug: slugParam } = useParams<{ slug?: string }>();
  const slug = (slugParam ?? "").toString();
  const { currentBranch, loading: branchLoading, role } = useBranch();
  const { logout } = useLogout();

  // 2) Montado cliente para evitar hydration mismatch visual
  const [mounted, setMounted] = React.useState(false);
  const [collapsed, setCollapsed] = React.useState(false);

  React.useEffect(() => {
    if (typeof window !== "undefined") {
      try {
        if (window.localStorage.getItem("gestock:desktop-nav-collapsed") === "true") {
          setCollapsed(true);
        }
      } catch {
        // Ignoramos el estado persistido si el acceso falla
      }
    }
    setMounted(true);
  }, []);

  React.useEffect(() => {
    if (!mounted || typeof window === "undefined") return;
    try {
      window.localStorage.setItem("gestock:desktop-nav-collapsed", collapsed ? "true" : "false");
    } catch {
      // Ignoramos errores de persistencia
    }
  }, [collapsed, mounted]);

  if (!mounted) return null;

  const branchSlug = currentBranch?.slug ?? null;

  const NAV_ITEMS: NavItem[] = [
    {
      label: "Inicio",
      icon: LayoutDashboard,
      requiresBranch: true,
      buildHref: (tenantSlug, b) => (tenantSlug && b ? `/t/${tenantSlug}/b/${b}` : null),
    },
    {
      label: "Precios",
      icon: Tag,
      testId: "nav-precios",
      buildHref: (tenantSlug) => (tenantSlug ? `/t/${tenantSlug}/prices` : null),
    },
    {
      label: "Vencimientos",
      icon: CalendarClock,
      testId: "nav-venc",
      requiresBranch: true,
      buildHref: (tenantSlug, b) => (tenantSlug && b ? `/t/${tenantSlug}/b/${b}/vencimientos` : null),
    },
    {
      label: "Pedidos",
      icon: Truck,
      requiresBranch: true,
      buildHref: (tenantSlug, b) => (tenantSlug && b ? `/t/${tenantSlug}/b/${b}/proveedores` : null),
    },
    {
      label: "Pagos",
      icon: Wallet,
      requiresBranch: true,
      buildHref: (tenantSlug, b) => (tenantSlug && b ? `/t/${tenantSlug}/b/${b}/payments` : null),
    },
    {
      label: "Clientes",
      icon: Users,
      requiresBranch: true,
      buildHref: (tenantSlug, b) => (tenantSlug && b ? `/t/${tenantSlug}/b/${b}/clients` : null),
    },
    {
      label: "Presupuesto",
      icon: LineChart,
      requiresBranch: true,
      buildHref: (tenantSlug, b) => (tenantSlug && b ? `/t/${tenantSlug}/b/${b}/presupuesto` : null),
    },
    {
      label: "Etiquetas",
      icon: BadgePercent,
      requiresBranch: true,
      buildHref: (tenantSlug, b) => (tenantSlug && b ? `/t/${tenantSlug}/b/${b}/etiquetas` : null),
    },
    {
      label: "Estadísticas",
      icon: BarChart3,
      requiresBranch: true,
      buildHref: (tenantSlug, b) => (tenantSlug && b ? `/t/${tenantSlug}/b/${b}/stats` : null),
    },
    {
      label: "Configuración",
      icon: Palette,
      testId: "nav-configuracion",
      onlyRoles: ["owner"],
      buildHref: (tenantSlug) => (tenantSlug ? `/t/${tenantSlug}/configuracion` : null),
    },
    { label: "Salir", icon: LogOut, onClick: logout },
  ];

  const navClassName = clsx(
    "fixed inset-x-0 bottom-0 z-40",
    "border-t border-border/60",
    "bg-sidebar text-muted-foreground",
    "shadow-[var(--shadow-elevated)] backdrop-blur supports-[backdrop-filter]:backdrop-blur",
    collapsed
      ? "md:hidden"
      : "md:static md:inset-auto md:bottom-auto md:z-0 md:flex md:min-h-dvh md:w-72 md:flex-col md:border-t-0 md:border-r md:border-border/60 md:bg-sidebar md:px-4 md:py-6 md:text-sidebar-foreground md:shadow-none md:backdrop-blur-none"
  );

  return (
    <>
      <nav
        role="navigation"
        aria-label="Navegación inferior"
        className={navClassName}
        style={{ paddingBottom: "calc(env(safe-area-inset-bottom) + 8px)" }}
      >
        <div className="mx-auto w-full max-w-md md:max-w-full md:flex md:h-full md:flex-col md:gap-8">
          <div className="hidden items-center justify-between gap-3 md:flex">
            <div className="flex items-center gap-3">
              <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary/15 text-lg font-semibold text-primary shadow-sm">
                G
              </span>
              <div className="flex flex-col">
                <span className="text-base font-semibold tracking-tight text-sidebar-foreground">GeStock</span>
                <span className="text-xs text-muted-foreground">Gestión simple</span>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setCollapsed(true)}
              className="hidden items-center gap-1 rounded-lg border border-border/50 bg-sidebar-accent/40 px-2 py-1 text-xs font-medium text-sidebar-foreground transition hover:bg-sidebar-accent/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--sidebar-ring)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--sidebar)] md:inline-flex"
              aria-label="Ocultar navegación"
              aria-expanded={!collapsed}
            >
              <ChevronsLeft className="h-4 w-4" />
              <span>Ocultar</span>
            </button>
          </div>
          <ul
            className={clsx(
              "flex items-stretch gap-1.5 px-3 py-1.5",
              "overflow-x-auto flex-nowrap snap-x snap-mandatory",
              "[scrollbar-width:none] [&::-webkit-scrollbar]:hidden",
              "md:flex-1 md:flex-col md:items-stretch md:gap-1 md:overflow-visible md:px-0 md:py-0 md:snap-none"
            )}
            style={{ WebkitOverflowScrolling: "touch" }}
          >
          {NAV_ITEMS.map((item) => {
            if (item.onlyRoles && (!role || !item.onlyRoles.includes(role))) {
              return null;
            }
            let resolvedHref: string | null = null;
            if (item.buildHref) {
              resolvedHref = item.buildHref(slug, branchSlug);
            }

            const isActive =
              !!resolvedHref &&
              (pathname === resolvedHref || pathname.startsWith(resolvedHref + "/"));

            const Icon = item.icon;
            const needsBranch = item.requiresBranch ?? false;
            const isDisabled =
              !item.onClick && (!resolvedHref || (needsBranch && (branchLoading || !branchSlug)));
            const disabledTitle = !slug
              ? "Seleccioná un tenant para ver esta sección"
              : needsBranch
              ? "Seleccioná una sucursal para ver esta sección"
              : "Sección no disponible";

            return (
              <li
                key={item.label}
                className={clsx(
                  "shrink-0 min-w-[76px] snap-start md:min-w-0 md:w-full"
                )}
              >
                {item.onClick ? (
                  // Botón (Logout)
                  <button
                    type="button"
                    onClick={item.onClick}
                    className={clsx(
                      "group relative mx-auto flex w-full flex-col items-center justify-center rounded-2xl px-3 py-2",
                      "text-muted-foreground transition-all hover:bg-[color:var(--surface-muted)]",
                      "outline-none focus-visible:ring-2 focus-visible:ring-[var(--sidebar-ring)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--sidebar)]",
                      "md:h-11 md:flex-row md:justify-start md:gap-3 md:rounded-xl md:border-l-4 md:border-transparent md:px-3 md:text-sm md:font-medium md:text-muted-foreground md:hover:border-primary md:hover:bg-sidebar-accent/60 md:hover:text-foreground"
                    )}
                    aria-label={item.label}
                  >
                    <Icon className="h-5 w-5 transition-transform text-muted-foreground group-hover:scale-105 group-hover:text-sidebar-foreground md:h-5 md:w-5 md:text-inherit" />
                    <span
                      className={clsx(
                        "mt-0.5 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground group-hover:text-sidebar-foreground",
                        "md:mt-0 md:text-sm md:font-medium md:normal-case md:tracking-normal md:text-muted-foreground"
                      )}
                    >
                      {item.label}
                    </span>
                  </button>
                ) : !isDisabled && resolvedHref ? (
                  // Link normal
                  <Link
                    href={resolvedHref}
                    data-testid={item.testId}
                    aria-label={item.label}
                    aria-current={isActive ? "page" : undefined}
                    className={clsx(
                      "group relative mx-auto flex w-full flex-col items-center justify-center rounded-2xl px-3 py-2",
                      "transition-all outline-none focus-visible:ring-2 focus-visible:ring-[var(--sidebar-ring)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--sidebar)]",
                      isActive
                        ? "bg-primary text-primary-foreground shadow-[var(--shadow-elevated)] md:bg-primary/10 md:text-primary md:border-l-4 md:border-primary"
                        : "text-muted-foreground hover:bg-[color:var(--surface-muted)] md:text-muted-foreground md:hover:bg-sidebar-accent/60 md:hover:text-foreground md:border-l-4 md:border-transparent",
                      "md:h-11 md:flex-row md:items-center md:justify-start md:gap-3 md:rounded-xl md:px-3 md:text-sm md:font-medium"
                    )}
                  >
                    <Icon
                      className={clsx(
                        "h-5 w-5 transition-transform",
                        isActive
                          ? "scale-110 text-primary-foreground md:text-primary"
                          : "scale-100 text-muted-foreground group-hover:scale-105 group-hover:text-sidebar-foreground md:text-inherit"
                      )}
                      strokeWidth={isActive ? 2.2 : 1.6}
                    />
                    <span
                      className={clsx(
                        "mt-0.5 text-[11px] font-semibold uppercase tracking-wide",
                        isActive
                          ? "text-primary-foreground md:mt-0 md:tracking-normal md:text-primary"
                          : "text-muted-foreground group-hover:text-sidebar-foreground md:mt-0 md:tracking-normal md:text-muted-foreground",
                        "md:font-medium md:normal-case"
                      )}
                    >
                      {item.label}
                    </span>
                  </Link>
                ) : (
                  // Deshabilitado (si faltara slug)
                  <div
                    aria-disabled="true"
                    className="group mx-auto flex w-full flex-col items-center justify-center rounded-2xl px-3 py-2 md:px-4 md:py-3 cursor-not-allowed bg-[color:var(--surface-muted)] text-muted-foreground opacity-60"
                    title={disabledTitle}
                  >
                    <Icon className="h-5 w-5" />
                    <span className="mt-0.5 text-[11px] font-semibold uppercase tracking-wide md:text-sm md:font-medium md:normal-case">
                      {item.label}
                    </span>
                  </div>
                )}
              </li>
            );
          })}
        </ul>
        </div>
      </nav>
      <button
        type="button"
        onClick={() => setCollapsed(false)}
        className={clsx(
          "hidden fixed left-4 top-4 z-40 items-center gap-2 rounded-full border border-border/60 bg-sidebar px-3 py-2 text-sm font-medium text-sidebar-foreground shadow-sm transition hover:bg-sidebar-accent/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--sidebar-ring)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--sidebar)]",
          collapsed ? "md:flex" : "md:hidden"
        )}
        aria-label="Mostrar navegación"
        aria-expanded={!collapsed}
      >
        <ChevronsRight className="h-4 w-4" />
        <span>Mostrar menú</span>
      </button>
    </>
  );
}
