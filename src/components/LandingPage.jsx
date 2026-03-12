"use client";
import { useState, useEffect } from "react";
import { useAuth } from "@/lib/auth-context";
import Link from "next/link";

const INK = "#1A1018";
const CREAM = "#FAF5F0";
const RUST = "#8B1A2B";
const SAGE = "#7D8B6A";
const WARM_GOLD = "#C9922A";
const SLATE = "#8A7A82";
const OFF_WHITE = "#F5EFE6";
const DARK_CREAM = "#3A2F37";
const DUSTY_ROSE = "#D4A5A0";
const MEMBER_COLORS = {
  sofia: { primary: "#E0527A" },
  scarlett: { primary: "#9B7ABD" },
  rubina: { primary: "#7D8B6A" },
};

const STREAMING_ICONS = {
  spotify: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.66 0 12 0zm5.521 17.34c-.24.359-.66.48-1.021.24-2.82-1.74-6.36-2.101-10.561-1.141-.418.122-.779-.179-.899-.539-.12-.421.18-.78.54-.9 4.56-1.021 8.52-.6 11.64 1.32.42.18.479.659.301 1.02zm1.44-3.3c-.301.42-.841.6-1.262.3-3.239-1.98-8.159-2.58-11.939-1.38-.479.12-1.02-.12-1.14-.6-.12-.48.12-1.021.6-1.141C9.6 9.9 15 10.561 18.72 12.84c.361.181.54.78.241 1.2zm.12-3.36C15.24 8.4 8.82 8.16 5.16 9.301c-.6.179-1.2-.181-1.38-.721-.18-.601.18-1.2.72-1.381 4.26-1.26 11.28-1.02 15.721 1.621.539.3.719 1.02.419 1.56-.299.421-1.02.599-1.559.3z"/>
    </svg>
  ),
  "apple-music": (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
      <path d="M23.994 6.124a9.23 9.23 0 00-.24-2.19c-.317-1.31-1.062-2.31-2.18-3.043A5.022 5.022 0 0019.7.25C18.96.085 18.21.04 17.46.012c-.15-.01-.3-.01-.44-.012H6.98c-.15.002-.3.002-.44.012C5.79.04 5.04.085 4.3.25a5.023 5.023 0 00-1.874.64C1.307 1.634.562 2.634.245 3.944a9.23 9.23 0 00-.24 2.19C.003 6.284 0 6.43 0 6.58v10.84c0 .15.003.3.005.45a9.23 9.23 0 00.24 2.19c.317 1.31 1.062 2.31 2.18 3.043a5.022 5.022 0 001.874.64c.74.165 1.49.21 2.24.238.15.01.3.01.44.012h10.04c.15-.002.3-.002.44-.012.75-.028 1.5-.073 2.24-.238a5.022 5.022 0 001.874-.64c1.118-.733 1.863-1.733 2.18-3.043a9.23 9.23 0 00.24-2.19c.002-.15.005-.3.005-.45V6.58c0-.15-.003-.3-.005-.45zM17.46 12c0 .15-.003.3-.005.45v3.72c0 .03 0 .05-.002.08a1.17 1.17 0 01-.362.795 1.594 1.594 0 01-.9.395c-.39.06-.78-.03-1.09-.27-.31-.24-.5-.58-.55-.96a1.236 1.236 0 01.21-.87c.22-.31.55-.51.92-.58.21-.04.42-.08.63-.13.22-.05.37-.2.41-.42.01-.05.01-.11.01-.17V9.35c0-.27-.13-.42-.39-.38l-4.87.95c-.03.01-.06.01-.08.02-.23.06-.33.19-.34.43v6.09c0 .15-.003.3-.005.45a1.766 1.766 0 01-.088.47 1.17 1.17 0 01-.362.545 1.594 1.594 0 01-.9.395c-.39.06-.78-.03-1.09-.27-.31-.24-.5-.58-.55-.96a1.236 1.236 0 01.21-.87c.22-.31.55-.51.92-.58.21-.04.42-.08.63-.13.22-.05.37-.2.41-.42.02-.1.02-.2.02-.3V8.18c0-.35.14-.59.46-.68l5.83-1.34c.1-.02.2-.04.3-.04.32 0 .49.17.49.5V12z"/>
    </svg>
  ),
  youtube: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
      <path d="M23.498 6.186a3.016 3.016 0 00-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 00.502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 002.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 002.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/>
    </svg>
  ),
  bandcamp: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
      <path d="M0 18.75l7.437-13.5H24l-7.438 13.5H0z"/>
    </svg>
  ),
  instagram: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z"/>
    </svg>
  ),
  tiktok: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
      <path d="M12.525.02c1.31-.02 2.61-.01 3.91-.02.08 1.53.63 3.09 1.75 4.17 1.12 1.11 2.7 1.62 4.24 1.79v4.03c-1.44-.05-2.89-.35-4.2-.97-.57-.26-1.1-.59-1.62-.93-.01 2.92.01 5.84-.02 8.75-.08 1.4-.54 2.79-1.35 3.94-1.31 1.92-3.58 3.17-5.91 3.21-1.43.08-2.86-.31-4.08-1.03-2.02-1.19-3.44-3.37-3.65-5.71-.02-.5-.03-1-.01-1.49.18-1.9 1.12-3.72 2.58-4.96 1.66-1.44 3.98-2.13 6.15-1.72.02 1.48-.04 2.96-.04 4.44-.99-.32-2.15-.23-3.02.37-.63.41-1.11 1.04-1.36 1.75-.21.51-.15 1.07-.14 1.61.24 1.64 1.82 3.02 3.5 2.87 1.12-.01 2.19-.66 2.77-1.61.19-.33.4-.67.41-1.06.1-1.79.06-3.57.07-5.36.01-4.03-.01-8.05.02-12.07z"/>
    </svg>
  ),
};

function WaitlistForm() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [artist, setArtist] = useState("");
  const [message, setMessage] = useState("");
  const [status, setStatus] = useState("idle"); // idle | sending | sent | error

  const handleSubmit = async () => {
    if (!name.trim() || !email.trim() || !artist.trim()) return;
    setStatus("sending");
    try {
      const res = await fetch("/api/waitlist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name.trim(), email: email.trim(), artist: artist.trim(), message: message.trim() }),
      });
      if (res.ok) { setStatus("sent"); }
      else { setStatus("error"); }
    } catch { setStatus("error"); }
  };

  const inputStyle = {
    width: "100%", padding: "10px 12px", background: "#fff", border: "1px solid #E8DDD4",
    borderRadius: 8, fontSize: 13, color: INK, outline: "none", fontFamily: "'DM Sans', sans-serif",
    marginBottom: 10, boxSizing: "border-box",
  };

  if (status === "sent") {
    return (
      <div style={{ textAlign: "center", marginTop: 40, padding: "28px 20px", background: INK + "08", borderRadius: 10, border: `1px solid ${INK}11` }}>
        <div style={{ fontSize: 24, marginBottom: 8 }}>✦</div>
        <div style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 14, color: INK, fontWeight: 600, marginBottom: 6 }}>you're on the list</div>
        <div style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 12, color: SLATE, lineHeight: 1.5 }}>we'll be in touch soon.</div>
      </div>
    );
  }

  return (
    <div style={{ textAlign: "center", marginTop: 40, padding: "28px 20px", background: INK + "08", borderRadius: 10, border: `1px solid ${INK}11` }}>
      <div style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 14, color: INK, fontWeight: 600, marginBottom: 6 }}>
        want something like this for your artist?
      </div>
      <div style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 12, color: SLATE, lineHeight: 1.5, marginBottom: 16, maxWidth: 320, margin: "0 auto 16px" }}>
        we're building fan community platforms for independent artists and bands. join the waitlist and we'll be in touch.
      </div>
      <div style={{ maxWidth: 320, margin: "0 auto", textAlign: "left" }}>
        <input value={name} onChange={(e) => setName(e.target.value)} placeholder="your name" style={inputStyle} />
        <input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="your email" type="email" style={inputStyle} />
        <input value={artist} onChange={(e) => setArtist(e.target.value)} placeholder="artist or band name" style={inputStyle} />
        <textarea value={message} onChange={(e) => setMessage(e.target.value)} placeholder="anything else you'd like us to know? (optional)" rows={3}
          style={{ ...inputStyle, resize: "vertical", fontFamily: "'DM Sans', sans-serif" }} />
        <button onClick={handleSubmit} disabled={!name.trim() || !email.trim() || !artist.trim() || status === "sending"} style={{
          width: "100%", padding: "11px 22px", background: (name.trim() && email.trim() && artist.trim()) ? INK : "#E8DDD4",
          color: (name.trim() && email.trim() && artist.trim()) ? CREAM : SLATE + "66",
          borderRadius: 8, fontSize: 12, fontWeight: 600, border: "none",
          cursor: (name.trim() && email.trim() && artist.trim()) ? "pointer" : "default",
          fontFamily: "'DM Sans', sans-serif",
        }}>{status === "sending" ? "sending..." : "join the waitlist"}</button>
        {status === "error" && <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 10, color: RUST, marginTop: 8, textAlign: "center" }}>something went wrong. try again or email info@mondamgmt.com</div>}
      </div>
    </div>
  );
}

export default function LandingPage() {
  const { user, loading, supabase } = useAuth();
  const [links, setLinks] = useState({ streaming: [], social: [] });
  const [shows, setShows] = useState([]);
  const [loadingData, setLoadingData] = useState(true);
  const [captureEmail, setCaptureEmail] = useState("");
  const [emailSubmitted, setEmailSubmitted] = useState(false);
  const [emailSubmitting, setEmailSubmitting] = useState(false);
  const [emailError, setEmailError] = useState("");
  const [spotifyEmbed1, setSpotifyEmbed1] = useState(null);
  const [spotifyEmbed2, setSpotifyEmbed2] = useState(null);
  const [teaserPosts, setTeaserPosts] = useState([]);
  const [showAllShows, setShowAllShows] = useState(false);

  const handleEmailCapture = async () => {
    if (!captureEmail.trim() || !captureEmail.includes("@")) {
      setEmailError("enter a valid email");
      return;
    }
    setEmailSubmitting(true);
    setEmailError("");
    const { error } = await supabase.from("email_subscribers").insert({ email: captureEmail.trim().toLowerCase() });
    if (error) {
      if (error.code === "23505") {
        setEmailSubmitted(true); // Already subscribed
      } else {
        setEmailError("something went wrong, try again");
      }
    } else {
      setEmailSubmitted(true);
    }
    setEmailSubmitting(false);
  };

  useEffect(() => {
    async function fetchData() {
      // Fetch links
      const { data: linksData } = await supabase
        .from("links")
        .select("*")
        .eq("is_active", true)
        .order("sort_order");

      if (linksData) {
        setLinks({
          streaming: linksData.filter((l) => l.category === "streaming"),
          social: linksData.filter((l) => l.category === "social"),
        });
      }

      // Fetch upcoming shows (limit to next 5)
      const today = new Date().toISOString().split("T")[0];
      const { data: showsData } = await supabase
        .from("shows")
        .select("*")
        .gte("date", today)
        .neq("status", "cancelled")
        .order("date");

      if (showsData) setShows(showsData);

      // Fetch Spotify embed settings
      const { data: settings } = await supabase.from("site_settings").select("*");
      if (settings) {
        const s1 = settings.find((s) => s.key === "spotify_embed_1");
        const s2 = settings.find((s) => s.key === "spotify_embed_2");
        if (s1) setSpotifyEmbed1(s1.value);
        if (s2) setSpotifyEmbed2(s2.value);
      }

      // Fetch recent posts for teaser
      const { data: postsData } = await supabase
        .from("posts")
        .select("*")
        .eq("feed_type", "community")
        .eq("is_exclusive", false)
        .order("created_at", { ascending: false })
        .limit(4);

      if (postsData) {
        const authorIds = [...new Set(postsData.map((p) => p.author_id))];
        let profileMap = {};
        if (authorIds.length > 0) {
          const { data: profiles } = await supabase
            .from("profiles")
            .select("id, display_name, role, band_member")
            .in("id", authorIds);
          if (profiles) profiles.forEach((p) => { profileMap[p.id] = p; });
        }
        setTeaserPosts(postsData.map((p) => ({ ...p, profiles: profileMap[p.author_id] || null })));
      }

      setLoadingData(false);
    }

    fetchData();
  }, []);

  const formatDate = (dateStr) => {
    const d = new Date(dateStr + "T00:00:00");
    return d.toLocaleDateString("en-AU", { day: "numeric", month: "short" });
  };

  if (loadingData) {
    return (
      <div style={{ minHeight: "100vh", background: INK, display: "flex", alignItems: "center", justifyContent: "center" }}>
        <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 14, color: CREAM + "44" }}>✦</div>
      </div>
    );
  }

  return (
    <div style={{
      minHeight: "100vh",
      background: INK,
      fontFamily: "'DM Sans', sans-serif",
    }}>

      {/* Dark hero section */}
      <div style={{ maxWidth: 480, margin: "0 auto", padding: "48px 20px 40px", textAlign: "center", position: "relative" }}>
        {/* Subtle warm glow */}
        <div style={{ position: "absolute", top: 0, left: "50%", transform: "translateX(-50%)", width: 300, height: 300, background: "radial-gradient(ellipse, rgba(196,75,90,0.08), transparent 70%)", pointerEvents: "none" }} />
        {/* Band name */}
        <div style={{
          fontFamily: "'CooperBT', 'Cooper Black', 'Rockwell Extra Bold', 'Georgia', serif",
          fontSize: 44, color: CREAM, fontWeight: 900, lineHeight: 1, marginBottom: 6,
          animation: "fadeIn 0.6s ease-out",
        }}>
          the stamps
        </div>
        <div style={{
          fontFamily: "'DM Mono', monospace", fontSize: 10, color: DUSTY_ROSE + "88",
          letterSpacing: "4px", textTransform: "uppercase", marginBottom: 36,
          animation: "fadeIn 0.6s ease-out 0.1s both",
        }}>
          sofia · scarlett · rubina
        </div>

        {/* Spotify embed */}
        {spotifyEmbed1 && (
          <div style={{
            marginBottom: 28, animation: "fadeIn 0.6s ease-out 0.2s both",
          }}>
            <div style={{
              fontFamily: "'DM Mono', monospace", fontSize: 8, color: CREAM + "44",
              letterSpacing: "2px", textTransform: "uppercase", marginBottom: 10,
            }}>
              now playing
            </div>
            <div style={{ borderRadius: 8, overflow: "hidden" }}>
              <iframe
                style={{ border: "none", display: "block" }}
                src={spotifyEmbed1}
                width="100%"
                height="152"
                allowFullScreen
                allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
                loading="lazy"
              />
            </div>
          </div>
        )}

        {/* Streaming links */}
        <div style={{
          display: "flex", flexDirection: "column", gap: 8, marginBottom: 24,
          animation: "fadeIn 0.6s ease-out 0.3s both",
        }}>
          {links.streaming.map((link) => (
            <a
              key={link.id}
              href={link.url}
              target="_blank"
              rel="noopener noreferrer"
              style={{
                display: "flex", alignItems: "center", justifyContent: "center", gap: 10,
                padding: "14px 20px", background: "rgba(255,255,255,0.06)",
                border: "1px solid rgba(255,255,255,0.08)", borderRadius: 3,
                color: CREAM, textDecoration: "none", fontSize: 13, fontWeight: 600,
                transition: "all 0.2s ease",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = "rgba(196,75,90,0.12)";
                e.currentTarget.style.borderColor = "rgba(196,75,90,0.25)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = "rgba(255,255,255,0.06)";
                e.currentTarget.style.borderColor = "rgba(255,255,255,0.08)";
              }}
            >
              {STREAMING_ICONS[link.icon]}
              {link.label}
            </a>
          ))}
        </div>

        {/* Social links */}
        <div style={{
          display: "flex", justifyContent: "center", gap: 14,
          animation: "fadeIn 0.6s ease-out 0.4s both",
        }}>
          {links.social.map((link) => (
            <a
              key={link.id}
              href={link.url}
              target="_blank"
              rel="noopener noreferrer"
              style={{
                width: 44, height: 44, borderRadius: "50%",
                background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.08)",
                display: "flex", alignItems: "center", justifyContent: "center",
                color: CREAM, textDecoration: "none",
                transition: "all 0.2s ease",
              }}
              onMouseEnter={(e) => { e.currentTarget.style.background = "rgba(196,75,90,0.12)"; }}
              onMouseLeave={(e) => { e.currentTarget.style.background = "rgba(255,255,255,0.06)"; }}
            >
              {STREAMING_ICONS[link.icon]}
            </a>
          ))}
        </div>
      </div>

      {/* Transition to light */}
      <div style={{ background: `linear-gradient(180deg, ${INK} 0%, #2a2220 40%, ${CREAM} 100%)`, height: 80 }} />

      {/* Light section */}
      <div style={{ background: CREAM }}>
        <div style={{ maxWidth: 480, margin: "0 auto", padding: "0 20px 60px" }}>

          {/* Upcoming shows */}
          {shows.length > 0 && (
            <div style={{ marginBottom: 28, animation: "fadeIn 0.6s ease-out 0.5s both" }}>
              <div style={{
                fontFamily: "'DM Mono', monospace", fontSize: 9, color: SLATE,
                letterSpacing: "1.5px", textTransform: "uppercase", marginBottom: 12,
              }}>
                upcoming shows · {shows.length} dates
              </div>
              {(showAllShows ? shows : shows.slice(0, 4)).map((show) => (
                <div key={show.id} onClick={() => show.ticket_url && window.open(show.ticket_url, "_blank")} style={{
                  background: OFF_WHITE, borderRadius: 3, padding: "13px 16px", marginBottom: 6,
                  border: `1px solid #E8E2D8`, display: "flex", alignItems: "center", gap: 14,
                  cursor: show.ticket_url ? "pointer" : "default",
                }}>
                  <div style={{
                    fontFamily: "'DM Mono', monospace", fontSize: 11, color: SLATE, minWidth: 48,
                  }}>
                    {formatDate(show.date)}
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 13, fontWeight: 600, color: INK }}>
                      {show.city}
                      {show.country && show.country !== "AU" && show.country !== "UK" && (
                        <span style={{ color: SLATE, fontWeight: 400 }}> {show.country}</span>
                      )}
                    </div>
                    <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 10, color: SLATE + "AA" }}>
                      {show.venue}
                    </div>
                  </div>
                  {show.status === "sold_out" ? (
                    <span style={{
                      fontFamily: "'DM Mono', monospace", fontSize: 9, color: RUST,
                      letterSpacing: "0.8px", textTransform: "uppercase",
                    }}>sold out</span>
                  ) : show.status === "door_sales" ? (
                    <span style={{
                      fontFamily: "'DM Mono', monospace", fontSize: 9, color: WARM_GOLD,
                      letterSpacing: "0.8px", textTransform: "uppercase",
                    }}>on the door</span>
                  ) : show.ticket_url ? (
                    <span style={{
                      background: INK, color: CREAM, borderRadius: 2,
                      padding: "6px 12px", fontSize: 10, fontWeight: 600,
                    }}>tickets</span>
                  ) : (
                    <span style={{
                      fontFamily: "'DM Mono', monospace", fontSize: 9, color: SAGE,
                      letterSpacing: "0.8px", textTransform: "uppercase",
                    }}>on sale</span>
                  )}
                </div>
              ))}
              {shows.length > 4 && (
                <button onClick={() => setShowAllShows(!showAllShows)} style={{
                  display: "block", width: "100%", textAlign: "center", marginTop: 8,
                  padding: "10px", background: "transparent", border: `1px solid ${DARK_CREAM}`,
                  borderRadius: 3, cursor: "pointer",
                  fontFamily: "'DM Mono', monospace", fontSize: 11, color: RUST,
                }}>
                  {showAllShows ? "show less" : `see all ${shows.length} dates`}
                </button>
              )}
            </div>
          )}

          {/* Community teaser */}
          {teaserPosts.length > 0 && (
            <div style={{ marginBottom: 20, position: "relative" }}>
              <div style={{
                fontFamily: "'DM Mono', monospace", fontSize: 9, color: SLATE,
                letterSpacing: "1.5px", textTransform: "uppercase", marginBottom: 12,
              }}>
                inside stamps land
              </div>

              <div style={{ position: "relative" }}>
                {/* Teaser posts */}
                {teaserPosts.slice(0, 3).map((post, i) => {
                  const prof = post.profiles || {};
                  const isBand = prof.role === "band";
                  const memberKey = prof.band_member;
                  const displayName = isBand && memberKey ? memberKey : prof.display_name || "fan";
                  return (
                    <div key={post.id} style={{
                      background: OFF_WHITE, borderRadius: 3, padding: "14px 16px", marginBottom: 6,
                      border: `1px solid #E8E2D8`,
                      borderLeft: isBand && memberKey && MEMBER_COLORS[memberKey] ? `3px solid ${MEMBER_COLORS[memberKey].primary}` : undefined,
                      filter: i === 0 ? "none" : `blur(${i * 2}px)`,
                      opacity: 1 - (i * 0.2),
                      pointerEvents: "none", userSelect: "none",
                    }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
                        <div style={{
                          width: 26, height: 26, borderRadius: 3,
                          background: isBand ? RUST : DUSTY_ROSE + "33",
                          color: isBand ? CREAM : SLATE,
                          display: "flex", alignItems: "center", justifyContent: "center",
                          fontSize: 10, fontFamily: "'DM Mono', monospace", fontWeight: 600,
                        }}>
                          {isBand ? "✦" : displayName.charAt(0).toLowerCase()}
                        </div>
                        <span style={{ fontSize: 12, fontWeight: 600, color: INK }}>{displayName}</span>
                        {isBand && <span style={{ fontFamily: "'DM Mono', monospace", fontSize: 7, color: RUST, border: `1px solid ${RUST}44`, padding: "0px 4px", borderRadius: 2 }}>band</span>}
                      </div>
                      <p style={{ fontSize: 12, color: INK + "BB", lineHeight: 1.5, margin: 0 }}>
                        {post.content.length > 90 ? post.content.slice(0, 90) + "..." : post.content}
                      </p>
                    </div>
                  );
                })}

                {/* Fade overlay with CTA */}
                <div style={{
                  position: "absolute", bottom: 0, left: 0, right: 0,
                  background: `linear-gradient(180deg, transparent 0%, ${CREAM} 60%)`,
                  padding: "60px 0 0", display: "flex", justifyContent: "center",
                }}>
                  <Link href="/signup" style={{
                    background: RUST, color: CREAM, borderRadius: 3,
                    padding: "14px 28px", textDecoration: "none",
                    fontFamily: "'CooperBT', 'Cooper Black', serif",
                    fontSize: 14, fontWeight: 900, textAlign: "center",
                    boxShadow: "0 2px 8px rgba(196,93,62,0.3)",
                  }}>
                    join stamps land ✦
                  </Link>
                </div>
              </div>

              <div style={{
                textAlign: "center", marginTop: 12,
                fontFamily: "'DM Mono', monospace", fontSize: 10, color: SLATE + "88",
              }}>
                post, comment, earn rewards, unlock exclusive content
              </div>
            </div>
          )}

          {/* Community CTA */}
          <div style={{
            background: INK, borderRadius: 3, padding: "32px 22px", textAlign: "center",
            border: `1px solid ${RUST}22`,
          }}>
            <div style={{ fontSize: 28, marginBottom: 12, color: RUST }}>✦</div>
            <div style={{
              fontFamily: "'CooperBT', 'Cooper Black', 'Rockwell Extra Bold', 'Georgia', serif",
              fontSize: 22, color: CREAM, fontWeight: 900, marginBottom: 12,
            }}>
              stamps land
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 8, maxWidth: 300, margin: "0 auto 22px", textAlign: "left" }}>
              {[
                { icon: "◎", text: "personal feeds from sofia, scarlett and rubina" },
                { icon: "✦", text: "earn stamps for posting, commenting, and showing up" },
                { icon: "♛", text: "unlock rewards: merch, signed vinyl, zoom hangouts" },
                { icon: "↩", text: "connect with fans from perth to london" },
              ].map((item) => (
                <div key={item.text} style={{ display: "flex", gap: 10, alignItems: "flex-start" }}>
                  <span style={{ fontFamily: "'DM Mono', monospace", fontSize: 13, color: RUST, flexShrink: 0, marginTop: 1 }}>{item.icon}</span>
                  <span style={{ fontSize: 12, color: CREAM + "AA", lineHeight: 1.5 }}>{item.text}</span>
                </div>
              ))}
            </div>
            <div style={{ display: "flex", gap: 8, justifyContent: "center" }}>
              <Link href="/signup" style={{
                padding: "13px 28px", background: RUST, color: CREAM,
                borderRadius: 3, textDecoration: "none", fontSize: 13, fontWeight: 600,
              }}>
                join free
              </Link>
              <Link href="/login" style={{
                padding: "13px 28px", background: "transparent", color: CREAM + "77",
                border: `1px solid ${CREAM}22`, borderRadius: 3, textDecoration: "none",
                fontSize: 13, fontWeight: 500,
              }}>
                sign in
              </Link>
            </div>
          </div>

          {/* Artist waitlist */}
          <WaitlistForm />

          {/* Footer */}
          <div style={{
            textAlign: "center", marginTop: 28, fontFamily: "'DM Mono', monospace",
            fontSize: 9, color: SLATE + "77", letterSpacing: "0.5px",
          }}>
            © 2026 the stamps · stamps land
            <div style={{ marginTop: 6 }}>
              <Link href="/privacy" style={{ color: SLATE + "55", textDecoration: "none", marginRight: 12 }}>privacy</Link>
              <Link href="/terms" style={{ color: SLATE + "55", textDecoration: "none" }}>terms</Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
