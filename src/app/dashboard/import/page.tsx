'use client'

import { useState, useRef, useCallback, useEffect } from 'react'
import { createClient } from '@/lib/supabase'
import { useRouter } from 'next/navigation'

const supabase = createClient()

type FileStatus = 'queued' | 'reading' | 'parsing' | 'done' | 'error'

interface FileJob {
  id: string
  file: File
  status: FileStatus
  error?: string
  result?: any
}

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => {
      const result = reader.result as string
      // Strip the data URL prefix
      resolve(result.split(',')[1])
    }
    reader.onerror = reject
    reader.readAsDataURL(file)
  })
}

function fileToText(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result as string)
    reader.onerror = reject
    reader.readAsText(file)
  })
}

async function extractWordText(file: File): Promise<string> {
  // Dynamic import mammoth only when needed
  const mammoth = await import('mammoth')
  const arrayBuffer = await file.arrayBuffer()
  const result = await mammoth.extractRawText({ arrayBuffer })
  return result.value
}

async function extractExcelText(file: File): Promise<string> {
  const XLSX = await import('xlsx')
  const arrayBuffer = await file.arrayBuffer()
  const workbook = XLSX.read(arrayBuffer, { type: 'array' })
  const lines: string[] = []
  for (const sheetName of workbook.SheetNames) {
    const sheet = workbook.Sheets[sheetName]
    const csv = XLSX.utils.sheet_to_csv(sheet)
    if (csv.trim()) {
      lines.push('Sheet: ' + sheetName)
      lines.push(csv)
    }
  }
  return lines.join('\n\n')
}

export default function ImportPage() {
  const router = useRouter()
  const [artists, setArtists] = useState<any[]>([])
  const [jobs, setJobs] = useState<FileJob[]>([])
  const [dragging, setDragging] = useState(false)
  const [darkMode, setDarkMode] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Review/import state
  const [reviewing, setReviewing] = useState(false)
  const [selectedArtistId, setSelectedArtistId] = useState('')
  const [tourName, setTourName] = useState('')
  const [importing, setImporting] = useState(false)
  const [importError, setImportError] = useState('')
  const [imported, setImported] = useState(false)
  const [importMode, setImportMode] = useState<'new' | 'existing'>('new')
  const [tours, setTours] = useState<any[]>([])
  const [selectedTourId, setSelectedTourId] = useState('')

  useEffect(() => {
    supabase.from('artists').select('*').order('name').then(({ data }) => setArtists(data || []))
  }, [])

  useEffect(() => {
    if (selectedArtistId) {
      supabase.from('tours').select('*').eq('artist_id', selectedArtistId).order('start_date', { ascending: false })
        .then(({ data }) => {
          setTours(data || [])
          setSelectedTourId(data?.[0]?.id || '')
        })
    } else {
      setTours([])
      setSelectedTourId('')
    }
  }, [selectedArtistId])

  function updateJob(id: string, updates: Partial<FileJob>) {
    setJobs(prev => prev.map(j => j.id === id ? { ...j, ...updates } : j))
  }

  async function processFile(job: FileJob) {
    updateJob(job.id, { status: 'reading' })
    try {
      const ext = job.file.name.split('.').pop()?.toLowerCase()
      let body: any = { filename: job.file.name }

      if (ext === 'pdf') {
        const base64 = await fileToBase64(job.file)
        body.pdf_base64 = base64
      } else if (ext === 'docx' || ext === 'doc') {
        const text = await extractWordText(job.file)
        body.text = text
      } else if (ext === 'xlsx' || ext === 'xls') {
        const text = await extractExcelText(job.file)
        body.text = text
      } else {
        // txt, md, csv, etc
        const text = await fileToText(job.file)
        body.text = text
      }

      updateJob(job.id, { status: 'parsing' })

      const res = await fetch('/api/parse-document', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      const data = await res.json()
      if (!data.success) throw new Error(data.error)

      updateJob(job.id, { status: 'done', result: data.data })
    } catch (err: any) {
      updateJob(job.id, { status: 'error', error: err.message })
    }
  }

  async function addFiles(files: File[]) {
    const allowed = files.filter(f => {
      const ext = f.name.split('.').pop()?.toLowerCase()
      return ['pdf', 'doc', 'docx', 'txt', 'md', 'csv', 'xlsx', 'xls'].includes(ext || '')
    })
    if (!allowed.length) return

    const newJobs: FileJob[] = allowed.map(file => ({
      id: Math.random().toString(36).slice(2),
      file,
      status: 'queued',
    }))

    setJobs(prev => [...prev, ...newJobs])
    setReviewing(false)
    setImported(false)

    // Process sequentially to avoid hammering the API
    for (const job of newJobs) {
      await processFile(job)
    }
  }

  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setDragging(false)
    addFiles(Array.from(e.dataTransfer.files))
  }, [])

  const onDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setDragging(true)
  }, [])

  const onDragLeave = useCallback(() => setDragging(false), [])

  function mergeResults() {
    const merged: any = { shows: [], travel: [], accommodation: [], contacts: [], personnel: [] }
    for (const job of jobs) {
      if (job.result) {
        for (const key of Object.keys(merged)) {
          if (job.result[key]?.length) merged[key].push(...job.result[key])
        }
      }
    }
    return merged
  }

  const allDone = jobs.length > 0 && jobs.every(j => j.status === 'done' || j.status === 'error')
  const anyResults = jobs.some(j => j.status === 'done' && j.result)
  const merged = mergeResults()

  async function handleImport() {
    if (!selectedArtistId) { setImportError('Select an artist'); return }
    if (importMode === 'new' && !tourName) { setImportError('Enter a tour name'); return }
    if (importMode === 'existing' && !selectedTourId) { setImportError('Select a tour'); return }
    setImporting(true)
    setImportError('')
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Not logged in')
      const { data: profile } = await supabase.from('profiles').select('org_id').eq('id', user.id).single()
      if (!profile) throw new Error('No profile found')
      const org_id = profile.org_id

      let tourId: string
      if (importMode === 'existing') {
        tourId = selectedTourId
      } else {
        const { data: tour, error: tourError } = await supabase
          .from('tours').insert({ name: tourName, artist_id: selectedArtistId, org_id }).select().single()
        if (tourError) throw tourError
        tourId = tour.id
      }

      if (merged.shows?.length) await supabase.from('shows').insert(merged.shows.map((s: any) => ({ ...s, tour_id: tourId, org_id })))
      if (merged.travel?.length) await supabase.from('travel').insert(merged.travel.map((t: any) => ({ ...t, tour_id: tourId, org_id })))
      if (merged.accommodation?.length) await supabase.from('accommodation').insert(merged.accommodation.map((a: any) => ({ ...a, tour_id: tourId, org_id })))
      if (merged.contacts?.length) await supabase.from('contacts').insert(merged.contacts.map((c: any) => ({ ...c, tour_id: tourId, org_id })))
      if (merged.personnel?.length) await supabase.from('personnel').insert(merged.personnel.map((p: any) => ({ ...p, tour_id: tourId, org_id })))

      setImported(true)
      setTimeout(() => router.push(`/dashboard/artists/${selectedArtistId}`), 1200)
    } catch (err: any) {
      setImportError(err.message)
    } finally {
      setImporting(false)
    }
  }

  const bg = darkMode ? '#1a1a1a' : '#F5F0E8'
  const card = darkMode ? '#2a2a2a' : '#fff'
  const text = darkMode ? '#e8e0d0' : '#1A1714'
  const muted = darkMode ? '#888' : '#8A8580'
  const border = darkMode ? '#333' : '#DDD8CE'
  const accent = '#C4622D'

  function statusIcon(status: FileStatus) {
    if (status === 'queued') return <span style={{ color: muted }}>○</span>
    if (status === 'reading') return <span style={{ color: accent }}>◌</span>
    if (status === 'parsing') return <span style={{ color: accent, animation: 'spin 1s linear infinite', display: 'inline-block' }}>✦</span>
    if (status === 'done') return <span style={{ color: '#3D6B50' }}>✓</span>
    if (status === 'error') return <span style={{ color: '#C00' }}>✕</span>
  }

  function statusLabel(job: FileJob) {
    if (job.status === 'queued') return 'Queued'
    if (job.status === 'reading') return 'Reading...'
    if (job.status === 'parsing') return 'Processing...'
    if (job.status === 'done') {
      const r = job.result || {}
      const parts = []
      if (r.shows?.length) parts.push(`${r.shows.length} show${r.shows.length > 1 ? 's' : ''}`)
      if (r.travel?.length) parts.push(`${r.travel.length} travel`)
      if (r.accommodation?.length) parts.push(`${r.accommodation.length} hotel${r.accommodation.length > 1 ? 's' : ''}`)
      if (r.contacts?.length) parts.push(`${r.contacts.length} contact${r.contacts.length > 1 ? 's' : ''}`)
      return parts.length ? parts.join(' · ') : 'No data found'
    }
    if (job.status === 'error') return job.error || 'Failed'
  }

  const inputStyle = {
    width: '100%', padding: '10px 12px', border: `1px solid ${border}`,
    borderRadius: 6, fontSize: 13, fontFamily: 'Georgia, serif',
    color: text, background: bg, outline: 'none', boxSizing: 'border-box' as const,
  }

  return (
    <div style={{ minHeight: '100vh', background: bg, fontFamily: 'Georgia, serif', color: text, transition: 'background 0.2s' }}>
      <style>{`@keyframes spin { from { transform: rotate(0deg) } to { transform: rotate(360deg) } }`}</style>

      {/* Header */}
      <div style={{ background: darkMode ? '#111' : '#1A1714', padding: '16px 32px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <button onClick={() => router.push('/dashboard')} style={{ fontFamily: 'monospace', fontSize: 9, letterSpacing: 2, color: '#8A8580', background: 'transparent', border: '1px solid #2A2520', borderRadius: 4, padding: '6px 12px', cursor: 'pointer' }}>← ROSTER</button>
          <span style={{ fontSize: 20, fontStyle: 'italic', color: '#F5F0E8' }}>Import Documents</span>
          <span style={{ fontFamily: 'monospace', fontSize: 9, letterSpacing: 2, color: accent }}>✦</span>
        </div>
        <button onClick={() => setDarkMode(!darkMode)} style={{ background: 'none', border: '1px solid #333', borderRadius: 6, padding: '6px 12px', color: '#F5F0E8', cursor: 'pointer', fontSize: 12 }}>
          {darkMode ? '☀️ Light' : '🌙 Dark'}
        </button>
      </div>

      <div style={{ maxWidth: 720, margin: '0 auto', padding: '32px 24px' }}>

        {/* Drop zone */}
        <div
          onDrop={onDrop} onDragOver={onDragOver} onDragLeave={onDragLeave}
          onClick={() => fileInputRef.current?.click()}
          style={{
            border: `2px dashed ${dragging ? accent : border}`,
            borderRadius: 16, padding: '48px 24px', textAlign: 'center',
            cursor: 'pointer', background: dragging ? (darkMode ? '#2a1f18' : '#FDF5EF') : card,
            transition: 'all 0.15s', marginBottom: 28,
          }}>
          <input ref={fileInputRef} type="file" multiple accept=".pdf,.doc,.docx,.txt,.md,.csv,.xlsx,.xls"
            style={{ display: 'none' }} onChange={e => addFiles(Array.from(e.target.files || []))} />
          <div style={{ fontSize: 36, marginBottom: 12 }}>📂</div>
          <div style={{ fontSize: 16, fontWeight: 600, marginBottom: 8 }}>
            {dragging ? 'Drop files here' : 'Drop documents here'}
          </div>
          <div style={{ fontSize: 13, color: muted, marginBottom: 4 }}>or click to browse</div>
          <div style={{ fontFamily: 'monospace', fontSize: 10, color: muted, letterSpacing: 2, marginTop: 12 }}>
            PDF · DOCX · XLSX · CSV · TXT · Multiple files OK
          </div>
        </div>

        {/* File list */}
        {jobs.length > 0 && (
          <div style={{ background: card, borderRadius: 12, border: `1px solid ${border}`, overflow: 'hidden', marginBottom: 24 }}>
            {jobs.map((job, i) => (
              <div key={job.id} style={{
                padding: '14px 18px', display: 'flex', alignItems: 'center', gap: 14,
                borderBottom: i < jobs.length - 1 ? `1px solid ${border}` : 'none',
              }}>
                <span style={{ fontSize: 16 }}>{statusIcon(job.status)}</span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 13, fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{job.file.name}</div>
                  <div style={{ fontSize: 11, fontFamily: 'monospace', color: job.status === 'error' ? '#C00' : job.status === 'done' ? '#3D6B50' : muted, marginTop: 2, letterSpacing: 1 }}>
                    {statusLabel(job)}
                  </div>
                </div>
                <div style={{ fontSize: 11, color: muted, fontFamily: 'monospace', flexShrink: 0 }}>
                  {(job.file.size / 1024).toFixed(0)}KB
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Add more button */}
        {jobs.length > 0 && (
          <button onClick={() => fileInputRef.current?.click()}
            style={{ marginBottom: 24, padding: '8px 16px', background: 'transparent', color: muted, border: `1px solid ${border}`, borderRadius: 8, cursor: 'pointer', fontFamily: 'monospace', fontSize: 10, letterSpacing: 2 }}>
            + ADD MORE FILES
          </button>
        )}

        {/* Results summary + import form */}
        {allDone && anyResults && (
          <div style={{ background: card, borderRadius: 12, border: `1px solid ${border}`, padding: 24 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 20 }}>
              <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#3D6B50' }} />
              <div style={{ fontFamily: 'monospace', fontSize: 10, letterSpacing: 2, color: '#3D6B50' }}>
                EXTRACTION COMPLETE
              </div>
            </div>

            {/* Combined totals */}
            <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginBottom: 24 }}>
              {[
                ['🎵', 'Shows', merged.shows?.length],
                ['✈️', 'Travel', merged.travel?.length],
                ['🏨', 'Hotels', merged.accommodation?.length],
                ['👤', 'Contacts', merged.contacts?.length],
              ].filter(([,, n]) => n > 0).map(([icon, label, n]) => (
                <div key={label as string} style={{ background: bg, borderRadius: 8, padding: '10px 16px', textAlign: 'center', minWidth: 70 }}>
                  <div style={{ fontSize: 18, marginBottom: 2 }}>{icon}</div>
                  <div style={{ fontSize: 18, fontWeight: 700 }}>{n}</div>
                  <div style={{ fontFamily: 'monospace', fontSize: 9, color: muted, letterSpacing: 1 }}>{label as string}</div>
                </div>
              ))}
            </div>

            {/* Assign to */}
            <div style={{ fontFamily: 'monospace', fontSize: 9, letterSpacing: 3, color: muted, marginBottom: 12 }}>ASSIGN TO</div>

            {/* Artist */}
            <div style={{ marginBottom: 12 }}>
              <div style={{ fontFamily: 'monospace', fontSize: 9, letterSpacing: 2, color: muted, marginBottom: 6 }}>ARTIST</div>
              <select value={selectedArtistId} onChange={e => setSelectedArtistId(e.target.value)} style={inputStyle}>
                <option value="">Select artist...</option>
                {artists.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
              </select>
            </div>

            {/* New vs existing tour toggle */}
            {selectedArtistId && (
              <>
                <div style={{ display: 'flex', gap: 0, marginBottom: 12, border: `1px solid ${border}`, borderRadius: 8, overflow: 'hidden' }}>
                  {(['new', 'existing'] as const).map(mode => (
                    <button key={mode} onClick={() => setImportMode(mode)}
                      style={{ flex: 1, padding: '9px', background: importMode === mode ? accent : 'transparent', color: importMode === mode ? '#fff' : muted, border: 'none', cursor: 'pointer', fontFamily: 'monospace', fontSize: 9, letterSpacing: 2 }}>
                      {mode === 'new' ? '+ NEW TOUR' : 'ADD TO EXISTING'}
                    </button>
                  ))}
                </div>

                {importMode === 'new' ? (
                  <div style={{ marginBottom: 12 }}>
                    <div style={{ fontFamily: 'monospace', fontSize: 9, letterSpacing: 2, color: muted, marginBottom: 6 }}>TOUR NAME</div>
                    <input value={tourName} onChange={e => setTourName(e.target.value)} placeholder="e.g. EU Tour 2026" style={inputStyle} />
                  </div>
                ) : (
                  <div style={{ marginBottom: 12 }}>
                    <div style={{ fontFamily: 'monospace', fontSize: 9, letterSpacing: 2, color: muted, marginBottom: 6 }}>SELECT TOUR</div>
                    {tours.length === 0 ? (
                      <div style={{ fontSize: 12, color: muted, padding: '10px 0' }}>No tours yet for this artist — create a new one instead.</div>
                    ) : (
                      <select value={selectedTourId} onChange={e => setSelectedTourId(e.target.value)} style={inputStyle}>
                        {tours.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                      </select>
                    )}
                  </div>
                )}
              </>
            )}

            {importError && <div style={{ background: '#FEE', borderRadius: 6, padding: '10px 14px', marginBottom: 14, fontSize: 12, color: '#C00', fontFamily: 'monospace' }}>{importError}</div>}

            {imported ? (
              <div style={{ padding: 16, textAlign: 'center', color: '#3D6B50', fontFamily: 'monospace', fontSize: 11, letterSpacing: 2 }}>✓ IMPORTED — REDIRECTING...</div>
            ) : (
              <button onClick={handleImport} disabled={importing || !selectedArtistId || !tourName}
                style={{ width: '100%', padding: 14, background: importing ? muted : '#1A1714', color: '#F5F0E8', border: 'none', borderRadius: 8, fontFamily: 'monospace', fontSize: 10, letterSpacing: 3, cursor: importing || !selectedArtistId || !tourName ? 'not-allowed' : 'pointer', opacity: !selectedArtistId || !tourName ? 0.5 : 1 }}>
                {importing ? 'IMPORTING...' : `✦ IMPORT ${jobs.filter(j => j.status === 'done').length} DOCUMENT${jobs.filter(j => j.status === 'done').length > 1 ? 'S' : ''}`}
              </button>
            )}
          </div>
        )}

        {/* Paste fallback */}
        {jobs.length === 0 && (
          <div style={{ textAlign: 'center', marginTop: 8 }}>
            <div style={{ color: muted, fontSize: 13, marginBottom: 12 }}>or paste text directly</div>
            <button onClick={() => router.push('/dashboard/import/paste')}
              style={{ padding: '8px 20px', background: 'transparent', color: muted, border: `1px solid ${border}`, borderRadius: 8, cursor: 'pointer', fontFamily: 'monospace', fontSize: 10, letterSpacing: 2 }}>
              PASTE TEXT
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
