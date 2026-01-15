import React, { useRef, useState } from "react";
import Section from "../components/Section.jsx";
import { useFinance } from "../state/financeStore.jsx";
import { exportJSON, importJSON, STORAGE_KEY } from "../state/storage.js";
import { makeDefaultState } from "../state/defaultState.js";
import { useSync } from "../state/syncStore.jsx";

export default function Backup() {
  const { state, dispatch } = useFinance();
  const sync = useSync();
  const fileRef = useRef(null);
  const [msg, setMsg] = useState("");

  function download() {
    const blob = exportJSON(state);
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `finance-os-backup-${new Date().toISOString().slice(0,10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
    setMsg("Exported backup.");
  }

  async function restore(file) {
    try {
      const parsed = await importJSON(file);
      dispatch({ type: "RESET", payload: parsed });
      // If logged in, push the imported snapshot after a short tick
      setTimeout(() => {
        sync.actions?.syncNow?.(parsed);
      }, 0);
      setMsg("Imported backup.");
    } catch (e) {
      setMsg(e.message || "Import failed.");
    }
  }

  function factoryReset() {
    if (!confirm("Reset everything on this device? This cannot be undone unless you have a backup.")) return;
    const d = makeDefaultState();
    dispatch({ type:"RESET", payload: d });
    setTimeout(() => {
      sync.actions?.syncNow?.(d);
    }, 0);
    setMsg("Reset complete.");
  }

  return (
    <div className="space-y-4">
      <div>
        <div className="text-lg font-semibold">Backup</div>
        <div className="text-sm text-app-muted">One-click export/import. Keep control.</div>
      </div>

      <Section title="Export">
        <div className="text-sm text-app-muted mb-3">Download a JSON snapshot of everything.</div>
        <button className="btn btn-accent" onClick={download}>Export JSON</button>
      </Section>

      <Section title="Import">
        <div className="text-sm text-app-muted mb-3">Restore from a JSON backup.</div>
        <input ref={fileRef} type="file" accept="application/json" className="hidden" onChange={(e)=>{
          const f = e.target.files?.[0];
          if (f) restore(f);
          e.target.value = "";
        }} />
        <button className="btn" onClick={()=>fileRef.current?.click()}>Import JSON</button>
      </Section>

      <Section title="Safety">
        <div className="text-sm text-app-muted mb-3">
          Storage key: <span className="chip">{STORAGE_KEY}</span>
        </div>
        <button className="btn" onClick={factoryReset}>Factory reset (local)</button>
      </Section>

      {msg ? <div className="text-sm text-app-muted">{msg}</div> : null}
    </div>
  );
}
