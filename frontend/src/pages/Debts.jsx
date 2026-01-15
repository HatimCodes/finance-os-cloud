import React, { useMemo, useState } from "react";
import Section from "../components/Section.jsx";
import Modal from "../components/Modal.jsx";
import { useFinance } from "../state/financeStore.jsx";
import { formatMoney, todayISO } from "../state/money.js";

export default function Debts() {
  const { state, dispatch, api } = useFinance();
  const currency = state.profile.currency || "MAD";

  const totalDebtStart = useMemo(() => state.debts.reduce((s,d)=>s+Number(d.balance||0),0), [state.debts]);
  const totalPaid = useMemo(() => state.transactions.filter(t=>t.type==="debt_payment").reduce((s,t)=>s+Number(t.amount||0),0), [state.transactions]);
  const remaining = Math.max(0, totalDebtStart - totalPaid);

  const [addOpen, setAddOpen] = useState(false);
  const [payOpen, setPayOpen] = useState(false);

  const [name, setName] = useState("");
  const [balance, setBalance] = useState("");
  const [note, setNote] = useState("");

  const [debtId, setDebtId] = useState(state.debts[0]?.id || "");
  const [payAmount, setPayAmount] = useState("");
  const [payNote, setPayNote] = useState("");
  const [payment, setPayment] = useState("Cash");

  function addDebt() {
    const nm = name.trim();
    const bal = Number(balance||0);
    if (!nm || bal <= 0) return;
    dispatch({ type:"DEBT_ADD", item:{ name: nm, balance: bal, note, startMonth: "", endMonth: "" } });
    setName(""); setBalance(""); setNote("");
    setAddOpen(false);
  }

  function pay() {
    const a = Number(payAmount||0);
    if (!debtId || a <= 0) return;
    api.addDebtPayment({ date: todayISO(), amount: a, debtId, note: payNote, payment });
    setPayAmount(""); setPayNote("");
    setPayOpen(false);
  }

  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="text-lg font-semibold">Debt</div>
          <div className="text-sm text-app-muted">Add any debt. Edit it anytime. Log payments.</div>
        </div>
        <div className="flex gap-2">
          <button className="btn" onClick={()=>setAddOpen(true)}>+ New debt</button>
          <button className="btn btn-accent" onClick={()=>setPayOpen(true)}>+ Payment</button>
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        <div className="card p-4">
          <div className="text-xs text-app-muted">Total debt (starting balances)</div>
          <div className="text-xl font-semibold">{formatMoney(totalDebtStart, currency)}</div>
        </div>
        <div className="card p-4">
          <div className="text-xs text-app-muted">Paid so far</div>
          <div className="text-xl font-semibold">{formatMoney(totalPaid, currency)}</div>
        </div>
        <div className="card p-4">
          <div className="text-xs text-app-muted">Remaining (computed)</div>
          <div className="text-xl font-semibold">{formatMoney(remaining, currency)}</div>
        </div>
      </div>

      <Section title="Debts list">
        <div className="grid sm:grid-cols-2 gap-3">
          {state.debts.map(d => (
            <div key={d.id} className="rounded-xl2 border border-app-border bg-app-surface2 p-3">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <div className="text-sm font-semibold">{d.name}</div>
                  <div className="text-xs text-app-muted">{d.note || "—"}</div>
                </div>
                <div className="text-sm font-semibold">{formatMoney(d.balance, currency)}</div>
              </div>
              <div className="mt-3 grid grid-cols-2 gap-2">
                <button className="btn" onClick={()=>{
                  const v = prompt("Edit starting balance (number)");
                  if (v === null) return;
                  dispatch({ type:"DEBT_UPDATE", id:d.id, patch:{ balance: Number(v||0) } });
                }}>Edit balance</button>
                <button className="btn" onClick={()=>{
                  if (confirm("Delete this debt? Payments remain in history, but this debt will be removed.")) {
                    dispatch({ type:"DEBT_DELETE", id:d.id });
                  }
                }}>Delete</button>
              </div>
            </div>
          ))}
          {state.debts.length === 0 ? <div className="text-sm text-app-muted">No debts yet. Add one.</div> : null}
        </div>
      </Section>

      <Section title="Payment history (all time)">
        <div className="overflow-auto hidden sm:block">
          <table className="w-full text-sm">
            <thead className="text-xs text-app-muted">
              <tr className="border-b border-app-border">
                <th className="py-2 text-left">Date</th>
                <th className="py-2 text-left">Debt</th>
                <th className="py-2 text-left">Note</th>
                <th className="py-2 text-right">Amount</th>
                <th className="py-2"></th>
              </tr>
            </thead>
            <tbody>
              {state.transactions.filter(t=>t.type==="debt_payment").sort((a,b)=> (a.date||"").localeCompare(b.date||"")).map(t=>{
                const dn = state.debts.find(d=>d.id===t.debtId)?.name || "Deleted debt";
                return (
                  <tr key={t.id} className="border-b border-app-border/60">
                    <td className="py-2">{t.date}</td>
                    <td className="py-2">{dn}</td>
                    <td className="py-2 text-app-muted">{t.note || "-"}</td>
                    <td className="py-2 text-right font-medium">{formatMoney(t.amount, currency)}</td>
                    <td className="py-2 text-right">
                      <button className="btn" onClick={()=>dispatch({ type:"TX_DELETE", id:t.id })}>Delete</button>
                    </td>
                  </tr>
                );
              })}
              {state.transactions.filter(t=>t.type==="debt_payment").length === 0 ? <tr><td colSpan="5" className="py-4 text-app-muted">No payments yet.</td></tr> : null}
            </tbody>
          </table>
        </div>

        <div className="sm:hidden space-y-2">
          {state.transactions.filter(t=>t.type==="debt_payment").length === 0 ? (
            <div className="card-soft p-3 text-sm text-app-muted">No payments yet.</div>
          ) : (
            state.transactions
              .filter(t=>t.type==="debt_payment")
              .sort((a,b)=> (a.date||"").localeCompare(b.date||""))
              .map((t)=>{
                const dn = state.debts.find(d=>d.id===t.debtId)?.name || "Deleted debt";
                return (
                  <div key={t.id} className="card p-3">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="text-sm font-semibold">{dn}</div>
                        <div className="text-xs text-app-muted mt-1">{t.date}{t.note ? ` • ${t.note}` : ""}</div>
                      </div>
                      <div className="text-right">
                        <div className="text-sm font-semibold">{formatMoney(t.amount, currency)}</div>
                        <button className="btn mt-2" onClick={()=>dispatch({ type:"TX_DELETE", id:t.id })}>Delete</button>
                      </div>
                    </div>
                  </div>
                );
              })
          )}
        </div>
      </Section>

      <Modal open={addOpen} title="New debt" onClose={()=>setAddOpen(false)}>
        <div className="grid gap-3">
          <div>
            <div className="label">Name</div>
            <input className="input" value={name} onChange={(e)=>setName(e.target.value)} placeholder="Example: Friend loan" />
          </div>
          <div>
            <div className="label">Starting balance ({currency})</div>
            <input className="input" type="number" value={balance} onChange={(e)=>setBalance(e.target.value)} placeholder="0" />
          </div>
          <div>
            <div className="label">Note</div>
            <input className="input" value={note} onChange={(e)=>setNote(e.target.value)} placeholder="Optional" />
          </div>
          <div className="flex gap-2">
            <button className="btn btn-accent" onClick={addDebt}>Create</button>
            <button className="btn" onClick={()=>setAddOpen(false)}>Cancel</button>
          </div>
        </div>
      </Modal>

      <Modal open={payOpen} title="Debt payment" onClose={()=>setPayOpen(false)}>
        <div className="grid gap-3">
          <div>
            <div className="label">Debt</div>
            <select className="input" value={debtId} onChange={(e)=>setDebtId(e.target.value)}>
              {state.debts.length === 0 ? <option value="">No debts yet — add one first</option> : null}
              {state.debts.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <div className="label">Amount ({currency})</div>
              <input className="input" type="number" value={payAmount} onChange={(e)=>setPayAmount(e.target.value)} />
            </div>
            <div>
              <div className="label">Payment</div>
              <select className="input" value={payment} onChange={(e)=>setPayment(e.target.value)}>
                <option>Cash</option>
                <option>Card</option>
                <option>Bank</option>
              </select>
            </div>
          </div>
          <div>
            <div className="label">Note</div>
            <input className="input" value={payNote} onChange={(e)=>setPayNote(e.target.value)} placeholder="Optional" />
          </div>
          <div className="flex gap-2">
            <button className="btn btn-accent" onClick={pay} disabled={state.debts.length===0}>Save</button>
            <button className="btn" onClick={()=>setPayOpen(false)}>Cancel</button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
