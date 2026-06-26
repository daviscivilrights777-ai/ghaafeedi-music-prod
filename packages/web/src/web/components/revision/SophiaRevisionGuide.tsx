// ============================================================
// SophiaRevisionGuide — 5-phase Sophia-guided revision dialogue
//
// Phase 0: Scene identification (which song/video shot)
// Phase 1: Emotional diagnosis (what's wrong, what feeling?)
// Phase 2: Character/voice check (who needs to sound/look different?)
// Phase 3: Director reconstruction (specific changes — the "retake directive")
// Phase 4: Customer confirmation (review + confirm or go back)
// ============================================================

import React, { useState, useEffect, useRef, useCallback } from "react";
import { SophiaAvatarRenderer, AvatarHandle } from "./SophiaAvatarRenderer";
import type { RevisionJobPayload } from "../../types/revision";

// ─── Types ────────────────────────────────────────────────────────────────────

export type RevisionType = "song" | "video" | "both";

export interface OrderContext {
  orderId: string;
  productSlug: string;
  tier: "starter" | "premium" | "elite";
  productionId?: string;
  songUrl?: string;
  videoUrl?: string;
  title?: string;
}

interface Phase {
  id: number;
  name: string;
  label: string;
}

const PHASES: Phase[] = [
  { id: 0, name: "scene",     label: "Identify" },
  { id: 1, name: "emotion",   label: "Diagnose" },
  { id: 2, name: "character", label: "Character" },
  { id: 3, name: "director",  label: "Direct" },
  { id: 4, name: "confirm",   label: "Confirm" },
];

type PhaseId = 0 | 1 | 2 | 3 | 4;

export interface RevisionData {
  revisionType: RevisionType;
  shotIndex?: number;
  retakeStart?: number;
  retakeDuration?: number;
  emotionalIntent: string;
  songChanges: {
    lyrics?: string; tempo?: string; key?: string;
    genre?: string; mood?: string; structure?: string;
  };
  videoChanges: {
    sceneChanges?: string; colorGrade?: string;
    pacing?: string; cameraMovement?: string;
    characterConsistency?: string;
  };
  customerNotes: string;
  sophiaDirective?: string;
}

export interface SophiaRevisionGuideProps {
  order: OrderContext;
  onComplete: (payload: RevisionData) => void;
  onCancel: () => void;
  avatarProvider?: "static" | "did" | "simli";
}

// ─── Sophia script templates ──────────────────────────────────────────────────

function getSophiaScript(phase: PhaseId, data: Partial<RevisionData>, order: OrderContext): string {
  switch (phase) {
    case 0:
      return `Welcome back. I've reviewed your ${order.title || "creation"} — and I want to make sure we get this revision exactly right. First, tell me: are we revisiting the song, the music video, or both?`;
    case 1:
      return `Understood. Now let's go deeper — what emotion should this ${data.revisionType === "song" ? "song" : "scene"} carry? When you close your eyes and hear it, what do you feel it's missing?`;
    case 2:
      return `That's a powerful direction. Are there any characters, voices, or visual elements that should look or sound different? Or is it more about the overall atmosphere?`;
    case 3:
      return `Perfect. Now I'll act as your director. Based on everything you've shared, what's the single most important change that would make this feel like yours? Be as specific or as poetic as you like.`;
    case 4:
      return `I've built your retake directive. Your revision will ${data.sophiaDirective ? data.sophiaDirective.slice(0, 80) + "..." : "reflect everything you've shared"}. Ready to submit this to production?`;
  }
}

// ─── Input widgets ────────────────────────────────────────────────────────────

interface ChipSelectProps {
  options: { value: string; label: string; icon?: string }[];
  value: string;
  onChange: (v: string) => void;
  multi?: boolean;
}

const ChipSelect: React.FC<ChipSelectProps> = ({ options, value, onChange, multi }) => {
  const selected = value ? value.split(",").filter(Boolean) : [];
  const toggle = (v: string) => {
    if (!multi) { onChange(v); return; }
    const next = selected.includes(v)
      ? selected.filter((x) => x !== v)
      : [...selected, v];
    onChange(next.join(","));
  };
  return (
    <div style={{ display: "flex", flexWrap: "wrap", gap: "8px" }}>
      {options.map((o) => {
        const active = selected.includes(o.value);
        return (
          <button
            key={o.value}
            onClick={() => toggle(o.value)}
            style={{
              padding: "8px 16px",
              borderRadius: "20px",
              border: `1.5px solid ${active ? "#D4AF37" : "rgba(255,255,255,0.12)"}`,
              background: active ? "rgba(212,175,55,0.15)" : "rgba(255,255,255,0.04)",
              color: active ? "#D4AF37" : "rgba(255,255,255,0.7)",
              fontSize: "13px",
              cursor: "pointer",
              transition: "all 0.2s",
              fontFamily: "Inter, sans-serif",
            }}
          >
            {o.icon && <span style={{ marginRight: "6px" }}>{o.icon}</span>}
            {o.label}
          </button>
        );
      })}
    </div>
  );
};

interface TextAreaFieldProps {
  placeholder: string;
  value: string;
  onChange: (v: string) => void;
  rows?: number;
  label?: string;
}

const TextAreaField: React.FC<TextAreaFieldProps> = ({ placeholder, value, onChange, rows = 4, label }) => (
  <div>
    {label && (
      <div style={{ fontSize: "11px", color: "rgba(212,175,55,0.7)", letterSpacing: "0.1em", marginBottom: "6px", fontFamily: "Inter,sans-serif", textTransform: "uppercase" }}>
        {label}
      </div>
    )}
    <textarea
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      rows={rows}
      style={{
        width: "100%",
        background: "rgba(255,255,255,0.04)",
        border: "1.5px solid rgba(255,255,255,0.1)",
        borderRadius: "10px",
        padding: "12px 14px",
        color: "#fff",
        fontSize: "14px",
        fontFamily: "Inter, sans-serif",
        resize: "vertical",
        outline: "none",
        lineHeight: 1.6,
        boxSizing: "border-box",
      }}
      onFocus={(e) => { e.target.style.borderColor = "rgba(212,175,55,0.5)"; }}
      onBlur={(e) => { e.target.style.borderColor = "rgba(255,255,255,0.1)"; }}
    />
  </div>
);

// ─── Phase content components ──────────────────────────────────────────────────

const Phase0Scene: React.FC<{ data: Partial<RevisionData>; onChange: (d: Partial<RevisionData>) => void; order: OrderContext }> = ({ data, onChange, order }) => (
  <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
    <div>
      <div style={{ fontSize: "11px", color: "rgba(212,175,55,0.7)", letterSpacing: "0.1em", marginBottom: "10px", fontFamily: "Inter,sans-serif", textTransform: "uppercase" }}>
        What needs revision?
      </div>
      <ChipSelect
        options={[
          { value: "song",  label: "Song",         icon: "🎵" },
          { value: "video", label: "Music Video",  icon: "🎬" },
          { value: "both",  label: "Both",          icon: "✨" },
        ]}
        value={data.revisionType || ""}
        onChange={(v) => onChange({ ...data, revisionType: v as RevisionType })}
      />
    </div>

    {(data.revisionType === "video" || data.revisionType === "both") && order.videoUrl && (
      <div>
        <div style={{ fontSize: "11px", color: "rgba(212,175,55,0.7)", letterSpacing: "0.1em", marginBottom: "10px", fontFamily: "Inter,sans-serif", textTransform: "uppercase" }}>
          Current Video
        </div>
        <video
          src={order.videoUrl}
          controls
          style={{
            width: "100%",
            borderRadius: "10px",
            border: "1px solid rgba(212,175,55,0.2)",
            maxHeight: "200px",
            background: "#000",
          }}
        />
        <div style={{ marginTop: "12px" }}>
          <div style={{ fontSize: "11px", color: "rgba(212,175,55,0.7)", letterSpacing: "0.1em", marginBottom: "6px", fontFamily: "Inter,sans-serif", textTransform: "uppercase" }}>
            Specific shot to retake? (optional — leave blank for full re-render)
          </div>
          <input
            type="number"
            min={0}
            placeholder="Shot index (0 = first shot)"
            value={data.shotIndex ?? ""}
            onChange={(e) => onChange({ ...data, shotIndex: e.target.value ? parseInt(e.target.value) : undefined })}
            style={{
              width: "100%",
              background: "rgba(255,255,255,0.04)",
              border: "1.5px solid rgba(255,255,255,0.1)",
              borderRadius: "10px",
              padding: "10px 14px",
              color: "#fff",
              fontSize: "14px",
              fontFamily: "Inter, sans-serif",
              outline: "none",
              boxSizing: "border-box",
            }}
          />
        </div>
      </div>
    )}

    {(data.revisionType === "song" || data.revisionType === "both") && order.songUrl && (
      <div>
        <div style={{ fontSize: "11px", color: "rgba(212,175,55,0.7)", letterSpacing: "0.1em", marginBottom: "10px", fontFamily: "Inter,sans-serif", textTransform: "uppercase" }}>
          Current Song
        </div>
        <audio src={order.songUrl} controls style={{ width: "100%", accentColor: "#D4AF37" }} />
      </div>
    )}
  </div>
);

const Phase1Emotion: React.FC<{ data: Partial<RevisionData>; onChange: (d: Partial<RevisionData>) => void }> = ({ data, onChange }) => (
  <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
    <div>
      <div style={{ fontSize: "11px", color: "rgba(212,175,55,0.7)", letterSpacing: "0.1em", marginBottom: "10px", fontFamily: "Inter,sans-serif", textTransform: "uppercase" }}>
        Core emotion to convey
      </div>
      <ChipSelect
        options={[
          { value: "grief",      label: "Grief" },
          { value: "nostalgia",  label: "Nostalgia" },
          { value: "triumph",    label: "Triumph" },
          { value: "love",       label: "Love" },
          { value: "longing",    label: "Longing" },
          { value: "rage",       label: "Rage" },
          { value: "peace",      label: "Peace" },
          { value: "wonder",     label: "Wonder" },
          { value: "fear",       label: "Fear" },
          { value: "joy",        label: "Joy" },
        ]}
        value={data.emotionalIntent || ""}
        onChange={(v) => onChange({ ...data, emotionalIntent: v })}
      />
    </div>

    <TextAreaField
      label="In your own words — what feeling is missing?"
      placeholder="Describe the emotion you want the listener / viewer to feel..."
      value={data.customerNotes || ""}
      onChange={(v) => onChange({ ...data, customerNotes: v })}
      rows={3}
    />

    {(data.revisionType === "song" || data.revisionType === "both") && (
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
        {[
          { key: "mood",   label: "Mood shift",   ph: "e.g. darker, more hopeful..." },
          { key: "tempo",  label: "Tempo",         ph: "e.g. slower, more driving..." },
          { key: "genre",  label: "Genre",         ph: "e.g. cinematic orchestral..." },
          { key: "key",    label: "Key / Tone",    ph: "e.g. minor, modal, brighter..." },
        ].map(({ key, label, ph }) => (
          <div key={key}>
            <div style={{ fontSize: "11px", color: "rgba(212,175,55,0.7)", letterSpacing: "0.1em", marginBottom: "6px", fontFamily: "Inter,sans-serif", textTransform: "uppercase" }}>{label}</div>
            <input
              placeholder={ph}
              value={(data.songChanges as any)?.[key] || ""}
              onChange={(e) => onChange({ ...data, songChanges: { ...data.songChanges, [key]: e.target.value } })}
              style={{
                width: "100%",
                background: "rgba(255,255,255,0.04)",
                border: "1.5px solid rgba(255,255,255,0.1)",
                borderRadius: "10px",
                padding: "9px 12px",
                color: "#fff",
                fontSize: "13px",
                fontFamily: "Inter, sans-serif",
                outline: "none",
                boxSizing: "border-box",
              }}
            />
          </div>
        ))}
      </div>
    )}
  </div>
);

const Phase2Character: React.FC<{ data: Partial<RevisionData>; onChange: (d: Partial<RevisionData>) => void }> = ({ data, onChange }) => (
  <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
    <div>
      <div style={{ fontSize: "11px", color: "rgba(212,175,55,0.7)", letterSpacing: "0.1em", marginBottom: "10px", fontFamily: "Inter,sans-serif", textTransform: "uppercase" }}>
        What needs to change?
      </div>
      <ChipSelect
        multi
        options={[
          { value: "voice",       label: "Voice/Delivery" },
          { value: "lyrics",      label: "Lyrics" },
          { value: "character",   label: "Visual Character" },
          { value: "color",       label: "Color Grade" },
          { value: "camera",      label: "Camera Movement" },
          { value: "pacing",      label: "Pacing/Rhythm" },
          { value: "structure",   label: "Song Structure" },
          { value: "atmosphere",  label: "Overall Atmosphere" },
        ]}
        value={[
          data.songChanges?.lyrics ? "lyrics" : "",
          data.videoChanges?.characterConsistency ? "character" : "",
          data.videoChanges?.colorGrade ? "color" : "",
          data.videoChanges?.cameraMovement ? "camera" : "",
          data.videoChanges?.pacing ? "pacing" : "",
        ].filter(Boolean).join(",")}
        onChange={() => {}} // chips are decorative here; text inputs below drive the data
      />
    </div>

    {(data.revisionType === "song" || data.revisionType === "both") && (
      <TextAreaField
        label="Lyrics changes"
        placeholder="Paste revised lines, or describe what to change..."
        value={data.songChanges?.lyrics || ""}
        onChange={(v) => onChange({ ...data, songChanges: { ...data.songChanges, lyrics: v } })}
        rows={3}
      />
    )}

    {(data.revisionType === "video" || data.revisionType === "both") && (
      <>
        <TextAreaField
          label="Character / visual consistency notes"
          placeholder="e.g. The man in shot 3 should look older, the lighting should match shot 1..."
          value={data.videoChanges?.characterConsistency || ""}
          onChange={(v) => onChange({ ...data, videoChanges: { ...data.videoChanges, characterConsistency: v } })}
          rows={2}
        />
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
          {[
            { key: "colorGrade",     label: "Color grade",     ph: "e.g. more golden, desaturated..." },
            { key: "cameraMovement", label: "Camera movement", ph: "e.g. slower dolly, handheld feel..." },
            { key: "pacing",         label: "Edit pacing",     ph: "e.g. slower cuts, more tension..." },
            { key: "sceneChanges",   label: "Scene changes",   ph: "e.g. add rain, different location..." },
          ].map(({ key, label, ph }) => (
            <div key={key}>
              <div style={{ fontSize: "11px", color: "rgba(212,175,55,0.7)", letterSpacing: "0.1em", marginBottom: "6px", fontFamily: "Inter,sans-serif", textTransform: "uppercase" }}>{label}</div>
              <input
                placeholder={ph}
                value={(data.videoChanges as any)?.[key] || ""}
                onChange={(e) => onChange({ ...data, videoChanges: { ...data.videoChanges, [key]: e.target.value } })}
                style={{
                  width: "100%",
                  background: "rgba(255,255,255,0.04)",
                  border: "1.5px solid rgba(255,255,255,0.1)",
                  borderRadius: "10px",
                  padding: "9px 12px",
                  color: "#fff",
                  fontSize: "13px",
                  fontFamily: "Inter, sans-serif",
                  outline: "none",
                  boxSizing: "border-box",
                }}
              />
            </div>
          ))}
        </div>
      </>
    )}
  </div>
);

const Phase3Director: React.FC<{ data: Partial<RevisionData>; onChange: (d: Partial<RevisionData>) => void; order: OrderContext; onAnalyze: () => Promise<void>; analyzing: boolean }> = ({ data, onChange, onAnalyze, analyzing }) => (
  <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
    <TextAreaField
      label="Your director's note (the single most important change)"
      placeholder="Be cinematic. Be specific. Be poetic. This becomes Sophia's retake directive..."
      value={data.songChanges?.structure || data.videoChanges?.sceneChanges || ""}
      onChange={(v) => onChange({ ...data, songChanges: { ...data.songChanges, structure: v }, videoChanges: { ...data.videoChanges, sceneChanges: v } })}
      rows={5}
    />

    {data.songChanges?.structure || data.videoChanges?.sceneChanges ? (
      <button
        onClick={onAnalyze}
        disabled={analyzing}
        style={{
          padding: "12px 24px",
          background: analyzing ? "rgba(212,175,55,0.2)" : "rgba(212,175,55,0.15)",
          border: "1.5px solid rgba(212,175,55,0.5)",
          borderRadius: "10px",
          color: "#D4AF37",
          fontSize: "14px",
          fontFamily: "Inter, sans-serif",
          cursor: analyzing ? "not-allowed" : "pointer",
          display: "flex",
          alignItems: "center",
          gap: "10px",
          transition: "all 0.2s",
        }}
      >
        {analyzing ? (
          <>
            <span style={{ width: "16px", height: "16px", border: "2px solid #D4AF37", borderTopColor: "transparent", borderRadius: "50%", animation: "spin 0.8s linear infinite", display: "inline-block" }} />
            Sophia is writing your retake directive...
          </>
        ) : "✦ Generate Retake Directive"}
      </button>
    ) : null}

    {data.sophiaDirective && (
      <div style={{
        background: "rgba(212,175,55,0.06)",
        border: "1.5px solid rgba(212,175,55,0.3)",
        borderRadius: "12px",
        padding: "16px",
      }}>
        <div style={{ fontSize: "11px", color: "rgba(212,175,55,0.7)", letterSpacing: "0.1em", marginBottom: "10px", fontFamily: "Inter,sans-serif", textTransform: "uppercase" }}>
          Sophia's Retake Directive
        </div>
        <p style={{ color: "rgba(255,255,255,0.9)", fontSize: "14px", lineHeight: 1.7, margin: 0, fontFamily: "Inter, sans-serif" }}>
          {data.sophiaDirective}
        </p>
      </div>
    )}

    <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
  </div>
);

const Phase4Confirm: React.FC<{ data: Partial<RevisionData>; order: OrderContext }> = ({ data, order }) => {
  const items: { label: string; value: string }[] = [
    { label: "Revision Type",     value: data.revisionType || "—" },
    { label: "Emotional Intent",  value: data.emotionalIntent || "—" },
    { label: "Song — Mood",       value: data.songChanges?.mood || "—" },
    { label: "Song — Tempo",      value: data.songChanges?.tempo || "—" },
    { label: "Song — Lyrics",     value: data.songChanges?.lyrics ? data.songChanges.lyrics.slice(0, 60) + "..." : "—" },
    { label: "Video — Scene",     value: data.videoChanges?.sceneChanges || "—" },
    { label: "Video — Color",     value: data.videoChanges?.colorGrade || "—" },
    { label: "Customer Notes",    value: data.customerNotes || "—" },
  ].filter((i) => i.value !== "—");

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
      <div style={{
        background: "rgba(212,175,55,0.06)",
        border: "1.5px solid rgba(212,175,55,0.25)",
        borderRadius: "12px",
        padding: "16px",
        display: "flex",
        flexDirection: "column",
        gap: "10px",
      }}>
        {items.map(({ label, value }) => (
          <div key={label} style={{ display: "flex", gap: "12px" }}>
            <span style={{ width: "140px", fontSize: "11px", color: "rgba(212,175,55,0.6)", textTransform: "uppercase", letterSpacing: "0.08em", fontFamily: "Inter,sans-serif", flexShrink: 0 }}>{label}</span>
            <span style={{ fontSize: "13px", color: "rgba(255,255,255,0.85)", fontFamily: "Inter,sans-serif" }}>{value}</span>
          </div>
        ))}
      </div>

      {data.sophiaDirective && (
        <div style={{
          background: "rgba(11,23,54,0.5)",
          border: "1px solid rgba(212,175,55,0.2)",
          borderRadius: "10px",
          padding: "14px",
        }}>
          <div style={{ fontSize: "11px", color: "rgba(212,175,55,0.7)", letterSpacing: "0.1em", marginBottom: "8px", fontFamily: "Inter,sans-serif", textTransform: "uppercase" }}>
            Retake Directive (sent to production)
          </div>
          <p style={{ color: "rgba(255,255,255,0.8)", fontSize: "13px", lineHeight: 1.65, margin: 0, fontFamily: "Inter, sans-serif" }}>
            {data.sophiaDirective}
          </p>
        </div>
      )}

      <div style={{ fontSize: "12px", color: "rgba(255,255,255,0.4)", fontFamily: "Inter,sans-serif", textAlign: "center" }}>
        Your revision request will be reviewed by our production team within 24–48 hours.
      </div>
    </div>
  );
};

// ─── Main Guide Component ──────────────────────────────────────────────────────

export const SophiaRevisionGuide: React.FC<SophiaRevisionGuideProps> = ({
  order,
  onComplete,
  onCancel,
  avatarProvider = "static",
}) => {
  const [phase, setPhase] = useState<PhaseId>(0);
  const [data, setData] = useState<Partial<RevisionData>>({
    revisionType: undefined,
    emotionalIntent: "",
    songChanges: {},
    videoChanges: {},
    customerNotes: "",
    sophiaDirective: undefined,
  });
  const [analyzing, setAnalyzing] = useState(false);
  const [sophiaText, setSophiaText] = useState<string | undefined>(undefined);
  const avatarRef = useRef<AvatarHandle | null>(null);

  // Sophia speaks when phase changes
  useEffect(() => {
    const script = getSophiaScript(phase, data, order);
    setSophiaText(script);
  }, [phase]); // eslint-disable-line

  const handleAnalyze = async () => {
    setAnalyzing(true);
    try {
      const res = await fetch("/api/revisions/sophia-analysis", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          orderId: order.orderId,
          productSlug: order.productSlug,
          revisionType: data.revisionType,
          emotionalIntent: data.emotionalIntent,
          songChanges: data.songChanges,
          videoChanges: data.videoChanges,
          customerNotes: data.customerNotes,
        }),
      });
      const json = await res.json();
      if (json.directive) {
        setData((prev) => ({ ...prev, sophiaDirective: json.directive }));
        setSophiaText(json.directive);
      }
    } catch (e) {
      console.error("Sophia analysis failed:", e);
    } finally {
      setAnalyzing(false);
    }
  };

  const canAdvance = (): boolean => {
    switch (phase) {
      case 0: return !!data.revisionType;
      case 1: return !!(data.emotionalIntent || data.customerNotes);
      case 2: return true;
      case 3: return !!(data.sophiaDirective || data.songChanges?.structure || data.videoChanges?.sceneChanges);
      case 4: return true;
    }
  };

  const advance = () => {
    if (phase === 4) {
      onComplete(data as RevisionData);
    } else {
      setPhase((p) => (p + 1) as PhaseId);
    }
  };

  const back = () => {
    if (phase === 0) onCancel();
    else setPhase((p) => (p - 1) as PhaseId);
  };

  // ─── Render ───────────────────────────────────────────────────────────────────

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%", gap: "0" }}>

      {/* Phase progress bar */}
      <div style={{
        display: "flex",
        gap: "4px",
        padding: "0 0 20px 0",
      }}>
        {PHASES.map((p) => (
          <div key={p.id} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: "4px" }}>
            <div style={{
              height: "3px",
              width: "100%",
              borderRadius: "2px",
              background: p.id <= phase ? "#D4AF37" : "rgba(255,255,255,0.1)",
              transition: "background 0.3s ease",
            }} />
            <span style={{
              fontSize: "9px",
              color: p.id === phase ? "#D4AF37" : "rgba(255,255,255,0.3)",
              fontFamily: "Inter,sans-serif",
              textTransform: "uppercase",
              letterSpacing: "0.08em",
              transition: "color 0.3s",
            }}>{p.label}</span>
          </div>
        ))}
      </div>

      {/* Sophia Avatar + Dialogue */}
      <div style={{ display: "flex", gap: "16px", marginBottom: "24px" }}>
        <div style={{ width: "90px", height: "110px", flexShrink: 0, borderRadius: "12px", overflow: "hidden" }}>
          <SophiaAvatarRenderer
            provider={avatarProvider}
            tier={order.tier}
            speakText={sophiaText}
            onRef={(h) => { avatarRef.current = h; }}
          />
        </div>
        <div style={{
          flex: 1,
          background: "rgba(11,23,54,0.6)",
          border: "1px solid rgba(212,175,55,0.2)",
          borderRadius: "12px",
          padding: "14px 16px",
          display: "flex",
          alignItems: "center",
        }}>
          <p style={{
            color: "rgba(255,255,255,0.88)",
            fontSize: "14px",
            lineHeight: 1.65,
            margin: 0,
            fontFamily: "Inter, sans-serif",
            fontStyle: "italic",
          }}>
            "{getSophiaScript(phase, data, order)}"
          </p>
        </div>
      </div>

      {/* Phase input area */}
      <div style={{ flex: 1, overflowY: "auto", paddingRight: "4px" }}>
        {phase === 0 && <Phase0Scene data={data} onChange={setData} order={order} />}
        {phase === 1 && <Phase1Emotion data={data} onChange={setData} />}
        {phase === 2 && <Phase2Character data={data} onChange={setData} />}
        {phase === 3 && <Phase3Director data={data} onChange={setData} order={order} onAnalyze={handleAnalyze} analyzing={analyzing} />}
        {phase === 4 && <Phase4Confirm data={data} order={order} />}
      </div>

      {/* Navigation */}
      <div style={{
        display: "flex",
        gap: "12px",
        paddingTop: "20px",
        borderTop: "1px solid rgba(255,255,255,0.06)",
        marginTop: "20px",
      }}>
        <button
          onClick={back}
          style={{
            padding: "12px 20px",
            borderRadius: "10px",
            border: "1.5px solid rgba(255,255,255,0.12)",
            background: "transparent",
            color: "rgba(255,255,255,0.6)",
            fontSize: "14px",
            cursor: "pointer",
            fontFamily: "Inter, sans-serif",
          }}
        >
          {phase === 0 ? "Cancel" : "← Back"}
        </button>

        <button
          onClick={advance}
          disabled={!canAdvance()}
          style={{
            flex: 1,
            padding: "12px 24px",
            borderRadius: "10px",
            border: "none",
            background: canAdvance()
              ? "linear-gradient(135deg, #D4AF37, #B8922A)"
              : "rgba(255,255,255,0.06)",
            color: canAdvance() ? "#050B1A" : "rgba(255,255,255,0.3)",
            fontSize: "14px",
            fontWeight: "600",
            cursor: canAdvance() ? "pointer" : "not-allowed",
            fontFamily: "Inter, sans-serif",
            transition: "all 0.2s",
          }}
        >
          {phase === 4 ? "Submit Revision Request" : "Continue →"}
        </button>
      </div>
    </div>
  );
};

export default SophiaRevisionGuide;
