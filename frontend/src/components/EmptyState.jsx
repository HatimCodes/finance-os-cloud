import React from "react";

export default function EmptyState({ title = "Nothing yet", hint, action }) {
  return (
    <div className="rounded-xl2 border border-app-border bg-app-surface2 p-4">
      <div className="text-sm font-semibold">{title}</div>
      {hint ? <div className="text-sm text-app-muted mt-1">{hint}</div> : null}
      {action ? <div className="mt-3">{action}</div> : null}
    </div>
  );
}
