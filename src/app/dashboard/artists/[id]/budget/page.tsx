'use client'

import { useEffect, useState, useCallback, useRef } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'

const supabase = createClient()

export default function BudgetImportPage() {
  const params = useParams()
  const router = useRouter()
  const [artist, setArtist] = useState<any>(null)
  const [tours, setTours] = useState<any[]>([])
  const [selectedTourId, setSelectedTourId] = useState('')
  const [dragging, setDragging] = useState(false)
  const [processing, setProcessing] = useState(false)
  const [result, setResult] = useState<any>(null)
  const [importing, setImporting] = useState(false)
  const [imported, setImported] = useState(false)
  const [error, setError] = useState('')
  const [darkMode, setDarkMode] = useState(false)
  const [pasteText, setPasteText] = useState('')
  const [showPaste, setShowPaste] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => { loadData() }, [params.id])

  async function loadData() {
    const { data: artistData } = await supabase.from('artists').select('*').eq('id', params.id).single()
    setArtist(artistData)
    const { data: toursData } = await supabase.from('tours').select('*').eq('artist_id', params.id).order('start_date')
    setTours(toursData || [])
    if (toursData?.length) setSelectedTourId(toursData[0].id)
  }

  async function processFile(file: File) {
    if (!selectedTourId) { setError('Select a tour first'); return }
    setProcessing(true)
    setError('')
    setResult(null)
    try {
      const ext = file.name.split('.').pop()?.toLowerCase()
      let body: any = { tourId: selectedTourId }

      if (ext === 'pdf') {
        const base64 = await new Promise<string>((res, rej) => {
          const reader = new FileReader()
          reader.onload = () => res((reader.result as string).split(',')[1])
          reader.onerror = rej
          reader.readAsDataURL(file)
        })
        body.pdf_base64 = base64
      } else {
        const text = await file.text()
        body.text = text
      }

      const response = await fetch('/api/import-budget', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      const data = await response.json()
      if (!data.success) throw new Error(data.error)
      setResult(data.data)
    } catch (err: any) {
      setError(err.message)
    }
    setProcessing(false)
  }

  async function processPaste() {
    if (!selectedTourId || !pasteText.trim()) return
    setProcessing(true)
    setError('')
    setResult(null)
    try {
      const response = await fetch('/api/import-budget', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tourId: selectedTourId, text: pasteText }),
      })
      const data = await response.json()
      if (!data.success) throw new Error(data.error)
      setResult(data.data)
      setShowPaste(false)
    } catch (err: any) {
      setError(err.message)
    }
    setProcessing(false)
  }

  async function handleImport() {
    if (!result || !selectedTourId) return
    setImporting(true)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Not logged in')
      const { data: profile } = await supabase.from('profiles').select('org_id').eq('id', user.id).single()
      const org_id = profile?.org_id

      // Import settlements
      if (result.settlements?.length) {
        for (const s of result.settlements) {
          if (!s.show_id) continue
          const existing = await supabase.from('settlements').select('id').eq('show_id', s.show_id).single()
          if (existing.data) {
            await supabase.from('settlements').update({ deal_type: s.deal_type, agreed_amount: s.agreed_amount, currency: s.currency, notes: s.notes }).eq('id', existing.data.id)
          } else {
            await supabase.from('settlements').insert({ ...s, tour_id: selectedTourId, org_id, status: 'pending' })
          }
        }
      }

      // Import expenses
      if (result.expenses?.length) {
        await supabase.from('expenses').insert(result.expenses.map((e: any) => ({ ...e, tour_id: selectedTourId, org_id })))
      }

      setImported(true)
      setTimeout(() => router.push(`/dashboard/artists/${params.id}`), 1500)
    } catch (err: any) {
      setError(err.message)
    }
    setImporting(false)
  }

  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setDragging(false)
    const file = e.dataTransfer.files[0]
    if (file) processFile(file)
  }, [selectedTourId])

  const bg = darkMode ? '#1a1a1a' : '#F5F0E8'
  const card = darkMode ? '#2a2a2a' : '#fff'
  const text = darkMode ? '#e8e0d0' : '#1A1714'
  const muted = darkMode ? '#888' : '#8A8580'
  const border = darkMode ? '#333' : '#DDD8CE'
  const accent = '#C4622D'
  const inputStyle = { width: '100%', padding: '10px 12px', border: `1px solid ${border}`, borderRadius: 8, background: bg, color: text, fontSize: 14, fontFamily: 'Georgia, serif', outline: 'none', boxSizing: 'border-box' as const }

  return (
    <div style={{ background: bg, minHeight: '100vh', fontFamily: 'Georgia, serif', color: text }}>
      <div style={{ background: darkMode ? '#111' : '#1A1714', padding: '14px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <button onClick={() => router.back()} style={{ fontFamily: 'monospace', fontSize: 9, letterSpacing: 2, color: '#8A8580', background: 'transparent', border: '1px solid #2A2520', borderRadius: 4, padding: '6px 10px', cursor: 'pointer' }}>← BACK</button>
          <span style={{ fontSize: 18, fontStyle: 'italic', color: '#F5F0E8' }}>{artist?.name}</span>
          <span style={{ fontFamily: 'monospace', fontSize: 9, letterSpacing: 2, color: accent }}>BUDGET IMPORT</span>
        </div>
        <button onClick={() => setDarkMode(!darkMode)} style={{ background: 'none', border: '1px solid #333', borderRadius: 6, padding: '6px 10px', color: '#F5F0E8', cursor: 'pointer', fontSize: 12 }}>
          {darkMode ? '☀️' : '🌙'}
        </button>
      </div>

      <div style={{ maxWidth: 720, margin: '0 auto', padding: '32px 16px' }}>

        {/* Tour selector */}
        <div style={{ marginBottom: 24 }}>
          <div style={{ fontFamily: 'monospace', fontSize: 9, letterSpacing: 3, color: muted, marginBottom: 8 }}>SELECT TOUR</div>
          <select value={selectedTourId} onChange={e => setSelectedTourId(e.target.value)} style={inputStyle}>
            {tours.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
          </select>
        </div>

        {!result && !processing && (
          <>
            {/* Drop zone */}
            <div
              onDrop={onDrop}
              onDragOver={e => { e.preventDefault(); setDragging(true) }}
              onDragLeave={() => setDragging(false)}
              onClick={() => fileInputRef.current?.click()}
              style={{ border: `2px dashed ${dragging ? accent : border}`, borderRadius: 16, padding: '48px 24px', textAlign: 'center', cursor: 'pointer', background: dragging ? (darkMode ? '#2a1f18' : '#FDF5EF') : card, marginBottom: 16, transition: 'all 0.15s' }}>
              <input ref={fileInputRef} type="file" accept=".pdf,.csv,.xlsx,.xls,.txt" style={{ display: 'none' }} onChange={e => { if (e.target.files?.[0]) processFile(e.target.files[0]) }} />
              <div style={{ fontSize: 36, marginBottom: 12 }}>💰</div>
              <div style={{ fontSize: 16, fontWeight: 600, marginBottom: 8 }}>Drop your tour budget here</div>
              <div style={{ fontSize: 13, color: muted, marginBottom: 4 }}>or click to browse</div>
              <div style={{ fontFamily: 'monospace', fontSize: 10, color: muted, letterSpacing: 2, marginTop: 12 }}>PDF · CSV · XLSX · TXT</div>
            </div>

            <div style={{ textAlign: 'center', marginBottom: 16, color: muted, fontSize: 13 }}>or</div>

            {showPaste ? (
              <div style={{ background: card, borderRadius: 12, padding: 20, border: `1px solid ${border}` }}>
                <textarea value={pasteText} onChange={e => setPasteText(e.target.value)} placeholder="Paste budget data here — spreadsheet rows, email with fees, any format..." rows={8} style={{ ...inputStyle, resize: 'vertical', minHeight: 160, lineHeight: 1.6 }} />
                <div style={{ display: 'flex', gap: 10, marginTop: 12 }}>
                  <button onClick={() => setShowPaste(false)} style={{ padding: '10px 20px', background: 'transparent', color: muted, border: `1px solid ${border}`, borderRadius: 8, cursor: 'pointer', fontSize: 13 }}>Cancel</button>
                  <button onClick={processPaste} disabled={!pasteText.trim()} style={{ flex: 1, padding: '10px', background: accent, color: '#fff', border: 'none', borderRadius: 8, cursor: 'pointer', fontFamily: 'monospace', fontSize: 10, letterSpacing: 2 }}>✦ EXTRACT</button>
                </div>
              </div>
            ) : (
              <button onClick={() => setShowPaste(true)} style={{ width: '100%', padding: '12px', background: 'transparent', color: muted, border: `1px solid ${border}`, borderRadius: 12, cursor: 'pointer', fontFamily: 'monospace', fontSize: 10, letterSpacing: 2 }}>PASTE BUDGET DATA</button>
            )}
          </>
        )}

        {processing && (
          <div style={{ textAlign: 'center', padding: '60px 20px', color: muted }}>
            <div style={{ fontSize: 32, marginBottom: 16 }}>✦</div>
            <div style={{ fontSize: 16, color: text, marginBottom: 8 }}>Reading budget...</div>
            <div style={{ fontSize: 13 }}>Matching fees to shows and extracting expenses</div>
          </div>
        )}

        {error && <div style={{ background: '#FEE', border: '1px solid #FCC', borderRadius: 8, padding: '12px 16px', marginBottom: 20, fontSize: 13, color: '#C00', fontFamily: 'monospace' }}>{error}</div>}

        {result && !imported && (
          <div style={{ display: 'grid', gap: 20 }}>
            {result.summary && (
              <div style={{ background: card, borderRadius: 12, padding: 20, border: `1px solid ${border}` }}>
                <div style={{ fontFamily: 'monospace', fontSize: 9, letterSpacing: 3, color: muted, marginBottom: 8 }}>EXTRACTED</div>
                <div style={{ fontSize: 14, color: text }}>{result.summary}</div>
              </div>
            )}

            {result.settlements?.filter((s: any) => s.show_id).length > 0 && (
              <div style={{ background: card, borderRadius: 12, padding: 20, border: `1px solid ${border}` }}>
                <div style={{ fontFamily: 'monospace', fontSize: 9, letterSpacing: 3, color: muted, marginBottom: 16 }}>SHOW FEES — {result.settlements.filter((s: any) => s.show_id).length}</div>
                {result.settlements.filter((s: any) => s.show_id).map((s: any, i: number) => (
                  <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 0', borderBottom: `1px solid ${border}`, flexWrap: 'wrap', gap: 8 }}>
                    <div>
                      <div style={{ fontSize: 13, fontWeight: 600 }}>{s.deal_type || 'Guarantee'}</div>
                      {s.notes && <div style={{ fontSize: 12, color: muted }}>{s.notes}</div>}
                    </div>
                    <div style={{ fontSize: 16, fontWeight: 700 }}>{s.currency || 'AUD'} ${(s.agreed_amount || 0).toLocaleString()}</div>
                  </div>
                ))}
                <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 12, fontWeight: 700 }}>
                  <span>Total fees</span>
                  <span>${result.settlements.filter((s: any) => s.show_id).reduce((sum: number, s: any) => sum + (s.agreed_amount || 0), 0).toLocaleString()}</span>
                </div>
              </div>
            )}

            {result.expenses?.length > 0 && (
              <div style={{ background: card, borderRadius: 12, padding: 20, border: `1px solid ${border}` }}>
                <div style={{ fontFamily: 'monospace', fontSize: 9, letterSpacing: 3, color: muted, marginBottom: 16 }}>EXPENSES — {result.expenses.length}</div>
                {result.expenses.map((e: any, i: number) => (
                  <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 0', borderBottom: i < result.expenses.length - 1 ? `1px solid ${border}` : 'none', flexWrap: 'wrap', gap: 8 }}>
                    <div>
                      <div style={{ fontSize: 13 }}>{e.description}</div>
                      <div style={{ fontSize: 11, color: muted, fontFamily: 'monospace', letterSpacing: 1 }}>{e.category}</div>
                    </div>
                    <div style={{ fontSize: 14, fontWeight: 600, color: '#C00' }}>{e.currency || 'AUD'} ${(e.amount || 0).toLocaleString()}</div>
                  </div>
                ))}
                <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 12, fontWeight: 700, color: '#C00' }}>
                  <span>Total expenses</span>
                  <span>${result.expenses.reduce((sum: number, e: any) => sum + (e.amount || 0), 0).toLocaleString()}</span>
                </div>
              </div>
            )}

            <div style={{ display: 'flex', gap: 10 }}>
              <button onClick={() => { setResult(null); setPasteText('') }} style={{ padding: '12px 20px', background: 'transparent', color: muted, border: `1px solid ${border}`, borderRadius: 8, cursor: 'pointer', fontSize: 13 }}>← Try again</button>
              <button onClick={handleImport} disabled={importing} style={{ flex: 1, padding: '12px', background: '#1A1714', color: '#F5F0E8', border: 'none', borderRadius: 8, cursor: 'pointer', fontFamily: 'monospace', fontSize: 10, letterSpacing: 3 }}>
                {importing ? 'IMPORTING...' : '✦ IMPORT TO TOUR'}
              </button>
            </div>
          </div>
        )}

        {imported && (
          <div style={{ textAlign: 'center', padding: '60px 20px', color: '#2d7a4f' }}>
            <div style={{ fontSize: 32, marginBottom: 12 }}>✓</div>
            <div style={{ fontSize: 16 }}>Budget imported — redirecting...</div>
          </div>
        )}
      </div>
    </div>
  )
}
