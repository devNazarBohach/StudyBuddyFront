import { useEffect, useRef } from "react";
import { logScreenView, logScreenExit } from "@/services/firebase";

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
