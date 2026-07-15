import { and, eq } from "drizzle-orm";
import { automationRuns, automations } from "@nexa/db";
import {
  NexaError,
  SENSITIVE_AUTOMATION_ACTIONS,
} from "@nexa/shared";
import { tryGetDb } from "@/lib/db";
import { demoStore } from "@/lib/demo-store";
import { logger } from "@/lib/logger";
import { newId } from "@/lib/services/ids";
import { createTask } from "@/lib/services/tasks";
import { writeAudit } from "@/lib/services/audit";

export type AutomationStep = {
  id: string;
  type: string;
  config: Record<string, unknown>;
  requiresApproval?: boolean;
};

export type AutomationRunRecord = {
  id: string;
  automationId: string;
  status: string;
  triggerPayload?: Record<string, unknown>;
  result?: Record<string, unknown>;
  errorMessage?: string;
  approvedById?: string;
  approvedAt?: string;
  startedAt: string;
  finishedAt?: string;
  createdAt: string;
};

type StepResult = {
  stepId: string;
  type: string;
  status: "succeeded" | "skipped" | "pending_approval" | "failed";
  output?: Record<string, unknown>;
  error?: string;
};

function isSensitive(type: string): boolean {
  return (SENSITIVE_AUTOMATION_ACTIONS as readonly string[]).includes(type);
}

function runNeedsApproval(
  steps: AutomationStep[],
  approvalMode: string,
): boolean {
  // Hard rule: SENSITIVE_AUTOMATION_ACTIONS always require approveRun.
  if (steps.some((s) => isSensitive(s.type))) return true;
  if (approvalMode === "always") return true;
  if (approvalMode === "never") return false;
  return steps.some((s) => Boolean(s.requiresApproval));
}

/**
 * Create a run. Sensitive automations start as `pending_approval` and must
 * be approved via `approveRun` before `executeRun` will run side-effecting steps.
 */
export async function enqueueRun(input: {
  automationId: string;
  workspaceId?: string;
  triggerPayload?: Record<string, unknown>;
}): Promise<{ run: AutomationRunRecord; demo: boolean }> {
  const db = tryGetDb();
  const now = new Date();

  if (!db) {
    const automation = demoStore
      .automations()
      .find((a) => a.id === input.automationId);
    if (!automation) {
      throw new NexaError("NOT_FOUND", "Automation not found", { status: 404 });
    }
    if (!automation.isEnabled) {
      throw new NexaError("AUTOMATION_DISABLED", "Automation is disabled", {
        status: 400,
      });
    }

    const needsApproval = runNeedsApproval(
      automation.steps,
      automation.approvalMode,
    );
    const status = needsApproval ? "pending_approval" : "approved";
    const run = {
      id: newId(),
      status,
      triggerPayload: input.triggerPayload ?? {},
      createdAt: now.toISOString(),
      startedAt: now.toISOString(),
    };
    automation.pendingRuns.unshift(run);
    automation.updatedAt = now.toISOString();

    return {
      run: {
        id: run.id,
        automationId: automation.id,
        status: run.status,
        triggerPayload: run.triggerPayload,
        startedAt: run.startedAt,
        createdAt: run.createdAt,
      },
      demo: true,
    };
  }

  const rows = await db
    .select()
    .from(automations)
    .where(
      and(
        eq(automations.id, input.automationId),
        ...(input.workspaceId
          ? [eq(automations.workspaceId, input.workspaceId)]
          : []),
      ),
    )
    .limit(1);

  const automation = rows[0];
  if (!automation) {
    throw new NexaError("NOT_FOUND", "Automation not found", { status: 404 });
  }
  if (!automation.isEnabled) {
    throw new NexaError("AUTOMATION_DISABLED", "Automation is disabled", {
      status: 400,
    });
  }

  const steps = (automation.steps ?? []) as AutomationStep[];
  const needsApproval = runNeedsApproval(steps, automation.approvalMode);
  const status = needsApproval ? "pending_approval" : "approved";

  const inserted = await db
    .insert(automationRuns)
    .values({
      automationId: automation.id,
      status,
      triggerPayload: input.triggerPayload ?? {},
      startedAt: now,
    })
    .returning();

  const row = inserted[0]!;
  return {
    run: {
      id: row.id,
      automationId: row.automationId,
      status: row.status,
      triggerPayload: (row.triggerPayload as Record<string, unknown>) ?? {},
      startedAt: row.startedAt.toISOString(),
      createdAt: row.startedAt.toISOString(),
    },
    demo: false,
  };
}

/**
 * Mark a pending run as approved. Required before sensitive steps execute.
 */
export async function approveRun(input: {
  automationId: string;
  runId: string;
  approvedById: string;
  note?: string;
}): Promise<{ run: AutomationRunRecord; demo: boolean }> {
  const db = tryGetDb();
  const now = new Date();

  if (!db) {
    const automation = demoStore
      .automations()
      .find((a) => a.id === input.automationId);
    if (!automation) {
      throw new NexaError("NOT_FOUND", "Automation not found", { status: 404 });
    }
    const run = automation.pendingRuns.find((r) => r.id === input.runId);
    if (!run) {
      throw new NexaError("NOT_FOUND", "Automation run not found", {
        status: 404,
      });
    }
    if (run.status !== "pending_approval" && run.status !== "approved") {
      throw new NexaError(
        "INVALID_STATE",
        `Cannot approve run in status ${run.status}`,
        { status: 400 },
      );
    }
    run.status = "approved";
    run.approvedAt = now.toISOString();
    run.approvedBy = input.approvedById;
    if (input.note) {
      run.result = { ...(run.result ?? {}), approvalNote: input.note };
    }
    automation.updatedAt = now.toISOString();

    await writeAudit({
      workspaceId: automation.workspaceId,
      userId: input.approvedById,
      action: "automation.approve",
      resourceType: "automation_run",
      resourceId: run.id,
      metadata: { automationId: automation.id, note: input.note },
    });

    return {
      run: {
        id: run.id,
        automationId: automation.id,
        status: run.status,
        triggerPayload: run.triggerPayload,
        result: run.result,
        approvedById: run.approvedBy,
        approvedAt: run.approvedAt,
        startedAt: run.startedAt ?? run.createdAt,
        createdAt: run.createdAt,
      },
      demo: true,
    };
  }

  const rows = await db
    .select()
    .from(automationRuns)
    .where(
      and(
        eq(automationRuns.id, input.runId),
        eq(automationRuns.automationId, input.automationId),
      ),
    )
    .limit(1);

  const run = rows[0];
  if (!run) {
    throw new NexaError("NOT_FOUND", "Automation run not found", {
      status: 404,
    });
  }
  if (run.status !== "pending_approval" && run.status !== "approved") {
    throw new NexaError(
      "INVALID_STATE",
      `Cannot approve run in status ${run.status}`,
      { status: 400 },
    );
  }

  const updated = await db
    .update(automationRuns)
    .set({
      status: "approved",
      approvedById: input.approvedById,
      approvedAt: now,
      result: {
        ...((run.result as Record<string, unknown>) ?? {}),
        ...(input.note ? { approvalNote: input.note } : {}),
      },
    })
    .where(eq(automationRuns.id, input.runId))
    .returning();

  const auto = await db
    .select()
    .from(automations)
    .where(eq(automations.id, input.automationId))
    .limit(1);

  await writeAudit({
    workspaceId: auto[0]?.workspaceId,
    userId: input.approvedById,
    action: "automation.approve",
    resourceType: "automation_run",
    resourceId: input.runId,
    metadata: { automationId: input.automationId, note: input.note },
  });

  const row = updated[0]!;
  return {
    run: {
      id: row.id,
      automationId: row.automationId,
      status: row.status,
      triggerPayload: (row.triggerPayload as Record<string, unknown>) ?? {},
      result: (row.result as Record<string, unknown>) ?? {},
      approvedById: row.approvedById ?? undefined,
      approvedAt: row.approvedAt?.toISOString(),
      startedAt: row.startedAt.toISOString(),
      createdAt: row.startedAt.toISOString(),
    },
    demo: false,
  };
}

/**
 * Execute automation steps. Sensitive steps (see SENSITIVE_AUTOMATION_ACTIONS)
 * refuse to run until the run status is `approved`.
 */
export async function executeRun(input: {
  automationId: string;
  runId: string;
}): Promise<{ run: AutomationRunRecord; demo: boolean }> {
  const db = tryGetDb();

  if (!db) {
    const automation = demoStore
      .automations()
      .find((a) => a.id === input.automationId);
    if (!automation) {
      throw new NexaError("NOT_FOUND", "Automation not found", { status: 404 });
    }
    const run = automation.pendingRuns.find((r) => r.id === input.runId);
    if (!run) {
      throw new NexaError("NOT_FOUND", "Automation run not found", {
        status: 404,
      });
    }

    assertRunnable(run.status, automation.steps, automation.approvalMode);

    const runApproved =
      run.status === "approved" || Boolean(run.approvedAt);
    run.status = "running";
    const started = new Date().toISOString();
    run.startedAt = started;

    try {
      const stepResults = await runSteps({
        steps: automation.steps,
        approvalMode: automation.approvalMode,
        runApproved,
        workspaceId: automation.workspaceId ?? "",
        createdById: automation.createdById ?? "",
        triggerPayload: run.triggerPayload ?? {},
        runId: run.id,
      });

      const blocked = stepResults.some((s) => s.status === "pending_approval");
      const failed = stepResults.some((s) => s.status === "failed");

      run.result = { steps: stepResults };
      run.finishedAt = new Date().toISOString();
      if (blocked) {
        run.status = "pending_approval";
      } else if (failed) {
        run.status = "failed";
        run.errorMessage = stepResults.find((s) => s.error)?.error;
      } else {
        run.status = "succeeded";
      }
      automation.updatedAt = run.finishedAt;

      return {
        run: {
          id: run.id,
          automationId: automation.id,
          status: run.status,
          triggerPayload: run.triggerPayload,
          result: run.result,
          errorMessage: run.errorMessage,
          approvedById: run.approvedBy,
          approvedAt: run.approvedAt,
          startedAt: run.startedAt,
          finishedAt: run.finishedAt,
          createdAt: run.createdAt,
        },
        demo: true,
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : "Run failed";
      run.status = "failed";
      run.errorMessage = message;
      run.finishedAt = new Date().toISOString();
      throw error;
    }
  }

  const runRows = await db
    .select()
    .from(automationRuns)
    .where(
      and(
        eq(automationRuns.id, input.runId),
        eq(automationRuns.automationId, input.automationId),
      ),
    )
    .limit(1);

  const run = runRows[0];
  if (!run) {
    throw new NexaError("NOT_FOUND", "Automation run not found", {
      status: 404,
    });
  }

  const autoRows = await db
    .select()
    .from(automations)
    .where(eq(automations.id, input.automationId))
    .limit(1);
  const automation = autoRows[0];
  if (!automation) {
    throw new NexaError("NOT_FOUND", "Automation not found", { status: 404 });
  }

  const steps = (automation.steps ?? []) as AutomationStep[];
  assertRunnable(run.status, steps, automation.approvalMode);

  const runApproved =
    run.status === "approved" || Boolean(run.approvedAt);

  await db
    .update(automationRuns)
    .set({ status: "running", startedAt: new Date() })
    .where(eq(automationRuns.id, input.runId));

  try {
    const stepResults = await runSteps({
      steps,
      approvalMode: automation.approvalMode,
      runApproved,
      workspaceId: automation.workspaceId,
      createdById: automation.createdById,
      triggerPayload: (run.triggerPayload as Record<string, unknown>) ?? {},
      runId: run.id,
    });

    const blocked = stepResults.some((s) => s.status === "pending_approval");
    const failed = stepResults.some((s) => s.status === "failed");
    const finishedAt = new Date();
    let status: "succeeded" | "failed" | "pending_approval" = "succeeded";
    let errorMessage: string | null = null;
    if (blocked) status = "pending_approval";
    else if (failed) {
      status = "failed";
      errorMessage = stepResults.find((s) => s.error)?.error ?? "Step failed";
    }

    const updated = await db
      .update(automationRuns)
      .set({
        status,
        result: { steps: stepResults },
        errorMessage,
        finishedAt,
      })
      .where(eq(automationRuns.id, input.runId))
      .returning();

    const row = updated[0]!;
    return {
      run: {
        id: row.id,
        automationId: row.automationId,
        status: row.status,
        triggerPayload: (row.triggerPayload as Record<string, unknown>) ?? {},
        result: (row.result as Record<string, unknown>) ?? {},
        errorMessage: row.errorMessage ?? undefined,
        approvedById: row.approvedById ?? undefined,
        approvedAt: row.approvedAt?.toISOString(),
        startedAt: row.startedAt.toISOString(),
        finishedAt: row.finishedAt?.toISOString(),
        createdAt: row.startedAt.toISOString(),
      },
      demo: false,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Run failed";
    await db
      .update(automationRuns)
      .set({
        status: "failed",
        errorMessage: message,
        finishedAt: new Date(),
      })
      .where(eq(automationRuns.id, input.runId));
    throw error;
  }
}

function assertRunnable(
  status: string,
  steps: AutomationStep[],
  approvalMode: string,
): void {
  if (
    status === "succeeded" ||
    status === "rejected" ||
    status === "cancelled" ||
    status === "running"
  ) {
    throw new NexaError(
      "INVALID_STATE",
      `Cannot execute run in status ${status}`,
      { status: 400 },
    );
  }

  const needsApproval = runNeedsApproval(steps, approvalMode);
  if (needsApproval && status !== "approved") {
    throw new NexaError(
      "APPROVAL_REQUIRED",
      "Sensitive automation run requires approveRun before executeRun",
      { status: 403 },
    );
  }

  if (!needsApproval && status !== "approved" && status !== "pending_approval") {
    throw new NexaError(
      "INVALID_STATE",
      `Cannot execute run in status ${status}`,
      { status: 400 },
    );
  }
}

async function runSteps(ctx: {
  steps: AutomationStep[];
  approvalMode: string;
  runApproved: boolean;
  workspaceId: string;
  createdById: string;
  triggerPayload: Record<string, unknown>;
  runId: string;
}): Promise<StepResult[]> {
  const results: StepResult[] = [];

  for (const step of ctx.steps) {
    const alwaysApprove = ctx.approvalMode === "always";
    const needsStepApproval =
      isSensitive(step.type) || alwaysApprove || Boolean(step.requiresApproval);

    if (needsStepApproval && !ctx.runApproved) {
      results.push({
        stepId: step.id,
        type: step.type,
        status: "pending_approval",
        output: {
          message:
            "Awaiting explicit approval before executing sensitive step",
        },
      });
      continue;
    }

    try {
      const output = await executeStep(step, ctx);
      results.push({
        stepId: step.id,
        type: step.type,
        status: "succeeded",
        output,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Step failed";
      results.push({
        stepId: step.id,
        type: step.type,
        status: "failed",
        error: message,
      });
      break;
    }
  }

  return results;
}

async function executeStep(
  step: AutomationStep,
  ctx: {
    workspaceId: string;
    createdById: string;
    triggerPayload: Record<string, unknown>;
    runId: string;
  },
): Promise<Record<string, unknown>> {
  switch (step.type) {
    case "noop":
      return { ok: true };

    case "log": {
      const message =
        typeof step.config.message === "string"
          ? step.config.message
          : "automation.log";
      logger.info(message, {
        runId: ctx.runId,
        stepId: step.id,
        config: step.config,
        triggerPayload: ctx.triggerPayload,
      });
      return { logged: true, message };
    }

    case "notify": {
      const title =
        typeof step.config.title === "string"
          ? step.config.title
          : "Automation notification";
      const body =
        typeof step.config.body === "string" ? step.config.body : undefined;
      logger.info("automation.notify", {
        title,
        body,
        runId: ctx.runId,
        workspaceId: ctx.workspaceId,
      });
      await writeAudit({
        workspaceId: ctx.workspaceId,
        userId: ctx.createdById,
        action: "automation.run",
        resourceType: "automation_step",
        resourceId: step.id,
        metadata: { type: "notify", title, body },
      });
      return { notified: true, title, body };
    }

    case "create_task": {
      const title =
        typeof step.config.title === "string"
          ? step.config.title
          : "Automation task";
      const description =
        typeof step.config.description === "string"
          ? step.config.description
          : undefined;
      if (!ctx.workspaceId || !ctx.createdById) {
        throw new Error("create_task requires workspaceId and createdById");
      }
      const { task, demo } = await createTask({
        workspaceId: ctx.workspaceId,
        createdById: ctx.createdById,
        title,
        description,
        priority:
          typeof step.config.priority === "string"
            ? step.config.priority
            : "medium",
        status: "todo",
      });
      return { taskId: task.id, demo };
    }

    case "send_email": {
      // Draft only unless the run was approved (caller already gated).
      const to = typeof step.config.to === "string" ? step.config.to : "";
      const subject =
        typeof step.config.subject === "string" ? step.config.subject : "";
      const body =
        typeof step.config.body === "string" ? step.config.body : "";
      const draft = {
        to,
        subject,
        body,
        status: "draft_sent_via_provider_stub",
        note: "Email dispatch is stubbed; wire SMTP/provider in production.",
      };
      logger.info("automation.send_email.draft", {
        runId: ctx.runId,
        to,
        subject,
      });
      return draft;
    }

    case "webhook": {
      const url = typeof step.config.url === "string" ? step.config.url : "";
      if (!url || !/^https?:\/\//i.test(url)) {
        throw new Error("webhook step requires a valid http(s) url in config");
      }
      const method =
        typeof step.config.method === "string"
          ? step.config.method.toUpperCase()
          : "POST";
      const payload =
        (step.config.body as Record<string, unknown> | undefined) ??
        ctx.triggerPayload;

      const res = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
          "User-Agent": "NEXA-Automation/1.0",
        },
        body: method === "GET" || method === "HEAD" ? undefined : JSON.stringify(payload),
      });

      const text = await res.text().catch(() => "");
      return {
        status: res.status,
        ok: res.ok,
        body: text.slice(0, 4_000),
      };
    }

    case "send_message":
    case "publish_content":
    case "modify_data":
    case "delete_data":
    case "charge_payment": {
      // Sensitive actions: only reached when run is approved. Still draft/stub.
      logger.info(`automation.${step.type}.approved_stub`, {
        runId: ctx.runId,
        stepId: step.id,
        config: step.config,
      });
      return {
        stub: true,
        type: step.type,
        message: `${step.type} executed as approved stub — wire provider integrations for production.`,
      };
    }

    default:
      logger.warn("automation.unknown_step", { type: step.type, stepId: step.id });
      return { skipped: true, reason: `Unknown step type: ${step.type}` };
  }
}
