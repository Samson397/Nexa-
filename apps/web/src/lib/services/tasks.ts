import { and, desc, eq } from "drizzle-orm";
import { tasks } from "@nexa/db";
import type { TaskPriority, TaskStatus } from "@nexa/shared";
import { NexaError } from "@nexa/shared";
import { tryGetDb } from "@/lib/db";
import { demoStore, type DemoTask } from "@/lib/demo-store";
import { newId } from "@/lib/services/ids";

export type ListTasksInput = {
  workspaceId: string;
  status?: TaskStatus | string;
  page?: number;
  pageSize?: number;
};

export type CreateTaskInput = {
  workspaceId: string;
  createdById: string;
  title: string;
  description?: string;
  projectId?: string;
  status?: TaskStatus | string;
  priority?: TaskPriority | string;
  assigneeId?: string;
  dueDate?: string | Date;
  checklist?: Array<{ id: string; text: string; done: boolean }>;
};

export type UpdateTaskInput = {
  title?: string;
  description?: string | null;
  projectId?: string | null;
  status?: TaskStatus | string;
  priority?: TaskPriority | string;
  assigneeId?: string | null;
  dueDate?: string | Date | null;
  completedAt?: string | Date | null;
  aiSummary?: string | null;
  checklist?: Array<{ id: string; text: string; done: boolean }>;
  sortOrder?: number;
};

export type TaskRecord = {
  id: string;
  workspaceId: string;
  projectId?: string | null;
  title: string;
  description?: string | null;
  status: string;
  priority: string;
  assigneeId?: string | null;
  createdById?: string | null;
  dueDate?: string | null;
  completedAt?: string | null;
  aiSummary?: string | null;
  checklist?: Array<{ id: string; text: string; done: boolean }>;
  sortOrder?: number | null;
  createdAt: string;
  updatedAt: string;
};

export async function listTasks(
  input: ListTasksInput,
): Promise<{ items: TaskRecord[]; total: number; demo: boolean }> {
  const page = Math.max(1, input.page ?? 1);
  const pageSize = Math.min(100, Math.max(1, input.pageSize ?? 20));
  const db = tryGetDb();

  if (!db) {
    let items = demoStore
      .tasks()
      .filter((t) => !t.workspaceId || t.workspaceId === input.workspaceId);
    if (input.status) {
      items = items.filter((t) => t.status === input.status);
    }
    const total = items.length;
    const start = (page - 1) * pageSize;
    return {
      items: items.slice(start, start + pageSize).map(fromDemo),
      total,
      demo: true,
    };
  }

  const conditions = [eq(tasks.workspaceId, input.workspaceId)];
  if (input.status) {
    conditions.push(eq(tasks.status, input.status as TaskStatus));
  }

  const rows = await db
    .select()
    .from(tasks)
    .where(and(...conditions))
    .orderBy(desc(tasks.updatedAt));

  const total = rows.length;
  const start = (page - 1) * pageSize;
  const pageRows = rows.slice(start, start + pageSize);

  return {
    items: pageRows.map(fromDb),
    total,
    demo: false,
  };
}

export async function createTask(
  input: CreateTaskInput,
): Promise<{ task: TaskRecord; demo: boolean }> {
  const title = input.title.trim();
  if (!title) {
    throw new NexaError("VALIDATION_ERROR", "Task title is required", {
      status: 400,
    });
  }

  const db = tryGetDb();
  const status = (input.status ?? "todo") as TaskStatus;
  const priority = (input.priority ?? "medium") as TaskPriority;
  const dueDate = toDate(input.dueDate);

  if (!db) {
    const now = new Date().toISOString();
    const task: DemoTask = {
      id: newId(),
      title,
      description: input.description,
      workspaceId: input.workspaceId,
      projectId: input.projectId,
      status,
      priority,
      assigneeId: input.assigneeId,
      createdById: input.createdById,
      dueDate: dueDate?.toISOString(),
      checklist: input.checklist ?? [],
      sortOrder: 0,
      createdAt: now,
      updatedAt: now,
    };
    demoStore.tasks().unshift(task);
    return { task: fromDemo(task), demo: true };
  }

  const inserted = await db
    .insert(tasks)
    .values({
      workspaceId: input.workspaceId,
      projectId: input.projectId,
      title,
      description: input.description,
      status,
      priority,
      assigneeId: input.assigneeId,
      createdById: input.createdById,
      dueDate,
      checklist: input.checklist ?? [],
    })
    .returning();

  return { task: fromDb(inserted[0]!), demo: false };
}

export async function updateTask(
  taskId: string,
  workspaceId: string,
  patch: UpdateTaskInput,
): Promise<{ task: TaskRecord; demo: boolean }> {
  const db = tryGetDb();

  if (!db) {
    const list = demoStore.tasks();
    const idx = list.findIndex(
      (t) => t.id === taskId && (!t.workspaceId || t.workspaceId === workspaceId),
    );
    if (idx < 0) {
      throw new NexaError("NOT_FOUND", "Task not found", { status: 404 });
    }
    const current = list[idx]!;
    const updated: DemoTask = {
      ...current,
      title: patch.title ?? current.title,
      description:
        patch.description === undefined
          ? current.description
          : (patch.description ?? undefined),
      projectId:
        patch.projectId === undefined
          ? current.projectId
          : (patch.projectId ?? undefined),
      status: patch.status ?? current.status,
      priority: patch.priority ?? current.priority,
      assigneeId:
        patch.assigneeId === undefined
          ? current.assigneeId
          : (patch.assigneeId ?? undefined),
      dueDate:
        patch.dueDate === undefined
          ? current.dueDate
          : toDate(patch.dueDate)?.toISOString(),
      completedAt:
        patch.completedAt === undefined
          ? current.completedAt
          : toDate(patch.completedAt)?.toISOString(),
      aiSummary:
        patch.aiSummary === undefined
          ? current.aiSummary
          : (patch.aiSummary ?? undefined),
      checklist: patch.checklist ?? current.checklist,
      sortOrder: patch.sortOrder ?? current.sortOrder,
      updatedAt: new Date().toISOString(),
    };
    list[idx] = updated;
    return { task: fromDemo(updated), demo: true };
  }

  const existing = await db
    .select()
    .from(tasks)
    .where(and(eq(tasks.id, taskId), eq(tasks.workspaceId, workspaceId)))
    .limit(1);

  if (!existing[0]) {
    throw new NexaError("NOT_FOUND", "Task not found", { status: 404 });
  }

  const updates: Partial<typeof tasks.$inferInsert> = {
    updatedAt: new Date(),
  };
  if (patch.title !== undefined) updates.title = patch.title;
  if (patch.description !== undefined) updates.description = patch.description;
  if (patch.projectId !== undefined) updates.projectId = patch.projectId;
  if (patch.status !== undefined) updates.status = patch.status as TaskStatus;
  if (patch.priority !== undefined) {
    updates.priority = patch.priority as TaskPriority;
  }
  if (patch.assigneeId !== undefined) updates.assigneeId = patch.assigneeId;
  if (patch.dueDate !== undefined) updates.dueDate = toDate(patch.dueDate);
  if (patch.completedAt !== undefined) {
    updates.completedAt = toDate(patch.completedAt);
  }
  if (patch.aiSummary !== undefined) updates.aiSummary = patch.aiSummary;
  if (patch.checklist !== undefined) updates.checklist = patch.checklist;
  if (patch.sortOrder !== undefined) updates.sortOrder = patch.sortOrder;

  const updated = await db
    .update(tasks)
    .set(updates)
    .where(eq(tasks.id, taskId))
    .returning();

  return { task: fromDb(updated[0]!), demo: false };
}

export async function deleteTask(
  taskId: string,
  workspaceId: string,
): Promise<{ deleted: boolean; demo: boolean }> {
  const db = tryGetDb();

  if (!db) {
    const list = demoStore.tasks();
    const idx = list.findIndex(
      (t) => t.id === taskId && (!t.workspaceId || t.workspaceId === workspaceId),
    );
    if (idx < 0) {
      throw new NexaError("NOT_FOUND", "Task not found", { status: 404 });
    }
    list.splice(idx, 1);
    return { deleted: true, demo: true };
  }

  const deleted = await db
    .delete(tasks)
    .where(and(eq(tasks.id, taskId), eq(tasks.workspaceId, workspaceId)))
    .returning({ id: tasks.id });

  if (!deleted[0]) {
    throw new NexaError("NOT_FOUND", "Task not found", { status: 404 });
  }
  return { deleted: true, demo: false };
}

function toDate(value: string | Date | null | undefined): Date | null | undefined {
  if (value === undefined) return undefined;
  if (value === null) return null;
  if (value instanceof Date) return value;
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? null : d;
}

function fromDemo(t: DemoTask): TaskRecord {
  return {
    id: t.id,
    workspaceId: t.workspaceId ?? "",
    projectId: t.projectId,
    title: t.title,
    description: t.description,
    status: t.status,
    priority: t.priority,
    assigneeId: t.assigneeId,
    createdById: t.createdById,
    dueDate: t.dueDate ?? null,
    completedAt: t.completedAt ?? null,
    aiSummary: t.aiSummary,
    checklist: t.checklist,
    sortOrder: t.sortOrder,
    createdAt: t.createdAt,
    updatedAt: t.updatedAt,
  };
}

function fromDb(row: typeof tasks.$inferSelect): TaskRecord {
  return {
    id: row.id,
    workspaceId: row.workspaceId,
    projectId: row.projectId,
    title: row.title,
    description: row.description,
    status: row.status,
    priority: row.priority,
    assigneeId: row.assigneeId,
    createdById: row.createdById,
    dueDate: row.dueDate?.toISOString() ?? null,
    completedAt: row.completedAt?.toISOString() ?? null,
    aiSummary: row.aiSummary,
    checklist: row.checklist ?? [],
    sortOrder: row.sortOrder,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}
