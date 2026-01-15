import React, { useMemo, useState } from "react";
import Section from "../components/Section.jsx";
import PageHeader from "../components/PageHeader.jsx";
import EmptyState from "../components/EmptyState.jsx";
import { useFinance } from "../state/financeStore.jsx";
import { formatMoney, monthKey, todayISO, uid, isActiveInMonth } from "../state/money.js";

function MonthSelect({ value, onChange }) {
  return (
    <select className="input" value={value} onChange={(e)=>onChange(e.target.value)}>
      {Array.from({ length: 18 }).map((_,i)=>{
        const d = new Date();
        d.setMonth(d.getMonth() - i);
        const mk = monthKey(d.toISOString().slice(0,10));
        return <option key={mk} value={mk}>{mk}</option>;
      })}
    </select>
  );
}

function prevMonthKey(mk) {
  const [y, m] = mk.split("-").map(Number);
  const d = new Date(y, m - 1, 1);
  d.setMonth(d.getMonth() - 1);
  return monthKey(d.toISOString().slice(0,10));
}

export default function Budget() {
  const { state, dispatch } = useFinance();
  const currency = state.profile.currency || "MAD";
  const [mk, setMk] = useState(monthKey(todayISO()));
  const [paidFilter, setPaidFilter] = useState("all"); // all | unpaid | paid

  const monthItems = state.monthNeeds?.[mk] || null;
  const hasMonth = Boolean(monthItems);
  const needsItems = monthItems || [];

  const filtered = useMemo(() => {
    if (paidFilter === "paid") return needsItems.filter(n => Boolean(n.paid));
    if (paidFilter === "unpaid") return needsItems.filter(n => !Boolean(n.paid));
    return needsItems;
  }, [needsItems, paidFilter]);

  const total = useMemo(() => needsItems.reduce((s,n)=>s+Number(n.amount||0),0), [needsItems]);

  const [name, setName] = useState("");
  const [amount, setAmount] = useState("");

  function setMonth(items) {
    dispatch({ type:"MONTH_NEEDS_SET", monthKey: mk, items });
  }

  function createFromTemplate() {
    const active = state.needsTemplate.filter(n => isActiveInMonth(n, mk));
    const copied = active.map(n => ({ ...n, id: uid("need"), paid: false, paidAt: null }));
    setMonth(copied);
  }

  function createFromPreviousMonth() {
    const pm = prevMonthKey(mk);
    const prev = state.monthNeeds?.[pm];
    if (!prev) {
      alert(`No needs list found for ${pm}. Create from template first.`);
      return;
    }
    const copied = prev.map(n => ({ ...n, id: uid("need"), paid: false, paidAt: null }));
    setMonth(copied);
  }

  function togglePaid(id, next) {
    if (!hasMonth) return;
    dispatch({
      type: "MONTH_NEED_UPDATE",
      monthKey: mk,
      id,
      patch: next
        ? { paid: true, paidAt: new Date().toISOString() }
        : { paid: false, paidAt: null },
    });
  }

  function updateItem(id, patch) {
    if (!hasMonth) return;
    dispatch({ type:"MONTH_NEED_UPDATE", monthKey: mk, id, patch });
  }

  function deleteItem(id) {
    if (!hasMonth) return;
    dispatch({ type:"MONTH_NEED_DELETE", monthKey: mk, id });
  }

  function addItem() {
    if (!hasMonth) return;
    const nm = name.trim();
    const amt = Number(amount||0);
    if (!nm) return;
    dispatch({ type:"MONTH_NEED_ADD", monthKey: mk, item:{ name: nm, amount: amt, paid: false, paidAt: null } });
    setName(""); setAmount("");
  }

  return (
    <div className="space-y-4">
      <PageHeader
        title="Needs"
        subtitle="Each month is unique. Updating needs here won’t change other months."
        right={<div className="w-40"><MonthSelect value={mk} onChange={setMk} /></div>}
      />

      <div className="grid grid-cols-2 gap-3">
        <div className="card p-4">
          <div className="text-xs text-app-muted">Baseline (this month)</div>
          <div className="text-xl font-semibold">{formatMoney(total, currency)}</div>
          <div className="text-xs text-app-muted mt-1">
            {hasMonth ? "Month-specific list" : "Not set yet"}
          </div>
        </div>

        <div className="card p-4">
          <div className="text-xs text-app-muted">Create this month</div>
          <div className="mt-2 flex flex-wrap gap-2">
            <button className="btn btn-accent" onClick={createFromTemplate} disabled={hasMonth}>
              Create from template
            </button>
            <button className="btn" onClick={createFromPreviousMonth} disabled={hasMonth}>
              Copy previous month
            </button>
            {hasMonth ? (
              <button className="btn" onClick={()=>{
                if (!confirm("Reset this month? This will overwrite your current list.")) return;
                createFromTemplate();
              }}>
                Reset to template
              </button>
            ) : null}
          </div>
          <div className="text-xs text-app-muted mt-2">
            Tip: Use “Copy previous month” when only one item changes (like ending a subscription).
          </div>
        </div>
      </div>

      <Section title="Items">
        {!hasMonth ? (
          <div className="text-sm text-app-muted">
            Create the month first, then you can edit items.
          </div>
        ) : (
          <>
            <div className="flex flex-wrap items-center gap-2 mb-3">
              <button
                className={`pill ${paidFilter === "all" ? "!text-app-text !bg-app-surface" : "hover:bg-app-surface"}`}
                onClick={()=>setPaidFilter("all")}
              >All</button>
              <button
                className={`pill ${paidFilter === "unpaid" ? "!text-app-text !bg-app-surface" : "hover:bg-app-surface"}`}
                onClick={()=>setPaidFilter("unpaid")}
              >Unpaid</button>
              <button
                className={`pill ${paidFilter === "paid" ? "!text-app-text !bg-app-surface" : "hover:bg-app-surface"}`}
                onClick={()=>setPaidFilter("paid")}
              >Paid</button>
              <div className="text-xs text-app-muted ml-auto">Tip: Mark needs paid as you execute them.</div>
            </div>

            <div className="overflow-auto">
              <table className="w-full text-sm">
                <thead className="text-xs text-app-muted">
                  <tr className="border-b border-app-border">
                    <th className="py-2 text-left">Item</th>
                    <th className="py-2 text-right">Amount</th>
                    <th className="py-2 text-center">Paid</th>
                    <th className="py-2"></th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((n) => (
                    <tr key={n.id} className={`border-b border-app-border/60 ${n.paid ? "opacity-85" : ""}`}>
                      <td className="py-2">
                        <input
                          className={`input ${n.paid ? "text-app-muted" : ""}`}
                          value={n.name}
                          onChange={(e)=>updateItem(n.id, { name: e.target.value })}
                        />
                      </td>
                      <td className="py-2 text-right">
                        <input
                          className={`input text-right ${n.paid ? "text-app-muted" : ""}`}
                          type="number"
                          value={n.amount}
                          onChange={(e)=>updateItem(n.id, { amount: Number(e.target.value||0) })}
                        />
                      </td>
                      <td className="py-2 text-center">
                        <button
                          className={`btn btn-ghost px-2 ${n.paid ? "text-app-text" : "text-app-muted"}`}
                          onClick={()=>togglePaid(n.id, !n.paid)}
                          title={n.paid ? `Paid${n.paidAt ? ` on ${String(n.paidAt).slice(0,10)}` : ""}` : "Mark paid"}
                        >
                          <span className={`inline-flex h-6 w-6 items-center justify-center rounded-lg border ${n.paid ? "bg-app-surface border-app-border" : "border-app-border bg-transparent"}`}>
                            {n.paid ? "✓" : ""}
                          </span>
                        </button>
                      </td>
                      <td className="py-2 text-right">
                        <button className="btn" onClick={()=>deleteItem(n.id)}>Delete</button>
                      </td>
                    </tr>
                  ))}
                  {needsItems.length === 0 ? (
                    <tr>
                      <td colSpan="4" className="py-4">
                        <EmptyState
                          title="No needs items yet"
                          hint="Add your baseline costs below (rent, bills, transport...)."
                        />
                      </td>
                    </tr>
                  ) : null}
                </tbody>
              </table>
            </div>

            <div className="mt-4 grid sm:grid-cols-3 gap-3">
              <div className="sm:col-span-2">
                <div className="label">New item</div>
                <input className="input" value={name} onChange={(e)=>setName(e.target.value)} placeholder="Example: Rent" />
              </div>
              <div>
                <div className="label">Amount ({currency})</div>
                <input className="input" type="number" value={amount} onChange={(e)=>setAmount(e.target.value)} placeholder="0" />
              </div>
              <div className="sm:col-span-3 flex gap-2">
                <button className="btn btn-accent" onClick={addItem}>Add</button>
                <button className="btn" onClick={()=>{ setName(""); setAmount(""); }}>Clear</button>
              </div>
            </div>
          </>
        )}
      </Section>

      <Section title="Template">
        <div className="text-sm text-app-muted">
          The template is just a starting point. Once a month is created, it becomes independent.
        </div>
      </Section>
    </div>
  );
}
