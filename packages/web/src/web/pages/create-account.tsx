// ============================================================
// Ghaafeedi Music — Enterprise Create Account
// Full profile capture + required consent + instant Member ID + welcome email
// ============================================================
import { GhaafeediLogo } from "../components/GhaafeediLogo";
import { motion } from "framer-motion";
import { useEffect, useState } from "react";
import { Link, useLocation, useSearch } from "wouter";
import { authClient, captureToken, getToken } from "../lib/authClient";
import { api } from "../lib/api";

const GOLD = "#D4AF37";
const GOLD2 = "#F0D060";
const NAVY = "#0B1736";
const BG = "#050B1A";
const TOKEN_KEY = "gm_bearer_token";

const COUNTRIES = [
  "United States", "Canada", "United Kingdom", "Australia", "Germany", "France",
  "Spain", "Italy", "Netherlands", "Ireland", "United Arab Emirates", "Saudi Arabia",
  "South Africa", "Nigeria", "India", "Singapore", "Japan", "Other",
];

const REFERRAL_SOURCES = [
  "Instagram", "TikTok", "Facebook", "Google Search", "YouTube", "Friend / Family Referral",
  "Podcast / Radio", "Press / Article", "Other",
];

export default function CreateAccount() {
  const [step, setStep] = useState<"form" | "welcome">("form");
  const [memberId, setMemberId] = useState("");

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [phone, setPhone] = useState("");
  const [streetAddress, setStreetAddress] = useState("");
  const [city, setCity] = useState("");
  const [stateVal, setStateVal] = useState("");
  const [zip, setZip] = useState("");
  const [country, setCountry] = useState("");
  const [dateOfBirth, setDateOfBirth] = useState("");
  const [referralSource, setReferralSource] = useState("");

  const [consentTos, setConsentTos] = useState(false);
  const [consentPrivacy, setConsentPrivacy] = useState(false);
  const [consentAge, setConsentAge] = useState(false);
  const allConsented = consentTos && consentPrivacy && consentAge;

  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [error, setError] = useState("");
  const [, setLocation] = useLocation();
  const search = useSearch();

  useEffect(() => {
    const token = localStorage.getItem(TOKEN_KEY);
    if (token) {
      window.history.replaceState(null, "", "/dashboard");
      setLocation("/dashboard");
    }
  }, [setLocation]);

  const params = new URLSearchParams(search);
  const redirectTo = params.get("redirect") || "/onboarding";

  const allFieldsFilled = name.trim() && email.trim() && password.trim() &&
    phone.trim() && streetAddress.trim() && city.trim() && stateVal.trim() &&
    zip.trim() && country.trim() && dateOfBirth.trim() && referralSource.trim();

  const completeSignup = async () => {
    try {
      const res = await api.members["complete-signup"].$post({
        json: {
          phone: phone.trim(),
          streetAddress: streetAddress.trim(),
          city: city.trim(),
          state: stateVal.trim(),
          zip: zip.trim(),
          country: country.trim(),
          dateOfBirth: dateOfBirth.trim(),
          referralSource: referralSource.trim(),
          consentAccepted: true,
        },
      } as any);
      const data = await res.json() as { memberId: string };
      return data.memberId;
    } catch {
      return null;
    }
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!allFieldsFilled) {
      setError("Please fill in every field — all fields are required to create your account.");
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
        { name: name.trim(), email: email.trim(), password },
        { onSuccess: captureToken }
      );
      if (res.error) {
        setError(res.error.message ?? "Sign up failed. Please try again.");
        setLoading(false);
        return;
      }
      const mid = await completeSignup();
      setMemberId(mid ?? "GM-PENDING");
      setStep("welcome");
    } catch (err: unknown) {
      setError((err as Error)?.message ?? "Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleGoogle = async () => {
    if (!allConsented) {
      setError("Please accept the Terms of Service, Privacy Policy, and confirm your age before continuing with Google.");
      return;
    }
    setGoogleLoading(true);
    setError("");
    try {
      // Carry consent + redirect intent through the OAuth round trip
      sessionStorage.setItem("gm_pending_consent", "1");
      const absoluteCallback = `${window.location.origin}${redirectTo}`;
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
    width: "100%", padding: "12px 14px", background: "rgba(5,11,26,0.85)",
    border: `1px solid rgba(212,175,55,0.22)`, borderRadius: 10, color: "#FFFFFF",
    fontSize: 13.5, fontFamily: "Inter, sans-serif", outline: "none",
    boxSizing: "border-box", transition: "border-color 0.2s",
  };
  const labelStyle: React.CSSProperties = {
    display: "block", fontSize: 10.5, color: "rgba(255,255,255,0.6)",
    fontFamily: "Inter, sans-serif", fontWeight: 600, marginBottom: 6, letterSpacing: "0.08em",
  };

  if (step === "welcome") {
    return (
      <div style={{
        minHeight: "100vh", background: BG, display: "flex", alignItems: "center", justifyContent: "center",
        padding: "40px 20px", position: "relative", overflow: "hidden",
      }}>
        <div style={{ position: "absolute", inset: 0, background: `radial-gradient(ellipse 70% 50% at 50% 40%, rgba(11,23,54,0.95) 0%, ${BG} 70%)` }} />
        <div style={{ position: "absolute", top: "50%", left: "50%", transform: "translate(-50%,-50%)", width: 600, height: 400, background: "radial-gradient(ellipse, rgba(212,175,55,0.1) 0%, transparent 70%)", pointerEvents: "none" }} />

        <motion.div
          initial={{ opacity: 0, y: 30, scale: 0.97 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: 0.6 }}
          style={{
            position: "relative", zIndex: 2, background: "rgba(11,23,54,0.95)",
            border: `1px solid rgba(212,175,55,0.3)`, borderRadius: 22, padding: "56px 44px",
            width: "100%", maxWidth: 480, textAlign: "center",
            boxShadow: "0 24px 64px rgba(0,0,0,0.6), 0 0 50px rgba(212,175,55,0.1)",
          }}
        >
          <div style={{
            width: 64, height: 64, borderRadius: "50%", margin: "0 auto 24px",
            background: "rgba(212,175,55,0.12)", border: "1px solid rgba(212,175,55,0.35)",
            display: "flex", alignItems: "center", justifyContent: "center", fontSize: 30,
          }}>✦</div>

          <h1 style={{ fontFamily: "Playfair Display, serif", fontSize: 30, fontWeight: 700, color: "#fff", margin: "0 0 10px" }}>
            Welcome to Ghaafeedi Music
          </h1>
          <p style={{ fontSize: 14, color: "rgba(255,255,255,0.6)", fontFamily: "Inter, sans-serif", margin: "0 0 32px", lineHeight: 1.6 }}>
            Your legacy begins now. A welcome letter has been sent to <strong style={{ color: "#fff" }}>{email}</strong>.
          </p>

          <div style={{
            background: "rgba(212,175,55,0.07)", border: "1px solid rgba(212,175,55,0.25)",
            borderRadius: 14, padding: "24px 28px", marginBottom: 32,
          }}>
            <div style={{ fontSize: 10.5, color: "rgba(255,255,255,0.45)", textTransform: "uppercase", letterSpacing: "0.15em", marginBottom: 8 }}>
              Your Member ID
            </div>
            <div style={{ fontFamily: "Playfair Display, serif", fontSize: 26, fontWeight: 700, color: GOLD, letterSpacing: "0.02em" }}>
              {memberId}
            </div>
          </div>

          <button
            onClick={() => setLocation(redirectTo)}
            style={{
              width: "100%", padding: "15px", borderRadius: 10, border: "none",
              background: `linear-gradient(135deg, ${GOLD} 0%, #b8902a 100%)`, color: BG,
              fontSize: 15, fontFamily: "Inter, sans-serif", fontWeight: 700, cursor: "pointer",
              letterSpacing: "0.03em", boxShadow: "0 0 24px rgba(212,175,55,0.35)",
            }}
          >
            Begin Your Story →
          </button>
        </motion.div>
      </div>
    );
  }

  return (
    <div style={{
      minHeight: "100vh", background: BG, display: "flex", alignItems: "center", justifyContent: "center",
      padding: "100px 20px 40px", position: "relative", overflow: "hidden",
    }}>
      <div style={{ position: "absolute", inset: 0, background: `radial-gradient(ellipse 70% 50% at 50% 50%, rgba(11,23,54,0.95) 0%, ${BG} 70%)` }} />
      <div style={{ position: "absolute", top: "15%", right: "18%", width: 500, height: 500, borderRadius: "50%", background: "rgba(212,175,55,0.05)", filter: "blur(100px)" }} />
      <div style={{ position: "absolute", bottom: "20%", left: "15%", width: 300, height: 300, borderRadius: "50%", background: "rgba(11,23,54,0.6)", filter: "blur(80px)" }} />

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
          position: "relative", zIndex: 2, background: "rgba(11,23,54,0.92)",
          border: `1px solid rgba(212,175,55,0.25)`, borderRadius: 20, padding: "48px 44px",
          width: "100%", maxWidth: 560,
          boxShadow: "0 24px 64px rgba(0,0,0,0.55), 0 0 40px rgba(212,175,55,0.08)",
        }}
      >
        <div style={{ textAlign: "center", marginBottom: 28 }}>
          <div style={{
            display: "inline-flex", alignItems: "center", gap: 8, marginBottom: 14,
            background: "rgba(212,175,55,0.08)", border: "1px solid rgba(212,175,55,0.25)",
            borderRadius: 20, padding: "5px 14px",
          }}>
            <span style={{ fontSize: 11, color: GOLD, fontFamily: "Inter, sans-serif", fontWeight: 700, letterSpacing: "0.1em" }}>✦ ENTERPRISE MEMBERSHIP</span>
          </div>
          <h1 style={{ fontFamily: "Playfair Display, serif", fontSize: 28, fontWeight: 700, color: GOLD, margin: "0 0 8px" }}>Begin Your Legacy</h1>
          <p style={{ fontSize: 13.5, color: "rgba(255,255,255,0.55)", fontFamily: "Inter, sans-serif", margin: 0 }}>
            Create your account and receive your own permanent Member ID instantly.
          </p>
        </div>

        {error && (
          <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }}
            style={{ background: "rgba(220,50,50,0.12)", border: "1px solid rgba(220,50,50,0.35)", borderRadius: 8, padding: "10px 14px", marginBottom: 18, color: "#ff6b6b", fontSize: 13, fontFamily: "Inter, sans-serif" }}>
            {error}
          </motion.div>
        )}

        <button onClick={handleGoogle} disabled={googleLoading || loading}
          style={{ width: "100%", padding: "13px 24px", background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.15)", borderRadius: 10, color: "#FFFFFF", fontSize: 14, fontFamily: "Inter, sans-serif", fontWeight: 600, cursor: googleLoading ? "not-allowed" : "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 10, marginBottom: 24, transition: "all 0.2s", opacity: googleLoading ? 0.7 : 1 }}
        >
          {googleLoading ? <><Spinner /> Connecting...</> : <><GoogleIcon /> Continue with Google</>}
        </button>

        <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 22 }}>
          <div style={{ flex: 1, height: 1, background: "rgba(255,255,255,0.1)" }} />
          <span style={{ fontSize: 12, color: "rgba(255,255,255,0.35)", fontFamily: "Inter, sans-serif" }}>or fill in your details</span>
          <div style={{ flex: 1, height: 1, background: "rgba(255,255,255,0.1)" }} />
        </div>

        <form onSubmit={handleSignUp} noValidate>
          {/* Section: Identity */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14, marginBottom: 14 }}>
            <div>
              <label style={labelStyle}>FULL NAME</label>
              <input value={name} onChange={e => setName(e.target.value)} placeholder="Your full name" disabled={loading} style={inputStyle} />
            </div>
            <div>
              <label style={labelStyle}>DATE OF BIRTH</label>
              <input type="date" value={dateOfBirth} onChange={e => setDateOfBirth(e.target.value)} disabled={loading} style={{ ...inputStyle, colorScheme: "dark" }} />
            </div>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14, marginBottom: 14 }}>
            <div>
              <label style={labelStyle}>EMAIL ADDRESS</label>
              <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="your@email.com" disabled={loading} style={inputStyle} />
            </div>
            <div>
              <label style={labelStyle}>PHONE NUMBER</label>
              <input type="tel" value={phone} onChange={e => setPhone(e.target.value)} placeholder="+1 (555) 000-0000" disabled={loading} style={inputStyle} />
            </div>
          </div>

          <div style={{ marginBottom: 14 }}>
            <label style={labelStyle}>PASSWORD</label>
            <input type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="Min. 8 characters" disabled={loading} style={inputStyle} />
          </div>

          {/* Section: Address */}
          <div style={{ marginBottom: 14 }}>
            <label style={labelStyle}>STREET ADDRESS</label>
            <input value={streetAddress} onChange={e => setStreetAddress(e.target.value)} placeholder="123 Main Street" disabled={loading} style={inputStyle} />
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1.4fr 1fr 1fr", gap: 14, marginBottom: 14 }}>
            <div>
              <label style={labelStyle}>CITY</label>
              <input value={city} onChange={e => setCity(e.target.value)} placeholder="City" disabled={loading} style={inputStyle} />
            </div>
            <div>
              <label style={labelStyle}>STATE</label>
              <input value={stateVal} onChange={e => setStateVal(e.target.value)} placeholder="State" disabled={loading} style={inputStyle} />
            </div>
            <div>
              <label style={labelStyle}>ZIP</label>
              <input value={zip} onChange={e => setZip(e.target.value)} placeholder="ZIP" disabled={loading} style={inputStyle} />
            </div>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14, marginBottom: 20 }}>
            <div>
              <label style={labelStyle}>COUNTRY</label>
              <select value={country} onChange={e => setCountry(e.target.value)} disabled={loading} style={{ ...inputStyle, cursor: "pointer" }}>
                <option value="" style={{ background: NAVY }}>Select country</option>
                {COUNTRIES.map(c => <option key={c} value={c} style={{ background: NAVY }}>{c}</option>)}
              </select>
            </div>
            <div>
              <label style={labelStyle}>HOW DID YOU HEAR ABOUT US?</label>
              <select value={referralSource} onChange={e => setReferralSource(e.target.value)} disabled={loading} style={{ ...inputStyle, cursor: "pointer" }}>
                <option value="" style={{ background: NAVY }}>Select one</option>
                {REFERRAL_SOURCES.map(r => <option key={r} value={r} style={{ background: NAVY }}>{r}</option>)}
              </select>
            </div>
          </div>

          {/* Required consent checkboxes */}
          <div style={{ marginBottom: 22, display: "flex", flexDirection: "column", gap: 10 }}>
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
            style={{ width: "100%", padding: "14px", borderRadius: 8, border: "none", background: (loading || !allConsented) ? "rgba(212,175,55,0.5)" : `linear-gradient(135deg, ${GOLD} 0%, #b8902a 100%)`, color: BG, fontSize: 15, fontFamily: "Inter, sans-serif", fontWeight: 700, cursor: (loading || !allConsented) ? "not-allowed" : "pointer", letterSpacing: "0.03em", boxShadow: (loading || !allConsented) ? "none" : "0 0 20px rgba(212,175,55,0.3)", transition: "all 0.2s", display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}
          >
            {loading ? <><Spinner /> Creating Account...</> : "✦ Create My Account"}
          </button>
        </form>

        <div style={{ marginTop: 20, padding: "14px 16px", background: "rgba(212,175,55,0.04)", border: "1px solid rgba(212,175,55,0.12)", borderRadius: 10 }}>
          <div style={{ fontSize: 10, color: "rgba(255,255,255,0.4)", fontFamily: "Inter, sans-serif", fontWeight: 700, letterSpacing: "0.1em", marginBottom: 8 }}>MEMBERSHIP INCLUDES</div>
          {[
            "Unique Ghaafeedi Music Member ID, issued instantly",
            "Access to all 15 premium cinematic & music experiences",
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
const _getToken = getToken;
void _getToken;
