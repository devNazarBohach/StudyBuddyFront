import { useTheme } from "@/context/ThemeContext";
import { Text, type TextProps } from "react-native";

export type ThemedTextProps = TextProps & {
  lightColor?: string;
  darkColor?: string;
  type?: "default" | "title" | "defaultSemiBold" | "subtitle" | "link";
};

export function ThemedText({
  style,
  lightColor,
  darkColor,
  type = "default",
  ...rest
}: ThemedTextProps) {
  const { theme, isDarkMode, fs } = useTheme();

  const color = (isDarkMode ? darkColor : lightColor) ?? theme.text;

  return (
    <Text
      style={[
        { color },
        type === "default"
          ? { fontSize: fs(16), lineHeight: fs(24) }
          : undefined,
        type === "title"
          ? { fontSize: fs(32), fontWeight: "bold", lineHeight: fs(38) }
          : undefined,
        type === "defaultSemiBold"
          ? { fontSize: fs(16), lineHeight: fs(24), fontWeight: "600" }
          : undefined,
        type === "subtitle"
          ? { fontSize: fs(20), fontWeight: "bold" }
          : undefined,
        type === "link"
          ? { fontSize: fs(16), lineHeight: fs(30), color: theme.primary }
          : undefined,
        style,
      ]}
      {...rest}
    />
  );
}