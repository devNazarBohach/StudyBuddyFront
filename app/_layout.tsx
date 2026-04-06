import { AppStateProvider } from "@/state/AppState";
import { Stack } from "expo-router";

export default function RootLayout() {
  return (
    <AppStateProvider>
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="index" options={{ headerShown: false }} />
        <Stack.Screen name="auth" options={{ headerShown: false }} />
        <Stack.Screen name="tabs" options={{ headerShown: false }} />
        <Stack.Screen name="screens" options={{ headerShown: false }} />
      </Stack>
    </AppStateProvider>
  );
}