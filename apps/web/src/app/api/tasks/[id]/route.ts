import {
  getClientIp,
  handleRouteError,
  jsonError,
  jsonOk,
  parseBody,
  rateLimitByIp,
  requireAuth,
} from "@/lib/api";
import {
  deleteTask,
  ensureUserWorkspace,
  updateTask,
  writeAudit,
} from "@/lib/services";
import { updateTaskSchema } from "@/lib/validators";

export const runtime = "nodejs";

type RouteContext = {
  params: Promise<{ id: string }>;
};

/** PATCH /api/tasks/[id] — update a task. */
export async function PATCH(request: Request, context: RouteContext) {
  try {
    const limited = rateLimitByIp(request, {
      name: "tasks-patch",
      limit: 60,
      windowMs: 60_000,
    });
    if (limited) return limited;

    const auth = await requireAuth(request);
    if (auth.error) return auth.error;

    const { id } = await context.params;
    if (!id) {
      return jsonError("VALIDATION_ERROR", "Missing task id", { status: 400 });
    }

    const parsed = await parseBody(request, updateTaskSchema);
    if (parsed.error) return parsed.error;

    const { profileId, workspaceId } = await ensureUserWorkspace(
      auth.user.id,
      auth.user.email ?? `${auth.user.id}@nexa.local`,
    );

    const { task, demo } = await updateTask(id, workspaceId, parsed.data);

    await writeAudit({
      workspaceId,
      userId: profileId,
      action: "settings.update",
      resourceType: "task",
      resourceId: task.id,
      ip: getClientIp(request),
      userAgent: request.headers.get("user-agent") ?? undefined,
      metadata: { patch: Object.keys(parsed.data) },
    });

    return jsonOk({ ok: true, demo, task });
  } catch (error) {
    return handleRouteError(error);
  }
}

/** DELETE /api/tasks/[id] — delete a task. */
export async function DELETE(request: Request, context: RouteContext) {
  try {
    const limited = rateLimitByIp(request, {
      name: "tasks-delete",
      limit: 40,
      windowMs: 60_000,
    });
    if (limited) return limited;

    const auth = await requireAuth(request);
    if (auth.error) return auth.error;

    const { id } = await context.params;
    if (!id) {
      return jsonError("VALIDATION_ERROR", "Missing task id", { status: 400 });
    }

    const { profileId, workspaceId } = await ensureUserWorkspace(
      auth.user.id,
      auth.user.email ?? `${auth.user.id}@nexa.local`,
    );

    const { deleted, demo } = await deleteTask(id, workspaceId);

    await writeAudit({
      workspaceId,
      userId: profileId,
      action: "file.delete",
      resourceType: "task",
      resourceId: id,
      ip: getClientIp(request),
      userAgent: request.headers.get("user-agent") ?? undefined,
    });

    return jsonOk({ ok: true, deleted, demo });
  } catch (error) {
    return handleRouteError(error);
  }
}
