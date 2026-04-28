import AsyncStorage from "@react-native-async-storage/async-storage";
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";

import { AppTheme, getTheme } from "@/constants/theme";
import { fetchSettings, saveSettings } from "@/services/settingsService";

const STORAGE_KEY_DARK = "@studybuddy:darkMode";
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
  setDarkMode: (v: boolean) => Promise<void>;
  setHighContrast: (v: boolean) => Promise<void>;
  toggleDarkMode: () => Promise<void>;
  toggleHighContrast: () => Promise<void>;
  setFontScale: (v: FontScale) => Promise<void>;
  increaseFontScale: () => Promise<void>;
  decreaseFontScale: () => Promise<void>;
  /** Scale a raw fontSize number by fontScale */
  fs: (size: number) => number;
};

const ThemeContext = createContext<ThemeContextType | null>(null);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [isHighContrast, setIsHighContrast] = useState(false);
  const [fontScale, setFontScaleState] = useState<FontScale>(1.0);

  useEffect(() => {
    async function loadTheme() {
      try {
        const [storedDark, storedHC, storedFont] = await Promise.all([
          AsyncStorage.getItem(STORAGE_KEY_DARK),
          AsyncStorage.getItem(STORAGE_KEY_HC),
          AsyncStorage.getItem(STORAGE_KEY_FONT),
        ]);
        if (storedDark !== null) setIsDarkMode(storedDark === "true");
        if (storedHC !== null) setIsHighContrast(storedHC === "true");
        if (storedFont !== null) {
          const parsed = parseFloat(storedFont) as FontScale;
          if (FONT_SCALE_STEPS.includes(parsed)) setFontScaleState(parsed);
        }
      } catch {}

      try {
        const dto = await fetchSettings();
        if (dto.darkMode != null) {
          setIsDarkMode(dto.darkMode);
          await AsyncStorage.setItem(STORAGE_KEY_DARK, String(dto.darkMode));
        }
        if (dto.highContrast != null) {
          setIsHighContrast(dto.highContrast);
          await AsyncStorage.setItem(STORAGE_KEY_HC, String(dto.highContrast));
        }
      } catch {}
    }
    loadTheme();
  }, []);

  const applyDark = useCallback(async (value: boolean) => {
    setIsDarkMode(value);
    try { await AsyncStorage.setItem(STORAGE_KEY_DARK, String(value)); } catch {}
    try { await saveSettings({ darkMode: value }); } catch {}
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

  // Helper: scale font size
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
      setDarkMode: applyDark,
      setHighContrast: applyHighContrast,
      toggleDarkMode,
      toggleHighContrast,
      setFontScale: applyFontScale,
      increaseFontScale,
      decreaseFontScale,
      fs,
    }),
    [theme, isDarkMode, isHighContrast, fontScale, applyDark, applyHighContrast,
     toggleDarkMode, toggleHighContrast, applyFontScale, increaseFontScale,
     decreaseFontScale, fs]
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