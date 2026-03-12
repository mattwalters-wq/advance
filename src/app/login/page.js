"use client";
import { useState } from "react";
import { useAuth } from "@/lib/auth-context";
import { useRouter } from "next/navigation";
import Link from "next/link";

const INK = "#1a1a1a";
const CREAM = "#F5F0E8";
const RUST = "#C45D3E";
const SLATE = "#5A5A6E";
const OFF_WHITE = "#FAF8F4";
const DARK_CREAM = "#EDE6D8";
const WARM_GOLD = "#D4A843";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const { signInWithEmail, signInWithGoogle } = useAuth();
  const router = useRouter();

  const handleEmailLogin = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    const { error } = await signInWithEmail(email, password);
    if (error) {
      setError(error.message);
      setLoading(false);
    } else {
      router.push("/");
      router.refresh();
    }
  };

  const handleGoogleLogin = async () => {
    setError("");
    const { error } = await signInWithGoogle();
    if (error) setError(error.message);
  };

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
            welcome back
          </div>
        </div>

        {/* Google Sign In */}
        <button
          onClick={handleGoogleLogin}
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
        <div style={{
          display: "flex", alignItems: "center", gap: 14, marginBottom: 20,
        }}>
          <div style={{ flex: 1, height: 1, background: DARK_CREAM }} />
          <span style={{ fontFamily: "'DM Mono', monospace", fontSize: 10, color: SLATE }}>or</span>
          <div style={{ flex: 1, height: 1, background: DARK_CREAM }} />
        </div>

        {/* Email Form */}
        <div onSubmit={handleEmailLogin}>
          <div style={{ marginBottom: 12 }}>
            <label style={{
              fontFamily: "'DM Mono', monospace", fontSize: 10, color: SLATE,
              letterSpacing: "0.5px", display: "block", marginBottom: 6,
            }}>
              email
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@email.com"
              style={{
                width: "100%", padding: "11px 14px", background: OFF_WHITE,
                border: `1px solid ${DARK_CREAM}`, borderRadius: 3,
                fontFamily: "'DM Sans', sans-serif", fontSize: 13, color: INK,
                outline: "none", transition: "border-color 0.2s ease",
              }}
              onFocus={(e) => (e.target.style.borderColor = RUST + "66")}
              onBlur={(e) => (e.target.style.borderColor = DARK_CREAM)}
            />
          </div>

          <div style={{ marginBottom: 20 }}>
            <label style={{
              fontFamily: "'DM Mono', monospace", fontSize: 10, color: SLATE,
              letterSpacing: "0.5px", display: "block", marginBottom: 6,
            }}>
              password
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              style={{
                width: "100%", padding: "11px 14px", background: OFF_WHITE,
                border: `1px solid ${DARK_CREAM}`, borderRadius: 3,
                fontFamily: "'DM Sans', sans-serif", fontSize: 13, color: INK,
                outline: "none", transition: "border-color 0.2s ease",
              }}
              onFocus={(e) => (e.target.style.borderColor = RUST + "66")}
              onBlur={(e) => (e.target.style.borderColor = DARK_CREAM)}
            />
          </div>

          {error && (
            <div style={{
              background: RUST + "11", border: `1px solid ${RUST}33`, borderRadius: 3,
              padding: "10px 14px", marginBottom: 16, fontFamily: "'DM Sans', sans-serif",
              fontSize: 12, color: RUST,
            }}>
              {error}
            </div>
          )}

          <button
            onClick={handleEmailLogin}
            disabled={loading || !email || !password}
            style={{
              width: "100%", padding: "13px 16px", background: INK, color: CREAM,
              border: "none", borderRadius: 3, cursor: loading ? "wait" : "pointer",
              fontFamily: "'DM Sans', sans-serif", fontSize: 13, fontWeight: 600,
              opacity: loading || !email || !password ? 0.5 : 1,
              transition: "opacity 0.2s ease",
            }}
          >
            {loading ? "signing in..." : "sign in"}
          </button>
        </div>

        {/* Forgot password */}
        <div style={{
          textAlign: "center", marginTop: 14,
          fontFamily: "'DM Mono', monospace", fontSize: 11, color: SLATE + "88",
        }}>
          <Link href="/reset-password" style={{ color: SLATE + "88", textDecoration: "none" }}>
            forgot password?
          </Link>
        </div>

        {/* Sign up link */}
        <div style={{
          textAlign: "center", marginTop: 12,
          fontFamily: "'DM Sans', sans-serif", fontSize: 13, color: SLATE,
        }}>
          new here?{" "}
          <Link href="/signup" style={{ color: RUST, fontWeight: 600, textDecoration: "none" }}>
            join stamps land
          </Link>
        </div>
      </div>
    </div>
  );
}
