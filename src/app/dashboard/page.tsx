'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import { Artist } from '@/lib/types'

const STATUS_COLORS: Record<string, { bg: string; text: string; border: string }> = {
  'Emma Donovan': { bg: '#FDF5EF', text: '#C4622D', border: '#E8956A55' },
  'The Stamps': { bg: '#EFF5FD', text: '#2D5F8C', border: '#7EC8E355' },
  'Dustin Tebbutt': { bg: '#EFF5F1', text: '#3D6B50', border: '#A8D5B555' },
  'Sarah Grace Buckley': { bg: '#F5EFF5', text: '#8C5A8C', border: '#D4A8D455' },
}

const DEFAULT_COLOR = { bg: '#F5F0E8', text: '#C4622D', border: '#E8956A55' }

export default function DashboardPage() {
  const [artists, setArtists] = useState<Artist[]>([])
  const [profile, setProfile] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [darkMode, setDarkMode] = useState(false)
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/auth/signin'); return }

      const { data: profileData } = await supabase
        .from('profiles')
        .select('*, orgs(*)')
        .eq('id', user.id)
        .single()
      setProfile(profileData)

      const { data: artistData } = await supabase
        .from('artists')
        .select('*')
        .order('created_at', { ascending: true })
      setArtists(artistData || [])
      setLoading(false)
    }
    load()
  }, [])

  async function handleSignOut() {
    await supabase.auth.signOut()
    router.push('/auth/signin')
  }

  const bg = darkMode ? '#0D0D0D' : '#F5F0E8'
  const ink = darkMode ? '#F5F0E8' : '#1A1714'
  const inkLight = darkMode ? '#4A4540' : '#8A8580'
  const rule = darkMode ? '#2A2520' : '#DDD8CE'

  if (loading) return (
    <div style={{ minHeight: '100vh', background: bg, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'monospace', fontSize: 11, letterSpacing: 3, color: inkLight }}>
      LOADING...
    </div>
  )

  return (
    <div style={{ minHeight: '100vh', background: bg, fontFamily: 'Georgia, serif' }}>

      <div style={{ background: '#1A1714', padding: '20px 32px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <div style={{ fontSize: 24, fontStyle: 'italic', color: '#F5F0E8', letterSpacing: -0.5 }}>advance</div>
          <div style={{ fontFamily: 'monospace', fontSize: 9, letterSpacing: 3, color: '#4A4540', marginTop: 3 }}>TOUR MANAGEMENT</div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ display: 'flex', background: '#2A2520', borderRadius: 6, padding: 3, gap: 2 }}>
            <button onClick={() => setDarkMode(false)} style={{ fontFamily: 'monospace', fontSize: 9, letterSpacing: 2, padding: '4px 12px', borderRadius: 4, border: 'none', cursor: 'pointer', background: !darkMode ? '#F5F0E8' : 'transparent', color: !darkMode ? '#1A1714' : '#4A4540' }}>☀ LIGHT</button>
            <button onClick={() => setDarkMode(true)} style={{ fontFamily: 'monospace', fontSize: 9, letterSpacing: 2, padding: '4px 12px', borderRadius: 4, border: 'none', cursor: 'pointer', background: darkMode ? '#F5F0E8' : 'transparent', color: darkMode ? '#1A1714' : '#4A4540' }}>◑ DARK</button>
          </div>
          <div style={{ width: 32, height: 32, borderRadius: '50%', background: '#C4622D', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, fontWeight: 500, color: '#fff', fontFamily: 'monospace' }}>
            {profile?.full_name?.split(' ').map((n: string) => n[0]).join('').slice(0, 2) || 'MW'}
          </div>
          <button onClick={handleSignOut} style={{ fontFamily: 'monospace', fontSize: 9, letterSpacing: 2, padding: '6px 12px', background: 'transparent', border: '1px solid #2A2520', borderRadius: 4, color: '#4A4540', cursor: 'pointer' }}>
            SIGN OUT
          </button>
        </div>
      </div>

      <div style={{ padding: '28px 32px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <span style={{ fontFamily: 'monospace', fontSize: 9, letterSpacing: 3, color: inkLight }}>YOUR ROSTER</span>
            <div style={{ height: 1, width: 40, background: rule }} />
            <span style={{ fontFamily: 'monospace', fontSize: 9, letterSpacing: 3, color: inkLight }}>{artists.length} ARTISTS</span>
          </div>
          <div style={{ display: 'flex', gap: 10 }}>
            <button onClick={() => router.push('/dashboard/import')} style={{ fontFamily: 'monospace', fontSize: 9, letterSpacing: 2, padding: '7px 16px', background: '#C4622D', color: '#fff', border: 'none', borderRadius: 6, cursor: 'pointer' }}>✦ IMPORT DOC</button>
            <button onClick={() => router.push('/dashboard/artists/new')} style={{ fontFamily: 'monospace', fontSize: 9, letterSpacing: 2, padding: '7px 16px', background: '#1A1714', color: '#F5F0E8', border: 'none', borderRadius: 6, cursor: 'pointer' }}>+ ADD ARTIST</button>
          </div>
        </div>

        {artists.length === 0 && (
          <div style={{ textAlign: 'center', padding: '60px 0', color: inkLight, fontFamily: 'monospace', fontSize: 11, letterSpacing: 2 }}>
            NO ARTISTS YET — ADD YOUR FIRST ONE
          </div>
        )}

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
          {artists.map(artist => {
            const colors = STATUS_COLORS[artist.name] || DEFAULT_COLOR
            return (
              <div
                key={artist.id}
                onClick={() => router.push(`/dashboard/artists/${artist.id}`)}
                style={{ background: darkMode ? '#1A1714' : '#fff', border: `1px solid ${rule}`, borderRadius: 10, padding: '20px 22px', cursor: 'pointer', transition: 'all 0.15s' }}
                onMouseEnter={e => (e.currentTarget.style.border = `1px solid ${colors.text}66`)}
                onMouseLeave={e => (e.currentTarget.style.border = `1px solid ${rule}`)}
              >
                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 }}>
                  <div style={{ width: 42, height: 42, borderRadius: 8, background: colors.bg, border: `1px solid ${colors.border}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'monospace', fontSize: 12, fontWeight: 600, color: colors.text, flexShrink: 0 }}>
                    {artist.name.split(' ').map((n: string) => n[0]).join('').slice(0, 2)}
                  </div>
                  <div style={{ fontFamily: 'monospace', fontSize: 8, letterSpacing: 2, padding: '3px 8px', borderRadius: 3, background: colors.bg, color: colors.text, border: `1px solid ${colors.border}` }}>
                    {artist.status?.toUpperCase() || 'ACTIVE'}
                  </div>
                </div>
                <div style={{ marginTop: 14 }}>
                  <div style={{ fontSize: 16, color: ink, fontWeight: 600, letterSpacing: -0.3 }}>{artist.name}</div>
                  <div style={{ fontSize: 11, color: inkLight, marginTop: 2, fontStyle: 'italic' }}>{artist.project || 'No project set'}</div>
                </div>
                <div style={{ marginTop: 16, paddingTop: 14, borderTop: `1px solid ${rule}` }}>
                  <div style={{ fontFamily: 'monospace', fontSize: 8, letterSpacing: 2, color: inkLight }}>CLICK TO MANAGE</div>
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}