import React, { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../state/authStore.jsx";

export default function Register() {
  const { api } = useAuth();
  const nav = useNavigate();
  const loc = useLocation();
  const from = loc.state?.from || "/";

  const [displayName, setDisplayName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");

  async function onSubmit(e) {
    e.preventDefault();
    setErr("");
    setLoading(true);
    try {
      await api.register({ email, password, displayName: displayName || undefined });
      nav(from, { replace: true });
    } catch (e) {
      setErr(e.message || "Register failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-bg text-text flex items-center justify-center px-4">
      <div className="w-full max-w-md rounded-2xl border border-border bg-surface p-6 shadow-soft">
        <div className="text-lg font-semibold mb-1">Create your account</div>
        <div className="text-sm text-muted mb-6">Secure sync across devices. Still works offline.</div>

        <form onSubmit={onSubmit} className="space-y-4">
          <div>
            <label className="text-sm text-muted">Display name (optional)</label>
            <input
              className="mt-1 w-full rounded-xl bg-surface2 border border-border px-3 py-2 outline-none focus:ring-2 focus:ring-accent/30"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              type="text"
              autoComplete="name"
              maxLength={80}
            />
          </div>
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
              autoComplete="new-password"
              required
              minLength={8}
            />
            <div className="text-xs text-muted mt-1">Minimum 8 characters.</div>
          </div>

          {err ? <div className="text-sm text-red-400">{err}</div> : null}

          <button
            disabled={loading}
            className="w-full rounded-xl bg-accent text-accentText py-2.5 font-semibold hover:opacity-95 active:opacity-90 transition"
          >
            {loading ? "Creating…" : "Create account"}
          </button>

          <div className="text-sm text-muted">
            Already have an account?{" "}
            <Link className="hover:text-text" to="/login" state={{ from }}>Login</Link>
          </div>
        </form>
      </div>
    </div>
  );
}
