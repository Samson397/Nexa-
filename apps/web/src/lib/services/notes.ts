import { and, desc, eq } from "drizzle-orm";
import { notes } from "@nexa/db";
import { NexaError } from "@nexa/shared";
import { tryGetDb } from "@/lib/db";
import { demoStore, type DemoNote } from "@/lib/demo-store";
import { newId } from "@/lib/services/ids";

export type NoteRecord = {
  id: string;
  workspaceId: string;
  userId: string;
  folderId?: string | null;
  title: string;
  content: Record<string, unknown>;
  plainText: string;
  tags: string[];
  aiSummary?: string | null;
  createdAt: string;
  updatedAt: string;
};

export type CreateNoteInput = {
  workspaceId: string;
  userId: string;
  title: string;
  content?: Record<string, unknown>;
  plainText?: string;
  folderId?: string;
  tags?: string[];
};

export type UpdateNoteInput = {
  title?: string;
  content?: Record<string, unknown>;
  plainText?: string;
  folderId?: string | null;
  tags?: string[];
  aiSummary?: string | null;
};

export async function listNotes(input: {
  workspaceId: string;
  userId?: string;
  limit?: number;
}): Promise<{ items: NoteRecord[]; demo: boolean }> {
  const limit = Math.min(200, Math.max(1, input.limit ?? 50));
  const db = tryGetDb();

  if (!db) {
    let items = demoStore
      .notes()
      .filter((n) => n.workspaceId === input.workspaceId);
    if (input.userId) items = items.filter((n) => n.userId === input.userId);
    return {
      items: items.slice(0, limit).map(fromDemo),
      demo: true,
    };
  }

  const conditions = [eq(notes.workspaceId, input.workspaceId)];
  if (input.userId) conditions.push(eq(notes.userId, input.userId));

  const rows = await db
    .select()
    .from(notes)
    .where(and(...conditions))
    .orderBy(desc(notes.updatedAt))
    .limit(limit);

  return { items: rows.map(fromDb), demo: false };
}

export async function getNote(
  noteId: string,
  workspaceId: string,
): Promise<{ note: NoteRecord; demo: boolean }> {
  const db = tryGetDb();

  if (!db) {
    const found = demoStore
      .notes()
      .find((n) => n.id === noteId && n.workspaceId === workspaceId);
    if (!found) {
      throw new NexaError("NOT_FOUND", "Note not found", { status: 404 });
    }
    return { note: fromDemo(found), demo: true };
  }

  const rows = await db
    .select()
    .from(notes)
    .where(and(eq(notes.id, noteId), eq(notes.workspaceId, workspaceId)))
    .limit(1);

  if (!rows[0]) {
    throw new NexaError("NOT_FOUND", "Note not found", { status: 404 });
  }
  return { note: fromDb(rows[0]), demo: false };
}

export async function createNote(
  input: CreateNoteInput,
): Promise<{ note: NoteRecord; demo: boolean }> {
  const title = input.title.trim() || "Untitled";
  const db = tryGetDb();

  if (!db) {
    const now = new Date().toISOString();
    const note: DemoNote = {
      id: newId(),
      workspaceId: input.workspaceId,
      userId: input.userId,
      folderId: input.folderId,
      title,
      content: input.content ?? {},
      plainText: input.plainText ?? "",
      tags: input.tags ?? [],
      createdAt: now,
      updatedAt: now,
    };
    demoStore.notes().unshift(note);
    return { note: fromDemo(note), demo: true };
  }

  const inserted = await db
    .insert(notes)
    .values({
      workspaceId: input.workspaceId,
      userId: input.userId,
      folderId: input.folderId,
      title,
      content: input.content ?? {},
      plainText: input.plainText ?? "",
      tags: input.tags ?? [],
    })
    .returning();

  return { note: fromDb(inserted[0]!), demo: false };
}

export async function updateNote(
  noteId: string,
  workspaceId: string,
  patch: UpdateNoteInput,
): Promise<{ note: NoteRecord; demo: boolean }> {
  const db = tryGetDb();

  if (!db) {
    const list = demoStore.notes();
    const idx = list.findIndex(
      (n) => n.id === noteId && n.workspaceId === workspaceId,
    );
    if (idx < 0) {
      throw new NexaError("NOT_FOUND", "Note not found", { status: 404 });
    }
    const current = list[idx]!;
    const updated: DemoNote = {
      ...current,
      title: patch.title ?? current.title,
      content: patch.content ?? current.content,
      plainText: patch.plainText ?? current.plainText,
      folderId:
        patch.folderId === undefined
          ? current.folderId
          : (patch.folderId ?? undefined),
      tags: patch.tags ?? current.tags,
      aiSummary:
        patch.aiSummary === undefined
          ? current.aiSummary
          : (patch.aiSummary ?? undefined),
      updatedAt: new Date().toISOString(),
    };
    list[idx] = updated;
    return { note: fromDemo(updated), demo: true };
  }

  const existing = await db
    .select()
    .from(notes)
    .where(and(eq(notes.id, noteId), eq(notes.workspaceId, workspaceId)))
    .limit(1);

  if (!existing[0]) {
    throw new NexaError("NOT_FOUND", "Note not found", { status: 404 });
  }

  const updates: Partial<typeof notes.$inferInsert> = {
    updatedAt: new Date(),
  };
  if (patch.title !== undefined) updates.title = patch.title;
  if (patch.content !== undefined) updates.content = patch.content;
  if (patch.plainText !== undefined) updates.plainText = patch.plainText;
  if (patch.folderId !== undefined) updates.folderId = patch.folderId;
  if (patch.tags !== undefined) updates.tags = patch.tags;
  if (patch.aiSummary !== undefined) updates.aiSummary = patch.aiSummary;

  const updated = await db
    .update(notes)
    .set(updates)
    .where(eq(notes.id, noteId))
    .returning();

  return { note: fromDb(updated[0]!), demo: false };
}

export async function deleteNote(
  noteId: string,
  workspaceId: string,
): Promise<{ deleted: boolean; demo: boolean }> {
  const db = tryGetDb();

  if (!db) {
    const list = demoStore.notes();
    const idx = list.findIndex(
      (n) => n.id === noteId && n.workspaceId === workspaceId,
    );
    if (idx < 0) {
      throw new NexaError("NOT_FOUND", "Note not found", { status: 404 });
    }
    list.splice(idx, 1);
    return { deleted: true, demo: true };
  }

  const deleted = await db
    .delete(notes)
    .where(and(eq(notes.id, noteId), eq(notes.workspaceId, workspaceId)))
    .returning({ id: notes.id });

  if (!deleted[0]) {
    throw new NexaError("NOT_FOUND", "Note not found", { status: 404 });
  }
  return { deleted: true, demo: false };
}

function fromDemo(n: DemoNote): NoteRecord {
  return {
    id: n.id,
    workspaceId: n.workspaceId ?? "",
    userId: n.userId,
    folderId: n.folderId,
    title: n.title,
    content: n.content,
    plainText: n.plainText,
    tags: n.tags,
    aiSummary: n.aiSummary,
    createdAt: n.createdAt,
    updatedAt: n.updatedAt,
  };
}

function fromDb(row: typeof notes.$inferSelect): NoteRecord {
  return {
    id: row.id,
    workspaceId: row.workspaceId,
    userId: row.userId,
    folderId: row.folderId,
    title: row.title,
    content: (row.content as Record<string, unknown>) ?? {},
    plainText: row.plainText ?? "",
    tags: row.tags ?? [],
    aiSummary: row.aiSummary,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}
