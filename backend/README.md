# Collab WebSocket Server

Standalone Node.js WebSocket server for Yjs document sync. Runs independently from the Next.js app on a separate port.

## Project structure

```
backend/
├── src/
│   ├── index.ts              # HTTP + WebSocket entrypoint
│   ├── config.ts             # Environment configuration
│   ├── auth/
│   │   └── session.ts        # JWT verification, token/path parsing
│   ├── db/
│   │   ├── pool.ts           # PostgreSQL pool
│   │   └── documents.ts      # Role lookup, snapshot queries
│   ├── sync/
│   │   ├── handler.ts        # Yjs rooms, WebSocket protocol
│   │   ├── persistence.ts    # Debounced snapshot flush
│   │   ├── rate-limiter.ts   # Per-connection rate limits
│   │   └── validation.ts     # Message size + malformed update guards
│   ├── http/
│   │   └── internal.ts       # Internal REST API for Next.js
│   ├── yjs/
│   │   └── repair-markup.ts  # Legacy markup repair
│   └── services/
│       └── summaries.ts      # AI summary requests to collab-web
├── package.json
└── tsconfig.json
```

## Prerequisites

- PostgreSQL running with migrations applied (shared with the Next.js app)
- `NEXTAUTH_SECRET` must match the Next.js app exactly (used to verify session tokens)

## Setup

```bash
cd backend
cp .env.example .env
# Edit .env with your DATABASE_URL and NEXTAUTH_SECRET
npm install
```

## Run locally

From the `backend/` directory:

```bash
npm run dev
```

The server listens on **port 1234** by default (`ws://localhost:1234/{documentId}`).

The Next.js app runs on port **3000** — keep both running for live sync in Phase 6.

## Deploy to production

**Railway (recommended):** step-by-step guide in [DEPLOYMENT.md](./DEPLOYMENT.md).

Quick checklist:

1. Railway project → Root Directory **`backend`**
2. Generate a **public domain**
3. Set env vars (`DATABASE_URL`, `NEXTAUTH_SECRET`, `WS_INTERNAL_SECRET`, `NEXT_APP_URL`)
4. Point Vercel at `wss://<railway-domain>` via `NEXT_PUBLIC_WS_URL`

Also see the root [Deployment guide](../docs/DEPLOYMENT.md) (Vercel + Railway).

## Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start with hot reload via `tsx watch` |
| `npm run build` | Compile TypeScript to `dist/` |
| `npm start` | Run compiled server |

## Connection protocol

Clients connect using the y-websocket URL format:

```
ws://localhost:1234/{documentId}?token={next-auth.session-token}
```

Authentication accepts the token via query param or `Authorization: Bearer` header.

## Security

- JWT session verification on handshake (rejects unauthenticated connections)
- Document role lookup from Postgres at **WebSocket handshake** (`readOnly` is set once per connection)
- When a collaborator's role changes or they are removed, Next.js calls `POST /internal/documents/:id/disconnect-user` to close that user's connection(s); the client's y-websocket provider auto-reconnects and re-runs role resolution at handshake
- Max message size: 1 MB (configurable via `MAX_MESSAGE_BYTES`)
- Per-connection rate limiting (default 50 messages/sec)
- Malformed Yjs updates are caught and repeated offenders are disconnected
- Document state is debounced to Postgres every 30s during active editing

## Internal HTTP API (Next.js → WS server)

Protected by `WS_INTERNAL_SECRET` (`Authorization: Bearer …`):

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/internal/documents/:id/state` | Returns base64 `Y.encodeStateAsUpdate` for active room |
| `POST` | `/internal/documents/:id/apply-update` | Applies restore diff to active room and broadcasts |
| `POST` | `/internal/documents/:id/disconnect-user` | Force reconnect after role change |

Next.js also exposes `POST /api/internal/snapshots/summarize` (same secret) for AUTO snapshot AI summaries.

Used by Next.js snapshot/restore and collaborator role-change routes. Requires an active editing session (open document) for live server state; `disconnect-user` returns `{ disconnected: 0 }` when no room or no matching connections exist.

## Health check

```
curl http://localhost:1234/
```

Returns `Collab WebSocket server`.
