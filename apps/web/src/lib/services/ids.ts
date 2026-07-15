import { createHash } from "node:crypto";

/** Cryptographically random UUID (RFC 4122). */
export function newId(): string {
  return crypto.randomUUID();
}

/**
 * Deterministic UUID derived from a namespace + seed.
 * Used by the demo store so the same Supabase user always maps to the same
 * profile / workspace ids across process restarts within a session shape.
 */
export function deterministicId(namespace: string, seed: string): string {
  const hash = createHash("sha256")
    .update(`${namespace}:${seed}`)
    .digest();
  const bytes = Buffer.from(hash.subarray(0, 16));
  // Set version (4) and RFC 4122 variant bits
  bytes[6] = (bytes[6]! & 0x0f) | 0x40;
  bytes[8] = (bytes[8]! & 0x3f) | 0x80;
  const hex = bytes.toString("hex");
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20, 32)}`;
}
