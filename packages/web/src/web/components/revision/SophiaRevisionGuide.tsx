// ============================================================
// SophiaRevisionGuide — Sophia's full creative director revision dialogue
//
// Sophia fetches the customer's complete context on mount:
//   their story, emotional fingerprint, original production prompts,
//   prior revision history — then speaks as if she built the work.
//
// Phase 0: Scene identification (which song/video shot)
// Phase 1: Emotional diagnosis (what's missing emotionally?)
// Phase 2: Character/voice check (who/what needs to change?)
// Phase 3: Director's note (the singular most important change)
// Phase 4: Sophia's retake directive (GPT-4o synthesis + confirm)
// ============================================================

import React, { useState, useEffect, useRef, useCallback } from "react";
import { SophiaAvatarRenderer, AvatarHandle } from "./SophiaAvatarRenderer";
import type { RevisionJobPayload } from "../../types/revision";
import { getToken } from "../../lib/authClient";

// ─── Types ────────────────────────────────────────────────────────────────────

export type RevisionType = "song" | "video" | "both";

export interface OrderContext {
  orderId:      string;
  productSlug:  string;
  tier:         "starter" | "premium" | "elite";
  productionId?: string;
  songUrl?:     string;
  videoUrl?:    string;
  title?:       string;
}

// What comes back from GET /api/revisions/context
export interface SophiaCustomerContext {
  customerName:           string;
  tier:                   string;
  memberId:               string | null;
  revisionRound:          number;
  revisionsRemaining:     number;
  storyText:              string | null;
  emotionalProfile:       Record<string, number> | null;
  originalEmotion:        string | null;
  originalMood:           string | null;
  storyTitle:             string | null;
  originalFalPrompt:      string | null;
  originalSongUrl:        string | null;
  originalVideoUrl:       string | null;
  storyboard:             any[] | null;
  productSlug:            string;
  productionStatus:       string | null;
  priorRevisionDirectives: string[];
}

interface Phase {
  id:    number;
  name:  string;
  label: string;
}

const PHASES: Phase[] = [
  { id: 0, name: "scene",     label: "Identify" },
  { id: 1, name: "emotion",   label: "Diagnose"  },
  { id: 2, name: "character", label: "Character" },
  { id: 3, name: "director",  label: "Direct"    },
  { id: 4, name: "confirm",   label: "Confirm"   },
];

type PhaseId = 0 | 1 | 2 | 3 | 4;

export interface RevisionData {
  revisionType:   RevisionType;
  shotIndex?:     number;
  retakeStart?:   number;
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
  customerNotes:     string;
  sophiaDirective?:  string;       // human-readable closing line Sophia speaks
  sophiaFullOutput?: any;          // full GPT-4o JSON directive
}

export interface SophiaRevisionGuideProps {
  order:          OrderContext;
  onComplete:     (payload: RevisionData) => void;
  onCancel:       () => void;
  avatarProvider?: "static" | "did" | "simli";
}

// ─── Dynamic Sophia scripts — personalized using customer context ──────────────

function buildSophiaScript(
  phase: PhaseId,
  data:  Partial<RevisionData>,
  order: OrderContext,
  ctx:   SophiaCustomerContext | null,
): string {
  const name  = ctx?.customerName && ctx.customerName !== "there" ? ctx.customerName : null;
  const title = ctx?.storyTitle || order.title || "your creation";
  const greeting = name ? `${name}` : "";

  // Top emotion from fingerprint
  const topEmotion = ctx?.emotionalProfile
    ? Object.entries(ctx.emotionalProfile).sort((a, b) => b[1] - a[1])[0]?.[0] || ctx.originalEmotion
    : ctx?.originalEmotion;

  const isRound2Plus = (ctx?.revisionRound ?? 1) > 1;

  switch (phase) {
    case 0: {
      if (isRound2Plus && ctx?.priorRevisionDirectives?.length) {
        return `Welcome back${greeting ? `, ${greeting}` : ""}. I remember what we tried last time — ${ctx.priorRevisionDirectives[ctx.priorRevisionDirectives.length - 1].slice(0, 80)}... Let's go deeper this round. What are we revisiting — the song, the video, or both?`;
      }
      if (ctx?.storyTitle) {
        return `Welcome back${greeting ? `, ${greeting}` : ""}. I've been thinking about "${title}" since we finished it. Something's not sitting right for you — I can feel it. Tell me: are we revisiting the song, the video, or both?`;
      }
      return `Welcome back${greeting ? `, ${greeting}` : ""}. I've reviewed your creation and I want to make sure we get this revision exactly right. What are we revisiting — the song, the video, or both?`;
    }
    case 1: {
      if (topEmotion && ctx?.storyText) {
        return `When I analyzed your story, I felt ${topEmotion} running through everything you shared. Is the ${data.revisionType === "song" ? "song" : "video"} not reaching that place? Tell me what emotion is missing — or what's landing wrong.`;
      }
      if (topEmotion) {
        return `Your emotional fingerprint is rooted in ${topEmotion}. What feeling should this ${data.revisionType === "song" ? "song" : "scene"} be carrying that it's not? Be honest with me.`;
      }
      return `Let's go deeper — what emotion should this ${data.revisionType === "song" ? "song" : "scene"} carry? When you close your eyes and hear it, what are you not feeling that you need to feel?`;
    }
    case 2: {
      if (ctx?.originalFalPrompt) {
        return `I originally directed this with a specific visual and sonic intention. Are the characters, voices, or visual atmosphere off from what you imagined? Or is it more atmospheric — the overall feeling of the world we created?`;
      }
      if (data.emotionalIntent) {
        return `You're reaching for ${data.emotionalIntent}. Are there specific characters, voices, or visual elements that should look or sound different? Or is it the overall atmosphere that's off?`;
      }
      return `That's a powerful direction. Are there characters, voices, or visual elements that should look or sound different — or is it more about the overall atmosphere?`;
    }
    case 3: {
      if (ctx?.originalFalPrompt && ctx.originalFalPrompt.length > 20) {
        return `I built your original vision with care. Now I need you to be the director. What is the single most important change that would make this feel like yours? Be specific. Be poetic. This becomes my retake directive.`;
      }
      return `Perfect. Now be the director. What is the one most important change that would make this feel like yours? Be as specific or as poetic as you like — this is what I'll build from.`;
    }
    case 4: {
      const closing = data.sophiaDirective;
      if (closing) return closing;
      return `I've built your retake directive from everything you've shared and everything I know about your story. Review it below. When you're ready, submit it to production.`;
    }
  }
}

// ─── Input widgets ────────────────────────────────────────────────────────────

interface ChipSelectProps {
  options: { value: string; label: string; icon?: string }[];
  value:   string;
  onChange: (v: string) => void;
  multi?:  boolean;
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
              padding:    "8px 16px",
              borderRadius: "20px",
              border:     `1.5px solid ${active ? "#D4AF37" : "rgba(255,255,255,0.12)"}`,
              background: active ? "rgba(212,175,55,0.15)" : "rgba(255,255,255,0.04)",
              color:      active ? "#D4AF37" : "rgba(255,255,255,0.7)",
              fontSize:   "13px",
              cursor:     "pointer",
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
  value:       string;
  onChange:    (v: string) => void;
  rows?:       number;
  label?:      string;
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
        width:      "100%",
        background: "rgba(255,255,255,0.04)",
        border:     "1.5px solid rgba(255,255,255,0.1)",
        borderRadius: "10px",
        padding:    "12px 14px",
        color:      "#fff",
        fontSize:   "14px",
        fontFamily: "Inter, sans-serif",
        resize:     "vertical",
        outline:    "none",
        lineHeight: 1.6,
        boxSizing:  "border-box",
      }}
      onFocus={(e) => { e.target.style.borderColor = "rgba(212,175,55,0.5)"; }}
      onBlur={(e)  => { e.target.style.borderColor = "rgba(255,255,255,0.1)"; }}
    />
  </div>
);

// ─── Phase 0 — Scene identification ───────────────────────────────────────────

const Phase0Scene: React.FC<{
  data:     Partial<RevisionData>;
  onChange: (d: Partial<RevisionData>) => void;
  order:    OrderContext;
  ctx:      SophiaCustomerContext | null;
}> = ({ data, onChange, order, ctx }) => {
  const songUrl  = data.revisionType !== "video"  ? (ctx?.originalSongUrl  || order.songUrl)  : undefined;
  const videoUrl = data.revisionType !== "song"   ? (ctx?.originalVideoUrl || order.videoUrl) : undefined;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
      <div>
        <div style={{ fontSize: "11px", color: "rgba(212,175,55,0.7)", letterSpacing: "0.1em", marginBottom: "10px", fontFamily: "Inter,sans-serif", textTransform: "uppercase" }}>
          What needs revision?
        </div>
        <ChipSelect
          options={[
            { value: "song",  label: "Song",        icon: "🎵" },
            { value: "video", label: "Music Video", icon: "🎬" },
            { value: "both",  label: "Both",        icon: "✨" },
          ]}
          value={data.revisionType || ""}
          onChange={(v) => onChange({ ...data, revisionType: v as RevisionType })}
        />
      </div>

      {/* Show revision round context */}
      {ctx && (
        <div style={{
          background: "rgba(212,175,55,0.06)",
          border:     "1px solid rgba(212,175,55,0.15)",
          borderRadius: "8px",
          padding:    "10px 14px",
          fontSize:   "12px",
          color:      "rgba(255,255,255,0.55)",
          fontFamily: "Inter, sans-serif",
        }}>
          Round {ctx.revisionRound} of {ctx.revisionRound + ctx.revisionsRemaining} · {ctx.tier} tier
          {ctx.revisionsRemaining <= 1 && ctx.revisionsRemaining >= 0 && (
            <span style={{ color: "#F59E0B", marginLeft: "8px" }}>
              {ctx.revisionsRemaining === 0 ? "· Last revision" : "· 1 revision remaining after this"}
            </span>
          )}
        </div>
      )}

      {(data.revisionType === "video" || data.revisionType === "both") && videoUrl && (
        <div>
          <div style={{ fontSize: "11px", color: "rgba(212,175,55,0.7)", letterSpacing: "0.1em", marginBottom: "10px", fontFamily: "Inter,sans-serif", textTransform: "uppercase" }}>
            {ctx?.storyTitle ? `"${ctx.storyTitle}" — Current Video` : "Current Video"}
          </div>
          <video
            src={videoUrl}
            controls
            style={{
              width:        "100%",
              borderRadius: "10px",
              border:       "1px solid rgba(212,175,55,0.2)",
              maxHeight:    "200px",
              background:   "#000",
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
                width:        "100%",
                background:   "rgba(255,255,255,0.04)",
                border:       "1.5px solid rgba(255,255,255,0.1)",
                borderRadius: "10px",
                padding:      "10px 14px",
                color:        "#fff",
                fontSize:     "14px",
                fontFamily:   "Inter, sans-serif",
                outline:      "none",
                boxSizing:    "border-box",
              }}
            />
            {/* Show storyboard shot labels if available */}
            {ctx?.storyboard && ctx.storyboard.length > 0 && (
              <div style={{ marginTop: "8px", display: "flex", flexWrap: "wrap", gap: "6px" }}>
                {ctx.storyboard.slice(0, 9).map((shot: any, i: number) => (
                  <button
                    key={i}
                    onClick={() => onChange({ ...data, shotIndex: i })}
                    style={{
                      padding:      "4px 10px",
                      borderRadius: "12px",
                      border:       `1px solid ${data.shotIndex === i ? "#D4AF37" : "rgba(255,255,255,0.1)"}`,
                      background:   data.shotIndex === i ? "rgba(212,175,55,0.15)" : "rgba(255,255,255,0.03)",
                      color:        data.shotIndex === i ? "#D4AF37" : "rgba(255,255,255,0.5)",
                      fontSize:     "11px",
                      cursor:       "pointer",
                      fontFamily:   "Inter,sans-serif",
                    }}
                  >
                    Shot {i}{shot.description ? ` — ${shot.description.slice(0, 20)}` : ""}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {(data.revisionType === "song" || data.revisionType === "both") && songUrl && (
        <div>
          <div style={{ fontSize: "11px", color: "rgba(212,175,55,0.7)", letterSpacing: "0.1em", marginBottom: "10px", fontFamily: "Inter,sans-serif", textTransform: "uppercase" }}>
            {ctx?.storyTitle ? `"${ctx.storyTitle}" — Current Song` : "Current Song"}
          </div>
          <audio src={songUrl} controls style={{ width: "100%", accentColor: "#D4AF37" }} />
        </div>
      )}
    </div>
  );
};

// ─── Phase 1 — Emotional diagnosis ────────────────────────────────────────────

const Phase1Emotion: React.FC<{
  data:     Partial<RevisionData>;
  onChange: (d: Partial<RevisionData>) => void;
  ctx:      SophiaCustomerContext | null;
}> = ({ data, onChange, ctx }) => {
  // Sort emotion chips by customer's fingerprint if available — their top emotions first
  const defaultEmotions = [
    "grief", "nostalgia", "triumph", "love", "longing",
    "rage", "peace", "wonder", "fear", "joy", "hope", "melancholy",
  ];

  const sortedEmotions = ctx?.emotionalProfile
    ? [
        ...Object.keys(ctx.emotionalProfile).filter((e) => defaultEmotions.includes(e)),
        ...defaultEmotions.filter((e) => !Object.keys(ctx.emotionalProfile!).includes(e)),
      ]
    : defaultEmotions;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
      {/* Show their emotional fingerprint as context */}
      {ctx?.emotionalProfile && (
        <div style={{
          background:   "rgba(11,23,54,0.5)",
          border:       "1px solid rgba(212,175,55,0.15)",
          borderRadius: "10px",
          padding:      "12px 14px",
        }}>
          <div style={{ fontSize: "10px", color: "rgba(212,175,55,0.6)", letterSpacing: "0.12em", fontFamily: "Inter,sans-serif", textTransform: "uppercase", marginBottom: "8px" }}>
            Your emotional fingerprint
          </div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: "6px" }}>
            {Object.entries(ctx.emotionalProfile)
              .sort((a, b) => b[1] - a[1])
              .slice(0, 6)
              .map(([emotion, score]) => (
                <div key={emotion} style={{
                  display:      "flex",
                  alignItems:   "center",
                  gap:          "6px",
                  padding:      "3px 10px",
                  borderRadius: "12px",
                  background:   "rgba(212,175,55,0.08)",
                  border:       "1px solid rgba(212,175,55,0.15)",
                }}>
                  <span style={{ fontSize: "12px", color: "rgba(255,255,255,0.8)", fontFamily: "Inter,sans-serif", textTransform: "capitalize" }}>{emotion}</span>
                  <span style={{ fontSize: "11px", color: "#D4AF37", fontFamily: "Inter,sans-serif" }}>{Math.round(score)}%</span>
                </div>
              ))}
          </div>
        </div>
      )}

      <div>
        <div style={{ fontSize: "11px", color: "rgba(212,175,55,0.7)", letterSpacing: "0.1em", marginBottom: "10px", fontFamily: "Inter,sans-serif", textTransform: "uppercase" }}>
          Core emotion to convey
        </div>
        <ChipSelect
          options={sortedEmotions.map((e) => ({ value: e, label: e.charAt(0).toUpperCase() + e.slice(1) }))}
          value={data.emotionalIntent || ""}
          onChange={(v) => onChange({ ...data, emotionalIntent: v })}
        />
      </div>

      <TextAreaField
        label="In your own words — what feeling is missing?"
        placeholder={ctx?.originalEmotion
          ? `You were going for ${ctx.originalEmotion}. Describe what's landing wrong...`
          : "Describe the emotion you want the listener / viewer to feel..."}
        value={data.customerNotes || ""}
        onChange={(v) => onChange({ ...data, customerNotes: v })}
        rows={3}
      />

      {(data.revisionType === "song" || data.revisionType === "both") && (
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
          {[
            { key: "mood",  label: "Mood shift",  ph: ctx?.originalMood ? `Currently: ${ctx.originalMood}` : "e.g. darker, more hopeful..." },
            { key: "tempo", label: "Tempo",        ph: "e.g. slower, more driving..." },
            { key: "genre", label: "Genre",        ph: "e.g. cinematic orchestral..." },
            { key: "key",   label: "Key / Tone",   ph: "e.g. minor, modal, brighter..." },
          ].map(({ key, label, ph }) => (
            <div key={key}>
              <div style={{ fontSize: "11px", color: "rgba(212,175,55,0.7)", letterSpacing: "0.1em", marginBottom: "6px", fontFamily: "Inter,sans-serif", textTransform: "uppercase" }}>{label}</div>
              <input
                placeholder={ph}
                value={(data.songChanges as any)?.[key] || ""}
                onChange={(e) => onChange({ ...data, songChanges: { ...data.songChanges, [key]: e.target.value } })}
                style={{
                  width: "100%", background: "rgba(255,255,255,0.04)",
                  border: "1.5px solid rgba(255,255,255,0.1)", borderRadius: "10px",
                  padding: "9px 12px", color: "#fff", fontSize: "13px",
                  fontFamily: "Inter, sans-serif", outline: "none", boxSizing: "border-box",
                }}
              />
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

// ─── Phase 2 — Character / voice check ────────────────────────────────────────

const Phase2Character: React.FC<{
  data:     Partial<RevisionData>;
  onChange: (d: Partial<RevisionData>) => void;
  ctx:      SophiaCustomerContext | null;
}> = ({ data, onChange, ctx }) => (
  <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
    <div>
      <div style={{ fontSize: "11px", color: "rgba(212,175,55,0.7)", letterSpacing: "0.1em", marginBottom: "10px", fontFamily: "Inter,sans-serif", textTransform: "uppercase" }}>
        What needs to change?
      </div>
      <ChipSelect
        multi
        options={[
          { value: "voice",      label: "Voice / Delivery" },
          { value: "lyrics",     label: "Lyrics"           },
          { value: "character",  label: "Visual Character" },
          { value: "color",      label: "Color Grade"      },
          { value: "camera",     label: "Camera Movement"  },
          { value: "pacing",     label: "Pacing / Rhythm"  },
          { value: "structure",  label: "Song Structure"   },
          { value: "atmosphere", label: "Overall Atmosphere" },
        ]}
        value={[
          data.songChanges?.lyrics              ? "lyrics"    : "",
          data.videoChanges?.characterConsistency ? "character" : "",
          data.videoChanges?.colorGrade         ? "color"     : "",
          data.videoChanges?.cameraMovement     ? "camera"    : "",
          data.videoChanges?.pacing             ? "pacing"    : "",
        ].filter(Boolean).join(",")}
        onChange={() => {}}
      />
    </div>

    {/* If we have the original FAL prompt, show it for reference */}
    {ctx?.originalFalPrompt && (
      <div style={{
        background:   "rgba(11,23,54,0.4)",
        border:       "1px solid rgba(255,255,255,0.07)",
        borderRadius: "8px",
        padding:      "10px 14px",
      }}>
        <div style={{ fontSize: "10px", color: "rgba(212,175,55,0.5)", letterSpacing: "0.12em", fontFamily: "Inter,sans-serif", textTransform: "uppercase", marginBottom: "6px" }}>
          Original production directive
        </div>
        <p style={{ fontSize: "12px", color: "rgba(255,255,255,0.45)", lineHeight: 1.55, margin: 0, fontFamily: "Inter,sans-serif" }}>
          {ctx.originalFalPrompt.slice(0, 160)}{ctx.originalFalPrompt.length > 160 ? "..." : ""}
        </p>
      </div>
    )}

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
            { key: "colorGrade",      label: "Color grade",     ph: "e.g. more golden, desaturated..." },
            { key: "cameraMovement",  label: "Camera movement", ph: "e.g. slower dolly, handheld feel..." },
            { key: "pacing",          label: "Edit pacing",     ph: "e.g. slower cuts, more tension..."  },
            { key: "sceneChanges",    label: "Scene changes",   ph: "e.g. add rain, different location..." },
          ].map(({ key, label, ph }) => (
            <div key={key}>
              <div style={{ fontSize: "11px", color: "rgba(212,175,55,0.7)", letterSpacing: "0.1em", marginBottom: "6px", fontFamily: "Inter,sans-serif", textTransform: "uppercase" }}>{label}</div>
              <input
                placeholder={ph}
                value={(data.videoChanges as any)?.[key] || ""}
                onChange={(e) => onChange({ ...data, videoChanges: { ...data.videoChanges, [key]: e.target.value } })}
                style={{
                  width: "100%", background: "rgba(255,255,255,0.04)",
                  border: "1.5px solid rgba(255,255,255,0.1)", borderRadius: "10px",
                  padding: "9px 12px", color: "#fff", fontSize: "13px",
                  fontFamily: "Inter, sans-serif", outline: "none", boxSizing: "border-box",
                }}
              />
            </div>
          ))}
        </div>
      </>
    )}
  </div>
);

// ─── Phase 3 — Director's note ────────────────────────────────────────────────

const Phase3Director: React.FC<{
  data:       Partial<RevisionData>;
  onChange:   (d: Partial<RevisionData>) => void;
  order:      OrderContext;
  ctx:        SophiaCustomerContext | null;
  onAnalyze:  () => Promise<void>;
  analyzing:  boolean;
}> = ({ data, onChange, ctx, onAnalyze, analyzing }) => {
  const hasNote = !!(data.customerNotes?.trim());

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
      {/* Sophia's prior revision note — shows if round 2+ */}
      {ctx?.priorRevisionDirectives && ctx.priorRevisionDirectives.length > 0 && (
        <div style={{
          background:   "rgba(139,92,246,0.06)",
          border:       "1px solid rgba(139,92,246,0.2)",
          borderRadius: "10px",
          padding:      "12px 14px",
        }}>
          <div style={{ fontSize: "10px", color: "rgba(139,92,246,0.7)", letterSpacing: "0.12em", fontFamily: "Inter,sans-serif", textTransform: "uppercase", marginBottom: "6px" }}>
            What Sophia directed last time
          </div>
          <p style={{ fontSize: "13px", color: "rgba(255,255,255,0.6)", lineHeight: 1.6, margin: 0, fontFamily: "Inter,sans-serif", fontStyle: "italic" }}>
            "{ctx.priorRevisionDirectives[ctx.priorRevisionDirectives.length - 1].slice(0, 200)}"
          </p>
        </div>
      )}

      <TextAreaField
        label="Your director's note — the single most important change"
        placeholder={
          ctx?.storyTitle
            ? `For "${ctx.storyTitle}" — be cinematic. Be specific. Be poetic. This becomes Sophia's retake directive...`
            : "Be cinematic. Be specific. Be poetic. This becomes Sophia's retake directive..."
        }
        value={data.customerNotes || ""}
        onChange={(v) => onChange({ ...data, customerNotes: v })}
        rows={5}
      />

      {hasNote && (
        <button
          onClick={onAnalyze}
          disabled={analyzing}
          style={{
            padding:    "12px 24px",
            background: analyzing ? "rgba(212,175,55,0.1)" : "rgba(212,175,55,0.12)",
            border:     "1.5px solid rgba(212,175,55,0.5)",
            borderRadius: "10px",
            color:      "#D4AF37",
            fontSize:   "14px",
            fontFamily: "Inter, sans-serif",
            cursor:     analyzing ? "not-allowed" : "pointer",
            display:    "flex",
            alignItems: "center",
            gap:        "10px",
            transition: "all 0.2s",
          }}
        >
          {analyzing ? (
            <>
              <span style={{ width: "16px", height: "16px", border: "2px solid #D4AF37", borderTopColor: "transparent", borderRadius: "50%", animation: "gm-spin 0.8s linear infinite", display: "inline-block" }} />
              Sophia is reading your story and writing your retake directive...
            </>
          ) : "✦ Generate Sophia's Retake Directive"}
        </button>
      )}

      {/* Full directive output */}
      {data.sophiaFullOutput && (
        <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
          {/* Sophia's assessment */}
          {data.sophiaFullOutput.sophia_assessment && (
            <div style={{
              background:   "rgba(212,175,55,0.06)",
              border:       "1.5px solid rgba(212,175,55,0.25)",
              borderRadius: "12px",
              padding:      "14px 16px",
            }}>
              <div style={{ fontSize: "10px", color: "rgba(212,175,55,0.6)", letterSpacing: "0.12em", fontFamily: "Inter,sans-serif", textTransform: "uppercase", marginBottom: "8px" }}>
                Sophia's diagnosis
              </div>
              <p style={{ color: "rgba(255,255,255,0.88)", fontSize: "14px", lineHeight: 1.7, margin: 0, fontFamily: "Inter, sans-serif", fontStyle: "italic" }}>
                "{data.sophiaFullOutput.sophia_assessment}"
              </p>
            </div>
          )}

          {/* Director note */}
          {data.sophiaFullOutput.director_note && (
            <div style={{
              background:   "rgba(11,23,54,0.6)",
              border:       "1px solid rgba(212,175,55,0.18)",
              borderRadius: "10px",
              padding:      "14px 16px",
            }}>
              <div style={{ fontSize: "10px", color: "rgba(212,175,55,0.5)", letterSpacing: "0.12em", fontFamily: "Inter,sans-serif", textTransform: "uppercase", marginBottom: "8px" }}>
                Retake directive
              </div>
              <p style={{ color: "rgba(255,255,255,0.8)", fontSize: "13px", lineHeight: 1.65, margin: 0, fontFamily: "Inter, sans-serif" }}>
                {data.sophiaFullOutput.director_note}
              </p>
            </div>
          )}

          {/* Technical specs grid */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px" }}>
            {[
              { label: "Camera",    value: data.sophiaFullOutput.revised_cameraMotion },
              { label: "Mood",      value: data.sophiaFullOutput.mood_adjustment       },
              { label: "Lighting",  value: data.sophiaFullOutput.revised_lighting?.slice(0, 60) },
              { label: "Confidence", value: data.sophiaFullOutput.confidence ? `${Math.round(data.sophiaFullOutput.confidence * 100)}%` : null },
            ].filter((i) => i.value).map(({ label, value }) => (
              <div key={label} style={{
                background:   "rgba(255,255,255,0.03)",
                border:       "1px solid rgba(255,255,255,0.07)",
                borderRadius: "8px",
                padding:      "8px 12px",
              }}>
                <div style={{ fontSize: "10px", color: "rgba(212,175,55,0.5)", textTransform: "uppercase", letterSpacing: "0.1em", fontFamily: "Inter,sans-serif", marginBottom: "3px" }}>{label}</div>
                <div style={{ fontSize: "12px", color: "rgba(255,255,255,0.7)", fontFamily: "Inter,sans-serif" }}>{value}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      <style>{`@keyframes gm-spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
};

// ─── Phase 4 — Confirm ────────────────────────────────────────────────────────

const Phase4Confirm: React.FC<{
  data:  Partial<RevisionData>;
  order: OrderContext;
  ctx:   SophiaCustomerContext | null;
}> = ({ data, order, ctx }) => {
  const full = data.sophiaFullOutput;

  const summaryItems: { label: string; value: string }[] = [
    { label: "Revision Type",    value: data.revisionType || "—"                },
    { label: "Emotional Intent", value: data.emotionalIntent || "—"             },
    { label: "Song — Mood",      value: data.songChanges?.mood || "—"          },
    { label: "Song — Tempo",     value: data.songChanges?.tempo || "—"         },
    { label: "Song — Lyrics",    value: data.songChanges?.lyrics ? data.songChanges.lyrics.slice(0, 60) + "..." : "—" },
    { label: "Video — Scene",    value: data.videoChanges?.sceneChanges || "—" },
    { label: "Video — Color",    value: data.videoChanges?.colorGrade || "—"   },
    { label: "Customer Note",    value: data.customerNotes || "—"              },
  ].filter((i) => i.value !== "—");

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
      {/* Sophia's closing line */}
      {data.sophiaDirective && (
        <div style={{
          background:   "rgba(212,175,55,0.08)",
          border:       "1.5px solid rgba(212,175,55,0.3)",
          borderRadius: "12px",
          padding:      "16px",
        }}>
          <div style={{ fontSize: "10px", color: "rgba(212,175,55,0.6)", letterSpacing: "0.12em", fontFamily: "Inter,sans-serif", textTransform: "uppercase", marginBottom: "8px" }}>
            Sophia says
          </div>
          <p style={{ color: "rgba(255,255,255,0.9)", fontSize: "14px", lineHeight: 1.7, margin: 0, fontFamily: "Inter, sans-serif", fontStyle: "italic" }}>
            "{data.sophiaDirective}"
          </p>
        </div>
      )}

      {/* Customer-readable summary */}
      {summaryItems.length > 0 && (
        <div style={{
          background:   "rgba(212,175,55,0.04)",
          border:       "1.5px solid rgba(212,175,55,0.15)",
          borderRadius: "12px",
          padding:      "16px",
          display:      "flex",
          flexDirection: "column",
          gap:          "10px",
        }}>
          {summaryItems.map(({ label, value }) => (
            <div key={label} style={{ display: "flex", gap: "12px" }}>
              <span style={{ width: "140px", fontSize: "11px", color: "rgba(212,175,55,0.55)", textTransform: "uppercase", letterSpacing: "0.08em", fontFamily: "Inter,sans-serif", flexShrink: 0 }}>{label}</span>
              <span style={{ fontSize: "13px", color: "rgba(255,255,255,0.8)", fontFamily: "Inter,sans-serif" }}>{value}</span>
            </div>
          ))}
        </div>
      )}

      {/* Full directive technical panel */}
      {full && (
        <div style={{
          background:   "rgba(11,23,54,0.5)",
          border:       "1px solid rgba(212,175,55,0.15)",
          borderRadius: "10px",
          padding:      "14px",
        }}>
          <div style={{ fontSize: "10px", color: "rgba(212,175,55,0.6)", letterSpacing: "0.12em", fontFamily: "Inter,sans-serif", textTransform: "uppercase", marginBottom: "10px" }}>
            Production directive (sent to engine)
          </div>
          {full.director_note && (
            <p style={{ color: "rgba(255,255,255,0.75)", fontSize: "13px", lineHeight: 1.65, margin: "0 0 10px 0", fontFamily: "Inter, sans-serif" }}>
              {full.director_note}
            </p>
          )}
          {full.revised_falPrompt && (
            <p style={{ color: "rgba(255,255,255,0.4)", fontSize: "11px", lineHeight: 1.55, margin: 0, fontFamily: "Inter, sans-serif" }}>
              FAL: {full.revised_falPrompt.slice(0, 120)}…
            </p>
          )}
        </div>
      )}

      {/* Revision count awareness */}
      {ctx && (
        <div style={{ fontSize: "12px", color: "rgba(255,255,255,0.35)", fontFamily: "Inter,sans-serif", textAlign: "center" }}>
          Round {ctx.revisionRound} · {ctx.revisionsRemaining <= 0 ? "No revisions remaining after this" : `${ctx.revisionsRemaining} revision${ctx.revisionsRemaining !== 1 ? "s" : ""} remaining`} · 24–48 hour turnaround
        </div>
      )}
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
  const [phase, setPhase]         = useState<PhaseId>(0);
  const [data, setData]           = useState<Partial<RevisionData>>({
    revisionType:   undefined,
    emotionalIntent: "",
    songChanges:    {},
    videoChanges:   {},
    customerNotes:  "",
    sophiaDirective: undefined,
    sophiaFullOutput: undefined,
  });
  const [analyzing, setAnalyzing] = useState(false);
  const [sophiaText, setSophiaText] = useState<string | undefined>(undefined);
  const [ctx, setCtx]             = useState<SophiaCustomerContext | null>(null);
  const [ctxLoading, setCtxLoading] = useState(true);
  const avatarRef                 = useRef<AvatarHandle | null>(null);

  // ── Fetch full customer context on mount ────────────────────────────────────
  useEffect(() => {
    if (!order.orderId) { setCtxLoading(false); return; }
    setCtxLoading(true);
    const tok = getToken();
    const ctxHeaders: Record<string, string> = {};
    if (tok) ctxHeaders["Authorization"] = `Bearer ${tok}`;
    fetch(`/api/revisions/context?orderId=${order.orderId}&productSlug=${order.productSlug}`, {
      credentials: "include",
      headers: ctxHeaders,
    })
      .then((r) => r.json())
      .then((json) => {
        if (json.context) setCtx(json.context);
      })
      .catch((e) => console.warn("[SophiaRevisionGuide] context fetch failed:", e))
      .finally(() => setCtxLoading(false));
  }, [order.orderId]);

  // ── Sophia speaks when phase changes (or ctx loads) ─────────────────────────
  useEffect(() => {
    if (ctxLoading) return; // Wait for context before speaking Phase 0
    const script = buildSophiaScript(phase, data, order, ctx);
    setSophiaText(script);
  }, [phase, ctxLoading]); // eslint-disable-line

  // ── GPT-4o analysis — full context-aware ────────────────────────────────────
  const handleAnalyze = useCallback(async () => {
    setAnalyzing(true);
    try {
      const res = await fetch("/api/revisions/sophia-analysis", {
        method:      "POST",
        headers:     { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          orderId:         order.orderId,
          productSlug:     order.productSlug,
          revisionType:    data.revisionType,
          emotionalIntent: data.emotionalIntent,
          songChanges:     data.songChanges,
          videoChanges:    data.videoChanges,
          customerNotes:   data.customerNotes,
          shotIndex:       data.shotIndex,
        }),
      });
      const json = await res.json();
      if (json.directive) {
        const d = json.directive;
        // sophiaDirective = the personal closing line Sophia speaks
        const closingLine = d.sophia_closing_line || d.director_note || "Your retake directive is ready.";
        setData((prev) => ({
          ...prev,
          sophiaDirective:  closingLine,
          sophiaFullOutput: d,
        }));
        // Sophia speaks the closing line
        setSophiaText(closingLine);
        // Update ctx revision count if returned
        if (json.customerContext) {
          setCtx((prev) => prev ? { ...prev, ...json.customerContext } : json.customerContext);
        }
      }
    } catch (e) {
      console.error("Sophia analysis failed:", e);
    } finally {
      setAnalyzing(false);
    }
  }, [order, data]);

  const canAdvance = (): boolean => {
    switch (phase) {
      case 0: return !!data.revisionType;
      case 1: return !!(data.emotionalIntent || data.customerNotes);
      case 2: return true;
      case 3: return !!(data.sophiaFullOutput || data.customerNotes?.trim());
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
      <div style={{ display: "flex", gap: "4px", padding: "0 0 20px 0" }}>
        {PHASES.map((p) => (
          <div key={p.id} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: "4px" }}>
            <div style={{
              height:     "3px",
              width:      "100%",
              borderRadius: "2px",
              background: p.id <= phase ? "#D4AF37" : "rgba(255,255,255,0.1)",
              transition: "background 0.3s ease",
            }} />
            <span style={{
              fontSize:   "9px",
              color:      p.id === phase ? "#D4AF37" : "rgba(255,255,255,0.3)",
              fontFamily: "Inter,sans-serif",
              textTransform: "uppercase",
              letterSpacing: "0.08em",
              transition: "color 0.3s",
            }}>{p.label}</span>
          </div>
        ))}
      </div>

      {/* Sophia Avatar + Dialogue bubble */}
      <div style={{ display: "flex", gap: "16px", marginBottom: "24px" }}>
        <div style={{ width: "90px", height: "110px", flexShrink: 0, borderRadius: "12px", overflow: "hidden" }}>
          {ctxLoading ? (
            // Loading shimmer while fetching context
            <div style={{
              width: "100%", height: "100%",
              background: "linear-gradient(135deg, rgba(212,175,55,0.1), rgba(11,23,54,0.5))",
              borderRadius: "12px",
              animation: "gm-pulse 1.5s ease-in-out infinite",
            }} />
          ) : (
            <SophiaAvatarRenderer
              provider={avatarProvider}
              tier={order.tier}
              speakText={sophiaText}
              onRef={(h) => { avatarRef.current = h; }}
            />
          )}
        </div>
        <div style={{
          flex:         1,
          background:   "rgba(11,23,54,0.6)",
          border:       "1px solid rgba(212,175,55,0.2)",
          borderRadius: "12px",
          padding:      "14px 16px",
          display:      "flex",
          alignItems:   "center",
          minHeight:    "80px",
        }}>
          {ctxLoading ? (
            <div style={{ fontSize: "13px", color: "rgba(255,255,255,0.3)", fontFamily: "Inter,sans-serif", fontStyle: "italic" }}>
              Sophia is reviewing your production...
            </div>
          ) : (
            <p style={{
              color:      "rgba(255,255,255,0.88)",
              fontSize:   "14px",
              lineHeight: 1.65,
              margin:     0,
              fontFamily: "Inter, sans-serif",
              fontStyle:  "italic",
            }}>
              "{buildSophiaScript(phase, data, order, ctx)}"
            </p>
          )}
        </div>
      </div>

      {/* Phase input area */}
      <div style={{ flex: 1, overflowY: "auto", paddingRight: "4px" }}>
        {phase === 0 && <Phase0Scene data={data} onChange={setData} order={order} ctx={ctx} />}
        {phase === 1 && <Phase1Emotion data={data} onChange={setData} ctx={ctx} />}
        {phase === 2 && <Phase2Character data={data} onChange={setData} ctx={ctx} />}
        {phase === 3 && <Phase3Director data={data} onChange={setData} order={order} ctx={ctx} onAnalyze={handleAnalyze} analyzing={analyzing} />}
        {phase === 4 && <Phase4Confirm data={data} order={order} ctx={ctx} />}
      </div>

      {/* Navigation */}
      <div style={{
        display:      "flex",
        gap:          "12px",
        paddingTop:   "20px",
        borderTop:    "1px solid rgba(255,255,255,0.06)",
        marginTop:    "20px",
      }}>
        <button
          onClick={back}
          style={{
            padding:      "12px 20px",
            borderRadius: "10px",
            border:       "1.5px solid rgba(255,255,255,0.12)",
            background:   "transparent",
            color:        "rgba(255,255,255,0.6)",
            fontSize:     "14px",
            cursor:       "pointer",
            fontFamily:   "Inter, sans-serif",
          }}
        >
          {phase === 0 ? "Cancel" : "← Back"}
        </button>

        <button
          onClick={advance}
          disabled={!canAdvance()}
          style={{
            flex:         1,
            padding:      "12px 24px",
            borderRadius: "10px",
            border:       "none",
            background:   canAdvance()
              ? "linear-gradient(135deg, #D4AF37, #B8922A)"
              : "rgba(255,255,255,0.06)",
            color:        canAdvance() ? "#050B1A" : "rgba(255,255,255,0.3)",
            fontSize:     "14px",
            fontWeight:   "600",
            cursor:       canAdvance() ? "pointer" : "not-allowed",
            fontFamily:   "Inter, sans-serif",
            transition:   "all 0.2s",
          }}
        >
          {phase === 4 ? "Submit Revision Request" : "Continue →"}
        </button>
      </div>

      <style>{`
        @keyframes gm-spin  { to { transform: rotate(360deg); } }
        @keyframes gm-pulse { 0%,100% { opacity: 0.4; } 50% { opacity: 0.9; } }
      `}</style>
    </div>
  );
};

export default SophiaRevisionGuide;
