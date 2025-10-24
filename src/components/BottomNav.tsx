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
  React.useEffect(() => setMounted(true), []);
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

  return (
    <nav
      role="navigation"
      aria-label="Navegación inferior"
      className={clsx(
        "fixed inset-x-0 bottom-0 z-40",
        "border-t border-border/70",
        "bg-card/95 backdrop-blur supports-[backdrop-filter]:backdrop-blur",
        "shadow-[0_-18px_36px_-28px_rgba(31,31,31,0.48)]",
        "md:static md:inset-auto md:bottom-auto md:z-0 md:flex md:min-h-dvh md:w-72 md:flex-col md:border-t-0 md:border-r md:border-border/60 md:bg-sidebar md:px-4 md:py-6 md:shadow-none md:backdrop-blur-none"
      )}
      style={{ paddingBottom: "calc(env(safe-area-inset-bottom) + 8px)" }}
    >
      <div className="mx-auto w-full max-w-md md:max-w-full md:flex md:h-full md:flex-col md:gap-8">
        <div className="hidden items-center gap-3 md:flex">
          <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary/15 text-lg font-semibold text-primary shadow-sm">
            G
          </span>
          <div className="flex flex-col">
            <span className="text-base font-semibold tracking-tight text-sidebar-foreground">GeStock</span>
            <span className="text-xs text-muted-foreground">Gestión simple</span>
          </div>
        </div>
        <ul
          className={clsx(
            "flex items-stretch gap-2 px-3 py-2",
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
                  "shrink-0 min-w-[84px] snap-start md:min-w-0 md:w-full",
                  item.onClick && "md:mt-auto"
                )}
              >
                {item.onClick ? (
                  // Botón (Logout)
                  <button
                    type="button"
                    onClick={item.onClick}
                    className={clsx(
                      "group mx-auto flex w-full flex-col items-center justify-center rounded-2xl px-3 py-2",
                      "text-primary/80 hover:bg-muted/30",
                      "transition-all outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-card",
                      "md:h-11 md:flex-row md:justify-start md:gap-3 md:rounded-xl md:border-l-4 md:border-transparent md:px-3 md:text-sm md:font-medium md:text-muted-foreground md:hover:border-primary md:hover:bg-sidebar-accent/60 md:hover:text-foreground"
                    )}
                    aria-label={item.label}
                  >
                    <Icon className="h-6 w-6 transition-transform text-primary/80 group-hover:scale-105 md:h-5 md:w-5 md:text-inherit" />
                    <span
                      className={clsx(
                        "mt-1 text-[11px] md:mt-0 md:text-sm",
                        "font-medium uppercase tracking-wide text-muted-foreground md:normal-case md:tracking-normal"
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
                      "group mx-auto flex w-full flex-col items-center justify-center rounded-2xl px-3 py-2",
                      "transition-all outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-card",
                      isActive
                        ? "bg-primary/20 text-primary md:bg-primary/10 md:text-primary md:border-l-4 md:border-primary"
                        : "text-muted-foreground hover:bg-muted/30 md:text-muted-foreground md:hover:bg-sidebar-accent/60 md:hover:text-foreground md:border-l-4 md:border-transparent",
                      "md:h-11 md:flex-row md:items-center md:justify-start md:gap-3 md:rounded-xl md:px-3 md:text-sm md:font-medium"
                    )}
                  >
                    <Icon
                      className={clsx(
                        "h-6 w-6 transition-transform",
                        isActive
                          ? "scale-110 text-primary md:text-primary"
                          : "scale-100 text-muted-foreground group-hover:scale-105 md:text-inherit"
                      )}
                      strokeWidth={isActive ? 2.2 : 1.6}
                    />
                    <span
                      className={clsx(
                        "mt-1 text-[11px] md:text-sm",
                        isActive
                          ? "font-semibold uppercase tracking-wide text-primary md:mt-0 md:tracking-normal"
                          : "font-medium uppercase tracking-wide text-muted-foreground md:mt-0 md:tracking-normal",
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
                    className="group mx-auto flex w-full flex-col items-center justify-center rounded-2xl px-3 py-2 md:px-4 md:py-3 cursor-not-allowed bg-muted/20 text-muted-foreground/70"
                    title={disabledTitle}
                  >
                    <Icon className="h-6 w-6" />
                    <span className="mt-1 text-[11px] md:text-sm font-medium uppercase tracking-wide md:mt-0 md:normal-case">
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
  );
}
