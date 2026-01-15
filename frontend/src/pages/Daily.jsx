import React, { useMemo, useState } from "react";
import Section from "../components/Section.jsx";
import Modal from "../components/Modal.jsx";
import PageHeader from "../components/PageHeader.jsx";
import EmptyState from "../components/EmptyState.jsx";
import { useFinance } from "../state/financeStore.jsx";
import { formatMoney, monthKey, todayISO } from "../state/money.js";

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

export default function Daily() {
  const { state, dispatch, api } = useFinance();
  const currency = state.profile.currency || "MAD";
  const [mk, setMk] = useState(monthKey(todayISO()));
  const [open, setOpen] = useState(false);

  const [date, setDate] = useState(todayISO());
  const [amount, setAmount] = useState("");
  const [category, setCategory] = useState("Food");
  const [payment, setPayment] = useState("Cash");
  const [needWant, setNeedWant] = useState("Need");
  const [note, setNote] = useState("");

  const txMonth = useMemo(() => {
    return state.transactions
      .filter(t => monthKey(t.date || todayISO()) === mk)
      .filter(t => t.type === "expense" || t.type === "income")
      .sort((a,b)=> (a.date||"").localeCompare(b.date||""));
  }, [state.transactions, mk]);

  const monthSpent = txMonth.filter(t=>t.type==="expense").reduce((s,t)=>s+Number(t.amount||0),0);

  function add() {
    const a = Number(amount||0);
    if (!a || a <= 0) return;
    api.addExpense({ date, amount: a, category, note, payment, needWant });
    setAmount("");
    setNote("");
    setOpen(false);
  }

  function del(id) {
    dispatch({ type: "TX_DELETE", id });
  }

  return (
    <div className="space-y-4">
      <PageHeader
        title="Daily"
        subtitle="Log expenses fast. Stay consistent, stay clear."
        right={<div className="w-40"><MonthSelect value={mk} onChange={setMk} /></div>}
      />

      <div className="grid grid-cols-2 gap-3">
        <div className="card p-4">
          <div className="text-xs text-app-muted">Total spent (month)</div>
          <div className="text-xl font-semibold">{formatMoney(monthSpent, currency)}</div>
        </div>
        <button className="card p-4 text-left hover:shadow-lift transition" onClick={()=>setOpen(true)}>
          <div className="text-xs text-app-muted">Quick action</div>
          <div className="text-xl font-semibold text-app-accent">+ Add expense</div>
        </button>
      </div>

      <Section title="Entries">
        {/* Desktop/tablet table */}
        <div className="overflow-auto hidden sm:block">
          <table className="w-full text-sm">
            <thead className="text-xs text-app-muted">
              <tr className="border-b border-app-border">
                <th className="py-2 text-left">Date</th>
                <th className="py-2 text-left">Category</th>
                <th className="py-2 text-left">Note</th>
                <th className="py-2 text-right">Amount</th>
                <th className="py-2"></th>
              </tr>
            </thead>
            <tbody>
              {txMonth.length === 0 ? (
                <tr>
                  <td className="py-4" colSpan="5">
                    <EmptyState
                      title={`No entries for ${mk}`}
                      hint="Tap “Add expense” to log your first item."
                    />
                  </td>
                </tr>
              ) : txMonth.map(t => (
                <tr key={t.id} className="border-b border-app-border/60">
                  <td className="py-2">{t.date}</td>
                  <td className="py-2">{t.type === "income" ? <span className="chip">Income</span> : t.category}</td>
                  <td className="py-2 text-app-muted">{t.note || "-"}</td>
                  <td className="py-2 text-right font-medium">
                    {t.type === "income" ? "+" : "-"}{formatMoney(t.amount, currency)}
                  </td>
                  <td className="py-2 text-right">
                    <button className="btn" onClick={()=>del(t.id)}>Delete</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Mobile card list */}
        <div className="sm:hidden space-y-2">
          {txMonth.length === 0 ? (
            <EmptyState title={`No entries for ${mk}`} hint="Use Add to log your first expense." />
          ) : (
            txMonth.map((t) => (
              <div key={t.id} className="card p-3">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="text-sm font-semibold">
                      {t.type === "income" ? "Income" : t.category}
                    </div>
                    <div className="text-xs text-app-muted mt-1">{t.date}{t.note ? ` • ${t.note}` : ""}</div>
                  </div>
                  <div className="text-right">
                    <div className={"text-sm font-semibold " + (t.type === "income" ? "text-app-accent" : "")}
                    >{t.type === "income" ? "+" : "-"}{formatMoney(t.amount, currency)}</div>
                    <button className="btn mt-2" onClick={() => del(t.id)}>Delete</button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </Section>

      <Modal open={open} title="Add expense" onClose={()=>setOpen(false)}>
        <div className="grid gap-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <div className="label">Date</div>
              <input className="input" type="date" value={date} onChange={(e)=>setDate(e.target.value)} />
            </div>
            <div>
              <div className="label">Amount ({currency})</div>
              <input className="input" type="number" value={amount} onChange={(e)=>setAmount(e.target.value)} />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <div className="label">Category</div>
              <select className="input" value={category} onChange={(e)=>setCategory(e.target.value)}>
                {state.categories.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div>
              <div className="label">Need / Want</div>
              <select className="input" value={needWant} onChange={(e)=>setNeedWant(e.target.value)}>
                <option>Need</option>
                <option>Want</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <div className="label">Payment</div>
              <select className="input" value={payment} onChange={(e)=>setPayment(e.target.value)}>
                <option>Cash</option>
                <option>Card</option>
                <option>Bank</option>
              </select>
            </div>
            <div>
              <div className="label">Note</div>
              <input className="input" value={note} onChange={(e)=>setNote(e.target.value)} placeholder="Optional" />
            </div>
          </div>

          <div className="flex gap-2">
            <button className="btn btn-accent" onClick={add}>Save</button>
            <button className="btn" onClick={()=>setOpen(false)}>Cancel</button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
