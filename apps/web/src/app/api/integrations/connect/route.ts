import {
  handleRouteError,
  jsonError,
  jsonOk,
  newId,
  parseBody,
  rateLimitByIp,
  requireAuth,
} from "@/lib/api";
import { connectIntegrationSchema } from "@/lib/validators";

export const runtime = "nodejs";

/**
 * POST /api/integrations/connect — start OAuth for a third-party provider.
 *
 * SECURITY: Never accept or store third-party account passwords.
 * OAuth authorization code flow only; credentials (tokens) must be encrypted
 * at rest when the integration table is wired.
 */
export async function POST(request: Request) {
  try {
    const limited = rateLimitByIp(request, {
      name: "integrations-connect",
      limit: 30,
      windowMs: 60_000,
    });
    if (limited) return limited;

    const auth = await requireAuth(request);
    if (auth.error) return auth.error;

    // Reject password-shaped fields early (defense in depth before Zod)
    let raw: unknown;
    try {
      raw = await request.clone().json();
    } catch {
      raw = null;
    }
    if (raw && typeof raw === "object") {
      const keys = Object.keys(raw as object).map((k) => k.toLowerCase());
      if (
        keys.some((k) =>
          ["password", "passwd", "pwd", "secret", "app_password"].includes(k),
        )
      ) {
        return jsonError(
          "PASSWORDS_FORBIDDEN",
          "Third-party passwords are never accepted. Connect via OAuth only.",
          { status: 400 },
        );
      }
    }

    const parsed = await parseBody(request, connectIntegrationSchema);
    if (parsed.error) return parsed.error;

    const { provider, workspaceId, redirectUri, scopes } = parsed.data;
    const state = newId();
    const origin = new URL(request.url).origin;
    const callback =
      redirectUri ||
      `${origin}/api/integrations/callback?provider=${encodeURIComponent(provider)}`;

    // Stub OAuth URL — replace with provider-specific authorize endpoints.
    const oauthUrl = new URL(`${origin}/api/integrations/callback`);
    oauthUrl.searchParams.set("provider", provider);
    oauthUrl.searchParams.set("state", state);
    oauthUrl.searchParams.set("demo", "1");
    if (workspaceId) oauthUrl.searchParams.set("workspaceId", workspaceId);

    return jsonOk({
      ok: true,
      demo: true,
      provider,
      state,
      scopes: scopes ?? [],
      oauthUrl: oauthUrl.toString(),
      callback,
      message:
        "OAuth start stub. Wire provider client IDs/secrets; never collect account passwords.",
    });
  } catch (error) {
    return handleRouteError(error);
  }
}
