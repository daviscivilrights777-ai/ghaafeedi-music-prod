import { GhaafeediLogo } from "../components/GhaafeediLogo";
import { motion } from "framer-motion";
import { useEffect, useState } from "react";
import { Link, useLocation, useSearch } from "wouter";
import { authClient, captureToken } from "../lib/authClient";
import { api } from "../lib/api";

const GOLD = "#D4AF37";
const GOLD2 = "#F0D060";
const NAVY = "#0B1736";
const BG = "#050B1A";
const TOKEN_KEY = "gm_bearer_token";

export default function SignUp() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [error, setError] = useState("");
  const [, setLocation] = useLocation();
  const search = useSearch();

  // ── LOGGED-IN GUARD ───────────────────────────────────────────────
  useEffect(() => {
    const token = localStorage.getItem(TOKEN_KEY);
    if (token) {
      window.history.replaceState(null, "", "/dashboard");
      setLocation("/dashboard");
    }
  }, [setLocation]);

  // Preserve redirect target from product flow
  const params = new URLSearchParams(search);
  const redirectTo = params.get("redirect") || "/onboarding";

  const ensureMember = async () => {
    try {
      await api.members.create.$post();
    } catch { /* silently fail — can retry later */ }
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !email.trim() || !password.trim()) {
      setError("Please fill in all fields.");
      return;
    }
    if (password.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }
    if (!allConsented) {
      setError("Please accept the Terms of Service, Privacy Policy, and confirm your age to continue.");
      return;
    }
    setLoading(true);
    setError("");
    try {
      const res = await authClient.signUp.email(
        { name: name.trim(), email: email.trim(), password, callbackURL: redirectTo },
        { onSuccess: captureToken }
      );
      if (res.error) {
        setError(res.error.message ?? "Sign up failed. Please try again.");
      } else {
        await ensureMember();
        // Record consent acceptance — required, first-time sign-up only
        try {
          const token = localStorage.getItem(TOKEN_KEY);
          await fetch("/api/members/accept-consent", {
            method: "POST",
            credentials: "include",
            headers: token ? { Authorization: `Bearer ${token}` } : {},
          });
        } catch { /* non-blocking — onboarding consent gate is the fallback */ }
        setLocation(redirectTo);
      }
    } catch (err: unknown) {
      setError((err as Error)?.message ?? "Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleGoogle = async () => {
    setGoogleLoading(true);
    setError("");
    try {
      const absoluteCallback = redirectTo.startsWith("http")
        ? redirectTo
        : `${window.location.origin}${redirectTo}`;
      await authClient.signIn.social({
        provider: "google",
        callbackURL: absoluteCallback,
      });
    } catch {
      setError("Google sign-in failed. Please try again.");
      setGoogleLoading(false);
    }
  };

  const inputStyle: React.CSSProperties = {
    width: "100%",
    padding: "13px 16px",
    background: "rgba(5,11,26,0.85)",
    border: `1px solid rgba(212,175,55,0.22)`,
    borderRadius: 10,
    color: "#FFFFFF",
    fontSize: 14,
    fontFamily: "Inter, sans-serif",
    outline: "none",
    boxSizing: "border-box",
    transition: "border-color 0.2s",
  };

  return (
    <div style={{
      minHeight: "100vh",
      background: BG,
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      padding: "40px 20px",
      position: "relative",
      overflow: "hidden",
    }}>
      {/* BG layers */}
      <div style={{ position: "absolute", inset: 0, background: `radial-gradient(ellipse 70% 50% at 50% 50%, rgba(11,23,54,0.95) 0%, ${BG} 70%)` }} />
      <div style={{ position: "absolute", top: "15%", right: "18%", width: 500, height: 500, borderRadius: "50%", background: "rgba(212,175,55,0.05)", filter: "blur(100px)" }} />
      <div style={{ position: "absolute", bottom: "20%", left: "15%", width: 300, height: 300, borderRadius: "50%", background: "rgba(11,23,54,0.6)", filter: "blur(80px)" }} />

      {/* Logo */}
      <div style={{ position: "fixed", top: 0, left: 0, right: 0, zIndex: 100, padding: "20px 40px" }}>
        <Link href="/" style={{ textDecoration: "none", display: "inline-flex", alignItems: "center" }}>
          <GhaafeediLogo variant="navbar" />
        </Link>
      </div>

      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        style={{
          position: "relative", zIndex: 2,
          background: "rgba(11,23,54,0.92)",
          border: `1px solid rgba(212,175,55,0.25)`,
          borderRadius: 20,
          padding: "50px 44px",
          width: "100%", maxWidth: 460,
          boxShadow: "0 24px 64px rgba(0,0,0,0.55), 0 0 40px rgba(212,175,55,0.08)",
        }}
      >
        {/* Header */}
        <div style={{ textAlign: "center", marginBottom: 32 }}>
          <div style={{ display: "inline-flex", alignItems: "center", gap: 8, marginBottom: 14,
            background: "rgba(212,175,55,0.08)", border: "1px solid rgba(212,175,55,0.25)",
            borderRadius: 20, padding: "5px 14px" }}>
            <span style={{ fontSize: 11, color: GOLD, fontFamily: "Inter, sans-serif", fontWeight: 700, letterSpacing: "0.1em" }}>✦ FREE MEMBERSHIP</span>
          </div>
          <h1 style={{ fontFamily: "Playfair Display, serif", fontSize: 28, fontWeight: 700, color: GOLD, margin: "0 0 8px" }}>Begin Your Legacy</h1>
          <p style={{ fontSize: 14, color: "rgba(255,255,255,0.55)", fontFamily: "Inter, sans-serif", margin: 0 }}>
            Turn your memories into cinematic songs and films —<br/>
            <span style={{ color: GOLD, fontWeight: 600 }}>powered by AI</span>
          </p>
        </div>

        {error && (
          <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }}
            style={{ background: "rgba(220,50,50,0.12)", border: "1px solid rgba(220,50,50,0.35)", borderRadius: 8, padding: "10px 14px", marginBottom: 18, color: "#ff6b6b", fontSize: 13, fontFamily: "Inter, sans-serif" }}>
            {error}
          </motion.div>
        )}

        {/* Google */}
        <button onClick={handleGoogle} disabled={googleLoading || loading}
          style={{ width: "100%", padding: "13px 24px", background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.15)", borderRadius: 10, color: "#FFFFFF", fontSize: 14, fontFamily: "Inter, sans-serif", fontWeight: 600, cursor: googleLoading ? "not-allowed" : "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 10, marginBottom: 24, transition: "all 0.2s", opacity: googleLoading ? 0.7 : 1 }}
          onMouseEnter={e => { if (!googleLoading) e.currentTarget.style.background = "rgba(255,255,255,0.11)"; }}
          onMouseLeave={e => { e.currentTarget.style.background = "rgba(255,255,255,0.06)"; }}
        >
          {googleLoading ? <><Spinner /> Connecting...</> : <><GoogleIcon /> Continue with Google</>}
        </button>

        <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 22 }}>
          <div style={{ flex: 1, height: 1, background: "rgba(255,255,255,0.1)" }} />
          <span style={{ fontSize: 12, color: "rgba(255,255,255,0.35)", fontFamily: "Inter, sans-serif" }}>or</span>
          <div style={{ flex: 1, height: 1, background: "rgba(255,255,255,0.1)" }} />
        </div>

        <form onSubmit={handleSignUp} noValidate>
          {[
            { label: "FULL NAME", value: name, setter: setName, type: "text", placeholder: "Your full name" },
            { label: "EMAIL ADDRESS", value: email, setter: setEmail, type: "email", placeholder: "your@email.com" },
            { label: "PASSWORD", value: password, setter: setPassword, type: "password", placeholder: "Min. 8 characters" },
          ].map((field) => (
            <div key={field.label} style={{ marginBottom: 16 }}>
              <label style={{ display: "block", fontSize: 11, color: "rgba(255,255,255,0.6)", fontFamily: "Inter, sans-serif", fontWeight: 600, marginBottom: 7, letterSpacing: "0.08em" }}>{field.label}</label>
              <input type={field.type} value={field.value} onChange={e => field.setter(e.target.value)} placeholder={field.placeholder} disabled={loading} style={inputStyle}
                onFocus={e => { e.currentTarget.style.borderColor = "rgba(212,175,55,0.55)"; }}
                onBlur={e => { e.currentTarget.style.borderColor = "rgba(212,175,55,0.22)"; }} />
            </div>
          ))}

          {/* ── Required consent checkboxes ── */}
          <div style={{ marginTop: 6, marginBottom: 18, display: "flex", flexDirection: "column", gap: 10 }}>
            {[
              { checked: consentTos, setter: setConsentTos, label: <>I agree to the <a href="/legal/terms-of-service" target="_blank" rel="noopener noreferrer" style={{ color: GOLD, textDecoration: "none" }}>Terms of Service</a></> },
              { checked: consentPrivacy, setter: setConsentPrivacy, label: <>I agree to the <a href="/legal/privacy-policy" target="_blank" rel="noopener noreferrer" style={{ color: GOLD, textDecoration: "none" }}>Privacy Policy</a></> },
              { checked: consentAge, setter: setConsentAge, label: "I confirm I am 18 years of age or older" },
            ].map((row, i) => (
              <label key={i} onClick={() => row.setter(!row.checked)} style={{ display: "flex", alignItems: "flex-start", gap: 10, cursor: "pointer", userSelect: "none" }}>
                <span style={{
                  flexShrink: 0, width: 18, height: 18, marginTop: 1, borderRadius: 5,
                  border: `1.5px solid ${row.checked ? GOLD : "rgba(255,255,255,0.3)"}`,
                  background: row.checked ? `linear-gradient(135deg, ${GOLD}, #b8902a)` : "transparent",
                  display: "flex", alignItems: "center", justifyContent: "center", transition: "all 0.15s",
                }}>
                  {row.checked && (
                    <svg width="11" height="11" viewBox="0 0 24 24" fill="none">
                      <path d="M20 6L9 17l-5-5" stroke={BG} strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  )}
                </span>
                <span style={{ fontSize: 12.5, color: "rgba(255,255,255,0.65)", fontFamily: "Inter, sans-serif", lineHeight: 1.5 }}>{row.label}</span>
              </label>
            ))}
          </div>

          <button type="submit" disabled={loading || googleLoading || !allConsented}
            style={{ width: "100%", padding: "14px", marginTop: 10, borderRadius: 8, border: "none", background: (loading || !allConsented) ? "rgba(212,175,55,0.5)" : `linear-gradient(135deg, ${GOLD} 0%, #b8902a 100%)`, color: BG, fontSize: 15, fontFamily: "Inter, sans-serif", fontWeight: 700, cursor: (loading || !allConsented) ? "not-allowed" : "pointer", letterSpacing: "0.03em", boxShadow: (loading || !allConsented) ? "none" : "0 0 20px rgba(212,175,55,0.3)", transition: "all 0.2s", display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}
            onMouseEnter={e => { if (!loading && allConsented) e.currentTarget.style.boxShadow = "0 0 30px rgba(212,175,55,0.5)"; }}
            onMouseLeave={e => { e.currentTarget.style.boxShadow = (loading || !allConsented) ? "none" : "0 0 20px rgba(212,175,55,0.3)"; }}
          >
            {loading ? <><Spinner /> Creating Account...</> : "✦ Create My Account"}
          </button>
        </form>

        {/* What you get */}
        <div style={{ marginTop: 20, padding: "14px 16px", background: "rgba(212,175,55,0.04)", border: "1px solid rgba(212,175,55,0.12)", borderRadius: 10 }}>
          <div style={{ fontSize: 10, color: "rgba(255,255,255,0.4)", fontFamily: "Inter, sans-serif", fontWeight: 700, letterSpacing: "0.1em", marginBottom: 8 }}>MEMBERSHIP INCLUDES</div>
          {[
            "Unique GM Member ID (e.g. GM-84729135)",
            "Access to all 14 premium experiences",
            "Sophia AI companion",
            "Production tracking dashboard",
          ].map((item, i) => (
            <div key={i} style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 5 }}>
              <span style={{ color: GOLD, fontSize: 10 }}>✦</span>
              <span style={{ fontSize: 12, color: "rgba(255,255,255,0.6)", fontFamily: "Inter, sans-serif" }}>{item}</span>
            </div>
          ))}
        </div>

        <div style={{ textAlign: "center", marginTop: 18, fontSize: 13, color: "rgba(255,255,255,0.5)", fontFamily: "Inter, sans-serif" }}>
          Already have an account?{" "}
          <Link href={`/signin${search ? `?${search}` : ""}`} style={{ color: GOLD, textDecoration: "none", fontWeight: 600 }}>Sign In</Link>
        </div>
      </motion.div>
    </div>
  );
}

function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24">
      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
      <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
    </svg>
  );
}

function Spinner() {
  return (
    <span style={{ display: "inline-block", width: 14, height: 14, border: "2px solid rgba(255,255,255,0.3)", borderTopColor: "#fff", borderRadius: "50%", animation: "spin 0.7s linear infinite" }}>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </span>
  );
}

// Keep NAVY referenced
const _navy = NAVY;
void _navy;
