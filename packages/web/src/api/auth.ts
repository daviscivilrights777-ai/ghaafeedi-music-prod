import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { bearer } from "better-auth/plugins";

// ── Pick the right DB + schema based on DATABASE_URL ──────────
const dbUrl = process.env.DATABASE_URL ?? "";
const isPostgres =
  dbUrl.startsWith("postgresql://") ||
  dbUrl.startsWith("postgres://");

let authDb: any;
let authSchema: any;

if (isPostgres) {
  // Live production — use Railway PostgreSQL
  const { db } = await import("./database/pg-client");
  const schema = await import("./database/pg-schema");
  authDb = db;
  authSchema = schema;
} else {
  // Local dev — use Turso/SQLite
  const { db } = await import("./database");
  const schema = await import("./database/auth-schema");
  authDb = db;
  authSchema = schema;
}

export const auth = betterAuth({
  basePath: "/api/auth",
  baseURL: (process.env.BETTER_AUTH_URL ?? "http://localhost:4200").trim(),
  database: drizzleAdapter(authDb, {
    provider: isPostgres ? "pg" : "sqlite",
    schema: authSchema,
  }),
  emailAndPassword: { enabled: true },
  secret: process.env.BETTER_AUTH_SECRET ?? "ghaafeedi-music-secret-key-change-in-prod",
  trustedOrigins: (request) => {
    const origin = request?.headers.get("origin");
    return origin ? [origin] : ["*"];
  },
  socialProviders: {
    ...(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET
      ? {
          google: {
            clientId: process.env.GOOGLE_CLIENT_ID,
            clientSecret: process.env.GOOGLE_CLIENT_SECRET,
            redirectURI: `${(process.env.BETTER_AUTH_URL ?? "http://localhost:4200").trim()}/api/auth/callback/google`,
          },
        }
      : {}),
  },
  plugins: [bearer()],
  session: {
    cookieCache: {
      enabled: true,
      maxAge: 60 * 60 * 24 * 7, // 7 days
    },
  },
});
