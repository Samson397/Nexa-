import {
  formatZodError,
  handleRouteError,
  jsonError,
  jsonOk,
  parseBody,
  rateLimitByIp,
  requireAuth,
} from "@/lib/api";
import {
  createConversation,
  ensureUserWorkspace,
  listConversations,
} from "@/lib/services";
import {
  createConversationSchema,
  listConversationsQuerySchema,
} from "@/lib/validators";

export const runtime = "nodejs";

/** GET /api/conversations — list conversations for the current user. */
export async function GET(request: Request) {
  try {
    const limited = rateLimitByIp(request, {
      name: "conversations-get",
      limit: 120,
      windowMs: 60_000,
    });
    if (limited) return limited;

    const auth = await requireAuth(request);
    if (auth.error) return auth.error;

    const { searchParams } = new URL(request.url);
    const query = listConversationsQuerySchema.safeParse({
      workspaceId: searchParams.get("workspaceId") ?? undefined,
      limit: searchParams.get("limit") ?? undefined,
    });
    if (!query.success) {
      return jsonError("VALIDATION_ERROR", "Invalid query parameters", {
        status: 400,
        details: formatZodError(query.error),
      });
    }

    const { profileId, workspaceId: defaultWs } = await ensureUserWorkspace(
      auth.user.id,
      auth.user.email ?? `${auth.user.id}@nexa.local`,
    );
    const workspaceId = query.data.workspaceId ?? defaultWs;

    const { items, demo } = await listConversations({
      workspaceId,
      userId: profileId,
      limit: query.data.limit,
    });

    return jsonOk({ items, total: items.length, demo });
  } catch (error) {
    return handleRouteError(error);
  }
}

/** POST /api/conversations — create a conversation. */
export async function POST(request: Request) {
  try {
    const limited = rateLimitByIp(request, {
      name: "conversations-post",
      limit: 40,
      windowMs: 60_000,
    });
    if (limited) return limited;

    const auth = await requireAuth(request);
    if (auth.error) return auth.error;

    const parsed = await parseBody(request, createConversationSchema);
    if (parsed.error) return parsed.error;

    const { profileId, workspaceId: defaultWs } = await ensureUserWorkspace(
      auth.user.id,
      auth.user.email ?? `${auth.user.id}@nexa.local`,
    );
    const workspaceId = parsed.data.workspaceId ?? defaultWs;

    const { conversation, demo } = await createConversation({
      workspaceId,
      userId: profileId,
      title: parsed.data.title,
      agentId: parsed.data.agentId,
      provider: parsed.data.provider,
      model: parsed.data.model,
      metadata: parsed.data.metadata,
    });

    return jsonOk({ ok: true, demo, conversation }, { status: 201 });
  } catch (error) {
    return handleRouteError(error);
  }
}
