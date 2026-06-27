// ============================================================
// Ghaafeedi Music — Infisical Secrets Client
// Self-hosted Infisical vault. Falls back to process.env in dev.
// ============================================================
import { InfisicalSDK } from "@infisical/sdk";

const ENV = process.env.NODE_ENV ?? "development";
const INFISICAL_SITE_URL   = process.env.INFISICAL_SITE_URL;
const INFISICAL_CLIENT_ID  = process.env.INFISICAL_CLIENT_ID;
const INFISICAL_CLIENT_SECRET = process.env.INFISICAL_CLIENT_SECRET;
const INFISICAL_PROJECT_ID = process.env.INFISICAL_PROJECT_ID;

let client: InfisicalSDK | null = null;
const secretCache = new Map<string, string>();

/**
 * Initialize Infisical client.
 * In dev without Infisical configured, falls back silently to env vars.
 */
async function getClient(): Promise<InfisicalSDK | null> {
  if (client) return client;
  if (!INFISICAL_SITE_URL || !INFISICAL_CLIENT_ID || !INFISICAL_CLIENT_SECRET) {
    if (ENV !== "production") {
      console.warn("[Secrets] Infisical not configured — using process.env fallback (dev mode)");
      return null;
    }
    throw new Error("[Secrets] Infisical credentials required in production");
  }

  const sdk = new InfisicalSDK({ siteUrl: INFISICAL_SITE_URL });
  await sdk.auth().universalAuth.login({
    clientId: INFISICAL_CLIENT_ID,
    clientSecret: INFISICAL_CLIENT_SECRET,
  });
  client = sdk;
  return client;
}

/**
 * Get a secret by key.
 * 1. Check in-memory cache
 * 2. Try Infisical vault
 * 3. Fall back to process.env
 */
export async function getSecret(key: string): Promise<string> {
  if (secretCache.has(key)) return secretCache.get(key)!;

  const sdk = await getClient();

  if (sdk && INFISICAL_PROJECT_ID) {
    try {
      const result = await sdk.secrets().getSecret({
        projectId: INFISICAL_PROJECT_ID,
        environment: ENV === "production" ? "prod" : "dev",
        secretName: key,
      });
      const value = result.secretValue;
      secretCache.set(key, value);
      return value;
    } catch (err) {
      console.warn(`[Secrets] Failed to fetch '${key}' from Infisical, falling back to env:`, err);
    }
  }

  const envVal = process.env[key];
  if (!envVal) {
    throw new Error(`[Secrets] Secret '${key}' not found in Infisical or process.env`);
  }
  return envVal;
}

/**
 * Preload all provider secrets at startup for fast access.
 * Keys match the api_key_ref column in the providers table.
 */
export async function preloadProviderSecrets(): Promise<void> {
  const keys = [
    "FAL_API_KEY",
    "MODAL_API_KEY",
    "VAST_AI_API_KEY",
    "POYO_API_KEY",
    "ELEVENLABS_API_KEY",
    "OPENAI_API_KEY",
    "POSTGRES_URL",
    "UPSTASH_REDIS_URL",
    "UPSTASH_REDIS_TOKEN",
  ];

  await Promise.allSettled(
    keys.map(async (k) => {
      try {
        await getSecret(k);
      } catch {
        // Non-fatal at startup — provider will fail at dispatch time if key missing
      }
    })
  );

  console.log("[Secrets] Provider secrets preloaded");
}

/**
 * Secret key registry — all known secret names.
 * Update here when adding new providers.
 */
export const SECRET_KEYS = {
  FAL_API_KEY:           "FAL_API_KEY",
  MODAL_API_KEY:         "MODAL_API_KEY",
  VAST_AI_API_KEY:       "VAST_AI_API_KEY",
  POYO_API_KEY:          "POYO_API_KEY",
  ELEVENLABS_API_KEY:    "ELEVENLABS_API_KEY",
  OPENAI_API_KEY:        "OPENAI_API_KEY",
  POSTGRES_URL:          "POSTGRES_URL",
  UPSTASH_REDIS_URL:     "UPSTASH_REDIS_URL",
  UPSTASH_REDIS_TOKEN:   "UPSTASH_REDIS_TOKEN",
  JWT_SECRET:            "JWT_SECRET",
  AWS_ACCESS_KEY_ID:     "AWS_ACCESS_KEY_ID",
  AWS_SECRET_ACCESS_KEY: "AWS_SECRET_ACCESS_KEY",
  N8N_WEBHOOK_SECRET:    "N8N_WEBHOOK_SECRET",
} as const;

export type SecretKey = keyof typeof SECRET_KEYS;
