# Finance OS (Local-First)

A calm, local-first personal finance web app for:
- daily spending tracking
- recurring monthly needs
- multiple savings buckets (emergency, fun, health, etc.)
- editable debt + payment history
- one-click JSON export/import

## Tech
- React + Vite
- Tailwind
- LocalStorage persistence (offline-friendly once loaded)

## Run locally
```bash
npm install
npm run dev
```

## Build
```bash
npm run build
npm run preview
```

## Notes
- Data is stored under the localStorage key: `financeos:v1`
- Use **Backup** page to export/import JSON.
