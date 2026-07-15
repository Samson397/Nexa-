import {
  handleRouteError,
  jsonOk,
  parseBody,
  rateLimitByIp,
  requireAuth,
} from "@/lib/api";
import { ensureUserWorkspace, searchMemories } from "@/lib/services";
import { memorySearchSchema } from "@/lib/validators";

export const runtime = "nodejs";

/**
 * POST /api/memory/search — semantic memory search.
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

    const { profileId, workspaceId: defaultWs } = await ensureUserWorkspace(
      auth.user.id,
      auth.user.email ?? `${auth.user.id}@nexa.local`,
    );
    const workspaceId = parsed.data.workspaceId ?? defaultWs;

    const { items, demo } = await searchMemories({
      userId: profileId,
      workspaceId,
      query: parsed.data.query,
      limit: parsed.data.limit,
    });

    // Optional agent filter (service ranks by similarity; trim here if needed)
    const filtered = parsed.data.agentId
      ? items.filter((m) => !m.agentId || m.agentId === parsed.data.agentId)
      : items;

    return jsonOk({
      items: filtered,
      total: filtered.length,
      demo,
      message:
        filtered.length === 0
          ? "No memories found. Store memories via /api/memory/store."
          : undefined,
    });
  } catch (error) {
    return handleRouteError(error);
  }
}
