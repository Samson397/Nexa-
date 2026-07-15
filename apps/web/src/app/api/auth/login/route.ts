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
 * POST /api/auth/login — email/password login.
 *
 * CSRF: Session cookies from Supabase should use SameSite=Lax/Strict.
 * Sanitize: never return provider-internal error payloads verbatim.
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
      return jsonOk(
        {
          ok: false,
          configured: false,
          message:
            "Supabase Auth is not configured. Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY to enable email/password login.",
        },
        { status: 503 },
      );
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
    });
  } catch (error) {
    return handleRouteError(error);
  }
}
