"use client";
import { useState, useEffect, useCallback } from "react";
import { useAuth } from "@/lib/auth-context";
import { useRouter } from "next/navigation";

const INK = "#1a1a1a";
const CREAM = "#F5F0E8";
const RUST = "#C45D3E";
const SAGE = "#7D8B6A";
const WARM_GOLD = "#D4A843";
const SLATE = "#5A5A6E";
const OFF_WHITE = "#FAF8F4";
const DARK_CREAM = "#EDE6D8";

const Heading = ({ children, size = 24, color = INK, style = {} }) => (
  <div style={{
    fontFamily: "'CooperBT', 'Cooper Black', 'Rockwell Extra Bold', 'Georgia', serif",
    fontSize: size, color, fontWeight: 900, lineHeight: 1.1, ...style,
  }}>{children}</div>
);

const TABS = [
  { id: "overview", label: "overview", icon: "◎" },
  { id: "posts", label: "posts", icon: "✎" },
  { id: "shows", label: "shows", icon: "♫" },
  { id: "links", label: "links", icon: "↗" },
  { id: "stamps", label: "stamps", icon: "✦" },
  { id: "rewards", label: "rewards", icon: "♛" },
  { id: "members", label: "members", icon: "○" },
];

// ============ OVERVIEW ============
function Overview({ supabase }) {
  const [stats, setStats] = useState({ members: 0, posts: 0, shows: 0, totalStamps: 0, pendingClaims: 0 });
  const [recentMembers, setRecentMembers] = useState([]);

  useEffect(() => {
    async function load() {
      const [members, posts, shows, pendingClaims] = await Promise.all([
        supabase.from("profiles").select("id", { count: "exact", head: true }),
        supabase.from("posts").select("id", { count: "exact", head: true }),
        supabase.from("shows").select("id", { count: "exact", head: true }),
        supabase.from("reward_claims").select("id", { count: "exact", head: true }).eq("status", "pending"),
      ]);

      const { data: stampData } = await supabase.from("profiles").select("stamp_count");
      const totalStamps = (stampData || []).reduce((sum, p) => sum + (p.stamp_count || 0), 0);

      setStats({
        members: members.count || 0,
        posts: posts.count || 0,
        shows: shows.count || 0,
        totalStamps,
        pendingClaims: pendingClaims.count || 0,
      });

      const { data: recent } = await supabase
        .from("profiles")
        .select("display_name, stamp_count, joined_at, role")
        .order("joined_at", { ascending: false })
        .limit(5);
      setRecentMembers(recent || []);
    }
    load();
  }, []);

  const statCards = [
    { label: "members", value: stats.members, color: SAGE },
    { label: "posts", value: stats.posts, color: RUST },
    { label: "shows", value: stats.shows, color: WARM_GOLD },
    { label: "stamps awarded", value: stats.totalStamps, color: "#6B5B8D" },
    { label: "pending rewards", value: stats.pendingClaims, color: stats.pendingClaims > 0 ? RUST : SLATE },
  ];

  return (
    <div>
      <Heading size={22} style={{ marginBottom: 18 }}>dashboard</Heading>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 24 }}>
        {statCards.map((s) => (
          <div key={s.label} style={{
            background: OFF_WHITE, borderRadius: 3, padding: "18px 16px",
            border: "1px solid #E8E2D8",
          }}>
            <Heading size={28} color={s.color}>{s.value}</Heading>
            <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 10, color: SLATE, marginTop: 4, letterSpacing: "0.5px" }}>{s.label}</div>
          </div>
        ))}
      </div>

      <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 9, color: SLATE, letterSpacing: "1.5px", textTransform: "uppercase", marginBottom: 10 }}>recent members</div>
      <div style={{ background: OFF_WHITE, borderRadius: 3, border: "1px solid #E8E2D8" }}>
        {recentMembers.map((m, i) => (
          <div key={m.display_name} style={{
            padding: "12px 16px", display: "flex", alignItems: "center", gap: 12,
            borderBottom: i < recentMembers.length - 1 ? `1px solid ${DARK_CREAM}` : "none",
          }}>
            <div style={{
              width: 30, height: 30, borderRadius: 3, background: DARK_CREAM,
              display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: 12, fontFamily: "'DM Mono', monospace", color: SLATE,
            }}>{m.display_name?.charAt(0)?.toLowerCase()}</div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 13, fontWeight: 600, color: INK }}>{m.display_name}</div>
              <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 10, color: SLATE }}>
                {new Date(m.joined_at).toLocaleDateString("en-AU", { day: "numeric", month: "short" })}
                {m.role !== "fan" && <span style={{ color: RUST, marginLeft: 6 }}>{m.role}</span>}
              </div>
            </div>
            <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 11, color: WARM_GOLD }}>{m.stamp_count} ✦</div>
          </div>
        ))}
        {recentMembers.length === 0 && (
          <div style={{ padding: 20, textAlign: "center", fontFamily: "'DM Mono', monospace", fontSize: 12, color: SLATE }}>no members yet</div>
        )}
      </div>
    </div>
  );
}

// ============ POSTS MANAGER ============
function PostsManager({ supabase, profile }) {
  const [posts, setPosts] = useState([]);
  const [newContent, setNewContent] = useState("");
  const [feedType, setFeedType] = useState("community");
  const [isExclusive, setIsExclusive] = useState(false);
  const [posting, setPosting] = useState(false);

  const feedOptions = profile?.role === "admin"
    ? ["community", "sofia", "scarlett", "rubina"]
    : profile?.band_member
      ? ["community", profile.band_member]
      : ["community"];

  const loadPosts = useCallback(async () => {
    const { data } = await supabase
      .from("posts")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(50);

    if (!data) { setPosts([]); return; }

    const authorIds = [...new Set(data.map((p) => p.author_id))];
    let profileMap = {};
    if (authorIds.length > 0) {
      const { data: profiles } = await supabase
        .from("profiles")
        .select("id, display_name, role, band_member")
        .in("id", authorIds);
      if (profiles) profiles.forEach((p) => { profileMap[p.id] = p; });
    }

    setPosts(data.map((p) => ({ ...p, profiles: profileMap[p.author_id] || null })));
  }, [supabase]);

  useEffect(() => { loadPosts(); }, []);

  const handlePost = async () => {
    if (!newContent.trim() || posting) return;
    setPosting(true);
    await supabase.from("posts").insert({
      author_id: profile.id,
      content: newContent.trim(),
      feed_type: feedType,
      is_exclusive: isExclusive,
    });
    setNewContent("");
    setIsExclusive(false);
    await loadPosts();
    setPosting(false);
  };

  const deletePost = async (id) => {
    const { error } = await supabase.rpc("admin_delete_post", { target_id: id });
    if (error) { console.error("deletePost error:", error); alert("Failed: " + error.message); return; }
    await loadPosts();
  };

  return (
    <div>
      <Heading size={22} style={{ marginBottom: 18 }}>manage posts</Heading>

      {/* Compose */}
      <div style={{ background: OFF_WHITE, borderRadius: 3, padding: "18px", border: "1px solid #E8E2D8", marginBottom: 20 }}>
        <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 9, color: SLATE, letterSpacing: "1px", textTransform: "uppercase", marginBottom: 8 }}>new post</div>
        <textarea
          value={newContent}
          onChange={(e) => setNewContent(e.target.value)}
          placeholder="write something for the community..."
          rows={4}
          style={{
            width: "100%", padding: "12px", background: CREAM, border: `1px solid ${DARK_CREAM}`,
            borderRadius: 3, fontSize: 13, color: INK, outline: "none", resize: "vertical",
            fontFamily: "'DM Sans', sans-serif", lineHeight: 1.6,
          }}
        />
        <div style={{ display: "flex", alignItems: "center", gap: 12, marginTop: 12, flexWrap: "wrap" }}>
          <div style={{ display: "flex", gap: 6 }}>
            {feedOptions.map((f) => (
              <button key={f} onClick={() => setFeedType(f)} style={{
                padding: "6px 12px", fontSize: 11, fontWeight: feedType === f ? 600 : 400,
                background: feedType === f ? INK : "transparent", color: feedType === f ? CREAM : SLATE,
                border: `1px solid ${feedType === f ? INK : DARK_CREAM}`, borderRadius: 2, cursor: "pointer",
                fontFamily: "'DM Sans', sans-serif",
              }}>{f}</button>
            ))}
          </div>
          <label style={{ display: "flex", alignItems: "center", gap: 6, cursor: "pointer", fontSize: 11, color: SLATE, fontFamily: "'DM Mono', monospace" }}>
            <input type="checkbox" checked={isExclusive} onChange={(e) => setIsExclusive(e.target.checked)} />
            exclusive ✦
          </label>
          <button onClick={handlePost} disabled={!newContent.trim() || posting} style={{
            marginLeft: "auto", padding: "8px 20px", background: INK, color: CREAM,
            border: "none", borderRadius: 2, fontSize: 12, fontWeight: 600, cursor: "pointer",
            opacity: !newContent.trim() || posting ? 0.5 : 1,
          }}>{posting ? "posting..." : "publish"}</button>
        </div>
      </div>

      {/* Posts list */}
      {posts.map((post) => (
        <div key={post.id} style={{
          background: OFF_WHITE, borderRadius: 3, padding: "14px 16px", marginBottom: 8,
          border: `1px solid ${post.is_exclusive ? WARM_GOLD + "33" : "#E8E2D8"}`,
          display: "flex", gap: 12,
        }}>
          <div style={{ flex: 1 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
              <span style={{ fontSize: 12, fontWeight: 600, color: INK }}>{post.profiles?.display_name}</span>
              <span style={{ fontFamily: "'DM Mono', monospace", fontSize: 9, color: SLATE,
                background: DARK_CREAM, padding: "1px 6px", borderRadius: 2 }}>{post.feed_type}</span>
              {post.is_exclusive && <span style={{ fontFamily: "'DM Mono', monospace", fontSize: 9, color: WARM_GOLD }}>✦ exclusive</span>}
              <span style={{ fontFamily: "'DM Mono', monospace", fontSize: 9, color: SLATE + "77", marginLeft: "auto" }}>
                {new Date(post.created_at).toLocaleDateString("en-AU", { day: "numeric", month: "short" })}
              </span>
            </div>
            <p style={{ fontSize: 12, color: INK + "CC", lineHeight: 1.5 }}>
              {post.content.length > 120 ? post.content.slice(0, 120) + "..." : post.content}
            </p>
            <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 10, color: SLATE, marginTop: 6 }}>
              ♥ {post.like_count || 0} · ↩ {post.comment_count || 0}
            </div>
          </div>
          <button onClick={() => deletePost(post.id)} style={{
            background: "none", border: "none", cursor: "pointer", color: RUST + "66",
            fontSize: 14, fontFamily: "'DM Mono', monospace", alignSelf: "flex-start", padding: "4px",
          }} title="delete post">×</button>
        </div>
      ))}
    </div>
  );
}

// ============ SHOWS MANAGER ============
function ShowsManager({ supabase }) {
  const [shows, setShows] = useState([]);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({ date: "", city: "", venue: "", country: "", region: "australia", ticket_url: "", status: "on_sale", checkin_code: "" });

  const loadShows = useCallback(async () => {
    const { data } = await supabase.from("shows").select("*").order("date");
    setShows(data || []);
  }, [supabase]);

  useEffect(() => { loadShows(); }, []);

  const resetForm = () => {
    setForm({ date: "", city: "", venue: "", country: "", region: "australia", ticket_url: "", status: "on_sale", checkin_code: "" });
    setEditing(null);
  };

  const handleSave = async () => {
    if (!form.date || !form.city || !form.venue) return;
    if (editing) {
      await supabase.from("shows").update(form).eq("id", editing);
    } else {
      await supabase.from("shows").insert(form);
    }
    resetForm();
    await loadShows();
  };

  const handleEdit = (show) => {
    setForm({
      date: show.date, city: show.city, venue: show.venue,
      country: show.country || "", region: show.region || "australia",
      ticket_url: show.ticket_url || "", status: show.status || "on_sale",
      checkin_code: show.checkin_code || "",
    });
    setEditing(show.id);
  };

  const handleDelete = async (id) => {
    await supabase.from("shows").delete().eq("id", id);
    await loadShows();
  };

  const Field = ({ label, value, onChange, type = "text", options }) => (
    <div style={{ marginBottom: 10 }}>
      <label style={{ fontFamily: "'DM Mono', monospace", fontSize: 9, color: SLATE, letterSpacing: "0.5px", display: "block", marginBottom: 4 }}>{label}</label>
      {options ? (
        <select value={value} onChange={(e) => onChange(e.target.value)} style={{
          width: "100%", padding: "9px 12px", background: CREAM, border: `1px solid ${DARK_CREAM}`,
          borderRadius: 3, fontSize: 13, color: INK, outline: "none",
        }}>
          {options.map((o) => <option key={o} value={o}>{o}</option>)}
        </select>
      ) : (
        <input type={type} value={value} onChange={(e) => onChange(e.target.value)} style={{
          width: "100%", padding: "9px 12px", background: CREAM, border: `1px solid ${DARK_CREAM}`,
          borderRadius: 3, fontSize: 13, color: INK, outline: "none", fontFamily: "'DM Sans', sans-serif",
        }} />
      )}
    </div>
  );

  return (
    <div>
      <Heading size={22} style={{ marginBottom: 18 }}>manage shows</Heading>

      {/* Add/Edit form */}
      <div style={{ background: OFF_WHITE, borderRadius: 3, padding: "18px", border: "1px solid #E8E2D8", marginBottom: 20 }}>
        <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 9, color: SLATE, letterSpacing: "1px", textTransform: "uppercase", marginBottom: 12 }}>
          {editing ? "edit show" : "add show"}
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0 12px" }}>
          <Field label="date" type="date" value={form.date} onChange={(v) => setForm({ ...form, date: v })} />
          <Field label="city" value={form.city} onChange={(v) => setForm({ ...form, city: v })} />
          <Field label="venue" value={form.venue} onChange={(v) => setForm({ ...form, venue: v })} />
          <Field label="country" value={form.country} onChange={(v) => setForm({ ...form, country: v })} />
          <Field label="region" value={form.region} onChange={(v) => setForm({ ...form, region: v })} options={["australia", "europe", "uk", "north_america", "other"]} />
          <Field label="status" value={form.status} onChange={(v) => setForm({ ...form, status: v })} options={["announced", "on_sale", "door_sales", "sold_out", "cancelled"]} />
        </div>
        <Field label="ticket url" value={form.ticket_url} onChange={(v) => setForm({ ...form, ticket_url: v })} />
        <div style={{ display: "grid", gridTemplateColumns: "1fr auto", gap: "0 12px", alignItems: "end" }}>
          <Field label="check-in code (fans enter this at the venue)" value={form.checkin_code} onChange={(v) => setForm({ ...form, checkin_code: v.toUpperCase() })} />
          <button type="button" onClick={() => setForm({ ...form, checkin_code: Math.random().toString(36).substring(2, 6).toUpperCase() })} style={{
            padding: "9px 14px", background: DARK_CREAM, border: "none", borderRadius: 3, fontSize: 10,
            fontFamily: "'DM Mono', monospace", cursor: "pointer", color: SLATE, marginBottom: 10,
          }}>generate</button>
        </div>
        <div style={{ display: "flex", gap: 8, marginTop: 6 }}>
          <button onClick={handleSave} style={{
            padding: "8px 20px", background: INK, color: CREAM, border: "none", borderRadius: 2,
            fontSize: 12, fontWeight: 600, cursor: "pointer",
          }}>{editing ? "update" : "add show"}</button>
          {editing && <button onClick={resetForm} style={{
            padding: "8px 20px", background: "transparent", color: SLATE, border: `1px solid ${DARK_CREAM}`,
            borderRadius: 2, fontSize: 12, cursor: "pointer",
          }}>cancel</button>}
        </div>
      </div>

      {/* Shows list */}
      {shows.map((show) => (
        <div key={show.id} style={{
          background: OFF_WHITE, borderRadius: 3, padding: "12px 16px", marginBottom: 6,
          border: "1px solid #E8E2D8", display: "flex", alignItems: "center", gap: 12,
          opacity: show.status === "cancelled" ? 0.4 : 1,
        }}>
          <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 11, color: SLATE, minWidth: 52 }}>
            {new Date(show.date + "T00:00:00").toLocaleDateString("en-AU", { day: "numeric", month: "short" })}
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 13, fontWeight: 600, color: INK }}>{show.city}{show.country ? ` ${show.country}` : ""}</div>
            <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 10, color: SLATE + "AA" }}>
              {show.venue}
              {show.checkin_code && <span style={{ color: WARM_GOLD, marginLeft: 8 }}>code: {show.checkin_code}</span>}
            </div>
          </div>
          <span style={{
            fontFamily: "'DM Mono', monospace", fontSize: 9, letterSpacing: "0.5px",
            color: show.status === "sold_out" ? RUST : show.status === "on_sale" ? SAGE : SLATE,
          }}>{show.status.replace("_", " ")}</span>
          <button onClick={() => handleEdit(show)} style={{
            background: "none", border: "none", cursor: "pointer", fontSize: 12, color: SLATE, fontFamily: "'DM Mono', monospace",
          }}>✎</button>
          <button onClick={() => handleDelete(show.id)} style={{
            background: "none", border: "none", cursor: "pointer", fontSize: 14, color: RUST + "66", fontFamily: "'DM Mono', monospace",
          }}>×</button>
        </div>
      ))}
    </div>
  );
}

// ============ LINKS MANAGER ============
function LinksManager({ supabase }) {
  const [links, setLinks] = useState([]);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({ label: "", url: "", icon: "", category: "streaming", sort_order: 0 });
  const [embed1, setEmbed1] = useState("");
  const [embed2, setEmbed2] = useState("");
  const [embedSaved, setEmbedSaved] = useState(false);
  const [tagSofia, setTagSofia] = useState("");
  const [tagScarlett, setTagScarlett] = useState("");
  const [tagRubina, setTagRubina] = useState("");
  const [tagSaved, setTagSaved] = useState(false);

  const loadLinks = useCallback(async () => {
    const { data } = await supabase.from("links").select("*").order("category").order("sort_order");
    setLinks(data || []);
    // Load embed settings
    const { data: settings } = await supabase.from("site_settings").select("*");
    if (settings) {
      const s1 = settings.find((s) => s.key === "spotify_embed_1");
      const s2 = settings.find((s) => s.key === "spotify_embed_2");
      if (s1) setEmbed1(s1.value);
      if (s2) setEmbed2(s2.value);
      const ts = settings.find((s) => s.key === "tagline_sofia");
      const tc = settings.find((s) => s.key === "tagline_scarlett");
      const tr = settings.find((s) => s.key === "tagline_rubina");
      if (ts) setTagSofia(ts.value);
      if (tc) setTagScarlett(tc.value);
      if (tr) setTagRubina(tr.value);
    }
  }, [supabase]);

  useEffect(() => { loadLinks(); }, []);

  const saveEmbeds = async () => {
    await supabase.from("site_settings").upsert({ key: "spotify_embed_1", value: embed1, updated_at: new Date().toISOString() });
    await supabase.from("site_settings").upsert({ key: "spotify_embed_2", value: embed2, updated_at: new Date().toISOString() });
    setEmbedSaved(true);
    setTimeout(() => setEmbedSaved(false), 2000);
  };

  const resetForm = () => { setForm({ label: "", url: "", icon: "", category: "streaming", sort_order: 0 }); setEditing(null); };

  const handleSave = async () => {
    if (!form.label || !form.url) return;
    if (editing) {
      await supabase.from("links").update(form).eq("id", editing);
    } else {
      await supabase.from("links").insert(form);
    }
    resetForm();
    await loadLinks();
  };

  const handleEdit = (link) => {
    setForm({ label: link.label, url: link.url, icon: link.icon || "", category: link.category, sort_order: link.sort_order || 0 });
    setEditing(link.id);
  };

  const handleDelete = async (id) => {
    await supabase.from("links").delete().eq("id", id);
    await loadLinks();
  };

  const toggleActive = async (id, current) => {
    await supabase.from("links").update({ is_active: !current }).eq("id", id);
    await loadLinks();
  };

  const Field = ({ label, value, onChange, options }) => (
    <div style={{ marginBottom: 10 }}>
      <label style={{ fontFamily: "'DM Mono', monospace", fontSize: 9, color: SLATE, letterSpacing: "0.5px", display: "block", marginBottom: 4 }}>{label}</label>
      {options ? (
        <select value={value} onChange={(e) => onChange(e.target.value)} style={{
          width: "100%", padding: "9px 12px", background: CREAM, border: `1px solid ${DARK_CREAM}`, borderRadius: 3, fontSize: 13, color: INK, outline: "none",
        }}>{options.map((o) => <option key={o} value={o}>{o}</option>)}</select>
      ) : (
        <input value={value} onChange={(e) => onChange(e.target.value)} style={{
          width: "100%", padding: "9px 12px", background: CREAM, border: `1px solid ${DARK_CREAM}`, borderRadius: 3, fontSize: 13, color: INK, outline: "none",
        }} />
      )}
    </div>
  );

  return (
    <div>
      <Heading size={22} style={{ marginBottom: 18 }}>manage links</Heading>
      <p style={{ fontSize: 12, color: SLATE, marginBottom: 16, lineHeight: 1.5 }}>
        these appear on the landing page. streaming links show as buttons, social links show as icons.
      </p>

      <div style={{ background: OFF_WHITE, borderRadius: 3, padding: "18px", border: "1px solid #E8E2D8", marginBottom: 20 }}>
        <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 9, color: SLATE, letterSpacing: "1px", textTransform: "uppercase", marginBottom: 12 }}>
          {editing ? "edit link" : "add link"}
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0 12px" }}>
          <Field label="label" value={form.label} onChange={(v) => setForm({ ...form, label: v })} />
          <Field label="icon key" value={form.icon} onChange={(v) => setForm({ ...form, icon: v })} />
          <Field label="category" value={form.category} onChange={(v) => setForm({ ...form, category: v })} options={["streaming", "social", "merch", "other"]} />
          <Field label="sort order" value={form.sort_order} onChange={(v) => setForm({ ...form, sort_order: parseInt(v) || 0 })} />
        </div>
        <Field label="url" value={form.url} onChange={(v) => setForm({ ...form, url: v })} />
        <div style={{ display: "flex", gap: 8, marginTop: 6 }}>
          <button onClick={handleSave} style={{ padding: "8px 20px", background: INK, color: CREAM, border: "none", borderRadius: 2, fontSize: 12, fontWeight: 600, cursor: "pointer" }}>{editing ? "update" : "add link"}</button>
          {editing && <button onClick={resetForm} style={{ padding: "8px 20px", background: "transparent", color: SLATE, border: `1px solid ${DARK_CREAM}`, borderRadius: 2, fontSize: 12, cursor: "pointer" }}>cancel</button>}
        </div>
      </div>

      {["streaming", "social", "merch", "other"].map((cat) => {
        const catLinks = links.filter((l) => l.category === cat);
        if (catLinks.length === 0) return null;
        return (
          <div key={cat} style={{ marginBottom: 16 }}>
            <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 9, color: SLATE, letterSpacing: "1.5px", textTransform: "uppercase", marginBottom: 8 }}>{cat}</div>
            {catLinks.map((link) => (
              <div key={link.id} style={{
                background: OFF_WHITE, borderRadius: 3, padding: "12px 16px", marginBottom: 6,
                border: "1px solid #E8E2D8", display: "flex", alignItems: "center", gap: 12,
                opacity: link.is_active ? 1 : 0.4,
              }}>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 13, fontWeight: 600, color: INK }}>{link.label}</div>
                  <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 10, color: SLATE + "AA", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: 250 }}>{link.url}</div>
                </div>
                <button onClick={() => toggleActive(link.id, link.is_active)} style={{
                  background: "none", border: "none", cursor: "pointer", fontSize: 10, color: link.is_active ? SAGE : RUST,
                  fontFamily: "'DM Mono', monospace",
                }}>{link.is_active ? "on" : "off"}</button>
                <button onClick={() => handleEdit(link)} style={{ background: "none", border: "none", cursor: "pointer", fontSize: 12, color: SLATE, fontFamily: "'DM Mono', monospace" }}>✎</button>
                <button onClick={() => handleDelete(link.id)} style={{ background: "none", border: "none", cursor: "pointer", fontSize: 14, color: RUST + "66", fontFamily: "'DM Mono', monospace" }}>×</button>
              </div>
            ))}
          </div>
        );
      })}

      {/* Spotify embed settings */}
      <div style={{ marginTop: 24 }}>
        <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 9, color: SLATE, letterSpacing: "1.5px", textTransform: "uppercase", marginBottom: 10 }}>spotify embeds (landing page)</div>
        <div style={{ background: OFF_WHITE, borderRadius: 3, padding: "18px", border: "1px solid #E8E2D8" }}>
          <p style={{ fontSize: 11, color: SLATE, marginBottom: 12, lineHeight: 1.5 }}>
            paste Spotify embed URLs here. on Spotify, right click any track, album, or playlist, then Share, then Embed, then copy the src URL from the iframe code.
          </p>
          <div style={{ marginBottom: 10 }}>
            <label style={{ fontFamily: "'DM Mono', monospace", fontSize: 9, color: SLATE, letterSpacing: "0.5px", display: "block", marginBottom: 4 }}>main embed (large)</label>
            <input value={embed1} onChange={(e) => setEmbed1(e.target.value)} placeholder="https://open.spotify.com/embed/album/..."
              style={{ width: "100%", padding: "9px 12px", background: CREAM, border: `1px solid ${DARK_CREAM}`, borderRadius: 3, fontSize: 12, color: INK, outline: "none", fontFamily: "'DM Mono', monospace" }}
            />
          </div>
          <div style={{ marginBottom: 12 }}>
            <label style={{ fontFamily: "'DM Mono', monospace", fontSize: 9, color: SLATE, letterSpacing: "0.5px", display: "block", marginBottom: 4 }}>secondary embed (compact) - optional</label>
            <input value={embed2} onChange={(e) => setEmbed2(e.target.value)} placeholder="https://open.spotify.com/embed/artist/..."
              style={{ width: "100%", padding: "9px 12px", background: CREAM, border: `1px solid ${DARK_CREAM}`, borderRadius: 3, fontSize: 12, color: INK, outline: "none", fontFamily: "'DM Mono', monospace" }}
            />
          </div>
          <button onClick={saveEmbeds} style={{
            padding: "8px 20px", background: embedSaved ? SAGE : INK, color: CREAM,
            border: "none", borderRadius: 2, fontSize: 12, fontWeight: 600, cursor: "pointer",
            transition: "background 0.2s",
          }}>{embedSaved ? "saved ✦" : "save embeds"}</button>
        </div>
      </div>

      {/* Member taglines */}
      <div style={{ marginTop: 24 }}>
        <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 9, color: SLATE, letterSpacing: "1.5px", textTransform: "uppercase", marginBottom: 10 }}>member taglines</div>
        <div style={{ background: OFF_WHITE, borderRadius: 3, padding: "18px", border: "1px solid #E8E2D8" }}>
          <p style={{ fontSize: 11, color: SLATE, marginBottom: 12, lineHeight: 1.5 }}>
            these show under each member's name in the feed. keep them short and personal.
          </p>
          {[
            { label: "sofia", value: tagSofia, set: setTagSofia, placeholder: "processing feelings through songs since '15" },
            { label: "scarlett", value: tagScarlett, set: setTagScarlett, placeholder: "joni mitchell made me do it" },
            { label: "rubina", value: tagRubina, set: setTagRubina, placeholder: "pluto's in aquarius & i'm feeling it" },
          ].map((t) => (
            <div key={t.label} style={{ marginBottom: 10 }}>
              <label style={{ fontFamily: "'DM Mono', monospace", fontSize: 9, color: SLATE, letterSpacing: "0.5px", display: "block", marginBottom: 4 }}>{t.label}</label>
              <input value={t.value} onChange={(e) => t.set(e.target.value)} placeholder={t.placeholder}
                style={{ width: "100%", padding: "9px 12px", background: CREAM, border: `1px solid ${DARK_CREAM}`, borderRadius: 3, fontSize: 12, color: INK, outline: "none", fontFamily: "'DM Sans', sans-serif" }}
              />
            </div>
          ))}
          <button onClick={async () => {
            await supabase.from("site_settings").upsert({ key: "tagline_sofia", value: tagSofia, updated_at: new Date().toISOString() });
            await supabase.from("site_settings").upsert({ key: "tagline_scarlett", value: tagScarlett, updated_at: new Date().toISOString() });
            await supabase.from("site_settings").upsert({ key: "tagline_rubina", value: tagRubina, updated_at: new Date().toISOString() });
            setTagSaved(true);
            setTimeout(() => setTagSaved(false), 2000);
          }} style={{
            padding: "8px 20px", background: tagSaved ? SAGE : INK, color: CREAM,
            border: "none", borderRadius: 2, fontSize: 12, fontWeight: 600, cursor: "pointer",
            transition: "background 0.2s",
          }}>{tagSaved ? "saved ✦" : "save taglines"}</button>
        </div>
      </div>
    </div>
  );
}
function StampsManager({ supabase }) {
  const [actions, setActions] = useState([]);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({ name: "", description: "", points: 0, action_type: "manual", trigger_key: "" });
  const [awardForm, setAwardForm] = useState({ userId: "", actionId: "" });
  const [members, setMembers] = useState([]);

  const loadActions = useCallback(async () => {
    const { data } = await supabase.from("stamp_actions").select("*").order("points");
    setActions(data || []);
  }, [supabase]);

  useEffect(() => {
    loadActions();
    supabase.from("profiles").select("id, display_name, stamp_count").order("display_name").then(({ data }) => setMembers(data || []));
  }, []);

  const resetForm = () => { setForm({ name: "", description: "", points: 0, action_type: "manual", trigger_key: "" }); setEditing(null); };

  const handleSave = async () => {
    if (!form.name || !form.points) return;
    const payload = { ...form, trigger_key: form.trigger_key || form.name.toLowerCase().replace(/\s+/g, "_") };
    if (editing) {
      await supabase.from("stamp_actions").update(payload).eq("id", editing);
    } else {
      await supabase.from("stamp_actions").insert(payload);
    }
    resetForm();
    await loadActions();
  };

  const handleEdit = (action) => {
    setForm({ name: action.name, description: action.description || "", points: action.points, action_type: action.action_type, trigger_key: action.trigger_key || "" });
    setEditing(action.id);
  };

  const handleDelete = async (id) => {
    await supabase.from("stamp_actions").delete().eq("id", id);
    await loadActions();
  };

  const toggleActive = async (id, current) => {
    await supabase.from("stamp_actions").update({ is_active: !current }).eq("id", id);
    await loadActions();
  };

  const handleAward = async () => {
    if (!awardForm.userId || !awardForm.actionId) return;
    const action = actions.find((a) => a.id === awardForm.actionId);
    if (!action) return;

    await supabase.rpc("award_stamps", {
      target_user_id: awardForm.userId,
      action_trigger_key: action.trigger_key,
    });

    setAwardForm({ userId: "", actionId: "" });
    // Refresh members
    const { data } = await supabase.from("profiles").select("id, display_name, stamp_count").order("display_name");
    setMembers(data || []);
  };

  const Field = ({ label, value, onChange, type = "text", options }) => (
    <div style={{ marginBottom: 10 }}>
      <label style={{ fontFamily: "'DM Mono', monospace", fontSize: 9, color: SLATE, letterSpacing: "0.5px", display: "block", marginBottom: 4 }}>{label}</label>
      {options ? (
        <select value={value} onChange={(e) => onChange(e.target.value)} style={{
          width: "100%", padding: "9px 12px", background: CREAM, border: `1px solid ${DARK_CREAM}`, borderRadius: 3, fontSize: 13, color: INK, outline: "none",
        }}>{options.map((o) => <option key={typeof o === "string" ? o : o.value} value={typeof o === "string" ? o : o.value}>{typeof o === "string" ? o : o.label}</option>)}</select>
      ) : (
        <input type={type} value={value} onChange={(e) => onChange(type === "number" ? parseInt(e.target.value) || 0 : e.target.value)} style={{
          width: "100%", padding: "9px 12px", background: CREAM, border: `1px solid ${DARK_CREAM}`, borderRadius: 3, fontSize: 13, color: INK, outline: "none",
        }} />
      )}
    </div>
  );

  return (
    <div>
      <Heading size={22} style={{ marginBottom: 18 }}>stamp actions</Heading>
      <p style={{ fontSize: 12, color: SLATE, marginBottom: 16, lineHeight: 1.5 }}>
        add, edit or remove reward actions. "auto" actions are triggered automatically (posting, commenting). "manual" actions you award to specific fans (photo with band, attending a show).
      </p>

      {/* Award stamps manually */}
      <div style={{ background: WARM_GOLD + "11", borderRadius: 3, padding: "18px", border: `1px solid ${WARM_GOLD}22`, marginBottom: 20 }}>
        <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 9, color: WARM_GOLD, letterSpacing: "1px", textTransform: "uppercase", marginBottom: 12 }}>award stamps manually</div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0 12px" }}>
          <Field label="member" value={awardForm.userId} onChange={(v) => setAwardForm({ ...awardForm, userId: v })}
            options={[{ value: "", label: "select member..." }, ...members.map((m) => ({ value: m.id, label: `${m.display_name} (${m.stamp_count} ✦)` }))]} />
          <Field label="action" value={awardForm.actionId} onChange={(v) => setAwardForm({ ...awardForm, actionId: v })}
            options={[{ value: "", label: "select action..." }, ...actions.filter((a) => a.action_type === "manual").map((a) => ({ value: a.id, label: `${a.name} (+${a.points})` }))]} />
        </div>
        <button onClick={handleAward} disabled={!awardForm.userId || !awardForm.actionId} style={{
          padding: "8px 20px", background: WARM_GOLD, color: INK, border: "none", borderRadius: 2,
          fontSize: 12, fontWeight: 600, cursor: "pointer", opacity: !awardForm.userId || !awardForm.actionId ? 0.5 : 1,
        }}>award ✦</button>
      </div>

      {/* Add/Edit action */}
      <div style={{ background: OFF_WHITE, borderRadius: 3, padding: "18px", border: "1px solid #E8E2D8", marginBottom: 20 }}>
        <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 9, color: SLATE, letterSpacing: "1px", textTransform: "uppercase", marginBottom: 12 }}>
          {editing ? "edit action" : "add action"}
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0 12px" }}>
          <Field label="name" value={form.name} onChange={(v) => setForm({ ...form, name: v })} />
          <Field label="points" type="number" value={form.points} onChange={(v) => setForm({ ...form, points: v })} />
          <Field label="type" value={form.action_type} onChange={(v) => setForm({ ...form, action_type: v })} options={["auto", "manual"]} />
          <Field label="trigger key" value={form.trigger_key} onChange={(v) => setForm({ ...form, trigger_key: v })} />
        </div>
        <Field label="description" value={form.description} onChange={(v) => setForm({ ...form, description: v })} />
        <div style={{ display: "flex", gap: 8, marginTop: 6 }}>
          <button onClick={handleSave} style={{ padding: "8px 20px", background: INK, color: CREAM, border: "none", borderRadius: 2, fontSize: 12, fontWeight: 600, cursor: "pointer" }}>{editing ? "update" : "add action"}</button>
          {editing && <button onClick={resetForm} style={{ padding: "8px 20px", background: "transparent", color: SLATE, border: `1px solid ${DARK_CREAM}`, borderRadius: 2, fontSize: 12, cursor: "pointer" }}>cancel</button>}
        </div>
      </div>

      {/* Actions list */}
      {actions.map((action) => (
        <div key={action.id} style={{
          background: OFF_WHITE, borderRadius: 3, padding: "12px 16px", marginBottom: 6,
          border: "1px solid #E8E2D8", display: "flex", alignItems: "center", gap: 12,
          opacity: action.is_active ? 1 : 0.4,
        }}>
          <span style={{ fontFamily: "'DM Mono', monospace", fontSize: 14, color: action.action_type === "auto" ? SAGE : WARM_GOLD, width: 20, textAlign: "center" }}>
            {action.action_type === "auto" ? "↗" : "★"}
          </span>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 13, fontWeight: 600, color: INK }}>{action.name}</div>
            <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 10, color: SLATE }}>{action.action_type} · {action.trigger_key}</div>
          </div>
          <span style={{ fontFamily: "'DM Mono', monospace", fontSize: 12, fontWeight: 600, color: RUST }}>+{action.points}</span>
          <button onClick={() => toggleActive(action.id, action.is_active)} style={{
            background: "none", border: "none", cursor: "pointer", fontSize: 10, color: action.is_active ? SAGE : RUST, fontFamily: "'DM Mono', monospace",
          }}>{action.is_active ? "on" : "off"}</button>
          <button onClick={() => handleEdit(action)} style={{ background: "none", border: "none", cursor: "pointer", fontSize: 12, color: SLATE, fontFamily: "'DM Mono', monospace" }}>✎</button>
          <button onClick={() => handleDelete(action.id)} style={{ background: "none", border: "none", cursor: "pointer", fontSize: 14, color: RUST + "66", fontFamily: "'DM Mono', monospace" }}>×</button>
        </div>
      ))}
    </div>
  );
}

// ============ REWARDS MANAGER ============
function RewardsManager({ supabase }) {
  const [claims, setClaims] = useState([]);
  const [filter, setFilter] = useState("all");
  const [loading, setLoading] = useState(true);
  const [tiers, setTiers] = useState([]);
  const [editingTier, setEditingTier] = useState(null);
  const [tierForm, setTierForm] = useState({ name: "", stamps: 0, icon: "✦", reward_type: "", reward_desc: "" });
  const [tierSaved, setTierSaved] = useState(false);

  const loadTiers = async () => {
    const { data } = await supabase.from("reward_tiers").select("*").order("sort_order");
    if (data) setTiers(data);
  };

  const saveTier = async (id) => {
    const updates = {
      name: tierForm.name,
      stamps: parseInt(tierForm.stamps) || 0,
      icon: tierForm.icon || "✦",
      reward_type: tierForm.reward_type || null,
      reward_desc: tierForm.reward_desc || "",
    };
    const { error } = await supabase.from("reward_tiers").update(updates).eq("id", id);
    if (error) { alert("Failed: " + error.message); return; }
    setEditingTier(null);
    setTierSaved(true);
    setTimeout(() => setTierSaved(false), 2000);
    await loadTiers();
  };

  const loadClaims = async () => {
    setLoading(true);
    // Fetch claims
    const { data: claimsData } = await supabase
      .from("reward_claims")
      .select("*")
      .order("claimed_at", { ascending: false });

    if (!claimsData) { setClaims([]); setLoading(false); return; }

    // Fetch profiles for claimants
    const userIds = [...new Set(claimsData.map((c) => c.user_id))];
    let profileMap = {};
    if (userIds.length > 0) {
      const { data: profiles } = await supabase
        .from("profiles")
        .select("id, display_name, stamp_count")
        .in("id", userIds);
      if (profiles) profiles.forEach((p) => { profileMap[p.id] = p; });
    }

    setClaims(claimsData.map((c) => ({ ...c, profile: profileMap[c.user_id] || null })));
    setLoading(false);
  };

  useEffect(() => { loadClaims(); loadTiers(); }, []);

  const updateStatus = async (id, status) => {
    const { error } = await supabase.from("reward_claims").update({ status, updated_at: new Date().toISOString() }).eq("id", id);
    if (error) { alert("Failed: " + error.message); return; }
    await loadClaims();
  };

  const REWARD_LABELS = {
    postcard: "digital postcard",
    tshirt: "t-shirt",
    vinyl: "signed vinyl / zine",
    zoom: "zoom hangout",
    meetgreet: "meet and greet",
  };

  const STATUS_COLORS = {
    pending: WARM_GOLD,
    approved: "#4A90D9",
    shipped: "#6B5B8D",
    completed: SAGE,
    denied: RUST,
  };

  const filtered = filter === "all" ? claims : claims.filter((c) => c.status === filter);

  return (
    <div>
      {/* Tier editor */}
      <Heading size={22} style={{ marginBottom: 6 }}>reward tiers</Heading>
      <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 10, color: SLATE, marginBottom: 12 }}>
        edit what fans unlock at each level
      </div>
      <div style={{ background: OFF_WHITE, borderRadius: 3, padding: "14px", border: "1px solid #E8E2D8", marginBottom: 24 }}>
        {tiers.map((t) => (
          <div key={t.id} style={{ padding: "10px 0", borderBottom: `1px solid ${DARK_CREAM}` }}>
            {editingTier === t.id ? (
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                <div style={{ display: "flex", gap: 8 }}>
                  <input value={tierForm.icon} onChange={(e) => setTierForm({ ...tierForm, icon: e.target.value })} placeholder="icon" style={{ width: 40, padding: "6px", background: CREAM, border: `1px solid ${DARK_CREAM}`, borderRadius: 3, fontSize: 16, textAlign: "center", outline: "none" }} />
                  <input value={tierForm.name} onChange={(e) => setTierForm({ ...tierForm, name: e.target.value })} placeholder="tier name" style={{ flex: 1, padding: "6px 10px", background: CREAM, border: `1px solid ${DARK_CREAM}`, borderRadius: 3, fontSize: 13, color: INK, outline: "none" }} />
                  <input type="number" value={tierForm.stamps} onChange={(e) => setTierForm({ ...tierForm, stamps: e.target.value })} placeholder="stamps" style={{ width: 70, padding: "6px 10px", background: CREAM, border: `1px solid ${DARK_CREAM}`, borderRadius: 3, fontSize: 13, color: INK, outline: "none" }} />
                </div>
                <input value={tierForm.reward_type || ""} onChange={(e) => setTierForm({ ...tierForm, reward_type: e.target.value })} placeholder="reward type (e.g. tshirt, vinyl, zoom)" style={{ padding: "6px 10px", background: CREAM, border: `1px solid ${DARK_CREAM}`, borderRadius: 3, fontSize: 12, color: INK, outline: "none" }} />
                <input value={tierForm.reward_desc} onChange={(e) => setTierForm({ ...tierForm, reward_desc: e.target.value })} placeholder="reward description for fans" style={{ padding: "6px 10px", background: CREAM, border: `1px solid ${DARK_CREAM}`, borderRadius: 3, fontSize: 12, color: INK, outline: "none" }} />
                <div style={{ display: "flex", gap: 6 }}>
                  <button onClick={() => saveTier(t.id)} style={{ padding: "6px 14px", background: INK, color: CREAM, border: "none", borderRadius: 3, fontSize: 11, fontWeight: 600, cursor: "pointer" }}>save</button>
                  <button onClick={() => setEditingTier(null)} style={{ padding: "6px 14px", background: "transparent", color: SLATE, border: `1px solid ${DARK_CREAM}`, borderRadius: 3, fontSize: 11, cursor: "pointer" }}>cancel</button>
                </div>
              </div>
            ) : (
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <span style={{ fontSize: 18 }}>{t.icon}</span>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 13, fontWeight: 600, color: INK }}>{t.name} <span style={{ fontFamily: "'DM Mono', monospace", fontSize: 10, color: SLATE, fontWeight: 400 }}>{t.stamps} stamps</span></div>
                  <div style={{ fontSize: 11, color: SLATE, marginTop: 2 }}>{t.reward_desc || "no reward"}</div>
                </div>
                <button onClick={() => { setEditingTier(t.id); setTierForm({ name: t.name, stamps: t.stamps, icon: t.icon, reward_type: t.reward_type || "", reward_desc: t.reward_desc || "" }); }} style={{ background: "none", border: "none", cursor: "pointer", fontFamily: "'DM Mono', monospace", fontSize: 11, color: SLATE + "77" }}>✎</button>
              </div>
            )}
          </div>
        ))}
        {tierSaved && <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 10, color: SAGE, marginTop: 8 }}>saved ✦</div>}
      </div>

      {/* Claims section */}
      <Heading size={22} style={{ marginBottom: 6 }}>reward claims</Heading>
      <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 10, color: SLATE, marginBottom: 16 }}>
        {claims.length} total claims · {claims.filter((c) => c.status === "pending").length} pending
      </div>

      {/* Filter tabs */}
      <div style={{ display: "flex", gap: 6, marginBottom: 16, flexWrap: "wrap" }}>
        {["all", "pending", "approved", "shipped", "completed", "denied"].map((f) => (
          <button key={f} onClick={() => setFilter(f)} style={{
            padding: "6px 12px", fontSize: 10, fontWeight: filter === f ? 600 : 400,
            background: filter === f ? INK : "transparent", color: filter === f ? CREAM : SLATE,
            border: `1px solid ${filter === f ? INK : DARK_CREAM}`, borderRadius: 2, cursor: "pointer",
            fontFamily: "'DM Sans', sans-serif",
          }}>{f}{f !== "all" && ` (${claims.filter((c) => c.status === f).length})`}</button>
        ))}
      </div>

      {loading ? (
        <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 12, color: SLATE, padding: 20, textAlign: "center" }}>loading...</div>
      ) : filtered.length === 0 ? (
        <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 12, color: SLATE, padding: 20, textAlign: "center" }}>
          {filter === "all" ? "no reward claims yet" : `no ${filter} claims`}
        </div>
      ) : (
        filtered.map((claim) => (
          <div key={claim.id} style={{
            background: OFF_WHITE, borderRadius: 3, padding: "16px 18px", marginBottom: 8,
            border: `1px solid ${claim.status === "pending" ? WARM_GOLD + "44" : "#E8E2D8"}`,
          }}>
            <div style={{ display: "flex", alignItems: "flex-start", gap: 12, marginBottom: 10 }}>
              <div style={{
                width: 34, height: 34, borderRadius: 3, background: DARK_CREAM,
                display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: 13, fontFamily: "'DM Mono', monospace", color: SLATE,
              }}>{claim.profile?.display_name?.charAt(0)?.toLowerCase() || "?"}</div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 14, fontWeight: 600, color: INK }}>{claim.profile?.display_name || "unknown"}</div>
                <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 10, color: SLATE, marginTop: 2 }}>
                  {REWARD_LABELS[claim.reward_type] || claim.reward_type} · {claim.level_key.replace("_", " ")}
                  <span style={{ color: claim.profile?.stamp_count ? WARM_GOLD : SLATE }}> · {claim.profile?.stamp_count || 0} ✦</span>
                </div>
                <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 9, color: SLATE + "77", marginTop: 2 }}>
                  claimed {new Date(claim.claimed_at).toLocaleDateString("en-AU", { day: "numeric", month: "short", year: "numeric" })}
                </div>
              </div>
              <span style={{
                fontFamily: "'DM Mono', monospace", fontSize: 9, fontWeight: 600,
                color: STATUS_COLORS[claim.status] || SLATE, letterSpacing: "0.5px",
                textTransform: "uppercase",
              }}>{claim.status}</span>
            </div>

            {/* Shipping details */}
            {claim.shipping_name && (
              <div style={{
                background: CREAM, borderRadius: 3, padding: "10px 14px", marginBottom: 10,
                fontFamily: "'DM Mono', monospace", fontSize: 10, color: SLATE, lineHeight: 1.6,
              }}>
                <div style={{ fontWeight: 600, color: INK, marginBottom: 2 }}>shipping to:</div>
                {claim.shipping_name}<br />
                {claim.shipping_address}<br />
                {claim.shipping_city}{claim.shipping_postcode ? ` ${claim.shipping_postcode}` : ""}<br />
                {claim.shipping_country}
              </div>
            )}

            {/* Status actions */}
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
              {claim.status === "pending" && (
                <>
                  <button onClick={() => updateStatus(claim.id, "approved")} style={{
                    padding: "5px 12px", background: SAGE, color: CREAM, border: "none",
                    borderRadius: 2, fontSize: 10, fontWeight: 600, cursor: "pointer",
                  }}>approve</button>
                  <button onClick={() => updateStatus(claim.id, "denied")} style={{
                    padding: "5px 12px", background: "transparent", color: RUST, border: `1px solid ${RUST}44`,
                    borderRadius: 2, fontSize: 10, cursor: "pointer",
                  }}>deny</button>
                </>
              )}
              {claim.status === "approved" && claim.shipping_name && (
                <button onClick={() => updateStatus(claim.id, "shipped")} style={{
                  padding: "5px 12px", background: "#6B5B8D", color: CREAM, border: "none",
                  borderRadius: 2, fontSize: 10, fontWeight: 600, cursor: "pointer",
                }}>mark shipped</button>
              )}
              {(claim.status === "approved" || claim.status === "shipped") && (
                <button onClick={() => updateStatus(claim.id, "completed")} style={{
                  padding: "5px 12px", background: INK, color: CREAM, border: "none",
                  borderRadius: 2, fontSize: 10, fontWeight: 600, cursor: "pointer",
                }}>mark completed</button>
              )}
            </div>
          </div>
        ))
      )}
    </div>
  );
}

// ============ MEMBERS MANAGER ============
function MembersManager({ supabase }) {
  const [members, setMembers] = useState([]);
  const [editingName, setEditingName] = useState(null);
  const [newName, setNewName] = useState("");

  const loadMembers = async () => {
    const { data: profiles } = await supabase.from("profiles").select("*").order("joined_at", { ascending: false });
    if (!profiles) { setMembers([]); return; }

    // Fetch emails via admin function
    let emailMap = {};
    const { data: emails } = await supabase.rpc("admin_get_user_emails");
    if (emails) {
      emails.forEach((e) => { emailMap[e.user_id] = e.email; });
    }

    setMembers(profiles.map((p) => ({ ...p, email: emailMap[p.id] || null })));
  };

  useEffect(() => { loadMembers(); }, []);

  const updateRole = async (id, role) => {
    const { error } = await supabase.rpc("admin_update_role", { target_id: id, new_role: role });
    if (error) { alert("Failed: " + error.message); return; }
    await loadMembers();
  };

  const updateBandMember = async (id, bandMember) => {
    const { error } = await supabase.rpc("admin_update_band_member", { target_id: id, member: bandMember || null });
    if (error) { alert("Failed: " + error.message); return; }
    await loadMembers();
  };

  const updateDisplayName = async (id) => {
    if (!newName.trim()) return;
    const { error } = await supabase.rpc("admin_update_display_name", { target_id: id, new_name: newName.trim() });
    if (error) { alert("Failed: " + error.message); return; }
    setEditingName(null);
    setNewName("");
    await loadMembers();
  };

  const sendPasswordReset = async (email) => {
    if (!email) { alert("No email found for this user"); return; }
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/login`,
    });
    if (error) { alert("Failed: " + error.message); return; }
    alert(`Password reset email sent to ${email}`);
  };

  const deleteUser = async (id, name) => {
    if (!confirm(`are you sure you want to delete ${name}? this will remove their profile, posts, comments, and all data. this cannot be undone.`)) return;
    if (!confirm(`final check - permanently delete ${name}?`)) return;
    const { error } = await supabase.rpc("admin_delete_user", { target_id: id });
    if (error) { alert("Failed: " + error.message); return; }
    await loadMembers();
  };

  return (
    <div>
      <Heading size={22} style={{ marginBottom: 18 }}>members</Heading>
      <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 10, color: SLATE, marginBottom: 16 }}>
        {members.length} total members
      </div>

      {members.map((m) => (
        <div key={m.id} style={{
          background: OFF_WHITE, borderRadius: 3, padding: "16px 18px", marginBottom: 8,
          border: `1px solid ${m.role !== "fan" ? RUST + "33" : "#E8E2D8"}`,
        }}>
          <div style={{ display: "flex", alignItems: "flex-start", gap: 12, marginBottom: 10 }}>
            <div style={{
              width: 38, height: 38, borderRadius: 3, background: m.role !== "fan" ? INK : DARK_CREAM,
              color: m.role !== "fan" ? CREAM : SLATE, display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: 14, fontFamily: "'DM Mono', monospace", flexShrink: 0,
            }}>{m.display_name?.charAt(0)?.toLowerCase()}</div>
            <div style={{ flex: 1, minWidth: 0 }}>
              {editingName === m.id ? (
                <div style={{ display: "flex", gap: 6, alignItems: "center", marginBottom: 4 }}>
                  <input type="text" value={newName} onChange={(e) => setNewName(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && updateDisplayName(m.id)}
                    style={{ flex: 1, padding: "4px 8px", border: `1px solid ${DARK_CREAM}`, borderRadius: 2, fontSize: 13, color: INK, outline: "none", background: CREAM }}
                    autoFocus
                  />
                  <button onClick={() => updateDisplayName(m.id)} style={{ background: INK, color: CREAM, border: "none", borderRadius: 2, padding: "4px 10px", fontSize: 10, cursor: "pointer" }}>save</button>
                  <button onClick={() => setEditingName(null)} style={{ background: "none", color: SLATE, border: `1px solid ${DARK_CREAM}`, borderRadius: 2, padding: "4px 8px", fontSize: 10, cursor: "pointer" }}>×</button>
                </div>
              ) : (
                <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 2 }}>
                  <span style={{ fontSize: 14, fontWeight: 600, color: INK }}>{m.display_name}</span>
                  <button onClick={() => { setEditingName(m.id); setNewName(m.display_name || ""); }} style={{
                    background: "none", border: "none", cursor: "pointer", fontSize: 11, color: SLATE + "77", fontFamily: "'DM Mono', monospace",
                  }}>✎</button>
                </div>
              )}
              <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 10, color: SLATE }}>
                joined {new Date(m.joined_at).toLocaleDateString("en-AU", { day: "numeric", month: "short", year: "numeric" })} · {m.stamp_count || 0} ✦
                {m.referral_count > 0 && ` · ${m.referral_count} referrals`}
              </div>
              {m.email && (
                <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 10, color: SLATE + "88", marginTop: 2 }}>
                  {m.email}
                </div>
              )}
              {m.signup_city && (
                <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 10, color: SLATE + "66", marginTop: 1 }}>
                  📍 {m.signup_city}{m.signup_country ? `, ${m.signup_country}` : ""}
                </div>
              )}
            </div>
          </div>

          {/* Controls row */}
          <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
            <select value={m.role} onChange={(e) => updateRole(m.id, e.target.value)} style={{
              padding: "5px 10px", background: CREAM, border: `1px solid ${DARK_CREAM}`,
              borderRadius: 2, fontSize: 11, color: INK, outline: "none",
            }}>
              <option value="fan">fan</option>
              <option value="band">band</option>
              <option value="admin">admin</option>
            </select>
            {m.role === "band" && (
              <select value={m.band_member || ""} onChange={(e) => updateBandMember(m.id, e.target.value)} style={{
                padding: "5px 10px", background: CREAM, border: `1px solid ${DARK_CREAM}`,
                borderRadius: 2, fontSize: 11, color: INK, outline: "none",
              }}>
                <option value="">assign member...</option>
                <option value="sofia">Sofia</option>
                <option value="scarlett">Scarlett</option>
                <option value="rubina">Rubina</option>
              </select>
            )}
            <div style={{ flex: 1 }} />
            <button onClick={() => deleteUser(m.id, m.display_name)} style={{
              background: "none", border: "none", cursor: "pointer",
              fontFamily: "'DM Mono', monospace", fontSize: 9, color: SLATE + "44",
              padding: "4px 8px",
            }}
              onMouseEnter={(e) => e.currentTarget.style.color = "#cc3333"}
              onMouseLeave={(e) => e.currentTarget.style.color = SLATE + "44"}
            >delete</button>
          </div>
        </div>
      ))}
    </div>
  );
}

// ============ MAIN DASHBOARD ============
export default function Dashboard() {
  const { user, profile, loading, supabase } = useAuth();
  const router = useRouter();
  const [activeTab, setActiveTab] = useState("overview");

  useEffect(() => {
    if (!loading && (!user || !profile || !["band", "admin"].includes(profile?.role))) {
      router.push("/");
    }
  }, [user, profile, loading]);

  if (loading || !profile || !["band", "admin"].includes(profile?.role)) {
    return (
      <div style={{ minHeight: "100vh", background: CREAM, display: "flex", alignItems: "center", justifyContent: "center" }}>
        <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 12, color: SLATE }}>loading...</div>
      </div>
    );
  }

  return (
    <div style={{ minHeight: "100vh", background: CREAM, fontFamily: "'DM Sans', sans-serif" }}>
      {/* Header */}
      <div style={{ background: INK, padding: "16px 20px", borderBottom: "1px solid #333" }}>
        <div style={{ maxWidth: 800, margin: "0 auto", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ display: "flex", alignItems: "baseline", gap: 8 }}>
            <Heading size={20} color={CREAM}>stamps land</Heading>
            <span style={{ fontFamily: "'DM Mono', monospace", fontSize: 8, color: WARM_GOLD, letterSpacing: "1.5px", textTransform: "uppercase" }}>dashboard</span>
          </div>
          <button onClick={() => router.push("/")} style={{
            background: "none", border: `1px solid ${CREAM}33`, color: CREAM + "88",
            padding: "6px 14px", borderRadius: 2, fontSize: 11, cursor: "pointer", fontFamily: "'DM Sans', sans-serif",
          }}>← back to app</button>
        </div>
      </div>

      <div style={{ maxWidth: 800, margin: "0 auto", padding: "0 20px 60px" }}>
        {/* Tabs */}
        <div style={{ display: "flex", gap: 4, padding: "16px 0", overflowX: "auto" }}>
          {TABS.map((tab) => (
            <button key={tab.id} onClick={() => setActiveTab(tab.id)} style={{
              padding: "8px 16px", background: activeTab === tab.id ? INK : "transparent",
              color: activeTab === tab.id ? CREAM : SLATE, border: `1px solid ${activeTab === tab.id ? INK : DARK_CREAM}`,
              borderRadius: 2, fontSize: 11, fontWeight: activeTab === tab.id ? 600 : 400,
              cursor: "pointer", fontFamily: "'DM Sans', sans-serif", whiteSpace: "nowrap",
              display: "flex", alignItems: "center", gap: 6,
            }}>
              <span style={{ fontFamily: "'DM Mono', monospace" }}>{tab.icon}</span>
              {tab.label}
            </button>
          ))}
        </div>

        {/* Content */}
        <div style={{ animation: "fadeIn 0.3s ease-out" }}>
          {activeTab === "overview" && <Overview supabase={supabase} />}
          {activeTab === "posts" && <PostsManager supabase={supabase} profile={profile} />}
          {activeTab === "shows" && <ShowsManager supabase={supabase} />}
          {activeTab === "links" && <LinksManager supabase={supabase} />}
          {activeTab === "stamps" && <StampsManager supabase={supabase} />}
          {activeTab === "rewards" && <RewardsManager supabase={supabase} />}
          {activeTab === "members" && <MembersManager supabase={supabase} />}
        </div>
      </div>

      <style>{`
        @keyframes fadeIn { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: translateY(0); } }
      `}</style>
    </div>
  );
}
