import React, { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../state/authStore.jsx";

export default function Login() {
  const { api, auth } = useAuth();
  const nav = useNavigate();
  const loc = useLocation();
  const from = loc.state?.from || "/";

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");

  async function onSubmit(e) {
    e.preventDefault();
    setErr("");
    setLoading(true);
    try {
      await api.login({ email, password });
      nav(from, { replace: true });
    } catch (e) {
      setErr(e.message || "Login failed");
    } finally {
      setLoading(false);
    }
  }

  function offlineOnly() {
    api.useOfflineOnly();
    nav(from, { replace: true });
  }

  // If already online-authenticated, go home
  if (auth.mode === "online" && auth.token) {
    nav("/", { replace: true });
    return null;
  }

  return (
    <div className="min-h-screen bg-bg text-text flex items-center justify-center px-4">
      <div className="w-full max-w-md rounded-2xl border border-border bg-surface p-6 shadow-soft">
        <div className="flex items-center gap-3 mb-6">
          <div className="h-10 w-10 rounded-xl bg-surface2 border border-border flex items-center justify-center">
            <span className="font-semibold">ƒ</span>
          </div>
          <div>
            <div className="text-lg font-semibold">Finance OS</div>
            <div className="text-sm text-muted">Sign in to sync across devices</div>
          </div>
        </div>

        <form onSubmit={onSubmit} className="space-y-4">
          <div>
            <label className="text-sm text-muted">Email</label>
            <input
              className="mt-1 w-full rounded-xl bg-surface2 border border-border px-3 py-2 outline-none focus:ring-2 focus:ring-accent/30"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              type="email"
              autoComplete="email"
              required
            />
          </div>
          <div>
            <label className="text-sm text-muted">Password</label>
            <input
              className="mt-1 w-full rounded-xl bg-surface2 border border-border px-3 py-2 outline-none focus:ring-2 focus:ring-accent/30"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              type="password"
              autoComplete="current-password"
              required
            />
          </div>

          {err ? <div className="text-sm text-red-400">{err}</div> : null}

          <button
            disabled={loading}
            className="w-full rounded-xl bg-accent text-accentText py-2.5 font-semibold hover:opacity-95 active:opacity-90 transition"
          >
            {loading ? "Signing in…" : "Login"}
          </button>

          <div className="flex items-center justify-between text-sm text-muted">
            <Link className="hover:text-text" to="/register" state={{ from }}>Create account</Link>
            <button type="button" onClick={offlineOnly} className="hover:text-text">
              Use offline only
            </button>
          </div>

          <div className="text-xs text-muted leading-relaxed">
            Offline-only keeps everything on this device. You can enable sync later in Settings.
          </div>
        </form>
      </div>
    </div>
  );
}
