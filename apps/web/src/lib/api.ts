import { NextResponse } from "next/server";
import type { ZodSchema, ZodError } from "zod";
import { NexaError } from "@nexa/shared";

/**
 * API helpers for NEXA Route Handlers.
 *
 * Security notes:
 * - CSRF: Prefer SameSite=Lax (or Strict) cookies for session tokens set by
 *   Supabase Auth; mutate endpoints should rely on cookie SameSite + origin
 *   checks in production. Do not accept auth tokens from query strings.
 * - Never store third-party account passwords — integrations use OAuth only.
 * - Sensitive automation actions require explicit user approval before execution.
 * - Always validate input with Zod; sanitize error messages before returning
 *   them to clients (never leak stack traces, secrets, or internal paths).
 */

export type JsonOkOptions = {
  status?: number;
  headers?: HeadersInit;
};

export function jsonOk<T>(data: T, options: JsonOkOptions = {}): NextResponse {
  return NextResponse.json(data, {
    status: options.status ?? 200,
    headers: options.headers,
  });
}

/**
 * Client-safe error response. Internal details are stripped unless explicitly
 * marked as safe validation details.
 */
export function jsonError(
  code: string,
  message: string,
  options?: {
    status?: number;
    details?: unknown;
    cause?: unknown;
  },
): NextResponse {
  const status = options?.status ?? 500;
  // Sanitize: never expose raw cause / stack to the client
  if (options?.cause && process.env.NODE_ENV !== "production") {
    console.error(`[api:${code}]`, message, options.cause);
  } else if (options?.cause) {
    console.error(`[api:${code}]`, message);
  }

  const body: { error: { code: string; message: string; details?: unknown } } =
    {
      error: {
        code,
        message: sanitizeClientMessage(message),
      },
    };

  if (options?.details !== undefined && isSafeDetails(options.details)) {
    body.error.details = options.details;
  }

  return NextResponse.json(body, { status });
}

function sanitizeClientMessage(message: string): string {
  return message
    .replace(/(api[_-]?key|secret|password|token)\s*[:=]\s*\S+/gi, "$1=[redacted]")
    .replace(/\/[a-z0-9_\-./]+/gi, (m) =>
      m.includes("node_modules") || m.includes("/workspace") ? "[path]" : m,
    )
    .slice(0, 500);
}

function isSafeDetails(details: unknown): boolean {
  if (details === null || typeof details !== "object") return true;
  const json = JSON.stringify(details);
  return (
    json.length < 4_000 &&
    !/stack|password|secret|apiKey|authorization/i.test(json)
  );
}

export async function parseBody<T>(
  request: Request,
  schema: ZodSchema<T>,
): Promise<{ data: T; error?: never } | { data?: never; error: NextResponse }> {
  let raw: unknown;
  try {
    raw = await request.json();
  } catch (cause) {
    return {
      error: jsonError("INVALID_JSON", "Request body must be valid JSON", {
        status: 400,
        cause,
      }),
    };
  }

  const result = schema.safeParse(raw);
  if (!result.success) {
    return {
      error: jsonError("VALIDATION_ERROR", "Invalid request body", {
        status: 400,
        details: formatZodError(result.error),
      }),
    };
  }

  return { data: result.data };
}

export function formatZodError(error: ZodError): unknown {
  return error.issues.map((issue) => ({
    path: issue.path.join("."),
    message: issue.message,
    code: issue.code,
  }));
}

export function getClientIp(request: Request): string {
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) {
    return forwarded.split(",")[0]?.trim() || "unknown";
  }
  return (
    request.headers.get("x-real-ip") ||
    request.headers.get("cf-connecting-ip") ||
    "unknown"
  );
}

export type AuthUser = {
  id: string;
  email?: string;
};

/**
 * Auth stub — in production, resolve the Supabase session from cookies
 * (SameSite cookies mitigate CSRF for cookie-based sessions).
 */
export async function requireAuth(
  request: Request,
): Promise<{ user: AuthUser; error?: never } | { user?: never; error: NextResponse }> {
  const authHeader = request.headers.get("authorization");
  const bearer =
    authHeader?.startsWith("Bearer ") ? authHeader.slice(7).trim() : null;

  // Demo / stub: accept a placeholder bearer or demo header for local UI.
  const demoUser = request.headers.get("x-nexa-demo-user");
  if (demoUser) {
    return { user: { id: demoUser, email: `${demoUser}@demo.nexa.local` } };
  }

  if (bearer === "demo" || process.env.NEXA_AUTH_STUB === "1") {
    return { user: { id: "demo-user", email: "demo@nexa.local" } };
  }

  // Passkey / demo session cookie set by login-verify or login/signup stubs
  const cookieHeader = request.headers.get("cookie") ?? "";
  const sessionMatch = cookieHeader.match(/(?:^|;\s*)nexa-session=([^;]+)/);
  const sessionToken = sessionMatch?.[1]
    ? decodeURIComponent(sessionMatch[1])
    : null;

  if (sessionToken?.startsWith("demo.")) {
    try {
      const payload = JSON.parse(
        Buffer.from(sessionToken.slice(5), "base64url").toString("utf8"),
      ) as { id?: string; email?: string };
      if (payload.id) {
        return {
          user: {
            id: payload.id,
            email: payload.email ?? `${payload.id}@demo.nexa.local`,
          },
        };
      }
    } catch {
      // fall through
    }
  }

  const tokenForSupabase = bearer || (sessionToken && !sessionToken.startsWith("demo.") ? sessionToken : null);

  if (hasSupabaseEnv()) {
    try {
      const { createClient } = await import("@/lib/supabase/server");
      const supabase = await createClient();
      if (tokenForSupabase) {
        const { data, error } = await supabase.auth.getUser(tokenForSupabase);
        if (error || !data.user) {
          return {
            error: jsonError("UNAUTHORIZED", "Invalid or expired session", {
              status: 401,
            }),
          };
        }
        return {
          user: { id: data.user.id, email: data.user.email ?? undefined },
        };
      }
      const { data, error } = await supabase.auth.getUser();
      if (!error && data.user) {
        return {
          user: { id: data.user.id, email: data.user.email ?? undefined },
        };
      }
    } catch (cause) {
      return {
        error: jsonError("AUTH_ERROR", "Unable to verify session", {
          status: 401,
          cause,
        }),
      };
    }
  }

  // Soft stub for routes that still work in demo mode without auth.
  if (process.env.NODE_ENV !== "production") {
    return { user: { id: "demo-user", email: "demo@nexa.local" } };
  }

  return {
    error: jsonError("UNAUTHORIZED", "Authentication required", {
      status: 401,
    }),
  };
}

export function hasSupabaseEnv(): boolean {
  return Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL &&
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  );
}

export function hasAnyAiApiKey(): boolean {
  return Boolean(
    process.env.OPENAI_API_KEY ||
      process.env.ANTHROPIC_API_KEY ||
      process.env.GOOGLE_AI_API_KEY ||
      process.env.DEEPSEEK_API_KEY ||
      process.env.OPENROUTER_API_KEY,
  );
}

/* ——— Simple in-memory rate limiter (per IP) ——— */

type RateBucket = { count: number; resetAt: number };

const rateBuckets = new Map<string, RateBucket>();

export type RateLimitOptions = {
  /** Unique key namespace, e.g. "chat" */
  name: string;
  /** Max requests in the window */
  limit?: number;
  /** Window length in ms */
  windowMs?: number;
};

/**
 * Rate limit by client IP. Returns a NextResponse on exceed, otherwise null.
 * Suitable for single-instance / demo deployments; swap for Redis in prod.
 */
export function rateLimitByIp(
  request: Request,
  options: RateLimitOptions,
): NextResponse | null {
  const limit = options.limit ?? 60;
  const windowMs = options.windowMs ?? 60_000;
  const ip = getClientIp(request);
  const key = `${options.name}:${ip}`;
  const now = Date.now();

  let bucket = rateBuckets.get(key);
  if (!bucket || now >= bucket.resetAt) {
    bucket = { count: 0, resetAt: now + windowMs };
    rateBuckets.set(key, bucket);
  }

  bucket.count += 1;

  if (bucket.count > limit) {
    const retryAfter = Math.ceil((bucket.resetAt - now) / 1000);
    return jsonError(
      "RATE_LIMITED",
      "Too many requests. Please try again shortly.",
      {
        status: 429,
        details: { retryAfter },
      },
    );
  }

  return null;
}

export function handleRouteError(error: unknown): NextResponse {
  if (error instanceof NexaError) {
    return jsonError(error.code, error.message, {
      status: error.status,
      details: error.details,
      cause: error.cause,
    });
  }

  if (error instanceof Error) {
    return jsonError("INTERNAL_ERROR", "An unexpected error occurred", {
      status: 500,
      cause: error,
    });
  }

  return jsonError("INTERNAL_ERROR", "An unexpected error occurred", {
    status: 500,
    cause: error,
  });
}

export function newId(): string {
  return crypto.randomUUID();
}
