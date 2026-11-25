// The workspace uses a single brand theme (navy + antique gold on warm cream); see styles/globals.scss.
export const DEFAULT_THEME = "acme";
export const DEFAULT_THEME_VALUE = "default";
export const THEME_STORAGE_KEY = "acme-theme";

export const AVAILABLE_THEMES = ["acme"] as const;

export const ALL_THEME_KEYS = [...AVAILABLE_THEMES] as const;

export type ThemeName = (typeof ALL_THEME_KEYS)[number];

export const THEME_VALUE_MAP: Record<ThemeName, string> = {
  acme: "default",
};

export const isValidTheme = (
  value: string | null | undefined
): value is ThemeName => {
  if (!value) return false;
  return ALL_THEME_KEYS.includes(value as (typeof ALL_THEME_KEYS)[number]);
};

export const themeValueFromKey = (key: ThemeName): string => THEME_VALUE_MAP[key];

export const themeKeyFromValue = (
  value: string | null | undefined
): ThemeName | null => {
  if (!value) return null;
  return isValidTheme(value) ? value : null;
};
