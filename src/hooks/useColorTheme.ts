import { useCallback, useEffect, useState } from "react";

export type ColorThemeId =
  | "slate"
  | "ocean"
  | "emerald"
  | "amethyst"
  | "crimson";

export interface ColorThemeOption {
  id: ColorThemeId;
  name: string;
  emoji: string;
  /** Preview swatches (hex) — used only for the picker UI */
  swatches: [string, string, string];
}

export const COLOR_THEMES: ColorThemeOption[] = [
  { id: "slate", name: "Slate Professional", emoji: "🟦", swatches: ["#1e293b", "#3b82f6", "#10b981"] },
  { id: "ocean", name: "Cyber Ocean", emoji: "🌊", swatches: ["#112240", "#22d3ee", "#a855f7"] },
  { id: "emerald", name: "Emerald Forest", emoji: "🌿", swatches: ["#0b2216", "#34d399", "#facc15"] },
  { id: "amethyst", name: "Royal Amethyst", emoji: "💜", swatches: ["#1c142e", "#c026d3", "#22d3ee"] },
  { id: "crimson", name: "Charcoal Crimson", emoji: "🔴", swatches: ["#262626", "#dc2626", "#2563eb"] },
];

const STORAGE_KEY = "color-theme";

function readStored(): ColorThemeId {
  if (typeof window === "undefined") return "slate";
  const stored = window.localStorage.getItem(STORAGE_KEY) as ColorThemeId | null;
  return COLOR_THEMES.some((t) => t.id === stored) ? (stored as ColorThemeId) : "slate";
}

export function applyColorTheme(id: ColorThemeId) {
  document.documentElement.setAttribute("data-theme", id);
}

export function useColorTheme() {
  const [colorTheme, setColorThemeState] = useState<ColorThemeId>(readStored);

  useEffect(() => {
    applyColorTheme(colorTheme);
  }, [colorTheme]);

  const setColorTheme = useCallback((id: ColorThemeId) => {
    window.localStorage.setItem(STORAGE_KEY, id);
    applyColorTheme(id);
    setColorThemeState(id);
  }, []);

  return { colorTheme, setColorTheme, themes: COLOR_THEMES };
}
