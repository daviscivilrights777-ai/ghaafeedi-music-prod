// ─── Ghaafeedi Music — Hono Environment Type ─────────────────────────────────
// Declares the Variables shape that all routes use via c.get("user") / c.get("session").
// Import this type wherever you create a Hono app or middleware.

export interface HonoEnv {
  Variables: {
    user:    Record<string, any> | null;
    session: Record<string, any> | null;
  };
}
