"use client";

import React, { createContext, useContext, useEffect, useMemo, useState } from "react";
import {
  AVAILABLE_THEMES,
  DEFAULT_THEME,
  THEME_STORAGE_KEY,
  themeKeyFromValue,
  type ThemeName,
} from "@/lib/theme";
import { getCookie, setCookie } from "@/lib/utils/cookie-storage";

type ThemeContextValue = {
  theme: ThemeName;
  setTheme: (theme: ThemeName) => void;
  themes: readonly ThemeName[];
};

const ThemeContext = createContext<ThemeContextValue | undefined>(undefined);

const resolveTheme = (value: string | null | undefined): ThemeName => {
  const mapped = themeKeyFromValue(value);
  if (mapped) return mapped;
  return DEFAULT_THEME;
};

export const ThemeProvider = ({ children }: { children: React.ReactNode }) => {
  const [theme, setThemeState] = useState<ThemeName>(DEFAULT_THEME);

  useEffect(() => {
    const storedTheme = resolveTheme(
      typeof document !== "undefined" ? getCookie(THEME_STORAGE_KEY) : null
    );
    setThemeState(storedTheme);
  }, []);

  useEffect(() => {
    if (typeof document !== "undefined") {
      document.documentElement.setAttribute("data-theme", theme);
      setCookie(THEME_STORAGE_KEY, theme);
    }
  }, [theme]);

  const value = useMemo(
    () => ({
      theme,
      setTheme: (nextTheme: ThemeName) =>
        setThemeState(resolveTheme(nextTheme)),
      themes: AVAILABLE_THEMES,
    }),
    [theme]
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
};

export const useTheme = (): ThemeContextValue => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error("useTheme must be used within ThemeProvider");
  }
  return context;
};
