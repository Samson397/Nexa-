import { NextResponse } from "next/server";
import {
  handleRouteError,
  jsonError,
  jsonOk,
  rateLimitByIp,
} from "@/lib/api";
import {
  consumeOAuthState,
  encryptTokens,
  exchangeCodeForTokens,
  upsertDemoIntegration,
} from "@/lib/integrations/oauth";
import { getProviderConfig } from "@/lib/integrations/providers";
import { tryGetDb } from "@/lib/db";
import { integrations } from "@nexa/db";
import { and, eq } from "drizzle-orm";
import { audit } from "@/lib/audit";

export const runtime = "nodejs";

/**
 * GET /api/integrations/callback — OAuth callback for third-party providers.
 * Exchanges authorization codes for tokens server-side. Never logs tokens.
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
    const workspaceIdParam = searchParams.get("workspaceId") ?? undefined;

    if (error) {
      return jsonError("OAUTH_DENIED", "OAuth provider returned an error", {
        status: 400,
        details: { provider, error },
      });
    }

    if (!provider) {
      return jsonError("VALIDATION_ERROR", "Missing provider", {
        status: 400,
      });
    }

    const config = getProviderConfig(provider);

    // Demo connect path
    if (demo === "1" || (!code && state)) {
      const oauthState = state ? consumeOAuthState(state) : null;
      const userId = oauthState?.userId ?? "demo-user";
      const workspaceId = oauthState?.workspaceId ?? workspaceIdParam;

      const encrypted = encryptTokens({
        access_token: `demo-token-${provider}`,
        token_type: "bearer",
        scope: config?.scopes.join(" "),
      });

      upsertDemoIntegration({
        userId,
        workspaceId,
        provider,
        status: "connected",
        encryptedCredentials: encrypted,
        scopes: config?.scopes ?? [],
        accountLabel: config?.displayName
          ? `${config.displayName} (demo)`
          : provider,
        metadata: { demo: true },
      });

      await audit("integration.connect", {
        actorId: userId,
        workspaceId,
        success: true,
        metadata: { provider, demo: true, phase: "callback" },
      });

      const payload = {
        ok: true,
        demo: true,
        provider,
        status: "connected" as const,
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
      return jsonError("VALIDATION_ERROR", "Missing OAuth code or state", {
        status: 400,
      });
    }

    const oauthState = consumeOAuthState(state);
    if (!oauthState || oauthState.provider !== provider) {
      return jsonError(
        "OAUTH_STATE_INVALID",
        "Invalid or expired OAuth state",
        { status: 400 },
      );
    }

    const redirectUri = oauthState.redirectUri;
    const tokens = await exchangeCodeForTokens(provider, code, redirectUri, {
      codeVerifier: oauthState.codeVerifier,
    });
    const encrypted = encryptTokens(tokens);

    upsertDemoIntegration({
      userId: oauthState.userId,
      workspaceId: oauthState.workspaceId,
      provider,
      status: "connected",
      encryptedCredentials: encrypted,
      scopes: config?.scopes ?? [],
      accountLabel: config?.displayName,
      metadata: {},
    });

    // Persist to integrations table when DB is available
    const db = tryGetDb();
    if (db && oauthState.workspaceId) {
      try {
        const existing = await db
          .select()
          .from(integrations)
          .where(
            and(
              eq(integrations.workspaceId, oauthState.workspaceId),
              eq(integrations.userId, oauthState.userId),
              eq(integrations.provider, provider),
            ),
          )
          .limit(1);

        if (existing[0]) {
          await db
            .update(integrations)
            .set({
              status: "connected",
              encryptedCredentials: encrypted,
              scopes: config?.scopes ?? [],
              accountLabel: config?.displayName,
              updatedAt: new Date(),
            })
            .where(eq(integrations.id, existing[0].id));
        } else {
          await db.insert(integrations).values({
            workspaceId: oauthState.workspaceId,
            userId: oauthState.userId,
            provider,
            status: "connected",
            encryptedCredentials: encrypted,
            scopes: config?.scopes ?? [],
            accountLabel: config?.displayName,
          });
        }
      } catch {
        // demo-store is authoritative when DB insert fails (e.g. missing profile FKs)
      }
    }

    await audit("integration.connect", {
      actorId: oauthState.userId,
      workspaceId: oauthState.workspaceId,
      success: true,
      metadata: { provider, demo: false, phase: "callback" },
    });

    const payload = {
      ok: true,
      demo: false,
      provider,
      status: "connected" as const,
    };

    if (format === "json") {
      return jsonOk(payload);
    }

    const dest = new URL("/integrations", request.url);
    dest.searchParams.set("connected", provider);
    return NextResponse.redirect(dest, { status: 302 });
  } catch (error) {
    return handleRouteError(error);
  }
}
