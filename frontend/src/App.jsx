import React from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import Layout from "./components/Layout.jsx";
import Dashboard from "./pages/Dashboard.jsx";
import Daily from "./pages/Daily.jsx";
import Budget from "./pages/Budget.jsx";
import Buckets from "./pages/Buckets.jsx";
import Debts from "./pages/Debts.jsx";
import Backup from "./pages/Backup.jsx";
import Settings from "./pages/Settings.jsx";
import Setup from "./pages/Setup.jsx";
import { FinanceProvider, useFinance } from "./state/financeStore.jsx";
import { AuthProvider } from "./state/authStore.jsx";
import { SyncProvider } from "./state/syncStore.jsx";
import Login from "./pages/Login.jsx";
import Register from "./pages/Register.jsx";
import AuthGuard from "./components/AuthGuard.jsx";

function Gate({ children }) {
  const { state } = useFinance();
  if (!state.profile?.hasCompletedSetup) return <Navigate to="/setup" replace />;
  return children;
}

function SetupGate() {
  const { state } = useFinance();
  if (state.profile?.hasCompletedSetup) return <Navigate to="/" replace />;
  return <Setup />;
}
export default function App() {
  return (
    <AuthProvider>
      <SyncProvider>
        <FinanceProvider>
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />

            {/* Cloud-only mode: all app routes require valid auth */}
            <Route element={<AuthGuard><Layout /></AuthGuard>}>
              <Route path="/setup" element={<SetupGate />} />
              <Route
                path="/"
                element={
                  <Gate>
                    <Dashboard />
                  </Gate>
                }
              />
          <Route
            path="/daily"
            element={
              <Gate>
                <Daily />
              </Gate>
            }
          />
          <Route
            path="/budget"
            element={
              <Gate>
                <Budget />
              </Gate>
            }
          />
          <Route
            path="/buckets"
            element={
              <Gate>
                <Buckets />
              </Gate>
            }
          />
          <Route
            path="/debts"
            element={
              <Gate>
                <Debts />
              </Gate>
            }
          />
          <Route
            path="/backup"
            element={
              <Gate>
                <Backup />
              </Gate>
            }
          />
          <Route
            path="/settings"
            element={
              <Gate>
                <Settings />
              </Gate>
            }
          />
              <Route path="*" element={<Navigate to="/" replace />} />
            </Route>
          </Routes>
        </FinanceProvider>
      </SyncProvider>
    </AuthProvider>
  );
}
