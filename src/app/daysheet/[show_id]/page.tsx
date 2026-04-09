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
  return new Date(d + 'T00:00:00').toLocaleDateString('en-AU', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric'
  })
}

export default function DaySheetPage() {
  const params = useParams()
  const [show, setShow] = useState<any>(null)
  const [tour, setTour] = useState<any>(null)
  const [artist, setArtist] = useState<any>(null)
  const [travel, setTravel] = useState<any[]>([])
  const [accommodation, setAccommodation] = useState<any[]>([])
  const [contacts, setContacts] = useState<any[]>([])
  const [rider, setRider] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)

  useEffect(() => { loadData() }, [params.show_id])

  async function loadData() {
    const { data: showData } = await supabase.from('shows').select('*').eq('id', params.show_id).single()
    if (!showData) { setNotFound(true); setLoading(false); return }
    setShow(showData)

    const [tourRes, travelRes, accomRes, contactsRes, riderRes] = await Promise.all([
      supabase.from('tours').select('*, artists(*)').eq('id', showData.tour_id).single(),
      supabase.from('travel').select('*').eq('tour_id', showData.tour_id).order('travel_date'),
      supabase.from('accommodation').select('*').eq('tour_id', showData.tour_id).order('check_in'),
      supabase.from('contacts').select('*').eq('tour_id', showData.tour_id),
      supabase.from('riders').select('*').eq('tour_id', showData.tour_id).single(),
    ])

    const tourData = tourRes.data
    setTour(tourData)
    if (tourData?.artists) {
      setArtist(tourData.artists)
    }

    const showDate = showData.date

    // Show travel within a window: 1 day before through 3 days after the show
    // Covers arrival flights, show day, and all departure flights for multi-day festivals
    const showDateObj = new Date(showDate + 'T00:00:00')
    const windowStart = new Date(showDateObj)
    windowStart.setDate(windowStart.getDate() - 1)
    const windowEnd = new Date(showDateObj)
    windowEnd.setDate(windowEnd.getDate() + 3)
    const toStr = (d: Date) => d.toISOString().split('T')[0]

    setTravel((travelRes.data || []).filter((t: any) => {
      if (!t.travel_date) return false
      return t.travel_date >= toStr(windowStart) && t.travel_date <= toStr(windowEnd)
    }))
    setAccommodation((accomRes.data || []).filter((a: any) => {
      if (!a.check_in) return false
      return a.check_in <= showDate && (a.check_out || a.check_in) >= showDate
    }))
    setContacts(contactsRes.data || [])
    setRider(riderRes.data || null)
    setLoading(false)
  }

  const accent = '#C4622D'
  const accentLight = '#FDF5EF'
  const border = '#E8E2D8'
  const muted = '#8A8580'
  const text = '#1A1714'
  const sectionBg = '#F9F6F2'

  if (loading) return <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#F9F6F2', fontFamily: 'sans-serif', color: muted }}>Loading...</div>
  if (notFound) return <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#F9F6F2', fontFamily: 'sans-serif', color: muted }}>Show not found.</div>

  // Build schedule timeline from show data
  const schedule: { time: string; sort: string; event: string; note?: string }[] = []
  if (show?.soundcheck_time) schedule.push({ time: fmt(show.soundcheck_time), sort: show.soundcheck_time, event: 'Soundcheck' })
  if (show?.doors_time) schedule.push({ time: fmt(show.doors_time), sort: show.doors_time, event: 'Doors open' })
  if (show?.set_time) schedule.push({ time: fmt(show.set_time), sort: show.set_time, event: 'Performance', note: 'Stage time' })
  schedule.sort((a, b) => a.sort.localeCompare(b.sort))

  return (
    <div style={{ background: sectionBg, minHeight: '100vh', fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Helvetica, Arial, sans-serif', color: text }}>
      <style>{`
        * { box-sizing: border-box; }
        @media print {
          .no-print { display: none !important; }
          body { background: white !important; }
          @page { margin: 1.5cm; size: A4; }
        }
        @media (max-width: 600px) {
          .times-grid { grid-template-columns: repeat(2, 1fr) !important; }
        }
      `}</style>

      {/* Toolbar */}
      <div className="no-print" style={{ background: '#1A1714', padding: '0 24px', height: 52, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{ fontSize: 17, fontStyle: 'italic', color: '#F5F0E8', fontFamily: 'Georgia, serif' }}>Advance</span>
          <span style={{ fontFamily: 'monospace', fontSize: 9, letterSpacing: 2, color: accent }}>DAY SHEET</span>
        </div>
        <button onClick={() => window.print()}
          style={{ padding: '7px 18px', background: accent, color: '#fff', border: 'none', borderRadius: 6, cursor: 'pointer', fontFamily: 'monospace', fontSize: 10, letterSpacing: 2 }}>
          PRINT
        </button>
      </div>

      {/* Page */}
      <div style={{ maxWidth: 700, margin: '0 auto', padding: '32px 16px 60px' }}>

        {/* ── HEADER ── */}
        <div style={{ background: '#fff', borderRadius: 12, border: `1px solid ${border}`, overflow: 'hidden', marginBottom: 16 }}>
          {/* Artist colour strip */}
          <div style={{ height: 5, background: artist?.color || accent }} />
          <div style={{ padding: '24px 28px' }}>
            <div style={{ fontFamily: 'monospace', fontSize: 10, letterSpacing: '0.2em', color: muted, marginBottom: 6, textTransform: 'uppercase' }}>Call Sheet</div>
            <div style={{ fontSize: 30, fontWeight: 700, letterSpacing: '-0.02em', marginBottom: 2, lineHeight: 1.1 }}>{artist?.name}</div>
            {tour?.name && <div style={{ fontSize: 14, color: muted, marginBottom: 12 }}>{tour.name}</div>}
            <div style={{ fontSize: 18, fontWeight: 600, color: text }}>{fmtDate(show?.date)}</div>
          </div>
        </div>

        {/* ── VENUE ── */}
        <div style={{ background: '#fff', borderRadius: 12, border: `1px solid ${border}`, overflow: 'hidden', marginBottom: 16 }}>
          <div style={{ background: text, padding: '10px 20px' }}>
            <span style={{ fontFamily: 'monospace', fontSize: 10, letterSpacing: '0.2em', color: '#F5F0E8', textTransform: 'uppercase' }}>Venue</span>
          </div>
          <div style={{ padding: '20px 24px' }}>
            {/* Venue name — split if overly long (contains directions) */}
            {(() => {
              const venue = show?.venue || ''
              const isLong = venue.length > 60
              const venueName = isLong ? venue.split(/\s*[-–]\s*(?:Access|Park|Contact|via|Turn|From)/i)[0].trim() : venue
              const venueDetail = isLong && venue.length > venueName.length
                ? venue.substring(venueName.length).replace(/^[\s\-–]+/, '').trim()
                : null
              return (
                <>
                  <div style={{ fontSize: 20, fontWeight: 700, marginBottom: show?.city ? 4 : (venueDetail ? 8 : 16), lineHeight: 1.3 }}>
                    {venueName}
                  </div>
                  {venueDetail && (
                    <div style={{ fontSize: 13, color: muted, lineHeight: 1.7, marginBottom: 14, padding: '10px 12px', background: '#F9F6F2', borderRadius: 6 }}>
                      {venueDetail}
                    </div>
                  )}
                </>
              )
            })()}
            {show?.city && (
              <div style={{ fontSize: 14, color: muted, marginBottom: 16 }}>
                {show.city}{show.country && show.country !== 'AU' ? `, ${show.country}` : ''}
              </div>
            )}
            {show?.stage && (
              <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '4px 12px', background: sectionBg, borderRadius: 20, border: `1px solid ${border}`, fontSize: 12, color: muted, marginBottom: 16 }}>
                Stage: <strong style={{ color: text }}>{show.stage}</strong>
              </div>
            )}

            {/* Times — clean grid */}
            {schedule.length > 0 && (
              <div className="times-grid" style={{ display: 'grid', gridTemplateColumns: `repeat(${Math.min(schedule.length, 3)}, 1fr)`, gap: 10, marginBottom: show?.catering || show?.backline || show?.notes ? 16 : 0 }}>
                {schedule.map((s, i) => (
                  <div key={i} style={{ background: s.event === 'Performance' ? accent : sectionBg, borderRadius: 8, padding: '14px 16px', textAlign: 'center' }}>
                    <div style={{ fontFamily: 'monospace', fontSize: 9, letterSpacing: '0.15em', color: s.event === 'Performance' ? 'rgba(255,255,255,0.75)' : muted, textTransform: 'uppercase', marginBottom: 5 }}>{s.event}</div>
                    <div style={{ fontSize: 24, fontWeight: 700, color: s.event === 'Performance' ? '#fff' : text, lineHeight: 1 }}>{s.time}</div>
                  </div>
                ))}
              </div>
            )}

            {/* Catering */}
            {show?.catering && (
              <div style={{ padding: '12px 14px', background: '#F0FFF4', borderLeft: '3px solid #3D6B50', borderRadius: 4, fontSize: 13, color: text, lineHeight: 1.7, marginTop: 12 }}>
                <div style={{ fontFamily: 'monospace', fontSize: 9, letterSpacing: '0.15em', color: '#3D6B50', marginBottom: 4 }}>CATERING</div>
                {show.catering}
              </div>
            )}

            {/* Backline */}
            {show?.backline && (
              <div style={{ padding: '12px 14px', background: '#F5F0FF', borderLeft: '3px solid #5B4B8A', borderRadius: 4, fontSize: 13, color: text, lineHeight: 1.7, marginTop: 10 }}>
                <div style={{ fontFamily: 'monospace', fontSize: 9, letterSpacing: '0.15em', color: '#5B4B8A', marginBottom: 4 }}>BACKLINE</div>
                {show.backline}
              </div>
            )}

            {/* Notes — parse as schedule if timestamped */}
            {show?.notes && (() => {
              const noteLines = show.notes.split('\n')
              const timeRx = /^(\d{1,2}:\d{2}\s*(?:am|pm)?)\s*[-:]?\s*/i
              const parsed: {time: string, text: string, bold: boolean}[] = []
              noteLines.forEach((line: string) => {
                const l = line.trim()
                if (!l) return
                const m = l.match(timeRx)
                if (m) {
                  const rest = l.slice(m[0].length).trim()
                  if (!rest) return
                  const lower = rest.toLowerCase()
                  const bold = lower.includes('performance') || lower.includes('stage') || lower.includes('soundcheck') || lower.includes('show call')
                  parsed.push({ time: m[1], text: rest, bold })
                }
              })
              if (parsed.length >= 3) {
                return (
                  <div style={{ marginTop: 14 }}>
                    <div style={{ fontFamily: 'monospace', fontSize: 9, letterSpacing: '0.15em', color: accent, marginBottom: 10 }}>DETAILED SCHEDULE</div>
                    <div style={{ borderRadius: 6, overflow: 'hidden', border: `1px solid ${border}` }}>
                      {parsed.map((entry, i) => (
                        <div key={i} style={{ display: 'flex', borderBottom: i < parsed.length - 1 ? `1px solid ${border}` : 'none', background: entry.bold ? accentLight : (i % 2 === 0 ? '#fff' : '#FAFAF8') }}>
                          <div style={{ padding: '8px 14px', fontFamily: 'monospace', fontSize: 12, color: accent, fontWeight: 700, minWidth: 80, flexShrink: 0, borderRight: `1px solid ${border}` }}>{entry.time}</div>
                          <div style={{ padding: '8px 14px', fontSize: 13, color: text, lineHeight: 1.5, fontWeight: entry.bold ? 600 : 400 }}>{entry.text}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                )
              }
              return (
                <div style={{ padding: '12px 14px', background: accentLight, borderLeft: `3px solid ${accent}`, borderRadius: 4, fontSize: 13, color: text, lineHeight: 1.75, marginTop: 10 }}>
                  <div style={{ fontFamily: 'monospace', fontSize: 9, letterSpacing: '0.15em', color: accent, marginBottom: 4 }}>NOTES</div>
                  {show.notes}
                </div>
              )
            })()}
          </div>
        </div>

        {/* ── TRAVEL TODAY ── */}
        {travel.length > 0 && (() => {
          // Group by flight number (carrier) — merge travellers across separate booking refs
          const grouped: any[] = []
          travel.forEach((t: any) => {
            const key = t.carrier
              ? `${t.carrier}__${t.from_location}__${t.to_location}`
              : `${t.travel_type}__${t.from_location}__${t.to_location}__${t.departure_time}`
            const existing = grouped.find((g: any) => g._key === key)
            if (existing) {
              // Merge travellers
              const existingNames = (existing.travellers || '').split(',').map((n: string) => n.trim()).filter(Boolean)
              const newNames = (t.travellers || '').split(',').map((n: string) => n.trim()).filter(Boolean)
              const merged = [...new Set([...existingNames, ...newNames])]
              existing.travellers = merged.join(', ')
              // Keep multiple refs if different
              if (t.reference && !existing.reference?.includes(t.reference)) {
                existing.reference = existing.reference ? `${existing.reference}, ${t.reference}` : t.reference
              }
            } else {
              grouped.push({ ...t, _key: key })
            }
          })

          grouped.sort((a: any, b: any) => {
            const dateCompare = (a.travel_date || '').localeCompare(b.travel_date || '')
            if (dateCompare !== 0) return dateCompare
            return (a.departure_time || '').localeCompare(b.departure_time || '')
          })

          return (
            <div style={{ background: '#fff', borderRadius: 12, border: `1px solid ${border}`, overflow: 'hidden', marginBottom: 16 }}>
              <SectionHeader label="Travel" />
              <div style={{ padding: '4px 24px' }}>
                {grouped.map((t: any, i: number) => (
                  <div key={i} style={{ padding: '14px 0', borderBottom: i < grouped.length - 1 ? `1px solid ${border}` : 'none' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <span style={{ fontSize: 16 }}>{t.travel_type === 'Drive' ? '🚗' : t.travel_type === 'Train' ? '🚂' : '✈️'}</span>
                        <span style={{ fontSize: 16, fontWeight: 700 }}>{t.from_location} → {t.to_location}</span>
                      </div>
                      {t.travel_date && (
                        <span style={{ fontSize: 11, fontFamily: 'monospace', letterSpacing: '0.05em', color: muted, whiteSpace: 'nowrap' }}>
                          {new Date(t.travel_date + 'T00:00:00').toLocaleDateString('en-AU', { weekday: 'short', day: 'numeric', month: 'short' }).toUpperCase()}
                        </span>
                      )}
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(130px, 1fr))', gap: 8 }}>
                      {t.carrier && <Pill label="Flight" value={t.carrier} />}
                      {t.departure_time && <Pill label="Departs" value={fmt(t.departure_time)} />}
                      {t.arrival_time && <Pill label="Arrives" value={fmt(t.arrival_time)} />}
                      {t.reference && <Pill label="Ref" value={t.reference} />}
                    </div>
                    {t.travellers && <div style={{ marginTop: 8, fontSize: 13, color: muted }}>👤 {t.travellers}</div>}
                    {t.notes && <div style={{ marginTop: 6, fontSize: 12, color: muted, fontStyle: 'italic' }}>{t.notes}</div>}
                  </div>
                ))}
              </div>
            </div>
          )
        })()}

        {/* ── HOTEL ── */}
        {accommodation.length > 0 && (
          <div style={{ background: '#fff', borderRadius: 12, border: `1px solid ${border}`, overflow: 'hidden', marginBottom: 16 }}>
            <SectionHeader label={accommodation.length === 1 ? "Accommodation" : "Accommodation"} />
            <div style={{ padding: '4px 24px' }}>
              {accommodation.map((a, i) => (
                <div key={i} style={{ padding: '14px 0', borderBottom: i < accommodation.length - 1 ? `1px solid ${border}` : 'none' }}>
                  <div style={{ fontSize: 16, fontWeight: 700, marginBottom: 4 }}>{a.name}</div>
                  {a.address && (
                    <a href={`https://maps.google.com/?q=${encodeURIComponent(a.address)}`}
                      target="_blank" rel="noreferrer"
                      style={{ fontSize: 13, color: accent, display: 'inline-flex', alignItems: 'center', gap: 4, marginBottom: 10, textDecoration: 'none' }}>
                      📍 {a.address}
                    </a>
                  )}
                  <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginBottom: a.travellers ? 8 : 0 }}>
                    {a.check_in && <Pill label="Check in" value={a.check_in} />}
                    {a.check_out && <Pill label="Check out" value={a.check_out} />}
                    {a.confirmation && <Pill label="Ref" value={a.confirmation} />}
                  </div>
                  {a.travellers && <div style={{ fontSize: 13, color: muted }}>👤 {a.travellers}</div>}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── CONTACTS ── */}
        {contacts.length > 0 && (
          <div style={{ background: '#fff', borderRadius: 12, border: `1px solid ${border}`, overflow: 'hidden', marginBottom: 16 }}>
            <SectionHeader label="Key Contacts" />
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              {contacts.map((c, i) => (
                <tr key={i} style={{ borderBottom: i < contacts.length - 1 ? `1px solid ${border}` : 'none' }}>
                  <td style={{ padding: '13px 24px', verticalAlign: 'middle' }}>
                    <div style={{ fontSize: 15, fontWeight: 600 }}>{c.name}</div>
                    {c.role && <div style={{ fontSize: 11, color: muted, letterSpacing: '0.05em', textTransform: 'uppercase', marginTop: 2 }}>{c.role}</div>}
                  </td>
                  <td style={{ padding: '13px 24px', textAlign: 'right', verticalAlign: 'middle' }}>
                    <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end', flexWrap: 'wrap' }}>
                      {c.phone && (
                        <a href={`tel:${c.phone}`} style={{ fontSize: 14, color: accent, textDecoration: 'none', fontWeight: 600, whiteSpace: 'nowrap' }}>
                          {c.phone}
                        </a>
                      )}
                      {c.email && (
                        <a href={`mailto:${c.email}`} style={{ fontSize: 13, color: muted, textDecoration: 'none', whiteSpace: 'nowrap' }}>
                          {c.email}
                        </a>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </table>
          </div>
        )}

        {/* ── RIDER ── */}
        {rider && (rider.tech_notes || rider.hospitality || rider.set_length || rider.band_size || rider.input_list || rider.tech_rider_url) && (
          <div style={{ background: '#fff', borderRadius: 12, border: `1px solid ${border}`, overflow: 'hidden', marginBottom: 16 }}>
            <SectionHeader label="Rider / Tech Spec" />
            <div style={{ padding: '16px 24px', display: 'grid', gap: 12 }}>
              {rider.band_size && <RiderRow label="Band" value={rider.band_size} />}
              {rider.set_length && <RiderRow label="Set" value={rider.set_length} />}
              {rider.tech_notes && <RiderRow label="Technical" value={rider.tech_notes} />}
              {rider.hospitality && <RiderRow label="Hospitality" value={rider.hospitality} />}
              {rider.input_list && <RiderRow label="Input list" value={rider.input_list} />}
              {rider.tech_rider_url && (
                <a href={rider.tech_rider_url} target="_blank" rel="noreferrer"
                  style={{ fontSize: 13, color: accent, textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: 6, fontWeight: 600 }}>
                  📄 Full tech rider ↗
                </a>
              )}
            </div>
          </div>
        )}

        {/* Footer */}
        <div style={{ textAlign: 'center', paddingTop: 20, fontFamily: 'monospace', fontSize: 10, letterSpacing: '0.2em', color: '#C8BFB0' }}>
          ADVANCE · {artist?.name?.toUpperCase()} · {show?.date}
        </div>
      </div>
    </div>
  )
}

function SectionHeader({ label }: { label: string }) {
  return (
    <div style={{ padding: '11px 24px', borderBottom: '1px solid #E8E2D8', display: 'flex', alignItems: 'center', gap: 8 }}>
      <div style={{ width: 3, height: 14, background: '#C4622D', borderRadius: 2, flexShrink: 0 }} />
      <span style={{ fontFamily: 'monospace', fontSize: 10, letterSpacing: '0.2em', color: '#8A8580', textTransform: 'uppercase' }}>{label}</span>
    </div>
  )
}

function Pill({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ background: '#F9F6F2', border: '1px solid #E8E2D8', borderRadius: 6, padding: '6px 12px', display: 'inline-block' }}>
      <div style={{ fontFamily: 'monospace', fontSize: 9, letterSpacing: '0.1em', color: '#8A8580', textTransform: 'uppercase', marginBottom: 2 }}>{label}</div>
      <div style={{ fontSize: 13, fontWeight: 600, color: '#1A1714' }}>{value}</div>
    </div>
  )
}

function RiderRow({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div style={{ fontFamily: 'monospace', fontSize: 9, letterSpacing: '0.15em', color: '#8A8580', textTransform: 'uppercase', marginBottom: 4 }}>{label}</div>
      <div style={{ fontSize: 13, color: '#1A1714', lineHeight: 1.7, whiteSpace: 'pre-wrap' }}>{value}</div>
    </div>
  )
}
