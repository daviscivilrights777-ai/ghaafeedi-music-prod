import { useSession, signOut } from "../lib/authClient";
import { clearToken } from "../lib/authClient";
import { useLocation } from "wouter";
import { GhaafeediLogo } from "./GhaafeediLogo";

const GOLD = "#D4AF37";

export function SiteNav({ transparent = false }: { transparent?: boolean }) {
  const { data: session } = useSession();
  const [, setLocation] = useLocation();

  const handleSignOut = async () => {
    await signOut();
    clearToken();
    setLocation("/home");
  };

  return (
    <nav style={{
      position: "fixed", top: 0, left: 0, right: 0, zIndex: 9999,
      display: "flex", alignItems: "center", justifyContent: "space-between",
      padding: "14px clamp(18px,3vw,48px)",
      background: transparent ? "transparent" : "rgba(5,7,13,0.92)",
      backdropFilter: transparent ? "none" : "blur(16px)",
      borderBottom: transparent ? "none" : "1px solid rgba(212,175,55,0.08)",
    }}>
      {/* Logo */}
      <a href="/" style={{ textDecoration: "none", display: "flex", alignItems: "center" }}>
        <GhaafeediLogo height={36} />
      </a>

      {/* Right side */}
      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
        {session?.user ? (
          <>
            <span style={{
              fontSize: 13, fontFamily: "Inter, sans-serif",
              color: "rgba(255,255,255,0.55)",
            }}>
              {session.user.name || session.user.email}
            </span>
            <a href="/dashboard" style={{
              fontSize: 13, fontFamily: "Inter, sans-serif", fontWeight: 600,
              color: GOLD, textDecoration: "none",
              padding: "7px 16px",
              border: `1px solid rgba(212,175,55,0.3)`,
              borderRadius: 999,
              transition: "all 0.2s",
            }}
            onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = "rgba(212,175,55,0.1)"}
            onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = "transparent"}
            >
              Dashboard
            </a>
            <button onClick={handleSignOut} style={{
              fontSize: 13, fontFamily: "Inter, sans-serif", fontWeight: 600,
              color: "rgba(255,255,255,0.65)", background: "rgba(255,255,255,0.06)",
              border: "1px solid rgba(255,255,255,0.12)",
              borderRadius: 999, padding: "7px 16px", cursor: "pointer",
              transition: "all 0.2s",
            }}
            onMouseEnter={e => {
              (e.currentTarget as HTMLElement).style.color = "#fff";
              (e.currentTarget as HTMLElement).style.background = "rgba(255,255,255,0.12)";
            }}
            onMouseLeave={e => {
              (e.currentTarget as HTMLElement).style.color = "rgba(255,255,255,0.65)";
              (e.currentTarget as HTMLElement).style.background = "rgba(255,255,255,0.06)";
            }}
            >
              Sign Out
            </button>
          </>
        ) : (
          <>
            <a href="/signin" style={{
              fontSize: 13, fontFamily: "Inter, sans-serif", fontWeight: 600,
              color: "rgba(255,255,255,0.75)", textDecoration: "none",
              padding: "7px 16px",
              border: "1px solid rgba(255,255,255,0.12)",
              borderRadius: 999, transition: "all 0.2s",
            }}
            onMouseEnter={e => (e.currentTarget as HTMLElement).style.color = "#fff"}
            onMouseLeave={e => (e.currentTarget as HTMLElement).style.color = "rgba(255,255,255,0.75)"}
            >
              Sign In
            </a>
            <a href="/signup" style={{
              fontSize: 13, fontFamily: "Inter, sans-serif", fontWeight: 700,
              color: "#01040B", textDecoration: "none",
              padding: "7px 18px",
              background: `linear-gradient(135deg, #FFF9E6 0%, #F1D37A 30%, #C9962E 100%)`,
              borderRadius: 999, transition: "all 0.2s",
            }}>
              Get Started
            </a>
          </>
        )}
      </div>
    </nav>
  );
}
