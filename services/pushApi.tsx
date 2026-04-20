import { API_BASE_URL } from "@/constants/api";
import { getToken } from "@/constants/tokens";

async function authedRequest(path: string, options: RequestInit = {}) {
  const token = await getToken();
  if (!token) throw new Error("No token. Please login again.");

  const res = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
      ...(options.headers ?? {}),
    },
  });

  const text = await res.text();
  let json: any = null;
  try {
    json = text ? JSON.parse(text) : null;
  } catch {
    throw new Error("Invalid server response");
  }

  if (!res.ok || !json || json.success === false) {
    throw new Error(json?.message || `HTTP ${res.status}`);
  }

  return json.data;
}

export const pushApi = {
  async savePushToken(expoPushToken: string) {
    return authedRequest("/user/push-token", {
      method: "PUT",
      body: JSON.stringify({ expoPushToken }),
    });
  },

  async clearPushToken() {
    return authedRequest("/user/push-token", {
      method: "DELETE",
    });
  },
};