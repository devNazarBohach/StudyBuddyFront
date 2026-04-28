import { logScreenExit, logScreenView } from "@/services/firebase";
import { useEffect, useRef } from "react";

/**
 * Usage: useScreenTracking("ChatScreen");
 * Automatically logs screen_view on mount and time_on_screen on unmount.
 */
export function useScreenTracking(screenName: string) {
  const enteredAt = useRef<number>(Date.now());

  useEffect(() => {
    enteredAt.current = Date.now();
    logScreenView(screenName);

    return () => {
      const duration = Date.now() - enteredAt.current;
      logScreenExit(screenName, duration);
    };
  }, [screenName]);
}