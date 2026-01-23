import React, { createContext, useContext, useEffect, useMemo, useRef, useState } from "react";
import { useAuth } from "./authStore.jsx";

// NOTE: This sync store is intentionally "cloud-first" when authenticated.
// - No conflict UI.
// - No localStorage reads/writes for finance data.
// - Cloud snapshot is the single source of truth while logged in.

const META_KEY = "financeos:sync:v2";

function loadMeta() {
  try {
    const raw = localStorage.getItem(META_KEY);
    if (!raw) return { version: 0, updatedAt: null };
    const p = JSON.parse(raw);
    return { version: Number(p.version || 0), updatedAt: p.updatedAt || null };
  } catch {
    return { version: 0, updatedAt: null };
  }
}

function saveMeta(m) {
  try {
    localStorage.setItem(META_KEY, JSON.stringify(m));
  } catch {
    // ignore
  }
}

const SyncCtx = createContext(null);

export function SyncProvider({ children }) {
  const { auth, api } = useAuth();
  const [meta, setMeta] = useState(() => loadMeta());
  const [status, setStatus] = useState(() => (auth.mode === "online" && auth.token ? "idle" : "offline"));
  const [hydrated, setHydrated] = useState(false);
  const [cloudState, setCloudState] = useState(null);

  const saveTimer = useRef(null);
  const lastStateRef = useRef(null);
  const savingRef = useRef(false);

  useEffect(() => {
    saveMeta(meta);
  }, [meta]);

  async function pull() {
    if (!(auth.mode === "online" && auth.token)) return { state: null, version: 0, updatedAt: null };
    if (!navigator.onLine) {
      setStatus("offline");
      return { state: null, version: meta.version || 0, updatedAt: meta.updatedAt || null };
    }
    setStatus("syncing");
    await api.me();
    // Support both /sync/get.php and /sync/pull.php (alias).
    const server = await api.request("/sync/pull.php").catch(() => api.request("/sync/get.php"));
    const out = {
      state: server.state || null,
      version: Number(server.version || 0),
      updatedAt: server.updatedAt || null,
    };
    setMeta({ version: out.version, updatedAt: out.updatedAt });
    setCloudState(out.state);
    setHydrated(true);
    setStatus("synced");
    return out;
  }

  async function saveSnapshot(state, clientVersion) {
    if (!(auth.mode === "online" && auth.token)) return null;
    if (!navigator.onLine) {
      setStatus("offline");
      return null;
    }
    if (savingRef.current) return null;
    // Strip any legacy/inline categories from the finance snapshot.
// Categories are synced via categoriesStore (separate table/endpoints).
let cleanState = state;
if (state && typeof state === "object" && "categories" in state) {
  try {
    cleanState = structuredClone(state);
    delete cleanState.categories;
  } catch {
    const { categories, ...rest } = state;
    cleanState = rest;
  }
}

savingRef.current = true;
    setStatus("syncing");
    try {
      const out = await api.request("/sync/save.php", {
        method: "POST",
        body: { state, version: Number(clientVersion || 0) },
      });
      setMeta({ version: Number(out.version || 0), updatedAt: out.updatedAt || null });
      setCloudState(state);
      setStatus("synced");
      return out;
    } catch (e) {
      // No conflict UI: last-write-wins.
      if (e.status === 409) {
        const server = await api.request("/sync/pull.php").catch(() => api.request("/sync/get.php"));
        const serverVersion = Number(server.version || e.data?.serverVersion || 0);
        const out2 = await api.request("/sync/save.php", {
          method: "POST",
          body: { state, version: serverVersion },
        });
        setMeta({ version: Number(out2.version || 0), updatedAt: out2.updatedAt || null });
        setCloudState(state);
        setStatus("synced");
        return out2;
      }
      setStatus("error");
      return null;
    } finally {
      savingRef.current = false;
    }
  }

  // Auto pull on login / refresh while logged in.
  useEffect(() => {
    let cancelled = false;
    async function run() {
      if (!(auth.mode === "online" && auth.token)) {
        setStatus("offline");
        setHydrated(false);
        setCloudState(null);
        return;
      }
      try {
        const out = await pull();
        if (cancelled) return;
        // If cloud is empty, keep empty state (do not migrate from local).
        if (!out.state || out.version === 0) {
          setCloudState(null);
        }
      } catch {
        if (cancelled) return;
        setStatus("error");
      }
    }
    run();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [auth.mode, auth.token]);

  // Debounced push on every mutation (cloud-first).
  const debounced = useMemo(() => {
    function schedule(state) {
      if (!(auth.mode === "online" && auth.token)) return;
      lastStateRef.current = state;
      if (saveTimer.current) clearTimeout(saveTimer.current);
      saveTimer.current = setTimeout(() => {
        saveSnapshot(state, meta.version || 0);
      }, 800);
    }
    async function flushNow() {
      const s = lastStateRef.current;
      if (!s) return;
      await saveSnapshot(s, meta.version || 0);
    }
    return { schedule, flushNow };
  }, [auth.mode, auth.token, meta.version]);

  // Best-effort push on tab close.
  useEffect(() => {
    function handler() {
      if (!(auth.mode === "online" && auth.token)) return;
      const s = lastStateRef.current;
      if (!s) return;

      // Fire-and-forget with keepalive.
      try {
        const base = api.base || (import.meta.env.VITE_API_BASE || "/api");
        const url = `${base}/sync/save.php`;
        const body = JSON.stringify({ state: s, version: meta.version || 0 });
        fetch(url, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${auth.token}`,
          },
          body,
          keepalive: true,
        });
      } catch {
        // ignore
      }
    }
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [auth.mode, auth.token, api.base, meta.version]);

  const actions = useMemo(() => {
    async function syncNow(state) {
      return saveSnapshot(state, meta.version || 0);
    }
    return { pull, syncNow };
  }, [auth.mode, auth.token, meta.version]);

  return (
    <SyncCtx.Provider value={{ status, meta, hydrated, cloudState, actions, debounced }}>
      {children}
    </SyncCtx.Provider>
  );
}

export function useSync() {
  const ctx = useContext(SyncCtx);
  if (!ctx) throw new Error("useSync must be used inside SyncProvider");
  return ctx;
}

export const SYNC_META_STORAGE_KEY = META_KEY;
