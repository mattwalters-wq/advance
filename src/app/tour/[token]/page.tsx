'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import { createClient } from '@/lib/supabase'

export default function PublicTourPage() {
  const params = useParams()
  const supabase = createClient()
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
    const { data: tourData } = await supabase
      .from('tours')
      .select('*')
      .eq('share_token', params.token)
      .single()

    if (!tourData) { setNotFound(true); setLoading(false); return }
    setTour(tourData)

    const [artistRes, showsRes, travelRes, accomRes, contactsRes] = await Promise.all([
      supabase.from('artists').select('*').eq('id', tourData.artist_id).single(),
      supabase.from('shows').select('*').eq('tour_id', tourData.id).order('date'),
      supabase.from('travel').select('*').eq('tour_id', tourData.id).order('travel_date'),
      supabase.from('accommodation').select('*').eq('tour_id', tourData.id).order('check_in'),
      supabase.from('contacts').select('*').eq('tour_id', tourData.id),
    ])

    setArtist(artistRes.data)
    setShows(showsRes.data || [])
    setTravel(travelRes.data || [])
    setAccommodation(accomRes.data || [])
    setContacts(contactsRes.data || [])
    setLoading(false)
  }

  function formatDate(d: string) {
    if (!d) return ''
    const date = new Date(d + 'T00:00:00')
    return date.toLocaleDateString('en-AU', { weekday: 'short', day: 'numeric', month: 'short' })
  }

  function formatTime(t: string) {
    if (!t) return ''
    const [h, m] = t.split(':')
    const hour = parseInt(h)
    const ampm = hour >= 12 ? 'pm' : 'am'
    const hour12 = hour % 12 || 12
    return `${hour12}:${m}${ampm}`
  }

  function handleExportIcal() {
    if (!tour || !artist) return
    function toIcalDate(d: string) { return d.replace(/-/g, '') }
    function toIcalDateTime(d: string, t: string) {
      return `${d.replace(/-/g, '')}T${t.replace(':', '')}00`
    }
    function esc(s: string) {
      return (s || '').replace(/\/g, '\\').replace(/;/g, '\;').replace(/,/g, '\,').replace(/
/g, '\n')
    }
    function uid() { return Math.random().toString(36).slice(2) + '@advance' }
    function pad(n: number) { return String(n).padStart(2, '0') }

    const lines = [
      'BEGIN:VCALENDAR', 'VERSION:2.0',
      'PRODID:-//Advance//Tour Manager//EN',
      `X-WR-CALNAME:${esc(artist.name)} - ${esc(tour.name)}`,
      'CALSCALE:GREGORIAN', 'METHOD:PUBLISH',
    ]
    for (const show of shows) {
      const isAllDay = !show.set_time
      const dtstart = isAllDay ? toIcalDate(show.date) : toIcalDateTime(show.date, show.set_time)
      const location = [show.venue, show.city, show.country].filter(Boolean).join(', ')
      const desc = [show.doors_time ? `Doors: ${show.doors_time}` : '', show.soundcheck_time ? `Soundcheck: ${show.soundcheck_time}` : '', show.notes || ''].filter(Boolean).join('\n')
      lines.push('BEGIN:VEVENT', `UID:show-${uid()}`, `SUMMARY:🎵 ${esc(show.venue)}${show.city ? ' — ' + esc(show.city) : ''}`)
      if (isAllDay) { lines.push(`DTSTART;VALUE=DATE:${dtstart}`, `DTEND;VALUE=DATE:${dtstart}`) }
      else {
        const [h, m] = show.set_time.split(':').map(Number)
        lines.push(`DTSTART:${dtstart}`, `DTEND:${toIcalDate(show.date)}T${pad((h+2)%24)}${pad(m)}00`)
      }
      if (location) lines.push(`LOCATION:${esc(location)}`)
      if (desc) lines.push(`DESCRIPTION:${desc}`)
      lines.push('END:VEVENT')
    }
    for (const t of travel) {
      const isAllDay = !t.departure_time
      const dtstart = isAllDay ? toIcalDate(t.travel_date) : toIcalDateTime(t.travel_date, t.departure_time)
      lines.push('BEGIN:VEVENT', `UID:travel-${uid()}`, `SUMMARY:✈️ ${esc(t.from_location)} → ${esc(t.to_location)}`)
      if (isAllDay) { lines.push(`DTSTART;VALUE=DATE:${dtstart}`, `DTEND;VALUE=DATE:${dtstart}`) }
      else { lines.push(`DTSTART:${dtstart}`, `DTEND:${t.arrival_time ? toIcalDateTime(t.travel_date, t.arrival_time) : dtstart}`) }
      const desc = [t.carrier, t.reference ? `Ref: ${t.reference}` : '', t.notes || ''].filter(Boolean).join('\n')
      if (desc) lines.push(`DESCRIPTION:${esc(desc)}`)
      lines.push('END:VEVENT')
    }
    for (const a of accommodation) {
      lines.push('BEGIN:VEVENT', `UID:hotel-${uid()}`, `SUMMARY:🏨 ${esc(a.name)}`,
        `DTSTART;VALUE=DATE:${toIcalDate(a.check_in)}`,
        `DTEND;VALUE=DATE:${a.check_out ? toIcalDate(a.check_out) : toIcalDate(a.check_in)}`)
      if (a.address) lines.push(`LOCATION:${esc(a.address)}`)
      if (a.confirmation) lines.push(`DESCRIPTION:Confirmation: ${esc(a.confirmation)}`)
      lines.push('END:VEVENT')
    }
    lines.push('END:VCALENDAR')
    const blob = new Blob([lines.join('\r\n')], { type: 'text/calendar;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const el = document.createElement('a')
    el.href = url
    el.download = `${artist.name} - ${tour.name}.ics`.replace(/[^a-z0-9 \-\.]/gi, '_')
    el.click()
    URL.revokeObjectURL(url)
  }

  const bg = '#F5F0E8'
  const card = '#fff'
  const text = '#1A1714'
  const muted = '#8A8580'
  const accent = '#C4622D'
  const border = '#DDD8CE'

  if (loading) return (
    <div style={{ background: bg, minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'Georgia, serif', color: muted }}>
      Loading...
    </div>
  )

  if (notFound) return (
    <div style={{ background: bg, minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', fontFamily: 'Georgia, serif', color: muted, padding: 24 }}>
      <div style={{ fontSize: 40, marginBottom: 16 }}>🎵</div>
      <div style={{ fontSize: 18, color: text, marginBottom: 8 }}>Tour not found</div>
      <div style={{ fontSize: 14 }}>This link may have expired or been removed.</div>
    </div>
  )

  return (
    <div style={{ background: bg, minHeight: '100vh', fontFamily: 'Georgia, serif', color: text }}>

      {/* Header */}
      <div style={{ background: '#1A1714', padding: '20px 20px 16px' }}>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 10, marginBottom: 4 }}>
          <span style={{ fontSize: 22, fontStyle: 'italic', color: '#F5F0E8' }}>{artist?.name}</span>
          <span style={{ fontFamily: 'monospace', fontSize: 9, letterSpacing: 2, color: accent }}>✦ ADVANCE</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
          <div style={{ fontFamily: 'monospace', fontSize: 11, letterSpacing: 2, color: '#8A8580', textTransform: 'uppercase' }}>
            {tour?.name}
          </div>
          <button onClick={handleExportIcal}
            style={{ padding: '7px 14px', background: 'transparent', border: '1px solid #333', borderRadius: 8, color: '#8A8580', cursor: 'pointer', fontFamily: 'monospace', fontSize: 9, letterSpacing: 2, whiteSpace: 'nowrap' }}>
            📅 ADD TO CALENDAR
          </button>
        </div>
      </div>

      <div style={{ maxWidth: 600, margin: '0 auto', padding: '20px 16px', display: 'grid', gap: 16 }}>

        {/* Shows */}
        {shows.length > 0 && (
          <Section title={`Shows`} accent={accent} border={border} card={card} muted={muted} text={text}>
            {shows.map((show, i) => (
              <Item key={i} last={i === shows.length - 1} border={border}>
                <div style={{ fontWeight: 600, fontSize: 16, marginBottom: 2 }}>{show.venue}</div>
                {show.city && <div style={{ fontSize: 13, color: muted, marginBottom: 6 }}>{show.city}{show.country ? `, ${show.country}` : ''}</div>}
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px 16px' }}>
                  <Tag label="Date" value={formatDate(show.date)} accent={accent} />
                  {show.doors_time && <Tag label="Doors" value={formatTime(show.doors_time)} accent={accent} />}
                  {show.soundcheck_time && <Tag label="Soundcheck" value={formatTime(show.soundcheck_time)} accent={accent} />}
                  {show.set_time && <Tag label="Stage" value={formatTime(show.set_time)} accent={accent} />}
                  {show.stage && <Tag label="Stage name" value={show.stage} accent={accent} />}
                </div>
                {show.notes && <div style={{ marginTop: 8, fontSize: 13, color: muted, fontStyle: 'italic', borderLeft: `2px solid ${accent}`, paddingLeft: 10 }}>{show.notes}</div>}
              </Item>
            ))}
          </Section>
        )}

        {/* Travel */}
        {travel.length > 0 && (
          <Section title={`Travel`} accent={accent} border={border} card={card} muted={muted} text={text}>
            {travel.map((t, i) => (
              <Item key={i} last={i === travel.length - 1} border={border}>
                <div style={{ fontWeight: 600, fontSize: 15, marginBottom: 4 }}>
                  {t.from_location} → {t.to_location}
                </div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px 16px' }}>
                  <Tag label="Date" value={formatDate(t.travel_date)} accent={accent} />
                  {t.travel_type && <Tag label="Type" value={t.travel_type} accent={accent} />}
                  {t.carrier && <Tag label="Carrier" value={t.carrier} accent={accent} />}
                  {t.reference && <Tag label="Ref" value={t.reference} accent={accent} />}
                  {t.departure_time && <Tag label="Departs" value={formatTime(t.departure_time)} accent={accent} />}
                  {t.arrival_time && <Tag label="Arrives" value={formatTime(t.arrival_time)} accent={accent} />}
                </div>
                {t.notes && <div style={{ marginTop: 8, fontSize: 13, color: muted, fontStyle: 'italic', borderLeft: `2px solid ${accent}`, paddingLeft: 10 }}>{t.notes}</div>}
              </Item>
            ))}
          </Section>
        )}

        {/* Accommodation */}
        {accommodation.length > 0 && (
          <Section title={`Hotels`} accent={accent} border={border} card={card} muted={muted} text={text}>
            {accommodation.map((a, i) => (
              <Item key={i} last={i === accommodation.length - 1} border={border}>
                <div style={{ fontWeight: 600, fontSize: 15, marginBottom: 2 }}>{a.name}</div>
                {a.address && (
                  <a href={`https://maps.google.com/?q=${encodeURIComponent(a.address)}`} target="_blank" rel="noreferrer"
                    style={{ fontSize: 13, color: accent, display: 'block', marginBottom: 6, textDecoration: 'none' }}>
                    📍 {a.address}
                  </a>
                )}
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px 16px' }}>
                  {a.check_in && <Tag label="Check in" value={formatDate(a.check_in)} accent={accent} />}
                  {a.check_out && <Tag label="Check out" value={formatDate(a.check_out)} accent={accent} />}
                  {a.confirmation && <Tag label="Confirmation" value={a.confirmation} accent={accent} />}
                </div>
                {a.notes && <div style={{ marginTop: 8, fontSize: 13, color: muted, fontStyle: 'italic', borderLeft: `2px solid ${accent}`, paddingLeft: 10 }}>{a.notes}</div>}
              </Item>
            ))}
          </Section>
        )}

        {/* Contacts */}
        {contacts.length > 0 && (
          <Section title={`Key Contacts`} accent={accent} border={border} card={card} muted={muted} text={text}>
            {contacts.map((c, i) => (
              <Item key={i} last={i === contacts.length - 1} border={border}>
                <div style={{ fontWeight: 600, fontSize: 15 }}>{c.name}</div>
                {c.role && <div style={{ fontSize: 12, color: muted, fontFamily: 'monospace', letterSpacing: 1, textTransform: 'uppercase', marginBottom: 6 }}>{c.role}</div>}
                <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
                  {c.phone && (
                    <a href={`tel:${c.phone}`} style={{ fontSize: 14, color: accent, textDecoration: 'none', fontWeight: 500 }}>
                      📞 {c.phone}
                    </a>
                  )}
                  {c.email && (
                    <a href={`mailto:${c.email}`} style={{ fontSize: 14, color: accent, textDecoration: 'none', fontWeight: 500 }}>
                      ✉️ {c.email}
                    </a>
                  )}
                </div>
              </Item>
            ))}
          </Section>
        )}

        {/* Footer */}
        <div style={{ textAlign: 'center', padding: '24px 0 8px', fontFamily: 'monospace', fontSize: 10, letterSpacing: 2, color: muted }}>
          ADVANCE · {artist?.name?.toUpperCase()}
        </div>

      </div>
    </div>
  )
}

function Section({ title, children, accent, border, card, muted, text }: any) {
  return (
    <div style={{ background: card, borderRadius: 12, overflow: 'hidden', border: `1px solid ${border}` }}>
      <div style={{ padding: '12px 16px', borderBottom: `1px solid ${border}`, display: 'flex', alignItems: 'center', gap: 8 }}>
        <div style={{ width: 3, height: 14, background: accent, borderRadius: 2 }} />
        <span style={{ fontFamily: 'monospace', fontSize: 10, letterSpacing: 2, color: muted, textTransform: 'uppercase' }}>{title}</span>
      </div>
      <div style={{ padding: '4px 16px' }}>{children}</div>
    </div>
  )
}

function Item({ children, last, border }: any) {
  return (
    <div style={{ padding: '14px 0', borderBottom: last ? 'none' : `1px solid ${border}` }}>
      {children}
    </div>
  )
}

function Tag({ label, value, accent }: any) {
  return (
    <div style={{ fontSize: 12 }}>
      <span style={{ color: '#aaa', marginRight: 4 }}>{label}:</span>
      <span style={{ fontWeight: 500 }}>{value}</span>
    </div>
  )
}
