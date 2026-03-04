import { AppStateProvider } from "@/state/AppState";
import { Stack } from "expo-router";

export default function RootLayout() {
  return (
    <AppStateProvider>
      <Stack initialRouteName="index" screenOptions={{ headerShown: false }} />
    </AppStateProvider>
  );
}