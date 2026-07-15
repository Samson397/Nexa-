import { and, desc, eq } from "drizzle-orm";
import { knowledgeChunks, knowledgeDocuments } from "@nexa/db";
import { NexaError } from "@nexa/shared";
import { tryGetDb } from "@/lib/db";
import {
  demoStore,
  type DemoKnowledgeChunk,
  type DemoKnowledgeDocument,
} from "@/lib/demo-store";
import {
  chunkText,
  cosineSimilarity,
  embedTexts,
} from "@/lib/services/embeddings";
import { newId } from "@/lib/services/ids";

const TEXT_MIME_PREFIXES = ["text/"];
const TEXT_EXTENSIONS = new Set([
  "md",
  "markdown",
  "txt",
  "csv",
  "json",
  "ts",
  "tsx",
  "js",
  "jsx",
  "mjs",
  "cjs",
  "py",
  "rb",
  "go",
  "rs",
  "java",
  "kt",
  "swift",
  "c",
  "cc",
  "cpp",
  "h",
  "hpp",
  "cs",
  "php",
  "sh",
  "bash",
  "zsh",
  "yml",
  "yaml",
  "toml",
  "xml",
  "html",
  "css",
  "scss",
  "sql",
]);

const BINARY_NOTE =
  "Binary parsers (pdf/docx/xlsx/etc.) require optional dependencies; document metadata stored with pending status.";

export type IndexDocumentInput = {
  workspaceId: string;
  userId: string;
  title: string;
  fileName: string;
  mimeType: string;
  storagePath: string;
  sizeBytes: number;
  textContent?: string | null;
};

export type IndexDocumentResult = {
  document: {
    id: string;
    title: string;
    fileName: string;
    status: string;
    chunkCount: number;
    errorMessage?: string | null;
    createdAt: string;
  };
  demo: boolean;
};

export type SearchKnowledgeInput = {
  workspaceId: string;
  query: string;
  limit?: number;
  documentId?: string;
};

export type KnowledgeSearchHit = {
  id: string;
  documentId: string;
  content: string;
  score: number;
  chunkIndex: number;
  createdAt: string;
};

export function canExtractPlainText(
  fileName: string,
  mimeType: string,
): boolean {
  const ext = extensionOf(fileName);
  if (TEXT_EXTENSIONS.has(ext)) return true;
  if (TEXT_MIME_PREFIXES.some((p) => mimeType.startsWith(p))) return true;
  if (mimeType === "application/json" || mimeType === "application/xml") {
    return true;
  }
  return false;
}

/**
 * Index a knowledge document: chunk + embed when plain text is available.
 * For binary formats, stores metadata with `pending` status and a note that
 * parsers need optional deps — does not fail the insert.
 */
export async function indexDocument(
  input: IndexDocumentInput,
): Promise<IndexDocumentResult> {
  const extractable = canExtractPlainText(input.fileName, input.mimeType);
  const hasText =
    typeof input.textContent === "string" && input.textContent.trim().length > 0;

  if (!extractable || !hasText) {
    return storePendingDocument(input, BINARY_NOTE);
  }

  const chunks = chunkText(input.textContent!);
  if (chunks.length === 0) {
    return storePendingDocument(input, "No extractable text content");
  }

  const embeddings = await embedTexts(chunks);
  const db = tryGetDb();
  const now = new Date();

  if (!db) {
    const docId = newId();
    const iso = now.toISOString();
    const doc: DemoKnowledgeDocument = {
      id: docId,
      workspaceId: input.workspaceId,
      userId: input.userId,
      title: input.title,
      fileName: input.fileName,
      mimeType: input.mimeType,
      storagePath: input.storagePath,
      sizeBytes: input.sizeBytes,
      status: "indexed",
      chunkCount: chunks.length,
      metadata: {},
      createdAt: iso,
      updatedAt: iso,
    };
    demoStore.knowledgeDocuments().unshift(doc);

    for (let i = 0; i < chunks.length; i++) {
      const chunk: DemoKnowledgeChunk = {
        id: newId(),
        documentId: docId,
        workspaceId: input.workspaceId,
        content: chunks[i]!,
        embedding: embeddings[i],
        chunkIndex: i,
        metadata: {},
        createdAt: iso,
      };
      demoStore.knowledgeChunks().unshift(chunk);
    }

    return {
      document: {
        id: doc.id,
        title: doc.title,
        fileName: doc.fileName,
        status: doc.status,
        chunkCount: doc.chunkCount,
        createdAt: doc.createdAt,
      },
      demo: true,
    };
  }

  const inserted = await db
    .insert(knowledgeDocuments)
    .values({
      workspaceId: input.workspaceId,
      userId: input.userId,
      title: input.title,
      fileName: input.fileName,
      mimeType: input.mimeType,
      storagePath: input.storagePath,
      sizeBytes: input.sizeBytes,
      status: "processing",
      chunkCount: 0,
    })
    .returning({
      id: knowledgeDocuments.id,
      createdAt: knowledgeDocuments.createdAt,
    });

  const documentId = inserted[0]!.id;

  try {
    await db.insert(knowledgeChunks).values(
      chunks.map((content, i) => ({
        documentId,
        workspaceId: input.workspaceId,
        content,
        embedding: embeddings[i]!,
        chunkIndex: i,
        metadata: {},
      })),
    );

    await db
      .update(knowledgeDocuments)
      .set({
        status: "indexed",
        chunkCount: chunks.length,
        updatedAt: new Date(),
      })
      .where(eq(knowledgeDocuments.id, documentId));

    return {
      document: {
        id: documentId,
        title: input.title,
        fileName: input.fileName,
        status: "indexed",
        chunkCount: chunks.length,
        createdAt: inserted[0]!.createdAt.toISOString(),
      },
      demo: false,
    };
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Indexing failed";
    await db
      .update(knowledgeDocuments)
      .set({
        status: "failed",
        errorMessage: message.slice(0, 500),
        updatedAt: new Date(),
      })
      .where(eq(knowledgeDocuments.id, documentId));
    throw new NexaError("KNOWLEDGE_INDEX_FAILED", message, {
      status: 500,
      cause: error,
    });
  }
}

async function storePendingDocument(
  input: IndexDocumentInput,
  note: string,
): Promise<IndexDocumentResult> {
  const db = tryGetDb();
  const now = new Date();

  if (!db) {
    const iso = now.toISOString();
    const doc: DemoKnowledgeDocument = {
      id: newId(),
      workspaceId: input.workspaceId,
      userId: input.userId,
      title: input.title,
      fileName: input.fileName,
      mimeType: input.mimeType,
      storagePath: input.storagePath,
      sizeBytes: input.sizeBytes,
      status: "pending",
      chunkCount: 0,
      errorMessage: note,
      metadata: { note },
      createdAt: iso,
      updatedAt: iso,
    };
    demoStore.knowledgeDocuments().unshift(doc);
    return {
      document: {
        id: doc.id,
        title: doc.title,
        fileName: doc.fileName,
        status: doc.status,
        chunkCount: 0,
        errorMessage: note,
        createdAt: doc.createdAt,
      },
      demo: true,
    };
  }

  const inserted = await db
    .insert(knowledgeDocuments)
    .values({
      workspaceId: input.workspaceId,
      userId: input.userId,
      title: input.title,
      fileName: input.fileName,
      mimeType: input.mimeType,
      storagePath: input.storagePath,
      sizeBytes: input.sizeBytes,
      status: "pending",
      chunkCount: 0,
      errorMessage: note,
      metadata: { note },
    })
    .returning({
      id: knowledgeDocuments.id,
      createdAt: knowledgeDocuments.createdAt,
    });

  return {
    document: {
      id: inserted[0]!.id,
      title: input.title,
      fileName: input.fileName,
      status: "pending",
      chunkCount: 0,
      errorMessage: note,
      createdAt: inserted[0]!.createdAt.toISOString(),
    },
    demo: false,
  };
}

/**
 * Semantic knowledge search.
 * Same approach as memory: embed query, fetch a recent candidate window
 * (or demo chunks), rank by cosine similarity in JS.
 */
export async function searchKnowledge(
  input: SearchKnowledgeInput,
): Promise<{ items: KnowledgeSearchHit[]; demo: boolean }> {
  const limit = Math.max(1, Math.min(input.limit ?? 10, 50));
  const [queryEmbedding] = await embedTexts([input.query]);
  const db = tryGetDb();

  if (!db) {
    let chunks = demoStore
      .knowledgeChunks()
      .filter((c) => c.workspaceId === input.workspaceId);
    if (input.documentId) {
      chunks = chunks.filter((c) => c.documentId === input.documentId);
    }

    const items = chunks
      .map((c) => {
        const score = c.embedding
          ? cosineSimilarity(queryEmbedding!, c.embedding)
          : 0;
        return {
          id: c.id,
          documentId: c.documentId,
          content: c.content,
          score,
          chunkIndex: c.chunkIndex,
          createdAt: c.createdAt,
        } satisfies KnowledgeSearchHit;
      })
      .sort((a, b) => b.score - a.score)
      .slice(0, limit);

    return { items, demo: true };
  }

  const CANDIDATE_WINDOW = Math.max(limit * 30, 300);
  const conditions = [eq(knowledgeChunks.workspaceId, input.workspaceId)];
  if (input.documentId) {
    conditions.push(eq(knowledgeChunks.documentId, input.documentId));
  }

  const rows = await db
    .select({
      id: knowledgeChunks.id,
      documentId: knowledgeChunks.documentId,
      content: knowledgeChunks.content,
      embedding: knowledgeChunks.embedding,
      chunkIndex: knowledgeChunks.chunkIndex,
      createdAt: knowledgeChunks.createdAt,
    })
    .from(knowledgeChunks)
    .where(and(...conditions))
    .orderBy(desc(knowledgeChunks.createdAt))
    .limit(CANDIDATE_WINDOW);

  const items = rows
    .map((row) => {
      const emb = parseEmbedding(row.embedding);
      const score = emb ? cosineSimilarity(queryEmbedding!, emb) : 0;
      return {
        id: row.id,
        documentId: row.documentId,
        content: row.content,
        score,
        chunkIndex: row.chunkIndex,
        createdAt: row.createdAt.toISOString(),
      } satisfies KnowledgeSearchHit;
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

function extensionOf(name: string): string {
  const i = name.lastIndexOf(".");
  if (i < 0) return "";
  return name.slice(i + 1).toLowerCase();
}
