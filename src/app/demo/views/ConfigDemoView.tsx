"use client";

import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Users, ShieldCheck, Zap } from "lucide-react";

const TEAM_MEMBERS = [
  { name: "Lucía Fernández", email: "lucia@demo.app", role: "Owner", status: "Activo" },
  { name: "Martín López", email: "martin@demo.app", role: "Admin", status: "2FA pendiente" },
  { name: "Carla Díaz", email: "carla@demo.app", role: "Staff", status: "Verificado" },
];

const BRANCH_POLICIES = [
  { branch: "Casa Central", approvals: "Automático hasta $5M", alerts: "Resumen diario" },
  { branch: "Sucursal Norte", approvals: "Requiere doble aprobación", alerts: "Tiempo real" },
  { branch: "Mayorista", approvals: "Automático hasta $8M", alerts: "Slack #compras" },
];

const AUTOMATIONS = [
  {
    name: "Bloqueo de listas vencidas",
    description: "Suspende la publicación cuando la lista supera 30 días sin revisión.",
    enabled: true,
  },
  {
    name: "Sincronización ERP sandbox",
    description: "Envía los pedidos demo al ERP ficticio cada noche.",
    enabled: true,
  },
  {
    name: "Alertas de margen negativo",
    description: "Notifica al canal demo si el margen proyectado baja de 18%.",
    enabled: false,
  },
];

export default function ConfigDemoView() {
  return (
    <div className="flex flex-col gap-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" aria-hidden="true" />
            Equipo y roles
          </CardTitle>
          <CardDescription>Usuarios ficticios para mostrar el control de accesos.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {TEAM_MEMBERS.map((member) => (
            <div
              key={member.email}
              className="flex flex-col gap-2 rounded-2xl border border-border/60 bg-background/70 p-4 sm:flex-row sm:items-center sm:justify-between"
            >
              <div>
                <p className="text-sm font-semibold text-foreground">{member.name}</p>
                <p className="text-xs text-muted-foreground">{member.email}</p>
              </div>
              <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                <Badge variant="secondary">{member.role}</Badge>
                <Badge variant={member.status === "Verificado" ? "default" : "outline"}>{member.status}</Badge>
                <Button size="sm" variant="outline">
                  Gestionar acceso
                </Button>
              </div>
            </div>
          ))}
        </CardContent>
        <CardFooter className="justify-end">
          <Button size="sm" variant="secondary">
            Invitar miembro demo
          </Button>
        </CardFooter>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ShieldCheck className="h-5 w-5" aria-hidden="true" />
            Políticas por sucursal
          </CardTitle>
          <CardDescription>
            Configuraciones ficticias para explicar aprobaciones y alertas.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {BRANCH_POLICIES.map((policy) => (
            <div
              key={policy.branch}
              className="grid gap-3 rounded-2xl border border-border/60 p-4 sm:grid-cols-[1.2fr,1fr,1fr]"
            >
              <div>
                <p className="text-sm font-semibold text-foreground">{policy.branch}</p>
                <p className="text-xs text-muted-foreground">Visibilidad total en modo demo</p>
              </div>
              <div>
                <p className="text-xs uppercase tracking-wide text-muted-foreground">Aprobaciones</p>
                <p className="text-sm text-foreground">{policy.approvals}</p>
              </div>
              <div>
                <p className="text-xs uppercase tracking-wide text-muted-foreground">Alertas</p>
                <p className="text-sm text-foreground">{policy.alerts}</p>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Zap className="h-5 w-5" aria-hidden="true" />
            Automatizaciones demo
          </CardTitle>
          <CardDescription>Interruptores ficticios para contar integraciones y workflows.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {AUTOMATIONS.map((automation) => (
            <div key={automation.name} className="space-y-2 rounded-2xl border border-border/60 bg-background/60 p-4">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="text-sm font-semibold text-foreground">{automation.name}</p>
                  <p className="text-xs text-muted-foreground">{automation.description}</p>
                </div>
                <Badge variant={automation.enabled ? "default" : "outline"}>
                  {automation.enabled ? "Activo" : "Inactivo"}
                </Badge>
              </div>
              <Separator className="bg-border/60" />
              <p className="text-xs text-muted-foreground">
                {automation.enabled
                  ? "Activo en modo demo. No impacta datos reales."
                  : "Podés activar la opción durante la demo para mostrar el flujo."}
              </p>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
