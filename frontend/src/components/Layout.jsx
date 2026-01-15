import React, { useEffect, useMemo, useState } from "react";
import { Outlet, NavLink, useLocation } from "react-router-dom";
import { useFinance } from "../state/financeStore.jsx";
import { useAuth } from "../state/authStore.jsx";
import { useSync } from "../state/syncStore.jsx";
import Modal from "./Modal.jsx";
import {
  IconBolt,
  IconCredit,
  IconArchive,
  IconHome,
  IconLayers,
  IconMoon,
  IconSettings,
  IconSun,
  IconWallet,
} from "./Icons.jsx";

// Nav (logic / routes unchanged)
const NAV_CORE = [
  { to: "/", label: "Dashboard", icon: IconHome },
  { to: "/daily", label: "Daily", icon: IconBolt },
  { to: "/budget", label: "Needs", icon: IconWallet },
  { to: "/buckets", label: "Buckets", icon: IconLayers },
  { to: "/debts", label: "Debt", icon: IconCredit },
];

const NAV_SYSTEM = [
  { to: "/backup", label: "Backup", icon: IconArchive },
  { to: "/settings", label: "Settings", icon: IconSettings },
];

const NAV = [...NAV_CORE, ...NAV_SYSTEM];

function useLocalBool(key, defaultValue) {
  const [val, setVal] = useState(() => {
    try {
      const raw = localStorage.getItem(key);
      if (raw == null) return defaultValue;
      return raw === "1";
    } catch {
      return defaultValue;
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem(key, val ? "1" : "0");
    } catch {}
  }, [key, val]);

  return [val, setVal];
}

function DesktopSidebar({ collapsed, setCollapsed }) {
  const { state, dispatch } = useFinance();
  const theme = state.profile?.theme || "dark";

  const widthClass = collapsed ? "w-20" : "w-64";

  function toggleTheme() {
    dispatch({ type: "PROFILE_UPDATE", patch: { theme: theme === "dark" ? "light" : "dark" } });
  }

  return (
    <aside className={`hidden lg:flex fixed left-0 top-0 bottom-0 ${widthClass} sidebar z-30`}>
      <div className="flex flex-col w-full px-3 py-4">
        {/* Brand + sidebar toggle (moved up for less fatigue) */}
        <div
          className={
            collapsed
              ? "flex items-center justify-center px-0"
              : "flex items-center gap-2 px-2"
          }
        >
          <button
            type="button"
            className={
              [
                "flex items-center rounded-xl2 py-2 hover:bg-app-surface2 border border-transparent hover:border-app-border transition",
                collapsed ? "w-full justify-center px-0" : "gap-3 text-left px-2",
              ].join(" ")
            }
            onClick={() => setCollapsed((v) => !v)}
            title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          >
            <div className="h-10 w-10 rounded-xl2 bg-app-accent/10 border border-app-accent/20 grid place-items-center shadow-soft">
              <span className="text-app-accent font-semibold">₥</span>
            </div>
            {!collapsed && (
              <div className="min-w-0">
                <div className="text-sm font-semibold leading-tight">Finance OS</div>
                <div className="text-xs text-app-muted leading-tight">Local-first workspace</div>
              </div>
            )}
          </button>

          {/* Burger removed: brand area now manages collapse/expand */}
        </div>

        <div className="mt-4" />

        {/* Nav groups */}
        <nav className="flex-1">
          {!collapsed && (
            <div className="px-3 pt-2 pb-2 text-[11px] font-semibold tracking-wide text-app-muted/80">
              CORE
            </div>
          )}
          <div className="space-y-1">
            {NAV_CORE.map((item) => {
              const Icon = item.icon;
              return (
                <NavLink
                  key={item.to}
                  to={item.to}
                  title={collapsed ? item.label : undefined}
                  className={({ isActive }) =>
                    [
                      "sideitem",
                      isActive ? "sideitem-active" : "",
                      collapsed ? "justify-center" : "",
                    ].join(" ")
                  }
                >
                  <Icon className="sideicon" />
                  {!collapsed && <span className="sidelabel">{item.label}</span>}
                </NavLink>
              );
            })}
          </div>

          <div className="mt-4" />
          {!collapsed && (
            <div className="px-3 pt-2 pb-2 text-[11px] font-semibold tracking-wide text-app-muted/80">
              SYSTEM
            </div>
          )}
          <div className="space-y-1">
            {NAV_SYSTEM.map((item) => {
              const Icon = item.icon;
              return (
                <NavLink
                  key={item.to}
                  to={item.to}
                  title={collapsed ? item.label : undefined}
                  className={({ isActive }) =>
                    [
                      "sideitem",
                      isActive ? "sideitem-active" : "",
                      "opacity-95",
                      collapsed ? "justify-center" : "",
                    ].join(" ")
                  }
                >
                  <Icon className="sideicon" />
                  {!collapsed && <span className="sidelabel">{item.label}</span>}
                </NavLink>
              );
            })}
          </div>
        </nav>

        {/* Footer controls (icon-only to reduce fatigue) */}
        <div className="mt-3">
          <button
            type="button"
            className={
              "sideitem " +
              (collapsed ? "justify-center" : "")
            }
            onClick={toggleTheme}
            title={theme === "dark" ? "Switch to light" : "Switch to dark"}
          >
            {theme === "dark" ? <IconSun className="sideicon" /> : <IconMoon className="sideicon" />}
            {/* no text label */}
          </button>
        </div>
      </div>
    </aside>
  );
}

function MobileTopBar() {
  const loc = useLocation();
  const title = useMemo(() => NAV.find((n) => n.to === loc.pathname)?.label ?? "Finance OS", [loc.pathname]);

  return (
    <div className="lg:hidden sticky top-0 z-20 backdrop-blur bg-app-bg/82 border-b border-app-border">
      <div className="mx-auto max-w-6xl px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="h-9 w-9 rounded-xl2 bg-app-accent/10 border border-app-accent/20 grid place-items-center shadow-soft">
            <span className="text-app-accent font-semibold">₥</span>
          </div>
          <div>
            <div className="text-sm font-semibold leading-tight">{title}</div>
            <div className="text-xs text-app-muted leading-tight">Local-first. Offline.</div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <NavLink
            to="/settings"
            className={({ isActive }) =>
              "btn btn-ghost " + (isActive ? "text-app-accent" : "")
            }
            title="Settings"
          >
            <IconSettings className="h-4 w-4" />
          </NavLink>

          <NavLink
            to="/daily"
            className={({ isActive }) =>
              "btn " + (isActive ? "border-app-accent/30 text-app-accent" : "")
            }
          >
            <IconBolt className="h-4 w-4 mr-2" /> Add
          </NavLink>
        </div>
      </div>
    </div>
  );
}

function BottomNav() {
  return (
    <div className="fixed bottom-0 left-0 right-0 z-20 bg-app-bg/88 backdrop-blur border-t border-app-border md:hidden">
      <div className="mx-auto max-w-6xl px-3 py-2">
        <div className="grid grid-cols-5 gap-2 items-end">
          <NavLink to="/" className={({ isActive }) => "navbtn " + (isActive ? "navbtn-active" : "")}
          >
            <IconHome className="h-5 w-5" />
            <span>Home</span>
          </NavLink>
          <NavLink to="/budget" className={({ isActive }) => "navbtn " + (isActive ? "navbtn-active" : "")}
          >
            <IconWallet className="h-5 w-5" />
            <span>Needs</span>
          </NavLink>

          <NavLink
            to="/daily"
            className={({ isActive }) =>
              "-mt-6 rounded-2xl border border-app-accent/25 bg-app-accent text-white shadow-lift px-3 py-3 flex flex-col items-center justify-center gap-1 active:scale-[0.98] transition " +
              (isActive ? "opacity-95" : "")
            }
            title="Add"
          >
            <IconBolt className="h-6 w-6" />
            <span className="text-[11px] font-medium">Add</span>
          </NavLink>

          <NavLink to="/buckets" className={({ isActive }) => "navbtn " + (isActive ? "navbtn-active" : "")}
          >
            <IconLayers className="h-5 w-5" />
            <span>Buckets</span>
          </NavLink>
          <NavLink to="/debts" className={({ isActive }) => "navbtn " + (isActive ? "navbtn-active" : "")}
          >
            <IconCredit className="h-5 w-5" />
            <span>Debt</span>
          </NavLink>
        </div>
      </div>
    </div>
  );
}

export default function Layout() {
  const { state, dispatch } = useFinance();
  const { auth, api } = useAuth();
  const sync = useSync();
  const theme = state.profile?.theme || "dark";

  const [collapsed, setCollapsed] = useLocalBool("financeos.sidebarCollapsed", false);

  // keep theme class in sync (also applied in FinanceProvider; this is a safe redundancy)
  useEffect(() => {
    const root = document.documentElement;
    root.classList.toggle("dark", theme === "dark");
  }, [theme]);

  // Match content padding to sidebar width.
  const contentPad = collapsed ? "lg:pl-20" : "lg:pl-64";

  // Sync UI helpers
  const isOnlineSync = auth.mode === "online" && !!auth.token;

  function badgeText() {
    if (!isOnlineSync) return "Offline";
    if (!navigator.onLine) return "Offline";
    switch (sync.status) {
      case "syncing": return "Syncing…";
      case "synced": return "Synced";
      case "conflict": return "Conflict";
      case "error": return "Sync error";
      default: return "Online";
    }
  }

  async function onLogout() {
    await api.logout();
  }

  const syncMode = auth.mode === "online" && auth.token ? "online" : "offline";
  const syncStatus = syncMode === "offline" ? "offline" : (sync.status || "idle");

  return (
    <div className="min-h-screen pb-24 md:pb-8">
      <DesktopSidebar collapsed={collapsed} setCollapsed={setCollapsed} />
      <MobileTopBar />

      <div className={contentPad}>
        <main className="mx-auto max-w-7xl px-4 md:px-6 py-6">
          {/* Sync banner (online mode only) */}
          {auth.mode === "online" ? (
            <div className="mb-4">
              {sync.status === "syncing" ? (
                <div className="rounded-xl2 border border-app-border bg-app-surface px-4 py-2 text-sm text-app-muted flex items-center justify-between">
                  <span>Syncing…</span>
                  <span className="text-xs">v{sync.meta?.version || 0}</span>
                </div>
              ) : sync.status === "synced" ? (
                <div className="rounded-xl2 border border-app-border bg-app-surface px-4 py-2 text-sm text-app-muted flex items-center justify-between">
                  <span>Synced</span>
                  <span className="text-xs">v{sync.meta?.version || 0}</span>
                </div>
              ) : sync.status === "offline" ? (
                <div className="rounded-xl2 border border-app-border bg-app-surface px-4 py-2 text-sm text-app-muted flex items-center justify-between">
                  <span>Offline</span>
                  <span className="text-xs">Cloud paused</span>
                </div>
              ) : null}
            </div>
          ) : null}

          <Outlet />
        </main>
      </div>

      <BottomNav />

      {/* Cloud-first: no cloud/local choice modal */}
    </div>
  );
}
