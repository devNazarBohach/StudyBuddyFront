import { AppTheme } from '@/constants/theme';
import { useTheme } from '@/context/ThemeContext';

export function useThemeColor(
  props: { light?: string; dark?: string },
  colorName: keyof AppTheme
) {
  const { theme, isDarkMode } = useTheme();

  const overrideColor = isDarkMode ? props.dark : props.light;
  if (overrideColor) return overrideColor;

  return theme[colorName] as string;
}
