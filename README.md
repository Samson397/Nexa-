# NEXA

**NEXA** is an AI Operating System — a digital life hub that unifies chat, specialized AI employees, knowledge, tasks, calendar, notes, email, files, automations, and third-party integrations under one secure workspace.

NEXA is built toward **TWEEN**: an extensible AI OS vision where agents, tools, and devices compose into a personal operating layer for work and life.

## Monorepo structure

```
nexa/
├── apps/
│   ├── web/          # Next.js product UI + API routes (primary app)
│   ├── desktop/      # Electron companion (path-sandboxed local bridge)
│   └── mobile/       # Expo iOS/Android companion
├── packages/
│   ├── ai/           # @nexa/ai — providers, agent definitions
│   ├── db/           # @nexa/db — Drizzle schema, migrations, client
│   └── shared/       # @nexa/shared — types, constants, utilities
├── docker/           # Container build assets
├── docs/             # Architecture, security, database, modules, ops
├── .env.example
├── package.json
├── pnpm-workspace.yaml
└── turbo.json
```

| Path | Package | Role |
|------|---------|------|
| `apps/web` | `@nexa/web` | App Router UI, Route Handlers, auth middleware |
| `apps/desktop` | `@nexa/desktop` | Local file/OS bridge (approved paths only) |
| `apps/mobile` | `@nexa/mobile` | iOS/Android companion |
| `packages/ai` | `@nexa/ai` | Multi-provider models + AI employee definitions |
| `packages/db` | `@nexa/db` | PostgreSQL + pgvector schema via Drizzle |
| `packages/shared` | `@nexa/shared` | Shared TypeScript types and domain constants |

## Tech stack

- **Runtime:** Node.js 20+, pnpm workspaces, Turborepo
- **Web:** Next.js 16 (App Router), React 19, Tailwind CSS 4, Radix UI, Framer Motion
- **Auth:** Supabase Auth (email, OAuth, WebAuthn/passkeys planned)
- **Data:** PostgreSQL, Drizzle ORM, pgvector embeddings
- **AI:** Vercel AI SDK — OpenAI, Anthropic, Gemini, DeepSeek, OpenRouter
- **Validation:** Zod on all untrusted API input
- **Deploy:** Vercel (web) + Docker (self-host)

## Quick start

```bash
# 1. Install
pnpm install

# 2. Environment
cp .env.example .env.local
# Fill Supabase, DATABASE_URL, ENCRYPTION_KEY, and optional AI keys

# 3. Database (when DATABASE_URL is set)
# Enable the pgvector extension in Supabase/Postgres, then:
pnpm db:generate
pnpm db:migrate

# 4. Develop
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000).

### Supabase notes

1. Create a project at [supabase.com](https://supabase.com).
2. Copy **Project URL** and **anon key** into `NEXT_PUBLIC_SUPABASE_*`.
3. Set `SUPABASE_SERVICE_ROLE_KEY` server-side only (never expose to the client).
4. Use the Postgres connection string as `DATABASE_URL`.
5. Enable Auth providers (Google, GitHub, Apple) in the Supabase dashboard when needed.
6. Enable the **pgvector** extension for memory and knowledge search.

Generate an encryption key for OAuth tokens at rest:

```bash
openssl rand -hex 32
```

## Demo mode (no credentials)

NEXA runs without Supabase or AI API keys:

- Missing `NEXT_PUBLIC_SUPABASE_URL` / `NEXT_PUBLIC_SUPABASE_ANON_KEY` (or `DEMO_MODE=true`) opens the full UI without login redirects.
- APIs use an in-memory demo store (`apps/web/src/lib/demo-store.ts`); data resets on process restart.
- Chat streams a mock reply when no AI provider keys are configured.
- Integrations use OAuth stubs only — third-party passwords are never accepted.

Demo mode is for local exploration only. Do not use it in production.

## Security principles

| Principle | Practice |
|-----------|----------|
| OAuth only for third parties | Never collect or store third-party account passwords |
| RBAC | Workspace roles: `owner` › `admin` › `member` › `viewer` |
| Sensitive automation approval | Actions like send/publish/charge require explicit user approval |
| Desktop path sandboxing | Local file access limited to `approvedPaths` |
| OS permission respect | Never bypass browser, OS, or device permission boundaries |
| Encrypted tokens | Integration credentials encrypted at rest (AES-256-GCM) |
| Audit + rate limits | Structured audit events; per-route IP rate limiting |

Details: [docs/SECURITY.md](docs/SECURITY.md).

## Module overview

| Module | Route | Purpose |
|--------|-------|---------|
| Dashboard | `/dashboard` | Daily briefing and workspace overview |
| AI Chat | `/chat` | Multi-provider conversations + streaming |
| AI Employees | `/employees` | Specialized agents (CEO, Dev, Support, …) |
| Knowledge | `/knowledge` | Document upload + vector retrieval |
| Tasks | `/tasks` | Projects, priorities, execution |
| Calendar | `/calendar` | Schedule + connected calendars |
| Notes | `/notes` | Capture, tags, AI summaries |
| Files | `/files` | Cloud drives + desktop bridge |
| Email | `/email` | OAuth inboxes + AI drafts |
| Automations | `/automations` | Workflows with approval gates |
| Integrations | `/integrations` | Connect tools via OAuth |
| Devices | `/devices` | Desktop/mobile companions |
| Settings | `/settings` | Profile, security, AI providers |

Full mapping: [docs/MODULES.md](docs/MODULES.md).

## Deployment

**Vercel:** connect the repo, set root to the monorepo, build `@nexa/web`, configure env vars from `.env.example`.

**Docker:** use assets under `docker/` for self-hosted web + Postgres (with pgvector).

See [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md).

## Documentation

| Doc | Contents |
|-----|----------|
| [Architecture](docs/ARCHITECTURE.md) | System diagrams, packages, data flow, AI, memory |
| [Security](docs/SECURITY.md) | Auth, RBAC, encryption, audit, hardening |
| [Database](docs/DATABASE.md) | Schema, pgvector, Drizzle migrations |
| [Modules](docs/MODULES.md) | Product modules ↔ routes/APIs |
| [Development](docs/DEVELOPMENT.md) | Phase checklist, agents, integrations |
| [Deployment](docs/DEPLOYMENT.md) | Vercel, Docker, environment variables |
| [Web app](apps/web/README.md) | `@nexa/web` specifics |

## Scripts

```bash
pnpm dev              # Start web (Next.js)
pnpm build            # Build all packages
pnpm build:web        # Build web only
pnpm lint             # Lint workspace
pnpm typecheck        # TypeScript across packages
pnpm db:generate      # Generate Drizzle migrations
pnpm db:migrate       # Apply migrations
pnpm db:studio        # Drizzle Studio
pnpm desktop:dev      # Desktop companion (when present)
pnpm mobile:dev       # Mobile companion (when present)
```

## License

Private — all rights reserved.
