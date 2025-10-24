"use client";

import React from "react";
import { useParams } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import { useBranch } from "@/components/branch/BranchProvider";
import { useBranchTheme } from "@/components/theme/BranchThemeProvider";
import {
  BRANCH_THEME_FIELDS,
  BranchThemeFormValues,
  DEFAULT_BRANCH_THEME,
  THEME_SETTINGS_KEY,
  sanitizeHexColor,
  sanitizeStoredTheme,
} from "@/lib/theme/branchTheme";

type StatusState = "idle" | "saving" | "success" | "error";

const FIELD_METADATA: Record<keyof BranchThemeFormValues, { label: string; description: string }> = {
  primary: {
    label: "Color primario",
    description: "Botones principales, estados activos y CTA",
  },
  accent: {
    label: "Color de datos",
    description: "Gráficos, indicadores y elementos analíticos",
  },
  background: {
    label: "Fondo principal",
    description: "Color de fondo general del aplicativo",
  },
  surface: {
    label: "Superficies elevadas",
    description: "Tarjetas, paneles y campos de entrada",
  },
  nav: {
    label: "Navegación",
    description: "Sidebar y BottomNav",
  },
  alert: {
    label: "Alertas / Peligro",
    description: "Acciones destructivas y mensajes críticos",
  },
  secondary: {
    label: "Acciones secundarias",
    description: "Botones alternativos, chips y badges neutros",
  },
  success: {
    label: "Estado positivo",
    description: "Confirmaciones, indicadores de éxito y toasts",
  },
};

const HEX_FULL_REGEX = /^#[0-9A-F]{6}$/;

type PresetTheme = {
  id: string;
  name: string;
  description: string;
  values: BranchThemeFormValues;
};

const THEME_PRESETS: PresetTheme[] = [
  {
    id: "bosque",
    name: "Bosque calmado",
    description: "Verde musgo con acentos analíticos neutros",
    values: {
      primary: "#7DAA92",
      secondary: "#4B5B53",
      accent: "#7394B0",
      background: "#1C2623",
      surface: "#3C4A44",
      nav: "#2C3A33",
      alert: "#C1643B",
      success: "#8FBDA5",
    },
  },
  {
    id: "atardecer",
    name: "Atardecer terracota",
    description: "Cobre cálido con contraste en grafito profundo",
    values: {
      primary: "#C1643B",
      secondary: "#8E5032",
      accent: "#E2B172",
      background: "#1D1A1A",
      surface: "#2C2625",
      nav: "#231F1F",
      alert: "#E76F51",
      success: "#A3C585",
    },
  },
  {
    id: "atlantico",
    name: "Atlántico analítico",
    description: "Azules profundos con acentos teal luminosos",
    values: {
      primary: "#1E6F82",
      secondary: "#1B4F61",
      accent: "#4AB3C6",
      background: "#101921",
      surface: "#1B2A33",
      nav: "#18242C",
      alert: "#D86B5B",
      success: "#5FC4A5",
    },
  },
  {
    id: "minimalista",
    name: "Minimalista monocromo",
    description: "Blancos y grises con negros definidos y acentos controlados",
    values: {
      primary: "#1F1F1F",
      secondary: "#3A3A3A",
      accent: "#5A8070",
      background: "#F5F5F5",
      surface: "#EFEFEF",
      nav: "#FFFFFF",
      alert: "#C1584A",
      success: "#6BAA7A",
    },
  },
  {
    id: "nocturno",
    name: "Nocturno profundo",
    description: "Negros intensos con acentos teal eléctricos",
    values: {
      primary: "#0BA7A7",
      secondary: "#0F4C4C",
      accent: "#1CC6C6",
      background: "#050809",
      surface: "#11181B",
      nav: "#0A1114",
      alert: "#D65353",
      success: "#1FBF7A",
    },
  },
  {
    id: "verdecontrast",
    name: "Verde contrastado",
    description: "Verde brillante con negros y blancos limpios",
    values: {
      primary: "#3DB66B",
      secondary: "#1E3D2C",
      accent: "#2F7A52",
      background: "#F8FAF5",
      surface: "#E8F1E7",
      nav: "#0E1A12",
      alert: "#C75234",
      success: "#4FD08E",
    },
  },
  {
    id: "aurora",
    name: "Aurora pastel",
    description: "Lavanda suave con acentos azul acero y coral",
    values: {
      primary: "#8C7AE6",
      secondary: "#556678",
      accent: "#6FA1FF",
      background: "#1C1F2A",
      surface: "#242A36",
      nav: "#1B202D",
      alert: "#FF7B6B",
      success: "#74D6B5",
    },
  },
  {
    id: "cobre",
    name: "Cobre industrial",
    description: "Cobre intenso con metales fríos y turquesa de contraste",
    values: {
      primary: "#B85C32",
      secondary: "#3C4C55",
      accent: "#58748A",
      background: "#121719",
      surface: "#1F2A2F",
      nav: "#1A2327",
      alert: "#D45D3F",
      success: "#2DB5A3",
    },
  },
];

export default function ConfiguracionPageClient() {
  const params = useParams<{ slug: string }>();
  const slug = (params?.slug ?? "").toString();

  const queryClient = useQueryClient();
  const { currentBranch, loading: branchLoading, role } = useBranch();
  const { theme, source, loading: themeLoading, branchId, tenantId, uploadedAt, refetch } = useBranchTheme();

  const [formValues, setFormValues] = React.useState<BranchThemeFormValues>(() => ({ ...theme }));
  const [draftValues, setDraftValues] = React.useState<Record<keyof BranchThemeFormValues, string>>(() => ({ ...theme }));
  const [status, setStatus] = React.useState<StatusState>("idle");
  const [error, setError] = React.useState<string | null>(null);
  const [showPresets, setShowPresets] = React.useState(false);

  const canEdit = role === "owner";

  React.useEffect(() => {
    setFormValues({ ...theme });
    setDraftValues({ ...theme });
    setStatus("idle");
    setError(null);
  }, [theme, branchId]);

  const hasChanges = React.useMemo(
    () => BRANCH_THEME_FIELDS.some((field) => formValues[field] !== theme[field]),
    [formValues, theme]
  );

  const persistTheme = React.useCallback(
    async (values: BranchThemeFormValues) => {
      if (!canEdit) throw new Error("Solo el owner puede modificar los colores");
      if (!slug) throw new Error("Ruta inválida");
      if (!branchId || !tenantId) throw new Error("Seleccioná una sucursal activa");

      const sanitized = sanitizeStoredTheme(values);
      const response = await fetch(`/api/t/${slug}/settings`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          scope: "branch",
          key: THEME_SETTINGS_KEY,
          branchId,
          value: sanitized,
        }),
      });

      const text = await response.text();
      const parsed = parseJson(text);

      if (!response.ok) {
        const message =
          typeof parsed === "object" && parsed && "error" in parsed && typeof (parsed as { error: unknown }).error === "string"
            ? (parsed as { error: string }).error
            : `No se pudo guardar (HTTP ${response.status})`;
        throw new Error(message);
      }

      await queryClient.invalidateQueries({ queryKey: ["branch-theme", tenantId, branchId] });
      await refetch();
    },
    [branchId, canEdit, queryClient, refetch, slug, tenantId]
  );

  const handleColorChange = React.useCallback(
    (field: keyof BranchThemeFormValues, value: string) => {
      const normalized = sanitizeHexColor(value, formValues[field]);
      setFormValues((prev) => ({ ...prev, [field]: normalized }));
      setDraftValues((prev) => ({ ...prev, [field]: normalized }));
    },
    [formValues]
  );

  const handleDraftChange = React.useCallback(
    (field: keyof BranchThemeFormValues, raw: string) => {
      if (!canEdit) return;
      const value = raw.toUpperCase();
      const withoutHash = value.replace(/[^0-9A-F]/g, "").slice(0, 6);
      const display = value.startsWith("#") ? `#${withoutHash}` : withoutHash ? `#${withoutHash}` : "";

      setDraftValues((prev) => ({ ...prev, [field]: display }));

      if (display.length === 7 && HEX_FULL_REGEX.test(display)) {
        setFormValues((prev) => ({ ...prev, [field]: display }));
      }
    },
    [canEdit]
  );

  const handleDraftBlur = React.useCallback(
    (field: keyof BranchThemeFormValues) => {
      setDraftValues((prev) => ({ ...prev, [field]: formValues[field] }));
    },
    [formValues]
  );

  const handleSubmit = React.useCallback(
    async (event: React.FormEvent<HTMLFormElement>) => {
      event.preventDefault();
      if (!canEdit || status === "saving") return;
      setStatus("saving");
      setError(null);
      try {
        await persistTheme(formValues);
        setStatus("success");
      } catch (err) {
        const message = err instanceof Error ? err.message : "Error desconocido";
        setError(message);
        setStatus("error");
      }
    },
    [canEdit, formValues, persistTheme, status]
  );

  const handleReset = React.useCallback(async () => {
    if (!canEdit || status === "saving") return;
    setStatus("saving");
    setError(null);
    try {
      await persistTheme(DEFAULT_BRANCH_THEME);
      setFormValues({ ...DEFAULT_BRANCH_THEME });
      setDraftValues({ ...DEFAULT_BRANCH_THEME });
      setStatus("success");
    } catch (err) {
      const message = err instanceof Error ? err.message : "Error desconocido";
      setError(message);
      setStatus("error");
    }
  }, [canEdit, persistTheme, status]);

  React.useEffect(() => {
    if (status !== "success") return;
    const timer = window.setTimeout(() => setStatus("idle"), 3000);
    return () => window.clearTimeout(timer);
  }, [status]);

  if (branchLoading || themeLoading) {
    return (
      <div className="px-4 py-6">
        <div className="rounded-2xl border border-border/60 bg-card/40 p-6 text-sm text-muted-foreground">
          Cargando configuración de tema…
        </div>
      </div>
    );
  }

  if (!currentBranch || !branchId) {
    return (
      <div className="px-4 py-6">
        <div className="rounded-2xl border border-destructive/40 bg-destructive/10 p-6 text-sm text-destructive">
          Seleccioná una sucursal para personalizar sus colores.
        </div>
      </div>
    );
  }

  return (
    <div className="px-4 py-6">
      <div className="mx-auto w-full max-w-3xl space-y-6">
        <header className="space-y-2">
          <h1 className="text-2xl font-semibold text-foreground">Configuración de tema</h1>
          <p className="text-sm text-muted-foreground">
            Los colores se guardan por sucursal. Actualmente personalizás: <span className="font-medium text-foreground">{currentBranch.name}</span>.
          </p>
          {source === "custom" && uploadedAt ? (
            <p className="text-xs text-muted-foreground">
              Última actualización: {formatTimestamp(uploadedAt)}
            </p>
          ) : (
            <p className="text-xs text-muted-foreground">Usando la paleta base en esta sucursal.</p>
          )}
          {!canEdit && (
            <p className="text-xs text-destructive">
              Sólo el owner puede modificar los colores. Podés visualizar la configuración actual.
            </p>
          )}
        </header>

        <form onSubmit={handleSubmit} className="space-y-8">
          <section className="grid gap-6 rounded-2xl border border-border/60 bg-card/60 p-6 md:grid-cols-2">
            {BRANCH_THEME_FIELDS.map((field) => {
              const meta = FIELD_METADATA[field];
              const colorValue = formValues[field];
              const draftValue = draftValues[field];
              return (
                <div key={field} className="space-y-3">
                  <label className="text-sm font-medium text-foreground" htmlFor={`color-${field}`}>
                    {meta.label}
                  </label>
                  <p className="text-xs text-muted-foreground">{meta.description}</p>
                  <div className="flex items-center gap-3">
                    <input
                      id={`color-${field}`}
                      type="color"
                      className="h-12 w-12 cursor-pointer rounded-full border border-border/50 bg-transparent shadow-sm"
                      value={HEX_FULL_REGEX.test(colorValue) ? colorValue : DEFAULT_BRANCH_THEME[field]}
                      onChange={(event) => handleColorChange(field, event.target.value)}
                      disabled={!canEdit}
                    />
                    <div className="flex w-full flex-col gap-1">
                      <input
                        type="text"
                        inputMode="text"
                        pattern="#[0-9A-Fa-f]{6}"
                        className="w-full rounded-lg border border-border/70 bg-input-background/50 px-3 py-2 text-sm font-mono uppercase text-foreground caret-primary outline-none focus-visible:ring-2 focus-visible:ring-ring"
                        value={draftValue}
                        onChange={(event) => handleDraftChange(field, event.target.value)}
                        onBlur={() => handleDraftBlur(field)}
                        placeholder="#000000"
                        disabled={!canEdit}
                      />
                      <span className="text-[11px] uppercase tracking-wide text-muted-foreground">
                        {HEX_FULL_REGEX.test(colorValue)
                          ? sanitizeHexColor(colorValue, DEFAULT_BRANCH_THEME[field])
                          : "Hex inválido"}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </section>

          <footer className="flex flex-col items-start gap-3 rounded-2xl border border-border/60 bg-card/40 p-6 md:flex-row md:items-center md:justify-between">
            <div className="space-y-1 text-sm text-muted-foreground">
              <p>
                {canEdit
                  ? "Guardá los cambios para aplicar la combinación en esta sucursal."
                  : "No tenés permisos para guardar cambios."}
              </p>
              {status === "success" && <p className="text-xs text-primary">Colores actualizados correctamente.</p>}
              {status === "error" && error && <p className="text-xs text-destructive">{error}</p>}
            </div>

            <div className="flex w-full flex-col gap-2 md:w-auto md:flex-row">
              <button
                type="button"
                onClick={() => setShowPresets((prev) => !prev)}
                className="inline-flex items-center justify-center rounded-lg border border-border/70 px-4 py-2 text-sm font-medium text-foreground transition hover:bg-muted/40"
              >
                {showPresets ? "Ocultar sugerencias" : "Ver temas sugeridos"}
              </button>
              <button
                type="button"
                onClick={handleReset}
                disabled={!canEdit || status === "saving"}
                className="inline-flex items-center justify-center rounded-lg border border-border/70 px-4 py-2 text-sm font-medium text-foreground transition hover:bg-muted/40 disabled:cursor-not-allowed disabled:opacity-60"
              >
                Restaurar paleta base
              </button>
              <button
                type="submit"
                disabled={!canEdit || status === "saving" || !hasChanges}
                className="inline-flex items-center justify-center rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground transition hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {status === "saving" ? "Guardando…" : "Guardar cambios"}
              </button>
            </div>
          </footer>
        </form>

        {showPresets && (
          <section className="grid gap-4 rounded-2xl border border-border/60 bg-card/50 p-6 md:grid-cols-3">
            {THEME_PRESETS.map((preset) => (
              <button
                key={preset.id}
                type="button"
                onClick={() => {
                  setFormValues({ ...preset.values });
                  setDraftValues({ ...preset.values });
                }}
                className="group flex h-full flex-col gap-3 rounded-xl border border-border/60 bg-card/70 p-4 text-left transition hover:border-primary/70 hover:bg-primary/10"
              >
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-semibold text-foreground">{preset.name}</h3>
                  <span className="text-xs text-muted-foreground">Pulsa para aplicar</span>
                </div>
                <p className="text-xs text-muted-foreground">{preset.description}</p>
                <div className="flex gap-2">
                  {BRANCH_THEME_FIELDS.map((field) => (
                    <span
                      key={`${preset.id}-${field}`}
                      className="flex h-8 w-8 items-center justify-center rounded-full border border-border/60 text-[10px] font-medium uppercase text-foreground/70"
                      style={{ background: preset.values[field] }}
                    >
                      {field.charAt(0)}
                    </span>
                  ))}
                </div>
              </button>
            ))}
          </section>
        )}
      </div>
    </div>
  );
}

function formatTimestamp(input: string): string {
  const date = new Date(input);
  if (Number.isNaN(date.getTime())) return "Sin fecha";
  return date.toLocaleString("es-AR", {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

function parseJson(text: string): unknown {
  try {
    return JSON.parse(text) as unknown;
  } catch {
    return null;
  }
}
