'use client'

import { useEffect, useState, useCallback, useRef } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'

const supabase = createClient()

// Load SheetJS dynamically
async function loadXLSX(): Promise<any> {
  if ((window as any).XLSX) return (window as any).XLSX
  return new Promise((resolve, reject) => {
    const script = document.createElement('script')
    script.src = 'https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js'
    script.onload = () => resolve((window as any).XLSX)
    script.onerror = reject
    document.head.appendChild(script)
  })
}

function detectPerShowBudget(data: any[][]): boolean {
  for (let i = 0; i < Math.min(10, data.length); i++) {
    const count = data[i].filter((c: any) => String(c ?? '').toUpperCase().includes('SHOW DAY')).length
    if (count >= 3) return true
  }
  return false
}

function parsePerShowBudget(data: any[][], sheetName: string): string {
  const lines: string[] = [`\n=== ${sheetName} (Per-Show Budget) ===\n`]

  // Find the row that has SHOW DAY repeated
  let dayTypeRow = -1
  for (let i = 0; i < Math.min(10, data.length); i++) {
    if (data[i].filter((c: any) => String(c ?? '').toUpperCase().includes('SHOW DAY')).length >= 3) {
      dayTypeRow = i; break
    }
  }
  if (dayTypeRow < 0) dayTypeRow = 5

  // Row above has day numbers, rows below have month, city, venue
  const numRow = dayTypeRow - 1
  const monthRow = dayTypeRow + 1
  const cityRow = dayTypeRow + 3
  const venueRow = dayTypeRow + 4

  // Find show columns
  const showCols: number[] = []
  for (let col = 0; col < data[dayTypeRow].length; col++) {
    if (String(data[dayTypeRow][col] ?? '').toUpperCase().includes('SHOW DAY')) showCols.push(col)
  }

  lines.push(`Found ${showCols.length} shows\n`)

  const skipLabels = ['BAND/CODE','TOUR NAME','DATE','DAY','INCOME','EXPENSES','COST OF SALES',
    'PROMOTER','BAND WAGES','CREW WAGES','PER DIEMS','PRODUCTION','TRAVEL BAND','TRAVEL CREW',
    'SUPPORTS','OTHER','PAYMENTS','COMMISSIONS','BAND PAYMENTS','MARKETING','GROSS PROFIT',
    'TOTAL EXPENSES','TOTAL COSTS','NET PROFIT','CONTINGENCY','PERFORMANCE INCOME']

  for (const col of showCols) {
    const num = data[numRow]?.[col] ?? ''
    const month = data[monthRow]?.[col] ?? ''
    const city = data[cityRow]?.[col] ?? ''
    const venue = data[venueRow]?.[col] ?? ''

    const cleanCity = String(city).trim()
    const cleanVenue = String(venue).trim()
    const cleanNum = String(num).replace('.0','')
    const cleanMonth = String(month)

    if (!cleanCity || cleanCity === 'CITY') continue

    lines.push(`\nSHOW: ${cleanNum} ${cleanMonth} | ${cleanCity} | ${cleanVenue}`)

    for (let row = 0; row < data.length; row++) {
      const label = String(data[row]?.[1] ?? '').trim()
      const value = data[row]?.[col]

      if (!label || value === null || value === undefined || value === '') continue
      if (typeof value === 'string' && (value.startsWith('=') || value.trim() === '0')) continue
      if (typeof value === 'number' && value === 0) continue
      if (skipLabels.some(s => label.toUpperCase().includes(s))) continue
      if (label.length < 3) continue

      lines.push(`  ${label}: ${value}`)
    }
  }
  return lines.join('\n')
}

async function parseFileToText(file: File): Promise<string> {
  const ext = file.name.split('.').pop()?.toLowerCase()
  if (ext === 'csv' || ext === 'txt') return await file.text()

  if (ext === 'xlsx' || ext === 'xls') {
    const XLSX = await loadXLSX()
    const buffer = await file.arrayBuffer()
    const wb = XLSX.read(buffer, { type: 'array' })
    const parts: string[] = []

    for (const sheetName of wb.SheetNames) {
      const lower = sheetName.toLowerCase().replace(/[^a-z]/g,'')
      if (lower.includes('schedule') || lower.includes('transport') || lower.includes('accom')) continue

      const ws = wb.Sheets[sheetName]
      const data: any[][] = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '' })
      if (data.length === 0) continue

      if (detectPerShowBudget(data)) {
        parts.push(parsePerShowBudget(data, sheetName))
      } else {
        parts.push(`\n=== ${sheetName} ===`)
        for (const row of data) {
          const cells = row.map((c: any) => String(c ?? '').trim()).filter(Boolean)
          if (cells.length >= 2) parts.push(cells.slice(0, 8).join(' | '))
        }
      }
    }
    return parts.join('\n')
  }
  return await file.text()
}

export default function BudgetImportPage() {
  const params = useParams()
  const router = useRouter()
  const [artist, setArtist] = useState<any>(null)
  const [tours, setTours] = useState<any[]>([])
  const [selectedTourId, setSelectedTourId] = useState('')
  const [dragging, setDragging] = useState(false)
  const [processing, setProcessing] = useState(false)
  const [processingMsg, setProcessingMsg] = useState('Reading budget...')
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
        setProcessingMsg('Reading PDF...')
        const base64 = await new Promise<string>((res, rej) => {
          const reader = new FileReader()
          reader.onload = () => res((reader.result as string).split(',')[1])
          reader.onerror = rej
          reader.readAsDataURL(file)
        })
        body.pdf_base64 = base64
      } else {
        setProcessingMsg('Parsing spreadsheet...')
        const text = await parseFileToText(file)
        body.text = text
        body.filename = file.name
      }

      setProcessingMsg('Processing...')
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
    setProcessingMsg('Extracting...')
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

      await supabase.from('expenses').delete().eq('tour_id', selectedTourId)
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

  const expensesByCategory = (result?.expenses || []).reduce((acc: any, e: any) => {
    const cat = e.category || 'other'
    if (!acc[cat]) acc[cat] = []
    acc[cat].push(e)
    return acc
  }, {})

  const categoryLabels: Record<string, string> = {
    flights: 'Flights', accommodation: 'Accommodation', ground_transport: 'Ground Transport',
    per_diem: 'Per Diems', gear: 'Gear', marketing: 'Marketing', crew: 'Crew', other: 'Other'
  }

  return (
    <div style={{ background: bg, minHeight: '100vh', fontFamily: 'Georgia, serif', color: text }}>
      <div style={{ background: darkMode ? '#111' : '#1A1714', padding: '14px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <button onClick={() => router.back()} style={{ fontFamily: 'monospace', fontSize: 9, letterSpacing: 2, color: '#8A8580', background: 'transparent', border: '1px solid #2A2520', borderRadius: 4, padding: '6px 10px', cursor: 'pointer' }}>← BACK</button>
          <span style={{ fontSize: 18, fontStyle: 'italic', color: '#F5F0E8' }}>{artist?.name}</span>
          <span style={{ fontFamily: 'monospace', fontSize: 9, letterSpacing: 2, color: accent }}>BUDGET IMPORT</span>
        </div>
        <button onClick={() => setDarkMode(!darkMode)} style={{ background: 'none', border: '1px solid #333', borderRadius: 6, padding: '6px 10px', color: '#F5F0E8', cursor: 'pointer', fontSize: 12 }}>{darkMode ? '☀️' : '🌙'}</button>
      </div>

      <div style={{ maxWidth: 760, margin: '0 auto', padding: '32px 16px' }}>

        <div style={{ marginBottom: 24 }}>
          <div style={{ fontFamily: 'monospace', fontSize: 9, letterSpacing: 3, color: muted, marginBottom: 8 }}>SELECT TOUR</div>
          <select value={selectedTourId} onChange={e => setSelectedTourId(e.target.value)} style={inputStyle}>
            {tours.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
          </select>
        </div>

        {!result && !processing && (
          <>
            <div onDrop={onDrop} onDragOver={e => { e.preventDefault(); setDragging(true) }} onDragLeave={() => setDragging(false)} onClick={() => fileInputRef.current?.click()}
              style={{ border: `2px dashed ${dragging ? accent : border}`, borderRadius: 16, padding: '48px 24px', textAlign: 'center', cursor: 'pointer', background: dragging ? '#FDF5EF' : card, marginBottom: 16, transition: 'all 0.15s' }}>
              <input ref={fileInputRef} type="file" accept=".pdf,.csv,.xlsx,.xls,.txt" style={{ display: 'none' }} onChange={e => { if (e.target.files?.[0]) processFile(e.target.files[0]) }} />
              <div style={{ fontSize: 36, marginBottom: 12 }}>💰</div>
              <div style={{ fontSize: 16, fontWeight: 600, marginBottom: 8 }}>Drop your tour budget here</div>
              <div style={{ fontSize: 13, color: muted, marginBottom: 4 }}>Supports per-show spreadsheets, flat budgets, PDFs</div>
              <div style={{ fontFamily: 'monospace', fontSize: 10, color: muted, letterSpacing: 2, marginTop: 12 }}>XLSX · CSV · PDF · TXT</div>
            </div>
            <div style={{ textAlign: 'center', marginBottom: 16, color: muted, fontSize: 13 }}>or</div>
            {showPaste ? (
              <div style={{ background: card, borderRadius: 12, padding: 20, border: `1px solid ${border}` }}>
                <textarea value={pasteText} onChange={e => setPasteText(e.target.value)} placeholder="Paste budget data here..." rows={8} style={{ ...inputStyle, resize: 'vertical', minHeight: 160, lineHeight: 1.6 }} />
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
            <div style={{ fontSize: 16, color: text, marginBottom: 8 }}>{processingMsg}</div>
            <div style={{ fontSize: 13 }}>This may take a moment for large spreadsheets</div>
          </div>
        )}

        {error && <div style={{ background: '#FEE', border: '1px solid #FCC', borderRadius: 8, padding: '12px 16px', marginBottom: 20, fontSize: 13, color: '#C00', fontFamily: 'monospace' }}>{error}</div>}

        {result && !imported && (
          <div style={{ display: 'grid', gap: 16 }}>
            {result.summary && (
              <div style={{ background: card, borderRadius: 12, padding: 20, border: `1px solid ${border}` }}>
                <div style={{ fontFamily: 'monospace', fontSize: 9, letterSpacing: 3, color: muted, marginBottom: 8 }}>EXTRACTED</div>
                <div style={{ fontSize: 14, color: text, lineHeight: 1.6 }}>{result.summary}</div>
              </div>
            )}

            {result.settlements?.filter((s: any) => s.agreed_amount > 0).length > 0 && (
              <div style={{ background: card, borderRadius: 12, border: `1px solid ${border}`, overflow: 'hidden' }}>
                <div style={{ background: '#1A1714', padding: '10px 20px', display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ fontFamily: 'monospace', fontSize: 9, letterSpacing: 3, color: '#F5F0E8' }}>SHOW FEES</span>
                  <span style={{ fontFamily: 'monospace', fontSize: 9, color: accent }}>{result.settlements.filter((s: any) => s.agreed_amount > 0).length} SHOWS</span>
                </div>
                <div style={{ padding: '4px 20px' }}>
                  {result.settlements.filter((s: any) => s.agreed_amount > 0).map((s: any, i: number) => (
                    <div key={i} style={{ padding: '12px 0', borderBottom: `1px solid ${border}`, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12 }}>
                      <div>
                        <div style={{ fontSize: 13, fontWeight: 600 }}>{s.venue || s.notes || 'Show'}</div>
                        <div style={{ fontSize: 11, color: muted, fontFamily: 'monospace', letterSpacing: 1, marginTop: 2 }}>{s.deal_type?.toUpperCase()}{s.date ? ` · ${s.date}` : ''}</div>
                      </div>
                      <div style={{ fontSize: 16, fontWeight: 700, whiteSpace: 'nowrap' }}>{s.currency} {Number(s.agreed_amount).toLocaleString()}</div>
                    </div>
                  ))}
                  <div style={{ display: 'flex', justifyContent: 'space-between', padding: '12px 0', fontWeight: 700 }}>
                    <span>Total</span>
                    <span style={{ color: '#2d7a4f' }}>{result.settlements[0]?.currency || 'AUD'} {result.settlements.reduce((s: number, x: any) => s + Number(x.agreed_amount || 0), 0).toLocaleString()}</span>
                  </div>
                </div>
              </div>
            )}

            {result.expenses?.length > 0 && (
              <div style={{ background: card, borderRadius: 12, border: `1px solid ${border}`, overflow: 'hidden' }}>
                <div style={{ background: '#1A1714', padding: '10px 20px', display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ fontFamily: 'monospace', fontSize: 9, letterSpacing: 3, color: '#F5F0E8' }}>EXPENSES</span>
                  <span style={{ fontFamily: 'monospace', fontSize: 9, color: accent }}>{result.expenses.length} ITEMS</span>
                </div>
                <div style={{ padding: '4px 20px' }}>
                  {Object.entries(expensesByCategory).map(([cat, items]: [string, any]) => (
                    <div key={cat}>
                      <div style={{ padding: '10px 0 4px', fontFamily: 'monospace', fontSize: 9, letterSpacing: 2, color: accent }}>{(categoryLabels[cat] || cat).toUpperCase()} ({items.length})</div>
                      {items.map((e: any, i: number) => (
                        <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '7px 0', borderBottom: `1px solid ${border}`, gap: 12 }}>
                          <div style={{ fontSize: 13 }}>{e.description}</div>
                          <div style={{ fontSize: 13, fontWeight: 600, color: '#C00', whiteSpace: 'nowrap' }}>{e.currency} {Number(e.amount || 0).toLocaleString()}</div>
                        </div>
                      ))}
                    </div>
                  ))}
                  <div style={{ display: 'flex', justifyContent: 'space-between', padding: '12px 0', fontWeight: 700, borderTop: `2px solid ${border}`, marginTop: 4 }}>
                    <span>Total expenses</span>
                    <span style={{ color: '#C00' }}>{result.expenses[0]?.currency || 'AUD'} {result.expenses.reduce((s: number, e: any) => s + Number(e.amount || 0), 0).toLocaleString()}</span>
                  </div>
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
            <div style={{ fontSize: 16 }}>Budget imported - redirecting...</div>
          </div>
        )}
      </div>
    </div>
  )
}
