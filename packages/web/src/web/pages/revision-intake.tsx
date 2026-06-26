// ============================================================
// /revisions/submit — Revision Intake Page
// Auth-gated (customer or admin only)
// ============================================================

import React, { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { RevisionIntakeFlow } from "../components/revision/RevisionIntakeFlow";

const RevisionIntakePage: React.FC = () => {
  const [, setLocation] = useLocation();
  const [authChecked, setAuthChecked] = useState(false);
  const [authed, setAuthed] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch("/api/auth/get-session", { credentials: "include" });
        const json = await res.json();
        if (json?.user?.id) {
          setAuthed(true);
        } else {
          setLocation("/signin?redirectTo=/revisions/submit");
        }
      } catch {
        setLocation("/signin?redirectTo=/revisions/submit");
      } finally {
        setAuthChecked(true);
      }
    })();
  }, [setLocation]);

  if (!authChecked) {
    return (
      <div style={{
        minHeight: "100vh",
        background: "#050B1A",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}>
        <div style={{
          width: "40px",
          height: "40px",
          border: "2px solid #D4AF37",
          borderTopColor: "transparent",
          borderRadius: "50%",
          animation: "spin 0.9s linear infinite",
        }} />
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  if (!authed) return null;

  return <RevisionIntakeFlow onDone={() => setLocation("/dashboard")} />;
};

export default RevisionIntakePage;
