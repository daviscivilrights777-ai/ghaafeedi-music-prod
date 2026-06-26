// ============================================================
// /admin/revisions — Admin Revision Queue
// KPI row · Table · Approve/Reject · Before/After player · Payload modal
// ============================================================

import React, { useState, useEffect, useCallback } from "react";
import { useLocation } from "wouter";

// ─── Types ────────────────────────────────────────────────────────────────────

interface RevisionRow {
  id: string;
  userId: string;
  orderId: string;
  productSlug: string;
  tier: string;
  revisionRound: number;
  status: "pending" | "approved" | "rejected" | "in_progress" | "complete";
  revisionType: string;
  customerNotes?: string;
  sophiaDirective?: string;
  adminNotes?: string;
  rejectionReason?: string;
  jobId?: string;
  songPayload?: any;
  videoPayload?: any;
  createdAt: string;
  updatedAt: string;
  userEmail?: string;
}

interface KPIs {
  total: number;
  pending: number;
  approved: number;
  rejected: number;
  inProgress: number;
  complete: number;
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const COLORS = {
  gold: "#D4AF37",
  navy: "#0B1736",
  bg: "#050B1A",
  surface: "rgba(11,23,54,0.6)",
  border: "rgba(212,175,55,0.18)",
  text: "#FFFFFF",
  textMuted: "rgba(255,255,255,0.45)",
};

const STATUS_COLORS: Record<string, string> = {
  pending:     "#F59E0B",
  approved:    "#10B981",
  rejected:    "#EF4444",
  in_progress: "#8B5CF6",
  complete:    "#D4AF37",
};

// ─── KPI Card ─────────────────────────────────────────────────────────────────

const KPICard: React.FC<{ label: string; value: number; color?: string }> = ({ label, value, color = COLORS.gold }) => (
  <div style={{
    background: COLORS.surface,
    border: `1.5px solid ${COLORS.border}`,
    borderRadius: "12px",
    padding: "18px 20px",
    flex: "1 1 120px",
    minWidth: "100px",
  }}>
    <div style={{ fontSize: "28px", fontWeight: "700", color, fontFamily: "Playfair Display, serif", lineHeight: 1 }}>
      {value}
    </div>
    <div style={{ fontSize: "11px", color: COLORS.textMuted, textTransform: "uppercase", letterSpacing: "0.1em", fontFamily: "Inter,sans-serif", marginTop: "6px" }}>
      {label}
    </div>
  </div>
);

// ─── Status badge ─────────────────────────────────────────────────────────────

const StatusBadge: React.FC<{ status: string }> = ({ status }) => (
  <span style={{
    padding: "3px 10px",
    borderRadius: "10px",
    fontSize: "11px",
    fontWeight: "600",
    background: (STATUS_COLORS[status] || "#888") + "22",
    color: STATUS_COLORS[status] || "#888",
    border: `1px solid ${(STATUS_COLORS[status] || "#888")}44`,
    fontFamily: "Inter,sans-serif",
    textTransform: "uppercase",
    letterSpacing: "0.06em",
    whiteSpace: "nowrap",
  }}>
    {status.replace("_", " ")}
  </span>
);

// ─── Payload Modal ────────────────────────────────────────────────────────────

const PayloadModal: React.FC<{ revision: RevisionRow; onClose: () => void }> = ({ revision, onClose }) => {
  const payload = {
    song: revision.songPayload,
    video: revision.videoPayload,
    sophiaDirective: revision.sophiaDirective,
    customerNotes: revision.customerNotes,
  };

  return (
    <div
      style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.8)", zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center", padding: "20px" }}
      onClick={onClose}
    >
      <div
        style={{
          background: "#0A1428",
          border: `1.5px solid ${COLORS.border}`,
          borderRadius: "16px",
          padding: "24px",
          maxWidth: "680px",
          width: "100%",
          maxHeight: "80vh",
          overflow: "auto",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "20px" }}>
          <h3 style={{ margin: 0, fontFamily: "Playfair Display, serif", color: COLORS.text, fontSize: "20px" }}>
            Revision Payload
          </h3>
          <button onClick={onClose} style={{ background: "none", border: "none", color: COLORS.textMuted, cursor: "pointer", fontSize: "20px" }}>×</button>
        </div>

        {/* Sophia Directive */}
        {revision.sophiaDirective && (
          <div style={{ marginBottom: "20px" }}>
            <div style={{ fontSize: "11px", color: "rgba(212,175,55,0.7)", letterSpacing: "0.1em", textTransform: "uppercase", fontFamily: "Inter,sans-serif", marginBottom: "8px" }}>
              Sophia's Retake Directive
            </div>
            <div style={{ background: "rgba(212,175,55,0.06)", border: "1px solid rgba(212,175,55,0.2)", borderRadius: "10px", padding: "14px", color: "rgba(255,255,255,0.85)", fontSize: "14px", lineHeight: 1.7, fontFamily: "Inter,sans-serif" }}>
              {revision.sophiaDirective}
            </div>
          </div>
        )}

        {/* Customer Notes */}
        {revision.customerNotes && (
          <div style={{ marginBottom: "20px" }}>
            <div style={{ fontSize: "11px", color: "rgba(212,175,55,0.7)", letterSpacing: "0.1em", textTransform: "uppercase", fontFamily: "Inter,sans-serif", marginBottom: "8px" }}>
              Customer Notes
            </div>
            <div style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: "10px", padding: "14px", color: "rgba(255,255,255,0.7)", fontSize: "13px", lineHeight: 1.65, fontFamily: "Inter,sans-serif" }}>
              {revision.customerNotes}
            </div>
          </div>
        )}

        {/* Raw payload */}
        <div>
          <div style={{ fontSize: "11px", color: "rgba(212,175,55,0.7)", letterSpacing: "0.1em", textTransform: "uppercase", fontFamily: "Inter,sans-serif", marginBottom: "8px" }}>
            Full Payload (JSON)
          </div>
          <pre style={{
            background: "rgba(0,0,0,0.4)",
            border: "1px solid rgba(255,255,255,0.06)",
            borderRadius: "10px",
            padding: "16px",
            color: "#6EE7B7",
            fontSize: "12px",
            fontFamily: "monospace",
            overflow: "auto",
            maxHeight: "300px",
            margin: 0,
          }}>
            {JSON.stringify(payload, null, 2)}
          </pre>
        </div>

        {/* Before/After media */}
        {(revision.videoPayload as any)?.currentVideoUrl && (
          <div style={{ marginTop: "20px" }}>
            <div style={{ fontSize: "11px", color: "rgba(212,175,55,0.7)", letterSpacing: "0.1em", textTransform: "uppercase", fontFamily: "Inter,sans-serif", marginBottom: "8px" }}>
              Original Video (Before)
            </div>
            <video
              src={(revision.videoPayload as any).currentVideoUrl}
              controls
              style={{ width: "100%", borderRadius: "10px", background: "#000", maxHeight: "200px" }}
            />
          </div>
        )}
      </div>
    </div>
  );
};

// ─── Approve / Reject Modal ───────────────────────────────────────────────────

const ActionModal: React.FC<{
  revision: RevisionRow;
  action: "approve" | "reject";
  onClose: () => void;
  onSuccess: () => void;
}> = ({ revision, action, onClose, onSuccess }) => {
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async () => {
    setLoading(true);
    setError("");
    try {
      const body: any = {};
      if (action === "approve") body.adminNotes = notes;
      if (action === "reject") body.reason = notes;

      const res = await fetch(`/api/admin/revisions/${revision.id}/${action}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(body),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Action failed");
      onSuccess();
      onClose();
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  const isApprove = action === "approve";
  const btnColor = isApprove ? "#10B981" : "#EF4444";

  return (
    <div
      style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.8)", zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center", padding: "20px" }}
      onClick={onClose}
    >
      <div
        style={{ background: "#0A1428", border: `1.5px solid ${COLORS.border}`, borderRadius: "16px", padding: "28px", maxWidth: "480px", width: "100%" }}
        onClick={(e) => e.stopPropagation()}
      >
        <h3 style={{ margin: "0 0 20px", fontFamily: "Playfair Display, serif", color: COLORS.text, fontSize: "20px" }}>
          {isApprove ? "✓ Approve Revision" : "✕ Reject Revision"}
        </h3>

        <div style={{ marginBottom: "20px" }}>
          <div style={{ fontSize: "11px", color: "rgba(212,175,55,0.7)", letterSpacing: "0.1em", textTransform: "uppercase", fontFamily: "Inter,sans-serif", marginBottom: "8px" }}>
            {isApprove ? "Admin Notes (optional)" : "Rejection Reason (required)"}
          </div>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={4}
            placeholder={isApprove
              ? "Optional notes for the production team..."
              : "Explain why this revision cannot be processed..."
            }
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
              boxSizing: "border-box",
            }}
          />
        </div>

        {error && (
          <div style={{ color: "#EF4444", fontSize: "13px", fontFamily: "Inter,sans-serif", marginBottom: "16px" }}>{error}</div>
        )}

        <div style={{ display: "flex", gap: "12px" }}>
          <button
            onClick={onClose}
            style={{ flex: 1, padding: "12px", borderRadius: "10px", border: "1.5px solid rgba(255,255,255,0.12)", background: "transparent", color: "rgba(255,255,255,0.6)", fontSize: "14px", cursor: "pointer", fontFamily: "Inter,sans-serif" }}
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={loading || (!isApprove && !notes.trim())}
            style={{
              flex: 1,
              padding: "12px",
              borderRadius: "10px",
              border: "none",
              background: loading ? "rgba(255,255,255,0.1)" : btnColor,
              color: "#fff",
              fontSize: "14px",
              fontWeight: "600",
              cursor: loading ? "not-allowed" : "pointer",
              fontFamily: "Inter,sans-serif",
            }}
          >
            {loading ? "Processing..." : isApprove ? "Approve & Dispatch" : "Reject"}
          </button>
        </div>
      </div>
    </div>
  );
};

// ─── Main Admin Panel ─────────────────────────────────────────────────────────

const AdminRevisions: React.FC = () => {
  const [, setLocation] = useLocation();
  const [revisions, setRevisions] = useState<RevisionRow[]>([]);
  const [kpis, setKpis] = useState<KPIs>({ total: 0, pending: 0, approved: 0, rejected: 0, inProgress: 0, complete: 0 });
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState("pending");
  const [selectedRevision, setSelectedRevision] = useState<RevisionRow | null>(null);
  const [modalType, setModalType] = useState<"payload" | "approve" | "reject" | null>(null);
  const [authChecked, setAuthChecked] = useState(false);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [listRes, kpiRes] = await Promise.all([
        fetch(`/api/admin/revisions?status=${statusFilter}&limit=50`, { credentials: "include" }),
        fetch("/api/admin/revisions/kpis", { credentials: "include" }),
      ]);

      if (listRes.status === 403) {
        setLocation("/admin");
        return;
      }

      const listJson = await listRes.json();
      setRevisions(listJson.revisions || []);

      if (kpiRes.ok) {
        const kpiJson = await kpiRes.json();
        setKpis(kpiJson);
      } else {
        // Derive KPIs from list if dedicated endpoint isn't available
        const all = listJson.revisions || [];
        const byStatus = (s: string) => all.filter((r: RevisionRow) => r.status === s).length;
        setKpis({
          total: listJson.total || all.length,
          pending: byStatus("pending"),
          approved: byStatus("approved"),
          rejected: byStatus("rejected"),
          inProgress: byStatus("in_progress"),
          complete: byStatus("complete"),
        });
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, [statusFilter, setLocation]);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch("/api/auth/get-session", { credentials: "include" });
        const json = await res.json();
        if (!json?.user?.id) { setLocation("/signin"); return; }
        setAuthChecked(true);
        fetchData();
      } catch {
        setLocation("/signin");
      }
    })();
  }, []); // eslint-disable-line

  useEffect(() => {
    if (authChecked) fetchData();
  }, [fetchData, authChecked]);

  const openModal = (r: RevisionRow, type: "payload" | "approve" | "reject") => {
    setSelectedRevision(r);
    setModalType(type);
  };

  const closeModal = () => {
    setSelectedRevision(null);
    setModalType(null);
  };

  // ─── Render ───────────────────────────────────────────────────────────────────

  return (
    <div style={{ minHeight: "100vh", background: COLORS.bg, color: COLORS.text, fontFamily: "Inter,sans-serif" }}>

      {/* Top bar */}
      <div style={{
        background: "rgba(11,23,54,0.95)",
        borderBottom: `1px solid ${COLORS.border}`,
        padding: "16px 24px",
        display: "flex",
        alignItems: "center",
        gap: "16px",
        position: "sticky",
        top: 0,
        zIndex: 50,
      }}>
        <button
          onClick={() => setLocation("/admin")}
          style={{ background: "none", border: "none", color: COLORS.textMuted, cursor: "pointer", fontSize: "14px", padding: "0" }}
        >
          ← Admin
        </button>
        <div style={{ width: "1px", height: "16px", background: "rgba(255,255,255,0.1)" }} />
        <span style={{ fontSize: "16px", fontWeight: "600", color: COLORS.text }}>Revision Queue</span>
        <div style={{ marginLeft: "auto" }}>
          <button
            onClick={fetchData}
            style={{
              padding: "8px 16px",
              borderRadius: "8px",
              border: "1.5px solid rgba(212,175,55,0.3)",
              background: "rgba(212,175,55,0.08)",
              color: COLORS.gold,
              fontSize: "12px",
              cursor: "pointer",
            }}
          >
            ↻ Refresh
          </button>
        </div>
      </div>

      <div style={{ maxWidth: "1200px", margin: "0 auto", padding: "28px 24px" }}>

        {/* KPI Row */}
        <div style={{ display: "flex", gap: "12px", flexWrap: "wrap", marginBottom: "28px" }}>
          <KPICard label="Total" value={kpis.total} />
          <KPICard label="Pending" value={kpis.pending} color={STATUS_COLORS.pending} />
          <KPICard label="Approved" value={kpis.approved} color={STATUS_COLORS.approved} />
          <KPICard label="Rejected" value={kpis.rejected} color={STATUS_COLORS.rejected} />
          <KPICard label="In Progress" value={kpis.inProgress} color={STATUS_COLORS.in_progress} />
          <KPICard label="Complete" value={kpis.complete} color={STATUS_COLORS.complete} />
        </div>

        {/* Filter tabs */}
        <div style={{ display: "flex", gap: "8px", marginBottom: "20px", flexWrap: "wrap" }}>
          {["all", "pending", "approved", "rejected", "in_progress", "complete"].map((s) => (
            <button
              key={s}
              onClick={() => setStatusFilter(s)}
              style={{
                padding: "7px 16px",
                borderRadius: "8px",
                border: `1.5px solid ${statusFilter === s ? COLORS.gold : "rgba(255,255,255,0.1)"}`,
                background: statusFilter === s ? "rgba(212,175,55,0.12)" : "transparent",
                color: statusFilter === s ? COLORS.gold : COLORS.textMuted,
                fontSize: "12px",
                cursor: "pointer",
                textTransform: "capitalize",
                transition: "all 0.2s",
              }}
            >
              {s.replace("_", " ")}
            </button>
          ))}
        </div>

        {/* Table */}
        {loading ? (
          <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
            {[1, 2, 3, 4].map((i) => (
              <div key={i} style={{ height: "64px", borderRadius: "10px", background: "rgba(255,255,255,0.04)", animation: "shimmer 1.5s ease infinite", animationDelay: `${i * 0.12}s` }} />
            ))}
            <style>{`@keyframes shimmer { 0%,100%{opacity:.4}50%{opacity:.8} }`}</style>
          </div>
        ) : revisions.length === 0 ? (
          <div style={{ textAlign: "center", padding: "60px", color: COLORS.textMuted, fontSize: "15px" }}>
            No revision requests matching this filter.
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
            {/* Table header */}
            <div style={{
              display: "grid",
              gridTemplateColumns: "1fr 100px 80px 80px 90px 180px",
              gap: "12px",
              padding: "10px 16px",
              fontSize: "10px",
              color: COLORS.textMuted,
              textTransform: "uppercase",
              letterSpacing: "0.1em",
            }}>
              <span>Revision</span>
              <span>Type</span>
              <span>Tier</span>
              <span>Round</span>
              <span>Status</span>
              <span>Actions</span>
            </div>

            {revisions.map((r) => (
              <div
                key={r.id}
                style={{
                  background: COLORS.surface,
                  border: `1.5px solid ${COLORS.border}`,
                  borderRadius: "12px",
                  padding: "14px 16px",
                  display: "grid",
                  gridTemplateColumns: "1fr 100px 80px 80px 90px 180px",
                  gap: "12px",
                  alignItems: "center",
                  transition: "border-color 0.2s",
                }}
                onMouseEnter={(e) => { (e.currentTarget as HTMLDivElement).style.borderColor = "rgba(212,175,55,0.35)"; }}
                onMouseLeave={(e) => { (e.currentTarget as HTMLDivElement).style.borderColor = COLORS.border; }}
              >
                {/* Info */}
                <div>
                  <div style={{ fontSize: "14px", fontWeight: "600", color: COLORS.text, marginBottom: "3px", fontFamily: "Playfair Display,serif" }}>
                    {r.productSlug.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())}
                  </div>
                  <div style={{ fontSize: "11px", color: COLORS.textMuted }}>
                    #{r.id.slice(0, 8)} · {new Date(r.createdAt).toLocaleDateString()}
                    {r.userEmail && ` · ${r.userEmail}`}
                  </div>
                  {r.sophiaDirective && (
                    <div style={{ fontSize: "11px", color: "rgba(212,175,55,0.6)", marginTop: "4px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: "300px" }}>
                      ✦ {r.sophiaDirective}
                    </div>
                  )}
                </div>

                {/* Type */}
                <span style={{ fontSize: "12px", color: COLORS.textMuted, textTransform: "capitalize" }}>
                  {r.revisionType}
                </span>

                {/* Tier */}
                <span style={{
                  fontSize: "11px",
                  color: r.tier === "elite" ? COLORS.gold : r.tier === "premium" ? "#8B5CF6" : "#64748B",
                  textTransform: "capitalize",
                  fontWeight: "600",
                }}>
                  {r.tier}
                </span>

                {/* Round */}
                <span style={{ fontSize: "14px", color: COLORS.text, fontWeight: "600" }}>
                  #{r.revisionRound}
                </span>

                {/* Status */}
                <StatusBadge status={r.status} />

                {/* Actions */}
                <div style={{ display: "flex", gap: "6px", flexWrap: "wrap" }}>
                  <button
                    onClick={() => openModal(r, "payload")}
                    style={{
                      padding: "5px 10px",
                      borderRadius: "6px",
                      border: "1px solid rgba(255,255,255,0.12)",
                      background: "transparent",
                      color: COLORS.textMuted,
                      fontSize: "11px",
                      cursor: "pointer",
                    }}
                  >
                    View
                  </button>
                  {r.status === "pending" && (
                    <>
                      <button
                        onClick={() => openModal(r, "approve")}
                        style={{
                          padding: "5px 10px",
                          borderRadius: "6px",
                          border: "1px solid #10B98144",
                          background: "#10B98122",
                          color: "#10B981",
                          fontSize: "11px",
                          cursor: "pointer",
                        }}
                      >
                        ✓ Approve
                      </button>
                      <button
                        onClick={() => openModal(r, "reject")}
                        style={{
                          padding: "5px 10px",
                          borderRadius: "6px",
                          border: "1px solid #EF444444",
                          background: "#EF444422",
                          color: "#EF4444",
                          fontSize: "11px",
                          cursor: "pointer",
                        }}
                      >
                        ✕ Reject
                      </button>
                    </>
                  )}
                  {r.jobId && (
                    <span style={{ fontSize: "10px", color: "rgba(212,175,55,0.5)", padding: "5px 4px" }}>
                      Job: {r.jobId.slice(0, 6)}
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Modals */}
      {selectedRevision && modalType === "payload" && (
        <PayloadModal revision={selectedRevision} onClose={closeModal} />
      )}
      {selectedRevision && modalType === "approve" && (
        <ActionModal revision={selectedRevision} action="approve" onClose={closeModal} onSuccess={fetchData} />
      )}
      {selectedRevision && modalType === "reject" && (
        <ActionModal revision={selectedRevision} action="reject" onClose={closeModal} onSuccess={fetchData} />
      )}
    </div>
  );
};

export default AdminRevisions;
