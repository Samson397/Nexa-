import {
  getClientIp,
  handleRouteError,
  jsonOk,
  parseBody,
  rateLimitByIp,
  requireAuth,
} from "@/lib/api";
import {
  ensureUserWorkspace,
  storeMemory,
  writeAudit,
} from "@/lib/services";
import { memoryStoreSchema } from "@/lib/validators";

export const runtime = "nodejs";

/**
 * POST /api/memory/store — persist a long-term memory with embedding.
 */
export async function POST(request: Request) {
  try {
    const limited = rateLimitByIp(request, {
      name: "memory-store",
      limit: 40,
      windowMs: 60_000,
    });
    if (limited) return limited;

    const auth = await requireAuth(request);
    if (auth.error) return auth.error;

    const parsed = await parseBody(request, memoryStoreSchema);
    if (parsed.error) return parsed.error;

    const { profileId, workspaceId: defaultWs } = await ensureUserWorkspace(
      auth.user.id,
      auth.user.email ?? `${auth.user.id}@nexa.local`,
    );
    const workspaceId = parsed.data.workspaceId ?? defaultWs;

    const memory = await storeMemory({
      userId: profileId,
      workspaceId,
      content: parsed.data.content,
      agentId: parsed.data.agentId,
      importance: parsed.data.importance,
      source: parsed.data.source,
      metadata: parsed.data.metadata,
    });

    await writeAudit({
      workspaceId,
      userId: profileId,
      action: "settings.update",
      resourceType: "memory",
      resourceId: memory.id,
      ip: getClientIp(request),
      userAgent: request.headers.get("user-agent") ?? undefined,
      metadata: { source: parsed.data.source, importance: memory.importance },
    });

    return jsonOk(
      {
        ok: true,
        demo: memory.demo,
        memory: {
          id: memory.id,
          content: memory.content,
          importance: memory.importance,
          createdAt: memory.createdAt,
        },
        message: memory.demo
          ? "Memory stored in demo store. Connect the database for durable vector memory."
          : undefined,
      },
      { status: 201 },
    );
  } catch (error) {
    return handleRouteError(error);
  }
}
