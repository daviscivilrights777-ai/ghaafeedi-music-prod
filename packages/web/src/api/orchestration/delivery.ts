// ============================================================
// Ghaafeedi Music — Delivery Helper
// Handles final delivery: R2 upload check, signed URL generation,
// style embedding creation, n8n notification trigger.
// Phase 10.
// ============================================================

import crypto from "crypto";
import { db } from "../database/pg-client";
import { sql } from "drizzle-orm";
import { n8nDispatcher } from "./n8n-dispatcher";
import type { StyleGenome } from "./schemas/style-genome.schema";
import { buildEmotionVector } from "./schemas/style-genome.schema";

// ─── Signed URL generation (R2 pre-signed URL) ───────────────
// Since R2 doesn't have a native JS SDK installed, we generate
// AWS Signature v4 compatible signed URLs manually.

export interface SignedUrlOptions {
  bucket:      string;
  key:         string;
  expiresIn:   number;  // seconds (default 48 hours = 172800)
  contentType?: string;
}

export interface DeliveryResult {
  signedUrl:   string;    // 48h pre-signed download URL for customer
  cdnUrl:      string;    // Permanent R2 public CDN URL
  r2Key:       string;    // R2 object key
  expiresAt:   string;    // ISO timestamp
}

// Generate a pre-signed R2 URL using AWS SigV4
export async function generateSignedUrl(opts: SignedUrlOptions): Promise<string> {
  const {
    bucket    = "ghaafeedi-media",
    key,
    expiresIn = 172800, // 48 hours
  } = opts;

  const accessKeyId     = process.env.R2_ACCESS_KEY_ID ?? "";
  const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY ?? "";
  const endpoint        = process.env.R2_ENDPOINT
    ?? "https://56e7ace05da7338f6d61b014123e6a24.r2.cloudflarestorage.com";

  if (!accessKeyId || !secretAccessKey) {
    // Return CDN URL as fallback if credentials not set
    const cdnBase = "https://pub-bc7b203485814e1186102277ad450211.r2.dev";
    return `${cdnBase}/${key}`;
  }

  const region = "auto";
  const service = "s3";
  const now = new Date();
  const dateStamp  = now.toISOString().slice(0, 10).replace(/-/g, ""); // YYYYMMDD
  const amzDate    = now.toISOString().replace(/[:-]|\.\d{3}/g, "").slice(0, 15) + "Z"; // yyyymmddThhmmssZ
  const host       = new URL(endpoint).host;
  const credential = `${accessKeyId}/${dateStamp}/${region}/${service}/aws4_request`;

  const canonicalQueryString = [
    `X-Amz-Algorithm=AWS4-HMAC-SHA256`,
    `X-Amz-Credential=${encodeURIComponent(credential)}`,
    `X-Amz-Date=${amzDate}`,
    `X-Amz-Expires=${expiresIn}`,
    `X-Amz-SignedHeaders=host`,
  ].join("&");

  const canonicalRequest = [
    "GET",
    `/${key}`,
    canonicalQueryString,
    `host:${host}\n`,
    "host",
    "UNSIGNED-PAYLOAD",
  ].join("\n");

  const stringToSign = [
    "AWS4-HMAC-SHA256",
    amzDate,
    `${dateStamp}/${region}/${service}/aws4_request`,
    crypto.createHash("sha256").update(canonicalRequest).digest("hex"),
  ].join("\n");

  // Signing key
  const hmac = (key: Buffer | string, data: string) =>
    crypto.createHmac("sha256", key).update(data).digest();
  const signingKey = hmac(
    hmac(
      hmac(
        hmac(Buffer.from(`AWS4${secretAccessKey}`), dateStamp),
        region
      ),
      service
    ),
    "aws4_request"
  );

  const signature = hmac(signingKey, stringToSign).toString("hex");

  return `${endpoint}/${key}?${canonicalQueryString}&X-Amz-Signature=${signature}`;
}

// ─── Full delivery flow ───────────────────────────────────────
export async function deliverProduction(params: {
  productionId: string;
  userId:        string;
  orderId?:      string;
  pipelineRunId: string;
  r2Key:         string;          // e.g. productions/PROD-001/pipe_xxx/final.mp4
  productSlug:   string;
  customerEmail?: string;
  customerName?:  string;
  storyBible?:   Record<string, unknown>;
}): Promise<DeliveryResult> {
  const cdnBase  = "https://pub-bc7b203485814e1186102277ad450211.r2.dev";
  const cdnUrl   = `${cdnBase}/${params.r2Key}`;
  const expiresAt = new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString();

  // Generate 48h pre-signed URL
  const signedUrl = await generateSignedUrl({
    bucket:    "ghaafeedi-media",
    key:       params.r2Key,
    expiresIn: 172800,
  });

  // Store delivery record in productions table
  try {
    await db.execute(sql`
      UPDATE productions
      SET   status = 'delivered',
            delivered_at = NOW(),
            deliverable_keys = jsonb_build_array(${params.r2Key}::text),
            metadata = metadata || ${JSON.stringify({
              cdnUrl,
              signedUrl,
              signedUrlExpiresAt: expiresAt,
              pipelineRunId: params.pipelineRunId,
              deliveredAt: new Date().toISOString(),
            })}::jsonb
      WHERE id = ${params.productionId}
    `);
  } catch (err) {
    console.warn("[Delivery] productions update failed:", (err as Error).message);
  }

  // Trigger n8n workflow 3 — job complete delivery notification
  try {
    await n8nDispatcher.jobComplete({
      jobId:         `deliver_${params.pipelineRunId}`,
      userId:        params.userId,
      jobType:       "deliver",
      productName:   params.productSlug,
      deliveryUrl:   signedUrl,
      customerEmail: params.customerEmail ?? "",
      customerName:  params.customerName  ?? "",
    });
  } catch (err) {
    console.warn("[Delivery] n8n dispatch failed:", (err as Error).message);
  }

  return { signedUrl, cdnUrl, r2Key: params.r2Key, expiresAt };
}

// ─── Style Memory — save embedding after delivery ─────────────
export async function saveStyleEmbedding(params: {
  productionId: string;
  userId:        string;
  genome:        Partial<StyleGenome>;
  qualityScore?: number;
}): Promise<void> {
  const { productionId, userId, genome, qualityScore = 0.8 } = params;
  const id = `se_${crypto.randomUUID().replace(/-/g, "")}`;

  const emotionVector = genome.emotionVector ?? buildEmotionVector(
    (genome.audio?.energyLevel !== undefined)
      ? { joy: genome.audio.energyLevel, sadness: 1 - genome.audio.emotionalValence, love: 0.5, nostalgia: 0.5, hope: genome.audio.emotionalValence }
      : {}
  );

  try {
    // Generate text embedding for the genome (Phase 10 — OpenAI embedding)
    let embedding: number[] | null = null;
    try {
      const apiKey = process.env.OPENAI_API_KEY ?? "";
      if (apiKey) {
        const text = [
          genome.visual?.cinematicStyle,
          genome.primaryEmotion,
          genome.audio?.genre,
          genome.audio?.genre,
        ].filter(Boolean).join(". ");

        const embRes = await fetch("https://api.openai.com/v1/embeddings", {
          method:  "POST",
          headers: { "Content-Type": "application/json", "Authorization": `Bearer ${apiKey}` },
          body:    JSON.stringify({ model: "text-embedding-3-small", input: text }),
        });
        if (embRes.ok) {
          const embData = await embRes.json() as { data: Array<{ embedding: number[] }> };
          embedding = embData.data[0]?.embedding ?? null;
        }
      }
    } catch (embErr) {
      console.warn("[StyleMemory] embedding generation failed:", (embErr as Error).message);
    }

    await db.execute(sql`
      INSERT INTO style_embeddings (id, production_id, user_id, emotion_vector, genome_json, primary_emotion, product_slug, quality_score, approved, created_at)
      VALUES (
        ${id},
        ${productionId},
        ${userId},
        ${JSON.stringify(emotionVector)}::vector,
        ${JSON.stringify(genome)}::jsonb,
        ${genome.primaryEmotion ?? "unknown"},
        ${genome.productionId ?? ""},
        ${qualityScore},
        ${qualityScore >= 0.7},
        NOW()
      )
    `);

    // If we have a full embedding, update it separately
    if (embedding) {
      await db.execute(sql`
        UPDATE style_embeddings
        SET embedding = ${JSON.stringify(embedding)}::vector
        WHERE id = ${id}
      `);
    }

    console.log(`[StyleMemory] Saved genome for production=${productionId}`);
  } catch (err) {
    console.warn("[StyleMemory] save failed:", (err as Error).message);
    // Non-fatal — style memory is best-effort
  }
}

// ─── Style similarity search (Phase 10) ──────────────────────
export async function findSimilarProductions(
  emotionVector: number[],
  limit: number = 5
): Promise<Array<{ productionId: string; similarity: number; genome: unknown }>> {
  try {
    type SimilarRow = { production_id: string; similarity: number; genome_json: unknown };
    const rows = await db.execute<SimilarRow>(sql`
      SELECT production_id,
             1 - (emotion_vector <=> ${JSON.stringify(emotionVector)}::vector) AS similarity,
             genome_json
      FROM   style_embeddings
      WHERE  approved = true
      ORDER  BY emotion_vector <=> ${JSON.stringify(emotionVector)}::vector
      LIMIT  ${limit}
    `);
    const rowArr = Array.isArray(rows) ? rows : (rows as any).rows ?? [];
    return rowArr.map((r: SimilarRow) => ({
      productionId: r.production_id,
      similarity:   r.similarity,
      genome:       r.genome_json,
    }));
  } catch (err) {
    console.warn("[StyleMemory] similarity search failed:", (err as Error).message);
    return [];
  }
}
