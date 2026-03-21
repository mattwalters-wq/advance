'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase'
import { useRouter } from 'next/navigation'

export default function DashboardPage() {
  const [artists, setArtists] = useState<any[]>([])
  const [user, setUser] = useState<any>(null)
  const [profile, setProfile] = useState<any>(null)
  const [darkMode, setDarkMode] = useState(false)
  const [loading, setLoading] = useState(true)
  const [showInvite, setShowInvite] = useState(false)
  const [inviteEmail, setInviteEmail] = useState('')
  const [inviteName, setInviteName] = useState('')
  const [inviting, setInviting] = useState(false)
  const [inviteMsg, setInviteMsg] = useState('')
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => { loadData() }, [])

  async function loadData() {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { router.push('/auth/signin'); return }
    setUser(user)
    const { data: profileData } = await supabase.from('profiles').select('*').eq('id', user.id).single()
    setProfile(profileData)
    const { data } = await supabase.from('artists').select('*').order('name')
    setArtists(data || [])
    setLoading(false)
  }

  async function handleSignout() {
    await supabase.auth.signOut()
    router.push('/auth/signin')
  }

  async function handleInvite() {
    if (!inviteEmail.trim()) return
    setInviting(true)
    setInviteMsg('')
    const { error } = await supabase.auth.admin?.inviteUserByEmail
      ? supabase.auth.signInWithOtp({ email: inviteEmail, options: { shouldCreateUser: true } })
      : Promise.resolve({ error: null })

    // Use Supabase magic link invite
    const res = await fetch('/api/invite', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: inviteEmail, name: inviteName }),
    })
    const data = await res.json()
    if (data.success) {
      setInviteMsg(`Invite sent to ${inviteEmail}`)
      setInviteEmail('')
      setInviteName('')
    } else {
      setInviteMsg(data.error || 'Failed to send invite')
    }
    setInviting(false)
  }

  const bg = darkMode ? '#1a1a1a' : '#F5F0E8'
  const card = darkMode ? '#2a2a2a' : '#fff'
  const text = darkMode ? '#e8e0d0' : '#1A1714'
  const muted = darkMode ? '#888' : '#8A8580'
  const border = darkMode ? '#333' : '#DDD8CE'
  const accent = '#C4622D'

  if (loading) return <div style={{ background: bg, minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', color: text, fontFamily: 'Georgia, serif' }}>Loading...</div>

  return (
    <div style={{ background: bg, minHeight: '100vh', fontFamily: 'Georgia, serif', color: text }}>

      {/* Invite modal */}
      {showInvite && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}
          onClick={() => setShowInvite(false)}>
          <div style={{ background: card, borderRadius: 16, padding: 28, width: '100%', maxWidth: 400 }}
            onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
              <div style={{ fontFamily: 'monospace', fontSize: 11, letterSpacing: 3, color: muted }}>INVITE TEAM MEMBER</div>
              <button onClick={() => setShowInvite(false)} style={{ background: 'none', border: 'none', color: muted, cursor: 'pointer', fontSize: 20 }}>×</button>
            </div>
            <div style={{ marginBottom: 14 }}>
              <label style={{ fontSize: 11, fontFamily: 'monospace', letterSpacing: 2, color: muted, display: 'block', marginBottom: 6 }}>NAME</label>
              <input value={inviteName} onChange={e => setInviteName(e.target.value)} placeholder="Their name"
                style={{ width: '100%', padding: '10px 12px', border: `1px solid ${border}`, borderRadius: 8, background: bg, color: text, fontSize: 14, fontFamily: 'Georgia, serif', boxSizing: 'border-box' as const, outline: 'none' }} />
            </div>
            <div style={{ marginBottom: 20 }}>
              <label style={{ fontSize: 11, fontFamily: 'monospace', letterSpacing: 2, color: muted, display: 'block', marginBottom: 6 }}>EMAIL</label>
              <input value={inviteEmail} onChange={e => setInviteEmail(e.target.value)} placeholder="colleague@email.com" type="email"
                style={{ width: '100%', padding: '10px 12px', border: `1px solid ${border}`, borderRadius: 8, background: bg, color: text, fontSize: 14, fontFamily: 'Georgia, serif', boxSizing: 'border-box' as const, outline: 'none' }} />
            </div>
            {inviteMsg && <div style={{ marginBottom: 14, fontSize: 13, color: inviteMsg.includes('sent') ? '#2d7a4f' : '#c00', fontFamily: 'monospace' }}>{inviteMsg}</div>}
            <button onClick={handleInvite} disabled={inviting || !inviteEmail.trim()}
              style={{ width: '100%', padding: 12, background: accent, color: '#fff', border: 'none', borderRadius: 8, cursor: 'pointer', fontFamily: 'monospace', fontSize: 10, letterSpacing: 3 }}>
              {inviting ? 'SENDING...' : 'SEND INVITE'}
            </button>
            <div style={{ marginTop: 14, fontSize: 12, color: muted, textAlign: 'center', lineHeight: 1.6 }}>
              They'll receive a magic link to set up their account and access the same roster.
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <div style={{ background: darkMode ? '#111' : '#1A1714', padding: '14px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <span style={{ fontSize: 20, fontStyle: 'italic', color: '#F5F0E8' }}>Advance</span>
          <span style={{ fontFamily: 'monospace', fontSize: 9, letterSpacing: 2, color: accent }}>AI ✦</span>
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <button onClick={() => setDarkMode(!darkMode)}
            style={{ background: 'none', border: '1px solid #333', borderRadius: 6, padding: '6px 10px', color: '#F5F0E8', cursor: 'pointer', fontSize: 12 }}>
            {darkMode ? '☀️' : '🌙'}
          </button>
          <button onClick={() => setShowInvite(true)}
            style={{ fontFamily: 'monospace', fontSize: 9, letterSpacing: 2, color: '#8A8580', background: 'transparent', border: '1px solid #2A2520', borderRadius: 4, padding: '6px 10px', cursor: 'pointer' }}>
            + INVITE
          </button>
          <button onClick={handleSignout}
            style={{ fontFamily: 'monospace', fontSize: 9, letterSpacing: 2, color: '#8A8580', background: 'transparent', border: '1px solid #2A2520', borderRadius: 4, padding: '6px 10px', cursor: 'pointer' }}>
            OUT
          </button>
        </div>
      </div>

      <div style={{ maxWidth: 900, margin: '0 auto', padding: '24px 16px' }}>

        {/* Actions - responsive wrap */}
        <div style={{ display: 'flex', gap: 10, marginBottom: 28, flexWrap: 'wrap' }}>
          <button onClick={() => router.push('/dashboard/import')}
            style={{ flex: '1 1 auto', minWidth: 120, padding: '12px 16px', background: accent, color: '#fff', border: 'none', borderRadius: 8, fontFamily: 'monospace', fontSize: 10, letterSpacing: 2, cursor: 'pointer' }}>
            ✦ IMPORT DOC
          </button>
          <button onClick={() => router.push('/dashboard/calendar')}
            style={{ flex: '1 1 auto', minWidth: 100, padding: '12px 16px', background: 'transparent', color: text, border: `1px solid ${border}`, borderRadius: 8, fontFamily: 'monospace', fontSize: 10, letterSpacing: 2, cursor: 'pointer' }}>
            ▦ CALENDAR
          </button>
          <button onClick={() => router.push('/dashboard/artists/new')}
            style={{ flex: '1 1 auto', minWidth: 100, padding: '12px 16px', background: 'transparent', color: text, border: `1px solid ${border}`, borderRadius: 8, fontFamily: 'monospace', fontSize: 10, letterSpacing: 2, cursor: 'pointer' }}>
            + ARTIST
          </button>
        </div>

        {/* Roster label */}
        <div style={{ fontFamily: 'monospace', fontSize: 9, letterSpacing: 3, color: muted, marginBottom: 14, textTransform: 'uppercase' }}>
          Roster — {artists.length} Artists
        </div>

        {artists.length === 0 && (
          <div style={{ textAlign: 'center', padding: '60px 20px', color: muted }}>
            <div style={{ fontSize: 32, marginBottom: 12 }}>🎵</div>
            <div>No artists yet. Add one or import a document to get started.</div>
          </div>
        )}

        {/* Artist grid - 1 col mobile, 2-3 col desktop */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: 14 }}>
          {artists.map(artist => (
            <div key={artist.id} onClick={() => router.push(`/dashboard/artists/${artist.id}`)}
              style={{ background: card, borderRadius: 10, padding: '16px 18px', border: `1px solid ${border}`, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 14 }}
              onMouseEnter={e => (e.currentTarget.style.borderColor = accent)}
              onMouseLeave={e => (e.currentTarget.style.borderColor = border)}>
              <div style={{ width: 40, height: 40, borderRadius: '50%', background: artist.color || accent, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: 16, fontWeight: 'bold' }}>
                {artist.name.charAt(0)}
              </div>
              <div style={{ minWidth: 0 }}>
                <div style={{ fontSize: 15, fontWeight: 600, marginBottom: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{artist.name}</div>
                <div style={{ fontSize: 12, color: muted, fontStyle: 'italic', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{artist.project || 'No active project'}</div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
