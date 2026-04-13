'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase'
import { useRouter } from 'next/navigation'

const supabase = createClient()

export default function PastePage() {
  const router = useRouter()
  const [artists, setArtists] = useState<any[]>([])
  const [text, setText] = useState('')
  const [parsing, setParsing] = useState(false)
  const [result, setResult] = useState<any>(null)
  const [error, setError] = useState('')
  const [selectedArtistId, setSelectedArtistId] = useState('')
  const [tourName, setTourName] = useState('')
  const [importing, setImporting] = useState(false)
  const [imported, setImported] = useState(false)
  const [darkMode, setDarkMode] = useState(false)

  useEffect(() => {
    supabase.from('artists').select('*').order('name').then(({ data }) => setArtists(data || []))
  }, [])

  async function handleParse() {
    if (!text.trim()) return
    setParsing(true)
    setError('')
    setResult(null)
    try {
      const res = await fetch('/api/parse-document', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: text.slice(0, 8000) }),
      })
      const data = await res.json()
      if (!data.success) throw new Error(data.error)
      setResult(data.data)
    } catch (err: any) {
      setError(err.message)
    }
    setParsing(false)
  }

  async function handleImport() {
    if (!selectedArtistId || !tourName) return
    setImporting(true)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Not logged in')
      const { data: profile } = await supabase.from('profiles').select('org_id').eq('id', user.id).single()
      if (!profile) throw new Error('No profile')
      const org_id = profile.org_id

      const { data: tour, error: tourError } = await supabase
        .from('tours').insert({ name: tourName, artist_id: selectedArtistId, org_id }).select().single()
      if (tourError) throw tourError

      if (result.shows?.length) await supabase.from('shows').insert(result.shows.map((s: any) => ({ ...s, tour_id: tour.id, org_id })))
      if (result.travel?.length) await supabase.from('travel').insert(result.travel.map((t: any) => ({ ...t, tour_id: tour.id, org_id })))
      if (result.accommodation?.length) await supabase.from('accommodation').insert(result.accommodation.map((a: any) => ({ ...a, tour_id: tour.id, org_id })))
      if (result.contacts?.length) await supabase.from('contacts').insert(result.contacts.map((c: any) => ({ ...c, tour_id: tour.id, org_id })))

      setImported(true)
      setTimeout(() => router.push(`/dashboard/artists/${selectedArtistId}`), 1500)
    } catch (err: any) {
      setError(err.message)
    }
    setImporting(false)
  }

  const bg = darkMode ? '#1a1a1a' : '#F5F0E8'
  const card = darkMode ? '#2a2a2a' : '#fff'
  const text2 = darkMode ? '#e8e0d0' : '#1A1714'
  const muted = darkMode ? '#888' : '#8A8580'
  const border = darkMode ? '#333' : '#DDD8CE'
  const accent = '#C4622D'
  const inputStyle = {
    width: '100%', padding: '10px 12px', border: `1px solid ${border}`,
    borderRadius: 6, fontSize: 13, fontFamily: 'Georgia, serif',
    color: text2, background: bg, outline: 'none', boxSizing: 'border-box' as const,
  }

  return (
    <div style={{ minHeight: '100vh', background: bg, fontFamily: 'Georgia, serif', color: text2 }}>
      <div style={{ background: darkMode ? '#111' : '#1A1714', padding: '16px 32px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <button onClick={() => router.push('/dashboard/import')} style={{ fontFamily: 'monospace', fontSize: 9, letterSpacing: 2, color: '#8A8580', background: 'transparent', border: '1px solid #2A2520', borderRadius: 4, padding: '6px 12px', cursor: 'pointer' }}>← IMPORT</button>
          <span style={{ fontSize: 20, fontStyle: 'italic', color: '#F5F0E8' }}>Paste Text</span>
          <span style={{ fontFamily: 'monospace', fontSize: 9, letterSpacing: 2, color: accent }}>✦</span>
        </div>
        <button onClick={() => setDarkMode(!darkMode)} style={{ background: 'none', border: '1px solid #333', borderRadius: 6, padding: '6px 12px', color: '#F5F0E8', cursor: 'pointer', fontSize: 12 }}>
          {darkMode ? '☀️ Light' : '🌙 Dark'}
        </button>
      </div>

      <div style={{ maxWidth: 720, margin: '0 auto', padding: '32px 24px' }}>

        {!result && (
          <>
            <div style={{ background: card, borderRadius: 12, border: `1px solid ${border}`, padding: 24, marginBottom: 20 }}>
              <div style={{ fontFamily: 'monospace', fontSize: 9, letterSpacing: 3, color: muted, marginBottom: 12 }}>PASTE DOCUMENT TEXT</div>
              <textarea
                value={text}
                onChange={e => setText(e.target.value)}
                placeholder="Paste any tour-related text here — itineraries, emails, confirmations, rider info, hotel bookings..."
                style={{ ...inputStyle, minHeight: 280, resize: 'vertical', lineHeight: 1.6 }}
              />
              <div style={{ marginTop: 8, fontSize: 12, color: muted, fontFamily: 'monospace' }}>
                {text.length} chars {text.length > 8000 ? '— will be trimmed to 8000' : ''}
              </div>
            </div>

            {error && <div style={{ background: '#FEE', borderRadius: 6, padding: '10px 14px', marginBottom: 14, fontSize: 12, color: '#C00', fontFamily: 'monospace' }}>{error}</div>}

            <button onClick={handleParse} disabled={parsing || !text.trim()}
              style={{ width: '100%', padding: 14, background: parsing || !text.trim() ? muted : '#1A1714', color: '#F5F0E8', border: 'none', borderRadius: 8, fontFamily: 'monospace', fontSize: 10, letterSpacing: 3, cursor: parsing || !text.trim() ? 'not-allowed' : 'pointer' }}>
              {parsing ? '✦ READING...' : '✦ EXTRACT'}
            </button>
          </>
        )}

        {result && (
          <div style={{ background: card, borderRadius: 12, border: `1px solid ${border}`, padding: 24 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 20 }}>
              <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#3D6B50' }} />
              <div style={{ fontFamily: 'monospace', fontSize: 10, letterSpacing: 2, color: '#3D6B50' }}>EXTRACTION COMPLETE</div>
            </div>

            <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginBottom: 24 }}>
              {[
                ['🎵', 'Shows', result.shows?.length || 0],
                ['✈️', 'Travel', result.travel?.length || 0],
                ['🏨', 'Hotels', result.accommodation?.length || 0],
                ['👤', 'Contacts', result.contacts?.length || 0],
              ].filter(([,,n]) => (n as number) > 0).map(([icon, label, n]) => (
                <div key={label as string} style={{ background: bg, borderRadius: 8, padding: '10px 16px', textAlign: 'center', minWidth: 70 }}>
                  <div style={{ fontSize: 18, marginBottom: 2 }}>{icon}</div>
                  <div style={{ fontSize: 18, fontWeight: 700 }}>{n as number}</div>
                  <div style={{ fontFamily: 'monospace', fontSize: 9, color: muted, letterSpacing: 1 }}>{label as string}</div>
                </div>
              ))}
            </div>

            <div style={{ fontFamily: 'monospace', fontSize: 9, letterSpacing: 3, color: muted, marginBottom: 12 }}>ASSIGN TO</div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 16 }}>
              <div>
                <div style={{ fontFamily: 'monospace', fontSize: 9, letterSpacing: 2, color: muted, marginBottom: 6 }}>ARTIST</div>
                <select value={selectedArtistId} onChange={e => setSelectedArtistId(e.target.value)} style={inputStyle}>
                  <option value="">Select artist...</option>
                  {artists.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
                </select>
              </div>
              <div>
                <div style={{ fontFamily: 'monospace', fontSize: 9, letterSpacing: 2, color: muted, marginBottom: 6 }}>TOUR NAME</div>
                <input value={tourName} onChange={e => setTourName(e.target.value)} placeholder="e.g. EU Tour 2026" style={inputStyle} />
              </div>
            </div>

            <div style={{ display: 'flex', gap: 10 }}>
              <button onClick={() => { setResult(null); setError('') }}
                style={{ padding: '12px 20px', background: 'transparent', color: muted, border: `1px solid ${border}`, borderRadius: 8, cursor: 'pointer', fontFamily: 'monospace', fontSize: 10, letterSpacing: 2 }}>
                ← BACK
              </button>
              {imported ? (
                <div style={{ flex: 1, padding: 12, textAlign: 'center', color: '#3D6B50', fontFamily: 'monospace', fontSize: 11, letterSpacing: 2 }}>✓ IMPORTED — REDIRECTING...</div>
              ) : (
                <button onClick={handleImport} disabled={importing || !selectedArtistId || !tourName}
                  style={{ flex: 1, padding: 12, background: importing || !selectedArtistId || !tourName ? muted : '#1A1714', color: '#F5F0E8', border: 'none', borderRadius: 8, fontFamily: 'monospace', fontSize: 10, letterSpacing: 3, cursor: importing || !selectedArtistId || !tourName ? 'not-allowed' : 'pointer' }}>
                  {importing ? 'IMPORTING...' : '✦ IMPORT'}
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
