import * as schema from "./schema";

const dbUrl = process.env.DATABASE_URL ?? "";
const useTurso =
  dbUrl.startsWith("libsql:") ||
  dbUrl.startsWith("http://") ||
  dbUrl.startsWith("https://") ||
  dbUrl.startsWith("file:");

let db: any;

if (useTurso) {
  // Turso / libsql path
  const { drizzle } = await import("drizzle-orm/libsql");
  const { createClient } = await import("@libsql/client");
  const client = createClient({
    url: dbUrl,
    authToken: process.env.DATABASE_AUTH_TOKEN,
  });
  db = drizzle(client, { schema });
} else {
  // PostgreSQL path — existing legacy routes return empty stubs
  // Real PG queries go through packages/web/src/api/pg-client.ts
  console.warn(
    "[database/index.ts] DATABASE_URL is PostgreSQL — legacy Turso routes will return empty stubs. Migrate to pg-client.ts."
  );
  db = {
    select: () => ({ from: () => ({ where: () => Promise.resolve([]) } as any) }),
    insert: () => ({ values: () => ({ returning: () => Promise.resolve([]) } as any) }),
    update: () => ({ set: () => ({ where: () => ({ returning: () => Promise.resolve([]) } as any) }) }),
    delete: () => ({ where: () => Promise.resolve([]) }),
    query: new Proxy({}, { get: () => ({ findMany: () => Promise.resolve([]), findFirst: () => Promise.resolve(null) }) }),
  };
}

export { db };
