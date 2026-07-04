# Collab — Local-First Document Editor

Real-time collaborative documents with offline editing, CRDT-based conflict resolution, role-based access, and non-destructive version history.

Built with Next.js 16, Yjs, Tiptap v2, PostgreSQL, and a standalone WebSocket sync server.

## Repository layout

| Path | Description |
|------|-------------|
| [`collab-web/`](./collab-web/) | Next.js app (UI, REST API, Prisma, Vitest, Playwright) |
| [`backend/`](./backend/) | Standalone WebSocket sync server |
| [`docs/`](./docs/) | Architecture and deployment guides |

## Features

- **Local-first editing** — Yjs + IndexedDB; open, edit, and close offline without blocking on network
- **Live collaboration** — presence, cursors, and CRDT merge across tabs and users
- **Version history** — manual and automatic snapshots; restore applies a new update on top of live state
- **Roles** — Owner / Editor / Viewer enforced at API and WebSocket layers
- **AI summaries** — optional change descriptions for snapshot timeline (Groq)

## Stack

| Layer | Technology |
|-------|------------|
| UI + API | Next.js 16 (App Router), React, Tailwind, shadcn/ui |
| Auth | Auth.js (NextAuth) |
| Database | PostgreSQL + Prisma |
| CRDT | Yjs, y-indexeddb, y-websocket |
| Sync server | Standalone Node.js WebSocket server in `backend/` |
| Tests | Vitest, Playwright |

## Quick start

### Prerequisites

- Node.js 20+
- PostgreSQL

### Setup

```bash
git clone <your-repo-url>
cd collab-doc-editor

# Collab Web app
cd collab-web
cp .env.example .env
# Edit .env — DATABASE_URL, NEXTAUTH_SECRET, WS_INTERNAL_SECRET
npm install
npx prisma db push
npm run dev

# Backend (second terminal)
cd ../backend
cp .env.example .env   # same DATABASE_URL + NEXTAUTH_SECRET
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). The WebSocket server listens on [ws://localhost:1234](ws://localhost:1234) by default.

## Scripts (collab-web)

Run from `collab-web/`:

| Command | Description |
|---------|-------------|
| `npm run dev` | Next.js dev server (port 3000) |
| `npm run build` | Production build |
| `npm run start` | Start production Next.js server |
| `npm run lint` | ESLint |
| `npm test` | Vitest (unit + integration, no DB) |
| `npm run test:e2e` | Playwright (requires PostgreSQL + `DATABASE_URL`) |
| `npm run db:generate` | Generate Prisma client |
| `npm run db:push` | Push schema to database |

Backend (`cd backend`): `npm run dev`, `npm run build`, `npm start`.

## Environment variables

See [`collab-web/.env.example`](./collab-web/.env.example) and [`backend/.env.example`](./backend/.env.example).

Key values:

- `DATABASE_URL` — shared by Next.js and WS server
- `NEXTAUTH_SECRET` — must match on both services
- `NEXT_PUBLIC_WS_URL` — browser WebSocket URL (`ws://` locally, `wss://` in production)
- `WS_SERVER_HTTP_URL` — Next.js → WS server internal HTTP
- `WS_INTERNAL_SECRET` — protects internal snapshot/restore/disconnect routes

## Documentation

- [Architecture](./docs/ARCHITECTURE.md) — system design, CRDT rules, roles, internal APIs
- [Deployment](./docs/DEPLOYMENT.md) — Vercel + Railway/Render, env wiring, CI
- [WebSocket server](./backend/README.md) — protocol, security, health check
- [Tests](./collab-web/tests/README.md) — Vitest and Playwright setup

## CI

GitHub Actions (`.github/workflows/ci.yml`) runs lint, Vitest, production builds, and Playwright e2e against a Postgres service container on every push/PR to `main`. All collab-web commands run from `collab-web/`; the backend is built from `backend/`.

## Deployment

Production is split: **Vercel** (`collab-web/` root directory) for the Next.js app, **Railway or Render** (`backend/` root directory) for the WebSocket server, plus managed **PostgreSQL**.

Full step-by-step guide: **[docs/DEPLOYMENT.md](./docs/DEPLOYMENT.md)**.

---

<p align="center">
  Built by <strong>Your Name</strong><br />
  <a href="https://github.com/your-username">GitHub</a>
  ·
  <a href="https://linkedin.com/in/your-profile">LinkedIn</a>
</p>
