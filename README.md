# Finance OS — Local‑first + optional Cloud Sync (PHP/MySQL)

This repo contains:

- `frontend/` — React + Vite + Tailwind (local‑first, works fully offline)
- `api/` — PHP 8.x API for secure multi‑user auth + snapshot sync (Hostinger shared hosting compatible)

## What changed

- Added **Login** (`/login`) and **Register** (`/register`) routes
- Added **Offline‑only mode** (no login required, no sync)
- Added **Snapshot cloud sync** (whole app state JSON per user) with versioned conflict detection
- Added Settings **Sync** section (status, sync now, logout)
- Added strict CORS (only `https://finance.lolclownbot.com`)

---

## Database setup (phpMyAdmin)

Create a database, then run these SQL statements:

```sql
CREATE TABLE users (
  id CHAR(36) PRIMARY KEY,
  email VARCHAR(255) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  display_name VARCHAR(80),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

CREATE TABLE user_state (
  user_id CHAR(36) PRIMARY KEY,
  state_json LONGTEXT NOT NULL,
  version INT NOT NULL DEFAULT 1,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE sessions (
  id CHAR(36) PRIMARY KEY,
  user_id CHAR(36) NOT NULL,
  token_hash VARCHAR(255) NOT NULL,
  expires_at DATETIME NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  revoked_at DATETIME NULL,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX idx_sessions_user ON sessions(user_id);
CREATE INDEX idx_sessions_expires ON sessions(expires_at);
```

---

## Backend deployment (Hostinger)

1. Upload the entire `api/` folder to:

   `public_html/api/`

2. Edit this file on the server:

   `public_html/api/_lib/config.php`

   Set:
   - DB credentials
   - `token_secret` (use a long random secret)

3. Endpoints examples:

- `https://finance.lolclownbot.com/api/auth/login.php`
- `https://finance.lolclownbot.com/api/sync/get.php`

### CORS

CORS is already strict in `api/_lib/bootstrap.php` and allows only:

- `https://finance.lolclownbot.com`

No wildcards.

---

## Frontend build & deployment (Hostinger)

Hostinger shared hosting cannot run Node.js, so you build locally, then upload the built files.

1. Build locally:

```bash
cd frontend
npm install
npm run build
```

2. Upload **contents** of:

`frontend/dist/`

to:

`public_html/`

3. SPA routing

After build, Vite copies `frontend/public/.htaccess` into `dist/.htaccess`.
Make sure `.htaccess` exists in `public_html/` so React Router works on refresh.

---

## How sync works (snapshot + versioning)

- The app stores **the entire state** as JSON in MySQL `user_state.state_json`
- Each save increments `version`
- Client saves with `{ state, version }`
- If clientVersion < serverVersion, API returns `409 { conflict: true, serverVersion }`

### First login merge rules

- Cloud empty + local has data → pushes local to cloud
- Local empty + cloud has data → pulls cloud and adopts it
- Both have data → user chooses:
  - **Use cloud** (replace local)
  - **Keep local** (overwrite cloud)

---

## Local development

```bash
cd frontend
npm install
npm run dev
```

If you want to test against production API, set:

- `VITE_API_BASE=/api`

(Defaults to `/api` already.)

---

## Notes

- Auth uses `password_hash(..., PASSWORD_ARGON2ID)` (falls back to bcrypt automatically)
- Session tokens are generated using `random_bytes` and stored **hashed** in DB
- No cookies are used; client sends `Authorization: Bearer <token>`
