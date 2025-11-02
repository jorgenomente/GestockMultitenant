"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useDemoTheme } from "../components/DemoThemeProvider";

const COMPONENT_PREVIEW = [
  { label: "Botones", preview: "Actualizar precios" },
  { label: "Badges", preview: "Sucursal Norte" },
  { label: "Tarjetas", preview: "Ventas +12%" },
];

export default function ThemesDemoView() {
  const { presets, activePresetId, applyPreset } = useDemoTheme();
  const activePreset = presets.find((preset) => preset.id === activePresetId);

  return (
    <div className="flex flex-col gap-6">
      <Card>
        <CardHeader>
          <CardTitle>Paletas preconfiguradas</CardTitle>
          <CardDescription>
            Seleccioná un preset para aplicar los colores en todo el entorno demo. Actualmente:
            {" "}
            <span className="font-semibold text-foreground">
              {activePreset ? activePreset.name : "Personalizado"}
            </span>
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-3">
          {presets.map((preset) => {
            const isActive = preset.id === activePresetId;
            return (
            <div
                key={preset.id}
                className={
                  "flex flex-col gap-3 rounded-2xl border border-border/60 bg-background/70 p-4 transition" +
                  (isActive ? " ring-2 ring-[var(--color-action-secondary)]" : " hover:border-border")
                }
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-semibold text-foreground">{preset.name}</p>
                  <p className="text-xs text-muted-foreground">{preset.description}</p>
                </div>
                {isActive ? (
                  <Badge variant="default">Activo</Badge>
                ) : (
                  <Badge variant="outline">Demo</Badge>
                )}
              </div>
              <div className="flex gap-2">
                {preset.palette.map((color) => (
                  <span
                    key={color}
                    className="h-9 w-9 rounded-full border border-border/40 shadow-inner"
                    style={{ backgroundColor: color }}
                    aria-label={`Color ${color}`}
                  />
                ))}
              </div>
              <Button
                size="sm"
                variant={isActive ? "secondary" : "outline"}
                className="gap-2"
                onClick={() => applyPreset(preset.id)}
              >
                {isActive ? "Seleccionado" : "Aplicar en demo"}
              </Button>
            </div>
            );
          })}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Previsualización de componentes</CardTitle>
          <CardDescription>Ilustración estática para contar cómo se actualizan los tokens de diseño.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-6 md:grid-cols-3">
          {COMPONENT_PREVIEW.map((item) => (
            <div key={item.label} className="space-y-3">
              <p className="text-xs uppercase tracking-wide text-muted-foreground">{item.label}</p>
              <div className="rounded-2xl border border-dashed border-border/70 bg-card/60 p-4 text-sm text-muted-foreground">
                {item.preview}
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
