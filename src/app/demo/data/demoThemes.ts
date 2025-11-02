import { DEFAULT_BRANCH_THEME, type BranchThemeFormValues } from "@/lib/theme/branchTheme";

export type DemoThemePreset = {
  id: string;
  name: string;
  description: string;
  palette: string[];
  values: BranchThemeFormValues;
};

const makePreset = (
  id: string,
  name: string,
  description: string,
  palette: string[],
  values: Partial<BranchThemeFormValues>
): DemoThemePreset => ({
  id,
  name,
  description,
  palette,
  values: { ...DEFAULT_BRANCH_THEME, ...values },
});

export const DEMO_THEME_PRESETS: DemoThemePreset[] = [
  makePreset(
    "natural",
    "Luz natural",
    "Ideal para retail presencial y dashboards con alto contraste.",
    ["#2563EB", "#10B981", "#F59E0B", "#0F172A"],
    {
      primary: "#2563EB",
      secondary: "#1D4ED8",
      accent: "#10B981",
      success: "#34D399",
      alert: "#F59E0B",
      background: "#0F172A",
      surface: "#1E293B",
      card: "#111827",
      cardForeground: "#F8FAFC",
      orderQty: "#F59E0B",
      nav: "#0B1220",
      textPrimary: "#F8FAFC",
      textSecondary: "#94A3B8",
    }
  ),
  makePreset(
    "nocturno",
    "Modo nocturno",
    "Pensado para operar en depósitos y ambientes con poca luz.",
    ["#6366F1", "#0EA5E9", "#EC4899", "#020617"],
    {
      primary: "#6366F1",
      secondary: "#312E81",
      accent: "#0EA5E9",
      success: "#22D3EE",
      alert: "#EC4899",
      background: "#020617",
      surface: "#111827",
      card: "#1F2937",
      cardForeground: "#E2E8F0",
      orderQty: "#EC4899",
      nav: "#0B1120",
      textPrimary: "#E2E8F0",
      textSecondary: "#94A3B8",
    }
  ),
  makePreset(
    "gondola",
    "Góndola fresca",
    "Colores claros para destacar perecederos y promociones.",
    ["#38BDF8", "#22C55E", "#F97316", "#FFFFFF"],
    {
      primary: "#38BDF8",
      secondary: "#22D3EE",
      accent: "#A855F7",
      success: "#22C55E",
      alert: "#F97316",
      background: "#F8FAFC",
      surface: "#E2E8F0",
      card: "#FFFFFF",
      cardForeground: "#0F172A",
      orderQty: "#F97316",
      nav: "#E2E8F0",
      textPrimary: "#0F172A",
      textSecondary: "#475569",
    }
  ),
];
