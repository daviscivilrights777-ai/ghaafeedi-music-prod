// ============================================================
// Migration 008 — Style Embeddings + pgvector extension
// Adds: style_embeddings table with pgvector column
// Phase 10: Style memory across productions
// ============================================================
import { db } from "../pg-client";
import { sql } from "drizzle-orm";

export async function up() {
  console.log("[migration:008] Creating style_embeddings table...");

  // Enable pgvector extension (requires Railway PG with pgvector — already provisioned)
  await db.execute(sql`CREATE EXTENSION IF NOT EXISTS vector;`);

  // Style embeddings table
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS style_embeddings (
      id              text PRIMARY KEY,
      production_id   text NOT NULL,
      user_id         text NOT NULL,
      embedding       vector(1536),         -- OpenAI text-embedding-3-small
      emotion_vector  vector(5),            -- [joy, sadness, love, nostalgia, hope]
      genome_json     jsonb,                -- Full StyleGenome object
      primary_emotion text,
      product_slug    text,
      quality_score   float,
      approved        boolean DEFAULT false,
      created_at      timestamptz DEFAULT NOW()
    );
  `);

  // IVFFlat index for ANN search (Phase 10 queries)
  await db.execute(sql`
    CREATE INDEX IF NOT EXISTS idx_style_embeddings_ivfflat
    ON style_embeddings USING ivfflat (embedding vector_cosine_ops)
    WITH (lists = 100);
  `);

  // Index for emotion vector similarity
  await db.execute(sql`
    CREATE INDEX IF NOT EXISTS idx_style_embeddings_emotion
    ON style_embeddings USING ivfflat (emotion_vector vector_cosine_ops)
    WITH (lists = 50);
  `);

  // Lookup indexes
  await db.execute(sql`
    CREATE INDEX IF NOT EXISTS idx_style_embeddings_user_id
    ON style_embeddings (user_id);
  `);

  await db.execute(sql`
    CREATE INDEX IF NOT EXISTS idx_style_embeddings_production_id
    ON style_embeddings (production_id);
  `);

  console.log("[migration:008] Done.");
}

export async function down() {
  console.log("[migration:008] Rolling back style_embeddings...");
  await db.execute(sql`
    DROP TABLE IF EXISTS style_embeddings;
    DROP EXTENSION IF EXISTS vector;
  `);
  console.log("[migration:008] Rollback done.");
}
