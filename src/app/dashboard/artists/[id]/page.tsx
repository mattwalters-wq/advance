'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'

const supabase = createClient()

type ModalType = 'show' | 'travel' | 'accommodation' | 'contact' | 'tour' | 'rider' | 'settlement' | 'press' | 'setlist' | 'document' | 'person' | 'guest' | null

export default function ArtistPage() {
  const params = useParams()
  const router = useRouter()
  const [artist, setArtist] = useState<any>(null)
  const [tours, setTours] = useState<any[]>([])
  const [selectedTour, setSelectedTour] = useState<any>(null)
  const [showArchive, setShowArchive] = useState(false)
  const [allTourShows, setAllTourShows] = useState<any[]>([])
  const [shows, setShows] = useState<any[]>([])
  const [travel, setTravel] = useState<any[]>([])
  const [accommodation, setAccommodation] = useState<any[]>([])
  const [contacts, setContacts] = useState<any[]>([])
  const [press, setPress] = useState<any[]>([])
  const [setlists, setSetlists] = useState<any[]>([])
  const [documents, setDocuments] = useState<any[]>([])
  const [showPeople, setShowPeople] = useState<any[]>([])
  const [guestList, setGuestList] = useState<any[]>([])
  const [darkMode, setDarkMode] = useState(false)
  const [loading, setLoading] = useState(true)
  const [copied, setCopied] = useState(false)
  const [sharing, setSharing] = useState(false)
  const [view, setView] = useState<'list' | 'calendar' | 'notes' | 'import' | 'ai'>('list')
  const [calMonth, setCalMonth] = useState(new Date())
  const [modal, setModal] = useState<ModalType>(null)
  const [saving, setSaving] = useState(false)

  // Form state
  const [form, setForm] = useState<any>({})
  const [confirmDelete, setConfirmDelete] = useState<{ table: string, id: string, label: string } | null>(null)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [deleting, setDeleting] = useState(false)
  const [warnings, setWarnings] = useState<string[]>([])
  const [dismissedWarnings, setDismissedWarnings] = useState<Set<string>>(new Set())
  const [showWarnings, setShowWarnings] = useState(false)
  const [calPopover, setCalPopover] = useState<{ date: string, shows: any[], travel: any[], accom: any[] } | null>(null)
  const [notes, setNotes] = useState<any[]>([])
  const [rider, setRider] = useState<any>(null)
  const [settlements, setSettlements] = useState<any[]>([])
  const [settlementShow, setSettlementShow] = useState<any>(null)
  const [setlistShow, setSetlistShow] = useState<any>(null)
  const [personShow, setPersonShow] = useState<any>(null)
  const [guestShow, setGuestShow] = useState<any>(null)
  const [expandedShowId, setExpandedShowId] = useState<string | null>(null)
  const [collapsedSections, setCollapsedSections] = useState<Set<string>>(new Set(['travel', 'accommodation', 'contacts', 'press', 'documents']))
  const [importJobs, setImportJobs] = useState<any[]>([])
  const [importDragging, setImportDragging] = useState(false)
  const [importTab, setImportTab] = useState<'drop' | 'paste'>('drop')
  const [pasteText, setPasteText] = useState('')
  const [pasteLabel, setPasteLabel] = useState('')
  const [aiMessages, setAiMessages] = useState<any[]>([])
  const [travelScanMode, setTravelScanMode] = useState<'scan' | 'manual'>('scan')
  const [travelScanning, setTravelScanning] = useState(false)
  const [travelScanResult, setTravelScanResult] = useState<any>(null)
  const [aiInput, setAiInput] = useState('')
  const [aiLoading, setAiLoading] = useState(false)
  const [aiAttachments, setAiAttachments] = useState<any[]>([])
  const [newNote, setNewNote] = useState('')
  const [postingNote, setPostingNote] = useState(false)
  const [userName, setUserName] = useState('Manager')

  useEffect(() => { loadArtist() }, [params.id])
  useEffect(() => {
    if (selectedTour) {
      loadTourData(selectedTour.id)
      // Broadcast to FloatingAssistant so it uses the same tour
      try {
        sessionStorage.setItem('advance_active_tour_id', selectedTour.id)
        window.dispatchEvent(new CustomEvent('advance:tour-change', { detail: { tourId: selectedTour.id } }))
      } catch {}
    }
  }, [selectedTour])

  async function loadArtist() {
    // Parallelise all initial queries
    const [artistRes, toursRes, authRes] = await Promise.all([
      supabase.from('artists').select('*').eq('id', params.id).single(),
      supabase.from('tours').select('*').eq('artist_id', params.id).order('start_date', { ascending: true }),
      supabase.auth.getUser(),
    ])
    if (!artistRes.data) { router.push('/dashboard'); return }
    setArtist(artistRes.data)
    const toursData = toursRes.data || []
    const tourIds = toursData.map((t: any) => t.id)
    // Fetch all shows across all tours for archive detection
    const allShowsRes = tourIds.length > 0
      ? await supabase.from('shows').select('id, tour_id, date').in('tour_id', tourIds).is('deleted_at', null)
      : { data: [] }
    const allShows = allShowsRes.data || []
    setTours(toursData)
    setAllTourShows(allShows)
    if (toursData.length > 0) {
      const today = new Date().toISOString().split('T')[0]
      function isArchivedCheck(t: any) {
        if (t.end_date) return t.end_date < today
        const latestShow = allShows.filter((s: any) => s.tour_id === t.id).map((s: any) => s.date).filter(Boolean).sort().reverse()[0]
        return latestShow ? latestShow < today : false
      }
      const active = toursData.filter((t: any) => !isArchivedCheck(t))
      const future = active.filter((t: any) => !t.start_date || t.start_date >= today)
      const past = active.filter((t: any) => t.start_date && t.start_date < today)
      let picked
      if (future.length > 0) {
        picked = future.sort((a: any, b: any) => (a.start_date || '').localeCompare(b.start_date || ''))[0]
      } else if (past.length > 0) {
        picked = past.sort((a: any, b: any) => (b.start_date || '').localeCompare(a.start_date || ''))[0]
      } else {
        picked = toursData[toursData.length - 1]
      }
      setSelectedTour(picked)
    }
    // Get user name (non-blocking)
    const user = authRes.data?.user
    if (user) {
      supabase.from('profiles').select('full_name').eq('id', user.id).single()
        .then(({ data }) => { if (data?.full_name) setUserName(data.full_name) })
    }
    setLoading(false)
  }

  async function loadTourData(tourId: string) {
    const [s, t, a, c, p, sl, d, sp, gl] = await Promise.all([
      supabase.from('shows').select('*').eq('tour_id', tourId).is('deleted_at', null).order('date'),
      supabase.from('travel').select('*').eq('tour_id', tourId).is('deleted_at', null).order('travel_date'),
      supabase.from('accommodation').select('*').eq('tour_id', tourId).is('deleted_at', null).order('check_in'),
      supabase.from('contacts').select('*').eq('tour_id', tourId).is('deleted_at', null),
      supabase.from('press').select('*').eq('tour_id', tourId).is('deleted_at', null).order('date'),
      supabase.from('setlists').select('*').eq('tour_id', tourId).is('deleted_at', null),
      supabase.from('tour_documents').select('*').eq('tour_id', tourId).is('deleted_at', null).order('category'),
      supabase.from('show_people').select('*').eq('tour_id', tourId).is('deleted_at', null),
      supabase.from('guest_list').select('*').eq('tour_id', tourId).is('deleted_at', null).order('name'),
    ])
    const showsData = s.data || []
    const travelData = t.data || []
    const accomData = a.data || []
    setShows(showsData)
    setTravel(travelData)
    setAccommodation(accomData)
    setContacts(c.data || [])
    setPress(p.data || [])
    setSetlists(sl.data || [])
    setDocuments(d.data || [])
    setShowPeople(sp.data || [])
    setGuestList(gl.data || [])
    setWarnings(computeWarnings(showsData, travelData, accomData))
    // Auto-switch to import tab if tour is empty
    if (showsData.length === 0 && travelData.length === 0 && accomData.length === 0) {
      setView('import')
    }
    // Parallelise secondary queries
    const [notesRes, riderRes, settlementsRes] = await Promise.all([
      supabase.from('tour_notes').select('*').eq('tour_id', tourId).order('created_at', { ascending: true }),
      supabase.from('riders').select('*').eq('tour_id', tourId).single(),
      supabase.from('settlements').select('*').eq('tour_id', tourId),
    ])
    setNotes(notesRes.data || [])
    setRider(riderRes.data || null)
    setSettlements(settlementsRes.data || [])
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

  const [undoItem, setUndoItem] = useState<{ table: string, id: string, label: string } | null>(null)
  const [undoTimer, setUndoTimer] = useState<ReturnType<typeof setTimeout> | null>(null)

  async function handleDelete() {
    if (!confirmDelete) return
    setDeleting(true)
    // Soft delete - set deleted_at instead of hard delete
    await supabase.from(confirmDelete.table).update({ deleted_at: new Date().toISOString() }).eq('id', confirmDelete.id)
    const deleted = { ...confirmDelete }
    setConfirmDelete(null)
    setDeleting(false)
    if (selectedTour) await loadTourData(selectedTour.id)
    // Show undo toast for 8 seconds
    if (undoTimer) clearTimeout(undoTimer)
    setUndoItem(deleted)
    const timer = setTimeout(() => setUndoItem(null), 8000)
    setUndoTimer(timer)
  }

  async function handleUndo() {
    if (!undoItem) return
    await supabase.from(undoItem.table).update({ deleted_at: null }).eq('id', undoItem.id)
    if (undoTimer) clearTimeout(undoTimer)
    setUndoItem(null)
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

  async function processImportFile(file: File) {
    if (!selectedTour) return
    // Find the queued job for this file or create one
    let jobId: string
    setImportJobs(prev => {
      const existing = prev.find(j => j.name === file.name && j.status === 'queued')
      if (existing) { jobId = existing.id; return prev.map(j => j.id === existing.id ? { ...j, status: 'parsing' } : j) }
      jobId = Math.random().toString(36).slice(2)
      return [...prev, { id: jobId, name: file.name, file, status: 'parsing', result: null, error: null }]
    })

    const update = (updates: any) => setImportJobs(prev => prev.map(j => j.id === jobId ? { ...j, ...updates } : j))

    try {
      const ext = file.name.split('.').pop()?.toLowerCase()
      let body: any = { tourId: selectedTour.id, filename: file.name }

      if (ext === 'pdf') {
        const base64 = await new Promise<string>((res, rej) => {
          const reader = new FileReader()
          reader.onload = () => res((reader.result as string).split(',')[1])
          reader.onerror = rej
          reader.readAsDataURL(file)
        })
        body.pdf_base64 = base64
      } else if (ext === 'xlsx' || ext === 'xls') {
        const XLSX = await import('xlsx')
        const ab = await file.arrayBuffer()
        const wb = XLSX.read(ab, { type: 'array' })
        const lines: string[] = []
        for (const sn of wb.SheetNames) {
          lines.push('Sheet: ' + sn)
          lines.push(XLSX.utils.sheet_to_csv(wb.Sheets[sn]))
        }
        body.text = lines.join('\n\n')
      } else if (ext === 'docx' || ext === 'doc') {
        const mammoth = await import('mammoth')
        const ab = await file.arrayBuffer()
        const r = await mammoth.extractRawText({ arrayBuffer: ab })
        body.text = r.value
      } else {
        body.text = await file.text()
      }

      const res = await fetch('/api/merge-tour', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      let data: any
      try {
        data = await res.json()
      } catch {
        throw new Error('Server error — try again or paste the text instead')
      }
      if (!data.success) throw new Error(data.error || 'Could not process this document')

      update({ status: 'done', result: data.result })
      // Reload tour data to reflect merged changes
      await loadTourData(selectedTour.id)
    } catch (err: any) {
      update({ status: 'error', error: err.message })
    }
  }

  async function scanTravelDoc(file: File) {
    setTravelScanning(true)
    setTravelScanResult(null)
    try {
      const ext = file.name.split('.').pop()?.toLowerCase()
      let body: any = { filename: file.name }

      if (['jpg','jpeg','png','gif','webp','heic'].includes(ext || '') || file.type.startsWith('image/')) {
        const base64 = await new Promise<string>((res, rej) => {
          const reader = new FileReader()
          reader.onload = () => res((reader.result as string).split(',')[1])
          reader.onerror = rej
          reader.readAsDataURL(file)
        })
        body.image_base64 = base64
        body.image_type = file.type || 'image/jpeg'
      } else if (ext === 'pdf') {
        const base64 = await new Promise<string>((res, rej) => {
          const reader = new FileReader()
          reader.onload = () => res((reader.result as string).split(',')[1])
          reader.onerror = rej
          reader.readAsDataURL(file)
        })
        body.pdf_base64 = base64
      } else {
        body.text = await file.text()
      }

      const res = await fetch('/api/scan-travel', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      const data = await res.json()
      if (data.success && data.travel?.length > 0) {
        // Pre-fill form with first result, store rest
        setTravelScanResult(data.travel)
        setForm({ ...data.travel[0] })
        setTravelScanMode('manual')
      } else {
        setTravelScanResult([])
      }
    } catch (err: any) {
      setTravelScanResult([])
    }
    setTravelScanning(false)
  }

  async function sendAiMessage(text?: string) {
    const msg = text || aiInput.trim()
    if ((!msg && aiAttachments.length === 0) || aiLoading || !selectedTour) return
    const displayMsg = msg + (aiAttachments.length > 0 ? `\n📎 ${aiAttachments.map((a: any) => a.name).join(', ')}` : '')
    const userMsg = { role: 'user', content: displayMsg }
    const newMessages = [...aiMessages, userMsg]
    setAiMessages(newMessages)
    setAiInput('')
    const currentAttachments = [...aiAttachments]
    setAiAttachments([])
    setAiLoading(true)
    try {
      const res = await fetch('/api/tour-ai', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tourId: selectedTour.id,
          messages: newMessages.map((m: any) => ({ role: m.role, content: m.content })),
          attachments: currentAttachments,
          extractIfPossible: currentAttachments.length > 0,
        }),
      })
      const data = await res.json()
      if (data.success) {
        setAiMessages(prev => [...prev, {
          role: 'assistant',
          content: data.message,
          extracted: data.extracted || null,
          actionsPerformed: data.actionsPerformed || [],
        }])
        // Reload tour data if AI made changes
        if (data.tourUpdated && selectedTour) {
          await loadTourData(selectedTour.id)
        }
      }
    } catch (err: any) {
      setAiMessages(prev => [...prev, { role: 'assistant', content: 'Sorry, something went wrong.' }])
    }
    setAiLoading(false)
  }

  async function saveAiExtracted(extracted: any) {
    if (!selectedTour) return
    const org_id = selectedTour.org_id
    const tourId = selectedTour.id
    if (extracted.shows?.length) await supabase.from('shows').insert(extracted.shows.map((s: any) => ({ ...s, tour_id: tourId, org_id })))
    if (extracted.travel?.length) await supabase.from('travel').insert(extracted.travel.map((t: any) => ({ ...t, tour_id: tourId, org_id })))
    if (extracted.accommodation?.length) await supabase.from('accommodation').insert(extracted.accommodation.map((a: any) => ({ ...a, tour_id: tourId, org_id })))
    if (extracted.contacts?.length) await supabase.from('contacts').insert(extracted.contacts.map((c: any) => ({ ...c, tour_id: tourId, org_id })))
    await loadTourData(tourId)
    setAiMessages(prev => [...prev, { role: 'assistant', content: '✓ Added to tour. Switch to the Tour tab to see it.' }])
  }

  function openModal(type: ModalType, existingItem?: any) {
    setForm(existingItem ? { ...existingItem } : {})
    setEditingId(existingItem?.id || null)
    setModal(type)
    // Travel modal defaults to scan if adding new, manual if editing
    if (type === 'travel') {
      setTravelScanMode(existingItem ? 'manual' : 'scan')
      setTravelScanResult(null)
    }
  }

  function closeModal() {
    setModal(null)
    setForm({})
    setEditingId(null)
    setTravelScanMode('scan')
    setTravelScanResult(null)
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

    if (modal === 'setlist') {
      const { songs, notes } = form
      const base = { tour_id: selectedTour.id, org_id: selectedTour.org_id, show_id: setlistShow?.id }
      const existing = setlists.find(s => s.show_id === setlistShow?.id)
      if (existing) {
        await supabase.from('setlists').update({ songs, notes: notes || null, updated_at: new Date().toISOString() }).eq('id', existing.id)
      } else {
        await supabase.from('setlists').insert({ ...base, songs, notes: notes || null })
      }
      await loadTourData(selectedTour.id)
      setSaving(false)
      closeModal()
      return
    }

    if (modal === 'person') {
      const base = { tour_id: selectedTour.id, org_id: selectedTour.org_id, show_id: personShow?.id || form.show_id }
      if (editingId) {
        const { id, tour_id, org_id, created_at, show_id, ...updates } = form
        await supabase.from('show_people').update(updates).eq('id', editingId)
      } else {
        await supabase.from('show_people').insert({ ...base, ...form })
      }
      await loadTourData(selectedTour.id)
      setSaving(false)
      closeModal()
      return
    }

    if (modal === 'guest') {
      const base = { tour_id: selectedTour.id, org_id: selectedTour.org_id, show_id: guestShow?.id || form.show_id }
      if (editingId) {
        const { id, tour_id, org_id, created_at, show_id, ...updates } = form
        await supabase.from('guest_list').update(updates).eq('id', editingId)
      } else {
        await supabase.from('guest_list').insert({ ...base, ...form })
      }
      await loadTourData(selectedTour.id)
      setSaving(false)
      closeModal()
      return
    }

    const tableMap: Record<string, string> = {
      show: 'shows', travel: 'travel', accommodation: 'accommodation', contact: 'contacts', press: 'press', document: 'tour_documents'
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
    function toIcalDateTimeWithTZ(dateStr: string, timeStr: string) {
      if (!timeStr) return `VALUE=DATE:${toIcalDate(dateStr)}`
      return `TZID=Australia/Melbourne:${toIcalDateTime(dateStr, timeStr)}`
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
      'BEGIN:VTIMEZONE',
      'TZID:Australia/Melbourne',
      'BEGIN:STANDARD',
      'DTSTART:19710101T020000',
      'TZOFFSETFROM:+1100',
      'TZOFFSETTO:+1000',
      'TZNAME:AEST',
      'RRULE:FREQ=YEARLY;BYDAY=1SU;BYMONTH=4',
      'END:STANDARD',
      'BEGIN:DAYLIGHT',
      'DTSTART:19711001T020000',
      'TZOFFSETFROM:+1000',
      'TZOFFSETTO:+1100',
      'TZNAME:AEDT',
      'RRULE:FREQ=YEARLY;BYDAY=1SU;BYMONTH=10',
      'END:DAYLIGHT',
      'END:VTIMEZONE',
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
  function formatDate(dateStr: string) {
    if (!dateStr) return ''
    const d = new Date(dateStr + 'T00:00:00')
    return d.toLocaleDateString('en-AU', { weekday: 'short', day: 'numeric', month: 'short' })
  }

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

  if (loading) return (
    <div style={{ background: '#F4EFE6', minHeight: '100vh' }}>
      <style>{`@keyframes shimmer{0%{background-position:-200% 0}100%{background-position:200% 0}}.sk{background:linear-gradient(90deg,#E8E0D4 25%,#F0E8DC 50%,#E8E0D4 75%);background-size:200% 100%;animation:shimmer 1.4s infinite;border-radius:6px;}`}</style>
      <div style={{ background: '#0F0E0C', height: 56, display: 'flex', alignItems: 'center', padding: '0 24px', gap: 20 }}>
        <div className="sk" style={{ width: 60, height: 12, background: '#2A2520' }} />
        <div style={{ width: 1, height: 20, background: '#2A2520' }} />
        <div className="sk" style={{ width: 32, height: 32, borderRadius: 8, background: '#2A2520' }} />
        <div className="sk" style={{ width: 120, height: 16, background: '#2A2520' }} />
      </div>
      <div style={{ maxWidth: 900, margin: '0 auto', padding: '16px 12px', position: 'relative' as const }}>
        <div style={{ display: 'flex', gap: 8, marginBottom: 24 }}>
          {[1,2,3].map(i => <div key={i} className="sk" style={{ width: 100, height: 36, borderRadius: 20 }} />)}
        </div>
        <div style={{ display: 'flex', gap: 10, marginBottom: 20 }}>
          {[1,2,3,4,5].map(i => <div key={i} className="sk" style={{ width: 80, height: 36, borderRadius: 8 }} />)}
        </div>
        <div style={{ background: '#fff', borderRadius: 12, padding: 20, border: '1px solid #E8E0D4' }}>
          {[1,2,3].map(i => (
            <div key={i} style={{ padding: '12px 0', borderBottom: i < 3 ? '1px solid #E8E0D4' : 'none' }}>
              <div className="sk" style={{ width: '40%', height: 16, marginBottom: 8 }} />
              <div className="sk" style={{ width: '25%', height: 12 }} />
            </div>
          ))}
        </div>
      </div>
    </div>
  )

  return (
    <div style={{ background: bg, minHeight: '100vh', fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Helvetica, Arial, sans-serif', color: text }}>

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
                <div style={{ display: 'grid', gridTemplateColumns: '150px 1fr', gap: 12, marginBottom: 16 }}>
                  <div>
                    <label style={labelStyle}>Type</label>
                    <select style={inputStyle} value={form.type || 'show'} onChange={e => setForm({ ...form, type: e.target.value })}>
                      <option value="show">Show</option>
                      <option value="rehearsal">Rehearsal</option>
                      <option value="recording">Recording</option>
                      <option value="press">Press day</option>
                      <option value="travel_day">Travel day</option>
                      <option value="day_off">Day off</option>
                    </select>
                  </div>
                  <div>
                    <label style={labelStyle}>{form.type === 'rehearsal' ? 'Studio / Venue *' : form.type === 'recording' ? 'Studio *' : form.type === 'press' ? 'Location *' : form.type === 'travel_day' ? 'Leg description *' : form.type === 'day_off' ? 'Location *' : 'Venue *'}</label>
                    <input style={inputStyle} value={form.venue || ''} onChange={e => setForm({ ...form, venue: e.target.value })} placeholder={form.type === 'rehearsal' ? 'Bakehouse Studios' : form.type === 'recording' ? 'Studios 301' : form.type === 'press' ? 'Sydney' : form.type === 'day_off' ? 'Tokyo' : 'Venue name'} />
                  </div>
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
                {(() => {
                  const isNonShow = ['rehearsal', 'recording', 'press'].includes(form.type || '')
                  return (
                    <>
                      <div style={{ display: 'grid', gridTemplateColumns: isNonShow ? '1fr 1fr' : '1fr 1fr 1fr 1fr', gap: 12, marginBottom: 16 }}>
                        {isNonShow ? (
                          <>
                            <div>
                              <label style={labelStyle}>Start</label>
                              <input style={inputStyle} type="time" value={form.soundcheck_time || ''} onChange={e => setForm({ ...form, soundcheck_time: e.target.value })} />
                            </div>
                            <div>
                              <label style={labelStyle}>Finish</label>
                              <input style={inputStyle} type="time" value={form.set_time || ''} onChange={e => setForm({ ...form, set_time: e.target.value })} />
                            </div>
                          </>
                        ) : (
                          <>
                            <div>
                              <label style={labelStyle}>Artist arrival</label>
                              <input style={inputStyle} type="time" value={form.arrival_time || ''} onChange={e => setForm({ ...form, arrival_time: e.target.value })} />
                            </div>
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
                          </>
                        )}
                      </div>
                      {!isNonShow && (
                        <div style={fieldStyle}>
                          <label style={labelStyle}>Stage name</label>
                          <input style={inputStyle} value={form.stage || ''} onChange={e => setForm({ ...form, stage: e.target.value })} placeholder="e.g. Main Stage" />
                        </div>
                      )}
                    </>
                  )
                })()}
                <div style={fieldStyle}>
                  <label style={labelStyle}>Notes</label>
                  <textarea style={{ ...inputStyle, resize: 'vertical', minHeight: 70 }} value={form.notes || ''} onChange={e => setForm({ ...form, notes: e.target.value })} placeholder="Any notes..." />
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 16 }}>
                  <div>
                    <label style={labelStyle}>Catering / dinner</label>
                    <input style={inputStyle} value={form.catering || ''} onChange={e => setForm({ ...form, catering: e.target.value })} placeholder="e.g. Dinner provided 6pm" />
                  </div>
                  <div>
                    <label style={labelStyle}>Backline</label>
                    <input style={inputStyle} value={form.backline || ''} onChange={e => setForm({ ...form, backline: e.target.value })} placeholder="e.g. Drum kit provided" />
                  </div>
                </div>
              </>
            )}

            {modal === 'travel' && (
              <>
                {/* Tab toggle */}
                <div style={{ display: 'flex', gap: 0, border: `1px solid ${border}`, borderRadius: 8, overflow: 'hidden', marginBottom: 20 }}>
                  {([['scan', '📷 Scan / Drop'] , ['manual', '✎ Manual']] as const).map(([m, label]) => (
                    <button key={m} onClick={() => { setTravelScanMode(m); if (m === 'scan') { setForm({}); setTravelScanResult(null) } }}
                      style={{ flex: 1, padding: '9px', background: travelScanMode === m ? accent : 'transparent', color: travelScanMode === m ? '#fff' : muted, border: 'none', cursor: 'pointer', fontFamily: 'monospace', fontSize: 9, letterSpacing: 2 }}>
                      {label}
                    </button>
                  ))}
                </div>

                {/* SCAN MODE */}
                {travelScanMode === 'scan' && (
                  <div
                    onDrop={e => { e.preventDefault(); const f = e.dataTransfer.files[0]; if (f) scanTravelDoc(f) }}
                    onDragOver={e => e.preventDefault()}
                    onClick={() => { const i = document.createElement('input'); i.type='file'; i.accept='image/*,.pdf,.csv,.xlsx,.txt'; i.onchange=(e:any)=>{ if(e.target.files?.[0]) scanTravelDoc(e.target.files[0]) }; i.click() }}
                    style={{ border: `2px dashed ${border}`, borderRadius: 12, padding: '36px 20px', textAlign: 'center', cursor: 'pointer', background: bg, marginBottom: 4 }}>
                    {travelScanning ? (
                      <>
                        <div style={{ fontSize: 24, marginBottom: 10 }}>✦</div>
                        <div style={{ fontSize: 14, color: text, marginBottom: 4 }}>Reading travel details...</div>
                        <div style={{ fontSize: 12, color: muted }}>Reading flight info...</div>
                      </>
                    ) : travelScanResult !== null && travelScanResult.length === 0 ? (
                      <>
                        <div style={{ fontSize: 24, marginBottom: 10 }}>?</div>
                        <div style={{ fontSize: 14, color: text, marginBottom: 4 }}>Couldn't find travel details</div>
                        <div style={{ fontSize: 12, color: muted }}>Try a different file or switch to Manual</div>
                      </>
                    ) : (
                      <>
                        <div style={{ fontSize: 28, marginBottom: 10 }}>📷</div>
                        <div style={{ fontSize: 14, fontWeight: 600, color: text, marginBottom: 4 }}>Drop screenshot or file here</div>
                        <div style={{ fontSize: 12, color: muted, marginBottom: 8 }}>or click to browse</div>
                        <div style={{ fontFamily: 'monospace', fontSize: 9, color: muted, letterSpacing: 2 }}>SCREENSHOT · PDF · SPREADSHEET · EMAIL</div>
                      </>
                    )}
                  </div>
                )}

                {/* Multiple results from scan */}
                {travelScanMode === 'manual' && travelScanResult && travelScanResult.length > 1 && (
                  <div style={{ marginBottom: 14 }}>
                    <div style={{ fontSize: 11, fontFamily: 'monospace', letterSpacing: 1, color: muted, marginBottom: 8 }}>FOUND {travelScanResult.length} LEGS — SHOWING FIRST</div>
                    <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                      {travelScanResult.map((t: any, i: number) => (
                        <button key={i} onClick={() => setForm({ ...t })}
                          style={{ padding: '4px 10px', background: bg, border: `1px solid ${border}`, borderRadius: 6, cursor: 'pointer', fontSize: 11, color: text }}>
                          {t.from_location} → {t.to_location} ({t.travel_date})
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* MANUAL FORM — shown in manual mode or after scan pre-fills */}
                {travelScanMode === 'manual' && (
                  <>
                    {travelScanResult && travelScanResult.length > 0 && (
                      <div style={{ padding: '8px 12px', background: darkMode ? '#0a2a1a' : '#F0FFF4', border: '1px solid #2d7a4f', borderRadius: 8, marginBottom: 14, fontSize: 12, color: '#2d7a4f', fontFamily: 'monospace' }}>
                        ✓ Pre-filled from your file — check and save
                      </div>
                    )}
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
                        <label style={labelStyle}>Carrier / Flight No.</label>
                        <input style={inputStyle} value={form.carrier || ''} onChange={e => setForm({ ...form, carrier: e.target.value })} placeholder="e.g. VA703" />
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
                      <label style={labelStyle}>Booking Reference</label>
                      <input style={inputStyle} value={form.reference || ''} onChange={e => setForm({ ...form, reference: e.target.value })} placeholder="ABC123" />
                    </div>
                    <div style={fieldStyle}>
                      <label style={labelStyle}>Travellers</label>
                      <input style={inputStyle} value={form.travellers || ''} onChange={e => setForm({ ...form, travellers: e.target.value })} placeholder="e.g. Emma, Sarah (keys), Dave (drums)" />
                      <div style={{ fontSize: 11, color: muted, marginTop: 4 }}>Who is on this leg? Leave blank if everyone.</div>
                    </div>
                    <div style={fieldStyle}>
                      <label style={labelStyle}>Notes</label>
                      <textarea style={{ ...inputStyle, resize: 'vertical', minHeight: 60 }} value={form.notes || ''} onChange={e => setForm({ ...form, notes: e.target.value })} placeholder="Any notes..." />
                    </div>
                  </>
                )}
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
                  <label style={labelStyle}>Guests</label>
                  <input style={inputStyle} value={form.travellers || ''} onChange={e => setForm({ ...form, travellers: e.target.value })} placeholder="e.g. Emma, Ben" />
                </div>
                <div style={fieldStyle}>
                  <label style={labelStyle}>Rooming list</label>
                  <textarea style={{ ...inputStyle, resize: 'vertical', minHeight: 80, fontFamily: 'monospace', fontSize: 12 }} value={form.rooming || ''} onChange={e => setForm({ ...form, rooming: e.target.value })} placeholder={'Room 1: Emma, Ben\nRoom 2: David\nRoom 3: Yanya'} />
                  <div style={{ fontSize: 11, color: muted, marginTop: 4, fontStyle: 'italic' }}>One room per line. Shows on the day sheet.</div>
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

            {modal === 'press' && (
              <>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }}>
                  <div>
                    <label style={labelStyle}>Date *</label>
                    <input style={inputStyle} type="date" value={form.date || ''} onChange={e => setForm({ ...form, date: e.target.value })} />
                  </div>
                  <div>
                    <label style={labelStyle}>Type</label>
                    <select style={inputStyle} value={form.type || 'interview'} onChange={e => setForm({ ...form, type: e.target.value })}>
                      <option value="interview">Interview</option>
                      <option value="radio">Radio</option>
                      <option value="tv">TV</option>
                      <option value="podcast">Podcast</option>
                      <option value="photo_shoot">Photo shoot</option>
                      <option value="press_conference">Press conference</option>
                      <option value="other">Other</option>
                    </select>
                  </div>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }}>
                  <div>
                    <label style={labelStyle}>Start time</label>
                    <input style={inputStyle} type="time" value={form.time || ''} onChange={e => setForm({ ...form, time: e.target.value })} />
                  </div>
                  <div>
                    <label style={labelStyle}>End time</label>
                    <input style={inputStyle} type="time" value={form.end_time || ''} onChange={e => setForm({ ...form, end_time: e.target.value })} />
                  </div>
                </div>
                <div style={fieldStyle}>
                  <label style={labelStyle}>Outlet</label>
                  <input style={inputStyle} value={form.outlet || ''} onChange={e => setForm({ ...form, outlet: e.target.value })} placeholder="e.g. triple j, Rolling Stone, The Age" />
                </div>
                <div style={fieldStyle}>
                  <label style={labelStyle}>Location</label>
                  <input style={inputStyle} value={form.location || ''} onChange={e => setForm({ ...form, location: e.target.value })} placeholder="Studio address or 'Phone' or 'Zoom'" />
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }}>
                  <div>
                    <label style={labelStyle}>Contact name</label>
                    <input style={inputStyle} value={form.contact_name || ''} onChange={e => setForm({ ...form, contact_name: e.target.value })} placeholder="Journalist or producer" />
                  </div>
                  <div>
                    <label style={labelStyle}>Contact phone</label>
                    <input style={inputStyle} value={form.contact_phone || ''} onChange={e => setForm({ ...form, contact_phone: e.target.value })} />
                  </div>
                </div>
                <div style={fieldStyle}>
                  <label style={labelStyle}>Contact email</label>
                  <input style={inputStyle} value={form.contact_email || ''} onChange={e => setForm({ ...form, contact_email: e.target.value })} />
                </div>
                <div style={fieldStyle}>
                  <label style={labelStyle}>Notes</label>
                  <textarea style={{ ...inputStyle, minHeight: 60, fontFamily: 'Georgia, serif' }} value={form.notes || ''} onChange={e => setForm({ ...form, notes: e.target.value })} placeholder="Talking points, duration, preferred angles..." />
                </div>
              </>
            )}

            {modal === 'setlist' && (() => {
              const songs = Array.isArray(form.songs) ? form.songs : []
              function updateSong(i: number, key: string, value: string) {
                const next = [...songs]
                next[i] = { ...next[i], [key]: value }
                setForm({ ...form, songs: next })
              }
              function addSong() {
                setForm({ ...form, songs: [...songs, { title: '', duration: '', notes: '' }] })
              }
              function removeSong(i: number) {
                setForm({ ...form, songs: songs.filter((_: any, idx: number) => idx !== i) })
              }
              function moveSong(i: number, dir: -1 | 1) {
                const j = i + dir
                if (j < 0 || j >= songs.length) return
                const next = [...songs]
                ;[next[i], next[j]] = [next[j], next[i]]
                setForm({ ...form, songs: next })
              }
              const totalSeconds = songs.reduce((sum: number, s: any) => {
                if (!s.duration) return sum
                const parts = s.duration.split(':').map((x: string) => parseInt(x) || 0)
                if (parts.length === 2) return sum + parts[0] * 60 + parts[1]
                return sum
              }, 0)
              const totalMin = Math.floor(totalSeconds / 60)
              const totalSec = totalSeconds % 60

              return (
                <>
                  <div style={{ marginBottom: 12, fontSize: 13, color: muted, fontStyle: 'italic' }}>
                    {setlistShow?.venue} — {setlistShow?.date}
                  </div>
                  <div style={{ display: 'grid', gap: 6, marginBottom: 12 }}>
                    {songs.map((song: any, i: number) => (
                      <div key={i} style={{ display: 'grid', gridTemplateColumns: '24px 1fr 70px 1fr 60px', gap: 6, alignItems: 'center' }}>
                        <span style={{ fontFamily: 'monospace', fontSize: 11, color: muted, textAlign: 'center' }}>{i + 1}</span>
                        <input style={inputStyle} value={song.title || ''} onChange={e => updateSong(i, 'title', e.target.value)} placeholder="Song title" />
                        <input style={{ ...inputStyle, textAlign: 'center' }} value={song.duration || ''} onChange={e => updateSong(i, 'duration', e.target.value)} placeholder="3:45" />
                        <input style={inputStyle} value={song.notes || ''} onChange={e => updateSong(i, 'notes', e.target.value)} placeholder="Notes (key, segue...)" />
                        <div style={{ display: 'flex', gap: 2 }}>
                          <button onClick={() => moveSong(i, -1)} disabled={i === 0} style={{ background: 'transparent', border: `1px solid ${border}`, borderRadius: 4, cursor: i === 0 ? 'default' : 'pointer', fontSize: 10, padding: '3px 5px', color: muted, opacity: i === 0 ? 0.3 : 1 }}>↑</button>
                          <button onClick={() => moveSong(i, 1)} disabled={i === songs.length - 1} style={{ background: 'transparent', border: `1px solid ${border}`, borderRadius: 4, cursor: i === songs.length - 1 ? 'default' : 'pointer', fontSize: 10, padding: '3px 5px', color: muted, opacity: i === songs.length - 1 ? 0.3 : 1 }}>↓</button>
                          <button onClick={() => removeSong(i)} style={{ background: '#fff0f0', border: '1px solid #ffcccc', borderRadius: 4, cursor: 'pointer', fontSize: 10, padding: '3px 5px', color: '#cc0000' }}>✕</button>
                        </div>
                      </div>
                    ))}
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                    <button onClick={addSong}
                      style={{ padding: '6px 12px', background: 'transparent', color: muted, border: `1px solid ${border}`, borderRadius: 6, cursor: 'pointer', fontFamily: 'monospace', fontSize: 9, letterSpacing: 1 }}>
                      + ADD SONG
                    </button>
                    {totalSeconds > 0 && (
                      <span style={{ fontSize: 12, color: muted, fontFamily: 'monospace' }}>
                        Total: {totalMin}:{String(totalSec).padStart(2, '0')} · {songs.length} songs
                      </span>
                    )}
                  </div>
                  <div style={fieldStyle}>
                    <label style={labelStyle}>Setlist notes</label>
                    <textarea style={{ ...inputStyle, minHeight: 60, fontFamily: 'Georgia, serif' }} value={form.notes || ''} onChange={e => setForm({ ...form, notes: e.target.value })} placeholder="Between-song banter, tech cues, encore plan..." />
                  </div>
                </>
              )
            })()}

            {modal === 'document' && (
              <>
                <div style={fieldStyle}>
                  <label style={labelStyle}>Category *</label>
                  <select style={inputStyle} value={form.category || 'visa'} onChange={e => setForm({ ...form, category: e.target.value })}>
                    <option value="visa">Visa</option>
                    <option value="tax">Tax</option>
                    <option value="insurance">Insurance</option>
                    <option value="contract">Contract</option>
                    <option value="other">Other</option>
                  </select>
                </div>
                <div style={fieldStyle}>
                  <label style={labelStyle}>Label *</label>
                  <input style={inputStyle} value={form.label || ''} onChange={e => setForm({ ...form, label: e.target.value })} placeholder="e.g. UK Certificate of Sponsorship" />
                </div>
                <div style={fieldStyle}>
                  <label style={labelStyle}>URL *</label>
                  <input style={inputStyle} value={form.url || ''} onChange={e => setForm({ ...form, url: e.target.value })} placeholder="https://dropbox.com/..." />
                </div>
                <div style={fieldStyle}>
                  <label style={labelStyle}>Notes</label>
                  <input style={inputStyle} value={form.notes || ''} onChange={e => setForm({ ...form, notes: e.target.value })} placeholder="Expires, ref numbers, etc." />
                </div>
              </>
            )}

            {modal === 'guest' && (
              <>
                <div style={{ marginBottom: 12, fontSize: 13, color: muted, fontStyle: 'italic' }}>
                  {guestShow?.venue} — {guestShow?.date}
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 100px', gap: 12, marginBottom: 12 }}>
                  <div>
                    <label style={labelStyle}>Name *</label>
                    <input style={inputStyle} value={form.name || ''} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="Guest name" autoFocus />
                  </div>
                  <div>
                    <label style={labelStyle}>+N</label>
                    <input type="number" min="0" style={inputStyle} value={form.plus_n ?? 0} onChange={e => setForm({ ...form, plus_n: parseInt(e.target.value) || 0 })} placeholder="0" />
                  </div>
                </div>
                <div style={fieldStyle}>
                  <label style={labelStyle}>Notes</label>
                  <input style={inputStyle} value={form.notes || ''} onChange={e => setForm({ ...form, notes: e.target.value })} placeholder="Requested by Emma, pickup at box office..." />
                </div>
              </>
            )}

            {modal === 'person' && (
              <>
                <div style={{ marginBottom: 12, fontSize: 13, color: muted, fontStyle: 'italic' }}>
                  {personShow?.venue} — {personShow?.date}
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }}>
                  <div>
                    <label style={labelStyle}>Role *</label>
                    <select style={inputStyle} value={form.role || 'support'} onChange={e => setForm({ ...form, role: e.target.value })}>
                      <option value="support">Support act</option>
                      <option value="photographer">Photographer</option>
                      <option value="videographer">Videographer</option>
                      <option value="dj">DJ</option>
                      <option value="mc">MC / Host</option>
                      <option value="other">Other</option>
                    </select>
                  </div>
                  <div>
                    <label style={labelStyle}>Name *</label>
                    <input style={inputStyle} value={form.name || ''} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="Act or person name" />
                  </div>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }}>
                  <div>
                    <label style={labelStyle}>Set time</label>
                    <input type="time" style={inputStyle} value={form.set_time || ''} onChange={e => setForm({ ...form, set_time: e.target.value })} />
                  </div>
                  <div>
                    <label style={labelStyle}>Duration (min)</label>
                    <input type="number" style={inputStyle} value={form.duration_minutes || ''} onChange={e => setForm({ ...form, duration_minutes: e.target.value ? parseInt(e.target.value) : null })} placeholder="30" />
                  </div>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }}>
                  <div>
                    <label style={labelStyle}>Phone</label>
                    <input style={inputStyle} value={form.phone || ''} onChange={e => setForm({ ...form, phone: e.target.value })} />
                  </div>
                  <div>
                    <label style={labelStyle}>Email</label>
                    <input style={inputStyle} value={form.email || ''} onChange={e => setForm({ ...form, email: e.target.value })} />
                  </div>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 120px 100px', gap: 12, marginBottom: 12 }}>
                  <div>
                    <label style={labelStyle}>Instagram</label>
                    <input style={inputStyle} value={form.instagram || ''} onChange={e => setForm({ ...form, instagram: e.target.value })} placeholder="@handle" />
                  </div>
                  <div>
                    <label style={labelStyle}>Fee</label>
                    <input type="number" style={inputStyle} value={form.fee || ''} onChange={e => setForm({ ...form, fee: e.target.value ? parseFloat(e.target.value) : null })} placeholder="0" />
                  </div>
                  <div>
                    <label style={labelStyle}>Currency</label>
                    <select style={inputStyle} value={form.currency || 'AUD'} onChange={e => setForm({ ...form, currency: e.target.value })}>
                      <option>AUD</option>
                      <option>EUR</option>
                      <option>GBP</option>
                      <option>USD</option>
                      <option>NZD</option>
                    </select>
                  </div>
                </div>
                <div style={fieldStyle}>
                  <label style={labelStyle}>Notes</label>
                  <textarea style={{ ...inputStyle, minHeight: 60, fontFamily: 'Georgia, serif' }} value={form.notes || ''} onChange={e => setForm({ ...form, notes: e.target.value })} placeholder="Deal details, tech needs, socials to tag..." />
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
                <div style={{ marginBottom: 16 }}>
                  <label style={labelStyle}>Tech rider document URL</label>
                  <input style={inputStyle} value={form.tech_rider_url || ''} onChange={e => setForm({ ...form, tech_rider_url: e.target.value })} placeholder="Paste a link to your tech rider PDF or Google Doc" />
                  <div style={{ fontSize: 11, color: muted, marginTop: 4 }}>Upload to Google Drive, Dropbox, or anywhere and paste the link here.</div>
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

      {/* Undo toast */}
      {undoItem && (
        <div style={{ position: 'fixed', bottom: 24, left: '50%', transform: 'translateX(-50%)', background: '#1A1714', borderRadius: 10, padding: '12px 16px', display: 'flex', alignItems: 'center', gap: 14, zIndex: 300, boxShadow: '0 4px 24px rgba(0,0,0,0.3)', maxWidth: 420, width: 'calc(100% - 32px)' }}>
          <span style={{ fontSize: 13, color: '#F4EFE6', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            Deleted: {undoItem.label}
          </span>
          <button onClick={handleUndo}
            style={{ background: accent, border: 'none', borderRadius: 6, color: '#fff', cursor: 'pointer', fontFamily: 'monospace', fontSize: 11, letterSpacing: 1, padding: '6px 14px', flexShrink: 0 }}>
            UNDO
          </button>
          <button onClick={() => { if (undoTimer) clearTimeout(undoTimer); setUndoItem(null) }}
            style={{ background: 'transparent', border: 'none', color: '#4A4540', cursor: 'pointer', fontSize: 16, padding: '0 4px', flexShrink: 0 }}>
            ✕
          </button>
        </div>
      )}

      <style>{`
        @media (max-width: 600px) {
          .toolbar-tabs button { padding: 7px 8px !important; font-size: 8px !important; letter-spacing: 0 !important; }
          .toolbar-tabs button span { display: none; }
          .toolbar-right { flex-wrap: nowrap !important; }
          .add-row { display: grid !important; grid-template-columns: 1fr 1fr !important; gap: 6px !important; }
          .add-row button { font-size: 10px !important; padding: 8px 10px !important; text-align: center; }
          .show-actions { flex-direction: column !important; align-items: flex-end !important; gap: 4px !important; }
          .show-actions button { font-size: 9px !important; padding: 4px 6px !important; }
          .warnings-dropdown { right: -60px !important; width: 300px !important; }
          .tour-tabs { flex-wrap: wrap !important; }
          .content-container { padding: 16px !important; }
        }
      `}</style>

      {/* Header */}
      <div style={{ background: darkMode ? '#111' : '#0F0E0C', borderBottom: `1px solid ${darkMode ? '#222' : '#1E1C18'}`, padding: '0 16px', minHeight: 56, display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
          <button onClick={() => router.push('/dashboard')}
            style={{ background: 'none', border: 'none', color: '#5A5450', cursor: 'pointer', fontSize: 13, fontFamily: '"Georgia", serif', display: 'flex', alignItems: 'center', gap: 6, padding: 0 }}>
            ← Roster
          </button>
          <div style={{ width: 1, height: 20, background: '#2A2520' }} />
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ width: 32, height: 32, borderRadius: 8, background: artist?.color || '#C4622D', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: 14, fontWeight: 700, fontFamily: '"Georgia", serif', fontStyle: 'italic' }}>
              {artist?.name?.charAt(0)}
            </div>
            <div>
              <div style={{ fontFamily: '"Playfair Display", Georgia, serif', fontSize: 17, fontWeight: 700, color: '#F4EFE6', lineHeight: 1 }}>{artist?.name}</div>
              {artist?.project && <div style={{ fontSize: 11, color: '#5A5450', fontStyle: 'italic', marginTop: 2 }}>{artist.project}</div>}
            </div>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
          <button onClick={() => router.push(`/dashboard/artists/${params.id}/settings`)}
            style={{ padding: '6px 12px', background: 'transparent', border: '1px solid #2A2520', borderRadius: 6, color: '#5A5450', cursor: 'pointer', fontSize: 11, fontFamily: 'monospace', letterSpacing: '0.1em' }}>
            ⚙
          </button>
          <button onClick={() => setDarkMode(!darkMode)}
            style={{ padding: '6px 12px', background: 'transparent', border: '1px solid #2A2520', borderRadius: 6, color: '#5A5450', cursor: 'pointer', fontSize: 12 }}>
            {darkMode ? '☀️' : '🌙'}
          </button>
        </div>
      </div>

      <div className="content-container" style={{ maxWidth: 900, margin: '0 auto', padding: 24 }}>

        {/* Tour tabs - split active vs archived */}
        {tours.length > 0 && (() => {
          const today = new Date().toISOString().split('T')[0]

          // Archive if end_date is past, OR if no end_date but all shows are in the past
          function isArchived(tour: any): boolean {
            if (tour.end_date) return tour.end_date < today
            const tourShows = allTourShows.filter((s: any) => s.tour_id === tour.id)
            if (tourShows.length === 0) return false
            const latestShow = tourShows.map((s: any) => s.date).filter(Boolean).sort().reverse()[0]
            return latestShow ? latestShow < today : false
          }

          const activeTours = tours.filter(t => !isArchived(t))
          const archivedTours = tours.filter(t => isArchived(t))

          const renderTourButton = (tour: any, archived: boolean) => {
            const statusColor: Record<string, string> = { confirmed: '#2d7a4f', routing: '#B8860B', completed: '#8A8580' }
            const statusLabel: Record<string, string> = { confirmed: '✓', routing: '~', completed: '—' }
            const isSelected = selectedTour?.id === tour.id
            return (
              <button key={tour.id} onClick={() => setSelectedTour(tour)}
                style={{
                  padding: '8px 16px', borderRadius: 20,
                  border: `1px solid ${archived && !isSelected ? '#D8D0C4' : border}`,
                  background: isSelected ? accent : card,
                  color: isSelected ? '#fff' : (archived ? muted : text),
                  opacity: archived && !isSelected ? 0.7 : 1,
                  cursor: 'pointer', fontSize: 13, display: 'flex', alignItems: 'center', gap: 6,
                  fontStyle: archived ? 'italic' : 'normal',
                }}>
                {tour.status && <span style={{ fontSize: 10, color: isSelected ? 'rgba(255,255,255,0.8)' : statusColor[tour.status] || muted }}>{statusLabel[tour.status] || ''}</span>}
                {tour.name}
                {archived && <span style={{ fontFamily: 'monospace', fontSize: 8, letterSpacing: 1, color: isSelected ? 'rgba(255,255,255,0.7)' : muted, marginLeft: 2 }}>ARCHIVED</span>}
              </button>
            )
          }

          return (
            <div style={{ marginBottom: 24 }}>
              {activeTours.length > 0 && (
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  {activeTours.map(t => renderTourButton(t, false))}
                </div>
              )}

              {archivedTours.length > 0 && (
                <div style={{ marginTop: activeTours.length > 0 ? 14 : 0 }}>
                  <div onClick={() => setShowArchive(!showArchive)}
                    style={{ display: 'inline-flex', alignItems: 'center', gap: 6, cursor: 'pointer', fontFamily: 'monospace', fontSize: 10, letterSpacing: 2, color: muted, marginBottom: showArchive ? 10 : 0 }}>
                    <span style={{ transform: showArchive ? 'rotate(90deg)' : 'rotate(0deg)', transition: 'transform 0.15s', display: 'inline-block' }}>›</span>
                    PAST TOURS · {archivedTours.length}
                  </div>
                  {showArchive && (
                    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                      {archivedTours.map(t => renderTourButton(t, true))}
                    </div>
                  )}
                </div>
              )}
            </div>
          )
        })()}

        {/* New tour button always visible */}
        <div style={{ marginBottom: tours.length > 0 ? 0 : 24 }}>
          <button onClick={() => openModal('tour')}
            style={{ padding: '6px 14px', background: 'transparent', color: muted, border: `1px solid ${border}`, borderRadius: 20, cursor: 'pointer', fontFamily: 'monospace', fontSize: 10, letterSpacing: 2 }}>
            + NEW TOUR
          </button>
        </div>

        {tours.length === 0 && (
          <TourStarter artistId={params.id as string} darkMode={darkMode} onCreated={(tour) => {
            setTours([tour])
            setSelectedTour(tour)
            setView('import')
          }} />
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
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20, flexWrap: 'wrap', gap: 8 }}>

              {/* Main tabs */}
              <div className="toolbar-tabs" style={{ display: 'flex', gap: 2, background: darkMode ? '#222' : '#EDE8DF', borderRadius: 10, padding: 3, overflowX: 'auto' as const, maxWidth: '100%' }}>
                {([
                  ['list', '☰ Tour'],
                  ['import', '⊕ Import'],
                  ['ai', '✦ Assistant'],
                  ['calendar', '▦ Calendar'],
                  ['notes', '💬 Notes'],
                ] as const).map(([v, label]) => (
                  <button key={v} onClick={() => setView(v as any)}
                    style={{
                      padding: '7px 14px', borderRadius: 7,
                      background: view === v ? (darkMode ? '#333' : '#fff') : 'transparent',
                      color: view === v ? text : muted,
                      border: 'none', cursor: 'pointer',
                      fontFamily: 'monospace', fontSize: 9, letterSpacing: '0.1em',
                      fontWeight: view === v ? 700 : 400,
                      boxShadow: view === v ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
                      transition: 'all 0.15s',
                      position: 'relative' as const,
                      whiteSpace: 'nowrap' as const,
                    }}>
                    {label}
                    {v === 'notes' && notes.length > 0 && <span style={{ position: 'absolute', top: 5, right: 5, width: 5, height: 5, borderRadius: '50%', background: '#f59e0b' }} />}
                    {v === 'import' && importJobs.filter(j => j.status === 'queued').length > 0 && (
                      <span style={{ marginLeft: 5, background: accent, color: '#fff', borderRadius: 10, padding: '1px 6px', fontSize: 9 }}>
                        {importJobs.filter(j => j.status === 'queued').length}
                      </span>
                    )}
                  </button>
                ))}
              </div>

              {/* Right actions */}
              <div className="toolbar-right" style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                <button onClick={() => {
                  const today = new Date().toISOString().slice(0, 10)
                  const upcoming = shows.filter(s => s.date >= today).sort((a,b) => a.date.localeCompare(b.date))
                  const target = upcoming[0]?.date || shows[0]?.date || today
                  router.push(`/day?tourId=${selectedTour?.id}&date=${target}`)
                }}
                  style={{ padding: '7px 14px', background: darkMode ? '#2a2a2a' : '#1A1714', color: '#F4EFE6', border: 'none', borderRadius: 7, cursor: 'pointer', fontFamily: 'monospace', fontSize: 9, letterSpacing: '0.1em', whiteSpace: 'nowrap' as const }}
                  title="Open day schedule view">
                  ▦ SCHEDULE
                </button>
                <button onClick={handleShare} disabled={sharing}
                  style={{ padding: '7px 14px', background: copied ? '#2d7a4f' : accent, color: '#fff', border: 'none', borderRadius: 7, cursor: 'pointer', fontFamily: 'monospace', fontSize: 9, letterSpacing: '0.1em' }}>
                  {copied ? '✓ COPIED' : '🔗 CREW LINK'}
                </button>
                <button onClick={handleExportIcal}
                  style={{ padding: '7px 10px', background: 'transparent', color: muted, border: `1px solid ${border}`, borderRadius: 7, cursor: 'pointer', fontSize: 13 }} title="Export iCal">
                  📅
                </button>
                <div style={{ position: 'relative' as const }}>
                  {showWarnings && <div style={{ position: 'fixed', inset: 0, zIndex: 49 }} onClick={() => setShowWarnings(false)} />}
                  <button onClick={() => setShowWarnings(!showWarnings)}
                    title="Logistics flags"
                    style={{ padding: '7px 10px', background: showWarnings ? (darkMode ? '#2a2a2a' : '#FFF8E6') : 'transparent', color: warnings.filter(w => !dismissedWarnings.has(w)).length > 0 ? '#B8860B' : muted, border: `1px solid ${warnings.filter(w => !dismissedWarnings.has(w)).length > 0 ? '#F0C040' : border}`, borderRadius: 7, cursor: 'pointer', fontSize: 13, position: 'relative' as const }}>
                    🔔
                    {warnings.filter(w => !dismissedWarnings.has(w)).length > 0 && (
                      <span style={{ position: 'absolute' as const, top: -6, right: -6, background: '#B8860B', color: '#fff', borderRadius: '50%', width: 16, height: 16, fontSize: 9, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'monospace', fontWeight: 700 }}>
                        {warnings.filter(w => !dismissedWarnings.has(w)).length}
                      </span>
                    )}
                  </button>

                  {showWarnings && (
                    <div className="warnings-dropdown" style={{ position: 'absolute' as const, right: 0, top: 42, width: 380, background: card, border: `1px solid ${border}`, borderRadius: 12, boxShadow: '0 8px 32px rgba(0,0,0,0.15)', zIndex: 50, overflow: 'hidden' }}>
                      <div style={{ padding: '12px 16px', borderBottom: `1px solid ${border}`, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <div style={{ fontFamily: 'monospace', fontSize: 9, letterSpacing: 2, color: '#B8860B' }}>
                          ⚠ LOGISTICS FLAGS
                        </div>
                        {warnings.filter(w => !dismissedWarnings.has(w)).length === 0 && (
                          <div style={{ fontSize: 12, color: '#2d7a4f' }}>✓ All clear</div>
                        )}
                        <button onClick={() => setShowWarnings(false)} style={{ background: 'none', border: 'none', color: muted, cursor: 'pointer', fontSize: 16, padding: 0 }}>×</button>
                      </div>
                      <div style={{ maxHeight: 360, overflowY: 'auto' as const }}>
                        {warnings.filter(w => !dismissedWarnings.has(w)).length === 0 ? (
                          <div style={{ padding: '20px 16px', textAlign: 'center', fontSize: 13, color: muted }}>No flags for this tour.</div>
                        ) : (
                          warnings.filter(w => !dismissedWarnings.has(w)).map((w, i) => (
                            <div key={i} style={{ padding: '10px 16px', borderBottom: `1px solid ${border}`, display: 'flex', gap: 10, alignItems: 'flex-start' }}>
                              <span style={{ color: '#F0C040', flexShrink: 0, marginTop: 1 }}>—</span>
                              <span style={{ flex: 1, fontSize: 12, color: darkMode ? '#e8c840' : '#7a5800', lineHeight: 1.5 }}>{w}</span>
                              <button onClick={() => setDismissedWarnings(prev => new Set([...prev, w]))}
                                style={{ background: 'none', border: `1px solid ${border}`, borderRadius: 5, color: muted, cursor: 'pointer', fontSize: 9, padding: '2px 8px', fontFamily: 'monospace', letterSpacing: 1, flexShrink: 0, whiteSpace: 'nowrap' as const }}>
                                RESOLVE
                              </button>
                            </div>
                          ))
                        )}
                      </div>
                    </div>
                  )}
                </div>

                <button onClick={() => router.push(`/dashboard/artists/${params.id}/settings`)}
                  style={{ padding: '7px 10px', background: 'transparent', color: muted, border: `1px solid ${border}`, borderRadius: 7, cursor: 'pointer', fontSize: 13 }} title="Settings">
                  ⚙
                </button>
              </div>
            </div>

                        {/* Warnings */}
            {/* LIST VIEW */}
            {view === 'list' && (
              <div style={{ display: 'grid', gap: 20 }}>
                {/* Manual add row */}
                <div className="add-row" style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                  {([['show', '+ Show'], ['travel', '+ Travel'], ['accommodation', '+ Hotel'], ['contact', '+ Contact'], ['press', '+ Press'], ['document', '+ Docs']] as const).map(([type, label]) => (
                    <button key={type} onClick={() => openModal(type)}
                      style={{ padding: '6px 12px', background: 'transparent', color: muted, border: `1px solid ${border}`, borderRadius: 6, cursor: 'pointer', fontFamily: 'monospace', fontSize: 9, letterSpacing: 1 }}>
                      {label}
                    </button>
                  ))}
                  <button onClick={() => openModal('rider', rider || {})}
                    style={{ padding: '6px 12px', background: 'transparent', color: muted, border: `1px solid ${border}`, borderRadius: 6, cursor: 'pointer', fontFamily: 'monospace', fontSize: 9, letterSpacing: 1 }}>
                    {rider ? '✎ Rider' : '+ Rider'}
                  </button>
                  <button onClick={() => router.push(`/dashboard/artists/${params.id}/budget`)}
                    style={{ padding: '6px 12px', background: 'transparent', color: muted, border: `1px solid ${border}`, borderRadius: 6, cursor: 'pointer', fontFamily: 'monospace', fontSize: 9, letterSpacing: 1 }}>
                    💰 Budget
                  </button>
                </div>
                {shows.length > 0 && (
                  <div style={{ background: card, borderRadius: 12, padding: 20, border: `1px solid ${border}` }}>
                    <div style={{ fontSize: 11, letterSpacing: '0.1em', color: muted, marginBottom: 16, textTransform: 'uppercase', fontFamily: 'monospace' }}>
                      {(() => {
                        const showCount = shows.filter(s => !s.type || s.type === 'show').length
                        const rehearsalCount = shows.filter(s => s.type === 'rehearsal').length
                        const recordingCount = shows.filter(s => s.type === 'recording').length
                        const pressCount = shows.filter(s => s.type === 'press').length
                        const otherCount = shows.length - showCount - rehearsalCount - recordingCount - pressCount
                        const parts = [`${showCount} show${showCount !== 1 ? 's' : ''}`]
                        if (rehearsalCount) parts.push(`${rehearsalCount} rehearsal${rehearsalCount !== 1 ? 's' : ''}`)
                        if (recordingCount) parts.push(`${recordingCount} recording${recordingCount !== 1 ? 's' : ''}`)
                        if (pressCount) parts.push(`${pressCount} press day${pressCount !== 1 ? 's' : ''}`)
                        if (otherCount) parts.push(`${otherCount} other`)
                        return `Schedule — ${parts.join(' · ')}`
                      })()}
                    </div>
                    {shows.map((show, i) => {
                      const v = show.venue || ''
                      const venueName = v.length > 55 ? v.split(/\s*[-–]\s*(?:Access|Park in|Contact|via\s|Turn|From\s)/i)[0].trim() : v
                      const hasDetail = v.length > venueName.length
                      const isExpanded = expandedShowId === show.id
                      const settlement = settlements.find(s => s.show_id === show.id)
                      const sl = setlists.find(s => s.show_id === show.id)
                      const songCount = sl && Array.isArray(sl.songs) ? sl.songs.length : 0
                      const peopleCount = showPeople.filter(p => p.show_id === show.id).length
                      const guestCount = guestList.filter(g => g.show_id === show.id).reduce((s: number, g: any) => s + 1 + (g.plus_n || 0), 0)
                      const sameVenue = shows.filter(s => (!s.type || s.type === 'show') && s.venue === show.venue)
                      const isFestival = (!show.type || show.type === 'show') && sameVenue.length >= 2
                      const statusColor: Record<string,string> = { paid: '#2d7a4f', partial: '#B8860B', pending: muted, disputed: '#C00' }

                      return (
                      <div key={i} style={{ borderBottom: i < shows.length - 1 ? `1px solid ${border}` : 'none', position: 'relative' as const }}>
                        {/* Compact row - tap anywhere expands; DAY SHEET is its own button */}
                        <div
                          onClick={() => setExpandedShowId(isExpanded ? null : show.id)}
                          style={{ padding: '12px 0', display: 'flex', alignItems: 'center', gap: 12, cursor: 'pointer', userSelect: 'none' as const }}>
                          {/* Date block */}
                          <div style={{ flexShrink: 0, width: 44, textAlign: 'center' }}>
                            <div style={{ fontFamily: 'monospace', fontSize: 9, letterSpacing: '0.1em', color: muted, textTransform: 'uppercase' }}>
                              {show.date ? new Date(show.date + 'T00:00:00').toLocaleDateString('en-AU', { weekday: 'short' }) : ''}
                            </div>
                            <div style={{ fontSize: 22, fontWeight: 700, lineHeight: 1, color: text, fontVariantNumeric: 'tabular-nums' }}>
                              {show.date ? new Date(show.date + 'T00:00:00').getDate() : ''}
                            </div>
                            <div style={{ fontFamily: 'monospace', fontSize: 9, letterSpacing: '0.05em', color: muted }}>
                              {show.date ? new Date(show.date + 'T00:00:00').toLocaleDateString('en-AU', { month: 'short' }) : ''}
                            </div>
                          </div>
                          <div style={{ width: 1, background: border, alignSelf: 'stretch', flexShrink: 0 }} />
                          {/* Venue + city */}
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ fontSize: 15, fontWeight: 700, lineHeight: 1.25, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', display: 'flex', alignItems: 'center', gap: 8 }}>
                              {show.type && show.type !== 'show' && (
                                <span style={{ fontFamily: 'monospace', fontSize: 9, letterSpacing: 1.5,
                                  color: show.type === 'rehearsal' ? '#5B4B8A' : show.type === 'recording' ? '#1A6B8A' : show.type === 'press' ? '#B8860B' : show.type === 'day_off' ? '#3D6B50' : '#8A8580',
                                  background: show.type === 'rehearsal' ? '#F5F0FF' : show.type === 'recording' ? '#F0F8FF' : show.type === 'press' ? '#FFFBF0' : show.type === 'day_off' ? '#F0FFF4' : '#F5F0E8',
                                  border: `1px solid ${show.type === 'rehearsal' ? '#8B7EC6' : show.type === 'recording' ? '#1A6B8A' : show.type === 'press' ? '#B8860B' : show.type === 'day_off' ? '#3D6B50' : border}`,
                                  padding: '2px 6px', borderRadius: 3, flexShrink: 0 }}>
                                  {show.type === 'rehearsal' ? 'REHEARSAL' : show.type === 'recording' ? 'RECORDING' : show.type === 'press' ? 'PRESS DAY' : show.type === 'travel_day' ? 'TRAVEL' : 'DAY OFF'}
                                </span>
                              )}
                              <span style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>{venueName}</span>
                            </div>
                            <div style={{ fontSize: 12, color: muted, marginTop: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                              {[show.city, show.country && show.country !== 'AU' ? show.country : null].filter(Boolean).join(', ')}
                              {['rehearsal','recording','press'].includes(show.type) ? (
                                show.soundcheck_time && <span style={{ marginLeft: 8, fontFamily: 'monospace', color: accent, fontWeight: 700 }}>· {formatTime(show.soundcheck_time)}</span>
                              ) : (
                                show.set_time && <span style={{ marginLeft: 8, fontFamily: 'monospace', color: accent, fontWeight: 700 }}>· {formatTime(show.set_time)}</span>
                              )}
                            </div>
                          </div>
                          {/* Status indicators */}
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
                            {isFestival && (
                              <span style={{ fontFamily: 'monospace', fontSize: 9, color: accent, background: '#FDF5EF', border: `1px solid ${accent}`, padding: '2px 6px', borderRadius: 3, letterSpacing: 1 }}>FEST</span>
                            )}
                            {settlement && (
                              <span title={`Settlement: ${settlement.status}`} style={{ width: 8, height: 8, borderRadius: '50%', background: statusColor[settlement.status] || muted, flexShrink: 0 }} />
                            )}
                            {songCount > 0 && (
                              <span title={`${songCount} songs`} style={{ fontFamily: 'monospace', fontSize: 10, color: '#5B4B8A' }}>♪{songCount}</span>
                            )}
                            {peopleCount > 0 && (
                              <span title={`${peopleCount} support/photog`} style={{ fontFamily: 'monospace', fontSize: 10, color: muted }}>👥{peopleCount}</span>
                            )}
                            {guestCount > 0 && (
                              <span title={`${guestCount} on guest list`} style={{ fontFamily: 'monospace', fontSize: 10, color: muted }}>🎟{guestCount}</span>
                            )}
                            <span style={{ fontSize: 14, color: muted, transform: isExpanded ? 'rotate(90deg)' : 'rotate(0deg)', transition: 'transform 0.15s', flexShrink: 0, marginLeft: 4 }}>›</span>
                          </div>
                        </div>

                        {/* Actions panel (toggled by ⋯) */}
                        {isExpanded && (
                          <div style={{ padding: '4px 0 16px 56px' }}>
                            {/* Full venue name if truncated */}
                            {(v.length > venueName.length) && (
                              <div style={{ fontSize: 12, color: muted, marginBottom: 6 }}>📍 {v}</div>
                            )}
                            {/* Times row */}
                            {(show.doors_time || show.soundcheck_time || show.set_time || show.stage || show.catering || show.backline) && (
                              <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center', marginBottom: 8 }}>
                                {['rehearsal','recording','press'].includes(show.type) ? (
                                  <>
                                    {show.soundcheck_time && <span style={{ fontFamily: 'monospace', fontSize: 11, color: muted }}>Start {formatTime(show.soundcheck_time)}</span>}
                                    {show.set_time && <span style={{ fontFamily: 'monospace', fontSize: 11, color: accent, fontWeight: 700 }}>Finish {formatTime(show.set_time)}</span>}
                                  </>
                                ) : (
                                  <>
                                    {show.arrival_time && <span style={{ fontFamily: 'monospace', fontSize: 11, color: muted }}>Arrive {formatTime(show.arrival_time)}</span>}
                                    {show.doors_time && <span style={{ fontFamily: 'monospace', fontSize: 11, color: muted }}>Doors {formatTime(show.doors_time)}</span>}
                                    {show.soundcheck_time && <span style={{ fontFamily: 'monospace', fontSize: 11, color: muted }}>SC {formatTime(show.soundcheck_time)}</span>}
                                    {show.set_time && <span style={{ fontFamily: 'monospace', fontSize: 11, color: accent, fontWeight: 700 }}>Stage {formatTime(show.set_time)}</span>}
                                    {show.stage && <span style={{ fontFamily: 'monospace', fontSize: 11, color: muted }}>{show.stage}</span>}
                                  </>
                                )}
                                {show.catering && <span style={{ fontSize: 11, color: muted }}>🍽 {show.catering}</span>}
                                {show.backline && <span style={{ fontSize: 11, color: muted }}>🎸 {show.backline}</span>}
                              </div>
                            )}
                            {/* Notes */}
                            {show.notes && (
                              <div style={{ fontSize: 12, color: muted, marginBottom: 12, fontStyle: 'italic', lineHeight: 1.5, whiteSpace: 'pre-wrap' as const }}>{show.notes}</div>
                            )}
                            {/* Show people (supports, photographers, etc) */}
                            {(() => {
                              const people = showPeople.filter(p => p.show_id === show.id)
                              const roleLabels: Record<string, string> = { support: 'Support', photographer: 'Photographer', videographer: 'Video', dj: 'DJ', mc: 'MC', other: 'Other' }
                              const roleIcons: Record<string, string> = { support: '🎤', photographer: '📷', videographer: '🎥', dj: '🎧', mc: '🎙', other: '•' }
                              return (
                                <div style={{ marginBottom: 12 }}>
                                  {people.length > 0 && (
                                    <div style={{ display: 'grid', gap: 6, marginBottom: 8 }}>
                                      {people.map((p: any) => (
                                        <div key={p.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 10px', background: '#F9F6F2', borderRadius: 6, fontSize: 12 }}>
                                          <span style={{ fontSize: 14 }}>{roleIcons[p.role] || '•'}</span>
                                          <div style={{ flex: 1, minWidth: 0 }}>
                                            <div style={{ fontWeight: 600, color: text }}>
                                              {p.name}
                                              <span style={{ fontFamily: 'monospace', fontSize: 10, color: muted, marginLeft: 8, letterSpacing: 1 }}>{(roleLabels[p.role] || 'OTHER').toUpperCase()}</span>
                                            </div>
                                            <div style={{ color: muted, fontSize: 11, display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 2 }}>
                                              {p.set_time && <span style={{ fontFamily: 'monospace', color: accent }}>{formatTime(p.set_time)}{p.duration_minutes ? ` · ${p.duration_minutes}min` : ''}</span>}
                                              {p.fee > 0 && <span>{p.currency || 'AUD'} {p.fee}</span>}
                                              {p.phone && <span>📞 {p.phone}</span>}
                                              {p.email && <span>✉ {p.email}</span>}
                                              {p.instagram && <span>📷 {p.instagram}</span>}
                                            </div>
                                            {p.notes && <div style={{ color: muted, fontSize: 11, fontStyle: 'italic', marginTop: 3 }}>{p.notes}</div>}
                                          </div>
                                          <div style={{ display: 'flex', gap: 4, flexShrink: 0 }}>
                                            <button onClick={(e) => { e.stopPropagation(); setPersonShow(show); openModal('person', p) }}
                                              style={{ background: 'transparent', border: `1px solid ${border}`, borderRadius: 5, color: muted, cursor: 'pointer', fontSize: 11, padding: '2px 7px' }}>✎</button>
                                            <button onClick={(e) => { e.stopPropagation(); setConfirmDelete({ table: 'show_people', id: p.id, label: `${p.name} from ${show.venue}` }) }}
                                              style={{ background: '#fff0f0', border: '1px solid #ffcccc', borderRadius: 5, color: '#cc0000', cursor: 'pointer', fontSize: 11, padding: '2px 7px' }}>✕</button>
                                          </div>
                                        </div>
                                      ))}
                                    </div>
                                  )}
                                  <button onClick={(e) => { e.stopPropagation(); setPersonShow(show); openModal('person', { role: 'support' }) }}
                                    style={{ background: 'transparent', border: `1px dashed ${border}`, borderRadius: 6, color: muted, cursor: 'pointer', fontSize: 11, padding: '6px 12px', fontFamily: 'monospace', letterSpacing: 1 }}>
                                    + SUPPORT / PHOTOG / ETC
                                  </button>
                                </div>
                              )
                            })()}
                            {/* Guest list */}
                            {(() => {
                              const guests = guestList.filter(g => g.show_id === show.id)
                              const totalHeads = guests.reduce((sum: number, g: any) => sum + 1 + (g.plus_n || 0), 0)
                              return (
                                <div style={{ marginBottom: 12 }}>
                                  {guests.length > 0 && (
                                    <div style={{ marginBottom: 8 }}>
                                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6, padding: '0 2px' }}>
                                        <span style={{ fontFamily: 'monospace', fontSize: 9, letterSpacing: 2, color: muted, textTransform: 'uppercase' }}>
                                          Guest list · {guests.length} {guests.length === 1 ? 'entry' : 'entries'} · {totalHeads} {totalHeads === 1 ? 'head' : 'heads'}
                                        </span>
                                        <button onClick={(e) => {
                                          e.stopPropagation()
                                          if (!show.guest_list_token) return
                                          const url = `${window.location.origin}/guests/${show.guest_list_token}`
                                          navigator.clipboard.writeText(url)
                                          alert(`Public guest list link copied:\n${url}`)
                                        }}
                                          style={{ background: 'transparent', border: `1px solid ${border}`, borderRadius: 5, color: muted, cursor: show.guest_list_token ? 'pointer' : 'not-allowed', fontSize: 10, padding: '3px 8px', fontFamily: 'monospace', letterSpacing: 1, opacity: show.guest_list_token ? 1 : 0.4 }}>
                                          {show.guest_list_token ? 'COPY SHARE LINK' : 'NO LINK YET'}
                                        </button>
                                      </div>
                                      <div style={{ display: 'grid', gap: 4 }}>
                                        {guests.map((g: any) => (
                                          <div key={g.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '6px 10px', background: '#F9F6F2', borderRadius: 6, fontSize: 12 }}>
                                            <div style={{ flex: 1, minWidth: 0 }}>
                                              <span style={{ fontWeight: 600, color: text }}>{g.name}</span>
                                              {g.plus_n > 0 && <span style={{ fontFamily: 'monospace', fontSize: 11, color: accent, marginLeft: 6, fontWeight: 700 }}>+{g.plus_n}</span>}
                                              {g.notes && <span style={{ color: muted, fontSize: 11, fontStyle: 'italic', marginLeft: 8 }}>· {g.notes}</span>}
                                            </div>
                                            <div style={{ display: 'flex', gap: 4, flexShrink: 0 }}>
                                              <button onClick={(e) => { e.stopPropagation(); setGuestShow(show); openModal('guest', g) }}
                                                style={{ background: 'transparent', border: `1px solid ${border}`, borderRadius: 5, color: muted, cursor: 'pointer', fontSize: 11, padding: '2px 7px' }}>✎</button>
                                              <button onClick={(e) => { e.stopPropagation(); setConfirmDelete({ table: 'guest_list', id: g.id, label: `${g.name} from ${show.venue}` }) }}
                                                style={{ background: '#fff0f0', border: '1px solid #ffcccc', borderRadius: 5, color: '#cc0000', cursor: 'pointer', fontSize: 11, padding: '2px 7px' }}>✕</button>
                                            </div>
                                          </div>
                                        ))}
                                      </div>
                                    </div>
                                  )}
                                  <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                                    <button onClick={(e) => { e.stopPropagation(); setGuestShow(show); openModal('guest', { plus_n: 0 }) }}
                                      style={{ background: 'transparent', border: `1px dashed ${border}`, borderRadius: 6, color: muted, cursor: 'pointer', fontSize: 11, padding: '6px 12px', fontFamily: 'monospace', letterSpacing: 1 }}>
                                      + GUEST
                                    </button>
                                    {!show.guest_list_token && guests.length > 0 && (
                                      <button onClick={async (e) => {
                                        e.stopPropagation()
                                        const token = Math.random().toString(36).substring(2, 12) + Date.now().toString(36).substring(-4)
                                        await supabase.from('shows').update({ guest_list_token: token }).eq('id', show.id)
                                        if (selectedTour) await loadTourData(selectedTour.id)
                                        const url = `${window.location.origin}/guests/${token}`
                                        navigator.clipboard.writeText(url)
                                        alert(`Share link created & copied:\n${url}`)
                                      }}
                                        style={{ background: 'transparent', border: `1px solid ${accent}`, borderRadius: 6, color: accent, cursor: 'pointer', fontSize: 11, padding: '6px 12px', fontFamily: 'monospace', letterSpacing: 1 }}>
                                        🔗 CREATE SHARE LINK
                                      </button>
                                    )}
                                  </div>
                                </div>
                              )
                            })()}
                            {/* Actions */}
                            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                              {isFestival ? (
                                <button onClick={(e) => { e.stopPropagation(); window.open(`/festival/${selectedTour?.id}`, '_blank') }}
                                  style={{ background: '#FDF5EF', border: `1px solid ${accent}`, borderRadius: 6, color: accent, cursor: 'pointer', fontSize: 11, padding: '6px 12px', fontFamily: 'monospace', letterSpacing: 1 }}>
                                  FESTIVAL ↗
                                </button>
                              ) : (
                                <button onClick={(e) => { e.stopPropagation(); window.open(`/daysheet/${show.id}`, '_blank') }}
                                  style={{ background: 'none', border: `1px solid ${border}`, borderRadius: 6, color: muted, cursor: 'pointer', fontSize: 11, padding: '6px 12px', fontFamily: 'monospace', letterSpacing: 1 }}>
                                  DAY SHEET ↗
                                </button>
                              )}
                              <button onClick={(e) => { e.stopPropagation(); setSetlistShow(show); openModal('setlist', sl || { songs: [], show_id: show.id }) }}
                                style={{ background: songCount > 0 ? '#F5F0FF' : 'transparent', border: `1px solid ${songCount > 0 ? '#8B7EC6' : border}`, borderRadius: 6, color: songCount > 0 ? '#5B4B8A' : muted, cursor: 'pointer', fontSize: 11, padding: '6px 12px', fontFamily: 'monospace', letterSpacing: 1 }}>
                                {songCount > 0 ? `♪ ${songCount} songs` : '♪ SET LIST'}
                              </button>
                              <button onClick={(e) => { e.stopPropagation(); setSettlementShow(show); openModal('settlement', settlement || {}) }}
                                style={{ background: settlement ? (settlement.status === 'paid' ? '#f0fff4' : settlement.status === 'disputed' ? '#fff0f0' : '#FFF8E6') : 'transparent', border: `1px solid ${settlement ? statusColor[settlement.status] || border : border}`, borderRadius: 6, color: settlement ? statusColor[settlement.status] || muted : muted, cursor: 'pointer', fontSize: 11, padding: '6px 12px', fontFamily: 'monospace', letterSpacing: 1 }}>
                                {settlement ? `$ ${settlement.status}` : '$ SETTLE'}
                              </button>
                              <button onClick={(e) => { e.stopPropagation(); openModal('show', show) }}
                                style={{ background: 'none', border: `1px solid ${border}`, borderRadius: 6, color: muted, cursor: 'pointer', fontSize: 12, padding: '6px 12px' }}>
                                ✎ Edit
                              </button>
                              <button onClick={(e) => { e.stopPropagation(); setConfirmDelete({ table: 'shows', id: show.id, label: `${show.venue} — ${show.date}` }) }}
                                style={{ background: '#fff0f0', border: '1px solid #ffcccc', borderRadius: 6, color: '#cc0000', cursor: 'pointer', fontSize: 12, padding: '6px 12px', fontWeight: 700 }}>
                                ✕ Delete
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    )})}
                  </div>
                )}
                {travel.length > 0 && (() => {
                  const key = 'travel'
                  const collapsed = collapsedSections.has(key)
                  return (
                  <div style={{ background: card, borderRadius: 12, padding: 20, border: `1px solid ${border}` }}>
                    <div
                      onClick={() => setCollapsedSections(prev => { const n = new Set(prev); if (n.has(key)) n.delete(key); else n.add(key); return n })}
                      style={{ fontSize: 11, letterSpacing: '0.1em', color: muted, marginBottom: collapsed ? 0 : 16, textTransform: 'uppercase', fontFamily: 'monospace', cursor: 'pointer', userSelect: 'none' as const, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <span>Travel — {travel.length}</span>
                      <span style={{ transform: collapsed ? 'rotate(0deg)' : 'rotate(90deg)', transition: 'transform 0.15s', fontSize: 14 }}>›</span>
                    </div>
                    {!collapsed && travel.map((t, i) => (
                      <div key={i} style={{ padding: '10px 0', borderBottom: i < travel.length - 1 ? `1px solid ${border}` : 'none', display: 'flex', alignItems: 'center', gap: 12 }}>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                            <span style={{ fontFamily: 'monospace', fontSize: 10, color: accent, letterSpacing: '0.05em', flexShrink: 0 }}>{formatDate(t.travel_date)}</span>
                            <span style={{ fontSize: 14, fontWeight: 600 }}>{t.from_location} → {t.to_location}</span>
                          </div>
                          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginTop: 3, fontSize: 11, color: muted, fontFamily: 'monospace' }}>
                            {(t.carrier || t.travel_type) && <span>{t.carrier || t.travel_type}</span>}
                            {t.departure_time && <span>Dep {formatTime(t.departure_time)}</span>}
                            {t.arrival_time && <span>Arr {formatTime(t.arrival_time)}</span>}
                            {t.reference && <span>Ref {t.reference}</span>}
                            {t.travellers && <span>👤 {t.travellers}</span>}
                          </div>
                          {t.notes && <div style={{ fontSize: 11, color: muted, marginTop: 2, fontStyle: 'italic' }}>{t.notes}</div>}
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
                )})()}
                {accommodation.length > 0 && (() => {
                  const key = 'accommodation'
                  const collapsed = collapsedSections.has(key)
                  return (
                  <div style={{ background: card, borderRadius: 12, padding: 20, border: `1px solid ${border}` }}>
                    <div
                      onClick={() => setCollapsedSections(prev => { const n = new Set(prev); if (n.has(key)) n.delete(key); else n.add(key); return n })}
                      style={{ fontSize: 11, letterSpacing: '0.1em', color: muted, marginBottom: collapsed ? 0 : 16, textTransform: 'uppercase', fontFamily: 'monospace', cursor: 'pointer', userSelect: 'none' as const, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <span>Hotels — {accommodation.length}</span>
                      <span style={{ transform: collapsed ? 'rotate(0deg)' : 'rotate(90deg)', transition: 'transform 0.15s', fontSize: 14 }}>›</span>
                    </div>
                    {!collapsed && accommodation.map((a, i) => (
                      <div key={i} style={{ padding: '12px 0', borderBottom: i < accommodation.length - 1 ? `1px solid ${border}` : 'none', display: 'flex', alignItems: 'flex-start', gap: 12 }}>
                        <div style={{ flex: 1 }}>
                          <div style={{ fontFamily: 'monospace', fontSize: 10, letterSpacing: 1, color: accent, marginBottom: 4 }}>{formatDate(a.check_in)}{a.check_out ? ` — ${formatDate(a.check_out)}` : ''}</div>
                          <div style={{ fontWeight: 600, marginBottom: 4 }}>{a.name}</div>
                          {a.address && <div style={{ fontSize: 13, color: muted }}>{a.address}</div>}
                          {a.confirmation && <div style={{ fontSize: 12, color: muted }}>Ref: {a.confirmation}</div>}
                          {a.travellers && <div style={{ fontSize: 12, color: muted, marginTop: 2 }}>👤 {a.travellers}</div>}
                          {a.notes && <div style={{ fontSize: 12, color: muted, marginTop: 2, fontStyle: 'italic' }}>{a.notes}</div>}
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
                )})()}
                {contacts.length > 0 && (() => {
                  const key = 'contacts'
                  const collapsed = collapsedSections.has(key)
                  return (
                  <div style={{ background: card, borderRadius: 12, padding: 20, border: `1px solid ${border}` }}>
                    <div
                      onClick={() => setCollapsedSections(prev => { const n = new Set(prev); if (n.has(key)) n.delete(key); else n.add(key); return n })}
                      style={{ fontSize: 11, letterSpacing: '0.1em', color: muted, marginBottom: collapsed ? 0 : 16, textTransform: 'uppercase', fontFamily: 'monospace', cursor: 'pointer', userSelect: 'none' as const, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <span>Contacts — {contacts.length}</span>
                      <span style={{ transform: collapsed ? 'rotate(0deg)' : 'rotate(90deg)', transition: 'transform 0.15s', fontSize: 14 }}>›</span>
                    </div>
                    {!collapsed && contacts.map((c, i) => (
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
                )})()}
                {press.length > 0 && (() => {
                  const key = 'press'
                  const collapsed = collapsedSections.has(key)
                  return (
                  <div style={{ background: card, borderRadius: 12, padding: 20, border: `1px solid ${border}` }}>
                    <div
                      onClick={() => setCollapsedSections(prev => { const n = new Set(prev); if (n.has(key)) n.delete(key); else n.add(key); return n })}
                      style={{ fontSize: 11, letterSpacing: '0.1em', color: muted, marginBottom: collapsed ? 0 : 16, textTransform: 'uppercase', fontFamily: 'monospace', cursor: 'pointer', userSelect: 'none' as const, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}><span style={{ fontSize: 14 }}>📣</span>Press — {press.length}</span>
                      <span style={{ transform: collapsed ? 'rotate(0deg)' : 'rotate(90deg)', transition: 'transform 0.15s', fontSize: 14 }}>›</span>
                    </div>
                    {!collapsed && press.map((p, i) => {
                      const typeLabels: Record<string, string> = {
                        interview: 'Interview', radio: 'Radio', tv: 'TV', podcast: 'Podcast',
                        photo_shoot: 'Photo shoot', press_conference: 'Press conf.', other: 'Press'
                      }
                      const typeIcons: Record<string, string> = {
                        interview: '🎙', radio: '📻', tv: '📺', podcast: '🎧',
                        photo_shoot: '📷', press_conference: '🗞', other: '📣'
                      }
                      return (
                        <div key={i} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 0', borderBottom: i < press.length - 1 ? `1px solid ${border}` : 'none', gap: 12 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 12, flex: 1, minWidth: 0 }}>
                            <div style={{ background: '#FDF5EF', border: '1px solid #F5D9C4', borderRadius: 8, padding: '6px 10px', textAlign: 'center', minWidth: 60, flexShrink: 0 }}>
                              <div style={{ fontSize: 10, fontFamily: 'monospace', color: '#C4622D', letterSpacing: 1 }}>
                                {p.date && new Date(p.date + 'T00:00:00').toLocaleDateString('en-AU', { day: 'numeric', month: 'short' }).toUpperCase()}
                              </div>
                              {p.time && <div style={{ fontSize: 12, fontWeight: 700, color: '#C4622D', marginTop: 2 }}>{p.time.substring(0, 5)}</div>}
                            </div>
                            <div style={{ flex: 1, minWidth: 0 }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                                <span style={{ fontSize: 14 }}>{typeIcons[p.type] || '📣'}</span>
                                <span style={{ fontSize: 13, fontWeight: 600 }}>{p.outlet || typeLabels[p.type] || 'Press'}</span>
                                <span style={{ fontSize: 10, fontFamily: 'monospace', color: '#C4622D', background: '#FDF5EF', padding: '1px 6px', borderRadius: 3, letterSpacing: 1 }}>
                                  {(typeLabels[p.type] || 'PRESS').toUpperCase()}
                                </span>
                              </div>
                              <div style={{ fontSize: 11, color: muted, marginTop: 2 }}>
                                {p.location && <>📍 {p.location}</>}
                                {p.location && p.contact_name && ' · '}
                                {p.contact_name && <>👤 {p.contact_name}</>}
                              </div>
                              {p.notes && <div style={{ fontSize: 11, color: muted, marginTop: 4, fontStyle: 'italic' }}>{p.notes}</div>}
                            </div>
                          </div>
                          <div style={{ display: 'flex', gap: 4, flexShrink: 0 }}>
                            <button onClick={() => openModal('press', p)}
                              style={{ background: 'transparent', border: `1px solid ${border}`, borderRadius: 6, color: muted, cursor: 'pointer', fontSize: 12, padding: '3px 9px' }}
                              title="Edit">✎</button>
                            <button onClick={() => setConfirmDelete({ table: 'press', id: p.id, label: `${p.outlet || p.type} on ${p.date}` })}
                              style={{ background: '#fff0f0', border: '1px solid #ffcccc', borderRadius: 6, color: '#cc0000', cursor: 'pointer', fontSize: 12, padding: '3px 9px', fontWeight: 700 }}
                              title="Delete">✕</button>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                )})()}
                {documents.length > 0 && (() => {
                  const key = 'documents'
                  const collapsed = collapsedSections.has(key)
                  return (
                  <div style={{ background: card, borderRadius: 12, padding: 20, border: `1px solid ${border}` }}>
                    <div
                      onClick={() => setCollapsedSections(prev => { const n = new Set(prev); if (n.has(key)) n.delete(key); else n.add(key); return n })}
                      style={{ fontSize: 11, letterSpacing: '0.1em', color: muted, marginBottom: collapsed ? 0 : 16, textTransform: 'uppercase', fontFamily: 'monospace', cursor: 'pointer', userSelect: 'none' as const, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}><span style={{ fontSize: 14 }}>📎</span>Documents — {documents.length}</span>
                      <span style={{ transform: collapsed ? 'rotate(0deg)' : 'rotate(90deg)', transition: 'transform 0.15s', fontSize: 14 }}>›</span>
                    </div>
                    {!collapsed && (() => {
                      const byCategory = documents.reduce((acc: any, d: any) => {
                        const cat = d.category || 'other'
                        if (!acc[cat]) acc[cat] = []
                        acc[cat].push(d)
                        return acc
                      }, {})
                      const catLabels: Record<string, string> = { visa: 'Visa', tax: 'Tax', insurance: 'Insurance', contract: 'Contract', other: 'Other' }
                      const catColors: Record<string, string> = { visa: '#5B4B8A', tax: '#B8860B', insurance: '#3D6B50', contract: '#C4622D', other: '#8A8580' }
                      const catOrder = ['visa', 'tax', 'insurance', 'contract', 'other']
                      return catOrder.filter(c => byCategory[c]).map(cat => (
                        <div key={cat} style={{ marginBottom: 14 }}>
                          <div style={{ fontFamily: 'monospace', fontSize: 9, letterSpacing: 2, color: catColors[cat], marginBottom: 8, textTransform: 'uppercase' }}>
                            {catLabels[cat]}
                          </div>
                          {byCategory[cat].map((d: any, i: number) => (
                            <div key={d.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 12px', background: '#F9F6F2', borderRadius: 6, marginBottom: 4, gap: 10 }}>
                              <div style={{ flex: 1, minWidth: 0 }}>
                                <a href={d.url} target="_blank" rel="noreferrer"
                                  style={{ fontSize: 13, fontWeight: 600, color: accent, textDecoration: 'none', display: 'block', wordBreak: 'break-word' }}>
                                  {d.label} ↗
                                </a>
                                {d.notes && <div style={{ fontSize: 11, color: muted, marginTop: 2 }}>{d.notes}</div>}
                              </div>
                              <div style={{ display: 'flex', gap: 4, flexShrink: 0 }}>
                                <button onClick={() => openModal('document', d)}
                                  style={{ background: 'transparent', border: `1px solid ${border}`, borderRadius: 6, color: muted, cursor: 'pointer', fontSize: 12, padding: '3px 9px' }}
                                  title="Edit">✎</button>
                                <button onClick={() => setConfirmDelete({ table: 'tour_documents', id: d.id, label: d.label })}
                                  style={{ background: '#fff0f0', border: '1px solid #ffcccc', borderRadius: 6, color: '#cc0000', cursor: 'pointer', fontSize: 12, padding: '3px 9px', fontWeight: 700 }}
                                  title="Delete">✕</button>
                              </div>
                            </div>
                          ))}
                        </div>
                      ))
                    })()}
                  </div>
                )})()}
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
                      <div style={{ marginBottom: 12 }}>
                        <div style={{ fontSize: 11, fontFamily: 'monospace', color: muted, letterSpacing: 1, marginBottom: 6 }}>INPUT LIST</div>
                        <div style={{ fontSize: 13, lineHeight: 1.7, whiteSpace: 'pre-wrap', color: text }}>{rider.input_list}</div>
                      </div>
                    )}
                    {rider.tech_rider_url && (
                      <div>
                        <div style={{ fontSize: 11, fontFamily: 'monospace', color: muted, letterSpacing: 1, marginBottom: 6 }}>TECH RIDER DOCUMENT</div>
                        <a href={rider.tech_rider_url} target="_blank" rel="noreferrer"
                          style={{ fontSize: 13, color: accent, textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                          📄 Open tech rider ↗
                        </a>
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

            {/* AI VIEW */}
            {view === 'ai' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 0, height: 'calc(100vh - 280px)', minHeight: 400 }}>
                <style>{`.ai-msg a { color: ${accent}; }`}</style>

                {/* Messages */}
                <div style={{ flex: 1, overflowY: 'auto', padding: '4px 0 16px', display: 'flex', flexDirection: 'column', gap: 12 }}>
                  {aiMessages.length === 0 && (
                    <div style={{ padding: '20px 0' }}>
                      <div style={{ fontSize: 13, color: muted, marginBottom: 16 }}>Ask anything about this tour, or drop in a document or screenshot.</div>
                      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                        {["What's missing from this tour?", "Draft an advance email to the first venue", "Summarise the full itinerary", "Any scheduling conflicts?"].map((s, i) => (
                          <button key={i} onClick={() => sendAiMessage(s)}
                            style={{ padding: '7px 14px', background: 'transparent', border: `1px solid ${border}`, borderRadius: 20, cursor: 'pointer', fontSize: 12, color: muted, fontFamily: '"Georgia", serif' }}>
                            {s}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {aiMessages.map((msg: any, i: number) => (
                    <div key={i} style={{ display: 'flex', justifyContent: msg.role === 'user' ? 'flex-end' : 'flex-start', gap: 8 }}>
                      {msg.role === 'assistant' && (
                        <div style={{ width: 26, height: 26, borderRadius: '50%', background: '#1A1714', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', color: accent, fontSize: 11, marginTop: 2 }}>✦</div>
                      )}
                      <div style={{ maxWidth: '80%', padding: '10px 14px', borderRadius: msg.role === 'user' ? '14px 14px 4px 14px' : '14px 14px 14px 4px', background: msg.role === 'user' ? accent : card, color: msg.role === 'user' ? '#fff' : text, border: msg.role === 'assistant' ? `1px solid ${border}` : 'none', fontSize: 14, lineHeight: 1.65 }}>
                        {msg.actionsPerformed?.length > 0 && (
                          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 8 }}>
                            {msg.actionsPerformed.map((a: string, ai: number) => (
                              <div key={ai} style={{ fontSize: 10, background: '#F0FFF4', border: '1px solid #2d7a4f', borderRadius: 10, padding: '2px 8px', color: '#2d7a4f', fontFamily: 'monospace' }}>
                                ✓ {a}
                              </div>
                            ))}
                          </div>
                        )}
                        <div className="ai-msg" dangerouslySetInnerHTML={{ __html: (msg.content || '').split('\n').join('<br/>').replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>') }} />
                        {/* Save to tour button if AI extracted data */}
                        {msg.extracted && (
                          <button onClick={() => saveAiExtracted(msg.extracted)}
                            style={{ marginTop: 10, padding: '6px 14px', background: '#1A1714', color: '#F5F0E8', border: 'none', borderRadius: 6, cursor: 'pointer', fontFamily: 'monospace', fontSize: 9, letterSpacing: 2, display: 'block' }}>
                            ✦ ADD TO TOUR
                          </button>
                        )}
                      </div>
                    </div>
                  ))}

                  {aiLoading && (
                    <div style={{ display: 'flex', gap: 8 }}>
                      <div style={{ width: 26, height: 26, borderRadius: '50%', background: '#1A1714', display: 'flex', alignItems: 'center', justifyContent: 'center', color: accent, fontSize: 11 }}>✦</div>
                      <div style={{ padding: '10px 14px', borderRadius: '14px 14px 14px 4px', background: card, border: `1px solid ${border}`, display: 'flex', gap: 5, alignItems: 'center' }}>
                        {[0,1,2].map(i => <div key={i} style={{ width: 6, height: 6, borderRadius: '50%', background: muted, animation: `bounce 1.2s ease-in-out ${i*0.2}s infinite` }} />)}
                      </div>
                    </div>
                  )}
                </div>

                {/* Attachments preview */}
                {aiAttachments.length > 0 && (
                  <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', padding: '8px 0' }}>
                    {aiAttachments.map((a: any, i: number) => (
                      <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '4px 10px', background: card, border: `1px solid ${border}`, borderRadius: 20, fontSize: 12 }}>
                        <span>{a.type?.startsWith('image/') ? '🖼' : '📄'}</span>
                        <span style={{ color: text }}>{a.name}</span>
                        <button onClick={() => setAiAttachments(prev => prev.filter((_: any, j: number) => j !== i))}
                          style={{ background: 'none', border: 'none', color: muted, cursor: 'pointer', fontSize: 14, padding: 0 }}>×</button>
                      </div>
                    ))}
                  </div>
                )}

                {/* Input */}
                <div style={{ borderTop: `1px solid ${border}`, paddingTop: 12, display: 'flex', gap: 8, alignItems: 'flex-end' }}>
                  <input type="file" id="ai-file-input" multiple accept="image/*,.pdf,.doc,.docx,.txt,.csv,.xlsx"
                    style={{ display: 'none' }}
                    onChange={async e => {
                      const files = Array.from(e.target.files || []) as File[]
                      const atts = await Promise.all(files.map(async f => {
                        const base64 = await new Promise<string>((res, rej) => { const r = new FileReader(); r.onload = () => res((r.result as string).split(',')[1]); r.onerror = rej; r.readAsDataURL(f) })
                        return { name: f.name, base64, type: f.type || 'application/octet-stream' }
                      }))
                      setAiAttachments(prev => [...prev, ...atts])
                    }} />
                  <button onClick={() => document.getElementById('ai-file-input')?.click()}
                    style={{ width: 40, height: 40, background: 'transparent', border: `1px solid ${border}`, borderRadius: 8, cursor: 'pointer', color: muted, fontSize: 16, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}
                    title="Attach file or image">📎</button>
                  <textarea value={aiInput} onChange={e => setAiInput(e.target.value)}
                    onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendAiMessage() } }}
                    placeholder="Ask anything, or drop in a screenshot of a flight change, hotel confirmation..."
                    rows={2}
                    style={{ flex: 1, padding: '10px 12px', border: `1px solid ${border}`, borderRadius: 10, background: card, color: text, fontSize: 13, fontFamily: '"Georgia", serif', resize: 'none', outline: 'none', lineHeight: 1.5 }} />
                  <button onClick={() => sendAiMessage()} disabled={aiLoading || (!aiInput.trim() && aiAttachments.length === 0)}
                    style={{ width: 40, height: 40, background: (aiInput.trim() || aiAttachments.length > 0) ? accent : border, color: '#fff', border: 'none', borderRadius: 8, cursor: 'pointer', fontSize: 16, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    ↑
                  </button>
                </div>
                <style>{`@keyframes bounce { 0%,60%,100%{transform:translateY(0)} 30%{transform:translateY(-5px)} }`}</style>
              </div>
            )}

            {/* IMPORT VIEW */}
            {view === 'import' && (
              <div style={{ display: 'grid', gap: 16 }}>

                {/* Tab toggle */}
                <div style={{ display: 'flex', gap: 0, background: darkMode ? '#222' : '#EDE8DF', borderRadius: 8, padding: 3, alignSelf: 'flex-start' }}>
                  {([['drop', '⊕ Drop files'], ['paste', '⌘ Paste text']] as const).map(([t, label]) => (
                    <button key={t} onClick={() => setImportTab(t)}
                      style={{ padding: '7px 16px', borderRadius: 6, background: importTab === t ? (darkMode ? '#333' : '#fff') : 'transparent', color: importTab === t ? text : muted, border: 'none', cursor: 'pointer', fontFamily: 'monospace', fontSize: 9, letterSpacing: '0.1em', fontWeight: importTab === t ? 700 : 400, boxShadow: importTab === t ? '0 1px 3px rgba(0,0,0,0.1)' : 'none', transition: 'all 0.15s', whiteSpace: 'nowrap' as const }}>
                      {label}
                    </button>
                  ))}
                </div>

                {/* DROP TAB */}
                {importTab === 'drop' && (
                  <>
                    <div
                      onDrop={e => {
                        e.preventDefault(); setImportDragging(false)
                        const newFiles = Array.from(e.dataTransfer.files) as File[]
                        setImportJobs(prev => [...prev, ...newFiles.map(f => ({
                          id: Math.random().toString(36).slice(2), name: f.name, file: f,
                          status: 'queued' as const, result: null, error: null
                        }))])
                      }}
                      onDragOver={e => { e.preventDefault(); setImportDragging(true) }}
                      onDragLeave={() => setImportDragging(false)}
                      onClick={() => {
                        const inp = document.createElement('input')
                        inp.type = 'file'; inp.multiple = true
                        inp.accept = '.pdf,.doc,.docx,.txt,.csv,.xlsx,.xls'
                        inp.onchange = (e: any) => {
                          const newFiles = Array.from(e.target.files || []) as File[]
                          setImportJobs(prev => [...prev, ...newFiles.map(f => ({
                            id: Math.random().toString(36).slice(2), name: f.name, file: f,
                            status: 'queued' as const, result: null, error: null
                          }))])
                        }
                        inp.click()
                      }}
                      style={{ border: `2px dashed ${importDragging ? accent : border}`, borderRadius: 14, padding: '28px 24px', textAlign: 'center', cursor: 'pointer', background: importDragging ? (darkMode ? '#2a1f18' : '#FDF5EF') : card, transition: 'all 0.15s' }}>
                      <div style={{ fontSize: 26, marginBottom: 8 }}>⊕</div>
                      <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 4, color: text }}>
                        {importDragging ? 'Drop to add to queue' : 'Drop documents here'}
                      </div>
                      <div style={{ fontSize: 12, color: muted, marginBottom: 6 }}>Click to browse · Add more any time</div>
                      <div style={{ fontFamily: 'monospace', fontSize: 9, color: muted, letterSpacing: 2 }}>PDF · DOCX · XLSX · CSV · TXT</div>
                    </div>
                  </>
                )}

                {/* PASTE TAB */}
                {importTab === 'paste' && (
                  <div style={{ display: 'grid', gap: 12 }}>
                    <div style={{ background: card, borderRadius: 12, border: `1px solid ${border}`, padding: 20 }}>
                      <div style={{ fontFamily: 'monospace', fontSize: 9, letterSpacing: '0.2em', color: muted, marginBottom: 10 }}>WHAT IS THIS?</div>
                      <input
                        value={pasteLabel}
                        onChange={e => setPasteLabel(e.target.value)}
                        placeholder="e.g. EU tour email thread from Rola Music, Venue worksheet from Leeds"
                        style={{ width: '100%', padding: '10px 12px', border: `1px solid ${border}`, borderRadius: 8, background: darkMode ? '#1a1a1a' : '#F9F6F1', color: text, fontSize: 13, fontFamily: '"Georgia", serif', outline: 'none', boxSizing: 'border-box' as const, marginBottom: 12 }}
                      />
                      <div style={{ fontFamily: 'monospace', fontSize: 9, letterSpacing: '0.2em', color: muted, marginBottom: 10 }}>PASTE YOUR TEXT</div>
                      <textarea
                        value={pasteText}
                        onChange={e => setPasteText(e.target.value)}
                        placeholder="Paste email threads, booking confirmations, WhatsApp messages, promoter emails. Advance will extract shows, flights, hotels and contacts."
                        style={{ width: '100%', padding: '12px', border: `1px solid ${border}`, borderRadius: 8, background: darkMode ? '#1a1a1a' : '#F9F6F1', color: text, fontSize: 13, fontFamily: '"Georgia", serif', outline: 'none', resize: 'vertical' as const, minHeight: 200, lineHeight: 1.6, boxSizing: 'border-box' as const }}
                      />
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 12 }}>
                        <div style={{ fontSize: 12, color: muted }}>
                          {pasteText.length > 0 ? `${pasteText.length.toLocaleString()} characters` : 'Supports plain text, email threads, copied web pages'}
                        </div>
                        <button
                          onClick={() => {
                            if (!pasteText.trim()) return
                            const label = pasteLabel.trim() || 'Pasted text'
                            const file = new File([pasteText], `${label}.txt`, { type: 'text/plain' })
                            setImportJobs(prev => [...prev, {
                              id: Math.random().toString(36).slice(2),
                              name: label,
                              file,
                              status: 'queued' as const,
                              result: null,
                              error: null,
                            }])
                            setPasteText('')
                            setPasteLabel('')
                            setImportTab('drop') // switch to queue view
                          }}
                          disabled={!pasteText.trim()}
                          style={{ padding: '9px 20px', background: pasteText.trim() ? accent : border, color: '#fff', border: 'none', borderRadius: 8, cursor: pasteText.trim() ? 'pointer' : 'default', fontFamily: 'monospace', fontSize: 9, letterSpacing: '0.15em', transition: 'background 0.15s' }}>
                          ADD TO QUEUE →
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                {/* Queue — shown on drop tab when jobs exist */}
                {importJobs.length > 0 && (
                  <div style={{ background: card, borderRadius: 12, border: `1px solid ${border}`, overflow: 'hidden' }}>
                    <div style={{ padding: '12px 20px', borderBottom: `1px solid ${border}`, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <div style={{ fontFamily: 'monospace', fontSize: 10, letterSpacing: 2, color: muted }}>
                        {importJobs.filter(j => j.status === 'queued').length > 0
                          ? `${importJobs.filter(j => j.status === 'queued').length} QUEUED · READY TO PROCESS`
                          : `${importJobs.filter(j => j.status === 'done').length} PROCESSED`}
                      </div>
                      <button onClick={() => setImportJobs([])}
                        style={{ background: 'none', border: 'none', color: muted, cursor: 'pointer', fontSize: 11, fontFamily: 'monospace' }}>
                        CLEAR
                      </button>
                    </div>

                    {importJobs.map((job, i) => (
                      <div key={job.id} style={{ padding: '12px 20px', borderBottom: i < importJobs.length - 1 ? `1px solid ${border}` : 'none', display: 'flex', alignItems: 'flex-start', gap: 12 }}>
                        <span style={{ fontSize: 15, marginTop: 1, flexShrink: 0 }}>
                          {job.status === 'queued' && <span style={{ color: muted }}>○</span>}
                          {job.status === 'parsing' && <span style={{ color: accent }}>✦</span>}
                          {job.status === 'done' && <span style={{ color: '#2d7a4f' }}>✓</span>}
                          {job.status === 'error' && <span style={{ color: '#C00' }}>✕</span>}
                        </span>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontSize: 13, fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' as const }}>{job.name}</div>
                          {job.status === 'queued' && <div style={{ fontSize: 11, color: muted, fontFamily: 'monospace', letterSpacing: 1, marginTop: 2 }}>Waiting...</div>}
                          {job.status === 'parsing' && <div style={{ fontSize: 11, color: accent, fontFamily: 'monospace', letterSpacing: 1, marginTop: 2 }}>Processing...</div>}
                          {job.status === 'done' && job.result && (
                            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' as const, marginTop: 6 }}>
                              {[['shows','🎵'],['travel','✈️'],['accommodation','🏨'],['contacts','👤']].map(([key, icon]) => {
                                const r = job.result[key]
                                if (!r) return null
                                const parts = []
                                if (r.added > 0) parts.push(`+${r.added}`)
                                if (r.updated > 0) parts.push(`↑${r.updated}`)
                                if (parts.length === 0) return null
                                return <div key={key} style={{ fontSize: 11, background: darkMode ? '#2a2a2a' : '#F5F0E8', borderRadius: 5, padding: '2px 8px', color: text }}>{icon} {parts.join(' ')}</div>
                              })}
                            </div>
                          )}
                          {job.status === 'error' && <div style={{ fontSize: 11, color: '#C00', fontFamily: 'monospace', marginTop: 2 }}>{job.error}</div>}
                        </div>
                        {job.status === 'queued' && (
                          <button onClick={() => setImportJobs(prev => prev.filter(j => j.id !== job.id))}
                            style={{ background: 'none', border: 'none', color: muted, cursor: 'pointer', fontSize: 16, padding: 0, flexShrink: 0 }}>×</button>
                        )}
                      </div>
                    ))}

                    {importJobs.some(j => j.status === 'queued') && (
                      <div style={{ padding: '14px 20px', borderTop: `1px solid ${border}`, background: darkMode ? '#222' : '#FAFAF8' }}>
                        <button onClick={async () => {
                          const queued = importJobs.filter(j => j.status === 'queued')
                          for (const job of queued) {
                            await processImportFile(job.file)
                          }
                        }}
                          style={{ width: '100%', padding: '12px', background: '#1A1714', color: '#F5F0E8', border: 'none', borderRadius: 8, cursor: 'pointer', fontFamily: 'monospace', fontSize: 10, letterSpacing: 3 }}>
                          ✦ PROCESS {importJobs.filter(j => j.status === 'queued').length} DOCUMENT{importJobs.filter(j => j.status === 'queued').length !== 1 ? 'S' : ''}
                        </button>
                        <div style={{ textAlign: 'center', marginTop: 8, fontSize: 11, color: muted }}>
                          Merges with existing tour data — no duplicates
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {importJobs.some(j => j.status === 'done') && warnings.filter(w => !dismissedWarnings.has(w)).length === 0 && (
                  <div style={{ background: darkMode ? '#0a2a1a' : '#F0FFF4', border: `1px solid #2d7a4f`, borderRadius: 10, padding: '14px 18px', textAlign: 'center' }}>
                    <div style={{ fontSize: 14, color: '#2d7a4f', fontWeight: 600 }}>✓ No gaps detected</div>
                  </div>
                )}
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
                      <div key={day}
                        onClick={() => hasAnything && setCalPopover({ date: dateStr, shows: dayShows, travel: dayTravel, accom: dayAccom })}
                        onDoubleClick={() => hasAnything && router.push(`/day?tourId=${selectedTour?.id}&date=${dateStr}`)}
                        title={hasAnything ? 'Click for details · Double-click for full day view' : ''}
                        style={{ minHeight: 80, padding: '6px 8px', borderRight: col < 6 ? `1px solid ${border}` : 'none', borderBottom: `1px solid ${border}`, background: hasAnything ? (darkMode ? '#2a2218' : '#fffaf4') : 'transparent', cursor: hasAnything ? 'pointer' : 'default', transition: 'background 0.1s' }}>
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

            {/* Calendar day popover */}
            {calPopover && (
              <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}
                onClick={() => setCalPopover(null)}>
                <div style={{ background: card, borderRadius: 16, padding: 0, width: '100%', maxWidth: 420, boxShadow: '0 16px 48px rgba(0,0,0,0.2)', overflow: 'hidden' }}
                  onClick={e => e.stopPropagation()}>
                  <div style={{ padding: '16px 20px', borderBottom: `1px solid ${border}`, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div style={{ fontFamily: '"Playfair Display", Georgia, serif', fontSize: 17, fontWeight: 700 }}>{formatDate(calPopover.date)}</div>
                    <button onClick={() => setCalPopover(null)} style={{ background: 'none', border: 'none', color: muted, cursor: 'pointer', fontSize: 20, lineHeight: 1 }}>x</button>
                  </div>
                  <div style={{ padding: '12px 20px', borderBottom: `1px solid ${border}`, display: 'flex', justifyContent: 'flex-end' }}>
                    <button onClick={() => { setCalPopover(null); router.push(`/day?tourId=${selectedTour?.id}&date=${calPopover?.date}`) }}
                      style={{ padding: '6px 14px', background: accent, color: '#fff', border: 'none', borderRadius: 6, cursor: 'pointer', fontFamily: 'monospace', fontSize: 9, letterSpacing: '0.15em' }}>
                      FULL DAY VIEW
                    </button>
                  </div>
                  <div style={{ padding: '16px 20px', display: 'grid', gap: 14, maxHeight: '70vh', overflowY: 'auto' }}>
                    {calPopover.shows.map((show, i) => (
                      <div key={i} style={{ padding: '12px 14px', background: darkMode ? '#2a1f18' : '#FDF5EF', borderLeft: `3px solid ${accent}`, borderRadius: 8 }}>
                        <div style={{ fontFamily: 'monospace', fontSize: 9, letterSpacing: 2, color: accent, marginBottom: 6 }}>SHOW</div>
                        <div style={{ fontWeight: 600, fontSize: 15, marginBottom: 4 }}>{show.venue}</div>
                        {show.city && <div style={{ fontSize: 13, color: muted, marginBottom: 4 }}>{show.city}{show.country ? `, ${show.country}` : ''}</div>}
                        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', fontSize: 12, color: muted }}>
                          {show.doors_time && <span>Doors {formatTime(show.doors_time)}</span>}
                          {show.soundcheck_time && <span>SC {formatTime(show.soundcheck_time)}</span>}
                          {show.set_time && <span style={{ color: accent, fontWeight: 600 }}>Stage {formatTime(show.set_time)}</span>}
                        </div>
                        {show.catering && <div style={{ fontSize: 12, color: muted, marginTop: 6 }}>🍽 {show.catering}</div>}
                        {show.backline && <div style={{ fontSize: 12, color: muted, marginTop: 4 }}>🎸 {show.backline}</div>}
                        {show.notes && <div style={{ fontSize: 12, color: muted, marginTop: 4, fontStyle: 'italic' }}>{show.notes}</div>}
                      </div>
                    ))}
                    {calPopover.travel.map((t, i) => (
                      <div key={i} style={{ padding: '12px 14px', background: darkMode ? '#1a2a3a' : '#EEF4FB', borderLeft: '3px solid #4a8ab4', borderRadius: 8 }}>
                        <div style={{ fontFamily: 'monospace', fontSize: 9, letterSpacing: 2, color: '#4a8ab4', marginBottom: 6 }}>{(t.travel_type || 'TRAVEL').toUpperCase()}</div>
                        <div style={{ fontWeight: 600, fontSize: 15, marginBottom: 4 }}>{t.from_location} → {t.to_location}</div>
                        {t.carrier && <div style={{ fontSize: 13, color: muted, marginBottom: 4 }}>{t.carrier}{t.reference ? ` · Ref: ${t.reference}` : ''}</div>}
                        <div style={{ display: 'flex', gap: 12, fontSize: 12, color: muted }}>
                          {t.departure_time && <span>Dep {formatTime(t.departure_time)}</span>}
                          {t.arrival_time && <span>Arr {formatTime(t.arrival_time)}</span>}
                        </div>
                        {t.travellers && <div style={{ fontSize: 12, marginTop: 6, color: muted }}>👤 {t.travellers}</div>}
                        {t.notes && <div style={{ fontSize: 12, color: muted, marginTop: 4, fontStyle: 'italic' }}>{t.notes}</div>}
                      </div>
                    ))}
                    {calPopover.accom.map((a, i) => (
                      <div key={i} style={{ padding: '12px 14px', background: darkMode ? '#1a2a1a' : '#EEF7EE', borderLeft: '3px solid #4a8a4a', borderRadius: 8 }}>
                        <div style={{ fontFamily: 'monospace', fontSize: 9, letterSpacing: 2, color: '#4a8a4a', marginBottom: 6 }}>HOTEL CHECK-IN</div>
                        <div style={{ fontWeight: 600, fontSize: 15, marginBottom: 4 }}>{a.name}</div>
                        {a.address && <div style={{ fontSize: 13, color: muted, marginBottom: 4 }}>{a.address}</div>}
                        <div style={{ fontSize: 12, color: muted }}>
                          Check in {formatDate(a.check_in)}{a.check_out ? ` · Check out ${formatDate(a.check_out)}` : ''}
                        </div>
                        {a.confirmation && <div style={{ fontSize: 12, color: muted, marginTop: 4 }}>Ref: {a.confirmation}</div>}
                        {a.notes && <div style={{ fontSize: 12, color: muted, marginTop: 4, fontStyle: 'italic' }}>{a.notes}</div>}
                      </div>
                    ))}
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

function TourStarter({ artistId, darkMode, onCreated }: { artistId: string, darkMode: boolean, onCreated: (tour: any) => void }) {
  const [tourName, setTourName] = useState('')
  const [creating, setCreating] = useState(false)
  const [error, setError] = useState('')
  const bg = darkMode ? '#1a1a1a' : '#F4EFE6'
  const card = darkMode ? '#2a2a2a' : '#fff'
  const text = darkMode ? '#e8e0d0' : '#1A1714'
  const muted = darkMode ? '#888' : '#8A8580'
  const border = darkMode ? '#333' : '#DDD8CE'
  const accent = '#C4622D'

  async function createTour() {
    if (!tourName.trim()) return
    setCreating(true)
    setError('')
    try {
      const { data: { user }, error: authError } = await supabase.auth.getUser()
      if (authError || !user) throw new Error('Not logged in')
      const { data: profile } = await supabase.from('profiles').select('org_id').eq('id', user.id).single()
      const { data: tour, error: insertError } = await supabase.from('tours')
        .insert({ name: tourName.trim(), artist_id: artistId, org_id: profile?.org_id })
        .select().single()
      if (insertError) throw insertError
      if (tour) onCreated(tour)
    } catch (err: any) {
      setError(err.message || 'Failed to create tour')
      setCreating(false)
    }
  }

  return (
    <div style={{ maxWidth: 560, margin: '40px auto 0', padding: '0 16px' }}>
      <style>{`.drop-zone:hover { border-color: ${accent} !important; } .drop-zone.active { border-color: ${accent} !important; background: ${darkMode ? '#2a1f18' : '#FDF5EF'} !important; }`}</style>

      {/* Step 1 - Name the tour */}
      <div style={{ background: card, borderRadius: 14, padding: 28, border: `1px solid ${border}`, marginBottom: 12 }}>
        <div style={{ fontFamily: 'monospace', fontSize: 9, letterSpacing: '0.25em', color: muted, marginBottom: 16, textTransform: 'uppercase' }}>
          Start a new tour
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <input
            value={tourName}
            onChange={e => setTourName(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && createTour()}
            placeholder="e.g. Hamer Hall NAIDOC 2025, East Coast Run..."
            autoFocus
            style={{ flex: 1, padding: '12px 14px', border: `1px solid ${border}`, borderRadius: 8, background: bg, color: text, fontSize: 14, fontFamily: '"Georgia", serif', outline: 'none' }}
          />
          <button onClick={createTour} disabled={creating || !tourName.trim()}
            style={{ padding: '12px 20px', background: tourName.trim() ? accent : border, color: '#fff', border: 'none', borderRadius: 8, cursor: tourName.trim() ? 'pointer' : 'default', fontFamily: 'monospace', fontSize: 10, letterSpacing: '0.15em', whiteSpace: 'nowrap', transition: 'background 0.15s' }}>
            {creating ? '...' : 'CREATE →'}
          </button>
        </div>
        {error && <div style={{ marginTop: 8, fontSize: 12, color: '#C00', fontFamily: 'monospace' }}>{error}</div>}
        <div style={{ marginTop: 10, fontSize: 12, color: muted, lineHeight: 1.6 }}>
          Once created, drop in any docs your agent sends — itinerary, contracts, hotel bookings. Advance builds the tour as you go.
        </div>
      </div>

      {/* Visual hint of what comes next */}
      <div style={{ background: darkMode ? '#1e1e1e' : '#FAF7F2', borderRadius: 14, padding: 24, border: `2px dashed ${border}`, textAlign: 'center', opacity: 0.5 }}>
        <div style={{ fontSize: 28, marginBottom: 8 }}>⊕</div>
        <div style={{ fontSize: 13, color: muted }}>Drop zone unlocks after naming the tour</div>
        <div style={{ fontFamily: 'monospace', fontSize: 10, color: muted, letterSpacing: '0.15em', marginTop: 6 }}>PDF · DOCX · XLSX · CSV</div>
      </div>
    </div>
  )
}
