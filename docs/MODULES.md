# Modules

Product modules in `@nexa/web`: App Router pages under `src/app/(app)/` and Route Handlers under `src/app/api/`. Navigation is defined in `src/config/navigation.ts`.

## Map

| Module | UI route | Primary APIs | Package / data |
|--------|----------|--------------|----------------|
| Landing | `/` | — | Marketing entry |
| Auth | `/login`, `/signup` | `/api/auth/login`, `/api/auth/signup`, `/api/auth/oauth` | Supabase Auth |
| Dashboard | `/dashboard` | — (aggregates client-side) | Briefing widgets |
| AI Chat | `/chat`, `/chat/[id]` | `POST /api/chat` | `@nexa/ai`, conversations |
| AI Employees | `/employees`, `/employees/[role]` | `GET/POST /api/agents` | `@nexa/ai` agent defs |
| Knowledge | `/knowledge` | `POST /api/knowledge/upload`, `POST /api/knowledge/search` | `knowledge_*` + pgvector |
| Memory (API) | — | `POST /api/memory/store`, `POST /api/memory/search` | `memories` + pgvector |
| Tasks | `/tasks` | `GET/POST /api/tasks` | `tasks` / demo store |
| Calendar | `/calendar` | — (UI; sync via integrations) | `calendar_events` |
| Notes | `/notes` | — (UI) | `notes` |
| Files | `/files` | — (UI; desktop bridge / storage OAuth) | devices + storage integrations |
| Email | `/email` | — (UI; Gmail/Outlook OAuth) | integrations |
| Automations | `/automations` | `GET/POST /api/automations`, `POST /api/automations/[id]/approve` | `automations` / runs |
| Integrations | `/integrations` | `POST /api/integrations/connect`, `GET /api/integrations/callback` | `integrations` |
| Devices | `/devices` | `GET/POST /api/devices` | `devices` + `approvedPaths` |
| Settings | `/settings` | — (UI; providers, security) | profiles / prefs |
| Health | — | `GET /api/health` | Ops probe |

## Module details

### Dashboard (`/dashboard`)

Daily briefing surface: workspace snapshot widgets (`components/dashboard/widgets.tsx`). First stop after auth (or demo entry).

### AI Chat (`/chat`)

Streaming conversations via Vercel AI SDK (`POST /api/chat`).

- Optional `agentRole` loads system prompt + default provider/model from `@nexa/ai`.
- Without AI API keys, returns a mock stream for demo UX.
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

Schedule UI; external calendars connect through OAuth integrations (`google_calendar`, `outlook_calendar`, `apple_calendar`).

### Notes (`/notes`)

Capture, tags, AI summaries. Persisted in `notes` / `note_folders` when DB is wired.

### Files (`/files`)

Cloud storage integrations and desktop path-bridged local files. Desktop access must stay within device `approvedPaths`.

### Email (`/email`)

OAuth inboxes (`gmail`, `outlook`). AI drafts allowed; sending is a sensitive automation action requiring approval.

### Automations (`/automations`)

Workflow builder with `approval_mode` and per-step `requiresApproval`. Sensitive runs gate on `POST /api/automations/[id]/approve`.

### Integrations (`/integrations`)

Catalog from `INTEGRATION_CATEGORIES` in `@nexa/shared` (productivity, communication, development, payments, commerce, social, storage, email, calendar). Connect via OAuth only.

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
POST /api/chat
GET  /api/agents
POST /api/agents
POST /api/knowledge/upload
POST /api/knowledge/search
POST /api/memory/store
POST /api/memory/search
GET  /api/tasks
POST /api/tasks
GET  /api/automations
POST /api/automations
POST /api/automations/[id]/approve
POST /api/integrations/connect
GET  /api/integrations/callback
GET  /api/devices
POST /api/devices
```

All mutating routes: Zod validation, rate limiting where applied, auth (or demo stub), sanitized errors. See [SECURITY.md](./SECURITY.md).

## Mobile nav

Primary bottom nav (`PRIMARY_MOBILE_NAV`): Dashboard, Chat, Employees, Tasks, Settings.
