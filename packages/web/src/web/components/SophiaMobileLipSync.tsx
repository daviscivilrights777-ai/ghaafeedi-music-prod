// ============================================================
// FILE: packages/web/src/web/components/SophiaMobileLipSync.tsx
//
// Architecture:
//   - Audio: POST https://sophia-tts.daviscivilrights777.workers.dev
//     (Cloudflare Worker proxy → ElevenLabs, always on, zero cold start)
//   - PRE-FETCH PATTERN (Android Chrome autoplay fix):
//     Audio blobs are fetched in the background and cached by text hash.
//     speak() pulls the cached blob and calls .play() SYNCHRONOUSLY —
//     no async fetch inside the gesture handler, so the Android autoplay
//     policy window is never lost.
//   - Video: Static Sophia portrait always visible.
//
// Works on ALL devices: desktop, iOS, Android.
// ============================================================

import React, {
  useEffect,
  useRef,
  useCallback,
  useState,
  memo,
} from "react";

// ─── Config ───────────────────────────────────────────────────
const SOPHIA_PORTRAIT =
  "https://pub-bc7b203485814e1186102277ad450211.r2.dev/sophia-lipsync-portrait.png";

const TTS_ENDPOINT = "https://sophia-tts.daviscivilrights777.workers.dev";

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

// ─── Component ────────────────────────────────────────────────
export const SophiaMobileLipSync = memo(function SophiaMobileLipSync({
  onReady,
  onSpeakingChange,
  onError,
  nextStepText,
  portraitSrc,
  className,
  style,
}: SophiaMobileLipSyncProps) {

  // Blob cache: text → Blob (pre-fetched in background)
  const blobCacheRef   = useRef<Map<string, Blob>>(new Map());
  // In-flight prefetch promises to avoid duplicate fetches
  const fetchingRef    = useRef<Map<string, Promise<Blob | null>>>(new Map());
  const audioElRef     = useRef<HTMLAudioElement | null>(null);
  const activeRef      = useRef(true);
  const [isLoading, setIsLoading] = useState(false);

  const portrait = portraitSrc ?? SOPHIA_PORTRAIT;

  // ── Fetch one TTS blob (shared between pre-fetch and speak) ────────────────
  const fetchBlob = useCallback(async (text: string): Promise<Blob | null> => {
    const key = text.trim();

    // Already cached
    if (blobCacheRef.current.has(key)) {
      return blobCacheRef.current.get(key)!;
    }

    // Already in-flight
    const inflight = fetchingRef.current.get(key);
    if (inflight) return inflight;

    // Start fetch
    const promise = (async (): Promise<Blob | null> => {
      try {
        const res = await fetch(TTS_ENDPOINT, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ text: key }),
          signal: AbortSignal.timeout(35000),
        });
        if (!res.ok) return null;
        const blob = await res.blob();
        if (activeRef.current) {
          blobCacheRef.current.set(key, blob);
        }
        return blob;
      } catch {
        return null;
      } finally {
        fetchingRef.current.delete(key);
      }
    })();

    fetchingRef.current.set(key, promise);
    return promise;
  }, []);

  // ── Pre-fetch next step text in background ─────────────────────────────────
  useEffect(() => {
    if (!nextStepText) return;
    // Fire-and-forget background fetch — populates blobCacheRef
    fetchBlob(nextStepText).catch(() => {});
  }, [nextStepText, fetchBlob]);

  // ── Core speak: use cached blob if available, fetch otherwise ─────────────
  // ANDROID AUTOPLAY FIX:
  //   When the blob IS cached, we create the Audio element + call .play()
  //   IMMEDIATELY (no await before .play()). This keeps us inside the gesture
  //   activation window that Android Chrome requires.
  //   When not cached (cold path), we fetch then play — may be blocked on
  //   Android but will work after the audio is pre-unlocked by handleAudioUnlock.
  const speak = useCallback(async (text: string, _stepIndex = 0): Promise<void> => {
    if (!activeRef.current) return;

    const key = text.trim();

    // Stop any prior audio
    if (audioElRef.current) {
      audioElRef.current.pause();
      try { audioElRef.current.src = ""; } catch { /**/ }
      audioElRef.current = null;
    }

    onSpeakingChange(false);

    // ── FAST PATH: blob already in cache ──────────────────────────────────
    const cached = blobCacheRef.current.get(key);
    if (cached) {
      // Play synchronously — no await before .play(), gesture window intact
      const url = URL.createObjectURL(cached);
      const audio = new Audio(url);
      audio.preload = "auto";
      audioElRef.current = audio;
      setIsLoading(false);
      onSpeakingChange(true);

      await new Promise<void>((resolve) => {
        audio.onended = () => {
          URL.revokeObjectURL(url);
          audioElRef.current = null;
          if (activeRef.current) onSpeakingChange(false);
          resolve();
        };
        audio.onerror = () => {
          URL.revokeObjectURL(url);
          audioElRef.current = null;
          if (activeRef.current) onSpeakingChange(false);
          resolve(); // non-fatal
        };
        // .play() called synchronously (no await before this point on fast path)
        audio.play().catch(() => {
          // If blocked by autoplay policy, the preUnlockedAudioRef in SophiaEntryFlow
          // already unlocked the audio context — retry once
          audio.play().catch(() => resolve());
        });
      });
      return;
    }

    // ── SLOW PATH: not cached yet, fetch now ──────────────────────────────
    setIsLoading(true);

    const blob = await fetchBlob(key);

    if (!activeRef.current) return;
    setIsLoading(false);

    if (!blob) {
      console.error("[Sophia] TTS fetch failed for:", key.slice(0, 60));
      onSpeakingChange(false);
      onError?.();
      return;
    }

    // Cache it for next time
    blobCacheRef.current.set(key, blob);

    const url = URL.createObjectURL(blob);
    const audio = new Audio(url);
    audio.preload = "auto";
    audioElRef.current = audio;
    onSpeakingChange(true);

    await new Promise<void>((resolve) => {
      audio.onended = () => {
        URL.revokeObjectURL(url);
        audioElRef.current = null;
        if (activeRef.current) onSpeakingChange(false);
        resolve();
      };
      audio.onerror = () => {
        URL.revokeObjectURL(url);
        audioElRef.current = null;
        if (activeRef.current) { onSpeakingChange(false); onError?.(); }
        resolve();
      };
      audio.play().catch((err) => {
        console.error("[Sophia] Audio play failed (slow path):", err);
        URL.revokeObjectURL(url);
        audioElRef.current = null;
        if (activeRef.current) { onSpeakingChange(false); onError?.(); }
        resolve();
      });
    });
  }, [fetchBlob, onSpeakingChange, onError]);

  // ── Register with parent ───────────────────────────────────────────────────
  useEffect(() => {
    activeRef.current = true;
    onReady(speak);
    return () => {
      activeRef.current = false;
      if (audioElRef.current) {
        audioElRef.current.pause();
        try { audioElRef.current.src = ""; } catch { /**/ }
        audioElRef.current = null;
      }
      // Revoke any cached blob URLs on unmount
      blobCacheRef.current.clear();
      fetchingRef.current.clear();
    };
  }, [speak, onReady]);

  // ─── Render ───────────────────────────────────────────────────────────────
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
      {/* Static Sophia portrait */}
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

      {/* Loading indicator */}
      {isLoading && (
        <div style={{
          position: "absolute",
          bottom: 20,
          left: "50%",
          transform: "translateX(-50%)",
          display: "flex",
          alignItems: "center",
          gap: 8,
          background: "rgba(0,0,0,0.62)",
          backdropFilter: "blur(8px)",
          borderRadius: 20,
          padding: "6px 14px",
          zIndex: 10,
          whiteSpace: "nowrap",
        }}>
          {[0, 1, 2].map(i => (
            <div key={i} style={{
              width: 6, height: 6, borderRadius: "50%",
              background: "#D4AF37",
              animation: `sophia-pulse 1.2s ease-in-out ${i * 0.2}s infinite`,
            }} />
          ))}
          <span style={{
            color: "rgba(255,255,255,0.75)",
            fontSize: 12,
            fontFamily: "Inter, system-ui",
          }}>
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
