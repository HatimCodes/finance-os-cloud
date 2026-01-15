import { monthKey } from "./money.js";

export function groupExpensesByCategory(transactions, mk){
  const tx = transactions.filter(t => t.type==="expense" && monthKey(t.date)===mk);
  const map = new Map();
  for(const t of tx){
    const k = (t.category || "Other").trim() || "Other";
    map.set(k, (map.get(k) || 0) + Number(t.amount||0));
  }
  return Array.from(map.entries()).map(([name, value])=>({ name, value }))
    .sort((a,b)=>b.value-a.value);
}

export function dailySpendSeries(transactions, mk){
  // returns [{day:"01", spent:.., income:..}]
  const tx = transactions.filter(t => t.date && monthKey(t.date)===mk);
  const map = new Map();
  for(const t of tx){
    const d = String(t.date).slice(8,10);
    if(!map.has(d)) map.set(d, { day:d, spent:0, income:0 });
    const row = map.get(d);
    if(t.type==="expense") row.spent += Number(t.amount||0);
    if(t.type==="income") row.income += Number(t.amount||0);
  }
  return Array.from(map.values()).sort((a,b)=>a.day.localeCompare(b.day));
}

export function lastNMonthsKeys(referenceMk, n=6){
  const [y,m]=referenceMk.split("-").map(Number);
  const d=new Date(y, m-1, 1);
  const out=[];
  for(let i=n-1;i>=0;i--){
    const d2=new Date(d);
    d2.setMonth(d2.getMonth()-i);
    out.push(monthKey(d2.toISOString().slice(0,10)));
  }
  return out;
}

export function netPositionSeries(state, monthKeys){
  // net position = startingBalance + income - expenses - debt payments (cash out) ; buckets are transfers to savings (cash out)
  // also show saved (bucket totals) and debt remaining each month.
  const tx = state.transactions;
  const start = Number(state.profile.startingBalance||0);

  // precompute bucket totals over time
  const buckets = new Set(state.buckets.map(b=>b.id));
  const debts = state.debts;

  // debt paid cumulative
  const debtStart = debts.reduce((s,d)=>s+Number(d.balance||0),0);

  let cumIncome=0, cumExpense=0, cumBucket=0, cumDebtPay=0;
  const rows=[];
  for(const mk of monthKeys){
    const mtx = tx.filter(t => t.date && monthKey(t.date)===mk);
    const inc = mtx.filter(t=>t.type==="income").reduce((s,t)=>s+Number(t.amount||0),0);
    const exp = mtx.filter(t=>t.type==="expense").reduce((s,t)=>s+Number(t.amount||0),0);
    const buck = mtx.filter(t=>t.type==="bucket_add").reduce((s,t)=>s+Number(t.amount||0),0);
    const dp = mtx.filter(t=>t.type==="debt_payment").reduce((s,t)=>s+Number(t.amount||0),0);

    cumIncome += inc; cumExpense += exp; cumBucket += buck; cumDebtPay += dp;

    const cash = start + cumIncome - cumExpense - cumBucket - cumDebtPay;
    const saved = cumBucket;
    const debtRemaining = Math.max(0, debtStart - cumDebtPay);
    rows.push({ mk, cash, saved, debtRemaining });
  }
  return rows;
}
