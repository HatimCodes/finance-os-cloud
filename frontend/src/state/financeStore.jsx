import React, { createContext, useContext, useEffect, useMemo, useReducer } from "react";
import { loadState, saveState } from "./storage.js";
import { makeDefaultState } from "./defaultState.js";
import { monthKey, uid, todayISO } from "./money.js";
import { useSync } from "./syncStore.jsx";
import { useAuth } from "./authStore.jsx";

const FinanceCtx = createContext(null);

function normalizeNeedItem(n) {
  if (!n || typeof n !== "object") return n;
  const raw = { ...n };
  const paid = Boolean(raw.paid || false);
  const paidAt = raw.paidAt ? String(raw.paidAt) : null;
  return { ...raw, paid, paidAt };
}

function normalizeMonthNeeds(obj) {
  if (!obj || typeof obj !== "object") return {};
  const out = {};
  for (const [mk, items] of Object.entries(obj)) {
    out[mk] = Array.isArray(items) ? items.map(normalizeNeedItem) : [];
  }
  return out;
}

function normalizeState(s) {
  const d = makeDefaultState();
  if (!s) return d;

  const template = Array.isArray(s.needsTemplate)
    ? s.needsTemplate
    : (Array.isArray(s.needs) ? s.needs : d.needsTemplate);

  // Safety migration: if a legacy template contains old personal example items,
  // replace it with the neutral shipped placeholders.
  const legacyNames = new Set(["wifi", "orange", "eau/elec", "icloud", "hosting", "chatgpt", "master", "food"]);
  const currentNames = new Set(
    (template || []).map((x) => String(x?.name || "").trim().toLowerCase()).filter(Boolean)
  );
  const looksLikeLegacy = legacyNames.size === currentNames.size && [...legacyNames].every((n) => currentNames.has(n));
  const safeTemplate = looksLikeLegacy ? d.needsTemplate : template;
  // shallow merge for forward compatibility
  return {
    ...d,
    ...s,
    profile: { ...d.profile, ...(s.profile || {}) },
    needsTemplate: safeTemplate,
    monthNeeds: normalizeMonthNeeds((s.monthNeeds && typeof s.monthNeeds === 'object') ? s.monthNeeds : d.monthNeeds),
    categories: Array.isArray(s.categories) ? s.categories : d.categories,
    buckets: Array.isArray(s.buckets) ? s.buckets : d.buckets,
    debts: Array.isArray(s.debts) ? s.debts : d.debts,
    transactions: Array.isArray(s.transactions) ? s.transactions : d.transactions,
  };
}

function reducer(state, action) {
  const now = todayISO();
  switch (action.type) {
    case "RESET":
      return { ...action.payload, updatedAt: now };
    case "PROFILE_UPDATE":
      return { ...state, profile: { ...state.profile, ...action.patch }, updatedAt: now };
    case "MONTH_NEEDS_SET": {
      const items = Array.isArray(action.items) ? action.items.map(normalizeNeedItem) : [];
      return { ...state, monthNeeds: { ...state.monthNeeds, [action.monthKey]: items }, updatedAt: now };
    }
    case "MONTH_NEED_ADD": {
      const items = state.monthNeeds[action.monthKey] || [];
      return {
        ...state,
        monthNeeds: {
          ...state.monthNeeds,
          [action.monthKey]: [...items, normalizeNeedItem({ id: uid("need"), ...action.item })],
        },
        updatedAt: now,
      };
    }
    case "MONTH_NEED_UPDATE": {
      const items = state.monthNeeds[action.monthKey] || [];
      return { ...state, monthNeeds: { ...state.monthNeeds, [action.monthKey]: items.map(n => n.id === action.id ? { ...n, ...action.patch } : n) }, updatedAt: now };
    }
    case "MONTH_NEED_DELETE": {
      const items = state.monthNeeds[action.monthKey] || [];
      return { ...state, monthNeeds: { ...state.monthNeeds, [action.monthKey]: items.filter(n => n.id !== action.id) }, updatedAt: now };
    }
    case "BUCKET_ADD":
      return { ...state, buckets: [...state.buckets, { id: uid("bucket"), ...action.item }], updatedAt: now };
    case "BUCKET_UPDATE":
      return { ...state, buckets: state.buckets.map(b => b.id === action.id ? { ...b, ...action.patch } : b), updatedAt: now };
    case "BUCKET_DELETE":
      return { ...state, buckets: state.buckets.filter(b => b.id !== action.id), updatedAt: now };
    case "DEBT_ADD":
      return { ...state, debts: [...state.debts, { id: uid("debt"), ...action.item }], updatedAt: now };
    case "DEBT_UPDATE":
      return { ...state, debts: state.debts.map(d => d.id === action.id ? { ...d, ...action.patch } : d), updatedAt: now };
    case "DEBT_DELETE":
      return { ...state, debts: state.debts.filter(d => d.id !== action.id), updatedAt: now };
    case "TX_ADD":
      return { ...state, transactions: [...state.transactions, { id: uid("tx"), ...action.tx }], updatedAt: now };
    case "TX_UPDATE":
      return { ...state, transactions: state.transactions.map(t => t.id === action.id ? { ...t, ...action.patch } : t), updatedAt: now };
    case "TX_DELETE":
      return { ...state, transactions: state.transactions.filter(t => t.id !== action.id), updatedAt: now };
    default:
      return state;
  }
}

function OfflineFinanceProvider({ children }) {
  const [state, dispatch] = useReducer(reducer, null, () => normalizeState(loadState()));

  useEffect(() => {
    saveState(state);
  }, [state]);

  // Theme
  useEffect(() => {
    const theme = state?.profile?.theme || "dark";
    document.documentElement.classList.toggle("dark", theme === "dark");
  }, [state?.profile?.theme]);


  const api = useMemo(() => {
    function addIncome({ date, amount, note, payment }) {
      dispatch({ type: "TX_ADD", tx: { type: "income", date, amount: Number(amount), category: "Income", payment, note } });
    }
    function addExpense({ date, amount, categoryId, categoryName, note, payment, needWant="Need" }) {
      dispatch({ type: "TX_ADD", tx: { type: "expense", date, amount: Number(amount), categoryId: categoryId ?? null, category: categoryName ?? "Other", payment, note, needWant } });
    }
    function addBucket({ date, amount, bucketId, note, payment }) {
      dispatch({ type: "TX_ADD", tx: { type: "bucket_add", date, amount: Number(amount), bucketId, category: "Bucket", payment, note } });
    }
    function addDebtPayment({ date, amount, debtId, note, payment }) {
      dispatch({ type: "TX_ADD", tx: { type: "debt_payment", date, amount: Number(amount), debtId, category: "Debt Payment", payment, note } });
    }

    return { addIncome, addExpense, addBucket, addDebtPayment };
  }, []);

  return <FinanceCtx.Provider value={{ state, dispatch, api }}>{children}</FinanceCtx.Provider>;
}

function OnlineFinanceProvider({ children }) {
  const sync = useSync();
  // IMPORTANT: When logged in, finance data is cloud-only.
  // Start from empty defaults until cloud pull completes.
  const [state, dispatch] = useReducer(reducer, null, () => normalizeState(null));

  // Hydrate from cloud automatically (no prompts).
  useEffect(() => {
    if (!sync?.hydrated) return;
    const payload = sync.cloudState ? normalizeState(sync.cloudState) : normalizeState(null);
    dispatch({ type: "RESET", payload });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sync?.hydrated]);

  // Push every mutation to cloud (debounced in sync store).
  useEffect(() => {
    if (sync?.debounced?.schedule) sync.debounced.schedule(state);
  }, [state]);

  // Theme
  useEffect(() => {
    const theme = state?.profile?.theme || "dark";
    document.documentElement.classList.toggle("dark", theme === "dark");
  }, [state?.profile?.theme]);

  const api = useMemo(() => {
    function addIncome({ date, amount, note, payment }) {
      dispatch({ type: "TX_ADD", tx: { type: "income", date, amount: Number(amount), category: "Income", payment, note } });
    }
    function addExpense({ date, amount, categoryId, categoryName, note, payment, needWant="Need" }) {
      dispatch({ type: "TX_ADD", tx: { type: "expense", date, amount: Number(amount), categoryId: categoryId ?? null, category: categoryName ?? "Other", payment, note, needWant } });
    }
    function addBucket({ date, amount, bucketId, note, payment }) {
      dispatch({ type: "TX_ADD", tx: { type: "bucket_add", date, amount: Number(amount), bucketId, category: "Bucket", payment, note } });
    }
    function addDebtPayment({ date, amount, debtId, note, payment }) {
      dispatch({ type: "TX_ADD", tx: { type: "debt_payment", date, amount: Number(amount), debtId, category: "Debt Payment", payment, note } });
    }
    return { addIncome, addExpense, addBucket, addDebtPayment };
  }, []);

  return <FinanceCtx.Provider value={{ state, dispatch, api }}>{children}</FinanceCtx.Provider>;
}

export function FinanceProvider({ children }) {
  const { auth } = useAuth();
  const online = auth.mode === "online" && Boolean(auth.token);
  return online ? <OnlineFinanceProvider>{children}</OnlineFinanceProvider> : <OfflineFinanceProvider>{children}</OfflineFinanceProvider>;
}

export function useFinance() {
  const ctx = useContext(FinanceCtx);
  if (!ctx) throw new Error("useFinance must be used inside FinanceProvider");
  return ctx;
}

// selectors
export function useComputed(month = null) {
  const { state } = useFinance();
  const currency = state.profile.currency || "MAD";
  const mk = month || monthKey(new Date().toISOString().slice(0,10));
  const tx = state.transactions.filter(t => (t.date ? monthKey(t.date) : mk) === mk);

  const income = tx.filter(t => t.type === "income").reduce((s,t)=>s+Number(t.amount||0),0);
  const spent = tx.filter(t => t.type === "expense").reduce((s,t)=>s+Number(t.amount||0),0);
  const bucketAdds = tx.filter(t => t.type === "bucket_add").reduce((s,t)=>s+Number(t.amount||0),0);
  const debtPays = tx.filter(t => t.type === "debt_payment").reduce((s,t)=>s+Number(t.amount||0),0);

  const needsItems = (state.monthNeeds && state.monthNeeds[mk]) ? state.monthNeeds[mk] : [];
  const needsConfigured = Boolean(state.monthNeeds && state.monthNeeds[mk]);
  const needsTotal = needsItems.reduce((s,n)=>s+Number(n.amount||0),0);

  // debt remaining = sum of balances - payments
  const debtStart = state.debts.reduce((s,d)=>s+Number(d.balance||0),0);
  const debtPaidAllTime = state.transactions.filter(t=>t.type==="debt_payment").reduce((s,t)=>s+Number(t.amount||0),0);
  const debtRemaining = Math.max(0, debtStart - debtPaidAllTime);

  // bucket totals from ledger (do not mutate bucket.current; compute)
  const bucketTotals = {};
  for (const b of state.buckets) bucketTotals[b.id] = 0;
  for (const t of state.transactions) {
    if (t.type === "bucket_add" && t.bucketId && bucketTotals[t.bucketId] != null) {
      bucketTotals[t.bucketId] += Number(t.amount||0);
    }
  }
  const totalSaved = Object.values(bucketTotals).reduce((s,v)=>s+v,0);

  const startingBalance = Number(state.profile.startingBalance||0);
  const allIncome = state.transactions.filter(t=>t.type==="income").reduce((s,t)=>s+Number(t.amount||0),0);
  const allExpense = state.transactions.filter(t=>t.type==="expense").reduce((s,t)=>s+Number(t.amount||0),0);
  const allBucket = state.transactions.filter(t=>t.type==="bucket_add").reduce((s,t)=>s+Number(t.amount||0),0);
  const allDebtPay = state.transactions.filter(t=>t.type==="debt_payment").reduce((s,t)=>s+Number(t.amount||0),0);

  const cashBalance = startingBalance + allIncome - allExpense - allBucket - allDebtPay;
  const netPosition = cashBalance + totalSaved - debtRemaining;

  return {
    currency,
    monthKey: mk,
    income,
    spent,
    bucketAdds,
    debtPays,
    needsTotal,
    needsConfigured,
    remainingThisMonth: income - spent - bucketAdds - debtPays,
    debtRemaining,
    bucketTotals,
    totalSaved,
    cashBalance,
    netPosition,
  };
}
