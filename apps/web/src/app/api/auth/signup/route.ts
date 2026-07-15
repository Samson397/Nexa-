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

export const runtime = "nodejs";

/**
 * POST /api/auth/signup — email/password registration stub / Supabase call.
 *
 * Prefer SameSite cookies for any session the client stores after signup.
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
      return jsonOk(
        {
          ok: false,
          configured: false,
          message:
            "Supabase Auth is not configured. Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY to enable signup.",
        },
        { status: 503 },
      );
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

    return jsonOk({
      ok: true,
      configured: true,
      user: data.user
        ? { id: data.user.id, email: data.user.email }
        : null,
      session: data.session
        ? {
            access_token: data.session.access_token,
            refresh_token: data.session.refresh_token,
            expires_at: data.session.expires_at,
          }
        : null,
      message: data.session
        ? "Account created."
        : "Account created. Check your email to confirm if required.",
    });
  } catch (error) {
    return handleRouteError(error);
  }
}
