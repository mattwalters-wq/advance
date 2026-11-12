'use client'

import { useEffect, useRef, useState } from 'react'
import { useParams } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import SheetDetails from '@/components/SheetDetails'
import { SharedPage, SharedHero, SharedState, SharedDock, MapLink, CopyReference, ContactCards } from '@/components/shared/SharedPage'
import { groupTravel, matchesTraveller } from '@/lib/shared-itinerary'

const supabase = createClient()

function fmt(t: string) {
  if (!t) return ''
  const [h, m] = t.split(':')
  const hour = parseInt(h)
  return `${hour % 12 || 12}:${m}${hour >= 12 ? 'pm' : 'am'}`
}

const cap = (s: string) => s ? s.charAt(0).toUpperCase() + s.slice(1) : s

// Pull structured facts out of a freeform notes paragraph so the day sheet can
// surface them as proper fields instead of one buried blob. Heuristic by design:
// anything it can't confidently classify is returned as `prose` and shown as-is,
// so the result is never worse than rendering the raw notes. Returns null when
// nothing useful was extracted (caller falls back to the plain notes block).
type NoteRow = { icon: string; label: string; value: string; href?: string }
function parseNotes(raw: string): { times: { label: string; time: string }[]; rows: NoteRow[]; prose: string } | null {
  if (!raw || raw.includes('\n')) return null // multi-line notes are handled elsewhere
  // URLs never contain whitespace, so splitting on sentence boundaries is URL-safe.
  const urlRx = /https?:\/\/[^\s]+/g

  const sentences = raw.split(/(?<=[.!?])\s+/).map((s) => s.replace(/\s+/g, ' ').trim()).filter(Boolean)
  const times: { label: string; time: string }[] = []
  const rows: NoteRow[] = []
  const prose: string[] = []

  sentences.forEach((clean) => {
    const lower = clean.toLowerCase()

    // Sentence containing a link → link row, label derived from surrounding text.
    const links = (clean.match(urlRx) || []).map((u) => u.replace(/[.,;:)\]]+$/, ''))
    if (links.length) {
      let label = clean.replace(urlRx, '').trim()
      label = (label.split(/\s[-–]\s/).pop() || label).replace(/^see\s+/i, '').replace(/[:\s.,]+$/, '').trim()
      links.forEach((href) => rows.push({ icon: '🔗', label: 'Link', value: cap(label) || href, href }))
      return
    }
    // Address → Maps pin.
    const addr = clean.match(/(?:(\w+)\s+)?address[:\s]+(.+)/i)
    if (addr) {
      const value = addr[2].replace(/\.$/, '').trim()
      const qualifier = addr[1] && /studio|venue|rehearsal|load/i.test(addr[1]) ? `${cap(addr[1])} address` : 'Address'
      rows.push({ icon: '📍', label: qualifier, value, href: `https://maps.google.com/?q=${encodeURIComponent(value)}` })
      return
    }
    if (/parking/.test(lower)) { rows.push({ icon: '🅿️', label: 'Parking', value: clean.replace(/\.$/, '') }); return }
    if (/transport|pick.?up|driver|chauffeur|shuttle/.test(lower)) { rows.push({ icon: '🚗', label: 'Transport', value: clean.replace(/\.$/, '') }); return }
    // Call time.
    const call = clean.match(/call\s*(?:time)?\s*(?:is\s*)?(\d{1,2}:\d{2})/i)
    if (call) { times.push({ label: 'Call', time: fmt(call[1]) }); return }
    // Other labeled times (rehearsal, load-in, doors, etc.).
    const lt = clean.match(/(rehearsals?|load.?in|doors?|set|stage|start|finish|wrap|depart|arrive)\b[^\d]*(\d{1,2}:\d{2})/i)
    if (lt) { times.push({ label: cap(lt[1].replace(/s$/, '')), time: fmt(lt[2]) }); return }

    prose.push(clean)
  })

  if (!rows.length && !times.length) return null
  return { times, rows, prose: prose.join(' ') }
}

// Render freeform text with any URLs turned into clickable links and line breaks preserved.
function linkify(input: string, linkColor: string) {
  if (!input) return null
  const urlRx = /(https?:\/\/[^\s]+)/g
  return input.split('\n').map((line, li, lines) => {
    const parts = line.split(urlRx)
    return (
      <span key={li}>
        {parts.map((part, pi) => {
          if (urlRx.test(part)) {
            urlRx.lastIndex = 0
            const href = part.replace(/[.,;:)]+$/, '')
            const trailing = part.slice(href.length)
            return (
              <span key={pi}>
                <a href={href} target="_blank" rel="noreferrer" style={{ color: linkColor, textDecoration: 'underline', wordBreak: 'break-word' }}>{href} ↗</a>
                {trailing}
              </span>
            )
          }
          return <span key={pi}>{part}</span>
        })}
        {li < lines.length - 1 && <br />}
      </span>
    )
  })
}

function fmtDate(d: string) {
  if (!d) return ''
  return new Date(d + 'T00:00:00').toLocaleDateString('en-AU', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric'
  })
}

function fmtDateMed(d: string) {
  if (!d) return ''
  return new Date(d + 'T00:00:00').toLocaleDateString('en-AU', {
    weekday: 'long', day: 'numeric', month: 'short'
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
  const [press, setPress] = useState<any[]>([])
  const [setlist, setSetlist] = useState<any>(null)
  const [showPeople, setShowPeople] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)
  const [mode, setMode] = useState<'day' | 'trip'>('day')
  const [personFilter, setPersonFilter] = useState('everyone')

  const [loadError, setLoadError] = useState(false)
  const request = useRef(0)
  useEffect(() => { loadData(); return () => { request.current++ } }, [params.show_id])

  async function loadData() {
    const id = ++request.current
    setLoading(true); setLoadError(false); setNotFound(false)
    try {
    // One server-side call returns only what this sheet needs (see public_daysheet in the DB)
    const { data, error } = await supabase.rpc('public_daysheet', { p_show_id: params.show_id })
    if (id !== request.current) return
    if (error) throw error
    const showData = data?.show
    if (!showData) { setNotFound(true); setLoading(false); return }

    // Check if this is a festival: 2+ shows at same venue on consecutive days
    // Respect is_festival override: false = never redirect, true = always redirect
    if (showData.is_festival !== false && (showData.type || 'show') === 'show') {
      const venueShows: any[] = data.venue_shows || []
      let redirectToFestival = showData.is_festival === true
      if (!redirectToFestival && venueShows.length >= 2) {
        const dates = venueShows.map((s: any) => s.date).sort()
        const first = new Date(dates[0] + 'T00:00:00')
        const last = new Date(dates[dates.length - 1] + 'T00:00:00')
        const spanDays = (last.getTime() - first.getTime()) / (1000 * 60 * 60 * 24)
        redirectToFestival = spanDays <= 3
      }

      if (redirectToFestival) {
        const venue = showData.venue ? `?venue=${encodeURIComponent(showData.venue)}` : ''
        window.location.replace(`/festival/${showData.tour_id}${venue}`)
        return
      }
    }
    setShow(showData)

    const tourData = data.tour
    setTour(tourData)
    setArtist(tourData?.artists || null)

    const showDate = showData.date
    const showDateObj = new Date(showDate + 'T00:00:00')
    const windowStart = new Date(showDateObj)
    windowStart.setDate(windowStart.getDate() - 1)
    const windowEnd = new Date(showDateObj)
    windowEnd.setDate(windowEnd.getDate() + 3)
    const toStr = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`

    // Store all travel within the window - filter client-side by mode/person
    setTravel((data.travel || []).filter((t: any) => {
      if (!t.travel_date) return false
      return t.travel_date >= toStr(windowStart) && t.travel_date <= toStr(windowEnd)
    }))
    setAccommodation((data.accommodation || []).filter((a: any) => {
      if (!a.check_in) return false
      return a.check_in <= showDate && (a.check_out || a.check_in) >= showDate
    }))
    // Already filtered server-side: this show's contacts first, then tour-wide ones
    setContacts(data.contacts || [])
    setRider(data.rider || null)
    setPress(data.press || [])
    setSetlist(data.setlist || null)
    setShowPeople(data.show_people || [])
    setLoading(false)
    } catch { if (id === request.current) { setLoadError(true); setLoading(false) } }
  }

  const accent = '#285e48'
  const accentLight = '#f0f4e9'
  const border = '#e0e5db'
  const muted = '#667167'
  const text = '#1d3229'
  const sectionBg = '#F9F6F2'

  if (loading) return <SharedState state="loading"/>
  if (loadError) return <SharedState state="error" retry={loadData}/>
  if (notFound) return <SharedState state="missing" noun="day sheet"/>

  // Build schedule timeline
  const isNonShow = ['rehearsal', 'recording', 'press'].includes(show?.type || '')
  const schedule: { time: string; sort: string; event: string; highlight?: boolean }[] = []
  if (show?.arrival_time) schedule.push({ time: fmt(show.arrival_time), sort: show.arrival_time, event: show.arrival_label || 'Artist arrival' })
  if (isNonShow) {
    if (show?.soundcheck_time) schedule.push({ time: fmt(show.soundcheck_time), sort: show.soundcheck_time, event: 'Start', highlight: true })
    if (show?.set_time) schedule.push({ time: fmt(show.set_time), sort: show.set_time, event: 'Finish' })
  } else {
    if (show?.soundcheck_time) schedule.push({ time: fmt(show.soundcheck_time), sort: show.soundcheck_time, event: 'Soundcheck' })
    if (show?.doors_time) schedule.push({ time: fmt(show.doors_time), sort: show.doors_time, event: 'Doors open' })
    if (show?.set_time) schedule.push({ time: fmt(show.set_time), sort: show.set_time, event: 'Performance', highlight: true })
  }
  schedule.sort((a, b) => a.sort.localeCompare(b.sort))

  // Extract all unique traveller names
  const allPeople: string[] = Array.from(new Set(
    travel.flatMap((t: any) =>
      (t.travellers || '').split(',').map((n: string) => n.trim()).filter(Boolean)
    )
  )).sort()

  const showDate = show?.date || ''

  // Filter travel by mode + person
  const filteredTravel = travel.filter((t: any) => {
    const matchesPerson = matchesTraveller(t.travellers, personFilter)
    if (mode === 'day') return t.travel_date === showDate && matchesPerson
    return matchesPerson
  })

  // Group trip travel by date
  const travelByDate: Record<string, any[]> = {}
  groupTravel(filteredTravel).forEach((t: any) => {
    const d = t.travel_date || 'unknown'
    if (!travelByDate[d]) travelByDate[d] = []
    travelByDate[d].push(t)
  })

  return (
    <SharedPage label="Day sheet">
      <SharedHero eyebrow={mode === 'day' ? 'Your day sheet' : 'Travel around this show'} title={artist?.name || tour?.name || 'Your day'} subtitle={tour?.name}>
        <div className="shared-hero-date">{fmtDate(show?.date) || 'Date to be confirmed'}</div>
      </SharedHero>
      <div className="shared-toolbar no-print">
        <div className="shared-tabs" aria-label="Sheet view">{(['day', 'trip'] as const).map(m => <button key={m} aria-pressed={mode === m} onClick={() => setMode(m)}>{m === 'day' ? 'Day sheet' : 'Nearby travel'}</button>)}</div>
        {allPeople.length > 1 && <label className="shared-person-filter">Travel for<select value={personFilter} onChange={e => setPersonFilter(e.target.value)}><option value="everyone">Everyone</option>{allPeople.map(p => <option key={p} value={p}>{p}</option>)}</select></label>}
      </div>
      <div className="daysheet-body" id="schedule">
        {/* ── PRESS DAY HEADER ── */}
        {mode === 'day' && show?.type === 'press' && press.filter((p: any) => p.date === show.date).length > 0 && (
          <div style={{ background: '#FDF5EF', borderRadius: 12, border: `1px solid #F5D9C4`, padding: '16px 20px', marginBottom: 16, display: 'flex', alignItems: 'center', gap: 12 }}>
            <span style={{ fontSize: 24 }}>📣</span>
            <div>
              <div style={{ fontFamily: 'monospace', fontSize: 10, letterSpacing: '0.2em', color: accent, marginBottom: 2 }}>PRESS DAY</div>
              <div style={{ fontSize: 15, fontWeight: 700, color: text }}>{press.filter((p: any) => p.date === show.date).length} media commitments scheduled</div>
              {show.city && <div style={{ fontSize: 13, color: muted, marginTop: 2 }}>{show.city}</div>}
            </div>
          </div>
        )}

        {/* ── VENUE + SHOW DETAIL (day mode only, not for press days) ── */}
        {mode === 'day' && show?.type !== 'press' && (
          <>
            {/* ── VENUE ── */}
            <div style={{ background: '#fff', borderRadius: 12, border: `1px solid ${border}`, overflow: 'hidden', marginBottom: 16 }}>
              <div style={{ background: text, padding: '10px 20px' }}>
                <span style={{ fontFamily: 'monospace', fontSize: 10, letterSpacing: '0.2em', color: '#F5F0E8', textTransform: 'uppercase' }}>Venue</span>
              </div>
              <div style={{ padding: '20px 24px' }}>
                {(() => {
                  const venue = show?.venue || ''
                  const isLong = venue.length > 60
                  const venueName = isLong ? venue.split(/\s*[-–]\s*(?:Access|Park|Contact|via|Turn|From)/i)[0].trim() : venue
                  const venueDetail = isLong && venue.length > venueName.length
                    ? venue.substring(venueName.length).replace(/^[\s\-–]+/, '').trim()
                    : null
                  return (
                    <>
                      <h2 style={{ fontSize: 24, fontWeight: 600, marginBottom: show?.city ? 4 : (venueDetail ? 8 : 16), lineHeight: 1.3 }}>{venueName || 'Venue to be confirmed'}</h2>
                      {venueDetail && (
                        <div style={{ fontSize: 13, color: muted, lineHeight: 1.7, marginBottom: 14, padding: '10px 12px', background: '#F9F6F2', borderRadius: 6 }}>{venueDetail}</div>
                      )}
                    </>
                  )
                })()}
                {show?.city && (
                  <div style={{ fontSize: 14, color: muted, marginBottom: show?.address ? 6 : 16 }}>
                    {show.city}{show.country && show.country !== 'AU' ? `, ${show.country}` : ''}
                  </div>
                )}
                {schedule.length > 0 ? <><div className="shared-times">{schedule.map((s, i) => <div key={i} className={`shared-time${s.highlight ? ' highlight' : ''}`}><span>{s.event}</span><strong>{s.time}</strong>{s.highlight && show?.set_length && <small>{show.set_length}</small>}</div>)}</div><p className="shared-time-note">Times as supplied by your tour manager.</p></> : <p className="shared-time-note">Schedule to be confirmed.</p>}
                {show?.address && <><p className="shared-location">{show.address}</p><div className="shared-actions"><MapLink address={show.address} label="Venue directions"/></div></>}
                {show?.stage && (
                  <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '4px 12px', background: sectionBg, borderRadius: 20, border: `1px solid ${border}`, fontSize: 12, color: muted, margin: '12px 0 16px' }}>
                    Stage: <strong style={{ color: text }}>{show.stage}</strong>
                  </div>
                )}

                {(show?.catering || show?.backline || show?.parking || show?.notes) && (
                  <SheetDetails title="Venue details & notes" hint="Parking, catering, backline and the detailed schedule">
                {show?.catering && (
                  <div style={{ padding: '12px 14px', background: '#F0FFF4', borderLeft: '3px solid #3D6B50', borderRadius: 4, fontSize: 13, color: text, lineHeight: 1.7, marginTop: 12 }}>
                    <div style={{ fontFamily: 'monospace', fontSize: 9, letterSpacing: '0.15em', color: '#3D6B50', marginBottom: 4 }}>CATERING</div>
                    {show.catering}
                  </div>
                )}
                {show?.backline && (
                  <div style={{ padding: '12px 14px', background: '#F5F0FF', borderLeft: '3px solid #5B4B8A', borderRadius: 4, fontSize: 13, color: text, lineHeight: 1.7, marginTop: 10 }}>
                    <div style={{ fontFamily: 'monospace', fontSize: 9, letterSpacing: '0.15em', color: '#5B4B8A', marginBottom: 4 }}>BACKLINE</div>
                    {show.backline}
                  </div>
                )}
                {show?.parking && (
                  <div style={{ padding: '12px 14px', background: '#EFF5FF', borderLeft: '3px solid #2D5B8A', borderRadius: 4, fontSize: 13, color: text, lineHeight: 1.7, marginTop: 10 }}>
                    <div style={{ fontFamily: 'monospace', fontSize: 9, letterSpacing: '0.15em', color: '#2D5B8A', marginBottom: 4 }}>🅿️ PARKING</div>
                    {linkify(show.parking, '#2D5B8A')}
                  </div>
                )}
                {show?.notes && (() => {
                  // Build a run-of-show from the notes. Handles both one-item-per-line
                  // and a single flattened paragraph (e.g. an imported runsheet table)
                  // by splitting on inline time tokens: "14:00", "8.30am", "6:30-7:15", etc.
                  const T = String.raw`\d{1,2}(?:[:.]\d{2}(?:\s*(?:am|pm))?|\s*(?:am|pm))`
                  const tokRx = new RegExp(`${T}(?:\\s*[-–—]\\s*${T})?`, 'ig')
                  const noteText = show.notes.replace(/\r/g, '')
                  const boldRx = /performance|stage|soundcheck|show call|headline/i
                  const tokens: { index: number; len: number; time: string }[] = []
                  let mm: RegExpExecArray | null
                  while ((mm = tokRx.exec(noteText)) !== null) {
                    tokens.push({ index: mm.index, len: mm[0].length, time: mm[0].replace(/\s+/g, ' ') })
                    if (mm.index === tokRx.lastIndex) tokRx.lastIndex++
                  }
                  const parsed: {time: string, text: string, bold: boolean}[] = []
                  let preamble = ''
                  if (tokens.length >= 3) {
                    preamble = noteText.slice(0, tokens[0].index).replace(/\s+/g, ' ').trim()
                    tokens.forEach((tk, i) => {
                      const start = tk.index + tk.len
                      const end = i + 1 < tokens.length ? tokens[i + 1].index : noteText.length
                      const seg = noteText.slice(start, end).replace(/^[\s\-–—:.]+/, '').replace(/[\s.;,]+$/, '').replace(/\s+/g, ' ').trim()
                      if (!seg) return
                      parsed.push({ time: tk.time, text: seg, bold: boldRx.test(seg) })
                    })
                  }
                  if (parsed.length >= 3) {
                    return (
                      <div style={{ marginTop: 14 }}>
                        <div style={{ fontFamily: 'monospace', fontSize: 9, letterSpacing: '0.15em', color: accent, marginBottom: 10 }}>DETAILED SCHEDULE</div>
                        {preamble && (
                          <div style={{ fontSize: 12, color: muted, lineHeight: 1.6, marginBottom: 10 }}>{linkify(preamble, accent)}</div>
                        )}
                        <div style={{ borderRadius: 6, overflow: 'hidden', border: `1px solid ${border}` }}>
                          {parsed.map((entry, i) => (
                            <div key={i} style={{ display: 'flex', borderBottom: i < parsed.length - 1 ? `1px solid ${border}` : 'none', background: entry.bold ? accentLight : (i % 2 === 0 ? '#fff' : '#FAFAF8') }}>
                              <div className="detailed-schedule-time" style={{ padding: '8px 14px', fontFamily: 'monospace', fontSize: 12, color: accent, fontWeight: 700, minWidth: 80, flexShrink: 0, whiteSpace: 'nowrap', borderRight: `1px solid ${border}` }}>{entry.time}</div>
                              <div style={{ padding: '8px 14px', fontSize: 13, color: text, lineHeight: 1.5, fontWeight: entry.bold ? 600 : 400 }}>{entry.text}</div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )
                  }
                  const struct = parseNotes(show.notes)
                  if (struct) {
                    return (
                      <div style={{ marginTop: 14 }}>
                        {struct.times.length > 0 && (
                          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginBottom: (struct.rows.length || struct.prose) ? 14 : 0 }}>
                            {struct.times.map((t, i) => (
                              <div key={i} style={{ background: sectionBg, borderRadius: 8, padding: '12px 18px', textAlign: 'center', minWidth: 96 }}>
                                <div style={{ fontFamily: 'monospace', fontSize: 9, letterSpacing: '0.15em', color: muted, textTransform: 'uppercase', marginBottom: 5 }}>{t.label}</div>
                                <div style={{ fontSize: 22, fontWeight: 700, color: text, lineHeight: 1 }}>{t.time}</div>
                              </div>
                            ))}
                          </div>
                        )}
                        {struct.rows.length > 0 && (
                          <div style={{ border: `1px solid ${border}`, borderRadius: 8, padding: '2px 16px', marginBottom: struct.prose ? 12 : 0 }}>
                            {struct.rows.map((r, i) => (
                              <div key={i} style={{ display: 'flex', gap: 12, alignItems: 'flex-start', padding: '12px 0', borderTop: i === 0 ? 'none' : `1px solid ${border}` }}>
                                <span style={{ fontSize: 15, lineHeight: 1.4, flexShrink: 0 }}>{r.icon}</span>
                                <div style={{ minWidth: 0 }}>
                                  <div style={{ fontFamily: 'monospace', fontSize: 9, letterSpacing: '0.15em', color: muted, textTransform: 'uppercase', marginBottom: 3 }}>{r.label}</div>
                                  {r.href ? (
                                    <a href={r.href} target="_blank" rel="noreferrer" style={{ fontSize: 14, color: accent, textDecoration: 'none', wordBreak: 'break-word' }}>{r.value} ↗</a>
                                  ) : (
                                    <div style={{ fontSize: 14, color: text, lineHeight: 1.5 }}>{r.value}</div>
                                  )}
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                        {struct.prose && (
                          <div style={{ padding: '12px 14px', background: accentLight, borderLeft: `3px solid ${accent}`, borderRadius: 4, fontSize: 13, color: text, lineHeight: 1.75 }}>
                            <div style={{ fontFamily: 'monospace', fontSize: 9, letterSpacing: '0.15em', color: accent, marginBottom: 4 }}>NOTES</div>
                            {linkify(struct.prose, accent)}
                          </div>
                        )}
                      </div>
                    )
                  }
                  return (
                    <div style={{ padding: '12px 14px', background: accentLight, borderLeft: `3px solid ${accent}`, borderRadius: 4, fontSize: 13, color: text, lineHeight: 1.75, marginTop: 10 }}>
                      <div style={{ fontFamily: 'monospace', fontSize: 9, letterSpacing: '0.15em', color: accent, marginBottom: 4 }}>NOTES</div>
                      {linkify(show.notes, accent)}
                    </div>
                  )
                })()}
                  </SheetDetails>
                )}
              </div>
            </div>
          </>
        )}

        <div id="travel"/>
        {/* ── TRAVEL ── */}
        {mode === 'day' ? (
          filteredTravel.length > 0 ? (
            <div style={{ background: '#fff', borderRadius: 12, border: `1px solid ${border}`, overflow: 'hidden', marginBottom: 16 }}>
              <SectionHeader label="Travel Today" />
              <div className="sheet-inset" style={{ padding: '4px 24px' }}>
                {groupTravel(filteredTravel).map((t: any, i: number, arr: any[]) => (
                  <TravelRow key={i} t={t} isLast={i === arr.length - 1} border={border} muted={muted} fmt={fmt} />
                ))}
              </div>
            </div>
          ) : travel.length > 0 ? <div className="shared-section shared-empty">No travel scheduled for this day{personFilter !== 'everyone' ? ` for ${personFilter}` : ''}. Check nearby travel for other dates.</div> : null
        ) : (
          Object.keys(travelByDate).length > 0 ? (
            <div style={{ background: '#fff', borderRadius: 12, border: `1px solid ${border}`, overflow: 'hidden', marginBottom: 16 }}>
              <SectionHeader label={personFilter !== 'everyone' ? `Travel - ${personFilter}` : 'Travel around this show'} />
              <div className="sheet-inset" style={{ padding: '4px 24px' }}>
                {Object.entries(travelByDate).map(([date, items], di) => (
                  <div key={date}>
                    <div style={{ padding: '12px 0 4px', display: 'flex', alignItems: 'center', gap: 10, borderTop: di > 0 ? `1px solid ${border}` : 'none', marginTop: di > 0 ? 4 : 0 }}>
                      <span style={{ fontFamily: 'monospace', fontSize: 10, letterSpacing: '0.15em', color: date === showDate ? accent : muted, fontWeight: date === showDate ? 700 : 400 }}>
                        {fmtDateMed(date).toUpperCase()}
                      </span>
                      {date === showDate && (
                        <span style={{ background: accent, color: '#fff', padding: '2px 8px', borderRadius: 3, fontFamily: 'monospace', fontSize: 8, letterSpacing: 1 }}>SHOW DAY</span>
                      )}
                    </div>
                    {items.map((t: any, i: number) => (
                      <TravelRow key={i} t={t} isLast={i === items.length - 1 && di === Object.keys(travelByDate).length - 1} border={border} muted={muted} fmt={fmt} />
                    ))}
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div style={{ background: '#fff', borderRadius: 12, border: `1px solid ${border}`, padding: '20px 24px', marginBottom: 16, color: muted, fontSize: 13, fontStyle: 'italic' }}>
              No travel found{personFilter !== 'everyone' ? ` for ${personFilter}` : ''}.
            </div>
          )
        )}

        {/* ── PRESS ── */}
        {(() => {
          const pressToShow = mode === 'day'
            ? press.filter(p => p.date === showDate).sort((a, b) => (a.time || '').localeCompare(b.time || ''))
            : press
          if (pressToShow.length === 0) return null

          const typeLabels: Record<string, string> = {
            interview: 'Interview', radio: 'Radio', tv: 'TV', podcast: 'Podcast',
            photo_shoot: 'Photo shoot', press_conference: 'Press conf.', other: 'Press'
          }
          const typeIcons: Record<string, string> = {
            interview: '🎙', radio: '📻', tv: '📺', podcast: '🎧',
            photo_shoot: '📷', press_conference: '🗞', other: '📣'
          }

          return (
            <div style={{ background: '#fff', borderRadius: 12, border: `1px solid ${border}`, overflow: 'hidden', marginBottom: 16 }}>
              <div style={{ background: '#FDF5EF', padding: '10px 20px', borderBottom: `1px solid ${border}` }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ fontSize: 14 }}>📣</span>
                  <span style={{ fontFamily: 'monospace', fontSize: 10, letterSpacing: '0.2em', color: accent, textTransform: 'uppercase' }}>Press Commitments</span>
                </div>
              </div>
              <div className="sheet-inset" style={{ padding: '4px 24px' }}>
                {pressToShow.map((p: any, i: number) => (
                  <div key={i} style={{ padding: '14px 0', borderBottom: i < pressToShow.length - 1 ? `1px solid ${border}` : 'none' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8, flexWrap: 'wrap' }}>
                      <span style={{ fontSize: 16 }}>{typeIcons[p.type] || '📣'}</span>
                      <span style={{ fontSize: 16, fontWeight: 700 }}>{p.outlet || typeLabels[p.type] || 'Press'}</span>
                      <span style={{ fontFamily: 'monospace', fontSize: 9, color: accent, background: '#FDF5EF', border: `1px solid ${accent}`, padding: '2px 8px', borderRadius: 3, letterSpacing: 1 }}>
                        {(typeLabels[p.type] || 'PRESS').toUpperCase()}
                      </span>
                      {mode === 'trip' && p.date && (
                        <span style={{ fontSize: 11, fontFamily: 'monospace', color: muted, marginLeft: 'auto' }}>
                          {new Date(p.date + 'T00:00:00').toLocaleDateString('en-AU', { weekday: 'short', day: 'numeric', month: 'short' }).toUpperCase()}
                        </span>
                      )}
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(130px, 1fr))', gap: 8 }}>
                      {p.time && <Pill label="Start" value={fmt(p.time)} />}
                      {p.end_time && <Pill label="End" value={fmt(p.end_time)} />}
                      {p.location && <Pill label="Location" value={p.location} />}
                    </div>
                    {p.contact_name && (
                      <div style={{ marginTop: 8, fontSize: 13, color: muted, display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                        <span>👤 {p.contact_name}</span>
                        {p.contact_phone && <a href={`tel:${p.contact_phone}`} style={{ color: accent, textDecoration: 'none' }}>📞 {p.contact_phone}</a>}
                        {p.contact_email && <a href={`mailto:${p.contact_email}`} style={{ color: accent, textDecoration: 'none' }}>✉ {p.contact_email}</a>}
                      </div>
                    )}
                    {p.notes && <div style={{ marginTop: 6, fontSize: 12, color: muted, fontStyle: 'italic' }}>{p.notes}</div>}
                  </div>
                ))}
              </div>
            </div>
          )
        })()}

        <div id="stays"/>
        {/* ── ACCOMMODATION ── */}
        {accommodation.length > 0 && (
          <div style={{ background: '#fff', borderRadius: 12, border: `1px solid ${border}`, overflow: 'hidden', marginBottom: 16 }}>
            <SectionHeader label="Accommodation" />
            <div className="sheet-inset" style={{ padding: '4px 24px' }}>
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
                    {a.check_in && <Pill label="Check in" value={fmtDateMed(a.check_in)} />}
                    {a.check_out && <Pill label="Check out" value={fmtDateMed(a.check_out)} />}

                  </div>
                  {a.confirmation && <CopyReference value={a.confirmation}/>}
                  {a.travellers && <div style={{ fontSize: 13, color: muted }}>👤 {a.travellers}</div>}
                  {a.rooming && (
                    <div style={{ marginTop: 10, padding: '10px 12px', background: '#F9F6F2', borderLeft: `3px solid ${accent}`, borderRadius: 4 }}>
                      <div style={{ fontFamily: 'monospace', fontSize: 9, letterSpacing: '0.15em', color: accent, marginBottom: 6 }}>ROOMING</div>
                      <div style={{ fontSize: 13, color: text, lineHeight: 1.7, whiteSpace: 'pre-wrap' as const, fontFamily: 'monospace' }}>
                        {a.rooming}
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        <div id="contacts"/>
        {/* ── CONTACTS (day mode only) ── */}
        {mode === 'day' && contacts.length > 0 && (
          <div style={{ background: '#fff', borderRadius: 12, border: `1px solid ${border}`, overflow: 'hidden', marginBottom: 16 }}>
            <SectionHeader label="Key Contacts" />
            <ContactCards contacts={contacts}/>
          </div>
        )}

        {/* ── RIDER (day mode only) ── */}
        {mode === 'day' && rider && (rider.tech_notes || rider.hospitality || rider.set_length || rider.band_size || rider.input_list || rider.tech_rider_url) && (
          <SheetDetails title="Rider & technical details" hint="Band setup, hospitality and technical documents">
            <div className="sheet-inset" style={{ padding: '16px 24px', display: 'grid', gap: 12 }}>
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
          </SheetDetails>
        )}

        {/* ── SUPPORT ACTS & PHOTOGRAPHERS (day mode only) ── */}
        {mode === 'day' && showPeople.length > 0 && (() => {
          const roleLabels: Record<string, string> = { support: 'Support', photographer: 'Photographer', videographer: 'Videographer', dj: 'DJ', mc: 'MC', other: 'Other' }
          const roleIcons: Record<string, string> = { support: '🎤', photographer: '📷', videographer: '🎥', dj: '🎧', mc: '🎙', other: '•' }
          // Group by role category for better readability
          const sorted = [...showPeople].sort((a, b) => {
            const order = ['support', 'dj', 'mc', 'photographer', 'videographer', 'other']
            const aIdx = order.indexOf(a.role || 'other')
            const bIdx = order.indexOf(b.role || 'other')
            if (aIdx !== bIdx) return aIdx - bIdx
            if (a.set_time && b.set_time) return a.set_time.localeCompare(b.set_time)
            return (a.name || '').localeCompare(b.name || '')
          })
          return (
            <SheetDetails title="Supports & crew" hint="Set times and contact details">
              <div>
                {sorted.map((p: any, i: number) => (
                  <div key={i} className="sheet-inset" style={{ padding: '12px 24px', borderBottom: i < sorted.length - 1 ? `1px solid ${border}` : 'none', display: 'flex', gap: 12, alignItems: 'flex-start' }}>
                    <div style={{ fontSize: 18, flexShrink: 0, width: 24, textAlign: 'center' }}>{roleIcons[p.role] || '•'}</div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'baseline', gap: 10, flexWrap: 'wrap' }}>
                        <span style={{ fontSize: 15, fontWeight: 700 }}>{p.name}</span>
                        <span style={{ fontFamily: 'monospace', fontSize: 9, letterSpacing: 1.5, color: accent, background: '#FDF5EF', border: `1px solid ${accent}`, padding: '1px 7px', borderRadius: 3 }}>
                          {(roleLabels[p.role] || 'OTHER').toUpperCase()}
                        </span>
                        {p.set_time && (
                          <span style={{ fontFamily: 'monospace', fontSize: 12, color: accent, fontWeight: 700 }}>
                            {fmt(p.set_time)}{p.duration_minutes ? ` · ${p.duration_minutes}min` : ''}
                          </span>
                        )}
                      </div>
                      {(p.phone || p.email || p.instagram) && (
                        <div style={{ fontSize: 12, color: muted, marginTop: 4, display: 'flex', gap: 12, flexWrap: 'wrap' }}>
                          {p.phone && <a href={`tel:${p.phone}`} style={{ color: accent, textDecoration: 'none' }}>📞 {p.phone}</a>}
                          {p.email && <a href={`mailto:${p.email}`} style={{ color: accent, textDecoration: 'none' }}>✉ {p.email}</a>}
                          {p.instagram && <span>📷 {p.instagram}</span>}
                        </div>
                      )}
                      {p.notes && <div style={{ fontSize: 12, color: muted, fontStyle: 'italic', marginTop: 4, whiteSpace: 'pre-wrap' as const }}>{p.notes}</div>}
                    </div>
                  </div>
                ))}
              </div>
            </SheetDetails>
          )
        })()}

        {/* ── SETLIST (day mode only) ── */}
        {mode === 'day' && setlist && Array.isArray(setlist.songs) && setlist.songs.length > 0 && (() => {
          const totalSeconds = setlist.songs.reduce((sum: number, s: any) => {
            if (!s.duration) return sum
            const parts = s.duration.split(':').map((x: string) => parseInt(x) || 0)
            if (parts.length === 2) return sum + parts[0] * 60 + parts[1]
            return sum
          }, 0)
          const totalMin = Math.floor(totalSeconds / 60)
          const totalSec = totalSeconds % 60
          return (
            <SheetDetails title="Setlist" hint="Songs, durations and performance notes">
              <div style={{ fontSize: 13, color: muted, marginBottom: 12 }}>
                {setlist.songs.length} songs{totalSeconds > 0 ? ` · ${totalMin}:${String(totalSec).padStart(2, '0')}` : ''}
              </div>
              <div className="sheet-inset" style={{ padding: '4px 24px' }}>
                {setlist.songs.map((song: any, i: number) => (
                  <div key={i} style={{ display: 'grid', gridTemplateColumns: '28px 1fr auto', gap: 12, padding: '10px 0', borderBottom: i < setlist.songs.length - 1 ? `1px solid ${border}` : 'none', alignItems: 'center' }}>
                    <span style={{ fontFamily: 'monospace', fontSize: 11, color: muted, textAlign: 'center' }}>{i + 1}</span>
                    <div>
                      <div style={{ fontSize: 14, fontWeight: 600 }}>{song.title}</div>
                      {song.notes && <div style={{ fontSize: 11, color: muted, marginTop: 2, fontStyle: 'italic' }}>{song.notes}</div>}
                    </div>
                    {song.duration && (
                      <span style={{ fontFamily: 'monospace', fontSize: 12, color: muted, whiteSpace: 'nowrap' }}>{song.duration}</span>
                    )}
                  </div>
                ))}
              </div>
              {setlist.notes && (
                <div style={{ padding: '12px 24px', background: '#F9F6F2', borderTop: `1px solid ${border}`, fontSize: 12, color: muted, fontStyle: 'italic', whiteSpace: 'pre-wrap' }}>
                  {setlist.notes}
                </div>
              )}
            </SheetDetails>
          )
        })()}

      </div>
      <SharedDock items={[
        ...(mode === 'day' ? [{href:'#schedule',label:'Schedule',icon:'calendar' as const}] : []),
        ...(travel.length ? [{href:'#travel',label:'Travel',icon:'plane' as const}] : []),
        ...(accommodation.length ? [{href:'#stays',label:'Stay',icon:'overview' as const}] : []),
        ...(mode === 'day' && contacts.length ? [{href:'#contacts',label:'Contacts',icon:'list' as const}] : [])
      ]}/>
    </SharedPage>
  )
}

function TravelRow({ t, isLast, border, muted, fmt }: any) {
  return (
    <div style={{ padding: '14px 0', borderBottom: isLast ? 'none' : `1px solid ${border}` }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
        <span style={{ fontSize: 16 }}>{(() => { const tt = (t.travel_type || '').toLowerCase(); if (tt === 'drive') return '🚗'; if (tt === 'train') return '🚂'; if (tt === 'bus') return '🚌'; if (tt === 'ferry') return '⛴'; return '✈️'; })()}</span>
        <span style={{ fontSize: 16, fontWeight: 700 }}>{t.from_location} → {t.to_location}</span>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(130px, 1fr))', gap: 8 }}>
        {t.carrier && <Pill label="Service" value={t.carrier} />}
        <Pill label="Departs" value={t.departure_time ? fmt(t.departure_time) : 'Time TBC'} />
        {t.arrival_time && <Pill label="Arrives" value={fmt(t.arrival_time)} />}

      </div>
      {t.reference && <CopyReference value={t.reference}/>}
      {t.travellers && <div style={{ marginTop: 8, fontSize: 13, color: muted }}>👤 {t.travellers}</div>}
      {t.notes && <div style={{ marginTop: 6, fontSize: 12, color: muted, fontStyle: 'italic' }}>{t.notes}</div>}
    </div>
  )
}

function SectionHeader({ label }: { label: string }) {
  return (
    <div className="shared-section-heading"><h2>{label}</h2></div>
  )
}

function Pill({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ background: '#F9F6F2', border: '1px solid #E8E2D8', borderRadius: 6, padding: '6px 12px', display: 'inline-block' }}>
      <div style={{ fontFamily: 'monospace', fontSize: 9, letterSpacing: '0.1em', color: '#667167', textTransform: 'uppercase', marginBottom: 2 }}>{label}</div>
      <div style={{ fontSize: 13, fontWeight: 600, color: '#1A1714' }}>{value}</div>
    </div>
  )
}

function RiderRow({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div style={{ fontFamily: 'monospace', fontSize: 9, letterSpacing: '0.15em', color: '#667167', textTransform: 'uppercase', marginBottom: 4 }}>{label}</div>
      <div style={{ fontSize: 13, color: '#1A1714', lineHeight: 1.7, whiteSpace: 'pre-wrap' }}>{value}</div>
    </div>
  )
}
