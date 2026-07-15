import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema/index";

let client: ReturnType<typeof postgres> | null = null;

/**
 * Create a Drizzle DB client. Requires DATABASE_URL.
 * Uses a singleton connection in long-lived processes.
 */
export function createDb(connectionString?: string) {
  const url = connectionString ?? process.env.DATABASE_URL;
  if (!url) {
    throw new Error("DATABASE_URL is required");
  }
  if (!client) {
    client = postgres(url, { max: 10, prepare: false });
  }
  return drizzle(client, { schema });
}

export type Database = ReturnType<typeof createDb>;

export * from "./schema/index";
