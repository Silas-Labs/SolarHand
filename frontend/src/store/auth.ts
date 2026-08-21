/* Auth store (Zustand).
   Token + user are cached in localStorage so the app can restore the signed-in
   identity offline. When online we verify the token via /auth/me; a 401 logs
   out, but a network failure keeps the cached identity so field work continues. */

import { create } from "zustand";
import { api, ApiError, setAuthToken } from "@/lib/api";
import { clearAll } from "@/lib/db";
import type { RegisterRequest, UserRead } from "@/lib/types";

const TOKEN_KEY = "solarhand.token";
const USER_KEY = "solarhand.user";

type AuthStatus = "unknown" | "authenticating" | "authed" | "anon";

interface AuthState {
  token: string | null;
  user: UserRead | null;
  status: AuthStatus;
  error: string | null;
  bootstrap: () => Promise<void>;
  login: (email: string, password: string) => Promise<UserRead>;
  registerOrg: (payload: RegisterRequest) => Promise<UserRead>;
  logout: () => Promise<void>;
  clearError: () => void;
}

function readCachedUser(): UserRead | null {
  try {
    const raw = localStorage.getItem(USER_KEY);
    return raw ? (JSON.parse(raw) as UserRead) : null;
  } catch {
    return null;
  }
}

function persistSession(token: string, user: UserRead): void {
  localStorage.setItem(TOKEN_KEY, token);
  localStorage.setItem(USER_KEY, JSON.stringify(user));
}

export const useAuth = create<AuthState>((set, get) => ({
  token: localStorage.getItem(TOKEN_KEY),
  user: readCachedUser(),
  status: "unknown",
  error: null,

  async bootstrap() {
    const token = get().token;
    if (!token) {
      set({ status: "anon" });
      return;
    }
    setAuthToken(token);
    set({ status: "authenticating" });
    try {
      const user = await api.me();
      persistSession(token, user);
      set({ user, status: "authed" });
    } catch (err) {
      if (err instanceof ApiError && err.isNetwork && get().user) {
        // Offline but we trust the cached identity.
        set({ status: "authed" });
      } else {
        await get().logout();
      }
    }
  },

  async login(email, password) {
    set({ status: "authenticating", error: null });
    try {
      const { access_token } = await api.login(email.trim(), password);
      setAuthToken(access_token);
      const user = await api.me();
      persistSession(access_token, user);
      set({ token: access_token, user, status: "authed", error: null });
      return user;
    } catch (err) {
      const message =
        err instanceof ApiError
          ? err.isNetwork
            ? "Can't reach the server. Check your connection."
            : err.detail
          : "Something went wrong. Try again.";
      set({ status: "anon", error: message });
      throw err;
    }
  },

  async registerOrg(payload) {
    set({ status: "authenticating", error: null });
    try {
      const res = await api.register(payload);
      setAuthToken(res.access_token);
      persistSession(res.access_token, res.user);
      set({ token: res.access_token, user: res.user, status: "authed", error: null });
      return res.user;
    } catch (err) {
      const message =
        err instanceof ApiError
          ? err.isNetwork
            ? "Can't reach the server. Check your connection."
            : err.detail
          : "Something went wrong. Try again.";
      set({ status: "anon", error: message });
      throw err;
    }
  },

  async logout() {
    setAuthToken(null);
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
    await clearAll();
    set({ token: null, user: null, status: "anon", error: null });
  },

  clearError() {
    set({ error: null });
  },
}));
