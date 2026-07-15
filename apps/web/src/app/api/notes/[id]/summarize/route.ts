import { generateText } from "ai";
import { getLanguageModel, DEFAULT_MODELS } from "@nexa/ai";
import {
  handleRouteError,
  hasAnyAiApiKey,
  jsonError,
  jsonOk,
  rateLimitByIp,
  requireAuth,
} from "@/lib/api";
import { demoStore } from "@/lib/demo-store";
import { tryGetDb } from "@/lib/db";
import { notes } from "@nexa/db";
import { and, eq } from "drizzle-orm";

export const runtime = "nodejs";
export const maxDuration = 60;

type Ctx = { params: Promise<{ id: string }> };

/**
 * POST /api/notes/[id]/summarize — AI summary via generateText when a key is present.
 */
export async function POST(request: Request, context: Ctx) {
  try {
    const limited = rateLimitByIp(request, {
      name: "notes-summarize",
      limit: 20,
      windowMs: 60_000,
    });
    if (limited) return limited;

    const auth = await requireAuth(request);
    if (auth.error) return auth.error;

    const { id } = await context.params;
    let plainText = "";
    let title = "Note";

    const local = demoStore
      .notes()
      .find((n) => n.id === id && n.userId === auth.user.id);
    if (local) {
      plainText = local.plainText || JSON.stringify(local.content);
      title = local.title;
    } else {
      const db = tryGetDb();
      if (db) {
        const rows = await db
          .select()
          .from(notes)
          .where(and(eq(notes.id, id), eq(notes.userId, auth.user.id)))
          .limit(1);
        if (rows[0]) {
          plainText = rows[0].plainText || "";
          title = rows[0].title;
        }
      }
    }

    if (!plainText && !local) {
      return jsonError("NOT_FOUND", "Note not found", { status: 404 });
    }

    let summary: string;

    if (hasAnyAiApiKey()) {
      const provider = "openai" as const;
      const model = getLanguageModel(provider, DEFAULT_MODELS[provider]);
      const result = await generateText({
        model,
        system:
          "Summarize the note concisely in 2-4 sentences. Preserve key decisions and action items.",
        prompt: `Title: ${title}\n\n${plainText.slice(0, 12_000)}`,
      });
      summary = result.text;
    } else {
      const words = plainText.split(/\s+/).filter(Boolean);
      summary =
        words.length === 0
          ? `(Demo) Empty note "${title}" — nothing to summarize.`
          : `(Demo summary) "${title}" — ${words.slice(0, 40).join(" ")}${words.length > 40 ? "…" : ""}`;
    }

    if (local) {
      local.aiSummary = summary;
      local.updatedAt = new Date().toISOString();
    }

    const db = tryGetDb();
    if (db) {
      try {
        await db
          .update(notes)
          .set({ aiSummary: summary, updatedAt: new Date() })
          .where(and(eq(notes.id, id), eq(notes.userId, auth.user.id)));
      } catch {
        // ignore
      }
    }

    return jsonOk({
      ok: true,
      noteId: id,
      summary,
      demo: !hasAnyAiApiKey(),
    });
  } catch (error) {
    return handleRouteError(error);
  }
}
