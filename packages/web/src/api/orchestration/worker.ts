/**
 * Orchestration Worker
 * Bun process — polls job queue and calls OrchestrationEngine.processNextJob().
 * Run: bun src/api/orchestration/worker.ts
 *
 * Env vars:
 *   WORKER_POLL_INTERVAL_MS  — default 2000
 *   WORKER_CONCURRENCY       — default 3
 *   NODE_ENV
 */

import { OrchestrationEngine } from "./orchestration-engine";
import { JobQueue } from "./job-queue";

const POLL_INTERVAL_MS = parseInt(process.env.WORKER_POLL_INTERVAL_MS ?? "2000", 10);
const CONCURRENCY      = parseInt(process.env.WORKER_CONCURRENCY ?? "3", 10);

const engine = OrchestrationEngine.getInstance();

let _running       = true;
let _activeSlots   = 0;
let _processed     = 0;
let _failed        = 0;
const _startTime   = Date.now();

// --- Graceful shutdown -------------------------------------------------------

function shutdown(signal: string) {
  console.log(`[Worker] ${signal} received — draining (active=${_activeSlots})...`);
  _running = false;

  const deadline = Date.now() + 30_000;
  const interval = setInterval(() => {
    if (_activeSlots === 0 || Date.now() > deadline) {
      clearInterval(interval);
      const uptime = Math.round((Date.now() - _startTime) / 1000);
      console.log(`[Worker] Shutdown. processed=${_processed} failed=${_failed} uptime=${uptime}s`);
      process.exit(0);
    }
  }, 250);
}

process.on("SIGTERM", () => shutdown("SIGTERM"));
process.on("SIGINT",  () => shutdown("SIGINT"));

// --- Health report every 30s ------------------------------------------------

setInterval(async () => {
  if (!_running) return;
  const depths = await JobQueue.depths().catch(() => ({ elite: 0, premium: 0, starter: 0, free: 0 }));
  const uptime = Math.round((Date.now() - _startTime) / 1000);
  console.log(
    `[Worker] health uptime=${uptime}s active=${_activeSlots}/${CONCURRENCY} ` +
    `processed=${_processed} failed=${_failed} ` +
    `queue=[elite:${depths.elite} premium:${depths.premium} starter:${depths.starter} free:${depths.free}]`
  );
}, 30_000);

// --- Main loop --------------------------------------------------------------

async function tick(): Promise<void> {
  if (!_running || _activeSlots >= CONCURRENCY) return;
  _activeSlots++;
  try {
    const didWork = await engine.processNextJob();
    if (didWork) _processed++;
  } catch (err) {
    _failed++;
    console.error("[Worker] processNextJob error:", (err as Error).message);
  } finally {
    _activeSlots--;
  }
}

async function main(): Promise<void> {
  console.log(
    `[Worker] Started — concurrency=${CONCURRENCY} poll=${POLL_INTERVAL_MS}ms env=${process.env.NODE_ENV ?? "development"}`
  );

  while (_running) {
    const available = CONCURRENCY - _activeSlots;
    if (available > 0) {
      await Promise.all(Array.from({ length: available }, tick));
    }
    await new Promise<void>((resolve) => setTimeout(resolve, POLL_INTERVAL_MS));
  }
}

main().catch((err) => {
  console.error("[Worker] Fatal:", err);
  process.exit(1);
});
