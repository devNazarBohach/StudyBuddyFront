import analytics from "@react-native-firebase/analytics";
import crashlytics from "@react-native-firebase/crashlytics";

export async function logEvent(name: string, params?: Record<string, any>) {
  try {
    await analytics().logEvent(name, params);
  } catch {}
}

export async function setUser(username: string) {
  try {
    await analytics().setUserId(username);
    await crashlytics().setUserId(username);
  } catch {}
}

export async function logError(error: Error, context?: string) {
  try {
    crashlytics().log(context ?? "error");
    await crashlytics().recordError(error);
  } catch {}
}