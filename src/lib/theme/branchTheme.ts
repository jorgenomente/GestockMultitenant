"use client";

export const THEME_SETTINGS_KEY = "branch-theme";
export const THEME_PRESETS_SETTINGS_KEY = "branch-theme-presets";

export type BranchThemeFormValues = {
  primary: string;
  secondary: string;
  accent: string;
  success: string;
  alert: string;
  background: string;
  surface: string;
  card: string;
  cardForeground: string;
  inputBackground: string;
  orderQty: string;
  nav: string;
  textPrimary: string;
  textSecondary: string;
};

export type ThemePreset = {
  id: string;
  name: string;
  description?: string | null;
  values: BranchThemeFormValues;
  createdAt?: string | null;
};

type RawThemeValue = Record<string, unknown> | null | undefined;

const TEXT_PRIMARY_FALLBACK = "#F5F5F2";
const TEXT_SECONDARY_FALLBACK = "#B9BBB8";

export const DEFAULT_BRANCH_THEME: BranchThemeFormValues = {
  primary: "#7DAA92",
  secondary: "#4B5B53",
  accent: "#7394B0",
  success: "#8FBDA5",
  alert: "#C1643B",
  background: "#1C2623",
  surface: "#3C4A44",
  card: "#2F3B37",
  cardForeground: TEXT_PRIMARY_FALLBACK,
  inputBackground: "#FFFFFF",
  orderQty: "#D6815A",
  nav: "#2C3A33",
  textPrimary: TEXT_PRIMARY_FALLBACK,
  textSecondary: TEXT_SECONDARY_FALLBACK,
};

export const BRANCH_THEME_FIELDS: Array<keyof BranchThemeFormValues> = [
  "primary",
  "secondary",
  "accent",
  "success",
  "alert",
  "background",
  "surface",
  "card",
  "cardForeground",
  "inputBackground",
  "orderQty",
  "nav",
  "textPrimary",
  "textSecondary",
];

export function sanitizeHexColor(input: unknown, fallback: string): string {
  if (typeof input !== "string") return normalizeHex(fallback);
  const trimmed = input.trim();
  if (/^#[0-9a-fA-F]{3}$/.test(trimmed)) {
    const r = trimmed[1];
    const g = trimmed[2];
    const b = trimmed[3];
    return normalizeHex(`#${r}${r}${g}${g}${b}${b}`);
  }
  if (/^#[0-9a-fA-F]{6}$/.test(trimmed)) {
    return normalizeHex(trimmed);
  }
  return normalizeHex(fallback);
}

function normalizeHex(value: string): string {
  return value.toUpperCase();
}

export function sanitizeStoredTheme(raw: RawThemeValue): BranchThemeFormValues {
  const base: Record<string, unknown> = raw && typeof raw === "object" ? raw : {};
  const sanitized: BranchThemeFormValues = { ...DEFAULT_BRANCH_THEME };
  for (const key of BRANCH_THEME_FIELDS) {
    sanitized[key] = sanitizeHexColor(base[key], DEFAULT_BRANCH_THEME[key]);
  }
  return sanitized;
}

export function sanitizeThemePresetList(raw: unknown): ThemePreset[] {
  const base = raw && typeof raw === "object" ? (raw as Record<string, unknown>) : {};
  const possible = Array.isArray((base as { presets?: unknown }).presets)
    ? ((base as { presets?: unknown }).presets as unknown[])
    : Array.isArray(raw)
      ? (raw as unknown[])
      : [];

  const seen = new Set<string>();
  const sanitized: ThemePreset[] = [];

  for (const entry of possible) {
    if (!entry || typeof entry !== "object") continue;
    const record = entry as Record<string, unknown>;
    const rawName = record.name;
    const rawId = record.id;
    const rawDescription = record.description;
    const rawCreated = record.createdAt ?? record.created_at ?? record.updatedAt ?? null;
    const values = sanitizeStoredTheme(record.values as RawThemeValue);

    const name = typeof rawName === "string" ? rawName.trim() : "";
    if (!name) continue;

    const id = typeof rawId === "string" && rawId.trim() ? rawId.trim() : generatePresetId();
    if (seen.has(id)) continue;
    seen.add(id);

    const description = typeof rawDescription === "string" ? rawDescription.trim() : null;
    const createdAt = typeof rawCreated === "string" ? rawCreated : null;

    sanitized.push({ id, name, description, values, createdAt });
  }

  return sanitized;
}

export function buildCssVariableMap(theme: BranchThemeFormValues): Record<string, string> {
  const primary = sanitizeHexColor(theme.primary, DEFAULT_BRANCH_THEME.primary);
  const secondary = sanitizeHexColor(theme.secondary, DEFAULT_BRANCH_THEME.secondary);
  const accent = sanitizeHexColor(theme.accent, DEFAULT_BRANCH_THEME.accent);
  const success = sanitizeHexColor(theme.success, DEFAULT_BRANCH_THEME.success);
  const alert = sanitizeHexColor(theme.alert, DEFAULT_BRANCH_THEME.alert);
  const background = sanitizeHexColor(theme.background, DEFAULT_BRANCH_THEME.background);
  const surface = sanitizeHexColor(theme.surface, DEFAULT_BRANCH_THEME.surface);
  const nav = sanitizeHexColor(theme.nav, DEFAULT_BRANCH_THEME.nav);
  const textPrimary = sanitizeHexColor(theme.textPrimary, DEFAULT_BRANCH_THEME.textPrimary || TEXT_PRIMARY_FALLBACK);
  const textSecondary = sanitizeHexColor(theme.textSecondary, DEFAULT_BRANCH_THEME.textSecondary || TEXT_SECONDARY_FALLBACK);
  const card = sanitizeHexColor(theme.card, DEFAULT_BRANCH_THEME.card ?? surface);
  const cardForeground = sanitizeHexColor(theme.cardForeground, textPrimary);
  const inputBackground = sanitizeHexColor(theme.inputBackground, DEFAULT_BRANCH_THEME.inputBackground);
  const orderQty = sanitizeHexColor(theme.orderQty, DEFAULT_BRANCH_THEME.orderQty);

  const primaryHover = adjustLightness(primary, -0.08);
  const primaryLight = adjustLightness(primary, 0.12);
  const primaryGlow = adjustLightness(primary, 0.22);
  const primaryRing = adjustLightness(primary, 0.24);
  const primarySecondary = adjustLightness(primary, 0.15);
  const primarySecondaryHover = adjustLightness(primary, 0.08);
  const primarySecondaryGlow = adjustLightness(primary, 0.28);

  const surfaceBorder = adjustLightness(surface, 0.1);
  const cardBorder = adjustLightness(card, 0.12);
  const surfaceSwitch = adjustLightness(card, 0.08);

  const navBorder = adjustLightness(nav, 0.12);

  const accentSecondary = adjustLightness(accent, -0.12);
  const accentTertiary = adjustLightness(accent, 0.12);

  const alertHover = adjustLightness(alert, -0.08);

  const secondaryHover = adjustLightness(secondary, -0.08);
  const secondaryLight = adjustLightness(secondary, 0.12);
  const secondaryGlow = adjustLightness(secondary, 0.22);
  const successHover = adjustLightness(success, -0.08);
  const successLight = adjustLightness(success, 0.12);

  const primarySoftSurface = withAlpha(primarySecondary, 0.18);
  const primaryStrongSurface = withAlpha(primarySecondary, 0.22);
  const alertSubtleSurface = withAlpha(alert, 0.18);
  const alertSoftSurface = withAlpha(alert, 0.2);
  const alertStrongSurface = withAlpha(alert, 0.28);
  const honeyHighlight = adjustLightness(alert, 0.18);
  const honeySoftSurface = withAlpha(honeyHighlight, 0.18);
  const accentSoftSurface = withAlpha(accent, 0.18);
  const accentStrongSurface = withAlpha(accent, 0.28);
  const secondarySoftSurface = withAlpha(secondary, 0.18);
  const secondaryStrongSurface = withAlpha(secondary, 0.28);
  const successSoftSurface = withAlpha(success, 0.18);
  const successStrongSurface = withAlpha(success, 0.28);
  const dataSecondarySoftSurface = withAlpha(accent, 0.18);
  const dataSecondaryStrongSurface = withAlpha(accent, 0.2);
  const overlaySurface = withAlpha(surface, 0.9);
  const overlaySurfaceSoft = withAlpha(adjustLightness(surface, -0.04), 0.72);
  const overlaySurfaceMuted = withAlpha(surface, 0.75);
  const overlaySurfaceHover = withAlpha(surface, 0.85);
  const overlaySurfaceStrong = withAlpha(surface, 0.95);
  const mutedSurface = withAlpha(surfaceBorder, 0.4);
  const mutedSurfaceStrong = withAlpha(surfaceBorder, 0.6);
  const backgroundSoftSurface = withAlpha(background, 0.85);
  const backgroundOverlaySurface = withAlpha(background, 0.88);
  const backgroundStrongSurface = withAlpha(background, 0.96);
  const navSoftSurface = withAlpha(nav, 0.75);
  const navHoverSurface = withAlpha(nav, 0.88);
  const navStrongSurface = withAlpha(nav, 0.95);

  const chartPrimary = accent;
  const chartTwo = accentTertiary;
  const chartThree = accentSecondary;
  const chartFour = alert;
  const chartFive = primaryHover;

  const orderCardBackground = withAlpha(adjustLightness(card, 0.35), 0.78);
  const orderCardBorder = withAlpha(adjustLightness(card, 0.45), 0.5);
  const orderCardInnerBackground = withAlpha(adjustLightness(primary, 0.55), 0.5);
  const orderCardInnerBorder = withAlpha(adjustLightness(primary, 0.35), 0.6);
  const orderCardInnerHighlight = withAlpha(adjustLightness(primary, 0.2), 0.7);
  const orderCardPillBackground = withAlpha(adjustLightness(primary, 0.75), 0.7);
  const orderCardPillBorder = withAlpha(adjustLightness(primary, 0.45), 0.6);
  const orderCardAccent = adjustLightness(primary, -0.28);
  const orderCardDivider = withAlpha(adjustLightness(primary, 0.4), 0.38);
  const orderCardHighlight = withAlpha(adjustLightness(alert, 0.12), 0.45);
  const orderCardQtyBackground = withAlpha(adjustLightness(orderQty, 0.55), 0.72);
  const orderCardQtyBorder = withAlpha(adjustLightness(orderQty, 0.25), 0.65);
  const orderCardQtyForeground = adjustLightness(orderQty, -0.42);
  const orderCardQtyHoverBorder = withAlpha(adjustLightness(orderQty, -0.05), 0.85);

  return {
    "--background": background,
    "--foreground": textPrimary,
    "--card": card,
    "--card-foreground": cardForeground,
    "--popover": card,
    "--popover-foreground": cardForeground,
    "--primary": primary,
    "--primary-foreground": textPrimary,
    "--secondary": secondary,
    "--secondary-foreground": textPrimary,
    "--muted": surface,
    "--muted-foreground": textSecondary,
    "--accent": accent,
    "--accent-foreground": textPrimary,
    "--destructive": alert,
    "--destructive-foreground": textPrimary,
    "--success": success,
    "--success-foreground": textPrimary,
    "--border": cardBorder,
    "--input": "transparent",
    "--input-background": inputBackground,
    "--switch-background": surfaceSwitch,
    "--ring": alert,
    "--sidebar": nav,
    "--sidebar-foreground": textPrimary,
    "--sidebar-primary": primary,
    "--sidebar-primary-foreground": textPrimary,
    "--sidebar-accent": surface,
    "--sidebar-accent-foreground": textPrimary,
    "--sidebar-border": navBorder,
    "--sidebar-ring": primaryRing,
    "--color-dark-bg-main": background,
    "--color-dark-surface": surface,
    "--color-dark-nav": nav,
    "--color-dark-text-primary": textPrimary,
    "--color-dark-text-secondary": textSecondary,
    "--color-dark-divider": surfaceBorder,
    "--color-action-primary": primary,
    "--color-action-hover": primaryHover,
    "--color-action-light": primaryLight,
    "--color-action-glow": primaryGlow,
    "--color-action-focus-ring": primaryRing,
    "--color-action-secondary": primarySecondary,
    "--color-action-secondary-hover": primarySecondaryHover,
    "--color-action-secondary-glow": primarySecondaryGlow,
    "--color-secondary": secondary,
    "--color-secondary-hover": secondaryHover,
    "--color-secondary-light": secondaryLight,
    "--color-secondary-glow": secondaryGlow,
    "--color-alert": alert,
    "--color-alert-hover": alertHover,
    "--color-success": success,
    "--color-success-hover": successHover,
    "--color-success-light": successLight,
    "--color-data-primary": chartPrimary,
    "--color-data-secondary": accentSecondary,
    "--surface-overlay": overlaySurface,
    "--surface-overlay-soft": overlaySurfaceSoft,
    "--surface-overlay-muted": overlaySurfaceMuted,
    "--surface-overlay-hover": overlaySurfaceHover,
    "--surface-overlay-strong": overlaySurfaceStrong,
    "--surface-muted": mutedSurface,
    "--surface-muted-strong": mutedSurfaceStrong,
    "--surface-background-soft": backgroundSoftSurface,
    "--surface-background-overlay": backgroundOverlaySurface,
    "--surface-background-strong": backgroundStrongSurface,
    "--surface-nav-soft": navSoftSurface,
    "--surface-nav-hover": navHoverSurface,
    "--surface-nav-strong": navStrongSurface,
    "--surface-action-primary-soft": primarySoftSurface,
    "--surface-action-primary-strong": primaryStrongSurface,
    "--surface-alert-subtle": alertSubtleSurface,
    "--surface-alert-soft": alertSoftSurface,
    "--surface-alert-strong": alertStrongSurface,
    "--surface-honey-soft": honeySoftSurface,
    "--surface-data-secondary-soft": dataSecondarySoftSurface,
    "--surface-data-secondary-strong": dataSecondaryStrongSurface,
    "--surface-secondary-soft": secondarySoftSurface,
    "--surface-secondary-strong": secondaryStrongSurface,
    "--surface-accent-soft": accentSoftSurface,
    "--surface-accent-strong": accentStrongSurface,
    "--surface-success-soft": successSoftSurface,
    "--surface-success-strong": successStrongSurface,
    "--order-card-background": orderCardBackground,
    "--order-card-border": orderCardBorder,
    "--order-card-inner-background": orderCardInnerBackground,
    "--order-card-inner-border": orderCardInnerBorder,
    "--order-card-inner-highlight": orderCardInnerHighlight,
    "--order-card-pill-background": orderCardPillBackground,
    "--order-card-pill-border": orderCardPillBorder,
    "--order-card-accent": orderCardAccent,
    "--order-card-divider": orderCardDivider,
    "--order-card-highlight": orderCardHighlight,
    "--order-card-qty-background": orderCardQtyBackground,
    "--order-card-qty-border": orderCardQtyBorder,
    "--order-card-qty-foreground": orderCardQtyForeground,
    "--order-card-qty-hover-border": orderCardQtyHoverBorder,
    "--chart-1": chartPrimary,
    "--chart-2": chartTwo,
    "--chart-3": chartThree,
    "--chart-4": chartFour,
    "--chart-5": chartFive,
  };
}

const CSS_VARIABLE_KEYS = Object.keys(buildCssVariableMap(DEFAULT_BRANCH_THEME));

export function applyTheme(theme: BranchThemeFormValues) {
  if (typeof window === "undefined") return;
  const root = window.document?.documentElement;
  if (!root) return;
  const map = buildCssVariableMap(theme);
  for (const key of CSS_VARIABLE_KEYS) {
    const value = map[key];
    if (value) {
      root.style.setProperty(key, value);
    } else {
      root.style.removeProperty(key);
    }
  }
}

export function adjustLightness(hex: string, delta: number): string {
  const hsl = hexToHsl(hex);
  if (!hsl) return normalizeHex(hex);
  const next = { ...hsl, l: clamp(hsl.l + delta, 0, 1) };
  return hslToHex(next.h, next.s, next.l);
}

type HSL = { h: number; s: number; l: number };

function hexToHsl(hex: string): HSL | null {
  const rgb = hexToRgb(hex);
  if (!rgb) return null;
  const r = rgb.r / 255;
  const g = rgb.g / 255;
  const b = rgb.b / 255;

  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  let h = 0;
  let s = 0;
  const l = (max + min) / 2;

  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r:
        h = (g - b) / d + (g < b ? 6 : 0);
        break;
      case g:
        h = (b - r) / d + 2;
        break;
      case b:
        h = (r - g) / d + 4;
        break;
    }
    h /= 6;
  }

  return { h, s, l };
}

function hslToHex(h: number, s: number, l: number): string {
  const hue2rgb = (p: number, q: number, t: number) => {
    if (t < 0) t += 1;
    if (t > 1) t -= 1;
    if (t < 1 / 6) return p + (q - p) * 6 * t;
    if (t < 1 / 2) return q;
    if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
    return p;
  };

  let r: number;
  let g: number;
  let b: number;

  if (s === 0) {
    r = g = b = l; // achromatic
  } else {
    const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
    const p = 2 * l - q;
    r = hue2rgb(p, q, h + 1 / 3);
    g = hue2rgb(p, q, h);
    b = hue2rgb(p, q, h - 1 / 3);
  }

  const toHex = (x: number) => {
    const v = Math.round(x * 255);
    return v.toString(16).padStart(2, "0");
  };

  return `#${toHex(r)}${toHex(g)}${toHex(b)}`.toUpperCase();
}

function hexToRgb(hex: string): { r: number; g: number; b: number } | null {
  const normalized = sanitizeHexColor(hex, DEFAULT_BRANCH_THEME.primary);
  const match = normalized.match(/^#([0-9A-F]{6})$/i);
  if (!match) return null;
  const int = parseInt(match[1], 16);
  const r = (int >> 16) & 255;
  const g = (int >> 8) & 255;
  const b = int & 255;
  return { r, g, b };
}

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

function withAlpha(hex: string, alpha: number): string {
  const rgb = hexToRgb(hex);
  if (!rgb) return hex;
  const clamped = clamp(alpha, 0, 1);
  const a = Number.isFinite(clamped) ? clamped : 1;
  return `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${a.toFixed(3)})`;
}

function generatePresetId(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return `preset-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}
