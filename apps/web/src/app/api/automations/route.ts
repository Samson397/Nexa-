import { SENSITIVE_AUTOMATION_ACTIONS } from "@nexa/shared";
import {
  handleRouteError,
  jsonOk,
  newId,
  parseBody,
  rateLimitByIp,
  requireAuth,
} from "@/lib/api";
import { demoStore, type DemoAutomation } from "@/lib/demo-store";
import { createAutomationSchema } from "@/lib/validators";

export const runtime = "nodejs";

/**
 * GET /api/automations — list automations.
 * POST /api/automations — create automation.
 *
 * Security: Sensitive automation actions (send_message, publish_content,
 * modify_data, delete_data, charge_payment, send_email) need approval before
 * runs execute — see /api/automations/[id]/approve.
 */
export async function GET(request: Request) {
  try {
    const limited = rateLimitByIp(request, {
      name: "automations-get",
      limit: 120,
      windowMs: 60_000,
    });
    if (limited) return limited;

    const auth = await requireAuth(request);
    if (auth.error) return auth.error;

    const { searchParams } = new URL(request.url);
    const workspaceId = searchParams.get("workspaceId");

    let items = [...demoStore.automations()];
    if (workspaceId) {
      items = items.filter((a) => a.workspaceId === workspaceId);
    }

    return jsonOk({
      items,
      total: items.length,
      demo: true,
      sensitiveActions: SENSITIVE_AUTOMATION_ACTIONS,
    });
  } catch (error) {
    return handleRouteError(error);
  }
}

export async function POST(request: Request) {
  try {
    const limited = rateLimitByIp(request, {
      name: "automations-post",
      limit: 40,
      windowMs: 60_000,
    });
    if (limited) return limited;

    const auth = await requireAuth(request);
    if (auth.error) return auth.error;

    const parsed = await parseBody(request, createAutomationSchema);
    if (parsed.error) return parsed.error;

    const now = new Date().toISOString();
    const approvalMode = parsed.data.approvalMode ?? "sensitive_only";
    const inputSteps = parsed.data.steps ?? [];
    const steps = inputSteps.map((step) => {
      const isSensitive = (
        SENSITIVE_AUTOMATION_ACTIONS as readonly string[]
      ).includes(step.type);
      return {
        id: step.id,
        type: step.type,
        config: step.config ?? {},
        // Force approval flag for sensitive steps unless approvalMode is never
        // (still catalogued — runtime gate remains in approve endpoint).
        requiresApproval:
          step.requiresApproval ??
          (approvalMode === "always" ||
            (approvalMode === "sensitive_only" && isSensitive)),
      };
    });

    const automation: DemoAutomation = {
      id: newId(),
      name: parsed.data.name,
      description: parsed.data.description,
      workspaceId: parsed.data.workspaceId,
      isEnabled: parsed.data.isEnabled ?? true,
      approvalMode,
      trigger: {
        type: parsed.data.trigger.type,
        config: parsed.data.trigger.config ?? {},
      },
      steps,
      createdAt: now,
      updatedAt: now,
      pendingRuns: [],
    };

    demoStore.automations().unshift(automation);

    return jsonOk(
      {
        ok: true,
        demo: true,
        automation,
        message:
          "Automation created. Sensitive steps require approval before execution.",
      },
      { status: 201 },
    );
  } catch (error) {
    return handleRouteError(error);
  }
}
