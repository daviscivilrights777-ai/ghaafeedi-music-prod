// ============================================================
// FILE: packages/web/src/lib/SimliAvatarEngine.ts
// PURPOSE: Production-grade Simli WebRTC engine
//
// This completely replaces the inline SimliAvatar component logic.
// It is a standalone class that manages the full lifecycle:
//
// Phase 1: Token acquisition
// Phase 2: Client construction + AudioContext unlock
// Phase 3: start() + LiveKit track wait (THE MISSING PIECE)
// Phase 4: First video frame confirmation (SECOND MISSING PIECE)
// Phase 5: PCM streaming with correct chunk sizing
//
// RUNABLE: Drop this file into packages/web/src/lib/
// ============================================================

// simli-client loaded dynamically to prevent bundler external crashes
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let SimliClient: any = null;

// ─── Types ────────────────────────────────────────────────────

export type EngineStatus =
  | "idle"
  | "fetching_token"
  | "constructing"
  | "starting"
  | "waiting_for_track"
  | "waiting_for_frame"
  | "ready"
  | "speaking"
  | "error";

export interface EngineEvents {
  onStatusChange: (status: EngineStatus) => void;
  onSpeakingChange: (speaking: boolean) => void;
  onReady: (speak: SpeakFn) => void;
  onError: (error: string) => void;
  onFrameReceived: () => void;
}

export type SpeakFn = (text: string) => Promise<void>;

// ─── Constants ────────────────────────────────────────────────

// Simli expects PCM in exactly 3200-byte frames
// = 100ms of audio at 16kHz, mono, 16-bit (PCM16)
// 16000 samples/sec × 0.1 sec × 2 bytes/sample = 3200 bytes
const SIMLI_CHUNK_BYTES = 3200;
const SIMLI_CHUNK_MS = 100;

// How long to wait for LiveKit video track before giving up
const TRACK_WAIT_TIMEOUT_MS = 15000;

// How long to wait for first actual video frame
const FRAME_WAIT_TIMEOUT_MS = 10000;

// Silence primer: 500ms of silence before first real audio
// = 5 chunks × 3200 bytes = 16000 bytes
const SILENCE_PRIMER_CHUNKS = 5;

// ─── SimliAvatarEngine ────────────────────────────────────────

export class SimliAvatarEngine {
  private client: SimliClient | null = null;
  private videoEl: HTMLVideoElement | null = null;
  private audioEl: HTMLAudioElement | null = null;
  private events: EngineEvents;
  private status: EngineStatus = "idle";
  private destroyed = false;
  private speakQueue: string[] = [];
  private isSpeaking = false;
  private sessionToken: string | null = null;
  private audioContext: AudioContext | null = null;

  constructor(
    videoEl: HTMLVideoElement,
    audioEl: HTMLAudioElement,
    events: EngineEvents
  ) {
    this.videoEl = videoEl;
    this.audioEl = audioEl;
    this.events = events;
  }

  // ─── Public API ─────────────────────────────────────────────

  async initialize(sessionToken: string): Promise<void> {
    if (this.destroyed) return;
    if (this.status !== "idle") return;

    this.sessionToken = sessionToken;

    try {
      await this._construct(sessionToken);
      await this._start();
      await this._waitForVideoTrack();
      await this._waitForFirstFrame();
      await this._primeAudioBuffer();
      this._markReady();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      this._handleError(`Initialization failed: ${message}`);
    }
  }

  async speak(text: string): Promise<void> {
    if (this.status !== "ready" && this.status !== "speaking") {
      // Queue for when ready
      this.speakQueue.push(text);
      return;
    }

    if (this.isSpeaking) {
      this.speakQueue.push(text);
      return;
    }

    await this._executeSpeech(text);

    // Drain queue
    while (this.speakQueue.length > 0 && !this.destroyed) {
      const next = this.speakQueue.shift()!;
      await this._executeSpeech(next);
    }
  }

  destroy(): void {
    this.destroyed = true;
    try {
      this.client?.stop?.();
    } catch {}
    this.client = null;
    this.videoEl = null;
    this.audioEl = null;
  }

  getStatus(): EngineStatus {
    return this.status;
  }

  unlockAudio(): void {
    // Call this from any user gesture handler
    this._resumeAudioContext();
  }

  // ─── Phase 1: Construct ─────────────────────────────────────

  private async _construct(sessionToken: string): Promise<void> {
    this._setStatus("constructing");

    if (!this.videoEl || !this.audioEl) {
      throw new Error("Video or audio element not available");
    }

    // Dynamic import — prevents blank screen if bundler config changes
    if (!SimliClient) {
      try {
        const mod = await import("simli-client");
        SimliClient = mod.default ?? mod;
      } catch {
        throw new Error("simli-client failed to load");
      }
    }

    // Construct with livekit transport ONLY
    // p2p is broken server-side for this account
    this.client = new SimliClient(
      sessionToken,
      this.videoEl,
      this.audioEl,
      null,       // iceServers — null = STUN defaults
      undefined,  // logLevel
      "livekit"   // FORCED: p2p broken
    );

    // Immediately unlock AudioContext
    // Must happen synchronously after construction
    await this._unlockAudioContext();

    console.log("[SimliEngine] Client constructed, AudioContext unlocked");
  }

  // ─── Phase 2: Start ─────────────────────────────────────────

  private async _start(): Promise<void> {
    if (!this.client) throw new Error("Client not constructed");

    this._setStatus("starting");

    // start() resolves on WebSocket open, NOT on video track arrival
    // We treat this as "connection established" only
    // Real readiness is determined in _waitForVideoTrack() below
    await this.client.start();

    console.log("[SimliEngine] start() resolved — WebSocket connected");
    console.log("[SimliEngine] Now waiting for LiveKit video track...");
  }

  // ─── Phase 3: Wait for Video Track ──────────────────────────

  private async _waitForVideoTrack(): Promise<void> {
    this._setStatus("waiting_for_track");

    return new Promise<void>((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error(
          `No video track arrived within ${TRACK_WAIT_TIMEOUT_MS}ms. ` +
          `LiveKit may have connected but Simli server did not send a track. ` +
          `Check: face_id validity, account track limits, Simli server status.`
        ));
      }, TRACK_WAIT_TIMEOUT_MS);

      const clearAndResolve = () => {
        clearTimeout(timeout);
        resolve();
      };

      // Method 1: Listen for SimliClient "start" event
      // This event is gated internally on requestVideoFrameCallback
      // It fires when the first frame actually renders
      this.client!.on("start", () => {
        console.log("[SimliEngine] 'start' event received from SimliClient");
        clearAndResolve();
      });

      // Method 2: Poll the video element for actual video data
      // This is the belt-and-suspenders approach
      const videoEl = this.videoEl!;
      let checkCount = 0;
      const maxChecks = TRACK_WAIT_TIMEOUT_MS / 200;

      const pollForVideo = setInterval(() => {
        checkCount++;

        // readyState >= 2 means HAVE_CURRENT_DATA
        // videoWidth > 0 means actual video content is rendering
        if (videoEl.readyState >= 2 && videoEl.videoWidth > 0) {
          console.log(
            "[SimliEngine] Video element has data:",
            `readyState=${videoEl.readyState}`,
            `size=${videoEl.videoWidth}x${videoEl.videoHeight}`
          );
          clearInterval(pollForVideo);
          clearAndResolve();
          return;
        }

        // Method 3: Inspect LiveKit room via SimliClient internals
        // SimliClient exposes _room (LiveKit Room) internally
        const internalClient = this.client as unknown as Record<string, unknown>;
        const room = internalClient._room as Record<string, unknown> | undefined;

        if (room) {
          const participants = room.remoteParticipants as Map<string, unknown> | undefined;
          if (participants && participants.size > 0) {
            participants.forEach((participant: unknown) => {
              const p = participant as Record<string, unknown>;
              const trackPubs = p.videoTrackPublications as Map<string, unknown> | undefined;
              if (trackPubs && trackPubs.size > 0) {
                trackPubs.forEach((pub: unknown) => {
                  const publication = pub as Record<string, unknown>;
                  const track = publication.track as Record<string, unknown> | undefined;
                  const mediaTrack = track?.mediaStreamTrack as MediaStreamTrack | undefined;

                  if (mediaTrack?.readyState === "live") {
                    console.log("[SimliEngine] LiveKit video track is live!");
                    clearInterval(pollForVideo);
                    clearAndResolve();
                  }
                });
              }
            });
          }
        }

        if (checkCount >= maxChecks) {
          clearInterval(pollForVideo);
          // Do not reject here — let the timeout handle it
          // But attempt to continue anyway with a warning
          console.warn(
            "[SimliEngine] Poll exhausted without video track confirmation. " +
            "Attempting to continue — Simli may still animate."
          );
          clearAndResolve();
        }
      }, 200);
    });
  }

  // ─── Phase 4: Wait for First Frame ──────────────────────────

  private async _waitForFirstFrame(): Promise<void> {
    this._setStatus("waiting_for_frame");

    return new Promise<void>((resolve) => {
      const videoEl = this.videoEl!;

      // If video already has content, resolve immediately
      if (videoEl.readyState >= 2 && videoEl.videoWidth > 0) {
        console.log("[SimliEngine] First frame already available");
        this.events.onFrameReceived();
        resolve();
        return;
      }

      const timeout = setTimeout(() => {
        console.warn(
          "[SimliEngine] First frame timeout — continuing without confirmation"
        );
        resolve();
      }, FRAME_WAIT_TIMEOUT_MS);

      // Use requestVideoFrameCallback for precise frame detection
      // This is the most reliable way to know when video is rendering
      if ("requestVideoFrameCallback" in videoEl) {
        videoEl.requestVideoFrameCallback(() => {
          clearTimeout(timeout);
          console.log("[SimliEngine] First video frame confirmed via rVFC");
          this.events.onFrameReceived();
          resolve();
        });
      } else {
        // Fallback: listen for timeupdate event
        const onTimeUpdate = () => {
          videoEl.removeEventListener("timeupdate", onTimeUpdate);
          clearTimeout(timeout);
          console.log("[SimliEngine] First frame confirmed via timeupdate");
          this.events.onFrameReceived();
          resolve();
        };
        videoEl.addEventListener("timeupdate", onTimeUpdate);
      }
    });
  }

  // ─── Phase 5: Prime Audio Buffer ────────────────────────────

  private async _primeAudioBuffer(): Promise<void> {
    if (!this.client) return;

    console.log("[SimliEngine] Priming Simli audio buffer...");

    // Send silence in CORRECT 3200-byte chunks
    // This primes the internal AudioWorklet buffer
    for (let i = 0; i < SILENCE_PRIMER_CHUNKS; i++) {
      const silence = new Uint8Array(SIMLI_CHUNK_BYTES);
      this.client.sendAudioData(silence);
      // Pace at real-time: 100ms per chunk
      await this._sleep(SIMLI_CHUNK_MS);
    }

    console.log(
      `[SimliEngine] Audio buffer primed with ` +
      `${SILENCE_PRIMER_CHUNKS * SIMLI_CHUNK_BYTES} bytes of silence`
    );
  }

  // ─── Phase 6: Mark Ready ────────────────────────────────────

  private _markReady(): void {
    this._setStatus("ready");

    // Create the speak function to pass to parent
    const speakFn: SpeakFn = (text: string) => this.speak(text);

    this.events.onReady(speakFn);

    // Attach speaking/silent events
    this.client?.on("speaking", () => {
      this._setStatus("speaking");
      this.events.onSpeakingChange(true);
    });

    this.client?.on("silent", () => {
      this._setStatus("ready");
      this.events.onSpeakingChange(false);
    });

    // Drain any queued speech
    if (this.speakQueue.length > 0) {
      const queued = [...this.speakQueue];
      this.speakQueue = [];
      queued.forEach(text => this.speak(text));
    }

    console.log("[SimliEngine] ✅ READY — Sophia is live and can speak");
  }

  // ─── Speech Execution ────────────────────────────────────────

  private async _executeSpeech(text: string): Promise<void> {
    if (!this.client || this.destroyed) return;

    this.isSpeaking = true;
    this._setStatus("speaking");
    this.events.onSpeakingChange(true);

    try {
      // Fetch PCM from server
      // Server streams raw PCM16 from ElevenLabs
      const response = await fetch("/api/simli/tts-stream", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text }),
      });

      if (!response.ok || !response.body) {
        throw new Error(`TTS stream failed: ${response.status}`);
      }

      // Read PCM stream and send in FIXED 3200-byte chunks
      // This is the critical fix — Simli requires exactly 3200 bytes
      await this._streamPCMToSimli(response.body);

    } catch (err) {
      console.error("[SimliEngine] Speech error:", err);
    } finally {
      this.isSpeaking = false;
      if (!this.destroyed && this.status === "speaking") {
        this._setStatus("ready");
      }
    }
  }

  private async _streamPCMToSimli(
    stream: ReadableStream<Uint8Array>
  ): Promise<void> {
    if (!this.client) return;

    const reader = stream.getReader();

    // Buffer to accumulate PCM until we have exactly 3200 bytes
    let buffer = new Uint8Array(0);
    let totalBytesSent = 0;
    let chunksSent = 0;

    const sendChunk = (chunk: Uint8Array) => {
      this.client!.sendAudioData(chunk);
      totalBytesSent += chunk.length;
      chunksSent++;
    };

    const flushBuffer = async () => {
      // Process complete 3200-byte chunks from buffer
      while (buffer.length >= SIMLI_CHUNK_BYTES) {
        const chunk = buffer.slice(0, SIMLI_CHUNK_BYTES);
        const remainder = buffer.slice(SIMLI_CHUNK_BYTES);
        buffer = remainder;
        sendChunk(chunk);
        // Pace at real-time rate: prevents overwhelming the buffer
        await this._sleep(SIMLI_CHUNK_MS);
      }
    };

    try {
      while (true) {
        const { done, value } = await reader.read();

        if (done) break;

        if (value && value.length > 0) {
          // Append incoming bytes to buffer
          const merged = new Uint8Array(buffer.length + value.length);
          merged.set(buffer, 0);
          merged.set(value, buffer.length);
          buffer = merged;

          // Flush complete 3200-byte chunks
          await flushBuffer();
        }
      }

      // Send any remaining bytes padded to 3200
      if (buffer.length > 0) {
        const padded = new Uint8Array(SIMLI_CHUNK_BYTES);
        padded.set(buffer, 0);
        // Remaining bytes are zero-padded (silence)
        sendChunk(padded);
      }

    } finally {
      reader.releaseLock();
    }

    console.log(
      `[SimliEngine] PCM streaming complete: ` +
      `${totalBytesSent} bytes in ${chunksSent} chunks of ${SIMLI_CHUNK_BYTES}b`
    );
  }

  // ─── AudioContext Management ─────────────────────────────────

  private async _unlockAudioContext(): Promise<void> {
    const internalClient = this.client as unknown as Record<string, unknown>;
    const ctx = internalClient.audioContext as AudioContext | undefined;

    if (!ctx) {
      console.warn("[SimliEngine] No audioContext found on client");
      return;
    }

    this.audioContext = ctx;

    if (ctx.state === "suspended") {
      try {
        await ctx.resume();
        console.log("[SimliEngine] AudioContext resumed successfully");
      } catch (e) {
        console.warn("[SimliEngine] AudioContext resume failed:", e);
      }
    }

    console.log(`[SimliEngine] AudioContext state: ${ctx.state}`);
  }

  private _resumeAudioContext(): void {
    if (this.audioContext && this.audioContext.state === "suspended") {
      this.audioContext.resume().catch(() => {});
    }
  }

  // ─── Utilities ───────────────────────────────────────────────

  private _setStatus(status: EngineStatus): void {
    if (this.status === status) return;
    this.status = status;
    console.log(`[SimliEngine] Status: ${status}`);
    this.events.onStatusChange(status);
  }

  private _handleError(message: string): void {
    console.error("[SimliEngine] Error:", message);
    this._setStatus("error");
    this.events.onError(message);
  }

  private _sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}
