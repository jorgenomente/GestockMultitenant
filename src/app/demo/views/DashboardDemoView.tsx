"use client";

import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  DASHBOARD_ACTIVITY,
  DASHBOARD_EXPIRIES,
  DASHBOARD_METRICS,
  DASHBOARD_SERIES,
} from "../data/demoData";
import { TrendingDown, TrendingUp } from "lucide-react";

export default function DashboardDemoView() {
  return (
    <div className="flex flex-col gap-6">
      <div className="grid gap-4 md:grid-cols-3">
        {DASHBOARD_METRICS.map((metric) => (
          <Card key={metric.label} className="h-full">
            <CardHeader>
              <CardTitle>{metric.label}</CardTitle>
              <CardDescription>{metric.context}</CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col gap-4">
              <div className="flex items-end justify-between gap-3">
                <span className="text-3xl font-semibold tracking-tight">{metric.value}</span>
                <Badge
                  variant={metric.trend === "down" ? "destructive" : "default"}
                  className="flex items-center gap-1 text-[0.65rem]"
                >
                  {metric.trend === "down" ? (
                    <TrendingDown className="h-3.5 w-3.5" aria-hidden="true" />
                  ) : (
                    <TrendingUp className="h-3.5 w-3.5" aria-hidden="true" />
                  )}
                  {metric.delta}
                </Badge>
              </div>
              <div className="text-xs text-muted-foreground">
                Pronóstico generado con base en histórico de 90 días.
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

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
