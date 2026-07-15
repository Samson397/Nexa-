# @nexa/web

Next.js App Router application for **NEXA** — UI, middleware, and Route Handlers for the AI Operating System.

## Stack

- Next.js 16, React 19, TypeScript
- Tailwind CSS 4, Radix UI, Framer Motion
- Supabase Auth (SSR)
- Vercel AI SDK (streaming chat)
- Workspace packages: `@nexa/ai`, `@nexa/db`, `@nexa/shared`

## Commands

From repo root:

```bash
pnpm --filter @nexa/web dev
pnpm --filter @nexa/web build
pnpm --filter @nexa/web start
pnpm --filter @nexa/web lint
pnpm --filter @nexa/web typecheck
```

Or `pnpm dev` / `pnpm build:web` from the monorepo root.

## Layout

```
src/
├── app/
│   ├── (auth)/          # /login, /signup
│   ├── (app)/           # Product modules (dashboard, chat, …)
│   ├── api/             # Route Handlers
│   ├── layout.tsx
│   ├── globals.css
│   └── page.tsx         # Landing
├── components/          # Shell, chat, dashboard, UI kit
├── config/navigation.ts
├── lib/                 # api, rbac, encryption, audit, env, supabase, validators, demo-store
└── middleware.ts        # Session refresh + auth gates
```

## Demo mode

Runs automatically when Supabase public env vars are missing, or when `DEMO_MODE=true`:

- Product routes are not redirected to login.
- APIs may use `demo-store` and auth stubs.
- Chat mock-streams without provider keys.

Do not enable demo stubs in production.

## Key libraries (local)

| File | Role |
|------|------|
| `lib/api.ts` | `jsonOk` / `jsonError`, `parseBody`, `requireAuth`, rate-limit helpers |
| `lib/rbac.ts` | Workspace permission checks |
| `lib/encryption.ts` | AES-256-GCM for integration tokens |
| `lib/validators.ts` | Zod schemas for Route Handlers |
| `lib/supabase/*` | Browser, server, middleware clients |
| `lib/demo-store.ts` | Ephemeral persistence without DB |

## Environment

Copy root `.env.example` to `.env.local`. Validated helpers: `lib/env.ts` (`getPublicEnv`, `getServerEnv`).

Minimum for full local production-like run:

- `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`, `DATABASE_URL`
- `ENCRYPTION_KEY`
- At least one of `OPENAI_API_KEY` / `ANTHROPIC_API_KEY` / …

## Module routes

See [docs/MODULES.md](../../docs/MODULES.md) for the full UI ↔ API map.

## Next.js version note

This is Next.js 16 — conventions may differ from older versions. Read `AGENTS.md` and the package docs under `node_modules/next/dist/docs/` before non-trivial framework changes.

## Docs

- [Root README](../../README.md)
- [Architecture](../../docs/ARCHITECTURE.md)
- [Security](../../docs/SECURITY.md)
- [Development](../../docs/DEVELOPMENT.md)
- [Deployment](../../docs/DEPLOYMENT.md)
