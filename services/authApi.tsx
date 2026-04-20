import { request } from "./http";

export interface RegisterPayload {
  email: string;
  username: string;
  password: string;
}

export interface LoginPayload {
  username: string;
  password: string;
}

export interface GoogleLoginPayload {
  idToken: string;
}

export interface AuthUser {
  id: number;
  email: string;
  username: string;
  status: string;
  emailVerifiedAt?: string | null;
  enabled: boolean;
  createdAt: string;
  role: "STUDENT" | "TEACHER";
  institute?: string | null;
  faculty?: string | null;
  subjects?: string[];
}

type AnyAuthBody = {
  success?: boolean;
  message?: string;
  data?: any;
  token?: string | null;
};

export type NormalizedAuthResult = {
  ok: boolean;
  status: number;
  message: string | null;
  token: string | null;
};

export type NormalizedGoogleAuthResult = {
  ok: boolean;
  status: number;
  message: string | null;
  token: string | null;
  user: AuthUser | null;
};

function extractToken(body: AnyAuthBody): string | null {
  if (typeof body?.token === "string" && body.token.trim()) {
    return body.token;
  }

  if (typeof body?.data === "string" && body.data.trim()) {
    return body.data;
  }

  if (body?.data && typeof body.data.token === "string" && body.data.token.trim()) {
    return body.data.token;
  }

  return null;
}

export const authApi = {
  async register(payload: RegisterPayload): Promise<NormalizedAuthResult> {
    const res = await request(
      "/auth/register",
      {
        method: "POST",
        body: JSON.stringify(payload),
      },
      false
    );

    const body = (res.data ?? {}) as AnyAuthBody;

    return {
      ok: res.ok,
      status: res.status,
      message: body.message ?? null,
      token: extractToken(body),
    };
  },

  async login(payload: LoginPayload): Promise<NormalizedAuthResult> {
    const res = await request(
      "/auth/login",
      {
        method: "POST",
        body: JSON.stringify(payload),
      },
      false
    );

    const body = (res.data ?? {}) as AnyAuthBody;

    console.log("RAW /auth/login BODY:", body);

    return {
      ok: res.ok,
      status: res.status,
      message: body.message ?? null,
      token: extractToken(body),
    };
  },

  async googleLogin(payload: GoogleLoginPayload): Promise<NormalizedGoogleAuthResult> {
    const res = await request(
      "/auth/google",
      {
        method: "POST",
        body: JSON.stringify(payload),
      },
      false
    );

    const body = (res.data ?? {}) as AnyAuthBody;

    return {
      ok: res.ok && Boolean(body.success ?? true),
      status: res.status,
      message: body.message ?? null,
      token: extractToken(body),
      user: (body.data && typeof body.data === "object" && "username" in body.data)
        ? (body.data as AuthUser)
        : null,
    };
  },
};