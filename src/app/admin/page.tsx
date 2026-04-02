'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'

const supabase = createClient()
const ADMIN_EMAIL = 'mattwaltersconsulting@gmail.com'

export default function AdminPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState<'users' | 'artists' | 'tours' | 'activity'>('users')
  const [users, setUsers] = useState<any[]>([])
  const [artists, setArtists] = useState<any[]>([])
  const [tours, setTours] = useState<any[]>([])
  const [shows, setShows] = useState<any[]>([])
  const [travel, setTravel] = useState<any[]>([])
  const [darkMode, setDarkMode] = useState(true)
  const [search, setSearch] = useState('')

  useEffect(() => { checkAndLoad() }, [])

  async function checkAndLoad() {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user || user.email !== ADMIN_EMAIL) {
      router.push('/dashboard')
      return
    }
    await loadAll()
    setLoading(false)
  }

  async function loadAll() {
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) return
    const res = await fetch('/api/admin', {
      headers: { 'Authorization': `Bearer ${session.access_token}` }
    })
    if (!res.ok) { router.push('/dashboard'); return }
    const data = await res.json()
    setUsers(data.users || [])
    setArtists(data.artists || [])
    setTours(data.tours || [])
    setShows(data.shows || [])
    setTravel(data.travel || [])
  }

  const bg = darkMode ? '#0A0908' : '#F7F3EE'
  const card = darkMode ? '#111' : '#fff'
  const text = darkMode ? '#F4EFE6' : '#1A1714'
  const muted = darkMode ? '#5A5450' : '#8A8580'
  const border = darkMode ? '#1E1C18' : '#E8E0D4'
  const accent = '#C4622D'

  const stat = (label: string, value: any, sub?: string) => (
    <div style={{ background: card, border: `1px solid ${border}`, borderRadius: 12, padding: '20px 24px' }}>
      <div style={{ fontFamily: 'monospace', fontSize: 9, letterSpacing: '0.2em', color: muted, marginBottom: 8 }}>{label}</div>
      <div style={{ fontFamily: '"Playfair Display", Georgia, serif', fontSize: 36, fontWeight: 700, color: text, lineHeight: 1 }}>{value}</div>
      {sub && <div style={{ fontSize: 11, color: muted, marginTop: 6 }}>{sub}</div>}
    </div>
  )

  const filteredUsers = users.filter(u =>
    !search || u.full_name?.toLowerCase().includes(search.toLowerCase()) || u.id?.toLowerCase().includes(search.toLowerCase())
  )
  const filteredTours = tours.filter(t =>
    !search || t.name?.toLowerCase().includes(search.toLowerCase()) || t.artists?.name?.toLowerCase().includes(search.toLowerCase())
  )

  if (loading) return (
    <div style={{ background: '#0A0908', minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'monospace', fontSize: 11, letterSpacing: '0.2em', color: '#3A3530' }}>
      LOADING ADMIN
    </div>
  )

  return (
    <div style={{ background: bg, minHeight: '100vh', fontFamily: '"Georgia", serif', color: text }}>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,700;1,400&display=swap'); * { box-sizing: border-box; } ::-webkit-scrollbar { width: 4px; } ::-webkit-scrollbar-thumb { background: ${border}; }`}</style>

      {/* Header */}
      <div style={{ background: darkMode ? '#0F0E0C' : '#1A1714', padding: '0 28px', height: 56, display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: `1px solid ${border}` }}>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 12 }}>
          <span style={{ fontFamily: '"Playfair Display", Georgia, serif', fontSize: 20, fontStyle: 'italic', color: '#F4EFE6' }}>Advance</span>
          <span style={{ fontFamily: 'monospace', fontSize: 9, letterSpacing: '0.25em', color: accent }}>ADMIN ✦</span>
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <input value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Search..."
            style={{ padding: '6px 12px', background: darkMode ? '#1A1714' : '#2A2520', border: `1px solid ${border}`, borderRadius: 6, color: '#F4EFE6', fontSize: 12, fontFamily: '"Georgia", serif', outline: 'none', width: 200 }} />
          <button onClick={loadAll} style={{ padding: '6px 12px', background: 'transparent', border: `1px solid ${border}`, borderRadius: 6, color: muted, cursor: 'pointer', fontSize: 11, fontFamily: 'monospace' }}>↺ REFRESH</button>
          <button onClick={() => setDarkMode(!darkMode)} style={{ padding: '6px 10px', background: 'transparent', border: `1px solid ${border}`, borderRadius: 6, color: muted, cursor: 'pointer', fontSize: 12 }}>{darkMode ? '☀️' : '🌙'}</button>
          <button onClick={() => router.push('/dashboard')} style={{ padding: '6px 12px', background: 'transparent', border: `1px solid ${border}`, borderRadius: 6, color: muted, cursor: 'pointer', fontSize: 11, fontFamily: 'monospace' }}>← DASHBOARD</button>
        </div>
      </div>

      <div style={{ maxWidth: 1200, margin: '0 auto', padding: '28px 24px' }}>

        {/* Stats row */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 16, marginBottom: 32 }}>
          {stat('USERS', users.length, `${users.filter(u => {
            const d = new Date(u.created_at)
            const week = new Date(); week.setDate(week.getDate() - 7)
            return d > week
          }).length} this week`)}
          {stat('ARTISTS', artists.length)}
          {stat('TOURS', tours.length, `${tours.filter(t => t.status === 'confirmed').length} confirmed`)}
          {stat('SHOWS', shows.length)}
          {stat('TRAVEL LEGS', travel.length)}
        </div>

        {/* Tabs */}
        <div style={{ display: 'flex', gap: 2, background: darkMode ? '#111' : '#EDE8DF', borderRadius: 10, padding: 3, marginBottom: 24, alignSelf: 'flex-start', width: 'fit-content' }}>
          {(['users', 'artists', 'tours', 'activity'] as const).map(t => (
            <button key={t} onClick={() => setTab(t)}
              style={{ padding: '7px 18px', borderRadius: 7, background: tab === t ? (darkMode ? '#2a2520' : '#fff') : 'transparent', color: tab === t ? text : muted, border: 'none', cursor: 'pointer', fontFamily: 'monospace', fontSize: 9, letterSpacing: '0.15em', fontWeight: tab === t ? 700 : 400, transition: 'all 0.15s' }}>
              {t.toUpperCase()}
            </button>
          ))}
        </div>

        {/* USERS TAB */}
        {tab === 'users' && (
          <div style={{ background: card, borderRadius: 12, border: `1px solid ${border}`, overflow: 'hidden' }}>
            <div style={{ padding: '14px 20px', borderBottom: `1px solid ${border}`, fontFamily: 'monospace', fontSize: 9, letterSpacing: '0.2em', color: muted }}>
              {filteredUsers.length} USERS
            </div>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ borderBottom: `1px solid ${border}` }}>
                  {['Name', 'Email', 'Org ID', 'Role', 'Joined'].map(h => (
                    <th key={h} style={{ padding: '10px 20px', textAlign: 'left', fontFamily: 'monospace', fontSize: 9, letterSpacing: '0.15em', color: muted, fontWeight: 400 }}>{h.toUpperCase()}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filteredUsers.map((u, i) => (
                  <tr key={u.id} style={{ borderBottom: i < filteredUsers.length - 1 ? `1px solid ${border}` : 'none', background: i % 2 === 0 ? 'transparent' : (darkMode ? 'rgba(255,255,255,0.02)' : 'rgba(0,0,0,0.01)') }}>
                    <td style={{ padding: '12px 20px', fontSize: 14, fontWeight: 600 }}>{u.full_name || <span style={{ color: muted, fontStyle: 'italic' }}>No name</span>}</td>
                    <td style={{ padding: '12px 20px', fontSize: 12, color: muted }}>{u.email || <span style={{ fontStyle: 'italic' }}>no email</span>}</td>
                    <td style={{ padding: '12px 20px', fontSize: 11, fontFamily: 'monospace', color: muted }}>{u.org_id ? u.org_id.slice(0, 8) + '...' : <span style={{ color: '#C00' }}>none</span>}</td>
                    <td style={{ padding: '12px 20px' }}>
                      <span style={{ fontFamily: 'monospace', fontSize: 9, letterSpacing: 1, padding: '2px 8px', borderRadius: 10, background: u.role === 'admin' ? accent : (darkMode ? '#1E1C18' : '#F0EBE2'), color: u.role === 'admin' ? '#fff' : muted }}>
                        {u.role || 'member'}
                      </span>
                    </td>
                    <td style={{ padding: '12px 20px', fontSize: 12, color: muted }}>
                      {u.created_at ? new Date(u.created_at).toLocaleDateString('en-AU', { day: 'numeric', month: 'short', year: 'numeric' }) : 'Unknown'}
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
            <div style={{ padding: '14px 20px', borderBottom: `1px solid ${border}`, fontFamily: 'monospace', fontSize: 9, letterSpacing: '0.2em', color: muted }}>
              {artists.length} ARTISTS
            </div>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ borderBottom: `1px solid ${border}` }}>
                  {['Artist', 'Project', 'Owner', 'Tours', 'Created'].map(h => (
                    <th key={h} style={{ padding: '10px 20px', textAlign: 'left', fontFamily: 'monospace', fontSize: 9, letterSpacing: '0.15em', color: muted, fontWeight: 400 }}>{h.toUpperCase()}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {artists.map((a, i) => {
                  const artistTours = tours.filter(t => t.artist_id === a.id)
                  return (
                    <tr key={a.id} style={{ borderBottom: i < artists.length - 1 ? `1px solid ${border}` : 'none', background: i % 2 === 0 ? 'transparent' : (darkMode ? 'rgba(255,255,255,0.02)' : 'rgba(0,0,0,0.01)') }}>
                      <td style={{ padding: '12px 20px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                          <div style={{ width: 28, height: 28, borderRadius: 6, background: a.color || accent, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: 12, fontWeight: 700, fontStyle: 'italic' }}>{a.name?.charAt(0)}</div>
                          <span style={{ fontWeight: 600, fontSize: 14 }}>{a.name}</span>
                        </div>
                      </td>
                      <td style={{ padding: '12px 20px', fontSize: 13, color: muted, fontStyle: 'italic' }}>{a.project || '-'}</td>
                      <td style={{ padding: '12px 20px', fontSize: 12, color: muted }}>{a.profiles?.full_name || 'Unknown'}</td>
                      <td style={{ padding: '12px 20px' }}>
                        <span style={{ fontFamily: 'monospace', fontSize: 11, padding: '2px 8px', borderRadius: 10, background: artistTours.length > 0 ? (darkMode ? '#1E1C18' : '#F0EBE2') : 'transparent', color: artistTours.length > 0 ? text : muted }}>
                          {artistTours.length}
                        </span>
                      </td>
                      <td style={{ padding: '12px 20px', fontSize: 12, color: muted }}>
                        {a.created_at ? new Date(a.created_at).toLocaleDateString('en-AU', { day: 'numeric', month: 'short' }) : '-'}
                      </td>
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
            <div style={{ padding: '14px 20px', borderBottom: `1px solid ${border}`, fontFamily: 'monospace', fontSize: 9, letterSpacing: '0.2em', color: muted }}>
              {filteredTours.length} TOURS
            </div>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ borderBottom: `1px solid ${border}` }}>
                  {['Tour', 'Artist', 'Status', 'Shows', 'Travel', 'Created'].map(h => (
                    <th key={h} style={{ padding: '10px 20px', textAlign: 'left', fontFamily: 'monospace', fontSize: 9, letterSpacing: '0.15em', color: muted, fontWeight: 400 }}>{h.toUpperCase()}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filteredTours.map((t, i) => {
                  const tourShows = shows.filter(s => s.tour_id === t.id)
                  const tourTravel = travel.filter(tr => tr.tour_id === t.id)
                  const statusColors: Record<string, string> = { confirmed: '#2d7a4f', routing: '#B8860B', completed: '#5A5450' }
                  return (
                    <tr key={t.id} style={{ borderBottom: i < filteredTours.length - 1 ? `1px solid ${border}` : 'none', background: i % 2 === 0 ? 'transparent' : (darkMode ? 'rgba(255,255,255,0.02)' : 'rgba(0,0,0,0.01)') }}>
                      <td style={{ padding: '12px 20px', fontWeight: 600, fontSize: 14 }}>{t.name}</td>
                      <td style={{ padding: '12px 20px', fontSize: 13, color: muted }}>{t.artists?.name || '-'}</td>
                      <td style={{ padding: '12px 20px' }}>
                        <span style={{ fontFamily: 'monospace', fontSize: 9, letterSpacing: 1, padding: '3px 8px', borderRadius: 10, background: darkMode ? '#1E1C18' : '#F0EBE2', color: statusColors[t.status] || muted }}>
                          {t.status || 'routing'}
                        </span>
                      </td>
                      <td style={{ padding: '12px 20px', fontFamily: 'monospace', fontSize: 12, color: tourShows.length > 0 ? text : muted }}>{tourShows.length}</td>
                      <td style={{ padding: '12px 20px', fontFamily: 'monospace', fontSize: 12, color: tourTravel.length > 0 ? text : muted }}>{tourTravel.length}</td>
                      <td style={{ padding: '12px 20px', fontSize: 12, color: muted }}>
                        {t.created_at ? new Date(t.created_at).toLocaleDateString('en-AU', { day: 'numeric', month: 'short' }) : '-'}
                      </td>
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
            {/* Recent signups */}
            <div style={{ background: card, borderRadius: 12, border: `1px solid ${border}`, overflow: 'hidden' }}>
              <div style={{ padding: '14px 20px', borderBottom: `1px solid ${border}`, fontFamily: 'monospace', fontSize: 9, letterSpacing: '0.2em', color: muted }}>RECENT SIGNUPS</div>
              {users.slice(0, 10).map((u, i) => (
                <div key={u.id} style={{ padding: '12px 20px', borderBottom: i < 9 ? `1px solid ${border}` : 'none', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <div style={{ fontWeight: 600, fontSize: 14 }}>{u.full_name || 'Unnamed user'}</div>
                    <div style={{ fontSize: 11, color: muted, fontFamily: 'monospace' }}>{u.id?.slice(0, 16)}...</div>
                  </div>
                  <div style={{ fontSize: 12, color: muted }}>{u.created_at ? new Date(u.created_at).toLocaleDateString('en-AU', { day: 'numeric', month: 'short', year: 'numeric' }) : '-'}</div>
                </div>
              ))}
            </div>

            {/* Recent tours */}
            <div style={{ background: card, borderRadius: 12, border: `1px solid ${border}`, overflow: 'hidden' }}>
              <div style={{ padding: '14px 20px', borderBottom: `1px solid ${border}`, fontFamily: 'monospace', fontSize: 9, letterSpacing: '0.2em', color: muted }}>RECENT TOURS CREATED</div>
              {tours.slice(0, 10).map((t, i) => (
                <div key={t.id} style={{ padding: '12px 20px', borderBottom: i < 9 ? `1px solid ${border}` : 'none', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <div style={{ fontWeight: 600, fontSize: 14 }}>{t.name}</div>
                    <div style={{ fontSize: 12, color: muted, fontStyle: 'italic' }}>{t.artists?.name}</div>
                  </div>
                  <div style={{ fontSize: 12, color: muted }}>{t.created_at ? new Date(t.created_at).toLocaleDateString('en-AU', { day: 'numeric', month: 'short', year: 'numeric' }) : '-'}</div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
