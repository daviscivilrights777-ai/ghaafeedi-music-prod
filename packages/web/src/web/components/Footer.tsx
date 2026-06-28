import { GhaafeediLogo } from "./GhaafeediLogo";
import { motion } from "framer-motion";

const COLS: { title: string; links: { label: string; href: string }[] }[] = [
  {
    title: "COMPANY",
    links: [
      { label: "About Us",      href: "/about" },
      { label: "Social Impact", href: "/impact" },
      { label: "Trust Center",  href: "/trust" },
      { label: "Demo",          href: "/demo" },
      { label: "Contact Us",    href: "/contact" },
    ],
  },
  {
    title: "PRODUCTS",
    links: [
      { label: "Cinematic Songs",     href: "/products/emotional-soundtrack" },
      { label: "Story Videos",        href: "/products/cinematic-story-film" },
      { label: "AI Companion",        href: "/products/sophia-ai" },
      { label: "Legacy Vault",        href: "/products/family-vault" },
      { label: "All Products",        href: "/products" },
    ],
  },
  {
    title: "SUPPORT",
    links: [
      { label: "FAQ",                   href: "/faq" },
      { label: "Help Center",           href: "/contact" },
      { label: "AI Transparency",       href: "/trust" },
      { label: "Community Standards",   href: "/trust" },
      { label: "Refund Policy",         href: "/legal/refund-cancellation" },
      { label: "Revisions & Guarantee", href: "/revisions" },
      { label: "Why We're Different",   href: "/revisions#why-us" },
    ],
  },
  {
    title: "LEGAL",
    links: [
      { label: "Terms of Service",  href: "/legal/terms-of-service" },
      { label: "Privacy Policy",    href: "/legal/privacy-policy" },
      { label: "Acceptable Use",    href: "/legal/acceptable-use-policy" },
      { label: "DMCA Policy",       href: "/legal/dmca-policy" },
      { label: "Refund & Cancel",   href: "/legal/refund-cancellation" },
      { label: "Legal Center",      href: "/legal" },
    ],
  },
  {
    title: "MORE LEGAL",
    links: [
      { label: "Music & Video Rights",  href: "/legal/music-video-rights" },
      { label: "COPPA Compliance",      href: "/legal/coppa-compliance" },
      { label: "International Policy",  href: "/legal/international-policy" },
      { label: "Music Rights Strategy", href: "/legal/music-rights-strategy" },
      { label: "NDA & IP Assignment",   href: "/legal/nda-ip-assignment" },
    ],
  },
];

const SOCIALS = [
  { label: "𝕏",  href: "#", title: "X / Twitter" },
  { label: "▶",  href: "#", title: "YouTube" },
  { label: "f",  href: "#", title: "Facebook" },
  { label: "in", href: "#", title: "LinkedIn" },
  { label: "♪",  href: "#", title: "TikTok" },
];

export function Footer() {
  return (
    <footer style={{
      background: "#0A0B0F",
      padding: "80px 40px 44px",
      borderTop: "1px solid rgba(212,165,116,0.10)",
    }}>
      <div style={{ maxWidth: 1440, margin: "0 auto" }}>

        {/* Sophia CTA banner */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.7 }}
          style={{
            background: "linear-gradient(135deg, rgba(139,92,246,0.12), rgba(212,165,116,0.06))",
            border: "1px solid rgba(139,92,246,0.22)",
            borderRadius: 20,
            padding: "28px 36px",
            display: "flex", alignItems: "center", justifyContent: "space-between",
            gap: 24, flexWrap: "wrap",
            marginBottom: 64,
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
            <div style={{
              width: 52, height: 52, borderRadius: "50%",
              background: "linear-gradient(135deg, #8B5CF6, #6D28D9)",
              display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: 22, color: "#fff",
              fontFamily: "'Playfair Display', serif", fontWeight: 700,
              boxShadow: "0 0 22px rgba(139,92,246,0.40)",
              flexShrink: 0,
            }}>S</div>
            <div>
              <div style={{ fontFamily: "'Playfair Display', serif", fontSize: 18, fontWeight: 700, color: "#fff", marginBottom: 4 }}>
                Sophia AI Concierge — Available 24/7
              </div>
              <div style={{ fontFamily: "Inter, sans-serif", fontSize: 13.5, color: "rgba(255,255,255,0.52)" }}>
                Product recommendations · Order tracking · FAQ · Onboarding guidance · Account support
              </div>
            </div>
          </div>
          <a href="/contact" style={{
            display: "inline-flex", alignItems: "center", gap: 8,
            background: "rgba(139,92,246,0.18)",
            border: "1.5px solid rgba(139,92,246,0.45)",
            color: "#a78bfa",
            fontFamily: "Inter, sans-serif", fontWeight: 700, fontSize: 13,
            borderRadius: 999, padding: "10px 22px",
            textDecoration: "none", transition: "all 0.25s", whiteSpace: "nowrap",
          }}
            onMouseEnter={e => {
              (e.currentTarget as HTMLElement).style.borderColor = "rgba(139,92,246,0.80)";
              (e.currentTarget as HTMLElement).style.background = "rgba(139,92,246,0.28)";
            }}
            onMouseLeave={e => {
              (e.currentTarget as HTMLElement).style.borderColor = "rgba(139,92,246,0.45)";
              (e.currentTarget as HTMLElement).style.background = "rgba(139,92,246,0.18)";
            }}
          >
            ✦ Chat with Sophia
          </a>
        </motion.div>

        {/* Main footer grid */}
        <div style={{
          display: "grid",
          gridTemplateColumns: "260px repeat(5, 1fr)",
          gap: 40, marginBottom: 60,
        }} className="footer-grid">

          {/* Brand col */}
          <div>
            <div style={{ display: "flex", alignItems: "center", marginBottom: 18 }}>
              <GhaafeediLogo variant="footer" />
            </div>

            <p style={{
              fontSize: 12.5, color: "rgba(255,255,255,0.40)", fontFamily: "Inter, sans-serif",
              lineHeight: 1.76, marginBottom: 22,
            }}>
              AI-powered emotional storytelling that transforms your memories, emotions, and dreams into cinematic experiences.
            </p>

            <div style={{ display: "flex", gap: 8, marginBottom: 22 }}>
              {SOCIALS.map((s, i) => (
                <a key={i} href={s.href} title={s.title} style={{
                  width: 34, height: 34, borderRadius: "50%",
                  background: "rgba(255,255,255,0.04)",
                  border: "1px solid rgba(255,255,255,0.09)",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  fontSize: 11.5, color: "rgba(255,255,255,0.48)",
                  textDecoration: "none", transition: "all 0.22s",
                }}
                  onMouseEnter={e => {
                    e.currentTarget.style.borderColor = "#D4A574";
                    e.currentTarget.style.color = "#D4A574";
                    e.currentTarget.style.boxShadow = "0 0 12px rgba(212,165,116,0.25)";
                  }}
                  onMouseLeave={e => {
                    e.currentTarget.style.borderColor = "rgba(255,255,255,0.09)";
                    e.currentTarget.style.color = "rgba(255,255,255,0.48)";
                    e.currentTarget.style.boxShadow = "none";
                  }}
                >{s.label}</a>
              ))}
            </div>

            {/* Trust badges */}
            <div style={{ display: "flex", flexDirection: "column", gap: 7 }}>
              {[
                { label: "🔒 SSL Secured",      href: "/trust" },
                { label: "✦ AI Powered",        href: "/trust" },
                { label: "⚡ 24/7 Concierge",   href: "/contact" },
                { label: "🛡️ PCI DSS Compliant", href: "/trust" },
              ].map((b, i) => (
                <a key={i} href={b.href} style={{
                    fontSize: 10.5, fontFamily: "Inter, sans-serif",
                    color: "rgba(255,255,255,0.32)",
                    textDecoration: "none", transition: "color 0.2s",
                    display: "inline-flex", alignItems: "center", gap: 5,
                  }}
                    onMouseEnter={e => e.currentTarget.style.color = "#D4A574"}
                    onMouseLeave={e => e.currentTarget.style.color = "rgba(255,255,255,0.32)"}
                  >{b.label}</a>
              ))}
            </div>
          </div>

          {/* Link cols */}
          {COLS.map((col) => (
            <div key={col.title}>
              <div style={{
                fontSize: 10, color: "#D4A574", fontFamily: "Inter, sans-serif",
                fontWeight: 700, letterSpacing: "0.20em", textTransform: "uppercase", marginBottom: 18,
              }}>{col.title}</div>
              <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                {col.links.map((link) => (
                  <a key={link.label} href={link.href} style={{
                      fontSize: 13, color: "rgba(255,255,255,0.46)", fontFamily: "Inter, sans-serif",
                      textDecoration: "none", transition: "color 0.2s", letterSpacing: "0.01em",
                    }}
                      onMouseEnter={e => e.currentTarget.style.color = "#D4A574"}
                      onMouseLeave={e => e.currentTarget.style.color = "rgba(255,255,255,0.46)"}
                    >{link.label}</a>
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* Newsletter */}
        <div style={{
          background: "linear-gradient(135deg, rgba(15,20,25,0.95), rgba(10,11,15,0.90))",
          border: "1px solid rgba(212,165,116,0.10)",
          borderRadius: 16, padding: "28px 32px",
          display: "flex", alignItems: "center", justifyContent: "space-between",
          gap: 24, flexWrap: "wrap",
          marginBottom: 44,
        }}>
          <div>
            <div style={{ fontFamily: "'Playfair Display', serif", fontSize: 18, fontWeight: 700, color: "#fff", marginBottom: 5 }}>
              Stay Connected
            </div>
            <div style={{ fontFamily: "Inter, sans-serif", fontSize: 13, color: "rgba(255,255,255,0.45)" }}>
              Join our community of creators, storytellers, and dreamers. No spam, ever.
            </div>
          </div>
          <div style={{
            display: "flex",
            border: "1px solid rgba(212,165,116,0.28)",
            borderRadius: 12, overflow: "hidden",
            flexShrink: 0,
          }}>
            <input
              type="email"
              placeholder="Your email address"
              style={{
                background: "rgba(15,20,25,0.8)", border: "none", outline: "none",
                color: "#fff", padding: "10px 16px", fontSize: 13,
                fontFamily: "Inter, sans-serif", width: 240,
              }}
            />
            <button style={{
              background: "linear-gradient(135deg, #F8E08A, #D4A574)",
              border: "none", color: "#0A0B0F",
              padding: "10px 18px", fontSize: 11.5, fontWeight: 700,
              fontFamily: "Inter, sans-serif", cursor: "pointer",
              letterSpacing: "0.06em", transition: "opacity 0.2s",
            }}
              onMouseEnter={e => (e.currentTarget.style.opacity = "0.85")}
              onMouseLeave={e => (e.currentTarget.style.opacity = "1")}
            >JOIN</button>
          </div>
        </div>

        {/* Bottom bar */}
        <div style={{
          borderTop: "1px solid rgba(212,165,116,0.07)",
          paddingTop: 28,
          display: "flex", justifyContent: "space-between", alignItems: "center",
          flexWrap: "wrap", gap: 14,
        }}>
          <div style={{ fontSize: 12.5, color: "rgba(255,255,255,0.26)", fontFamily: "Inter, sans-serif" }}>
            © 2026 Ghaafeedi Music. All rights reserved. · Your Story. Your Soundtrack. Your Legacy.
          </div>
          <div style={{ display: "flex", gap: 20, flexWrap: "wrap" }}>
            {[
              { label: "Privacy Policy",    href: "/legal/privacy-policy" },
              { label: "Terms of Service",  href: "/legal/terms-of-service" },
              { label: "Acceptable Use",    href: "/legal/acceptable-use-policy" },
              { label: "Refund & Cancel",   href: "/legal/refund-cancellation" },
              { label: "DMCA",              href: "/legal/dmca-policy" },
              { label: "Legal Center",      href: "/legal" },
            ].map(l => (
              <a key={l.label} href={l.href} style={{
                  fontSize: 11.5, color: "rgba(255,255,255,0.26)", fontFamily: "Inter, sans-serif",
                  textDecoration: "none", transition: "color 0.2s",
                }}
                  onMouseEnter={e => e.currentTarget.style.color = "#D4A574"}
                  onMouseLeave={e => e.currentTarget.style.color = "rgba(255,255,255,0.26)"}
                >{l.label}</a>
            ))}
          </div>
        </div>
      </div>

      <style>{`
        @media (max-width: 1200px) { .footer-grid { grid-template-columns: 1fr 1fr 1fr 1fr !important; } }
        @media (max-width: 768px)  { .footer-grid { grid-template-columns: 1fr 1fr !important; } }
        @media (max-width: 480px)  { .footer-grid { grid-template-columns: 1fr !important; } }
      `}</style>
    </footer>
  );
}
