'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase'
import { useRouter } from 'next/navigation'

export default function ImportPage() {
  const [text, setText] = useState('')
  const [loading, setLoading] = useState(false)
  const [parsed, setParsed] = useState<any>(null)
  const [error, setError] = useState('')
  const [importing, setImporting] = useState(false)
  const [tourName, setTourName] = useState('')
  const [selectedArtistId, setSelectedArtistId] = useState('')
  const [artists, setArtists] = useState<any[]>([])
  const router = useRouter()
  const supabase = createClient()

  async function loadArtists() {
    const { data } = await supabase.from('artists').select('*').order('name')
    setArtists(data || [])
  }

  useState(() => { loadArtists() })

  async function handleParse() {
    setLoading(true)
    setError('')
    setParsed(null)
    try {
      const res = await fetch('/api/parse-document', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text }),
      })
      const data = await res.json()
      if (!data.success) throw new Error(data.error)
      setParsed(data.data)
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  async function handleImport() {
    if (!selectedArtistId || !tourName) { setError('Please select an artist and enter a tour name'); return }
    setImporting(true)
    setError('')
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Not logged in')
      const { data: profile } = await supabase.from('profiles').select('org_id').eq('id', user.id).single()
      if (!profile) throw new Error('No profile found')
      const org_id = profile.org_id

      const { data: tour, error: tourError } = await supabase
        .from('tours').insert({ name: tourName, artist_id: selectedArtistId, org_id }).select().single()
      if (tourError) throw tourError

      if (parsed.shows?.length) await supabase.from('shows').insert(parsed.shows.map((s: any) => ({ ...s, tour_id: tour.id, org_id })))
      if (parsed.travel?.length) await supabase.from('travel').insert(parsed.travel.map((t: any) => ({ ...t, tour_id: tour.id, org_id })))
      if (parsed.accommodation?.length) await supabase.from('accommodation').insert(parsed.accommodation.map((a: any) => ({ ...a, tour_id: tour.id, org_id })))
      if (parsed.contacts?.length) await supabase.from('contacts').insert(parsed.contacts.map((c: any) => ({ ...c, tour_id: tour.id, org_id })))
      if (parsed.personnel?.length) await supabase.from('personnel').insert(parsed.personnel.map((p: any) => ({ ...p, tour_id: tour.id, org_id })))

      router.push('/dashboard')
    } catch (err: any) {
      setError(err.message)
    } finally {
      setImporting(false)
    }
  }

  return (
    <div style={{ minHeight: '100vh', background: '#F5F0E8', fontFamily: 'Georgia, serif' }}>
      <div style={{ background: '#1A1714', padding: '20px 32px', display: 'flex', alignItems: 'center', gap: 16 }}>
        <button onClick={() => router.push('/dashboard')} style={{ fontFamily: 'monospace', fontSize: 9, letterSpacing: 2, color: '#8A8580', background: 'transparent', border: '1px solid #2A2520', borderRadius: 4, padding: '6px 12px', cursor: 'pointer' }}>← ROSTER</button>
        <span style={{ fontSize: 20, fontStyle: 'italic', color: '#F5F0E8' }}>Import Document</span>
        <span style={{ fontFamily: 'monospace', fontSize: 9, letterSpacing: 2, color: '#C4622D', marginLeft: 8 }}>AI ✦</span>
      </div>

      <div style={{ maxWidth: 720, margin: '0 auto', padding: '32px 24px' }}>
        {error && <div style={{ background: '#FEE', border: '1px solid #FCC', borderRadius: 6, padding: '10px 14px', marginBottom: 16, fontSize: 12, color: '#C00', fontFamily: 'monospace' }}>{error}</div>}

        {!parsed && (
          <>
            <div style={{ marginBottom: 16 }}>
              <div style={{ fontFamily: 'monospace', fontSize: 9, letterSpacing: 3, color: '#8A8580', marginBottom: 8 }}>PASTE YOUR DOCUMENT</div>
              <div style={{ fontFamily: 'monospace', fontSize: 10, color: '#8A8580', marginBottom: 12, lineHeight: 1.6 }}>
                Paste any festival advance, flight confirmation, car hire email, hotel booking, or tour itinerary. Claude will extract all the relevant information automatically.
              </div>
              <textarea value={text} onChange={e => setText(e.target.value)}
                placeholder="Paste your advance, flight confirmation, car hire email, or any tour document here..."
                style={{ width: '100%', height: 280, padding: '14px', border: '1px solid #DDD8CE', borderRadius: 8, fontSize: 12, fontFamily: 'Georgia, serif', outline: 'none', background: '#fff', resize: 'vertical', color: '#1A1714', lineHeight: 1.6, boxSizing: 'border-box' }} />
            </div>
            <button onClick={handleParse} disabled={loading || !text.trim()}
              style={{ padding: '13px 32px', background: '#1A1714', color: '#F5F0E8', border: 'none', borderRadius: 8, fontFamily: 'monospace', fontSize: 10, letterSpacing: 3, cursor: loading || !text.trim() ? 'not-allowed' : 'pointer', opacity: loading || !text.trim() ? 0.6 : 1 }}>
              {loading ? 'READING DOCUMENT...' : '✦ EXTRACT WITH AI'}
            </button>
          </>
        )}

        {parsed && (
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 24 }}>
              <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#3D6B50' }} />
              <div style={{ fontFamily: 'monospace', fontSize: 10, letterSpacing: 2, color: '#3D6B50' }}>DOCUMENT PARSED SUCCESSFULLY</div>
            </div>

            <div style={{ background: '#fff', border: '1px solid #DDD8CE', borderRadius: 10, padding: '20px', marginBottom: 16 }}>
              <div style={{ fontFamily: 'monospace', fontSize: 9, letterSpacing: 3, color: '#8A8580', marginBottom: 14 }}>ASSIGN TO</div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div>
                  <div style={{ fontFamily: 'monospace', fontSize: 9, letterSpacing: 2, color: '#8A8580', marginBottom: 6 }}>ARTIST</div>
                  <select value={selectedArtistId} onChange={e => setSelectedArtistId(e.target.value)}
                    style={{ width: '100%', padding: '10px 12px', border: '1px solid #DDD8CE', borderRadius: 6, fontSize: 13, fontFamily: 'Georgia, serif', color: '#1A1714', background: '#fff', outline: 'none' }}>
                    <option value="">Select artist...</option>
                    {artists.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
                  </select>
                </div>
                <div>
                  <div style={{ fontFamily: 'monospace', fontSize: 9, letterSpacing: 2, color: '#8A8580', marginBottom: 6 }}>TOUR NAME</div>
                  <input value={tourName} onChange={e => setTourName(e.target.value)} placeholder="Port Fairy 2026"
                    style={{ width: '100%', padding: '10px 12px', border: '1px solid #DDD8CE', borderRadius: 6, fontSize: 13, fontFamily: 'Georgia, serif', color: '#1A1714', outline: 'none', boxSizing: 'border-box' }} />
                </div>
              </div>
            </div>

            {parsed.shows?.length > 0 && (
              <div style={{ background: '#fff', border: '1px solid #DDD8CE', borderRadius: 10, padding: '20px', marginBottom: 12 }}>
                <div style={{ fontFamily: 'monospace', fontSize: 9, letterSpacing: 3, color: '#8A8580', marginBottom: 12 }}>SHOWS — {parsed.shows.length} FOUND</div>
                {parsed.shows.map((s: any, i: number) => (
                  <div key={i} style={{ padding: '10px 12px', background: '#FDF5EF', borderRadius: 6, marginBottom: 6 }}>
                    <div style={{ fontSize: 13, color: '#1A1714', fontWeight: 600 }}>{s.venue || 'Venue TBC'}</div>
                    <div style={{ fontFamily: 'monospace', fontSize: 9, color: '#8A8580', marginTop: 3, letterSpacing: 1 }}>{s.date} · {s.set_time || 'TBC'}{s.stage ? ` · ${s.stage}` : ''}</div>
                  </div>
                ))}
              </div>
            )}

            {parsed.travel?.length > 0 && (
              <div style={{ background: '#fff', border: '1px solid #DDD8CE', borderRadius: 10, padding: '20px', marginBottom: 12 }}>
                <div style={{ fontFamily: 'monospace', fontSize: 9, letterSpacing: 3, color: '#8A8580', marginBottom: 12 }}>TRAVEL — {parsed.travel.length} ITEMS</div>
                {parsed.travel.map((t: any, i: number) => (
                  <div key={i} style={{ padding: '10px 12px', background: '#EFF5FD', borderRadius: 6, marginBottom: 6 }}>
                    <div style={{ fontSize: 13, color: '#1A1714', fontWeight: 600 }}>{t.from_location} → {t.to_location}</div>
                    <div style={{ fontFamily: 'monospace', fontSize: 9, color: '#8A8580', marginTop: 3, letterSpacing: 1 }}>{t.travel_date} · {t.carrier} {t.reference}</div>
                  </div>
                ))}
              </div>
            )}

            {parsed.accommodation?.length > 0 && (
              <div style={{ background: '#fff', border: '1px solid #DDD8CE', borderRadius: 10, padding: '20px', marginBottom: 12 }}>
                <div style={{ fontFamily: 'monospace', fontSize: 9, letterSpacing: 3, color: '#8A8580', marginBottom: 12 }}>ACCOMMODATION — {parsed.accommodation.length} FOUND</div>
                {parsed.accommodation.map((a: any, i: number) => (
                  <div key={i} style={{ padding: '10px 12px', background: '#F5EFF5', borderRadius: 6, marginBottom: 6 }}>
                    <div style={{ fontSize: 13, color: '#1A1714', fontWeight: 600 }}>{a.name}</div>
                    <div style={{ fontFamily: 'monospace', fontSize: 9, color: '#8A8580', marginTop: 3, letterSpacing: 1 }}>{a.address} · Check in: {a.check_in}</div>
                  </div>
                ))}
              </div>
            )}

            {parsed.contacts?.length > 0 && (
              <div style={{ background: '#fff', border: '1px solid #DDD8CE', borderRadius: 10, padding: '20px', marginBottom: 12 }}>
                <div style={{ fontFamily: 'monospace', fontSize: 9, letterSpacing: 3, color: '#8A8580', marginBottom: 12 }}>CONTACTS — {parsed.contacts.length} FOUND</div>
                {parsed.contacts.map((c: any, i: number) => (
                  <div key={i} style={{ padding: '10px 12px', background: '#F5F0E8', borderRadius: 6, marginBottom: 6 }}>
                    <div style={{ fontSize: 13, color: '#1A1714', fontWeight: 600 }}>{c.name}</div>
                    <div style={{ fontFamily: 'monospace', fontSize: 9, color: '#8A8580', marginTop: 3, letterSpacing: 1 }}>{c.role} · {c.phone}</div>
                  </div>
                ))}
              </div>
            )}

            <div style={{ display: 'flex', gap: 10, marginTop: 20 }}>
              <button onClick={handleImport} disabled={importing || !selectedArtistId || !tourName}
                style={{ flex: 1, padding: 13, background: '#1A1714', color: '#F5F0E8', border: 'none', borderRadius: 8, fontFamily: 'monospace', fontSize: 10, letterSpacing: 3, cursor: importing ? 'not-allowed' : 'pointer', opacity: importing || !selectedArtistId || !tourName ? 0.6 : 1 }}>
                {importing ? 'IMPORTING...' : 'CONFIRM & IMPORT'}
              </button>
              <button onClick={() => setParsed(null)}
                style={{ padding: '13px 20px', background: 'transparent', color: '#8A8580', border: '1px solid #DDD8CE', borderRadius: 8, fontFamily: 'monospace', fontSize: 10, letterSpacing: 3, cursor: 'pointer' }}>
                START OVER
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
