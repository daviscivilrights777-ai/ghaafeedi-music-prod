// ============================================================
// FILE: packages/web/src/web/components/SophiaMobileLipSync.tsx
//
// Architecture — ALL calls go DIRECT from browser, zero server:
//   1. ElevenLabs TTS API  → audio plays immediately
//   2. D-ID /talks API     → lip sync video fires in parallel
//
// No Render cold-start, no WebRTC, works on desktop + mobile.
// Portrait always visible; D-ID video fades in when ready (~30-90s).
// ============================================================

import React, {
  useEffect,
  useRef,
  useCallback,
  useState,
  memo,
} from "react";

// ─── Config (baked in at build time via Vite) ─────────────────
const DID_API_KEY       = import.meta.env["VITE_DID_API_KEY"]       as string | undefined;
const EL_API_KEY        = import.meta.env["VITE_ELEVENLABS_API_KEY"] as string | undefined;
const EL_VOICE_ID       = (import.meta.env["VITE_ELEVENLABS_VOICE_ID"] as string | undefined) ?? "pFZP5JQG7iQjIQuC4Bku";
const SOPHIA_PORTRAIT   = (import.meta.env["VITE_SOPHIA_PORTRAIT_URL"] as string | undefined)
  ?? "https://pub-bc7b203485814e1186102277ad450211.r2.dev/sophia-lipsync-portrait.png";
const DID_BASE          = "https://api.d-id.com";

// ─── Props ────────────────────────────────────────────────────
interface SophiaMobileLipSyncProps {
  onReady:          (speak: (text: string, stepIndex?: number) => Promise<void>) => void;
  onSpeakingChange: (speaking: boolean) => void;
  onError?:         () => void;
  nextStepText?:    string;
  portraitSrc?:     string;
  className?:       string;
  style?:           React.CSSProperties;
  audioCtxRef?:     React.RefObject<AudioContext | null>;
  preUnlockedAudioRef?: React.RefObject<HTMLAudioElement | null>;
}

// ─── Helpers ──────────────────────────────────────────────────

async function fetchElevenLabsAudio(text: string): Promise<ArrayBuffer> {
  if (!EL_API_KEY) throw new Error("ElevenLabs key not configured");
  const res = await fetch(
    `https://api.elevenlabs.io/v1/text-to-speech/${EL_VOICE_ID}`,
    {
      method: "POST",
      headers: {
        "xi-api-key": EL_API_KEY,
        "Content-Type": "application/json",
        Accept: "audio/mpeg",
      },
      body: JSON.stringify({
        text: text.trim(),
        model_id: "eleven_turbo_v2_5",
        voice_settings: {
          stability: 0.45,
          similarity_boost: 0.82,
          style: 0.35,
          use_speaker_boost: true,
        },
      }),
      signal: AbortSignal.timeout(30000),
    }
  );
  if (!res.ok) throw new Error(`ElevenLabs ${res.status}`);
  return res.arrayBuffer();
}

async function createDIDTalk(text: string): Promise<string> {
  if (!DID_API_KEY) throw new Error("D-ID key not configured");
  const res = await fetch(`${DID_BASE}/talks`, {
    method: "POST",
    headers: {
      Authorization: `Basic ${DID_API_KEY}`,
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify({
      source_url: SOPHIA_PORTRAIT,
      script: {
        type: "text",
        input: text.trim(),
        provider: {
          type: "elevenlabs",
          voice_id: EL_VOICE_ID,
          voice_config: { model_id: "eleven_turbo_v2_5" },
        },
      },
      config: { stitch: true, result_format: "mp4" },
    }),
    signal: AbortSignal.timeout(30000),
  });
  if (!res.ok) {
    const err = await res.text();
    throw new Error(`D-ID create: ${res.status} — ${err}`);
  }
  const data = await res.json() as { id: string };
  return data.id;
}

async function pollDIDTalk(talkId: string, signal: AbortSignal): Promise<string> {
  if (!DID_API_KEY) throw new Error("D-ID key not configured");
  const deadline = Date.now() + 120_000; // 2 min max
  while (Date.now() < deadline) {
    if (signal.aborted) throw new Error("aborted");
    const res = await fetch(`${DID_BASE}/talks/${talkId}`, {
      headers: { Authorization: `Basic ${DID_API_KEY}`, Accept: "application/json" },
      signal: AbortSignal.timeout(15000),
    });
    if (!res.ok) throw new Error(`D-ID poll: ${res.status}`);
    const data = await res.json() as {
      status: string;
      result_url?: string;
      error?: { description: string };
    };
    if (data.status === "done" && data.result_url) return data.result_url;
    if (data.status === "error" || data.status === "rejected")
      throw new Error(`D-ID failed: ${data.error?.description ?? data.status}`);
    await new Promise(r => setTimeout(r, 2000));
  }
  throw new Error("D-ID timed out");
}

// ─── Component ────────────────────────────────────────────────

export const SophiaMobileLipSync = memo(function SophiaMobileLipSync({
  onReady,
  onSpeakingChange,
  onError,
  portraitSrc,
  className,
  style,
  audioCtxRef: externalAudioCtxRef,
}: SophiaMobileLipSyncProps) {

  const videoRef        = useRef<HTMLVideoElement>(null);
  const sourceNodeRef   = useRef<AudioBufferSourceNode | null>(null);
  const activeRef       = useRef(true);
  const currentTextRef  = useRef<string>("");
  const didAbortRef     = useRef<AbortController | null>(null);

  const [showVideo,  setShowVideo]  = useState(false);
  const [didStatus,  setDidStatus]  = useState<"idle"|"loading"|"playing"|"error">("idle");
  const [isLoading,  setIsLoading]  = useState(false);

  const portrait = portraitSrc ?? SOPHIA_PORTRAIT;

  // ── D-ID video (fires in parallel, overlays portrait when ready) ──
  const launchDIDVideo = useCallback(async (text: string) => {
    // Cancel any in-flight D-ID request
    didAbortRef.current?.abort();
    const abort = new AbortController();
    didAbortRef.current = abort;

    setDidStatus("loading");
    try {
      const talkId = await createDIDTalk(text);
      console.log("[D-ID] Talk created:", talkId);

      const videoUrl = await pollDIDTalk(talkId, abort.signal);
      if (!activeRef.current || currentTextRef.current !== text) return;

      console.log("[D-ID] Video ready:", videoUrl);
      setDidStatus("playing");
      setShowVideo(true);

      if (videoRef.current) {
        videoRef.current.src = videoUrl;
        videoRef.current.load();
        videoRef.current.play().catch(() => {
          setShowVideo(false);
          setDidStatus("error");
        });
      }
    } catch (err) {
      if (!abort.signal.aborted && activeRef.current) {
        console.warn("[D-ID] Fallback to portrait:", err);
        setDidStatus("error");
      }
    }
  }, []);

  // ── Core speak: ElevenLabs audio first, D-ID in parallel ──
  const speak = useCallback(async (text: string, _stepIndex = 0): Promise<void> => {
    if (!activeRef.current) return;
    currentTextRef.current = text;

    // Stop prior audio
    if (sourceNodeRef.current) {
      try { sourceNodeRef.current.stop(); } catch { /**/ }
      sourceNodeRef.current = null;
    }

    // Reset video
    setShowVideo(false);
    setDidStatus("idle");
    if (videoRef.current) {
      videoRef.current.pause();
      videoRef.current.src = "";
    }

    setIsLoading(true);

    // Fire D-ID in parallel — don't await
    launchDIDVideo(text).catch(() => {});

    // Fetch ElevenLabs audio
    let arrayBuffer: ArrayBuffer;
    try {
      arrayBuffer = await fetchElevenLabsAudio(text);
    } catch (err) {
      console.error("[Sophia] ElevenLabs failed:", err);
      setIsLoading(false);
      onSpeakingChange(false);
      onError?.();
      return;
    }

    if (!activeRef.current) return;

    // Decode + play via Web Audio API
    try {
      let ctx = externalAudioCtxRef?.current ?? null;
      if (!ctx || ctx.state === "closed") {
        const AC = (window.AudioContext || (window as any).webkitAudioContext) as typeof AudioContext;
        ctx = new AC();
        if (externalAudioCtxRef)
          (externalAudioCtxRef as React.MutableRefObject<AudioContext | null>).current = ctx;
      }
      if (ctx.state === "suspended") {
        try { await ctx.resume(); } catch { /**/ }
      }

      const audioBuffer = await ctx.decodeAudioData(arrayBuffer);
      if (!activeRef.current) return;

      const source = ctx.createBufferSource();
      source.buffer = audioBuffer;
      source.connect(ctx.destination);
      sourceNodeRef.current = source;

      await new Promise<void>(resolve => {
        source.onended = () => {
          sourceNodeRef.current = null;
          if (activeRef.current) {
            onSpeakingChange(false);
            setShowVideo(false);
            setDidStatus("idle");
          }
          resolve();
        };
        source.start(0);
        setIsLoading(false);
        onSpeakingChange(true);
      });

    } catch (err) {
      console.error("[Sophia] Audio playback failed:", err);
      setIsLoading(false);
      onSpeakingChange(false);
      onError?.();
    }
  }, [onSpeakingChange, onError, externalAudioCtxRef, launchDIDVideo]);

  // ── Register with parent ──
  useEffect(() => {
    activeRef.current = true;
    onReady(speak);
    return () => {
      activeRef.current = false;
      didAbortRef.current?.abort();
      if (sourceNodeRef.current) {
        try { sourceNodeRef.current.stop(); } catch { /**/ }
        sourceNodeRef.current = null;
      }
    };
  }, [speak, onReady]);

  const handleVideoEnded = useCallback(() => {
    setShowVideo(false);
    setDidStatus("idle");
  }, []);

  const handleVideoError = useCallback(() => {
    setShowVideo(false);
    setDidStatus("error");
  }, []);

  // ─── Render ───────────────────────────────────────────────
  return (
    <div
      className={className}
      style={{
        position: "relative",
        width: "100%",
        height: "100%",
        background: "#0a0a0f",
        overflow: "hidden",
        borderRadius: "inherit",
        ...style,
      }}
    >
      {/* Static portrait — always visible */}
      <img
        src={portrait}
        alt="Sophia"
        style={{
          position: "absolute",
          inset: 0,
          width: "100%",
          height: "100%",
          objectFit: "cover",
          objectPosition: "center top",
          zIndex: 1,
        }}
        onError={e => { (e.target as HTMLImageElement).style.display = "none"; }}
      />

      {/* D-ID talking head — fades in when ready */}
      <video
        ref={videoRef}
        playsInline
        muted={false}
        crossOrigin="anonymous"
        onEnded={handleVideoEnded}
        onError={handleVideoError}
        style={{
          position: "absolute",
          inset: 0,
          width: "100%",
          height: "100%",
          objectFit: "cover",
          objectPosition: "center top",
          zIndex: 2,
          opacity: showVideo ? 1 : 0,
          transition: "opacity 600ms ease",
        }}
      />

      {/* D-ID processing indicator */}
      {didStatus === "loading" && (
        <div style={{
          position: "absolute", top: 14, right: 14, zIndex: 10,
          display: "flex", alignItems: "center", gap: 6,
          background: "rgba(212,175,55,0.12)",
          border: "1px solid rgba(212,175,55,0.30)",
          borderRadius: 20, padding: "5px 12px",
          backdropFilter: "blur(8px)",
        }}>
          {[0,1,2].map(i => (
            <div key={i} style={{
              width: 5, height: 5, borderRadius: "50%",
              background: "#D4AF37",
              animation: `sophia-pulse 1.2s ease-in-out ${i * 0.2}s infinite`,
            }} />
          ))}
          <span style={{
            color: "rgba(212,175,55,0.85)", fontSize: 11,
            fontFamily: "Inter, system-ui", letterSpacing: "0.04em",
          }}>HD Sync</span>
        </div>
      )}

      {/* Audio loading indicator */}
      {isLoading && (
        <div style={{
          position: "absolute", bottom: 20, left: "50%",
          transform: "translateX(-50%)",
          display: "flex", alignItems: "center", gap: 8,
          background: "rgba(0,0,0,0.6)", backdropFilter: "blur(8px)",
          borderRadius: 20, padding: "6px 14px", zIndex: 10,
        }}>
          {[0,1,2].map(i => (
            <div key={i} style={{
              width: 6, height: 6, borderRadius: "50%",
              background: "#D4AF37",
              animation: `sophia-pulse 1.2s ease-in-out ${i * 0.2}s infinite`,
            }} />
          ))}
          <span style={{ color: "rgba(255,255,255,0.7)", fontSize: 12, fontFamily: "system-ui" }}>
            Sophia is speaking…
          </span>
        </div>
      )}

      <style>{`
        @keyframes sophia-pulse {
          0%, 100% { opacity: 0.3; transform: scale(0.8); }
          50%       { opacity: 1;   transform: scale(1.2); }
        }
      `}</style>
    </div>
  );
});
