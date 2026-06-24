// ============================================================
// Ghaafeedi Music — PostgreSQL Client (Drizzle + pg)
// ============================================================
import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import * as schema from "./pg-schema";

let pool: Pool | null = null;

function getPool(): Pool {
  if (!pool) {
    const connectionString = process.env.POSTGRES_URL || process.env.DATABASE_URL;
    if (!connectionString) {
      throw new Error("POSTGRES_URL or DATABASE_URL env var required for PostgreSQL connection");
    }
    pool = new Pool({
      connectionString,
      max: 20,
      idleTimeoutMillis: 30_000,
      connectionTimeoutMillis: 5_000,
      ssl: process.env.NODE_ENV === "production" ? { rejectUnauthorized: false } : false,
    });

    pool.on("error", (err) => {
      console.error("[DB] Unexpected pool error:", err);
    });
  }
  return pool;
}

// Lazy db — only initialises pool when first query is made.
// This prevents a crash-on-import when DATABASE_URL is not yet set
// (e.g. Render cold start before env vars are injected).
let _db: ReturnType<typeof drizzle> | null = null;

function getDb() {
  if (!_db) {
    _db = drizzle(getPool(), { schema });
  }
  return _db;
}

export const db = new Proxy({} as ReturnType<typeof drizzle>, {
  get(_target, prop) {
    return (getDb() as any)[prop];
  },
});
export type DB = typeof db;

// Graceful shutdown
process.on("SIGTERM", async () => {
  if (pool) {
    await pool.end();
    console.log("[DB] Pool closed on SIGTERM");
  }
});
