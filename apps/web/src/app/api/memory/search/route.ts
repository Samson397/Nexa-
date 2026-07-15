import {
  handleRouteError,
  jsonOk,
  parseBody,
  rateLimitByIp,
  requireAuth,
} from "@/lib/api";
import { demoStore } from "@/lib/demo-store";
import { memorySearchSchema } from "@/lib/validators";

export const runtime = "nodejs";

/**
 * POST /api/memory/search — semantic memory search stub.
 * Returns empty/mock matches when no vector DB is configured.
 */
export async function POST(request: Request) {
  try {
    const limited = rateLimitByIp(request, {
      name: "memory-search",
      limit: 60,
      windowMs: 60_000,
    });
    if (limited) return limited;

    const auth = await requireAuth(request);
    if (auth.error) return auth.error;

    const parsed = await parseBody(request, memorySearchSchema);
    if (parsed.error) return parsed.error;

    const { query, limit, workspaceId, agentId } = parsed.data;
    const q = query.toLowerCase();

    // Stub: keyword overlap against in-memory demo store (not real embeddings)
    const matches = demoStore
      .memories()
      .filter((m) => {
        if (workspaceId && m.workspaceId && m.workspaceId !== workspaceId) {
          return false;
        }
        if (agentId && m.agentId && m.agentId !== agentId) return false;
        return m.content.toLowerCase().includes(q) || q.length < 3;
      })
      .slice(0, limit)
      .map((m, i) => ({
        id: m.id,
        content: m.content,
        score: Math.max(0.1, 0.9 - i * 0.08),
        importance: m.importance,
        source: m.source,
        createdAt: m.createdAt,
      }));

    return jsonOk({
      items: matches,
      total: matches.length,
      demo: true,
      message:
        matches.length === 0
          ? "No memories found (demo store empty or no DB). Store memories via /api/memory/store."
          : undefined,
    });
  } catch (error) {
    return handleRouteError(error);
  }
}
