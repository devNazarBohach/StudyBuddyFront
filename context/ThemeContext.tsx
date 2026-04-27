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

type ThemeContextType = {
  theme: AppTheme;
  isDarkMode: boolean;
  isHighContrast: boolean;
  setDarkMode: (v: boolean) => Promise<void>;
  setHighContrast: (v: boolean) => Promise<void>;
  toggleDarkMode: () => Promise<void>;
  toggleHighContrast: () => Promise<void>;
};

const ThemeContext = createContext<ThemeContextType | null>(null);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [isHighContrast, setIsHighContrast] = useState(false);

  useEffect(() => {
    async function loadTheme() {
      try {
        const [storedDark, storedHC] = await Promise.all([
          AsyncStorage.getItem(STORAGE_KEY_DARK),
          AsyncStorage.getItem(STORAGE_KEY_HC),
        ]);

        if (storedDark !== null) setIsDarkMode(storedDark === "true");
        if (storedHC !== null) setIsHighContrast(storedHC === "true");
      } catch {

      }

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
      } catch {
      }
    }

    loadTheme();
  }, []);

  const applyDark = useCallback(async (value: boolean) => {
    setIsDarkMode(value);
    try {
      await AsyncStorage.setItem(STORAGE_KEY_DARK, String(value));
    } catch {}
    try {
      await saveSettings({ darkMode: value });
    } catch {}
  }, []);

  const applyHighContrast = useCallback(async (value: boolean) => {
    setIsHighContrast(value);
    try {
      await AsyncStorage.setItem(STORAGE_KEY_HC, String(value));
    } catch {}
    try {
      await saveSettings({ highContrast: value });
    } catch {}
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

  const value = useMemo<ThemeContextType>(
    () => ({
      theme,
      isDarkMode,
      isHighContrast,
      setDarkMode: applyDark,
      setHighContrast: applyHighContrast,
      toggleDarkMode,
      toggleHighContrast,
    }),
    [theme, isDarkMode, isHighContrast, applyDark, applyHighContrast,
     toggleDarkMode, toggleHighContrast]
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
