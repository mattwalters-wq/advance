'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'

const supabase = createClient()

type ModalType = 'show' | 'travel' | 'accommodation' | 'contact' | 'tour' | 'rider' | 'settlement' | null

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
  const [view, setView] = useState<'list' | 'calendar' | 'notes'>('list')
  const [calMonth, setCalMonth] = useState(new Date())
  const [modal, setModal] = useState<ModalType>(null)
  const [saving, setSaving] = useState(false)

  // Form state
  const [form, setForm] = useState<any>({})
  const [confirmDelete, setConfirmDelete] = useState<{ table: string, id: string, label: string } | null>(null)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [deleting, setDeleting] = useState(false)
  const [warnings, setWarnings] = useState<string[]>([])
  const [notes, setNotes] = useState<any[]>([])
  const [rider, setRider] = useState<any>(null)
  const [settlements, setSettlements] = useState<any[]>([])
  const [settlementShow, setSettlementShow] = useState<any>(null)
  const [newNote, setNewNote] = useState('')
  const [postingNote, setPostingNote] = useState(false)
  const [userName, setUserName] = useState('Manager')

  useEffect(() => { loadArtist() }, [params.id])
  useEffect(() => { if (selectedTour) loadTourData(selectedTour.id) }, [selectedTour])

  async function loadArtist() {
    const { data: artistData } = await supabase.from('artists').select('*').eq('id', params.id).single()
    if (!artistData) { router.push('/dashboard'); return }
    setArtist(artistData)
    const { data: toursData } = await supabase.from('tours').select('*').eq('artist_id', params.id).order('start_date', { ascending: true })
    setTours(toursData || [])
    if (toursData && toursData.length > 0) setSelectedTour(toursData[0])
    // Get user name
    const { data: { user } } = await supabase.auth.getUser()
    if (user) {
      const { data: profile } = await supabase.from('profiles').select('full_name').eq('id', user.id).single()
      if (profile?.full_name) setUserName(profile.full_name)
    }
    setLoading(false)
  }

  async function loadTourData(tourId: string) {
    const [s, t, a, c] = await Promise.all([
      supabase.from('shows').select('*').eq('tour_id', tourId).order('date'),
      supabase.from('travel').select('*').eq('tour_id', tourId).order('travel_date'),
      supabase.from('accommodation').select('*').eq('tour_id', tourId).order('check_in'),
      supabase.from('contacts').select('*').eq('tour_id', tourId),
    ])
    const showsData = s.data || []
    const travelData = t.data || []
    const accomData = a.data || []
    setShows(showsData)
    setTravel(travelData)
    setAccommodation(accomData)
    setContacts(c.data || [])
    setWarnings(computeWarnings(showsData, travelData, accomData))
    // Load notes
    const { data: notesData } = await supabase.from('tour_notes').select('*').eq('tour_id', tourId).order('created_at', { ascending: true })
    setNotes(notesData || [])
    const { data: riderData } = await supabase.from('riders').select('*').eq('tour_id', tourId).single()
    setRider(riderData || null)
    const { data: settlementsData } = await supabase.from('settlements').select('*').eq('tour_id', tourId)
    setSettlements(settlementsData || [])
  }

  async function postNote() {
    if (!newNote.trim() || !selectedTour) return
    setPostingNote(true)
    const { data } = await supabase.from('tour_notes').insert({
      tour_id: selectedTour.id,
      org_id: selectedTour.org_id,
      author_name: userName,
      content: newNote.trim(),
    }).select().single()
    if (data) setNotes(prev => [...prev, data])
    setNewNote('')
    setPostingNote(false)
  }

  async function deleteNote(id: string) {
    await supabase.from('tour_notes').delete().eq('id', id)
    setNotes(prev => prev.filter(n => n.id !== id))
  }

  async function handleDelete() {
    if (!confirmDelete) return
    setDeleting(true)
    await supabase.from(confirmDelete.table).delete().eq('id', confirmDelete.id)
    setConfirmDelete(null)
    setDeleting(false)
    if (selectedTour) await loadTourData(selectedTour.id)
  }

  function computeWarnings(showsData: any[], travelData: any[], accomData: any[]) {
    const w: string[] = []
    const sorted = [...showsData].sort((a, b) => a.date.localeCompare(b.date))

    for (let i = 0; i < sorted.length - 1; i++) {
      const a = sorted[i]
      const b = sorted[i + 1]
      if (!a.city || !b.city) continue
      if (a.city.toLowerCase() === b.city.toLowerCase()) continue

      // Different cities on consecutive or nearby days — check for travel
      const dateA = new Date(a.date + 'T00:00:00')
      const dateB = new Date(b.date + 'T00:00:00')
      const dayGap = (dateB.getTime() - dateA.getTime()) / (1000 * 60 * 60 * 24)
      if (dayGap > 3) continue

      const hasTravelBetween = travelData.some(t => {
        if (!t.travel_date) return false
        const td = new Date(t.travel_date + 'T00:00:00')
        return td >= dateA && td <= dateB
      })
      if (!hasTravelBetween) {
        w.push(`No travel booked between ${a.city} (${a.date}) and ${b.city} (${b.date})`)
      }
    }

    // Shows with no accommodation on the same night
    for (const show of sorted) {
      const hasAccom = accomData.some(a => {
        if (!a.check_in || !a.check_out) return false
        return a.check_in <= show.date && a.check_out > show.date
      })
      if (!hasAccom && show.city) {
        w.push(`No hotel for show night: ${show.venue}, ${show.city} (${show.date})`)
      }
    }

    // Shows with no set time
    for (const show of sorted) {
      if (!show.set_time) {
        w.push(`Stage time missing: ${show.venue}${show.city ? ', ' + show.city : ''} (${show.date})`)
      }
    }

    // Back-to-back shows in different countries with less than 2 days gap
    for (let i = 0; i < sorted.length - 1; i++) {
      const a = sorted[i]
      const b = sorted[i + 1]
      if (!a.country || !b.country) continue
      if (a.country === b.country) continue
      const dateA = new Date(a.date + 'T00:00:00')
      const dateB = new Date(b.date + 'T00:00:00')
      const dayGap = (dateB.getTime() - dateA.getTime()) / (1000 * 60 * 60 * 24)
      if (dayGap < 2) {
        w.push(`Tight international jump: ${a.country} → ${b.country} with only ${dayGap} day gap (${a.date} → ${b.date})`)
      }
    }

    // No contacts at all
    return w
  }

  function openModal(type: ModalType, existingItem?: any) {
    setForm(existingItem ? { ...existingItem } : {})
    setEditingId(existingItem?.id || null)
    setModal(type)
  }

  function closeModal() {
    setModal(null)
    setForm({})
    setEditingId(null)
  }

  async function handleSave() {
    setSaving(true)

    if (modal === 'tour') {
      // Create a new tour
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        const { data: profile } = await supabase.from('profiles').select('org_id').eq('id', user.id).single()
        if (profile) {
          const { data: newTour } = await supabase.from('tours')
            .insert({ name: form.name, start_date: form.start_date || null, end_date: form.end_date || null, artist_id: params.id, org_id: profile.org_id })
            .select().single()
          if (newTour) {
            const { data: toursData } = await supabase.from('tours').select('*').eq('artist_id', params.id as string).order('start_date', { ascending: true })
            setTours(toursData || [])
            setSelectedTour(newTour)
          }
        }
      }
      setSaving(false)
      closeModal()
      return
    }

    if (!selectedTour) { setSaving(false); return }
    const base = { tour_id: selectedTour.id, org_id: selectedTour.org_id }

    if (modal === 'settlement') {
      const base = { tour_id: selectedTour.id, org_id: selectedTour.org_id, show_id: settlementShow?.id }
      const existing = settlements.find(s => s.show_id === settlementShow?.id)
      if (existing) {
        const { id, tour_id, org_id, show_id, created_at, ...updates } = form
        await supabase.from('settlements').update(updates).eq('id', existing.id)
        setSettlements(prev => prev.map(s => s.id === existing.id ? { ...s, ...updates } : s))
      } else {
        const { data } = await supabase.from('settlements').insert({ ...base, ...form }).select().single()
        if (data) setSettlements(prev => [...prev, data])
      }
      setSaving(false)
      closeModal()
      return
    }

    if (modal === 'rider') {
      if (rider?.id) {
        const { id, tour_id, org_id, created_at, ...updates } = form
        await supabase.from('riders').update(updates).eq('id', rider.id)
        setRider({ ...rider, ...updates })
      } else {
        const base = { tour_id: selectedTour.id, org_id: selectedTour.org_id }
        const { data } = await supabase.from('riders').insert({ ...base, ...form }).select().single()
        setRider(data)
      }
      setSaving(false)
      closeModal()
      return
    }

    const tableMap: Record<string, string> = {
      show: 'shows', travel: 'travel', accommodation: 'accommodation', contact: 'contacts'
    }
    const table = tableMap[modal as string]
    if (!table) { setSaving(false); return }

    if (editingId) {
      const { id, tour_id, org_id, created_at, ...updates } = form
      await supabase.from(table).update(updates).eq('id', editingId)
    } else {
      await supabase.from(table).insert({ ...base, ...form })
    }

    await loadTourData(selectedTour.id)
    setSaving(false)
    closeModal()
  }

  function handleExportIcal() {
    if (!selectedTour || !artist) return

    function pad(n: number) { return String(n).padStart(2, '0') }
    function toIcalDate(dateStr: string) {
      // dateStr is YYYY-MM-DD
      return dateStr.replace(/-/g, '')
    }
    function toIcalDateTime(dateStr: string, timeStr: string) {
      // returns local datetime string YYYYMMDDTHHmmss
      if (!timeStr) return toIcalDate(dateStr)
      const t = timeStr.replace(':', '')
      return `${dateStr.replace(/-/g, '')}T${t}00`
    }
    function uid() {
      return Math.random().toString(36).slice(2) + '@advance'
    }
    function escIcal(str: string) {
      return (str || '').replace(/\\/g, '\\\\').replace(/;/g, '\\;').replace(/,/g, '\\,').replace(/\n/g, '\\n')
    }

    const lines: string[] = [
      'BEGIN:VCALENDAR',
      'VERSION:2.0',
      'PRODID:-//Advance//Tour Manager//EN',
      `X-WR-CALNAME:${escIcal(artist.name)} - ${escIcal(selectedTour.name)}`,
      'X-WR-TIMEZONE:Australia/Melbourne',
      'CALSCALE:GREGORIAN',
      'METHOD:PUBLISH',
    ]

    // Shows
    for (const show of shows) {
      const dtstart = show.set_time
        ? toIcalDateTime(show.date, show.set_time)
        : toIcalDate(show.date)
      const isAllDay = !show.set_time
      const location = [show.venue, show.city, show.country].filter(Boolean).join(', ')
      const description = [
        show.doors_time ? `Doors: ${show.doors_time}` : '',
        show.soundcheck_time ? `Soundcheck: ${show.soundcheck_time}` : '',
        show.stage ? `Stage: ${show.stage}` : '',
        show.notes || '',
      ].filter(Boolean).join('\\n')

      lines.push('BEGIN:VEVENT')
      lines.push(`UID:show-${uid()}`)
      lines.push(`SUMMARY:🎵 ${escIcal(show.venue)}${show.city ? ` — ${escIcal(show.city)}` : ''}`)
      if (isAllDay) {
        lines.push(`DTSTART;VALUE=DATE:${dtstart}`)
        lines.push(`DTEND;VALUE=DATE:${dtstart}`)
      } else {
        lines.push(`DTSTART:${dtstart}`)
        // default 2hr show
        const [h, m] = show.set_time.split(':').map(Number)
        const endH = pad((h + 2) % 24)
        lines.push(`DTEND:${toIcalDate(show.date)}T${endH}${pad(m)}00`)
      }
      if (location) lines.push(`LOCATION:${escIcal(location)}`)
      if (description) lines.push(`DESCRIPTION:${description}`)
      lines.push('END:VEVENT')
    }

    // Travel
    for (const t of travel) {
      const dtstart = t.departure_time
        ? toIcalDateTime(t.travel_date, t.departure_time)
        : toIcalDate(t.travel_date)
      const isAllDay = !t.departure_time
      const summary = `${t.travel_type || '✈️'} ${escIcal(t.from_location)} → ${escIcal(t.to_location)}`
      const description = [
        t.carrier ? `${t.carrier}` : '',
        t.reference ? `Ref: ${t.reference}` : '',
        t.notes || '',
      ].filter(Boolean).join('\\n')

      lines.push('BEGIN:VEVENT')
      lines.push(`UID:travel-${uid()}`)
      lines.push(`SUMMARY:${summary}`)
      if (isAllDay) {
        lines.push(`DTSTART;VALUE=DATE:${dtstart}`)
        lines.push(`DTEND;VALUE=DATE:${dtstart}`)
      } else {
        lines.push(`DTSTART:${dtstart}`)
        if (t.arrival_time) {
          lines.push(`DTEND:${toIcalDateTime(t.travel_date, t.arrival_time)}`)
        } else {
          lines.push(`DTEND:${dtstart}`)
        }
      }
      if (description) lines.push(`DESCRIPTION:${description}`)
      lines.push('END:VEVENT')
    }

    // Accommodation
    for (const a of accommodation) {
      lines.push('BEGIN:VEVENT')
      lines.push(`UID:hotel-${uid()}`)
      lines.push(`SUMMARY:🏨 ${escIcal(a.name)}`)
      lines.push(`DTSTART;VALUE=DATE:${toIcalDate(a.check_in)}`)
      lines.push(`DTEND;VALUE=DATE:${a.check_out ? toIcalDate(a.check_out) : toIcalDate(a.check_in)}`)
      if (a.address) lines.push(`LOCATION:${escIcal(a.address)}`)
      const desc = [a.confirmation ? `Confirmation: ${a.confirmation}` : '', a.notes || ''].filter(Boolean).join('\\n')
      if (desc) lines.push(`DESCRIPTION:${desc}`)
      lines.push('END:VEVENT')
    }

    lines.push('END:VCALENDAR')

    const icsContent = lines.join('\r\n')
    const blob = new Blob([icsContent], { type: 'text/calendar;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${artist.name} - ${selectedTour.name}.ics`.replace(/[^a-z0-9 \-\.]/gi, '_')
    a.click()
    URL.revokeObjectURL(url)
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
  function getDaysInMonth(year: number, month: number) { return new Date(year, month + 1, 0).getDate() }
  function getFirstDayOfMonth(year: number, month: number) { return new Date(year, month, 1).getDay() }
  function showsOnDate(dateStr: string) { return shows.filter(s => s.date === dateStr) }
  function travelOnDate(dateStr: string) { return travel.filter(t => t.travel_date === dateStr) }
  function accomOnDate(dateStr: string) { return accommodation.filter(a => a.check_in === dateStr) }
  function toDateStr(year: number, month: number, day: number) {
    return `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
  }
  function formatTime(t: string) {
    if (!t) return ''
    const [h, m] = t.split(':')
    const hour = parseInt(h)
    return `${hour % 12 || 12}:${m}${hour >= 12 ? 'pm' : 'am'}`
  }

  const bg = darkMode ? '#1a1a1a' : '#f5f0e8'
  const card = darkMode ? '#2a2a2a' : '#ffffff'
  const text = darkMode ? '#e8e0d0' : '#2c2c2c'
  const muted = darkMode ? '#888' : '#999'
  const accent = '#C4622D'
  const border = darkMode ? '#333' : '#e8e0d0'
  const calBg = darkMode ? '#222' : '#faf7f2'
  const inputStyle = {
    width: '100%', padding: '10px 12px', borderRadius: 8,
    border: `1px solid ${border}`, background: bg, color: text,
    fontSize: 14, fontFamily: 'Georgia, serif', boxSizing: 'border-box' as const,
    outline: 'none',
  }
  const labelStyle = { fontSize: 11, fontFamily: 'monospace', letterSpacing: 2, color: muted, textTransform: 'uppercase' as const, display: 'block', marginBottom: 6 }
  const fieldStyle = { marginBottom: 16 }

  const year = calMonth.getFullYear()
  const month = calMonth.getMonth()
  const daysInMonth = getDaysInMonth(year, month)
  const firstDay = getFirstDayOfMonth(year, month)
  const monthName = calMonth.toLocaleDateString('en-AU', { month: 'long', year: 'numeric' })
  const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

  if (loading) return <div style={{ background: bg, minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', color: text }}>Loading...</div>

  return (
    <div style={{ background: bg, minHeight: '100vh', fontFamily: 'Georgia, serif', color: text }}>

      {/* Modal overlay */}
      {modal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}
          onClick={closeModal}>
          <div style={{ background: card, borderRadius: 16, padding: 28, width: '100%', maxWidth: 480, maxHeight: '90vh', overflowY: 'auto' }}
            onClick={e => e.stopPropagation()}>

            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
              <div style={{ fontFamily: 'monospace', fontSize: 11, letterSpacing: 3, textTransform: 'uppercase', color: muted }}>
                {editingId ? 'Edit' : 'Add'} {modal === 'accommodation' ? 'Hotel' : modal}
              </div>
              <button onClick={closeModal} style={{ background: 'none', border: 'none', color: muted, cursor: 'pointer', fontSize: 20, lineHeight: 1 }}>×</button>
            </div>

            {modal === 'tour' && (
              <>
                <div style={fieldStyle}>
                  <label style={labelStyle}>Tour name *</label>
                  <input style={inputStyle} value={form.name || ''} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="e.g. EU Tour 2026" />
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 16 }}>
                  <div>
                    <label style={labelStyle}>Start date</label>
                    <input style={inputStyle} type="date" value={form.start_date || ''} onChange={e => setForm({ ...form, start_date: e.target.value })} />
                  </div>
                  <div>
                    <label style={labelStyle}>End date</label>
                    <input style={inputStyle} type="date" value={form.end_date || ''} onChange={e => setForm({ ...form, end_date: e.target.value })} />
                  </div>
                </div>
                <div style={{ marginBottom: 16 }}>
                  <label style={labelStyle}>Status</label>
                  <select style={inputStyle} value={form.status || 'routing'} onChange={e => setForm({ ...form, status: e.target.value })}>
                    <option value="routing">~ Routing</option>
                    <option value="confirmed">✓ Confirmed</option>
                    <option value="completed">— Completed</option>
                  </select>
                </div>
              </>
            )}

            {modal === 'show' && (
              <>
                <div style={fieldStyle}>
                  <label style={labelStyle}>Venue *</label>
                  <input style={inputStyle} value={form.venue || ''} onChange={e => setForm({ ...form, venue: e.target.value })} placeholder="Venue name" />
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 16 }}>
                  <div>
                    <label style={labelStyle}>City</label>
                    <input style={inputStyle} value={form.city || ''} onChange={e => setForm({ ...form, city: e.target.value })} placeholder="Melbourne" />
                  </div>
                  <div>
                    <label style={labelStyle}>Country</label>
                    <input style={inputStyle} value={form.country || ''} onChange={e => setForm({ ...form, country: e.target.value })} placeholder="AU" />
                  </div>
                </div>
                <div style={fieldStyle}>
                  <label style={labelStyle}>Date *</label>
                  <input style={inputStyle} type="date" value={form.date || ''} onChange={e => setForm({ ...form, date: e.target.value })} />
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12, marginBottom: 16 }}>
                  <div>
                    <label style={labelStyle}>Doors</label>
                    <input style={inputStyle} type="time" value={form.doors_time || ''} onChange={e => setForm({ ...form, doors_time: e.target.value })} />
                  </div>
                  <div>
                    <label style={labelStyle}>Soundcheck</label>
                    <input style={inputStyle} type="time" value={form.soundcheck_time || ''} onChange={e => setForm({ ...form, soundcheck_time: e.target.value })} />
                  </div>
                  <div>
                    <label style={labelStyle}>Stage</label>
                    <input style={inputStyle} type="time" value={form.set_time || ''} onChange={e => setForm({ ...form, set_time: e.target.value })} />
                  </div>
                </div>
                <div style={fieldStyle}>
                  <label style={labelStyle}>Stage name</label>
                  <input style={inputStyle} value={form.stage || ''} onChange={e => setForm({ ...form, stage: e.target.value })} placeholder="e.g. Main Stage" />
                </div>
                <div style={fieldStyle}>
                  <label style={labelStyle}>Notes</label>
                  <textarea style={{ ...inputStyle, resize: 'vertical', minHeight: 70 }} value={form.notes || ''} onChange={e => setForm({ ...form, notes: e.target.value })} placeholder="Any notes..." />
                </div>
              </>
            )}

            {modal === 'travel' && (
              <>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 16 }}>
                  <div>
                    <label style={labelStyle}>From *</label>
                    <input style={inputStyle} value={form.from_location || ''} onChange={e => setForm({ ...form, from_location: e.target.value })} placeholder="Melbourne" />
                  </div>
                  <div>
                    <label style={labelStyle}>To *</label>
                    <input style={inputStyle} value={form.to_location || ''} onChange={e => setForm({ ...form, to_location: e.target.value })} placeholder="Sydney" />
                  </div>
                </div>
                <div style={fieldStyle}>
                  <label style={labelStyle}>Date *</label>
                  <input style={inputStyle} type="date" value={form.travel_date || ''} onChange={e => setForm({ ...form, travel_date: e.target.value })} />
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 16 }}>
                  <div>
                    <label style={labelStyle}>Type</label>
                    <select style={inputStyle} value={form.travel_type || ''} onChange={e => setForm({ ...form, travel_type: e.target.value })}>
                      <option value="">Select...</option>
                      <option>Flight</option>
                      <option>Drive</option>
                      <option>Train</option>
                      <option>Bus</option>
                      <option>Ferry</option>
                    </select>
                  </div>
                  <div>
                    <label style={labelStyle}>Carrier</label>
                    <input style={inputStyle} value={form.carrier || ''} onChange={e => setForm({ ...form, carrier: e.target.value })} placeholder="e.g. QF401" />
                  </div>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 16 }}>
                  <div>
                    <label style={labelStyle}>Departs</label>
                    <input style={inputStyle} type="time" value={form.departure_time || ''} onChange={e => setForm({ ...form, departure_time: e.target.value })} />
                  </div>
                  <div>
                    <label style={labelStyle}>Arrives</label>
                    <input style={inputStyle} type="time" value={form.arrival_time || ''} onChange={e => setForm({ ...form, arrival_time: e.target.value })} />
                  </div>
                </div>
                <div style={fieldStyle}>
                  <label style={labelStyle}>Reference / Booking #</label>
                  <input style={inputStyle} value={form.reference || ''} onChange={e => setForm({ ...form, reference: e.target.value })} placeholder="ABC123" />
                </div>
                <div style={fieldStyle}>
                  <label style={labelStyle}>Notes</label>
                  <textarea style={{ ...inputStyle, resize: 'vertical', minHeight: 60 }} value={form.notes || ''} onChange={e => setForm({ ...form, notes: e.target.value })} placeholder="Any notes..." />
                </div>
              </>
            )}

            {modal === 'accommodation' && (
              <>
                <div style={fieldStyle}>
                  <label style={labelStyle}>Hotel name *</label>
                  <input style={inputStyle} value={form.name || ''} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="Hotel name" />
                </div>
                <div style={fieldStyle}>
                  <label style={labelStyle}>Address</label>
                  <input style={inputStyle} value={form.address || ''} onChange={e => setForm({ ...form, address: e.target.value })} placeholder="Street address" />
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 16 }}>
                  <div>
                    <label style={labelStyle}>Check in *</label>
                    <input style={inputStyle} type="date" value={form.check_in || ''} onChange={e => setForm({ ...form, check_in: e.target.value })} />
                  </div>
                  <div>
                    <label style={labelStyle}>Check out</label>
                    <input style={inputStyle} type="date" value={form.check_out || ''} onChange={e => setForm({ ...form, check_out: e.target.value })} />
                  </div>
                </div>
                <div style={fieldStyle}>
                  <label style={labelStyle}>Confirmation #</label>
                  <input style={inputStyle} value={form.confirmation || ''} onChange={e => setForm({ ...form, confirmation: e.target.value })} placeholder="e.g. BKG123456" />
                </div>
                <div style={fieldStyle}>
                  <label style={labelStyle}>Notes</label>
                  <textarea style={{ ...inputStyle, resize: 'vertical', minHeight: 60 }} value={form.notes || ''} onChange={e => setForm({ ...form, notes: e.target.value })} placeholder="Any notes..." />
                </div>
              </>
            )}

            {modal === 'contact' && (
              <>
                <div style={fieldStyle}>
                  <label style={labelStyle}>Name *</label>
                  <input style={inputStyle} value={form.name || ''} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="Full name" />
                </div>
                <div style={fieldStyle}>
                  <label style={labelStyle}>Role</label>
                  <input style={inputStyle} value={form.role || ''} onChange={e => setForm({ ...form, role: e.target.value })} placeholder="e.g. Venue Manager" />
                </div>
                <div style={fieldStyle}>
                  <label style={labelStyle}>Phone</label>
                  <input style={inputStyle} value={form.phone || ''} onChange={e => setForm({ ...form, phone: e.target.value })} placeholder="+61 4xx xxx xxx" />
                </div>
                <div style={fieldStyle}>
                  <label style={labelStyle}>Email</label>
                  <input style={inputStyle} value={form.email || ''} onChange={e => setForm({ ...form, email: e.target.value })} placeholder="email@venue.com" />
                </div>
              </>
            )}

            {modal === 'settlement' && (
              <>
                <div style={{ marginBottom: 8, fontSize: 13, color: muted, fontStyle: 'italic' }}>
                  {settlementShow?.venue} — {settlementShow?.date}
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 16 }}>
                  <div>
                    <label style={labelStyle}>Deal type</label>
                    <select style={inputStyle} value={form.deal_type || ''} onChange={e => setForm({ ...form, deal_type: e.target.value })}>
                      <option value="">Select...</option>
                      <option value="guarantee">Guarantee</option>
                      <option value="door">Door deal</option>
                      <option value="vs">Guarantee vs %</option>
                      <option value="flat">Flat fee</option>
                      <option value="profit_share">Profit share</option>
                    </select>
                  </div>
                  <div>
                    <label style={labelStyle}>Agreed amount</label>
                    <input style={inputStyle} type="number" value={form.agreed_amount || ''} onChange={e => setForm({ ...form, agreed_amount: e.target.value })} placeholder="0.00" />
                  </div>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 16 }}>
                  <div>
                    <label style={labelStyle}>Amount paid</label>
                    <input style={inputStyle} type="number" value={form.paid_amount || ''} onChange={e => setForm({ ...form, paid_amount: e.target.value })} placeholder="0.00" />
                  </div>
                  <div>
                    <label style={labelStyle}>Currency</label>
                    <input style={inputStyle} value={form.currency || 'AUD'} onChange={e => setForm({ ...form, currency: e.target.value })} placeholder="AUD" />
                  </div>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 16 }}>
                  <div>
                    <label style={labelStyle}>Status</label>
                    <select style={inputStyle} value={form.status || 'pending'} onChange={e => setForm({ ...form, status: e.target.value })}>
                      <option value="pending">Pending</option>
                      <option value="partial">Partial</option>
                      <option value="paid">Paid in full</option>
                      <option value="disputed">Disputed</option>
                    </select>
                  </div>
                  <div>
                    <label style={labelStyle}>Payment date</label>
                    <input style={inputStyle} type="date" value={form.payment_date || ''} onChange={e => setForm({ ...form, payment_date: e.target.value })} />
                  </div>
                </div>
                <div style={{ marginBottom: 16 }}>
                  <label style={labelStyle}>Notes / deductions</label>
                  <textarea style={{ ...inputStyle, resize: 'vertical', minHeight: 70 }} value={form.notes || ''} onChange={e => setForm({ ...form, notes: e.target.value })} placeholder="Production deductions, parking, hospitality buyout..." />
                </div>
              </>
            )}

            {modal === 'rider' && (
              <>
                <div style={{ marginBottom: 16 }}>
                  <label style={labelStyle}>Stage plot / tech notes</label>
                  <textarea style={{ ...inputStyle, resize: 'vertical', minHeight: 100 }} value={form.tech_notes || ''} onChange={e => setForm({ ...form, tech_notes: e.target.value })} placeholder="Stage dimensions, monitoring setup, backline requirements..." />
                </div>
                <div style={{ marginBottom: 16 }}>
                  <label style={labelStyle}>Hospitality rider</label>
                  <textarea style={{ ...inputStyle, resize: 'vertical', minHeight: 100 }} value={form.hospitality || ''} onChange={e => setForm({ ...form, hospitality: e.target.value })} placeholder="Catering, dressing room requirements, dietary needs..." />
                </div>
                <div style={{ marginBottom: 16 }}>
                  <label style={labelStyle}>Set length</label>
                  <input style={inputStyle} value={form.set_length || ''} onChange={e => setForm({ ...form, set_length: e.target.value })} placeholder="e.g. 45 minutes" />
                </div>
                <div style={{ marginBottom: 16 }}>
                  <label style={labelStyle}>Band size</label>
                  <input style={inputStyle} value={form.band_size || ''} onChange={e => setForm({ ...form, band_size: e.target.value })} placeholder="e.g. 5 piece" />
                </div>
                <div style={{ marginBottom: 16 }}>
                  <label style={labelStyle}>Input list / additional notes</label>
                  <textarea style={{ ...inputStyle, resize: 'vertical', minHeight: 80 }} value={form.input_list || ''} onChange={e => setForm({ ...form, input_list: e.target.value })} placeholder="Channel list, special requirements..." />
                </div>
              </>
            )}

            <button onClick={handleSave} disabled={saving}
              style={{ width: '100%', padding: '12px', background: accent, color: '#fff', border: 'none', borderRadius: 8, cursor: 'pointer', fontFamily: 'monospace', fontSize: 11, letterSpacing: 3, textTransform: 'uppercase' }}>
              {saving ? 'Saving...' : editingId ? 'Save Changes' : 'Save'}
            </button>
          </div>
        </div>
      )}

      {/* Delete confirm modal */}
      {confirmDelete && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}
          onClick={() => setConfirmDelete(null)}>
          <div style={{ background: card, borderRadius: 16, padding: 28, width: '100%', maxWidth: 360 }}
            onClick={e => e.stopPropagation()}>
            <div style={{ fontSize: 16, fontWeight: 600, marginBottom: 8 }}>Delete this item?</div>
            <div style={{ fontSize: 13, color: muted, marginBottom: 24 }}>{confirmDelete.label}</div>
            <div style={{ display: 'flex', gap: 10 }}>
              <button onClick={() => setConfirmDelete(null)}
                style={{ flex: 1, padding: '10px', background: 'transparent', color: muted, border: `1px solid ${border}`, borderRadius: 8, cursor: 'pointer', fontSize: 13 }}>
                Cancel
              </button>
              <button onClick={handleDelete} disabled={deleting}
                style={{ flex: 1, padding: '10px', background: '#C00', color: '#fff', border: 'none', borderRadius: 8, cursor: 'pointer', fontSize: 13 }}>
                {deleting ? 'Deleting...' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}

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
            {tours.map(tour => {
              const statusColor: Record<string, string> = { confirmed: '#2d7a4f', routing: '#B8860B', completed: '#8A8580' }
              const statusLabel: Record<string, string> = { confirmed: '✓', routing: '~', completed: '—' }
              return (
                <button key={tour.id} onClick={() => setSelectedTour(tour)}
                  style={{ padding: '8px 16px', borderRadius: 20, border: `1px solid ${border}`, background: selectedTour?.id === tour.id ? accent : card, color: selectedTour?.id === tour.id ? '#fff' : text, cursor: 'pointer', fontSize: 13, display: 'flex', alignItems: 'center', gap: 6 }}>
                  {tour.status && <span style={{ fontSize: 10, color: selectedTour?.id === tour.id ? 'rgba(255,255,255,0.8)' : statusColor[tour.status] || muted }}>{statusLabel[tour.status] || ''}</span>}
                  {tour.name}
                </button>
              )
            })}
          </div>
        )}

        {/* New tour button always visible */}
        <div style={{ marginBottom: tours.length > 0 ? 0 : 24 }}>
          <button onClick={() => openModal('tour')}
            style={{ padding: '6px 14px', background: 'transparent', color: muted, border: `1px solid ${border}`, borderRadius: 20, cursor: 'pointer', fontFamily: 'monospace', fontSize: 10, letterSpacing: 2 }}>
            + NEW TOUR
          </button>
        </div>

        {tours.length === 0 && (
          <div style={{ textAlign: 'center', padding: 60, color: muted }}>
            <div style={{ fontSize: 32, marginBottom: 12 }}>📄</div>
            <div>No tours yet — create one above or import a document.</div>
          </div>
        )}

        {selectedTour && (
          <>
            {/* Tour status badge */}
            {selectedTour?.status && (
              <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, marginBottom: 12 }}>
                {[
                  { val: 'routing', label: 'Routing', color: '#B8860B', bg: '#FFF8E6' },
                  { val: 'confirmed', label: 'Confirmed', color: '#2d7a4f', bg: '#F0FFF4' },
                  { val: 'completed', label: 'Completed', color: '#8A8580', bg: '#F5F0E8' },
                ].map(s => (
                  <button key={s.val} onClick={async () => {
                    await supabase.from('tours').update({ status: s.val }).eq('id', selectedTour.id)
                    setSelectedTour({ ...selectedTour, status: s.val })
                    const updated = tours.map((t: any) => t.id === selectedTour.id ? { ...t, status: s.val } : t)
                    setTours(updated)
                  }} style={{
                    padding: '4px 10px', borderRadius: 20, border: `1px solid ${selectedTour.status === s.val ? s.color : border}`,
                    background: selectedTour.status === s.val ? s.bg : 'transparent',
                    color: selectedTour.status === s.val ? s.color : muted,
                    cursor: 'pointer', fontFamily: 'monospace', fontSize: 9, letterSpacing: 1
                  }}>{s.label}</button>
                ))}
              </div>
            )}

            {/* Toolbar */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20, flexWrap: 'wrap', gap: 10 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                <button onClick={handleShare} disabled={sharing}
                  style={{ padding: '9px 16px', background: copied ? '#2d7a4f' : accent, color: '#fff', border: 'none', borderRadius: 8, cursor: 'pointer', fontFamily: 'monospace', fontSize: 10, letterSpacing: 2 }}>
                  {copied ? '✓ COPIED' : '🔗 SHARE'}
                </button>
                <button onClick={handleExportIcal}
                  style={{ padding: '9px 16px', background: 'transparent', color: muted, border: `1px solid ${border}`, borderRadius: 8, cursor: 'pointer', fontFamily: 'monospace', fontSize: 10, letterSpacing: 2, whiteSpace: 'nowrap' }}>
                  📅 ICAL
                </button>
                {copied && <span style={{ fontSize: 12, color: '#2d7a4f' }}>Link copied — send to band & crew</span>}
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                {/* Add buttons */}
                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                  {([['show', '+ Show'], ['travel', '+ Travel'], ['accommodation', '+ Hotel'], ['contact', '+ Contact']] as const).map(([type, label]) => (
                    <button key={type} onClick={() => openModal(type)}
                      style={{ padding: '7px 10px', background: 'transparent', color: muted, border: `1px solid ${border}`, borderRadius: 8, cursor: 'pointer', fontFamily: 'monospace', fontSize: 9, letterSpacing: 1, whiteSpace: 'nowrap' }}>
                      {label}
                    </button>
                  ))}
                  <button onClick={() => openModal('rider', rider || {})}
                    style={{ padding: '7px 10px', background: 'transparent', color: muted, border: `1px solid ${border}`, borderRadius: 8, cursor: 'pointer', fontFamily: 'monospace', fontSize: 9, letterSpacing: 1, whiteSpace: 'nowrap' }}>
                    {rider ? '✎ Rider' : '+ Rider'}
                  </button>
                </div>

                {/* View toggle */}
                <div style={{ display: 'flex', border: `1px solid ${border}`, borderRadius: 8, overflow: 'hidden' }}>
                  {([['list', '☰'], ['calendar', '▦'], ['notes', '💬']] as const).map(([v, icon]) => (
                    <button key={v} onClick={() => setView(v as any)}
                      style={{ padding: '8px 12px', background: view === v ? accent : 'transparent', color: view === v ? '#fff' : muted, border: 'none', cursor: 'pointer', fontFamily: 'monospace', fontSize: 10, letterSpacing: 1, position: 'relative' }}>
                      {icon}{v === 'notes' && notes.length > 0 && <span style={{ position: 'absolute', top: 4, right: 4, width: 6, height: 6, borderRadius: '50%', background: '#f59e0b' }} />}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Warnings */}
            {warnings.length > 0 && (
              <div style={{ background: darkMode ? '#2a1f00' : '#FFF8E6', border: `1px solid ${darkMode ? '#5a3a00' : '#F0C040'}`, borderRadius: 10, padding: '14px 18px', marginBottom: 20 }}>
                <div style={{ fontFamily: 'monospace', fontSize: 10, letterSpacing: 2, color: '#B8860B', marginBottom: 10 }}>⚠ LOGISTICS FLAGS — {warnings.length}</div>
                {warnings.map((w, i) => (
                  <div key={i} style={{ fontSize: 13, color: darkMode ? '#e8c840' : '#7a5800', marginBottom: i < warnings.length - 1 ? 6 : 0, display: 'flex', gap: 8 }}>
                    <span style={{ opacity: 0.5 }}>—</span>
                    <span>{w}</span>
                  </div>
                ))}
              </div>
            )}

            {/* LIST VIEW */}
            {view === 'list' && (
              <div style={{ display: 'grid', gap: 20 }}>
                {shows.length > 0 && (
                  <div style={{ background: card, borderRadius: 12, padding: 20, border: `1px solid ${border}` }}>
                    <div style={{ fontSize: 11, letterSpacing: '0.1em', color: muted, marginBottom: 16, textTransform: 'uppercase', fontFamily: 'monospace' }}>Shows — {shows.length}</div>
                    {shows.map((show, i) => (
                      <div key={i} style={{ padding: '12px 0', borderBottom: i < shows.length - 1 ? `1px solid ${border}` : 'none', display: 'flex', alignItems: 'flex-start', gap: 12 }}>
                        <div style={{ flex: 1 }}>
                          <div style={{ fontWeight: 600, marginBottom: 4 }}>{show.venue}</div>
                          <div style={{ fontSize: 13, color: muted }}>{show.date}{show.set_time ? ` · Stage ${formatTime(show.set_time)}` : ''}{show.stage ? ` · ${show.stage}` : ''}</div>
                          {show.city && <div style={{ fontSize: 13, color: muted }}>{show.city}{show.country ? `, ${show.country}` : ''}</div>}
                          {show.notes && <div style={{ fontSize: 12, color: muted, marginTop: 4, fontStyle: 'italic' }}>{show.notes}</div>}
                        </div>
                        <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
                          <button onClick={() => window.open(`/daysheet/${show.id}`, '_blank')}
                            style={{ background: 'none', border: `1px solid ${border}`, borderRadius: 6, color: muted, cursor: 'pointer', fontSize: 10, padding: '3px 8px', fontFamily: 'monospace', letterSpacing: 1 }}
                            title="Day Sheet">DAY SHEET</button>
                          {(() => {
                            const s = settlements.find(s => s.show_id === show.id)
                            const statusColor: Record<string,string> = { paid: '#2d7a4f', partial: '#B8860B', pending: muted, disputed: '#C00' }
                            return (
                              <button onClick={() => { setSettlementShow(show); openModal('settlement', s || {}) }}
                                style={{ background: s ? (s.status === 'paid' ? '#f0fff4' : s.status === 'disputed' ? '#fff0f0' : '#FFF8E6') : 'transparent', border: `1px solid ${s ? statusColor[s.status] || border : border}`, borderRadius: 6, color: s ? statusColor[s.status] || muted : muted, cursor: 'pointer', fontSize: 10, padding: '3px 8px', fontFamily: 'monospace', letterSpacing: 1 }}
                                title="Settlement">
                                {s ? `$${s.status}` : '$ settle'}
                              </button>
                            )
                          })()}
                          <button onClick={() => openModal('show', show)}
                            style={{ background: 'none', border: `1px solid ${border}`, borderRadius: 6, color: muted, cursor: 'pointer', fontSize: 11, padding: '3px 8px' }}
                            title="Edit">✎</button>
                          <button onClick={() => setConfirmDelete({ table: 'shows', id: show.id, label: `${show.venue} — ${show.date}` })}
                            style={{ background: '#fff0f0', border: '1px solid #ffcccc', borderRadius: 6, color: '#cc0000', cursor: 'pointer', fontSize: 12, padding: '3px 9px', fontWeight: 700 }}
                            title="Delete">✕</button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
                {travel.length > 0 && (
                  <div style={{ background: card, borderRadius: 12, padding: 20, border: `1px solid ${border}` }}>
                    <div style={{ fontSize: 11, letterSpacing: '0.1em', color: muted, marginBottom: 16, textTransform: 'uppercase', fontFamily: 'monospace' }}>Travel — {travel.length}</div>
                    {travel.map((t, i) => (
                      <div key={i} style={{ padding: '12px 0', borderBottom: i < travel.length - 1 ? `1px solid ${border}` : 'none', display: 'flex', alignItems: 'flex-start', gap: 12 }}>
                        <div style={{ flex: 1 }}>
                          <div style={{ fontWeight: 600, marginBottom: 4 }}>{t.from_location} → {t.to_location}</div>
                          <div style={{ fontSize: 13, color: muted }}>{t.travel_date}{t.carrier ? ` · ${t.carrier}` : ''}{t.reference ? ` ${t.reference}` : ''}</div>
                          {t.departure_time && <div style={{ fontSize: 13, color: muted }}>Departs {formatTime(t.departure_time)}{t.arrival_time ? ` · Arrives ${formatTime(t.arrival_time)}` : ''}</div>}
                          {t.notes && <div style={{ fontSize: 12, color: muted, marginTop: 4, fontStyle: 'italic' }}>{t.notes}</div>}
                        </div>
                        <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
                          <button onClick={() => openModal('travel', t)}
                            style={{ background: 'none', border: `1px solid ${border}`, borderRadius: 6, color: muted, cursor: 'pointer', fontSize: 11, padding: '3px 8px' }}
                            title="Edit">✎</button>
                          <button onClick={() => setConfirmDelete({ table: 'travel', id: t.id, label: `${t.from_location} → ${t.to_location} — ${t.travel_date}` })}
                            style={{ background: '#fff0f0', border: '1px solid #ffcccc', borderRadius: 6, color: '#cc0000', cursor: 'pointer', fontSize: 12, padding: '3px 9px', fontWeight: 700 }}
                            title="Delete">✕</button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
                {accommodation.length > 0 && (
                  <div style={{ background: card, borderRadius: 12, padding: 20, border: `1px solid ${border}` }}>
                    <div style={{ fontSize: 11, letterSpacing: '0.1em', color: muted, marginBottom: 16, textTransform: 'uppercase', fontFamily: 'monospace' }}>Hotels — {accommodation.length}</div>
                    {accommodation.map((a, i) => (
                      <div key={i} style={{ padding: '12px 0', borderBottom: i < accommodation.length - 1 ? `1px solid ${border}` : 'none', display: 'flex', alignItems: 'flex-start', gap: 12 }}>
                        <div style={{ flex: 1 }}>
                          <div style={{ fontWeight: 600, marginBottom: 4 }}>{a.name}</div>
                          {a.address && <div style={{ fontSize: 13, color: muted }}>{a.address}</div>}
                          <div style={{ fontSize: 13, color: muted }}>Check in: {a.check_in}{a.check_out ? ` · Check out: ${a.check_out}` : ''}</div>
                          {a.confirmation && <div style={{ fontSize: 13, color: muted }}>Ref: {a.confirmation}</div>}
                          {a.notes && <div style={{ fontSize: 12, color: muted, marginTop: 4, fontStyle: 'italic' }}>{a.notes}</div>}
                        </div>
                        <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
                          <button onClick={() => openModal('accommodation', a)}
                            style={{ background: 'none', border: `1px solid ${border}`, borderRadius: 6, color: muted, cursor: 'pointer', fontSize: 11, padding: '3px 8px' }}
                            title="Edit">✎</button>
                          <button onClick={() => setConfirmDelete({ table: 'accommodation', id: a.id, label: `${a.name} — ${a.check_in}` })}
                            style={{ background: '#fff0f0', border: '1px solid #ffcccc', borderRadius: 6, color: '#cc0000', cursor: 'pointer', fontSize: 12, padding: '3px 9px', fontWeight: 700 }}
                            title="Delete">✕</button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
                {contacts.length > 0 && (
                  <div style={{ background: card, borderRadius: 12, padding: 20, border: `1px solid ${border}` }}>
                    <div style={{ fontSize: 11, letterSpacing: '0.1em', color: muted, marginBottom: 16, textTransform: 'uppercase', fontFamily: 'monospace' }}>Contacts — {contacts.length}</div>
                    {contacts.map((c, i) => (
                      <div key={i} style={{ padding: '12px 0', borderBottom: i < contacts.length - 1 ? `1px solid ${border}` : 'none', display: 'flex', alignItems: 'flex-start', gap: 12 }}>
                        <div style={{ flex: 1 }}>
                          <div style={{ fontWeight: 600, marginBottom: 4 }}>{c.name}</div>
                          {c.role && <div style={{ fontSize: 13, color: muted }}>{c.role}</div>}
                          {c.phone && <div style={{ fontSize: 13, color: muted }}>📞 {c.phone}</div>}
                          {c.email && <div style={{ fontSize: 13, color: muted }}>✉️ {c.email}</div>}
                        </div>
                        <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
                          <button onClick={() => openModal('contact', c)}
                            style={{ background: 'none', border: `1px solid ${border}`, borderRadius: 6, color: muted, cursor: 'pointer', fontSize: 11, padding: '3px 8px' }}
                            title="Edit">✎</button>
                          <button onClick={() => setConfirmDelete({ table: 'contacts', id: c.id, label: `${c.name}${c.role ? ' — ' + c.role : ''}` })}
                            style={{ background: '#fff0f0', border: '1px solid #ffcccc', borderRadius: 6, color: '#cc0000', cursor: 'pointer', fontSize: 12, padding: '3px 9px', fontWeight: 700 }}
                            title="Delete">✕</button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
                {settlements.length > 0 && (
                  <div style={{ background: card, borderRadius: 12, padding: 20, border: `1px solid ${border}` }}>
                    <div style={{ fontSize: 11, letterSpacing: '0.1em', color: muted, marginBottom: 16, textTransform: 'uppercase', fontFamily: 'monospace' }}>Settlements — {settlements.length} show{settlements.length !== 1 ? 's' : ''}</div>
                    {(() => {
                      const total = settlements.reduce((sum, s) => sum + (parseFloat(s.paid_amount) || 0), 0)
                      const agreed = settlements.reduce((sum, s) => sum + (parseFloat(s.agreed_amount) || 0), 0)
                      const outstanding = agreed - total
                      const statusColor: Record<string,string> = { paid: '#2d7a4f', partial: '#B8860B', pending: muted, disputed: '#C00' }
                      return (
                        <>
                          <div style={{ display: 'flex', gap: 16, marginBottom: 16, flexWrap: 'wrap' }}>
                            <div style={{ background: '#F5F0E8', borderRadius: 8, padding: '10px 16px', textAlign: 'center' }}>
                              <div style={{ fontSize: 11, fontFamily: 'monospace', color: muted, letterSpacing: 1, marginBottom: 4 }}>AGREED</div>
                              <div style={{ fontSize: 18, fontWeight: 700 }}>${agreed.toLocaleString()}</div>
                            </div>
                            <div style={{ background: '#F5F0E8', borderRadius: 8, padding: '10px 16px', textAlign: 'center' }}>
                              <div style={{ fontSize: 11, fontFamily: 'monospace', color: muted, letterSpacing: 1, marginBottom: 4 }}>RECEIVED</div>
                              <div style={{ fontSize: 18, fontWeight: 700, color: '#2d7a4f' }}>${total.toLocaleString()}</div>
                            </div>
                            {outstanding > 0 && (
                              <div style={{ background: '#FFF8E6', borderRadius: 8, padding: '10px 16px', textAlign: 'center' }}>
                                <div style={{ fontSize: 11, fontFamily: 'monospace', color: '#B8860B', letterSpacing: 1, marginBottom: 4 }}>OUTSTANDING</div>
                                <div style={{ fontSize: 18, fontWeight: 700, color: '#B8860B' }}>${outstanding.toLocaleString()}</div>
                              </div>
                            )}
                          </div>
                          {settlements.map((s, i) => {
                            const show = shows.find(sh => sh.id === s.show_id)
                            return (
                              <div key={i} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 0', borderBottom: i < settlements.length - 1 ? `1px solid ${border}` : 'none', flexWrap: 'wrap', gap: 8 }}>
                                <div>
                                  <div style={{ fontSize: 13, fontWeight: 600 }}>{show?.venue || 'Unknown venue'}</div>
                                  <div style={{ fontSize: 11, color: muted }}>{show?.date} · {s.deal_type}</div>
                                </div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                                  <span style={{ fontSize: 13, fontWeight: 600 }}>${parseFloat(s.paid_amount || 0).toLocaleString()}</span>
                                  <span style={{ fontFamily: 'monospace', fontSize: 9, letterSpacing: 1, padding: '2px 8px', borderRadius: 10, background: s.status === 'paid' ? '#f0fff4' : s.status === 'disputed' ? '#fff0f0' : '#FFF8E6', color: statusColor[s.status] || muted }}>
                                    {s.status}
                                  </span>
                                </div>
                              </div>
                            )
                          })}
                        </>
                      )
                    })()}
                  </div>
                )}

                {rider && (rider.tech_notes || rider.hospitality || rider.set_length || rider.band_size || rider.input_list) && (
                  <div style={{ background: card, borderRadius: 12, padding: 20, border: `1px solid ${border}` }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
                      <div style={{ fontSize: 11, letterSpacing: '0.1em', color: muted, textTransform: 'uppercase', fontFamily: 'monospace' }}>Rider / Tech Spec</div>
                      <button onClick={() => openModal('rider', rider)}
                        style={{ background: 'none', border: `1px solid ${border}`, borderRadius: 6, color: muted, cursor: 'pointer', fontSize: 11, padding: '3px 8px' }}>✎</button>
                    </div>
                    {rider.band_size && <div style={{ marginBottom: 10 }}><span style={{ fontSize: 11, fontFamily: 'monospace', color: muted, letterSpacing: 1 }}>BAND — </span><span style={{ fontSize: 13 }}>{rider.band_size}</span></div>}
                    {rider.set_length && <div style={{ marginBottom: 10 }}><span style={{ fontSize: 11, fontFamily: 'monospace', color: muted, letterSpacing: 1 }}>SET — </span><span style={{ fontSize: 13 }}>{rider.set_length}</span></div>}
                    {rider.tech_notes && (
                      <div style={{ marginBottom: 12 }}>
                        <div style={{ fontSize: 11, fontFamily: 'monospace', color: muted, letterSpacing: 1, marginBottom: 6 }}>TECHNICAL</div>
                        <div style={{ fontSize: 13, lineHeight: 1.7, whiteSpace: 'pre-wrap', color: text }}>{rider.tech_notes}</div>
                      </div>
                    )}
                    {rider.hospitality && (
                      <div style={{ marginBottom: 12 }}>
                        <div style={{ fontSize: 11, fontFamily: 'monospace', color: muted, letterSpacing: 1, marginBottom: 6 }}>HOSPITALITY</div>
                        <div style={{ fontSize: 13, lineHeight: 1.7, whiteSpace: 'pre-wrap', color: text }}>{rider.hospitality}</div>
                      </div>
                    )}
                    {rider.input_list && (
                      <div>
                        <div style={{ fontSize: 11, fontFamily: 'monospace', color: muted, letterSpacing: 1, marginBottom: 6 }}>INPUT LIST</div>
                        <div style={{ fontSize: 13, lineHeight: 1.7, whiteSpace: 'pre-wrap', color: text }}>{rider.input_list}</div>
                      </div>
                    )}
                  </div>
                )}

                {shows.length === 0 && travel.length === 0 && accommodation.length === 0 && contacts.length === 0 && (
                  <div style={{ textAlign: 'center', padding: 60, color: muted }}>
                    <div style={{ fontSize: 32, marginBottom: 12 }}>📄</div>
                    <div style={{ marginBottom: 16 }}>No data yet.</div>
                    <div style={{ display: 'flex', gap: 8, justifyContent: 'center', flexWrap: 'wrap' }}>
                      {(['show', 'travel', 'accommodation', 'contact'] as const).map(type => (
                        <button key={type} onClick={() => openModal(type)}
                          style={{ padding: '8px 16px', background: accent, color: '#fff', border: 'none', borderRadius: 8, cursor: 'pointer', fontSize: 13 }}>
                          + Add {type === 'accommodation' ? 'hotel' : type}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* NOTES VIEW */}
            {view === 'notes' && (
              <div style={{ display: 'grid', gap: 0 }}>
                <div style={{ background: card, borderRadius: 12, border: `1px solid ${border}`, overflow: 'hidden' }}>
                  <div style={{ padding: '12px 20px', borderBottom: `1px solid ${border}`, fontFamily: 'monospace', fontSize: 10, letterSpacing: 2, color: muted }}>
                    TOUR NOTES — {selectedTour?.name}
                  </div>

                  {/* Notes list */}
                  <div style={{ padding: notes.length === 0 ? '40px 20px' : '8px 0', minHeight: 120 }}>
                    {notes.length === 0 && (
                      <div style={{ textAlign: 'center', color: muted, fontSize: 13 }}>No notes yet. Leave the first one below.</div>
                    )}
                    {notes.map((note, i) => (
                      <div key={note.id} style={{ padding: '14px 20px', borderBottom: i < notes.length - 1 ? `1px solid ${border}` : 'none', display: 'flex', gap: 12, alignItems: 'flex-start' }}>
                        <div style={{ width: 32, height: 32, borderRadius: '50%', background: accent, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: 12, fontWeight: 700 }}>
                          {note.author_name?.charAt(0) || '?'}
                        </div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginBottom: 4, flexWrap: 'wrap' }}>
                            <span style={{ fontSize: 13, fontWeight: 600 }}>{note.author_name}</span>
                            <span style={{ fontSize: 11, color: muted, fontFamily: 'monospace' }}>
                              {new Date(note.created_at).toLocaleDateString('en-AU', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                            </span>
                          </div>
                          <div style={{ fontSize: 14, lineHeight: 1.6, color: text }}>{note.content}</div>
                        </div>
                        <button onClick={() => deleteNote(note.id)}
                          style={{ background: 'none', border: 'none', color: muted, cursor: 'pointer', fontSize: 16, padding: '2px 4px', flexShrink: 0, opacity: 0.5 }}>×</button>
                      </div>
                    ))}
                  </div>

                  {/* New note input */}
                  <div style={{ padding: '16px 20px', borderTop: `1px solid ${border}`, display: 'flex', gap: 10, alignItems: 'flex-end' }}>
                    <textarea
                      value={newNote}
                      onChange={e => setNewNote(e.target.value)}
                      onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); postNote() } }}
                      placeholder="Add a note... (Enter to post, Shift+Enter for new line)"
                      style={{ flex: 1, padding: '10px 12px', border: `1px solid ${border}`, borderRadius: 8, background: bg, color: text, fontSize: 14, fontFamily: 'Georgia, serif', resize: 'none', minHeight: 44, outline: 'none', lineHeight: 1.5 }}
                      rows={2}
                    />
                    <button onClick={postNote} disabled={postingNote || !newNote.trim()}
                      style={{ padding: '10px 16px', background: newNote.trim() ? accent : border, color: '#fff', border: 'none', borderRadius: 8, cursor: newNote.trim() ? 'pointer' : 'default', fontFamily: 'monospace', fontSize: 10, letterSpacing: 1, flexShrink: 0, height: 44 }}>
                      {postingNote ? '...' : 'POST'}
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* CALENDAR VIEW */}
            {view === 'calendar' && (
              <div style={{ background: card, borderRadius: 12, border: `1px solid ${border}`, overflow: 'hidden' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 20px', borderBottom: `1px solid ${border}` }}>
                  <button onClick={() => setCalMonth(new Date(year, month - 1, 1))}
                    style={{ background: 'none', border: `1px solid ${border}`, borderRadius: 6, padding: '6px 12px', cursor: 'pointer', color: text, fontSize: 14 }}>←</button>
                  <div style={{ fontFamily: 'monospace', fontSize: 11, letterSpacing: 3, textTransform: 'uppercase', color: muted }}>{monthName}</div>
                  <button onClick={() => setCalMonth(new Date(year, month + 1, 1))}
                    style={{ background: 'none', border: `1px solid ${border}`, borderRadius: 6, padding: '6px 12px', cursor: 'pointer', color: text, fontSize: 14 }}>→</button>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', borderBottom: `1px solid ${border}` }}>
                  {dayNames.map(d => (
                    <div key={d} style={{ padding: '8px 4px', textAlign: 'center', fontFamily: 'monospace', fontSize: 9, letterSpacing: 2, color: muted, textTransform: 'uppercase' }}>{d}</div>
                  ))}
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)' }}>
                  {Array.from({ length: firstDay }).map((_, i) => (
                    <div key={`e${i}`} style={{ minHeight: 80, borderRight: `1px solid ${border}`, borderBottom: `1px solid ${border}`, background: calBg }} />
                  ))}
                  {Array.from({ length: daysInMonth }).map((_, i) => {
                    const day = i + 1
                    const dateStr = toDateStr(year, month, day)
                    const dayShows = showsOnDate(dateStr)
                    const dayTravel = travelOnDate(dateStr)
                    const dayAccom = accomOnDate(dateStr)
                    const hasAnything = dayShows.length > 0 || dayTravel.length > 0 || dayAccom.length > 0
                    const col = (firstDay + i) % 7
                    const today = new Date()
                    const isToday = today.getFullYear() === year && today.getMonth() === month && today.getDate() === day
                    return (
                      <div key={day} style={{ minHeight: 80, padding: '6px 8px', borderRight: col < 6 ? `1px solid ${border}` : 'none', borderBottom: `1px solid ${border}`, background: hasAnything ? (darkMode ? '#2a2218' : '#fffaf4') : 'transparent' }}>
                        <div style={{ fontSize: 12, marginBottom: 4, width: 22, height: 22, display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: '50%', background: isToday ? accent : 'transparent', color: isToday ? '#fff' : hasAnything ? text : muted, fontWeight: isToday ? 700 : 400 }}>{day}</div>
                        {dayShows.map((show, si) => (
                          <div key={si} style={{ fontSize: 10, background: accent, color: '#fff', borderRadius: 3, padding: '2px 5px', marginBottom: 2, lineHeight: 1.3, overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis' }}>
                            🎵 {show.set_time ? formatTime(show.set_time) : show.venue}
                          </div>
                        ))}
                        {dayTravel.map((t, ti) => (
                          <div key={ti} style={{ fontSize: 10, background: darkMode ? '#2a3a4a' : '#e8f0f8', color: darkMode ? '#8ab4d4' : '#2a5a8a', borderRadius: 3, padding: '2px 5px', marginBottom: 2, lineHeight: 1.3, overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis' }}>
                            ✈️ {t.from_location}
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
                <div style={{ padding: '12px 20px', borderTop: `1px solid ${border}`, display: 'flex', gap: 16, flexWrap: 'wrap' }}>
                  {[['Show', accent], ['Travel', '#e8f0f8'], ['Hotel check-in', '#e8f4e8']].map(([label, color]) => (
                    <div key={label} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, color: muted }}>
                      <div style={{ width: 10, height: 10, borderRadius: 2, background: color }} /> {label}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}
