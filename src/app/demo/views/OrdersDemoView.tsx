"use client";

import { RefreshCw, Truck } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { DEMO_ORDERS } from "../data/demoData";

export default function OrdersDemoView() {
  return (
    <div className="flex flex-col gap-6">
      <Card>
        <CardHeader>
          <CardTitle>Seguimiento de pedidos</CardTitle>
          <CardDescription>Visualización compacta del estado real vs. planificado.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {DEMO_ORDERS.map((order) => (
            <div
              key={order.code}
              className="rounded-2xl border border-border/60 bg-background/60 p-4"
            >
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="text-sm font-semibold text-foreground">{order.code}</p>
                  <p className="text-xs text-muted-foreground">{order.supplier} · {order.items}</p>
                </div>
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <Truck className="h-4 w-4" aria-hidden="true" />
                  <span>{order.status}</span>
                  <Badge variant="outline">ETA {order.eta}</Badge>
                </div>
              </div>
              <div className="mt-3">
                <Progress value={order.progress} />
                <p className="mt-2 text-xs text-muted-foreground">Avance operativo {order.progress}%</p>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      <div className="grid gap-4 md:grid-cols-2">
        <Card className="border-dashed border-border/60">
          <CardHeader>
            <CardTitle>Workflow sugerido</CardTitle>
            <CardDescription>
              Útil para narrar el proceso completo durante una demo en vivo.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 text-sm text-muted-foreground">
            <p>1. Generá el pedido desde precios históricos o proyección de ventas.</p>
            <p>2. Ejecutá la recepción parcial y ajustá diferencias en segundos.</p>
            <p>3. Confirmá facturas y conciliá pagos desde la misma pantalla.</p>
          </CardContent>
        </Card>
        <Card className="bg-primary/10">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-primary">
              <RefreshCw className="h-5 w-5" aria-hidden="true" />
              Automatizaciones demo
            </CardTitle>
            <CardDescription>
              Disparadores configurados que solo existen en este entorno ficticio.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 text-sm text-primary/90">
            <p>· Notificación al proveedor cuando el pedido supera las 24 h sin movimiento.</p>
            <p>· Sugerencias de reposición basadas en pedidos cancelados.</p>
            <p>· Sincronización con ERP sandbox para mostrar la integración.</p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
