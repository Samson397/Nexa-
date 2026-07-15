import {
  formatZodError,
  handleRouteError,
  jsonError,
  jsonOk,
  newId,
  parseBody,
  rateLimitByIp,
  requireAuth,
} from "@/lib/api";
import { demoStore, type DemoTask } from "@/lib/demo-store";
import { createTaskSchema, listTasksQuerySchema } from "@/lib/validators";

export const runtime = "nodejs";

/** GET /api/tasks — list tasks (demo store when no DB). */
export async function GET(request: Request) {
  try {
    const limited = rateLimitByIp(request, {
      name: "tasks-get",
      limit: 120,
      windowMs: 60_000,
    });
    if (limited) return limited;

    const auth = await requireAuth(request);
    if (auth.error) return auth.error;

    const { searchParams } = new URL(request.url);
    const query = listTasksQuerySchema.safeParse({
      workspaceId: searchParams.get("workspaceId") ?? undefined,
      status: searchParams.get("status") ?? undefined,
      page: searchParams.get("page") ?? undefined,
      pageSize: searchParams.get("pageSize") ?? undefined,
    });

    if (!query.success) {
      return jsonError("VALIDATION_ERROR", "Invalid query parameters", {
        status: 400,
        details: formatZodError(query.error),
      });
    }

    const { workspaceId, status, page, pageSize } = query.data;
    let items = [...demoStore.tasks()];
    if (workspaceId) {
      items = items.filter((t) => t.workspaceId === workspaceId);
    }
    if (status) {
      items = items.filter((t) => t.status === status);
    }

    const total = items.length;
    const start = (page - 1) * pageSize;
    const pageItems = items.slice(start, start + pageSize);

    return jsonOk({
      items: pageItems,
      total,
      page,
      pageSize,
      hasMore: start + pageSize < total,
      demo: true,
    });
  } catch (error) {
    return handleRouteError(error);
  }
}

/** POST /api/tasks — create a task (zod-validated). */
export async function POST(request: Request) {
  try {
    const limited = rateLimitByIp(request, {
      name: "tasks-post",
      limit: 60,
      windowMs: 60_000,
    });
    if (limited) return limited;

    const auth = await requireAuth(request);
    if (auth.error) return auth.error;

    const parsed = await parseBody(request, createTaskSchema);
    if (parsed.error) return parsed.error;

    const now = new Date().toISOString();
    const task: DemoTask = {
      id: newId(),
      title: parsed.data.title,
      description: parsed.data.description,
      workspaceId: parsed.data.workspaceId,
      projectId: parsed.data.projectId,
      status: parsed.data.status ?? "todo",
      priority: parsed.data.priority ?? "medium",
      assigneeId: parsed.data.assigneeId,
      dueDate: parsed.data.dueDate,
      createdAt: now,
      updatedAt: now,
    };

    demoStore.tasks().unshift(task);

    return jsonOk({ ok: true, demo: true, task }, { status: 201 });
  } catch (error) {
    return handleRouteError(error);
  }
}
