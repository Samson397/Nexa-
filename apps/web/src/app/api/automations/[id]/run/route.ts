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
  enqueueRun,
  ensureUserWorkspace,
  executeRun,
  writeAudit,
} from "@/lib/services";
import { runAutomationSchema } from "@/lib/validators";

export const runtime = "nodejs";

type RouteContext = {
  params: Promise<{ id: string }>;
};

/**
 * POST /api/automations/[id]/run
 *
 * Enqueues an automation run. Executes immediately when the run is already
 * approved (non-sensitive). Sensitive runs stay pending_approval until
 * /approve is called.
 */
export async function POST(request: Request, context: RouteContext) {
  try {
    const limited = rateLimitByIp(request, {
      name: "automations-run",
      limit: 40,
      windowMs: 60_000,
    });
    if (limited) return limited;

    const auth = await requireAuth(request);
    if (auth.error) return auth.error;

    const { id } = await context.params;
    if (!id) {
      return jsonError("VALIDATION_ERROR", "Missing automation id", {
        status: 400,
      });
    }

    let body: { triggerPayload?: Record<string, unknown>; execute?: boolean } =
      { execute: true };
    const contentType = request.headers.get("content-type") || "";
    if (contentType.includes("application/json")) {
      const parsed = await parseBody(request, runAutomationSchema);
      if (parsed.error) return parsed.error;
      body = parsed.data;
    }

    const { profileId, workspaceId } = await ensureUserWorkspace(
      auth.user.id,
      auth.user.email ?? `${auth.user.id}@nexa.local`,
    );

    const enqueued = await enqueueRun({
      automationId: id,
      workspaceId,
      triggerPayload: body.triggerPayload,
    });

    let run = enqueued.run;
    let demo = enqueued.demo;

    const shouldExecute =
      body.execute !== false &&
      (run.status === "approved" || run.status === "running");

    if (shouldExecute) {
      const executed = await executeRun({
        automationId: id,
        runId: run.id,
      });
      run = executed.run;
      demo = executed.demo;
    }

    await writeAudit({
      workspaceId,
      userId: profileId,
      action: "automation.run",
      resourceType: "automation_run",
      resourceId: run.id,
      ip: getClientIp(request),
      userAgent: request.headers.get("user-agent") ?? undefined,
      metadata: {
        automationId: id,
        status: run.status,
        pendingApproval: run.status === "pending_approval",
      },
    });

    return jsonOk(
      {
        ok: true,
        demo,
        automationId: id,
        run,
        message:
          run.status === "pending_approval"
            ? "Run enqueued and awaiting approval for sensitive steps."
            : undefined,
      },
      { status: 201 },
    );
  } catch (error) {
    return handleRouteError(error);
  }
}
