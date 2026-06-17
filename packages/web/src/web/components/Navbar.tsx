import { useState, useEffect } from "react";
import { GhaafeediLogo } from "./GhaafeediLogo";
import { motion } from "framer-motion";
import { Link, useLocation } from "wouter";

const NAV_LINKS = [
  { label: "Home",        href: "/" },
  { label: "Products",    href: "/products" },
  { label: "Demo",        href: "/demo" },
  { label: "Trust",       href: "/trust" },
  { label: "About Us",    href: "/about" },
  { label: "Contact",     href: "/contact" },
];

export function Navbar() {
  const [scrolled, setScrolled] = useState(false);
  const [location] = useLocation();

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 12);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <motion.nav
      initial={{ y: -90, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.55, ease: "easeOut" }}
      style={{
        position: "fixed",
        top: 0, left: 0, right: 0,
        zIndex: 1000,
        height: 84,
        background: scrolled ? "rgba(10,11,15,0.97)" : "rgba(10,11,15,0.72)",
        backdropFilter: "blur(20px)",
        WebkitBackdropFilter: "blur(20px)",
        borderBottom: scrolled ? "1px solid rgba(212,175,55,0.14)" : "1px solid transparent",
        transition: "background 0.35s ease, border-color 0.35s ease",
      }}
    >
      <div style={{
        maxWidth: 1440, margin: "0 auto",
        height: "100%",
        display: "flex", alignItems: "center", justifyContent: "space-between",
        padding: "0 40px",
      }}>

        {/* ── Logo + Brand ── */}
        <Link
          href="/"
          style={{
            textDecoration: "none",
            display: "flex",
            alignItems: "center",
            gap: 16,
          }}
          className="gm-navbar-brand"
        >
          <GhaafeediLogo variant="navbar" height={44} />
        </Link>

        {/* ── Nav Links ── */}
        <div
          style={{ display: "flex", alignItems: "center", gap: 36 }}
          className="nav-links-desktop"
        >
          {NAV_LINKS.map(item => {
            const isActive = item.href === "/"
              ? location === "/"
              : location.startsWith(item.href) && item.href !== "#";
            return (
              <a
                key={item.label}
                href={item.href}
                style={{
                  position: "relative",
                  color: isActive ? "#D4AF37" : "rgba(255,255,255,0.78)",
                  fontSize: 13.5, fontFamily: "Inter, sans-serif", fontWeight: 500,
                  textDecoration: "none",
                  letterSpacing: "0.03em",
                  transition: "color 0.22s",
                  paddingBottom: 2,
                }}
                onMouseEnter={e => (e.currentTarget.style.color = "#D4AF37")}
                onMouseLeave={e => (e.currentTarget.style.color = isActive ? "#D4AF37" : "rgba(255,255,255,0.78)")}
              >
                {item.label}
                <span style={{
                  position: "absolute", bottom: -1, left: 0, right: 0,
                  height: 1.5, borderRadius: 1,
                  background: "linear-gradient(to right, #D4AF37, #F4D67A)",
                  opacity: isActive ? 1 : 0,
                  transform: isActive ? "scaleX(1)" : "scaleX(0)",
                  transformOrigin: "center",
                  transition: "opacity 0.25s, transform 0.25s",
                }} className="nav-underline" />
              </a>
            );
          })}

          {/* Search */}
          <button
            style={{
              width: 32, height: 32, borderRadius: "50%",
              border: "1.5px solid rgba(212,175,55,0.30)",
              background: "transparent",
              display: "flex", alignItems: "center", justifyContent: "center",
              cursor: "pointer", transition: "border-color 0.22s, box-shadow 0.22s",
            }}
            onMouseEnter={e => {
              e.currentTarget.style.borderColor = "rgba(212,175,55,0.7)";
              e.currentTarget.style.boxShadow = "0 0 10px rgba(212,175,55,0.25)";
            }}
            onMouseLeave={e => {
              e.currentTarget.style.borderColor = "rgba(212,175,55,0.30)";
              e.currentTarget.style.boxShadow = "none";
            }}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#D4AF37" strokeWidth="2.2">
              <circle cx="11" cy="11" r="8"/>
              <path d="m21 21-4.35-4.35"/>
            </svg>
          </button>
        </div>

        {/* ── Auth ── */}
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <Link href="/signin" style={{
            color: "#D4AF37", fontSize: 13.5, fontFamily: "Inter, sans-serif", fontWeight: 600,
            border: "1.5px solid rgba(212,175,55,0.45)", borderRadius: 999, padding: "8px 22px",
            textDecoration: "none",
            letterSpacing: "0.025em",
            transition: "all 0.22s",
          }}
            onMouseEnter={e => {
              (e.currentTarget as HTMLElement).style.borderColor = "#D4AF37";
              (e.currentTarget as HTMLElement).style.boxShadow = "0 0 14px rgba(212,175,55,0.3)";
            }}
            onMouseLeave={e => {
              (e.currentTarget as HTMLElement).style.borderColor = "rgba(212,175,55,0.45)";
              (e.currentTarget as HTMLElement).style.boxShadow = "none";
            }}
          >Sign In</Link>
          <Link href="/signup" style={{
            background: "linear-gradient(135deg, #FFE8A3 0%, #D4AF37 55%, #9A6F1F 100%)",
            color: "#0A0B0F", fontSize: 13.5, fontFamily: "Inter, sans-serif", fontWeight: 700,
            borderRadius: 999, padding: "9px 22px",
            textDecoration: "none",
            letterSpacing: "0.025em",
            boxShadow: "0 4px 18px rgba(212,175,55,0.40)",
            transition: "all 0.22s",
          }}
            onMouseEnter={e => {
              (e.currentTarget as HTMLElement).style.boxShadow = "0 6px 28px rgba(212,175,55,0.65)";
              (e.currentTarget as HTMLElement).style.transform = "translateY(-1px)";
            }}
            onMouseLeave={e => {
              (e.currentTarget as HTMLElement).style.boxShadow = "0 4px 18px rgba(212,175,55,0.40)";
              (e.currentTarget as HTMLElement).style.transform = "translateY(0)";
            }}
          >Get Started</Link>
        </div>
      </div>

      <style>{`
        @media (max-width: 1024px) {
          .nav-links-desktop { display: none !important; }
        }
        a:hover .nav-underline {
          opacity: 1 !important;
          transform: scaleX(1) !important;
        }
        .gm-navbar-brand:hover img {
          filter: drop-shadow(0 0 20px rgba(212,175,55,0.75)) !important;
          transform: scale(1.03);
        }
      `}</style>
    </motion.nav>
  );
}
