// ============================================================
// RevisionIntakeFlow — Full wizard shell
// Wraps SophiaRevisionGuide, handles auth check, order selection,
// submission, and success state.
// ============================================================

import React, { useState, useEffect } from "react";
import { SophiaRevisionGuide } from "./SophiaRevisionGuide";
import type { OrderContext } from "./SophiaRevisionGuide";
import type { RevisionData } from "../../types/revision";

// ─── Step types ────────────────────────────────────────────────────────────────

type WizardStep = "loading" | "select-order" | "guide" | "submitting" | "success" | "error" | "ineligible";

interface OrderSummary {
  orderId: string;
  productSlug: string;
  productName: string;
  tier: "starter" | "premium" | "elite";
  productionId?: string;
  songUrl?: string;
  videoUrl?: string;
  revisionsUsed: number;
  revisionsMax: number;
  createdAt: string;
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const cardStyle: React.CSSProperties = {
  background: "rgba(11,23,54,0.6)",
  border: "1.5px solid rgba(212,175,55,0.18)",
  borderRadius: "16px",
  padding: "24px",
  backdropFilter: "blur(16px)",
};

const goldBtn: React.CSSProperties = {
  padding: "13px 28px",
  borderRadius: "10px",
  border: "none",
  background: "linear-gradient(135deg, #D4AF37, #B8922A)",
  color: "#050B1A",
  fontSize: "15px",
  fontWeight: "700",
  cursor: "pointer",
  fontFamily: "Inter, sans-serif",
  letterSpacing: "0.02em",
};

const ghostBtn: React.CSSProperties = {
  padding: "13px 24px",
  borderRadius: "10px",
  border: "1.5px solid rgba(255,255,255,0.12)",
  background: "transparent",
  color: "rgba(255,255,255,0.6)",
  fontSize: "14px",
  cursor: "pointer",
  fontFamily: "Inter, sans-serif",
};

// ─── Loading skeleton ─────────────────────────────────────────────────────────

const LoadingState: React.FC = () => (
  <div style={{ display: "flex", flexDirection: "column", gap: "16px", padding: "32px 0" }}>
    {[1, 2, 3].map((i) => (
      <div key={i} style={{
        height: "88px",
        borderRadius: "12px",
        background: "rgba(255,255,255,0.04)",
        animation: "shimmer 1.5s ease infinite",
        animationDelay: `${i * 0.15}s`,
      }} />
    ))}
    <style>{`
      @keyframes shimmer {
        0%,100% { opacity: 0.4; }
        50%      { opacity: 0.8; }
      }
    `}</style>
  </div>
);

// ─── Order card ───────────────────────────────────────────────────────────────

const OrderCard: React.FC<{
  order: OrderSummary;
  onSelect: () => void;
}> = ({ order, onSelect }) => {
  const remaining = order.revisionsMax - order.revisionsUsed;
  const eligible = remaining > 0;
  const tierColors: Record<string, string> = {
    starter: "#64748B",
    premium: "#8B5CF6",
    elite: "#D4AF37",
  };

  return (
    <div
      onClick={eligible ? onSelect : undefined}
      style={{
        background: "rgba(11,23,54,0.5)",
        border: `1.5px solid ${eligible ? "rgba(212,175,55,0.2)" : "rgba(255,255,255,0.06)"}`,
        borderRadius: "12px",
        padding: "16px 20px",
        cursor: eligible ? "pointer" : "default",
        opacity: eligible ? 1 : 0.5,
        transition: "all 0.2s",
        display: "flex",
        alignItems: "center",
        gap: "16px",
      }}
      onMouseEnter={(e) => { if (eligible) (e.currentTarget as HTMLDivElement).style.borderColor = "rgba(212,175,55,0.5)"; }}
      onMouseLeave={(e) => { if (eligible) (e.currentTarget as HTMLDivElement).style.borderColor = "rgba(212,175,55,0.2)"; }}
    >
      {/* Icon */}
      <div style={{
        width: "48px",
        height: "48px",
        borderRadius: "12px",
        background: "rgba(212,175,55,0.1)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontSize: "22px",
        flexShrink: 0,
      }}>
        {order.videoUrl ? "🎬" : "🎵"}
      </div>

      {/* Info */}
      <div style={{ flex: 1 }}>
        <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "4px" }}>
          <span style={{ fontSize: "15px", fontWeight: "600", color: "#fff", fontFamily: "Playfair Display, serif" }}>
            {order.productName}
          </span>
          <span style={{
            fontSize: "10px",
            background: tierColors[order.tier] + "33",
            color: tierColors[order.tier],
            border: `1px solid ${tierColors[order.tier]}44`,
            padding: "2px 8px",
            borderRadius: "10px",
            textTransform: "uppercase",
            letterSpacing: "0.08em",
            fontFamily: "Inter,sans-serif",
          }}>
            {order.tier}
          </span>
        </div>
        <div style={{ fontSize: "12px", color: "rgba(255,255,255,0.4)", fontFamily: "Inter,sans-serif" }}>
          Order #{order.orderId.slice(0, 8)} · {new Date(order.createdAt).toLocaleDateString()}
        </div>
      </div>

      {/* Revision count */}
      <div style={{ textAlign: "right", flexShrink: 0 }}>
        <div style={{
          fontSize: "20px",
          fontWeight: "700",
          color: remaining > 0 ? "#D4AF37" : "rgba(255,255,255,0.3)",
          fontFamily: "Playfair Display, serif",
        }}>
          {remaining}/{order.revisionsMax}
        </div>
        <div style={{ fontSize: "10px", color: "rgba(255,255,255,0.4)", fontFamily: "Inter,sans-serif" }}>
          revisions left
        </div>
      </div>

      {eligible && (
        <div style={{ color: "#D4AF37", fontSize: "18px", flexShrink: 0 }}>→</div>
      )}
    </div>
  );
};

// ─── Main Component ────────────────────────────────────────────────────────────

export const RevisionIntakeFlow: React.FC<{ onDone?: () => void }> = ({ onDone }) => {
  const [step, setStep] = useState<WizardStep>("loading");
  const [orders, setOrders] = useState<OrderSummary[]>([]);
  const [selectedOrder, setSelectedOrder] = useState<OrderSummary | null>(null);
  const [submitError, setSubmitError] = useState<string>("");
  const [submittedId, setSubmittedId] = useState<string>("");

  // Fetch eligible orders
  useEffect(() => {
    (async () => {
      try {
        const res = await fetch("/api/revisions/my", { credentials: "include" });
        if (!res.ok) throw new Error(`${res.status}`);
        const json = await res.json();
        // Map API response to OrderSummary
        // The /my endpoint returns revision history — we need eligible orders
        // Fetch from orders endpoint instead
        const ordersRes = await fetch("/api/orders/my", { credentials: "include" });
        const ordersJson = await ordersRes.json();
        const eligible: OrderSummary[] = (ordersJson.orders || []).map((o: any) => ({
          orderId: o.id,
          productSlug: o.productSlug || o.product_slug || "",
          productName: o.productName || o.product_name || o.productSlug || "Creation",
          tier: o.tier || "starter",
          productionId: o.productionId || o.production_id,
          songUrl: o.songUrl || o.song_url,
          videoUrl: o.videoUrl || o.video_url,
          revisionsUsed: o.revisionsUsed ?? 0,
          revisionsMax: o.tier === "elite" ? 3 : o.tier === "premium" ? 2 : 1,
          createdAt: o.createdAt || o.created_at || new Date().toISOString(),
        }));
        setOrders(eligible);
        setStep(eligible.length === 0 ? "ineligible" : "select-order");
      } catch (e) {
        setStep("error");
        setSubmitError("Could not load your orders. Please try again.");
      }
    })();
  }, []);

  const handleGuideComplete = async (revisionData: RevisionData) => {
    if (!selectedOrder) return;
    setStep("submitting");
    setSubmitError("");

    try {
      const payload: any = {
        orderId: selectedOrder.orderId,
        productionId: selectedOrder.productionId,
        productSlug: selectedOrder.productSlug,
        revisionType: revisionData.revisionType,
        customerNotes: revisionData.customerNotes,
        sophiaDirective: revisionData.sophiaDirective,
      };

      if (revisionData.revisionType === "song" || revisionData.revisionType === "both") {
        payload.song = {
          currentSongUrl: selectedOrder.songUrl || "",
          changes: revisionData.songChanges,
          emotionalIntent: revisionData.emotionalIntent,
        };
      }

      if (revisionData.revisionType === "video" || revisionData.revisionType === "both") {
        payload.video = {
          currentVideoUrl: selectedOrder.videoUrl || "",
          shotIndex: revisionData.shotIndex,
          retake_start_time: revisionData.retakeStart,
          retake_duration: revisionData.retakeDuration,
          changes: revisionData.videoChanges,
          emotionalIntent: revisionData.emotionalIntent,
        };
      }

      const res = await fetch("/api/revisions/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(payload),
      });

      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Submission failed");

      setSubmittedId(json.revisionId || json.id || "");
      setStep("success");
    } catch (e: any) {
      setSubmitError(e.message || "Submission failed. Please try again.");
      setStep("error");
    }
  };

  // ─── Render by step ─────────────────────────────────────────────────────────

  return (
    <div style={{
      minHeight: "100vh",
      background: "#050B1A",
      padding: "40px 20px",
      display: "flex",
      alignItems: "flex-start",
      justifyContent: "center",
    }}>
      <div style={{ width: "100%", maxWidth: "680px" }}>

        {/* Header */}
        <div style={{ marginBottom: "32px", textAlign: "center" }}>
          <div style={{ fontSize: "11px", color: "rgba(212,175,55,0.7)", letterSpacing: "0.2em", textTransform: "uppercase", fontFamily: "Inter,sans-serif", marginBottom: "10px" }}>
            Line 2 · AI Songs & Music Video
          </div>
          <h1 style={{ fontFamily: "Playfair Display, serif", fontSize: "clamp(28px,5vw,40px)", color: "#fff", margin: "0 0 10px 0", fontWeight: "700" }}>
            Revision Studio
          </h1>
          <p style={{ color: "rgba(255,255,255,0.5)", fontSize: "15px", fontFamily: "Inter,sans-serif", margin: 0 }}>
            Sophia will guide you through every change — from emotion to execution.
          </p>
        </div>

        {/* ── Loading ── */}
        {step === "loading" && (
          <div style={cardStyle}>
            <div style={{ fontSize: "14px", color: "rgba(255,255,255,0.5)", fontFamily: "Inter,sans-serif", marginBottom: "16px" }}>
              Loading your creations...
            </div>
            <LoadingState />
          </div>
        )}

        {/* ── Select Order ── */}
        {step === "select-order" && (
          <div style={cardStyle}>
            <div style={{ fontSize: "13px", color: "rgba(255,255,255,0.5)", fontFamily: "Inter,sans-serif", marginBottom: "20px" }}>
              Choose which creation to revise:
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
              {orders.map((o) => (
                <OrderCard
                  key={o.orderId}
                  order={o}
                  onSelect={() => {
                    setSelectedOrder(o);
                    setStep("guide");
                  }}
                />
              ))}
            </div>
          </div>
        )}

        {/* ── Sophia Guide ── */}
        {step === "guide" && selectedOrder && (
          <div style={{ ...cardStyle, height: "auto", minHeight: "580px", display: "flex", flexDirection: "column" }}>
            <SophiaRevisionGuide
              order={{
                orderId: selectedOrder.orderId,
                productSlug: selectedOrder.productSlug,
                tier: selectedOrder.tier,
                productionId: selectedOrder.productionId,
                songUrl: selectedOrder.songUrl,
                videoUrl: selectedOrder.videoUrl,
                title: selectedOrder.productName,
              }}
              onComplete={handleGuideComplete}
              onCancel={() => { setSelectedOrder(null); setStep("select-order"); }}
              avatarProvider="static"
            />
          </div>
        )}

        {/* ── Submitting ── */}
        {step === "submitting" && (
          <div style={{ ...cardStyle, textAlign: "center", padding: "60px 24px" }}>
            <div style={{
              width: "56px",
              height: "56px",
              border: "3px solid #D4AF37",
              borderTopColor: "transparent",
              borderRadius: "50%",
              animation: "spin 0.9s linear infinite",
              margin: "0 auto 24px",
            }} />
            <h3 style={{ fontFamily: "Playfair Display, serif", fontSize: "22px", color: "#fff", margin: "0 0 8px" }}>
              Sending to Production
            </h3>
            <p style={{ color: "rgba(255,255,255,0.4)", fontFamily: "Inter,sans-serif", fontSize: "14px", margin: 0 }}>
              Sophia is packaging your directive...
            </p>
            <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
          </div>
        )}

        {/* ── Success ── */}
        {step === "success" && (
          <div style={{ ...cardStyle, textAlign: "center", padding: "60px 24px" }}>
            <div style={{
              width: "64px",
              height: "64px",
              background: "rgba(212,175,55,0.12)",
              border: "2px solid #D4AF37",
              borderRadius: "50%",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: "28px",
              margin: "0 auto 24px",
            }}>
              ✓
            </div>
            <h3 style={{ fontFamily: "Playfair Display, serif", fontSize: "24px", color: "#D4AF37", margin: "0 0 12px" }}>
              Revision Submitted
            </h3>
            <p style={{ color: "rgba(255,255,255,0.6)", fontFamily: "Inter,sans-serif", fontSize: "14px", lineHeight: 1.7, margin: "0 0 8px" }}>
              Your request has been received and will be reviewed within 24–48 hours.
            </p>
            {submittedId && (
              <p style={{ color: "rgba(255,255,255,0.3)", fontFamily: "Inter,sans-serif", fontSize: "12px", margin: "0 0 32px" }}>
                Reference: {submittedId.slice(0, 12)}...
              </p>
            )}
            <div style={{ display: "flex", gap: "12px", justifyContent: "center" }}>
              <button style={ghostBtn} onClick={() => { setStep("select-order"); setSelectedOrder(null); }}>
                Submit Another
              </button>
              <button style={goldBtn} onClick={() => onDone?.() || window.history.back()}>
                Back to Dashboard
              </button>
            </div>
          </div>
        )}

        {/* ── Ineligible ── */}
        {step === "ineligible" && (
          <div style={{ ...cardStyle, textAlign: "center", padding: "60px 24px" }}>
            <div style={{ fontSize: "40px", marginBottom: "20px" }}>🎵</div>
            <h3 style={{ fontFamily: "Playfair Display, serif", fontSize: "22px", color: "#fff", margin: "0 0 12px" }}>
              No Active Orders
            </h3>
            <p style={{ color: "rgba(255,255,255,0.5)", fontFamily: "Inter,sans-serif", fontSize: "14px", lineHeight: 1.7, margin: "0 0 28px" }}>
              You need a completed creation to request a revision. Start your story to get your first song or film.
            </p>
            <button style={goldBtn} onClick={() => window.location.href = "/onboarding"}>
              Start My Story →
            </button>
          </div>
        )}

        {/* ── Error ── */}
        {step === "error" && (
          <div style={{ ...cardStyle, textAlign: "center", padding: "60px 24px" }}>
            <div style={{ fontSize: "40px", marginBottom: "20px" }}>⚠️</div>
            <h3 style={{ fontFamily: "Playfair Display, serif", fontSize: "22px", color: "#fff", margin: "0 0 12px" }}>
              Something Went Wrong
            </h3>
            <p style={{ color: "rgba(255,255,255,0.5)", fontFamily: "Inter,sans-serif", fontSize: "14px", margin: "0 0 8px" }}>
              {submitError}
            </p>
            <div style={{ display: "flex", gap: "12px", justifyContent: "center", marginTop: "24px" }}>
              <button style={ghostBtn} onClick={() => window.location.reload()}>
                Retry
              </button>
              <button style={goldBtn} onClick={() => window.location.href = "/dashboard"}>
                Go to Dashboard
              </button>
            </div>
          </div>
        )}

      </div>
    </div>
  );
};

export default RevisionIntakeFlow;
