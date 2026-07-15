import { NextResponse } from "next/server";
import {
  handleRouteError,
  hasSupabaseEnv,
  jsonError,
  jsonOk,
  rateLimitByIp,
} from "@/lib/api";
import { oauthProviderSchema } from "@/lib/validators";
import { createClient as createSupabaseServerClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

/**
 * GET /api/auth/oauth?provider=google|github|apple
 *
 * Starts OAuth via Supabase when configured; otherwise returns a helpful JSON
 * stub. Never collects third-party passwords — OAuth only.
 *
 * CSRF: Use the returned redirect flow with Supabase PKCE / state; set
 * session cookies with SameSite=Lax after callback.
 */
export async function GET(request: Request) {
  try {
    const limited = rateLimitByIp(request, {
      name: "auth-oauth",
      limit: 30,
      windowMs: 60_000,
    });
    if (limited) return limited;

    const { searchParams } = new URL(request.url);
    const providerResult = oauthProviderSchema.safeParse(
      searchParams.get("provider"),
    );
    if (!providerResult.success) {
      return jsonError(
        "VALIDATION_ERROR",
        "Query param provider must be google, github, or apple",
        { status: 400 },
      );
    }
    const provider = providerResult.data;
    const redirectTo =
      searchParams.get("redirectTo") ||
      `${new URL(request.url).origin}/auth/callback`;
    const mode = searchParams.get("mode") || "redirect";

    if (!hasSupabaseEnv()) {
      return jsonOk(
        {
          ok: false,
          configured: false,
          provider,
          message:
            "Supabase Auth is not configured. Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY to enable OAuth.",
          oauthUrl: null,
        },
        { status: 503 },
      );
    }

    const supabase = await createSupabaseServerClient();
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider,
      options: {
        redirectTo,
        skipBrowserRedirect: true,
      },
    });

    if (error || !data.url) {
      return jsonError("OAUTH_FAILED", "Unable to start OAuth flow", {
        status: 502,
        cause: error,
      });
    }

    if (mode === "json") {
      return jsonOk({
        ok: true,
        configured: true,
        provider,
        oauthUrl: data.url,
      });
    }

    return NextResponse.redirect(data.url, { status: 302 });
  } catch (error) {
    return handleRouteError(error);
  }
}
