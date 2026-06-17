import { db } from "./src/api/database/pg-client";
import { randomUUID } from "crypto";

const providers = [
  { name: 'fal_ai_kling', display_name: 'FAL.ai Kling', job_types: ['video'], config: { model: 'kling-v1', endpoint: 'https://fal.run/fal-ai/kling-video' }, priority: 1, cost_per_unit: 0.045, unit: 'second', max_concurrent: 10, api_key_ref: 'FAL_AI_API_KEY' },
  { name: 'fal_ai_hailuo', display_name: 'FAL.ai Hailuo', job_types: ['video'], config: { model: 'hailuo-video', endpoint: 'https://fal.run/fal-ai/hailuo-video' }, priority: 2, cost_per_unit: 0.038, unit: 'second', max_concurrent: 8, api_key_ref: 'FAL_AI_API_KEY' },
  { name: 'suno', display_name: 'Suno Music', job_types: ['music'], config: { endpoint: 'https://api.sunor.cc/v1', version: 'v4' }, priority: 1, cost_per_unit: 0.12, unit: 'song', max_concurrent: 5, api_key_ref: 'SUNO_API_KEY' },
  { name: 'elevenlabs', display_name: 'ElevenLabs Voice', job_types: ['voice'], config: { model: 'eleven_multilingual_v2', endpoint: 'https://api.elevenlabs.io/v1' }, priority: 1, cost_per_unit: 0.003, unit: 'character', max_concurrent: 20, api_key_ref: 'ELEVENLABS_API_KEY' },
  { name: 'openai', display_name: 'OpenAI GPT', job_types: ['llm', 'analysis'], config: { model: 'gpt-4o-mini', endpoint: 'https://api.openai.com/v1' }, priority: 1, cost_per_unit: 0.00015, unit: 'token', max_concurrent: 50, api_key_ref: 'OPENAI_API_KEY' },
  { name: 'modal', display_name: 'Modal Video', job_types: ['video'], config: { endpoint: 'https://modal.run/ghaafeedi/video-gen' }, priority: 3, cost_per_unit: 0.028, unit: 'second', max_concurrent: 15, api_key_ref: 'MODAL_API_KEY' },
  { name: 'vast_ai', display_name: 'Vast.ai GPU', job_types: ['video'], config: { endpoint: 'https://api.vast.ai/v0/asks' }, priority: 4, cost_per_unit: 0.018, unit: 'second', max_concurrent: 30, api_key_ref: 'VAST_AI_API_KEY' },
];

const pool = (db as any).$client;

for (const p of providers) {
  await pool.query(
    `INSERT INTO providers (id, name, display_name, enabled, job_types, config, priority, cost_per_unit, unit, max_concurrent, api_key_ref)
     VALUES ($1, $2, $3, true, $4, $5, $6, $7, $8, $9, $10)
     ON CONFLICT (name) DO UPDATE SET config = EXCLUDED.config, display_name = EXCLUDED.display_name, updated_at = NOW()`,
    [randomUUID(), p.name, p.display_name, JSON.stringify(p.job_types), JSON.stringify(p.config), p.priority, p.cost_per_unit, p.unit, p.max_concurrent, p.api_key_ref]
  );
  console.log("Seeded:", p.name);
}

await pool.end();
console.log("Done.");
