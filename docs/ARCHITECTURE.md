# Architecture

NEXA is a pnpm monorepo. The **web app** hosts the product UI and API. Shared domain logic lives in `packages/*`. Desktop and mobile companions bridge local devices under explicit permission constraints.

NEXA targets the **TWEEN** vision of an extensible AI operating system; the current architecture is the secure foundation for that composition model.

## System overview

```mermaid
flowchart TB
  subgraph Clients
    Web["apps/web<br/>Next.js UI"]
    Desktop["apps/desktop<br/>Local companion"]
    Mobile["apps/mobile<br/>Expo companion"]
  end

  subgraph Edge["apps/web — Next.js"]
    MW["Middleware<br/>session + route guards"]
    Pages["App Router pages"]
    API["Route Handlers /api/*"]
  end

  subgraph Packages
    AI["@nexa/ai<br/>providers + agents"]
    DB["@nexa/db<br/>Drizzle + schema"]
    Shared["@nexa/shared<br/>types + constants"]
  end

  subgraph External
    Supabase["Supabase Auth"]
    PG["PostgreSQL + pgvector"]
    Providers["AI providers<br/>OpenAI · Anthropic · Gemini · DeepSeek · OpenRouter"]
    OAuth["Third-party OAuth<br/>Slack · Notion · Gmail · …"]
  end

  Web --> MW
  Desktop --> API
  Mobile --> API
  MW --> Pages
  MW --> API
  Pages --> API
  API --> AI
  API --> DB
  API --> Shared
  AI --> Providers
  DB --> PG
  API --> Supabase
  API --> OAuth
```

## Package responsibilities

| Package | Responsibility |
|---------|----------------|
| `@nexa/web` | UI shells, middleware, Route Handlers, validation, encryption helpers, RBAC, audit, rate limits, demo store |
| `@nexa/ai` | `getLanguageModel()`, default models, `AGENT_DEFINITIONS` / guardrails |
| `@nexa/db` | Drizzle schema (profiles, workspaces, chat, memory, knowledge, tasks, integrations, automations, devices, audit), `createDb()` |
| `@nexa/shared` | `UserRole`, `AiProvider`, `AgentRole`, integration catalogs, `SENSITIVE_AUTOMATION_ACTIONS`, shared error types |

Workspace wiring: `pnpm-workspace.yaml` → `apps/*`, `packages/*`. Orchestration: Turborepo (`turbo.json`).

## Request path (authenticated)

```mermaid
sequenceDiagram
  participant Browser
  participant Middleware
  participant Page as App Router page
  participant API as Route Handler
  participant Auth as Supabase Auth
  participant DB as @nexa/db
  participant LLM as AI provider

  Browser->>Middleware: Request
  Middleware->>Auth: Refresh session cookies
  alt Demo mode (no Supabase / DEMO_MODE)
    Middleware-->>Browser: Allow product routes
  else Protected route, no user
    Middleware-->>Browser: Redirect /login
  else Authenticated
    Middleware-->>Page: Continue
  end
  Page->>API: fetch /api/...
  API->>API: rateLimit + Zod parseBody
  API->>Auth: requireAuth (or demo stub)
  API->>DB: Tenant-scoped query
  opt Chat / agent
    API->>LLM: streamText via @nexa/ai
    LLM-->>API: Token stream
  end
  API-->>Browser: JSON or SSE stream
```

## Data flow: chat + memory + knowledge

```mermaid
flowchart LR
  User["User message"] --> ChatAPI["POST /api/chat"]
  ChatAPI --> Agent["Agent system prompt<br/>@nexa/ai"]
  ChatAPI --> MemSearch["POST /api/memory/search"]
  ChatAPI --> KbSearch["POST /api/knowledge/search"]
  MemSearch --> Vectors["pgvector<br/>memories.embedding"]
  KbSearch --> Chunks["pgvector<br/>knowledge_chunks.embedding"]
  Vectors --> Context["Retrieved context"]
  Chunks --> Context
  Context --> ChatAPI
  Agent --> Model["Language model"]
  ChatAPI --> Model
  Model --> Reply["Streamed assistant reply"]
  Reply --> MemStore["POST /api/memory/store<br/>(optional persist)"]
  MemStore --> Vectors
```

Embeddings use **1536 dimensions** (OpenAI-compatible default). When `DATABASE_URL` is unset, memory routes fall back to the in-process demo store (no vectors).

## AI provider resolution

```mermaid
flowchart TD
  Req["Chat / agent request"] --> Role{"agentRole set?"}
  Role -->|yes| Def["AGENT_DEFINITIONS[role]<br/>defaultProvider + defaultModel + systemPrompt"]
  Role -->|no| Explicit["Request provider/model<br/>or env defaults"]
  Def --> Keys{"Any AI API key?"}
  Explicit --> Keys
  Keys -->|no| Mock["Mock stream (demo)"]
  Keys -->|yes| GLM["getLanguageModel(provider, model)"]
  GLM --> OpenAI["openai"]
  GLM --> Anthropic["anthropic"]
  GLM --> Gemini["gemini"]
  GLM --> DeepSeek["deepseek<br/>OpenAI-compatible"]
  GLM --> OpenRouter["openrouter<br/>OpenAI-compatible"]
```

Defaults live in `packages/ai/src/providers/index.ts` (`DEFAULT_MODELS`) and `.env.example` (`DEFAULT_AI_PROVIDER`, `DEFAULT_AI_MODEL`).

## Tenancy model

All product tables are scoped by `userId` and/or `workspaceId`:

- **Profile** ↔ Supabase user (`supabaseUserId`)
- **Workspace** owned by a profile; members carry a `user_role`
- Conversations, agents, knowledge, tasks, notes, calendar, integrations, and automations belong to a workspace
- **Devices** belong to a user; desktop devices carry `approvedPaths`
- **Audit logs** record workspace/user, action, resource, IP, user agent

RBAC enforcement: `apps/web/src/lib/rbac.ts` (`Permission` matrix by role).

## Automation approval flow

```mermaid
stateDiagram-v2
  [*] --> Triggered
  Triggered --> PendingApproval: sensitive step / approvalMode
  Triggered --> Running: non-sensitive + allowed
  PendingApproval --> Approved: POST /api/automations/:id/approve
  PendingApproval --> Rejected: user reject
  Approved --> Running
  Running --> Succeeded
  Running --> Failed
  Rejected --> [*]
  Succeeded --> [*]
  Failed --> [*]
```

Sensitive action catalog (`@nexa/shared`): `send_message`, `publish_content`, `modify_data`, `delete_data`, `charge_payment`, `send_email`.

## Demo vs production paths

| Concern | Demo | Production |
|---------|------|------------|
| Auth | Open routes; optional `x-nexa-demo-user` / stub bearer | Supabase session cookies |
| Persistence | `demo-store` (memory) | Postgres via `@nexa/db` |
| Chat | Mock stream without API keys | Live `streamText` |
| Integrations | OAuth URL stubs | Real provider authorize + encrypted tokens |
| Rate limit | In-memory Map | Replace with Redis for multi-instance |

## Directory map (web)

```
apps/web/src/
├── app/
│   ├── (auth)/          # login, signup
│   ├── (app)/           # authenticated product modules
│   ├── api/             # Route Handlers
│   ├── layout.tsx
│   └── page.tsx         # marketing / entry
├── components/          # layout, chat, dashboard, UI primitives
├── config/navigation.ts
├── lib/                 # api, rbac, encryption, audit, env, supabase, validators
└── middleware.ts
```

## Related docs

- [SECURITY.md](./SECURITY.md) — hardening model
- [DATABASE.md](./DATABASE.md) — schema and migrations
- [MODULES.md](./MODULES.md) — routes and APIs per module
- [DEPLOYMENT.md](./DEPLOYMENT.md) — hosting topology
