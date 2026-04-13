'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase'
import { useRouter } from 'next/navigation'

const supabase = createClient()

export default function DashboardPage() {
  const [artists, setArtists] = useState<any[]>([])
  const [user, setUser] = useState<any>(null)
  const [profile, setProfile] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [menuOpen, setMenuOpen] = useState(false)
  const router = useRouter()

  useEffect(() => { loadData() }, [])

  async function loadData() {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { router.push('/auth/signin'); return }
    setUser(user)
    // Parallelise profile + artists
    const [profileRes, artistsRes] = await Promise.all([
      supabase.from('profiles').select('*').eq('id', user.id).single(),
      supabase.from('artists').select('*').order('name'),
    ])
    let profile = profileRes.data
    // If no profile or no org, run full setup
    if (!profile?.org_id) {
      const res = await fetch('/api/setup-account', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: user.id, email: user.email, fullName: profile?.full_name || '' }),
      })
      const setupData = await res.json()
      if (setupData.success) {
        const { data: refreshed } = await supabase.from('profiles').select('*').eq('id', user.id).single()
        profile = refreshed
      }
    }
    setProfile(profile)
    setArtists(artistsRes.data || [])
    setLoading(false)
  }

  async function handleSignout() {
    await supabase.auth.signOut()
    router.push('/auth/signin')
  }

  if (loading) return (
    <div style={{ background: '#F4EFE6', minHeight: '100vh', fontFamily: '"Georgia", serif' }}>
      <style>{`@keyframes shimmer { 0%{background-position:-200% 0} 100%{background-position:200% 0} } .sk{background:linear-gradient(90deg,#E8E0D4 25%,#F0E8DC 50%,#E8E0D4 75%);background-size:200% 100%;animation:shimmer 1.4s infinite;border-radius:6px;}`}</style>
      <div style={{ background: '#0F0E0C', height: 56 }} />
      <div style={{ maxWidth: 1100, margin: '0 auto', padding: '40px 24px' }}>
        <div className="sk" style={{ width: 120, height: 12, marginBottom: 12 }} />
        <div className="sk" style={{ width: 200, height: 36, marginBottom: 40 }} />
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 16 }}>
          {[1,2,3,4].map(i => (
            <div key={i} style={{ background: '#fff', borderRadius: 14, overflow: 'hidden', border: '1px solid #E8E0D4' }}>
              <div style={{ height: 5, background: '#E8E0D4' }} />
              <div style={{ padding: '20px 22px 22px' }}>
                <div className="sk" style={{ width: 44, height: 44, borderRadius: 10, marginBottom: 16 }} />
                <div className="sk" style={{ width: '70%', height: 18, marginBottom: 8 }} />
                <div className="sk" style={{ width: '50%', height: 12 }} />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )

  return (
    <div style={{ background: '#F4EFE6', minHeight: '100vh', fontFamily: '"Georgia", serif' }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,400;0,700;1,400&display=swap');
        @media (max-width: 600px) {
          .dashboard-header { flex-direction: column !important; align-items: flex-start !important; }
          .dashboard-header h1 { font-size: 26px !important; }
          .dashboard-nav { gap: 0 !important; }
          .dashboard-nav button { padding: 6px 8px !important; font-size: 12px !important; }
        }
        * { box-sizing: border-box; }
        .artist-card:hover { transform: translateY(-2px); box-shadow: 0 8px 32px rgba(0,0,0,0.12) !important; }
        .artist-card:hover .card-arrow { opacity: 1 !important; transform: translateX(0) !important; }
        .nav-btn:hover { background: rgba(255,255,255,0.08) !important; }
        .action-btn:hover { opacity: 0.85; }
        @keyframes fadeIn { from { opacity: 0; transform: translateY(8px) } to { opacity: 1; transform: translateY(0) } }
        .fade-in { animation: fadeIn 0.4s ease forwards; }
      `}</style>

      {/* Header */}
      <header style={{ background: '#0F0E0C', borderBottom: '1px solid #1E1C18' }}>
        <div style={{ maxWidth: 1100, margin: '0 auto', padding: '0 24px', height: 56, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          {/* Logo */}
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 10 }}>
            <span style={{ fontFamily: '"Playfair Display", Georgia, serif', fontSize: 22, fontStyle: 'italic', color: '#F4EFE6', letterSpacing: '-0.02em' }}>Advance</span>
            <span style={{ fontFamily: 'monospace', fontSize: 8, letterSpacing: '0.25em', color: '#C4622D' }}>✦</span>
          </div>

          {/* Nav */}
          <nav style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            {[
              { label: 'Calendar', path: '/dashboard/calendar', icon: '▦' },
              { label: 'Search', path: '/dashboard/search', icon: '⌕' },
            ].map(item => (
              <button key={item.path} onClick={() => router.push(item.path)} className="nav-btn"
                style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '6px 12px', background: 'transparent', border: 'none', color: '#7A7570', cursor: 'pointer', borderRadius: 6, fontSize: 13, fontFamily: '"Georgia", serif', transition: 'background 0.15s' }}>
                <span style={{ fontSize: 11, opacity: 0.7 }}>{item.icon}</span> {item.label}
              </button>
            ))}
            <div style={{ width: 1, height: 20, background: '#2A2520', margin: '0 4px' }} />
            <div style={{ position: 'relative' }}>
              <button onClick={() => setMenuOpen(!menuOpen)} className="nav-btn"
                style={{ width: 32, height: 32, borderRadius: '50%', background: '#C4622D', border: 'none', cursor: 'pointer', color: '#fff', fontSize: 13, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                {(profile?.full_name || user?.email || 'M').charAt(0).toUpperCase()}
              </button>
              {menuOpen && (
                <div style={{ position: 'absolute', right: 0, top: 40, background: '#1A1714', borderRadius: 10, padding: '6px', minWidth: 160, boxShadow: '0 8px 32px rgba(0,0,0,0.4)', zIndex: 50 }}
                  onMouseLeave={() => setMenuOpen(false)}>
                  <div style={{ padding: '8px 12px', fontSize: 12, color: '#7A7570', fontFamily: 'monospace', borderBottom: '1px solid #2A2520', marginBottom: 4 }}>
                    {profile?.full_name || user?.email}
                  </div>
                  <button onClick={handleSignout}
                    style={{ width: '100%', padding: '8px 12px', background: 'transparent', border: 'none', color: '#F4EFE6', cursor: 'pointer', borderRadius: 6, fontSize: 13, textAlign: 'left', fontFamily: '"Georgia", serif' }}>
                    Sign out
                  </button>
                </div>
              )}
            </div>
          </nav>
        </div>
      </header>

      {/* Main */}
      <main style={{ maxWidth: 1100, margin: '0 auto', padding: '40px 24px' }}>

        {/* Page header */}
        <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', marginBottom: 36, flexWrap: 'wrap', gap: 16 }}>
          <div>
            <div style={{ fontFamily: 'monospace', fontSize: 10, letterSpacing: '0.25em', color: '#B8A898', marginBottom: 6, textTransform: 'uppercase' }}>
              {new Date().toLocaleDateString('en-AU', { weekday: 'long', day: 'numeric', month: 'long' })}
            </div>
            <h1 style={{ fontFamily: '"Playfair Display", Georgia, serif', fontSize: 36, fontWeight: 400, color: '#1A1714', margin: 0, lineHeight: 1.1 }}>
              Your Roster
            </h1>
          </div>
          <div style={{ display: 'flex', gap: 10 }}>
            <button onClick={() => router.push('/dashboard/artists/new')} className="action-btn"
              style={{ padding: '10px 20px', background: '#C4622D', color: '#fff', border: 'none', borderRadius: 8, fontFamily: 'monospace', fontSize: 10, letterSpacing: '0.2em', cursor: 'pointer', transition: 'opacity 0.15s' }}>
              + ARTIST
            </button>
          </div>
        </div>

        {/* Artist grid */}
        {artists.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '80px 20px' }}>
            <div style={{ fontFamily: '"Playfair Display", Georgia, serif', fontSize: 28, color: '#C8BFB0', fontStyle: 'italic', marginBottom: 12 }}>No artists yet</div>
            <div style={{ color: '#B8A898', fontSize: 14, marginBottom: 24 }}>Add an artist or import a tour document to get started.</div>
            <button onClick={() => router.push('/dashboard/artists/new')}
              style={{ padding: '12px 28px', background: '#C4622D', color: '#fff', border: 'none', borderRadius: 8, fontFamily: 'monospace', fontSize: 10, letterSpacing: '0.2em', cursor: 'pointer' }}>
              + ADD ARTIST
            </button>
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 16 }}>
            {artists.map((artist, i) => (
              <div key={artist.id} className="artist-card fade-in" onClick={() => router.push(`/dashboard/artists/${artist.id}`)}
                style={{ background: '#fff', borderRadius: 14, overflow: 'hidden', cursor: 'pointer', border: '1px solid #E8E0D4', transition: 'transform 0.2s, box-shadow 0.2s', boxShadow: '0 2px 8px rgba(0,0,0,0.05)', animationDelay: `${i * 0.06}s`, animationFillMode: 'both' }}>
                {/* Colour band */}
                <div style={{ height: 5, background: artist.color || '#C4622D' }} />
                <div style={{ padding: '20px 22px 22px' }}>
                  <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 16 }}>
                    <div style={{ width: 44, height: 44, borderRadius: 10, background: artist.color || '#C4622D', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: 18, fontWeight: 700, fontFamily: '"Playfair Display", Georgia, serif', fontStyle: 'italic' }}>
                      {artist.name.charAt(0)}
                    </div>
                    <span className="card-arrow" style={{ color: '#C8BFB0', fontSize: 18, opacity: 0, transform: 'translateX(-4px)', transition: 'all 0.2s' }}>→</span>
                  </div>
                  <div style={{ fontFamily: '"Playfair Display", Georgia, serif', fontSize: 18, fontWeight: 700, color: '#1A1714', marginBottom: 4, lineHeight: 1.2 }}>{artist.name}</div>
                  <div style={{ fontSize: 12, color: '#B8A898', fontStyle: 'italic', lineHeight: 1.4 }}>{artist.project || 'No active project'}</div>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  )
}
