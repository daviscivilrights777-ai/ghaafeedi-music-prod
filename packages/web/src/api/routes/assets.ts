import { Hono } from "hono";
import type { HonoEnv } from "../hono-env";
import { db } from "../database";
import * as schema from "../database/schema";
import { requireAuth } from "../middleware/auth";
import { eq, desc } from "drizzle-orm";
import { s3, S3_BUCKET } from "../lib/s3";
import { PutObjectCommand, GetObjectCommand, DeleteObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

export const assets = new Hono<HonoEnv>()
  .post("/presign", requireAuth, async (c) => {
    const user = c.get("user") as any;
    const { filename, contentType, storyId, orderId, type } = await c.req.json();
    if (!filename || !contentType) return c.json({ message: "filename and contentType required" }, 400);
    const key = `uploads/${user.id}/${Date.now()}-${crypto.randomUUID().slice(0,8)}-${filename}`;
    try {
      const url = await getSignedUrl(s3, new PutObjectCommand({
        Bucket: S3_BUCKET, Key: key, ContentType: contentType,
      }), { expiresIn: 600 });
      // Pre-register asset
      const [asset] = await db.insert(schema.assets).values({
        id: crypto.randomUUID(), userId: user.id, storyId, orderId,
        type: type ?? "photo", key, filename, contentType,
      }).returning();
      return c.json({ url, key, assetId: asset.id }, 200);
    } catch {
      // S3 not configured — return mock for dev
      return c.json({ url: "", key, assetId: crypto.randomUUID() }, 200);
    }
  })
  .get("/", requireAuth, async (c) => {
    const user = c.get("user") as any;
    const rows = await db.select().from(schema.assets).where(eq(schema.assets.userId, user.id)).orderBy(desc(schema.assets.createdAt));
    // Generate presigned URLs
    const withUrls = await Promise.all(rows.map(async (a: any) => {
      try {
        const url = await getSignedUrl(s3, new GetObjectCommand({ Bucket: S3_BUCKET, Key: a.key }), { expiresIn: 3600 });
        return { ...a, url };
      } catch {
        return { ...a, url: null };
      }
    }));
    return c.json({ assets: withUrls }, 200);
  })
  .delete("/:id", requireAuth, async (c) => {
    const user = c.get("user") as any;
    const { id } = c.req.param();
    const [asset] = await db.select().from(schema.assets).where(eq(schema.assets.id, id));
    if (!asset || asset.userId !== user.id) return c.json({ message: "Not found" }, 404);
    try { await s3.send(new DeleteObjectCommand({ Bucket: S3_BUCKET, Key: asset.key })); } catch {}
    await db.delete(schema.assets).where(eq(schema.assets.id, id));
    return c.json({ success: true }, 200);
  });
