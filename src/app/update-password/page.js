"use client";
import { useState } from "react";
import { supabase } from "@/lib/supabase-browser";
import { useRouter } from "next/navigation";
import Link from "next/link";

const INK = "#1a1a1a";
const CREAM = "#F5F0E8";
const RUST = "#C45D3E";
const SLATE = "#5A5A6E";
const OFF_WHITE = "#FAF8F4";
const DARK_CREAM = "#EDE6D8";

export default function UpdatePasswordPage() {
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const router = useRouter();

  const handleUpdate = async () => {
    if (password.length < 6) { setError("password needs to be at least 6 characters"); return; }
    if (password !== confirm) { setError("passwords don't match"); return; }
    setLoading(true);
    setError("");
    const { error: updateError } = await supabase.auth.updateUser({ password });
    if (updateError) {
      setError(updateError.message);
    } else {
      setDone(true);
    }
    setLoading(false);
  };

  if (done) {
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
            password updated
          </div>
          <p style={{ fontSize: 13, color: SLATE, lineHeight: 1.6, marginBottom: 24 }}>
            you're all set. sign in with your new password.
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
            set a new password
          </div>
        </div>

        <div style={{ marginBottom: 12 }}>
          <label style={{
            fontFamily: "'DM Mono', monospace", fontSize: 10, color: SLATE,
            letterSpacing: "0.5px", display: "block", marginBottom: 6,
          }}>new password</label>
          <input type="password" value={password} onChange={(e) => setPassword(e.target.value)}
            placeholder="6+ characters"
            style={{ width: "100%", padding: "11px 14px", background: OFF_WHITE, border: `1px solid ${DARK_CREAM}`, borderRadius: 3, fontSize: 13, color: INK, outline: "none" }}
          />
        </div>

        <div style={{ marginBottom: 20 }}>
          <label style={{
            fontFamily: "'DM Mono', monospace", fontSize: 10, color: SLATE,
            letterSpacing: "0.5px", display: "block", marginBottom: 6,
          }}>confirm password</label>
          <input type="password" value={confirm} onChange={(e) => setConfirm(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleUpdate()}
            placeholder="type it again"
            style={{ width: "100%", padding: "11px 14px", background: OFF_WHITE, border: `1px solid ${DARK_CREAM}`, borderRadius: 3, fontSize: 13, color: INK, outline: "none" }}
          />
        </div>

        {error && (
          <div style={{
            background: RUST + "11", border: `1px solid ${RUST}33`, borderRadius: 3,
            padding: "10px 14px", marginBottom: 16, fontSize: 12, color: RUST,
          }}>{error}</div>
        )}

        <button onClick={handleUpdate} disabled={loading} style={{
          width: "100%", padding: "13px 16px", background: INK, color: CREAM,
          border: "none", borderRadius: 3, cursor: "pointer",
          fontFamily: "'DM Sans', sans-serif", fontSize: 13, fontWeight: 600,
          opacity: loading ? 0.5 : 1,
        }}>
          {loading ? "updating..." : "update password"}
        </button>
      </div>
    </div>
  );
}
