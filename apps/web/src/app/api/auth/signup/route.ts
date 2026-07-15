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
 * POST /api/auth/signup — email/password registration.
 * Sets cookies when Supabase works; returns structured session.
 */
export async function POST(request: Request) {
  try {
    const limited = rateLimitByIp(request, {
      name: "auth-signup",
      limit: 10,
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
        JSON.stringify({ id: user.id, email, via: "signup" }),
        "utf8",
      ).toString("base64url")}`;

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
          "Demo account session created. Configure Supabase for persistent accounts.",
      });
      res.cookies.set("nexa-session", accessToken, sessionCookieOptions());
      return res;
    }

    const supabase = await createSupabaseServerClient();
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
    });

    if (error) {
      return jsonError("SIGNUP_FAILED", "Unable to create account", {
        status: 400,
        cause: error,
      });
    }

    const user = data.user
      ? { id: data.user.id, email: data.user.email ?? email }
      : null;

    await audit("auth.login", {
      actorId: user?.id,
      success: true,
      metadata: { method: "signup" },
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
      message: session
        ? "Account created."
        : "Account created. Check your email to confirm if required.",
    });

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
