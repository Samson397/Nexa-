import { createDb, type Database } from "@nexa/db";
import { NexaError } from "@nexa/shared";

let cached: Database | null = null;

/** True when DATABASE_URL is configured. */
export function hasDatabase(): boolean {
  const url = process.env.DATABASE_URL;
  return typeof url === "string" && url.length > 0;
}

/**
 * Lazily create the Drizzle client from @nexa/db.
 * Throws NexaError when DATABASE_URL is missing.
 */
export function getDb(): Database {
  if (!hasDatabase()) {
    throw new NexaError(
      "DATABASE_UNAVAILABLE",
      "DATABASE_URL is not configured",
      { status: 503 },
    );
  }
  if (!cached) {
    cached = createDb(process.env.DATABASE_URL);
  }
  return cached;
}

/** Returns the DB client when DATABASE_URL is set; otherwise null. */
export function tryGetDb(): Database | null {
  if (!hasDatabase()) return null;
  return getDb();
}
