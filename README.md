# ArenaSuite

A centralized college competition platform — Sports, Academic, and Esports — where
students discover competitions, register, form or join teams, and track live results,
while organizers create and run competitions from one dashboard.

## Stack

- **Frontend**: Angular (standalone components + signals), TypeScript, Tailwind CSS
- **Backend**: Node.js, Express, REST APIs
- **Database**: SQLite via Node's built-in [`node:sqlite`](https://nodejs.org/api/sqlite.html) module (no native build step)
- **Realtime**: Socket.IO
- **Auth**: Google Identity Services, verified server-side with `google-auth-library`, restricted to a configurable email domain

## Prerequisites

- Node.js **22.5+** (for the built-in `node:sqlite` module). This repo was built and tested on Node 26.

## Setup

### 1. Backend

```bash
cd backend
npm install
cp .env.example .env
```

Edit `.env`:

```env
PORT=4000
FRONTEND_URL=http://localhost:4200
DB_PATH=./data/arenasuite.db
JWT_SECRET=<a long random string>
JWT_EXPIRES_IN=7d
GOOGLE_CLIENT_ID=<your Google OAuth client ID>.apps.googleusercontent.com
ALLOWED_EMAIL_DOMAIN=thapar.edu
ADMIN_EMAILS=<your email, comma-separated for more than one>
```

`ADMIN_EMAILS` is how you bootstrap your first admin account — see [Becoming an
admin](#becoming-an-admin) below.

Run it:

```bash
npm start        # or: npm run dev (auto-restarts on file changes)
```

The API listens on `http://localhost:4000`. `GET /api/health` should return `{"status":"ok"}`.
The SQLite schema (`config/schema.sql`) is applied automatically on startup.

### 2. Frontend

```bash
cd frontend
npm install
cp src/environments/environment.development.example.ts src/environments/environment.development.ts
cp src/environments/environment.example.ts src/environments/environment.ts
```

Both copied files are gitignored (they hold your Google OAuth client ID) — edit them to
set `googleClientId`, matching the backend's `GOOGLE_CLIENT_ID`.

```bash
npm start         # ng serve, http://localhost:4200
```

### 3. Google Sign-In

Authentication is Google-only, restricted to `ALLOWED_EMAIL_DOMAIN`. To wire up real
sign-in:

1. In the [Google Cloud Console](https://console.cloud.google.com/), create/select a
   project, then **APIs & Services → OAuth consent screen** — set an app name and
   support email (Internal audience if this is a Google Workspace domain; External +
   add yourself as a test user otherwise).
2. **APIs & Services → Credentials → Create Credentials → OAuth client ID** →
   Application type **Web application**. Add `http://localhost:4200` (and your real
   domain later) under **Authorized JavaScript origins**. No redirect URI is needed.
3. Copy the client ID (ends in `.apps.googleusercontent.com`) into `backend/.env`
   (`GOOGLE_CLIENT_ID`) and both frontend environment files (`googleClientId`) from
   step 2 above. Restart both servers.

### Becoming an admin

The Admin Panel can promote/demote any user's role — but you need to already be an
admin to open it. To bootstrap your first admin account(s), list their emails in
`ADMIN_EMAILS` in `backend/.env` (comma-separated) before they sign in with Google.
Each listed email is promoted to `admin` automatically on login — whether that's their
first login ever, or a later one if you add them to the list afterward. It's one-way:
removing an email from the list later does not revoke admin rights already granted.
From then on, manage roles through **Admin Panel → Users** instead.

### Testing without a real Google account

If you don't have a Google account on `ALLOWED_EMAIL_DOMAIN` handy, you can still
exercise the API and seed sample data directly:

```bash
cd backend
node scripts/seed.js
```

This inserts sample users (admin / organizer / two participants) directly into SQLite
and prints a valid app JWT for each — useful for `curl`-ing the API or scripting a
browser session (e.g. `localStorage.setItem('arenasuite_token', '<token>')`, then
reload). It never touches the real `/api/auth/google` verification path.

## Project layout

```
backend/
  config/       env + SQLite connection + schema.sql
  controllers/  request handlers per resource
  routes/       Express routers per resource
  services/     Google auth, fixture generation, standings, notifications
  middleware/   auth, role checks, centralized error handling
  sockets/      Socket.IO server + room helpers
  scripts/      seed.js (dev-only)

frontend/src/app/
  core/         services, guards, interceptors, models
  shared/       reusable components (cards, badges, bracket, tables...)
  features/     one folder per screen area (home, sports, academic, esports,
                competitions, teams, find-team, organizer-dashboard, admin-dashboard...)
```

## Notable design decisions

- **SQLite driver**: uses Node's built-in `node:sqlite` (`DatabaseSync`) rather than
  `better-sqlite3` — the latter's native addon doesn't yet build cleanly against very
  new Node versions, and the built-in module needs zero native compilation.
- **`standings.stats_json`**: one extra nullable column beyond the core spec, to hold
  game/format-specific fields (Esports kills/placement, Academic evaluation notes)
  without bloating the schema with per-category columns.
- **`looking_for_team_posts` table**: added to support the "Looking for a Team" feature
  (a user posts that they need a team; captains browse and invite them).
- **`reports` table**: added so the Admin Panel's report-handling flow has somewhere to
  read from/write to.
- Becoming an organizer = creating an Organization (auto-promotes your role and makes
  you its owner). Becoming an admin = being listed in `ADMIN_EMAILS` when you sign in
  (see [Becoming an admin](#becoming-an-admin)), or being promoted by an existing admin.
- Frontend environment files (`environment.ts`, `environment.development.ts`) are
  gitignored, same as backend `.env` — both hold a Google OAuth client ID that's
  environment-specific. Copy from the committed `.example.ts` / `.env.example` files.
