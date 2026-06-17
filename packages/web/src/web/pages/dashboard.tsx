import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { motion } from "framer-motion";
import { authClient, clearToken } from "../lib/authClient";
import { api } from "../lib/api";

const GOLD = "#D4AF37";
const GOLD2 = "#FFC24D";
const BG = "#050B1A";
const NAVY = "#0B1736";

interface MemberData {
  id: string;
  memberId: string;
  status: string;
  tier: string;
  joinedAt: string;
  profile?: { role: string; onboardingComplete: boolean } | null;
  email?: string;
  name?: string;
  subscriptions?: unknown[];
}

interface Order {
  id: string;
  productSlug: string;
  productName: string;
  tier: string;
  priceCents: number;
  status: string;
  createdAt: string;
  memberId?: string;
}

interface Production {
  id: string;
  orderId: string;
  productSlug: string;
  status: string;
  currentStage: string;
  revisionCount: number;
  maxRevisions: number;
  estimatedDeliveryAt?: string;
  deliveredAt?: string;
  createdAt: string;
}

const STAGE_LABELS: Record<string, { label: string; color: string; pct: number }> = {
  queued:             { label: "Queued",              color: "#64748B", pct: 5  },
  story_submitted:    { label: "Story Received",      color: "#8B5CF6", pct: 20 },
  media_uploaded:     { label: "Media Uploaded",      color: "#6366F1", pct: 30 },
  ai_analyzing:       { label: "AI Analyzing",        color: "#F59E0B", pct: 40 },
  ai_complete:        { label: "Analysis Complete",   color: "#10B981", pct: 50 },
  music_generating:   { label: "Composing Music",     color: "#EC4899", pct: 60 },
  music_complete:     { label: "Music Complete",      color: "#10B981", pct: 70 },
  video_generating:   { label: "Rendering Film",      color: "#F97316", pct: 80 },
  video_complete:     { label: "Film Complete",       color: "#10B981", pct: 88 },
  in_review:          { label: "In Review",           color: GOLD,      pct: 92 },
  revision_requested: { label: "Revision Requested",  color: "#EF4444", pct: 90 },
  delivered:          { label: "Delivered ✓",         color: "#22C55E", pct: 100 },
  archived:           { label: "Archived",            color: "#475569", pct: 100 },
};

const ORDER_STATUS_COLOR: Record<string, string> = {
  pending:    "#F59E0B",
  processing: "#6366F1",
  completed:  "#22C55E",
  failed:     "#EF4444",
  refunded:   "#64748B",
};

export default function Dashboard() {
  const [, setLocation] = useLocation();
  const { data: session, isPending } = authClient.useSession();
  const [member, setMember] = useState<MemberData | null>(null);
  const [orders, setOrders] = useState<Order[]>([]);
  const [productions, setProductions] = useState<Production[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"overview" | "productions" | "orders" | "membership">("overview");
  const [gmCopied, setGmCopied] = useState(false);

  useEffect(() => {
    if (isPending) return;
    if (!session) { setLocation("/signin?redirect=/dashboard"); return; }
    loadData();
  }, [session, isPending]);

  async function loadData() {
    setLoading(true);
    try {
      // Ensure member record exists
      await api.members.create.$post();
      const [meRes, ordersRes, prodsRes] = await Promise.all([
        api.members.me.$get(),
        api.members.orders.$get(),
        api.members.productions.$get(),
      ]);
      const meData = await meRes.json();
      const ordersData = await ordersRes.json();
      const prodsData = await prodsRes.json();
      setMember(meData.member as MemberData);
      setOrders((ordersData.orders ?? []) as Order[]);
      setProductions((prodsData.productions ?? []) as Production[]);
    } catch (e) {
      console.error("Dashboard load error:", e);
    } finally {
      setLoading(false);
    }
  }

  const handleSignOut = async () => {
    await authClient.signOut();
    clearToken();
    setLocation("/");
  };

  const copyMemberId = () => {
    if (member?.memberId) {
      navigator.clipboard.writeText(member.memberId).catch(() => {});
      setGmCopied(true);
      setTimeout(() => setGmCopied(false), 2000);
    }
  };

  if (isPending || loading) {
    return (
      <div style={{ minHeight: "100vh", background: BG, display: "flex", alignItems: "center", justifyContent: "center" }}>
        <div style={{ textAlign: "center" }}>
          <div style={{ width: 48, height: 48, border: `3px solid rgba(212,175,55,0.2)`, borderTopColor: GOLD, borderRadius: "50%", animation: "spin 0.8s linear infinite", margin: "0 auto 16px" }} />
          <p style={{ color: "rgba(255,255,255,0.4)", fontFamily: "Inter, sans-serif", fontSize: 13 }}>Loading your dashboard…</p>
          <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
        </div>
      </div>
    );
  }

  const tabs = [
    { id: "overview" as const, label: "Overview" },
    { id: "productions" as const, label: `Productions ${productions.length ? `(${productions.length})` : ""}` },
    { id: "orders" as const, label: `Orders ${orders.length ? `(${orders.length})` : ""}` },
    { id: "membership" as const, label: "Membership" },
  ];

  return (
    <div style={{ minHeight: "100vh", background: BG, fontFamily: "Inter, sans-serif" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@400;600;700;900&family=Inter:wght@300;400;500;600;700&display=swap');
        * { box-sizing: border-box; }
        ::-webkit-scrollbar { width: 4px; } ::-webkit-scrollbar-track { background: #010510; } ::-webkit-scrollbar-thumb { background: rgba(212,175,55,0.3); border-radius: 2px; }
      `}</style>

      {/* Navbar */}
      <nav style={{ position: "fixed", top: 0, left: 0, right: 0, zIndex: 100, padding: "16px 40px", background: "rgba(5,11,26,0.95)", borderBottom: "1px solid rgba(212,175,55,0.1)", backdropFilter: "blur(12px)", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <button onClick={() => setLocation("/")} style={{ background: "none", border: "none", cursor: "pointer", fontFamily: "Playfair Display, serif", fontWeight: 700, fontSize: 16, background: `linear-gradient(135deg, ${GOLD} 0%, ${GOLD2} 100%)`, WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" } as React.CSSProperties}>
          Ghaafeedi Music
        </button>
        <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
          <button onClick={() => setLocation("/products")} style={{ padding: "8px 18px", background: "transparent", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 8, color: "rgba(255,255,255,0.6)", fontSize: 12, cursor: "pointer", fontFamily: "Inter, sans-serif" }}>Browse Products</button>
          <button onClick={handleSignOut} style={{ padding: "8px 18px", background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 8, color: "rgba(255,255,255,0.5)", fontSize: 12, cursor: "pointer", fontFamily: "Inter, sans-serif" }}>Sign Out</button>
        </div>
      </nav>

      <div style={{ paddingTop: 72, maxWidth: 1100, margin: "0 auto", padding: "88px 24px 80px" }}>

        {/* Member hero header */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
          style={{ background: `linear-gradient(135deg, rgba(11,23,54,0.9) 0%, rgba(5,11,26,0.95) 100%)`, border: "1px solid rgba(212,175,55,0.2)", borderRadius: 20, padding: "32px 36px", marginBottom: 32, display: "flex", alignItems: "center", justifyContent: "space-between", gap: 24, flexWrap: "wrap", boxShadow: "0 0 60px rgba(212,175,55,0.04)" }}>
          <div>
            <div style={{ fontSize: 11, color: "rgba(255,255,255,0.4)", letterSpacing: "0.15em", textTransform: "uppercase", marginBottom: 4 }}>Ghaafeedi Music Member</div>
            <h1 style={{ fontFamily: "Playfair Display, serif", fontSize: 28, fontWeight: 700, color: "#FFFFFF", margin: "0 0 8px" }}>
              Welcome back, {session?.user?.name?.split(" ")[0] ?? "Member"}
            </h1>
            {member?.memberId && (
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <div style={{ display: "inline-flex", alignItems: "center", gap: 8, background: "rgba(212,175,55,0.08)", border: "1px solid rgba(212,175,55,0.3)", borderRadius: 8, padding: "6px 14px" }}>
                  <span style={{ fontSize: 12, color: "rgba(255,255,255,0.5)", fontFamily: "mono, monospace" }}>Member ID</span>
                  <span style={{ fontSize: 14, color: GOLD, fontWeight: 700, fontFamily: "monospace", letterSpacing: "0.1em" }}>{member.memberId}</span>
                </div>
                <button onClick={copyMemberId} style={{ padding: "6px 12px", background: "transparent", border: "1px solid rgba(212,175,55,0.2)", borderRadius: 8, color: gmCopied ? "#22C55E" : "rgba(255,255,255,0.5)", fontSize: 11, cursor: "pointer", fontFamily: "Inter, sans-serif", transition: "all 0.2s" }}>
                  {gmCopied ? "✓ Copied" : "Copy"}
                </button>
              </div>
            )}
          </div>
          <div style={{ display: "flex", gap: 16, flexWrap: "wrap" }}>
            {[
              { label: "Tier", value: member?.tier ? member.tier.charAt(0).toUpperCase() + member.tier.slice(1) : "Free" },
              { label: "Orders", value: orders.length.toString() },
              { label: "Productions", value: productions.length.toString() },
              { label: "Status", value: member?.status === "active" ? "✓ Active" : member?.status ?? "—" },
            ].map((stat, i) => (
              <div key={i} style={{ textAlign: "center", padding: "12px 20px", background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 12 }}>
                <div style={{ fontSize: 10, color: "rgba(255,255,255,0.4)", letterSpacing: "0.1em", marginBottom: 4 }}>{stat.label}</div>
                <div style={{ fontSize: 16, fontWeight: 700, color: i === 3 && member?.status === "active" ? "#22C55E" : GOLD, fontFamily: "Playfair Display, serif" }}>{stat.value}</div>
              </div>
            ))}
          </div>
        </motion.div>

        {/* Tabs */}
        <div style={{ display: "flex", gap: 4, marginBottom: 28, background: "rgba(11,23,54,0.5)", border: "1px solid rgba(255,255,255,0.06)", borderRadius: 12, padding: 4, width: "fit-content" }}>
          {tabs.map(tab => (
            <button key={tab.id} onClick={() => setActiveTab(tab.id)}
              style={{ padding: "9px 20px", borderRadius: 9, border: "none", background: activeTab === tab.id ? "rgba(212,175,55,0.12)" : "transparent", color: activeTab === tab.id ? GOLD : "rgba(255,255,255,0.5)", fontSize: 13, fontWeight: activeTab === tab.id ? 600 : 400, cursor: "pointer", fontFamily: "Inter, sans-serif", transition: "all 0.18s", borderBottom: activeTab === tab.id ? `2px solid ${GOLD}` : "2px solid transparent" }}>
              {tab.label}
            </button>
          ))}
        </div>

        {/* Overview tab */}
        {activeTab === "overview" && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
            {productions.length === 0 && orders.length === 0 ? (
              <div style={{ textAlign: "center", padding: "60px 24px" }}>
                <div style={{ fontSize: 48, marginBottom: 16 }}>✦</div>
                <h2 style={{ fontFamily: "Playfair Display, serif", fontSize: 24, color: GOLD, margin: "0 0 12px" }}>Your Legacy Awaits</h2>
                <p style={{ fontSize: 14, color: "rgba(255,255,255,0.5)", marginBottom: 28, maxWidth: 420, margin: "0 auto 28px" }}>
                  You haven't started any productions yet. Explore our 14 premium experiences and begin your first creation.
                </p>
                <button onClick={() => setLocation("/products")}
                  style={{ padding: "14px 32px", background: `linear-gradient(135deg, ${GOLD}, #b8902a)`, border: "none", borderRadius: 10, color: BG, fontSize: 14, fontWeight: 700, cursor: "pointer", fontFamily: "Inter, sans-serif", boxShadow: "0 0 24px rgba(212,175,55,0.3)" }}>
                  Explore All 14 Experiences
                </button>
              </div>
            ) : (
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
                {/* Recent productions */}
                <div style={{ background: "rgba(11,23,54,0.5)", border: "1px solid rgba(212,175,55,0.12)", borderRadius: 16, padding: "24px" }}>
                  <h3 style={{ fontFamily: "Playfair Display, serif", fontSize: 16, color: GOLD, margin: "0 0 16px" }}>Active Productions</h3>
                  {productions.slice(0, 3).map(prod => (
                    <ProductionCard key={prod.id} prod={prod} />
                  ))}
                  {productions.length > 3 && (
                    <button onClick={() => setActiveTab("productions")} style={{ fontSize: 12, color: GOLD, background: "none", border: "none", cursor: "pointer", fontFamily: "Inter, sans-serif", marginTop: 8 }}>View all {productions.length} productions →</button>
                  )}
                </div>
                {/* Recent orders */}
                <div style={{ background: "rgba(11,23,54,0.5)", border: "1px solid rgba(212,175,55,0.12)", borderRadius: 16, padding: "24px" }}>
                  <h3 style={{ fontFamily: "Playfair Display, serif", fontSize: 16, color: GOLD, margin: "0 0 16px" }}>Recent Orders</h3>
                  {orders.slice(0, 4).map(order => (
                    <OrderRow key={order.id} order={order} />
                  ))}
                  {orders.length > 4 && (
                    <button onClick={() => setActiveTab("orders")} style={{ fontSize: 12, color: GOLD, background: "none", border: "none", cursor: "pointer", fontFamily: "Inter, sans-serif", marginTop: 8 }}>View all {orders.length} orders →</button>
                  )}
                </div>
              </div>
            )}
          </motion.div>
        )}

        {/* Productions tab */}
        {activeTab === "productions" && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
            {productions.length === 0 ? (
              <EmptyState icon="🎬" title="No Productions Yet" desc="Your productions will appear here once you purchase an experience." cta="Browse Experiences" onCta={() => setLocation("/products")} />
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                {productions.map(prod => <ProductionCardFull key={prod.id} prod={prod} />)}
              </div>
            )}
          </motion.div>
        )}

        {/* Orders tab */}
        {activeTab === "orders" && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
            {orders.length === 0 ? (
              <EmptyState icon="🛒" title="No Orders Yet" desc="Your purchase history will appear here." cta="Browse Products" onCta={() => setLocation("/products")} />
            ) : (
              <div style={{ background: "rgba(11,23,54,0.5)", border: "1px solid rgba(212,175,55,0.12)", borderRadius: 16, overflow: "hidden" }}>
                <div style={{ padding: "16px 24px", borderBottom: "1px solid rgba(212,175,55,0.08)", display: "grid", gridTemplateColumns: "1fr 1fr auto auto auto", gap: 12 }}>
                  {["Order ID", "Product", "Tier", "Amount", "Status"].map(h => (
                    <span key={h} style={{ fontSize: 10, color: "rgba(255,255,255,0.4)", fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase" }}>{h}</span>
                  ))}
                </div>
                {orders.map((order, i) => (
                  <div key={order.id} style={{ padding: "14px 24px", borderBottom: i < orders.length - 1 ? "1px solid rgba(255,255,255,0.04)" : "none", display: "grid", gridTemplateColumns: "1fr 1fr auto auto auto", gap: 12, alignItems: "center" }}>
                    <span style={{ fontSize: 12, color: "rgba(255,255,255,0.4)", fontFamily: "monospace" }}>{order.id.slice(0, 12)}…</span>
                    <span style={{ fontSize: 13, color: "#FFFFFF" }}>{order.productName}</span>
                    <span style={{ fontSize: 12, color: "rgba(255,255,255,0.6)", background: "rgba(255,255,255,0.05)", borderRadius: 6, padding: "2px 8px" }}>{order.tier}</span>
                    <span style={{ fontSize: 13, color: GOLD, fontWeight: 600 }}>${(order.priceCents / 100).toFixed(2)}</span>
                    <span style={{ fontSize: 11, fontWeight: 700, color: ORDER_STATUS_COLOR[order.status] ?? "#FFFFFF", background: `${ORDER_STATUS_COLOR[order.status] ?? "#FFFFFF"}18`, borderRadius: 6, padding: "3px 8px", textTransform: "uppercase", letterSpacing: "0.05em" }}>{order.status}</span>
                  </div>
                ))}
              </div>
            )}
          </motion.div>
        )}

        {/* Membership tab */}
        {activeTab === "membership" && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
              {/* Member card */}
              <div style={{ background: `linear-gradient(135deg, rgba(212,175,55,0.08) 0%, rgba(11,23,54,0.9) 100%)`, border: "1px solid rgba(212,175,55,0.25)", borderRadius: 20, padding: "32px 28px", boxShadow: "0 0 40px rgba(212,175,55,0.06)" }}>
                <div style={{ fontSize: 11, color: GOLD, letterSpacing: "0.15em", marginBottom: 20 }}>GHAAFEEDI MUSIC · MEMBER CARD</div>
                <div style={{ fontFamily: "Playfair Display, serif", fontSize: 22, color: "#FFFFFF", marginBottom: 4 }}>{session?.user?.name ?? "—"}</div>
                <div style={{ fontSize: 13, color: "rgba(255,255,255,0.5)", marginBottom: 24 }}>{session?.user?.email ?? "—"}</div>
                {member?.memberId && (
                  <div style={{ padding: "16px 18px", background: "rgba(0,0,0,0.3)", borderRadius: 12, marginBottom: 16 }}>
                    <div style={{ fontSize: 10, color: "rgba(255,255,255,0.4)", letterSpacing: "0.15em", marginBottom: 6 }}>MEMBER ID</div>
                    <div style={{ fontFamily: "monospace", fontSize: 22, fontWeight: 700, color: GOLD, letterSpacing: "0.12em" }}>{member.memberId}</div>
                  </div>
                )}
                <div style={{ display: "flex", gap: 12 }}>
                  <div style={{ flex: 1, padding: "10px 14px", background: "rgba(212,175,55,0.06)", border: "1px solid rgba(212,175,55,0.15)", borderRadius: 10 }}>
                    <div style={{ fontSize: 10, color: "rgba(255,255,255,0.4)", marginBottom: 4 }}>TIER</div>
                    <div style={{ fontSize: 14, fontWeight: 700, color: GOLD }}>{member?.tier ? member.tier.charAt(0).toUpperCase() + member.tier.slice(1) : "Free"}</div>
                  </div>
                  <div style={{ flex: 1, padding: "10px 14px", background: "rgba(212,175,55,0.06)", border: "1px solid rgba(212,175,55,0.15)", borderRadius: 10 }}>
                    <div style={{ fontSize: 10, color: "rgba(255,255,255,0.4)", marginBottom: 4 }}>STATUS</div>
                    <div style={{ fontSize: 14, fontWeight: 700, color: "#22C55E" }}>{member?.status === "active" ? "✓ Active" : member?.status ?? "—"}</div>
                  </div>
                </div>
              </div>

              {/* Account details */}
              <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                <div style={{ background: "rgba(11,23,54,0.5)", border: "1px solid rgba(212,175,55,0.12)", borderRadius: 16, padding: "24px" }}>
                  <h3 style={{ fontFamily: "Playfair Display, serif", fontSize: 16, color: GOLD, margin: "0 0 16px" }}>Account Details</h3>
                  {[
                    { label: "Name", value: session?.user?.name ?? "—" },
                    { label: "Email", value: session?.user?.email ?? "—" },
                    { label: "Member ID", value: member?.memberId ?? "—" },
                    { label: "Joined", value: member?.joinedAt ? new Date(member.joinedAt).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" }) : "—" },
                  ].map((row, i) => (
                    <div key={i} style={{ display: "flex", justifyContent: "space-between", padding: "10px 0", borderBottom: i < 3 ? "1px solid rgba(255,255,255,0.04)" : "none" }}>
                      <span style={{ fontSize: 12, color: "rgba(255,255,255,0.4)" }}>{row.label}</span>
                      <span style={{ fontSize: 13, color: "#FFFFFF", fontFamily: row.label === "Member ID" ? "monospace" : "Inter, sans-serif" }}>{row.value}</span>
                    </div>
                  ))}
                </div>

                <div style={{ background: "rgba(11,23,54,0.5)", border: "1px solid rgba(212,175,55,0.12)", borderRadius: 16, padding: "24px" }}>
                  <h3 style={{ fontFamily: "Playfair Display, serif", fontSize: 16, color: GOLD, margin: "0 0 12px" }}>Upgrade Membership</h3>
                  <p style={{ fontSize: 13, color: "rgba(255,255,255,0.5)", marginBottom: 16 }}>Access priority production queues, exclusive experiences, and dedicated support.</p>
                  <button onClick={() => setLocation("/products")}
                    style={{ width: "100%", padding: "12px", background: `linear-gradient(135deg, ${GOLD}, #b8902a)`, border: "none", borderRadius: 10, color: BG, fontSize: 13, fontWeight: 700, cursor: "pointer", fontFamily: "Inter, sans-serif" }}>
                    Explore Upgrade Options →
                  </button>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </div>
    </div>
  );
}

// ─── Sub-components ────────────────────────────────────────────────────────────

function ProductionCard({ prod }: { prod: Production }) {
  const stage = STAGE_LABELS[prod.currentStage] ?? { label: prod.currentStage, color: "#64748B", pct: 0 };
  return (
    <div style={{ marginBottom: 14, padding: "14px 16px", background: "rgba(255,255,255,0.03)", borderRadius: 12 }}>
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
        <span style={{ fontSize: 12, fontFamily: "monospace", color: "rgba(255,255,255,0.5)" }}>{prod.id}</span>
        <span style={{ fontSize: 11, fontWeight: 700, color: stage.color }}>{stage.label}</span>
      </div>
      <div style={{ height: 4, background: "rgba(255,255,255,0.06)", borderRadius: 2, overflow: "hidden" }}>
        <div style={{ height: "100%", width: `${stage.pct}%`, background: `linear-gradient(90deg, ${stage.color}, ${stage.color}88)`, borderRadius: 2, transition: "width 0.5s ease" }} />
      </div>
      <div style={{ fontSize: 11, color: "rgba(255,255,255,0.35)", marginTop: 6 }}>{prod.productSlug.replace(/-/g, " ")}</div>
    </div>
  );
}

function ProductionCardFull({ prod }: { prod: Production }) {
  const stage = STAGE_LABELS[prod.currentStage] ?? { label: prod.currentStage, color: "#64748B", pct: 0 };
  return (
    <div style={{ background: "rgba(11,23,54,0.5)", border: "1px solid rgba(212,175,55,0.1)", borderRadius: 16, padding: "24px 28px" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 16 }}>
        <div>
          <div style={{ fontSize: 11, color: "rgba(255,255,255,0.4)", fontFamily: "monospace", marginBottom: 4 }}>{prod.id}</div>
          <div style={{ fontSize: 15, color: "#FFFFFF", fontWeight: 600 }}>{prod.productSlug.replace(/-/g, " ").replace(/\b\w/g, c => c.toUpperCase())}</div>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <span style={{ fontSize: 11, fontWeight: 700, color: stage.color, background: `${stage.color}18`, borderRadius: 6, padding: "4px 10px" }}>{stage.label}</span>
        </div>
      </div>
      {/* Progress bar */}
      <div style={{ marginBottom: 16 }}>
        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
          <span style={{ fontSize: 11, color: "rgba(255,255,255,0.4)" }}>Production Progress</span>
          <span style={{ fontSize: 11, color: GOLD, fontWeight: 600 }}>{stage.pct}%</span>
        </div>
        <div style={{ height: 6, background: "rgba(255,255,255,0.06)", borderRadius: 3, overflow: "hidden" }}>
          <div style={{ height: "100%", width: `${stage.pct}%`, background: `linear-gradient(90deg, ${GOLD}, ${GOLD2})`, borderRadius: 3, transition: "width 0.6s ease" }} />
        </div>
      </div>
      <div style={{ display: "flex", gap: 20, flexWrap: "wrap" }}>
        {prod.estimatedDeliveryAt && (
          <div style={{ fontSize: 12, color: "rgba(255,255,255,0.5)" }}>
            Est. delivery: <span style={{ color: "#FFFFFF" }}>{new Date(prod.estimatedDeliveryAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}</span>
          </div>
        )}
        {prod.maxRevisions > 0 && (
          <div style={{ fontSize: 12, color: "rgba(255,255,255,0.5)" }}>
            Revisions: <span style={{ color: "#FFFFFF" }}>{prod.revisionCount}/{prod.maxRevisions}</span>
          </div>
        )}
        <div style={{ fontSize: 12, color: "rgba(255,255,255,0.5)" }}>
          Created: <span style={{ color: "#FFFFFF" }}>{new Date(prod.createdAt).toLocaleDateString()}</span>
        </div>
      </div>
    </div>
  );
}

function OrderRow({ order }: { order: Order }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 0", borderBottom: "1px solid rgba(255,255,255,0.04)" }}>
      <div>
        <div style={{ fontSize: 13, color: "#FFFFFF" }}>{order.productName}</div>
        <div style={{ fontSize: 11, color: "rgba(255,255,255,0.4)", fontFamily: "monospace" }}>{order.id.slice(0, 14)}…</div>
      </div>
      <div style={{ textAlign: "right" }}>
        <div style={{ fontSize: 13, color: GOLD, fontWeight: 600 }}>${(order.priceCents / 100).toFixed(2)}</div>
        <div style={{ fontSize: 11, fontWeight: 700, color: ORDER_STATUS_COLOR[order.status] ?? "#FFFFFF" }}>{order.status}</div>
      </div>
    </div>
  );
}

function EmptyState({ icon, title, desc, cta, onCta }: { icon: string; title: string; desc: string; cta: string; onCta: () => void }) {
  return (
    <div style={{ textAlign: "center", padding: "60px 24px" }}>
      <div style={{ fontSize: 48, marginBottom: 16 }}>{icon}</div>
      <h2 style={{ fontFamily: "Playfair Display, serif", fontSize: 22, color: GOLD, margin: "0 0 10px" }}>{title}</h2>
      <p style={{ fontSize: 14, color: "rgba(255,255,255,0.5)", marginBottom: 24, maxWidth: 400, margin: "0 auto 24px" }}>{desc}</p>
      <button onClick={onCta} style={{ padding: "12px 28px", background: `linear-gradient(135deg, ${GOLD}, #b8902a)`, border: "none", borderRadius: 10, color: BG, fontSize: 14, fontWeight: 700, cursor: "pointer", fontFamily: "Inter, sans-serif" }}>{cta}</button>
    </div>
  );
}

// Suppress unused NAVY
void NAVY;
