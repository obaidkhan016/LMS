"use client";

import { create } from "zustand";
import {
  loginRequest,
  logoutRequest,
  meRequest,
  refreshRequest,
  type UserOut,
} from "@/lib/api/auth";
import { setAccessToken, setOnUnauthenticated } from "@/lib/api/client";

type Status = "loading" | "authenticated" | "unauthenticated";

interface AuthState {
  status: Status;
  user: UserOut | null;
  bootstrap: () => Promise<void>;
  login: (username: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
}

export const useAuth = create<AuthState>((set) => ({
  status: "loading",
  user: null,

  bootstrap: async () => {
    const refreshed = await refreshRequest();
    if (!refreshed) {
      setAccessToken(null);
      set({ status: "unauthenticated", user: null });
      return;
    }

    setAccessToken(refreshed.access_token);

    try {
      const user = await meRequest();
      set({ status: "authenticated", user });
    } catch {
      setAccessToken(null);
      set({ status: "unauthenticated", user: null });
    }
  },

  login: async (username, password) => {
    const res = await loginRequest(username, password);
    setAccessToken(res.access_token);
    const user = await meRequest();
    set({ status: "authenticated", user });
  },

  logout: async () => {
    try {
      await logoutRequest();
    } catch {
      /* ignore */
    }
    setAccessToken(null);
    set({ status: "unauthenticated", user: null });
  },
}));

// Wire the axios 401-after-refresh-fail hook to our store.
setOnUnauthenticated(() => {
  useAuth.getState().logout().catch(() => {});
});