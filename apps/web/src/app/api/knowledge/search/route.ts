import {
  handleRouteError,
  jsonOk,
  parseBody,
  rateLimitByIp,
  requireAuth,
} from "@/lib/api";
import { ensureUserWorkspace, searchKnowledge } from "@/lib/services";
import { knowledgeSearchSchema } from "@/lib/validators";

export const runtime = "nodejs";

/**
 * POST /api/knowledge/search — vector knowledge search.
 */
export async function POST(request: Request) {
  try {
    const limited = rateLimitByIp(request, {
      name: "knowledge-search",
      limit: 60,
      windowMs: 60_000,
    });
    if (limited) return limited;

    const auth = await requireAuth(request);
    if (auth.error) return auth.error;

    const parsed = await parseBody(request, knowledgeSearchSchema);
    if (parsed.error) return parsed.error;

    const { workspaceId: defaultWs } = await ensureUserWorkspace(
      auth.user.id,
      auth.user.email ?? `${auth.user.id}@nexa.local`,
    );
    const workspaceId = parsed.data.workspaceId ?? defaultWs;

    const { items, demo } = await searchKnowledge({
      workspaceId,
      query: parsed.data.query,
      limit: parsed.data.limit,
      documentId: parsed.data.documentId,
    });

    return jsonOk({
      items,
      total: items.length,
      demo,
      query: parsed.data.query,
      workspaceId,
      documentId: parsed.data.documentId ?? null,
      limit: parsed.data.limit,
      message:
        items.length === 0
          ? "No knowledge chunks indexed yet. Upload documents via /api/knowledge/upload."
          : undefined,
    });
  } catch (error) {
    return handleRouteError(error);
  }
}
