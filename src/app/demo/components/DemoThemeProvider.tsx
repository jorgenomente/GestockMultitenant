"use client";

import React from "react";
import {
  type BranchThemeFormValues,
  DEFAULT_BRANCH_THEME,
  sanitizeStoredTheme,
  buildCssVariableMap,
} from "@/lib/theme/branchTheme";
import { DEMO_THEME_PRESETS, type DemoThemePreset } from "../data/demoThemes";

const THEME_STORAGE_KEY = "gestock:demo:theme";
const PRESET_STORAGE_KEY = "gestock:demo:theme:preset";

type DemoThemeContextValue = {
  theme: BranchThemeFormValues;
  presets: DemoThemePreset[];
  activePresetId: string | null;
  // eslint-disable-next-line no-unused-vars
  applyPreset: (presetId: string) => void;
};

const DemoThemeContext = React.createContext<DemoThemeContextValue | null>(null);

export function DemoThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setThemeState] = React.useState<BranchThemeFormValues>(DEMO_THEME_PRESETS.find((preset) => preset.id === "nocturno")?.values ?? DEFAULT_BRANCH_THEME);
  const [activePresetId, setActivePresetId] = React.useState<string | null>(null);
  const initialVarsRef = React.useRef<Record<string, string> | null>(null);

  // Hydrate from localStorage once on client
  React.useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      const rawTheme = window.localStorage.getItem(THEME_STORAGE_KEY);
      if (rawTheme) {
        const parsed = JSON.parse(rawTheme) as Record<string, unknown>;
        setThemeState(sanitizeStoredTheme(parsed));
      }
    } catch {
      setThemeState(DEMO_THEME_PRESETS.find((preset) => preset.id === "nocturno")?.values ?? DEFAULT_BRANCH_THEME);
    }
    try {
      const storedPreset = window.localStorage.getItem(PRESET_STORAGE_KEY);
      if (storedPreset) {
        setActivePresetId(storedPreset);
      } else {
        setActivePresetId("nocturno");
        const preset = DEMO_THEME_PRESETS.find((p) => p.id === "nocturno");
        if (preset) {
          setThemeState(preset.values);
        }
      }
    } catch {
      setActivePresetId(null);
    }
  }, []);

  const applyPreset = React.useCallback((presetId: string) => {
    const preset = DEMO_THEME_PRESETS.find((p) => p.id === presetId);
    if (!preset) return;
    setThemeState(preset.values);
    setActivePresetId(preset.id);
  }, []);

  // Persist changes
  React.useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      window.localStorage.setItem(THEME_STORAGE_KEY, JSON.stringify(theme));
    } catch {
      /* ignore storage errors */
    }
  }, [theme]);

  React.useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      if (activePresetId) {
        window.localStorage.setItem(PRESET_STORAGE_KEY, activePresetId);
      } else {
        window.localStorage.removeItem(PRESET_STORAGE_KEY);
      }
    } catch {
      /* ignore storage errors */
    }
  }, [activePresetId]);

  // Apply CSS variables to document root
  React.useEffect(() => {
    if (typeof window === "undefined") return;
    const root = window.document.documentElement;
    if (!root) return;

    const map = buildCssVariableMap(theme);
    if (!initialVarsRef.current) {
      const snapshot: Record<string, string> = {};
      Object.keys(map).forEach((key) => {
        snapshot[key] = root.style.getPropertyValue(key);
      });
      initialVarsRef.current = snapshot;
    }

    Object.entries(map).forEach(([key, value]) => {
      root.style.setProperty(key, value);
    });
  }, [theme]);

  // Restore previous CSS variables when provider unmounts
  React.useEffect(() => {
    return () => {
      if (typeof window === "undefined") return;
      const root = window.document.documentElement;
      const snapshot = initialVarsRef.current;
      if (!root || !snapshot) return;
      Object.entries(snapshot).forEach(([key, value]) => {
        if (value) {
          root.style.setProperty(key, value);
        } else {
          root.style.removeProperty(key);
        }
      });
    };
  }, []);

  const contextValue = React.useMemo<DemoThemeContextValue>(
    () => ({ theme, presets: DEMO_THEME_PRESETS, activePresetId, applyPreset }),
    [theme, activePresetId, applyPreset]
  );

  return <DemoThemeContext.Provider value={contextValue}>{children}</DemoThemeContext.Provider>;
}

export function useDemoTheme() {
  const ctx = React.useContext(DemoThemeContext);
  if (!ctx) throw new Error("useDemoTheme debe usarse dentro de DemoThemeProvider");
  return ctx;
}
