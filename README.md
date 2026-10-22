# Appleway

Debt and credit ledger for small sellers: customers, sales on credit (nasiya),
payments and overdue debts. Uzbek (Latin) interface, dark theme first.

Every user sees only their own data.

## Layout

| Path              | What it is                                      |
| ----------------- | ----------------------------------------------- |
| `apps/api`        | NestJS + Prisma + PostgreSQL api                |
| `apps/mobile`     | Expo (React Native) app                         |
| `packages/shared` | Types, zod schemas and pure domain logic shared by both |
| `infra/`          | Production compose, Caddy, backups (later phase) |
| `docs/`           | ERD, API notes, store checklist                 |

## Requirements

- Node 24.22.1 (`nvm use`, see `.nvmrc`) — Expo SDK 58 does not run on Node 20
- pnpm 12.15.0
- Docker with Compose

## Test setup (current mode)

The api and Postgres run in Docker on your computer; the app runs on your phone
and reaches the api over your LAN.

```bash
cp .env.example .env            # defaults are fine for local work
pnpm install
docker compose up --build       # api on http://localhost:3000, Postgres on 5432
curl http://localhost:3000/health
```

Then point the app at your computer and start it:

```bash
ipconfig getifaddr en0                              # your LAN IP
echo "EXPO_PUBLIC_API_URL=http://<that-ip>:3000" > apps/mobile/.env
pnpm --filter mobile start                          # scan the QR code
```

Phone and computer must be on the same Wi-Fi. `EXPO_PUBLIC_*` values are
compiled into the app, so never put a secret in one.

### Working on the api without Docker

```bash
pnpm dev:db                     # Postgres only
pnpm --filter api dev           # api on the host, watching for changes
```

## Checks

```bash
pnpm lint        # every package
pnpm test        # every package
pnpm typecheck
pnpm check       # all three
```

The api's end-to-end test needs a running Postgres:

```bash
pnpm dev:db && pnpm --filter api test:e2e
```

## Money, dates and status

- Amounts are whole minor units (cents). No floating point math anywhere.
- Debt status is computed on the server: `PAID`, `OVERDUE`, `DUE_TODAY`,
  `UPCOMING`. The client never decides it.
- "Today" follows the user's timezone, `Asia/Tashkent` by default.
