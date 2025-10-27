"use client";

import React from "react";
import { useParams } from "next/navigation";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useBranch } from "@/components/branch/BranchProvider";
import { useBranchTheme } from "@/components/theme/BranchThemeProvider";
import { getSupabaseBrowserClient } from "@/lib/supabaseClient";
import {
  BRANCH_THEME_FIELDS,
  BranchThemeFormValues,
  DEFAULT_BRANCH_THEME,
  THEME_SETTINGS_KEY,
  THEME_PRESETS_SETTINGS_KEY,
  ThemePreset,
  buildCssVariableMap,
  sanitizeHexColor,
  sanitizeStoredTheme,
  sanitizeThemePresetList,
} from "@/lib/theme/branchTheme";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Loader2, X } from "lucide-react";

type StatusState = "idle" | "saving" | "success" | "error";

const FIELD_METADATA: Record<keyof BranchThemeFormValues, { label: string; description: string }> = {
  primary: {
    label: "Color primario",
    description: "Botones principales, estados activos y CTA",
  },
  secondary: {
    label: "Acciones secundarias",
    description: "Botones alternativos, chips y badges neutros",
  },
  accent: {
    label: "Color de datos",
    description: "Gráficos, indicadores y elementos analíticos",
  },
  success: {
    label: "Estado positivo",
    description: "Confirmaciones, indicadores de éxito y toasts",
  },
  alert: {
    label: "Alertas / Peligro",
    description: "Acciones destructivas y mensajes críticos",
  },
  background: {
    label: "Fondo principal",
    description: "Color de fondo general del aplicativo",
  },
  surface: {
    label: "Superficies elevadas",
    description: "Paneles, popovers y contenedores secundarios",
  },
  card: {
    label: "Tarjetas y listados",
    description: "Fondo de tarjetas, listados y bloques destacados",
  },
  cardForeground: {
    label: "Texto en tarjetas",
    description: "Color del contenido dentro de tarjetas",
  },
  nav: {
    label: "Navegación",
    description: "Sidebar, BottomNav y menús principales",
  },
  textPrimary: {
    label: "Texto principal",
    description: "Titulares, subtítulos y textos destacados",
  },
  textSecondary: {
    label: "Texto secundario",
    description: "Descripciones, ayudas visuales y etiquetas",
  },
};

type FieldSection = {
  title: string;
  description?: string;
  fields: Array<keyof BranchThemeFormValues>;
};

const FIELD_SECTIONS: FieldSection[] = [
  {
    title: "Acciones y estados",
    fields: ["primary", "secondary", "accent", "success", "alert"],
  },
  {
    title: "Superficies",
    description: "Definí el contraste de fondo, tarjetas, navegación y contenedores",
    fields: ["background", "surface", "card", "cardForeground", "nav"],
  },
  {
    title: "Tipografía",
    fields: ["textPrimary", "textSecondary"],
  },
];

const HEX_FULL_REGEX = /^#[0-9A-F]{6}$/;

const EMPTY_PRESETS: ThemePreset[] = [];

const clamp01 = (value: number) => Math.max(0, Math.min(1, value));

const normalizeHue = (value: number) => {
  const mod = value % 360;
  return mod < 0 ? mod + 360 : mod;
};

const hslToHex = (h: number, s: number, l: number): string => {
  const hue = normalizeHue(h) / 360;
  const saturation = clamp01(s);
  const lightness = clamp01(l);

  if (saturation === 0) {
    const channel = Math.round(lightness * 255)
      .toString(16)
      .padStart(2, "0");
    return `#${channel}${channel}${channel}`.toUpperCase();
  }

  const q = lightness < 0.5 ? lightness * (1 + saturation) : lightness + saturation - lightness * saturation;
  const p = 2 * lightness - q;

  const hueToChannel = (t: number) => {
    let temp = t;
    if (temp < 0) temp += 1;
    if (temp > 1) temp -= 1;
    if (temp < 1 / 6) return p + (q - p) * 6 * temp;
    if (temp < 1 / 2) return q;
    if (temp < 2 / 3) return p + (q - p) * (2 / 3 - temp) * 6;
    return p;
  };

  const r = hueToChannel(hue + 1 / 3);
  const g = hueToChannel(hue);
  const b = hueToChannel(hue - 1 / 3);

  const toHex = (channel: number) => Math.round(channel * 255)
    .toString(16)
    .padStart(2, "0");

  return `#${toHex(r)}${toHex(g)}${toHex(b)}`.toUpperCase();
};

function generateRandomTheme(): BranchThemeFormValues {
  const baseHue = Math.random() * 360;
  const isDark = Math.random() < 0.6;

  const primaryHue = baseHue;
  const secondaryHue = baseHue + 210;
  const accentHue = baseHue + 35;
  const successHue = baseHue + 110;
  const alertHue = baseHue + 330;
  const backgroundHue = baseHue + (isDark ? 195 : 205);
  const surfaceHue = baseHue + (isDark ? 205 : 198);
  const cardHue = baseHue + (isDark ? 212 : 190);
  const navHue = baseHue + (isDark ? 188 : 210);

  const background = hslToHex(backgroundHue, isDark ? 0.22 : 0.16, isDark ? 0.13 : 0.93);
  const surface = hslToHex(surfaceHue, isDark ? 0.24 : 0.18, isDark ? 0.19 : 0.88);
  const card = hslToHex(cardHue, isDark ? 0.22 : 0.14, isDark ? 0.25 : 0.96);
  const nav = hslToHex(navHue, isDark ? 0.3 : 0.2, isDark ? 0.18 : 0.9);

  const textPrimary = isDark ? "#F6F7F5" : "#1F2420";
  const textSecondary = isDark ? "#C3CDC8" : "#55665E";

  return {
    primary: hslToHex(primaryHue, isDark ? 0.54 : 0.58, isDark ? 0.48 : 0.42),
    secondary: hslToHex(secondaryHue, isDark ? 0.36 : 0.3, isDark ? 0.32 : 0.34),
    accent: hslToHex(accentHue, isDark ? 0.58 : 0.5, isDark ? 0.5 : 0.45),
    success: hslToHex(successHue, isDark ? 0.5 : 0.48, isDark ? 0.48 : 0.4),
    alert: hslToHex(alertHue, 0.6, isDark ? 0.48 : 0.5),
    background,
    surface,
    card,
    cardForeground: textPrimary,
    nav,
    textPrimary,
    textSecondary,
  };
}

type PresetWithSource = ThemePreset & {
  source: "builtin" | "custom";
  preview?: Partial<Record<keyof BranchThemeFormValues, string>>;
};

const gradientBackground = (from: string, to: string) => `linear-gradient(135deg, ${from}, ${to})`;

const HIDDEN_PRESETS_STORAGE_KEY = "theme-hidden-presets";

const BUILTIN_THEME_PRESETS: PresetWithSource[] = [
  {
    id: "bosque",
    name: "Bosque calmado",
    description: "Verde musgo con acentos analíticos neutros",
    values: {
      primary: "#7DAA92",
      secondary: "#4B5B53",
      accent: "#7394B0",
      success: "#8FBDA5",
      alert: "#C1643B",
      background: "#1C2623",
      surface: "#3C4A44",
      card: "#2F3B37",
      cardForeground: "#F5F5F2",
      nav: "#2C3A33",
      textPrimary: "#F5F5F2",
      textSecondary: "#B9BBB8",
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
      success: "#A3C585",
      alert: "#E76F51",
      background: "#1D1A1A",
      surface: "#2C2625",
      card: "#332B29",
      cardForeground: "#F6E6DB",
      nav: "#231F1F",
      textPrimary: "#F6E6DB",
      textSecondary: "#D2B7A8",
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
      success: "#5FC4A5",
      alert: "#D86B5B",
      background: "#101921",
      surface: "#1B2A33",
      card: "#16242C",
      cardForeground: "#E6F3F6",
      nav: "#18242C",
      textPrimary: "#E6F3F6",
      textSecondary: "#A5B8C4",
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
      success: "#6BAA7A",
      alert: "#C1584A",
      background: "#F5F5F5",
      surface: "#EFEFEF",
      card: "#FFFFFF",
      cardForeground: "#1F1F1F",
      nav: "#FFFFFF",
      textPrimary: "#1F1F1F",
      textSecondary: "#5A5A5A",
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
      success: "#1FBF7A",
      alert: "#D65353",
      background: "#050809",
      surface: "#11181B",
      card: "#0C1214",
      cardForeground: "#E6F7F7",
      nav: "#0A1114",
      textPrimary: "#E6F7F7",
      textSecondary: "#93B5B5",
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
      success: "#4FD08E",
      alert: "#C75234",
      background: "#F8FAF5",
      surface: "#E8F1E7",
      card: "#FFFFFF",
      cardForeground: "#1E3D2C",
      nav: "#0E1A12",
      textPrimary: "#1E3D2C",
      textSecondary: "#4F6C5E",
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
      success: "#74D6B5",
      alert: "#FF7B6B",
      background: "#1C1F2A",
      surface: "#242A36",
      card: "#1F2532",
      cardForeground: "#F1F3FF",
      nav: "#1B202D",
      textPrimary: "#F1F3FF",
      textSecondary: "#B9C1D6",
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
      success: "#2DB5A3",
      alert: "#D45D3F",
      background: "#121719",
      surface: "#1F2A2F",
      card: "#192227",
      cardForeground: "#F4F0EC",
      nav: "#1A2327",
      textPrimary: "#F4F0EC",
      textSecondary: "#B3C0C6",
    },
  },
  {
    id: "futuristic-city",
    name: "Futuristic City",
    description: "Tonos tecnológicos con contraste entre índigo y teal",
    values: {
      primary: "#4A3AB8",
      secondary: "#14263A",
      accent: "#0097A7",
      success: "#29C3BC",
      alert: "#8A2E7B",
      background: "#0B1521",
      surface: "#131F30",
      card: "#1B2E44",
      cardForeground: "#E9ECFF",
      nav: "#101C2F",
      textPrimary: "#E9ECFF",
      textSecondary: "#A7B5D9",
    },
  },
  {
    id: "dark-forest",
    name: "Dark Forest",
    description: "Verdes sombríos con notas cálidas de corteza",
    values: {
      primary: "#2C3F3A",
      secondary: "#1E2A2A",
      accent: "#5A5A3A",
      success: "#6F8E4B",
      alert: "#6B4634",
      background: "#121B1B",
      surface: "#1B2726",
      card: "#233330",
      cardForeground: "#F1F2EC",
      nav: "#182321",
      textPrimary: "#F1F2EC",
      textSecondary: "#B3C1B8",
    },
  },
  {
    id: "full-moon",
    name: "Full Moon",
    description: "Grises lunares con destellos cálidos de brasa",
    values: {
      primary: "#D4553E",
      secondary: "#343A43",
      accent: "#6A6874",
      success: "#4AA996",
      alert: "#E1684A",
      background: "#1E222B",
      surface: "#2A303A",
      card: "#313741",
      cardForeground: "#F6D8A6",
      nav: "#232832",
      textPrimary: "#F6D8A6",
      textSecondary: "#C0C4CE",
    },
  },
  {
    id: "flame",
    name: "Flame",
    description: "Rojos encendidos con brillos ámbar y ceniza suave",
    values: {
      primary: "#E1461C",
      secondary: "#C12A1C",
      accent: "#F0892B",
      success: "#73C27A",
      alert: "#C12A1C",
      background: "#1C1010",
      surface: "#291614",
      card: "#321B17",
      cardForeground: "#FCECCF",
      nav: "#221311",
      textPrimary: "#FCECCF",
      textSecondary: "#E9BEA3",
    },
  },
  {
    id: "sunset",
    name: "Sunset",
    description: "Transiciones cálidas entre violeta, rosa y durazno",
    values: {
      primary: "#6B2F57",
      secondary: "#2D3146",
      accent: "#F6BB6A",
      success: "#5FB59C",
      alert: "#EA8C95",
      background: "#1C1C29",
      surface: "#272538",
      card: "#312E44",
      cardForeground: "#F5ECF5",
      nav: "#242137",
      textPrimary: "#F5ECF5",
      textSecondary: "#C6B5C6",
    },
  },
  {
    id: "snowy-mountain",
    name: "Snowy Mountain",
    description: "Azules alpinos con reflejos helados y nieve pura",
    values: {
      primary: "#35546B",
      secondary: "#132633",
      accent: "#B7CAD6",
      success: "#6EB6C2",
      alert: "#D87373",
      background: "#0E1C28",
      surface: "#162836",
      card: "#1F3344",
      cardForeground: "#F8FBFF",
      nav: "#15293A",
      textPrimary: "#F8FBFF",
      textSecondary: "#C6D5E0",
    },
  },
].map((preset) => ({ ...preset, source: "builtin" as const }));

const BUILTIN_GRADIENT_THEME_PRESETS: PresetWithSource[] = [
  {
    id: "futuristic-city-gradient",
    name: "Futuristic City (Gradiente)",
    description: "Contrastes neón entre índigo, magenta y teal",
    values: {
      primary: "#8A2E7B",
      secondary: "#4A3AB8",
      accent: "#0097A7",
      success: "#3ED1C6",
      alert: "#FF5FA9",
      background: "#14263A",
      surface: "#1D2F48",
      card: "#243A56",
      cardForeground: "#F6F2FF",
      nav: "#1A2740",
      textPrimary: "#F6F2FF",
      textSecondary: "#BFC7E6",
    },
    preview: {
      primary: gradientBackground("#4A3AB8", "#8A2E7B"),
      secondary: gradientBackground("#14263A", "#4A3AB8"),
      accent: gradientBackground("#0097A7", "#4A3AB8"),
      success: gradientBackground("#0097A7", "#3ED1C6"),
      alert: gradientBackground("#8A2E7B", "#FF5FA9"),
      background: gradientBackground("#0B1521", "#14263A"),
      surface: gradientBackground("#131F30", "#1D2F48"),
      card: gradientBackground("#1B2E44", "#243A56"),
    },
  },
  {
    id: "dark-forest-gradient",
    name: "Dark Forest (Gradiente)",
    description: "Bosque profundo con destellos musgo y corteza",
    values: {
      primary: "#5A5A3A",
      secondary: "#2C3F3A",
      accent: "#1E2A2A",
      success: "#8BBF5A",
      alert: "#8C563F",
      background: "#1E2A2A",
      surface: "#253632",
      card: "#2F433D",
      cardForeground: "#F2F4E8",
      nav: "#21332F",
      textPrimary: "#F2F4E8",
      textSecondary: "#C1D1C3",
    },
    preview: {
      primary: gradientBackground("#2C3F3A", "#6F8E4B"),
      secondary: gradientBackground("#1E2A2A", "#2C3F3A"),
      accent: gradientBackground("#1E2A2A", "#5A5A3A"),
      success: gradientBackground("#6F8E4B", "#8BBF5A"),
      alert: gradientBackground("#6B4634", "#8C563F"),
      background: gradientBackground("#121B1B", "#1E2A2A"),
      surface: gradientBackground("#1B2726", "#253632"),
      card: gradientBackground("#233330", "#2F433D"),
    },
  },
  {
    id: "full-moon-gradient",
    name: "Full Moon (Gradiente)",
    description: "Paleta lunar con brillos cálidos de vela",
    values: {
      primary: "#F6D8A6",
      secondary: "#6A6874",
      accent: "#D4553E",
      success: "#5FC1A6",
      alert: "#FF8066",
      background: "#343A43",
      surface: "#3E4450",
      card: "#484E59",
      cardForeground: "#FFF4E2",
      nav: "#3B414C",
      textPrimary: "#FFF4E2",
      textSecondary: "#D2CED9",
    },
    preview: {
      primary: gradientBackground("#D4553E", "#F6D8A6"),
      secondary: gradientBackground("#343A43", "#6A6874"),
      accent: gradientBackground("#6A6874", "#D4553E"),
      success: gradientBackground("#4AA996", "#5FC1A6"),
      alert: gradientBackground("#E1684A", "#FF8066"),
      background: gradientBackground("#1E222B", "#343A43"),
      surface: gradientBackground("#2A303A", "#3E4450"),
      card: gradientBackground("#313741", "#484E59"),
    },
  },
  {
    id: "flame-gradient",
    name: "Flame (Gradiente)",
    description: "Rojo fundido con destellos ámbar en movimiento",
    values: {
      primary: "#F0892B",
      secondary: "#E1461C",
      accent: "#C12A1C",
      success: "#7FCE82",
      alert: "#FF6B3D",
      background: "#2D1610",
      surface: "#361D15",
      card: "#3F2419",
      cardForeground: "#FFF2DD",
      nav: "#2F1A14",
      textPrimary: "#FFF2DD",
      textSecondary: "#F2C5A5",
    },
    preview: {
      primary: gradientBackground("#C12A1C", "#F0892B"),
      secondary: gradientBackground("#C12A1C", "#E1461C"),
      accent: gradientBackground("#E1461C", "#F0892B"),
      success: gradientBackground("#73C27A", "#7FCE82"),
      alert: gradientBackground("#E1461C", "#FF6B3D"),
      background: gradientBackground("#1C1010", "#2D1610"),
      surface: gradientBackground("#291614", "#361D15"),
      card: gradientBackground("#321B17", "#3F2419"),
    },
  },
  {
    id: "sunset-gradient",
    name: "Sunset (Gradiente)",
    description: "De violeta a durazno con brillos rosados",
    values: {
      primary: "#EA8C95",
      secondary: "#6B2F57",
      accent: "#F6BB6A",
      success: "#6AC9AF",
      alert: "#FF9CA3",
      background: "#2D3146",
      surface: "#343554",
      card: "#3D3A5F",
      cardForeground: "#FFF0F2",
      nav: "#31345A",
      textPrimary: "#FFF0F2",
      textSecondary: "#D3C3D1",
    },
    preview: {
      primary: gradientBackground("#6B2F57", "#EA8C95"),
      secondary: gradientBackground("#2D3146", "#6B2F57"),
      accent: gradientBackground("#EA8C95", "#F6BB6A"),
      success: gradientBackground("#5FB59C", "#6AC9AF"),
      alert: gradientBackground("#EA8C95", "#FF9CA3"),
      background: gradientBackground("#1C1C29", "#2D3146"),
      surface: gradientBackground("#272538", "#343554"),
      card: gradientBackground("#312E44", "#3D3A5F"),
    },
  },
  {
    id: "snowy-mountain-gradient",
    name: "Snowy Mountain (Gradiente)",
    description: "Azules glaciares con brillo níveo",
    values: {
      primary: "#B7CAD6",
      secondary: "#35546B",
      accent: "#F8FBFF",
      success: "#86D0DD",
      alert: "#FF8A8A",
      background: "#132633",
      surface: "#1B3446",
      card: "#244055",
      cardForeground: "#FFFFFF",
      nav: "#1E364A",
      textPrimary: "#FFFFFF",
      textSecondary: "#D2E0EA",
    },
    preview: {
      primary: gradientBackground("#35546B", "#B7CAD6"),
      secondary: gradientBackground("#132633", "#35546B"),
      accent: gradientBackground("#B7CAD6", "#F8FBFF"),
      success: gradientBackground("#6EB6C2", "#86D0DD"),
      alert: gradientBackground("#D87373", "#FF8A8A"),
      background: gradientBackground("#0E1C28", "#132633"),
      surface: gradientBackground("#162836", "#1B3446"),
      card: gradientBackground("#1F3344", "#244055"),
    },
  },
].map((preset) => ({ ...preset, source: "builtin" as const }));

const BUILTIN_PRESET_COLLECTIONS: Array<{
  id: string;
  title: string;
  description?: string;
  presets: PresetWithSource[];
}> = [
  {
    id: "base",
    title: "Colección base",
    presets: BUILTIN_THEME_PRESETS,
  },
  {
    id: "gradient",
    title: "Colección gradiente",
    description: "Paletas con transiciones suaves para inspirar combinaciones más atrevidas.",
    presets: BUILTIN_GRADIENT_THEME_PRESETS,
  },
];

export default function ConfiguracionPageClient() {
  const params = useParams<{ slug: string }>();
  const slug = (params?.slug ?? "").toString();

  const queryClient = useQueryClient();
  const { currentBranch, loading: branchLoading, role } = useBranch();
  const { theme, source, loading: themeLoading, branchId, tenantId, uploadedAt, refetch } = useBranchTheme();
  const supabase = React.useMemo(() => getSupabaseBrowserClient(), []);

  const [formValues, setFormValues] = React.useState<BranchThemeFormValues>(() => ({ ...theme }));
  const [draftValues, setDraftValues] = React.useState<Record<keyof BranchThemeFormValues, string>>(() => ({ ...theme }));
  const [status, setStatus] = React.useState<StatusState>("idle");
  const [error, setError] = React.useState<string | null>(null);
  const [showPresets, setShowPresets] = React.useState(false);
  const [savePresetOpen, setSavePresetOpen] = React.useState(false);
  const [presetName, setPresetName] = React.useState("");
  const [presetStatus, setPresetStatus] = React.useState<StatusState>("idle");
  const [presetListError, setPresetListError] = React.useState<string | null>(null);
  const [presetError, setPresetError] = React.useState<string | null>(null);
  const [deletingPresetId, setDeletingPresetId] = React.useState<string | null>(null);
  const [hiddenPresetIds, setHiddenPresetIds] = React.useState<string[]>([]);
  const [hiddenPresetsHydrated, setHiddenPresetsHydrated] = React.useState(false);
  const presetNameInputRef = React.useRef<HTMLInputElement | null>(null);

  const presetQuery = useQuery<ThemePreset[]>({
    queryKey: ["branch-theme-presets", tenantId],
    enabled: Boolean(tenantId),
    queryFn: async () => {
      if (!tenantId) return [];
      const { data, error: lookupErr } = await supabase
        .from("app_settings")
        .select("value")
        .eq("tenant_id", tenantId)
        .is("branch_id", null)
        .eq("key", THEME_PRESETS_SETTINGS_KEY)
        .maybeSingle();

      if (lookupErr && lookupErr.code !== "PGRST116") {
        console.error("[theme-config] presets lookup error", lookupErr);
        throw new Error(lookupErr.message);
      }

      const rawValue = data?.value as unknown;
      return sanitizeThemePresetList(rawValue);
    },
    staleTime: 1000 * 60,
  });

  const presetsLoading = presetQuery.isLoading;
  const presetsFetching = presetQuery.isFetching;
  const presetsError = presetQuery.isError ? (presetQuery.error as Error) : null;
  const customPresets = presetQuery.data ?? EMPTY_PRESETS;
  const customPresetCards = React.useMemo(() => customPresets.map((preset) => ({ ...preset, source: "custom" as const })), [customPresets]);
  const presetNameIsValid = presetName.trim().length >= 3;
  const previewVars = React.useMemo(() => buildCssVariableMap(formValues), [formValues]);
  const previewStyle = React.useMemo(() => previewVars as React.CSSProperties, [previewVars]);
  const hiddenPresetIdSet = React.useMemo(() => new Set(hiddenPresetIds), [hiddenPresetIds]);

  const canEdit = role === "owner";

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

  const applyValues = React.useCallback((values: BranchThemeFormValues) => {
    const sanitized = sanitizeStoredTheme(values);
    setFormValues({ ...sanitized });
    setDraftValues({ ...sanitized });
    setStatus("idle");
    setError(null);
  }, [setDraftValues, setError, setFormValues, setStatus]);

  const applyPreset = React.useCallback((preset: ThemePreset) => {
    applyValues(preset.values);
  }, [applyValues]);

  const handleRandomTheme = React.useCallback(() => {
    const randomValues = generateRandomTheme();
    applyValues(randomValues);
  }, [applyValues]);

  const getPresetCaption = React.useCallback((preset: PresetWithSource) => {
    if (preset.source === "custom") {
      if (preset.description) return preset.description;
      if (preset.createdAt) return `Guardado ${formatTimestamp(preset.createdAt)}`;
      return "Tema guardado por vos";
    }
    return preset.description ?? "Sugerencia del sistema";
  }, []);

  const handleSavePreset = React.useCallback(async () => {
    if (!canEdit || presetStatus === "saving") return;
    if (!presetNameIsValid) {
      setPresetError("Elegí un nombre de al menos 3 caracteres");
      return;
    }
    if (!tenantId) {
      setPresetError("Seleccioná una sucursal para vincular el tema");
      return;
    }

    setPresetStatus("saving");
    setPresetError(null);
    setPresetListError(null);

    try {
      const name = presetName.trim();
      const sanitizedValues = sanitizeStoredTheme(formValues);
      const id = typeof crypto !== "undefined" && typeof crypto.randomUUID === "function"
        ? crypto.randomUUID()
        : `preset-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;

      const newPreset: ThemePreset = {
        id,
        name,
        description: null,
        values: sanitizedValues,
        createdAt: new Date().toISOString(),
      };

      const payload = { presets: [...customPresets, newPreset] };
      const response = await fetch(`/api/t/${slug}/settings`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          scope: "global",
          key: THEME_PRESETS_SETTINGS_KEY,
          value: payload,
        }),
      });

      const text = await response.text();
      if (!response.ok) {
        const parsed = parseJson(text);
        const message =
          typeof parsed === "object" && parsed && "error" in parsed && typeof (parsed as { error: unknown }).error === "string"
            ? (parsed as { error: string }).error
            : `No se pudo guardar el tema (HTTP ${response.status})`;
        throw new Error(message);
      }

      queryClient.setQueryData<ThemePreset[] | undefined>(["branch-theme-presets", tenantId], (prev) => {
        const base = Array.isArray(prev) ? [...prev] : [...customPresets];
        const existingIdx = base.findIndex((preset) => preset.id === newPreset.id);
        if (existingIdx >= 0) base[existingIdx] = newPreset;
        else base.push(newPreset);
        return base;
      });

      setPresetStatus("success");
      setSavePresetOpen(false);
      setPresetListError(null);
    } catch (err) {
      const message = err instanceof Error ? err.message : "No se pudo guardar el tema";
      setPresetError(message);
      setPresetStatus("error");
    }
  }, [canEdit, customPresets, formValues, presetName, presetNameIsValid, presetStatus, queryClient, slug, tenantId]);

  const handleDeletePreset = React.useCallback(async (presetId: string) => {
    if (!canEdit || presetStatus === "saving" || deletingPresetId) return;
    if (!tenantId) {
      setPresetListError("Seleccioná una sucursal para editar los temas sugeridos");
      return;
    }

    const remaining = customPresets.filter((preset) => preset.id !== presetId);
    if (remaining.length === customPresets.length) return;

    setDeletingPresetId(presetId);
    setPresetListError(null);

    try {
      const response = await fetch(`/api/t/${slug}/settings`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          scope: "global",
          key: THEME_PRESETS_SETTINGS_KEY,
          value: { presets: remaining },
        }),
      });

      const text = await response.text();
      if (!response.ok) {
        const parsed = parseJson(text);
        const message =
          typeof parsed === "object" && parsed && "error" in parsed && typeof (parsed as { error: unknown }).error === "string"
            ? (parsed as { error: string }).error
            : `No se pudo borrar el tema (HTTP ${response.status})`;
        throw new Error(message);
      }

      queryClient.setQueryData<ThemePreset[] | undefined>(["branch-theme-presets", tenantId], () => remaining);
      setPresetListError(null);
    } catch (err) {
      const message = err instanceof Error ? err.message : "No se pudo borrar el tema";
      setPresetListError(message);
    } finally {
      setDeletingPresetId(null);
    }
  }, [canEdit, customPresets, deletingPresetId, presetStatus, queryClient, slug, tenantId]);

  const handleHideBuiltinPreset = React.useCallback((presetId: string) => {
    setHiddenPresetIds((prev) => {
      if (prev.includes(presetId)) return prev;
      return [...prev, presetId];
    });
  }, []);

  const handleRestoreCollection = React.useCallback((collectionPresetIds: string[]) => {
    if (!collectionPresetIds.length) return;
    setHiddenPresetIds((prev) => prev.filter((id) => !collectionPresetIds.includes(id)));
  }, []);

  React.useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      const raw = window.localStorage.getItem(HIDDEN_PRESETS_STORAGE_KEY);
      if (!raw) {
        setHiddenPresetsHydrated(true);
        return;
      }
      const parsed = JSON.parse(raw) as unknown;
      const ids = Array.isArray(parsed)
        ? parsed.filter((value): value is string => typeof value === "string" && value.trim().length > 0)
        : [];
      setHiddenPresetIds(ids);
    } catch {
      setHiddenPresetIds([]);
    } finally {
      setHiddenPresetsHydrated(true);
    }
  }, []);

  React.useEffect(() => {
    if (!hiddenPresetsHydrated || typeof window === "undefined") return;
    try {
      window.localStorage.setItem(HIDDEN_PRESETS_STORAGE_KEY, JSON.stringify(hiddenPresetIds));
    } catch {
      /* ignore */
    }
  }, [hiddenPresetIds, hiddenPresetsHydrated]);

  React.useEffect(() => {
    if (status !== "success") return;
    const timer = window.setTimeout(() => setStatus("idle"), 3000);
    return () => window.clearTimeout(timer);
  }, [status]);

  React.useEffect(() => {
    if (!savePresetOpen) return;
    window.requestAnimationFrame(() => {
      presetNameInputRef.current?.focus();
    });
  }, [savePresetOpen]);

  React.useEffect(() => {
    if (savePresetOpen) return;
    setPresetStatus("idle");
    setPresetError(null);
    setPresetName("");
  }, [savePresetOpen]);

  if (branchLoading || themeLoading) {
    return (
      <div className="px-4 py-6">
        <div className="mx-auto w-full max-w-3xl rounded-2xl border border-border/60 bg-card/40 p-6 text-sm text-muted-foreground">
          Cargando configuración de tema…
        </div>
      </div>
    );
  }

  if (!currentBranch || !branchId) {
    return (
      <div className="px-4 py-6">
        <div className="mx-auto w-full max-w-3xl rounded-2xl border border-destructive/40 bg-destructive/10 p-6 text-sm text-destructive">
          Seleccioná una sucursal para personalizar sus colores.
        </div>
      </div>
    );
  }

  return (
    <div className="px-4 py-6">
      <div className="mx-auto w-full max-w-5xl space-y-6">
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

        <div className="grid gap-6 lg:grid-cols-[minmax(0,1.7fr)_minmax(280px,0.9fr)]">
          <div className="order-2 space-y-6 lg:order-1">
            <form onSubmit={handleSubmit} className="space-y-6">
              <section className="space-y-8 rounded-2xl border border-border/60 bg-card/60 p-6">
                {FIELD_SECTIONS.map((section) => (
                  <div key={section.title} className="space-y-4">
                    <div>
                      <h3 className="text-sm font-semibold text-foreground">{section.title}</h3>
                      {section.description ? (
                        <p className="text-xs text-muted-foreground">{section.description}</p>
                      ) : null}
                    </div>
                    <div className="grid gap-6 md:grid-cols-2">
                      {section.fields.map((field) => {
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
                    </div>
                  </div>
                ))}
              </section>

              <footer className="flex flex-col items-start gap-3 rounded-2xl border border-border/60 bg-card/50 p-6 md:flex-row md:items-center md:justify-between">
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
                    onClick={() => {
                      if (!canEdit) return;
                      setPresetError(null);
                      setPresetStatus("idle");
                      setPresetName((prev) => prev || `${currentBranch?.name ?? "Tema"} personalizado`);
                      setSavePresetOpen(true);
                    }}
                    disabled={!canEdit || status === "saving" || presetStatus === "saving"}
                    className="inline-flex items-center justify-center rounded-lg border border-border/70 px-4 py-2 text-sm font-medium text-foreground transition hover:bg-muted/40 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    Guardar como tema sugerido
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
              <section className="space-y-6 rounded-2xl border border-border/60 bg-card/50 p-6">
                <div className="flex flex-col gap-1 md:flex-row md:items-center md:justify-between">
                  <div>
                    <h2 className="text-sm font-semibold text-foreground">Temas sugeridos</h2>
                    <p className="text-xs text-muted-foreground">Aplicá un tema guardado o partí de una propuesta base.</p>
                  </div>
                  {presetsFetching ? (
                    <span className="text-[11px] uppercase tracking-wide text-muted-foreground">Actualizando…</span>
                  ) : null}
                </div>

                {presetsError ? (
                  <div className="rounded-xl border border-destructive/40 bg-destructive/10 px-4 py-3 text-xs text-destructive">
                    {`No se pudieron cargar tus temas guardados${presetsError.message ? `: ${presetsError.message}` : "."}`}
                  </div>
                ) : null}

                {customPresetCards.length > 0 ? (
                  <div className="space-y-3">
                    <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Tus temas guardados</p>
                    {presetListError ? (
                      <div className="rounded-xl border border-destructive/40 bg-destructive/10 px-4 py-3 text-xs text-destructive">
                        {presetListError}
                      </div>
                    ) : null}
                    <div className="grid gap-4 md:grid-cols-3">
                      {customPresetCards.map((preset) => {
                        const isDeleting = deletingPresetId === preset.id;
                        return (
                          <div key={`custom-${preset.id}`} className="relative h-full">
                            <button
                              type="button"
                              onClick={() => applyPreset(preset)}
                              disabled={isDeleting}
                              className="group flex h-full w-full flex-col gap-3 rounded-xl border border-border/60 bg-card/70 p-4 text-left transition hover:border-primary/70 hover:bg-primary/10 disabled:cursor-not-allowed disabled:opacity-60"
                            >
                              <div className="flex items-center justify-between gap-2">
                                <h3 className="text-sm font-semibold text-foreground">{preset.name}</h3>
                                <span className="text-xs text-muted-foreground">Aplicar</span>
                              </div>
                              <p className="text-xs text-muted-foreground">{getPresetCaption(preset)}</p>
                              <div className="flex gap-2">
                                {BRANCH_THEME_FIELDS.map((field) => {
                                  const swatchBackground = preset.preview?.[field] ?? preset.values[field];
                                  return (
                                    <span
                                      key={`${preset.id}-${field}`}
                                      className="flex h-8 w-8 items-center justify-center rounded-full border border-border/60 text-[10px] font-medium uppercase text-foreground/70"
                                      style={{ background: swatchBackground }}
                                      title={FIELD_METADATA[field].label}
                                    >
                                      {field.charAt(0)}
                                    </span>
                                  );
                                })}
                              </div>
                              <span className="text-[11px] font-medium uppercase tracking-wide text-primary">Guardado</span>
                            </button>
                            {canEdit ? (
                              <button
                                type="button"
                                aria-label={`Eliminar ${preset.name}`}
                                onClick={(event) => {
                                  event.preventDefault();
                                  event.stopPropagation();
                                  handleDeletePreset(preset.id);
                                }}
                                disabled={isDeleting}
                                className="absolute right-3 top-3 inline-flex h-6 w-6 items-center justify-center rounded-full border border-border/60 bg-card/90 text-muted-foreground transition hover:border-border hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-60"
                              >
                                {isDeleting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <X className="h-3.5 w-3.5" />}
                              </button>
                            ) : null}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ) : presetsLoading ? (
                  <p className="text-xs text-muted-foreground">Cargando tus temas guardados…</p>
                ) : (
                  <p className="text-xs text-muted-foreground">
                    Guardá la paleta actual para reutilizarla rápido en otras sucursales.
                  </p>
                )}
                {BUILTIN_PRESET_COLLECTIONS.map((collection) => {
                  const collectionPresetIds = collection.presets.map((preset) => preset.id);
                  const hiddenCount = collectionPresetIds.reduce(
                    (count, id) => (hiddenPresetIdSet.has(id) ? count + 1 : count),
                    0
                  );
                  const visiblePresets = collection.presets.filter((preset) => !hiddenPresetIdSet.has(preset.id));

                  return (
                    <div key={collection.id} className="space-y-2">
                      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                        <div>
                          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{collection.title}</p>
                          {collection.description ? (
                            <p className="text-xs text-muted-foreground">{collection.description}</p>
                          ) : null}
                        </div>
                        {hiddenCount > 0 ? (
                          <button
                            type="button"
                            onClick={() => handleRestoreCollection(collectionPresetIds)}
                            className="inline-flex items-center justify-center rounded-full border border-border/60 px-3 py-1 text-[11px] font-medium uppercase tracking-wide text-muted-foreground transition hover:border-primary/70 hover:text-primary"
                          >
                            Restaurar ocultos
                          </button>
                        ) : null}
                      </div>

                      {visiblePresets.length > 0 ? (
                        <div className="grid gap-4 md:grid-cols-3">
                          {visiblePresets.map((preset) => {
                            const isCustomPreset = preset.source === "custom";
                            const isDeleting = isCustomPreset && deletingPresetId === preset.id;
                            const canRemove = isCustomPreset ? canEdit : hiddenPresetsHydrated;

                            return (
                              <div key={`builtin-${collection.id}-${preset.id}`} className="relative h-full">
                                <button
                                  type="button"
                                  onClick={() => applyPreset(preset)}
                                  disabled={isDeleting}
                                  className="group flex h-full w-full flex-col gap-3 rounded-xl border border-border/60 bg-card/70 p-4 text-left transition hover:border-primary/70 hover:bg-primary/10 disabled:cursor-not-allowed disabled:opacity-60"
                                >
                                  <div className="flex items-center justify-between gap-2">
                                    <h3 className="text-sm font-semibold text-foreground">{preset.name}</h3>
                                    <span className="text-xs text-muted-foreground">Aplicar</span>
                                  </div>
                                  <p className="text-xs text-muted-foreground">{getPresetCaption(preset)}</p>
                                  <div className="flex gap-2">
                                    {BRANCH_THEME_FIELDS.map((field) => {
                                      const swatchBackground = preset.preview?.[field] ?? preset.values[field];
                                      return (
                                        <span
                                          key={`${preset.id}-${field}`}
                                          className="flex h-8 w-8 items-center justify-center rounded-full border border-border/60 text-[10px] font-medium uppercase text-foreground/70"
                                          style={{ background: swatchBackground }}
                                          title={FIELD_METADATA[field].label}
                                        >
                                          {field.charAt(0)}
                                        </span>
                                      );
                                    })}
                                  </div>
                                </button>
                                {canRemove ? (
                                  <button
                                    type="button"
                                    aria-label={`Eliminar ${preset.name}`}
                                    onClick={(event) => {
                                      event.preventDefault();
                                      event.stopPropagation();
                                      if (isCustomPreset) handleDeletePreset(preset.id);
                                      else handleHideBuiltinPreset(preset.id);
                                    }}
                                    disabled={isDeleting}
                                    className="absolute right-3 top-3 inline-flex h-6 w-6 items-center justify-center rounded-full border border-border/60 bg-card/90 text-muted-foreground transition hover:border-border hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-60"
                                  >
                                    {isDeleting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <X className="h-3.5 w-3.5" />}
                                  </button>
                                ) : null}
                              </div>
                            );
                          })}
                        </div>
                      ) : (
                        <div className="rounded-xl border border-border/60 bg-card/60 px-4 py-5 text-center">
                          <p className="text-xs text-muted-foreground">
                            Ocultaste todos los temas de esta colección. Presioná “Restaurar ocultos” para mostrarlos otra vez.
                          </p>
                        </div>
                      )}
                    </div>
                  );
                })}
              </section>
            )}
          </div>

          <aside className="order-1 space-y-4 lg:order-2">
            <section
              style={previewStyle}
              className="rounded-2xl border border-border/60 bg-background/85 p-6 text-foreground shadow-sm transition-[background-color,color,border-color] lg:sticky lg:top-24"
            >
              <div className="space-y-4">
                <div>
                  <h2 className="text-base font-semibold">Vista previa instantánea</h2>
                  <p className="text-xs text-muted-foreground">
                    Ajustá valores y mirá cómo impactan en componentes clave en vivo.
                  </p>
                </div>

                <div className="space-y-4">
                  <div
                    className="rounded-xl border p-4 shadow-sm transition-colors"
                    style={{
                      background: previewVars["--card"] || DEFAULT_BRANCH_THEME.card,
                      borderColor: previewVars["--border"] || DEFAULT_BRANCH_THEME.surface,
                    }}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p
                          className="text-xs font-semibold uppercase tracking-wide"
                          style={{ color: previewVars["--muted-foreground"] || DEFAULT_BRANCH_THEME.textSecondary }}
                        >
                          Tarjeta ejemplo
                        </p>
                        <h3 className="mt-1 text-lg font-semibold">Producto destacado</h3>
                      </div>
                      <span
                        className="rounded-full px-3 py-1 text-[11px] font-semibold uppercase tracking-wide"
                        style={{
                          background: previewVars["--surface-success-soft"] || "rgba(143, 189, 165, 0.18)",
                          color: previewVars["--success-foreground"] || DEFAULT_BRANCH_THEME.textPrimary,
                          border: `1px solid ${previewVars["--color-success"] || DEFAULT_BRANCH_THEME.success}`,
                        }}
                      >
                        Listo
                      </span>
                    </div>
                    <p
                      className="mt-3 text-sm"
                      style={{ color: previewVars["--muted-foreground"] || DEFAULT_BRANCH_THEME.textSecondary }}
                    >
                      Botones, badges y texto adaptan tu paleta.
                    </p>
                    <div className="mt-4 flex flex-wrap gap-2">
                      <span
                        className="rounded-lg px-3 py-2 text-sm font-semibold shadow-sm transition-colors"
                        style={{
                          background: previewVars["--primary"] || DEFAULT_BRANCH_THEME.primary,
                          color: previewVars["--primary-foreground"] || DEFAULT_BRANCH_THEME.textPrimary,
                        }}
                      >
                        Primario
                      </span>
                      <span
                        className="rounded-lg px-3 py-2 text-sm font-medium transition-colors"
                        style={{
                          background: previewVars["--secondary"] || DEFAULT_BRANCH_THEME.secondary,
                          color: previewVars["--secondary-foreground"] || DEFAULT_BRANCH_THEME.textPrimary,
                        }}
                      >
                        Secundario
                      </span>
                      <span
                        className="rounded-lg px-3 py-2 text-sm font-medium transition-colors"
                        style={{
                          background: previewVars["--destructive"] || DEFAULT_BRANCH_THEME.alert,
                          color: previewVars["--destructive-foreground"] || DEFAULT_BRANCH_THEME.textPrimary,
                        }}
                      >
                        Alerta
                      </span>
                    </div>
                  </div>

                  <div className="space-y-3">
                    <div
                      className="overflow-hidden rounded-xl border shadow-sm transition-colors"
                      style={{
                        background: previewVars["--sidebar"] || DEFAULT_BRANCH_THEME.nav,
                        borderColor: previewVars["--border"] || DEFAULT_BRANCH_THEME.surface,
                        color: previewVars["--sidebar-foreground"] || DEFAULT_BRANCH_THEME.textPrimary,
                      }}
                    >
                      <div
                        className="px-4 py-3 text-sm font-semibold"
                        style={{
                          background: previewVars["--sidebar-primary"] || DEFAULT_BRANCH_THEME.primary,
                          color: previewVars["--sidebar-primary-foreground"] || DEFAULT_BRANCH_THEME.textPrimary,
                        }}
                      >
                        Navegación
                      </div>
                      <div
                        className="space-y-2 px-4 py-3 text-xs"
                        style={{ color: previewVars["--sidebar-foreground"] || DEFAULT_BRANCH_THEME.textPrimary }}
                      >
                        <span className="block font-medium">Item activo</span>
                        <span className="block text-sm" style={{ opacity: 0.72 }}>
                          Hover y foco siguen esta misma relación.
                        </span>
                      </div>
                    </div>

                    <div
                      className="rounded-xl border px-4 py-3 text-xs leading-relaxed transition-colors"
                      style={{
                        background: previewVars["--surface-action-primary-soft"] || "rgba(125, 170, 146, 0.18)",
                        borderColor: previewVars["--border"] || DEFAULT_BRANCH_THEME.surface,
                        color: previewVars["--muted-foreground"] || DEFAULT_BRANCH_THEME.textSecondary,
                      }}
                    >
                      Acentos de datos, alertas y estados usan estas combinaciones.
                    </div>
                  </div>
                </div>

                <div className="space-y-2">
                  <button
                    type="button"
                    onClick={handleRandomTheme}
                    disabled={status === "saving"}
                    className="inline-flex w-full items-center justify-center rounded-lg border border-border/70 px-4 py-2 text-sm font-medium text-foreground transition hover:bg-muted/40 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    Tema al azar
                  </button>
                  <p className="text-[11px] text-muted-foreground">Generá una propuesta armónica para inspirarte.</p>
                </div>
              </div>
            </section>
          </aside>
        </div>
      </div>

      <Dialog
        open={savePresetOpen}
        onOpenChange={(open) => {
          if (presetStatus === "saving") return;
          setSavePresetOpen(open);
        }}
      >
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Guardar tema sugerido</DialogTitle>
            <DialogDescription>
              Asigná un nombre para agregar esta paleta a las sugerencias disponibles en todo el tenant.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <label htmlFor="preset-name" className="text-sm font-medium text-foreground">
                Nombre del tema
              </label>
              <Input
                id="preset-name"
                ref={presetNameInputRef}
                value={presetName}
                onChange={(event) => {
                  setPresetName(event.target.value);
                  if (presetError) setPresetError(null);
                }}
                placeholder="Ej: Inventario otoño"
                disabled={presetStatus === "saving"}
              />
              <p className="text-xs text-muted-foreground">
                Sugerencia global disponible para todas las sucursales de este tenant.
              </p>
            </div>
            {presetError ? <p className="text-xs text-destructive">{presetError}</p> : null}
          </div>

          <DialogFooter className="mt-4 flex gap-2 sm:justify-end">
            <button
              type="button"
              onClick={() => setSavePresetOpen(false)}
              disabled={presetStatus === "saving"}
              className="inline-flex items-center justify-center rounded-lg border border-border/70 px-4 py-2 text-sm font-medium text-foreground transition hover:bg-muted/40 disabled:cursor-not-allowed disabled:opacity-60"
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={handleSavePreset}
              disabled={!presetNameIsValid || presetStatus === "saving"}
              className="inline-flex items-center justify-center rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground transition hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {presetStatus === "saving" ? "Guardando…" : "Guardar tema"}
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
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
