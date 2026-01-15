import React from "react";

export default function ChartCard({ title, subtitle, children, right }) {
  return (
    <div className="card p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="text-sm font-semibold">{title}</div>
          {subtitle ? <div className="text-sm text-app-muted mt-1">{subtitle}</div> : null}
        </div>
        {right ? <div>{right}</div> : null}
      </div>
      <div className="mt-3">{children}</div>
    </div>
  );
}
