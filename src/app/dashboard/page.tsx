'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase'
import { useRouter } from 'next/navigation'

export default function DashboardPage() {
  const [artists, setArtists] = useState<any[]>([])
  const [user, setUser] = useState<any>(null)
  const [darkMode, setDarkMode] = useState(false)
  const [loading, setLoading] = useState(true)
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => { loadData() }, [])

  async function loadData() {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { router.push('/auth/signin'); return }
    setUser(user)
    const { data } = await supabase.from('artists').select('*').order('name')
    setArtists(data || [])
    setLoading(false)
  }

  async function handleSignout() {
    await supabase.auth.signOut()
    router.push('/auth/signin')
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
      {/* Header */}
      <div style={{ background: darkMode ? '#111' : '#1A1714', padding: '16px 32px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <span style={{ fontSize: 20, fontStyle: 'italic', color: '#F5F0E8' }}>Advance</span>
          <span style={{ fontFamily: 'monospace', fontSize: 9, letterSpacing: 2, color: accent }}>AI ✦</span>
        </div>
        <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
          <button onClick={() => setDarkMode(!darkMode)}
            style={{ background: 'none', border: '1px solid #333', borderRadius: 6, padding: '6px 12px', color: '#F5F0E8', cursor: 'pointer', fontSize: 12 }}>
            {darkMode ? '☀️ Light' : '🌙 Dark'}
          </button>
          <button onClick={handleSignout}
            style={{ fontFamily: 'monospace', fontSize: 9, letterSpacing: 2, color: '#8A8580', background: 'transparent', border: '1px solid #2A2520', borderRadius: 4, padding: '6px 12px', cursor: 'pointer' }}>
            SIGN OUT
          </button>
        </div>
      </div>

      <div style={{ maxWidth: 900, margin: '0 auto', padding: '32px 24px' }}>
        {/* Actions */}
        <div style={{ display: 'flex', gap: 12, marginBottom: 32 }}>
          <button onClick={() => router.push('/dashboard/import')}
            style={{ padding: '12px 24px', background: accent, color: '#fff', border: 'none', borderRadius: 8, fontFamily: 'monospace', fontSize: 10, letterSpacing: 3, cursor: 'pointer' }}>
            ✦ IMPORT DOC
          </button>
          <button onClick={() => router.push('/dashboard/artists/new')}
            style={{ padding: '12px 24px', background: 'transparent', color: text, border: `1px solid ${border}`, borderRadius: 8, fontFamily: 'monospace', fontSize: 10, letterSpacing: 3, cursor: 'pointer' }}>
            + ADD ARTIST
          </button>
        </div>

        {/* Roster */}
        <div style={{ fontFamily: 'monospace', fontSize: 9, letterSpacing: 3, color: muted, marginBottom: 16, textTransform: 'uppercase' }}>
          Roster — {artists.length} Artists
        </div>

        {artists.length === 0 && (
          <div style={{ textAlign: 'center', padding: '60px', color: muted }}>
            <div style={{ fontSize: 32, marginBottom: 12 }}>🎵</div>
            <div>No artists yet. Add one or import a document to get started.</div>
          </div>
        )}

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 16 }}>
          {artists.map(artist => (
            <div key={artist.id} onClick={() => router.push(`/dashboard/artists/${artist.id}`)}
              style={{ background: card, borderRadius: 10, padding: 20, border: `1px solid ${border}`, cursor: 'pointer', transition: 'all 0.15s' }}
              onMouseEnter={e => (e.currentTarget.style.borderColor = accent)}
              onMouseLeave={e => (e.currentTarget.style.borderColor = border)}>
              <div style={{ width: 36, height: 36, borderRadius: '50%', background: artist.color || '#C4622D', marginBottom: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: 14, fontWeight: 'bold' }}>
                {artist.name.charAt(0)}
              </div>
              <div style={{ fontSize: 15, fontWeight: 600, marginBottom: 4 }}>{artist.name}</div>
              <div style={{ fontSize: 12, color: muted, fontStyle: 'italic' }}>{artist.project || 'No active project'}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
