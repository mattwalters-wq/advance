'use client'

import { useEffect, useState, Suspense } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
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
  return new Date(d + 'T00:00:00').toLocaleDateString('en-AU', { weekday: 'long', day: 'numeric', month: 'long' })
}

function fmtDateShort(d: string) {
  if (!d) return null
  const dt = new Date(d + 'T00:00:00')
  return { day: dt.toLocaleDateString('en-AU', { day: '2-digit', month: '2-digit' }), weekday: dt.toLocaleDateString('en-AU', { weekday: 'short' }) }
}

function getDayType(date: string, shows: any[], travel: any[], accom: any[]) {
  const hasShow = shows.some(s => s.date === date)
  const hasTravel = travel.some(t => t.travel_date === date)
  const hasCheckIn = accom.some(a => a.check_in === date)
  if (hasShow && hasTravel) return 'Show + Travel'
  if (hasShow) return 'Show Day'
  if (hasTravel) return 'Travel Day'
  if (hasCheckIn) return 'Hotel'
  return 'Day Off'
}

function getDayTypeColor(type: string, accent: string) {
  if (type.includes('Show')) return accent
  if (type.includes('Travel')) return '#2E6B8A'
  if (type === 'Hotel') return '#4A6B2E'
  return '#4A4540'
}

function DayScheduleContent() {
  const params = useSearchParams()
  const router = useRouter()
  const tourId = params.get('tourId')
  const initialDate = params.get('date')

  const [tour, setTour] = useState<any>(null)
  const [artist, setArtist] = useState<any>(null)
  const [allShows, setAllShows] = useState<any[]>([])
  const [allTravel, setAllTravel] = useState<any[]>([])
  const [allAccom, setAllAccom] = useState<any[]>([])
  const [selectedDate, setSelectedDate] = useState(initialDate || '')
  const [loading, setLoading] = useState(true)
  const [darkMode, setDarkMode] = useState(false)

  useEffect(() => { if (tourId) loadData() }, [tourId])

  async function loadData() {
    const [tourRes, showsRes, travelRes, accomRes] = await Promise.all([
      supabase.from('tours').select('*, artists(name, project, color)').eq('id', tourId).single(),
      supabase.from('shows').select('*').eq('tour_id', tourId).order('date'),
      supabase.from('travel').select('*').eq('tour_id', tourId).order('travel_date'),
      supabase.from('accommodation').select('*').eq('tour_id', tourId).order('check_in'),
    ])
    setTour(tourRes.data)
    setArtist(tourRes.data?.artists)
    setAllShows(showsRes.data || [])
    setAllTravel(travelRes.data || [])
    setAllAccom(accomRes.data || [])
    setLoading(false)
  }

  // Build list of all tour dates
  const tourDates = (() => {
    const dates = new Set<string>()
    allShows.forEach(s => dates.add(s.date))
    allTravel.forEach(t => dates.add(t.travel_date))
    allAccom.forEach(a => { dates.add(a.check_in); if (a.check_out) dates.add(a.check_out) })
    if (!dates.size) return []
    const sorted = [...dates].sort()
    // Fill in all days between first and last
    const all: string[] = []
    const start = new Date(sorted[0] + 'T00:00:00')
    const end = new Date(sorted[sorted.length - 1] + 'T00:00:00')
    for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
      // Use local date parts to avoid UTC offset shifting the date
      const y = d.getFullYear()
      const m = String(d.getMonth() + 1).padStart(2, '0')
      const day = String(d.getDate()).padStart(2, '0')
      all.push(`${y}-${m}-${day}`)
    }
    return all
  })()

  // Selected date data
  const dayShows = allShows.filter(s => s.date === selectedDate)
  const dayTravel = allTravel.filter(t => t.travel_date === selectedDate)
  const dayAccom = allAccom.filter(a => a.check_in === selectedDate || a.check_out === selectedDate)
  const stayingAccom = allAccom.filter(a => a.check_in <= selectedDate && a.check_out > selectedDate)

  const accent = artist?.color || '#C4622D'
  const dayType = selectedDate ? getDayType(selectedDate, allShows, allTravel, allAccom) : ''
  const dayTypeColor = getDayTypeColor(dayType, accent)

  const bg = darkMode ? '#0F0E0C' : '#F4EFE6'
  const card = darkMode ? '#1A1714' : '#fff'
  const text = darkMode ? '#F4EFE6' : '#1A1714'
  const muted = darkMode ? '#5A5450' : '#8A8580'
  const border = darkMode ? '#2A2520' : '#E8E0D4'
  const panelBg = darkMode ? '#111' : '#FAF7F4'
  const selectedBg = darkMode ? '#2A1F18' : '#FDF5EF'

  // Build timeline for selected day
  type TItem = { time: string; sort: string; icon: string; label: string; sub?: string; detail?: string; color: string; major?: boolean }
  const timeline: TItem[] = []

  // Hotel checkout
  dayAccom.filter(a => a.check_out === selectedDate).forEach(a => {
    timeline.push({ time: 'Morning', sort: '06:00', icon: '🏨', label: `Check out — ${a.name}`, sub: a.address, color: '#4A6B2E' })
  })

  // Travel
  dayTravel.forEach(t => {
    const tIcon = t.travel_type === 'Drive' ? '🚗' : t.travel_type === 'Train' ? '🚂' : t.travel_type === 'Bus' ? '🚌' : t.travel_type === 'Ferry' ? '⛴' : '✈️'
    if (t.departure_time) timeline.push({ time: fmt(t.departure_time), sort: t.departure_time, icon: tIcon, label: `${t.from_location} → ${t.to_location}`, sub: [t.carrier, t.reference ? `Ref: ${t.reference}` : ''].filter(Boolean).join(' · ') || undefined, detail: t.travellers ? `👤 ${t.travellers}` : undefined, color: '#2E6B8A', major: true })
    if (t.arrival_time) timeline.push({ time: fmt(t.arrival_time), sort: t.arrival_time, icon: '📍', label: `Arrive ${t.to_location}`, sub: t.travellers ? `👤 ${t.travellers}` : (t.notes || undefined), color: '#2E6B8A' })
  })

  // Hotel check-in
  dayAccom.filter(a => a.check_in === selectedDate).forEach(a => {
    timeline.push({ time: 'Afternoon', sort: '14:00', icon: '🏨', label: `Check in — ${a.name}`, sub: a.address || undefined, detail: a.confirmation ? `Ref: ${a.confirmation}` : undefined, color: '#4A6B2E' })
  })

  // Show events
  dayShows.forEach(show => {
    if (show.soundcheck_time) timeline.push({ time: fmt(show.soundcheck_time), sort: show.soundcheck_time, icon: '🎙', label: 'Soundcheck', sub: show.venue, color: '#8A5B2E' })
    if (show.catering) {
      const ct = show.soundcheck_time ? String(parseInt(show.soundcheck_time.split(':')[0]) + 1).padStart(2, '0') + ':00' : '17:00'
      timeline.push({ time: fmt(ct), sort: ct, icon: '🍽', label: 'Catering', sub: show.catering, color: '#6B4A2E' })
    }
    if (show.doors_time) timeline.push({ time: fmt(show.doors_time), sort: show.doors_time, icon: '🚪', label: 'Doors', sub: show.venue, color: '#5B4B8A' })
    if (show.set_time) timeline.push({ time: fmt(show.set_time), sort: show.set_time, icon: '🎵', label: artist?.name || 'Stage', sub: show.stage ? `${show.venue} · ${show.stage}` : show.venue, detail: show.backline ? `🎸 ${show.backline}` : undefined, color: accent, major: true })
    if (show.notes) {
      const noteLines = show.notes.split('\n')
      const timeRx = /^(\d{1,2}:\d{2}\s*(?:am|pm)?)\s*[-:]?\s*/i
      let parsedAny = false
      noteLines.forEach((line: string) => {
        const l = line.trim()
        if (!l) return
        const m = l.match(timeRx)
        if (m) {
          parsedAny = true
          const rawTime = m[1]
          const rest = l.slice(m[0].length).trim()
          if (!rest) return
          const lower = rest.toLowerCase()
          const parts = rawTime.toLowerCase().replace(/[^0-9:]/g,'').split(':')
          let h = parseInt(parts[0])
          const mn = parts[1] || '00'
          if (rawTime.toLowerCase().includes('pm') && h !== 12) h += 12
          if (rawTime.toLowerCase().includes('am') && h === 12) h = 0
          const sort24 = String(h).padStart(2,'0') + ':' + mn
          const icon = lower.includes('transfer') || lower.includes('car') ? '🚗'
            : lower.includes('check in') || lower.includes('check-in') ? '🏨'
            : lower.includes('soundcheck') ? '🎙'
            : lower.includes('greenroom') ? '🟢'
            : lower.includes('performance') || lower.includes('stage') ? '🎵'
            : lower.includes('catering') ? '🍽'
            : lower.includes('arrive') ? '📍' : '📋'
          const isMajor = lower.includes('performance') || lower.includes('stage') || lower.includes('soundcheck')
          timeline.push({ time: rawTime, sort: sort24, icon, label: rest, color: isMajor ? accent : muted, major: isMajor })
        }
      })
      if (!parsedAny) timeline.push({ time: '', sort: 'zz', icon: '📝', label: show.notes, color: muted })
    }
  })

  timeline.sort((a, b) => {
    const tm: Record<string, string> = { Morning: '06:30', Afternoon: '14:00', Evening: '19:00', '': 'zz' }
    return (tm[a.sort] || a.sort).localeCompare(tm[b.sort] || b.sort)
  })

  // Group tour dates by month for the sidebar
  const byMonth: Record<string, string[]> = {}
  tourDates.forEach(d => {
    const key = new Date(d + 'T00:00:00').toLocaleDateString('en-AU', { month: 'long', year: 'numeric' }).toUpperCase()
    if (!byMonth[key]) byMonth[key] = []
    byMonth[key].push(d)
  })

  if (loading) return <div style={{ background: bg, minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'monospace', fontSize: 11, letterSpacing: '0.2em', color: muted }}>LOADING</div>

  return (
    <div style={{ background: bg, height: '100vh', display: 'flex', flexDirection: 'column', fontFamily: '"Georgia", serif', color: text, overflow: 'hidden' }}>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,700;1,400&display=swap'); * { box-sizing: border-box; } ::-webkit-scrollbar { width: 4px; } ::-webkit-scrollbar-track { background: transparent; } ::-webkit-scrollbar-thumb { background: ${border}; border-radius: 4px; } @media print { .no-print { display: none !important; } body { overflow: visible !important; height: auto !important; } }`}</style>

      {/* Top bar */}
      <div style={{ background: '#0F0E0C', height: 52, display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 20px', flexShrink: 0 }} className="no-print">
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <button onClick={() => router.back()} style={{ background: 'none', border: 'none', color: '#5A5450', cursor: 'pointer', fontSize: 13, fontFamily: '"Georgia", serif', padding: 0 }}>← Back</button>
          <div style={{ width: 1, height: 18, background: '#2A2520' }} />
          <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
            <div style={{ width: 26, height: 26, borderRadius: 6, background: accent, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: 11, fontWeight: 700, fontStyle: 'italic', fontFamily: '"Playfair Display", serif' }}>{artist?.name?.charAt(0)}</div>
            <div>
              <div style={{ color: '#F4EFE6', fontSize: 13, fontWeight: 600 }}>{tour?.name}</div>
              <div style={{ color: '#4A4540', fontSize: 10, fontFamily: 'monospace', letterSpacing: '0.1em' }}>{artist?.name?.toUpperCase()}</div>
            </div>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 6 }}>
          <button onClick={() => window.print()} style={{ padding: '5px 12px', background: 'transparent', border: '1px solid #2A2520', borderRadius: 5, color: '#6A6058', cursor: 'pointer', fontSize: 10, fontFamily: 'monospace', letterSpacing: '0.1em' }}>PRINT</button>
          <button onClick={() => setDarkMode(!darkMode)} style={{ padding: '5px 10px', background: 'transparent', border: '1px solid #2A2520', borderRadius: 5, color: '#6A6058', cursor: 'pointer', fontSize: 12 }}>{darkMode ? '☀️' : '🌙'}</button>
        </div>
      </div>

      {/* Main layout */}
      <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>

        {/* Left: Day detail */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '28px 32px' }}>
          {!selectedDate ? (
            <div style={{ textAlign: 'center', paddingTop: 80, color: muted }}>
              <div style={{ fontSize: 28, marginBottom: 12 }}>←</div>
              <div style={{ fontFamily: '"Playfair Display", serif', fontSize: 20, fontStyle: 'italic' }}>Select a date</div>
            </div>
          ) : (
            <>
              {/* Day header */}
              <div style={{ marginBottom: 28 }}>
                <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
                  <div style={{ fontFamily: 'monospace', fontSize: 9, letterSpacing: '0.2em', padding: '3px 10px', borderRadius: 10, background: dayTypeColor, color: '#fff' }}>{dayType.toUpperCase()}</div>
                  {stayingAccom.length > 0 && (
                    <div style={{ fontFamily: 'monospace', fontSize: 9, letterSpacing: '0.1em', padding: '3px 10px', borderRadius: 10, background: card, border: `1px solid ${border}`, color: muted }}>🏨 {stayingAccom[0].name}</div>
                  )}
                </div>
                <h1 style={{ fontFamily: '"Playfair Display", Georgia, serif', fontSize: 28, fontWeight: 700, margin: '0 0 4px', lineHeight: 1.1 }}>{fmtDate(selectedDate)}</h1>
                {dayShows.length > 0 && <div style={{ fontSize: 15, color: muted, fontStyle: 'italic' }}>{dayShows.map(s => s.venue + (s.city ? `, ${s.city}` : '')).join(' · ')}</div>}
                {dayTravel.length > 0 && dayShows.length === 0 && <div style={{ fontSize: 15, color: muted, fontStyle: 'italic' }}>{dayTravel.map(t => `${t.from_location} → ${t.to_location}`).join(' · ')}</div>}
              </div>

              {/* Timeline */}
              {timeline.length > 0 ? (
                <div style={{ position: 'relative', paddingLeft: 72 }}>
                  <div style={{ position: 'absolute', left: 56, top: 6, bottom: 6, width: 1, background: border }} />
                  {timeline.map((item, i) => (
                    <div key={i} style={{ position: 'relative', marginBottom: 22 }}>
                      <div style={{ position: 'absolute', left: -72, width: 48, textAlign: 'right', top: 2 }}>
                        <span style={{ fontFamily: 'monospace', fontSize: 10, color: item.major ? item.color : muted, fontWeight: item.major ? 700 : 400, letterSpacing: '0.03em' }}>{item.time}</span>
                      </div>
                      <div style={{ position: 'absolute', left: -19, top: item.major ? 2 : 4, width: item.major ? 14 : 10, height: item.major ? 14 : 10, borderRadius: '50%', background: item.major ? item.color : card, border: `2px solid ${item.major ? item.color : border}`, zIndex: 1 }} />
                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: item.sub || item.detail ? 3 : 0 }}>
                          <span style={{ fontSize: 15 }}>{item.icon}</span>
                          <span style={{ fontSize: item.major ? 16 : 14, fontWeight: item.major ? 700 : 500, fontFamily: item.major ? '"Playfair Display", serif' : '"Georgia", serif' }}>{item.label}</span>
                        </div>
                        {item.sub && <div style={{ fontSize: 12, color: muted, marginLeft: 24 }}>{item.sub}</div>}
                        {item.detail && <div style={{ fontSize: 12, color: muted, marginLeft: 24 }}>{item.detail}</div>}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div style={{ textAlign: 'center', padding: '48px 0', color: muted }}>
                  <div style={{ fontSize: 36, marginBottom: 12 }}>🌴</div>
                  <div style={{ fontFamily: '"Playfair Display", serif', fontSize: 20, fontStyle: 'italic', marginBottom: 8 }}>Day off</div>
                  <div style={{ fontSize: 13 }}>Nothing scheduled.</div>
                </div>
              )}
            </>
          )}
        </div>

        {/* Right: Tour date strip */}
        <div style={{ width: 220, borderLeft: `1px solid ${border}`, background: panelBg, overflowY: 'auto', flexShrink: 0 }} className="no-print">
          {Object.entries(byMonth).map(([month, dates]) => (
            <div key={month}>
              <div style={{ padding: '10px 14px 6px', fontFamily: 'monospace', fontSize: 9, letterSpacing: '0.2em', color: muted, background: darkMode ? '#0a0908' : '#F0EBE2', borderBottom: `1px solid ${border}`, position: 'sticky', top: 0, zIndex: 1 }}>
                {month}
              </div>
              {dates.map(date => {
                const type = getDayType(date, allShows, allTravel, allAccom)
                const typeColor = getDayTypeColor(type, accent)
                const isSelected = date === selectedDate
                const dateInfo = fmtDateShort(date)
                if (!dateInfo) return null
                const { day, weekday } = dateInfo
                const show = allShows.find(s => s.date === date)

                return (
                  <div key={date}
                    onClick={() => setSelectedDate(date)}
                    style={{ padding: '8px 14px', borderBottom: `1px solid ${border}`, cursor: 'pointer', background: isSelected ? selectedBg : 'transparent', borderLeft: isSelected ? `3px solid ${accent}` : '3px solid transparent', transition: 'background 0.1s' }}>
                    <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8 }}>
                      <div style={{ flexShrink: 0 }}>
                        <div style={{ fontFamily: 'monospace', fontSize: 11, fontWeight: isSelected ? 700 : 400, color: isSelected ? text : muted }}>{day}</div>
                        <div style={{ fontFamily: 'monospace', fontSize: 9, color: muted, letterSpacing: '0.1em' }}>{weekday.toUpperCase()}</div>
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 12, fontWeight: 600, color: isSelected ? text : (type === 'Day Off' ? muted : text), overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', lineHeight: 1.3 }}>
                          {show?.venue || type}
                        </div>
                        {show?.city && <div style={{ fontSize: 10, color: muted, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{show.city}{show.country && show.country !== 'AU' ? `, ${show.country}` : ''}</div>}
                        {!show && type !== 'Day Off' && <div style={{ fontSize: 10, color: typeColor }}>{type}</div>}
                      </div>
                      <div style={{ width: 6, height: 6, borderRadius: '50%', background: type === 'Day Off' ? 'transparent' : typeColor, flexShrink: 0, marginTop: 4 }} />
                    </div>
                  </div>
                )
              })}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

export default function DayPage() {
  return (
    <Suspense fallback={<div style={{ background: '#F4EFE6', minHeight: '100vh' }} />}>
      <DayScheduleContent />
    </Suspense>
  )
}
