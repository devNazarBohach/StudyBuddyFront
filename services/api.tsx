import { clearToken, getToken } from "../constants/tokens";

export const API_BASE_URL =
  "http://147.175.163.80:8080";
  //"http://147.175.160.221:8080";

async function request(path: string, options: RequestInit = {}, withAuth = false) {
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

export const authApi = {
  register: (payload: { email: string; username: string; password: string }) =>
    request("/auth/register", { method: "POST", body: JSON.stringify(payload) }, false),

  login: (payload: { username: string; password: string }) =>
    request("/auth/login", { method: "POST", body: JSON.stringify(payload) }, false),
};

export const friendsApi = {
  makeRequest: (addressee_username: string) =>
    request(
      "/user/make_request",
      { method: "POST", body: JSON.stringify({ addressee_username }) },
      true
  ),

  incoming: () =>
    request("/user/friend-requests/incoming", { method: "GET" }, true),

  outgoing: () =>
    request("/user/friend-requests/outgoing", { method: "GET" }, true),

  accept: (requester_username: string) =>
    request(
      "/user/friend-requests/accept",
      { method: "PUT", body: JSON.stringify({ requester_username }) },
      true
    ),

  reject: (requester_username: string) =>
    request(
      "/user/friend-requests/reject",
      { method: "PUT", body: JSON.stringify({ requester_username }) },
      true
    ),
};