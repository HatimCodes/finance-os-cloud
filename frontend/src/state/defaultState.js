import { todayISO, uid } from "./money.js";

export function makeDefaultState() {
  return {
    version: 1,
    profile: {
      name: "",
      currency: "MAD",
      startingBalance: 0,
      // Dark is the default on first launch (user can switch in Settings → Appearance)
      theme: "dark",
      hasCompletedSetup: false,
    },
    // template needs (can be copied into a specific month)
    needsTemplate: [
      // Neutral placeholders only (safe to ship publicly). Users can edit to match their real life.
      { id: uid("need"), name: "Rent", amount: 2500, startMonth: "", endMonth: "" },
      { id: uid("need"), name: "Utilities", amount: 250, startMonth: "", endMonth: "" },
      { id: uid("need"), name: "Internet", amount: 200, startMonth: "", endMonth: "" },
      { id: uid("need"), name: "Subscription", amount: 100, startMonth: "", endMonth: "" },
      { id: uid("need"), name: "Groceries", amount: 1200, startMonth: "", endMonth: "" },
      { id: uid("need"), name: "Transport", amount: 300, startMonth: "", endMonth: "" },
    ],
    monthNeeds: {},
    categories: [
      "Needs", "Food", "Transport", "Fun", "Health", "GF",
      "Tools", "Subscriptions", "Debt Payment", "Emergency",
      "Investment", "Long-term", "Other"
    ],
    buckets: [
      { id: uid("bucket"), name: "Emergency", kind: "savings", target: 0, current: 0 },
      { id: uid("bucket"), name: "Long-term", kind: "savings", target: 0, current: 0 },
      { id: uid("bucket"), name: "Investments", kind: "savings", target: 0, current: 0 },
      { id: uid("bucket"), name: "GF", kind: "savings", target: 0, current: 0 },
      { id: uid("bucket"), name: "Health", kind: "savings", target: 0, current: 0 },
      { id: uid("bucket"), name: "Fun", kind: "savings", target: 0, current: 0 },
    ],
    debts: [
      // user can add/edit. empty by default
    ],
    transactions: [
      // generic ledger
      // {id, date, type: "expense"|"income"|"debt_payment"|"bucket_add", amount, category, bucketId?, debtId?, note, payment}
    ],
    createdAt: todayISO(),
    updatedAt: todayISO(),
  };
}
