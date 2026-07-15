# Security

NEXA treats security as a product constraint, not a later hardening pass. Agents, integrations, and device bridges operate inside explicit permission boundaries.

## Principles (non-negotiable)

1. **OAuth only for third parties** — Never collect, accept, or store third-party account passwords.
2. **RBAC on every workspace action** — Roles gate capabilities; elevation cannot exceed the actor’s own rank.
3. **Approval for sensitive automations** — Send, publish, modify/delete external data, and payments require explicit user approval before execution.
4. **Desktop path sandboxing** — Local file/OS access is limited to user-approved paths (`approvedPaths`).
5. **Respect OS / browser / device permissions** — Never bypass or coerce platform permission prompts.
6. **Encrypt secrets at rest** — OAuth tokens and similar credentials use AES-256-GCM; keys live only in server env / secret managers.
7. **Audit sensitive operations** — Structured audit events for auth, integrations, automations, file and agent actions.
8. **Validate all untrusted input** — Zod schemas on Route Handlers; sanitized client error messages.

## Authentication

| Method | Status / notes |
|--------|----------------|
| Email + password (NEXA account) | Supabase Auth via `/api/auth/login`, `/api/auth/signup` |
| OAuth (Google, GitHub, Apple) | `/api/auth/oauth` + Supabase providers |
| Session cookies | Supabase SSR; refreshed in middleware |
| WebAuthn / passkeys | Env placeholders (`WEBAUTHN_*`); planned |
| Demo stubs | Only when Supabase unset / `NEXA_AUTH_STUB` / demo headers — never enable in production |

Middleware (`apps/web/src/middleware.ts`) protects product prefixes when Supabase is configured and demo mode is off. API routes enforce auth independently via `requireAuth`.

## Third-party integrations (OAuth only)

```text
Client → POST /api/integrations/connect
       → reject any password / secret-shaped fields (defense in depth)
       → return provider authorize URL + state
       → GET /api/integrations/callback
       → exchange code → encrypt tokens → store encryptedCredentials
```

- Reject keys such as `password`, `passwd`, `pwd`, `secret`, `app_password` on connect.
- Store tokens in `integrations.encrypted_credentials` only after encryption.
- Validate OAuth `state` (CSRF) against a server-side or signed SameSite cookie value.
- Prefer minimal scopes; record granted scopes on the integration row.

## Encryption at rest

Implementation: `apps/web/src/lib/encryption.ts`.

- Algorithm: **AES-256-GCM**
- Key: `ENCRYPTION_KEY` — 64 hex characters (32 bytes); generate with `openssl rand -hex 32`
- Payload format: `iv:authTag:ciphertext` (hex)
- Never hardcode keys in source; never log plaintext tokens

## RBAC

Roles (`user_role`): `owner` › `admin` › `member` › `viewer`.

Permission matrix: `apps/web/src/lib/rbac.ts`.

| Capability examples | viewer | member | admin | owner |
|---------------------|:------:|:------:|:-----:|:-----:|
| Read workspace / chat / integrations | ✓ | ✓ | ✓ | ✓ |
| Write chat / run agents | | ✓ | ✓ | ✓ |
| Manage integrations / automations / approve | | | ✓ | ✓ |
| Billing, delete workspace | | | | ✓ |

`canAssignRole` prevents assigning a role higher than the actor’s own (owners alone assign `owner`).

Agent definitions in `@nexa/ai` include tool/permission lists and shared guardrails (no password prompts, no OS bypass, tenant isolation).

## Sensitive automation approval

Catalog (`SENSITIVE_AUTOMATION_ACTIONS` in `@nexa/shared`):

- `send_message`
- `publish_content`
- `modify_data`
- `delete_data`
- `charge_payment`
- `send_email`

Gate: `POST /api/automations/[id]/approve`. Runs marked `pending_approval` must not execute until this succeeds. Approval modes: `always` | `sensitive_only` | `never` (prefer `sensitive_only` or stricter).

## Desktop path sandboxing & OS permissions

- Devices register with `approvedPaths` and `permissions` (`POST /api/devices`).
- Desktop companions must resolve all filesystem operations **inside** those paths only.
- `DESKTOP_ALLOWED_PATHS` env can further constrain defaults.
- Mobile/desktop actions must honor OS permission APIs (files, notifications, camera, etc.). NEXA must never instruct or implement permission bypasses.
- Audit desktop/mobile actions via `desktop.action` / `mobile.action`.

## CSRF / SameSite

- Session cookies: **SameSite=Lax** (or Strict) via Supabase Auth defaults.
- Do not accept auth tokens from query strings.
- Mutating endpoints rely on SameSite cookies plus origin checks in production.
- OAuth flows use `state` (and PKCE where supported) to prevent CSRF on callbacks.

## Rate limiting

- In-memory sliding window: `apps/web/src/lib/rate-limit.ts`
- Default: `RATE_LIMIT_REQUESTS_PER_MINUTE` (60)
- Applied per route/IP via `rateLimitByIp` in API helpers
- Multi-instance production: replace with Redis (or equivalent) shared counters

## Input validation & error hygiene

- All JSON bodies: Zod (`apps/web/src/lib/validators.ts`) through `parseBody`
- Client errors strip secrets, stacks, and internal paths (`jsonError` / `sanitizeClientMessage`)
- Avoid reflecting raw provider/SDK errors to clients

## Audit logging

- Helper: `apps/web/src/lib/audit.ts` → structured `logger.info("audit.event", …)`
- Schema table: `audit_logs` in `@nexa/db` (persist when DB sink is wired)
- Actions include: `auth.*`, `chat.message`, `agent.run`, `integration.*`, `automation.*`, `file.*`, `kb.index`, `desktop.action`, `mobile.action`

## Never do

| Forbidden | Rationale |
|-----------|-----------|
| Store third-party passwords | OAuth only |
| Auto-approve payments, outbound email, or publishing | Requires `/approve` |
| Read files outside `approvedPaths` | Path sandbox |
| Bypass OS/browser permission prompts | User agency |
| Ship `ENCRYPTION_KEY`, service role, or AI keys to the client | Secret boundary |
| Disable Zod validation “temporarily” | Injection / abuse surface |
| Run production with demo auth stubs | Impersonation risk |

## Related code

| Concern | Location |
|---------|----------|
| Middleware / demo gate | `apps/web/src/middleware.ts` |
| API auth + CSRF notes | `apps/web/src/lib/api.ts` |
| RBAC | `apps/web/src/lib/rbac.ts` |
| Encryption | `apps/web/src/lib/encryption.ts` |
| Audit | `apps/web/src/lib/audit.ts` |
| Rate limit | `apps/web/src/lib/rate-limit.ts` |
| Integration OAuth | `apps/web/src/app/api/integrations/*` |
| Automation approve | `apps/web/src/app/api/automations/[id]/approve/route.ts` |
| Agent guardrails | `packages/ai/src/agents/index.ts` |
