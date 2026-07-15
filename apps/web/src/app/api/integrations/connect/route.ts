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
import {
  buildAuthorizationUrl,
  providerIsReady,
  rejectPasswordFields,
  storeOAuthState,
} from "@/lib/integrations/oauth";
import { audit } from "@/lib/audit";

export const runtime = "nodejs";

/**
 * POST /api/integrations/connect — start OAuth for a third-party provider.
 *
 * SECURITY: Never accept or store third-party account passwords.
 * Real OAuth redirect when client id/secret present; demo mode otherwise.
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

    let raw: unknown;
    try {
      raw = await request.clone().json();
    } catch {
      raw = null;
    }
    const passwordErr = rejectPasswordFields(raw);
    if (passwordErr) {
      return jsonError("PASSWORDS_FORBIDDEN", passwordErr, { status: 400 });
    }

    const parsed = await parseBody(request, connectIntegrationSchema);
    if (parsed.error) return parsed.error;

    const { provider, workspaceId, redirectUri, scopes } = parsed.data;
    const { config, ready } = providerIsReady(provider);

    if (!config) {
      return jsonError("UNKNOWN_PROVIDER", `Unknown provider: ${provider}`, {
        status: 400,
      });
    }

    const state = newId();
    const origin = new URL(request.url).origin;
    const callback =
      redirectUri ||
      `${origin}/api/integrations/callback?provider=${encodeURIComponent(provider)}`;

    if (!ready) {
      // Demo mode — no client credentials configured
      storeOAuthState({
        state,
        provider,
        userId: auth.user.id,
        workspaceId,
        redirectUri: callback,
      });

      const oauthUrl = new URL(`${origin}/api/integrations/callback`);
      oauthUrl.searchParams.set("provider", provider);
      oauthUrl.searchParams.set("state", state);
      oauthUrl.searchParams.set("demo", "1");
      if (workspaceId) oauthUrl.searchParams.set("workspaceId", workspaceId);

      await audit("integration.connect", {
        actorId: auth.user.id,
        workspaceId,
        metadata: { provider, demo: true },
      });

      return jsonOk({
        ok: true,
        demo: true,
        provider,
        displayName: config.displayName,
        state,
        scopes: scopes ?? config.scopes,
        oauthUrl: oauthUrl.toString(),
        callback,
        message:
          "Demo OAuth start. Set provider client ID/secret env vars for real OAuth; never collect account passwords.",
      });
    }

    storeOAuthState({
      state,
      provider,
      userId: auth.user.id,
      workspaceId,
      redirectUri: callback,
    });

    const oauthUrl = buildAuthorizationUrl(provider, {
      state,
      redirectUri: callback,
      scopes,
    });

    await audit("integration.connect", {
      actorId: auth.user.id,
      workspaceId,
      metadata: { provider, demo: false },
    });

    return jsonOk({
      ok: true,
      demo: false,
      provider,
      displayName: config.displayName,
      state,
      scopes: scopes ?? config.scopes,
      oauthUrl,
      callback,
    });
  } catch (error) {
    return handleRouteError(error);
  }
}
