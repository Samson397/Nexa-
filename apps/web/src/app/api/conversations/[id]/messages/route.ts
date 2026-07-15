import {
  formatZodError,
  handleRouteError,
  jsonError,
  jsonOk,
  rateLimitByIp,
  requireAuth,
} from "@/lib/api";
import {
  ensureUserWorkspace,
  getConversation,
  listMessages,
} from "@/lib/services";
import { z } from "zod";

export const runtime = "nodejs";

type RouteContext = {
  params: Promise<{ id: string }>;
};

const listMessagesQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(500).default(200),
});

/** GET /api/conversations/[id]/messages — list messages in a conversation. */
export async function GET(request: Request, context: RouteContext) {
  try {
    const limited = rateLimitByIp(request, {
      name: "conversation-messages",
      limit: 120,
      windowMs: 60_000,
    });
    if (limited) return limited;

    const auth = await requireAuth(request);
    if (auth.error) return auth.error;

    const { id } = await context.params;
    if (!id) {
      return jsonError("VALIDATION_ERROR", "Missing conversation id", {
        status: 400,
      });
    }

    const { searchParams } = new URL(request.url);
    const query = listMessagesQuerySchema.safeParse({
      limit: searchParams.get("limit") ?? undefined,
    });
    if (!query.success) {
      return jsonError("VALIDATION_ERROR", "Invalid query parameters", {
        status: 400,
        details: formatZodError(query.error),
      });
    }

    const { profileId, workspaceId } = await ensureUserWorkspace(
      auth.user.id,
      auth.user.email ?? `${auth.user.id}@nexa.local`,
    );

    // Ownership check
    await getConversation(id, { workspaceId, userId: profileId });

    const { items, demo } = await listMessages({
      conversationId: id,
      limit: query.data.limit,
    });

    return jsonOk({ items, total: items.length, demo, conversationId: id });
  } catch (error) {
    return handleRouteError(error);
  }
}
