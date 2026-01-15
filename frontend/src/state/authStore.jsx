import React, { createContext, useContext, useEffect, useMemo, useState } from "react";

const AUTH_KEY = "financeos:auth:v1";

function loadAuth() {
  try {
    const raw = localStorage.getItem(AUTH_KEY);
    if (!raw) return { mode: null, token: null, user: null }; // undecided
    const parsed = JSON.parse(raw);
    return {
      mode: parsed.mode ?? null, // 'offline' | 'online'
      token: parsed.token ?? null,
      user: parsed.user ?? null,
    };
  } catch {
    return { mode: null, token: null, user: null };
  }
}

function saveAuth(a) {
  localStorage.setItem(AUTH_KEY, JSON.stringify(a));
}

const AuthCtx = createContext(null);

export function AuthProvider({ children }) {
  const [auth, setAuth] = useState(() => loadAuth());

  useEffect(() => {
    saveAuth(auth);
  }, [auth]);

  const api = useMemo(() => {
    const base = import.meta.env.VITE_API_BASE || "/api";

    async function request(path, { method = "GET", body = null, token = auth.token } = {}) {
      const headers = { "Content-Type": "application/json" };
      if (token) headers.Authorization = `Bearer ${token}`;
      const res = await fetch(`${base}${path}`, {
        method,
        headers,
        body: body ? JSON.stringify(body) : null,
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        // Hard security: if token is invalid/expired, force logout.
        if (res.status === 401) {
          setAuth({ mode: "offline", token: null, user: null });
        }
        const err = new Error(data.error || `Request failed (${res.status})`);
        err.status = res.status;
        err.data = data;
        throw err;
      }
      return data;
    }

    async function register({ email, password, displayName }) {
      await request("/auth/register.php", { method: "POST", body: { email, password, displayName } , token: null});
      // auto-login after register
      return login({ email, password });
    }

    async function login({ email, password }) {
      const out = await request("/auth/login.php", { method: "POST", body: { email, password }, token: null });
      setAuth({ mode: "online", token: out.token, user: out.user });
      return out;
    }

    async function logout() {
      try {
        if (auth.token) await request("/auth/logout.php", { method: "POST" });
      } catch {
        // ignore
      }
      setAuth((a) => ({ ...a, mode: "offline", token: null, user: null }));
    }

    async function me() {
      if (!auth.token) return null;
      const out = await request("/auth/me.php");
      setAuth((a) => ({ ...a, mode: "online", user: out.user }));
      return out.user;
    }

    function useOfflineOnly() {
      setAuth({ mode: "offline", token: null, user: null });
    }

    return { request, register, login, logout, me, useOfflineOnly, base };
  }, [auth.token]);

  return <AuthCtx.Provider value={{ auth, setAuth, api }}>{children}</AuthCtx.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthCtx);
  if (!ctx) throw new Error("useAuth must be used inside AuthProvider");
  return ctx;
}

export const AUTH_STORAGE_KEY = AUTH_KEY;
