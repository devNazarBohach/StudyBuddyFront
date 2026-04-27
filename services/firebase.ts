import analytics from "@react-native-firebase/analytics";
import crashlytics from "@react-native-firebase/crashlytics";

export async function logEvent(name: string, params?: Record<string, any>) {
  await analytics().logEvent(name, params);
}

export async function setUser(username: string) {
  await analytics().setUserId(username);
  await crashlytics().setUserId(username);
}

export async function logError(error: Error, context?: string) {
  crashlytics().log(context ?? "error");
  await crashlytics().recordError(error);
}