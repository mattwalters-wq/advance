"use client";
import { useState } from "react";
import { supabase } from "@/lib/supabase-browser";
import Link from "next/link";

const INK = "#1a1a1a";
const CREAM = "#F5F0E8";
const RUST = "#C45D3E";
const SAGE = "#7D8B6A";
const SLATE = "#5A5A6E";
const OFF_WHITE = "#FAF8F4";
const DARK_CREAM = "#EDE6D8";

export default function ResetPasswordPage() {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleReset = async () => {
    if (!email.trim() || !email.includes("@")) {
      setError("enter a valid email");
      return;
    }
    setLoading(true);
    setError("");
    const { error: resetError } = await supabase.auth.resetPasswordForEmail(email.trim(), {
      redirectTo: `${window.location.origin}/update-password`,
    });
    if (resetError) {
      setError(resetError.message);
    } else {
      setSent(true);
    }
    setLoading(false);
  };

  if (sent) {
    return (
      <div style={{
        minHeight: "100vh", background: CREAM, display: "flex", alignItems: "center",
        justifyContent: "center", padding: 20, fontFamily: "'DM Sans', sans-serif",
      }}>
        <div style={{ width: "100%", maxWidth: 380, textAlign: "center" }}>
          <div style={{ fontSize: 48, marginBottom: 16 }}>✦</div>
          <div style={{
            fontFamily: "'CooperBT', 'Cooper Black', 'Rockwell Extra Bold', 'Georgia', serif",
            fontSize: 24, color: INK, fontWeight: 900, marginBottom: 8,
          }}>
            check your email
          </div>
          <p style={{ fontSize: 13, color: SLATE, lineHeight: 1.6, marginBottom: 24 }}>
            we sent a password reset link to {email}. click the link in the email to set a new password.
          </p>
          <Link href="/login" style={{
            display: "inline-block", padding: "12px 24px", background: INK, color: CREAM,
            borderRadius: 3, textDecoration: "none", fontSize: 13, fontWeight: 600,
          }}>
            back to login
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div style={{
      minHeight: "100vh", background: CREAM, display: "flex", alignItems: "center",
      justifyContent: "center", padding: 20, fontFamily: "'DM Sans', sans-serif",
    }}>
      <div style={{ width: "100%", maxWidth: 380 }}>
        <div style={{ textAlign: "center", marginBottom: 36 }}>
          <div style={{
            fontFamily: "'CooperBT', 'Cooper Black', 'Rockwell Extra Bold', 'Georgia', serif",
            fontSize: 28, color: INK, fontWeight: 900, marginBottom: 4,
          }}>
            stamps land
          </div>
          <div style={{
            fontFamily: "'DM Mono', monospace", fontSize: 11, color: SLATE, letterSpacing: "1px",
          }}>
            reset your password
          </div>
        </div>

        <div style={{ marginBottom: 20 }}>
          <label style={{
            fontFamily: "'DM Mono', monospace", fontSize: 10, color: SLATE,
            letterSpacing: "0.5px", display: "block", marginBottom: 6,
          }}>email</label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleReset()}
            placeholder="you@email.com"
            style={{
              width: "100%", padding: "11px 14px", background: OFF_WHITE,
              border: `1px solid ${DARK_CREAM}`, borderRadius: 3,
              fontFamily: "'DM Sans', sans-serif", fontSize: 13, color: INK, outline: "none",
            }}
          />
        </div>

        {error && (
          <div style={{
            background: RUST + "11", border: `1px solid ${RUST}33`, borderRadius: 3,
            padding: "10px 14px", marginBottom: 16, fontSize: 12, color: RUST,
          }}>
            {error}
          </div>
        )}

        <button onClick={handleReset} disabled={loading || !email.trim()} style={{
          width: "100%", padding: "13px 16px", background: INK, color: CREAM,
          border: "none", borderRadius: 3, cursor: loading ? "wait" : "pointer",
          fontFamily: "'DM Sans', sans-serif", fontSize: 13, fontWeight: 600,
          opacity: loading || !email.trim() ? 0.5 : 1,
        }}>
          {loading ? "sending..." : "send reset link"}
        </button>

        <div style={{
          textAlign: "center", marginTop: 20,
          fontFamily: "'DM Sans', sans-serif", fontSize: 13, color: SLATE,
        }}>
          remember it?{" "}
          <Link href="/login" style={{ color: RUST, fontWeight: 600, textDecoration: "none" }}>
            sign in
          </Link>
        </div>
      </div>
    </div>
  );
}
