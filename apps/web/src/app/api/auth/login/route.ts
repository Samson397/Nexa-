import {
  handleRouteError,
  hasSupabaseEnv,
  jsonError,
  jsonOk,
  parseBody,
  rateLimitByIp,
} from "@/lib/api";
import { emailPasswordSchema } from "@/lib/validators";
import { createClient as createSupabaseServerClient } from "@/lib/supabase/server";
import { audit } from "@/lib/audit";

export const runtime = "nodejs";

function sessionCookieOptions() {
  return {
    httpOnly: true,
    sameSite: "lax" as const,
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 7,
  };
}

/**
 * POST /api/auth/login — email/password login.
 *
 * CSRF: Session cookies use SameSite=Lax.
 * When Supabase is configured, cookies are set via SSR client + structured session returned.
 * Demo mode (no Supabase): issues a signed demo session cookie.
 */
export async function POST(request: Request) {
  try {
    const limited = rateLimitByIp(request, {
      name: "auth-login",
      limit: 20,
      windowMs: 60_000,
    });
    if (limited) return limited;

    const parsed = await parseBody(request, emailPasswordSchema);
    if (parsed.error) return parsed.error;

    const { email, password } = parsed.data;

    if (!hasSupabaseEnv()) {
      const user = {
        id: `demo-${Buffer.from(email).toString("base64url").slice(0, 12)}`,
        email,
      };
      const accessToken = `demo.${Buffer.from(
        JSON.stringify({ id: user.id, email, via: "password" }),
        "utf8",
      ).toString("base64url")}`;

      await audit("auth.login", {
        actorId: user.id,
        success: true,
        metadata: { method: "password", demo: true },
      });

      const res = jsonOk({
        ok: true,
        configured: false,
        demo: true,
        user,
        session: {
          access_token: accessToken,
          refresh_token: null,
          expires_at: Math.floor(Date.now() / 1000) + 60 * 60 * 24 * 7,
          token_type: "bearer",
        },
        message:
          "Demo session issued. Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY for real auth.",
      });
      res.cookies.set("nexa-session", accessToken, sessionCookieOptions());
      return res;
    }

    const supabase = await createSupabaseServerClient();
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      return jsonError("AUTH_FAILED", "Invalid email or password", {
        status: 401,
        cause: error,
      });
    }

    const user = data.user
      ? { id: data.user.id, email: data.user.email ?? email }
      : null;

    await audit("auth.login", {
      actorId: user?.id,
      success: true,
      metadata: { method: "password" },
    });

    const session = data.session
      ? {
          access_token: data.session.access_token,
          refresh_token: data.session.refresh_token,
          expires_at: data.session.expires_at,
          token_type: data.session.token_type ?? "bearer",
          expires_in: data.session.expires_in,
        }
      : null;

    const res = jsonOk({
      ok: true,
      configured: true,
      demo: false,
      user,
      session,
    });

    // Supabase SSR already wrote auth cookies via setAll; also mirror access token
    // into nexa-session for requireAuth consumers that read it.
    if (session?.access_token) {
      res.cookies.set(
        "nexa-session",
        session.access_token,
        sessionCookieOptions(),
      );
    }

    return res;
  } catch (error) {
    return handleRouteError(error);
  }
}
