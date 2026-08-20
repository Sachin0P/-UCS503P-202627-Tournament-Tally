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

## Deployment

Two constraints shape where this can run:

- **SQLite is a file on disk.** Classic serverless platforms (Vercel/Netlify functions,
  AWS Lambda) don't give you a writable persistent filesystem between invocations, so
  the database would reset constantly. You need a host with a persistent volume/disk.
- **Socket.IO needs a long-running process.** Same reason — serverless functions don't
  hold WebSocket connections open.

So: any host that runs a normal, always-on container/VM with attached storage works.
In production, the backend also serves the built Angular app itself (see
`app.js` — gated behind `NODE_ENV=production`), so it's **one process, one port, one
origin** — no separate frontend host or CORS setup needed.

### Docker (recommended)

A multi-stage `Dockerfile` at the repo root builds the Angular app and packages it with
the backend into one image:

```bash
docker build --build-arg GOOGLE_CLIENT_ID=<your-client-id>.apps.googleusercontent.com \
  -t arenasuite .

docker run -d -p 4000:4000 \
  -e JWT_SECRET=<a long random string> \
  -e ALLOWED_EMAIL_DOMAIN=thapar.edu \
  -e ADMIN_EMAILS=<your email> \
  -e FRONTEND_URL=https://your-domain.com \
  -e GOOGLE_CLIENT_ID=<your-client-id>.apps.googleusercontent.com \
  -v arenasuite_data:/app/data \
  --name arenasuite \
  arenasuite
```

The `-v arenasuite_data:/app/data` volume is what makes the SQLite file survive
container restarts/redeploys — without it, every deploy starts from an empty database.
This has been built and run locally to confirm the image works and the volume persists
data across a restart.

Any platform that deploys a `Dockerfile` with a persistent volume works: **Railway**
and **Render** are the easiest (git-connected, build from the Dockerfile, add a volume
mounted at `/app/data`, set the env vars above in their dashboard, done — no server
management). **Fly.io** is similar with a bit more CLI/config. A plain **VPS**
(DigitalOcean/Hetzner/Linode) works too if you want full control — install Docker,
`docker run` as above behind nginx or Caddy for HTTPS, or run it directly with
PM2 instead of Docker.

### After deploying

1. Add your production domain to the Google OAuth client's **Authorized JavaScript
   origins** (Google Cloud Console → Credentials) — sign-in will fail with a console
   error until you do.
2. Point `FRONTEND_URL` at your real domain (used for CORS and the Socket.IO origin
   check).
3. Get a TLS certificate — most PaaS hosts (Railway/Render/Fly) do this automatically
   for their subdomains and custom domains; on a VPS, use Caddy or certbot/nginx.

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
