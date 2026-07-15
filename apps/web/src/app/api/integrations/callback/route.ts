import { NextResponse } from "next/server";
import {
  handleRouteError,
  jsonError,
  jsonOk,
  rateLimitByIp,
} from "@/lib/api";

export const runtime = "nodejs";

/**
 * GET /api/integrations/callback — OAuth callback for third-party providers.
 *
 * Exchanges authorization codes for tokens server-side. Never logs tokens.
 * CSRF: Validate `state` against a server-side (or signed cookie SameSite)
 * value before accepting the code.
 */
export async function GET(request: Request) {
  try {
    const limited = rateLimitByIp(request, {
      name: "integrations-callback",
      limit: 60,
      windowMs: 60_000,
    });
    if (limited) return limited;

    const { searchParams } = new URL(request.url);
    const provider = searchParams.get("provider");
    const code = searchParams.get("code");
    const state = searchParams.get("state");
    const error = searchParams.get("error");
    const demo = searchParams.get("demo");
    const format = searchParams.get("format") || "redirect";

    if (error) {
      return jsonError(
        "OAUTH_DENIED",
        "OAuth provider returned an error",
        {
          status: 400,
          details: { provider, error },
        },
      );
    }

    if (!provider) {
      return jsonError("VALIDATION_ERROR", "Missing provider", {
        status: 400,
      });
    }

    // Demo connect path (from /connect stub without a real IdP)
    if (demo === "1" || (!code && state)) {
      const payload = {
        ok: true,
        demo: true,
        provider,
        status: "connected",
        state,
        message:
          "Demo OAuth callback accepted. Persist encrypted tokens when provider apps are configured.",
      };

      if (format === "json") {
        return jsonOk(payload);
      }

      const dest = new URL("/integrations", request.url);
      dest.searchParams.set("connected", provider);
      dest.searchParams.set("demo", "1");
      return NextResponse.redirect(dest, { status: 302 });
    }

    if (!code || !state) {
      return jsonError(
        "VALIDATION_ERROR",
        "Missing OAuth code or state",
        { status: 400 },
      );
    }

    // Production path: validate state, exchange code, encrypt tokens — stubbed.
    return jsonOk({
      ok: true,
      demo: true,
      provider,
      status: "pending",
      message:
        "Received authorization code. Token exchange is not yet configured for this provider.",
      // Never echo `code` back to clients in production logs/UI.
    });
  } catch (error) {
    return handleRouteError(error);
  }
}
