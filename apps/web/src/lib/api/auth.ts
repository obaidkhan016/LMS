import { api } from "./client";

export interface LoginResponse {
  access_token: string;
  token_type: string;
  expires_at: string;
}

export interface UserOut {
  id: number;
  username: string;
  email: string | null;
  full_name: string;
  is_superuser: boolean;
  must_change_password: boolean;
  roles: string[];
  permissions: string[];
}

export async function loginRequest(
  username: string,
  password: string,
): Promise<LoginResponse> {
  const { data } = await api.post<LoginResponse>("/auth/login", {
    username,
    password,
  });
  return data;
}

export async function refreshRequest(): Promise<LoginResponse | null> {
  try {
    const { data } = await api.post<LoginResponse>("/auth/refresh", {});
    return data;
  } catch {
    return null;
  }
}

export async function meRequest(): Promise<UserOut> {
  const { data } = await api.get<UserOut>("/auth/me");
  return data;
}

export async function logoutRequest(): Promise<void> {
  await api.post("/auth/logout", {});
}