/**
 * Adapter Registry Bootstrap
 * Registers all provider adapters into the ProviderRegistry singleton.
 * Import this ONCE at startup (orchestration-engine.ts or worker.ts).
 */

import { ProviderRegistry } from "./provider-adapter";
import { FalAiAdapter, FalAiHailuoAdapter } from "./fal-ai.adapter";
import { SunoAdapter } from "./suno.adapter";
import { ElevenLabsAdapter } from "./elevenlabs.adapter";
import { OpenAIAdapter } from "./openai.adapter";
import { ModalAdapter } from "./modal.adapter";
import { FfmpegModalAdapter } from "./ffmpeg-modal.adapter";
import { VastAiAdapter } from "./vast-ai.adapter";
import { LatentSyncAdapter } from "./latentsync.adapter";
import { MusicRouterAdapter } from "./music-router.adapter";

let _bootstrapped = false;

export function bootstrapAdapters(): void {
  if (_bootstrapped) return;
  _bootstrapped = true;

  // Adapters are plain objects (not classes), register directly
  ProviderRegistry.register(FalAiAdapter);
  ProviderRegistry.register(FalAiHailuoAdapter);
  ProviderRegistry.register(SunoAdapter);
  ProviderRegistry.register(ElevenLabsAdapter);
  ProviderRegistry.register(OpenAIAdapter);
  ProviderRegistry.register(ModalAdapter);
  ProviderRegistry.register(FfmpegModalAdapter);
  ProviderRegistry.register(VastAiAdapter);
  ProviderRegistry.register(LatentSyncAdapter);   // Phase 6 — Sophia Lip Sync
  ProviderRegistry.register(MusicRouterAdapter);  // Music Router — ACE-Step / Suno / YuE / MusicGen / Stable Audio

  console.log(
    "[AdapterRegistry] Bootstrapped providers:",
    ProviderRegistry.list().join(", ")
  );
}

export { ProviderRegistry } from "./provider-adapter";
export { FalAiAdapter, FalAiHailuoAdapter } from "./fal-ai.adapter";
export { SunoAdapter } from "./suno.adapter";
export { ElevenLabsAdapter } from "./elevenlabs.adapter";
export { OpenAIAdapter } from "./openai.adapter";
export { ModalAdapter } from "./modal.adapter";
export { FfmpegModalAdapter } from "./ffmpeg-modal.adapter";
export { VastAiAdapter } from "./vast-ai.adapter";
export { LatentSyncAdapter } from "./latentsync.adapter";
export { MusicRouterAdapter } from "./music-router.adapter";
