"use client";

export const THEME_SETTINGS_KEY = "branch-theme";

export type BranchThemeFormValues = {
  primary: string;
  accent: string;
  background: string;
  surface: string;
  nav: string;
  alert: string;
  secondary: string;
  success: string;
};

type RawThemeValue = Record<string, unknown> | null | undefined;

const TEXT_PRIMARY = "#F5F5F2";
const TEXT_SECONDARY = "#B9BBB8";

export const DEFAULT_BRANCH_THEME: BranchThemeFormValues = {
  primary: "#7DAA92",
  accent: "#7394B0",
  background: "#1C2623",
  surface: "#3C4A44",
  nav: "#2C3A33",
  alert: "#C1643B",
  secondary: "#4B5B53",
  success: "#8FBDA5",
};

export const BRANCH_THEME_FIELDS: Array<keyof BranchThemeFormValues> = [
  "primary",
  "accent",
  "background",
  "surface",
  "nav",
  "alert",
  "secondary",
  "success",
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

export function buildCssVariableMap(theme: BranchThemeFormValues): Record<string, string> {
  const primary = sanitizeHexColor(theme.primary, DEFAULT_BRANCH_THEME.primary);
  const accent = sanitizeHexColor(theme.accent, DEFAULT_BRANCH_THEME.accent);
  const background = sanitizeHexColor(theme.background, DEFAULT_BRANCH_THEME.background);
  const surface = sanitizeHexColor(theme.surface, DEFAULT_BRANCH_THEME.surface);
  const nav = sanitizeHexColor(theme.nav, DEFAULT_BRANCH_THEME.nav);
  const alert = sanitizeHexColor(theme.alert, DEFAULT_BRANCH_THEME.alert);
  const secondary = sanitizeHexColor(theme.secondary, DEFAULT_BRANCH_THEME.secondary);
  const success = sanitizeHexColor(theme.success, DEFAULT_BRANCH_THEME.success);

  const primaryHover = adjustLightness(primary, -0.08);
  const primaryLight = adjustLightness(primary, 0.12);
  const primaryGlow = adjustLightness(primary, 0.22);
  const primaryRing = adjustLightness(primary, 0.24);
  const primarySecondary = adjustLightness(primary, 0.15);
  const primarySecondaryHover = adjustLightness(primary, 0.08);
  const primarySecondaryGlow = adjustLightness(primary, 0.28);

  const surfaceBorder = adjustLightness(surface, 0.1);
  const surfaceSwitch = adjustLightness(surface, 0.08);

  const navBorder = adjustLightness(nav, 0.12);
  const navAccent = adjustLightness(nav, 0.18);

  const accentSecondary = adjustLightness(accent, -0.12);
  const accentTertiary = adjustLightness(accent, 0.12);

  const alertHover = adjustLightness(alert, -0.08);

  const secondaryHover = adjustLightness(secondary, -0.08);
  const secondaryLight = adjustLightness(secondary, 0.12);
  const secondaryGlow = adjustLightness(secondary, 0.22);
  const successHover = adjustLightness(success, -0.08);
  const successLight = adjustLightness(success, 0.12);

  const chartPrimary = accent;
  const chartTwo = accentTertiary;
  const chartThree = accentSecondary;
  const chartFour = alert;
  const chartFive = primaryHover;

  return {
    "--background": background,
    "--foreground": TEXT_PRIMARY,
    "--card": surface,
    "--card-foreground": TEXT_PRIMARY,
    "--popover": surface,
    "--popover-foreground": TEXT_PRIMARY,
    "--primary": primary,
    "--primary-foreground": TEXT_PRIMARY,
    "--secondary": navAccent,
    "--secondary-foreground": TEXT_PRIMARY,
    "--muted": surface,
    "--muted-foreground": TEXT_SECONDARY,
    "--accent": primary,
    "--accent-foreground": TEXT_PRIMARY,
    "--destructive": alert,
    "--destructive-foreground": TEXT_PRIMARY,
    "--success": success,
    "--success-foreground": TEXT_PRIMARY,
    "--border": surfaceBorder,
    "--input": "transparent",
    "--input-background": surfaceSwitch,
    "--switch-background": surfaceSwitch,
    "--ring": alert,
    "--sidebar": nav,
    "--sidebar-foreground": TEXT_PRIMARY,
    "--sidebar-primary": primary,
    "--sidebar-primary-foreground": TEXT_PRIMARY,
    "--sidebar-accent": surface,
    "--sidebar-accent-foreground": TEXT_PRIMARY,
    "--sidebar-border": navBorder,
    "--sidebar-ring": primaryRing,
    "--color-dark-bg-main": background,
    "--color-dark-surface": surface,
    "--color-dark-nav": nav,
    "--color-dark-text-primary": TEXT_PRIMARY,
    "--color-dark-text-secondary": TEXT_SECONDARY,
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
