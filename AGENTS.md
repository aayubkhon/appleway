# AGENTS.md — Appleway (debt ledger mobile app)

## Product
Mobile app for small sellers to track customers, sales on credit (nasiya), payments, and overdue debts.
Multi-user: every user sees ONLY their own data. Public release on Google Play and App Store.
UI language: Uzbek (Latin). Default currency USD, per-record currency allowed later.

## Stack
- Mobile: Expo (React Native) + TypeScript, expo-router, TanStack Query, expo-secure-store
- Backend: NestJS + TypeScript, Prisma, PostgreSQL 16
- Auth: phone/email + password, JWT access (15m) + refresh (30d, rotating, stored hashed)
- Infra: Docker Compose, Caddy (auto HTTPS), Hetzner VPS, GitHub Actions
- Builds: EAS Build / EAS Submit

## Repo layout
- apps/api — NestJS
- apps/mobile — Expo app
- packages/shared — shared TS types / zod schemas
- infra/ — docker-compose.prod.yml, Caddyfile, backup script
- docs/ — ERD, API notes, store checklist

## Commands
- api: `pnpm --filter api dev | test | lint | build`, `pnpm --filter api prisma migrate dev`
- mobile: `pnpm --filter mobile start | lint | test`
- all: `pnpm lint && pnpm test` must pass before every commit

## Domain rules (do not change without asking)
- Money is stored as integer minor units (cents), never float.
- Debt status is computed server-side, never trusted from client:
  - PAID: remaining = 0
  - OVERDUE (Kechikkan): remaining > 0 and due_date < today
  - DUE_TODAY (Bugun): remaining > 0 and due_date = today
  - UPCOMING: remaining > 0 and due_date > today
- Remaining = amount - sum(payments). Payments are append-only; corrections are new rows.
- "Today" uses the user's timezone (default Asia/Tashkent).
- Every query is scoped by owner_id. No endpoint returns another user's rows.

## Code rules
- TypeScript strict, no `any`. Validate all input with DTO/zod.
- Small functions, pure business logic separated from Nest/Prisma so it is unit-testable.
- Every new endpoint gets a test. Every migration is committed.
- No new dependency without a one-line reason in the commit body.
- Never log passwords, tokens, or phone numbers.

## Security
- Secrets only via env vars. Never commit `.env*` (except `.env.example`), keystores, `*.p8`, `google-services.json` with secrets, `uploads/`, build output.
- Rate-limit auth endpoints. Hash passwords with argon2.
- Provide account deletion (required by Apple) and data export.

## Git discipline
- Small atomic commits, one logical change each.
- Message: `feat:` / `fix:` / `refactor:` / `chore:` prefix, then short lowercase imperative (e.g. `feat: add debt status calculator`, `fix: overdue filter off by one day`).
- NEVER mention AI in commits or PRs: no Co-Authored-By, no "Generated with", no emoji, no tool signatures or trailers.
- Lint and tests pass before commit. Maintain `.gitignore` from the first commit.
- Never `git push --force`, rewrite history, or amend pushed commits.

## Workflow
Work in phases. After each phase: run lint+tests, summarize what changed in 3-5 lines, stop and wait for review.
