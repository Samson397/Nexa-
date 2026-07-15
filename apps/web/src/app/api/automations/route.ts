import { SENSITIVE_AUTOMATION_ACTIONS } from "@nexa/shared";
import {
  getClientIp,
  handleRouteError,
  jsonOk,
  parseBody,
  rateLimitByIp,
  requireAuth,
} from "@/lib/api";
import {
  createAutomation,
  ensureUserWorkspace,
  listAutomations,
  writeAudit,
} from "@/lib/services";
import { createAutomationSchema } from "@/lib/validators";

export const runtime = "nodejs";

/**
 * GET /api/automations — list automations.
 * POST /api/automations — create automation.
 *
 * Security: Sensitive automation actions need approval before runs execute —
 * see /api/automations/[id]/approve.
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
    const { workspaceId: defaultWs } = await ensureUserWorkspace(
      auth.user.id,
      auth.user.email ?? `${auth.user.id}@nexa.local`,
    );
    const workspaceId = searchParams.get("workspaceId") ?? defaultWs;

    const { items, demo } = await listAutomations({ workspaceId });

    return jsonOk({
      items,
      total: items.length,
      demo,
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

    const { profileId, workspaceId: defaultWs } = await ensureUserWorkspace(
      auth.user.id,
      auth.user.email ?? `${auth.user.id}@nexa.local`,
    );
    const workspaceId = parsed.data.workspaceId ?? defaultWs;

    const { automation, demo } = await createAutomation({
      workspaceId,
      createdById: profileId,
      name: parsed.data.name,
      description: parsed.data.description,
      isEnabled: parsed.data.isEnabled,
      approvalMode: parsed.data.approvalMode,
      trigger: parsed.data.trigger,
      steps: (parsed.data.steps ?? []).map((step) => ({
        id: step.id,
        type: step.type,
        config: step.config ?? {},
        requiresApproval: step.requiresApproval,
      })),
    });

    await writeAudit({
      workspaceId,
      userId: profileId,
      action: "settings.update",
      resourceType: "automation",
      resourceId: automation.id,
      ip: getClientIp(request),
      userAgent: request.headers.get("user-agent") ?? undefined,
      metadata: {
        name: automation.name,
        approvalMode: automation.approvalMode,
      },
    });

    return jsonOk(
      {
        ok: true,
        demo,
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
