"use client";
import { useState, useEffect } from "react";
import { useAuth } from "@/lib/auth-context";
import { useRouter } from "next/navigation";
import Link from "next/link";

const INK = "#1a1a1a";
const CREAM = "#F5F0E8";
const RUST = "#C45D3E";
const SAGE = "#7D8B6A";
const SLATE = "#5A5A6E";
const OFF_WHITE = "#FAF8F4";
const DARK_CREAM = "#EDE6D8";

export default function SignupPage() {
  const [displayName, setDisplayName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [referralCode, setReferralCode] = useState(null);
  const [loading, setLoading] = useState(false);
  const { signUpWithEmail, signInWithGoogle, supabase } = useAuth();
  const router = useRouter();

  // Check for referral code from /join/CODE redirect
  useEffect(() => {
    if (typeof window !== "undefined") {
      const code = localStorage.getItem("sl_referral");
      if (code) setReferralCode(code);
    }
  }, []);

  const handleSignup = async (e) => {
    e?.preventDefault();
    setError("");

    if (displayName.length < 2) {
      setError("display name needs to be at least 2 characters");
      return;
    }
    if (password.length < 6) {
      setError("password needs to be at least 6 characters");
      return;
    }

    setLoading(true);
    const { data, error } = await signUpWithEmail(email, password, displayName);

    if (error) {
      setError(error.message);
      setLoading(false);
    } else if (data?.user?.identities?.length === 0) {
      setError("an account with this email already exists");
      setLoading(false);
    } else {
      // Process referral if present
      if (referralCode && data?.user) {
        try {
          await supabase.rpc("process_referral", { referrer_code: referralCode });
          localStorage.removeItem("sl_referral");
        } catch (e) {
          console.error("Referral error:", e);
        }
      }
      setSuccess(true);
      setLoading(false);
      // Send welcome email and capture geo (fire and forget)
      if (data?.user?.id) {
        fetch("/api/email/welcome", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ userId: data.user.id }),
        }).catch(() => {});
        fetch("/api/geo", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ 
            userId: data.user.id,
            timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
            language: navigator.language,
          }),
        }).catch(() => {});
      }
    }
  };

  const handleGoogleSignup = async () => {
    setError("");
    const { error } = await signInWithGoogle();
    if (error) setError(error.message);
  };

  if (success) {
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
            you're in
          </div>
          <p style={{ fontSize: 13, color: SLATE, lineHeight: 1.6, marginBottom: 24 }}>
            check your email for a confirmation link. once you click it, you're part of stamps land.
          </p>
          <Link href="/login" style={{
            display: "inline-block", padding: "12px 24px", background: INK, color: CREAM,
            borderRadius: 3, textDecoration: "none", fontSize: 13, fontWeight: 600,
          }}>
            go to login
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
        {/* Header */}
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
            join the community
          </div>
          {referralCode && (
            <div style={{
              marginTop: 10, fontFamily: "'DM Mono', monospace", fontSize: 10, color: SAGE,
              background: SAGE + "11", border: `1px solid ${SAGE}22`, borderRadius: 3,
              padding: "6px 12px", display: "inline-block",
            }}>
              ✦ you've been invited
            </div>
          )}
        </div>

        {/* Google */}
        <button
          onClick={handleGoogleSignup}
          style={{
            width: "100%", padding: "13px 16px", background: OFF_WHITE,
            border: `1px solid ${DARK_CREAM}`, borderRadius: 3, cursor: "pointer",
            fontFamily: "'DM Sans', sans-serif", fontSize: 13, fontWeight: 600,
            color: INK, display: "flex", alignItems: "center", justifyContent: "center",
            gap: 10, marginBottom: 20, transition: "border-color 0.2s ease",
          }}
          onMouseEnter={(e) => (e.currentTarget.style.borderColor = "#ccc")}
          onMouseLeave={(e) => (e.currentTarget.style.borderColor = DARK_CREAM)}
        >
          <svg width="18" height="18" viewBox="0 0 24 24">
            <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4" />
            <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
            <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
            <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
          </svg>
          Continue with Google
        </button>

        {/* Divider */}
        <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 20 }}>
          <div style={{ flex: 1, height: 1, background: DARK_CREAM }} />
          <span style={{ fontFamily: "'DM Mono', monospace", fontSize: 10, color: SLATE }}>or</span>
          <div style={{ flex: 1, height: 1, background: DARK_CREAM }} />
        </div>

        {/* Form */}
        <div>
          <div style={{ marginBottom: 12 }}>
            <label style={{
              fontFamily: "'DM Mono', monospace", fontSize: 10, color: SLATE,
              letterSpacing: "0.5px", display: "block", marginBottom: 6,
            }}>display name</label>
            <input
              type="text"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              placeholder="what should we call you?"
              maxLength={24}
              style={{
                width: "100%", padding: "11px 14px", background: OFF_WHITE,
                border: `1px solid ${DARK_CREAM}`, borderRadius: 3,
                fontFamily: "'DM Sans', sans-serif", fontSize: 13, color: INK,
                outline: "none",
              }}
              onFocus={(e) => (e.target.style.borderColor = RUST + "66")}
              onBlur={(e) => (e.target.style.borderColor = DARK_CREAM)}
            />
          </div>

          <div style={{ marginBottom: 12 }}>
            <label style={{
              fontFamily: "'DM Mono', monospace", fontSize: 10, color: SLATE,
              letterSpacing: "0.5px", display: "block", marginBottom: 6,
            }}>email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@email.com"
              style={{
                width: "100%", padding: "11px 14px", background: OFF_WHITE,
                border: `1px solid ${DARK_CREAM}`, borderRadius: 3,
                fontFamily: "'DM Sans', sans-serif", fontSize: 13, color: INK,
                outline: "none",
              }}
              onFocus={(e) => (e.target.style.borderColor = RUST + "66")}
              onBlur={(e) => (e.target.style.borderColor = DARK_CREAM)}
            />
          </div>

          <div style={{ marginBottom: 20 }}>
            <label style={{
              fontFamily: "'DM Mono', monospace", fontSize: 10, color: SLATE,
              letterSpacing: "0.5px", display: "block", marginBottom: 6,
            }}>password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="6+ characters"
              style={{
                width: "100%", padding: "11px 14px", background: OFF_WHITE,
                border: `1px solid ${DARK_CREAM}`, borderRadius: 3,
                fontFamily: "'DM Sans', sans-serif", fontSize: 13, color: INK,
                outline: "none",
              }}
              onFocus={(e) => (e.target.style.borderColor = RUST + "66")}
              onBlur={(e) => (e.target.style.borderColor = DARK_CREAM)}
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

          <button
            onClick={handleSignup}
            disabled={loading || !email || !password || !displayName}
            style={{
              width: "100%", padding: "13px 16px", background: INK, color: CREAM,
              border: "none", borderRadius: 3, cursor: loading ? "wait" : "pointer",
              fontFamily: "'DM Sans', sans-serif", fontSize: 13, fontWeight: 600,
              opacity: loading || !email || !password || !displayName ? 0.5 : 1,
            }}
          >
            {loading ? "creating account..." : "join stamps land"}
          </button>
        </div>

        {/* Privacy note */}
        <p style={{
          textAlign: "center", marginTop: 16, fontFamily: "'DM Mono', monospace",
          fontSize: 10, color: SLATE + "88", lineHeight: 1.5,
        }}>
          by signing up you agree to our{" "}
          <Link href="/terms" style={{ color: SLATE + "AA", textDecoration: "underline" }}>terms</Link>
          {" "}and{" "}
          <Link href="/privacy" style={{ color: SLATE + "AA", textDecoration: "underline" }}>privacy policy</Link>.
          <br />we only collect your email and display name.
        </p>

        {/* Login link */}
        <div style={{
          textAlign: "center", marginTop: 16,
          fontFamily: "'DM Sans', sans-serif", fontSize: 13, color: SLATE,
        }}>
          already have an account?{" "}
          <Link href="/login" style={{ color: RUST, fontWeight: 600, textDecoration: "none" }}>
            sign in
          </Link>
        </div>
      </div>
    </div>
  );
}
