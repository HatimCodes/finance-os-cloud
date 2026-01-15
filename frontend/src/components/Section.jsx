import React from "react";

export default function Section({ title, description, right, children }) {
  return (
    <section className="card p-4">
      {(title || right || description) ? (
        <div className="flex items-start justify-between gap-3 mb-3">
          <div>
            {title ? <div className="text-sm font-semibold">{title}</div> : null}
            {description ? <div className="text-sm text-app-muted mt-1">{description}</div> : null}
          </div>
          {right ? <div className="shrink-0">{right}</div> : null}
        </div>
      ) : null}
      {children}
    </section>
  );
}
