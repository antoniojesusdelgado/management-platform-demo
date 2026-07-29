"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import type { UserProfile } from "@/domain/profile";

export type ThemePreference = UserProfile["theme"];
type ResolvedTheme = Exclude<ThemePreference, "system">;

const THEME_STORAGE_KEY = "management-platform-theme";
const DARK_THEME_COLOR = "#071a2f";
const LIGHT_THEME_COLOR = "#f5f7fb";

type ThemeContextValue = {
  preference: ThemePreference;
  resolvedTheme: ResolvedTheme;
  reducedMotion: boolean;
  setPreference: (preference: ThemePreference) => void;
  setExperiencePreferences: (preferences: {
    reducedMotion?: boolean;
    highContrast?: boolean;
    density?: UserProfile["density"];
  }) => void;
};

const ThemeContext = createContext<ThemeContextValue | null>(null);

function systemTheme(): ResolvedTheme {
  if (typeof window === "undefined") return "light";
  return window.matchMedia("(prefers-color-scheme: dark)").matches
    ? "dark"
    : "light";
}

function resolveTheme(preference: ThemePreference): ResolvedTheme {
  return preference === "system" ? systemTheme() : preference;
}

function updateThemeColor(theme: ResolvedTheme) {
  let meta = document.querySelector<HTMLMetaElement>('meta[name="theme-color"]');
  if (!meta) {
    meta = document.createElement("meta");
    meta.name = "theme-color";
    document.head.append(meta);
  }
  meta.content = theme === "dark" ? DARK_THEME_COLOR : LIGHT_THEME_COLOR;
}

function applyTheme(preference: ThemePreference): ResolvedTheme {
  const theme = resolveTheme(preference);
  const root = document.documentElement;
  root.dataset.themePreference = preference;
  root.dataset.theme = theme;
  root.style.colorScheme = theme;
  updateThemeColor(theme);
  return theme;
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [preference, setPreferenceState] = useState<ThemePreference>(() => {
    if (typeof window === "undefined") return "system";
    const stored = window.sessionStorage.getItem(THEME_STORAGE_KEY);
    return stored === "light" || stored === "dark" || stored === "system"
      ? stored
      : "system";
  });
  const [systemResolvedTheme, setSystemResolvedTheme] =
    useState<ResolvedTheme>(systemTheme);
  const [profileReducedMotion, setProfileReducedMotion] = useState(false);
  const [systemReducedMotion, setSystemReducedMotion] = useState(false);
  const resolvedTheme =
    preference === "system" ? systemResolvedTheme : preference;
  const reducedMotion = profileReducedMotion || systemReducedMotion;

  useEffect(() => {
    applyTheme(preference);
  }, [preference, systemResolvedTheme]);

  useEffect(() => {
    const media = window.matchMedia("(prefers-color-scheme: dark)");
    const handleChange = () => {
      setSystemResolvedTheme(media.matches ? "dark" : "light");
    };
    media.addEventListener("change", handleChange);
    return () => media.removeEventListener("change", handleChange);
  }, []);

  useEffect(() => {
    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    const handleChange = () => setSystemReducedMotion(media.matches);
    handleChange();
    media.addEventListener("change", handleChange);
    return () => media.removeEventListener("change", handleChange);
  }, []);

  const setPreference = useCallback((nextPreference: ThemePreference) => {
    window.sessionStorage.setItem(THEME_STORAGE_KEY, nextPreference);
    setPreferenceState(nextPreference);
  }, []);

  const setExperiencePreferences = useCallback(
    ({
      reducedMotion,
      highContrast,
      density,
    }: {
      reducedMotion?: boolean;
      highContrast?: boolean;
      density?: UserProfile["density"];
    }) => {
      const root = document.documentElement;
      if (reducedMotion !== undefined) {
        setProfileReducedMotion(reducedMotion);
        root.dataset.reducedMotion = String(reducedMotion);
      }
      if (highContrast !== undefined) {
        root.dataset.highContrast = String(highContrast);
      }
      if (density) {
        root.dataset.density = density;
      }
    },
    [],
  );

  const value = useMemo(
    () => ({
      preference,
      resolvedTheme,
      reducedMotion,
      setPreference,
      setExperiencePreferences,
    }),
    [
      preference,
      reducedMotion,
      resolvedTheme,
      setExperiencePreferences,
      setPreference,
    ],
  );

  return (
    <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
  );
}

export function useTheme() {
  const value = useContext(ThemeContext);
  if (!value) {
    throw new Error("useTheme must be used inside ThemeProvider");
  }
  return value;
}

export function ThemePreferencesSync({
  theme,
  reducedMotion,
  highContrast,
  density,
}: {
  theme: ThemePreference;
  reducedMotion?: boolean;
  highContrast?: boolean;
  density?: UserProfile["density"];
}) {
  const { setPreference, setExperiencePreferences } = useTheme();

  useEffect(() => {
    setPreference(theme);
    setExperiencePreferences({ reducedMotion, highContrast, density });
  }, [
    density,
    highContrast,
    reducedMotion,
    setExperiencePreferences,
    setPreference,
    theme,
  ]);

  return null;
}
