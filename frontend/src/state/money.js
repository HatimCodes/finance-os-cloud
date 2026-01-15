export function formatMoney(value, currency = "MAD") {
  const n = Number(value || 0);
  try {
    return new Intl.NumberFormat(undefined, { style: "currency", currency, maximumFractionDigits: 2 }).format(n);
  } catch {
    // fallback for custom currencies
    return `${n.toFixed(2)} ${currency}`;
  }
}

export function monthKey(dateStr) {
  const d = dateStr ? new Date(dateStr) : new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  return `${y}-${m}`;
}

export function todayISO() {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function uid(prefix="id") {
  return `${prefix}_${Math.random().toString(16).slice(2)}_${Date.now().toString(16)}`;
}


export function compareMonthKey(a, b) {
  if (a === b) return 0;
  return a < b ? -1 : 1;
}

export function isActiveInMonth(item, mk) {
  const s = (item.startMonth || "").trim();
  const e = (item.endMonth || "").trim();
  if (s && compareMonthKey(mk, s) === -1) return false;
  if (e && compareMonthKey(mk, e) === 1) return false;
  return true;
}
