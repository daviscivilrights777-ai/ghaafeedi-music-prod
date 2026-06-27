import { Hono } from "hono";
import { db } from "../database";
import * as schema from "../database/schema";
import { requireAuth } from "../middleware/auth";
import { eq, desc } from "drizzle-orm";
import { poyoChat, POYO_LLM } from "../orchestration/adapters/poyo.adapter";

export const stories = new Hono()
  .get("/", requireAuth, async (c) => {
    const user = c.get("user") as any;
    const rows = await db.select().from(schema.stories).where(eq(schema.stories.userId, user.id)).orderBy(desc(schema.stories.createdAt));
    return c.json({ stories: rows }, 200);
  })
  .post("/", requireAuth, async (c) => {
    const user = c.get("user") as any;
    const body = await c.req.json();
    const { storyText, title, emotion, style, mood, goals, orderId } = body;
    if (!storyText) return c.json({ message: "Story text required" }, 400);
    const [story] = await db.insert(schema.stories).values({
      id: crypto.randomUUID(), userId: user.id, storyText, title, emotion, style, mood, goals, orderId, status: "draft",
    }).returning();
    return c.json({ story }, 201);
  })
  .get("/:id", requireAuth, async (c) => {
    const user = c.get("user") as any;
    const { id } = c.req.param();
    const [story] = await db.select().from(schema.stories).where(eq(schema.stories.id, id));
    if (!story || story.userId !== user.id) return c.json({ message: "Not found" }, 404);
    return c.json({ story }, 200);
  })
  .post("/:id/analyze", requireAuth, async (c) => {
    const user = c.get("user") as any;
    const { id } = c.req.param();
    const [story] = await db.select().from(schema.stories).where(eq(schema.stories.id, id));
    if (!story || story.userId !== user.id) return c.json({ message: "Not found" }, 404);

    await db.update(schema.stories).set({ status: "analyzing" }).where(eq(schema.stories.id, id));

    try {
      const jobId = crypto.randomUUID();
      await db.insert(schema.aiJobs).values({
        id: jobId, userId: user.id, storyId: id, type: "emotion_analysis",
        provider: "openai", status: "running", input: JSON.stringify({ storyText: story.storyText }),
      });

      const text = await poyoChat({
        model: POYO_LLM.pipeline,
        messages: [{
          role: "user",
          content: `You are an expert emotional storytelling AI for Ghaafeedi Music, a luxury cinematic storytelling platform.

Analyze this personal story and extract key insights for creating a cinematic song/video:

STORY: ${story.storyText}

Respond with a JSON object (no markdown) containing:
{
  "primaryEmotion": "single dominant emotion",
  "emotionIntensity": 1-10,
  "themes": ["theme1", "theme2", "theme3"],
  "keyMoments": ["moment1", "moment2"],
  "suggestedGenre": "music genre",
  "suggestedMood": "overall mood",
  "suggestedTitle": "compelling song/video title",
  "colorPalette": ["#hex1", "#hex2", "#hex3"],
  "cinematicStyle": "visual style description",
  "emotionalArc": "brief emotional journey description",
  "personalizationNotes": "specific details to weave in"
}`,
        }],
        temperature: 0.7,
        max_tokens: 1000,
      });

      let analysis;
      try { analysis = JSON.parse(text); } catch { analysis = { raw: text }; }

      const [updated] = await db.update(schema.stories).set({
        aiAnalysis: JSON.stringify(analysis),
        status: "analyzed",
        emotion: analysis.primaryEmotion ?? story.emotion,
        updatedAt: new Date(),
      }).where(eq(schema.stories.id, id)).returning();

      const textStr = typeof text === "string" ? text : JSON.stringify(text);
      await db.update(schema.aiJobs).set({ status: "completed", output: textStr, updatedAt: new Date() }).where(eq(schema.aiJobs.id, jobId));

      return c.json({ story: updated, analysis }, 200);
    } catch (err: any) {
      await db.update(schema.stories).set({ status: "draft" }).where(eq(schema.stories.id, id));
      return c.json({ message: "Analysis failed", error: err.message }, 500);
    }
  })
  .post("/:id/generate-lyrics", requireAuth, async (c) => {
    const user = c.get("user") as any;
    const { id } = c.req.param();
    const [story] = await db.select().from(schema.stories).where(eq(schema.stories.id, id));
    if (!story || story.userId !== user.id) return c.json({ message: "Not found" }, 404);

    const analysis = story.aiAnalysis ? JSON.parse(story.aiAnalysis) : {};
    try {
      const lyrics = await poyoChat({
        model: POYO_LLM.pipeline,
        messages: [{
          role: "user",
          content: `You are a world-class songwriter for Ghaafeedi Music, a luxury cinematic storytelling platform.

Create deeply personal, cinematic song lyrics based on this story:

STORY: ${story.storyText}
EMOTION: ${story.emotion ?? analysis.primaryEmotion ?? "heartfelt"}
STYLE: ${story.style ?? analysis.suggestedGenre ?? "cinematic"}
MOOD: ${story.mood ?? analysis.suggestedMood ?? "emotional"}
THEMES: ${JSON.stringify(analysis.themes ?? [])}

Write complete lyrics with:
- [VERSE 1], [PRE-CHORUS], [CHORUS], [VERSE 2], [BRIDGE], [OUTRO]
- Deeply personal references to the story
- Cinematic, poetic language
- Emotionally resonant imagery
- A clear narrative arc

Make it feel like this song was written only for this person.`,
        }],
        temperature: 0.85,
        max_tokens: 1500,
      });

      const [updated] = await db.update(schema.stories).set({ lyrics, updatedAt: new Date() }).where(eq(schema.stories.id, id)).returning();
      return c.json({ story: updated, lyrics }, 200);
    } catch (err: any) {
      return c.json({ message: "Lyrics generation failed", error: err.message }, 500);
    }
  });
