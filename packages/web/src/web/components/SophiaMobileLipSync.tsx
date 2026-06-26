// ============================================================
// FILE: packages/web/src/web/components/SophiaMobileLipSync.tsx
//
// ANDROID AUDIO FIX v3 (2026-06-25):
//
// Root cause of silence on Android Chrome:
// The previous speak() created a NEW Audio() element every call.
// Android only unlocks the SPECIFIC element that .play() was called
// on inside the gesture handler. Any new Audio() element is locked
// by default — .play() on it is silently blocked.
//
// Fix: speak() now reuses preUnlockedAudioRef.current — the SAME
// audio element that was .play()'d synchronously inside the tap
// handler in SophiaEntryFlow. Because Android already unlocked
// that specific element, .play() on it always succeeds, even from
// async code, even outside a gesture handler.
//
// Pattern:
//   preUnlockedAudioRef.current.src = blobUrl   ← swap src
//   preUnlockedAudioRef.current.load()           ← reload
//   preUnlockedAudioRef.current.play()           ← always works
//
// Architecture:
// - Audio: POST https://sophia-tts.daviscivilrights777.workers.dev
//   (Cloudflare Worker proxy → ElevenLabs, always on, zero cold start)
// - PRE-FETCH PATTERN: Audio blobs are fetched in background and
//   cached by text key. speak() pulls cached blob, swaps src on the
//   unlocked element, and plays — no new Audio() ever created.
// - Video: Static Sophia portrait always visible.
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

// ■■■ Config ■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■
const SOPHIA_PORTRAIT =
  "https://pub-bc7b203485814e1186102277ad450211.r2.dev/sophia-lipsync-portrait.png";
const TTS_ENDPOINT = "https://sophia-tts.daviscivilrights777.workers.dev";

// ■■■ Props ■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■
interface SophiaMobileLipSyncProps {
  onReady: (speak: (text: string, stepIndex?: number) => Promise<void>) => void;
  onSpeakingChange: (speaking: boolean) => void;
  onError?: () => void;
  nextStepText?: string;
  portraitSrc?: string;
  className?: string;
  style?: React.CSSProperties;
  audioCtxRef?: React.RefObject<AudioContext | null>;
  // THE KEY PROP: the audio element unlocked synchronously in the
  // tap handler. speak() reuses this instead of creating new Audio().
  preUnlockedAudioRef?: React.RefObject<HTMLAudioElement | null>;
}

// ■■■ Component ■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■
export const SophiaMobileLipSync = memo(function SophiaMobileLipSync({
  onReady,
  onSpeakingChange,
  onError,
  nextStepText,
  portraitSrc,
  className,
  style,
  preUnlockedAudioRef,
}: SophiaMobileLipSyncProps) {
  // Blob cache: text key → Blob (pre-fetched in background)
  const blobCacheRef = useRef<Map<string, Blob>>(new Map());
  // In-flight prefetch promises to avoid duplicate fetches
  const fetchingRef = useRef<Map<string, Promise<Blob | null>>>(new Map());
  const activeRef = useRef(true);
  const [isLoading, setIsLoading] = useState(false);
  const currentBlobUrlRef = useRef<string | null>(null);
  const portrait = portraitSrc ?? SOPHIA_PORTRAIT;

  // ■■ Fetch one TTS blob (shared between pre-fetch and speak) ■■■■■■■■■■■■■■■
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

  // ■■ Pre-fetch next step text in background ■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■
  useEffect(() => {
    if (!nextStepText) return;
    fetchBlob(nextStepText).catch(() => {});
  }, [nextStepText, fetchBlob]);

  // ■■ playOnUnlockedEl: swap src on the pre-unlocked element and play ■■■■■■■
  // This is the core Android fix. We never create a new Audio() element.
  // We reuse the element that was .play()'d in the tap handler — Android
  // keeps that element permanently unlocked for the lifetime of the page.
  const playOnUnlockedEl = useCallback(async (blob: Blob): Promise<void> => {
    const audioEl = preUnlockedAudioRef?.current;

    // Revoke previous blob URL to free memory
    if (currentBlobUrlRef.current) {
      URL.revokeObjectURL(currentBlobUrlRef.current);
      currentBlobUrlRef.current = null;
    }

    const blobUrl = URL.createObjectURL(blob);
    currentBlobUrlRef.current = blobUrl;

    if (audioEl) {
      // ■ REUSE the unlocked element — Android allows .play() on this ■
      audioEl.pause();
      audioEl.volume = 1;
      audioEl.src = blobUrl;
      audioEl.load();

      return new Promise<void>((resolve) => {
        audioEl.onended = () => {
          if (currentBlobUrlRef.current === blobUrl) {
            URL.revokeObjectURL(blobUrl);
            currentBlobUrlRef.current = null;
          }
          if (activeRef.current) onSpeakingChange(false);
          resolve();
        };
        audioEl.onerror = () => {
          if (currentBlobUrlRef.current === blobUrl) {
            URL.revokeObjectURL(blobUrl);
            currentBlobUrlRef.current = null;
          }
          if (activeRef.current) onSpeakingChange(false);
          resolve();
        };
        audioEl.play().catch((err) => {
          console.error("[Sophia] play() failed on unlocked element:", err);
          // Last resort: try a brand new Audio element
          // (may be blocked on Android but works on desktop/iOS)
          const fallback = new Audio(blobUrl);
          fallback.onended = () => {
            URL.revokeObjectURL(blobUrl);
            currentBlobUrlRef.current = null;
            if (activeRef.current) onSpeakingChange(false);
            resolve();
          };
          fallback.onerror = () => {
            URL.revokeObjectURL(blobUrl);
            currentBlobUrlRef.current = null;
            if (activeRef.current) onSpeakingChange(false);
            resolve();
          };
          fallback.play().catch(() => {
            URL.revokeObjectURL(blobUrl);
            currentBlobUrlRef.current = null;
            if (activeRef.current) { onSpeakingChange(false); onError?.(); }
            resolve();
          });
        });
      });
    } else {
      // No unlocked element ref provided (desktop path) — use new Audio()
      // This is fine on desktop/iOS where autoplay is not restricted
      const audio = new Audio(blobUrl);
      audio.preload = "auto";

      return new Promise<void>((resolve) => {
        audio.onended = () => {
          URL.revokeObjectURL(blobUrl);
          currentBlobUrlRef.current = null;
          if (activeRef.current) onSpeakingChange(false);
          resolve();
        };
        audio.onerror = () => {
          URL.revokeObjectURL(blobUrl);
          currentBlobUrlRef.current = null;
          if (activeRef.current) onSpeakingChange(false);
          resolve();
        };
        audio.play().catch(() => {
          URL.revokeObjectURL(blobUrl);
          currentBlobUrlRef.current = null;
          if (activeRef.current) { onSpeakingChange(false); onError?.(); }
          resolve();
        });
      });
    }
  }, [preUnlockedAudioRef, onSpeakingChange, onError]);

  // ■■ Core speak function ■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■
  const speak = useCallback(async (text: string, _stepIndex = 0): Promise<void> => {
    if (!activeRef.current) return;
    const key = text.trim();

    // Stop any current audio
    const audioEl = preUnlockedAudioRef?.current;
    if (audioEl) {
      audioEl.pause();
    }
    onSpeakingChange(false);

    // ■■ FAST PATH: blob already cached ■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■
    const cached = blobCacheRef.current.get(key);
    if (cached) {
      setIsLoading(false);
      onSpeakingChange(true);
      await playOnUnlockedEl(cached);
      return;
    }

    // ■■ SLOW PATH: fetch blob then play ■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■
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

    blobCacheRef.current.set(key, blob);
    onSpeakingChange(true);
    await playOnUnlockedEl(blob);
  }, [fetchBlob, playOnUnlockedEl, onSpeakingChange, onError, preUnlockedAudioRef]);

  // ■■ Register with parent ■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■
  useEffect(() => {
    activeRef.current = true;
    onReady(speak);
    return () => {
      activeRef.current = false;
      const audioEl = preUnlockedAudioRef?.current;
      if (audioEl) {
        audioEl.pause();
      }
      if (currentBlobUrlRef.current) {
        URL.revokeObjectURL(currentBlobUrlRef.current);
        currentBlobUrlRef.current = null;
      }
      blobCacheRef.current.clear();
      fetchingRef.current.clear();
    };
  }, [speak, onReady, preUnlockedAudioRef]);

  // ■■■ Render ■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■
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
          50% { opacity: 1; transform: scale(1.2); }
        }
      `}</style>
    </div>
  );
});
