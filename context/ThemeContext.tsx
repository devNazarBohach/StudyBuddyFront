import AsyncStorage from "@react-native-async-storage/async-storage";
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { Appearance, useColorScheme } from "react-native";

import { AppTheme, getTheme } from "@/constants/theme";
import { saveSettings } from "@/services/settingsService";

// darkMode value (true/false)
const STORAGE_KEY_DARK = "@studybuddy:darkMode";
// Set ONLY when user manually toggled the theme in Settings
// If absent → system theme is used and followed dynamically
const STORAGE_KEY_DARK_OVERRIDE = "@studybuddy:darkModeOverride";
const STORAGE_KEY_HC = "@studybuddy:highContrast";
const STORAGE_KEY_FONT = "@studybuddy:fontScale";

export type FontScale = 0.85 | 1.0 | 1.15 | 1.3;
export const FONT_SCALE_STEPS: FontScale[] = [0.85, 1.0, 1.15, 1.3];
export const FONT_SCALE_LABELS: Record<FontScale, string> = {
  0.85: "S",
  1.0: "M",
  1.15: "L",
  1.3: "XL",
};

type ThemeContextType = {
  theme: AppTheme;
  isDarkMode: boolean;
  isHighContrast: boolean;
  fontScale: FontScale;
  /** Whether the user has manually overridden system theme */
  hasThemeOverride: boolean;
  setDarkMode: (v: boolean) => Promise<void>;
  setHighContrast: (v: boolean) => Promise<void>;
  toggleDarkMode: () => Promise<void>;
  toggleHighContrast: () => Promise<void>;
  /** Reset to system theme, clears manual override */
  resetToSystemTheme: () => Promise<void>;
  setFontScale: (v: FontScale) => Promise<void>;
  increaseFontScale: () => Promise<void>;
  decreaseFontScale: () => Promise<void>;
  fs: (size: number) => number;
};

const ThemeContext = createContext<ThemeContextType | null>(null);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  // Appearance.getColorScheme() is synchronous — reads system theme immediately
  const systemColorScheme = useColorScheme();
  const [isDarkMode, setIsDarkMode] = useState<boolean>(
    () => Appearance.getColorScheme() === "dark"
  );
  const [isHighContrast, setIsHighContrast] = useState(false);
  const [fontScale, setFontScaleState] = useState<FontScale>(1.0);
  // True only when user explicitly toggled theme in Settings
  const [hasThemeOverride, setHasThemeOverride] = useState(false);

  // On mount: load font/contrast from storage.
  // Dark mode uses system unless override flag is explicitly set by the user.
  useEffect(() => {
    async function loadPrefs() {
      try {
        const [override, storedDark, storedHC, storedFont] = await Promise.all([
          AsyncStorage.getItem(STORAGE_KEY_DARK_OVERRIDE),
          AsyncStorage.getItem(STORAGE_KEY_DARK),
          AsyncStorage.getItem(STORAGE_KEY_HC),
          AsyncStorage.getItem(STORAGE_KEY_FONT),
        ]);

        // Only apply saved dark mode if user explicitly set it via the app toggle
        if (override === "true" && storedDark !== null) {
          setIsDarkMode(storedDark === "true");
          setHasThemeOverride(true);
        }
        // Otherwise keep system theme (already set from Appearance.getColorScheme())

        if (storedHC !== null) setIsHighContrast(storedHC === "true");
        if (storedFont !== null) {
          const parsed = parseFloat(storedFont) as FontScale;
          if (FONT_SCALE_STEPS.includes(parsed)) setFontScaleState(parsed);
        }
      } catch {}
    }
    loadPrefs();
  }, []);

  // Follow system theme changes dynamically — only when no manual override
  useEffect(() => {
    if (!hasThemeOverride && systemColorScheme != null) {
      setIsDarkMode(systemColorScheme === "dark");
    }
  }, [systemColorScheme, hasThemeOverride]);

  // Called when user manually toggles in Settings
  const applyDark = useCallback(async (value: boolean) => {
    setIsDarkMode(value);
    setHasThemeOverride(true);
    try {
      await AsyncStorage.multiSet([
        [STORAGE_KEY_DARK, String(value)],
        [STORAGE_KEY_DARK_OVERRIDE, "true"],
      ]);
    } catch {}
    try { await saveSettings({ darkMode: value }); } catch {}
  }, []);

  // Clears manual override — app returns to following system theme
  const resetToSystemTheme = useCallback(async () => {
    setHasThemeOverride(false);
    const sys = Appearance.getColorScheme() === "dark";
    setIsDarkMode(sys);
    try {
      await AsyncStorage.multiRemove([STORAGE_KEY_DARK, STORAGE_KEY_DARK_OVERRIDE]);
    } catch {}
  }, []);

  const applyHighContrast = useCallback(async (value: boolean) => {
    setIsHighContrast(value);
    try { await AsyncStorage.setItem(STORAGE_KEY_HC, String(value)); } catch {}
    try { await saveSettings({ highContrast: value }); } catch {}
  }, []);

  const applyFontScale = useCallback(async (value: FontScale) => {
    setFontScaleState(value);
    try { await AsyncStorage.setItem(STORAGE_KEY_FONT, String(value)); } catch {}
  }, []);

  const increaseFontScale = useCallback(async () => {
    setFontScaleState((prev) => {
      const idx = FONT_SCALE_STEPS.indexOf(prev);
      const next = FONT_SCALE_STEPS[Math.min(idx + 1, FONT_SCALE_STEPS.length - 1)];
      AsyncStorage.setItem(STORAGE_KEY_FONT, String(next)).catch(() => {});
      return next;
    });
  }, []);

  const decreaseFontScale = useCallback(async () => {
    setFontScaleState((prev) => {
      const idx = FONT_SCALE_STEPS.indexOf(prev);
      const next = FONT_SCALE_STEPS[Math.max(idx - 1, 0)];
      AsyncStorage.setItem(STORAGE_KEY_FONT, String(next)).catch(() => {});
      return next;
    });
  }, []);

  const toggleDarkMode = useCallback(
    () => applyDark(!isDarkMode),
    [isDarkMode, applyDark]
  );

  const toggleHighContrast = useCallback(
    () => applyHighContrast(!isHighContrast),
    [isHighContrast, applyHighContrast]
  );

  const theme = useMemo(
    () => getTheme(isDarkMode, isHighContrast),
    [isDarkMode, isHighContrast]
  );

  const fs = useCallback(
    (size: number) => Math.round(size * fontScale),
    [fontScale]
  );

  const value = useMemo<ThemeContextType>(
    () => ({
      theme,
      isDarkMode,
      isHighContrast,
      fontScale,
      hasThemeOverride,
      setDarkMode: applyDark,
      setHighContrast: applyHighContrast,
      toggleDarkMode,
      toggleHighContrast,
      resetToSystemTheme,
      setFontScale: applyFontScale,
      increaseFontScale,
      decreaseFontScale,
      fs,
    }),
    [theme, isDarkMode, isHighContrast, fontScale, hasThemeOverride,
     applyDark, applyHighContrast, toggleDarkMode, toggleHighContrast,
     resetToSystemTheme, applyFontScale, increaseFontScale, decreaseFontScale, fs]
  );

  return (
    <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
  );
}

export function useTheme(): ThemeContextType {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error("useTheme must be used inside ThemeProvider");
  return ctx;
}
