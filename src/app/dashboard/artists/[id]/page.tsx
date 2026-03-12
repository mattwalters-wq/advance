'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'

const supabase = createClient()

export default function ArtistPage() {
  const params = useParams()
  const router = useRouter()
  const [artist, setArtist] = useState<any>(null)
  const [tours, setTours] = useState<any[]>([])
  const [selectedTour, setSelectedTour] = useState<any>(null)
  const [shows, setShows] = useState<any[]>([])
  const [travel, setTravel] = useState<any[]>([])
  const [accommodation, setAccommodation] = useState<any[]>([])
  const [contacts, setContacts] = useState<any[]>([])
  const [darkMode, setDarkMode] = useState(false)
  const [loading, setLoading] = useState(true)
  const [copied, setCopied] = useState(false)
  const [sharing, setSharing] = useState(false)
  const [view, setView] = useState<'list' | 'calendar'>('list')
  const [calMonth, setCalMonth] = useState(new Date())

  useEffect(() => { loadArtist() }, [params.id])
  useEffect(() => { if (selectedTour) loadTourData(selectedTour.id) }, [selectedTour])

  async function loadArtist() {
    const { data: artistData } = await supabase.from('artists').select('*').eq('id', params.id).single()
    if (!artistData) { router.push('/dashboard'); return }
    setArtist(artistData)
    const { data: toursData } = await supabase.from('tours').select('*').eq('artist_id', params.id).order('start_date', { ascending: true })
    setTours(toursData || [])
    if (toursData && toursData.length > 0) setSelectedTour(toursData[0])
    setLoading(false)
  }

  async function loadTourData(tourId: string) {
    const [s, t, a, c] = await Promise.all([
      supabase.from('shows').select('*').eq('tour_id', tourId).order('date'),
      supabase.from('travel').select('*').eq('tour_id', tourId).order('travel_date'),
      supabase.from('accommodation').select('*').eq('tour_id', tourId).order('check_in'),
      supabase.from('contacts').select('*').eq('tour_id', tourId),
    ])
    setShows(s.data || [])
    setTravel(t.data || [])
    setAccommodation(a.data || [])
    setContacts(c.data || [])
  }

  async function handleShare() {
    if (!selectedTour) return
    setSharing(true)
    let token = selectedTour.share_token
    if (!token) {
      token = Math.random().toString(36).substring(2, 10) + Math.random().toString(36).substring(2, 10)
      const { data } = await supabase.from('tours').update({ share_token: token }).eq('id', selectedTour.id).select().single()
      if (data) setSelectedTour(data)
    }
    const url = `${window.location.origin}/tour/${token}`
    await navigator.clipboard.writeText(url)
    setCopied(true)
    setSharing(false)
    setTimeout(() => setCopied(false), 3000)
  }

  // Calendar helpers
  function getDaysInMonth(year: number, month: number) {
    return new Date(year, month + 1, 0).getDate()
  }
  function getFirstDayOfMonth(year: number, month: number) {
    return new Date(year, month, 1).getDay()
  }
  function showsOnDate(dateStr: string) {
    return shows.filter(s => s.date === dateStr)
  }
  function travelOnDate(dateStr: string) {
    return travel.filter(t => t.travel_date === dateStr)
  }
  function accomOnDate(dateStr: string) {
    return accommodation.filter(a => {
      if (!a.check_in) return false
      return a.check_in === dateStr
    })
  }
  function toDateStr(year: number, month: number, day: number) {
    return `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
  }
  function formatTime(t: string) {
    if (!t) return ''
    const [h, m] = t.split(':')
    const hour = parseInt(h)
    const ampm = hour >= 12 ? 'pm' : 'am'
    return `${hour % 12 || 12}:${m}${ampm}`
  }

  const bg = darkMode ? '#1a1a1a' : '#f5f0e8'
  const card = darkMode ? '#2a2a2a' : '#ffffff'
  const text = darkMode ? '#e8e0d0' : '#2c2c2c'
  const muted = darkMode ? '#888' : '#999'
  const accent = '#C4622D'
  const border = darkMode ? '#333' : '#e8e0d0'
  const calBg = darkMode ? '#222' : '#faf7f2'

  const year = calMonth.getFullYear()
  const month = calMonth.getMonth()
  const daysInMonth = getDaysInMonth(year, month)
  const firstDay = getFirstDayOfMonth(year, month)
  const monthName = calMonth.toLocaleDateString('en-AU', { month: 'long', year: 'numeric' })
  const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

  if (loading) return <div style={{ background: bg, minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', color: text }}>Loading...</div>

  return (
    <div style={{ background: bg, minHeight: '100vh', fontFamily: 'Georgia, serif', color: text }}>

      {/* Header */}
      <div style={{ borderBottom: `1px solid ${border}`, padding: '16px 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <button onClick={() => router.push('/dashboard')} style={{ background: 'none', border: 'none', color: muted, cursor: 'pointer', fontSize: 14 }}>← Back</button>
          <div>
            <div style={{ fontSize: 20, fontWeight: 600 }}>{artist?.name}</div>
            <div style={{ fontSize: 13, color: muted, fontStyle: 'italic' }}>{artist?.project}</div>
          </div>
        </div>
        <button onClick={() => setDarkMode(!darkMode)} style={{ background: 'none', border: `1px solid ${border}`, borderRadius: 6, padding: '6px 12px', color: text, cursor: 'pointer', fontSize: 13 }}>
          {darkMode ? '☀️ Light' : '🌙 Dark'}
        </button>
      </div>

      <div style={{ maxWidth: 900, margin: '0 auto', padding: 24 }}>

        {/* Tour tabs */}
        {tours.length > 1 && (
          <div style={{ display: 'flex', gap: 8, marginBottom: 24, flexWrap: 'wrap' }}>
            {tours.map(tour => (
              <button key={tour.id} onClick={() => setSelectedTour(tour)}
                style={{ padding: '8px 16px', borderRadius: 20, border: `1px solid ${border}`, background: selectedTour?.id === tour.id ? accent : card, color: selectedTour?.id === tour.id ? '#fff' : text, cursor: 'pointer', fontSize: 13 }}>
                {tour.name}
              </button>
            ))}
          </div>
        )}

        {tours.length === 0 && (
          <div style={{ textAlign: 'center', padding: 60, color: muted }}>
            <div style={{ fontSize: 32, marginBottom: 12 }}>📄</div>
            <div>No tours yet. Use Import Doc on the dashboard to add one.</div>
          </div>
        )}

        {selectedTour && (
          <>
            {/* Toolbar */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20, flexWrap: 'wrap', gap: 12 }}>
              {/* Share */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <button onClick={handleShare} disabled={sharing}
                  style={{ padding: '10px 20px', background: copied ? '#2d7a4f' : accent, color: '#fff', border: 'none', borderRadius: 8, cursor: 'pointer', fontFamily: 'monospace', fontSize: 10, letterSpacing: 2, transition: 'background 0.2s' }}>
                  {copied ? '✓ LINK COPIED' : sharing ? '...' : '🔗 SHARE CREW LINK'}
                </button>
                {copied && <span style={{ fontSize: 12, color: '#2d7a4f' }}>Send to band & crew — no login needed</span>}
              </div>

              {/* View toggle */}
              <div style={{ display: 'flex', border: `1px solid ${border}`, borderRadius: 8, overflow: 'hidden' }}>
                {(['list', 'calendar'] as const).map(v => (
                  <button key={v} onClick={() => setView(v)}
                    style={{ padding: '8px 16px', background: view === v ? accent : 'transparent', color: view === v ? '#fff' : muted, border: 'none', cursor: 'pointer', fontFamily: 'monospace', fontSize: 10, letterSpacing: 2, textTransform: 'uppercase' }}>
                    {v === 'list' ? '☰ List' : '▦ Calendar'}
                  </button>
                ))}
              </div>
            </div>

            {/* LIST VIEW */}
            {view === 'list' && (
              <div style={{ display: 'grid', gap: 20 }}>
                {shows.length > 0 && (
                  <div style={{ background: card, borderRadius: 12, padding: 20, border: `1px solid ${border}` }}>
                    <div style={{ fontSize: 11, letterSpacing: '0.1em', color: muted, marginBottom: 16, textTransform: 'uppercase', fontFamily: 'monospace' }}>Shows — {shows.length}</div>
                    {shows.map((show, i) => (
                      <div key={i} style={{ padding: '12px 0', borderBottom: i < shows.length - 1 ? `1px solid ${border}` : 'none' }}>
                        <div style={{ fontWeight: 600, marginBottom: 4 }}>{show.venue}</div>
                        <div style={{ fontSize: 13, color: muted }}>{show.date} · {show.set_time}{show.stage ? ` · ${show.stage}` : ''}</div>
                        {show.city && <div style={{ fontSize: 13, color: muted }}>{show.city}{show.country ? `, ${show.country}` : ''}</div>}
                        {show.notes && <div style={{ fontSize: 12, color: muted, marginTop: 4, fontStyle: 'italic' }}>{show.notes}</div>}
                      </div>
                    ))}
                  </div>
                )}
                {travel.length > 0 && (
                  <div style={{ background: card, borderRadius: 12, padding: 20, border: `1px solid ${border}` }}>
                    <div style={{ fontSize: 11, letterSpacing: '0.1em', color: muted, marginBottom: 16, textTransform: 'uppercase', fontFamily: 'monospace' }}>Travel — {travel.length} items</div>
                    {travel.map((t, i) => (
                      <div key={i} style={{ padding: '12px 0', borderBottom: i < travel.length - 1 ? `1px solid ${border}` : 'none' }}>
                        <div style={{ fontWeight: 600, marginBottom: 4 }}>{t.from_location} → {t.to_location}</div>
                        <div style={{ fontSize: 13, color: muted }}>{t.travel_date} · {t.carrier} {t.reference}</div>
                        {t.departure_time && <div style={{ fontSize: 13, color: muted }}>Departs {t.departure_time}{t.arrival_time ? ` · Arrives ${t.arrival_time}` : ''}</div>}
                      </div>
                    ))}
                  </div>
                )}
                {accommodation.length > 0 && (
                  <div style={{ background: card, borderRadius: 12, padding: 20, border: `1px solid ${border}` }}>
                    <div style={{ fontSize: 11, letterSpacing: '0.1em', color: muted, marginBottom: 16, textTransform: 'uppercase', fontFamily: 'monospace' }}>Accommodation — {accommodation.length}</div>
                    {accommodation.map((a, i) => (
                      <div key={i} style={{ padding: '12px 0', borderBottom: i < accommodation.length - 1 ? `1px solid ${border}` : 'none' }}>
                        <div style={{ fontWeight: 600, marginBottom: 4 }}>{a.name}</div>
                        <div style={{ fontSize: 13, color: muted }}>{a.address}</div>
                        <div style={{ fontSize: 13, color: muted }}>Check in: {a.check_in}{a.check_out ? ` · Check out: ${a.check_out}` : ''}</div>
                        {a.confirmation && <div style={{ fontSize: 13, color: muted }}>Ref: {a.confirmation}</div>}
                      </div>
                    ))}
                  </div>
                )}
                {contacts.length > 0 && (
                  <div style={{ background: card, borderRadius: 12, padding: 20, border: `1px solid ${border}` }}>
                    <div style={{ fontSize: 11, letterSpacing: '0.1em', color: muted, marginBottom: 16, textTransform: 'uppercase', fontFamily: 'monospace' }}>Contacts — {contacts.length}</div>
                    {contacts.map((c, i) => (
                      <div key={i} style={{ padding: '12px 0', borderBottom: i < contacts.length - 1 ? `1px solid ${border}` : 'none' }}>
                        <div style={{ fontWeight: 600, marginBottom: 4 }}>{c.name}</div>
                        <div style={{ fontSize: 13, color: muted }}>{c.role}</div>
                        {c.phone && <div style={{ fontSize: 13, color: muted }}>📞 {c.phone}</div>}
                        {c.email && <div style={{ fontSize: 13, color: muted }}>✉️ {c.email}</div>}
                      </div>
                    ))}
                  </div>
                )}
                {shows.length === 0 && travel.length === 0 && accommodation.length === 0 && contacts.length === 0 && (
                  <div style={{ textAlign: 'center', padding: 60, color: muted }}>
                    <div style={{ fontSize: 32, marginBottom: 12 }}>📄</div>
                    <div>No data yet. Import a document to populate this tour.</div>
                  </div>
                )}
              </div>
            )}

            {/* CALENDAR VIEW */}
            {view === 'calendar' && (
              <div style={{ background: card, borderRadius: 12, border: `1px solid ${border}`, overflow: 'hidden' }}>
                {/* Month nav */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 20px', borderBottom: `1px solid ${border}` }}>
                  <button onClick={() => setCalMonth(new Date(year, month - 1, 1))}
                    style={{ background: 'none', border: `1px solid ${border}`, borderRadius: 6, padding: '6px 12px', cursor: 'pointer', color: text, fontSize: 14 }}>←</button>
                  <div style={{ fontFamily: 'monospace', fontSize: 11, letterSpacing: 3, textTransform: 'uppercase', color: muted }}>{monthName}</div>
                  <button onClick={() => setCalMonth(new Date(year, month + 1, 1))}
                    style={{ background: 'none', border: `1px solid ${border}`, borderRadius: 6, padding: '6px 12px', cursor: 'pointer', color: text, fontSize: 14 }}>→</button>
                </div>

                {/* Day name headers */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', borderBottom: `1px solid ${border}` }}>
                  {dayNames.map(d => (
                    <div key={d} style={{ padding: '8px 4px', textAlign: 'center', fontFamily: 'monospace', fontSize: 9, letterSpacing: 2, color: muted, textTransform: 'uppercase' }}>{d}</div>
                  ))}
                </div>

                {/* Calendar grid */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)' }}>
                  {/* Empty leading cells */}
                  {Array.from({ length: firstDay }).map((_, i) => (
                    <div key={`empty-${i}`} style={{ minHeight: 80, borderRight: `1px solid ${border}`, borderBottom: `1px solid ${border}`, background: calBg }} />
                  ))}

                  {/* Day cells */}
                  {Array.from({ length: daysInMonth }).map((_, i) => {
                    const day = i + 1
                    const dateStr = toDateStr(year, month, day)
                    const dayShows = showsOnDate(dateStr)
                    const dayTravel = travelOnDate(dateStr)
                    const dayAccom = accomOnDate(dateStr)
                    const hasAnything = dayShows.length > 0 || dayTravel.length > 0 || dayAccom.length > 0
                    const today = new Date()
                    const isToday = today.getFullYear() === year && today.getMonth() === month && today.getDate() === day
                    const col = (firstDay + i) % 7

                    return (
                      <div key={day} style={{
                        minHeight: 80, padding: '6px 8px',
                        borderRight: col < 6 ? `1px solid ${border}` : 'none',
                        borderBottom: `1px solid ${border}`,
                        background: hasAnything ? (darkMode ? '#2a2218' : '#fffaf4') : 'transparent',
                      }}>
                        <div style={{
                          fontSize: 12, fontWeight: isToday ? 700 : 400,
                          marginBottom: 4,
                          width: 22, height: 22, display: 'flex', alignItems: 'center', justifyContent: 'center',
                          borderRadius: '50%', background: isToday ? accent : 'transparent',
                          color: isToday ? '#fff' : hasAnything ? text : muted,
                        }}>{day}</div>

                        {dayShows.map((show, si) => (
                          <div key={si} style={{ fontSize: 10, background: accent, color: '#fff', borderRadius: 3, padding: '2px 5px', marginBottom: 2, lineHeight: 1.3, overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis' }}>
                            🎵 {show.set_time ? formatTime(show.set_time) : show.venue}
                          </div>
                        ))}
                        {dayTravel.map((t, ti) => (
                          <div key={ti} style={{ fontSize: 10, background: darkMode ? '#2a3a4a' : '#e8f0f8', color: darkMode ? '#8ab4d4' : '#2a5a8a', borderRadius: 3, padding: '2px 5px', marginBottom: 2, lineHeight: 1.3, overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis' }}>
                            ✈️ {t.from_location}→{t.to_location}
                          </div>
                        ))}
                        {dayAccom.map((a, ai) => (
                          <div key={ai} style={{ fontSize: 10, background: darkMode ? '#2a3a2a' : '#e8f4e8', color: darkMode ? '#8ad48a' : '#2a6a2a', borderRadius: 3, padding: '2px 5px', marginBottom: 2, lineHeight: 1.3, overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis' }}>
                            🏨 {a.name}
                          </div>
                        ))}
                      </div>
                    )
                  })}
                </div>

                {/* Legend */}
                <div style={{ padding: '12px 20px', borderTop: `1px solid ${border}`, display: 'flex', gap: 16, flexWrap: 'wrap' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, color: muted }}>
                    <div style={{ width: 10, height: 10, borderRadius: 2, background: accent }} /> Show
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, color: muted }}>
                    <div style={{ width: 10, height: 10, borderRadius: 2, background: darkMode ? '#2a3a4a' : '#e8f0f8' }} /> Travel
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, color: muted }}>
                    <div style={{ width: 10, height: 10, borderRadius: 2, background: darkMode ? '#2a3a2a' : '#e8f4e8' }} /> Hotel check-in
                  </div>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}
