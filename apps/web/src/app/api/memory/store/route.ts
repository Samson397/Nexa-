import {
  handleRouteError,
  jsonOk,
  newId,
  parseBody,
  rateLimitByIp,
  requireAuth,
} from "@/lib/api";
import { demoStore } from "@/lib/demo-store";
import { memoryStoreSchema } from "@/lib/validators";

export const runtime = "nodejs";

/**
 * POST /api/memory/store — persist a long-term memory stub.
 * When PostgreSQL + pgvector is wired, embeddings will be generated server-side.
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

    const now = new Date().toISOString();
    const memory = {
      id: newId(),
      content: parsed.data.content,
      workspaceId: parsed.data.workspaceId,
      agentId: parsed.data.agentId,
      importance: parsed.data.importance ?? 0.5,
      source: parsed.data.source,
      metadata: parsed.data.metadata,
      createdAt: now,
    };

    demoStore.memories().unshift(memory);

    return jsonOk(
      {
        ok: true,
        demo: true,
        memory: {
          id: memory.id,
          content: memory.content,
          importance: memory.importance,
          createdAt: memory.createdAt,
        },
        message:
          "Memory stored in demo store. Connect the database for durable vector memory.",
      },
      { status: 201 },
    );
  } catch (error) {
    return handleRouteError(error);
  }
}
