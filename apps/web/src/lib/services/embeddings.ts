import { createHash } from "node:crypto";

export const EMBEDDING_DIMS = 1536;
export const EMBEDDING_MODEL = "text-embedding-3-small";

/**
 * Embed texts via OpenAI when OPENAI_API_KEY is set.
 * Falls back to deterministic hash-based unit vectors so demo cosine search works.
 */
export async function embedTexts(texts: string[]): Promise<number[][]> {
  if (texts.length === 0) return [];

  const apiKey = process.env.OPENAI_API_KEY;
  if (apiKey && apiKey.length > 0) {
    return embedWithOpenAI(texts, apiKey);
  }
  return texts.map((t) => pseudoEmbedding(t));
}

async function embedWithOpenAI(
  texts: string[],
  apiKey: string,
): Promise<number[][]> {
  const res = await fetch("https://api.openai.com/v1/embeddings", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: EMBEDDING_MODEL,
      input: texts,
      dimensions: EMBEDDING_DIMS,
    }),
  });

  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(
      `OpenAI embeddings failed (${res.status}): ${body.slice(0, 200)}`,
    );
  }

  const data = (await res.json()) as {
    data: Array<{ embedding: number[]; index: number }>;
  };

  return data.data
    .sort((a, b) => a.index - b.index)
    .map((d) => d.embedding);
}

/**
 * Deterministic pseudo-embedding: SHA-256 expanded into a unit vector.
 * Cosine similarity between related strings is non-trivial but stable.
 */
export function pseudoEmbedding(text: string, dims = EMBEDDING_DIMS): number[] {
  const normalized = text.trim().toLowerCase();
  const vec = new Array<number>(dims).fill(0);
  let seed = normalized;
  let offset = 0;

  while (offset < dims) {
    const digest = createHash("sha256").update(seed).digest();
    for (let i = 0; i < digest.length && offset < dims; i += 2) {
      const unsigned = digest.readUInt16BE(i);
      // Map to [-1, 1]
      vec[offset] = unsigned / 0xffff * 2 - 1;
      offset += 1;
    }
    seed = digest.toString("hex");
  }

  return l2Normalize(vec);
}

export function cosineSimilarity(a: number[], b: number[]): number {
  const n = Math.min(a.length, b.length);
  if (n === 0) return 0;
  let dot = 0;
  let na = 0;
  let nb = 0;
  for (let i = 0; i < n; i++) {
    const x = a[i]!;
    const y = b[i]!;
    dot += x * y;
    na += x * x;
    nb += y * y;
  }
  const denom = Math.sqrt(na) * Math.sqrt(nb);
  if (denom === 0) return 0;
  return dot / denom;
}

function l2Normalize(vec: number[]): number[] {
  let sum = 0;
  for (const v of vec) sum += v * v;
  const norm = Math.sqrt(sum);
  if (norm === 0) return vec;
  return vec.map((v) => v / norm);
}

/**
 * Split text into overlapping character chunks.
 * Defaults sized for embedding models (~200–400 tokens).
 */
export function chunkText(
  text: string,
  chunkSize = 800,
  overlap = 100,
): string[] {
  const cleaned = text.replace(/\r\n/g, "\n").trim();
  if (!cleaned) return [];
  if (chunkSize <= 0) return [cleaned];

  const safeOverlap = Math.max(0, Math.min(overlap, chunkSize - 1));
  const chunks: string[] = [];
  let start = 0;

  while (start < cleaned.length) {
    const end = Math.min(start + chunkSize, cleaned.length);
    const slice = cleaned.slice(start, end).trim();
    if (slice) chunks.push(slice);
    if (end >= cleaned.length) break;
    start = end - safeOverlap;
  }

  return chunks;
}
