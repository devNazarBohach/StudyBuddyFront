import { useLocationTracking } from "@/hooks/useLocationTracking";
import { usePushNotifications } from "@/hooks/usePush";
import { AppStateProvider } from "@/state/AppState";
import { Stack } from "expo-router";
 
function RootBootstrap() {
  usePushNotifications();
  useLocationTracking();
  return null;
}
 
export default function RootLayout() {
  return (
    <AppStateProvider>
      <RootBootstrap />
      <Stack screenOptions={{ headerShown: false }} />
    </AppStateProvider>
  );
}