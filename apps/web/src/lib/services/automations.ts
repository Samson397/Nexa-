import { and, desc, eq } from "drizzle-orm";
import { automationRuns, automations } from "@nexa/db";
import {
  NexaError,
  SENSITIVE_AUTOMATION_ACTIONS,
  type AutomationApprovalMode,
} from "@nexa/shared";
import { tryGetDb } from "@/lib/db";
import { demoStore, type DemoAutomation } from "@/lib/demo-store";
import { newId } from "@/lib/services/ids";
import {
  approveRun as engineApproveRun,
  enqueueRun as engineEnqueueRun,
  executeRun as engineExecuteRun,
  type AutomationRunRecord,
  type AutomationStep,
} from "@/lib/services/automation-engine";

export type AutomationRecord = {
  id: string;
  workspaceId: string;
  createdById?: string | null;
  name: string;
  description?: string | null;
  isEnabled: boolean;
  approvalMode: string;
  trigger: { type: string; config: Record<string, unknown> };
  steps: AutomationStep[];
  createdAt: string;
  updatedAt: string;
  pendingRuns?: AutomationRunRecord[];
};

export type CreateAutomationInput = {
  workspaceId: string;
  createdById: string;
  name: string;
  description?: string;
  isEnabled?: boolean;
  approvalMode?: AutomationApprovalMode | string;
  trigger: { type: string; config?: Record<string, unknown> };
  steps?: AutomationStep[];
};

export type UpdateAutomationInput = {
  name?: string;
  description?: string | null;
  isEnabled?: boolean;
  approvalMode?: AutomationApprovalMode | string;
  trigger?: { type: string; config?: Record<string, unknown> };
  steps?: AutomationStep[];
};

export function isSensitiveStepType(type: string): boolean {
  return (SENSITIVE_AUTOMATION_ACTIONS as readonly string[]).includes(type);
}

export function normalizeSteps(
  steps: AutomationStep[],
  approvalMode: string,
): AutomationStep[] {
  return steps.map((step) => {
    const sensitive = isSensitiveStepType(step.type);
    const requiresApproval =
      step.requiresApproval ??
      (approvalMode === "always" ||
        (approvalMode === "sensitive_only" && sensitive));
    return {
      id: step.id || newId(),
      type: step.type,
      config: step.config ?? {},
      requiresApproval,
    };
  });
}

export async function listAutomations(input: {
  workspaceId: string;
}): Promise<{ items: AutomationRecord[]; demo: boolean }> {
  const db = tryGetDb();

  if (!db) {
    const items = demoStore
      .automations()
      .filter((a) => !a.workspaceId || a.workspaceId === input.workspaceId)
      .map(fromDemo);
    return { items, demo: true };
  }

  const rows = await db
    .select()
    .from(automations)
    .where(eq(automations.workspaceId, input.workspaceId))
    .orderBy(desc(automations.updatedAt));

  return { items: rows.map(fromDb), demo: false };
}

export async function getAutomation(
  automationId: string,
  workspaceId?: string,
): Promise<{ automation: AutomationRecord; demo: boolean }> {
  const db = tryGetDb();

  if (!db) {
    const found = demoStore.automations().find((a) => {
      if (a.id !== automationId) return false;
      if (workspaceId && a.workspaceId && a.workspaceId !== workspaceId) {
        return false;
      }
      return true;
    });
    if (!found) {
      throw new NexaError("NOT_FOUND", "Automation not found", { status: 404 });
    }
    return { automation: fromDemo(found), demo: true };
  }

  const conditions = [eq(automations.id, automationId)];
  if (workspaceId) conditions.push(eq(automations.workspaceId, workspaceId));

  const rows = await db
    .select()
    .from(automations)
    .where(and(...conditions))
    .limit(1);

  if (!rows[0]) {
    throw new NexaError("NOT_FOUND", "Automation not found", { status: 404 });
  }
  return { automation: fromDb(rows[0]), demo: false };
}

export async function createAutomation(
  input: CreateAutomationInput,
): Promise<{ automation: AutomationRecord; demo: boolean }> {
  const name = input.name.trim();
  if (!name) {
    throw new NexaError("VALIDATION_ERROR", "Automation name is required", {
      status: 400,
    });
  }

  const approvalMode = input.approvalMode ?? "sensitive_only";
  const steps = normalizeSteps(input.steps ?? [], approvalMode);
  const trigger = {
    type: input.trigger.type,
    config: input.trigger.config ?? {},
  };
  const db = tryGetDb();

  if (!db) {
    const now = new Date().toISOString();
    const automation: DemoAutomation = {
      id: newId(),
      name,
      description: input.description,
      workspaceId: input.workspaceId,
      createdById: input.createdById,
      isEnabled: input.isEnabled ?? true,
      approvalMode,
      trigger,
      steps,
      createdAt: now,
      updatedAt: now,
      pendingRuns: [],
    };
    demoStore.automations().unshift(automation);
    return { automation: fromDemo(automation), demo: true };
  }

  const inserted = await db
    .insert(automations)
    .values({
      workspaceId: input.workspaceId,
      createdById: input.createdById,
      name,
      description: input.description,
      isEnabled: input.isEnabled ?? true,
      trigger,
      steps,
      approvalMode,
    })
    .returning();

  return { automation: fromDb(inserted[0]!), demo: false };
}

export async function updateAutomation(
  automationId: string,
  workspaceId: string,
  patch: UpdateAutomationInput,
): Promise<{ automation: AutomationRecord; demo: boolean }> {
  const db = tryGetDb();

  if (!db) {
    const list = demoStore.automations();
    const idx = list.findIndex(
      (a) =>
        a.id === automationId &&
        (!a.workspaceId || a.workspaceId === workspaceId),
    );
    if (idx < 0) {
      throw new NexaError("NOT_FOUND", "Automation not found", { status: 404 });
    }
    const current = list[idx]!;
    const approvalMode = patch.approvalMode ?? current.approvalMode;
    const updated: DemoAutomation = {
      ...current,
      name: patch.name ?? current.name,
      description:
        patch.description === undefined
          ? current.description
          : (patch.description ?? undefined),
      isEnabled: patch.isEnabled ?? current.isEnabled,
      approvalMode,
      trigger: patch.trigger
        ? {
            type: patch.trigger.type,
            config: patch.trigger.config ?? {},
          }
        : current.trigger,
      steps: patch.steps
        ? normalizeSteps(patch.steps, approvalMode)
        : current.steps,
      updatedAt: new Date().toISOString(),
    };
    list[idx] = updated;
    return { automation: fromDemo(updated), demo: true };
  }

  const existing = await db
    .select()
    .from(automations)
    .where(
      and(
        eq(automations.id, automationId),
        eq(automations.workspaceId, workspaceId),
      ),
    )
    .limit(1);

  if (!existing[0]) {
    throw new NexaError("NOT_FOUND", "Automation not found", { status: 404 });
  }

  const approvalMode = patch.approvalMode ?? existing[0].approvalMode;
  const updates: Partial<typeof automations.$inferInsert> = {
    updatedAt: new Date(),
  };
  if (patch.name !== undefined) updates.name = patch.name;
  if (patch.description !== undefined) updates.description = patch.description;
  if (patch.isEnabled !== undefined) updates.isEnabled = patch.isEnabled;
  if (patch.approvalMode !== undefined) updates.approvalMode = approvalMode;
  if (patch.trigger !== undefined) {
    updates.trigger = {
      type: patch.trigger.type,
      config: patch.trigger.config ?? {},
    };
  }
  if (patch.steps !== undefined) {
    updates.steps = normalizeSteps(patch.steps, approvalMode);
  }

  const updated = await db
    .update(automations)
    .set(updates)
    .where(eq(automations.id, automationId))
    .returning();

  return { automation: fromDb(updated[0]!), demo: false };
}

export async function deleteAutomation(
  automationId: string,
  workspaceId: string,
): Promise<{ deleted: boolean; demo: boolean }> {
  const db = tryGetDb();

  if (!db) {
    const list = demoStore.automations();
    const idx = list.findIndex(
      (a) =>
        a.id === automationId &&
        (!a.workspaceId || a.workspaceId === workspaceId),
    );
    if (idx < 0) {
      throw new NexaError("NOT_FOUND", "Automation not found", { status: 404 });
    }
    list.splice(idx, 1);
    return { deleted: true, demo: true };
  }

  const deleted = await db
    .delete(automations)
    .where(
      and(
        eq(automations.id, automationId),
        eq(automations.workspaceId, workspaceId),
      ),
    )
    .returning({ id: automations.id });

  if (!deleted[0]) {
    throw new NexaError("NOT_FOUND", "Automation not found", { status: 404 });
  }
  return { deleted: true, demo: false };
}

/** Enqueue an automation run (may start pending_approval for sensitive steps). */
export async function enqueueRun(input: {
  automationId: string;
  workspaceId?: string;
  triggerPayload?: Record<string, unknown>;
}): Promise<{ run: AutomationRunRecord; demo: boolean }> {
  return engineEnqueueRun(input);
}

/** Explicitly approve a pending run so sensitive steps may execute. */
export async function approveRun(input: {
  automationId: string;
  runId: string;
  approvedById: string;
  note?: string;
}): Promise<{ run: AutomationRunRecord; demo: boolean }> {
  return engineApproveRun(input);
}

/** Execute an approved (or non-sensitive) run through the step engine. */
export async function executeRun(input: {
  automationId: string;
  runId: string;
}): Promise<{ run: AutomationRunRecord; demo: boolean }> {
  return engineExecuteRun(input);
}

export async function listRuns(input: {
  automationId: string;
  limit?: number;
}): Promise<{ items: AutomationRunRecord[]; demo: boolean }> {
  const limit = Math.min(100, Math.max(1, input.limit ?? 20));
  const db = tryGetDb();

  if (!db) {
    const automation = demoStore
      .automations()
      .find((a) => a.id === input.automationId);
    if (!automation) {
      throw new NexaError("NOT_FOUND", "Automation not found", { status: 404 });
    }
    return {
      items: automation.pendingRuns.slice(0, limit).map((r) => ({
        id: r.id,
        automationId: input.automationId,
        status: r.status,
        triggerPayload: r.triggerPayload,
        result: r.result,
        errorMessage: r.errorMessage,
        approvedById: r.approvedBy,
        approvedAt: r.approvedAt,
        startedAt: r.startedAt ?? r.createdAt,
        finishedAt: r.finishedAt,
        createdAt: r.createdAt,
      })),
      demo: true,
    };
  }

  const rows = await db
    .select()
    .from(automationRuns)
    .where(eq(automationRuns.automationId, input.automationId))
    .orderBy(desc(automationRuns.startedAt))
    .limit(limit);

  return {
    items: rows.map((r) => ({
      id: r.id,
      automationId: r.automationId,
      status: r.status,
      triggerPayload: (r.triggerPayload as Record<string, unknown>) ?? undefined,
      result: (r.result as Record<string, unknown>) ?? undefined,
      errorMessage: r.errorMessage ?? undefined,
      approvedById: r.approvedById ?? undefined,
      approvedAt: r.approvedAt?.toISOString(),
      startedAt: r.startedAt.toISOString(),
      finishedAt: r.finishedAt?.toISOString(),
      createdAt: r.startedAt.toISOString(),
    })),
    demo: false,
  };
}

function fromDemo(a: DemoAutomation): AutomationRecord {
  return {
    id: a.id,
    workspaceId: a.workspaceId ?? "",
    createdById: a.createdById,
    name: a.name,
    description: a.description,
    isEnabled: a.isEnabled,
    approvalMode: a.approvalMode,
    trigger: a.trigger,
    steps: a.steps,
    createdAt: a.createdAt,
    updatedAt: a.updatedAt,
    pendingRuns: a.pendingRuns.map((r) => ({
      id: r.id,
      automationId: a.id,
      status: r.status,
      triggerPayload: r.triggerPayload,
      result: r.result,
      errorMessage: r.errorMessage,
      approvedById: r.approvedBy,
      approvedAt: r.approvedAt,
      startedAt: r.startedAt ?? r.createdAt,
      finishedAt: r.finishedAt,
      createdAt: r.createdAt,
    })),
  };
}

function fromDb(row: typeof automations.$inferSelect): AutomationRecord {
  return {
    id: row.id,
    workspaceId: row.workspaceId,
    createdById: row.createdById,
    name: row.name,
    description: row.description,
    isEnabled: row.isEnabled,
    approvalMode: row.approvalMode,
    trigger: row.trigger,
    steps: (row.steps ?? []) as AutomationStep[],
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}
