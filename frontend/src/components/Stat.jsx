import React from "react";
import { formatMoney } from "../state/money.js";

export default function Stat({ label, value, currency, hint }) {
  return (
    <div className="kpi">
      <div className="kpi-label">{label}</div>
      <div className="kpi-value mt-1">{formatMoney(value || 0, currency)}</div>
      {hint ? <div className="text-xs text-app-muted mt-1">{hint}</div> : null}
    </div>
  );
}
