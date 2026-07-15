import { and, desc, eq } from "drizzle-orm";
import { memories } from "@nexa/db";
import { NexaError } from "@nexa/shared";
import { tryGetDb } from "@/lib/db";
import { demoStore, type DemoMemory } from "@/lib/demo-store";
import { cosineSimilarity, embedTexts } from "@/lib/services/embeddings";
import { newId } from "@/lib/services/ids";

export type StoreMemoryInput = {
  userId: string;
  workspaceId: string;
  content: string;
  agentId?: string;
  importance?: number;
  source?: string;
  metadata?: Record<string, unknown>;
};

export type StoreMemoryResult = {
  id: string;
  content: string;
  importance: number;
  createdAt: string;
  demo: boolean;
};

export type SearchMemoriesInput = {
  userId: string;
  workspaceId: string;
  query: string;
  limit?: number;
};

export type MemorySearchHit = {
  id: string;
  content: string;
  score: number;
  importance: number;
  source?: string | null;
  agentId?: string | null;
  createdAt: string;
};

/**
 * Persist a long-term memory with embedding.
 *
 * DB path: insert into `memories` with a pgvector embedding column.
 * Demo path: store content + embedding on the in-memory demo store.
 */
export async function storeMemory(
  input: StoreMemoryInput,
): Promise<StoreMemoryResult> {
  const content = input.content.trim();
  if (!content) {
    throw new NexaError("VALIDATION_ERROR", "Memory content is required", {
      status: 400,
    });
  }

  const importance = clamp01(input.importance ?? 0.5);
  const [embedding] = await embedTexts([content]);
  const db = tryGetDb();

  if (!db) {
    const now = new Date().toISOString();
    const memory: DemoMemory = {
      id: newId(),
      content,
      workspaceId: input.workspaceId,
      userId: input.userId,
      agentId: input.agentId,
      importance,
      source: input.source,
      metadata: input.metadata,
      embedding,
      createdAt: now,
    };
    demoStore.memories().unshift(memory);
    return {
      id: memory.id,
      content: memory.content,
      importance: memory.importance,
      createdAt: memory.createdAt,
      demo: true,
    };
  }

  const inserted = await db
    .insert(memories)
    .values({
      workspaceId: input.workspaceId,
      userId: input.userId,
      agentId: input.agentId,
      content,
      // drizzle-orm pgvector accepts number[] for the vector column
      embedding: embedding!,
      importance,
      source: input.source,
      metadata: input.metadata ?? {},
    })
    .returning({
      id: memories.id,
      content: memories.content,
      importance: memories.importance,
      createdAt: memories.createdAt,
    });

  const row = inserted[0]!;
  return {
    id: row.id,
    content: row.content,
    importance: row.importance,
    createdAt: row.createdAt.toISOString(),
    demo: false,
  };
}

/**
 * Semantic memory search.
 *
 * Approach: embed the query, then rank candidates in JS.
 * - DB: fetch the most recent N memories for the workspace/user that have
 *   embeddings and rank by cosine similarity in application code. This avoids
 *   fragile drizzle vector bind quirks while remaining correct for moderate
 *   corpus sizes. Switch to `ORDER BY embedding <=> query::vector` when a
 *   dedicated vector index and bind path are confirmed in production.
 * - Demo: cosine over in-memory embeddings attached at store time.
 */
export async function searchMemories(
  input: SearchMemoriesInput,
): Promise<{ items: MemorySearchHit[]; demo: boolean }> {
  const limit = Math.max(1, Math.min(input.limit ?? 10, 50));
  const [queryEmbedding] = await embedTexts([input.query]);
  const db = tryGetDb();

  if (!db) {
    const items = demoStore
      .memories()
      .filter((m) => {
        if (m.workspaceId && m.workspaceId !== input.workspaceId) return false;
        if (m.userId && m.userId !== input.userId) return false;
        return true;
      })
      .map((m) => {
        const score = m.embedding
          ? cosineSimilarity(queryEmbedding!, m.embedding)
          : keywordScore(input.query, m.content);
        return {
          id: m.id,
          content: m.content,
          score,
          importance: m.importance,
          source: m.source,
          agentId: m.agentId,
          createdAt: m.createdAt,
        } satisfies MemorySearchHit;
      })
      .sort((a, b) => b.score - a.score)
      .slice(0, limit);

    return { items, demo: true };
  }

  // Fetch a recent window and rank in JS (documented above).
  const CANDIDATE_WINDOW = Math.max(limit * 20, 200);

  const rows = await db
    .select({
      id: memories.id,
      content: memories.content,
      embedding: memories.embedding,
      importance: memories.importance,
      source: memories.source,
      agentId: memories.agentId,
      createdAt: memories.createdAt,
    })
    .from(memories)
    .where(
      and(
        eq(memories.workspaceId, input.workspaceId),
        eq(memories.userId, input.userId),
      ),
    )
    .orderBy(desc(memories.createdAt))
    .limit(CANDIDATE_WINDOW);

  const items = rows
    .map((row) => {
      const emb = parseEmbedding(row.embedding);
      const score = emb
        ? cosineSimilarity(queryEmbedding!, emb)
        : keywordScore(input.query, row.content);
      return {
        id: row.id,
        content: row.content,
        score,
        importance: row.importance,
        source: row.source,
        agentId: row.agentId,
        createdAt: row.createdAt.toISOString(),
      } satisfies MemorySearchHit;
    })
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);

  return { items, demo: false };
}

function parseEmbedding(value: unknown): number[] | null {
  if (!value) return null;
  if (Array.isArray(value)) return value as number[];
  if (typeof value === "string") {
    try {
      const parsed = JSON.parse(
        value.startsWith("[") ? value : `[${value}]`,
      ) as number[];
      return Array.isArray(parsed) ? parsed : null;
    } catch {
      return null;
    }
  }
  return null;
}

function keywordScore(query: string, content: string): number {
  const q = query.toLowerCase().trim();
  const c = content.toLowerCase();
  if (!q) return 0;
  if (c.includes(q)) return 0.55;
  const tokens = q.split(/\s+/).filter(Boolean);
  if (tokens.length === 0) return 0;
  const hits = tokens.filter((t) => c.includes(t)).length;
  return hits / tokens.length * 0.4;
}

function clamp01(n: number): number {
  return Math.min(1, Math.max(0, n));
}
