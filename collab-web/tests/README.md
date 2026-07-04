# Tests

## Unit & integration (Vitest)

```bash
npm test          # run once
npm run test:watch
```

| Suite | File | What it covers |
|-------|------|----------------|
| CRDT determinism | `tests/unit/yjs/crdt-determinism.test.ts` | Merge order independence, concurrent offline edits |
| Restore | `tests/unit/yjs/restore.test.ts` | AAA/BBB restore, ancestor empty update, merge with peer |
| Offline reconnect | `tests/integration/offline-reconnect.test.ts` | Yjs update replay after simulated disconnect |

No database or network required for Vitest tests.

## End-to-end (Playwright)

**Prerequisites**

- PostgreSQL running with migrations applied (`DATABASE_URL` in `.env`)
- Playwright Chromium: `npx playwright install chromium`

Playwright starts the Next.js app and WebSocket server automatically (or reuses existing dev servers locally).

```bash
npm run test:e2e
npm run test:e2e:ui   # interactive debugger
```

| Spec | What it covers |
|------|----------------|
| `e2e/two-client-sync.spec.ts` | Two browser contexts on one document; live sync + offline/reconnect |

E2e tests skip automatically when `DATABASE_URL` is unset or PostgreSQL is unreachable.

**Env notes**

- Playwright uses `127.0.0.1` by default (override with `PLAYWRIGHT_HOST`) so session cookies align with `NEXTAUTH_URL`.
- Test fallbacks apply for `NEXTAUTH_SECRET` and `WS_INTERNAL_SECRET` when unset; both app and WS server receive matching values.
