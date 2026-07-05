# Architecture

Local-first collaborative document editor: Yjs CRDT state on the client, PostgreSQL for metadata and snapshots, a standalone WebSocket server for real-time sync.

## System overview

```
┌─────────────────┐     REST (Auth.js)      ┌──────────────────┐
│  Next.js 16     │◄───────────────────────►│  PostgreSQL      │
│  App Router     │     Prisma              │  documents,      │
│                 │                         │  collaborators,  │
│  - Editor UI    │     Internal HTTP       │  snapshots       │
│  - API routes   │◄───────────────────────►│                  │
└────────┬────────┘  WS_INTERNAL_SECRET     └────────▲─────────┘
         │                                           │
         │ y-websocket (client)                      │ debounced
         ▼                                           │ AUTO snapshots
┌─────────────────┐                                    │
│  WS server      │────────────────────────────────────┘
│  /backend       │
│  Yjs rooms      │
└─────────────────┘
```

- **Client Y.Doc** (via `y-indexeddb`) is the source of truth for editing. The UI never blocks on network.
- **WebSocket server** holds in-memory Yjs rooms per open document and relays updates between tabs/users.
- **PostgreSQL** stores document metadata, collaborator roles, and periodic Yjs state snapshots (MANUAL + AUTO).

## Roles and enforcement

Three roles: **Owner**, **Editor**, **Viewer**.

| Capability | Owner | Editor | Viewer |
|------------|-------|--------|--------|
| Open / read document | ✓ | ✓ | ✓ |
| Edit via editor | ✓ | ✓ | ✗ |
| Create / restore snapshots | ✓ | ✓ | ✗ |
| Manage collaborators | ✓ | ✗ | ✗ |
| Delete document | ✓ | ✗ | ✗ |

Enforcement layers:

1. **Next.js API** — `requireDocumentAccess` / `requireDocumentOwner` on every route.
2. **WebSocket handshake** — `resolveDocumentRole` from Postgres; `readOnly: true` for viewers.
3. **WebSocket messages** — sync step 2 and update messages rejected on read-only connections (connection closed with code `4403`).

### Stale-role gap (historical)

Originally, `role` and `readOnly` were resolved **once at WebSocket handshake** and cached on `ConnectionContext` for the life of the connection. `handleSyncMessage` checked `context.readOnly` but never re-queried Postgres.

That meant:

- **EDITOR → VIEWER** while connected: the user could keep writing over the old connection until they happened to reconnect — a security gap.
- **VIEWER → EDITOR** while connected: the user stayed read-only on the wire until reconnect.

API-layer checks blocked some REST actions, but live CRDT edits flow through the WebSocket path.

### Fix: disconnect on role change

When an owner **PATCH**es a collaborator's role (if it actually changes) or **DELETE**s them, Next.js calls:

```
POST /internal/documents/:documentId/disconnect-user
Authorization: Bearer {WS_INTERNAL_SECRET}
{ "userId": "<affected-user-id>" }
```

The WS server closes every open connection for that `userId` on that document (close code **4401**, reason `"Role changed"`).

The client's `y-websocket` provider auto-reconnects. The upgrade handler runs `resolveDocumentRole` again, so:

- Demoted editors reconnect as read-only viewers; further writes are rejected.
- Promoted viewers reconnect with write access.
- Removed collaborators get **403** on handshake.

The editor page also calls `refreshRole()` when the connection returns to **online**, so the UI badge, read-only banner, and Tiptap `editable` flag update without a manual page refresh.

### Why disconnect instead of per-message role checks?

| Approach | Pros | Cons |
|----------|------|------|
| **Per-message DB lookup** | Always current | Extra Postgres query on every sync message (high volume during typing); latency; harder to rate-limit fairly |
| **Disconnect on change** | Handshake stays the single authority; zero hot-path DB cost; matches y-websocket's reconnect model | Brief reconnect blip (~1–2s); requires internal API wiring |

We chose **disconnect on change** because role changes are rare, the handshake already owns authorization, and reconnect is built into `y-websocket`.

## Version restore

Snapshots store `Y.encodeStateAsUpdate` bytes. Restoring does **not** overwrite live state.

`computeRestoreUpdate` diffs plain text between current and snapshot state, applies insert/delete on a temp doc, and returns `encodeStateAsUpdate(doc, stateVectorBefore)` — a mergeable forward update. The old `encodeStateAsUpdate(snapshot, currentSV)` approach is empty when the snapshot is an ancestor of current state.

## AI version summaries

When `GROQ_API_KEY` is set, each new snapshot gets a one-line `changeSummary`:

1. **`lib/yjs/diff.ts`** — extracts plain text from previous and new Yjs states, builds a compact `+`/`-` diff for the model prompt.
2. **`lib/ai/client.ts`** — calls OpenAI via the Vercel AI SDK (`generateText`, default model `gpt-4o-mini`).
3. **Manual snapshots** — summary generated inline in `POST /api/documents/:id/snapshots` before insert.
4. **AUTO snapshots** — WS server inserts the row, then fire-and-forgets `POST /api/internal/snapshots/summarize` on Next.js (requires `NEXT_APP_URL` on the WS server). The timeline polls every 15s while any AUTO row lacks a summary.

Without an API key, snapshots are created normally and `changeSummary` stays `null`.

## Internal HTTP API (Next.js → WS server)

Protected by `WS_INTERNAL_SECRET` (`Authorization: Bearer …`):

| Method | Path | Purpose |
|--------|------|---------|
| `GET` | `/internal/documents/:id/state` | Live room state for restore |
| `POST` | `/internal/documents/:id/apply-update` | Apply restore update + broadcast |
| `POST` | `/internal/documents/:id/disconnect-user` | Force reconnect after role change |

Set `WS_SERVER_HTTP_URL` in the Next.js app (e.g. `http://localhost:1234`) and the same secret in both `.env` files.

## Key packages

- **Yjs** + **y-indexeddb** — CRDT + offline persistence
- **y-websocket** — sync protocol client
- **Tiptap v2** + `@tiptap/extension-collaboration` — rich text bound to Y.XmlFragment
- **Prisma** — PostgreSQL access from Next.js
- **Auth.js** — JWT sessions; same secret verifies WS handshake tokens

## Deployment notes

- Next.js and the WS server are **separate processes** (serverless cannot hold persistent WebSocket connections).
- Both need `DATABASE_URL`; WS server needs `NEXTAUTH_SECRET` for token verification.
- `NEXT_PUBLIC_WS_URL` points the browser at the WS host; `WS_SERVER_HTTP_URL` points Next.js server-side calls at the WS HTTP listener (same port in dev).

Full production guide: [DEPLOYMENT.md](./DEPLOYMENT.md).

## Security

### WebSocket hardening

- **Payload size cap** — `MAX_MESSAGE_BYTES` (default 1 MB) rejects oversized frames before parsing.
- **Rate limiting** — per-connection token bucket (`MAX_MESSAGES_PER_SECOND`, default 50); sustained abuse triggers disconnect.
- **Malformed updates** — `Y.applyUpdate` runs in try/catch; repeated failures close the connection (`MAX_MALFORMED_MESSAGES`).
- **Auth at handshake** — NextAuth JWT verified on upgrade; document role loaded from Postgres before joining a room.

### API and data isolation

- **ORM scoping** — every document query filters by `ownerId` or `collaborators.some.userId`; snapshots are always fetched with `{ id, documentId }`.
- **Role gates** — `requireDocumentAccess` / `requireDocumentOwner` on all mutating REST routes; viewers need `VIEWER` minimum for read, `EDITOR` for writes/restores.
- **Internal routes** — `WS_INTERNAL_SECRET` bearer token on `/internal/*`; request bodies are size-capped on the WS HTTP listener.
- **Viewer write block** — read-only connections cannot send Yjs sync step 2 or update messages (close code `4403`); UI sets `contenteditable={false}`.

### OOM and abuse mitigation

| Threat | Mitigation |
|--------|------------|
| Huge sync payload | Byte limit on WS frames + base64 decode size check on internal `apply-update` |
| Flood of messages | Per-connection rate limiter with auto-disconnect |
| Corrupt CRDT bytes | Malformed-update tracker; invalid updates never crash the process |
| Cross-tenant access | Prisma queries scoped to authenticated user; WS handshake re-checks role |
| Role change while connected | `disconnect-user` internal API forces reconnect with fresh role |

### Restore without an active room

If nobody has the document open, `POST .../restore` still returns the mergeable Yjs update to the client **and** persists the merged state as a manual snapshot in PostgreSQL so the next session hydrates correctly.

## Testing

See [`tests/README.md`](../tests/README.md).

- **Vitest** — CRDT merge determinism, non-destructive restore, offline-reconnect simulation (no DB).
- **Playwright** — two-browser-context live sync, offline/reconnect, and viewer write-blocking (requires PostgreSQL).
- **Backend Vitest** — WebSocket payload validation and rate limiter unit tests in `backend/`.
