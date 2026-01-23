import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import Section from "../components/Section.jsx";
import { useFinance } from "../state/financeStore.jsx";
import { uid } from "../state/money.js";
import { useAuth } from "../state/authStore.jsx";
import { useSync } from "../state/syncStore.jsx";
import { useCategories } from "../state/categoriesStore.jsx";

function MonthInput({ value, onChange, placeholder = "YYYY-MM" }) {
  return (
    <input
      className="input"
      value={value || ""}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      inputMode="numeric"
    />
  );
}

function Segmented({ value, onChange, options }) {
  return (
    <div className="inline-flex rounded-xl2 border border-app-border bg-app-surface2 p-1">
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          className={
            "px-3 py-2 text-sm rounded-xl2 transition " +
            (value === o.value
              ? "bg-app-accent text-white shadow-soft"
              : "text-app-muted hover:bg-app-surface")
          }
          onClick={() => onChange(o.value)}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

export default function Settings() {
  const { state, dispatch } = useFinance();
  const { auth, api } = useAuth();
  const sync = useSync();
  const nav = useNavigate();
  const cats = useCategories();

  const [name, setName] = useState(state.profile.name || "");
  const [currency, setCurrency] = useState(state.profile.currency || "MAD");
  const [startingBalance, setStartingBalance] = useState(
    String(state.profile.startingBalance ?? 0)
  );

  // Appearance (standalone section)
  const [theme, setTheme] = useState(state.profile.theme || "dark");

  // Categories manager UI state
  const [catNewName, setCatNewName] = useState("");
  const [catMsg, setCatMsg] = useState(null);
  const [editingId, setEditingId] = useState(null);
  const [editingName, setEditingName] = useState("");

  function setStatePatch(patch) {
    dispatch({ type: "RESET", payload: { ...state, ...patch } });
  }

  function updateTemplateNeed(id, patch) {
    const next = state.needsTemplate.map((n) =>
      n.id === id ? { ...n, ...patch } : n
    );
    setStatePatch({ needsTemplate: next });
  }

  function deleteTemplateNeed(id) {
    const next = state.needsTemplate.filter((n) => n.id !== id);
    setStatePatch({ needsTemplate: next });
  }

  function addTemplateNeed() {
    const next = [
      ...state.needsTemplate,
      { id: uid("need"), name: "New need", amount: 0, startMonth: "", endMonth: "" },
    ];
    setStatePatch({ needsTemplate: next });
  }

  return (
    <div className="space-y-4">
      <div>
        <div className="text-lg font-semibold">Settings</div>
        <div className="text-sm text-app-muted">
          Edit the basics, appearance, and your template rules.
        </div>
      </div>

      <Section title="Profile">
        <div className="grid gap-3">
          <div>
            <div className="label">Name</div>
            <input className="input" value={name} onChange={(e) => setName(e.target.value)} />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <div className="label">Currency</div>
              <input className="input" value={currency} onChange={(e) => setCurrency(e.target.value)} />
            </div>
            <div>
              <div className="label">Starting balance</div>
              <input
                className="input"
                type="number"
                value={startingBalance}
                onChange={(e) => setStartingBalance(e.target.value)}
              />
            </div>
          </div>

          <div className="flex gap-2">
            <button
              className="btn btn-accent"
              onClick={() => {
                dispatch({
                  type: "PROFILE_UPDATE",
                  patch: {
                    name,
                    currency,
                    startingBalance: Number(startingBalance || 0),
                  },
                });
              }}
              type="button"
            >
              Save
            </button>
            <button
              className="btn"
              onClick={() => {
                setName(state.profile.name || "");
                setCurrency(state.profile.currency || "MAD");
                setStartingBalance(String(state.profile.startingBalance ?? 0));
              }}
              type="button"
            >
              Reset
            </button>
          </div>
        </div>
      </Section>

      <Section title="Sync">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
          <div>
            <div className="text-sm font-semibold">Sync status</div>
            <div className="text-sm text-app-muted">
              {auth.mode === "online" && auth.user?.email ? (
                <span>Signed in as <span className="text-app-text">{auth.user.email}</span></span>
              ) : (
                <span>Offline-only mode (no cloud sync)</span>
              )}
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            {auth.mode === "online" && auth.token ? (
              <>
                <div className="chip">{!navigator.onLine ? "Offline" : (sync.status === "synced" ? "Synced" : sync.status === "syncing" ? "Syncing…" : sync.status === "conflict" ? "Conflict" : sync.status === "error" ? "Error" : "Online")}</div>
                <button className="btn" type="button" onClick={() => sync.actions.syncNow(state)}>
                  Sync now
                </button>
                <button
                  className="btn btn-ghost"
                  type="button"
                  onClick={async () => {
                    await api.logout();
                    // Prevent back-button showing protected routes.
                    nav("/login", { replace: true });
                    try { window.history.replaceState(null, "", "/login"); } catch {}
                  }}
                >
                  Log out
                </button>
              </>
            ) : (
              <>
                <button className="btn" type="button" onClick={() => nav("/login")}>Login to enable sync</button>
              </>
            )}
          </div>
        </div>

        {auth.mode === "online" && sync.status === "conflict" ? (
          <div className="mt-3 rounded-xl2 border border-app-border bg-app-surface2 p-3 text-sm flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
            <div>
              <div className="font-semibold">Conflict detected</div>
              <div className="text-app-muted">Choose whether to pull the cloud version or overwrite it with this device.</div>
            </div>
            <div className="flex gap-2">
              <button className="btn btn-ghost" type="button" onClick={() => sync.actions.pullCloudAndReplaceLocal()}>Pull cloud</button>
              <button className="btn" type="button" onClick={() => sync.actions.forceOverwriteCloudWithLocal(state)}>Overwrite cloud</button>
            </div>
          </div>
        ) : null}
      </Section>

      <Section title="Appearance">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <div className="text-sm font-semibold">Theme</div>
            <div className="text-sm text-app-muted">
              Saved locally. You can add more appearance options here later.
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Segmented
              value={theme}
              onChange={(v) => setTheme(v)}
              options={[
                { value: "light", label: "Light" },
                { value: "dark", label: "Dark" },
              ]}
            />
            <button
              className="btn btn-accent"
              type="button"
              onClick={() => dispatch({ type: "PROFILE_UPDATE", patch: { theme } })}
            >
              Apply
            </button>
          </div>
        </div>
      </Section>

      <Section title="Categories">
        <div className="grid gap-3">
          <div className="text-sm text-app-muted">
            Categories are cloud-saved per user. Your expense dropdowns use this list.
          </div>

          {catMsg ? (
            <div className="rounded-xl2 border border-app-border bg-app-surface2 p-3 text-sm">{catMsg}</div>
          ) : null}

          <div className="flex flex-col sm:flex-row gap-2">
            <input
              className="input flex-1"
              placeholder="Add category (e.g. Groceries)"
              value={catNewName}
              onChange={(e) => setCatNewName(e.target.value)}
            />
            <button
              className="btn btn-accent"
              type="button"
              onClick={async () => {
                setCatMsg(null);
                const name = (catNewName || "").trim();
                if (!name) return;
                try {
                  await cats.createCategory({ name, kind: "expense" });
                  setCatNewName("");
                  setCatMsg("Category added.");
                } catch (e) {
                  setCatMsg(e?.message || "Failed to add category");
                }
              }}
            >
              Add
            </button>
          </div>

          <div className="grid gap-2">
            {cats.loading ? (
              <div className="text-sm text-app-muted">Loading categories…</div>
            ) : (cats.expenseCategories().length === 0 ? (
              <div className="rounded-xl2 border border-app-border bg-app-surface p-4">
                <div className="text-sm font-semibold">No categories yet</div>
                <div className="text-sm text-app-muted mt-1">Add your first category above to start tracking expenses cleanly.</div>
              </div>
            ) : (
              cats.expenseCategories().map((c, idx, arr) => {
                const isEditing = editingId === Number(c.id);
                return (
                  <div key={c.id} className="card p-3 flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="flex flex-col gap-1">
                        <button
                          className="btn btn-ghost !px-2"
                          title="Move up"
                          disabled={idx === 0}
                          onClick={async () => {
                            if (idx === 0) return;
                            const prev = arr[idx - 1];
                            try {
                              // swap sort_order
                              await cats.updateCategory({ id: Number(c.id), sort_order: (Number(prev.sort_order) ?? 0) });
                              await cats.updateCategory({ id: Number(prev.id), sort_order: (Number(c.sort_order) ?? 0) });
                            } catch (e) {
                              setCatMsg(e?.message || "Failed to reorder");
                            }
                          }}
                          type="button"
                        >
                          ↑
                        </button>
                        <button
                          className="btn btn-ghost !px-2"
                          title="Move down"
                          disabled={idx === arr.length - 1}
                          onClick={async () => {
                            if (idx === arr.length - 1) return;
                            const next = arr[idx + 1];
                            try {
                              await cats.updateCategory({ id: Number(c.id), sort_order: (Number(next.sort_order) ?? 0) });
                              await cats.updateCategory({ id: Number(next.id), sort_order: (Number(c.sort_order) ?? 0) });
                            } catch (e) {
                              setCatMsg(e?.message || "Failed to reorder");
                            }
                          }}
                          type="button"
                        >
                          ↓
                        </button>
                      </div>

                      <div className="min-w-0">
                        {isEditing ? (
                          <input
                            className="input"
                            value={editingName}
                            onChange={(e) => setEditingName(e.target.value)}
                          />
                        ) : (
                          <div className="text-sm font-semibold truncate">{c.name}</div>
                        )}
                        <div className="text-xs text-app-muted">Expense category</div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      {isEditing ? (
                        <>
                          <button
                            className="btn btn-accent"
                            type="button"
                            onClick={async () => {
                              try {
                                await cats.updateCategory({ id: Number(c.id), name: editingName });
                                setEditingId(null);
                                setEditingName("");
                                setCatMsg("Category updated.");
                              } catch (e) {
                                setCatMsg(e?.message || "Failed to update");
                              }
                            }}
                          >
                            Save
                          </button>
                          <button
                            className="btn"
                            type="button"
                            onClick={() => {
                              setEditingId(null);
                              setEditingName("");
                            }}
                          >
                            Cancel
                          </button>
                        </>
                      ) : (
                        <>
                          <button
                            className="btn"
                            type="button"
                            onClick={() => {
                              setEditingId(Number(c.id));
                              setEditingName(c.name);
                              setCatMsg(null);
                            }}
                          >
                            Rename
                          </button>
                          <button
                            className="btn btn-ghost"
                            type="button"
                            onClick={async () => {
                              setCatMsg(null);
                              if (!confirm(`Delete category "${c.name}"? Expenses using it will be reassigned to "Other".`)) return;
                              try {
                                const out = await cats.deleteCategory({ id: Number(c.id) });
                                // Locally reassign any expense transactions pointing to this category.
                                if (out?.reassignedTo) {
                                  const otherId = Number(out.reassignedTo);
                                  const nextTx = state.transactions.map((t) =>
                                    t.type === "expense" && Number(t.categoryId) === Number(c.id)
                                      ? { ...t, categoryId: otherId, category: "Other" }
                                      : t
                                  );
                                  dispatch({ type: "RESET", payload: { ...state, transactions: nextTx } });
                                }
                                setCatMsg("Category deleted.");
                              } catch (e) {
                                setCatMsg(e?.message || "Failed to delete");
                              }
                            }}
                          >
                            Delete
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                );
              })
            ))}
          </div>
        </div>
      </Section>

      <Section title="Needs template + start/end rules">
        <div className="text-sm text-app-muted mb-3">
          This template is used when you <b>Create from template</b> on the Needs page.
          Set <span className="chip">Start</span> and <span className="chip">End</span> to control when items appear.
          Example: set an item’s end month — it disappears from future months automatically.
        </div>

        <div className="overflow-auto">
          <table className="w-full text-sm">
            <thead className="text-xs text-app-muted">
              <tr className="border-b border-app-border">
                <th className="py-2 text-left">Item</th>
                <th className="py-2 text-right">Amount</th>
                <th className="py-2 text-left">Start</th>
                <th className="py-2 text-left">End</th>
                <th className="py-2"></th>
              </tr>
            </thead>
            <tbody>
              {state.needsTemplate.map((n) => (
                <tr key={n.id} className="border-b border-app-border/60">
                  <td className="py-2 min-w-[180px]">
                    <input
                      className="input"
                      value={n.name}
                      onChange={(e) => updateTemplateNeed(n.id, { name: e.target.value })}
                    />
                  </td>
                  <td className="py-2 text-right min-w-[130px]">
                    <input
                      className="input text-right"
                      type="number"
                      value={n.amount}
                      onChange={(e) => updateTemplateNeed(n.id, { amount: Number(e.target.value || 0) })}
                    />
                  </td>
                  <td className="py-2 min-w-[140px]">
                    <MonthInput value={n.startMonth} onChange={(v) => updateTemplateNeed(n.id, { startMonth: v })} />
                  </td>
                  <td className="py-2 min-w-[140px]">
                    <MonthInput value={n.endMonth} onChange={(v) => updateTemplateNeed(n.id, { endMonth: v })} />
                  </td>
                  <td className="py-2 text-right min-w-[90px]">
                    <button className="btn" onClick={() => deleteTemplateNeed(n.id)} type="button">
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
              {state.needsTemplate.length === 0 ? (
                <tr>
                  <td colSpan="5" className="py-4 text-app-muted">
                    No template items.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>

        <div className="mt-3 flex flex-wrap gap-2">
          <button className="btn btn-accent" onClick={addTemplateNeed} type="button">
            + Add template item
          </button>
          <button
            className="btn"
            type="button"
            onClick={() => alert("Use YYYY-MM format. Example: 2026-06. Leave blank to mean no start/end limit.")}
          >
            Format help
          </button>
        </div>
      </Section>
    </div>
  );
}
