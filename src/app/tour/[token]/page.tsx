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

    const [showsRes, travelRes, accomRes, contactsRes] = await Promise.all([
      supabase.from('shows').select('*').eq('tour_id', tourData.id).order('date'),
      supabase.from('travel').select('*').eq('tour_id', tourData.id).order('travel_date'),
      supabase.from('accommodation').select('*').eq('tour_id', tourData.id).order('check_in'),
      supabase.from('contacts').select('*').eq('tour_id', tourData.id),
    ])

    setShows(showsRes.data || [])
    setTravel(travelRes.data || [])
    setAccommodation(accomRes.data || [])
    setContacts(contactsRes.data || [])
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

      <div style={{ maxWidth: 620, margin: '0 auto', padding: '20px 14px 48px', display: 'grid', gap: 12 }}>

        {/* SHOWS */}
        {shows.length > 0 && (
          <div style={{ background: card, borderRadius: 12, border: `1px solid ${border}`, overflow: 'hidden' }}>
            <SectionHead label={`Shows — ${shows.length}`} accent={accent} />
            {shows.map((show, i) => {
              const isLast = i === shows.length - 1
              // Detect if venue name is very long (contains directions)
              const venueName = show.venue && show.venue.length > 60
                ? show.venue.split(/[-–]|via |Access /)[0].trim()
                : show.venue
              const venueDetail = show.venue && show.venue.length > 60
                ? show.venue.substring(venueName.length).replace(/^[\s\-–]+/, '').trim()
                : null

              return (
                <div key={i} style={{ borderBottom: isLast ? 'none' : `1px solid ${border}` }}>
                  <div
                    style={{ padding: '16px 18px' }}>
                    <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 }}>
                      <div style={{ minWidth: 0 }}>
                        <div style={{ fontFamily: 'monospace', fontSize: 10, letterSpacing: '0.1em', color: accent, marginBottom: 3 }}>{fmtDate(show.date)}</div>
                        <div style={{ fontSize: 16, fontWeight: 700, lineHeight: 1.25, marginBottom: 2 }}>{venueName}</div>
                        {show.city && <div style={{ fontSize: 13, color: muted }}>{show.city}{show.country && show.country !== 'AU' ? `, ${show.country}` : ''}</div>}
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 4, flexShrink: 0 }}>
                        {show.set_time && (
                          <div style={{ background: accent, color: '#fff', borderRadius: 6, padding: '4px 10px', fontFamily: 'monospace', fontSize: 11, fontWeight: 700 }}>
                            {fmt(show.set_time)}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Expanded detail */}
                  {(
                    <div style={{ padding: '0 18px 16px', borderTop: `1px solid ${border}` }}>
                      {/* Times row */}
                      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', paddingTop: 14, marginBottom: 12 }}>
                        {show.doors_time && <TimePill label="Doors" time={fmt(show.doors_time)} />}
                        {show.soundcheck_time && <TimePill label="Soundcheck" time={fmt(show.soundcheck_time)} />}
                        {show.set_time && <TimePill label="Stage" time={fmt(show.set_time)} highlight accent={accent} />}
                      </div>

                      {/* Venue detail / directions if separated */}
                      {venueDetail && (
                        <div style={{ fontSize: 13, color: muted, lineHeight: 1.65, marginBottom: 10, padding: '10px 12px', background: bg, borderRadius: 6 }}>
                          {venueDetail}
                        </div>
                      )}

                      {show.catering && (
                        <div style={{ padding: '10px 12px', background: '#F0FFF4', borderLeft: '3px solid #3D6B50', borderRadius: 4, fontSize: 13, lineHeight: 1.65, marginBottom: 8 }}>
                          <div style={{ fontFamily: 'monospace', fontSize: 9, color: '#3D6B50', letterSpacing: '0.1em', marginBottom: 3 }}>CATERING</div>
                          {show.catering}
                        </div>
                      )}
                      {show.backline && (
                        <div style={{ padding: '10px 12px', background: '#F5F0FF', borderLeft: '3px solid #5B4B8A', borderRadius: 4, fontSize: 13, lineHeight: 1.65, marginBottom: 8 }}>
                          <div style={{ fontFamily: 'monospace', fontSize: 9, color: '#5B4B8A', letterSpacing: '0.1em', marginBottom: 3 }}>BACKLINE</div>
                          {show.backline}
                        </div>
                      )}
                      {show.notes && (
                        <div style={{ padding: '10px 12px', background: '#FFF8F2', borderLeft: `3px solid ${accent}`, borderRadius: 4, fontSize: 13, color: text, lineHeight: 1.7 }}>
                          {show.notes}
                        </div>
                      )}
                      <a href={`/daysheet/${show.id}`} target="_blank" rel="noreferrer"
                        style={{ display: 'inline-flex', alignItems: 'center', gap: 6, marginTop: 12, fontSize: 12, color: accent, textDecoration: 'none', fontWeight: 600, fontFamily: 'monospace', letterSpacing: '0.05em' }}>
                        VIEW DAY SHEET ↗
                      </a>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}

        {/* TRAVEL */}
        {travel.length > 0 && (
          <div style={{ background: card, borderRadius: 12, border: `1px solid ${border}`, overflow: 'hidden' }}>
            <SectionHead label={`Travel — ${travel.length} legs`} accent={accent} />
            {travel.map((t, i) => (
              <div key={i} style={{ padding: '14px 18px', borderBottom: i < travel.length - 1 ? `1px solid ${border}` : 'none' }}>
                <div style={{ fontFamily: 'monospace', fontSize: 10, color: accent, letterSpacing: '0.1em', marginBottom: 4 }}>{fmtDate(t.travel_date)}</div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                  <span style={{ fontSize: 15 }}>{t.travel_type === 'Drive' ? '🚗' : t.travel_type === 'Train' ? '🚂' : t.travel_type === 'Bus' ? '🚌' : '✈️'}</span>
                  <span style={{ fontSize: 15, fontWeight: 700 }}>{t.from_location} → {t.to_location}</span>
                </div>
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  {t.carrier && <InfoPill label="Flight" value={t.carrier} />}
                  {t.departure_time && <InfoPill label="Dep" value={fmt(t.departure_time)} />}
                  {t.arrival_time && <InfoPill label="Arr" value={fmt(t.arrival_time)} />}
                  {t.reference && <InfoPill label="Ref" value={t.reference} />}
                </div>
                {t.travellers && <div style={{ marginTop: 8, fontSize: 13, color: muted }}>👤 {t.travellers}</div>}
                {t.notes && <div style={{ marginTop: 6, fontSize: 12, color: muted, fontStyle: 'italic' }}>{t.notes}</div>}
              </div>
            ))}
          </div>
        )}

        {/* HOTELS */}
        {accommodation.length > 0 && (
          <div style={{ background: card, borderRadius: 12, border: `1px solid ${border}`, overflow: 'hidden' }}>
            <SectionHead label={`Hotels — ${accommodation.length}`} accent={accent} />
            {accommodation.map((a, i) => (
              <div key={i} style={{ padding: '14px 18px', borderBottom: i < accommodation.length - 1 ? `1px solid ${border}` : 'none' }}>
                <div style={{ fontFamily: 'monospace', fontSize: 10, color: accent, letterSpacing: '0.1em', marginBottom: 4 }}>{fmtDate(a.check_in)}{a.check_out ? ` — ${fmtDate(a.check_out)}` : ''}</div>
                <div style={{ fontSize: 15, fontWeight: 700, marginBottom: 4 }}>{a.name}</div>
                {a.address && (
                  <a href={`https://maps.google.com/?q=${encodeURIComponent(a.address)}`}
                    target="_blank" rel="noreferrer"
                    style={{ fontSize: 13, color: accent, display: 'inline-flex', alignItems: 'center', gap: 4, marginBottom: 8, textDecoration: 'none' }}>
                    📍 {a.address}
                  </a>
                )}
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: a.travellers ? 8 : 0 }}>
                  {a.check_in && <InfoPill label="Check in" value={fmtDate(a.check_in)} />}
                  {a.check_out && <InfoPill label="Check out" value={fmtDate(a.check_out)} />}
                  {a.confirmation && <InfoPill label="Ref" value={a.confirmation} />}
                </div>
                {a.travellers && <div style={{ fontSize: 13, color: muted }}>👤 {a.travellers}</div>}
              </div>
            ))}
          </div>
        )}

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
