import { z } from "zod";

/**
 * Zod-validated environment helpers.
 * Missing or invalid values return null during build / local setup
 * instead of crashing at import time.
 */

const publicEnvSchema = z.object({
  NEXT_PUBLIC_APP_URL: z.string().url().optional().or(z.literal("")),
  NEXT_PUBLIC_APP_NAME: z.string().min(1).optional().or(z.literal("")),
  NEXT_PUBLIC_SUPABASE_URL: z.string().url().optional().or(z.literal("")),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().min(1).optional().or(z.literal("")),
});

const serverEnvSchema = z.object({
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1).optional().or(z.literal("")),
  DATABASE_URL: z.string().min(1).optional().or(z.literal("")),
  ENCRYPTION_KEY: z
    .string()
    .regex(/^[0-9a-fA-F]{64}$/, "ENCRYPTION_KEY must be 64 hex chars")
    .optional()
    .or(z.literal("")),
  RATE_LIMIT_REQUESTS_PER_MINUTE: z.coerce.number().int().positive().optional(),
  LOG_LEVEL: z.enum(["debug", "info", "warn", "error"]).optional(),
  OPENAI_API_KEY: z.string().optional().or(z.literal("")),
  ANTHROPIC_API_KEY: z.string().optional().or(z.literal("")),
  GOOGLE_AI_API_KEY: z.string().optional().or(z.literal("")),
  DEEPSEEK_API_KEY: z.string().optional().or(z.literal("")),
  OPENROUTER_API_KEY: z.string().optional().or(z.literal("")),
  DEFAULT_AI_PROVIDER: z.string().optional().or(z.literal("")),
  DEFAULT_AI_MODEL: z.string().optional().or(z.literal("")),
  WEBAUTHN_RP_ID: z.string().optional().or(z.literal("")),
  WEBAUTHN_RP_NAME: z.string().optional().or(z.literal("")),
  WEBAUTHN_ORIGIN: z.string().optional().or(z.literal("")),
});

export type PublicEnv = z.infer<typeof publicEnvSchema>;
export type ServerEnv = z.infer<typeof serverEnvSchema>;

function emptyToUndefined<T extends Record<string, unknown>>(
  value: T,
): Partial<T> {
  const out: Partial<T> = {};
  for (const [key, v] of Object.entries(value)) {
    if (v === undefined || v === "") continue;
    (out as Record<string, unknown>)[key] = v;
  }
  return out;
}

/** Public (client-safe) env. Returns null when validation fails. */
export function getPublicEnv(): PublicEnv | null {
  const parsed = publicEnvSchema.safeParse({
    NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL,
    NEXT_PUBLIC_APP_NAME: process.env.NEXT_PUBLIC_APP_NAME,
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
    NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  });

  if (!parsed.success) return null;
  return emptyToUndefined(parsed.data) as PublicEnv;
}

/** Server-only env. Never import from client components. */
export function getServerEnv(): ServerEnv | null {
  const parsed = serverEnvSchema.safeParse({
    SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY,
    DATABASE_URL: process.env.DATABASE_URL,
    ENCRYPTION_KEY: process.env.ENCRYPTION_KEY,
    RATE_LIMIT_REQUESTS_PER_MINUTE: process.env.RATE_LIMIT_REQUESTS_PER_MINUTE,
    LOG_LEVEL: process.env.LOG_LEVEL,
    OPENAI_API_KEY: process.env.OPENAI_API_KEY,
    ANTHROPIC_API_KEY: process.env.ANTHROPIC_API_KEY,
    GOOGLE_AI_API_KEY: process.env.GOOGLE_AI_API_KEY,
    DEEPSEEK_API_KEY: process.env.DEEPSEEK_API_KEY,
    OPENROUTER_API_KEY: process.env.OPENROUTER_API_KEY,
    DEFAULT_AI_PROVIDER: process.env.DEFAULT_AI_PROVIDER,
    DEFAULT_AI_MODEL: process.env.DEFAULT_AI_MODEL,
    WEBAUTHN_RP_ID: process.env.WEBAUTHN_RP_ID,
    WEBAUTHN_RP_NAME: process.env.WEBAUTHN_RP_NAME,
    WEBAUTHN_ORIGIN: process.env.WEBAUTHN_ORIGIN,
  });

  if (!parsed.success) return null;
  return emptyToUndefined(parsed.data) as ServerEnv;
}

/** Require a public env value; throws with a clear message when missing. */
export function requirePublicEnv<K extends keyof PublicEnv>(
  key: K,
): NonNullable<PublicEnv[K]> {
  const env = getPublicEnv();
  const value = env?.[key];
  if (value === undefined || value === "") {
    throw new Error(
      `Missing required public environment variable: ${String(key)}`,
    );
  }
  return value as NonNullable<PublicEnv[K]>;
}

/** Require a server env value; throws with a clear message when missing. */
export function requireServerEnv<K extends keyof ServerEnv>(
  key: K,
): NonNullable<ServerEnv[K]> {
  const env = getServerEnv();
  const value = env?.[key];
  if (value === undefined || value === "") {
    throw new Error(
      `Missing required server environment variable: ${String(key)}`,
    );
  }
  return value as NonNullable<ServerEnv[K]>;
}
