import React, { useEffect } from "react";
import { Navigate, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../state/authStore.jsx";

/**
 * AuthGuard
 *
 * Prevents "back button" bypass after logout.
 * - If token missing OR user not loaded -> redirect to /login (replace)
 * - If page is restored from bfcache (pageshow.persisted) and not authed -> redirect
 */
export default function AuthGuard({ children }) {
  const { auth } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  const isAuthed = !!auth?.token && !!auth?.user;

  useEffect(() => {
    function onPageShow(e) {
      // If coming back from bfcache and auth is gone, force to login.
      if (e?.persisted && !(auth?.token && auth?.user)) {
        navigate("/login", { replace: true });
      }
    }
    window.addEventListener("pageshow", onPageShow);
    return () => window.removeEventListener("pageshow", onPageShow);
  }, [auth?.token, auth?.user, navigate]);

  if (!isAuthed) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  }

  return children;
}
