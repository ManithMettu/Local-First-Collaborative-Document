# Deploy backend to Railway

The WebSocket sync server must run as a **long-lived Node process** (not serverless). Railway is the recommended host for `backend/`.

Config files in this folder:

| File | Purpose |
|------|---------|
| `railway.toml` | Build, health check, restart policy |
| `nixpacks.toml` | Node 22 + install/build/start commands |
| `.railwayignore` | Excludes local artifacts from upload |

---

## 1. Create the Railway service

1. Open [Railway](https://railway.app) → **New Project** → **Deploy from GitHub repo**.
2. Select this repository.
3. **Settings → Root Directory** → set to **`backend`** (required — the server is not at the repo root).
4. Railway reads `backend/railway.toml` automatically.

You do **not** need to override Build/Start commands in the UI if `railway.toml` is present.

---

## 2. Enable public networking

1. Open your service → **Settings → Networking**.
2. Click **Generate Domain** (e.g. `collab-ws-production.up.railway.app`).
3. Railway sets `PORT` automatically; the server binds to `0.0.0.0`.

Verify after deploy:

```bash
curl https://<your-railway-domain>/
# → Collab WebSocket server
```

WebSocket clients use:

```
wss://<your-railway-domain>/<documentId>?token=<session-token>
```

---

## 3. Environment variables

In **Railway → Variables**, add:

| Variable | Required | Example |
|----------|----------|---------|
| `DATABASE_URL` | ✓ | Same PostgreSQL URL as `collab-web` (Aiven, Neon, etc.) |
| `NEXTAUTH_SECRET` | ✓ | Must **match** Vercel `NEXTAUTH_SECRET` exactly |
| `WS_INTERNAL_SECRET` | ✓ | Must **match** Vercel `WS_INTERNAL_SECRET` exactly |
| `NEXT_APP_URL` | ✓ | `https://collab-one-phi.vercel.app` |
| `HOST` | — | `0.0.0.0` (default) |
| `PORT` | — | Injected by Railway — do not hardcode |
| `MAX_MESSAGE_BYTES` | — | `1048576` (default) |
| `MAX_MESSAGES_PER_SECOND` | — | `50` (default) |
| `PERSISTENCE_DEBOUNCE_MS` | — | `30000` (default) |

Copy from `backend/.env.example` as a template.

---

## 4. Database

Use the **same** PostgreSQL database as `collab-web`. Apply the schema first:

```bash
cd collab-web
DATABASE_URL="postgresql://..." npx prisma db push
```

Railway can also provision Postgres in the same project — if you do, use that `DATABASE_URL` on **both** Railway (backend) and Vercel (`collab-web`).

---

## 5. Wire Vercel (`collab-web`)

After Railway is live, set these on **Vercel**:

| Vercel variable | Value |
|-----------------|-------|
| `NEXT_PUBLIC_WS_URL` | `wss://local-first-collaborative-document-production-9bed.up.railway.app` |
| `WS_SERVER_HTTP_URL` | `https://local-first-collaborative-document-production-9bed.up.railway.app` |
| `NEXTAUTH_URL` | `https://collab-one-phi.vercel.app` |
| `NEXTAUTH_SECRET` | Same as Railway |
| `WS_INTERNAL_SECRET` | Same as Railway |

Redeploy Vercel after changing `NEXT_PUBLIC_WS_URL` (baked into the client bundle at build time).

---

## 6. Deploy flow

Every push to your connected branch:

1. Railway runs `npm ci && npm run build` (TypeScript → `dist/`).
2. Starts with `node dist/index.js`.
3. Health check hits `/` until the server responds.

Manual redeploy: **Deployments → Redeploy**.

---

## Troubleshooting

| Symptom | Fix |
|---------|-----|
| Build fails: `tsc` not found | Ensure Root Directory is `backend` (not repo root) |
| Crash on start: missing env | Set `DATABASE_URL` and `NEXTAUTH_SECRET` |
| Health check fails | Server must respond on `/` with `Collab WebSocket server` |
| Browser shows Offline | Set `NEXT_PUBLIC_WS_URL` to `wss://…` on Vercel and redeploy |
| Auth rejected on WS | `NEXTAUTH_SECRET` must match between Vercel and Railway |
| Internal API fails | `WS_INTERNAL_SECRET` must match; set `WS_SERVER_HTTP_URL` on Vercel |

---

## Local parity

```bash
cd backend
cp .env.example .env   # fill DATABASE_URL, secrets
npm install
npm run dev
```

See also: [root deployment guide](../docs/DEPLOYMENT.md).
