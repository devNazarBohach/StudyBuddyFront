export type AppTheme = {
  background: string;
  surface: string;
  card: string;
  text: string;
  secondaryText: string;
  border: string;
  primary: string;
  danger: string;
  onPrimary: string;
  onDanger: string;
  icon: string;
  placeholder: string;
  inputBackground: string;
};

const light: AppTheme = {
  background: "#FFFFFF",
  surface: "#F5F7FA",
  card: "#FFFFFF",
  text: "#111827",
  secondaryText: "#6B7280",
  border: "#E5E7EB",
  primary: "#4F8EF7",
  danger: "#DC2626",
  onPrimary: "#FFFFFF",
  onDanger: "#FFFFFF",
  icon: "#374151",
  placeholder: "#9CA3AF",
  inputBackground: "#FFFFFF",
};

const dark: AppTheme = {
  background: "#0B1220",
  surface: "#111827",
  card: "#1F2937",
  text: "#F9FAFB",
  secondaryText: "#D1D5DB",
  border: "#374151",
  primary: "#60A5FA",
  danger: "#F87171",
  onPrimary: "#0B1220",
  onDanger: "#0B1220",
  icon: "#D1D5DB",
  placeholder: "#6B7280",
  inputBackground: "#1F2937",
};

const highContrast: AppTheme = {
  background: "#000000",
  surface: "#000000",
  card: "#111111",
  text: "#FFFFFF",
  secondaryText: "#FFFFFF",
  border: "#FFFFFF",
  primary: "#FFFF00",
  danger: "#FF3333",
  onPrimary: "#000000",
  onDanger: "#000000",
  icon: "#FFFF00",
  placeholder: "#AAAAAA",
  inputBackground: "#111111",
};

export function getTheme(isDark: boolean, isHighContrast: boolean): AppTheme {
  if (isHighContrast) return highContrast;
  return isDark ? dark : light;
}

export { dark as darkTheme, highContrast as highContrastTheme, light as lightTheme };

