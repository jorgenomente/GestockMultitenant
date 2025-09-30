"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Tag, CalendarClock, Users, BarChart, Truck, LineChart, BadgePercent, Boxes } from "lucide-react";
import React from "react";
import clsx from "clsx";


type NavItem = {
  label: string;
  href: string;
  icon: React.ComponentType<React.SVGProps<SVGSVGElement>>;
  testId?: string;
};

const NAV_ITEMS: NavItem[] = [
  { label: "Precios", href: "/mobile/pricesearch", icon: Tag, testId: "nav-precios" },
  { label: "Vencimientos", href: "/mobile/vencimientos", icon: CalendarClock, testId: "nav-venc" },
  { label: "Pedidos", href: "/mobile/proveedores", icon: Truck },
  { label: "Clientes", href: "/mobile/clients", icon: Users },
  { label: "Presupuesto", href: "/mobile/presupuesto", icon: LineChart },
  { label: "Etiquetas", href: "/mobile/etiquetas", icon: BadgePercent },
  { label: "Estadisticas", href: "/mobile/orders", icon: BarChart, testId: "nav-pedidos" },
{ label: "Stock", href: "/mobile/stock", icon: Boxes, testId: "nav-pedidos" },
];

export default function BottomNav() {
  const pathname = usePathname();

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
        {/* Contenedor scrolleable en mobile, layout tradicional en md+ */}
        <ul
          className={clsx(
            "flex items-stretch gap-2 px-3 py-2",
            // Mobile: scroll horizontal
            "overflow-x-auto flex-nowrap snap-x snap-mandatory",
            // Ocultar scrollbars (FF y WebKit) sin plugins
            "[scrollbar-width:none] [&::-webkit-scrollbar]:hidden",
            // Desktop: sin scroll y distribución amplia
            "md:overflow-x-visible md:flex-wrap md:justify-around md:snap-none"
          )}
          style={{ WebkitOverflowScrolling: "touch" }}
        >
          {NAV_ITEMS.map((item) => {
            const isActive =
              pathname === item.href || (pathname?.startsWith(item.href + "/") ?? false);
            const Icon = item.icon;

            return (
              <li
                key={item.href}
                className={clsx(
                  // Mobile: no encoger, ancho mínimo para permitir scroll
                  "shrink-0 min-w-[84px] snap-start",
                  // Desktop: comportamiento anterior (ocupan espacio equitativo)
                  "md:shrink md:min-w-0 md:flex-1"
                )}
              >
                <Link
                  href={item.href}
                  data-testid={item.testId}
                  aria-label={item.label}
                  aria-current={isActive ? "page" : undefined}
                  className={clsx(
                    "group mx-auto flex w-full select-none flex-col items-center justify-center rounded-2xl px-3 py-2",
                    "md:px-4 md:py-3",
                    "outline-none focus-visible:ring-2 focus-visible:ring-sky-500 focus-visible:ring-offset-2 focus-visible:ring-offset-white dark:focus-visible:ring-offset-neutral-900",
                    isActive
                      ? "bg-sky-50 text-sky-700 dark:bg-sky-950/40 dark:text-sky-300"
                      : "text-neutral-600 hover:bg-neutral-50 dark:text-neutral-300 dark:hover:bg-neutral-800/70"
                  )}
                >
                  <Icon
                    aria-hidden
                    className={clsx(
                      "h-6 w-6 transition-transform md:h-6 md:w-6",
                      isActive ? "scale-110" : "scale-100 group-hover:scale-105"
                    )}
                  />
                  <span
                    className={clsx(
                      "mt-1 text-[11px] leading-none md:text-[12px]",
                      isActive ? "font-semibold" : "font-medium"
                    )}
                  >
                    {item.label}
                  </span>
                </Link>
              </li>
            );
          })}
        </ul>
      </div>
    </nav>
  );
}
