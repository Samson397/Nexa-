import { and, asc, eq, gte, lte } from "drizzle-orm";
import { calendarEvents } from "@nexa/db";
import { NexaError } from "@nexa/shared";
import { tryGetDb } from "@/lib/db";
import { demoStore, type DemoCalendarEvent } from "@/lib/demo-store";
import { newId } from "@/lib/services/ids";

export type CalendarEventRecord = {
  id: string;
  workspaceId: string;
  userId: string;
  title: string;
  description?: string | null;
  location?: string | null;
  startAt: string;
  endAt: string;
  allDay: boolean;
  externalId?: string | null;
  externalProvider?: string | null;
  metadata?: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
};

export type CreateCalendarEventInput = {
  workspaceId: string;
  userId: string;
  title: string;
  description?: string;
  location?: string;
  startAt: string | Date;
  endAt: string | Date;
  allDay?: boolean;
  externalId?: string;
  externalProvider?: string;
  metadata?: Record<string, unknown>;
};

export type UpdateCalendarEventInput = {
  title?: string;
  description?: string | null;
  location?: string | null;
  startAt?: string | Date;
  endAt?: string | Date;
  allDay?: boolean;
  metadata?: Record<string, unknown>;
};

export async function listCalendarEvents(input: {
  workspaceId: string;
  userId?: string;
  from?: string | Date;
  to?: string | Date;
  limit?: number;
}): Promise<{ items: CalendarEventRecord[]; demo: boolean }> {
  const limit = Math.min(500, Math.max(1, input.limit ?? 100));
  const db = tryGetDb();
  const from = toDate(input.from);
  const to = toDate(input.to);

  if (!db) {
    let items = demoStore
      .calendarEvents()
      .filter((e) => e.workspaceId === input.workspaceId);
    if (input.userId) items = items.filter((e) => e.userId === input.userId);
    if (from) {
      items = items.filter((e) => new Date(e.endAt) >= from);
    }
    if (to) {
      items = items.filter((e) => new Date(e.startAt) <= to);
    }
    items = items
      .sort((a, b) => a.startAt.localeCompare(b.startAt))
      .slice(0, limit);
    return { items: items.map(fromDemo), demo: true };
  }

  const conditions = [eq(calendarEvents.workspaceId, input.workspaceId)];
  if (input.userId) conditions.push(eq(calendarEvents.userId, input.userId));
  if (from) conditions.push(gte(calendarEvents.endAt, from));
  if (to) conditions.push(lte(calendarEvents.startAt, to));

  const rows = await db
    .select()
    .from(calendarEvents)
    .where(and(...conditions))
    .orderBy(asc(calendarEvents.startAt))
    .limit(limit);

  return { items: rows.map(fromDb), demo: false };
}

export async function getCalendarEvent(
  eventId: string,
  workspaceId: string,
): Promise<{ event: CalendarEventRecord; demo: boolean }> {
  const db = tryGetDb();

  if (!db) {
    const found = demoStore
      .calendarEvents()
      .find((e) => e.id === eventId && e.workspaceId === workspaceId);
    if (!found) {
      throw new NexaError("NOT_FOUND", "Calendar event not found", {
        status: 404,
      });
    }
    return { event: fromDemo(found), demo: true };
  }

  const rows = await db
    .select()
    .from(calendarEvents)
    .where(
      and(
        eq(calendarEvents.id, eventId),
        eq(calendarEvents.workspaceId, workspaceId),
      ),
    )
    .limit(1);

  if (!rows[0]) {
    throw new NexaError("NOT_FOUND", "Calendar event not found", {
      status: 404,
    });
  }
  return { event: fromDb(rows[0]), demo: false };
}

export async function createCalendarEvent(
  input: CreateCalendarEventInput,
): Promise<{ event: CalendarEventRecord; demo: boolean }> {
  const title = input.title.trim();
  if (!title) {
    throw new NexaError("VALIDATION_ERROR", "Event title is required", {
      status: 400,
    });
  }

  const startAt = toDate(input.startAt)!;
  const endAt = toDate(input.endAt)!;
  if (!startAt || !endAt || endAt < startAt) {
    throw new NexaError(
      "VALIDATION_ERROR",
      "Event endAt must be on or after startAt",
      { status: 400 },
    );
  }

  const db = tryGetDb();

  if (!db) {
    const now = new Date().toISOString();
    const event: DemoCalendarEvent = {
      id: newId(),
      workspaceId: input.workspaceId,
      userId: input.userId,
      title,
      description: input.description,
      location: input.location,
      startAt: startAt.toISOString(),
      endAt: endAt.toISOString(),
      allDay: input.allDay ?? false,
      externalId: input.externalId,
      externalProvider: input.externalProvider,
      metadata: input.metadata ?? {},
      createdAt: now,
      updatedAt: now,
    };
    demoStore.calendarEvents().unshift(event);
    return { event: fromDemo(event), demo: true };
  }

  const inserted = await db
    .insert(calendarEvents)
    .values({
      workspaceId: input.workspaceId,
      userId: input.userId,
      title,
      description: input.description,
      location: input.location,
      startAt,
      endAt,
      allDay: input.allDay ?? false,
      externalId: input.externalId,
      externalProvider: input.externalProvider,
      metadata: input.metadata ?? {},
    })
    .returning();

  return { event: fromDb(inserted[0]!), demo: false };
}

export async function updateCalendarEvent(
  eventId: string,
  workspaceId: string,
  patch: UpdateCalendarEventInput,
): Promise<{ event: CalendarEventRecord; demo: boolean }> {
  const db = tryGetDb();

  if (!db) {
    const list = demoStore.calendarEvents();
    const idx = list.findIndex(
      (e) => e.id === eventId && e.workspaceId === workspaceId,
    );
    if (idx < 0) {
      throw new NexaError("NOT_FOUND", "Calendar event not found", {
        status: 404,
      });
    }
    const current = list[idx]!;
    const startAt =
      patch.startAt !== undefined
        ? toDate(patch.startAt)!.toISOString()
        : current.startAt;
    const endAt =
      patch.endAt !== undefined
        ? toDate(patch.endAt)!.toISOString()
        : current.endAt;

    const updated: DemoCalendarEvent = {
      ...current,
      title: patch.title ?? current.title,
      description:
        patch.description === undefined
          ? current.description
          : (patch.description ?? undefined),
      location:
        patch.location === undefined
          ? current.location
          : (patch.location ?? undefined),
      startAt,
      endAt,
      allDay: patch.allDay ?? current.allDay,
      metadata: patch.metadata ?? current.metadata,
      updatedAt: new Date().toISOString(),
    };
    list[idx] = updated;
    return { event: fromDemo(updated), demo: true };
  }

  const existing = await db
    .select()
    .from(calendarEvents)
    .where(
      and(
        eq(calendarEvents.id, eventId),
        eq(calendarEvents.workspaceId, workspaceId),
      ),
    )
    .limit(1);

  if (!existing[0]) {
    throw new NexaError("NOT_FOUND", "Calendar event not found", {
      status: 404,
    });
  }

  const updates: Partial<typeof calendarEvents.$inferInsert> = {
    updatedAt: new Date(),
  };
  if (patch.title !== undefined) updates.title = patch.title;
  if (patch.description !== undefined) updates.description = patch.description;
  if (patch.location !== undefined) updates.location = patch.location;
  if (patch.startAt !== undefined) updates.startAt = toDate(patch.startAt)!;
  if (patch.endAt !== undefined) updates.endAt = toDate(patch.endAt)!;
  if (patch.allDay !== undefined) updates.allDay = patch.allDay;
  if (patch.metadata !== undefined) updates.metadata = patch.metadata;

  const updated = await db
    .update(calendarEvents)
    .set(updates)
    .where(eq(calendarEvents.id, eventId))
    .returning();

  return { event: fromDb(updated[0]!), demo: false };
}

export async function deleteCalendarEvent(
  eventId: string,
  workspaceId: string,
): Promise<{ deleted: boolean; demo: boolean }> {
  const db = tryGetDb();

  if (!db) {
    const list = demoStore.calendarEvents();
    const idx = list.findIndex(
      (e) => e.id === eventId && e.workspaceId === workspaceId,
    );
    if (idx < 0) {
      throw new NexaError("NOT_FOUND", "Calendar event not found", {
        status: 404,
      });
    }
    list.splice(idx, 1);
    return { deleted: true, demo: true };
  }

  const deleted = await db
    .delete(calendarEvents)
    .where(
      and(
        eq(calendarEvents.id, eventId),
        eq(calendarEvents.workspaceId, workspaceId),
      ),
    )
    .returning({ id: calendarEvents.id });

  if (!deleted[0]) {
    throw new NexaError("NOT_FOUND", "Calendar event not found", {
      status: 404,
    });
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

function fromDemo(e: DemoCalendarEvent): CalendarEventRecord {
  return {
    id: e.id,
    workspaceId: e.workspaceId ?? "",
    userId: e.userId,
    title: e.title,
    description: e.description,
    location: e.location,
    startAt: e.startAt,
    endAt: e.endAt,
    allDay: e.allDay,
    externalId: e.externalId,
    externalProvider: e.externalProvider,
    metadata: e.metadata,
    createdAt: e.createdAt,
    updatedAt: e.updatedAt,
  };
}

function fromDb(
  row: typeof calendarEvents.$inferSelect,
): CalendarEventRecord {
  return {
    id: row.id,
    workspaceId: row.workspaceId,
    userId: row.userId,
    title: row.title,
    description: row.description,
    location: row.location,
    startAt: row.startAt.toISOString(),
    endAt: row.endAt.toISOString(),
    allDay: row.allDay,
    externalId: row.externalId,
    externalProvider: row.externalProvider,
    metadata: (row.metadata as Record<string, unknown>) ?? {},
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}
