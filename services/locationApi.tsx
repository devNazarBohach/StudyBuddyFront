import { API_BASE_URL } from "@/constants/api";
import { getToken } from "@/constants/tokens";

export type UserLocationDTO = {
  userId: number;
  username: string;
  latitude: number;
  longitude: number;
  updatedAt?: string;
  distanceKm?: number;
  role?: string;
};

type ApiResponse<T> = {
  success: boolean;
  message: string;
  data: T | null;
  token?: string | null;
};

async function authedRequest<T>(
  path: string,
  options: RequestInit = {}
): Promise<T> {
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
  let json: ApiResponse<T> | null = null;
  try {
    json = text ? JSON.parse(text) : null;
  } catch {
    throw new Error("Invalid server response");
  }

  if (!res.ok || !json || json.success === false) {
    throw new Error(json?.message || `HTTP ${res.status}`);
  }

  return json.data as T;
}

export const locationApi = {
  async updateMyLocation(latitude: number, longitude: number) {
    return authedRequest<string>("/location/updateLocation", {
      method: "PUT",
      body: JSON.stringify({ latitude, longitude }),
    });
  },

  async getMyLocation() {
    return authedRequest<UserLocationDTO>("/location/me", {
      method: "GET",
    });
  },

  async getNearbyUsers() {
    return authedRequest<UserLocationDTO[]>("/location/nearby", {
      method: "GET",
    });
  },

  async getUserLocation(username: string) {
    return authedRequest<UserLocationDTO>(
      `/location/${encodeURIComponent(username)}`,
      { method: "GET" }
    );
  },
};