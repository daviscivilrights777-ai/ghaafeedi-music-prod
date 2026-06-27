/**
 * Braintrust logging wrapper for Ghaafeedi Music
 * Logs every OpenAI call so we can build fine-tuning datasets over time.
 * Drop-in replacement — wraps generateText from 'ai' SDK.
 */

import { initLogger, traced } from "braintrust";

let loggerInitialized = false;

function ensureLogger() {
  if (loggerInitialized) return;
  const apiKey = process.env.BRAINTRUST_API_KEY;
  if (!apiKey) return;
  initLogger({
    projectName: "Ghaafeedi Music",
    apiKey,
    asyncFlush: true, // non-blocking — never slows down customer requests
  });
  loggerInitialized = true;
}

export type LoggedCallOptions = {
  /** Which AI feature this call is for */
  name: string;
  /** The model used e.g. "openai/gpt-4o-mini" */
  model: string;
  /** The full prompt sent */
  prompt: string;
  /** The raw text response from the model */
  output: string;
  /** Any metadata to attach (userId, whoFor, experienceType etc.) */
  metadata?: Record<string, any>;
  /** Optional score 0-1 if you want to auto-rate (leave undefined = human labels later) */
  score?: number;
};

/**
 * Log a completed AI call to Braintrust.
 * Fire-and-forget — never throws, never blocks.
 */
export function logAICall(opts: LoggedCallOptions): void {
  try {
    ensureLogger();
    if (!process.env.BRAINTRUST_API_KEY) return;

    traced(
      (span) => {
        // Log via span for full Braintrust dataset collection
        span.log({
          input:  opts.prompt,
          output: opts.output,
          metadata: {
            model: opts.model,
            project: "Ghaafeedi Music",
            ...opts.metadata,
          },
          ...(opts.score !== undefined ? { scores: { quality: opts.score } } : {}),
        });
        return opts.output;
      },
      {
        name: opts.name,
        type: "llm",
      }
    );
  } catch {
    // Never let logging break the app
  }
}
