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

export const authApi = {
  register: (payload: RegisterPayload) =>
    request("/auth/register", {
      method: "POST",
      body: JSON.stringify(payload),
    }, false),

  login: (payload: LoginPayload) =>
    request("/auth/login", {
      method: "POST",
      body: JSON.stringify(payload),
    }, false),
};