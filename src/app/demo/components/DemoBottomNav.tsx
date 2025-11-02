"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import React from "react";
import clsx from "clsx";
import {
  LayoutDashboard,
  Tag,
  CalendarClock,
  BarChart3,
  Handshake,
  Palette,
  Settings2,
} from "lucide-react";
import { useDemoBranch } from "./DemoBranchProvider";

type DemoNavItem = {
  label: string;
  href: string;
  icon: React.ComponentType<React.SVGProps<SVGSVGElement>>;
  requiresBranch?: boolean;
};

const DEMO_NAV_ITEMS: DemoNavItem[] = [
  { label: "Inicio", href: "/demo/dashboard", icon: LayoutDashboard },
  { label: "Precios", href: "/demo/precios", icon: Tag, requiresBranch: true },
  { label: "Proveedores", href: "/demo/proveedores", icon: Handshake, requiresBranch: true },
  { label: "Estadísticas", href: "/demo/estadisticas", icon: BarChart3, requiresBranch: true },
  { label: "Vencimientos", href: "/demo/vencimientos", icon: CalendarClock, requiresBranch: true },
  { label: "Configuración", href: "/demo/configuracion", icon: Settings2 },
  { label: "Temas", href: "/demo/temas", icon: Palette },
];

export default function DemoBottomNav() {
  const pathname = usePathname();
  const { currentBranch, loading } = useDemoBranch();
  const [mounted, setMounted] = React.useState(false);

  React.useEffect(() => setMounted(true), []);
  if (!mounted) return null;

  const branchSlug = currentBranch.slug;

  return (
    <nav
      role="navigation"
      aria-label="Navegación demo"
      className={clsx(
        "fixed inset-x-0 bottom-0 z-40 border-t border-border/60 bg-sidebar text-muted-foreground shadow-[var(--shadow-elevated)] backdrop-blur supports-[backdrop-filter]:backdrop-blur md:static md:inset-auto md:bottom-auto md:z-0 md:flex md:min-h-dvh md:w-72 md:flex-col md:border-t-0 md:border-r md:border-border/60 md:bg-sidebar md:px-4 md:py-6 md:text-sidebar-foreground md:shadow-none md:backdrop-blur-none"
      )}
      style={{ paddingBottom: "calc(env(safe-area-inset-bottom) + 8px)" }}
    >
      <div className="mx-auto w-full max-w-md md:max-w-full md:flex md:h-full md:flex-col md:gap-8">
        <div className="hidden items-center gap-3 md:flex">
          <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary/15 text-lg font-semibold text-primary shadow-sm">
            G
          </span>
          <div className="flex flex-col">
            <span className="text-base font-semibold tracking-tight text-sidebar-foreground">GeStock Demo</span>
            <span className="text-xs text-muted-foreground">Exploración guiada</span>
          </div>
        </div>
        <ul
          className={clsx(
            "flex items-stretch gap-1.5 px-3 py-1.5 overflow-x-auto flex-nowrap snap-x snap-mandatory [scrollbar-width:none] [&::-webkit-scrollbar]:hidden md:flex-1 md:flex-col md:items-stretch md:gap-1 md:overflow-visible md:px-0 md:py-0 md:snap-none"
          )}
          style={{ WebkitOverflowScrolling: "touch" }}
        >
          {DEMO_NAV_ITEMS.map((item) => {
            const Icon = item.icon;
            const isActive = pathname === item.href || pathname.startsWith(`${item.href}/`);
            const isDisabled = item.requiresBranch && (loading || !branchSlug);

            return (
              <li key={item.label} className="shrink-0 min-w-[76px] snap-start md:min-w-0 md:w-full">
                <Link
                  href={isDisabled ? "#" : item.href}
                  onClick={(event) => {
                    if (isDisabled) {
                      event.preventDefault();
                    }
                  }}
                  className={clsx(
                    "group relative mx-auto flex w-full flex-col items-center justify-center rounded-2xl px-3 py-2 text-xs font-semibold uppercase tracking-wide transition-all hover:bg-[color:var(--surface-muted)]",
                    "text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--sidebar-ring)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--sidebar)]",
                    "md:h-11 md:flex-row md:justify-start md:gap-3 md:rounded-xl md:border-l-4 md:border-transparent md:px-3 md:text-sm md:font-medium md:tracking-normal md:text-muted-foreground md:hover:border-primary md:hover:bg-sidebar-accent/60 md:hover:text-foreground",
                    isActive &&
                      "text-foreground shadow-sm md:border-primary md:bg-sidebar-accent md:text-sidebar-foreground"
                  )}
                  aria-disabled={isDisabled}
                >
                  <Icon className="h-5 w-5 text-muted-foreground transition-transform group-hover:scale-105 group-hover:text-sidebar-foreground md:h-5 md:w-5 md:text-inherit" />
                  <span className="mt-0.5 group-hover:text-sidebar-foreground md:mt-0">
                    {item.label}
                  </span>
                  {item.requiresBranch && !loading && !branchSlug && (
                    <span className="absolute -top-1 right-3 rounded-full bg-destructive px-1.5 py-0.5 text-[0.6rem] font-semibold uppercase tracking-wide text-destructive-foreground">
                      Seleccioná sucursal
                    </span>
                  )}
                </Link>
              </li>
            );
          })}
        </ul>
      </div>
    </nav>
  );
}
