'use client'

import { useEffect, useRef, useState } from 'react'
import { useParams, useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import { SharedPage, SharedHero, SharedState, MapLink } from '@/components/shared/SharedPage'

const supabase = createClient()

function fmt(t: string) {
  if (!t) return ''
  const [h, m] = t.split(':')
  const hour = parseInt(h)
  return `${hour % 12 || 12}:${m}${hour >= 12 ? 'pm' : 'am'}`
}

function localToday() {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
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
  const searchParams = useSearchParams()
  const venueFilter = searchParams.get('venue')
  const [notFound, setNotFound] = useState(false)
  const [tour, setTour] = useState<any>(null)
  const [artist, setArtist] = useState<any>(null)
  const [shows, setShows] = useState<any[]>([])
  const [press, setPress] = useState<any[]>([])
  const [setlists, setSetlists] = useState<any[]>([])
  const [showPeople, setShowPeople] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [expandedDays, setExpandedDays] = useState<Set<string>>(new Set())

  const [loadError, setLoadError] = useState(false)
  const request = useRef(0)
  useEffect(() => { loadData(); return () => { request.current++ } }, [params.tour_id, venueFilter])

  async function loadData() {
    const id = ++request.current
    setLoading(true); setLoadError(false); setNotFound(false)
    try {
    // Server-side call; with ?venue= it returns just that festival's days
    const { data, error } = await supabase.rpc('public_festival', { p_tour_id: params.tour_id, p_venue: venueFilter })
    if (id !== request.current) return
    if (error) throw error
    if (!data?.tour) { setNotFound(true); setLoading(false); return }
    setTour(data.tour)
    setArtist(data.tour.artists || null)
    const showsData: any[] = data.shows || []
    const pressData: any[] = data.press || []
    setShows(showsData)
    setPress(pressData)
    setSetlists(data.setlists || [])
    setShowPeople(data.show_people || [])

    // Auto-expand today's day if it's in the festival, else expand all
    const today = localToday()
    const allDates = new Set<string>([
      ...showsData.map((s: any) => s.date),
      ...pressData.map((p: any) => p.date),
    ].filter(Boolean))
    if (allDates.has(today)) {
      setExpandedDays(new Set([today]))
    } else {
      setExpandedDays(allDates)
    }

    setLoading(false)
    } catch { if (id === request.current) { setLoadError(true); setLoading(false) } }
  }

  const accent = '#285e48'
  const accentLight = '#f0f4e9'
  const border = '#e0e5db'
  const muted = '#667167'
  const text = '#1d3229'
  const sectionBg = '#f6f7f1'

  if (loading) return <SharedState state="loading"/>
  if (loadError) return <SharedState state="error" retry={loadData}/>
  if (notFound) return <SharedState state="missing" noun="festival sheet"/>

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

  const today = localToday()

  // Get the venue (should be same across all shows for a festival)
  const venue = shows[0]?.venue || ''
  const city = shows[0]?.city || ''

  return (
    <SharedPage label="Festival sheet">
      <SharedHero eyebrow="Your festival run" title={artist?.name || tour?.name || 'Festival'} subtitle={tour?.name}>
        {venue && <div className="shared-hero-date">{venue}{city ? `, ${city}` : ''}</div>}
        {allDates.length > 0 && <div className="shared-hero-meta"><span>{fmtDateShort(allDates[0])} → {fmtDateShort(allDates[allDates.length - 1])}</span><span>{allDates.length} days</span></div>}
      </SharedHero>
      {shows[0]?.address && <div className="shared-actions"><MapLink address={shows[0].address} label="Festival directions"/></div>}
      <div className="shared-toolbar no-print"><button className="shared-action" onClick={expandAll}>Expand all days</button><button className="shared-action" onClick={collapseAll}>Collapse all</button></div>
      <div className="festival-body">
        {allDates.length === 0 && <div className="shared-section shared-empty">Festival dates will appear here once scheduled.</div>}
        {/* Day accordions */}
        {allDates.map(date => {
          const dayShows = shows.filter((s: any) => s.date === date)
          const dayPress = press.filter((p: any) => p.date === date)
          const expanded = expandedDays.has(date)
          const isToday = date === today

          // Build schedule for the day
          const schedule: { time: string; sort: string; event: string; highlight?: boolean }[] = []
          dayShows.forEach((s: any) => {
            if (s.arrival_time) schedule.push({ time: fmt(s.arrival_time), sort: s.arrival_time, event: 'Artist arrival' })
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
              <button className="festival-day-toggle" aria-expanded={expanded} aria-controls={`festival-${date}`} onClick={() => toggleDay(date)}
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
              </button>

              {/* Day content */}
              <div id={`festival-${date}`} hidden={!expanded} className="day-content" style={{ padding: '20px 24px' }}>
                  {/* Schedule grid */}
                  {schedule.length > 0 ? <div className="shared-times">{schedule.map((s, i) => <div key={i} className={`shared-time${s.highlight ? ' highlight' : ''}`}><span>{s.event}</span><strong>{s.time}</strong></div>)}</div> : <p className="shared-time-note">Schedule to be confirmed.</p>}

                  {/* Show details */}
                  {dayShows.map((show: any, i: number) => {
                    const showSetlist = setlists.find((sl: any) => sl.show_id === show.id)
                    const showSupports = showPeople.filter((p: any) => p.show_id === show.id)
                    const roleLabels: Record<string, string> = { support: 'Support', photographer: 'Photographer', videographer: 'Video', dj: 'DJ', mc: 'MC', other: 'Other' }
                    const roleIcons: Record<string, string> = { support: '🎤', photographer: '📷', videographer: '🎥', dj: '🎧', mc: '🎙', other: '•' }
                    return (
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
                      {showSupports.length > 0 && (
                        <div style={{ marginTop: 10, padding: '10px 12px', background: '#fff', borderLeft: `3px solid ${accent}`, borderRadius: 4 }}>
                          <div style={{ fontFamily: 'monospace', fontSize: 9, letterSpacing: '0.15em', color: accent, marginBottom: 8 }}>
                            SUPPORTS & CREW · {showSupports.length}
                          </div>
                          <div style={{ display: 'grid', gap: 6 }}>
                            {showSupports.map((p: any, pi: number) => (
                              <div key={pi} style={{ display: 'flex', alignItems: 'baseline', gap: 8, fontSize: 13, flexWrap: 'wrap' }}>
                                <span style={{ fontSize: 14 }}>{roleIcons[p.role] || '•'}</span>
                                <span style={{ fontWeight: 600 }}>{p.name}</span>
                                <span style={{ fontFamily: 'monospace', fontSize: 9, letterSpacing: 1, color: muted }}>{(roleLabels[p.role] || 'OTHER').toUpperCase()}</span>
                                {p.set_time && <span style={{ fontFamily: 'monospace', fontSize: 11, color: accent, fontWeight: 700 }}>{fmt(p.set_time)}{p.duration_minutes ? ` · ${p.duration_minutes}min` : ''}</span>}
                                {p.phone && <a href={`tel:${p.phone}`} style={{ fontSize: 11, color: accent, textDecoration: 'none' }}>📞 {p.phone}</a>}
                                {p.email && <a href={`mailto:${p.email}`} style={{ fontSize: 11, color: accent, textDecoration: 'none' }}>✉ {p.email}</a>}
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                      {showSetlist && Array.isArray(showSetlist.songs) && showSetlist.songs.length > 0 && (
                        <div style={{ marginTop: 10, padding: '10px 12px', background: '#fff', borderLeft: '3px solid #5B4B8A', borderRadius: 4 }}>
                          <div style={{ fontFamily: 'monospace', fontSize: 9, letterSpacing: '0.15em', color: '#5B4B8A', marginBottom: 8 }}>
                            ♪ SETLIST · {showSetlist.songs.length} SONGS
                          </div>
                          <div style={{ display: 'grid', gap: 4 }}>
                            {showSetlist.songs.map((song: any, si: number) => (
                              <div key={si} style={{ display: 'grid', gridTemplateColumns: '24px 1fr auto', gap: 10, fontSize: 13, alignItems: 'baseline' }}>
                                <span style={{ fontFamily: 'monospace', fontSize: 11, color: muted, textAlign: 'center' }}>{si + 1}</span>
                                <span style={{ fontWeight: 500 }}>{song.title}{song.notes && <span style={{ color: muted, fontStyle: 'italic', fontWeight: 400 }}> - {song.notes}</span>}</span>
                                {song.duration && <span style={{ fontFamily: 'monospace', fontSize: 11, color: muted }}>{song.duration}</span>}
                              </div>
                            ))}
                          </div>
                          {showSetlist.notes && (
                            <div style={{ marginTop: 8, fontSize: 11, color: muted, fontStyle: 'italic', whiteSpace: 'pre-wrap' }}>
                              {showSetlist.notes}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                    )
                  })}

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
            </div>
          )
        })}

      </div>
    </SharedPage>
  )
}
