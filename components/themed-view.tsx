import { useTheme } from '@/context/ThemeContext';
import { View, type ViewProps } from 'react-native';

export type ThemedViewProps = ViewProps & {
  lightColor?: string;
  darkColor?: string;
};

export function ThemedView({ style, lightColor, darkColor, ...otherProps }: ThemedViewProps) {
  const { theme, isDarkMode } = useTheme();

  const backgroundColor =
    (isDarkMode ? darkColor : lightColor) ?? theme.background;

  return <View style={[{ backgroundColor }, style]} {...otherProps} />;
}
