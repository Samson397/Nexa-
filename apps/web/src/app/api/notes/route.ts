import {
  handleRouteError,
  jsonOk,
  newId,
  parseBody,
  rateLimitByIp,
  requireAuth,
} from "@/lib/api";
import { createNoteSchema } from "@/lib/validators";
import { demoStore, type DemoNote } from "@/lib/demo-store";
import { tryGetDb } from "@/lib/db";
import { notes } from "@nexa/db";
import { eq } from "drizzle-orm";

export const runtime = "nodejs";

/**
 * GET /api/notes — list notes for the current user.
 */
export async function GET(request: Request) {
  try {
    const limited = rateLimitByIp(request, {
      name: "notes-list",
      limit: 60,
      windowMs: 60_000,
    });
    if (limited) return limited;

    const auth = await requireAuth(request);
    if (auth.error) return auth.error;

    const db = tryGetDb();
    if (db) {
      try {
        const rows = await db
          .select()
          .from(notes)
          .where(eq(notes.userId, auth.user.id))
          .limit(100);
        if (rows.length > 0) {
          return jsonOk({
            ok: true,
            items: rows.map((n) => ({
              id: n.id,
              title: n.title,
              plainText: n.plainText,
              tags: n.tags,
              aiSummary: n.aiSummary,
              createdAt: n.createdAt.toISOString(),
              updatedAt: n.updatedAt.toISOString(),
            })),
            total: rows.length,
            source: "database",
          });
        }
      } catch {
        // fall through
      }
    }

    let items = demoStore.notes().filter((n) => n.userId === auth.user.id);
    if (items.length === 0) {
      const now = new Date().toISOString();
      const seed: DemoNote = {
        id: newId(),
        userId: auth.user.id,
        title: "Welcome to NEXA Notes",
        content: { type: "doc", text: "Capture ideas, meeting notes, and briefs." },
        plainText: "Capture ideas, meeting notes, and briefs.",
        tags: ["welcome"],
        createdAt: now,
        updatedAt: now,
      };
      demoStore.notes().push(seed);
      items = [seed];
    }

    return jsonOk({
      ok: true,
      items,
      total: items.length,
      source: "demo-store",
    });
  } catch (error) {
    return handleRouteError(error);
  }
}

/**
 * POST /api/notes — create a note.
 */
export async function POST(request: Request) {
  try {
    const limited = rateLimitByIp(request, {
      name: "notes-create",
      limit: 40,
      windowMs: 60_000,
    });
    if (limited) return limited;

    const auth = await requireAuth(request);
    if (auth.error) return auth.error;

    const parsed = await parseBody(request, createNoteSchema);
    if (parsed.error) return parsed.error;

    const data = parsed.data;
    const now = new Date().toISOString();
    const note: DemoNote = {
      id: newId(),
      userId: auth.user.id,
      workspaceId: data.workspaceId,
      folderId: data.folderId,
      title: data.title,
      content: data.content ?? {},
      plainText: data.plainText ?? "",
      tags: data.tags ?? [],
      createdAt: now,
      updatedAt: now,
    };

    demoStore.notes().unshift(note);

    const db = tryGetDb();
    if (db && data.workspaceId) {
      try {
        await db.insert(notes).values({
          workspaceId: data.workspaceId,
          userId: auth.user.id,
          folderId: data.folderId,
          title: note.title,
          content: note.content,
          plainText: note.plainText,
          tags: note.tags,
        });
      } catch {
        // keep demo-store
      }
    }

    return jsonOk({ ok: true, note }, { status: 201 });
  } catch (error) {
    return handleRouteError(error);
  }
}
