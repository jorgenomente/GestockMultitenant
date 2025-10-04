// src/components/BottomNav.tsx
"use client";

import Link from "next/link";
import { usePathname, useParams } from "next/navigation";
import {
  Tag,
  CalendarClock,
  Users,
  BarChart,
  Truck,
  LineChart,
  BadgePercent,
  Boxes,
  LogOut,
} from "lucide-react";
import React from "react";
import clsx from "clsx";
import { useLogout } from "@/lib/useLogout";

type NavItem = {
  label: string;
  href?: string | ((slug: string) => string); // fija o dinámica
  icon: React.ComponentType<React.SVGProps<SVGSVGElement>>;
  testId?: string;
  onClick?: () => void; // para acciones (logout)
};

// Type guard para href función
function isHrefFn(h: NavItem["href"]): h is (slug: string) => string {
  return typeof h === "function";
}

export default function BottomNav() {
  // 1) Hooks SIEMPRE primero (evita “change in order of Hooks”)
  const pathname = usePathname();
  const params = useParams<{ slug?: string }>();
  const slug = (params?.slug ?? "").toString();
  const { logout } = useLogout();

  // 2) Montado cliente para evitar hydration mismatch visual
  const [mounted, setMounted] = React.useState(false);
  React.useEffect(() => setMounted(true), []);
  if (!mounted) return null;

  const NAV_ITEMS: NavItem[] = [
    { label: "Precios", href: (s: string) => `/t/${s}/prices`, icon: Tag, testId: "nav-precios" },
    { label: "Vencimientos", href: "/mobile/vencimientos", icon: CalendarClock, testId: "nav-venc" },
    { label: "Pedidos", href: "/mobile/proveedores", icon: Truck },
    { label: "Clientes", href: "/mobile/clients", icon: Users },
    { label: "Presupuesto", href: "/mobile/presupuesto", icon: LineChart },
    { label: "Etiquetas", href: "/mobile/etiquetas", icon: BadgePercent },
    { label: "Estadísticas", href: "/mobile/orders", icon: BarChart },
    { label: "Stock", href: "/mobile/stock", icon: Boxes },
    { label: "Salir", icon: LogOut, onClick: logout }, // botón logout
  ];

  return (
    <nav
      role="navigation"
      aria-label="Navegación inferior"
      className={clsx(
        "fixed inset-x-0 bottom-0 z-40",
        "border-t border-neutral-200/70 dark:border-neutral-800/70",
        "bg-white/85 dark:bg-neutral-900/80 backdrop-blur supports-[backdrop-filter]:backdrop-blur",
        "shadow-[0_-6px_20px_-12px_rgba(0,0,0,0.25)]"
      )}
      style={{ paddingBottom: "calc(env(safe-area-inset-bottom) + 8px)" }}
    >
      <div className="mx-auto w-full max-w-md md:max-w-3xl lg:max-w-5xl">
        <ul
          className={clsx(
            "flex items-stretch gap-2 px-3 py-2",
            "overflow-x-auto flex-nowrap snap-x snap-mandatory",
            "[scrollbar-width:none] [&::-webkit-scrollbar]:hidden",
            "md:overflow-x-visible md:flex-wrap md:justify-around md:snap-none"
          )}
          style={{ WebkitOverflowScrolling: "touch" }}
        >
          {NAV_ITEMS.map((item) => {
            // Resolver href como string | null
            let resolvedHref: string | null = null;
            if (item.href) {
              resolvedHref = isHrefFn(item.href)
                ? (slug ? item.href(slug) : null)
                : item.href;
            }

            const isActive =
              !!resolvedHref &&
              (pathname === resolvedHref || pathname.startsWith(resolvedHref + "/"));

            const Icon = item.icon;

            return (
              <li
                key={item.label}
                className="shrink-0 min-w-[84px] snap-start md:shrink md:min-w-0 md:flex-1"
              >
                {item.onClick ? (
                  // Botón (Logout)
                  <button
                    type="button"
                    onClick={item.onClick}
                    className={clsx(
                      "group mx-auto flex w-full flex-col items-center justify-center rounded-2xl px-3 py-2 md:px-4 md:py-3",
                      "text-neutral-600 hover:bg-neutral-50 dark:text-neutral-300 dark:hover:bg-neutral-800/70",
                      "outline-none focus-visible:ring-2 focus-visible:ring-sky-500 focus-visible:ring-offset-2 focus-visible:ring-offset-white dark:focus-visible:ring-offset-neutral-900"
                    )}
                    aria-label={item.label}
                  >
                    <Icon className="h-6 w-6 transition-transform group-hover:scale-105" />
                    <span className="mt-1 text-[11px] md:text-[12px] font-medium">
                      {item.label}
                    </span>
                  </button>
                ) : resolvedHref ? (
                  // Link normal
                  <Link
                    href={resolvedHref}
                    data-testid={item.testId}
                    aria-label={item.label}
                    aria-current={isActive ? "page" : undefined}
                    className={clsx(
                      "group mx-auto flex w-full flex-col items-center justify-center rounded-2xl px-3 py-2 md:px-4 md:py-3",
                      "outline-none focus-visible:ring-2 focus-visible:ring-sky-500 focus-visible:ring-offset-2 focus-visible:ring-offset-white dark:focus-visible:ring-offset-neutral-900",
                      isActive
                        ? "bg-sky-50 text-sky-700 dark:bg-sky-950/40 dark:text-sky-300"
                        : "text-neutral-600 hover:bg-neutral-50 dark:text-neutral-300 dark:hover:bg-neutral-800/70"
                    )}
                  >
                    <Icon
                      className={clsx(
                        "h-6 w-6 transition-transform",
                        isActive ? "scale-110" : "scale-100 group-hover:scale-105"
                      )}
                    />
                    <span
                      className={clsx(
                        "mt-1 text-[11px] md:text-[12px]",
                        isActive ? "font-semibold" : "font-medium"
                      )}
                    >
                      {item.label}
                    </span>
                  </Link>
                ) : (
                  // Deshabilitado (si faltara slug)
                  <div
                    aria-disabled="true"
                    className="group mx-auto flex w-full flex-col items-center justify-center rounded-2xl px-3 py-2 md:px-4 md:py-3 text-neutral-400 dark:text-neutral-600 cursor-not-allowed"
                    title="Seleccioná un tenant para ver esta sección"
                  >
                    <Icon className="h-6 w-6 opacity-60" />
                    <span className="mt-1 text-[11px] md:text-[12px] font-medium">
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
