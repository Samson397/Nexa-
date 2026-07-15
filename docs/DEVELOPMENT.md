# Development

Guide for extending NEXA: build phases, local workflow, and how to add agents or integrations.

## Prerequisites

- Node.js ≥ 20
- pnpm 10 (`packageManager` pinned in root `package.json`)
- Optional: Supabase project, Postgres with pgvector, AI provider API keys

## Local workflow

```bash
pnpm install
cp .env.example .env.local
pnpm dev                 # http://localhost:3000
pnpm typecheck
pnpm lint
pnpm build:web
```

Without credentials the app runs in **demo mode** (see root README). Use that for UI work; add Supabase + `DATABASE_URL` + AI keys when exercising real auth, persistence, and streaming models.

## Phase checklist

Matches the intended build sequence for the monorepo.

### Phase 0 — Monorepo foundation

- [x] pnpm workspaces + Turborepo
- [x] `packages/shared`, `packages/ai`, `packages/db`
- [x] `apps/web` Next.js App Router shell
- [x] `.env.example`, root scripts (`dev`, `db:*`, `build`)
- [ ] Scaffold `apps/desktop` and `apps/mobile` packages referenced by scripts

### Phase 1 — Auth & shell

- [x] Supabase SSR clients + middleware session refresh
- [x] Login / signup / OAuth routes
- [x] App shell, navigation, theme
- [x] Demo mode when Supabase unset
- [ ] Production MFA / WebAuthn enrollment end-to-end

### Phase 2 — RBAC & security primitives

- [x] Role permission matrix (`rbac.ts`)
- [x] AES-256-GCM encryption helpers
- [x] Audit logger + `audit_logs` schema
- [x] Rate limiting + Zod validators
- [ ] Persist audit rows to Postgres on every sensitive action
- [ ] Redis-backed rate limits for multi-instance

### Phase 3 — Chat & multi-provider AI

- [x] `@nexa/ai` providers (OpenAI, Anthropic, Gemini, DeepSeek, OpenRouter)
- [x] Streaming `POST /api/chat` + mock fallback
- [x] Conversation UI
- [ ] Durable conversation/message persistence to DB in all paths

### Phase 4 — AI employees

- [x] Twelve agent definitions + guardrails
- [x] Employees UI + `/api/agents`
- [ ] Tool runners wired per agent permissions
- [ ] Per-workspace agent customization CRUD on DB

### Phase 5 — Memory & knowledge (pgvector)

- [x] Schema: `memories`, `knowledge_documents`, `knowledge_chunks`
- [x] Store/search + upload/search API stubs
- [ ] Embedding pipeline (chunk → embed → upsert)
- [ ] HNSW/IVFFlat indexes in production

### Phase 6 — Work modules

- [x] Tasks UI + API (demo store)
- [x] Notes, calendar, files, email UI surfaces
- [ ] Full CRUD persistence for notes/calendar/files/email
- [ ] Email send path gated by automation approval

### Phase 7 — Integrations (OAuth only)

- [x] Connect/callback stubs; password rejection
- [x] Integration catalog in `@nexa/shared`
- [ ] Provider-specific authorize + token exchange
- [ ] Encrypted credential persistence + refresh

### Phase 8 — Automations

- [x] Automations UI + API + approve endpoint
- [x] Sensitive action catalog + approval modes
- [ ] Worker/executor that honors pending_approval
- [ ] Audit every approve/reject/run

### Phase 9 — Devices

- [x] Devices UI + register API with `approvedPaths`
- [ ] Desktop companion: path sandbox enforcement
- [ ] Mobile companion: push + OS permission respect
- [ ] Never request permission bypasses

### Phase 10 — Deploy

- [x] Deployment documentation (Vercel + Docker)
- [ ] Production env secrets / staging migration pipeline
- [ ] Health checks + observability dashboards

## Adding an AI employee (agent)

1. **Extend the role union** in `packages/shared/src/types.ts` (`AgentRole`, `AGENT_ROLES`).
2. **Define the agent** in `packages/ai/src/agents/index.ts`:
   - `name`, `description`, `personality`, `systemPrompt` (keep `baseGuardrails`)
   - `tools`, `permissions`, `defaultModel`, `defaultProvider`
3. **Export** remains via `AGENT_DEFINITIONS` / `listAgentDefinitions()`.
4. **UI** picks up new roles through `@nexa/ai` (`employees` list / `[role]` page).
5. **Optional:** map status in `apps/web/src/lib/employees.ts`.
6. **Validators:** `agentRoleSchema` is derived from `AGENT_ROLES` — keep that array in sync.
7. **Persist (production):** seed or upsert into `agents` table per workspace.

Rules for prompts:

- Never ask for third-party passwords.
- Require approval language for send/publish/charge.
- Do not instruct permission bypasses.
- Respect tenant isolation.

## Adding an integration

1. **Add provider id** to `IntegrationProvider` and the right `INTEGRATION_CATEGORIES` bucket in `packages/shared/src/types.ts`.
2. **Env:** add `*_CLIENT_ID` / `*_CLIENT_SECRET` to `.env.example` and deployment secrets.
3. **Connect flow** (`apps/web/src/app/api/integrations/connect/route.ts`):
   - Keep password-field rejection.
   - Build real authorize URL + CSRF `state`.
4. **Callback** (`…/callback/route.ts`): exchange code, **encrypt** tokens, store on `integrations`.
5. **UI:** surface the provider on `/integrations`.
6. **Scopes:** request least privilege; persist granted scopes.
7. **Agent tools:** if an employee needs the integration, add a tool name to the agent and implement a runner that uses decrypted tokens server-side only.

Never accept username/password for third-party accounts.

## Adding an API route

1. Create `apps/web/src/app/api/<resource>/route.ts`.
2. Set `runtime = "nodejs"` when using crypto, DB, or Node APIs.
3. Apply `rateLimitByIp` → `requireAuth` → `parseBody(schema)`.
4. Scope queries by `workspaceId` / `userId`.
5. Call `audit(...)` for sensitive mutations.
6. Return `jsonOk` / `jsonError`; never leak stacks or secrets.
7. Document the route in [MODULES.md](./MODULES.md).

## Package boundaries

| Change | Package |
|--------|---------|
| Shared types / catalogs | `@nexa/shared` |
| Models / agents | `@nexa/ai` |
| Tables / migrations | `@nexa/db` |
| UI / Route Handlers / middleware | `@nexa/web` |

Prefer importing `@nexa/*` over duplicating types across apps.

## Desktop & mobile (planned)

Root scripts already reference:

```bash
pnpm desktop:dev   # @nexa/desktop
pnpm mobile:dev    # @nexa/mobile
```

When implementing:

- Desktop: enforce `approvedPaths` on every FS call; audit `desktop.action`.
- Mobile: use platform permission APIs; audit `mobile.action`.
- Both: OAuth tokens remain on the server; companions use NEXA session auth only.

## Next.js notes

This repo uses **Next.js 16**. Follow `apps/web/AGENTS.md` / `apps/web/CLAUDE.md` and the installed Next docs under `node_modules/next/dist/docs/` before relying on older App Router assumptions.
