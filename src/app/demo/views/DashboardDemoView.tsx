"use client";

import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  DASHBOARD_ACTIVITY,
  DASHBOARD_EXPIRIES,
  DASHBOARD_METRICS,
  DASHBOARD_SERIES,
} from "../data/demoData";
import { BarChart2, PackagePlus, Settings2 } from "lucide-react";

const QUICK_ACTIONS = [
  { label: "Hacer un pedido", icon: PackagePlus },
  { label: "Estadísticas", icon: BarChart2 },
  { label: "Configuración", icon: Settings2 },
];

export default function DashboardDemoView() {
  return (
    <div className="flex flex-col gap-6">
      <Card className="border border-border/60 bg-background/70 shadow-[var(--shadow-card)]">
        <CardHeader className="space-y-2">
          <CardTitle>Métricas clave de la operación</CardTitle>
          <CardDescription>Así amaneció tu negocio hoy.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid gap-4 md:grid-cols-3">
            {DASHBOARD_METRICS.map((metric) => (
              <div
                key={metric.label}
                className="rounded-2xl border border-border/60 bg-background/70 p-4 shadow-sm"
              >
                <p className="text-sm font-semibold text-foreground">{metric.label}</p>
                <p className="mt-3 text-3xl font-semibold tracking-tight text-foreground">
                  {metric.value}
                </p>
                <p className="mt-2 text-sm text-muted-foreground">{metric.detail}</p>
                <p className="text-xs text-muted-foreground">{metric.context}</p>
              </div>
            ))}
          </div>
          <div className="flex flex-wrap gap-3">
            {QUICK_ACTIONS.map((action) => (
              <Button key={action.label} variant="outline" className="gap-2">
                <action.icon className="h-4 w-4" aria-hidden="true" />
                {action.label}
              </Button>
            ))}
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-4 lg:grid-cols-[1.15fr,0.85fr]">
        <Card>
          <CardHeader>
            <CardTitle>Venta neta por sucursal</CardTitle>
            <CardDescription>Comparativo semanal con crecimiento interanual.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {DASHBOARD_SERIES.map((row) => (
              <div key={row.channel} className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="font-medium text-foreground">{row.channel}</span>
                  <span className="text-xs text-muted-foreground">{row.note}</span>
                </div>
                <div className="h-2 rounded-full bg-muted">
                  <div
                    className="h-full rounded-full bg-primary"
                    style={{ width: `${row.value}%` }}
                  />
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Alertas de vencimiento</CardTitle>
            <CardDescription>Sugerencias automáticas para reducir pérdidas.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {DASHBOARD_EXPIRIES.map((item) => (
              <div
                key={`${item.product}-${item.branch}`}
                className="rounded-2xl border border-border/60 bg-background/60 p-4"
              >
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-sm font-semibold">{item.product}</p>
                    <p className="text-xs text-muted-foreground">{item.branch}</p>
                  </div>
                  <Badge variant="outline">{item.expiresIn}</Badge>
                </div>
                <p className="mt-3 text-xs text-muted-foreground">{item.risk}</p>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Actividad en tiempo real</CardTitle>
          <CardDescription>Eventos destacados durante la última hora.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {DASHBOARD_ACTIVITY.map((event) => (
            <div
              key={event.title}
              className="flex flex-col gap-1 rounded-2xl border border-border/60 bg-background/60 p-4 sm:flex-row sm:items-center sm:justify-between"
            >
              <div>
                <p className="text-sm font-semibold text-foreground">{event.title}</p>
                <p className="text-xs text-muted-foreground">{event.subtitle}</p>
              </div>
              <span className="text-xs text-muted-foreground sm:whitespace-nowrap">{event.timeAgo}</span>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
