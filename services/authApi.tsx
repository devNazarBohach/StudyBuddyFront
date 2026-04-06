// import { request } from "./http";

// export interface RegisterPayload {
//   email: string;
//   username: string;
//   password: string;
// }

// export interface LoginPayload {
//   username: string;
//   password: string;
// }

// export const authApi = {
//   register: (payload: RegisterPayload) =>
//     request("/auth/register", {
//       method: "POST",
//       body: JSON.stringify(payload),
//     }, false),

//   login: (payload: LoginPayload) =>
//     request("/auth/login", {
//       method: "POST",
//       body: JSON.stringify(payload),
//     }, false),
// };


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

type ClassicBackendResponse = {
  message?: string;
  data?: string | null;
};

type GoogleBackendResponse = {
  success?: boolean;
  message?: string;
  data?: AuthUser | null;
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

    const body = (res.data ?? {}) as ClassicBackendResponse;

    return {
      ok: res.ok,
      status: res.status,
      message: body.message ?? null,
      token: typeof body.data === "string" ? body.data : null,
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

    const body = (res.data ?? {}) as ClassicBackendResponse;

    return {
      ok: res.ok,
      status: res.status,
      message: body.message ?? null,
      token: typeof body.data === "string" ? body.data : null,
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

    const body = (res.data ?? {}) as GoogleBackendResponse;

    return {
      ok: res.ok && Boolean(body.success),
      status: res.status,
      message: body.message ?? null,
      token: typeof body.token === "string" ? body.token : null,
      user: body.data ?? null,
    };
  },
};