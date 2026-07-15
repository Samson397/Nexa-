import {
  handleRouteError,
  jsonError,
  jsonOk,
  newId,
  parseBody,
  rateLimitByIp,
  requireAuth,
} from "@/lib/api";
import { demoStore } from "@/lib/demo-store";
import { approveAutomationSchema } from "@/lib/validators";

export const runtime = "nodejs";

type RouteContext = {
  params: Promise<{ id: string }>;
};

/**
 * POST /api/automations/[id]/approve
 *
 * Approves a sensitive automation run. Sensitive actions must not execute
 * until this gate succeeds. Never auto-approve charge_payment / send_email /
 * publish_content without an explicit user call to this endpoint.
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

    const automation = demoStore.automations().find((a) => a.id === id);
    if (!automation) {
      return jsonError("NOT_FOUND", "Automation not found", { status: 404 });
    }

    const now = new Date().toISOString();
    let run = automation.pendingRuns.find(
      (r) => r.id === body.runId || r.status === "pending_approval",
    );

    if (!run) {
      run = {
        id: body.runId ?? newId(),
        status: "pending_approval",
        createdAt: now,
      };
      automation.pendingRuns.unshift(run);
    }

    run.status = "approved";
    run.approvedAt = now;
    run.approvedBy = auth.user.id;
    automation.updatedAt = now;

    return jsonOk({
      ok: true,
      demo: true,
      automationId: automation.id,
      run: {
        id: run.id,
        status: run.status,
        approvedAt: run.approvedAt,
        approvedBy: run.approvedBy,
        note: body.note,
      },
      message:
        "Sensitive automation run approved. Execution would proceed in a wired worker.",
    });
  } catch (error) {
    return handleRouteError(error);
  }
}
