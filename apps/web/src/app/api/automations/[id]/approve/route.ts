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
  approveRun,
  ensureUserWorkspace,
  executeRun,
  listRuns,
  writeAudit,
} from "@/lib/services";
import { approveAutomationSchema } from "@/lib/validators";

export const runtime = "nodejs";

type RouteContext = {
  params: Promise<{ id: string }>;
};

/**
 * POST /api/automations/[id]/approve
 *
 * Approves a sensitive automation run, then executes it.
 * Sensitive actions must not run until this gate succeeds.
 */
export async function POST(request: Request, context: RouteContext) {
  try {
    const limited = rateLimitByIp(request, {
      name: "automations-approve",
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

    let body: { runId?: string; note?: string } = {};
    const contentType = request.headers.get("content-type") || "";
    if (contentType.includes("application/json")) {
      const parsed = await parseBody(request, approveAutomationSchema);
      if (parsed.error) return parsed.error;
      body = parsed.data;
    }

    const { profileId, workspaceId } = await ensureUserWorkspace(
      auth.user.id,
      auth.user.email ?? `${auth.user.id}@nexa.local`,
    );

    let runId = body.runId;
    if (!runId) {
      const { items } = await listRuns({ automationId: id, limit: 20 });
      const pending = items.find((r) => r.status === "pending_approval");
      if (!pending) {
        return jsonError(
          "NOT_FOUND",
          "No pending approval run found for this automation",
          { status: 404 },
        );
      }
      runId = pending.id;
    }

    const approved = await approveRun({
      automationId: id,
      runId,
      approvedById: profileId,
      note: body.note,
    });

    let executed = approved;
    if (
      approved.run.status === "approved" ||
      approved.run.status === "running"
    ) {
      try {
        executed = await executeRun({ automationId: id, runId });
      } catch {
        // Keep approval success even if execute fails mid-flight
        executed = approved;
      }
    }

    await writeAudit({
      workspaceId,
      userId: profileId,
      action: "automation.approve",
      resourceType: "automation_run",
      resourceId: runId,
      ip: getClientIp(request),
      userAgent: request.headers.get("user-agent") ?? undefined,
      metadata: {
        automationId: id,
        note: body.note,
        status: executed.run.status,
      },
    });

    return jsonOk({
      ok: true,
      demo: executed.demo,
      automationId: id,
      run: executed.run,
      message:
        executed.run.status === "succeeded"
          ? "Sensitive automation run approved and executed."
          : "Sensitive automation run approved.",
    });
  } catch (error) {
    return handleRouteError(error);
  }
}
