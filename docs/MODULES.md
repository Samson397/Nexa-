# Modules

Product modules in `@nexa/web`: App Router pages under `src/app/(app)/` and Route Handlers under `src/app/api/`. Navigation is defined in `src/config/navigation.ts`.

## Map

| Module | UI route | Primary APIs | Package / data |
|--------|----------|--------------|----------------|
| Landing | `/` | — | Marketing entry |
| Auth | `/login`, `/signup` | `/api/auth/login`, `/api/auth/signup`, `/api/auth/oauth`, MFA + passkey routes | Supabase Auth |
| Dashboard | `/dashboard` | — (aggregates client-side) | Briefing widgets |
| AI Chat | `/chat`, `/chat/[id]` | `POST /api/chat`, conversations APIs | `@nexa/ai`, conversations |
| AI Employees | `/employees`, `/employees/[role]` | `GET/POST /api/agents` | `@nexa/ai` agent defs |
| Knowledge | `/knowledge` | `POST /api/knowledge/upload`, `POST /api/knowledge/search` | `knowledge_*` + pgvector |
| Memory (API) | — | `POST /api/memory/store`, `POST /api/memory/search` | `memories` + pgvector |
| Tasks | `/tasks` | `GET/POST /api/tasks`, `PATCH /api/tasks/[id]` | `tasks` / demo store |
| Calendar | `/calendar` | `GET/POST /api/calendar` | `calendar_events` |
| Notes | `/notes` | `GET/POST /api/notes`, `GET/PATCH/DELETE /api/notes/[id]`, `POST …/summarize` | `notes` |
| Files | `/files` | `GET /api/files` | devices + storage integrations |
| Email | `/email` | `GET /api/email`, `POST /api/email/draft` | integrations |
| Automations | `/automations` | `GET/POST /api/automations`, `POST …/[id]/run`, `POST …/[id]/approve` | `automations` / runs |
| Integrations | `/integrations` | `GET /api/integrations`, `POST …/connect`, `GET …/callback` | `integrations` |
| Devices | `/devices` | `GET/POST /api/devices` | `devices` + `approvedPaths` |
| Settings | `/settings` | MFA/passkey under `/api/auth/*` | profiles / prefs |
| Health | — | `GET /api/health` | Ops probe |

## Module details

### Dashboard (`/dashboard`)

Daily briefing surface: workspace snapshot widgets (`components/dashboard/widgets.tsx`). First stop after auth (or demo entry).

### AI Chat (`/chat`)

Streaming conversations via Vercel AI SDK (`POST /api/chat`).

- Optional `agentRole` loads system prompt + default provider/model from `@nexa/ai`.
- Agent tools from `lib/ai/tools.ts` attach when permissions allow.
- Without AI API keys, returns a mock stream for demo UX.
- UI persists `conversationId` from `X-Conversation-Id`.
- Rate-limited; body validated by `chatRequestSchema`.

### AI Employees (`/employees`)

Twelve specialized agents defined in `packages/ai/src/agents/index.ts`:

| Role | Focus |
|------|--------|
| `ceo` | Strategy, OKRs, briefings |
| `coo` | Operations, execution |
| `project_manager` | Plans, timelines, status |
| `developer` | Code, design, GitHub tools |
| `designer` | UX/UI guidance |
| `finance_manager` | Budget/forecast (no unpaid charges) |
| `marketing_manager` | Campaigns (approval before publish) |
| `customer_support` | Triage / draft replies |
| `legal_assistant` | Doc review (not legal advice) |
| `research_assistant` | Synthesis + citations |
| `social_media_manager` | Drafts/calendars (approval before publish) |
| `sales_manager` | Pipeline / outreach drafts |

UI: list at `/employees`, detail at `/employees/[role]`. API: `/api/agents`.

### Knowledge (`/knowledge`)

Upload and semantic search over workspace documents.

- `POST /api/knowledge/upload` — ingest + index pipeline entry
- `POST /api/knowledge/search` — similarity search over chunks

### Memory (API-only)

Long-term agent/user memory with embeddings.

- `POST /api/memory/store`
- `POST /api/memory/search`

Consumed by chat/agent flows; not a top-level nav item.

### Tasks (`/tasks`)

Projects and task board UI backed by `GET/POST /api/tasks` (demo store when no DB). Statuses: `todo`, `in_progress`, `review`, `done`, `cancelled`. Priorities: `low`, `medium`, `high`, `urgent`.

### Calendar (`/calendar`)

Schedule UI backed by `GET/POST /api/calendar`. External calendars connect through OAuth integrations (`google_calendar`, `outlook_calendar`, `apple_calendar`).

### Notes (`/notes`)

Capture, tags, AI summaries via `GET/POST /api/notes`, `PATCH /api/notes/[id]`, and `POST /api/notes/[id]/summarize`.

### Files (`/files`)

Cloud storage integrations and desktop path-bridged local files (`GET /api/files`). Desktop access must stay within device `approvedPaths`.

### Email (`/email`)

OAuth inboxes (`gmail`, `outlook`) via `GET /api/email`. Drafts via `POST /api/email/draft`; sending is a sensitive automation action requiring approval.

### Automations (`/automations`)

Workflow builder with `approval_mode` and per-step `requiresApproval`. Engine: `enqueueRun` → `approveRun` → `executeRun`. Sensitive runs gate on `POST /api/automations/[id]/approve`.

### Integrations (`/integrations`)

Catalog from `INTEGRATION_CATEGORIES` in `@nexa/shared`. Connect via OAuth only (`POST /api/integrations/connect` → redirect to `oauthUrl`).

### Devices (`/devices`)

Register web/desktop/mobile companions. Desktop registrations include `approvedPaths` and permission grants.

### Settings (`/settings`)

Profile, security (MFA/passkeys), default AI provider/model, workspace preferences.

## API surface (reference)

```
GET  /api/health

POST /api/auth/login
POST /api/auth/signup
POST /api/auth/oauth
POST /api/auth/mfa/enroll
POST /api/auth/mfa/verify
POST /api/auth/passkey/register-options
POST /api/auth/passkey/register-verify
POST /api/auth/passkey/login-options
POST /api/auth/passkey/login-verify

POST /api/chat
GET  /api/conversations
GET  /api/conversations/[id]/messages
GET  /api/agents
POST /api/agents

POST /api/knowledge/upload
POST /api/knowledge/search
POST /api/memory/store
POST /api/memory/search

GET  /api/tasks
POST /api/tasks
PATCH /api/tasks/[id]

GET  /api/notes
POST /api/notes
GET  /api/notes/[id]
PATCH /api/notes/[id]
DELETE /api/notes/[id]
POST /api/notes/[id]/summarize

GET  /api/calendar
POST /api/calendar
GET  /api/email
POST /api/email/draft
GET  /api/files

GET  /api/automations
POST /api/automations
POST /api/automations/[id]/run
POST /api/automations/[id]/approve

GET  /api/integrations
POST /api/integrations/connect
GET  /api/integrations/callback

GET  /api/devices
POST /api/devices
```

All mutating routes: Zod validation, rate limiting where applied, auth (or demo stub), sanitized errors. See [SECURITY.md](./SECURITY.md).

## Mobile nav

Primary bottom nav (`PRIMARY_MOBILE_NAV`): Dashboard, Chat, Employees, Tasks, Settings.
