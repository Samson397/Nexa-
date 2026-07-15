import {
  handleRouteError,
  jsonOk,
  rateLimitByIp,
  requireAuth,
} from "@/lib/api";
import { demoStore } from "@/lib/demo-store";
import { listProviderConfigs } from "@/lib/integrations/providers";
import { tryGetDb } from "@/lib/db";
import { integrations } from "@nexa/db";
import { eq } from "drizzle-orm";

export const runtime = "nodejs";

/**
 * GET /api/integrations — list connected integrations for the current user.
 * Never returns decrypted credentials.
 */
export async function GET(request: Request) {
  try {
    const limited = rateLimitByIp(request, {
      name: "integrations-list",
      limit: 60,
      windowMs: 60_000,
    });
    if (limited) return limited;

    const auth = await requireAuth(request);
    if (auth.error) return auth.error;

    const catalog = listProviderConfigs().map((c) => ({
      provider: c.provider,
      displayName: c.displayName,
      category: c.category,
      scopes: c.scopes,
      configured: Boolean(
        process.env[c.clientIdEnv] && process.env[c.clientSecretEnv],
      ),
    }));

    let connected = demoStore
      .integrations()
      .filter(
        (i) => i.userId === auth.user.id && i.status === "connected",
      )
      .map((i) => ({
        id: i.id,
        provider: i.provider,
        status: i.status,
        scopes: i.scopes,
        accountLabel: i.accountLabel,
        workspaceId: i.workspaceId,
        createdAt: i.createdAt,
        updatedAt: i.updatedAt,
        demo: Boolean(i.metadata?.demo),
      }));

    const db = tryGetDb();
    if (db) {
      try {
        const rows = await db
          .select({
            id: integrations.id,
            provider: integrations.provider,
            status: integrations.status,
            scopes: integrations.scopes,
            accountLabel: integrations.accountLabel,
            workspaceId: integrations.workspaceId,
            createdAt: integrations.createdAt,
            updatedAt: integrations.updatedAt,
          })
          .from(integrations)
          .where(eq(integrations.userId, auth.user.id));

        const fromDb = rows
          .filter((r) => r.status === "connected")
          .map((r) => ({
            id: r.id,
            provider: r.provider,
            status: r.status,
            scopes: r.scopes ?? [],
            accountLabel: r.accountLabel ?? undefined,
            workspaceId: r.workspaceId,
            createdAt: r.createdAt.toISOString(),
            updatedAt: r.updatedAt.toISOString(),
            demo: false,
          }));

        // Prefer DB rows; merge demo-only providers
        const dbProviders = new Set(fromDb.map((r) => r.provider));
        connected = [
          ...fromDb,
          ...connected.filter((c) => !dbProviders.has(c.provider)),
        ];
      } catch {
        // keep demo-store list
      }
    }

    return jsonOk({
      ok: true,
      items: connected,
      total: connected.length,
      catalog,
    });
  } catch (error) {
    return handleRouteError(error);
  }
}
