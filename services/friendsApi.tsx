import { clearToken, getToken } from "@/constants/tokens";

export const API_BASE_URL =
  process.env.EXPO_PUBLIC_API_BASE_URL ?? "http://147.175.163.80:8080";

type HttpMethod = "GET" | "POST" | "PUT" | "PATCH" | "DELETE";

export type ApiEnvelope<T> = {
  success?: boolean;
  message?: string | null;
  data?: T;
  token?: any;
};

function isEnvelope<T>(x: any): x is ApiEnvelope<T> {
  return x && typeof x === "object" && ("data" in x || "success" in x || "message" in x);
}

export type FriendshipStatus =
  | "PENDING"
  | "ACCEPTED"
  | "DECLINED"
  | "BLOCKED"
  | "CANCELED"
  | string;

export type FriendshipDTO = {
  id?: number;
  username: string;
  status?: FriendshipStatus;
  createdAt?: string;
};

export type ApiOk = { ok: true; message?: string };

export class ApiError extends Error {
  status?: number;
  raw?: any;
  constructor(message: string, status?: number, raw?: any) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.raw = raw;
  }
}

function cleanUsername(u: string): string {
  return u.trim().replace(/^@/, "");
}

async function httpJson<T>(
  path: string,
  opts?: { method?: HttpMethod; body?: any; headers?: Record<string, string>; signal?: AbortSignal }
): Promise<T> {
  const url = `${API_BASE_URL}${path.startsWith("/") ? "" : "/"}${path}`;

  const headers: Record<string, string> = {
    Accept: "application/json",
    ...(opts?.headers ?? {}),
  };

  // ---- JWT from storage (NOT memory) ----
  const token = await getToken();
  if (!token) throw new ApiError("No token. Login again.");

  headers.Authorization = `Bearer ${token}`;

  // ---- body handling ----
  let body = opts?.body;
  const isFormData = typeof FormData !== "undefined" && body && body instanceof FormData;

  if (body !== undefined && body !== null && !isFormData) {
    if (typeof body === "object") {
      headers["Content-Type"] = headers["Content-Type"] ?? "application/json";
      body = JSON.stringify(body);
    } else {
      headers["Content-Type"] = headers["Content-Type"] ?? "text/plain";
    }
  }

  // DEBUG (можеш прибрати потім)
  console.log("FETCH", opts?.method ?? "GET", url);

  const res = await fetch(url, {
    method: opts?.method ?? "GET",
    headers,
    body,
    signal: opts?.signal,
  });

  const contentType = res.headers.get("content-type") ?? "";
  let payload: any = null;

  if (contentType.includes("application/json")) {
    try {
      payload = await res.json();
    } catch {
      payload = null;
    }
  } else {
    try {
      payload = await res.text();
    } catch {
      payload = null;
    }
  }

  if (res.status === 401) {
    await clearToken();
  }

  if (!res.ok) {
    const msg =
      (payload && typeof payload === "object" && (payload.message || payload.error)) ||
      (typeof payload === "string" && payload) ||
      `Request failed (${res.status})`;
    throw new ApiError(String(msg), res.status, payload);
  }

  return payload as T;
}

function unwrapData<T>(payload: any): T {
  if (isEnvelope<T>(payload)) {
    if (payload.data !== undefined) return payload.data as T;
    return payload as unknown as T;
  }
  return payload as T;
}

export const friendsApi = {
  async getIncomingRequests(): Promise<FriendshipDTO[]> {
    const raw = await httpJson<ApiEnvelope<FriendshipDTO[]> | FriendshipDTO[]>(
      `/user/friend-requests/incoming`
    );
    return unwrapData<FriendshipDTO[]>(raw) ?? [];
  },

  async getOutgoingRequests(): Promise<FriendshipDTO[]> {
    const raw = await httpJson<ApiEnvelope<FriendshipDTO[]> | FriendshipDTO[]>(
      `/user/friend-requests/outgoing`
    );
    return unwrapData<FriendshipDTO[]>(raw) ?? [];
  },

  async makeRequest(addressee_username: string): Promise<ApiOk> {
    const raw = await httpJson<any>("/user/make_request", {
      method: "POST",
      body: { addressee_username: cleanUsername(addressee_username) },
    });

    if (isEnvelope(raw)) return { ok: true, message: raw.message ?? undefined };
    return { ok: true, message: typeof raw === "string" ? raw : undefined };
  },

  async acceptRequest(requester_username: string): Promise<ApiOk> {
    const raw = await httpJson<any>("/user/friend-requests/accept", {
      method: "PUT",
      body: { requester_username: cleanUsername(requester_username) },
    });

    if (isEnvelope(raw)) return { ok: true, message: raw.message ?? undefined };
    return { ok: true, message: typeof raw === "string" ? raw : undefined };
  },

  async rejectRequest(requester_username: string): Promise<ApiOk> {
    const raw = await httpJson<any>("/user/friend-requests/reject", {
      method: "PUT",
      body: { requester_username: cleanUsername(requester_username) },
    });

    if (isEnvelope(raw)) return { ok: true, message: raw.message ?? undefined };
    return { ok: true, message: typeof raw === "string" ? raw : undefined };
  },

async getFriends(): Promise<FriendshipDTO[]> {
  try {
    const raw = await httpJson<ApiEnvelope<FriendshipDTO[]> | FriendshipDTO[]>(
      `/user/friends`
    );

    console.log("RAW /user/friends =", JSON.stringify(raw, null, 2));

    const data = unwrapData<FriendshipDTO[]>(raw) ?? [];

    console.log("DATA /user/friends =", JSON.stringify(data, null, 2));
    // тут ти побачиш createdAt з бекенда

    return data;
  } catch (e) {
    console.log("GET /user/friends ERROR =", e);
    throw e;
  }
},
};

export function toUserMessage(e: unknown): string {
  if (e instanceof ApiError) return e.message;
  if (e instanceof Error) return e.message;
  return "Unknown error";
}