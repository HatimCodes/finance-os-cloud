import React, { useMemo } from "react";
import Section from "../components/Section.jsx";
import Stat from "../components/Stat.jsx";
import { useComputed, useFinance } from "../state/financeStore.jsx";
import { formatMoney, monthKey, todayISO } from "../state/money.js";
import Modal from "../components/Modal.jsx";
import ChartCard from "../components/ChartCard.jsx";
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid, LineChart, Line, AreaChart, Area, Legend } from "recharts";
import { groupExpensesByCategory, dailySpendSeries, lastNMonthsKeys, netPositionSeries } from "../state/analytics.js";

function MonthPicker({ value, onChange }) {
  return (
    <select className="input" value={value} onChange={(e)=>onChange(e.target.value)}>
      {Array.from({ length: 18 }).map((_,i)=>{
        const d = new Date();
        d.setMonth(d.getMonth() - i);
        const mk = monthKey(d.toISOString().slice(0,10));
        return <option key={mk} value={mk}>{mk}</option>
      })}
    </select>
  );
}

function CleanTooltip({ active, payload, label }) {
  if (!active || !payload || !payload.length) return null;
  return (
    <div className="rounded-xl2 border border-app-border bg-app-surface px-3 py-2 shadow-soft">
      <div className="text-xs text-app-muted">{label}</div>
      <div className="mt-1 space-y-1">
        {payload.map((p) => (
          <div key={p.dataKey} className="flex items-center justify-between gap-4 text-sm">
            <span className="text-app-muted">{p.name}</span>
            <span className="font-semibold">{Number(p.value || 0).toLocaleString()}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function QuickAdd({ monthKey }) {
  const { api, state } = useFinance();
  const currency = state.profile.currency || "MAD";
  const [open, setOpen] = React.useState(false);
  const [kind, setKind] = React.useState("expense");
  const [amount, setAmount] = React.useState("");
  const [category, setCategory] = React.useState("Food");
  const [bucketId, setBucketId] = React.useState(state.buckets[0]?.id || "");
  const [debtId, setDebtId] = React.useState(state.debts[0]?.id || "");
  const [note, setNote] = React.useState("");
  const [payment, setPayment] = React.useState("Cash");
  const dateDefault = todayISO();

  function submit() {
    const a = Number(amount||0);
    if (!a || a <= 0) return;
    if (kind === "income") api.addIncome({ date: dateDefault, amount: a, note, payment });
    if (kind === "expense") api.addExpense({ date: dateDefault, amount: a, category, note, payment, needWant: "Need" });
    if (kind === "bucket") api.addBucket({ date: dateDefault, amount: a, bucketId, note, payment });
    if (kind === "debt") api.addDebtPayment({ date: dateDefault, amount: a, debtId, note, payment });
    setAmount(""); setNote("");
    setOpen(false);
  }

  return (
    <>
      <button className="btn btn-accent" onClick={()=>setOpen(true)}>Quick add</button>
      <Modal open={open} title="Quick add" onClose={()=>setOpen(false)}>
        <div className="grid gap-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <div className="label">Type</div>
              <select className="input" value={kind} onChange={(e)=>setKind(e.target.value)}>
                <option value="expense">Expense</option>
                <option value="income">Income</option>
                <option value="bucket">Add to bucket</option>
                <option value="debt">Debt payment</option>
              </select>
            </div>
            <div>
              <div className="label">Amount ({currency})</div>
              <input className="input" type="number" value={amount} onChange={(e)=>setAmount(e.target.value)} placeholder="0" />
            </div>
          </div>

          {kind === "expense" ? (
            <div>
              <div className="label">Category</div>
              <select className="input" value={category} onChange={(e)=>setCategory(e.target.value)}>
                {state.categories.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
          ) : null}

          {kind === "bucket" ? (
            <div>
              <div className="label">Bucket</div>
              <select className="input" value={bucketId} onChange={(e)=>setBucketId(e.target.value)}>
                {state.buckets.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
              </select>
            </div>
          ) : null}

          {kind === "debt" ? (
            <div>
              <div className="label">Debt</div>
              <select className="input" value={debtId} onChange={(e)=>setDebtId(e.target.value)}>
                {state.debts.length === 0 ? <option value="">No debts yet — add one in Debt page</option> : null}
                {state.debts.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
              </select>
              {state.debts.length === 0 ? <div className="text-xs text-app-muted mt-1">Go to Debt page to add a debt first.</div> : null}
            </div>
          ) : null}

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
              <div className="label">Date</div>
              <input className="input" value={dateDefault} disabled />
            </div>
          </div>

          <div>
            <div className="label">Note (optional)</div>
            <input className="input" value={note} onChange={(e)=>setNote(e.target.value)} placeholder="Short note" />
          </div>

          <div className="flex gap-2">
            <button className="btn btn-accent" onClick={submit}>Save</button>
            <button className="btn" onClick={()=>setOpen(false)}>Cancel</button>
          </div>
        </div>
      </Modal>
    </>
  );
}

export default function Dashboard() {
  const [mk, setMk] = React.useState(monthKey(new Date().toISOString().slice(0,10)));
  const c = useComputed(mk);
  const { state, dispatch } = useFinance();
  const name = state.profile.name?.trim();
  const byCat = useMemo(() => groupExpensesByCategory(state.transactions, mk).slice(0, 8), [state.transactions, mk]);
  const daily = useMemo(() => dailySpendSeries(state.transactions, mk), [state.transactions, mk]);
  const months = useMemo(() => lastNMonthsKeys(mk, 6), [mk]);
  const netSeries = useMemo(() => netPositionSeries(state, months), [state, months]);


  const emergencyId = state.buckets.find(b=>b.name.toLowerCase().includes("emergency"))?.id;
  const emergencyTotal = emergencyId ? (c.bucketTotals[emergencyId]||0) : 0;

  const monthNeeds = state.monthNeeds?.[mk] || [];
  const needsTotalAmount = monthNeeds.reduce((s,n)=>s+Number(n.amount||0),0);
  const paidNeeds = monthNeeds.filter(n => Boolean(n.paid));
  const unpaidNeeds = monthNeeds.filter(n => !Boolean(n.paid));
  const needsPaidAmount = paidNeeds.reduce((s,n)=>s+Number(n.amount||0),0);
  const needsUnpaidAmount = unpaidNeeds.reduce((s,n)=>s+Number(n.amount||0),0);

  function markNeedPaid(id) {
    dispatch({
      type: "MONTH_NEED_UPDATE",
      monthKey: mk,
      id,
      patch: { paid: true, paidAt: new Date().toISOString() },
    });
  }

  // (computed above) paid/unpaid breakdown + helper

  return (
    <div className="space-y-4">
      {/* Header / context */}
      <div className="card p-4 sm:p-5">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <div className="text-lg sm:text-xl font-semibold tracking-tight">{name ? `Welcome back, ${name}` : "Dashboard"}</div>
            <div className="text-sm text-app-muted mt-1">Clear overview, quick actions, and calm insights.</div>
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <span className="pill">Month</span>
              <div className="w-40">
                <MonthPicker value={mk} onChange={setMk} />
              </div>
              <a className="btn btn-ghost" href="/budget" onClick={(e)=>{e.preventDefault(); window.history.pushState({}, "", "/budget"); window.dispatchEvent(new PopStateEvent("popstate"));}}>Edit needs</a>
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            <button className="btn btn-accent" onClick={() => window.location.assign("/daily")}>Add expense</button>
            <button className="btn" onClick={() => window.location.assign("/buckets")}>Allocate to buckets</button>
            <button className="btn" onClick={() => window.location.assign("/debts")}>Debt payment</button>
          </div>
        </div>
      </div>

      {/* Zone 1: Overview / KPIs */}
      <Section
        title="Overview"
        description="Your key numbers for the selected month."
        right={<QuickAdd monthKey={mk} />}
      >
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <Stat label="Income" value={c.income} currency={c.currency} />
          <Stat label="Spent" value={c.spent} currency={c.currency} />
          <Stat label="Needs baseline" value={c.needsTotal} currency={c.currency} hint={c.needsConfigured ? "This month only" : "Not set yet"} />
          <Stat label="Remaining" value={c.remainingThisMonth} currency={c.currency} />

          <Stat label="Savings total" value={c.totalSaved} currency={c.currency} hint="All buckets" />
          <Stat label="Debt remaining" value={c.debtRemaining} currency={c.currency} />
          <Stat label="Net position" value={c.netPosition} currency={c.currency} hint="cash + savings - debt" />
          <Stat label="Cash balance" value={c.cashBalance} currency={c.currency} hint="All time" />
        </div>
      </Section>

{!c.needsConfigured ? (
  <div className="card p-4">
    <div className="flex items-start justify-between gap-3">
      <div>
        <div className="text-sm font-semibold">Needs not set for {mk}</div>
        <div className="text-sm text-app-muted mt-1">
          Each month has its own needs list. Set it once, then it won’t affect other months.
        </div>
      </div>
      <a
        className="btn btn-accent"
        href="/budget"
        onClick={(e)=>{e.preventDefault(); window.history.pushState({}, "", "/budget"); window.dispatchEvent(new PopStateEvent("popstate"));}}
      >
        Set needs
      </a>
    </div>
  </div>
) : null}

{c.needsConfigured ? (
  <Section
    title="Needs execution"
    description="Track which baseline bills are paid for the selected month."
  >
    <div className="grid sm:grid-cols-3 gap-3">
      <div className="card p-4">
        <div className="text-xs text-app-muted">Paid items</div>
        <div className="mt-1 text-xl font-semibold">
          {paidNeeds.length} / {monthNeeds.length}
        </div>
        <div className="text-xs text-app-muted mt-1">Count</div>
      </div>

      <div className="card p-4">
        <div className="text-xs text-app-muted">Paid amount</div>
        <div className="mt-1 text-xl font-semibold">
          {formatMoney(needsPaidAmount, c.currency)}
          <span className="text-app-muted font-normal"> / {formatMoney(needsTotalAmount, c.currency)}</span>
        </div>
        <div className="text-xs text-app-muted mt-1">Execution</div>
      </div>

      <div className="card p-4">
        <div className="text-xs text-app-muted">Remaining unpaid</div>
        <div className="mt-1 text-xl font-semibold">{formatMoney(needsUnpaidAmount, c.currency)}</div>
        <div className="text-xs text-app-muted mt-1">Unpaid baseline</div>
      </div>
    </div>

    <div className="mt-3 card p-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <div className="text-sm font-semibold">Unpaid needs</div>
          <div className="text-sm text-app-muted mt-1">
            {unpaidNeeds.length === 0 ? "All needs paid for this month ✅" : "Quickly mark baseline bills as paid."}
          </div>
        </div>
        <a
          className="btn"
          href="/budget"
          onClick={(e)=>{e.preventDefault(); window.history.pushState({}, "", "/budget"); window.dispatchEvent(new PopStateEvent("popstate"));}}
        >
          Manage
        </a>
      </div>

      {unpaidNeeds.length ? (
        <div className="mt-3 grid gap-2">
          {unpaidNeeds.slice(0, 5).map((n) => (
            <div key={n.id} className="flex items-center justify-between gap-3 rounded-xl2 border border-app-border bg-app-surface2 px-3 py-2">
              <div className="min-w-0">
                <div className="text-sm font-medium truncate">{n.name}</div>
                <div className="text-xs text-app-muted">{formatMoney(Number(n.amount||0), c.currency)}</div>
              </div>
              <button className="btn btn-accent" onClick={()=>markNeedPaid(n.id)} title="Mark paid">
                ✓
              </button>
            </div>
          ))}
        </div>
      ) : null}
    </div>
  </Section>
) : null}

      {/* Zone 2: Insights */}
      <Section title="Insights" description="What changed and where your money goes.">
        <div className="grid gap-3">
          <ChartCard
            title="Spending by category"
            subtitle={byCat.length ? "Top categories this month." : "No expenses yet for this month."}
          >
            {byCat.length ? (
              <div style={{ width: "100%", height: 260 }}>
                <ResponsiveContainer>
                  <BarChart data={byCat} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" tick={{ fontSize: 12 }} interval={0} angle={-10} height={50} />
                    <YAxis tick={{ fontSize: 12 }} />
                    <Tooltip content={<CleanTooltip />} />
                    <Bar dataKey="value" name="Spent" fill="rgb(var(--app-accent))" fillOpacity={0.9} radius={[10,10,10,10]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <div className="card-soft p-3 text-sm text-app-muted">Add a few expenses to see the breakdown.</div>
            )}
          </ChartCard>

          <div className="grid sm:grid-cols-2 gap-3">
            <ChartCard title="Daily flow" subtitle="Income vs spending per day (this month).">
              {daily.length ? (
                <div style={{ width: "100%", height: 240 }}>
                  <ResponsiveContainer>
                    <LineChart data={daily} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="day" tick={{ fontSize: 12 }} />
                      <YAxis tick={{ fontSize: 12 }} />
                      <Tooltip content={<CleanTooltip />} />
                      <Legend />
                      <Line type="monotone" dataKey="income" name="Income" dot={false} stroke="rgb(var(--app-accent))" strokeWidth={2} />
                      <Line type="monotone" dataKey="spent" name="Spent" dot={false} stroke="rgb(var(--app-text))" strokeOpacity={0.45} strokeWidth={2} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              ) : (
                <div className="card-soft p-3 text-sm text-app-muted">No transactions yet for this month.</div>
              )}
            </ChartCard>

            <ChartCard title="Last 6 months" subtitle="Cash vs saved vs debt remaining (cumulative).">
              <div style={{ width: "100%", height: 240 }}>
                <ResponsiveContainer>
                  <AreaChart data={netSeries} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="mk" tick={{ fontSize: 12 }} />
                    <YAxis tick={{ fontSize: 12 }} />
                    <Tooltip content={<CleanTooltip />} />
                    <Legend />
                    <Area type="monotone" dataKey="cash" name="Cash" stroke="rgb(var(--app-accent))" fill="rgb(var(--app-accent))" fillOpacity={0.20} strokeWidth={2} />
                    <Area type="monotone" dataKey="saved" name="Saved" stroke="rgb(var(--app-accent-2))" fill="rgb(var(--app-accent-2))" fillOpacity={0.14} strokeWidth={2} />
                    <Area type="monotone" dataKey="debtRemaining" name="Debt" stroke="rgb(var(--app-text))" strokeOpacity={0.45} fill="rgb(var(--app-text))" fillOpacity={0.06} strokeWidth={2} />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </ChartCard>
          </div>
        </div>
      </Section>

      {/* Zone 3: Guidance */}
      <Section title="Simple rules" description="Tiny mental models that keep you consistent.">
        <div className="text-sm text-app-muted space-y-2">
          <div><span className="chip">Rule 1</span> Pay needs first.</div>
          <div><span className="chip">Rule 2</span> If you have debt, most “extra” goes there, plus a small emergency buffer.</div>
          <div><span className="chip">Rule 3</span> Keep a small fun budget so you don’t burn out.</div>
        </div>
      </Section>
</div>
  );
}
