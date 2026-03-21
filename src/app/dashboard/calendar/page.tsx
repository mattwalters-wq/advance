'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'

const supabase = createClient()

export default function CalendarPage() {
  const router = useRouter()
  const [artists, setArtists] = useState<any[]>([])
  const [shows, setShows] = useState<any[]>([])
  const [travel, setTravel] = useState<any[]>([])
  const [darkMode, setDarkMode] = useState(false)
  const [loading, setLoading] = useState(true)
  const [calMonth, setCalMonth] = useState(new Date())

  useEffect(() => { loadData() }, [])

  async function loadData() {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { router.push('/auth/signin'); return }

    const { data: artistsData } = await supabase.from('artists').select('*')
    setArtists(artistsData || [])

    // Load all shows and travel across all tours
    const { data: toursData } = await supabase.from('tours').select('id, artist_id')
    const tourIds = (toursData || []).map((t: any) => t.id)

    if (tourIds.length > 0) {
      const [showsRes, travelRes] = await Promise.all([
        supabase.from('shows').select('*, tours(artist_id)').in('tour_id', tourIds).order('date'),
        supabase.from('travel').select('*, tours(artist_id)').in('tour_id', tourIds).order('travel_date'),
      ])
      setShows(showsRes.data || [])
      setTravel(travelRes.data || [])
    }
    setLoading(false)
  }

  function artistColor(artistId: string) {
    const a = artists.find(a => a.id === artistId)
    return a?.color || '#C4622D'
  }
  function artistName(artistId: string) {
    const a = artists.find(a => a.id === artistId)
    return a?.name || ''
  }
  function getDaysInMonth(y: number, m: number) { return new Date(y, m + 1, 0).getDate() }
  function getFirstDay(y: number, m: number) { return new Date(y, m, 1).getDay() }
  function toDateStr(y: number, m: number, d: number) {
    return `${y}-${String(m + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`
  }
  function formatTime(t: string) {
    if (!t) return ''
    const [h, m] = t.split(':')
    const hour = parseInt(h)
    return `${hour % 12 || 12}:${m}${hour >= 12 ? 'pm' : 'am'}`
  }

  const bg = darkMode ? '#1a1a1a' : '#F5F0E8'
  const card = darkMode ? '#2a2a2a' : '#fff'
  const text = darkMode ? '#e8e0d0' : '#1A1714'
  const muted = darkMode ? '#888' : '#8A8580'
  const accent = '#C4622D'
  const border = darkMode ? '#333' : '#DDD8CE'
  const calBg = darkMode ? '#222' : '#faf7f2'

  const year = calMonth.getFullYear()
  const month = calMonth.getMonth()
  const daysInMonth = getDaysInMonth(year, month)
  const firstDay = getFirstDay(year, month)
  const monthName = calMonth.toLocaleDateString('en-AU', { month: 'long', year: 'numeric' })
  const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

  if (loading) return <div style={{ background: bg, minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', color: text, fontFamily: 'Georgia, serif' }}>Loading...</div>

  return (
    <div style={{ background: bg, minHeight: '100vh', fontFamily: 'Georgia, serif', color: text }}>

      {/* Header */}
      <div style={{ background: darkMode ? '#111' : '#1A1714', padding: '16px 32px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <button onClick={() => router.push('/dashboard')} style={{ background: 'none', border: 'none', color: '#8A8580', cursor: 'pointer', fontSize: 14 }}>← Roster</button>
          <span style={{ fontSize: 20, fontStyle: 'italic', color: '#F5F0E8' }}>Advance</span>
          <span style={{ fontFamily: 'monospace', fontSize: 9, letterSpacing: 2, color: accent }}>CALENDAR</span>
        </div>
        <button onClick={() => setDarkMode(!darkMode)}
          style={{ background: 'none', border: '1px solid #333', borderRadius: 6, padding: '6px 12px', color: '#F5F0E8', cursor: 'pointer', fontSize: 12 }}>
          {darkMode ? '☀️ Light' : '🌙 Dark'}
        </button>
      </div>

      <div style={{ maxWidth: 1000, margin: '0 auto', padding: '24px 16px' }}>

        {/* Artist legend */}
        {artists.length > 0 && (
          <div style={{ display: 'flex', gap: 12, marginBottom: 20, flexWrap: 'wrap' }}>
            {artists.map(a => (
              <div key={a.id} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: muted, cursor: 'pointer' }}
                onClick={() => router.push(`/dashboard/artists/${a.id}`)}>
                <div style={{ width: 10, height: 10, borderRadius: '50%', background: a.color || accent }} />
                {a.name}
              </div>
            ))}
          </div>
        )}

        {/* Calendar */}
        <div style={{ background: card, borderRadius: 12, border: `1px solid ${border}`, overflow: 'hidden' }}>

          {/* Month nav */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 20px', borderBottom: `1px solid ${border}` }}>
            <button onClick={() => setCalMonth(new Date(year, month - 1, 1))}
              style={{ background: 'none', border: `1px solid ${border}`, borderRadius: 6, padding: '6px 14px', cursor: 'pointer', color: text, fontSize: 14 }}>←</button>
            <div style={{ fontFamily: 'monospace', fontSize: 11, letterSpacing: 3, textTransform: 'uppercase', color: muted }}>{monthName}</div>
            <button onClick={() => setCalMonth(new Date(year, month + 1, 1))}
              style={{ background: 'none', border: `1px solid ${border}`, borderRadius: 6, padding: '6px 14px', cursor: 'pointer', color: text, fontSize: 14 }}>→</button>
          </div>

          {/* Day headers */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', borderBottom: `1px solid ${border}` }}>
            {dayNames.map(d => (
              <div key={d} style={{ padding: '8px 4px', textAlign: 'center', fontFamily: 'monospace', fontSize: 9, letterSpacing: 2, color: muted, textTransform: 'uppercase' }}>{d}</div>
            ))}
          </div>

          {/* Grid */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)' }}>
            {Array.from({ length: firstDay }).map((_, i) => (
              <div key={`e${i}`} style={{ minHeight: 90, borderRight: `1px solid ${border}`, borderBottom: `1px solid ${border}`, background: calBg }} />
            ))}

            {Array.from({ length: daysInMonth }).map((_, i) => {
              const day = i + 1
              const dateStr = toDateStr(year, month, day)
              const dayShows = shows.filter(s => s.date === dateStr)
              const dayTravel = travel.filter(t => t.travel_date === dateStr)
              const hasAnything = dayShows.length > 0 || dayTravel.length > 0
              const col = (firstDay + i) % 7
              const today = new Date()
              const isToday = today.getFullYear() === year && today.getMonth() === month && today.getDate() === day

              return (
                <div key={day} style={{
                  minHeight: 90, padding: '6px 6px',
                  borderRight: col < 6 ? `1px solid ${border}` : 'none',
                  borderBottom: `1px solid ${border}`,
                  background: hasAnything ? (darkMode ? '#2a2218' : '#fffaf4') : 'transparent',
                }}>
                  <div style={{
                    fontSize: 12, marginBottom: 4,
                    width: 22, height: 22, display: 'flex', alignItems: 'center', justifyContent: 'center',
                    borderRadius: '50%',
                    background: isToday ? accent : 'transparent',
                    color: isToday ? '#fff' : hasAnything ? text : muted,
                    fontWeight: isToday ? 700 : 400,
                  }}>{day}</div>

                  {dayShows.map((show, si) => {
                    const artistId = show.tours?.artist_id
                    const color = artistColor(artistId)
                    const name = artistName(artistId)
                    return (
                      <div key={si} title={`${name} — ${show.venue}`}
                        style={{ fontSize: 10, background: color, color: '#fff', borderRadius: 3, padding: '2px 5px', marginBottom: 2, lineHeight: 1.3, overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis', cursor: 'pointer' }}
                        onClick={() => router.push(`/dashboard/artists/${artistId}`)}>
                        🎵 {name ? name.split(' ')[0] : show.venue}
                      </div>
                    )
                  })}
                  {dayTravel.map((t, ti) => {
                    const artistId = t.tours?.artist_id
                    const name = artistName(artistId)
                    return (
                      <div key={ti} title={`${name} — ${t.from_location} → ${t.to_location}`}
                        style={{ fontSize: 10, background: darkMode ? '#2a3a4a' : '#e8f0f8', color: darkMode ? '#8ab4d4' : '#2a5a8a', borderRadius: 3, padding: '2px 5px', marginBottom: 2, lineHeight: 1.3, overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis', cursor: 'pointer' }}
                        onClick={() => router.push(`/dashboard/artists/${artistId}`)}>
                        ✈️ {name ? name.split(' ')[0] : t.from_location}
                      </div>
                    )
                  })}
                </div>
              )
            })}
          </div>
        </div>

        {/* This month summary */}
        {(() => {
          const monthShows = shows.filter(s => {
            const d = new Date(s.date + 'T00:00:00')
            return d.getFullYear() === year && d.getMonth() === month
          })
          if (monthShows.length === 0) return null
          return (
            <div style={{ marginTop: 24, background: card, borderRadius: 12, padding: 20, border: `1px solid ${border}` }}>
              <div style={{ fontFamily: 'monospace', fontSize: 10, letterSpacing: 3, color: muted, textTransform: 'uppercase', marginBottom: 16 }}>
                {monthName} — {monthShows.length} show{monthShows.length !== 1 ? 's' : ''}
              </div>
              {monthShows.map((show, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 0', borderBottom: i < monthShows.length - 1 ? `1px solid ${border}` : 'none', cursor: 'pointer' }}
                  onClick={() => router.push(`/dashboard/artists/${show.tours?.artist_id}`)}>
                  <div style={{ width: 8, height: 8, borderRadius: '50%', background: artistColor(show.tours?.artist_id), flexShrink: 0 }} />
                  <div style={{ fontSize: 12, color: muted, fontFamily: 'monospace', width: 80, flexShrink: 0 }}>{show.date}</div>
                  <div style={{ fontSize: 14, fontWeight: 500 }}>{show.venue}</div>
                  <div style={{ fontSize: 12, color: muted }}>{show.city}</div>
                  <div style={{ fontSize: 12, color: muted, marginLeft: 'auto' }}>{artistName(show.tours?.artist_id)}</div>
                </div>
              ))}
            </div>
          )
        })()}
      </div>
    </div>
  )
}
