import * as SecureStore from "expo-secure-store";

const TOKEN_KEY = "accessToken";
const TOKEN_SAVED_AT_KEY = "accessTokenSavedAt";

const TOKEN_TTL_MS = 24 * 60 * 60 * 1000; // 24 години

export async function saveToken(token: string) {
  await SecureStore.setItemAsync(TOKEN_KEY, token);
  await SecureStore.setItemAsync(TOKEN_SAVED_AT_KEY, String(Date.now()));
}

export async function getToken() {
  const token = await SecureStore.getItemAsync(TOKEN_KEY);
  const savedAtRaw = await SecureStore.getItemAsync(TOKEN_SAVED_AT_KEY);

  if (!token || !savedAtRaw) {
    return null;
  }

  const savedAt = Number(savedAtRaw);

  if (!Number.isFinite(savedAt)) {
    await clearToken();
    return null;
  }

  const expired = Date.now() - savedAt > TOKEN_TTL_MS;

  if (expired) {
    await clearToken();
    return null;
  }

  return token;
}

export async function clearToken() {
  await SecureStore.deleteItemAsync(TOKEN_KEY);
  await SecureStore.deleteItemAsync(TOKEN_SAVED_AT_KEY);
}