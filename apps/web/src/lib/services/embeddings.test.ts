import { afterEach, describe, expect, it } from "vitest";
import {
  EMBEDDING_DIMS,
  chunkText,
  cosineSimilarity,
  embedTexts,
  pseudoEmbedding,
} from "./embeddings";

describe("chunkText", () => {
  it("returns empty for blank input", () => {
    expect(chunkText("")).toEqual([]);
    expect(chunkText("   \n\t  ")).toEqual([]);
  });

  it("returns a single chunk when text fits", () => {
    expect(chunkText("hello world", 100, 10)).toEqual(["hello world"]);
  });

  it("splits with overlap", () => {
    const text = "a".repeat(50);
    const chunks = chunkText(text, 20, 5);
    expect(chunks.length).toBeGreaterThan(1);
    expect(chunks[0]!.length).toBeLessThanOrEqual(20);
    // Overlap means consecutive chunks share content
    const joined = chunks.join("");
    expect(joined.length).toBeGreaterThan(text.length);
  });
});

describe("cosineSimilarity", () => {
  it("returns 1 for identical unit vectors", () => {
    const a = [1, 0, 0];
    expect(cosineSimilarity(a, a)).toBeCloseTo(1, 5);
  });

  it("returns 0 for orthogonal vectors", () => {
    expect(cosineSimilarity([1, 0], [0, 1])).toBeCloseTo(0, 5);
  });

  it("returns 0 for empty inputs", () => {
    expect(cosineSimilarity([], [])).toBe(0);
  });
});

describe("embedTexts (demo/hash path)", () => {
  const prevKey = process.env.OPENAI_API_KEY;

  afterEach(() => {
    if (prevKey === undefined) delete process.env.OPENAI_API_KEY;
    else process.env.OPENAI_API_KEY = prevKey;
  });

  it("returns empty array for empty input", async () => {
    delete process.env.OPENAI_API_KEY;
    expect(await embedTexts([])).toEqual([]);
  });

  it("uses deterministic hash embeddings when no API key", async () => {
    delete process.env.OPENAI_API_KEY;
    const [a, b] = await embedTexts(["NEXA knowledge", "NEXA knowledge"]);
    expect(a).toHaveLength(EMBEDDING_DIMS);
    expect(b).toHaveLength(EMBEDDING_DIMS);
    expect(cosineSimilarity(a!, b!)).toBeCloseTo(1, 5);
    expect(cosineSimilarity(a!, pseudoEmbedding("other topic"))).toBeLessThan(
      0.99,
    );
  });
});
