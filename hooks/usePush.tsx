import { getToken } from "@/constants/tokens";
import { pushApi } from "@/services/pushApi";
import Constants from "expo-constants";
import * as Device from "expo-device";
import * as Notifications from "expo-notifications";
import { router } from "expo-router";
import { useEffect, useRef } from "react";
import { AppState, Platform } from "react-native";

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
    shouldShowAlert: true,
  }),
});

async function registerForPushToken(): Promise<string | null> {
  if (!Device.isDevice) {
    console.log("[push] not a physical device — skipping");
    return null;
  }

  if (Platform.OS === "android") {
    await Notifications.setNotificationChannelAsync("default", {
      name: "default",
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: "#4F8EF7",
    });
  }

  const existing = await Notifications.getPermissionsAsync();
  let status = existing.status;

  if (status !== "granted") {
    const req = await Notifications.requestPermissionsAsync();
    status = req.status;
  }

  if (status !== "granted") {
    console.log("[push] permission denied");
    return null;
  }

  const projectId =
    (Constants?.expoConfig as any)?.extra?.eas?.projectId ??
    (Constants?.easConfig as any)?.projectId;

  try {
    const res = await Notifications.getExpoPushTokenAsync(
      projectId ? { projectId } : undefined
    );
    console.log("[push] expo token:", res.data);
    return res.data;
  } catch (e) {
    console.log("[push] getExpoPushTokenAsync error", e);
    return null;
  }
}

function handleNotificationPayload(data: any) {
  if (!data) return;

  if (data.type === "chat_message" && data.roomId) {
    try {
      router.push({
        pathname: "/screens/friends/chats/chat" as any,
        params: { roomId: String(data.roomId) },
      });
    } catch (e) {
      console.log("[push] navigation error", e);
    }
  }
}

export function usePushNotifications() {
  const responseSub = useRef<Notifications.EventSubscription | null>(null);
  const savedExpoTokenRef = useRef<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function bootstrap() {
      try {
        const jwt = await getToken();
        if (!jwt) {
          console.log("[push] no jwt yet");
          return;
        }

        const expoToken = await registerForPushToken();
        if (!expoToken || cancelled) return;

        if (savedExpoTokenRef.current === expoToken) return;

        await pushApi.savePushToken(expoToken);
        savedExpoTokenRef.current = expoToken;
        console.log("[push] token saved on backend");
      } catch (e) {
        console.log("[push] savePushToken error", e);
      }
    }

    bootstrap();

    const appStateSub = AppState.addEventListener("change", (state) => {
      if (state === "active") {
        bootstrap();
      }
    });

    const intervalId = setInterval(bootstrap, 15000);

    responseSub.current = Notifications.addNotificationResponseReceivedListener(
      (response) => {
        handleNotificationPayload(response.notification.request.content.data);
      }
    );

    Notifications.getLastNotificationResponseAsync().then((response) => {
      if (response) {
        handleNotificationPayload(response.notification.request.content.data);
      }
    });

    return () => {
      cancelled = true;
      appStateSub.remove();
      clearInterval(intervalId);
      responseSub.current?.remove();
    };
  }, []);
}