// ============================================================
// Ghaafeedi Music — Member Dashboard
// Full glass morphism, 9 sections, sidebar nav, mobile responsive
// ============================================================
import { useState, useEffect, useRef, useCallback } from "react";
import { useLocation } from "wouter";
import { motion, AnimatePresence } from "framer-motion";
import { authClient, clearToken } from "../lib/authClient";
import { api } from "../lib/api";

// ─── Design tokens ────────────────────────────────────────────
const GOLD   = "#D4AF37";
const GOLD2  = "#FFC24D";
const BG     = "#050B1A";
const NAVY   = "#0B1736";
const GLASS  = "rgba(255,255,255,0.04)";
const GLASS2 = "rgba(255,255,255,0.07)";
const BORDER = "rgba(212,175,55,0.15)";
const BORDER2 = "rgba(255,255,255,0.07)";

// ─── Types ─────────────────────────────────────────────────────
interface Member { id: string; memberId: string; status: string; tier: string; joinedAt: string; email?: string; name?: string; subscriptions?: Sub[]; }
interface Order  { id: string; productSlug: string; productName: string; tier: string; priceCents: number; status: string; createdAt: string; }
interface Production { id: string; orderId: string; productSlug: string; status: string; currentStage: string; revisionCount: number; maxRevisions: number; estimatedDeliveryAt?: string; deliveredAt?: string; createdAt: string; updatedAt?: string; deliverableKeys?: string[]; }
interface Sub    { id: string; plan: string; status: string; provider: string; currentPeriodEnd?: string; quotaSongs?: number; quotaUsed?: number; renewalAt?: string; cancelAtPeriodEnd?: boolean; }
interface Asset  { id: string; assetType: string; filename?: string; cdnUrl?: string; mimeType?: string; fileSizeBytes?: number; createdAt: string; productionId?: string; }
interface BillingEvent { id: string; eventType: string; amountCents: number; provider?: string; createdAt: string; }
interface Ticket { id: string; subject: string; status: string; priority: string; createdAt: string; updatedAt?: string; body: string; }
interface Notification { id: string; type: string; title: string; body: string; createdAt: string; read: boolean; link?: string; }
interface Referral { code: string; clicks: number; conversions: number; creditsCents: number; }
// Phase 7 — Lip Sync job shape returned from API
interface LipSyncJob {
  id: string;
  userId: string;
  orderId?: string | null;
  productionId?: string | null;
  jobType: string;
  status: string; // queued | dispatched | processing | complete | failed | cancelled
  provider?: string | null;
  providerJobId?: string | null;
  outputUrl?: string | null;
  thumbnailUrl?: string | null;
  durationSeconds?: number | null;
  errorMessage?: string | null;
  queuedAt: string;
  completedAt?: string | null;
  estimatedCostCents?: number | null;
  inputPayload?: Record<string, unknown>;
}

interface DashSummary {
  member: Member | null;
  orders: Order[];
  productions: Production[];
  subscriptions: Sub[];
  billing: BillingEvent[];
  assets: Asset[];
  lipsyncJobs: LipSyncJob[];
  referral: Referral;
  tickets: Ticket[];
}

// ─── Stage config ───────────────────────────────────────────────
const STAGES: { key: string; label: string; icon: string; pct: number; color: string }[] = [
  { key: "queued",             label: "Queued",           icon: "⏳", pct: 5,   color: "#64748B" },
  { key: "story_submitted",    label: "Story Received",   icon: "📖", pct: 15,  color: "#8B5CF6" },
  { key: "media_uploaded",     label: "Media Uploaded",   icon: "📁", pct: 25,  color: "#6366F1" },
  { key: "ai_analyzing",       label: "AI Analyzing",     icon: "🧠", pct: 38,  color: "#F59E0B" },
  { key: "ai_complete",        label: "Analysis Done",    icon: "✅", pct: 50,  color: "#10B981" },
  { key: "music_generating",   label: "Composing Music",  icon: "🎵", pct: 62,  color: "#EC4899" },
  { key: "music_complete",     label: "Music Ready",      icon: "🎶", pct: 72,  color: "#10B981" },
  { key: "video_generating",   label: "Rendering Film",   icon: "🎬", pct: 82,  color: "#F97316" },
  { key: "video_complete",     label: "Film Ready",       icon: "🎞️", pct: 90,  color: "#10B981" },
  { key: "in_review",          label: "Quality Review",   icon: "🔍", pct: 94,  color: GOLD },
  { key: "revision_requested", label: "Revision Pending", icon: "✏️", pct: 88,  color: "#EF4444" },
  { key: "delivered",          label: "Delivered ✓",      icon: "🎁", pct: 100, color: "#22C55E" },
  { key: "archived",           label: "Archived",         icon: "📦", pct: 100, color: "#475569" },
];
const stageMap = Object.fromEntries(STAGES.map(s => [s.key, s]));

const STATUS_COLORS: Record<string, string> = {
  pending: "#F59E0B", processing: "#6366F1", completed: "#22C55E",
  failed: "#EF4444", refunded: "#64748B", active: "#22C55E",
  open: "#F59E0B", in_progress: "#6366F1", resolved: "#22C55E", closed: "#64748B",
};

type Tab = "overview" | "productions" | "deliverables" | "memberships" | "billing" | "revisions" | "support" | "referrals" | "settings";

const NAV: { id: Tab; label: string; icon: string }[] = [
  { id: "overview",     label: "Overview",        icon: "◈" },
  { id: "productions",  label: "Productions",     icon: "🎬" },
  { id: "deliverables", label: "Deliverables",    icon: "📦" },
  { id: "memberships",  label: "Memberships",     icon: "✦" },
  { id: "billing",      label: "Billing",         icon: "💳" },
  { id: "revisions",    label: "Revisions",       icon: "✏️" },
  { id: "support",      label: "Support",         icon: "💬" },
  { id: "referrals",    label: "Referrals",       icon: "🔗" },
  { id: "settings",     label: "Settings",        icon: "⚙️" },
];

// ─── Main Component ────────────────────────────────────────────
export default function Dashboard() {
  const [, setLocation] = useLocation();
  const { data: session, isPending } = authClient.useSession();
  const [tab, setTab] = useState<Tab>("overview");
  const [data, setData] = useState<DashSummary | null>(null);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const [copiedId, setCopiedId] = useState(false);
  const [copiedRef, setCopiedRef] = useState(false);

  // Parse ?tab= from URL
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const t = params.get("tab") as Tab | null;
    if (t && NAV.find(n => n.id === t)) setTab(t);
  }, []);

  useEffect(() => {
    if (isPending) return;
    if (!session) { setLocation("/signin?redirect=/dashboard"); return; }
    loadAll();
  }, [session, isPending]);

  async function loadAll() {
    setLoading(true);
    try {
      await (api as any).members.create.$post();
      const [summaryRes, notifRes] = await Promise.all([
        fetch("/api/dashboard/summary", { headers: authHeaders() }),
        fetch("/api/dashboard/notifications", { headers: authHeaders() }),
      ]);
      const summaryJson = await summaryRes.json();
      const notifJson   = await notifRes.json();
      // Only set data if the response has the expected shape (not an error object)
      if (summaryJson && !summaryJson.error) {
        setData({
          member:        summaryJson.member ?? null,
          orders:        Array.isArray(summaryJson.orders)        ? summaryJson.orders        : [],
          productions:   Array.isArray(summaryJson.productions)   ? summaryJson.productions   : [],
          subscriptions: Array.isArray(summaryJson.subscriptions) ? summaryJson.subscriptions : [],
          billing:       Array.isArray(summaryJson.billing)       ? summaryJson.billing       : [],
          assets:        Array.isArray(summaryJson.assets)        ? summaryJson.assets        : [],
          lipsyncJobs:   Array.isArray(summaryJson.lipsyncJobs)   ? summaryJson.lipsyncJobs   : [],
          referral:      summaryJson.referral ?? { code: "", clicks: 0, conversions: 0, creditsCents: 0 },
          tickets:       Array.isArray(summaryJson.tickets)       ? summaryJson.tickets       : [],
        } as DashSummary);
      }
      setNotifications((notifJson.notifications ?? []) as Notification[]);
    } catch (e) {
      console.error("[Dashboard]", e);
    } finally {
      setLoading(false);
    }
  }

  function authHeaders(): HeadersInit {
    const token = localStorage.getItem("gm_bearer_token");
    return token ? { Authorization: `Bearer ${token}` } : {};
  }

  const handleSignOut = async () => {
    await authClient.signOut();
    clearToken();
    setLocation("/");
  };

  const copyMemberId = () => {
    if (data?.member?.memberId) {
      navigator.clipboard.writeText(data.member.memberId).catch(() => {});
      setCopiedId(true);
      setTimeout(() => setCopiedId(false), 2000);
    }
  };

  const copyRefCode = (code: string) => {
    navigator.clipboard.writeText(`https://ghaafeedi.music?ref=${code}`).catch(() => {});
    setCopiedRef(true);
    setTimeout(() => setCopiedRef(false), 2000);
  };

  const unreadCount = notifications.filter(n => !n.read).length;
  const firstName = session?.user?.name?.split(" ")[0] ?? "Member";

  if (isPending || loading) return <LoadingScreen />;

  return (
    <div style={{ minHeight: "100vh", background: BG, fontFamily: "Inter, sans-serif", display: "flex", flexDirection: "column" }}>
      <style>{GLOBAL_CSS}</style>

      {/* Ambient background blobs */}
      <div className="gm-blob gm-blob-1" />
      <div className="gm-blob gm-blob-2" />

      {/* Top nav */}
      <TopNav
        firstName={firstName}
        unreadCount={unreadCount}
        notifOpen={notifOpen}
        notifications={notifications}
        onToggleNotif={() => setNotifOpen(v => !v)}
        onMenuToggle={() => setSidebarOpen(v => !v)}
        onSignOut={handleSignOut}
        setLocation={setLocation}
      />

      <div style={{ display: "flex", flex: 1, paddingTop: 64, position: "relative" }}>
        {/* Sidebar */}
        <Sidebar
          tab={tab}
          setTab={(t) => { setTab(t); setSidebarOpen(false); }}
          member={data?.member}
          productions={data?.productions ?? []}
          open={sidebarOpen}
          onClose={() => setSidebarOpen(false)}
        />

        {/* Sidebar overlay on mobile */}
        {sidebarOpen && (
          <div onClick={() => setSidebarOpen(false)}
            style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.6)", zIndex: 39, backdropFilter: "blur(4px)" }} />
        )}

        {/* Main content */}
        <main style={{ flex: 1, marginLeft: 0, minWidth: 0, padding: "32px 24px 80px" }} className="gm-main">
          <AnimatePresence mode="wait">
            <motion.div key={tab} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.22 }}>

              {tab === "overview"     && <OverviewTab data={data} setTab={setTab} setLocation={setLocation} copyMemberId={copyMemberId} copiedId={copiedId} />}
              {tab === "productions"  && <ProductionsTab productions={data?.productions ?? []} setLocation={setLocation} />}
              {tab === "deliverables" && <DeliverablesTab assets={data?.assets ?? []} productions={data?.productions ?? []} lipsyncJobs={data?.lipsyncJobs ?? []} member={data?.member} authHeaders={authHeaders} onRefresh={loadAll} />}
              {tab === "memberships"  && <MembershipsTab member={data?.member} subscriptions={data?.subscriptions ?? []} setLocation={setLocation} session={session} />}
              {tab === "billing"      && <BillingTab billing={data?.billing ?? []} orders={data?.orders ?? []} subscriptions={data?.subscriptions ?? []} />}
              {tab === "revisions"    && <RevisionsTab productions={data?.productions ?? []} authHeaders={authHeaders} onRefresh={loadAll} />}
              {tab === "support"      && <SupportTab tickets={data?.tickets ?? []} authHeaders={authHeaders} onRefresh={loadAll} />}
              {tab === "referrals"    && <ReferralsTab referral={data?.referral} copyRefCode={copyRefCode} copiedRef={copiedRef} />}
              {tab === "settings"     && <SettingsTab session={session} member={data?.member} authHeaders={authHeaders} onRefresh={loadAll} />}

            </motion.div>
          </AnimatePresence>
        </main>
      </div>

      {/* Sophia AI floating widget */}
      <SophiaWidget />
    </div>
  );
}

// ─── Top Navigation ───────────────────────────────────────────
function TopNav({ firstName, unreadCount, notifOpen, notifications, onToggleNotif, onMenuToggle, onSignOut, setLocation }: any) {
  return (
    <nav style={{
      position: "fixed", top: 0, left: 0, right: 0, zIndex: 50,
      height: 64, padding: "0 20px",
      background: "rgba(5,11,26,0.92)", backdropFilter: "blur(20px)",
      borderBottom: `1px solid ${BORDER}`,
      display: "flex", alignItems: "center", justifyContent: "space-between",
    }}>
      {/* Left: hamburger + logo */}
      <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
        <button onClick={onMenuToggle} className="gm-icon-btn gm-hamburger">
          <span /><span /><span />
        </button>
        <button onClick={() => setLocation("/")}
          style={{ background: "none", border: "none", cursor: "pointer", fontFamily: "Playfair Display, serif", fontWeight: 700, fontSize: 17, background: `linear-gradient(135deg, ${GOLD} 0%, ${GOLD2} 100%)`, WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" } as React.CSSProperties}>
          Ghaafeedi Music
        </button>
      </div>

      {/* Center: greeting on desktop */}
      <div className="gm-nav-greeting" style={{ fontSize: 13, color: "rgba(255,255,255,0.4)" }}>
        Welcome back, <span style={{ color: "rgba(255,255,255,0.8)", fontWeight: 600 }}>{firstName}</span>
      </div>

      {/* Right: notif + actions */}
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        {/* Notifications bell */}
        <div style={{ position: "relative" }}>
          <button onClick={onToggleNotif} className="gm-icon-btn" style={{ width: 40, height: 40, borderRadius: 10, border: `1px solid ${BORDER2}`, background: GLASS, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16, cursor: "pointer", position: "relative" }}>
            🔔
            {unreadCount > 0 && (
              <span style={{ position: "absolute", top: 6, right: 6, width: 8, height: 8, background: GOLD2, borderRadius: "50%", border: "2px solid " + BG }} />
            )}
          </button>
          {notifOpen && (
            <div style={{ position: "absolute", right: 0, top: 48, width: 340, maxHeight: 420, overflowY: "auto", background: "rgba(10,18,42,0.98)", border: `1px solid ${BORDER}`, borderRadius: 16, boxShadow: `0 24px 80px rgba(0,0,0,0.6)`, zIndex: 200, backdropFilter: "blur(20px)" }}>
              <div style={{ padding: "16px 18px 10px", borderBottom: `1px solid ${BORDER2}` }}>
                <span style={{ fontFamily: "Playfair Display, serif", fontSize: 14, color: GOLD }}>Notifications</span>
              </div>
              {notifications.length === 0 ? (
                <div style={{ padding: 24, textAlign: "center", fontSize: 13, color: "rgba(255,255,255,0.4)" }}>All caught up ✓</div>
              ) : notifications.map((n: Notification) => (
                <div key={n.id} style={{ padding: "12px 18px", borderBottom: `1px solid ${BORDER2}`, background: n.read ? "transparent" : "rgba(212,175,55,0.04)", cursor: n.link ? "pointer" : "default" }}
                  onClick={() => n.link && window.location.assign(n.link)}>
                  <div style={{ display: "flex", gap: 10, alignItems: "flex-start" }}>
                    <span style={{ fontSize: 18, flexShrink: 0 }}>{n.type === "delivery" ? "🎁" : n.type === "progress" ? "⚡" : n.type === "support" ? "💬" : "✦"}</span>
                    <div>
                      <div style={{ fontSize: 13, color: n.read ? "rgba(255,255,255,0.6)" : "#FFFFFF", fontWeight: n.read ? 400 : 600, marginBottom: 2 }}>{n.title}</div>
                      <div style={{ fontSize: 12, color: "rgba(255,255,255,0.4)" }}>{n.body}</div>
                      <div style={{ fontSize: 11, color: "rgba(255,255,255,0.25)", marginTop: 4 }}>{relativeTime(n.createdAt)}</div>
                    </div>
                    {!n.read && <div style={{ width: 7, height: 7, borderRadius: "50%", background: GOLD2, flexShrink: 0, marginTop: 4 }} />}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
        <button onClick={() => setLocation("/products")} className="gm-pill-btn">Browse</button>
        <button onClick={onSignOut} className="gm-pill-btn gm-pill-ghost">Sign Out</button>
      </div>
    </nav>
  );
}

// ─── Sidebar ──────────────────────────────────────────────────
function Sidebar({ tab, setTab, member, productions, open, onClose }: any) {
  const active = productions.filter((p: Production) => p.currentStage !== "delivered" && p.currentStage !== "archived");
  return (
    <aside className={`gm-sidebar ${open ? "gm-sidebar-open" : ""}`}>
      {/* Member pill */}
      <div style={{ padding: "20px 18px 16px", borderBottom: `1px solid ${BORDER2}` }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div style={{ width: 40, height: 40, borderRadius: "50%", background: `linear-gradient(135deg, ${GOLD}30, ${NAVY})`, border: `2px solid ${GOLD}50`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16, fontFamily: "Playfair Display, serif", color: GOLD, fontWeight: 700, flexShrink: 0 }}>
            {member?.name?.charAt(0) ?? "M"}
          </div>
          <div style={{ minWidth: 0 }}>
            <div style={{ fontSize: 13, fontWeight: 600, color: "#FFFFFF", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{member?.name ?? "Member"}</div>
            <div style={{ fontSize: 11, color: GOLD, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.08em" }}>{member?.tier ?? "free"}</div>
          </div>
        </div>
        {active.length > 0 && (
          <div style={{ marginTop: 12, padding: "8px 12px", background: "rgba(212,175,55,0.07)", borderRadius: 8, border: `1px solid ${BORDER}` }}>
            <div style={{ fontSize: 11, color: "rgba(255,255,255,0.5)", marginBottom: 4 }}>Active production</div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span style={{ fontSize: 12, color: "#FFFFFF" }}>{active[0].productSlug.replace(/-/g, " ").slice(0, 22)}</span>
              <span style={{ fontSize: 10, color: stageMap[active[0].currentStage]?.color ?? GOLD, fontWeight: 700 }}>{stageMap[active[0].currentStage]?.pct ?? 0}%</span>
            </div>
            <div style={{ height: 3, background: BORDER2, borderRadius: 2, marginTop: 5, overflow: "hidden" }}>
              <div style={{ height: "100%", width: `${stageMap[active[0].currentStage]?.pct ?? 0}%`, background: `linear-gradient(90deg, ${GOLD}, ${GOLD2})`, borderRadius: 2, transition: "width 0.6s" }} />
            </div>
          </div>
        )}
      </div>

      {/* Nav items */}
      <nav style={{ padding: "10px 10px", flex: 1 }}>
        {NAV.map(item => (
          <button key={item.id} onClick={() => setTab(item.id)}
            className={`gm-nav-item ${tab === item.id ? "gm-nav-item-active" : ""}`}>
            <span className="gm-nav-icon">{item.icon}</span>
            <span>{item.label}</span>
          </button>
        ))}
      </nav>

      {/* Bottom help */}
      <div style={{ padding: "12px 18px 20px", borderTop: `1px solid ${BORDER2}` }}>
        <div style={{ fontSize: 11, color: "rgba(255,255,255,0.35)", textAlign: "center" }}>
          Need help?{" "}
          <button onClick={() => setTab("support")} style={{ background: "none", border: "none", color: GOLD, fontSize: 11, cursor: "pointer", fontFamily: "Inter, sans-serif" }}>Open a ticket</button>
        </div>
      </div>
    </aside>
  );
}

// ─── Overview Tab ─────────────────────────────────────────────
function OverviewTab({ data, setTab, setLocation, copyMemberId, copiedId }: any) {
  const d: DashSummary = data ?? { member: null, orders: [], productions: [], subscriptions: [], billing: [], assets: [], referral: { code: "", clicks: 0, conversions: 0, creditsCents: 0 }, tickets: [] };
  const active = d.productions.filter(p => p.currentStage !== "delivered" && p.currentStage !== "archived");
  const delivered = d.productions.filter(p => p.currentStage === "delivered");
  const totalSpend = d.orders.filter(o => o.status === "completed").reduce((s, o) => s + o.priceCents, 0);

  return (
    <div>
      <PageHeader title="Overview" subtitle={`Good to see you back${d.member?.name ? `, ${d.member.name.split(" ")[0]}` : ""}.`} />

      {/* Stats row */}
      <div className="gm-stats-row">
        {[
          { label: "Active Productions", value: active.length.toString(), icon: "🎬", color: "#6366F1" },
          { label: "Delivered",          value: delivered.length.toString(), icon: "🎁", color: "#22C55E" },
          { label: "Total Orders",       value: d.orders.length.toString(), icon: "🛒", color: GOLD },
          { label: "Total Spent",        value: `$${(totalSpend / 100).toFixed(0)}`, icon: "💳", color: "#EC4899" },
        ].map((s, i) => (
          <motion.div key={i} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.06 }}
            className="gm-stat-card">
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 10 }}>
              <div style={{ fontSize: 22 }}>{s.icon}</div>
              <div style={{ width: 8, height: 8, borderRadius: "50%", background: s.color, boxShadow: `0 0 8px ${s.color}` }} />
            </div>
            <div style={{ fontFamily: "Playfair Display, serif", fontSize: 28, fontWeight: 700, color: "#FFFFFF", lineHeight: 1 }}>{s.value}</div>
            <div style={{ fontSize: 12, color: "rgba(255,255,255,0.45)", marginTop: 6 }}>{s.label}</div>
          </motion.div>
        ))}
      </div>

      {/* Member ID card */}
      {d.member?.memberId && (
        <GlassCard style={{ marginBottom: 24, display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 16 }}>
          <div>
            <div style={{ fontSize: 11, color: "rgba(255,255,255,0.4)", letterSpacing: "0.14em", textTransform: "uppercase", marginBottom: 4 }}>Your Member ID</div>
            <div style={{ fontFamily: "monospace", fontSize: 22, fontWeight: 700, color: GOLD, letterSpacing: "0.1em" }}>{d.member.memberId}</div>
          </div>
          <div style={{ display: "flex", gap: 10 }}>
            <GoldBadge color={d.member.status === "active" ? "#22C55E" : "#F59E0B"}>{d.member.status === "active" ? "✓ Active" : d.member.status}</GoldBadge>
            <GoldBadge>{d.member.tier.charAt(0).toUpperCase() + d.member.tier.slice(1)}</GoldBadge>
            <button onClick={copyMemberId} className="gm-pill-btn" style={{ fontSize: 12 }}>{copiedId ? "✓ Copied" : "Copy ID"}</button>
          </div>
        </GlassCard>
      )}

      <div className="gm-two-col">
        {/* Active productions */}
        <GlassCard>
          <SectionTitle icon="🎬" title="Active Productions" count={active.length} action={active.length > 2 ? { label: "View all", onClick: () => setTab("productions") } : undefined} />
          {active.length === 0 ? (
            <EmptyMini icon="🎬" text="No active productions" sub="Browse experiences to start one." />
          ) : active.slice(0, 3).map(p => <MiniProductionCard key={p.id} prod={p} />)}
        </GlassCard>

        {/* Recent orders */}
        <GlassCard>
          <SectionTitle icon="🛒" title="Recent Orders" count={d.orders.length} action={d.orders.length > 3 ? { label: "View all", onClick: () => setTab("billing") } : undefined} />
          {d.orders.length === 0 ? (
            <EmptyMini icon="🛒" text="No orders yet" sub="Your purchases will appear here." />
          ) : d.orders.slice(0, 4).map(o => (
            <div key={o.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 0", borderBottom: `1px solid ${BORDER2}` }}>
              <div>
                <div style={{ fontSize: 13, color: "#FFFFFF", fontWeight: 500 }}>{o.productName}</div>
                <div style={{ fontSize: 11, color: "rgba(255,255,255,0.35)", marginTop: 2 }}>{formatDate(o.createdAt)}</div>
              </div>
              <div style={{ textAlign: "right" }}>
                <div style={{ fontSize: 13, color: GOLD, fontWeight: 700 }}>${(o.priceCents / 100).toFixed(2)}</div>
                <StatusBadge status={o.status} />
              </div>
            </div>
          ))}
        </GlassCard>
      </div>

      {/* CTA if no purchases */}
      {d.orders.length === 0 && (
        <GlassCard style={{ textAlign: "center", padding: "48px 24px", marginTop: 24, border: `1px solid ${BORDER}`, background: "rgba(212,175,55,0.04)" }}>
          <div style={{ fontSize: 48, marginBottom: 16 }}>✦</div>
          <h2 style={{ fontFamily: "Playfair Display, serif", fontSize: 26, color: GOLD, margin: "0 0 12px" }}>Your Legacy Awaits</h2>
          <p style={{ fontSize: 14, color: "rgba(255,255,255,0.5)", maxWidth: 420, margin: "0 auto 28px", lineHeight: 1.6 }}>
            15 premium experiences. From cinematic songs to legacy films. Every story deserves to be told.
          </p>
          <button onClick={() => setLocation("/products")} className="gm-cta-btn">Explore All 15 Experiences →</button>
        </GlassCard>
      )}
    </div>
  );
}

// ─── Productions Tab ──────────────────────────────────────────
function ProductionsTab({ productions, setLocation }: { productions: Production[]; setLocation: (p: string) => void }) {
  const [filter, setFilter] = useState<"all" | "active" | "delivered">("all");
  const filtered = productions.filter(p =>
    filter === "all" ? true : filter === "active" ? p.currentStage !== "delivered" && p.currentStage !== "archived" : p.currentStage === "delivered"
  );

  return (
    <div>
      <PageHeader title="Productions" subtitle="Track every creation from story to delivery." />
      <div style={{ display: "flex", gap: 6, marginBottom: 24 }}>
        {(["all", "active", "delivered"] as const).map(f => (
          <button key={f} onClick={() => setFilter(f)} className={`gm-filter-chip ${filter === f ? "gm-filter-chip-active" : ""}`}>
            {f.charAt(0).toUpperCase() + f.slice(1)}
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <EmptyState icon="🎬" title="No Productions" desc="Start a new experience to see it here." cta="Browse Experiences" onCta={() => setLocation("/products")} />
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          {filtered.map(p => <FullProductionCard key={p.id} prod={p} />)}
        </div>
      )}
    </div>
  );
}

function FullProductionCard({ prod }: { prod: Production }) {
  const [expanded, setExpanded] = useState(false);
  const stage = stageMap[prod.currentStage] ?? { label: prod.currentStage, color: "#64748B", pct: 0, icon: "•" };

  return (
    <GlassCard style={{ overflow: "hidden" }}>
      <div style={{ display: "flex", gap: 16, alignItems: "flex-start", flexWrap: "wrap" }}>
        <div style={{ flex: 1, minWidth: 200 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
            <span style={{ fontSize: 20 }}>{stage.icon}</span>
            <span style={{ fontFamily: "Playfair Display, serif", fontSize: 16, color: "#FFFFFF", fontWeight: 600 }}>
              {prod.productSlug.replace(/-/g, " ").replace(/\b\w/g, c => c.toUpperCase())}
            </span>
          </div>
          <div style={{ fontSize: 11, color: "rgba(255,255,255,0.35)", fontFamily: "monospace", marginBottom: 12 }}>{prod.id}</div>

          {/* Pipeline progress bar */}
          <div style={{ marginBottom: 8 }}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
              <span style={{ fontSize: 12, color: "rgba(255,255,255,0.5)" }}>{stage.label}</span>
              <span style={{ fontSize: 12, fontWeight: 700, color: stage.color }}>{stage.pct}%</span>
            </div>
            <div style={{ height: 6, background: BORDER2, borderRadius: 3, overflow: "hidden", position: "relative" }}>
              <motion.div initial={{ width: 0 }} animate={{ width: `${stage.pct}%` }} transition={{ duration: 0.8, ease: "easeOut" }}
                style={{ height: "100%", background: `linear-gradient(90deg, ${stage.color}, ${stage.color}99)`, borderRadius: 3, boxShadow: `0 0 8px ${stage.color}60` }} />
            </div>
          </div>

          {/* Stage dots */}
          <div style={{ display: "flex", gap: 3, flexWrap: "wrap", marginTop: 10 }}>
            {STAGES.filter(s => s.key !== "archived" && s.key !== "revision_requested").map((s, i) => {
              const done = s.pct <= stage.pct;
              const current = s.key === prod.currentStage;
              return (
                <div key={i} title={s.label} style={{ width: current ? 28 : 16, height: 6, borderRadius: 3, background: done ? s.color : BORDER2, opacity: done ? 1 : 0.4, transition: "all 0.3s", boxShadow: current ? `0 0 6px ${s.color}` : "none" }} />
              );
            })}
          </div>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 8, alignItems: "flex-end" }}>
          <StatusBadge status={prod.status} />
          {prod.maxRevisions > 0 && (
            <div style={{ fontSize: 12, color: "rgba(255,255,255,0.45)", textAlign: "right" }}>
              Revisions: <span style={{ color: prod.revisionCount >= prod.maxRevisions ? "#EF4444" : "#FFFFFF" }}>{prod.revisionCount}/{prod.maxRevisions}</span>
            </div>
          )}
          {prod.estimatedDeliveryAt && (
            <div style={{ fontSize: 12, color: "rgba(255,255,255,0.45)", textAlign: "right" }}>
              Est. delivery: <span style={{ color: "#FFFFFF" }}>{formatDate(prod.estimatedDeliveryAt)}</span>
            </div>
          )}
          <button onClick={() => setExpanded(v => !v)} className="gm-pill-btn" style={{ fontSize: 11 }}>{expanded ? "Less" : "Details"}</button>
        </div>
      </div>

      {expanded && (
        <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} style={{ marginTop: 20, paddingTop: 20, borderTop: `1px solid ${BORDER2}` }}>
          <div className="gm-two-col" style={{ gap: 12 }}>
            {[
              { label: "Production ID", value: prod.id },
              { label: "Order ID",      value: prod.orderId },
              { label: "Current Stage", value: stage.label },
              { label: "Created",       value: formatDate(prod.createdAt) },
            ].map((r, i) => (
              <div key={i}>
                <div style={{ fontSize: 11, color: "rgba(255,255,255,0.4)", marginBottom: 3 }}>{r.label}</div>
                <div style={{ fontSize: 13, color: "#FFFFFF", fontFamily: "monospace" }}>{r.value}</div>
              </div>
            ))}
          </div>
        </motion.div>
      )}
    </GlassCard>
  );
}

// ─── Deliverables Tab — Phase 7 ───────────────────────────────
function DeliverablesTab({
  assets, productions, lipsyncJobs, member, authHeaders, onRefresh,
}: {
  assets: Asset[];
  productions: Production[];
  lipsyncJobs: LipSyncJob[];
  member: Member | null;
  authHeaders: () => HeadersInit;
  onRefresh: () => void;
}) {
  const delivered = productions.filter(p => p.currentStage === "delivered");
  const [view, setView] = useState<"files" | "lipsync">("files");

  const hasAny = assets.length > 0 || delivered.length > 0;
  const lipSyncComplete = lipsyncJobs.filter(j => j.status === "complete");
  const lipSyncPending  = lipsyncJobs.filter(j => j.status !== "complete" && j.status !== "failed" && j.status !== "cancelled");
  const lipSyncFailed   = lipsyncJobs.filter(j => j.status === "failed" || j.status === "cancelled");

  return (
    <div>
      <PageHeader title="Deliverables" subtitle="Download your songs, films, and Sophia lip-sync videos." />

      {/* Tab switcher */}
      <div style={{ display: "flex", gap: 6, marginBottom: 24 }}>
        <button onClick={() => setView("files")} className={`gm-filter-chip ${view === "files" ? "gm-filter-chip-active" : ""}`}>
          Files & Productions {hasAny ? `(${assets.length + delivered.length})` : ""}
        </button>
        <button onClick={() => setView("lipsync")} className={`gm-filter-chip ${view === "lipsync" ? "gm-filter-chip-active" : ""}`}>
          Sophia Lip Sync {lipsyncJobs.length > 0 ? `(${lipsyncJobs.length})` : ""}
          {lipSyncPending.length > 0 && (
            <span style={{ marginLeft: 6, width: 7, height: 7, borderRadius: "50%", background: GOLD2, display: "inline-block", verticalAlign: "middle", boxShadow: `0 0 6px ${GOLD2}` }} />
          )}
        </button>
      </div>

      {/* ── Files & Productions ── */}
      {view === "files" && (
        !hasAny ? (
          <EmptyState icon="📦" title="No Deliverables Yet" desc="Your completed songs, films, and files will appear here ready to download." />
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            {delivered.map(p => (
              <GlassCard key={p.id} style={{ display: "flex", gap: 16, alignItems: "center", flexWrap: "wrap" }}>
                <div style={{ width: 48, height: 48, borderRadius: 12, background: `linear-gradient(135deg, ${GOLD}20, ${NAVY})`, border: `1px solid ${BORDER}`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 22, flexShrink: 0 }}>🎁</div>
                <div style={{ flex: 1, minWidth: 160 }}>
                  <div style={{ fontSize: 14, fontWeight: 600, color: "#FFFFFF", marginBottom: 4 }}>{p.productSlug.replace(/-/g, " ").replace(/\b\w/g, c => c.toUpperCase())}</div>
                  <div style={{ fontSize: 12, color: "rgba(255,255,255,0.4)" }}>Delivered {p.deliveredAt ? formatDate(p.deliveredAt) : "recently"}</div>
                </div>
                <GoldBadge color="#22C55E">Delivered ✓</GoldBadge>
              </GlassCard>
            ))}
            {assets.map(a => (
              <GlassCard key={a.id} style={{ display: "flex", gap: 16, alignItems: "center", flexWrap: "wrap" }}>
                <div style={{ width: 48, height: 48, borderRadius: 12, background: GLASS2, border: `1px solid ${BORDER2}`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 22, flexShrink: 0 }}>
                  {a.assetType === "song" ? "🎵" : a.assetType === "video" ? "🎬" : a.assetType === "voice_model" ? "🎤" : a.assetType === "image" ? "🖼️" : "📄"}
                </div>
                <div style={{ flex: 1, minWidth: 160 }}>
                  <div style={{ fontSize: 14, fontWeight: 600, color: "#FFFFFF", marginBottom: 4 }}>{a.filename ?? `${a.assetType} asset`}</div>
                  <div style={{ fontSize: 12, color: "rgba(255,255,255,0.4)", display: "flex", gap: 12 }}>
                    <span>{a.assetType}</span>
                    {a.fileSizeBytes && <span>{(a.fileSizeBytes / 1_000_000).toFixed(1)} MB</span>}
                    <span>{formatDate(a.createdAt)}</span>
                  </div>
                </div>
                {a.cdnUrl ? (
                  <a href={a.cdnUrl} download target="_blank" rel="noreferrer" className="gm-cta-btn" style={{ fontSize: 12, padding: "8px 18px", textDecoration: "none" }}>Download</a>
                ) : (
                  <span style={{ fontSize: 12, color: "rgba(255,255,255,0.35)" }}>Processing…</span>
                )}
              </GlassCard>
            ))}
          </div>
        )
      )}

      {/* ── Sophia Lip Sync ── */}
      {view === "lipsync" && (
        <LipSyncPanel
          jobs={lipsyncJobs}
          complete={lipSyncComplete}
          pending={lipSyncPending}
          failed={lipSyncFailed}
          productions={productions}
          member={member}
          authHeaders={authHeaders}
          onRefresh={onRefresh}
        />
      )}
    </div>
  );
}

// ─── Lip Sync Panel (Phase 7) ─────────────────────────────────
const LIPSYNC_STATUS_COLOR: Record<string, string> = {
  queued:            "#64748B",
  dispatched:        "#6366F1",
  processing:        "#F59E0B",
  complete:          "#22C55E",
  failed:            "#EF4444",
  cancelled:         "#64748B",
  retry:             "#F97316",
  quality_review:    GOLD,
  delivery:          "#10B981",
};
const LIPSYNC_STATUS_ICON: Record<string, string> = {
  queued: "⏳", dispatched: "🚀", processing: "⚙️", complete: "✅",
  failed: "❌", cancelled: "🚫", retry: "🔄", quality_review: "🔍", delivery: "📬",
};

function LipSyncPanel({
  jobs, complete, pending, failed, productions, member, authHeaders, onRefresh,
}: {
  jobs: LipSyncJob[];
  complete: LipSyncJob[];
  pending: LipSyncJob[];
  failed: LipSyncJob[];
  productions: Production[];
  member: Member | null;
  authHeaders: () => HeadersInit;
  onRefresh: () => void;
}) {
  const isElite = member?.tier === "elite";
  // Request form state
  const [showForm, setShowForm] = useState(false);
  const [reqProdId, setReqProdId] = useState("");
  const [reqVideoUrl, setReqVideoUrl] = useState("");
  const [reqAudioUrl, setReqAudioUrl] = useState("");
  const [reqDuration, setReqDuration] = useState("60");
  const [reqSubmitting, setReqSubmitting] = useState(false);
  const [reqError, setReqError] = useState("");
  const [reqSuccess, setReqSuccess] = useState("");
  // Poll pending jobs
  const [polledJobs, setPolledJobs] = useState<LipSyncJob[]>(jobs);
  const [previewJob, setPreviewJob] = useState<LipSyncJob | null>(null);

  // Sync polledJobs when parent refreshes
  useEffect(() => { setPolledJobs(jobs); }, [jobs]);

  // Poll pending jobs every 8s
  useEffect(() => {
    if (pending.length === 0) return;
    const interval = setInterval(async () => {
      try {
        const res = await fetch("/api/dashboard/lipsync", { headers: authHeaders() });
        if (res.ok) {
          const json = await res.json() as { jobs: LipSyncJob[] };
          setPolledJobs(json.jobs);
          // If any newly completed, trigger full refresh for notification bell
          const nowComplete = json.jobs.filter(j => j.status === "complete").length;
          const wasComplete = polledJobs.filter(j => j.status === "complete").length;
          if (nowComplete > wasComplete) onRefresh();
        }
      } catch { /* silent */ }
    }, 8000);
    return () => clearInterval(interval);
  }, [pending.length, authHeaders, onRefresh]);

  const submitRequest = async () => {
    setReqError(""); setReqSuccess("");
    if (!reqProdId) { setReqError("Select a production."); return; }
    if (!reqVideoUrl.startsWith("http")) { setReqError("Enter a valid video URL."); return; }
    if (!reqAudioUrl.startsWith("http")) { setReqError("Enter a valid audio URL."); return; }
    setReqSubmitting(true);
    try {
      const res = await fetch("/api/dashboard/lipsync/request", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...authHeaders() },
        body: JSON.stringify({
          productionId: reqProdId,
          videoUrl: reqVideoUrl,
          audioUrl: reqAudioUrl,
          durationSeconds: parseInt(reqDuration, 10) || 60,
        }),
      });
      const json = await res.json();
      if (!res.ok) { setReqError(json.error ?? "Request failed."); }
      else {
        setReqSuccess(json.message ?? "Lip sync queued!");
        setShowForm(false);
        setReqProdId(""); setReqVideoUrl(""); setReqAudioUrl(""); setReqDuration("60");
        onRefresh();
      }
    } catch { setReqError("Network error."); }
    finally { setReqSubmitting(false); }
  };

  const allJobs = polledJobs.length > 0 ? polledJobs : jobs;
  const completeJobs = allJobs.filter(j => j.status === "complete");
  const pendingJobs  = allJobs.filter(j => j.status !== "complete" && j.status !== "failed" && j.status !== "cancelled");
  const failedJobs   = allJobs.filter(j => j.status === "failed" || j.status === "cancelled");

  return (
    <div>
      {/* Header info + request button */}
      <GlassCard style={{ marginBottom: 24, background: `linear-gradient(135deg, rgba(212,175,55,0.06), rgba(11,23,54,0.8))`, border: `1px solid ${BORDER}` }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 16 }}>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
              <span style={{ fontSize: 28 }}>🎬</span>
              <div>
                <div style={{ fontFamily: "Playfair Display, serif", fontSize: 18, color: "#FFFFFF", fontWeight: 700 }}>Sophia AI Lip Sync</div>
                <div style={{ fontSize: 12, color: "rgba(255,255,255,0.5)", marginTop: 2 }}>
                  Powered by FAL.ai LatentSync · Sophia's voice synced to any video
                </div>
              </div>
            </div>
            <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
              {isElite ? (
                <GoldBadge color="#EC4899">✦ Elite — FREE</GoldBadge>
              ) : (
                <GoldBadge color={GOLD}>$29 per video</GoldBadge>
              )}
              <GoldBadge color="#6366F1">Sophia Voice · ElevenLabs</GoldBadge>
              <GoldBadge color="#F59E0B">R2 CDN Delivery</GoldBadge>
            </div>
          </div>
          <button
            onClick={() => setShowForm(v => !v)}
            className="gm-cta-btn"
            style={{ whiteSpace: "nowrap" }}
          >
            {showForm ? "Cancel" : "+ Request Lip Sync"}
          </button>
        </div>
      </GlassCard>

      {/* Request form */}
      <AnimatePresence>
        {showForm && (
          <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}>
            <GlassCard style={{ marginBottom: 24, border: `1px solid ${BORDER}` }}>
              <div style={{ fontFamily: "Playfair Display, serif", fontSize: 16, color: GOLD, marginBottom: 18 }}>
                ✦ Request Sophia Lip Sync {isElite ? "— FREE (Elite)" : "— $29 add-on"}
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                <div>
                  <label className="gm-label">Production</label>
                  <select value={reqProdId} onChange={e => setReqProdId(e.target.value)} className="gm-input">
                    <option value="">— select a production —</option>
                    {productions.map(p => (
                      <option key={p.id} value={p.id}>
                        {p.productSlug.replace(/-/g, " ").replace(/\b\w/g, c => c.toUpperCase())} · {p.currentStage}
                      </option>
                    ))}
                  </select>
                  {productions.length === 0 && (
                    <div style={{ fontSize: 12, color: "rgba(255,255,255,0.4)", marginTop: 5 }}>No productions found. Start a production first.</div>
                  )}
                </div>
                <div>
                  <label className="gm-label">Video URL (source video for Sophia's face overlay)</label>
                  <input type="url" value={reqVideoUrl} onChange={e => setReqVideoUrl(e.target.value)}
                    className="gm-input" placeholder="https://…/video.mp4" />
                </div>
                <div>
                  <label className="gm-label">Audio URL (Sophia voiceover or custom narration)</label>
                  <input type="url" value={reqAudioUrl} onChange={e => setReqAudioUrl(e.target.value)}
                    className="gm-input" placeholder="https://…/audio.wav" />
                </div>
                <div>
                  <label className="gm-label">Duration (seconds)</label>
                  <input type="number" min={5} max={300} value={reqDuration} onChange={e => setReqDuration(e.target.value)}
                    className="gm-input" style={{ width: 100 }} />
                </div>
                {reqError && (
                  <div style={{ fontSize: 13, color: "#EF4444", padding: "10px 14px", background: "rgba(239,68,68,0.08)", borderRadius: 8, border: "1px solid rgba(239,68,68,0.2)" }}>{reqError}</div>
                )}
                {reqSuccess && (
                  <div style={{ fontSize: 13, color: "#22C55E", padding: "10px 14px", background: "rgba(34,197,94,0.08)", borderRadius: 8, border: "1px solid rgba(34,197,94,0.2)" }}>✓ {reqSuccess}</div>
                )}
                <div style={{ display: "flex", gap: 10 }}>
                  <button onClick={submitRequest} disabled={reqSubmitting} className="gm-cta-btn" style={{ opacity: reqSubmitting ? 0.6 : 1 }}>
                    {reqSubmitting ? "Queuing…" : isElite ? "Queue Lip Sync (Free)" : "Queue Lip Sync ($29)"}
                  </button>
                  <button onClick={() => setShowForm(false)} className="gm-pill-btn" style={{ fontSize: 13 }}>Cancel</button>
                </div>
              </div>
            </GlassCard>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Empty state */}
      {allJobs.length === 0 && (
        <EmptyState icon="🎬" title="No Lip Sync Jobs Yet"
          desc={`Request a Sophia AI lip sync to bring your videos to life. ${isElite ? "Free with your Elite membership." : "$29 per video."}`} />
      )}

      {/* Pending jobs */}
      {pendingJobs.length > 0 && (
        <div style={{ marginBottom: 24 }}>
          <SectionTitle icon="⚙️" title="Processing" count={pendingJobs.length} />
          <div style={{ display: "flex", flexDirection: "column", gap: 12, marginTop: 14 }}>
            {pendingJobs.map(j => <LipSyncJobCard key={j.id} job={j} onPreview={setPreviewJob} />)}
          </div>
        </div>
      )}

      {/* Complete jobs */}
      {completeJobs.length > 0 && (
        <div style={{ marginBottom: 24 }}>
          <SectionTitle icon="✅" title="Complete — Ready to Download" count={completeJobs.length} />
          <div style={{ display: "flex", flexDirection: "column", gap: 12, marginTop: 14 }}>
            {completeJobs.map(j => <LipSyncJobCard key={j.id} job={j} onPreview={setPreviewJob} />)}
          </div>
        </div>
      )}

      {/* Failed jobs */}
      {failedJobs.length > 0 && (
        <div style={{ marginBottom: 24 }}>
          <SectionTitle icon="❌" title="Failed / Cancelled" count={failedJobs.length} />
          <div style={{ display: "flex", flexDirection: "column", gap: 12, marginTop: 14 }}>
            {failedJobs.map(j => <LipSyncJobCard key={j.id} job={j} onPreview={setPreviewJob} />)}
          </div>
        </div>
      )}

      {/* Video preview modal */}
      <AnimatePresence>
        {previewJob && previewJob.outputUrl && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.88)", zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}
            onClick={() => setPreviewJob(null)}>
            <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }}
              onClick={e => e.stopPropagation()}
              style={{ background: "rgba(5,11,26,0.98)", border: `1px solid ${BORDER}`, borderRadius: 20, padding: 24, maxWidth: 720, width: "100%" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
                <div style={{ fontFamily: "Playfair Display, serif", fontSize: 18, color: GOLD }}>Sophia Lip Sync Preview</div>
                <button onClick={() => setPreviewJob(null)} className="gm-pill-btn" style={{ fontSize: 12 }}>✕ Close</button>
              </div>
              <video controls autoPlay style={{ width: "100%", borderRadius: 12, maxHeight: 420 }} src={previewJob.outputUrl} />
              <div style={{ display: "flex", gap: 10, marginTop: 16 }}>
                <a href={previewJob.outputUrl} download target="_blank" rel="noreferrer" className="gm-cta-btn" style={{ textDecoration: "none", fontSize: 13 }}>Download Video</a>
                <div style={{ fontSize: 12, color: "rgba(255,255,255,0.4)", alignSelf: "center" }}>
                  Job {previewJob.id.slice(0, 8)} · {previewJob.completedAt ? formatDate(previewJob.completedAt) : ""}
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ─── Single Lip Sync Job Card ──────────────────────────────────
function LipSyncJobCard({ job, onPreview }: { job: LipSyncJob; onPreview: (j: LipSyncJob) => void }) {
  const statusColor = LIPSYNC_STATUS_COLOR[job.status] ?? "#64748B";
  const statusIcon  = LIPSYNC_STATUS_ICON[job.status] ?? "•";
  const isComplete  = job.status === "complete";
  const isPending   = !isComplete && job.status !== "failed" && job.status !== "cancelled";

  return (
    <GlassCard style={{ display: "flex", gap: 16, alignItems: "flex-start", flexWrap: "wrap" }}>
      {/* Status icon */}
      <div style={{ width: 48, height: 48, borderRadius: 12, background: `${statusColor}18`, border: `1px solid ${statusColor}40`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20, flexShrink: 0 }}>
        {statusIcon}
      </div>

      {/* Info */}
      <div style={{ flex: 1, minWidth: 180 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 5 }}>
          <span style={{ fontSize: 14, fontWeight: 600, color: "#FFFFFF" }}>Sophia Lip Sync</span>
          <span style={{ fontSize: 11, fontWeight: 700, color: statusColor, background: `${statusColor}18`, border: `1px solid ${statusColor}40`, borderRadius: 6, padding: "2px 8px", textTransform: "uppercase", letterSpacing: "0.07em" }}>
            {job.status}
          </span>
        </div>
        <div style={{ fontSize: 12, color: "rgba(255,255,255,0.4)", display: "flex", gap: 12, flexWrap: "wrap" }}>
          <span>Job {job.id.slice(0, 8)}</span>
          {job.provider && <span>via {job.provider}</span>}
          {job.durationSeconds && <span>{job.durationSeconds}s</span>}
          <span>Queued {formatDate(job.queuedAt)}</span>
          {job.completedAt && <span>Done {formatDate(job.completedAt)}</span>}
        </div>
        {/* Pulsing bar while processing */}
        {isPending && (
          <div style={{ marginTop: 10, height: 3, background: BORDER2, borderRadius: 2, overflow: "hidden", position: "relative" }}>
            <div style={{ height: "100%", width: "40%", background: `linear-gradient(90deg, ${GOLD}, ${GOLD2})`, borderRadius: 2, animation: "gmPulse 1.6s ease-in-out infinite" }} />
          </div>
        )}
        {job.errorMessage && (
          <div style={{ marginTop: 8, fontSize: 12, color: "#EF4444", background: "rgba(239,68,68,0.07)", borderRadius: 6, padding: "6px 10px" }}>
            {job.errorMessage}
          </div>
        )}
      </div>

      {/* Actions */}
      <div style={{ display: "flex", gap: 8, alignItems: "center", flexShrink: 0 }}>
        {isComplete && job.outputUrl && (
          <>
            <button onClick={() => onPreview(job)} className="gm-pill-btn" style={{ fontSize: 12 }}>▶ Preview</button>
            <a href={job.outputUrl} download target="_blank" rel="noreferrer" className="gm-cta-btn" style={{ fontSize: 12, padding: "8px 16px", textDecoration: "none" }}>Download</a>
          </>
        )}
        {isPending && (
          <div style={{ fontSize: 12, color: "rgba(255,255,255,0.4)" }}>Processing…</div>
        )}
      </div>
    </GlassCard>
  );
}

// ─── Memberships Tab ─────────────────────────────────────────
function MembershipsTab({ member, subscriptions, setLocation, session }: any) {
  const TIERS = [
    { id: "starter", label: "Starter", price: "$49/mo", songs: 3, color: "#6366F1" },
    { id: "premium", label: "Premium", price: "$79/mo", songs: 8, color: GOLD },
    { id: "elite",   label: "Elite",   price: "$125/mo", songs: 15, color: "#EC4899" },
  ];
  const currentTier = member?.tier ?? "free";

  return (
    <div>
      <PageHeader title="Memberships" subtitle="Your plan, quotas, and upgrade options." />

      {/* Current member card */}
      <GlassCard style={{ background: `linear-gradient(135deg, rgba(212,175,55,0.07), rgba(11,23,54,0.8))`, border: `1px solid ${BORDER}`, marginBottom: 28 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 16 }}>
          <div>
            <div style={{ fontSize: 11, color: GOLD, letterSpacing: "0.14em", marginBottom: 8, textTransform: "uppercase" }}>Ghaafeedi Music · Member Card</div>
            <div style={{ fontFamily: "Playfair Display, serif", fontSize: 22, color: "#FFFFFF", marginBottom: 4 }}>{session?.user?.name ?? "—"}</div>
            <div style={{ fontSize: 13, color: "rgba(255,255,255,0.5)", marginBottom: 16 }}>{session?.user?.email ?? "—"}</div>
            {member?.memberId && (
              <div style={{ fontFamily: "monospace", fontSize: 18, fontWeight: 700, color: GOLD, letterSpacing: "0.1em" }}>{member.memberId}</div>
            )}
          </div>
          <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
            <StatPill label="Tier" value={currentTier.charAt(0).toUpperCase() + currentTier.slice(1)} color={GOLD} />
            <StatPill label="Status" value={member?.status === "active" ? "✓ Active" : member?.status ?? "—"} color="#22C55E" />
            <StatPill label="Joined" value={member?.joinedAt ? formatDate(member.joinedAt) : "—"} />
          </div>
        </div>
      </GlassCard>

      {/* Active subs */}
      {subscriptions.length > 0 && (
        <div style={{ marginBottom: 28 }}>
          <SectionTitle icon="✦" title="Active Subscriptions" count={subscriptions.length} />
          <div style={{ display: "flex", flexDirection: "column", gap: 12, marginTop: 14 }}>
            {subscriptions.map((s: Sub) => (
              <GlassCard key={s.id}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 12 }}>
                  <div>
                    <div style={{ fontSize: 15, fontWeight: 600, color: "#FFFFFF", marginBottom: 4 }}>{s.plan.replace(/_/g, " ").replace(/\b\w/g, c => c.toUpperCase())} Plan</div>
                    <div style={{ fontSize: 12, color: "rgba(255,255,255,0.4)" }}>via {s.provider} · {s.cancelAtPeriodEnd ? "Cancels" : "Renews"} {s.renewalAt ? formatDate(s.renewalAt) : "—"}</div>
                    {s.quotaSongs != null && (
                      <div style={{ marginTop: 10 }}>
                        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 5 }}>
                          <span style={{ fontSize: 11, color: "rgba(255,255,255,0.45)" }}>Song quota</span>
                          <span style={{ fontSize: 11, color: "#FFFFFF" }}>{s.quotaUsed ?? 0} / {s.quotaSongs}</span>
                        </div>
                        <div style={{ height: 4, background: BORDER2, borderRadius: 2, overflow: "hidden" }}>
                          <div style={{ height: "100%", width: `${Math.min(100, ((s.quotaUsed ?? 0) / (s.quotaSongs || 1)) * 100)}%`, background: `linear-gradient(90deg, ${GOLD}, ${GOLD2})`, borderRadius: 2 }} />
                        </div>
                      </div>
                    )}
                  </div>
                  <div style={{ display: "flex", gap: 8 }}>
                    <StatusBadge status={s.status} />
                    {s.cancelAtPeriodEnd && <GoldBadge color="#EF4444">Cancelling</GoldBadge>}
                  </div>
                </div>
              </GlassCard>
            ))}
          </div>
        </div>
      )}

      {/* Upgrade tiers */}
      <SectionTitle icon="⬆️" title="Available Plans" />
      <div className="gm-three-col" style={{ marginTop: 14 }}>
        {TIERS.map(t => {
          const isCurrent = currentTier === t.id;
          return (
            <div key={t.id} style={{ background: isCurrent ? `linear-gradient(135deg, ${t.color}15, rgba(11,23,54,0.8))` : GLASS, border: `1px solid ${isCurrent ? t.color + "50" : BORDER2}`, borderRadius: 16, padding: "24px 20px", position: "relative", boxShadow: isCurrent ? `0 0 20px ${t.color}20` : "none" }}>
              {isCurrent && <div style={{ position: "absolute", top: -1, left: "50%", transform: "translateX(-50%)", background: t.color, color: BG, fontSize: 10, fontWeight: 700, padding: "3px 12px", borderRadius: "0 0 8px 8px", letterSpacing: "0.06em" }}>CURRENT PLAN</div>}
              <div style={{ fontFamily: "Playfair Display, serif", fontSize: 20, color: "#FFFFFF", fontWeight: 700, marginBottom: 4 }}>{t.label}</div>
              <div style={{ fontSize: 22, fontWeight: 700, color: t.color, marginBottom: 16 }}>{t.price}</div>
              <div style={{ fontSize: 13, color: "rgba(255,255,255,0.6)", marginBottom: 20 }}>Up to <strong style={{ color: "#FFFFFF" }}>{t.songs} songs</strong>/month + all member features</div>
              {!isCurrent && (
                <button onClick={() => setLocation("/products")} className="gm-cta-btn" style={{ fontSize: 12, padding: "10px 0", width: "100%", background: `linear-gradient(135deg, ${t.color}, ${t.color}88)` }}>Upgrade</button>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── Billing Tab ──────────────────────────────────────────────
function BillingTab({ billing, orders, subscriptions }: { billing: BillingEvent[]; orders: Order[]; subscriptions: Sub[] }) {
  const [view, setView] = useState<"orders" | "history">("orders");
  const totalSpend = orders.filter(o => o.status === "completed").reduce((s, o) => s + o.priceCents, 0);

  return (
    <div>
      <PageHeader title="Billing" subtitle="Your payment history and subscription details." />

      {/* Summary */}
      <div className="gm-stats-row" style={{ marginBottom: 28 }}>
        {[
          { label: "Total Spent",    value: `$${(totalSpend / 100).toFixed(2)}`, icon: "💰" },
          { label: "Total Orders",   value: orders.length.toString(),           icon: "📋" },
          { label: "Subscriptions",  value: subscriptions.filter(s => s.status === "active").length.toString(), icon: "🔄" },
        ].map((s, i) => (
          <div key={i} className="gm-stat-card">
            <div style={{ fontSize: 22, marginBottom: 8 }}>{s.icon}</div>
            <div style={{ fontFamily: "Playfair Display, serif", fontSize: 26, fontWeight: 700, color: "#FFFFFF", lineHeight: 1 }}>{s.value}</div>
            <div style={{ fontSize: 12, color: "rgba(255,255,255,0.4)", marginTop: 6 }}>{s.label}</div>
          </div>
        ))}
      </div>

      {/* Tab toggle */}
      <div style={{ display: "flex", gap: 6, marginBottom: 20 }}>
        {[{ id: "orders" as const, label: "Orders" }, { id: "history" as const, label: "Billing Events" }].map(t => (
          <button key={t.id} onClick={() => setView(t.id)} className={`gm-filter-chip ${view === t.id ? "gm-filter-chip-active" : ""}`}>{t.label}</button>
        ))}
      </div>

      {view === "orders" && (
        orders.length === 0 ? <EmptyState icon="💳" title="No Orders" desc="Your purchases will appear here." /> : (
          <GlassCard style={{ padding: 0, overflow: "hidden" }}>
            <div style={{ padding: "14px 20px", borderBottom: `1px solid ${BORDER2}`, display: "grid", gridTemplateColumns: "2fr 1fr 1fr 1fr 1fr", gap: 10 }}>
              {["Product", "Tier", "Amount", "Status", "Date"].map(h => (
                <span key={h} style={{ fontSize: 10, color: "rgba(255,255,255,0.4)", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em" }}>{h}</span>
              ))}
            </div>
            {orders.map((o, i) => (
              <div key={o.id} style={{ padding: "13px 20px", borderBottom: i < orders.length - 1 ? `1px solid ${BORDER2}` : "none", display: "grid", gridTemplateColumns: "2fr 1fr 1fr 1fr 1fr", gap: 10, alignItems: "center" }}
                className="gm-table-row">
                <span style={{ fontSize: 13, color: "#FFFFFF", fontWeight: 500 }}>{o.productName}</span>
                <span style={{ fontSize: 12, color: "rgba(255,255,255,0.55)", background: GLASS2, borderRadius: 6, padding: "2px 8px", width: "fit-content" }}>{o.tier}</span>
                <span style={{ fontSize: 13, color: GOLD, fontWeight: 700 }}>${(o.priceCents / 100).toFixed(2)}</span>
                <StatusBadge status={o.status} />
                <span style={{ fontSize: 12, color: "rgba(255,255,255,0.4)" }}>{formatDate(o.createdAt)}</span>
              </div>
            ))}
          </GlassCard>
        )
      )}

      {view === "history" && (
        billing.length === 0 ? <EmptyState icon="📋" title="No Billing Events" desc="Transaction events will appear here." /> : (
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {billing.map(b => (
              <GlassCard key={b.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 12 }}>
                <div>
                  <div style={{ fontSize: 13, color: "#FFFFFF", fontWeight: 500, marginBottom: 3 }}>{b.eventType.replace(/_/g, " ").replace(/\b\w/g, c => c.toUpperCase())}</div>
                  <div style={{ fontSize: 12, color: "rgba(255,255,255,0.4)" }}>{b.provider ?? "—"} · {formatDate(b.createdAt)}</div>
                </div>
                <div style={{ fontFamily: "Playfair Display, serif", fontSize: 18, fontWeight: 700, color: b.amountCents < 0 ? "#EF4444" : GOLD }}>
                  {b.amountCents < 0 ? "-" : "+"}${Math.abs(b.amountCents / 100).toFixed(2)}
                </div>
              </GlassCard>
            ))}
          </div>
        )
      )}
    </div>
  );
}

// ─── Revisions Tab ────────────────────────────────────────────
function RevisionsTab({ productions, authHeaders, onRefresh }: { productions: Production[]; authHeaders: () => HeadersInit; onRefresh: () => void }) {
  const eligible = productions.filter(p => p.currentStage !== "delivered" && p.currentStage !== "archived" && p.revisionCount < p.maxRevisions);
  const [selected, setSelected] = useState<string>("");
  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState("");

  const submit = async () => {
    if (!selected || notes.trim().length < 10) { setError("Please select a production and describe your revision (min 10 chars)."); return; }
    setSubmitting(true); setError("");
    try {
      const res = await fetch("/api/dashboard/revisions", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...authHeaders() },
        body: JSON.stringify({ productionId: selected, notes }),
      });
      const json = await res.json();
      if (!res.ok) { setError(json.error ?? "Failed"); }
      else { setSuccess(true); setNotes(""); setSelected(""); onRefresh(); }
    } catch { setError("Network error"); }
    finally { setSubmitting(false); }
  };

  return (
    <div>
      <PageHeader title="Revisions" subtitle="Request changes to your productions." />

      {/* Request form */}
      <GlassCard style={{ marginBottom: 28, border: `1px solid ${BORDER}` }}>
        <SectionTitle icon="✏️" title="Submit a Revision Request" />
        <div style={{ marginTop: 16, display: "flex", flexDirection: "column", gap: 14 }}>
          <div>
            <label className="gm-label">Select Production</label>
            <select value={selected} onChange={e => setSelected(e.target.value)} className="gm-input">
              <option value="">— choose a production —</option>
              {eligible.map(p => (
                <option key={p.id} value={p.id}>{p.productSlug.replace(/-/g, " ")} ({p.revisionCount}/{p.maxRevisions} revisions used)</option>
              ))}
            </select>
            {eligible.length === 0 && <div style={{ fontSize: 12, color: "rgba(255,255,255,0.4)", marginTop: 6 }}>No eligible productions (revisions are available before delivery).</div>}
          </div>
          <div>
            <label className="gm-label">Revision Notes</label>
            <textarea value={notes} onChange={e => setNotes(e.target.value)} className="gm-input" rows={4}
              placeholder="Describe exactly what you'd like changed — tone, lyrics, pacing, visuals, etc." style={{ resize: "vertical" }} />
          </div>
          {error && <div style={{ fontSize: 13, color: "#EF4444", padding: "10px 14px", background: "rgba(239,68,68,0.08)", borderRadius: 8, border: "1px solid rgba(239,68,68,0.2)" }}>{error}</div>}
          {success && <div style={{ fontSize: 13, color: "#22C55E", padding: "10px 14px", background: "rgba(34,197,94,0.08)", borderRadius: 8, border: "1px solid rgba(34,197,94,0.2)" }}>✓ Revision request submitted. Our team will review it within 24 hours.</div>}
          <button onClick={submit} disabled={submitting || eligible.length === 0} className="gm-cta-btn" style={{ alignSelf: "flex-start", opacity: submitting ? 0.6 : 1 }}>
            {submitting ? "Submitting…" : "Submit Revision Request"}
          </button>
        </div>
      </GlassCard>

      {/* All productions with revision status */}
      <SectionTitle icon="📋" title="Production Revision Status" count={productions.length} />
      <div style={{ marginTop: 14, display: "flex", flexDirection: "column", gap: 12 }}>
        {productions.map(p => (
          <GlassCard key={p.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 12 }}>
            <div>
              <div style={{ fontSize: 13, fontWeight: 600, color: "#FFFFFF", marginBottom: 4 }}>{p.productSlug.replace(/-/g, " ").replace(/\b\w/g, c => c.toUpperCase())}</div>
              <div style={{ fontSize: 12, color: "rgba(255,255,255,0.4)" }}>Stage: {stageMap[p.currentStage]?.label ?? p.currentStage}</div>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <div style={{ textAlign: "center" }}>
                <div style={{ fontSize: 18, fontWeight: 700, fontFamily: "Playfair Display, serif", color: p.revisionCount >= p.maxRevisions ? "#EF4444" : GOLD }}>{p.revisionCount}/{p.maxRevisions}</div>
                <div style={{ fontSize: 10, color: "rgba(255,255,255,0.4)" }}>revisions</div>
              </div>
              {p.currentStage !== "delivered" && p.currentStage !== "archived" && p.revisionCount < p.maxRevisions && (
                <button onClick={() => setSelected(p.id)} className="gm-pill-btn" style={{ fontSize: 11 }}>Request</button>
              )}
            </div>
          </GlassCard>
        ))}
        {productions.length === 0 && <EmptyMini icon="✏️" text="No productions yet" sub="Productions appear here once you place an order." />}
      </div>
    </div>
  );
}

// ─── Support Tab ──────────────────────────────────────────────
function SupportTab({ tickets, authHeaders, onRefresh }: { tickets: Ticket[]; authHeaders: () => HeadersInit; onRefresh: () => void }) {
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState("");

  const submit = async () => {
    if (!subject.trim() || body.trim().length < 20) { setError("Please fill in both fields (body min 20 chars)."); return; }
    setSubmitting(true); setError("");
    try {
      const res = await fetch("/api/dashboard/support/ticket", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...authHeaders() },
        body: JSON.stringify({ subject, body, priority: "normal" }),
      });
      if (res.ok) { setSuccess(true); setSubject(""); setBody(""); onRefresh(); }
      else { const j = await res.json(); setError(j.error ?? "Failed to submit ticket."); }
    } catch { setError("Network error — please try again."); }
    finally { setSubmitting(false); }
  };

  return (
    <div>
      <PageHeader title="Support" subtitle="Open a ticket and we'll respond within 24 hours." />

      <GlassCard style={{ marginBottom: 28, border: `1px solid ${BORDER}` }}>
        <SectionTitle icon="💬" title="New Support Ticket" />
        <div style={{ marginTop: 16, display: "flex", flexDirection: "column", gap: 14 }}>
          <div>
            <label className="gm-label">Subject</label>
            <input value={subject} onChange={e => setSubject(e.target.value)} className="gm-input" placeholder="Briefly describe your issue" />
          </div>
          <div>
            <label className="gm-label">Message</label>
            <textarea value={body} onChange={e => setBody(e.target.value)} className="gm-input" rows={5} placeholder="Describe your issue in detail. Include order IDs, production IDs, or screenshots if relevant." style={{ resize: "vertical" }} />
          </div>
          {error && <div style={{ fontSize: 13, color: "#EF4444", padding: "10px 14px", background: "rgba(239,68,68,0.08)", borderRadius: 8 }}>{error}</div>}
          {success && <div style={{ fontSize: 13, color: "#22C55E", padding: "10px 14px", background: "rgba(34,197,94,0.08)", borderRadius: 8 }}>✓ Ticket submitted! We'll respond to your email within 24 hours.</div>}
          <button onClick={submit} disabled={submitting} className="gm-cta-btn" style={{ alignSelf: "flex-start", opacity: submitting ? 0.6 : 1 }}>
            {submitting ? "Submitting…" : "Submit Ticket"}
          </button>
        </div>
      </GlassCard>

      <SectionTitle icon="📋" title="My Tickets" count={tickets.length} />
      <div style={{ marginTop: 14, display: "flex", flexDirection: "column", gap: 12 }}>
        {tickets.length === 0 ? (
          <EmptyMini icon="💬" text="No tickets yet" sub="Open a ticket above if you need help." />
        ) : tickets.map(t => (
          <GlassCard key={t.id}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 12 }}>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 14, fontWeight: 600, color: "#FFFFFF", marginBottom: 4 }}>{t.subject}</div>
                <div style={{ fontSize: 12, color: "rgba(255,255,255,0.4)", marginBottom: 8 }}>{formatDate(t.createdAt)}</div>
                <div style={{ fontSize: 13, color: "rgba(255,255,255,0.6)", lineHeight: 1.5 }}>{t.body.slice(0, 120)}{t.body.length > 120 ? "…" : ""}</div>
              </div>
              <div style={{ display: "flex", gap: 8 }}>
                <StatusBadge status={t.status} />
                <GoldBadge color={t.priority === "urgent" ? "#EF4444" : t.priority === "high" ? "#F59E0B" : "rgba(255,255,255,0.3)"}>{t.priority}</GoldBadge>
              </div>
            </div>
          </GlassCard>
        ))}
      </div>
    </div>
  );
}

// ─── Referrals Tab ────────────────────────────────────────────
function ReferralsTab({ referral, copyRefCode, copiedRef }: { referral?: Referral; copyRefCode: (c: string) => void; copiedRef: boolean }) {
  const code = referral?.code ?? "GM-XXXXXX";
  const refLink = `https://ghaafeedi.music?ref=${code}`;

  return (
    <div>
      <PageHeader title="Referrals" subtitle="Earn $15 credit for every friend who joins." />

      {/* Hero card */}
      <GlassCard style={{ background: `linear-gradient(135deg, rgba(212,175,55,0.1), rgba(11,23,54,0.9))`, border: `1px solid ${BORDER}`, marginBottom: 28, textAlign: "center", padding: "40px 28px" }}>
        <div style={{ fontSize: 48, marginBottom: 12 }}>🔗</div>
        <div style={{ fontFamily: "Playfair Display, serif", fontSize: 28, color: GOLD, fontWeight: 700, marginBottom: 8 }}>Invite & Earn</div>
        <div style={{ fontSize: 14, color: "rgba(255,255,255,0.55)", maxWidth: 480, margin: "0 auto 28px", lineHeight: 1.6 }}>
          Share your referral link. When a friend signs up and completes a purchase, you get <strong style={{ color: GOLD }}>$15 in Ghaafeedi credits</strong>.
        </div>
        {/* Referral link */}
        <div style={{ display: "flex", gap: 10, maxWidth: 500, margin: "0 auto", flexWrap: "wrap", justifyContent: "center" }}>
          <div style={{ flex: 1, minWidth: 220, padding: "12px 16px", background: "rgba(0,0,0,0.3)", border: `1px solid ${BORDER}`, borderRadius: 10, fontFamily: "monospace", fontSize: 13, color: GOLD, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
            {refLink}
          </div>
          <button onClick={() => copyRefCode(code)} className="gm-cta-btn" style={{ padding: "12px 22px" }}>{copiedRef ? "✓ Copied!" : "Copy Link"}</button>
        </div>
      </GlassCard>

      {/* Stats */}
      <div className="gm-stats-row" style={{ marginBottom: 28 }}>
        {[
          { label: "Link Clicks",   value: (referral?.clicks ?? 0).toString(),       icon: "👆" },
          { label: "Conversions",   value: (referral?.conversions ?? 0).toString(),   icon: "✅" },
          { label: "Credits Earned", value: `$${((referral?.creditsCents ?? 0) / 100).toFixed(0)}`, icon: "💰" },
        ].map((s, i) => (
          <div key={i} className="gm-stat-card">
            <div style={{ fontSize: 24, marginBottom: 8 }}>{s.icon}</div>
            <div style={{ fontFamily: "Playfair Display, serif", fontSize: 28, fontWeight: 700, color: "#FFFFFF" }}>{s.value}</div>
            <div style={{ fontSize: 12, color: "rgba(255,255,255,0.4)", marginTop: 6 }}>{s.label}</div>
          </div>
        ))}
      </div>

      {/* How it works */}
      <GlassCard>
        <SectionTitle icon="📖" title="How It Works" />
        <div className="gm-three-col" style={{ marginTop: 16, gap: 16 }}>
          {[
            { step: "1", title: "Share your link", body: "Copy your unique referral link and share it with friends, family, or on social media." },
            { step: "2", title: "Friend signs up", body: "When they click your link and create an account, it's tracked automatically." },
            { step: "3", title: "Earn $15 credit", body: "Once they complete their first purchase, $15 is added to your Ghaafeedi account." },
          ].map(s => (
            <div key={s.step} style={{ textAlign: "center", padding: "20px 16px", background: GLASS, borderRadius: 12, border: `1px solid ${BORDER2}` }}>
              <div style={{ width: 36, height: 36, borderRadius: "50%", background: `linear-gradient(135deg, ${GOLD}, ${GOLD2})`, color: BG, fontWeight: 800, fontSize: 16, display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 12px" }}>{s.step}</div>
              <div style={{ fontSize: 14, fontWeight: 600, color: "#FFFFFF", marginBottom: 8 }}>{s.title}</div>
              <div style={{ fontSize: 12, color: "rgba(255,255,255,0.5)", lineHeight: 1.5 }}>{s.body}</div>
            </div>
          ))}
        </div>
      </GlassCard>
    </div>
  );
}

// ─── Settings Tab ─────────────────────────────────────────────
function SettingsTab({ session, member, authHeaders, onRefresh }: any) {
  const [displayName, setDisplayName] = useState(session?.user?.name ?? "");
  const [timezone, setTimezone] = useState("America/New_York");
  const [genre, setGenre] = useState("");
  const [mood, setMood] = useState("");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [err, setErr] = useState("");

  const save = async () => {
    setSaving(true); setErr(""); setSaved(false);
    try {
      const res = await fetch("/api/dashboard/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json", ...authHeaders() },
        body: JSON.stringify({ displayName, timezone, preferredGenre: genre, preferredMood: mood }),
      });
      if (res.ok) { setSaved(true); onRefresh(); }
      else setErr("Failed to save changes.");
    } catch { setErr("Network error."); }
    finally { setSaving(false); }
  };

  return (
    <div>
      <PageHeader title="Settings" subtitle="Manage your profile and preferences." />

      <div className="gm-two-col">
        {/* Profile settings */}
        <GlassCard>
          <SectionTitle icon="👤" title="Profile" />
          <div style={{ marginTop: 16, display: "flex", flexDirection: "column", gap: 14 }}>
            <div>
              <label className="gm-label">Display Name</label>
              <input value={displayName} onChange={e => setDisplayName(e.target.value)} className="gm-input" placeholder="Your name" />
            </div>
            <div>
              <label className="gm-label">Email</label>
              <input value={session?.user?.email ?? ""} readOnly className="gm-input" style={{ opacity: 0.5, cursor: "not-allowed" }} />
              <div style={{ fontSize: 11, color: "rgba(255,255,255,0.35)", marginTop: 4 }}>Contact support to change email.</div>
            </div>
            <div>
              <label className="gm-label">Timezone</label>
              <select value={timezone} onChange={e => setTimezone(e.target.value)} className="gm-input">
                {["America/New_York", "America/Chicago", "America/Los_Angeles", "America/Denver", "Europe/London", "Europe/Paris", "Asia/Dubai", "Asia/Tokyo"].map(tz => (
                  <option key={tz} value={tz}>{tz.replace(/_/g, " ")}</option>
                ))}
              </select>
            </div>
          </div>
        </GlassCard>

        {/* Creative preferences */}
        <GlassCard>
          <SectionTitle icon="🎵" title="Creative Preferences" />
          <div style={{ marginTop: 16, display: "flex", flexDirection: "column", gap: 14 }}>
            <div>
              <label className="gm-label">Preferred Genre</label>
              <select value={genre} onChange={e => setGenre(e.target.value)} className="gm-input">
                <option value="">— no preference —</option>
                {["R&B / Soul", "Hip-Hop", "Pop", "Classical", "Jazz", "Gospel", "Electronic", "Cinematic Orchestral", "Country", "Rock"].map(g => (
                  <option key={g} value={g}>{g}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="gm-label">Preferred Mood</label>
              <select value={mood} onChange={e => setMood(e.target.value)} className="gm-input">
                <option value="">— no preference —</option>
                {["Celebratory", "Emotional / Healing", "Nostalgic", "Romantic", "Triumphant", "Reflective", "Epic", "Intimate"].map(m => (
                  <option key={m} value={m}>{m}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="gm-label">Member ID</label>
              <input value={member?.memberId ?? "—"} readOnly className="gm-input" style={{ opacity: 0.5, cursor: "not-allowed", fontFamily: "monospace", color: GOLD }} />
            </div>
          </div>
        </GlassCard>
      </div>

      {err && <div style={{ marginTop: 16, fontSize: 13, color: "#EF4444", padding: "10px 14px", background: "rgba(239,68,68,0.08)", borderRadius: 8 }}>{err}</div>}
      {saved && <div style={{ marginTop: 16, fontSize: 13, color: "#22C55E", padding: "10px 14px", background: "rgba(34,197,94,0.08)", borderRadius: 8 }}>✓ Settings saved.</div>}

      <div style={{ marginTop: 20, display: "flex", gap: 12 }}>
        <button onClick={save} disabled={saving} className="gm-cta-btn" style={{ opacity: saving ? 0.6 : 1 }}>{saving ? "Saving…" : "Save Changes"}</button>
      </div>

      {/* Danger zone */}
      <GlassCard style={{ marginTop: 28, border: "1px solid rgba(239,68,68,0.2)", background: "rgba(239,68,68,0.03)" }}>
        <SectionTitle icon="⚠️" title="Danger Zone" />
        <div style={{ marginTop: 14, display: "flex", flexDirection: "column", gap: 14 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "14px 16px", background: "rgba(239,68,68,0.05)", borderRadius: 10, border: "1px solid rgba(239,68,68,0.1)", flexWrap: "wrap", gap: 12 }}>
            <div>
              <div style={{ fontSize: 13, fontWeight: 600, color: "#FFFFFF" }}>Delete Account</div>
              <div style={{ fontSize: 12, color: "rgba(255,255,255,0.45)" }}>Permanently delete your account and all data.</div>
            </div>
            <button className="gm-pill-btn" style={{ borderColor: "rgba(239,68,68,0.4)", color: "#EF4444" }}
              onClick={() => alert("Please contact support@ghaafeedi.music to delete your account.")}>
              Request Deletion
            </button>
          </div>
        </div>
      </GlassCard>
    </div>
  );
}

// ─── Sophia AI Widget ─────────────────────────────────────────
function SophiaWidget() {
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState("");
  const [msgs, setMsgs] = useState<{ role: "user" | "sophia"; text: string }[]>([
    { role: "sophia", text: "Hello ✦ I'm Sophia. How can I help with your Ghaafeedi experience today?" }
  ]);
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => { if (open) bottomRef.current?.scrollIntoView({ behavior: "smooth" }); }, [msgs, open]);

  const send = async () => {
    if (!input.trim() || loading) return;
    const text = input.trim();
    setInput("");
    setMsgs(m => [...m, { role: "user", text }]);
    setLoading(true);
    try {
      const res = await fetch("/api/sophia/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: [{ role: "user", content: text }] }),
      });
      const json = await res.json();
      setMsgs(m => [...m, { role: "sophia", text: json.content ?? json.message ?? "I'm here to help!" }]);
    } catch {
      setMsgs(m => [...m, { role: "sophia", text: "Sorry, I had a connection issue. Please try again." }]);
    } finally { setLoading(false); }
  };

  return (
    <div style={{ position: "fixed", bottom: 24, right: 24, zIndex: 1000 }}>
      {/* Chat window */}
      <AnimatePresence>
        {open && (
          <motion.div initial={{ opacity: 0, y: 20, scale: 0.95 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 20, scale: 0.95 }}
            style={{ position: "absolute", bottom: 64, right: 0, width: 340, height: 460, background: "rgba(8,15,35,0.98)", border: `1px solid ${BORDER}`, borderRadius: 20, display: "flex", flexDirection: "column", overflow: "hidden", boxShadow: `0 24px 80px rgba(0,0,0,0.7), 0 0 0 1px ${BORDER}`, backdropFilter: "blur(24px)" }}>
            {/* Header */}
            <div style={{ padding: "14px 16px", background: `linear-gradient(135deg, rgba(212,175,55,0.12), rgba(11,23,54,0.9))`, borderBottom: `1px solid ${BORDER2}`, display: "flex", alignItems: "center", gap: 10 }}>
              <div style={{ width: 32, height: 32, borderRadius: "50%", background: `linear-gradient(135deg, ${GOLD}, #b8902a)`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16 }}>✦</div>
              <div>
                <div style={{ fontSize: 14, fontWeight: 700, color: GOLD, fontFamily: "Playfair Display, serif" }}>Sophia AI</div>
                <div style={{ fontSize: 11, color: "rgba(255,255,255,0.45)" }}>Your creative companion</div>
              </div>
              <button onClick={() => setOpen(false)} style={{ marginLeft: "auto", background: "none", border: "none", color: "rgba(255,255,255,0.4)", fontSize: 18, cursor: "pointer", lineHeight: 1 }}>×</button>
            </div>
            {/* Messages */}
            <div style={{ flex: 1, overflowY: "auto", padding: "14px 14px 8px", display: "flex", flexDirection: "column", gap: 10 }}>
              {msgs.map((m, i) => (
                <div key={i} style={{ display: "flex", flexDirection: m.role === "user" ? "row-reverse" : "row", gap: 8 }}>
                  {m.role === "sophia" && <div style={{ width: 26, height: 26, borderRadius: "50%", background: `linear-gradient(135deg, ${GOLD}, #b8902a)`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, flexShrink: 0, marginTop: 2 }}>✦</div>}
                  <div style={{ maxWidth: "78%", padding: "9px 13px", borderRadius: m.role === "user" ? "14px 14px 4px 14px" : "14px 14px 14px 4px", background: m.role === "user" ? `linear-gradient(135deg, ${GOLD}, #b8902a)` : GLASS2, color: m.role === "user" ? BG : "#FFFFFF", fontSize: 13, lineHeight: 1.5, border: m.role === "sophia" ? `1px solid ${BORDER2}` : "none" }}>{m.text}</div>
                </div>
              ))}
              {loading && (
                <div style={{ display: "flex", gap: 8 }}>
                  <div style={{ width: 26, height: 26, borderRadius: "50%", background: `linear-gradient(135deg, ${GOLD}, #b8902a)`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12 }}>✦</div>
                  <div style={{ padding: "10px 14px", background: GLASS2, borderRadius: "14px 14px 14px 4px", border: `1px solid ${BORDER2}`, display: "flex", gap: 5, alignItems: "center" }}>
                    {[0, 1, 2].map(i => <div key={i} className="sophia-dot" style={{ animationDelay: `${i * 0.15}s` }} />)}
                  </div>
                </div>
              )}
              <div ref={bottomRef} />
            </div>
            {/* Input */}
            <div style={{ padding: "10px 12px", borderTop: `1px solid ${BORDER2}`, display: "flex", gap: 8 }}>
              <input value={input} onChange={e => setInput(e.target.value)} onKeyDown={e => e.key === "Enter" && send()}
                placeholder="Ask Sophia anything…" style={{ flex: 1, background: GLASS, border: `1px solid ${BORDER2}`, borderRadius: 10, padding: "9px 12px", color: "#FFFFFF", fontSize: 13, fontFamily: "Inter, sans-serif", outline: "none" }} />
              <button onClick={send} disabled={loading} style={{ width: 38, height: 38, borderRadius: 10, background: loading ? GLASS : `linear-gradient(135deg, ${GOLD}, #b8902a)`, border: "none", cursor: "pointer", fontSize: 16, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>→</button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Floating button */}
      <motion.button whileHover={{ scale: 1.08 }} whileTap={{ scale: 0.95 }} onClick={() => setOpen(v => !v)}
        style={{ width: 54, height: 54, borderRadius: "50%", background: `linear-gradient(135deg, ${GOLD}, #b8902a)`, border: "none", cursor: "pointer", fontSize: 22, display: "flex", alignItems: "center", justifyContent: "center", boxShadow: `0 0 24px ${GOLD}60, 0 8px 32px rgba(0,0,0,0.5)`, position: "relative" }}>
        {open ? "×" : "✦"}
      </motion.button>
    </div>
  );
}

// ─── Shared UI primitives ─────────────────────────────────────
function GlassCard({ children, style }: { children: React.ReactNode; style?: React.CSSProperties }) {
  return (
    <div style={{ background: GLASS, border: `1px solid ${BORDER2}`, borderRadius: 16, padding: "20px 22px", backdropFilter: "blur(12px)", ...style }}>
      {children}
    </div>
  );
}

function PageHeader({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <div style={{ marginBottom: 28 }}>
      <h1 style={{ fontFamily: "Playfair Display, serif", fontSize: 28, fontWeight: 700, color: "#FFFFFF", margin: 0 }}>{title}</h1>
      {subtitle && <p style={{ fontSize: 14, color: "rgba(255,255,255,0.45)", margin: "6px 0 0", lineHeight: 1.5 }}>{subtitle}</p>}
    </div>
  );
}

function SectionTitle({ icon, title, count, action }: { icon: string; title: string; count?: number; action?: { label: string; onClick: () => void } }) {
  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <span style={{ fontSize: 16 }}>{icon}</span>
        <span style={{ fontFamily: "Playfair Display, serif", fontSize: 15, fontWeight: 700, color: GOLD }}>{title}</span>
        {count != null && <span style={{ fontSize: 12, color: "rgba(255,255,255,0.4)", background: GLASS2, borderRadius: 20, padding: "2px 8px" }}>{count}</span>}
      </div>
      {action && <button onClick={action.onClick} style={{ fontSize: 12, color: GOLD, background: "none", border: "none", cursor: "pointer", fontFamily: "Inter, sans-serif" }}>{action.label} →</button>}
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const color = STATUS_COLORS[status] ?? "rgba(255,255,255,0.4)";
  return (
    <span style={{ fontSize: 11, fontWeight: 700, color, background: `${color}18`, borderRadius: 6, padding: "3px 8px", textTransform: "uppercase", letterSpacing: "0.05em", whiteSpace: "nowrap" }}>
      {status}
    </span>
  );
}

function GoldBadge({ children, color = "rgba(212,175,55,0.7)" }: { children: React.ReactNode; color?: string }) {
  return (
    <span style={{ fontSize: 11, fontWeight: 700, color, background: `${color}18`, borderRadius: 6, padding: "3px 10px", border: `1px solid ${color}40`, whiteSpace: "nowrap" }}>
      {children}
    </span>
  );
}

function StatPill({ label, value, color = GOLD }: { label: string; value: string; color?: string }) {
  return (
    <div style={{ padding: "10px 16px", background: GLASS, border: `1px solid ${BORDER2}`, borderRadius: 10, textAlign: "center" }}>
      <div style={{ fontSize: 10, color: "rgba(255,255,255,0.4)", marginBottom: 4, textTransform: "uppercase", letterSpacing: "0.08em" }}>{label}</div>
      <div style={{ fontSize: 14, fontWeight: 700, color }}>{value}</div>
    </div>
  );
}

function MiniProductionCard({ prod }: { prod: Production }) {
  const stage = stageMap[prod.currentStage] ?? { label: prod.currentStage, color: "#64748B", pct: 0 };
  return (
    <div style={{ marginBottom: 12, padding: "12px 14px", background: "rgba(255,255,255,0.02)", borderRadius: 10, border: `1px solid ${BORDER2}` }}>
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
        <span style={{ fontSize: 12, color: "#FFFFFF", fontWeight: 500 }}>{prod.productSlug.replace(/-/g, " ").slice(0, 28)}</span>
        <span style={{ fontSize: 11, fontWeight: 700, color: stage.color }}>{stage.pct}%</span>
      </div>
      <div style={{ height: 4, background: BORDER2, borderRadius: 2, overflow: "hidden" }}>
        <div style={{ height: "100%", width: `${stage.pct}%`, background: `linear-gradient(90deg, ${stage.color}, ${stage.color}88)`, borderRadius: 2, transition: "width 0.5s" }} />
      </div>
      <div style={{ fontSize: 11, color: "rgba(255,255,255,0.35)", marginTop: 5 }}>{stage.label}</div>
    </div>
  );
}

function EmptyState({ icon, title, desc, cta, onCta }: { icon: string; title: string; desc: string; cta?: string; onCta?: () => void }) {
  return (
    <div style={{ textAlign: "center", padding: "56px 24px" }}>
      <div style={{ fontSize: 48, marginBottom: 16 }}>{icon}</div>
      <h3 style={{ fontFamily: "Playfair Display, serif", fontSize: 22, color: GOLD, margin: "0 0 10px" }}>{title}</h3>
      <p style={{ fontSize: 14, color: "rgba(255,255,255,0.45)", marginBottom: 24, maxWidth: 400, margin: "0 auto 24px", lineHeight: 1.6 }}>{desc}</p>
      {cta && onCta && <button onClick={onCta} className="gm-cta-btn">{cta}</button>}
    </div>
  );
}

function EmptyMini({ icon, text, sub }: { icon: string; text: string; sub?: string }) {
  return (
    <div style={{ textAlign: "center", padding: "28px 16px", color: "rgba(255,255,255,0.35)" }}>
      <div style={{ fontSize: 28, marginBottom: 8 }}>{icon}</div>
      <div style={{ fontSize: 13 }}>{text}</div>
      {sub && <div style={{ fontSize: 11, marginTop: 4, color: "rgba(255,255,255,0.25)" }}>{sub}</div>}
    </div>
  );
}

function LoadingScreen() {
  return (
    <div style={{ minHeight: "100vh", background: BG, display: "flex", alignItems: "center", justifyContent: "center" }}>
      <div style={{ textAlign: "center" }}>
        <div style={{ width: 52, height: 52, border: `3px solid rgba(212,175,55,0.15)`, borderTopColor: GOLD, borderRadius: "50%", animation: "spin 0.8s linear infinite", margin: "0 auto 18px" }} />
        <p style={{ color: "rgba(255,255,255,0.35)", fontFamily: "Inter, sans-serif", fontSize: 13 }}>Loading your dashboard…</p>
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    </div>
  );
}

// ─── Helpers ──────────────────────────────────────────────────
function formatDate(d: string | Date | null | undefined): string {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

function relativeTime(d: string): string {
  const diff = Date.now() - new Date(d).getTime();
  if (diff < 60_000) return "just now";
  if (diff < 3_600_000) return `${Math.floor(diff / 60_000)}m ago`;
  if (diff < 86_400_000) return `${Math.floor(diff / 3_600_000)}h ago`;
  return `${Math.floor(diff / 86_400_000)}d ago`;
}

// ─── Global CSS ───────────────────────────────────────────────
const GLOBAL_CSS = `
@import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@400;600;700;900&family=Inter:wght@300;400;500;600;700&display=swap');

*, *::before, *::after { box-sizing: border-box; }

body { margin: 0; }

::-webkit-scrollbar { width: 4px; height: 4px; }
::-webkit-scrollbar-track { background: rgba(0,0,0,0.2); }
::-webkit-scrollbar-thumb { background: rgba(212,175,55,0.3); border-radius: 2px; }

.gm-blob {
  position: fixed; border-radius: 50%; filter: blur(80px);
  pointer-events: none; z-index: 0;
}
.gm-blob-1 {
  width: 600px; height: 600px;
  background: radial-gradient(circle, rgba(212,175,55,0.07) 0%, transparent 70%);
  top: -200px; right: -200px;
}
.gm-blob-2 {
  width: 500px; height: 500px;
  background: radial-gradient(circle, rgba(99,102,241,0.06) 0%, transparent 70%);
  bottom: 100px; left: -150px;
}

/* Sidebar */
.gm-sidebar {
  width: 240px;
  min-height: calc(100vh - 64px);
  background: rgba(5,11,26,0.85);
  border-right: 1px solid rgba(212,175,55,0.1);
  backdrop-filter: blur(16px);
  position: fixed;
  top: 64px;
  left: 0;
  bottom: 0;
  z-index: 40;
  display: flex;
  flex-direction: column;
  overflow-y: auto;
  transform: translateX(0);
  transition: transform 0.28s cubic-bezier(0.4,0,0.2,1);
}

.gm-main {
  margin-left: 240px;
}

.gm-nav-item {
  width: 100%;
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 12px;
  border-radius: 10px;
  border: none;
  background: transparent;
  color: rgba(255,255,255,0.5);
  font-size: 13px;
  font-family: Inter, sans-serif;
  cursor: pointer;
  margin-bottom: 2px;
  transition: all 0.18s;
  text-align: left;
}
.gm-nav-item:hover { background: rgba(255,255,255,0.04); color: rgba(255,255,255,0.8); }
.gm-nav-item-active { background: rgba(212,175,55,0.1) !important; color: #D4AF37 !important; font-weight: 600; }
.gm-nav-icon { font-size: 16px; width: 22px; text-align: center; flex-shrink: 0; }

.gm-icon-btn { background: none; border: none; cursor: pointer; padding: 0; display: flex; align-items: center; justify-content: center; }

.gm-hamburger {
  width: 36px; height: 36px; flex-direction: column; justify-content: center;
  gap: 5px; padding: 8px; border-radius: 8px;
  transition: background 0.2s;
}
.gm-hamburger:hover { background: rgba(255,255,255,0.05); }
.gm-hamburger span { display: block; width: 18px; height: 2px; background: rgba(255,255,255,0.6); border-radius: 1px; }

.gm-nav-greeting { display: block; }

.gm-pill-btn {
  padding: 7px 16px;
  background: rgba(255,255,255,0.05);
  border: 1px solid rgba(255,255,255,0.1);
  border-radius: 8px;
  color: rgba(255,255,255,0.7);
  font-size: 12px;
  font-family: Inter, sans-serif;
  cursor: pointer;
  transition: all 0.18s;
  white-space: nowrap;
}
.gm-pill-btn:hover { background: rgba(255,255,255,0.09); color: #FFFFFF; }
.gm-pill-ghost { color: rgba(255,255,255,0.4); }

.gm-cta-btn {
  padding: 12px 24px;
  background: linear-gradient(135deg, #D4AF37, #b8902a);
  border: none;
  border-radius: 10px;
  color: #050B1A;
  font-size: 14px;
  font-weight: 700;
  cursor: pointer;
  font-family: Inter, sans-serif;
  transition: all 0.2s;
  display: inline-block;
  box-shadow: 0 0 20px rgba(212,175,55,0.25);
}
.gm-cta-btn:hover { transform: translateY(-1px); box-shadow: 0 4px 24px rgba(212,175,55,0.4); }
.gm-cta-btn:disabled { opacity: 0.5; transform: none; }

.gm-stats-row {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(160px, 1fr));
  gap: 14px;
  margin-bottom: 28px;
}

.gm-stat-card {
  background: rgba(255,255,255,0.04);
  border: 1px solid rgba(255,255,255,0.07);
  border-radius: 14px;
  padding: 20px 18px;
  backdrop-filter: blur(8px);
  transition: border-color 0.2s, background 0.2s;
}
.gm-stat-card:hover { border-color: rgba(212,175,55,0.2); background: rgba(212,175,55,0.04); }

.gm-two-col {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 20px;
}

.gm-three-col {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 16px;
}

.gm-filter-chip {
  padding: 7px 16px;
  border-radius: 20px;
  border: 1px solid rgba(255,255,255,0.1);
  background: transparent;
  color: rgba(255,255,255,0.5);
  font-size: 12px;
  font-family: Inter, sans-serif;
  cursor: pointer;
  transition: all 0.18s;
}
.gm-filter-chip:hover { border-color: rgba(212,175,55,0.3); color: rgba(255,255,255,0.8); }
.gm-filter-chip-active { background: rgba(212,175,55,0.12) !important; border-color: rgba(212,175,55,0.4) !important; color: #D4AF37 !important; font-weight: 600; }

.gm-label {
  display: block;
  font-size: 11px;
  color: rgba(255,255,255,0.5);
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  margin-bottom: 6px;
  font-family: Inter, sans-serif;
}

.gm-input {
  width: 100%;
  padding: 11px 14px;
  background: rgba(255,255,255,0.05);
  border: 1px solid rgba(255,255,255,0.1);
  border-radius: 10px;
  color: #FFFFFF;
  font-size: 13px;
  font-family: Inter, sans-serif;
  outline: none;
  transition: border-color 0.18s;
}
.gm-input:focus { border-color: rgba(212,175,55,0.4); }
.gm-input::placeholder { color: rgba(255,255,255,0.25); }
.gm-input option { background: #0B1736; color: #FFFFFF; }
textarea.gm-input { min-height: 100px; }

.gm-table-row:hover { background: rgba(255,255,255,0.025); }

.sophia-dot {
  width: 7px; height: 7px; border-radius: 50%;
  background: rgba(212,175,55,0.6);
  animation: sophia-pulse 1s ease-in-out infinite;
}
@keyframes sophia-pulse {
  0%, 100% { opacity: 0.4; transform: scale(0.8); }
  50% { opacity: 1; transform: scale(1.1); }
}
@keyframes gmPulse {
  0% { transform: translateX(-100%); }
  50% { transform: translateX(200%); }
  100% { transform: translateX(200%); }
}

/* Mobile responsive */
@media (max-width: 900px) {
  .gm-sidebar { transform: translateX(-100%); }
  .gm-sidebar.gm-sidebar-open { transform: translateX(0); }
  .gm-main { margin-left: 0 !important; }
  .gm-two-col { grid-template-columns: 1fr !important; }
  .gm-three-col { grid-template-columns: 1fr 1fr !important; }
  .gm-nav-greeting { display: none; }
}
@media (max-width: 600px) {
  .gm-three-col { grid-template-columns: 1fr !important; }
  .gm-stats-row { grid-template-columns: 1fr 1fr !important; }
}
`;
