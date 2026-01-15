import React, { useMemo, useState } from "react";
import Section from "../components/Section.jsx";
import Modal from "../components/Modal.jsx";
import PageHeader from "../components/PageHeader.jsx";
import EmptyState from "../components/EmptyState.jsx";
import { useComputed, useFinance } from "../state/financeStore.jsx";
import { formatMoney, todayISO } from "../state/money.js";

export default function Buckets() {
  const { state, dispatch, api } = useFinance();
  const c = useComputed();
  const currency = c.currency;

  const [open, setOpen] = useState(false);
  const [amount, setAmount] = useState("");
  const [bucketId, setBucketId] = useState(state.buckets[0]?.id || "");
  const [note, setNote] = useState("");
  const [payment, setPayment] = useState("Cash");

  const [newName, setNewName] = useState("");
  const [newTarget, setNewTarget] = useState("");

  function addToBucket() {
    const a = Number(amount||0);
    if (!a || a <= 0 || !bucketId) return;
    api.addBucket({ date: todayISO(), amount: a, bucketId, note, payment });
    setAmount(""); setNote(""); setOpen(false);
  }

  return (
    <div className="space-y-4">
      <PageHeader
        title="Buckets"
        subtitle="Emergency, fun, health… give every dirham a job."
        right={<button className="btn btn-accent" onClick={()=>setOpen(true)}>Add</button>}
      />

      <Section title="Your buckets">
        <div className="grid sm:grid-cols-2 gap-3">
          {state.buckets.map((b) => {
            const total = c.bucketTotals[b.id] || 0;
            const pct = b.target && Number(b.target) > 0 ? Math.min(100, Math.round((total/Number(b.target))*100)) : null;
            return (
              <div key={b.id} className="rounded-xl2 border border-app-border bg-app-surface2 p-3">
                <div className="flex items-center justify-between gap-2">
                  <div>
                    <div className="text-sm font-semibold">{b.name}</div>
                    <div className="text-xs text-app-muted">{b.kind === "savings" ? "Savings" : b.kind}</div>
                  </div>
                  <div className="text-sm font-semibold">{formatMoney(total, currency)}</div>
                </div>
                {pct != null ? (
                  <div className="mt-2">
                    <div className="h-2 rounded-full bg-app-border overflow-hidden">
                      <div className="h-2 bg-app-accent" style={{ width: `${pct}%` }} />
                    </div>
                    <div className="text-xs text-app-muted mt-1">{pct}% of target ({formatMoney(b.target, currency)})</div>
                  </div>
                ) : (
                  <div className="text-xs text-app-muted mt-2">Set a target if you want a progress bar.</div>
                )}

                <div className="mt-3 grid grid-cols-2 gap-2">
                  <button className="btn" onClick={()=>{
                    const t = prompt("Target amount (leave empty to remove)");
                    if (t === null) return;
                    dispatch({ type:"BUCKET_UPDATE", id:b.id, patch:{ target: t === "" ? 0 : Number(t||0) } });
                  }}>Set target</button>
                  <button className="btn" onClick={()=>{
                    if (confirm("Delete this bucket? Transactions stay, but it will be hidden from totals for this bucket.")) {
                      dispatch({ type:"BUCKET_DELETE", id:b.id });
                    }
                  }}>Delete</button>
                </div>
              </div>
            );
          })}
          {state.buckets.length === 0 ? (
            <EmptyState
              title="No buckets yet"
              hint="Create your first bucket below (e.g., Emergency, Fun, Health) and start allocating." 
            />
          ) : null}
        </div>
      </Section>

      <Section title="Create a new bucket">
        <div className="grid sm:grid-cols-3 gap-3">
          <div className="sm:col-span-2">
            <div className="label">Bucket name</div>
            <input className="input" value={newName} onChange={(e)=>setNewName(e.target.value)} placeholder="Example: Travel" />
          </div>
          <div>
            <div className="label">Target (optional)</div>
            <input className="input" type="number" value={newTarget} onChange={(e)=>setNewTarget(e.target.value)} placeholder="0" />
          </div>
          <div className="sm:col-span-3 flex gap-2">
            <button className="btn btn-accent" onClick={()=>{
              const nm = newName.trim();
              if (!nm) return;
              dispatch({ type:"BUCKET_ADD", item:{ name: nm, kind:"savings", target: Number(newTarget||0), current:0 } });
              setNewName(""); setNewTarget("");
            }}>Create</button>
            <button className="btn" onClick={()=>{ setNewName(""); setNewTarget(""); }}>Clear</button>
          </div>
        </div>
      </Section>

      <Modal open={open} title="Add to bucket" onClose={()=>setOpen(false)}>
        <div className="grid gap-3">
          <div>
            <div className="label">Bucket</div>
            <select className="input" value={bucketId} onChange={(e)=>setBucketId(e.target.value)}>
              {state.buckets.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <div className="label">Amount ({currency})</div>
              <input className="input" type="number" value={amount} onChange={(e)=>setAmount(e.target.value)} />
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
            <input className="input" value={note} onChange={(e)=>setNote(e.target.value)} placeholder="Optional" />
          </div>

          <div className="flex gap-2">
            <button className="btn btn-accent" onClick={addToBucket}>Save</button>
            <button className="btn" onClick={()=>setOpen(false)}>Cancel</button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
