// ============================================================
// FILE: packages/web/src/lib/MobileLipSyncEngine.ts
// PURPOSE: Client-side engine managing the mobile lip sync
//
// Responsibilities:
// - Queue speech requests during loading
// - Fetch pre-rendered lip sync video from server
// - Manage video playback timing
// - Handle errors with graceful fallback to static portrait
// - Pre-fetch next clip while current clip plays
// ============================================================

export type MobileEngineStatus =
  | "idle"
  | "loading"
  | "ready"
  | "playing"
  | "error";

export interface MobileLipSyncEvents {
  onStatusChange: (status: MobileEngineStatus) => void;
  onVideoReady: (videoUrl: string, durationSeconds: number) => void;
  onPlaybackStart: () => void;
  onPlaybackEnd: () => void;
  onError: (message: string, useFallback: boolean) => void;
}

export class MobileLipSyncEngine {

  private events: MobileLipSyncEngine_Events;
  private destroyed = false;
  private status: MobileEngineStatus = "idle";
  private currentVideoUrl: string | null = null;
  private preloadCache = new Map<string, string>();
  private requestQueue: Array<{
    text: string;
    stepIndex: number;
    resolve: () => void;
    reject: (err: Error) => void;
  }> = [];
  private isProcessing = false;

  constructor(events: MobileLipSyncEvents) {
    this.events = events;
  }

  // ─── Public API ─────────────────────────────────────────────

  async speak(text: string, stepIndex: number = 0): Promise<void> {
    if (this.destroyed) return;

    return new Promise((resolve, reject) => {
      this.requestQueue.push({ text, stepIndex, resolve, reject });
      this._processQueue();
    });
  }

  preload(text: string, stepIndex: number): void {
    // Fire-and-forget pre-fetch for next dialogue
    const cacheKey = this._cacheKey(text);
    if (this.preloadCache.has(cacheKey)) return;

    this._fetchVideo(text, stepIndex)
      .then(result => {
        this.preloadCache.set(cacheKey, result.video_url);
        console.log(
          `[MobileLipSync] Preloaded step ${stepIndex}: ` +
          `${result.video_url.slice(-20)}`
        );
      })
      .catch(err => {
        console.warn(
          `[MobileLipSync] Preload failed for step ${stepIndex}:`,
          err.message
        );
      });
  }

  destroy(): void {
    this.destroyed = true;
    this.requestQueue = [];
    this.preloadCache.clear();
  }

  getStatus(): MobileEngineStatus {
    return this.status;
  }

  // ─── Queue Processing ────────────────────────────────────────

  private async _processQueue(): Promise<void> {
    if (this.isProcessing || this.requestQueue.length === 0) return;

    this.isProcessing = true;

    while (this.requestQueue.length > 0 && !this.destroyed) {
      const request = this.requestQueue.shift()!;

      try {
        await this._executeSpeech(
          request.text,
          request.stepIndex
        );
        request.resolve();
      } catch (err) {
        request.reject(
          err instanceof Error ? err : new Error(String(err))
        );
      }
    }

    this.isProcessing = false;
  }

  // ─── Speech Execution ────────────────────────────────────────

  private async _executeSpeech(
    text: string,
    stepIndex: number
  ): Promise<void> {
    this._setStatus("loading");

    const cacheKey = this._cacheKey(text);

    try {
      let videoUrl: string;
      let durationSeconds: number;

      // Check preload cache first
      if (this.preloadCache.has(cacheKey)) {
        videoUrl = this.preloadCache.get(cacheKey)!;
        durationSeconds = 5.0; // Estimate — will be corrected by video element
        console.log(`[MobileLipSync] Cache hit for: ${text.slice(0, 30)}`);
      } else {
        // Fetch from server
        const result = await this._fetchVideo(text, stepIndex);
        videoUrl = result.video_url;
        durationSeconds = result.duration_seconds;

        // Cache for potential reuse
        this.preloadCache.set(cacheKey, videoUrl);
      }

      this.currentVideoUrl = videoUrl;
      this._setStatus("ready");

      // Notify component to display and play the video
      this.events.onVideoReady(videoUrl, durationSeconds);

    } catch (err) {
      console.error("[MobileLipSync] Fetch failed:", err);
      this._setStatus("error");
      this.events.onError(
        err instanceof Error ? err.message : String(err),
        true  // useFallback = true → show static portrait
      );
    }
  }

  // ─── Network Request ─────────────────────────────────────────

  private async _fetchVideo(
    text: string,
    stepIndex: number
  ): Promise<{
    video_url: string;
    duration_seconds: number;
    latency_ms: number;
  }> {
    const startTime = Date.now();

    const response = await fetch("/api/sophia-mobile/speak", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text, stepIndex }),
      signal: AbortSignal.timeout(30000), // 30s timeout
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({})) as Record<string, unknown>;

      // If server explicitly says to use fallback
      if (errorData.fallback === "use_static_portrait") {
        throw new Error("SERVER_FALLBACK");
      }

      throw new Error(
        `Server error: ${response.status} — ${errorData.error ?? "unknown"}`
      );
    }

    const data = await response.json() as {
      video_url: string;
      duration_seconds: number;
      latency_ms?: number;
    };

    console.log(
      `[MobileLipSync] Video ready: ` +
      `latency=${Date.now() - startTime}ms ` +
      `duration=${data.duration_seconds.toFixed(1)}s ` +
      `url=${data.video_url.slice(-30)}`
    );

    return {
      video_url:        data.video_url,
      duration_seconds: data.duration_seconds,
      latency_ms:       Date.now() - startTime,
    };
  }

  // ─── Utilities ───────────────────────────────────────────────

  private _setStatus(status: MobileEngineStatus): void {
    if (this.status === status) return;
    this.status = status;
    this.events.onStatusChange(status);
  }

  private _cacheKey(text: string): string {
    return text.trim().toLowerCase().slice(0, 100);
  }
}

// Fix TypeScript interface naming
type MobileLipSyncEngine_Events = MobileLipSyncEvents;
