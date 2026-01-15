import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import Section from "../components/Section.jsx";
import { useFinance } from "../state/financeStore.jsx";
import { useAuth } from "../state/authStore.jsx";

export default function Setup() {
  const { state, dispatch } = useFinance();
  const { auth } = useAuth();
  const navigate = useNavigate();

  const [name, setName] = useState(state.profile.name || "");
  const [currency, setCurrency] = useState(state.profile.currency || "MAD");
  const [startingBalance, setStartingBalance] = useState(String(state.profile.startingBalance ?? 0));

  // If already completed, leave setup immediately
  useEffect(() => {
    if (state.profile?.hasCompletedSetup) navigate("/", { replace: true });
  }, [state.profile?.hasCompletedSetup, navigate]);

  // Cloud-only hard guard: Setup requires auth.
  useEffect(() => {
    if (!(auth?.token && auth?.user)) {
      navigate("/login", { replace: true });
    }
  }, [auth?.token, auth?.user, navigate]);

  function save() {
    // Re-check auth at submit time to avoid edge cases (expired token, logout in another tab).
    if (!(auth?.token && auth?.user)) {
      navigate("/login", { replace: true });
      return;
    }
    dispatch({
      type: "PROFILE_UPDATE",
      patch: {
        name,
        currency,
        startingBalance: Number(startingBalance || 0),
        hasCompletedSetup: true,
      },
    });
    // Navigate right away (no refresh needed)
    navigate("/", { replace: true });
  }

  return (
    <div className="space-y-4">
      <div className="text-sm text-app-muted">
        Set your preferences. When you are signed in, your data syncs to your account automatically.
      </div>

      <Section title="Setup">
        <div className="grid gap-3">
          <div>
            <div className="label">Name (optional)</div>
            <input className="input" value={name} onChange={(e) => setName(e.target.value)} />
          </div>

          <div className="grid sm:grid-cols-2 gap-3">
            <div>
              <div className="label">Currency</div>
              <input className="input" value={currency} onChange={(e) => setCurrency(e.target.value)} placeholder="MAD" />
              <div className="text-xs text-app-muted mt-1">You can type MAD, USD, EUR…</div>
            </div>

            <div>
              <div className="label">Starting balance</div>
              <input className="input" type="number" value={startingBalance} onChange={(e) => setStartingBalance(e.target.value)} />
              <div className="text-xs text-app-muted mt-1">What you have today (cash + bank).</div>
            </div>
          </div>

          <div className="flex gap-2">
            <button className="btn btn-accent" onClick={save}>
              Save & Continue
            </button>
            <button
              className="btn"
              onClick={() => {
                setName("");
                setCurrency("MAD");
                setStartingBalance("0");
              }}
            >
              Reset fields
            </button>
          </div>
        </div>
      </Section>

      <Section title="How this works">
        <ul className="text-sm text-app-muted list-disc pl-5 space-y-1">
          <li>Add income and daily expenses.</li>
          <li>Track recurring needs in the Needs page.</li>
          <li>Create savings buckets (Emergency, Fun, etc.) and add to them.</li>
          <li>Add debts (any amount), then log payments.</li>
          <li>Export JSON regularly as a backup.</li>
        </ul>
      </Section>
    </div>
  );
}
