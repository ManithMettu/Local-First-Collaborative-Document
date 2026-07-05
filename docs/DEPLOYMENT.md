# Deployment

Production runs as **two services** plus a shared PostgreSQL database:

| Service | Platform | Role |
|---------|----------|------|
| Next.js app (`collab-web/`) | [Vercel](https://vercel.com) | UI, REST API, Auth.js |
| WebSocket server (`backend/`) | [Railway](https://railway.app) or [Render](https://render.com) | Yjs sync, AUTO snapshot persistence |
| PostgreSQL | Neon, Supabase, Railway, etc. | Metadata, collaborators, snapshots |

The WebSocket server must stay on a **long-lived Node process** — do not run sync logic inside Vercel serverless functions.

## Prerequisites

1. PostgreSQL database with the app schema applied.
2. Matching secrets between Vercel and the WS server (`NEXTAUTH_SECRET`, `WS_INTERNAL_SECRET`).
3. Public `wss://` URL for the WS server exposed to browsers.

### Database schema

This repo ships with `collab-web/prisma/schema.prisma`. Apply it to your production database **before** the first deploy:

```bash
# One-time (no migration history yet)
cd collab-web
DATABASE_URL="postgresql://..." npx prisma db push

# Or, once migrations exist in collab-web/prisma/migrations/
DATABASE_URL="postgresql://..." npx prisma migrate deploy
```

Use the same `DATABASE_URL` on Vercel and the WS server.

---

## 1. WebSocket server (Railway or Render)

Deploy from the **`backend/`** directory (separate `package.json`).

### Railway

1. New project → **Deploy from GitHub** → select this repo.
2. Set **Root Directory** to `backend` (required).
3. Railway auto-loads `backend/railway.toml` and `backend/nixpacks.toml` (Node 22, `npm ci`, health check on `/`).
4. **Networking → Generate Domain** (e.g. `collab-ws.up.railway.app`).
5. Set environment variables (see table below).

Full walkthrough: [backend/DEPLOYMENT.md](../backend/DEPLOYMENT.md).

Railway injects `PORT` automatically; the server binds to `0.0.0.0`.

### Render

1. New **Web Service** → connect repo.
2. **Root Directory**: `backend`
3. **Build Command**: `npm install && npm run build`
4. **Start Command**: `npm start`
5. Enable a health check on path `/` (expects `Collab WebSocket server`).

### WS server environment variables

| Variable | Required | Notes |
|----------|----------|-------|
| `DATABASE_URL` | ✓ | Same Postgres as Next.js |
| `NEXTAUTH_SECRET` | ✓ | **Must match** Vercel exactly |
| `WS_INTERNAL_SECRET` | ✓ | **Must match** Vercel exactly |
| `NEXT_APP_URL` | ✓ | `https://collab-one-phi.vercel.app` (AUTO snapshot AI summaries) |
| `PORT` | — | Set by host (Railway/Render) |
| `HOST` | — | Default `0.0.0.0` |
| `MAX_MESSAGE_BYTES` | — | Default `1048576` |
| `MAX_MESSAGES_PER_SECOND` | — | Default `50` |
| `PERSISTENCE_DEBOUNCE_MS` | — | Default `30000` |

### WebSocket URL for clients

Browsers connect with y-websocket:

```
wss://local-first-collaborative-document-production-9bed.up.railway.app/<documentId>?token=<session-token>
```

Use the **public HTTPS/WSS hostname** from Railway (not an internal URL).

Verify:

```bash
curl https://local-first-collaborative-document-production-9bed.up.railway.app/
# → Collab WebSocket server
```

---

## 2. Next.js app (Vercel)

1. Import the GitHub repo in Vercel.
2. Set **Root Directory** to `collab-web` (required — the app is not at the repo root).
3. Framework preset: **Next.js** (also enforced by `collab-web/vercel.json`).
4. Leave **Output Directory** empty (Next.js manages `.next` automatically).
5. Build runs `prisma generate` via `postinstall` and `next build` via the default build command.

### Vercel environment variables

| Variable | Required | Notes |
|----------|----------|-------|
| `DATABASE_URL` | ✓ | Production Postgres connection string |
| `NEXTAUTH_SECRET` | ✓ | Same as WS server |
| `NEXTAUTH_URL` | ✓ | `https://collab-one-phi.vercel.app` |
| `NEXT_PUBLIC_WS_URL` | ✓ | `wss://local-first-collaborative-document-production-9bed.up.railway.app` |
| `WS_SERVER_HTTP_URL` | ✓ | `https://local-first-collaborative-document-production-9bed.up.railway.app` |
| `WS_INTERNAL_SECRET` | ✓ | Same as WS server |
| `GROQ_API_KEY` | — | Optional; AI version summaries |
| `GROQ_MODEL` | — | Default `llama-3.1-8b-instant` |

`NEXT_PUBLIC_WS_URL` is baked into the client bundle at build time — redeploy Vercel after changing it.

### Auth.js / cookies

Set `NEXTAUTH_URL` to the canonical Vercel URL (including `https://`). Session cookies must align with the domain users visit.

---

## 3. Wiring checklist

After both services are live:

- [ ] `curl https://<ws-host>/` returns the health string
- [ ] Vercel app loads; sign in works
- [ ] Open a document in two tabs — connection status shows **Online** and edits sync
- [ ] Create a collaborator / change role — viewer cannot edit (WS + API enforcement)
- [ ] Optional: AUTO snapshots get AI summaries when `GROQ_API_KEY` is set on Vercel and `NEXT_APP_URL` is set on the WS server

---

## 4. CI (GitHub Actions)

`.github/workflows/ci.yml` runs on every push/PR to `main` (default `working-directory: collab-web`):

1. **quality** — `npm run lint`, `npm test`, `next build`, `backend` TypeScript build
2. **e2e** — PostgreSQL service container, `prisma db push`, Playwright two-client sync spec

No deployment secrets are required for CI; tests use ephemeral Postgres and generated secrets.

---

## 5. Local parity

```bash
# Terminal 1 — Next.js
cd collab-web
cp .env.example .env   # fill DATABASE_URL, secrets
npm install
npx prisma db push
npm run dev

# Terminal 2 — WebSocket server
cd backend
cp .env.example .env   # same DATABASE_URL + NEXTAUTH_SECRET
npm install
npm run dev
```

See [collab-web/tests/README.md](../collab-web/tests/README.md) for `npm test` and `npm run test:e2e`.

---

## Architecture reference

System design, CRDT rules, and internal APIs: [ARCHITECTURE.md](./ARCHITECTURE.md).

WebSocket server details: [backend/README.md](../backend/README.md).
