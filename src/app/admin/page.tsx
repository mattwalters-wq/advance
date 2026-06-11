'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'

const supabase = createClient()
const ADMIN_EMAIL = process.env.NEXT_PUBLIC_ADMIN_EMAIL || 'mattwaltersconsulting@gmail.com'

export default function AdminPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [tab, setTab] = useState<'overview' | 'users' | 'artists' | 'tours' | 'activity'>('overview')
  const [data, setData] = useState<any>({})
  const [darkMode, setDarkMode] = useState(true)
  const [search, setSearch] = useState('')
  const [drillUser, setDrillUser] = useState<any>(null)
  const [drillData, setDrillData] = useState<any>(null)
  const [drillLoading, setDrillLoading] = useState(false)
  const [impersonating, setImpersonating] = useState(false)
  const [toast, setToast] = useState<string | null>(null)

  useEffect(() => { checkAndLoad() }, [])

  function showToast(msg: string) {
    setToast(msg)
    setTimeout(() => setToast(null), 3500)
  }

  async function getToken() {
    const { data: { session } } = await supabase.auth.getSession()
    return session?.access_token
  }

  async function checkAndLoad() {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user || user.email !== ADMIN_EMAIL) { router.push('/dashboard'); return }
    await loadAll()
    setLoading(false)
  }

  async function loadAll() {
    setRefreshing(true)
    const token = await getToken()
    const res = await fetch('/api/admin', { headers: { 'Authorization': `Bearer ${token}` } })
    if (!res.ok) { router.push('/dashboard'); return }
    setData(await res.json())
    setRefreshing(false)
  }

  async function drillIntoUser(user: any) {
    setDrillUser(user)
    setDrillLoading(true)
    const token = await getToken()
    const res = await fetch(`/api/admin?user_id=${user.id}`, { headers: { 'Authorization': `Bearer ${token}` } })
    if (res.ok) setDrillData(await res.json())
    setDrillLoading(false)
  }

  async function impersonate(userId: string) {
    const url = `/dashboard?superadmin=1&org_id=${userId}`
    window.open(url, '_blank')
    showToast('Opening account in god mode...')
  }

  async function resetPassword(userId: string, email: string) {
    if (!confirm(`Send password reset email to ${email}?`)) return
    const token = await getToken()
    const res = await fetch('/api/admin', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ user_id: userId, action: 'reset_password' })
    })
    const result = await res.json()
    showToast(result.success ? `Password reset sent to ${email}` : `Error: ${result.error}`)
  }

  const bg = darkMode ? '#0A0908' : '#F7F3EE'
  const card = darkMode ? '#0F0E0C' : '#fff'
  const card2 = darkMode ? '#161412' : '#F9F6F2'
  const text = darkMode ? '#F4EFE6' : '#1A1714'
  const muted = darkMode ? '#4A4540' : '#8A8580'
  const border = darkMode ? '#1E1C18' : '#E8E0D4'
  const accent = '#C4622D'
  const green = '#2d7a4f'

  const { users = [], artists = [], tours = [], shows = [], travel = [], accommodation = [], guests = [], showPeople = [], setlists = [] } = data

  const filteredUsers = users.filter((u: any) =>
    !search || u.full_name?.toLowerCase().includes(search.toLowerCase()) || u.email?.toLowerCase().includes(search.toLowerCase())
  )
  const filteredTours = tours.filter((t: any) =>
    !search || t.name?.toLowerCase().includes(search.toLowerCase()) || t.artists?.name?.toLowerCase().includes(search.toLowerCase())
  )
  const filteredArtists = artists.filter((a: any) =>
    !search || a.name?.toLowerCase().includes(search.toLowerCase())
  )

  function fmtDate(d: string) {
    if (!d) return '-'
    return new Date(d).toLocaleDateString('en-AU', { day: 'numeric', month: 'short', year: 'numeric' })
  }
  function fmtRelative(d: string) {
    if (!d) return 'never'
    const diff = Date.now() - new Date(d).getTime()
    const mins = Math.floor(diff / 60000)
    if (mins < 60) return `${mins}m ago`
    const hrs = Math.floor(mins / 60)
    if (hrs < 24) return `${hrs}h ago`
    const days = Math.floor(hrs / 24)
    if (days < 30) return `${days}d ago`
    return fmtDate(d)
  }

  function Stat({ label, value, sub, color }: any) {
    return (
      <div style={{ background: card, border: `1px solid ${border}`, borderRadius: 12, padding: '18px 22px' }}>
        <div style={{ fontFamily: 'monospace', fontSize: 9, letterSpacing: '0.2em', color: muted, marginBottom: 8 }}>{label}</div>
        <div style={{ fontSize: 32, fontWeight: 700, color: color || text, lineHeight: 1, fontVariantNumeric: 'tabular-nums' }}>{value}</div>
        {sub && <div style={{ fontSize: 11, color: muted, marginTop: 6 }}>{sub}</div>}
      </div>
    )
  }

  function Tag({ label, color }: any) {
    return (
      <span style={{ fontFamily: 'monospace', fontSize: 9, letterSpacing: 1, padding: '2px 8px', borderRadius: 10, background: color ? color + '22' : (darkMode ? '#1E1C18' : '#F0EBE2'), color: color || muted, border: `1px solid ${color ? color + '44' : border}` }}>
        {label}
      </span>
    )
  }

  if (loading) return (
    <div style={{ background: '#0A0908', minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'monospace', fontSize: 11, letterSpacing: '0.2em', color: '#2A2520' }}>
      LOADING GOD MODE
    </div>
  )

  // User drilldown panel
  if (drillUser) {
    const dd = drillData || {}
    const userTours = dd.tours || []
    const userShows = dd.shows || []
    const userArtists = dd.artists || []
    return (
      <div style={{ background: bg, minHeight: '100vh', color: text, fontFamily: '"Georgia", serif' }}>
        <style>{`* { box-sizing: border-box; } ::-webkit-scrollbar { width: 4px; } ::-webkit-scrollbar-thumb { background: ${border}; }`}</style>

        {/* Drilldown header */}
        <div style={{ background: darkMode ? '#0F0E0C' : '#1A1714', padding: '0 28px', height: 56, display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: `1px solid ${border}`, position: 'sticky', top: 0, zIndex: 10 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            <button onClick={() => { setDrillUser(null); setDrillData(null) }}
              style={{ background: 'transparent', border: `1px solid ${border}`, borderRadius: 6, color: muted, cursor: 'pointer', fontSize: 11, fontFamily: 'monospace', padding: '5px 10px' }}>
              ← BACK
            </button>
            <span style={{ fontFamily: 'monospace', fontSize: 10, letterSpacing: 2, color: accent }}>USER DRILLDOWN</span>
            <span style={{ fontSize: 14, color: text, fontWeight: 600 }}>{drillUser.full_name || drillUser.email}</span>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button onClick={() => impersonate(drillUser.id)} disabled={impersonating}
              style={{ padding: '6px 14px', background: accent, border: 'none', borderRadius: 6, color: '#fff', cursor: 'pointer', fontFamily: 'monospace', fontSize: 10, letterSpacing: 1 }}>
              {impersonating ? '...' : '⚡ ENTER ACCOUNT'}
            </button>
            <button onClick={() => resetPassword(drillUser.id, drillUser.email)}
              style={{ padding: '6px 14px', background: 'transparent', border: `1px solid ${border}`, borderRadius: 6, color: muted, cursor: 'pointer', fontFamily: 'monospace', fontSize: 10, letterSpacing: 1 }}>
              🔑 RESET PW
            </button>
          </div>
        </div>

        <div style={{ maxWidth: 1100, margin: '0 auto', padding: '28px 24px' }}>
          {drillLoading ? (
            <div style={{ textAlign: 'center', padding: '80px 0', fontFamily: 'monospace', fontSize: 11, letterSpacing: 2, color: muted }}>LOADING...</div>
          ) : (
            <>
              {/* User info card */}
              <div style={{ background: card, border: `1px solid ${border}`, borderRadius: 12, padding: '20px 24px', marginBottom: 24, display: 'flex', gap: 32, flexWrap: 'wrap', alignItems: 'center' }}>
                <div style={{ width: 52, height: 52, borderRadius: 12, background: accent, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22, fontWeight: 700, color: '#fff', fontStyle: 'italic', flexShrink: 0 }}>
                  {(drillUser.full_name || drillUser.email || '?').charAt(0).toUpperCase()}
                </div>
                <div style={{ flex: 1, minWidth: 200 }}>
                  <div style={{ fontSize: 20, fontWeight: 700, marginBottom: 2 }}>{drillUser.full_name || 'No name'}</div>
                  <div style={{ fontSize: 13, color: muted, fontFamily: 'monospace' }}>{drillUser.email}</div>
                </div>
                <div style={{ display: 'flex', gap: 24, flexWrap: 'wrap' }}>
                  <div><div style={{ fontFamily: 'monospace', fontSize: 9, letterSpacing: 2, color: muted, marginBottom: 4 }}>JOINED</div><div style={{ fontSize: 13 }}>{fmtDate(drillUser.created_at)}</div></div>
                  <div><div style={{ fontFamily: 'monospace', fontSize: 9, letterSpacing: 2, color: muted, marginBottom: 4 }}>LAST SIGN IN</div><div style={{ fontSize: 13 }}>{fmtRelative(drillUser.last_sign_in)}</div></div>
                  <div><div style={{ fontFamily: 'monospace', fontSize: 9, letterSpacing: 2, color: muted, marginBottom: 4 }}>ORG ID</div><div style={{ fontSize: 11, fontFamily: 'monospace', color: muted }}>{drillUser.id?.slice(0, 20)}...</div></div>
                </div>
              </div>

              {/* Stats */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: 12, marginBottom: 28 }}>
                <Stat label="ARTISTS" value={userArtists.length} />
                <Stat label="TOURS" value={userTours.length} />
                <Stat label="SHOWS" value={userShows.filter((s: any) => !s.type || s.type === 'show').length} />
                <Stat label="TRAVEL LEGS" value={(dd.travel || []).length} />
                <Stat label="GUESTS" value={(dd.guests || []).reduce((s: number, g: any) => s + 1 + (g.plus_n || 0), 0)} />
              </div>

              {/* Artists */}
              {userArtists.length > 0 && (
                <div style={{ background: card, border: `1px solid ${border}`, borderRadius: 12, overflow: 'hidden', marginBottom: 16 }}>
                  <div style={{ padding: '12px 20px', borderBottom: `1px solid ${border}`, fontFamily: 'monospace', fontSize: 9, letterSpacing: 2, color: muted }}>ARTISTS — {userArtists.length}</div>
                  {userArtists.map((a: any, i: number) => {
                    const aTours = userTours.filter((t: any) => t.artist_id === a.id)
                    return (
                      <div key={a.id} style={{ padding: '14px 20px', borderBottom: i < userArtists.length - 1 ? `1px solid ${border}` : 'none', display: 'flex', alignItems: 'center', gap: 14 }}>
                        <div style={{ width: 32, height: 32, borderRadius: 8, background: a.color || accent, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: 13, fontWeight: 700, fontStyle: 'italic', flexShrink: 0 }}>
                          {a.name?.charAt(0)}
                        </div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontWeight: 600, fontSize: 14 }}>{a.name}</div>
                          {a.project && <div style={{ fontSize: 12, color: muted, fontStyle: 'italic' }}>{a.project}</div>}
                        </div>
                        <Tag label={`${aTours.length} tour${aTours.length !== 1 ? 's' : ''}`} />
                      </div>
                    )
                  })}
                </div>
              )}

              {/* Tours */}
              {userTours.length > 0 && (
                <div style={{ background: card, border: `1px solid ${border}`, borderRadius: 12, overflow: 'hidden', marginBottom: 16 }}>
                  <div style={{ padding: '12px 20px', borderBottom: `1px solid ${border}`, fontFamily: 'monospace', fontSize: 9, letterSpacing: 2, color: muted }}>TOURS — {userTours.length}</div>
                  {userTours.map((t: any, i: number) => {
                    const tShows = userShows.filter((s: any) => s.tour_id === t.id && (!s.type || s.type === 'show'))
                    const statusColors: Record<string, string> = { confirmed: green, routing: '#B8860B', completed: muted }
                    return (
                      <div key={t.id} style={{ padding: '12px 20px', borderBottom: i < userTours.length - 1 ? `1px solid ${border}` : 'none', display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
                        <div style={{ flex: 1, minWidth: 200 }}>
                          <div style={{ fontWeight: 600, fontSize: 14 }}>{t.name}</div>
                          <div style={{ fontSize: 12, color: muted, fontStyle: 'italic' }}>{t.artists?.name}</div>
                        </div>
                        <Tag label={t.status || 'routing'} color={statusColors[t.status]} />
                        <Tag label={`${tShows.length} shows`} />
                        <div style={{ fontSize: 12, color: muted }}>{fmtDate(t.created_at)}</div>
                      </div>
                    )
                  })}
                </div>
              )}

              {userArtists.length === 0 && userTours.length === 0 && (
                <div style={{ textAlign: 'center', padding: '60px 0', color: muted, fontStyle: 'italic' }}>No data yet for this user.</div>
              )}
            </>
          )}
        </div>
      </div>
    )
  }

  // Main admin dashboard
  const newUsersThisWeek = users.filter((u: any) => {
    const d = new Date(u.created_at)
    const week = new Date(); week.setDate(week.getDate() - 7)
    return d > week
  }).length

  const activeToursCount = tours.filter((t: any) => {
    if (!t.end_date) return true
    return new Date(t.end_date) >= new Date()
  }).length

  const totalGuests = guests.reduce((s: number, g: any) => s + 1 + (g.plus_n || 0), 0)
  const totalSetlistSongs = setlists.reduce((s: number, sl: any) => s + (Array.isArray(sl.songs) ? sl.songs.length : 0), 0)

  return (
    <div style={{ background: bg, minHeight: '100vh', fontFamily: '"Georgia", serif', color: text }}>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,700;1,400&display=swap'); * { box-sizing: border-box; } ::-webkit-scrollbar { width: 4px; } ::-webkit-scrollbar-thumb { background: ${border}; }`}</style>

      {/* Toast */}
      {toast && (
        <div style={{ position: 'fixed', top: 20, right: 20, background: card, border: `1px solid ${border}`, borderRadius: 8, padding: '12px 18px', fontFamily: 'monospace', fontSize: 12, color: text, zIndex: 9999, boxShadow: '0 4px 20px rgba(0,0,0,0.3)' }}>
          {toast}
        </div>
      )}

      {/* Header */}
      <div style={{ background: darkMode ? '#0F0E0C' : '#1A1714', padding: '0 28px', height: 56, display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: `1px solid ${border}`, position: 'sticky', top: 0, zIndex: 10 }}>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 12 }}>
          <span style={{ fontFamily: '"Playfair Display", Georgia, serif', fontSize: 20, fontStyle: 'italic', color: '#F4EFE6' }}>Advance</span>
          <span style={{ fontFamily: 'monospace', fontSize: 9, letterSpacing: '0.25em', color: accent }}>GOD MODE ✦</span>
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search users, tours, artists..."
            style={{ padding: '6px 12px', background: darkMode ? '#1A1714' : '#2A2520', border: `1px solid ${border}`, borderRadius: 6, color: '#F4EFE6', fontSize: 12, fontFamily: '"Georgia", serif', outline: 'none', width: 240 }} />
          <button onClick={loadAll} disabled={refreshing}
            style={{ padding: '6px 12px', background: 'transparent', border: `1px solid ${border}`, borderRadius: 6, color: muted, cursor: 'pointer', fontSize: 11, fontFamily: 'monospace' }}>
            {refreshing ? '...' : '↺ REFRESH'}
          </button>
          <button onClick={() => setDarkMode(!darkMode)} style={{ padding: '6px 10px', background: 'transparent', border: `1px solid ${border}`, borderRadius: 6, color: muted, cursor: 'pointer', fontSize: 12 }}>{darkMode ? '☀️' : '🌙'}</button>
          <button onClick={() => router.push('/dashboard')} style={{ padding: '6px 12px', background: 'transparent', border: `1px solid ${border}`, borderRadius: 6, color: muted, cursor: 'pointer', fontSize: 11, fontFamily: 'monospace' }}>← DASHBOARD</button>
        </div>
      </div>

      <div style={{ maxWidth: 1200, margin: '0 auto', padding: '28px 24px' }}>

        {/* Stats */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 12, marginBottom: 28 }}>
          <Stat label="USERS" value={users.length} sub={`+${newUsersThisWeek} this week`} />
          <Stat label="ARTISTS" value={artists.length} />
          <Stat label="ACTIVE TOURS" value={activeToursCount} sub={`${tours.length} total`} />
          <Stat label="SHOWS" value={shows.filter((s: any) => !s.type || s.type === 'show').length} />
          <Stat label="TRAVEL LEGS" value={travel.length} />
          <Stat label="HOTELS" value={accommodation.length} />
          <Stat label="GUEST HEADS" value={totalGuests} />
          <Stat label="SETLIST SONGS" value={totalSetlistSongs} />
        </div>

        {/* Tabs */}
        <div style={{ display: 'flex', gap: 2, background: darkMode ? '#111' : '#EDE8DF', borderRadius: 10, padding: 3, marginBottom: 24, width: 'fit-content' }}>
          {(['overview', 'users', 'artists', 'tours', 'activity'] as const).map(t => (
            <button key={t} onClick={() => setTab(t)}
              style={{ padding: '7px 18px', borderRadius: 7, background: tab === t ? (darkMode ? '#2a2520' : '#fff') : 'transparent', color: tab === t ? text : muted, border: 'none', cursor: 'pointer', fontFamily: 'monospace', fontSize: 9, letterSpacing: '0.15em', fontWeight: tab === t ? 700 : 400, transition: 'all 0.15s' }}>
              {t.toUpperCase()}
            </button>
          ))}
        </div>

        {/* OVERVIEW TAB */}
        {tab === 'overview' && (
          <div style={{ display: 'grid', gap: 16 }}>
            {/* Top users by data */}
            <div style={{ background: card, borderRadius: 12, border: `1px solid ${border}`, overflow: 'hidden' }}>
              <div style={{ padding: '14px 20px', borderBottom: `1px solid ${border}`, fontFamily: 'monospace', fontSize: 9, letterSpacing: 2, color: muted }}>MOST ACTIVE ACCOUNTS</div>
              {[...users].sort((a: any, b: any) => (b.show_count + b.tour_count * 3) - (a.show_count + a.tour_count * 3)).slice(0, 10).map((u: any, i: number) => (
                <div key={u.id} onClick={() => drillIntoUser(u)}
                  style={{ padding: '12px 20px', borderBottom: i < 9 ? `1px solid ${border}` : 'none', display: 'flex', alignItems: 'center', gap: 16, cursor: 'pointer' }}>
                  <div style={{ width: 32, height: 32, borderRadius: 8, background: `hsl(${(i * 47) % 360}, 40%, 35%)`, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: 13, fontWeight: 700, flexShrink: 0 }}>
                    {(u.full_name || u.email || '?').charAt(0).toUpperCase()}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 600, fontSize: 14, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{u.full_name || 'No name'}</div>
                    <div style={{ fontSize: 11, color: muted, fontFamily: 'monospace' }}>{u.email}</div>
                  </div>
                  <div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
                    <Tag label={`${u.artist_count} artists`} />
                    <Tag label={`${u.tour_count} tours`} />
                    <Tag label={`${u.show_count} shows`} />
                  </div>
                  <div style={{ fontSize: 11, color: muted, flexShrink: 0 }}>{fmtRelative(u.last_sign_in)}</div>
                </div>
              ))}
            </div>

            {/* Recent signups */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
              <div style={{ background: card, borderRadius: 12, border: `1px solid ${border}`, overflow: 'hidden' }}>
                <div style={{ padding: '14px 20px', borderBottom: `1px solid ${border}`, fontFamily: 'monospace', fontSize: 9, letterSpacing: 2, color: muted }}>RECENT SIGNUPS</div>
                {users.slice(0, 8).map((u: any, i: number) => (
                  <div key={u.id} onClick={() => drillIntoUser(u)}
                    style={{ padding: '10px 20px', borderBottom: i < 7 ? `1px solid ${border}` : 'none', display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer' }}>
                    <div>
                      <div style={{ fontSize: 13, fontWeight: 600 }}>{u.full_name || 'No name'}</div>
                      <div style={{ fontSize: 11, color: muted, fontFamily: 'monospace' }}>{u.email}</div>
                    </div>
                    <div style={{ fontSize: 11, color: muted }}>{fmtDate(u.created_at)}</div>
                  </div>
                ))}
              </div>
              <div style={{ background: card, borderRadius: 12, border: `1px solid ${border}`, overflow: 'hidden' }}>
                <div style={{ padding: '14px 20px', borderBottom: `1px solid ${border}`, fontFamily: 'monospace', fontSize: 9, letterSpacing: 2, color: muted }}>RECENT TOURS</div>
                {tours.slice(0, 8).map((t: any, i: number) => (
                  <div key={t.id} style={{ padding: '10px 20px', borderBottom: i < 7 ? `1px solid ${border}` : 'none', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                      <div style={{ fontSize: 13, fontWeight: 600 }}>{t.name}</div>
                      <div style={{ fontSize: 11, color: muted, fontStyle: 'italic' }}>{t.artists?.name}</div>
                    </div>
                    <div style={{ fontSize: 11, color: muted }}>{fmtDate(t.created_at)}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* USERS TAB */}
        {tab === 'users' && (
          <div style={{ background: card, borderRadius: 12, border: `1px solid ${border}`, overflow: 'hidden' }}>
            <div style={{ padding: '14px 20px', borderBottom: `1px solid ${border}`, fontFamily: 'monospace', fontSize: 9, letterSpacing: 2, color: muted }}>
              {filteredUsers.length} USERS
            </div>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ borderBottom: `1px solid ${border}` }}>
                  {['User', 'Email', 'Artists', 'Tours', 'Shows', 'Last active', 'Joined', ''].map(h => (
                    <th key={h} style={{ padding: '10px 16px', textAlign: 'left', fontFamily: 'monospace', fontSize: 9, letterSpacing: '0.15em', color: muted, fontWeight: 400 }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filteredUsers.map((u: any, i: number) => (
                  <tr key={u.id}
                    style={{ borderBottom: i < filteredUsers.length - 1 ? `1px solid ${border}` : 'none', background: i % 2 === 0 ? 'transparent' : (darkMode ? 'rgba(255,255,255,0.01)' : 'rgba(0,0,0,0.01)') }}>
                    <td style={{ padding: '11px 16px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <div style={{ width: 26, height: 26, borderRadius: 6, background: `hsl(${(u.id?.charCodeAt(0) * 47 || 0) % 360}, 40%, 35%)`, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: 11, fontWeight: 700, flexShrink: 0 }}>
                          {(u.full_name || u.email || '?').charAt(0).toUpperCase()}
                        </div>
                        <button onClick={() => drillIntoUser(u)}
                          style={{ background: 'none', border: 'none', cursor: 'pointer', color: text, fontSize: 13, fontWeight: 600, fontFamily: '"Georgia", serif', textAlign: 'left', padding: 0 }}>
                          {u.full_name || 'No name'}
                        </button>
                      </div>
                    </td>
                    <td style={{ padding: '11px 16px', fontSize: 12, color: muted, fontFamily: 'monospace' }}>{u.email || '-'}</td>
                    <td style={{ padding: '11px 16px', fontFamily: 'monospace', fontSize: 12, color: u.artist_count > 0 ? text : muted }}>{u.artist_count}</td>
                    <td style={{ padding: '11px 16px', fontFamily: 'monospace', fontSize: 12, color: u.tour_count > 0 ? text : muted }}>{u.tour_count}</td>
                    <td style={{ padding: '11px 16px', fontFamily: 'monospace', fontSize: 12, color: u.show_count > 0 ? text : muted }}>{u.show_count}</td>
                    <td style={{ padding: '11px 16px', fontSize: 12, color: muted }}>{fmtRelative(u.last_sign_in)}</td>
                    <td style={{ padding: '11px 16px', fontSize: 12, color: muted }}>{fmtDate(u.created_at)}</td>
                    <td style={{ padding: '11px 16px' }}>
                      <div style={{ display: 'flex', gap: 4 }}>
                        <button onClick={() => drillIntoUser(u)}
                          style={{ padding: '4px 10px', background: 'transparent', border: `1px solid ${border}`, borderRadius: 5, color: muted, cursor: 'pointer', fontSize: 10, fontFamily: 'monospace' }}>
                          VIEW
                        </button>
                        <button onClick={() => impersonate(u.id)} disabled={impersonating}
                          style={{ padding: '4px 10px', background: accent, border: 'none', borderRadius: 5, color: '#fff', cursor: 'pointer', fontSize: 10, fontFamily: 'monospace' }}>
                          ⚡
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* ARTISTS TAB */}
        {tab === 'artists' && (
          <div style={{ background: card, borderRadius: 12, border: `1px solid ${border}`, overflow: 'hidden' }}>
            <div style={{ padding: '14px 20px', borderBottom: `1px solid ${border}`, fontFamily: 'monospace', fontSize: 9, letterSpacing: 2, color: muted }}>{filteredArtists.length} ARTISTS</div>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ borderBottom: `1px solid ${border}` }}>
                  {['Artist', 'Project', 'Owner', 'Tours', 'Shows', 'Created'].map(h => (
                    <th key={h} style={{ padding: '10px 16px', textAlign: 'left', fontFamily: 'monospace', fontSize: 9, letterSpacing: '0.15em', color: muted, fontWeight: 400 }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filteredArtists.map((a: any, i: number) => {
                  const aTours = tours.filter((t: any) => t.artist_id === a.id)
                  const aShows = shows.filter((s: any) => {
                    const at = aTours.find((t: any) => t.id === s.tour_id)
                    return !!at && (!s.type || s.type === 'show')
                  })
                  return (
                    <tr key={a.id} style={{ borderBottom: i < filteredArtists.length - 1 ? `1px solid ${border}` : 'none', background: i % 2 === 0 ? 'transparent' : (darkMode ? 'rgba(255,255,255,0.01)' : 'rgba(0,0,0,0.01)') }}>
                      <td style={{ padding: '12px 16px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                          <div style={{ width: 28, height: 28, borderRadius: 6, background: a.color || accent, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: 12, fontWeight: 700, fontStyle: 'italic', flexShrink: 0 }}>{a.name?.charAt(0)}</div>
                          <span style={{ fontWeight: 600, fontSize: 14 }}>{a.name}</span>
                        </div>
                      </td>
                      <td style={{ padding: '12px 16px', fontSize: 12, color: muted, fontStyle: 'italic' }}>{a.project || '-'}</td>
                      <td style={{ padding: '12px 16px', fontSize: 12, color: muted }}>{a.profiles?.full_name || '-'}</td>
                      <td style={{ padding: '12px 16px', fontFamily: 'monospace', fontSize: 12 }}>{aTours.length}</td>
                      <td style={{ padding: '12px 16px', fontFamily: 'monospace', fontSize: 12 }}>{aShows.length}</td>
                      <td style={{ padding: '12px 16px', fontSize: 12, color: muted }}>{fmtDate(a.created_at)}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* TOURS TAB */}
        {tab === 'tours' && (
          <div style={{ background: card, borderRadius: 12, border: `1px solid ${border}`, overflow: 'hidden' }}>
            <div style={{ padding: '14px 20px', borderBottom: `1px solid ${border}`, fontFamily: 'monospace', fontSize: 9, letterSpacing: 2, color: muted }}>{filteredTours.length} TOURS</div>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ borderBottom: `1px solid ${border}` }}>
                  {['Tour', 'Artist', 'Status', 'Shows', 'Travel', 'Hotels', 'Guests', 'Created'].map(h => (
                    <th key={h} style={{ padding: '10px 16px', textAlign: 'left', fontFamily: 'monospace', fontSize: 9, letterSpacing: '0.15em', color: muted, fontWeight: 400 }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filteredTours.map((t: any, i: number) => {
                  const tShows = shows.filter((s: any) => s.tour_id === t.id && (!s.type || s.type === 'show'))
                  const tTravel = travel.filter((tr: any) => tr.tour_id === t.id)
                  const tAccom = accommodation.filter((a: any) => a.tour_id === t.id)
                  const tGuests = guests.filter((g: any) => g.tour_id === t.id).reduce((s: number, g: any) => s + 1 + (g.plus_n || 0), 0)
                  const statusColors: Record<string, string> = { confirmed: green, routing: '#B8860B', completed: muted }
                  return (
                    <tr key={t.id} style={{ borderBottom: i < filteredTours.length - 1 ? `1px solid ${border}` : 'none', background: i % 2 === 0 ? 'transparent' : (darkMode ? 'rgba(255,255,255,0.01)' : 'rgba(0,0,0,0.01)') }}>
                      <td style={{ padding: '12px 16px', fontWeight: 600, fontSize: 14 }}>{t.name}</td>
                      <td style={{ padding: '12px 16px', fontSize: 12, color: muted, fontStyle: 'italic' }}>{t.artists?.name || '-'}</td>
                      <td style={{ padding: '12px 16px' }}><Tag label={t.status || 'routing'} color={statusColors[t.status]} /></td>
                      <td style={{ padding: '12px 16px', fontFamily: 'monospace', fontSize: 12, color: tShows.length > 0 ? text : muted }}>{tShows.length}</td>
                      <td style={{ padding: '12px 16px', fontFamily: 'monospace', fontSize: 12, color: tTravel.length > 0 ? text : muted }}>{tTravel.length}</td>
                      <td style={{ padding: '12px 16px', fontFamily: 'monospace', fontSize: 12, color: tAccom.length > 0 ? text : muted }}>{tAccom.length}</td>
                      <td style={{ padding: '12px 16px', fontFamily: 'monospace', fontSize: 12, color: tGuests > 0 ? text : muted }}>{tGuests || '-'}</td>
                      <td style={{ padding: '12px 16px', fontSize: 12, color: muted }}>{fmtDate(t.created_at)}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* ACTIVITY TAB */}
        {tab === 'activity' && (
          <div style={{ display: 'grid', gap: 16 }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
              <div style={{ background: card, borderRadius: 12, border: `1px solid ${border}`, overflow: 'hidden' }}>
                <div style={{ padding: '14px 20px', borderBottom: `1px solid ${border}`, fontFamily: 'monospace', fontSize: 9, letterSpacing: 2, color: muted }}>RECENT SIGNUPS</div>
                {users.slice(0, 12).map((u: any, i: number) => (
                  <div key={u.id} onClick={() => drillIntoUser(u)}
                    style={{ padding: '10px 20px', borderBottom: i < 11 ? `1px solid ${border}` : 'none', display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer' }}>
                    <div>
                      <div style={{ fontWeight: 600, fontSize: 13 }}>{u.full_name || 'No name'}</div>
                      <div style={{ fontSize: 11, color: muted, fontFamily: 'monospace' }}>{u.email}</div>
                    </div>
                    <div style={{ fontSize: 11, color: muted }}>{fmtDate(u.created_at)}</div>
                  </div>
                ))}
              </div>
              <div style={{ background: card, borderRadius: 12, border: `1px solid ${border}`, overflow: 'hidden' }}>
                <div style={{ padding: '14px 20px', borderBottom: `1px solid ${border}`, fontFamily: 'monospace', fontSize: 9, letterSpacing: 2, color: muted }}>RECENTLY ACTIVE USERS</div>
                {[...users].filter((u: any) => u.last_sign_in).sort((a: any, b: any) => new Date(b.last_sign_in).getTime() - new Date(a.last_sign_in).getTime()).slice(0, 12).map((u: any, i: number) => (
                  <div key={u.id} onClick={() => drillIntoUser(u)}
                    style={{ padding: '10px 20px', borderBottom: i < 11 ? `1px solid ${border}` : 'none', display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer' }}>
                    <div>
                      <div style={{ fontWeight: 600, fontSize: 13 }}>{u.full_name || 'No name'}</div>
                      <div style={{ fontSize: 11, color: muted, fontFamily: 'monospace' }}>{u.email}</div>
                    </div>
                    <div style={{ fontSize: 11, color: accent }}>{fmtRelative(u.last_sign_in)}</div>
                  </div>
                ))}
              </div>
            </div>
            <div style={{ background: card, borderRadius: 12, border: `1px solid ${border}`, overflow: 'hidden' }}>
              <div style={{ padding: '14px 20px', borderBottom: `1px solid ${border}`, fontFamily: 'monospace', fontSize: 9, letterSpacing: 2, color: muted }}>RECENTLY CREATED TOURS</div>
              {tours.slice(0, 8).map((t: any, i: number) => (
                <div key={t.id} style={{ padding: '12px 20px', borderBottom: i < 7 ? `1px solid ${border}` : 'none', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <div style={{ fontWeight: 600, fontSize: 14 }}>{t.name}</div>
                    <div style={{ fontSize: 12, color: muted, fontStyle: 'italic' }}>{t.artists?.name}</div>
                  </div>
                  <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                    <Tag label={t.status || 'routing'} />
                    <div style={{ fontSize: 12, color: muted }}>{fmtDate(t.created_at)}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
