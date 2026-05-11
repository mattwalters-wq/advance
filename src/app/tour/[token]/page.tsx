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

function fmtDate(d: string) {
  if (!d) return ''
  return new Date(d + 'T00:00:00').toLocaleDateString('en-AU', { weekday: 'short', day: 'numeric', month: 'short' })
}

function fmtDateLong(d: string) {
  if (!d) return ''
  return new Date(d + 'T00:00:00').toLocaleDateString('en-AU', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })
}

export default function PublicTourPage() {
  const params = useParams()
  const [tour, setTour] = useState<any>(null)
  const [artist, setArtist] = useState<any>(null)
  const [shows, setShows] = useState<any[]>([])
  const [travel, setTravel] = useState<any[]>([])
  const [accommodation, setAccommodation] = useState<any[]>([])
  const [contacts, setContacts] = useState<any[]>([])
  const [press, setPress] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)


  useEffect(() => { loadTour() }, [params.token])

  async function loadTour() {
    const { data: tourData } = await supabase.from('tours')
      .select('*, artists(*)')
      .eq('share_token', params.token).single()
    if (!tourData) { setNotFound(true); setLoading(false); return }
    setTour(tourData)
    setArtist(tourData.artists)

    const [showsRes, travelRes, accomRes, contactsRes, pressRes] = await Promise.all([
      supabase.from('shows').select('*').eq('tour_id', tourData.id).is('deleted_at', null).order('date'),
      supabase.from('travel').select('*').eq('tour_id', tourData.id).is('deleted_at', null).order('travel_date'),
      supabase.from('accommodation').select('*').eq('tour_id', tourData.id).is('deleted_at', null).order('check_in'),
      supabase.from('contacts').select('*').eq('tour_id', tourData.id).is('deleted_at', null),
      supabase.from('press').select('*').eq('tour_id', tourData.id).is('deleted_at', null).order('date').order('time'),
    ])

    setShows(showsRes.data || [])
    setTravel(travelRes.data || [])
    setAccommodation(accomRes.data || [])
    setContacts(contactsRes.data || [])
    setPress(pressRes.data || [])
    setLoading(false)
  }

  function handleExportIcal() {
    if (!tour || !artist) return
    const toD = (d: string) => d.replace(/-/g, '')
    const toDT = (d: string, t: string) => `${d.replace(/-/g, '')}T${t.replace(':', '')}00`
    const esc = (s: string) => (s||'').replace(/\\/g,'\\\\').replace(/;/g,'\\;').replace(/,/g,'\\,').replace(/\n/g,'\\n')
    const uid = () => Math.random().toString(36).slice(2) + '@advance'
    const pad = (n: number) => String(n).padStart(2, '0')
    const lines = ['BEGIN:VCALENDAR','VERSION:2.0','PRODID:-//Advance//Tour Manager//EN',
      `X-WR-CALNAME:${esc(artist.name)} - ${esc(tour.name)}`,'CALSCALE:GREGORIAN','METHOD:PUBLISH']
    for (const s of shows) {
      const allDay = !s.set_time
      const dt = allDay ? toD(s.date) : toDT(s.date, s.set_time)
      lines.push('BEGIN:VEVENT',`UID:show-${uid()}`,`SUMMARY:🎵 ${esc(s.venue)}${s.city?' - '+esc(s.city):''}`)
      if (allDay) lines.push(`DTSTART;VALUE=DATE:${dt}`,`DTEND;VALUE=DATE:${dt}`)
      else { const [h,m] = s.set_time.split(':').map(Number); lines.push(`DTSTART;TZID=Australia/Melbourne:${dt}`,`DTEND;TZID=Australia/Melbourne:${toD(s.date)}T${pad((h+2)%24)}${pad(m)}00`) }
      if (s.venue) lines.push(`LOCATION:${esc([s.venue,s.city].filter(Boolean).join(', '))}`)
      lines.push('END:VEVENT')
    }
    for (const t of travel) {
      const allDay = !t.departure_time
      const dt = allDay ? toD(t.travel_date) : toDT(t.travel_date, t.departure_time)
      lines.push('BEGIN:VEVENT',`UID:travel-${uid()}`,`SUMMARY:✈️ ${esc(t.from_location)} → ${esc(t.to_location)}`)
      if (allDay) lines.push(`DTSTART;VALUE=DATE:${dt}`,`DTEND;VALUE=DATE:${dt}`)
      else lines.push(`DTSTART;TZID=Australia/Melbourne:${dt}`,`DTEND;TZID=Australia/Melbourne:${t.arrival_time?toDT(t.travel_date,t.arrival_time):dt}`)
      lines.push('END:VEVENT')
    }
    lines.push('END:VCALENDAR')
    const blob = new Blob([lines.join('\r\n')], { type: 'text/calendar;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a'); a.href = url
    a.download = `${artist.name} - ${tour.name}.ics`.replace(/[^a-z0-9 \-\.]/gi, '_')
    a.click(); URL.revokeObjectURL(url)
  }

  const accent = '#C4622D'
  const border = '#E8E2D8'
  const muted = '#8A8580'
  const text = '#1A1714'
  const bg = '#F9F6F2'
  const card = '#fff'

  if (loading) return <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: bg, fontFamily: 'sans-serif', color: muted }}>Loading...</div>
  if (notFound) return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: bg, fontFamily: 'sans-serif', color: muted, padding: 24 }}>
      <div style={{ fontSize: 40, marginBottom: 12 }}>🎵</div>
      <div style={{ fontSize: 18, color: text, marginBottom: 6 }}>Tour not found</div>
      <div style={{ fontSize: 14 }}>This link may have expired.</div>
    </div>
  )

  return (
    <div style={{ background: bg, minHeight: '100vh', fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Helvetica, Arial, sans-serif', color: text }}>
      <style>{`* { box-sizing: border-box; } a { -webkit-tap-highlight-color: transparent; }`}</style>

      {/* Header */}
      <div style={{ background: '#1A1714' }}>
        <div style={{ height: 4, background: artist?.color || accent }} />
        <div style={{ padding: '16px 20px 14px', display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 }}>
          <div>
            <div style={{ fontSize: 22, fontWeight: 700, color: '#F5F0E8', letterSpacing: '-0.02em', lineHeight: 1.2 }}>{artist?.name}</div>
            <div style={{ fontFamily: 'monospace', fontSize: 10, letterSpacing: '0.15em', color: '#5A5450', marginTop: 4, textTransform: 'uppercase' }}>{tour?.name}</div>
          </div>
          <button onClick={handleExportIcal}
            style={{ padding: '8px 14px', background: 'transparent', border: '1px solid #2A2520', borderRadius: 8, color: '#6A6058', cursor: 'pointer', fontFamily: 'monospace', fontSize: 9, letterSpacing: '0.15em', whiteSpace: 'nowrap', flexShrink: 0 }}>
            ADD TO CAL
          </button>
        </div>
      </div>

      <div style={{ maxWidth: 620, margin: '0 auto', padding: '20px 14px 48px', display: 'grid', gap: 0 }}>

        {(() => {
          const typeIcons: Record<string, string> = {
            interview: '🎙', radio: '📻', tv: '📺', podcast: '🎧',
            photo_shoot: '📷', press_conference: '🗞', other: '📣'
          }
          const travelEmoji = (type: string) => {
            const tt = (type || '').toLowerCase()
            if (tt === 'drive') return '🚗'
            if (tt === 'train') return '🚂'
            if (tt === 'bus') return '🚌'
            if (tt === 'ferry') return '⛴'
            return '✈️'
          }
          const showEmoji = (type: string) => {
            if (type === 'rehearsal') return '🎸'
            if (type === 'recording') return '🎙'
            if (type === 'press') return '📣'
            if (type === 'day_off') return '🌴'
            return '🎵'
          }

          // Collect all dated items
          const allItems: any[] = []

          shows.forEach(s => allItems.push({
            date: s.date, time: s.set_time || s.soundcheck_time || '00:00',
            _kind: 'show', data: s
          }))
          travel.forEach(t => allItems.push({
            date: t.travel_date, time: t.departure_time || '00:00',
            _kind: 'travel', data: t
          }))
          press.forEach(p => allItems.push({
            date: p.date, time: p.time || '00:00',
            _kind: 'press', data: p
          }))

          // Group by date
          const byDate: Record<string, any[]> = {}
          allItems.forEach(item => {
            const d = item.date || 'TBC'
            if (!byDate[d]) byDate[d] = []
            byDate[d].push(item)
          })

          // Add accommodation as a note on check-in date
          accommodation.forEach(a => {
            if (a.check_in && !byDate[a.check_in]) byDate[a.check_in] = []
          })

          const today = new Date().toISOString().split('T')[0]

          return Object.entries(byDate).sort(([a], [b]) => a.localeCompare(b)).map(([date, items]) => {
            const isToday = date === today
            const isPast = date < today
            const dayAccom = accommodation.filter(a => a.check_in <= date && (a.check_out || a.check_in) >= date)
            const sortedItems = items.sort((a, b) => (a.time || '').localeCompare(b.time || ''))

            return (
              <div key={date} style={{ marginBottom: 24, opacity: isPast ? 0.6 : 1 }}>
                {/* Date header */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
                  <div style={{ background: isToday ? accent : '#1A1714', borderRadius: 8, padding: '6px 12px', minWidth: 56, textAlign: 'center', flexShrink: 0 }}>
                    <div style={{ fontFamily: 'monospace', fontSize: 9, letterSpacing: 1, color: isToday ? 'rgba(255,255,255,0.8)' : '#5A5450' }}>
                      {new Date(date + 'T00:00:00').toLocaleDateString('en-AU', { weekday: 'short' }).toUpperCase()}
                    </div>
                    <div style={{ fontSize: 20, fontWeight: 700, color: '#F5F0E8', lineHeight: 1 }}>
                      {new Date(date + 'T00:00:00').getDate()}
                    </div>
                    <div style={{ fontFamily: 'monospace', fontSize: 9, color: isToday ? 'rgba(255,255,255,0.8)' : '#5A5450' }}>
                      {new Date(date + 'T00:00:00').toLocaleDateString('en-AU', { month: 'short' }).toUpperCase()}
                    </div>
                  </div>
                  <div style={{ flex: 1, height: 1, background: border }} />
                  {isToday && <div style={{ fontFamily: 'monospace', fontSize: 9, letterSpacing: 2, color: accent, flexShrink: 0 }}>TODAY</div>}
                </div>

                {/* Hotel banner if staying */}
                {dayAccom.length > 0 && (
                  <div style={{ background: '#F0F8FF', border: '1px solid #C0D8F0', borderRadius: 8, padding: '8px 14px', marginBottom: 8, fontSize: 13, color: '#1A3A5C', display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span>🏨</span>
                    <span style={{ fontWeight: 600 }}>{dayAccom[0].name}</span>
                    {dayAccom[0].address && (
                      <a href={`https://maps.google.com/?q=${encodeURIComponent(dayAccom[0].address)}`} target="_blank" rel="noreferrer"
                        style={{ fontSize: 11, color: '#2266AA', textDecoration: 'none', marginLeft: 'auto', flexShrink: 0 }}>Map ↗</a>
                    )}
                  </div>
                )}

                {/* Timeline items */}
                <div style={{ background: card, borderRadius: 12, border: `1px solid ${border}`, overflow: 'hidden' }}>
                  {sortedItems.map((item, i) => {
                    const isLast = i === sortedItems.length - 1

                    if (item._kind === 'travel') {
                      const t = item.data
                      return (
                        <div key={i} style={{ display: 'flex', gap: 12, padding: '12px 16px', borderBottom: isLast ? 'none' : `1px solid ${border}`, alignItems: 'flex-start' }}>
                          <div style={{ width: 44, flexShrink: 0, textAlign: 'center', paddingTop: 2 }}>
                            <div style={{ fontSize: 18 }}>{travelEmoji(t.travel_type)}</div>
                            {t.departure_time && <div style={{ fontFamily: 'monospace', fontSize: 10, color: muted, marginTop: 2 }}>{fmt(t.departure_time)}</div>}
                          </div>
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ fontSize: 14, fontWeight: 700 }}>{t.from_location} → {t.to_location}</div>
                            {(t.carrier || t.reference) && (
                              <div style={{ fontSize: 12, color: muted, marginTop: 2 }}>
                                {t.carrier}{t.carrier && t.reference ? ' · ' : ''}{t.reference}
                              </div>
                            )}
                            {t.arrival_time && <div style={{ fontSize: 12, color: muted }}>Arr {fmt(t.arrival_time)}</div>}
                            {t.notes && <div style={{ fontSize: 12, color: muted, marginTop: 4, fontStyle: 'italic' }}>{t.notes}</div>}
                          </div>
                        </div>
                      )
                    }

                    if (item._kind === 'press') {
                      const p = item.data
                      return (
                        <div key={i} style={{ display: 'flex', gap: 12, padding: '12px 16px', borderBottom: isLast ? 'none' : `1px solid ${border}`, alignItems: 'flex-start' }}>
                          <div style={{ width: 44, flexShrink: 0, textAlign: 'center', paddingTop: 2 }}>
                            <div style={{ fontSize: 18 }}>{typeIcons[p.type] || '📣'}</div>
                            {p.time && <div style={{ fontFamily: 'monospace', fontSize: 10, color: muted, marginTop: 2 }}>{fmt(p.time)}</div>}
                          </div>
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ fontSize: 14, fontWeight: 700 }}>{p.outlet || 'Press'}</div>
                            {p.location && <div style={{ fontSize: 12, color: muted, marginTop: 2 }}>📍 {p.location}</div>}
                            {p.contact_name && (
                              <div style={{ fontSize: 12, color: muted, marginTop: 2 }}>
                                👤 {p.contact_name}
                                {p.contact_phone && <a href={`tel:${p.contact_phone}`} style={{ color: accent, textDecoration: 'none', marginLeft: 6 }}>{p.contact_phone}</a>}
                              </div>
                            )}
                            {p.notes && <div style={{ fontSize: 12, color: muted, marginTop: 4, fontStyle: 'italic' }}>{p.notes}</div>}
                          </div>
                          {p.end_time && (
                            <div style={{ fontFamily: 'monospace', fontSize: 10, color: muted, flexShrink: 0, paddingTop: 4 }}>until {fmt(p.end_time)}</div>
                          )}
                        </div>
                      )
                    }

                    if (item._kind === 'show') {
                      const s = item.data
                      const isNonShow = ['rehearsal', 'recording', 'press'].includes(s.type || '')
                      const mainTime = isNonShow ? s.soundcheck_time : s.set_time
                      const venueName = s.venue && s.venue.length > 50
                        ? s.venue.split(/[-–]|via |Access /)[0].trim()
                        : s.venue || (isNonShow ? s.type : 'TBC')
                      return (
                        <div key={i} style={{ display: 'flex', gap: 12, padding: '12px 16px', borderBottom: isLast ? 'none' : `1px solid ${border}`, alignItems: 'flex-start' }}>
                          <div style={{ width: 44, flexShrink: 0, textAlign: 'center', paddingTop: 2 }}>
                            <div style={{ fontSize: 18 }}>{showEmoji(s.type)}</div>
                            {mainTime && <div style={{ fontFamily: 'monospace', fontSize: 10, color: accent, fontWeight: 700, marginTop: 2 }}>{fmt(mainTime)}</div>}
                          </div>
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' as const }}>
                              <span style={{ fontSize: 14, fontWeight: 700 }}>{venueName}</span>
                              {s.type && s.type !== 'show' && (
                                <span style={{ fontFamily: 'monospace', fontSize: 8, letterSpacing: 1, color: accent, background: '#FDF5EF', border: `1px solid ${accent}`, padding: '1px 5px', borderRadius: 3 }}>
                                  {s.type.toUpperCase()}
                                </span>
                              )}
                            </div>
                            {s.city && <div style={{ fontSize: 12, color: muted, marginTop: 2 }}>{s.city}{s.country && s.country !== 'AU' ? `, ${s.country}` : ''}</div>}
                            {s.address && (
                              <a href={`https://maps.google.com/?q=${encodeURIComponent(s.address)}`} target="_blank" rel="noreferrer"
                                style={{ fontSize: 12, color: accent, textDecoration: 'none', display: 'block', marginTop: 2 }}>📍 {s.address} ↗</a>
                            )}
                            <div style={{ display: 'flex', gap: 10, marginTop: 6, flexWrap: 'wrap' as const }}>
                              {s.arrival_time && <span style={{ fontSize: 11, color: muted }}>Arrive {fmt(s.arrival_time)}</span>}
                              {!isNonShow && s.doors_time && <span style={{ fontSize: 11, color: muted }}>Doors {fmt(s.doors_time)}</span>}
                              {!isNonShow && s.soundcheck_time && <span style={{ fontSize: 11, color: muted }}>SC {fmt(s.soundcheck_time)}</span>}
                              {s.set_length && <span style={{ fontSize: 11, color: muted }}>Set: {s.set_length}</span>}
                            </div>
                          </div>
                          {s.id && (
                            <a href={`/daysheet/${s.id}`}
                              style={{ flexShrink: 0, padding: '5px 10px', background: accent, color: '#fff', borderRadius: 6, fontSize: 10, fontFamily: 'monospace', letterSpacing: 1, textDecoration: 'none', alignSelf: 'center', whiteSpace: 'nowrap' as const }}>
                              DAY SHEET ↗
                            </a>
                          )}
                        </div>
                      )
                    }
                    return null
                  })}
                </div>
              </div>
            )
          })
        })()}

        {/* CONTACTS */}
        {contacts.length > 0 && (
          <div style={{ background: card, borderRadius: 12, border: `1px solid ${border}`, overflow: 'hidden', marginTop: 8 }}>
            <SectionHead label="Key Contacts" accent={accent} />
            {contacts.map((c, i) => (
              <div key={i} style={{ padding: '14px 18px', borderBottom: i < contacts.length - 1 ? `1px solid ${border}` : 'none', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' as const }}>
                <div>
                  <div style={{ fontSize: 15, fontWeight: 600 }}>{c.name}</div>
                  {c.role && <div style={{ fontSize: 11, color: muted, textTransform: 'uppercase', letterSpacing: '0.05em', marginTop: 2 }}>{c.role}</div>}
                </div>
                <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' as const }}>
                  {c.phone && <a href={`tel:${c.phone}`} style={{ fontSize: 15, color: accent, textDecoration: 'none', fontWeight: 700 }}>{c.phone}</a>}
                  {c.email && <a href={`mailto:${c.email}`} style={{ fontSize: 13, color: muted, textDecoration: 'none' }}>{c.email}</a>}
                </div>
              </div>
            ))}
          </div>
        )}

        <div style={{ textAlign: 'center', padding: '20px 0 4px', fontFamily: 'monospace', fontSize: 10, letterSpacing: '0.15em', color: '#C8BFB0' }}>
          ADVANCE · {artist?.name?.toUpperCase()}
        </div>
      </div>
    </div>
  )
        {/* CONTACTS */}
        {contacts.length > 0 && (
          <div style={{ background: card, borderRadius: 12, border: `1px solid ${border}`, overflow: 'hidden' }}>
            <SectionHead label="Key Contacts" accent={accent} />
            {contacts.map((c, i) => (
              <div key={i} style={{ padding: '14px 18px', borderBottom: i < contacts.length - 1 ? `1px solid ${border}` : 'none', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
                <div>
                  <div style={{ fontSize: 15, fontWeight: 600 }}>{c.name}</div>
                  {c.role && <div style={{ fontSize: 11, color: muted, textTransform: 'uppercase', letterSpacing: '0.05em', marginTop: 2 }}>{c.role}</div>}
                </div>
                <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                  {c.phone && (
                    <a href={`tel:${c.phone}`} style={{ fontSize: 15, color: accent, textDecoration: 'none', fontWeight: 700 }}>
                      {c.phone}
                    </a>
                  )}
                  {c.email && (
                    <a href={`mailto:${c.email}`} style={{ fontSize: 13, color: muted, textDecoration: 'none' }}>
                      {c.email}
                    </a>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        <div style={{ textAlign: 'center', padding: '12px 0 4px', fontFamily: 'monospace', fontSize: 10, letterSpacing: '0.15em', color: '#C8BFB0' }}>
          ADVANCE · {artist?.name?.toUpperCase()}
        </div>
      </div>
    </div>
  )
}

function SectionHead({ label, accent }: { label: string; accent: string }) {
  return (
    <div style={{ padding: '11px 18px', borderBottom: '1px solid #E8E2D8', display: 'flex', alignItems: 'center', gap: 8 }}>
      <div style={{ width: 3, height: 14, background: accent, borderRadius: 2, flexShrink: 0 }} />
      <span style={{ fontFamily: 'monospace', fontSize: 10, letterSpacing: '0.15em', color: '#8A8580', textTransform: 'uppercase' }}>{label}</span>
    </div>
  )
}

function TimePill({ label, time, highlight, accent }: { label: string; time: string; highlight?: boolean; accent?: string }) {
  return (
    <div style={{ background: highlight ? (accent || '#C4622D') : '#F9F6F2', border: highlight ? 'none' : '1px solid #E8E2D8', borderRadius: 6, padding: '7px 12px', textAlign: 'center', minWidth: 80 }}>
      <div style={{ fontFamily: 'monospace', fontSize: 9, letterSpacing: '0.1em', color: highlight ? 'rgba(255,255,255,0.75)' : '#8A8580', textTransform: 'uppercase', marginBottom: 3 }}>{label}</div>
      <div style={{ fontSize: 16, fontWeight: 700, color: highlight ? '#fff' : '#1A1714' }}>{time}</div>
    </div>
  )
}

function InfoPill({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ background: '#F9F6F2', border: '1px solid #E8E2D8', borderRadius: 6, padding: '5px 10px' }}>
      <div style={{ fontFamily: 'monospace', fontSize: 9, letterSpacing: '0.1em', color: '#8A8580', textTransform: 'uppercase', marginBottom: 2 }}>{label}</div>
      <div style={{ fontSize: 13, fontWeight: 600, color: '#1A1714' }}>{value}</div>
    </div>
  )
}
