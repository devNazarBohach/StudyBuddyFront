import { API_BASE_URL } from "@/constants/api";
import { clearToken, getToken } from "@/constants/tokens";

export async function request(
  path: string,
  options: RequestInit = {},
  withAuth = false
) {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(options.headers as any),
  };

  if (withAuth) {
    const token = await getToken();
    if (!token) throw new Error("No token. Please login again.");
    headers.Authorization = `Bearer ${token}`;
  }

  const res = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    headers,
  });

  const text = await res.text();
  let data: any = null;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = text;
  }

  if (res.status === 401) {
    await clearToken();
    throw new Error("Unauthorized (401). Please login again.");
  }

  return { ok: res.ok, status: res.status, data };
}

export async function authedFetch(path: string, options: RequestInit = {}) {
  const token = await getToken();
  const res = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(options.headers ?? {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  });

  const json = await res.json().catch(() => null);
  if (!res.ok) {
    throw new Error(json?.message || json?.error || `HTTP ${res.status}`);
  }
  return json?.data ?? json;
}