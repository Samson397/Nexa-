import {
  handleRouteError,
  jsonOk,
  parseBody,
  rateLimitByIp,
  requireAuth,
} from "@/lib/api";
import { knowledgeSearchSchema } from "@/lib/validators";

export const runtime = "nodejs";

/**
 * POST /api/knowledge/search — vector knowledge search stub.
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

    const { query, limit, workspaceId, documentId } = parsed.data;

    // Stub: no indexed corpus yet
    return jsonOk({
      items: [],
      total: 0,
      demo: true,
      query,
      workspaceId: workspaceId ?? null,
      documentId: documentId ?? null,
      limit,
      message:
        "No knowledge chunks indexed yet. Upload documents via /api/knowledge/upload after wiring storage and pgvector.",
    });
  } catch (error) {
    return handleRouteError(error);
  }
}
