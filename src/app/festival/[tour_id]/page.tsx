'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import { createClient } from '@/lib/supabase'

const supabase = createClient()

function fmt(t: string) {
  if (!t) return ''
  const [h, m] = t.split(':')
  const hour = parseInt(h)
  return `${hour % 12 || 12}:${m}${hour >= 12 ? 'pm' : 'am'}`
}

function fmtDateLong(d: string) {
  if (!d) return ''
  return new Date(d + 'T00:00:00').toLocaleDateString('en-AU', {
    weekday: 'long', day: 'numeric', month: 'long'
  })
}

function fmtDateShort(d: string) {
  if (!d) return ''
  return new Date(d + 'T00:00:00').toLocaleDateString('en-AU', {
    weekday: 'short', day: 'numeric', month: 'short'
  })
}

export default function FestivalSheetPage() {
  const params = useParams()
  const [tour, setTour] = useState<any>(null)
  const [artist, setArtist] = useState<any>(null)
  const [shows, setShows] = useState<any[]>([])
  const [press, setPress] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [expandedDays, setExpandedDays] = useState<Set<string>>(new Set())

  useEffect(() => { loadData() }, [params.tour_id])

  async function loadData() {
    const [tourRes, showsRes, pressRes] = await Promise.all([
      supabase.from('tours').select('*, artists(*)').eq('id', params.tour_id).single(),
      supabase.from('shows').select('*').eq('tour_id', params.tour_id).order('date'),
      supabase.from('press').select('*').eq('tour_id', params.tour_id).order('date'),
    ])
    if (tourRes.data) {
      setTour(tourRes.data)
      if (tourRes.data.artists) setArtist(tourRes.data.artists)
    }
    setShows(showsRes.data || [])
    setPress(pressRes.data || [])

    // Auto-expand today's day if it's in the festival, else expand all
    const today = new Date().toISOString().split('T')[0]
    const allDates = new Set<string>([
      ...(showsRes.data || []).map((s: any) => s.date),
      ...(pressRes.data || []).map((p: any) => p.date),
    ])
    if (allDates.has(today)) {
      setExpandedDays(new Set([today]))
    } else {
      setExpandedDays(allDates)
    }

    setLoading(false)
  }

  const accent = '#C4622D'
  const accentLight = '#FDF5EF'
  const border = '#E8E2D8'
  const muted = '#8A8580'
  const text = '#1A1714'
  const sectionBg = '#F9F6F2'

  if (loading) return <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#F9F6F2', fontFamily: 'sans-serif', color: muted }}>Loading...</div>

  // Collect all unique dates from shows + press, sorted
  const allDates = Array.from(new Set([
    ...shows.map((s: any) => s.date),
    ...press.map((p: any) => p.date),
  ])).filter(Boolean).sort()

  const typeLabels: Record<string, string> = {
    interview: 'Interview', radio: 'Radio', tv: 'TV', podcast: 'Podcast',
    photo_shoot: 'Photo shoot', press_conference: 'Press conf.', other: 'Press'
  }
  const typeIcons: Record<string, string> = {
    interview: '🎙', radio: '📻', tv: '📺', podcast: '🎧',
    photo_shoot: '📷', press_conference: '🗞', other: '📣'
  }

  function toggleDay(date: string) {
    setExpandedDays(prev => {
      const next = new Set(prev)
      if (next.has(date)) next.delete(date)
      else next.add(date)
      return next
    })
  }

  function expandAll() { setExpandedDays(new Set(allDates)) }
  function collapseAll() { setExpandedDays(new Set()) }

  const today = new Date().toISOString().split('T')[0]

  // Get the venue (should be same across all shows for a festival)
  const venue = shows[0]?.venue || ''
  const city = shows[0]?.city || ''

  return (
    <div style={{ background: sectionBg, minHeight: '100vh', fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Helvetica, Arial, sans-serif', color: text }}>
      <style>{`
        * { box-sizing: border-box; }
        @media print {
          .no-print { display: none !important; }
          body { background: white !important; }
          @page { margin: 1.5cm; size: A4; }
          .day-content { display: block !important; }
        }
      `}</style>

      {/* Toolbar */}
      <div className="no-print" style={{ background: '#1A1714', padding: '0 16px 0 24px', height: 52, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <span style={{ fontSize: 17, fontStyle: 'italic', color: '#F5F0E8', fontFamily: 'Georgia, serif' }}>Advance</span>
          <span style={{ fontFamily: 'monospace', fontSize: 9, letterSpacing: 2, color: accent }}>FESTIVAL SHEET</span>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button onClick={expandAll}
            style={{ padding: '6px 12px', background: 'transparent', color: '#8A8580', border: '1px solid #2A2520', borderRadius: 5, cursor: 'pointer', fontFamily: 'monospace', fontSize: 9, letterSpacing: 1 }}>
            EXPAND ALL
          </button>
          <button onClick={collapseAll}
            style={{ padding: '6px 12px', background: 'transparent', color: '#8A8580', border: '1px solid #2A2520', borderRadius: 5, cursor: 'pointer', fontFamily: 'monospace', fontSize: 9, letterSpacing: 1 }}>
            COLLAPSE
          </button>
          <button onClick={() => window.print()}
            style={{ padding: '7px 18px', background: accent, color: '#fff', border: 'none', borderRadius: 6, cursor: 'pointer', fontFamily: 'monospace', fontSize: 10, letterSpacing: 2 }}>
            PRINT
          </button>
        </div>
      </div>

      {/* Page */}
      <div style={{ maxWidth: 700, margin: '0 auto', padding: '32px 16px 60px' }}>

        {/* ── HEADER ── */}
        <div style={{ background: '#fff', borderRadius: 12, border: `1px solid ${border}`, overflow: 'hidden', marginBottom: 16 }}>
          <div style={{ height: 5, background: artist?.color || accent }} />
          <div style={{ padding: '24px 28px' }}>
            <div style={{ fontFamily: 'monospace', fontSize: 10, letterSpacing: '0.2em', color: muted, marginBottom: 6, textTransform: 'uppercase' }}>Festival Run</div>
            <div style={{ fontSize: 30, fontWeight: 700, letterSpacing: '-0.02em', marginBottom: 2, lineHeight: 1.1 }}>{artist?.name}</div>
            <div style={{ fontSize: 18, color: text, fontWeight: 600, marginTop: 6 }}>{tour?.name}</div>
            {venue && (
              <div style={{ fontSize: 14, color: muted, marginTop: 4 }}>
                {venue}{city ? `, ${city}` : ''}
              </div>
            )}
            {allDates.length > 0 && (
              <div style={{ fontSize: 13, color: muted, marginTop: 10, fontFamily: 'monospace', letterSpacing: 1 }}>
                {fmtDateShort(allDates[0])} → {fmtDateShort(allDates[allDates.length - 1])} · {allDates.length} day{allDates.length !== 1 ? 's' : ''}
              </div>
            )}
          </div>
        </div>

        {/* Day accordions */}
        {allDates.map(date => {
          const dayShows = shows.filter((s: any) => s.date === date)
          const dayPress = press.filter((p: any) => p.date === date)
          const expanded = expandedDays.has(date)
          const isToday = date === today

          // Build schedule for the day
          const schedule: { time: string; sort: string; event: string; highlight?: boolean }[] = []
          dayShows.forEach((s: any) => {
            if (s.soundcheck_time) schedule.push({ time: fmt(s.soundcheck_time), sort: s.soundcheck_time, event: 'Soundcheck' })
            if (s.doors_time) schedule.push({ time: fmt(s.doors_time), sort: s.doors_time, event: 'Doors' })
            if (s.set_time) schedule.push({ time: fmt(s.set_time), sort: s.set_time, event: 'Performance', highlight: true })
          })
          dayPress.forEach((p: any) => {
            if (p.time) schedule.push({ time: fmt(p.time), sort: p.time, event: `${typeIcons[p.type] || '📣'} ${p.outlet || typeLabels[p.type] || 'Press'}` })
          })
          schedule.sort((a, b) => a.sort.localeCompare(b.sort))

          return (
            <div key={date} style={{ background: '#fff', borderRadius: 12, border: `1px solid ${isToday ? accent : border}`, overflow: 'hidden', marginBottom: 12 }}>
              {/* Day header - clickable */}
              <div onClick={() => toggleDay(date)}
                style={{ padding: '16px 20px', cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: isToday ? accentLight : '#fff', borderBottom: expanded ? `1px solid ${border}` : 'none' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap' }}>
                  <div style={{ fontSize: 16, fontWeight: 700 }}>{fmtDateLong(date)}</div>
                  {isToday && (
                    <span style={{ background: accent, color: '#fff', padding: '2px 10px', borderRadius: 3, fontFamily: 'monospace', fontSize: 9, letterSpacing: 1 }}>TODAY</span>
                  )}
                  <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                    {dayShows.length > 0 && (
                      <span style={{ background: '#1A1714', color: '#F5F0E8', padding: '2px 8px', borderRadius: 3, fontFamily: 'monospace', fontSize: 9, letterSpacing: 1 }}>
                        {dayShows.length} SHOW{dayShows.length !== 1 ? 'S' : ''}
                      </span>
                    )}
                    {dayPress.length > 0 && (
                      <span style={{ background: '#FDF5EF', color: accent, border: `1px solid ${accent}`, padding: '2px 8px', borderRadius: 3, fontFamily: 'monospace', fontSize: 9, letterSpacing: 1 }}>
                        {dayPress.length} PRESS
                      </span>
                    )}
                  </div>
                </div>
                <span style={{ fontSize: 16, color: muted, transition: 'transform 0.2s', transform: expanded ? 'rotate(90deg)' : 'rotate(0deg)' }}>›</span>
              </div>

              {/* Day content */}
              {expanded && (
                <div className="day-content" style={{ padding: '20px 24px' }}>
                  {/* Schedule grid */}
                  {schedule.length > 0 && (
                    <div style={{ marginBottom: 20 }}>
                      <div style={{ fontFamily: 'monospace', fontSize: 9, letterSpacing: '0.15em', color: muted, marginBottom: 10, textTransform: 'uppercase' }}>Schedule</div>
                      <div style={{ borderRadius: 6, overflow: 'hidden', border: `1px solid ${border}` }}>
                        {schedule.map((s, i) => (
                          <div key={i} style={{ display: 'flex', borderBottom: i < schedule.length - 1 ? `1px solid ${border}` : 'none', background: s.highlight ? accentLight : (i % 2 === 0 ? '#fff' : '#FAFAF8') }}>
                            <div style={{ padding: '8px 14px', fontFamily: 'monospace', fontSize: 12, color: s.highlight ? accent : text, fontWeight: 700, minWidth: 80, flexShrink: 0, borderRight: `1px solid ${border}` }}>{s.time}</div>
                            <div style={{ padding: '8px 14px', fontSize: 13, color: text, lineHeight: 1.5, fontWeight: s.highlight ? 600 : 400 }}>{s.event}</div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Show details */}
                  {dayShows.map((show: any, i: number) => (
                    <div key={i} style={{ marginBottom: 16, padding: '14px 16px', background: sectionBg, borderRadius: 8 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8, flexWrap: 'wrap' }}>
                        <span style={{ fontFamily: 'monospace', fontSize: 9, letterSpacing: '0.15em', color: accent, textTransform: 'uppercase' }}>Show</span>
                        {show.stage && (
                          <span style={{ fontSize: 11, color: muted }}>Stage: <strong style={{ color: text }}>{show.stage}</strong></span>
                        )}
                      </div>
                      {show.set_time && (
                        <div style={{ fontSize: 20, fontWeight: 700, color: accent, marginBottom: 4 }}>
                          {fmt(show.set_time)} - Performance
                        </div>
                      )}
                      {show.notes && (
                        <div style={{ marginTop: 10, padding: '10px 12px', background: '#fff', borderLeft: `3px solid ${accent}`, borderRadius: 4, fontSize: 13, lineHeight: 1.7, whiteSpace: 'pre-wrap' }}>
                          {show.notes}
                        </div>
                      )}
                      {show.catering && (
                        <div style={{ marginTop: 10, padding: '10px 12px', background: '#F0FFF4', borderLeft: '3px solid #3D6B50', borderRadius: 4, fontSize: 13 }}>
                          <div style={{ fontFamily: 'monospace', fontSize: 9, letterSpacing: '0.15em', color: '#3D6B50', marginBottom: 4 }}>CATERING</div>
                          {show.catering}
                        </div>
                      )}
                      {show.backline && (
                        <div style={{ marginTop: 10, padding: '10px 12px', background: '#F5F0FF', borderLeft: '3px solid #5B4B8A', borderRadius: 4, fontSize: 13 }}>
                          <div style={{ fontFamily: 'monospace', fontSize: 9, letterSpacing: '0.15em', color: '#5B4B8A', marginBottom: 4 }}>BACKLINE</div>
                          {show.backline}
                        </div>
                      )}
                    </div>
                  ))}

                  {/* Press entries */}
                  {dayPress.map((p: any, i: number) => (
                    <div key={i} style={{ marginBottom: 12, padding: '14px 16px', background: accentLight, borderRadius: 8, border: `1px solid ${border}` }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8, flexWrap: 'wrap' }}>
                        <span style={{ fontSize: 16 }}>{typeIcons[p.type] || '📣'}</span>
                        <span style={{ fontSize: 15, fontWeight: 700 }}>{p.outlet || typeLabels[p.type] || 'Press'}</span>
                        <span style={{ fontFamily: 'monospace', fontSize: 9, color: accent, background: '#fff', border: `1px solid ${accent}`, padding: '2px 8px', borderRadius: 3, letterSpacing: 1 }}>
                          {(typeLabels[p.type] || 'PRESS').toUpperCase()}
                        </span>
                        {p.time && <span style={{ fontFamily: 'monospace', fontSize: 12, color: accent, fontWeight: 700, marginLeft: 'auto' }}>{fmt(p.time)}{p.end_time ? ` - ${fmt(p.end_time)}` : ''}</span>}
                      </div>
                      {p.location && <div style={{ fontSize: 13, color: muted, marginBottom: 4 }}>📍 {p.location}</div>}
                      {p.contact_name && (
                        <div style={{ fontSize: 13, color: muted, display: 'flex', gap: 10, flexWrap: 'wrap', marginBottom: 4 }}>
                          <span>👤 {p.contact_name}</span>
                          {p.contact_phone && <a href={`tel:${p.contact_phone}`} style={{ color: accent, textDecoration: 'none' }}>📞 {p.contact_phone}</a>}
                          {p.contact_email && <a href={`mailto:${p.contact_email}`} style={{ color: accent, textDecoration: 'none' }}>✉ {p.contact_email}</a>}
                        </div>
                      )}
                      {p.notes && <div style={{ fontSize: 12, color: muted, fontStyle: 'italic', marginTop: 6 }}>{p.notes}</div>}
                    </div>
                  ))}

                  {/* Empty state */}
                  {dayShows.length === 0 && dayPress.length === 0 && (
                    <div style={{ textAlign: 'center', color: muted, fontSize: 13, padding: '20px 0', fontStyle: 'italic' }}>
                      Nothing scheduled for this day.
                    </div>
                  )}
                </div>
              )}
            </div>
          )
        })}

        {/* Footer */}
        <div style={{ textAlign: 'center', paddingTop: 20, fontFamily: 'monospace', fontSize: 10, letterSpacing: '0.2em', color: '#C8BFB0' }}>
          ADVANCE · {artist?.name?.toUpperCase()} · {tour?.name?.toUpperCase()}
        </div>
      </div>
    </div>
  )
}
