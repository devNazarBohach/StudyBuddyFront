import { getToken } from "@/constants/tokens";
import { locationApi } from "@/services/locationApi";
import * as Location from "expo-location";
import { useEffect, useRef } from "react";
import { AppState, AppStateStatus } from "react-native";

export function useLocationTracking(intervalMs: number = 5 * 60 * 1000) {
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const appStateRef = useRef<AppStateStatus>(AppState.currentState);

  async function pushOnce() {
  try {
    const token = await getToken();
    if (!token) return;

    const servicesEnabled = await Location.hasServicesEnabledAsync();
    if (!servicesEnabled) {
      console.log("[useLocationTracking] location services disabled");
      return;
    }

    const { status } = await Location.getForegroundPermissionsAsync();
    if (status !== "granted") return;

    const loc = await Location.getLastKnownPositionAsync({
      maxAge: 60_000,
    });

    const coords =
      loc?.coords ??
      (await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      })).coords;

    if (!coords) return;

    await locationApi.updateMyLocation(coords.latitude, coords.longitude);
    console.log("[useLocationTracking] location pushed");
  } catch (e) {
    console.log("[useLocationTracking] push error", e);
  }
}
  useEffect(() => {
    pushOnce();

    timerRef.current = setInterval(pushOnce, intervalMs);

    const sub = AppState.addEventListener("change", (next) => {
      if (appStateRef.current.match(/inactive|background/) && next === "active") {
        pushOnce();
      }
      appStateRef.current = next;
    });

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      sub.remove();
    };
  }, [intervalMs]);
}