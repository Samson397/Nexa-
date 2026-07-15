import {
  handleRouteError,
  jsonError,
  jsonOk,
  parseBody,
  rateLimitByIp,
  requireAuth,
} from "@/lib/api";
import { updateNoteSchema } from "@/lib/validators";
import { demoStore } from "@/lib/demo-store";
import { tryGetDb } from "@/lib/db";
import { notes } from "@nexa/db";
import { and, eq } from "drizzle-orm";

export const runtime = "nodejs";

type Ctx = { params: Promise<{ id: string }> };

/**
 * GET /api/notes/[id]
 */
export async function GET(request: Request, context: Ctx) {
  try {
    const limited = rateLimitByIp(request, {
      name: "notes-get",
      limit: 60,
      windowMs: 60_000,
    });
    if (limited) return limited;

    const auth = await requireAuth(request);
    if (auth.error) return auth.error;

    const { id } = await context.params;

    const local = demoStore
      .notes()
      .find((n) => n.id === id && n.userId === auth.user.id);
    if (local) {
      return jsonOk({ ok: true, note: local });
    }

    const db = tryGetDb();
    if (db) {
      try {
        const rows = await db
          .select()
          .from(notes)
          .where(and(eq(notes.id, id), eq(notes.userId, auth.user.id)))
          .limit(1);
        if (rows[0]) {
          return jsonOk({ ok: true, note: rows[0] });
        }
      } catch {
        // fall through
      }
    }

    return jsonError("NOT_FOUND", "Note not found", { status: 404 });
  } catch (error) {
    return handleRouteError(error);
  }
}

/**
 * PATCH /api/notes/[id]
 */
export async function PATCH(request: Request, context: Ctx) {
  try {
    const limited = rateLimitByIp(request, {
      name: "notes-patch",
      limit: 40,
      windowMs: 60_000,
    });
    if (limited) return limited;

    const auth = await requireAuth(request);
    if (auth.error) return auth.error;

    const { id } = await context.params;
    const parsed = await parseBody(request, updateNoteSchema);
    if (parsed.error) return parsed.error;

    const note = demoStore
      .notes()
      .find((n) => n.id === id && n.userId === auth.user.id);
    if (!note) {
      return jsonError("NOT_FOUND", "Note not found", { status: 404 });
    }

    const data = parsed.data;
    if (data.title !== undefined) note.title = data.title;
    if (data.content !== undefined) note.content = data.content;
    if (data.plainText !== undefined) note.plainText = data.plainText;
    if (data.tags !== undefined) note.tags = data.tags;
    if (data.folderId !== undefined) {
      note.folderId = data.folderId ?? undefined;
    }
    note.updatedAt = new Date().toISOString();

    const db = tryGetDb();
    if (db) {
      try {
        await db
          .update(notes)
          .set({
            title: note.title,
            content: note.content,
            plainText: note.plainText,
            tags: note.tags,
            folderId: note.folderId,
            updatedAt: new Date(),
          })
          .where(and(eq(notes.id, id), eq(notes.userId, auth.user.id)));
      } catch {
        // ignore
      }
    }

    return jsonOk({ ok: true, note });
  } catch (error) {
    return handleRouteError(error);
  }
}

/**
 * DELETE /api/notes/[id]
 */
export async function DELETE(request: Request, context: Ctx) {
  try {
    const limited = rateLimitByIp(request, {
      name: "notes-delete",
      limit: 40,
      windowMs: 60_000,
    });
    if (limited) return limited;

    const auth = await requireAuth(request);
    if (auth.error) return auth.error;

    const { id } = await context.params;
    const list = demoStore.notes();
    const idx = list.findIndex(
      (n) => n.id === id && n.userId === auth.user.id,
    );
    if (idx < 0) {
      return jsonError("NOT_FOUND", "Note not found", { status: 404 });
    }
    list.splice(idx, 1);

    const db = tryGetDb();
    if (db) {
      try {
        await db
          .delete(notes)
          .where(and(eq(notes.id, id), eq(notes.userId, auth.user.id)));
      } catch {
        // ignore
      }
    }

    return jsonOk({ ok: true, deleted: id });
  } catch (error) {
    return handleRouteError(error);
  }
}
