"use client";
import { useState, useEffect, useCallback } from "react";
import { useAuth } from "@/lib/auth-context";

const INK = "#1A1018";
const CREAM = "#F5EFE6";
const RUBY = "#8B1A2B";
const BLUSH = "#D4A5A0";
const HOT_PINK = "#E0527A";
const WARM_GOLD = "#C9922A";
const SLATE = "#6A5A62";
const SURFACE = "#FAF5F0";
const SURFACE_LIGHT = "#F5EFE6";
const BORDER = "#E8DDD4";

// Legacy aliases
const RUST = RUBY;
const OFF_WHITE = SURFACE;
const DARK_CREAM = BORDER;
const DUSTY_ROSE = BLUSH;
const SAGE = "#7D8B6A";

const MEMBER_COLORS = {
  sofia: { primary: HOT_PINK, bg: "#FDF0F3" },
  scarlett: { primary: "#9B7ABD", bg: "#F5F0F8" },
  rubina: { primary: "#7D8B6A", bg: "#F0F3EC" },
};

const MEMBERS = {
  sofia: { name: "Sofia", role: "The Planner", emoji: "🌙", tagline: "processing feelings through songs since '15", color: MEMBER_COLORS.sofia },
  scarlett: { name: "Scarlett", role: "The Extrovert", emoji: "⚡", tagline: "joni mitchell made me do it", color: MEMBER_COLORS.scarlett },
  rubina: { name: "Rubina", role: "The Daydreamer", emoji: "🌿", tagline: "pluto's in aquarius & i'm feeling it", color: MEMBER_COLORS.rubina },
};

// Default tiers (used until DB loads)
const DEFAULT_STAMP_LEVELS = [
  { name: "First Press", key: "first_press", stamps: 0, icon: "◐", reward: null, rewardDesc: "welcome to stamps land" },
  { name: "B-Side", key: "b_side", stamps: 50, icon: "◑", reward: "postcard", rewardDesc: "handwritten digital postcard from sofia, scarlett or rubina" },
  { name: "Deep Cut", key: "deep_cut", stamps: 150, icon: "●", reward: "tshirt", rewardDesc: "exclusive stamps land t-shirt shipped to your door" },
  { name: "Inner Sleeve", key: "inner_sleeve", stamps: 300, icon: "◉", reward: "vinyl", rewardDesc: "signed vinyl or limited edition stamps land zine" },
  { name: "Stamped", key: "stamped", stamps: 500, icon: "✦", reward: "zoom", rewardDesc: "monthly group zoom hangout with the band" },
  { name: "Inner Circle", key: "inner_circle", stamps: 1000, icon: "♛", reward: "meetgreet", rewardDesc: "meet and greet at a show + name in the liner notes" },
];

const Heading = ({ children, size = 24, color = CREAM, style = {} }) => (
  <div style={{
    fontFamily: "'DM Sans', sans-serif",
    fontSize: size, color, fontWeight: 700, lineHeight: 1.1, textTransform: "lowercase", ...style,
  }}>{children}</div>
);

function timeAgo(dateStr) {
  const seconds = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000);
  if (seconds < 60) return "just now";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d ago`;
  return `${Math.floor(days / 30)}mo ago`;
}

// ============ COMMENTS PANEL ============
function CommentsPanel({ postId, postAuthorId, supabase, currentUserId, currentProfile, onClose, onCommentAdded, onViewProfile }) {
  const [comments, setComments] = useState([]);
  const [newComment, setNewComment] = useState("");
  const [posting, setPosting] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [commentImage, setCommentImage] = useState(null);
  const [commentImagePreview, setCommentImagePreview] = useState(null);
  const [editingId, setEditingId] = useState(null);
  const [editText, setEditText] = useState("");
  const [replyTo, setReplyTo] = useState(null);

  useEffect(() => { loadComments(); }, [postId]);

  const loadComments = async () => {
    setLoading(true);
    try {
      const { data, error: fetchError } = await supabase
        .from("comments").select("*").eq("post_id", postId).order("created_at", { ascending: true });
      if (fetchError) { setLoading(false); return; }
      const commentsData = data || [];
      const authorIds = [...new Set(commentsData.map((c) => c.author_id))];
      let profileMap = {};
      if (authorIds.length > 0) {
        const { data: profiles } = await supabase.from("profiles")
          .select("id, display_name, role, band_member, avatar_url").in("id", authorIds);
        if (profiles) profiles.forEach((p) => { profileMap[p.id] = p; });
      }
      setComments(commentsData.map((c) => ({ ...c, profiles: profileMap[c.author_id] || null })));
    } catch (e) { console.error("Comments error:", e); }
    setLoading(false);
  };

  const handleImageSelect = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) { alert("image must be under 5MB"); return; }
    setCommentImage(file);
    const reader = new FileReader();
    reader.onload = (ev) => setCommentImagePreview(ev.target.result);
    reader.readAsDataURL(file);
  };
  const clearImage = () => { setCommentImage(null); setCommentImagePreview(null); };

  const handleComment = async () => {
    if ((!newComment.trim() && !commentImage) || posting || !currentUserId) return;
    setPosting(true);
    setError("");

    let imageUrl = null;
    if (commentImage) {
      const ext = commentImage.name.split(".").pop();
      const path = `comments/${currentUserId}-${Date.now()}.${ext}`;
      const { error: upErr } = await supabase.storage.from("media").upload(path, commentImage, { upsert: true });
      if (!upErr) {
        const { data: urlData } = supabase.storage.from("media").getPublicUrl(path);
        imageUrl = urlData?.publicUrl || null;
      }
    }

    const commentText = newComment.trim();
    const insertData = { post_id: postId, author_id: currentUserId, content: commentText };
    if (imageUrl) insertData.image_url = imageUrl;
    if (replyTo) insertData.parent_id = replyTo.id;

    const optimisticComment = {
      id: "temp-" + Date.now(), post_id: postId, author_id: currentUserId,
      content: commentText, image_url: imageUrl || commentImagePreview,
      parent_id: replyTo?.id || null, created_at: new Date().toISOString(),
      profiles: currentProfile ? { display_name: currentProfile.display_name, role: currentProfile.role, band_member: currentProfile.band_member } : null,
    };
    setComments((prev) => [...prev, optimisticComment]);
    setNewComment(""); clearImage(); setReplyTo(null);

    const { error: insertError } = await supabase.from("comments").insert(insertData);
    if (insertError) {
      setError(insertError.message);
      setComments((prev) => prev.filter((c) => c.id !== optimisticComment.id));
      setNewComment(commentText);
      setPosting(false);
      return;
    }
    loadComments();
    supabase.rpc("award_stamps", { target_user_id: currentUserId, action_trigger_key: "comment_created" }).catch(() => {});
    if (postAuthorId && postAuthorId !== currentUserId) {
      supabase.rpc("create_notification", { target_user_id: postAuthorId, notif_type: "comment", notif_title: `${currentProfile?.display_name || "someone"} replied to your post` }).catch(() => {});
    }
    if (replyTo && replyTo.authorId && replyTo.authorId !== currentUserId && replyTo.authorId !== postAuthorId) {
      supabase.rpc("create_notification", { target_user_id: replyTo.authorId, notif_type: "comment", notif_title: `${currentProfile?.display_name || "someone"} replied to your comment` }).catch(() => {});
    }
    if (onCommentAdded) onCommentAdded();
    setPosting(false);
  };

  const deleteComment = async (commentId) => {
    if (!confirm("delete this comment?")) return;
    await supabase.from("comments").delete().eq("parent_id", commentId);
    await supabase.from("comments").delete().eq("id", commentId);
    setComments((prev) => prev.filter((c) => c.id !== commentId && c.parent_id !== commentId));
  };

  const saveEdit = async (commentId) => {
    if (!editText.trim()) return;
    await supabase.from("comments").update({ content: editText.trim() }).eq("id", commentId);
    setComments((prev) => prev.map((c) => c.id === commentId ? { ...c, content: editText.trim() } : c));
    setEditingId(null); setEditText("");
  };

  const getDisplayName = (prof) => {
    if (!prof) return "fan";
    return (prof.role === "band" && prof.band_member) ? MEMBERS[prof.band_member]?.name?.toLowerCase() : prof.display_name || "fan";
  };

  const topLevel = comments.filter((c) => !c.parent_id);
  const getReplies = (parentId) => comments.filter((c) => c.parent_id === parentId);

  const renderComment = (c, depth = 0) => {
    const prof = c.profiles || {};
    const isBand = prof.role === "band";
    const displayName = getDisplayName(prof);
    const canDelete = c.author_id === currentUserId || currentProfile?.role === "admin" || currentProfile?.role === "band";
    const canEdit = c.author_id === currentUserId;
    const replies = getReplies(c.id);
    const indent = Math.min(depth, 2) * 16;

    return (
      <div key={c.id}>
        <div style={{ paddingLeft: indent, padding: "8px 0 8px " + indent + "px", borderBottom: depth === 0 ? `1px solid ${DARK_CREAM}` : "none" }}>
          {depth > 0 && <div style={{ borderLeft: `2px solid ${BLUSH}44`, paddingLeft: 10 }}>
            {commentBody(c, prof, isBand, displayName, canDelete, canEdit)}
          </div>}
          {depth === 0 && commentBody(c, prof, isBand, displayName, canDelete, canEdit)}
        </div>
        {replies.map((r) => renderComment(r, depth + 1))}
      </div>
    );
  };

  const commentBody = (c, prof, isBand, displayName, canDelete, canEdit) => (
    <>
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 3 }}>
        <span onClick={() => onViewProfile && onViewProfile(c.author_id)} style={{ fontSize: 12, fontWeight: 600, color: INK, cursor: "pointer" }}>{displayName?.toLowerCase()}</span>
        {isBand && <span style={{ fontFamily: "'DM Mono', monospace", fontSize: 8, color: RUST, border: `1px solid ${RUST}44`, padding: "0px 5px", borderRadius: 2 }}>band</span>}
        <span style={{ fontFamily: "'DM Mono', monospace", fontSize: 9, color: SLATE + "88", marginLeft: "auto" }}>{timeAgo(c.created_at)}</span>
        <button onClick={() => setReplyTo({ id: c.id, name: displayName, authorId: c.author_id })} style={{
          background: "none", border: "none", cursor: "pointer", color: SLATE + "55",
          fontSize: 10, fontFamily: "'DM Mono', monospace", padding: "0 2px",
        }}>reply</button>
        {canEdit && editingId !== c.id && (
          <button onClick={() => { setEditingId(c.id); setEditText(c.content || ""); }} style={{
            background: "none", border: "none", cursor: "pointer", color: SLATE + "55",
            fontSize: 11, fontFamily: "'DM Mono', monospace", padding: "0 2px",
          }}>&#x270E;</button>
        )}
        {canDelete && (
          <button onClick={() => deleteComment(c.id)} style={{
            background: "none", border: "none", cursor: "pointer", color: RUST + "55",
            fontSize: 13, fontFamily: "'DM Mono', monospace", padding: "0 2px",
          }}>&times;</button>
        )}
      </div>
      {editingId === c.id ? (
        <div style={{ display: "flex", gap: 6, alignItems: "center", marginTop: 4 }}>
          <input type="text" value={editText} onChange={(e) => setEditText(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && saveEdit(c.id)}
            style={{ flex: 1, padding: "6px 10px", border: `1px solid ${DARK_CREAM}`, borderRadius: 3, fontSize: 12, color: INK, outline: "none", background: CREAM }}
            autoFocus />
          <button onClick={() => saveEdit(c.id)} style={{ background: INK, color: CREAM, border: "none", borderRadius: 3, padding: "6px 10px", fontSize: 10, cursor: "pointer" }}>save</button>
          <button onClick={() => setEditingId(null)} style={{ background: "none", color: SLATE, border: `1px solid ${DARK_CREAM}`, borderRadius: 3, padding: "6px 8px", fontSize: 10, cursor: "pointer" }}>&times;</button>
        </div>
      ) : (
        <>
          {c.content && <p style={{ fontSize: 12.5, color: INK + "CC", lineHeight: 1.5, margin: 0 }}>{c.content}</p>}
          {c.image_url && <img src={c.image_url} alt="" style={{ maxWidth: "100%", maxHeight: 200, borderRadius: 8, marginTop: 6, display: "block" }} />}
        </>
      )}
    </>
  );

  return (
    <div style={{
      background: SURFACE_LIGHT, borderRadius: "0 0 10px 10px", padding: "16px", marginTop: -4, marginBottom: 10,
      border: `1px solid ${BORDER}`, borderTop: "none",
    }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
        <span style={{ fontFamily: "'DM Mono', monospace", fontSize: 10, color: SLATE, letterSpacing: "0.5px" }}>
          {comments.length} {comments.length === 1 ? "comment" : "comments"}
        </span>
        <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", fontSize: 14, color: SLATE, fontFamily: "'DM Mono', monospace" }}>&times;</button>
      </div>

      {loading ? (
        <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 11, color: SLATE, padding: "8px 0" }}>loading...</div>
      ) : topLevel.map((c) => renderComment(c, 0))}

      {error && <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 11, color: RUST, padding: "8px 0" }}>{error}</div>}

      {replyTo && (
        <div style={{ marginTop: 8, display: "flex", alignItems: "center", gap: 8, padding: "6px 10px", background: BLUSH + "22", borderRadius: 6, fontSize: 11, color: SLATE }}>
          <span>replying to <strong style={{ color: INK }}>{replyTo.name?.toLowerCase()}</strong></span>
          <button onClick={() => setReplyTo(null)} style={{ background: "none", border: "none", cursor: "pointer", color: SLATE, fontSize: 13, fontFamily: "'DM Mono', monospace", marginLeft: "auto" }}>&times;</button>
        </div>
      )}

      {commentImagePreview && (
        <div style={{ marginTop: 8, position: "relative", display: "inline-block" }}>
          <img src={commentImagePreview} alt="preview" style={{ maxWidth: "100%", maxHeight: 120, borderRadius: 6, border: `1px solid ${DARK_CREAM}` }} />
          <button onClick={clearImage} style={{
            position: "absolute", top: 4, right: 4, width: 20, height: 20, borderRadius: "50%",
            background: INK + "CC", color: CREAM, border: "none", cursor: "pointer", fontSize: 11,
            display: "flex", alignItems: "center", justifyContent: "center",
          }}>&times;</button>
        </div>
      )}

      <div style={{ display: "flex", gap: 8, marginTop: 10, alignItems: "center" }}>
        <input
          type="text" value={newComment} onChange={(e) => setNewComment(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleComment()}
          placeholder={replyTo ? `reply to ${replyTo.name?.toLowerCase()}...` : "reply..."}
          style={{
            flex: 1, padding: "9px 12px", background: OFF_WHITE, border: `1px solid ${DARK_CREAM}`,
            borderRadius: 8, fontSize: 12, color: INK, outline: "none", fontFamily: "'DM Sans', sans-serif",
          }}
        />
        <label style={{ cursor: "pointer", padding: "4px 6px", color: SLATE + "88", fontSize: 13, fontFamily: "'DM Mono', monospace" }}
          onMouseEnter={(e) => e.currentTarget.style.color = RUST}
          onMouseLeave={(e) => e.currentTarget.style.color = SLATE + "88"}
        >
          <input type="file" accept="image/*" onChange={handleImageSelect} style={{ display: "none" }} />
          +
        </label>
        <button onClick={handleComment} disabled={(!newComment.trim() && !commentImage) || posting} style={{
          padding: "9px 14px", background: (newComment.trim() || commentImage) ? RUBY : DARK_CREAM,
          color: (newComment.trim() || commentImage) ? CREAM : SLATE + "66", border: "none", borderRadius: 8,
          fontSize: 11, fontWeight: 600, cursor: (newComment.trim() || commentImage) ? "pointer" : "default",
        }}>{posting ? "..." : "reply"}</button>
      </div>
    </div>
  );
}


// ============ EDIT PROFILE MODAL ============
function EditProfileModal({ profile, supabase, onSave, onClose }) {
  const [displayName, setDisplayName] = useState(profile?.display_name || "");
  const [bio, setBio] = useState(profile?.bio || "");
  const [city, setCity] = useState(profile?.city || "");
  const [saving, setSaving] = useState(false);
  const [avatarPreview, setAvatarPreview] = useState(profile?.avatar_url || null);
  const [avatarFile, setAvatarFile] = useState(null);
  const [emailNotifications, setEmailNotifications] = useState(profile?.email_notifications !== false);

  const handleAvatarSelect = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) { alert("image must be under 2MB"); return; }
    setAvatarFile(file);
    const reader = new FileReader();
    reader.onload = (ev) => setAvatarPreview(ev.target.result);
    reader.readAsDataURL(file);
  };

  const handleSave = async () => {
    setSaving(true);
    let avatarUrl = profile?.avatar_url || null;

    if (avatarFile) {
      const ext = avatarFile.name.split(".").pop();
      const fileName = `avatars/${profile.id}.${ext}`;
      const { error: uploadError } = await supabase.storage
        .from("media")
        .upload(fileName, avatarFile, { cacheControl: "3600", upsert: true });

      if (!uploadError) {
        const { data: urlData } = supabase.storage.from("media").getPublicUrl(fileName);
        avatarUrl = urlData?.publicUrl;
      }
    }

    await onSave({ display_name: displayName, bio, city, avatar_url: avatarUrl, email_notifications: emailNotifications });
    setSaving(false);
    onClose();
  };

  return (
    <div style={{
      position: "fixed", inset: 0, zIndex: 200, display: "flex", alignItems: "center", justifyContent: "center",
      background: "rgba(26,26,26,0.6)", backdropFilter: "blur(8px)", padding: 20,
    }} onClick={onClose}>
      <div style={{
        background: CREAM, borderRadius: 3, padding: "24px 18px", width: "100%", maxWidth: 400, maxHeight: "90vh", overflowY: "auto",
        animation: "fadeIn 0.3s ease-out",
      }} onClick={(e) => e.stopPropagation()}>
        <Heading size={20} style={{ marginBottom: 20 }}>edit profile</Heading>

        {/* Avatar upload */}
        <div style={{ textAlign: "center", marginBottom: 20 }}>
          <label style={{ cursor: "pointer", display: "inline-block", position: "relative" }}>
            <input type="file" accept="image/*" onChange={handleAvatarSelect} style={{ display: "none" }} />
            {avatarPreview ? (
              <img src={avatarPreview} alt="avatar" style={{ width: 72, height: 72, borderRadius: 3, objectFit: "cover", border: `2px solid ${DARK_CREAM}` }} />
            ) : (
              <div style={{ width: 72, height: 72, borderRadius: 3, background: DARK_CREAM, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 28, fontFamily: "'DM Mono', monospace", color: SLATE }}>
                {displayName?.charAt(0)?.toLowerCase() || "○"}
              </div>
            )}
            <div style={{
              position: "absolute", bottom: -4, right: -4, width: 24, height: 24, borderRadius: "50%",
              background: INK, color: CREAM, display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: 11, border: `2px solid ${CREAM}`,
            }}>✎</div>
          </label>
          <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 9, color: SLATE + "88", marginTop: 8 }}>tap to change photo</div>
        </div>

        <div style={{ marginBottom: 14 }}>
          <label style={{ fontFamily: "'DM Mono', monospace", fontSize: 9, color: SLATE, letterSpacing: "0.5px", display: "block", marginBottom: 6 }}>display name</label>
          <input type="text" value={displayName} onChange={(e) => setDisplayName(e.target.value)} maxLength={24}
            style={{ width: "100%", padding: "11px 14px", background: OFF_WHITE, border: `1px solid ${DARK_CREAM}`, borderRadius: 3, fontSize: 13, color: INK, outline: "none", fontFamily: "'DM Sans', sans-serif" }}
          />
        </div>

        <div style={{ marginBottom: 14 }}>
          <label style={{ fontFamily: "'DM Mono', monospace", fontSize: 9, color: SLATE, letterSpacing: "0.5px", display: "block", marginBottom: 6 }}>bio</label>
          <textarea value={bio} onChange={(e) => setBio(e.target.value)} maxLength={160} rows={3}
            placeholder="tell people a bit about yourself..."
            style={{ width: "100%", padding: "11px 14px", background: OFF_WHITE, border: `1px solid ${DARK_CREAM}`, borderRadius: 3, fontSize: 13, color: INK, outline: "none", fontFamily: "'DM Sans', sans-serif", resize: "vertical", lineHeight: 1.5 }}
          />
          <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 9, color: SLATE + "77", marginTop: 4, textAlign: "right" }}>{bio.length}/160</div>
        </div>

        <div style={{ marginBottom: 20 }}>
          <label style={{ fontFamily: "'DM Mono', monospace", fontSize: 9, color: SLATE, letterSpacing: "0.5px", display: "block", marginBottom: 6 }}>city</label>
          <input type="text" value={city} onChange={(e) => setCity(e.target.value)} placeholder="e.g. melbourne, perth, london"
            style={{ width: "100%", padding: "11px 14px", background: OFF_WHITE, border: `1px solid ${DARK_CREAM}`, borderRadius: 3, fontSize: 13, color: INK, outline: "none", fontFamily: "'DM Sans', sans-serif" }}
          />
        </div>

        {/* Email notifications toggle */}
        <div style={{
          display: "flex", alignItems: "center", justifyContent: "space-between",
          padding: "14px 0", marginBottom: 20, borderTop: `1px solid ${BORDER}`, borderBottom: `1px solid ${BORDER}`,
        }}>
          <div>
            <div style={{ fontSize: 13, color: INK, fontWeight: 500 }}>email notifications</div>
            <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 9, color: SLATE, marginTop: 2 }}>get emailed when the band posts</div>
          </div>
          <button onClick={() => setEmailNotifications(!emailNotifications)} style={{
            width: 44, height: 24, borderRadius: 12, border: "none", cursor: "pointer",
            background: emailNotifications ? RUBY : BORDER,
            position: "relative", transition: "background 0.2s",
          }}>
            <div style={{
              width: 20, height: 20, borderRadius: 10, background: "#fff",
              position: "absolute", top: 2,
              left: emailNotifications ? 22 : 2,
              transition: "left 0.2s", boxShadow: "0 1px 3px rgba(0,0,0,0.15)",
            }} />
          </button>
        </div>

        <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
          <button onClick={onClose} style={{ padding: "10px 20px", background: "transparent", color: SLATE, border: `1px solid ${DARK_CREAM}`, borderRadius: 2, fontSize: 12, cursor: "pointer" }}>cancel</button>
          <button onClick={handleSave} disabled={saving || !displayName.trim()} style={{
            padding: "10px 20px", background: INK, color: CREAM, border: "none", borderRadius: 2,
            fontSize: 12, fontWeight: 600, cursor: "pointer", opacity: saving || !displayName.trim() ? 0.5 : 1,
          }}>{saving ? "saving..." : "save"}</button>
        </div>
      </div>
    </div>
  );
}

// ============ CLAIM REWARD MODAL ============
function ClaimRewardModal({ level, supabase, userId, onClaimed, onClose }) {
  const [name, setName] = useState("");
  const [address, setAddress] = useState("");
  const [city, setCity] = useState("");
  const [country, setCountry] = useState("");
  const [postcode, setPostcode] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const needsShipping = ["tshirt", "vinyl"].includes(level.reward);
  const isDigital = ["postcard", "zoom", "meetgreet"].includes(level.reward);

  const handleClaim = async () => {
    if (needsShipping && (!name || !address || !city || !country || !postcode)) {
      setError("please fill in all shipping fields");
      return;
    }
    setSubmitting(true);
    setError("");

    const { error: insertError } = await supabase.from("reward_claims").insert({
      user_id: userId,
      level_key: level.key,
      reward_type: level.reward,
      shipping_name: needsShipping ? name : null,
      shipping_address: needsShipping ? address : null,
      shipping_city: needsShipping ? city : null,
      shipping_country: needsShipping ? country : null,
      shipping_postcode: needsShipping ? postcode : null,
    });

    if (insertError) {
      setError(insertError.message);
      setSubmitting(false);
      return;
    }

    onClaimed();
  };

  const Field = ({ label, value, onChange, placeholder }) => (
    <div style={{ marginBottom: 10 }}>
      <label style={{ fontFamily: "'DM Mono', monospace", fontSize: 9, color: SLATE, letterSpacing: "0.5px", display: "block", marginBottom: 4 }}>{label}</label>
      <input type="text" value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder}
        style={{ width: "100%", padding: "9px 12px", background: OFF_WHITE, border: `1px solid ${DARK_CREAM}`, borderRadius: 3, fontSize: 13, color: INK, outline: "none", fontFamily: "'DM Sans', sans-serif" }}
      />
    </div>
  );

  return (
    <div style={{
      position: "fixed", inset: 0, zIndex: 200, display: "flex", alignItems: "center", justifyContent: "center",
      background: "rgba(26,26,26,0.6)", backdropFilter: "blur(8px)", padding: 20,
    }} onClick={onClose}>
      <div style={{
        background: CREAM, borderRadius: 3, padding: "24px 18px", width: "100%", maxWidth: 400, maxHeight: "90vh", overflowY: "auto",
        animation: "fadeIn 0.3s ease-out",
      }} onClick={(e) => e.stopPropagation()}>
        <div style={{ textAlign: "center", marginBottom: 20 }}>
          <div style={{ fontSize: 36, marginBottom: 8 }}>{level.icon}</div>
          <Heading size={22}>claim your reward</Heading>
          <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 10, color: WARM_GOLD, marginTop: 6 }}>{level.name} · {level.stamps} ✦</div>
        </div>

        <div style={{
          background: OFF_WHITE, borderRadius: 3, padding: "14px 16px", marginBottom: 20,
          border: `1px solid ${DARK_CREAM}`,
        }}>
          <div style={{ fontSize: 13, color: INK, lineHeight: 1.5 }}>{level.rewardDesc}</div>
        </div>

        {needsShipping && (
          <>
            <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 9, color: SLATE, letterSpacing: "1px", textTransform: "uppercase", marginBottom: 10 }}>shipping details</div>
            <Field label="full name" value={name} onChange={setName} placeholder="your name" />
            <Field label="address" value={address} onChange={setAddress} placeholder="street address" />
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0 12px" }}>
              <Field label="city" value={city} onChange={setCity} placeholder="city" />
              <Field label="postcode" value={postcode} onChange={setPostcode} placeholder="postcode" />
            </div>
            <Field label="country" value={country} onChange={setCountry} placeholder="country" />
          </>
        )}

        {isDigital && (
          <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 11, color: SAGE, textAlign: "center", padding: "10px 0", lineHeight: 1.5 }}>
            {level.reward === "postcard" && "your digital postcard will be delivered to your stamps land feed within a few days ✦"}
            {level.reward === "zoom" && "you'll be added to the next monthly zoom hangout. we'll notify you with the date ✦"}
            {level.reward === "meetgreet" && "we'll be in touch to arrange your meet and greet at an upcoming show ✦"}
          </div>
        )}

        {error && <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 11, color: RUST, marginBottom: 10 }}>{error}</div>}

        <div style={{ display: "flex", gap: 8, justifyContent: "flex-end", marginTop: 16 }}>
          <button onClick={onClose} style={{ padding: "10px 20px", background: "transparent", color: SLATE, border: `1px solid ${DARK_CREAM}`, borderRadius: 2, fontSize: 12, cursor: "pointer" }}>cancel</button>
          <button onClick={handleClaim} disabled={submitting} style={{
            padding: "10px 20px", background: WARM_GOLD, color: INK, border: "none", borderRadius: 2,
            fontSize: 12, fontWeight: 600, cursor: "pointer", opacity: submitting ? 0.5 : 1,
          }}>{submitting ? "claiming..." : "claim ✦"}</button>
        </div>
      </div>
    </div>
  );
}

// ============ USER PROFILE MODAL ============
function UserProfileModal({ userId, supabase, onClose, stampLevels }) {
  const [prof, setProf] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!userId || !supabase) return;
    (async () => {
      const { data } = await supabase.from("profiles").select("*").eq("id", userId).single();
      setProf(data);
      setLoading(false);
    })();
  }, [userId, supabase]);

  if (!userId) return null;

  const currentLevel = prof ? (stampLevels || DEFAULT_STAMP_LEVELS).filter((l) => (prof.stamp_count || 0) >= l.stamps).pop() : null;
  const isBand = prof?.role === "band";
  const memberKey = prof?.band_member;
  const memberColor = memberKey && MEMBER_COLORS[memberKey] ? MEMBER_COLORS[memberKey].primary : null;
  const displayName = isBand && memberKey ? MEMBERS[memberKey]?.name?.toLowerCase() : prof?.display_name?.toLowerCase();

  return (
    <div onClick={onClose} style={{
      position: "fixed", inset: 0, background: "rgba(26,16,24,0.5)", zIndex: 999,
      display: "flex", alignItems: "center", justifyContent: "center", padding: 20,
    }}>
      <div onClick={(e) => e.stopPropagation()} style={{
        background: SURFACE, borderRadius: 14, padding: "28px 24px", maxWidth: 340, width: "100%",
        textAlign: "center", position: "relative",
      }}>
        <button onClick={onClose} style={{
          position: "absolute", top: 12, right: 14, background: "none", border: "none",
          cursor: "pointer", fontSize: 16, color: SLATE, fontFamily: "'DM Mono', monospace",
        }}>×</button>

        {loading ? (
          <div style={{ padding: 30, fontFamily: "'DM Mono', monospace", fontSize: 11, color: SLATE }}>loading...</div>
        ) : prof ? (
          <>
            {prof.avatar_url ? (
              <img src={prof.avatar_url} alt="" style={{
                width: 64, height: 64, borderRadius: 12, objectFit: "cover",
                margin: "0 auto 12px", display: "block",
                border: `3px solid ${memberColor || BLUSH}33`,
              }} />
            ) : (
              <div style={{
                width: 64, height: 64, borderRadius: 12,
                background: memberColor ? memberColor + "22" : `linear-gradient(135deg, ${RUBY}22, ${HOT_PINK}22)`,
                display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: 24, fontFamily: "'DM Sans', sans-serif", fontWeight: 700,
                margin: "0 auto 12px", color: memberColor || RUBY,
                border: `3px solid ${memberColor || BLUSH}33`,
              }}>
                {displayName?.charAt(0) || "✦"}
              </div>
            )}

            <div style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 20, fontWeight: 700, color: INK, textTransform: "lowercase" }}>
              {displayName}
            </div>

            {isBand && <span style={{ fontFamily: "'DM Mono', monospace", fontSize: 9, color: memberColor || RUST, border: `1px solid ${(memberColor || RUST)}44`, padding: "2px 8px", borderRadius: 3, letterSpacing: "0.8px", textTransform: "uppercase", display: "inline-block", marginTop: 6 }}>band</span>}

            {prof.bio && <p style={{ fontSize: 12, color: SLATE, marginTop: 8, lineHeight: 1.5, fontStyle: "italic" }}>{prof.bio}</p>}
            {prof.city && <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 10, color: BLUSH, marginTop: 4 }}>📍 {prof.city}</div>}

            {currentLevel && (
              <div style={{
                display: "inline-block", marginTop: 10,
                background: RUBY + "11", border: `1px solid ${RUBY}22`, borderRadius: 20,
                padding: "3px 12px",
              }}>
                <span style={{ fontFamily: "'DM Mono', monospace", fontSize: 9, color: RUBY, fontWeight: 500 }}>
                  {currentLevel.icon} {currentLevel.name.toLowerCase()}
                </span>
              </div>
            )}

            <div style={{ display: "flex", justifyContent: "center", gap: 32, marginTop: 16 }}>
              {[
                { label: "stamps", value: prof.stamp_count || 0, color: RUBY },
                { label: "shows", value: prof.show_count || 0, color: HOT_PINK },
              ].map((s) => (
                <div key={s.label}>
                  <div style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 22, fontWeight: 700, color: s.color }}>{s.value}</div>
                  <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 8, color: SLATE, letterSpacing: 1.5, textTransform: "uppercase" }}>{s.label}</div>
                </div>
              ))}
            </div>

            <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 9, color: SLATE + "66", marginTop: 14 }}>
              joined {new Date(prof.joined_at).toLocaleDateString("en-AU", { month: "short", year: "numeric" })}
            </div>
          </>
        ) : (
          <div style={{ padding: 30, fontFamily: "'DM Mono', monospace", fontSize: 11, color: SLATE }}>user not found</div>
        )}
      </div>
    </div>
  );
}

// ============ POST CARD ============
function PostCard({ post, currentUserId, currentProfile, supabase, onRefresh, onViewProfile }) {
  const [liked, setLiked] = useState(post.user_has_liked || false);
  const [likeCount, setLikeCount] = useState(post.like_count || 0);
  const [showComments, setShowComments] = useState(false);
  const [commentCount, setCommentCount] = useState(post.comment_count || 0);
  const [editing, setEditing] = useState(false);
  const [editContent, setEditContent] = useState(post.content);
  const [showMenu, setShowMenu] = useState(false);
  const isBand = post.profiles?.role === "band";
  const isAdmin = post.profiles?.role === "admin";
  const isEx = post.is_exclusive;
  const memberKey = post.profiles?.band_member;
  const memberColor = memberKey && MEMBER_COLORS[memberKey] ? MEMBER_COLORS[memberKey].primary : null;
  const isOwnPost = post.author_id === currentUserId;
  const canModerate = currentProfile?.role === "admin" || currentProfile?.role === "band";
  const canEdit = isOwnPost;
  const canDelete = isOwnPost || canModerate;

  const displayName = post.profiles?.display_name || "unknown";
  const avatarUrl = post.profiles?.avatar_url;
  const avatar = isBand && memberKey
    ? MEMBERS[memberKey]?.emoji || "✦"
    : isAdmin ? "✦" : displayName.charAt(0).toLowerCase();

  const handleLike = async () => {
    if (!currentUserId) return;
    const newLiked = !liked;
    setLiked(newLiked);
    setLikeCount((c) => c + (newLiked ? 1 : -1));

    if (newLiked) {
      await supabase.from("post_likes").insert({ post_id: post.id, user_id: currentUserId });
      // Notify post author
      if (post.author_id !== currentUserId) {
        supabase.rpc("create_notification", {
          target_user_id: post.author_id,
          notif_type: "like",
          notif_title: `${currentProfile?.display_name || "someone"} liked your post`,
        }).catch(() => {});
      }
    } else {
      await supabase.from("post_likes").delete().eq("post_id", post.id).eq("user_id", currentUserId);
    }
  };

  const handleDelete = async () => {
    if (canModerate) {
      await supabase.rpc("admin_delete_post", { target_id: post.id });
    } else {
      await supabase.from("posts").delete().eq("id", post.id);
    }
    setShowMenu(false);
    if (onRefresh) onRefresh();
  };

  const handleEdit = async () => {
    if (!editContent.trim()) return;
    await supabase.from("posts").update({ content: editContent.trim() }).eq("id", post.id);
    setEditing(false);
    if (onRefresh) onRefresh();
  };

  return (
    <>
      <div style={{
        background: SURFACE, borderRadius: 10, 
        padding: "18px 20px", marginBottom: showComments ? 0 : 10,
        border: `1px solid ${isEx ? RUBY + "33" : BORDER}`, position: "relative",
        borderLeft: isBand && memberColor ? `3px solid ${memberColor}` : undefined,
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
          {avatarUrl && !isBand && !isAdmin ? (
            <img src={avatarUrl} alt="" style={{ width: 34, height: 34, borderRadius: 3, objectFit: "cover" }} />
          ) : (
            <div style={{
              width: 34, height: 34, borderRadius: 3,
              background: isBand && memberColor ? memberColor : (isBand || isAdmin) ? INK : DUSTY_ROSE + "33",
              color: (isBand || isAdmin) ? CREAM : SLATE, display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: (isBand || isAdmin) ? 14 : 13, fontFamily: "'DM Mono', monospace", fontWeight: 600, textTransform: "uppercase",
            }}>{avatar}</div>
          )}
          <div style={{ flex: 1 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <span onClick={() => onViewProfile && onViewProfile(post.author_id)} style={{ fontFamily: "'DM Sans', sans-serif", fontWeight: 600, fontSize: 13, color: INK, cursor: "pointer" }}>
                {isBand ? (memberKey ? MEMBERS[memberKey]?.name?.toLowerCase() : "the stamps") : displayName?.toLowerCase()}
              </span>
              {isBand && <span style={{ fontFamily: "'DM Mono', monospace", fontSize: 8, fontWeight: 500, color: memberColor || RUST, border: `1px solid ${(memberColor || RUST)}55`, padding: "1px 6px", borderRadius: 2, letterSpacing: "0.8px", textTransform: "uppercase" }}>band</span>}
              {isAdmin && <span style={{ fontFamily: "'DM Mono', monospace", fontSize: 8, fontWeight: 500, color: WARM_GOLD, border: `1px solid ${WARM_GOLD}55`, padding: "1px 6px", borderRadius: 2, letterSpacing: "0.8px", textTransform: "uppercase" }}>admin</span>}
            </div>
            <span style={{ fontFamily: "'DM Mono', monospace", fontSize: 10, color: SLATE + "99" }}>{timeAgo(post.created_at)}</span>
          </div>
          {(canEdit || canDelete) && (
            <div style={{ position: "relative" }}>
              <button onClick={() => setShowMenu(!showMenu)} style={{
                background: "none", border: "none", cursor: "pointer", padding: "4px 6px",
                fontFamily: "'DM Mono', monospace", fontSize: 16, color: SLATE + "55", lineHeight: 1,
              }}>···</button>
              {showMenu && (
                <div style={{
                  position: "absolute", right: 0, top: 28, background: OFF_WHITE,
                  border: `1px solid ${DARK_CREAM}`, borderRadius: 3, overflow: "hidden",
                  boxShadow: "0 4px 12px rgba(0,0,0,0.08)", zIndex: 10, minWidth: 120,
                }}>
                  {canEdit && (
                    <button onClick={() => { setEditing(true); setShowMenu(false); }} style={{
                      display: "block", width: "100%", padding: "10px 14px", background: "none",
                      border: "none", cursor: "pointer", fontSize: 12, color: INK, textAlign: "left",
                      fontFamily: "'DM Sans', sans-serif",
                    }}>edit post</button>
                  )}
                  {canDelete && (
                    <button onClick={handleDelete} style={{
                      display: "block", width: "100%", padding: "10px 14px", background: "none",
                      border: "none", cursor: "pointer", fontSize: 12, color: RUST, textAlign: "left",
                      fontFamily: "'DM Sans', sans-serif",
                    }}>delete post</button>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
        {editing ? (
          <div style={{ marginBottom: 14 }}>
            <textarea value={editContent} onChange={(e) => setEditContent(e.target.value)} rows={3}
              style={{ width: "100%", padding: "10px 12px", background: CREAM, border: `1px solid ${DARK_CREAM}`, borderRadius: 3, fontSize: 13, color: INK, outline: "none", fontFamily: "'DM Sans', sans-serif", lineHeight: 1.6, resize: "vertical" }}
            />
            <div style={{ display: "flex", gap: 6, marginTop: 8 }}>
              <button onClick={handleEdit} style={{ padding: "6px 14px", background: INK, color: CREAM, border: "none", borderRadius: 2, fontSize: 11, fontWeight: 600, cursor: "pointer" }}>save</button>
              <button onClick={() => { setEditing(false); setEditContent(post.content); }} style={{ padding: "6px 14px", background: "transparent", color: SLATE, border: `1px solid ${DARK_CREAM}`, borderRadius: 2, fontSize: 11, cursor: "pointer" }}>cancel</button>
            </div>
          </div>
        ) : (
          <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 13.5, lineHeight: 1.65, color: INK + "CC", margin: "0 0 14px 0" }}>{post.content}</p>
        )}
        {post.image_url && (
          <div style={{ marginBottom: 14 }}>
            <img src={post.image_url} alt="" style={{ width: "100%", borderRadius: 3, border: `1px solid ${DARK_CREAM}` }} />
          </div>
        )}
        {post.audio_url && (
          <div style={{ marginBottom: 14, background: CREAM, borderRadius: 10, padding: "12px 14px", border: `1px solid ${DARK_CREAM}` }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
              <span style={{ fontSize: 16, color: RUBY }}>♫</span>
              <span style={{ fontFamily: "'DM Mono', monospace", fontSize: 10, color: SLATE, letterSpacing: "0.5px" }}>audio</span>
            </div>
            <audio controls preload="metadata" style={{ width: "100%", height: 36, borderRadius: 8 }}>
              <source src={post.audio_url} />
            </audio>
          </div>
        )}
        {isEx && (
          <div style={{ background: `repeating-linear-gradient(45deg, ${WARM_GOLD}08, ${WARM_GOLD}08 10px, transparent 10px, transparent 20px)`, border: `1px dashed ${WARM_GOLD}44`, borderRadius: 3, padding: "24px 16px", textAlign: "center", marginBottom: 14 }}>
            <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 24, marginBottom: 6, color: WARM_GOLD }}>✦</div>
            <div style={{ fontSize: 13, fontWeight: 600, color: INK }}>Stamped Content</div>
            <div style={{ fontSize: 11, color: SLATE, marginTop: 4 }}>reach 500 stamps to unlock</div>
            <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 9, fontWeight: 500, color: WARM_GOLD, letterSpacing: "1.5px", textTransform: "uppercase", marginTop: 10 }}>✦ stamped members only</div>
          </div>
        )}
        <div style={{ display: "flex", gap: 18, alignItems: "center" }}>
          <button onClick={handleLike} style={{ background: "none", border: "none", cursor: "pointer", display: "flex", alignItems: "center", gap: 5, fontFamily: "'DM Mono', monospace", fontSize: 12, color: liked ? RUST : SLATE + "88", fontWeight: liked ? 600 : 400, padding: 0 }}>
            <span style={{ fontSize: 14 }}>{liked ? "♥" : "♡"}</span> {likeCount}
          </button>
          <button onClick={() => setShowComments(!showComments)} style={{ background: "none", border: "none", cursor: "pointer", display: "flex", alignItems: "center", gap: 5, fontFamily: "'DM Mono', monospace", fontSize: 12, color: showComments ? INK : SLATE + "88", fontWeight: showComments ? 600 : 400, padding: 0 }}>
            ↩ {commentCount}
          </button>
        </div>
      </div>
      {showComments && (
        <CommentsPanel
          postId={post.id}
          postAuthorId={post.author_id}
          supabase={supabase}
          currentUserId={currentUserId}
          currentProfile={currentProfile}
          onClose={() => setShowComments(false)}
          onCommentAdded={() => setCommentCount((c) => c + 1)}
          onViewProfile={onViewProfile}
        />
      )}
    </>
  );
}

// ============ MEMBER HEADER ============
function MemberHeader({ member, customTagline }) {
  const m = MEMBERS[member];
  const tagline = customTagline || m.tagline;
  return (
    <div style={{ background: m.color.bg, borderRadius: 10, padding: "22px 20px", marginBottom: 14, borderLeft: `3px solid ${m.color.primary}` }}>
      <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
        <div style={{ width: 52, height: 52, borderRadius: 10, background: m.color.primary, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 24 }}>{m.emoji}</div>
        <div>
          <Heading size={22} color={INK}>{m.name}</Heading>
          <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 10, color: m.color.primary, marginTop: 3, letterSpacing: "0.5px" }}>{m.role.toUpperCase()}</div>
          <div style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 12, color: SLATE, marginTop: 4, fontStyle: "italic" }}>"{tagline}"</div>
        </div>
      </div>
    </div>
  );
}

// ============ MAIN APP ============
export default function StampsLand() {
  const { user, profile, signOut, supabase, refreshProfile, updateProfile } = useAuth();
  const [mainTab, setMainTab] = useState("feed");
  const [feedView, setFeedView] = useState("community");
  const [showWelcome, setShowWelcome] = useState(false);

  // Show welcome only on first visit
  useEffect(() => {
    if (typeof window !== "undefined" && !localStorage.getItem("sl_welcomed")) {
      setShowWelcome(true);
    }
  }, []);

  const dismissWelcome = () => {
    setShowWelcome(false);
    if (typeof window !== "undefined") localStorage.setItem("sl_welcomed", "1");
  };
  const [posts, setPosts] = useState([]);
  const [shows, setShows] = useState({});
  const [stampActions, setStampActions] = useState([]);
  const [topCollectors, setTopCollectors] = useState([]);
  const [newPost, setNewPost] = useState("");
  const [posting, setPosting] = useState(false);
  const [postImage, setPostImage] = useState(null);
  const [postImagePreview, setPostImagePreview] = useState(null);
  const [postAudio, setPostAudio] = useState(null);
  const [postAudioName, setPostAudioName] = useState(null);
  const [expandedRegion, setExpandedRegion] = useState(null);
  const [loadingPosts, setLoadingPosts] = useState(true);
  const [showEditProfile, setShowEditProfile] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);
  const [claimingLevel, setClaimingLevel] = useState(null);
  const [rewardClaims, setRewardClaims] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [showNotifications, setShowNotifications] = useState(false);
  const [checkinShow, setCheckinShow] = useState(null);
  const [memberTaglines, setMemberTaglines] = useState({});
  const [STAMP_LEVELS, setStampLevels] = useState(DEFAULT_STAMP_LEVELS);

  // Load reward tiers from DB
  useEffect(() => {
    if (!supabase) return;
    (async () => {
      const { data } = await supabase.from("reward_tiers").select("*").eq("is_active", true).order("sort_order");
      if (data && data.length > 0) {
        setStampLevels(data.map((t) => ({
          name: t.name, key: t.key, stamps: t.stamps, icon: t.icon,
          reward: t.reward_type, rewardDesc: t.reward_desc,
        })));
      }
    })();
  }, [supabase]);
  const [checkinCode, setCheckinCode] = useState("");
  const [checkinStatus, setCheckinStatus] = useState("");
  const [checkinLoading, setCheckinLoading] = useState(false);
  const [myAttendance, setMyAttendance] = useState(new Set());
  const [viewingProfile, setViewingProfile] = useState(null);

  const fetchPosts = useCallback(async (feed = feedView) => {
    if (!supabase) return;
    setLoadingPosts(true);
    try {
      let query = supabase
        .from("posts")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(30);

      if (feed === "community") {
        query = query.eq("feed_type", "community");
      } else if (["sofia", "scarlett", "rubina"].includes(feed)) {
        query = query.eq("feed_type", feed);
      }

      const { data, error } = await query;
      if (error || !data) { setPosts([]); setLoadingPosts(false); return; }

      // Fetch profiles for post authors
      const authorIds = [...new Set(data.map((p) => p.author_id))];
      let profileMap = {};
      if (authorIds.length > 0) {
        const { data: profiles } = await supabase
          .from("profiles")
          .select("id, display_name, role, band_member, avatar_url")
          .in("id", authorIds);
        if (profiles) profiles.forEach((p) => { profileMap[p.id] = p; });
      }

      // Fetch user's likes
      let likedPostIds = new Set();
      if (user) {
        try {
          const { data: likes } = await supabase
            .from("post_likes")
            .select("post_id")
            .eq("user_id", user.id);
          if (likes) likedPostIds = new Set(likes.map((l) => l.post_id));
        } catch (e) { /* likes fetch failed, continue without */ }
      }

      setPosts(data.map((p) => ({
        ...p,
        profiles: profileMap[p.author_id] || null,
        user_has_liked: likedPostIds.has(p.id),
      })));
    } catch (e) {
      console.error("fetchPosts error:", e);
      setPosts([]);
    }
    setLoadingPosts(false);
  }, [feedView, user, supabase]);

  const fetchShows = useCallback(async () => {
    const { data } = await supabase.from("shows").select("*").order("date");
    if (data) {
      const grouped = {};
      data.forEach((show) => {
        const region = show.region || "other";
        if (!grouped[region]) grouped[region] = [];
        grouped[region].push(show);
      });
      setShows(grouped);
    }
    // Fetch my attendance
    if (user) {
      try {
        const { data: att } = await supabase.from("show_attendance").select("show_id").eq("user_id", user.id);
        if (att) setMyAttendance(new Set(att.map((a) => a.show_id)));
      } catch (e) { console.error("attendance fetch error:", e); }
    }
  }, [supabase, user]);

  const fetchStampData = useCallback(async () => {
    const { data: actions } = await supabase.from("stamp_actions").select("*").eq("is_active", true).order("points");
    if (actions) setStampActions(actions);
    const { data: topUsers } = await supabase.from("profiles").select("display_name, stamp_count").order("stamp_count", { ascending: false }).limit(5);
    if (topUsers) setTopCollectors(topUsers);
    if (user) {
      const { data: claims } = await supabase.from("reward_claims").select("*").eq("user_id", user.id);
      if (claims) setRewardClaims(claims);
    }
  }, [supabase, user]);

  const fetchNotifications = useCallback(async () => {
    if (!user) return;
    const { data } = await supabase
      .from("notifications")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(30);
    if (data) {
      setNotifications(data);
      setUnreadCount(data.filter((n) => !n.is_read).length);
    }
  }, [user, supabase]);

  useEffect(() => { if (supabase) fetchPosts(); }, [feedView, supabase]);

  // Load member taglines from site_settings
  useEffect(() => {
    if (!supabase) return;
    (async () => {
      const { data } = await supabase.from("site_settings").select("key, value").in("key", ["tagline_sofia", "tagline_scarlett", "tagline_rubina"]);
      if (data) {
        const map = {};
        data.forEach((s) => { map[s.key.replace("tagline_", "")] = s.value; });
        setMemberTaglines(map);
      }
    })();
  }, [supabase]);
  
  // Capture geo on first load if not already captured
  useEffect(() => {
    if (user && profile && !profile.signup_ip) {
      fetch("/api/geo", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: user.id,
          timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
          language: navigator.language,
        }),
      }).catch(() => {});
    }
  }, [user, profile]);
  useEffect(() => {
    if (mainTab === "shows") fetchShows();
    if (mainTab === "stamps") fetchStampData();
    if (mainTab === "you") refreshProfile();
    fetchNotifications();
  }, [mainTab]);

  const handlePost = async () => {
    if ((!newPost.trim() && !postImage && !postAudio) || posting) return;
    setPosting(true);
    const canPostToMemberFeed = profile?.role === "band" && profile?.band_member === feedView;
    const canPostToAnyFeed = profile?.role === "admin";
    const actualFeedType = feedView === "community" || canPostToMemberFeed || canPostToAnyFeed ? feedView : "community";

    let imageUrl = null;
    let audioUrl = null;

    // Upload image if present
    if (postImage) {
      const ext = postImage.name.split(".").pop();
      const fileName = `posts/${user.id}-${Date.now()}.${ext}`;
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from("media")
        .upload(fileName, postImage, { cacheControl: "3600", upsert: false });

      if (!uploadError && uploadData) {
        const { data: urlData } = supabase.storage.from("media").getPublicUrl(fileName);
        imageUrl = urlData?.publicUrl;
      }
    }

    // Upload audio if present
    if (postAudio) {
      const ext = postAudio.name.split(".").pop();
      const fileName = `audio/${user.id}-${Date.now()}.${ext}`;
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from("media")
        .upload(fileName, postAudio, { cacheControl: "3600", upsert: false });

      if (!uploadError && uploadData) {
        const { data: urlData } = supabase.storage.from("media").getPublicUrl(fileName);
        audioUrl = urlData?.publicUrl;
      }
    }

    const insertData = {
      author_id: user.id,
      content: newPost.trim() || "",
      feed_type: actualFeedType,
      image_url: imageUrl,
    };
    if (audioUrl) insertData.audio_url = audioUrl;

    const { error } = await supabase.from("posts").insert(insertData);
    if (!error) {
      setNewPost("");
      setPostImage(null);
      setPostImagePreview(null);
      setPostAudio(null);
      setPostAudioName(null);
      await supabase.rpc("award_stamps", { target_user_id: user.id, action_trigger_key: "post_created" });
      await refreshProfile();
      await fetchPosts();
      // Send email notification for band/admin posts (fire and forget)
      if (profile?.role === "band" || profile?.role === "admin") {
        fetch("/api/email/band-post", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            postId: "new",
            authorName: profile.band_member ? MEMBERS[profile.band_member]?.name : profile.display_name,
            content: newPost.trim(),
            feedType: actualFeedType,
          }),
        }).catch(() => {});
      }
    }
    setPosting(false);
  };

  const handleImageSelect = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) { alert("image must be under 5MB"); return; }
    setPostImage(file);
    const reader = new FileReader();
    reader.onload = (ev) => setPostImagePreview(ev.target.result);
    reader.readAsDataURL(file);
  };

  const handleAudioSelect = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 20 * 1024 * 1024) { alert("audio must be under 20MB"); return; }
    setPostAudio(file);
    setPostAudioName(file.name);
  };

  const clearImage = () => {
    setPostImage(null);
    setPostImagePreview(null);
  };

  const clearAudio = () => {
    setPostAudio(null);
    setPostAudioName(null);
  };

  const handleSaveProfile = async (updates) => {
    await updateProfile(updates);
  };

  const handleCheckin = async () => {
    if (!checkinCode.trim() || !checkinShow || checkinLoading) return;
    setCheckinLoading(true);
    setCheckinStatus("");
    const { data, error } = await supabase.rpc("checkin_show", {
      p_show_id: checkinShow.id,
      p_code: checkinCode.trim(),
    });
    if (error) {
      setCheckinStatus(error.message);
    } else if (data === "success") {
      setCheckinStatus("success");
      setMyAttendance((prev) => new Set([...prev, checkinShow.id]));
      refreshProfile();
    } else {
      setCheckinStatus(data);
    }
    setCheckinLoading(false);
  };

  const formatShowDate = (dateStr) => {
    const d = new Date(dateStr + "T00:00:00");
    return d.toLocaleDateString("en-AU", { day: "numeric", month: "short" });
  };

  const userStamps = profile?.stamp_count || 0;
  const currentLevel = STAMP_LEVELS.slice().reverse().find((l) => userStamps >= l.stamps) || STAMP_LEVELS[0];
  const nextLevel = STAMP_LEVELS.find((l) => l.stamps > userStamps);
  const REGION_ORDER = ["australia", "europe", "uk", "north_america"];
  const mainTabs = [
    { id: "feed", label: "feed", icon: "◎" },
    { id: "shows", label: "shows", icon: "♫" },
    { id: "stamps", label: "stamps", icon: "✦" },
    { id: "you", label: "you", icon: "○" },
  ];

  return (
    <div style={{ minHeight: "100vh", background: CREAM, fontFamily: "'DM Sans', sans-serif", color: INK }}>
      <style>{`@keyframes fadeIn { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: translateY(0); } }`}</style>

      {/* Edit Profile Modal */}
      {showEditProfile && (
        <EditProfileModal profile={profile} supabase={supabase} onSave={handleSaveProfile} onClose={() => setShowEditProfile(false)} />
      )}

      {/* Claim Reward Modal */}
      {claimingLevel && (
        <ClaimRewardModal
          level={claimingLevel}
          supabase={supabase}
          userId={user?.id}
          onClaimed={() => { setClaimingLevel(null); fetchStampData(); }}
          onClose={() => setClaimingLevel(null)}
        />
      )}

      {/* Check-in Modal */}
      {checkinShow && (
        <div style={{
          position: "fixed", inset: 0, zIndex: 200, display: "flex", alignItems: "center", justifyContent: "center",
          background: "rgba(26,26,26,0.6)", backdropFilter: "blur(8px)", padding: 20,
        }} onClick={() => setCheckinShow(null)}>
          <div style={{
            background: CREAM, borderRadius: 3, padding: "24px 18px", width: "100%", maxWidth: 340,
            animation: "fadeIn 0.3s ease-out", textAlign: "center",
          }} onClick={(e) => e.stopPropagation()}>
            <div style={{ fontSize: 32, marginBottom: 10 }}>✦</div>
            <Heading size={20} style={{ marginBottom: 4 }}>check in</Heading>
            <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 11, color: SLATE, marginBottom: 20 }}>
              {checkinShow.venue}, {checkinShow.city}
            </div>

            {checkinStatus === "success" ? (
              <div style={{ padding: "16px 0" }}>
                <div style={{ fontSize: 36, marginBottom: 8 }}>✦</div>
                <div style={{ fontSize: 14, fontWeight: 700, color: INK, marginBottom: 4 }}>you're in!</div>
                <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 11, color: SAGE }}>+50 stamps earned</div>
                <button onClick={() => setCheckinShow(null)} style={{
                  marginTop: 16, padding: "10px 24px", background: INK, color: CREAM,
                  border: "none", borderRadius: 3, fontSize: 12, fontWeight: 600, cursor: "pointer",
                }}>nice ✦</button>
              </div>
            ) : (
              <>
                <div style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 13, color: SLATE, marginBottom: 16, lineHeight: 1.5 }}>
                  enter the 4-digit code shown at the venue
                </div>
                <input
                  type="text"
                  value={checkinCode}
                  onChange={(e) => setCheckinCode(e.target.value.toUpperCase().slice(0, 6))}
                  onKeyDown={(e) => e.key === "Enter" && handleCheckin()}
                  placeholder="CODE"
                  maxLength={6}
                  style={{
                    width: 160, padding: "14px", background: OFF_WHITE, border: `2px solid ${DARK_CREAM}`,
                    borderRadius: 3, fontSize: 24, color: INK, outline: "none", textAlign: "center",
                    fontFamily: "'DM Mono', monospace", fontWeight: 700, letterSpacing: "6px",
                  }}
                  autoFocus
                />
                {checkinStatus && checkinStatus !== "success" && (
                  <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 11, color: RUST, marginTop: 10 }}>{checkinStatus}</div>
                )}
                <div style={{ display: "flex", gap: 8, justifyContent: "center", marginTop: 16 }}>
                  <button onClick={() => setCheckinShow(null)} style={{
                    padding: "10px 20px", background: "transparent", color: SLATE,
                    border: `1px solid ${DARK_CREAM}`, borderRadius: 3, fontSize: 12, cursor: "pointer",
                  }}>cancel</button>
                  <button onClick={handleCheckin} disabled={checkinLoading || !checkinCode.trim()} style={{
                    padding: "10px 20px", background: WARM_GOLD, color: INK,
                    border: "none", borderRadius: 3, fontSize: 12, fontWeight: 600, cursor: "pointer",
                    opacity: checkinLoading || !checkinCode.trim() ? 0.5 : 1,
                  }}>{checkinLoading ? "..." : "check in ✦"}</button>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* HEADER */}
      <div style={{ position: "sticky", top: 0, zIndex: 100, background: CREAM + "EE", backdropFilter: "blur(16px)", borderBottom: `1px solid ${BORDER}` }}>
        <div style={{ maxWidth: 480, margin: "0 auto", padding: "14px 20px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ display: "flex", alignItems: "baseline", gap: 8 }}>
            <Heading size={24} color={INK}>the stamps</Heading>
            <span style={{ fontFamily: "'DM Mono', monospace", fontSize: 8, color: BLUSH, letterSpacing: "1.5px", textTransform: "lowercase", position: "relative", top: -1 }}>land</span>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <button onClick={() => { setShowNotifications(!showNotifications); if (!showNotifications) { supabase.from("notifications").update({ is_read: true }).eq("user_id", user.id).eq("is_read", false).then(() => setUnreadCount(0)); } }} style={{
              background: "none", border: "none", cursor: "pointer", position: "relative",
              fontFamily: "'DM Mono', monospace", fontSize: 16, color: BLUSH, padding: "4px",
            }}>
              ◈
              {unreadCount > 0 && (
                <span style={{
                  position: "absolute", top: -2, right: -4, background: HOT_PINK, color: "#fff",
                  fontSize: 9, fontWeight: 700, width: 16, height: 16, borderRadius: "50%",
                  display: "flex", alignItems: "center", justifyContent: "center",
                }}>{unreadCount > 9 ? "9+" : unreadCount}</span>
              )}
            </button>
            <div onClick={() => setMainTab("stamps")} style={{ fontFamily: "'DM Mono', monospace", fontSize: 12, color: RUBY, background: RUBY + "11", padding: "5px 12px", borderRadius: 8, fontWeight: 500, cursor: "pointer" }}>✦ {userStamps}</div>
          </div>
        </div>
      </div>

      {/* CONTENT */}
      <div style={{ maxWidth: 480, margin: "0 auto", padding: "0 16px 100px", position: "relative" }}>

        {/* Notifications panel */}
        {showNotifications && (
          <div style={{
            background: SURFACE, borderRadius: 10, border: `1px solid ${BORDER}`,
            margin: "10px 0", padding: "4px 0", animation: "fadeIn 0.2s ease-out",
            maxHeight: 360, overflowY: "auto", boxShadow: "0 4px 20px rgba(26,16,24,0.08)",
          }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "12px 16px", borderBottom: `1px solid ${DARK_CREAM}` }}>
              <span style={{ fontFamily: "'DM Mono', monospace", fontSize: 9, color: SLATE, letterSpacing: "1.5px", textTransform: "uppercase" }}>notifications</span>
              <button onClick={() => setShowNotifications(false)} style={{ background: "none", border: "none", cursor: "pointer", fontSize: 14, color: SLATE, fontFamily: "'DM Mono', monospace" }}>×</button>
            </div>
            {notifications.length === 0 ? (
              <div style={{ padding: "24px 16px", textAlign: "center", fontFamily: "'DM Mono', monospace", fontSize: 11, color: SLATE }}>no notifications yet</div>
            ) : (
              notifications.map((n) => (
                <div key={n.id} style={{
                  padding: "12px 16px", borderBottom: `1px solid ${DARK_CREAM}`,
                  background: n.is_read ? "transparent" : WARM_GOLD + "08",
                }}>
                  <div style={{ display: "flex", alignItems: "flex-start", gap: 10 }}>
                    <span style={{ fontFamily: "'DM Mono', monospace", fontSize: 14, color: n.type === "stamp" ? WARM_GOLD : n.type === "like" ? RUST : n.type === "reward" ? SAGE : SLATE, flexShrink: 0, marginTop: 1 }}>
                      {n.type === "stamp" ? "✦" : n.type === "like" ? "♥" : n.type === "comment" ? "↩" : n.type === "reward" ? "♛" : n.type === "referral" ? "⊕" : n.type === "post" ? "◎" : "◈"}
                    </span>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 12, fontWeight: n.is_read ? 400 : 600, color: INK, lineHeight: 1.4 }}>{n.title}</div>
                      {n.body && <div style={{ fontSize: 11, color: SLATE, marginTop: 2, lineHeight: 1.4 }}>{n.body}</div>}
                      <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 9, color: SLATE + "77", marginTop: 4 }}>{timeAgo(n.created_at)}</div>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {showWelcome && mainTab === "feed" && (
          <div style={{ background: RUBY, borderRadius: 10, padding: "24px 22px", margin: "14px 0", position: "relative", animation: "fadeIn 0.5s ease-out" }}>
            <button onClick={dismissWelcome} style={{ position: "absolute", top: 12, right: 14, background: "none", border: "none", color: CREAM + "66", cursor: "pointer", fontSize: 16, fontFamily: "'DM Mono', monospace" }}>×</button>
            <Heading size={28} color={CREAM} style={{ marginBottom: 10, lineHeight: 1.15 }}>welcome to{"\n"}stamps land</Heading>
            <p style={{ fontSize: 13, color: CREAM + "BB", lineHeight: 1.6, marginBottom: 16 }}>
              you're in. this is where sofia, scarlett and rubina share what they're making, thinking and feeling - and where fans connect with each other. earn stamps by being here.
            </p>
            <button onClick={dismissWelcome} style={{ background: CREAM, color: INK, border: "none", borderRadius: 2, padding: "10px 20px", fontSize: 12, fontWeight: 600, cursor: "pointer" }}>start exploring</button>
          </div>
        )}

        {/* FEED TAB */}
        {mainTab === "feed" && (
          <div style={{ animation: "fadeIn 0.3s ease-out" }}>
            <div style={{ display: "flex", borderBottom: `1px solid ${BORDER}`, marginTop: 10, marginBottom: 14, background: SURFACE, borderRadius: "10px 10px 0 0", overflowX: "auto", WebkitOverflowScrolling: "touch" }}>
              <button onClick={() => setFeedView("community")} style={{
                flex: 1, padding: "12px 6px 10px", background: feedView === "community" ? SURFACE : "transparent",
                border: "none", borderBottom: feedView === "community" ? `2.5px solid ${RUBY}` : "2.5px solid transparent",
                cursor: "pointer", fontSize: 11, fontWeight: feedView === "community" ? 700 : 500,
                color: feedView === "community" ? INK : SLATE, display: "flex", flexDirection: "column", alignItems: "center", gap: 2,
              }}><span style={{ fontSize: 16 }}>✦</span>everyone</button>
              {Object.keys(MEMBERS).map((key) => {
                const m = MEMBERS[key]; const isActive = feedView === key;
                return (
                  <button key={key} onClick={() => setFeedView(key)} style={{
                    flex: 1, padding: "12px 6px 10px", background: isActive ? m.color.bg : "transparent",
                  background: isActive ? SURFACE : "transparent",
                    border: "none", borderBottom: isActive ? `2.5px solid ${m.color.primary}` : "2.5px solid transparent",
                    cursor: "pointer", display: "flex", flexDirection: "column", alignItems: "center", gap: 2,
                  }}>
                    <span style={{ fontSize: 16 }}>{m.emoji}</span>
                    <span style={{ fontSize: 11, fontWeight: isActive ? 700 : 500, color: isActive ? m.color.primary : SLATE }}>{m.name}</span>
                  </button>
                );
              })}
            </div>

            {feedView !== "community" && <MemberHeader member={feedView} customTagline={memberTaglines[feedView]} />}

            <div style={{ background: SURFACE, borderRadius: 10, padding: "14px 16px", marginBottom: 12, border: `1px solid ${BORDER}` }}>
              <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                {profile?.avatar_url ? (
                  <img src={profile.avatar_url} alt="" style={{ width: 30, height: 30, borderRadius: 2, objectFit: "cover" }} />
                ) : (
                  <div style={{ width: 30, height: 30, borderRadius: 2, background: DUSTY_ROSE + "33", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, fontFamily: "'DM Mono', monospace", color: SLATE }}>
                    {profile?.display_name?.charAt(0)?.toLowerCase() || "○"}
                  </div>
                )}
                <input type="text" placeholder="say something..." value={newPost} onChange={(e) => setNewPost(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && handlePost()}
                  style={{ flex: 1, border: "none", outline: "none", fontSize: 13, color: INK, background: "transparent" }} />
                <label style={{ cursor: "pointer", display: "flex", alignItems: "center", padding: "4px 8px", color: SLATE + "88", fontSize: 14, fontFamily: "'DM Mono', monospace", transition: "color 0.2s" }} title="add image"
                  onMouseEnter={(e) => e.currentTarget.style.color = RUST}
                  onMouseLeave={(e) => e.currentTarget.style.color = SLATE + "88"}
                >
                  <input type="file" accept="image/*" onChange={handleImageSelect} style={{ display: "none" }} />
                  +
                </label>
                {(profile?.role === "band" || profile?.role === "admin") && (
                <label style={{ cursor: "pointer", display: "flex", alignItems: "center", padding: "4px 6px", color: SLATE + "88", fontSize: 13, fontFamily: "'DM Mono', monospace", transition: "color 0.2s" }} title="add audio"
                  onMouseEnter={(e) => e.currentTarget.style.color = RUBY}
                  onMouseLeave={(e) => e.currentTarget.style.color = SLATE + "88"}
                >
                  <input type="file" accept="audio/*,.m4a,.mp3,.wav,.aac,.ogg" onChange={handleAudioSelect} style={{ display: "none" }} />
                  ♫
                </label>
                )}
                <button onClick={handlePost} disabled={posting || (!newPost.trim() && !postImage && !postAudio)} style={{
                  background: (newPost.trim() || postImage || postAudio) ? RUBY : BORDER, border: "none", borderRadius: 8,
                  padding: "7px 14px", fontSize: 11, fontWeight: 600, color: (newPost.trim() || postImage || postAudio) ? CREAM : SLATE + "66",
                  cursor: (newPost.trim() || postImage || postAudio) ? "pointer" : "default",
                }}>{posting ? "..." : "post"}</button>
              </div>
              {postImagePreview && (
                <div style={{ marginTop: 12, position: "relative", display: "inline-block" }}>
                  <img src={postImagePreview} alt="preview" style={{ maxWidth: "100%", maxHeight: 200, borderRadius: 3, border: `1px solid ${DARK_CREAM}` }} />
                  <button onClick={clearImage} style={{
                    position: "absolute", top: 6, right: 6, width: 24, height: 24, borderRadius: "50%",
                    background: INK + "CC", color: CREAM, border: "none", cursor: "pointer", fontSize: 12,
                    display: "flex", alignItems: "center", justifyContent: "center",
                  }}>×</button>
                </div>
              )}
              {postAudioName && (
                <div style={{ marginTop: 10, display: "flex", alignItems: "center", gap: 8, background: CREAM, borderRadius: 8, padding: "8px 12px", border: `1px solid ${DARK_CREAM}` }}>
                  <span style={{ fontSize: 14, color: RUBY }}>♫</span>
                  <span style={{ fontFamily: "'DM Mono', monospace", fontSize: 11, color: SLATE, flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{postAudioName}</span>
                  <button onClick={clearAudio} style={{
                    background: "none", border: "none", cursor: "pointer", fontSize: 14, color: SLATE + "88",
                    fontFamily: "'DM Mono', monospace", padding: "0 2px",
                  }}>×</button>
                </div>
              )}
            </div>

            {loadingPosts ? (
              <div style={{ textAlign: "center", padding: 40, fontFamily: "'DM Mono', monospace", fontSize: 12, color: SLATE }}>loading...</div>
            ) : posts.length === 0 ? (
              <div style={{ textAlign: "center", padding: 40, fontFamily: "'DM Mono', monospace", fontSize: 12, color: SLATE, lineHeight: 1.6 }}>
                {feedView !== "community"
                  ? `${MEMBERS[feedView]?.name || "they"} hasn't posted here yet. check back soon ✦`
                  : "no posts yet. be the first ✦"}
              </div>
            ) : (
              posts.map((post, i) => (
                <div key={post.id} style={{ animation: `fadeIn 0.35s ease-out ${i * 0.04}s both` }}>
                  <PostCard post={post} currentUserId={user?.id} currentProfile={profile} supabase={supabase} onRefresh={fetchPosts} onViewProfile={(id) => setViewingProfile(id)} />
                </div>
              ))
            )}
          </div>
        )}

        {/* SHOWS TAB */}
        {mainTab === "shows" && (
          <div style={{ animation: "fadeIn 0.3s ease-out", paddingTop: 14 }}>
            <div style={{ background: INK, borderRadius: 3, padding: "28px 22px", marginBottom: 16, position: "relative", overflow: "hidden" }}>
              <div style={{ position: "absolute", inset: 0, background: "radial-gradient(ellipse at 70% 30%, rgba(196,93,62,0.15), transparent 60%)" }} />
              <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 9, color: WARM_GOLD, letterSpacing: "2px", textTransform: "uppercase", marginBottom: 10, position: "relative" }}>on the road · 2026</div>
              <Heading size={34} color={CREAM} style={{ position: "relative" }}>the stamps</Heading>
              <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 13, color: CREAM + "88", marginTop: 6, position: "relative", letterSpacing: "1px" }}>AU · EU · UK</div>
            </div>

            {REGION_ORDER.filter((r) => shows[r]).map((region) => (
              <div key={region} style={{ marginBottom: 10 }}>
                <button onClick={() => setExpandedRegion(expandedRegion === region ? null : region)} style={{
                  width: "100%", background: expandedRegion === region ? INK : OFF_WHITE,
                  border: expandedRegion === region ? "none" : "1px solid #E8E2D8",
                  borderRadius: expandedRegion === region ? "3px 3px 0 0" : 3,
                  padding: "14px 18px", display: "flex", alignItems: "center", justifyContent: "space-between", cursor: "pointer",
                }}>
                  <Heading size={16} color={expandedRegion === region ? CREAM : INK}>{region}</Heading>
                  <span style={{ fontFamily: "'DM Mono', monospace", fontSize: 11, color: expandedRegion === region ? CREAM + "66" : SLATE }}>
                    {shows[region].length} shows {expandedRegion === region ? "−" : "+"}
                  </span>
                </button>
                {expandedRegion === region && (
                  <div style={{ background: OFF_WHITE, border: "1px solid #E8E2D8", borderTop: "none", borderRadius: "0 0 3px 3px" }}>
                    {shows[region].map((show, i) => {
                      const sold = show.status === "sold_out";
                      const attended = myAttendance.has(show.id);
                      const hasCheckin = !!show.checkin_code;
                      const isPast = new Date(show.date + "T23:59:59") < new Date();
                      return (
                        <div key={show.id} style={{
                          padding: "13px 18px",
                          borderBottom: i < shows[region].length - 1 ? `1px solid ${DARK_CREAM}` : "none",
                          opacity: (isPast && !attended) || (sold && !attended) ? 0.35 : isPast ? 0.7 : 1,
                        }}>
                          <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
                            <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 11, color: SLATE, minWidth: 52 }}>{formatShowDate(show.date)}</div>
                            <div style={{ flex: 1, cursor: show.ticket_url && !sold && !isPast ? "pointer" : "default" }} onClick={() => show.ticket_url && !sold && !isPast && window.open(show.ticket_url, "_blank")}>
                              <div style={{ fontSize: 13, fontWeight: 600, color: INK }}>
                                {show.city}{show.country && !["AU", "UK"].includes(show.country) && <span style={{ color: SLATE, fontWeight: 400 }}> {show.country}</span>}
                              </div>
                              <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 10, color: SLATE + "AA" }}>{show.venue}</div>
                            </div>
                            <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                              {attended ? (
                                <span style={{ fontFamily: "'DM Mono', monospace", fontSize: 9, color: SAGE, letterSpacing: "0.5px" }}>✦ attended</span>
                              ) : isPast ? (
                                <span style={{ fontFamily: "'DM Mono', monospace", fontSize: 9, color: SLATE + "66", letterSpacing: "0.8px", textTransform: "uppercase" }}>past</span>
                              ) : hasCheckin && !sold ? (
                                <button onClick={(e) => { e.stopPropagation(); setCheckinShow(show); setCheckinCode(""); setCheckinStatus(""); }} style={{
                                  background: WARM_GOLD, color: INK, border: "none", borderRadius: 2,
                                  padding: "5px 10px", fontSize: 9, fontWeight: 700, cursor: "pointer",
                                  fontFamily: "'DM Mono', monospace", letterSpacing: "0.5px",
                                }}>check in</button>
                              ) : null}
                              {isPast && !attended ? null : sold ? (
                                <span style={{ fontFamily: "'DM Mono', monospace", fontSize: 9, color: RUST, letterSpacing: "0.8px", textTransform: "uppercase" }}>sold out</span>
                              ) : show.status === "door_sales" && !isPast ? (
                                <span style={{ fontFamily: "'DM Mono', monospace", fontSize: 9, color: WARM_GOLD, letterSpacing: "0.8px", textTransform: "uppercase" }}>on the door</span>
                              ) : show.ticket_url && !isPast ? (
                                <a href={show.ticket_url} target="_blank" rel="noopener noreferrer" onClick={(e) => e.stopPropagation()} style={{ background: INK, color: CREAM, border: "none", borderRadius: 2, padding: "6px 12px", fontSize: 10, fontWeight: 600, textDecoration: "none" }}>tickets</a>
                              ) : !isPast ? (
                                <span style={{ fontFamily: "'DM Mono', monospace", fontSize: 9, color: SAGE, letterSpacing: "0.8px", textTransform: "uppercase" }}>on sale</span>
                              ) : null}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {/* STAMPS TAB */}
        {mainTab === "stamps" && (
          <div style={{ animation: "fadeIn 0.3s ease-out", paddingTop: 14 }}>
            <div style={{ background: INK, borderRadius: 3, padding: "30px 22px", textAlign: "center", marginBottom: 16, position: "relative", overflow: "hidden" }}>
              <div style={{ position: "absolute", inset: 0, background: `radial-gradient(ellipse at 50% 0%, ${RUST}15, transparent 70%)` }} />
              <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 9, color: WARM_GOLD, letterSpacing: "2px", textTransform: "uppercase", marginBottom: 12, position: "relative" }}>your collection</div>
              <Heading size={56} color={CREAM} style={{ position: "relative" }}>{userStamps}</Heading>
              <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 10, color: CREAM + "77", marginTop: 6, position: "relative" }}>stamps collected · {currentLevel.name}</div>
              {nextLevel && (
                <>
                  <div style={{ marginTop: 18, background: CREAM + "15", borderRadius: 2, height: 4, overflow: "hidden", position: "relative" }}>
                    <div style={{ width: `${(userStamps / nextLevel.stamps) * 100}%`, height: "100%", background: `linear-gradient(90deg, ${RUST}, ${WARM_GOLD})`, borderRadius: 2 }} />
                  </div>
                  <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 9, color: CREAM + "55", marginTop: 6, position: "relative" }}>{nextLevel.stamps - userStamps} stamps to {nextLevel.name} {nextLevel.icon}</div>
                </>
              )}
            </div>

            {/* How it works */}
            <div style={{
              background: OFF_WHITE, borderRadius: 3, padding: "22px 20px", marginBottom: 16,
              border: `1px solid ${DARK_CREAM}`,
            }}>
              <Heading size={18} style={{ marginBottom: 14 }}>how stamps work</Heading>

              <div style={{ display: "flex", gap: 8, marginBottom: 16, flexWrap: "wrap" }}>
                {[
                  { icon: "✦", title: "earn", desc: "post, comment, check in at shows, refer friends" },
                  { icon: "◉", title: "level up", desc: "hit milestones to unlock new levels" },
                  { icon: "♛", title: "claim", desc: "each level unlocks a real reward from the band" },
                ].map((step, i) => (
                  <div key={step.title} style={{ flex: "1 1 80px", textAlign: "center", minWidth: 80 }}>
                    <div style={{ fontSize: 18, marginBottom: 4 }}>{step.icon}</div>
                    <div style={{ fontSize: 11, fontWeight: 700, color: INK, marginBottom: 3 }}>{step.title}</div>
                    <div style={{ fontSize: 10, color: SLATE, lineHeight: 1.4 }}>{step.desc}</div>
                  </div>
                ))}
              </div>

              <div style={{ borderTop: `1px solid ${DARK_CREAM}`, paddingTop: 14 }}>
                <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 9, color: SLATE, letterSpacing: "1px", textTransform: "uppercase", marginBottom: 10 }}>the journey</div>
                {STAMP_LEVELS.map((level, i) => {
                  const unlocked = userStamps >= level.stamps;
                  return (
                    <div key={level.key} style={{
                      display: "flex", alignItems: "flex-start", gap: 12, marginBottom: i < STAMP_LEVELS.length - 1 ? 12 : 0,
                    }}>
                      <div style={{
                        display: "flex", flexDirection: "column", alignItems: "center", flexShrink: 0,
                      }}>
                        <div style={{
                          width: 28, height: 28, borderRadius: "50%",
                          background: unlocked ? INK : DARK_CREAM,
                          color: unlocked ? WARM_GOLD : SLATE,
                          display: "flex", alignItems: "center", justifyContent: "center",
                          fontSize: 13, fontFamily: "'DM Mono', monospace",
                        }}>{level.icon}</div>
                        {i < STAMP_LEVELS.length - 1 && (
                          <div style={{ width: 1, height: 16, background: DARK_CREAM, marginTop: 4 }} />
                        )}
                      </div>
                      <div style={{ paddingTop: 2 }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                          <span style={{ fontSize: 12, fontWeight: 600, color: unlocked ? INK : SLATE }}>{level.name}</span>
                          <span style={{ fontFamily: "'DM Mono', monospace", fontSize: 9, color: unlocked ? WARM_GOLD : SLATE + "77" }}>{level.stamps > 0 ? `${level.stamps} ✦` : "start"}</span>
                          {unlocked && <span style={{ fontFamily: "'DM Mono', monospace", fontSize: 8, color: SAGE }}>unlocked</span>}
                        </div>
                        {level.reward && (
                          <div style={{ fontSize: 11, color: SLATE, marginTop: 2, lineHeight: 1.4 }}>
                            {level.rewardDesc}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 9, color: SLATE, letterSpacing: "1.5px", textTransform: "uppercase", marginBottom: 10 }}>your rewards</div>
            {STAMP_LEVELS.map((level) => {
              const unlocked = userStamps >= level.stamps;
              const claimed = rewardClaims.some((c) => c.level_key === level.key);
              const claimStatus = rewardClaims.find((c) => c.level_key === level.key)?.status;
              return (
                <div key={level.name} style={{
                  background: unlocked ? OFF_WHITE : CREAM, borderRadius: 3, padding: "16px 18px", marginBottom: 8,
                  border: `1px solid ${unlocked ? WARM_GOLD + "33" : "#E8E2D8"}`,
                  opacity: unlocked ? 1 : 0.45,
                }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
                    <div style={{
                      width: 42, height: 42, borderRadius: 3, background: unlocked ? INK : DARK_CREAM,
                      color: unlocked ? WARM_GOLD : SLATE, display: "flex", alignItems: "center", justifyContent: "center",
                      fontSize: 18, fontFamily: "'DM Mono', monospace",
                    }}>{level.icon}</div>
                    <div style={{ flex: 1 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <span style={{ fontSize: 14, fontWeight: 700, color: INK }}>{level.name}</span>
                        <span style={{ fontFamily: "'DM Mono', monospace", fontSize: 10, color: unlocked ? WARM_GOLD : SLATE }}>{level.stamps > 0 ? `${level.stamps} ✦` : "✓"}</span>
                      </div>
                      <div style={{ fontSize: 11.5, color: SLATE, marginTop: 3, lineHeight: 1.4 }}>{level.rewardDesc}</div>
                    </div>
                  </div>
                  {/* Claim button for unlocked rewards */}
                  {unlocked && level.reward && (
                    <div style={{ marginTop: 12, paddingTop: 12, borderTop: `1px solid ${DARK_CREAM}` }}>
                      {claimed ? (
                        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                          <span style={{ fontFamily: "'DM Mono', monospace", fontSize: 10, color: SAGE }}>
                            {claimStatus === "pending" ? "✦ claimed - pending" :
                             claimStatus === "approved" ? "✦ approved" :
                             claimStatus === "shipped" ? "✦ shipped" :
                             claimStatus === "completed" ? "✦ received" : "✦ " + claimStatus}
                          </span>
                        </div>
                      ) : (
                        <button onClick={() => setClaimingLevel(level)} style={{
                          padding: "8px 16px", background: WARM_GOLD, color: INK, border: "none",
                          borderRadius: 3, fontSize: 11, fontWeight: 600, cursor: "pointer",
                          fontFamily: "'DM Sans', sans-serif",
                        }}>claim reward ✦</button>
                      )}
                    </div>
                  )}
                </div>
              );
            })}

            <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 9, color: SLATE, letterSpacing: "1.5px", textTransform: "uppercase", marginTop: 18, marginBottom: 10 }}>earn stamps</div>
            <div style={{ background: OFF_WHITE, borderRadius: 3, padding: "16px 18px", border: "1px solid #E8E2D8", marginBottom: 18 }}>
              {stampActions.map((action, i) => (
                <div key={action.id} style={{ display: "flex", alignItems: "center", gap: 12, padding: "9px 0", borderBottom: i < stampActions.length - 1 ? `1px solid ${DARK_CREAM}` : "none" }}>
                  <span style={{ fontFamily: "'DM Mono', monospace", fontSize: 14, color: SLATE, width: 20, textAlign: "center" }}>{action.action_type === "auto" ? "↗" : "★"}</span>
                  <span style={{ flex: 1, fontSize: 12, color: INK + "CC" }}>{action.name}</span>
                  <span style={{ fontFamily: "'DM Mono', monospace", fontSize: 11, fontWeight: 500, color: RUST }}>+{action.points}</span>
                </div>
              ))}
            </div>

            {topCollectors.length > 0 && (
              <>
                <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 9, color: SLATE, letterSpacing: "1.5px", textTransform: "uppercase", marginBottom: 10 }}>top collectors</div>
                <div style={{ background: OFF_WHITE, borderRadius: 3, padding: "12px 18px", border: "1px solid #E8E2D8" }}>
                  {topCollectors.map((u, i) => (
                    <div key={u.display_name} style={{ display: "flex", alignItems: "center", gap: 12, padding: "10px 0", borderBottom: i < topCollectors.length - 1 ? `1px solid ${DARK_CREAM}` : "none" }}>
                      <span style={{ fontFamily: "'DM Mono', monospace", fontSize: 12, color: i === 0 ? WARM_GOLD : SLATE, width: 20, textAlign: "center" }}>{i + 1}</span>
                      <span style={{ flex: 1, fontSize: 13, fontWeight: 500, color: INK }}>{u.display_name?.toLowerCase()}</span>
                      <span style={{ fontFamily: "'DM Mono', monospace", fontSize: 11, color: SLATE }}>{u.stamp_count} ✦</span>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
        )}

        {/* YOU TAB */}
        {mainTab === "you" && profile && (
          <div style={{ animation: "fadeIn 0.3s ease-out", paddingTop: 14 }}>
            <div style={{
              background: `linear-gradient(145deg, ${RUBY}15, ${BLUSH}15, ${SURFACE})`,
              borderRadius: 12, padding: "32px 22px 28px", textAlign: "center",
              border: `1px solid ${BORDER}`, marginBottom: 14, position: "relative", overflow: "hidden",
            }}>
              {/* Subtle decorative glow */}
              <div style={{ position: "absolute", top: -30, right: -30, width: 120, height: 120, background: `radial-gradient(circle, ${HOT_PINK}12, transparent 70%)`, pointerEvents: "none" }} />

              {profile.avatar_url ? (
                <img src={profile.avatar_url} alt="" style={{ width: 80, height: 80, borderRadius: 12, objectFit: "cover", margin: "0 auto 16px", display: "block", border: `3px solid ${BLUSH}44` }} />
              ) : (
                <div style={{
                  width: 80, height: 80, borderRadius: 12,
                  background: `linear-gradient(135deg, ${RUBY}22, ${HOT_PINK}22)`,
                  display: "flex", alignItems: "center", justifyContent: "center",
                  fontSize: 30, fontFamily: "'DM Sans', sans-serif", fontWeight: 700,
                  margin: "0 auto 16px", color: RUBY, border: `3px solid ${BLUSH}33`,
                }}>
                  {profile.display_name?.charAt(0)?.toLowerCase() || "✦"}
                </div>
              )}
              <Heading size={24} color={INK}>{profile.display_name?.toLowerCase()}</Heading>
              {profile.bio && <p style={{ fontSize: 13, color: SLATE, marginTop: 8, lineHeight: 1.5, fontStyle: "italic", maxWidth: 280, margin: "8px auto 0" }}>{profile.bio}</p>}
              {profile.city && <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 10, color: BLUSH, marginTop: 6 }}>📍 {profile.city}</div>}

              {/* Level badge */}
              <div style={{
                display: "inline-block", marginTop: 12,
                background: RUBY + "11", border: `1px solid ${RUBY}22`, borderRadius: 20,
                padding: "4px 14px",
              }}>
                <span style={{ fontFamily: "'DM Mono', monospace", fontSize: 10, color: RUBY, fontWeight: 500 }}>
                  {currentLevel.icon} {currentLevel.name.toLowerCase()}
                </span>
              </div>

              {/* Stats */}
              <div style={{ display: "flex", justifyContent: "center", gap: 40, marginTop: 20 }}>
                {[
                  { label: "stamps", value: userStamps, color: RUBY },
                  { label: "shows", value: profile.show_count || 0, color: HOT_PINK },
                  { label: "referrals", value: profile.referral_count || 0, color: WARM_GOLD },
                ].map((s) => (
                  <div key={s.label}>
                    <div style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 28, fontWeight: 700, color: s.color }}>{s.value}</div>
                    <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 8, color: SLATE, letterSpacing: 1.5, textTransform: "uppercase" }}>{s.label}</div>
                  </div>
                ))}
              </div>
            </div>

            <div style={{ background: SURFACE, borderRadius: 12, border: `1px solid ${BORDER}`, overflow: "hidden" }}>
              {(profile.role === "admin" || profile.role === "band") && (
                <div onClick={() => window.location.href = "/dashboard"} style={{
                  display: "flex", alignItems: "center", gap: 14, padding: "14px 18px",
                  borderBottom: `1px solid ${DARK_CREAM}`, cursor: "pointer", background: WARM_GOLD + "08",
                }}
                  onMouseEnter={(e) => (e.currentTarget.style.background = WARM_GOLD + "15")}
                  onMouseLeave={(e) => (e.currentTarget.style.background = WARM_GOLD + "08")}
                >
                  <span style={{ fontFamily: "'DM Mono', monospace", fontSize: 15, color: WARM_GOLD, width: 24, textAlign: "center" }}>◈</span>
                  <span style={{ fontSize: 13, color: INK, flex: 1, fontWeight: 600 }}>dashboard</span>
                  <span style={{ fontFamily: "'DM Mono', monospace", color: WARM_GOLD, fontSize: 14 }}>→</span>
                </div>
              )}
              {[
                { label: "edit profile", icon: "✎", action: () => setShowEditProfile(true), soon: false },
                { label: "notifications", icon: "◈", action: null, soon: true },
              ].map((item) => (
                <div key={item.label} onClick={item.action} style={{
                  display: "flex", alignItems: "center", gap: 14, padding: "14px 18px",
                  borderBottom: `1px solid ${DARK_CREAM}`, cursor: item.action ? "pointer" : "default",
                  opacity: item.soon ? 0.5 : 1,
                }}
                  onMouseEnter={(e) => item.action && (e.currentTarget.style.background = CREAM)}
                  onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
                >
                  <span style={{ fontFamily: "'DM Mono', monospace", fontSize: 15, color: SLATE, width: 24, textAlign: "center" }}>{item.icon}</span>
                  <span style={{ fontSize: 13, color: INK, flex: 1 }}>{item.label}</span>
                  {item.soon ? (
                    <span style={{ fontFamily: "'DM Mono', monospace", fontSize: 9, color: SLATE + "77", letterSpacing: "0.5px" }}>coming soon</span>
                  ) : (
                    <span style={{ fontFamily: "'DM Mono', monospace", color: SLATE + "55", fontSize: 14 }}>→</span>
                  )}
                </div>
              ))}

              {/* Invite a friend - referral link */}
              <div style={{
                padding: "14px 18px", borderBottom: `1px solid ${DARK_CREAM}`,
              }}>
                <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 10 }}>
                  <span style={{ fontFamily: "'DM Mono', monospace", fontSize: 15, color: SAGE, width: 24, textAlign: "center" }}>⊕</span>
                  <span style={{ fontSize: 13, color: INK, flex: 1, fontWeight: 600 }}>invite a friend</span>
                  {(profile.referral_count || 0) > 0 && (
                    <span style={{ fontFamily: "'DM Mono', monospace", fontSize: 10, color: SAGE }}>{profile.referral_count} invited</span>
                  )}
                </div>
                <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                  <input
                    type="text"
                    readOnly
                    value={profile.referral_code ? `${typeof window !== "undefined" ? window.location.origin : ""}/join/${profile.referral_code}` : "loading..."}
                    style={{
                      flex: 1, padding: "8px 10px", background: CREAM, border: `1px solid ${DARK_CREAM}`,
                      borderRadius: 3, fontSize: 11, color: SLATE, fontFamily: "'DM Mono', monospace",
                      outline: "none",
                    }}
                  />
                  <button
                    onClick={() => {
                      const link = `${window.location.origin}/join/${profile.referral_code}`;
                      navigator.clipboard.writeText(link).then(() => {
                        setCopiedLink(true);
                        setTimeout(() => setCopiedLink(false), 2000);
                      });
                    }}
                    style={{
                      padding: "8px 14px", background: copiedLink ? SAGE : INK, color: CREAM,
                      border: "none", borderRadius: 3, fontSize: 11, fontWeight: 600, cursor: "pointer",
                      transition: "background 0.2s",
                    }}
                  >
                    {copiedLink ? "copied ✦" : "copy"}
                  </button>
                </div>
                <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 9, color: SLATE + "77", marginTop: 6 }}>
                  you both earn 25 stamps when they join
                </div>
              </div>
              <div onClick={signOut} style={{
                display: "flex", alignItems: "center", gap: 14, padding: "14px 18px", cursor: "pointer",
                borderBottom: `1px solid ${DARK_CREAM}`,
              }}
                onMouseEnter={(e) => (e.currentTarget.style.background = CREAM)}
                onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
              >
                <span style={{ fontFamily: "'DM Mono', monospace", fontSize: 15, color: RUST, width: 24, textAlign: "center" }}>↪</span>
                <span style={{ fontSize: 13, color: RUST, flex: 1 }}>sign out</span>
              </div>
              <div onClick={async () => {
                if (!confirm("are you sure you want to delete your account? all your posts, comments, stamps, and data will be permanently removed.")) return;
                if (!confirm("this cannot be undone. are you really sure?")) return;
                const { error } = await supabase.rpc("delete_own_account");
                if (error) { alert("something went wrong: " + error.message); return; }
                signOut();
              }} style={{
                display: "flex", alignItems: "center", gap: 14, padding: "14px 18px", cursor: "pointer",
              }}
                onMouseEnter={(e) => (e.currentTarget.style.background = CREAM)}
                onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
              >
                <span style={{ fontFamily: "'DM Mono', monospace", fontSize: 15, color: SLATE + "55", width: 24, textAlign: "center" }}>×</span>
                <span style={{ fontSize: 12, color: SLATE + "77" }}>delete account</span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* User Profile Modal */}
      {viewingProfile && (
        <UserProfileModal userId={viewingProfile} supabase={supabase} onClose={() => setViewingProfile(null)} stampLevels={STAMP_LEVELS} />
      )}

      {/* BOTTOM NAV */}
      <div style={{ position: "fixed", bottom: 0, left: 0, right: 0, zIndex: 100, background: SURFACE + "F0", backdropFilter: "blur(16px)", borderTop: `1px solid ${BORDER}`, paddingBottom: "env(safe-area-inset-bottom, 0px)" }}>
        <div style={{ maxWidth: 480, margin: "0 auto", display: "flex", justifyContent: "space-around", padding: "6px 0 12px" }}>
          {mainTabs.map((tab) => (
            <button key={tab.id} onClick={() => { setMainTab(tab.id); if (tab.id === "feed") setFeedView("community"); }} style={{
              background: "none", border: "none", cursor: "pointer", display: "flex", flexDirection: "column", alignItems: "center", gap: 2, padding: "10px 20px", minWidth: 56,
            }}>
              <span style={{ fontFamily: "'DM Mono', monospace", fontSize: 18, color: mainTab === tab.id ? RUBY : SLATE + "66" }}>{tab.icon}</span>
              <span style={{ fontFamily: "'DM Mono', monospace", fontSize: 9, fontWeight: mainTab === tab.id ? 500 : 400, color: mainTab === tab.id ? INK : SLATE + "66" }}>{tab.label}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
