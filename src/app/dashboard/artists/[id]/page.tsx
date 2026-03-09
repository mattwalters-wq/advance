'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { createBrowserClient } from '@supabase/ssr'

const supabase = createBrowserClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

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

  useEffect(() => {
    loadArtist()
  }, [params.id])

  useEffect(() => {
    if (selectedTour) loadTourData(selectedTour.id)
  }, [selectedTour])

  async function loadArtist() {
    const { data: artistData } = await supabase
      .from('artists')
      .select('*')
      .eq('id', params.id)
      .single()

    if (!artistData) { router.push('/dashboard'); return }
    setArtist(artistData)

    const { data: toursData } = await supabase
      .from('tours')
      .select('*')
      .eq('artist_id', params.id)
      .order('start_date', { ascending: true })

    setTours(toursData || [])
    if (toursData && toursData.length > 0) setSelectedTour(toursData[0])
    setLoading(false)
  }

  async function loadTourData(tourId: string) {
    const [s, t, a, c] = await Promise.all([
      supabase.from('shows').select('*').eq('tour_id', tourId).order('date'),
      supabase.from('travel').select('*').eq('tour_id', tourId).order('travel_date'),
      supabase.from('accommodation').select('*').eq('tour_id', tourId).order('check_in'),
      supabase.from('contacts').select('*').eq('tour_id', tourId),
    ])
    setShows(s.data || [])
    setTravel(t.data || [])
    setAccommodation(a.data || [])
    setContacts(c.data || [])
  }

  const bg = darkMode ? '#1a1a1a' : '#f5f0e8'
  const card = darkMode ? '#2a2a2a' : '#ffffff'
  const text = darkMode ? '#e8e0d0' : '#2c2c2c'
  const muted = darkMode ? '#888' : '#999'
  const accent = '#c4956a'
  const border = darkMode ? '#333' : '#e8e0d0'

  if (loading) return <div style={{ background: bg, minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', color: text }}>Loading...</div>

  return (
    <div style={{ background: bg, minHeight: '100vh', fontFamily: 'system-ui, sans-serif', color: text }}>
      {/* Header */}
      <div style={{ borderBottom: `1px solid ${border}`, padding: '16px 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <button onClick={() => router.push('/dashboard')} style={{ background: 'none', border: 'none', color: muted, cursor: 'pointer', fontSize: '14px' }}>← Back</button>
          <div>
            <div style={{ fontSize: '20px', fontWeight: '600' }}>{artist?.name}</div>
            <div style={{ fontSize: '13px', color: muted }}>{artist?.project}</div>
          </div>
        </div>
        <button onClick={() => setDarkMode(!darkMode)} style={{ background: 'none', border: `1px solid ${border}`, borderRadius: '6px', padding: '6px 12px', color: text, cursor: 'pointer', fontSize: '13px' }}>
          {darkMode ? '☀️ Light' : '🌙 Dark'}
        </button>
      </div>

      <div style={{ maxWidth: '900px', margin: '0 auto', padding: '24px' }}>
        {/* Tour selector */}
        {tours.length > 1 && (
          <div style={{ display: 'flex', gap: '8px', marginBottom: '24px', flexWrap: 'wrap' }}>
            {tours.map(tour => (
              <button key={tour.id} onClick={() => setSelectedTour(tour)}
                style={{ padding: '8px 16px', borderRadius: '20px', border: `1px solid ${border}`, background: selectedTour?.id === tour.id ? accent : card, color: selectedTour?.id === tour.id ? '#fff' : text, cursor: 'pointer', fontSize: '13px' }}>
                {tour.name}
              </button>
            ))}
          </div>
        )}

        {tours.length === 0 && (
          <div style={{ textAlign: 'center', padding: '60px', color: muted }}>
            <div style={{ fontSize: '32px', marginBottom: '12px' }}>📄</div>
            <div>No tours yet. Use Import Doc on the dashboard to add one.</div>
          </div>
        )}

        {selectedTour && (
          <div style={{ display: 'grid', gap: '20px' }}>
            {/* Shows */}
            {shows.length > 0 && (
              <div style={{ background: card, borderRadius: '12px', padding: '20px', border: `1px solid ${border}` }}>
                <div style={{ fontSize: '11px', letterSpacing: '0.1em', color: muted, marginBottom: '16px', textTransform: 'uppercase' }}>Shows — {shows.length} found</div>
                {shows.map((show, i) => (
                  <div key={i} style={{ padding: '12px 0', borderBottom: i < shows.length - 1 ? `1px solid ${border}` : 'none' }}>
                    <div style={{ fontWeight: '600', marginBottom: '4px' }}>{show.venue}</div>
                    <div style={{ fontSize: '13px', color: muted }}>{show.date} · {show.set_time}{show.stage ? ` · ${show.stage}` : ''}</div>
                    {show.city && <div style={{ fontSize: '13px', color: muted }}>{show.city}{show.country ? `, ${show.country}` : ''}</div>}
                  </div>
                ))}
              </div>
            )}

            {/* Travel */}
            {travel.length > 0 && (
              <div style={{ background: card, borderRadius: '12px', padding: '20px', border: `1px solid ${border}` }}>
                <div style={{ fontSize: '11px', letterSpacing: '0.1em', color: muted, marginBottom: '16px', textTransform: 'uppercase' }}>Travel — {travel.length} items</div>
                {travel.map((t, i) => (
                  <div key={i} style={{ padding: '12px 0', borderBottom: i < travel.length - 1 ? `1px solid ${border}` : 'none' }}>
                    <div style={{ fontWeight: '600', marginBottom: '4px' }}>{t.from_location} → {t.to_location}</div>
                    <div style={{ fontSize: '13px', color: muted }}>{t.travel_date} · {t.carrier} {t.reference}</div>
                    {t.departure_time && <div style={{ fontSize: '13px', color: muted }}>Departs {t.departure_time}{t.arrival_time ? ` · Arrives ${t.arrival_time}` : ''}</div>}
                  </div>
                ))}
              </div>
            )}

            {/* Accommodation */}
            {accommodation.length > 0 && (
              <div style={{ background: card, borderRadius: '12px', padding: '20px', border: `1px solid ${border}` }}>
                <div style={{ fontSize: '11px', letterSpacing: '0.1em', color: muted, marginBottom: '16px', textTransform: 'uppercase' }}>Accommodation — {accommodation.length} found</div>
                {accommodation.map((a, i) => (
                  <div key={i} style={{ padding: '12px 0', borderBottom: i < accommodation.length - 1 ? `1px solid ${border}` : 'none' }}>
                    <div style={{ fontWeight: '600', marginBottom: '4px' }}>{a.name}</div>
                    <div style={{ fontSize: '13px', color: muted }}>{a.address}</div>
                    <div style={{ fontSize: '13px', color: muted }}>Check in: {a.check_in}{a.check_out ? ` · Check out: ${a.check_out}` : ''}</div>
                    {a.confirmation && <div style={{ fontSize: '13px', color: muted }}>Ref: {a.confirmation}</div>}
                  </div>
                ))}
              </div>
            )}

            {/* Contacts */}
            {contacts.length > 0 && (
              <div style={{ background: card, borderRadius: '12px', padding: '20px', border: `1px solid ${border}` }}>
                <div style={{ fontSize: '11px', letterSpacing: '0.1em', color: muted, marginBottom: '16px', textTransform: 'uppercase' }}>Contacts — {contacts.length} found</div>
                {contacts.map((c, i) => (
                  <div key={i} style={{ padding: '12px 0', borderBottom: i < contacts.length - 1 ? `1px solid ${border}` : 'none' }}>
                    <div style={{ fontWeight: '600', marginBottom: '4px' }}>{c.name}</div>
                    <div style={{ fontSize: '13px', color: muted }}>{c.role}</div>
                    {c.phone && <div style={{ fontSize: '13px', color: muted }}>📞 {c.phone}</div>}
                    {c.email && <div style={{ fontSize: '13px', color: muted }}>✉️ {c.email}</div>}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}