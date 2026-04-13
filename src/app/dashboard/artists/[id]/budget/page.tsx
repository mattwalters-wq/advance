'use client'

import { useEffect, useState, useCallback, useRef } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'

const supabase = createClient()

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
    if (data[i].filter((c: any) => String(c ?? '').toUpperCase().includes('SHOW DAY')).length >= 3) return true
  }
  return false
}

function parsePerShowBudget(data: any[][], sheetName: string): string {
  const lines: string[] = [`\n=== ${sheetName} (Per-Show Budget) ===\n`]
  let dayTypeRow = -1
  for (let i = 0; i < Math.min(10, data.length); i++) {
    if (data[i].filter((c: any) => String(c ?? '').toUpperCase().includes('SHOW DAY')).length >= 3) { dayTypeRow = i; break }
  }
  if (dayTypeRow < 0) dayTypeRow = 5
  const numRow = dayTypeRow - 1
  const monthRow = dayTypeRow + 1
  const cityRow = dayTypeRow + 3
  const venueRow = dayTypeRow + 4
  const showCols: number[] = []
  for (let col = 0; col < data[dayTypeRow].length; col++) {
    if (String(data[dayTypeRow][col] ?? '').toUpperCase().includes('SHOW DAY')) showCols.push(col)
  }
  lines.push(`Found ${showCols.length} shows\n`)
  const skipLabels = ['BAND/CODE','TOUR NAME','DATE','DAY','INCOME','EXPENSES','COST OF SALES','PROMOTER',
    'BAND WAGES','CREW WAGES','PER DIEMS','PRODUCTION','TRAVEL BAND','TRAVEL CREW','SUPPORTS','OTHER',
    'PAYMENTS','COMMISSIONS','BAND PAYMENTS','MARKETING','GROSS PROFIT','TOTAL EXPENSES','TOTAL COSTS',
    'NET PROFIT','CONTINGENCY','PERFORMANCE INCOME']
  for (const col of showCols) {
    const num = String(data[numRow]?.[col] ?? '').replace('.0','')
    const month = String(data[monthRow]?.[col] ?? '')
    const city = String(data[cityRow]?.[col] ?? '').trim()
    const venue = String(data[venueRow]?.[col] ?? '').trim()
    if (!city || city === 'CITY') continue
    lines.push(`\nSHOW: ${num} ${month} | ${city} | ${venue}`)
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

const CATEGORY_LABELS: Record<string, string> = {
  flights: 'Flights', accommodation: 'Accommodation', ground_transport: 'Ground Transport',
  per_diem: 'Per Diems', gear: 'Gear', marketing: 'Marketing', crew: 'Crew', other: 'Other'
}

const CATEGORY_COLORS: Record<string, string> = {
  flights: '#4A7FA5', accommodation: '#7A5EA5', ground_transport: '#5EA57A',
  per_diem: '#A5875E', gear: '#A55E5E', marketing: '#5E8EA5', crew: '#8EA55E', other: '#8A8580'
}

export default function BudgetPage() {
  const params = useParams()
  const router = useRouter()
  const [artist, setArtist] = useState<any>(null)
  const [tours, setTours] = useState<any[]>([])
  const [selectedTourId, setSelectedTourId] = useState('')
  const [shows, setShows] = useState<any[]>([])
  const [settlements, setSettlements] = useState<any[]>([])
  const [expenses, setExpenses] = useState<any[]>([])
  const [view, setView] = useState<'overview' | 'shows' | 'expenses' | 'import'>('overview')
  const [darkMode, setDarkMode] = useState(false)
  const [dragging, setDragging] = useState(false)
  const [processing, setProcessing] = useState(false)
  const [processingMsg, setProcessingMsg] = useState('Processing...')
  const [importResult, setImportResult] = useState<any>(null)
  const [importing, setImporting] = useState(false)
  const [imported, setImported] = useState(false)
  const [error, setError] = useState('')
  const [pasteText, setPasteText] = useState('')
  const [showPaste, setShowPaste] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => { loadArtist() }, [params.id])
  useEffect(() => { if (selectedTourId) loadBudget(selectedTourId) }, [selectedTourId])

  async function loadArtist() {
    const { data: artistData } = await supabase.from('artists').select('*').eq('id', params.id).single()
    setArtist(artistData)
    const { data: toursData } = await supabase.from('tours').select('*').eq('artist_id', params.id).order('start_date')
    setTours(toursData || [])
    if (toursData?.length) setSelectedTourId(toursData[0].id)
  }

  async function loadBudget(tourId: string) {
    const [showsRes, settlementsRes, expensesRes] = await Promise.all([
      supabase.from('shows').select('*').eq('tour_id', tourId).order('date'),
      supabase.from('settlements').select('*').eq('tour_id', tourId),
      supabase.from('expenses').select('*').eq('tour_id', tourId),
    ])
    setShows(showsRes.data || [])
    setSettlements(settlementsRes.data || [])
    setExpenses(expensesRes.data || [])
  }

  const hasBudget = settlements.length > 0 || expenses.length > 0

  // Derived totals
  const totalFees = settlements.reduce((s, x) => s + (parseFloat(x.agreed_amount) || 0), 0)
  const totalExpenses = expenses.reduce((s, x) => s + (parseFloat(x.amount) || 0), 0)
  const netPosition = totalFees - totalExpenses

  const expensesByCategory = expenses.reduce((acc: any, e: any) => {
    const cat = e.category || 'other'
    if (!acc[cat]) acc[cat] = []
    acc[cat].push(e)
    return acc
  }, {})

  // Per-show view data
  const showsWithData = shows.map(show => {
    const settlement = settlements.find(s => s.show_id === show.id)
    const showExpenses = expenses.filter(e => e.show_id === show.id)
    const expenseTotal = showExpenses.reduce((s, e) => s + (parseFloat(e.amount) || 0), 0)
    return { ...show, settlement, showExpenses, expenseTotal }
  })

  async function processFile(file: File) {
    if (!selectedTourId) { setError('Select a tour first'); return }
    setProcessing(true)
    setError('')
    setImportResult(null)
    setImported(false)
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
        body.text = await parseFileToText(file)
        body.filename = file.name
      }
      setProcessingMsg('Extracting data...')
      const response = await fetch('/api/import-budget', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
      const data = await response.json()
      if (!data.success) throw new Error(data.error)
      setImportResult(data.data)
    } catch (err: any) { setError(err.message) }
    setProcessing(false)
  }

  async function processPaste() {
    if (!selectedTourId || !pasteText.trim()) return
    setProcessing(true)
    setProcessingMsg('Extracting...')
    setError('')
    setImportResult(null)
    try {
      const response = await fetch('/api/import-budget', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ tourId: selectedTourId, text: pasteText }) })
      const data = await response.json()
      if (!data.success) throw new Error(data.error)
      setImportResult(data.data)
      setShowPaste(false)
    } catch (err: any) { setError(err.message) }
    setProcessing(false)
  }

  async function handleImport() {
    if (!importResult || !selectedTourId) return
    setImporting(true)
    setError('')
    try {
      const { data: { user } } = await supabase.auth.getUser()
      const { data: profile } = await supabase.from('profiles').select('org_id').eq('id', user!.id).single()
      const org_id = profile?.org_id

      if (importResult.settlements?.length) {
        for (const s of importResult.settlements) {
          if (!s.show_id) continue
          const existing = await supabase.from('settlements').select('id').eq('show_id', s.show_id).single()
          if (existing.data) {
            const { error } = await supabase.from('settlements').update({ deal_type: s.deal_type, agreed_amount: s.agreed_amount, currency: s.currency, notes: s.notes }).eq('id', existing.data.id)
            if (error) throw new Error(`Settlement update failed: ${error.message}`)
          } else {
            const { error } = await supabase.from('settlements').insert({ ...s, tour_id: selectedTourId, org_id, status: 'pending' })
            if (error) throw new Error(`Settlement insert failed: ${error.message}`)
          }
        }
      }

      const { error: delError } = await supabase.from('expenses').delete().eq('tour_id', selectedTourId)
      if (delError) throw new Error(`Expenses delete failed: ${delError.message}`)

      if (importResult.expenses?.length) {
        const { error: insError } = await supabase.from('expenses').insert(
          importResult.expenses.map((e: any) => ({ ...e, tour_id: selectedTourId, org_id }))
        )
        if (insError) throw new Error(`Expenses insert failed: ${insError.message}`)
      }

      setImported(true)
      setImportResult(null)
      setPasteText('')
      await loadBudget(selectedTourId)
      setView('overview')
    } catch (err: any) {
      setError(err.message)
      console.error('Budget import error:', err)
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
  const green = '#2d7a4f'
  const red = '#C00'
  const inputStyle = { width: '100%', padding: '10px 12px', border: `1px solid ${border}`, borderRadius: 8, background: bg, color: text, fontSize: 14, fontFamily: 'Georgia, serif', outline: 'none', boxSizing: 'border-box' as const }

  function fmtDate(d: string) {
    return new Date(d + 'T00:00:00').toLocaleDateString('en-AU', { day: 'numeric', month: 'short' })
  }

  function fmtAmount(amount: any, currency = 'AUD') {
    const n = parseFloat(amount) || 0
    return `${currency} ${n.toLocaleString('en-AU', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`
  }

  const primaryCurrency = settlements[0]?.currency || expenses[0]?.currency || 'AUD'

  return (
    <div style={{ background: bg, minHeight: '100vh', fontFamily: 'Georgia, serif', color: text }}>

      {/* Header */}
      <div style={{ background: darkMode ? '#111' : '#1A1714', padding: '14px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', position: 'sticky', top: 0, zIndex: 10 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <button onClick={() => router.back()} style={{ fontFamily: 'monospace', fontSize: 9, letterSpacing: 2, color: '#8A8580', background: 'transparent', border: '1px solid #2A2520', borderRadius: 4, padding: '6px 10px', cursor: 'pointer' }}>← BACK</button>
          <span style={{ fontSize: 18, fontStyle: 'italic', color: '#F5F0E8' }}>{artist?.name}</span>
          <span style={{ fontFamily: 'monospace', fontSize: 9, letterSpacing: 2, color: accent }}>BUDGET</span>
        </div>
        <button onClick={() => setDarkMode(!darkMode)} style={{ background: 'none', border: '1px solid #333', borderRadius: 6, padding: '6px 10px', color: '#F5F0E8', cursor: 'pointer', fontSize: 12 }}>{darkMode ? '☀️' : '🌙'}</button>
      </div>

      <div style={{ maxWidth: 860, margin: '0 auto', padding: '24px 16px' }}>

        {/* Tour selector + tabs */}
        <div style={{ display: 'flex', gap: 12, marginBottom: 24, alignItems: 'center', flexWrap: 'wrap' }}>
          <select value={selectedTourId} onChange={e => setSelectedTourId(e.target.value)}
            style={{ padding: '8px 12px', border: `1px solid ${border}`, borderRadius: 8, background: card, color: text, fontSize: 14, fontFamily: 'Georgia, serif', outline: 'none', minWidth: 200 }}>
            {tours.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
          </select>
          <div style={{ display: 'flex', gap: 4, flex: 1 }}>
            {(['overview', 'shows', 'expenses', 'import'] as const).map(v => (
              <button key={v} onClick={() => setView(v)}
                style={{ padding: '8px 14px', background: view === v ? accent : card, color: view === v ? '#fff' : muted, border: `1px solid ${view === v ? accent : border}`, borderRadius: 8, cursor: 'pointer', fontFamily: 'monospace', fontSize: 9, letterSpacing: 2, textTransform: 'uppercase' }}>
                {v === 'import' ? '+ Import' : v}
              </button>
            ))}
          </div>
        </div>

        {/* ── OVERVIEW ── */}
        {view === 'overview' && (
          <div style={{ display: 'grid', gap: 16 }}>
            {imported && (
              <div style={{ background: '#f0fff4', border: '1px solid #9be9c0', borderRadius: 10, padding: '12px 20px', color: green, fontSize: 13, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span>✓ Budget imported successfully</span>
                <button onClick={() => setImported(false)} style={{ background: 'none', border: 'none', color: green, cursor: 'pointer', fontSize: 16, lineHeight: 1 }}>×</button>
              </div>
            )}
            {!hasBudget ? (
              <div style={{ background: card, borderRadius: 16, border: `1px solid ${border}`, padding: '48px 24px', textAlign: 'center' }}>
                <div style={{ fontSize: 36, marginBottom: 12 }}>💰</div>
                <div style={{ fontSize: 20, fontWeight: 600, marginBottom: 8 }}>No budget data yet</div>
                <div style={{ fontSize: 14, color: muted, marginBottom: 24 }}>Drop in your tour budget spreadsheet or PDF to get started</div>
                <button onClick={() => setView('import')} style={{ padding: '12px 28px', background: accent, color: '#fff', border: 'none', borderRadius: 8, cursor: 'pointer', fontFamily: 'monospace', fontSize: 10, letterSpacing: 3 }}>
                  + IMPORT BUDGET
                </button>
              </div>
            ) : (
              <>
                {/* Summary cards */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 }}>
                  {[
                    { label: 'Total Fees', value: fmtAmount(totalFees, primaryCurrency), color: green, sub: `${settlements.length} show${settlements.length !== 1 ? 's' : ''}` },
                    { label: 'Total Expenses', value: fmtAmount(totalExpenses, primaryCurrency), color: red, sub: `${expenses.length} item${expenses.length !== 1 ? 's' : ''}` },
                    { label: netPosition >= 0 ? 'Net Profit' : 'Net Loss', value: fmtAmount(Math.abs(netPosition), primaryCurrency), color: netPosition >= 0 ? green : red, sub: 'before tax & commission' },
                  ].map((c, i) => (
                    <div key={i} style={{ background: card, borderRadius: 12, border: `1px solid ${border}`, padding: '20px 20px' }}>
                      <div style={{ fontFamily: 'monospace', fontSize: 9, letterSpacing: 2, color: muted, marginBottom: 8, textTransform: 'uppercase' }}>{c.label}</div>
                      <div style={{ fontSize: 22, fontWeight: 700, color: c.color, marginBottom: 4 }}>{c.value}</div>
                      <div style={{ fontSize: 11, color: muted }}>{c.sub}</div>
                    </div>
                  ))}
                </div>

                {/* Expenses breakdown bar */}
                {expenses.length > 0 && (
                  <div style={{ background: card, borderRadius: 12, border: `1px solid ${border}`, padding: '20px 24px' }}>
                    <div style={{ fontFamily: 'monospace', fontSize: 9, letterSpacing: 2, color: muted, marginBottom: 16, textTransform: 'uppercase' }}>Expenses by Category</div>
                    {/* Stacked bar */}
                    <div style={{ display: 'flex', height: 12, borderRadius: 6, overflow: 'hidden', marginBottom: 16, gap: 1 }}>
                      {Object.entries(expensesByCategory).map(([cat, items]: [string, any]) => {
                        const catTotal = items.reduce((s: number, e: any) => s + (parseFloat(e.amount) || 0), 0)
                        const pct = totalExpenses > 0 ? (catTotal / totalExpenses) * 100 : 0
                        return <div key={cat} style={{ width: `${pct}%`, background: CATEGORY_COLORS[cat] || '#888', minWidth: pct > 0 ? 2 : 0 }} title={`${CATEGORY_LABELS[cat] || cat}: ${fmtAmount(catTotal, primaryCurrency)}`} />
                      })}
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: 8 }}>
                      {Object.entries(expensesByCategory).map(([cat, items]: [string, any]) => {
                        const catTotal = items.reduce((s: number, e: any) => s + (parseFloat(e.amount) || 0), 0)
                        return (
                          <div key={cat} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            <div style={{ width: 10, height: 10, borderRadius: 2, background: CATEGORY_COLORS[cat] || '#888', flexShrink: 0 }} />
                            <div>
                              <div style={{ fontSize: 12, color: text }}>{CATEGORY_LABELS[cat] || cat}</div>
                              <div style={{ fontSize: 11, color: muted }}>{fmtAmount(catTotal, items[0]?.currency || primaryCurrency)}</div>
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                )}

                {/* Settlements summary */}
                {settlements.length > 0 && (
                  <div style={{ background: card, borderRadius: 12, border: `1px solid ${border}`, overflow: 'hidden' }}>
                    <div style={{ background: '#1A1714', padding: '12px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontFamily: 'monospace', fontSize: 9, letterSpacing: 3, color: '#F5F0E8' }}>SHOW FEES</span>
                      <span style={{ fontFamily: 'monospace', fontSize: 9, color: accent }}>{settlements.length} SHOWS · {fmtAmount(totalFees, primaryCurrency)}</span>
                    </div>
                    <div style={{ padding: '4px 20px' }}>
                      {settlements.map((s, i) => {
                        const show = shows.find(sh => sh.id === s.show_id)
                        return (
                          <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '11px 0', borderBottom: i < settlements.length - 1 ? `1px solid ${border}` : 'none', gap: 12 }}>
                            <div>
                              <div style={{ fontSize: 13, fontWeight: 600 }}>{show?.venue || 'Show'}</div>
                              <div style={{ fontSize: 11, color: muted, fontFamily: 'monospace', letterSpacing: 1, marginTop: 2 }}>
                                {show?.date ? fmtDate(show.date) : ''}{show?.city ? ` · ${show.city}` : ''}
                                {s.deal_type ? ` · ${s.deal_type.toUpperCase()}` : ''}
                              </div>
                            </div>
                            <div style={{ textAlign: 'right' }}>
                              <div style={{ fontSize: 15, fontWeight: 700, color: green }}>{fmtAmount(s.agreed_amount, s.currency)}</div>
                              {s.paid_amount > 0 && <div style={{ fontSize: 11, color: muted }}>paid: {fmtAmount(s.paid_amount, s.currency)}</div>}
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                )}

                <div style={{ textAlign: 'right' }}>
                  <button onClick={() => setView('import')} style={{ padding: '8px 16px', background: 'transparent', color: muted, border: `1px solid ${border}`, borderRadius: 8, cursor: 'pointer', fontSize: 12 }}>
                    + Update budget data
                  </button>
                </div>
              </>
            )}
          </div>
        )}

        {/* ── SHOWS VIEW ── */}
        {view === 'shows' && (
          <div style={{ display: 'grid', gap: 12 }}>
            {showsWithData.length === 0 ? (
              <div style={{ background: card, borderRadius: 12, border: `1px solid ${border}`, padding: 32, textAlign: 'center', color: muted }}>No shows in this tour yet</div>
            ) : showsWithData.map((show, i) => (
              <div key={show.id} style={{ background: card, borderRadius: 12, border: `1px solid ${border}`, overflow: 'hidden' }}>
                <div style={{ padding: '16px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12, flexWrap: 'wrap' }}>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
                      <span style={{ fontFamily: 'monospace', fontSize: 10, color: muted, letterSpacing: 1 }}>
                        {fmtDate(show.date).toUpperCase()}
                      </span>
                      {show.settlement && (
                        <span style={{ fontFamily: 'monospace', fontSize: 9, letterSpacing: 1, color: green, background: '#f0fff4', padding: '2px 6px', borderRadius: 4 }}>
                          {show.settlement.deal_type?.toUpperCase()}
                        </span>
                      )}
                    </div>
                    <div style={{ fontSize: 16, fontWeight: 700 }}>{show.venue}</div>
                    <div style={{ fontSize: 13, color: muted }}>{show.city}{show.country && show.country !== 'AU' ? `, ${show.country}` : ''}</div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    {show.settlement ? (
                      <>
                        <div style={{ fontSize: 18, fontWeight: 700, color: green }}>{fmtAmount(show.settlement.agreed_amount, show.settlement.currency)}</div>
                        <div style={{ fontSize: 11, color: muted }}>guarantee</div>
                      </>
                    ) : (
                      <div style={{ fontSize: 13, color: muted, fontStyle: 'italic' }}>No fee set</div>
                    )}
                  </div>
                </div>
                {show.showExpenses.length > 0 && (
                  <div style={{ borderTop: `1px solid ${border}`, padding: '8px 20px 12px' }}>
                    <div style={{ fontFamily: 'monospace', fontSize: 9, letterSpacing: 2, color: muted, marginBottom: 8 }}>SHOW EXPENSES</div>
                    {show.showExpenses.map((e: any, j: number) => (
                      <div key={j} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, padding: '4px 0', borderBottom: j < show.showExpenses.length - 1 ? `1px solid ${border}` : 'none' }}>
                        <span style={{ color: text }}>{e.description}</span>
                        <span style={{ color: red, fontWeight: 600 }}>{fmtAmount(e.amount, e.currency)}</span>
                      </div>
                    ))}
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 8, fontWeight: 700, fontSize: 13 }}>
                      <span>Show total expenses</span>
                      <span style={{ color: red }}>{fmtAmount(show.expenseTotal, show.showExpenses[0]?.currency || primaryCurrency)}</span>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {/* ── EXPENSES VIEW ── */}
        {view === 'expenses' && (
          <div style={{ display: 'grid', gap: 12 }}>
            {expenses.length === 0 ? (
              <div style={{ background: card, borderRadius: 12, border: `1px solid ${border}`, padding: 32, textAlign: 'center', color: muted }}>No expenses imported yet</div>
            ) : (
              <>
                {Object.entries(expensesByCategory).map(([cat, items]: [string, any]) => {
                  const catTotal = items.reduce((s: number, e: any) => s + (parseFloat(e.amount) || 0), 0)
                  return (
                    <div key={cat} style={{ background: card, borderRadius: 12, border: `1px solid ${border}`, overflow: 'hidden' }}>
                      <div style={{ padding: '12px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: `1px solid ${border}`, background: darkMode ? '#333' : '#F9F6F2' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <div style={{ width: 10, height: 10, borderRadius: 2, background: CATEGORY_COLORS[cat] || '#888' }} />
                          <span style={{ fontFamily: 'monospace', fontSize: 10, letterSpacing: 2, color: text, textTransform: 'uppercase' }}>{CATEGORY_LABELS[cat] || cat}</span>
                          <span style={{ fontFamily: 'monospace', fontSize: 9, color: muted }}>{items.length} items</span>
                        </div>
                        <span style={{ fontWeight: 700, color: red }}>{fmtAmount(catTotal, items[0]?.currency || primaryCurrency)}</span>
                      </div>
                      <div style={{ padding: '4px 20px' }}>
                        {items.map((e: any, i: number) => (
                          <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', padding: '10px 0', borderBottom: i < items.length - 1 ? `1px solid ${border}` : 'none', gap: 12 }}>
                            <div>
                              <div style={{ fontSize: 13 }}>{e.description}</div>
                              {e.notes && <div style={{ fontSize: 11, color: muted, marginTop: 2 }}>{e.notes}</div>}
                              {e.show_id && shows.find(s => s.id === e.show_id) && (
                                <div style={{ fontSize: 11, color: accent, marginTop: 2, fontFamily: 'monospace', letterSpacing: 1 }}>
                                  {shows.find(s => s.id === e.show_id)?.venue}
                                </div>
                              )}
                            </div>
                            <div style={{ fontSize: 14, fontWeight: 600, color: red, whiteSpace: 'nowrap' }}>{fmtAmount(e.amount, e.currency)}</div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )
                })}
                <div style={{ background: card, borderRadius: 12, border: `1px solid ${border}`, padding: '16px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontFamily: 'monospace', fontSize: 11, letterSpacing: 2 }}>TOTAL</span>
                  <span style={{ fontSize: 20, fontWeight: 700, color: red }}>{fmtAmount(totalExpenses, primaryCurrency)}</span>
                </div>
              </>
            )}
          </div>
        )}

        {/* ── IMPORT VIEW ── */}
        {view === 'import' && (
          <div style={{ display: 'grid', gap: 16 }}>
            {imported && (
              <div style={{ background: '#f0fff4', border: '1px solid #9be9c0', borderRadius: 10, padding: '14px 20px', color: green, fontSize: 14, fontFamily: 'monospace', letterSpacing: 1 }}>
                ✓ Budget imported successfully
              </div>
            )}

            {!importResult && !processing && (
              <>
                <div onDrop={onDrop} onDragOver={e => { e.preventDefault(); setDragging(true) }} onDragLeave={() => setDragging(false)} onClick={() => fileInputRef.current?.click()}
                  style={{ border: `2px dashed ${dragging ? accent : border}`, borderRadius: 16, padding: '48px 24px', textAlign: 'center', cursor: 'pointer', background: dragging ? '#FDF5EF' : card, transition: 'all 0.15s' }}>
                  <input ref={fileInputRef} type="file" accept=".pdf,.csv,.xlsx,.xls,.txt" style={{ display: 'none' }} onChange={e => { if (e.target.files?.[0]) processFile(e.target.files[0]) }} />
                  <div style={{ fontSize: 36, marginBottom: 12 }}>💰</div>
                  <div style={{ fontSize: 16, fontWeight: 600, marginBottom: 8 }}>Drop your tour budget here</div>
                  <div style={{ fontSize: 13, color: muted, marginBottom: 4 }}>Supports per-show spreadsheets, flat budgets, PDFs</div>
                  <div style={{ fontFamily: 'monospace', fontSize: 10, color: muted, letterSpacing: 2, marginTop: 12 }}>XLSX · CSV · PDF · TXT</div>
                </div>
                <div style={{ textAlign: 'center', color: muted, fontSize: 13 }}>or</div>
                {showPaste ? (
                  <div style={{ background: card, borderRadius: 12, padding: 20, border: `1px solid ${border}` }}>
                    <textarea value={pasteText} onChange={e => setPasteText(e.target.value)} placeholder="Paste budget data here..." rows={8}
                      style={{ width: '100%', padding: '10px 12px', border: `1px solid ${border}`, borderRadius: 8, background: bg, color: text, fontSize: 14, fontFamily: 'Georgia, serif', outline: 'none', resize: 'vertical', minHeight: 160, lineHeight: 1.6, boxSizing: 'border-box' }} />
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
              </div>
            )}

            {error && <div style={{ background: '#FEE', border: '1px solid #FCC', borderRadius: 8, padding: '12px 16px', fontSize: 13, color: '#C00', fontFamily: 'monospace' }}>{error}</div>}

            {importResult && (
              <div style={{ display: 'grid', gap: 12 }}>
                {importResult.summary && (
                  <div style={{ background: card, borderRadius: 12, padding: 20, border: `1px solid ${border}` }}>
                    <div style={{ fontFamily: 'monospace', fontSize: 9, letterSpacing: 3, color: muted, marginBottom: 8 }}>EXTRACTED</div>
                    <div style={{ fontSize: 14, color: text, lineHeight: 1.6 }}>{importResult.summary}</div>
                  </div>
                )}
                {importResult.settlements?.filter((s: any) => s.agreed_amount > 0).length > 0 && (
                  <div style={{ background: card, borderRadius: 12, border: `1px solid ${border}`, overflow: 'hidden' }}>
                    <div style={{ background: '#1A1714', padding: '10px 20px', display: 'flex', justifyContent: 'space-between' }}>
                      <span style={{ fontFamily: 'monospace', fontSize: 9, letterSpacing: 3, color: '#F5F0E8' }}>SHOW FEES</span>
                      <span style={{ fontFamily: 'monospace', fontSize: 9, color: accent }}>{importResult.settlements.filter((s: any) => s.agreed_amount > 0).length} SHOWS</span>
                    </div>
                    <div style={{ padding: '4px 20px' }}>
                      {importResult.settlements.filter((s: any) => s.agreed_amount > 0).map((s: any, i: number) => (
                        <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 0', borderBottom: `1px solid ${border}`, gap: 12 }}>
                          <div>
                            <div style={{ fontSize: 13, fontWeight: 600 }}>{s.venue || 'Show'}</div>
                            <div style={{ fontSize: 11, color: muted, fontFamily: 'monospace', letterSpacing: 1, marginTop: 2 }}>{s.deal_type?.toUpperCase()}{s.date ? ` · ${s.date}` : ''}</div>
                          </div>
                          <div style={{ fontSize: 15, fontWeight: 700, color: green, whiteSpace: 'nowrap' }}>{s.currency} {Number(s.agreed_amount).toLocaleString()}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                {importResult.expenses?.length > 0 && (
                  <div style={{ background: card, borderRadius: 12, border: `1px solid ${border}`, overflow: 'hidden' }}>
                    <div style={{ background: '#1A1714', padding: '10px 20px', display: 'flex', justifyContent: 'space-between' }}>
                      <span style={{ fontFamily: 'monospace', fontSize: 9, letterSpacing: 3, color: '#F5F0E8' }}>EXPENSES</span>
                      <span style={{ fontFamily: 'monospace', fontSize: 9, color: accent }}>{importResult.expenses.length} ITEMS</span>
                    </div>
                    <div style={{ padding: '4px 20px' }}>
                      {importResult.expenses.map((e: any, i: number) => (
                        <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: i < importResult.expenses.length - 1 ? `1px solid ${border}` : 'none', gap: 12 }}>
                          <div>
                            <div style={{ fontSize: 13 }}>{e.description}</div>
                            <div style={{ fontSize: 11, color: muted, fontFamily: 'monospace', letterSpacing: 1, marginTop: 2 }}>{e.category}</div>
                          </div>
                          <div style={{ fontSize: 13, fontWeight: 600, color: red, whiteSpace: 'nowrap' }}>{e.currency} {Number(e.amount || 0).toLocaleString()}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                <div style={{ display: 'flex', gap: 10 }}>
                  <button onClick={() => setImportResult(null)} style={{ padding: '12px 20px', background: 'transparent', color: muted, border: `1px solid ${border}`, borderRadius: 8, cursor: 'pointer', fontSize: 13 }}>← Try again</button>
                  <button onClick={handleImport} disabled={importing} style={{ flex: 1, padding: '12px', background: '#1A1714', color: '#F5F0E8', border: 'none', borderRadius: 8, cursor: 'pointer', fontFamily: 'monospace', fontSize: 10, letterSpacing: 3 }}>
                    {importing ? 'IMPORTING...' : '✦ IMPORT TO TOUR'}
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
