import analytics from "@react-native-firebase/analytics";
import crashlytics from "@react-native-firebase/crashlytics";

export async function logEvent(name: string, params?: Record<string, any>) {
  try { await analytics().logEvent(name, params); } catch {}
}
export async function setUser(username: string) {
  try {
    await analytics().setUserId(username);
    await analytics().setUserProperty("username", username);
    await crashlytics().setUserId(username);
  } catch {}
}
export async function logError(error: Error, context?: string) {
  try {
    crashlytics().log(context ?? "error");
    await crashlytics().recordError(error);
  } catch {}
}
export async function logScreenView(screenName: string) {
  try {
    await analytics().logScreenView({ screen_name: screenName, screen_class: screenName });
  } catch {}
}
export async function logScreenExit(screenName: string, durationMs: number) {
  try {
    await analytics().logEvent("time_on_screen", {
      screen: screenName,
      duration_sec: Math.round(durationMs / 1000),
    });
  } catch {}
}
export async function logLogin(method: "manual" | "google") {
  try { await analytics().logLogin({ method }); } catch {}
}
export async function logLoginFailed(method: "manual" | "google", reason?: string) {
  try { await analytics().logEvent("login_failed", { method, reason: reason ?? "unknown" }); } catch {}
}
export async function logRegister(method: "manual") {
  try { await analytics().logSignUp({ method }); } catch {}
}
export async function logLogout() {
  try {
    await analytics().logEvent("logout");
    await analytics().setUserId(null);
  } catch {}
}
export async function logMessageSent(type: "text" | "photo", roomType: "DIRECT" | "GROUP") {
  try { await analytics().logEvent("message_sent", { type, room_type: roomType }); } catch {}
}
export async function logChatOpened(roomId: number, roomType: string) {
  try { await analytics().logEvent("chat_opened", { room_id: String(roomId), room_type: roomType }); } catch {}
}
export async function logGroupCreated() {
  try { await analytics().logEvent("group_created"); } catch {}
}
export async function logFriendRequestSent() {
  try { await analytics().logEvent("friend_request_sent"); } catch {}
}
export async function logFriendRequestAccepted() {
  try { await analytics().logEvent("friend_request_accepted"); } catch {}
}
export async function logFriendRequestDeclined() {
  try { await analytics().logEvent("friend_request_declined"); } catch {}
}
export async function logProfileUpdated(role: string) {
  try { await analytics().logEvent("profile_updated", { role }); } catch {}
}
export async function logAvatarUploaded() {
  try { await analytics().logEvent("avatar_uploaded"); } catch {}
}
export async function logThemeChanged(isDark: boolean, isHighContrast: boolean) {
  try {
    await analytics().logEvent("theme_changed", { dark_mode: isDark, high_contrast: isHighContrast });
    await analytics().setUserProperty("theme", isHighContrast ? "high_contrast" : isDark ? "dark" : "light");
  } catch {}
}
export async function logFontScaleChanged(scale: number) {
  try {
    await analytics().logEvent("font_scale_changed", { scale });
    await analytics().setUserProperty("font_scale", String(scale));
  } catch {}
}
export async function logLocationSharedToggle(enabled: boolean) {
  try { await analytics().logEvent("location_sharing_toggled", { enabled }); } catch {}
}
export async function logNearbyOpened(usersCount: number) {
  try { await analytics().logEvent("nearby_opened", { users_visible: usersCount }); } catch {}
}
export async function logNearbyUserTapped(targetUsername: string) {
  try { await analytics().logEvent("nearby_user_tapped", { target: targetUsername }); } catch {}
}
export async function logBlogPostOpened(postId: string | number, title?: string) {
  try { await analytics().logEvent("blog_post_opened", { post_id: String(postId), title: title ?? "" }); } catch {}
}
export async function logBlogPostCreated() {
  try { await analytics().logEvent("blog_post_created"); } catch {}
}
export async function logSessionStart() {
  try { await analytics().logEvent("session_start_custom"); } catch {}
}
export async function logAppOpen() {
  try { await analytics().logAppOpen(); } catch {}
}
export async function logApiError(endpoint: string, statusCode: number, message: string) {
  try {
    await analytics().logEvent("api_error", { endpoint, status_code: statusCode, message: message.slice(0, 100) });
  } catch {}
}
