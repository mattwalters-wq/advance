'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import { createClient } from '@/lib/supabase'

export default function DaySheetPage() {
  const params = useParams()
  const supabase = createClient()

  const [show, setShow] = useState<any>(null)
  const [tour, setTour] = useState<any>(null)
  const [artist, setArtist] = useState<any>(null)
  const [travel, setTravel] = useState<any[]>([])
  const [accommodation, setAccommodation] = useState<any[]>([])
  const [contacts, setContacts] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)

  useEffect(() => { loadData() }, [params.show_id])

  async function loadData() {
    const { data: showData } = await supabase
      .from('shows').select('*').eq('id', params.show_id).single()

    if (!showData) { setNotFound(true); setLoading(false); return }
    setShow(showData)

    const [tourRes, travelRes, accomRes, contactsRes] = await Promise.all([
      supabase.from('tours').select('*').eq('id', showData.tour_id).single(),
      supabase.from('travel').select('*').eq('tour_id', showData.tour_id).order('travel_date'),
      supabase.from('accommodation').select('*').eq('tour_id', showData.tour_id).order('check_in'),
      supabase.from('contacts').select('*').eq('tour_id', showData.tour_id),
    ])

    const tourData = tourRes.data
    setTour(tourData)

    if (tourData) {
      const { data: artistData } = await supabase
        .from('artists').select('*').eq('id', tourData.artist_id).single()
      setArtist(artistData)
    }

    // Filter travel arriving or departing on show date
    const showDate = showData.date
    const relevantTravel = (travelRes.data || []).filter((t: any) =>
      t.travel_date === showDate ||
      t.travel_date === showData.date
    )
    setTravel(relevantTravel)

    // Filter accommodation covering show night
    const relevantAccom = (accomRes.data || []).filter((a: any) => {
      if (!a.check_in) return false
      const checkIn = a.check_in
      const checkOut = a.check_out || checkIn
      return checkIn <= showDate && checkOut >= showDate
    })
    setAccommodation(relevantAccom)

    setContacts(contactsRes.data || [])
    setLoading(false)
  }

  function formatTime(t: string) {
    if (!t) return ''
    const [h, m] = t.split(':')
    const hour = parseInt(h)
    return `${hour % 12 || 12}:${m}${hour >= 12 ? 'pm' : 'am'}`
  }

  function formatDate(d: string) {
    if (!d) return ''
    return new Date(d + 'T00:00:00').toLocaleDateString('en-AU', {
      weekday: 'long', day: 'numeric', month: 'long', year: 'numeric'
    })
  }

  const accent = '#C4622D'
  const border = '#E8E0D0'
  const muted = '#8A8580'
  const text = '#1A1714'

  if (loading) return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'Georgia, serif', color: muted, background: '#F5F0E8' }}>
      Loading...
    </div>
  )

  if (notFound) return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'Georgia, serif', color: muted, background: '#F5F0E8' }}>
      Show not found.
    </div>
  )

  return (
    <div style={{ background: '#F5F0E8', minHeight: '100vh', fontFamily: 'Georgia, serif', color: text }}>

      {/* Print styles */}
      <style>{`
        @media print {
          .no-print { display: none !important; }
          body { background: white !important; }
          .print-page { box-shadow: none !important; }
        }
        @page { margin: 1.5cm; }
      `}</style>

      {/* Toolbar - no print */}
      <div className="no-print" style={{ background: '#1A1714', padding: '12px 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <span style={{ fontSize: 18, fontStyle: 'italic', color: '#F5F0E8' }}>Advance</span>
          <span style={{ fontFamily: 'monospace', fontSize: 9, letterSpacing: 2, color: accent }}>DAY SHEET</span>
        </div>
        <button onClick={() => window.print()}
          style={{ padding: '8px 20px', background: accent, color: '#fff', border: 'none', borderRadius: 8, cursor: 'pointer', fontFamily: 'monospace', fontSize: 10, letterSpacing: 2 }}>
          🖨 PRINT
        </button>
      </div>

      {/* Day sheet content */}
      <div className="print-page" style={{ maxWidth: 680, margin: '32px auto', padding: '0 16px 48px' }}>

        {/* Header */}
        <div style={{ borderBottom: `3px solid ${text}`, paddingBottom: 20, marginBottom: 28 }}>
          <div style={{ fontFamily: 'monospace', fontSize: 10, letterSpacing: 3, color: muted, textTransform: 'uppercase', marginBottom: 8 }}>
            Day Sheet
          </div>
          <div style={{ fontSize: 32, fontWeight: 700, marginBottom: 4 }}>{artist?.name}</div>
          <div style={{ fontSize: 16, color: muted, fontStyle: 'italic', marginBottom: 12 }}>{tour?.name}</div>
          <div style={{ fontSize: 18, fontWeight: 600 }}>{formatDate(show?.date)}</div>
        </div>

        {/* Show info - the centrepiece */}
        <div style={{ background: '#fff', borderRadius: 12, border: `1px solid ${border}`, overflow: 'hidden', marginBottom: 20 }}>
          <div style={{ background: text, padding: '10px 20px', display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontFamily: 'monospace', fontSize: 10, letterSpacing: 3, color: '#F5F0E8', textTransform: 'uppercase' }}>Show</span>
          </div>
          <div style={{ padding: 20 }}>
            <div style={{ fontSize: 22, fontWeight: 700, marginBottom: 4 }}>{show?.venue}</div>
            {show?.city && <div style={{ fontSize: 15, color: muted, marginBottom: 16 }}>{show.city}{show.country ? `, ${show.country}` : ''}</div>}

            {/* Times grid */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))', gap: 12 }}>
              {show?.doors_time && (
                <TimeBlock label="Doors" time={formatTime(show.doors_time)} accent={accent} />
              )}
              {show?.soundcheck_time && (
                <TimeBlock label="Soundcheck" time={formatTime(show.soundcheck_time)} accent={accent} />
              )}
              {show?.set_time && (
                <TimeBlock label="Stage" time={formatTime(show.set_time)} accent={accent} highlight />
              )}
            </div>

            {show?.stage && (
              <div style={{ marginTop: 14, fontSize: 13, color: muted }}>
                Stage: <strong>{show.stage}</strong>
              </div>
            )}
            {show?.notes && (
              <div style={{ marginTop: 14, padding: '10px 14px', background: '#FFF8F0', borderLeft: `3px solid ${accent}`, borderRadius: 4, fontSize: 13, color: text, lineHeight: 1.6 }}>
                {show.notes}
              </div>
            )}
          </div>
        </div>

        {/* Travel today */}
        {travel.length > 0 && (
          <div style={{ background: '#fff', borderRadius: 12, border: `1px solid ${border}`, overflow: 'hidden', marginBottom: 20 }}>
            <SectionHeader label="Travel Today" />
            <div style={{ padding: '4px 20px' }}>
              {travel.map((t, i) => (
                <div key={i} style={{ padding: '14px 0', borderBottom: i < travel.length - 1 ? `1px solid ${border}` : 'none' }}>
                  <div style={{ fontWeight: 600, fontSize: 15, marginBottom: 6 }}>
                    {t.from_location} → {t.to_location}
                  </div>
                  <div style={{ display: 'flex', gap: 20, flexWrap: 'wrap' }}>
                    {t.travel_type && <Detail label="Type" value={t.travel_type} />}
                    {t.carrier && <Detail label="Carrier" value={t.carrier} />}
                    {t.reference && <Detail label="Ref" value={t.reference} />}
                    {t.departure_time && <Detail label="Departs" value={formatTime(t.departure_time)} />}
                    {t.arrival_time && <Detail label="Arrives" value={formatTime(t.arrival_time)} />}
                  </div>
                  {t.notes && <div style={{ marginTop: 8, fontSize: 13, color: muted, fontStyle: 'italic' }}>{t.notes}</div>}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Hotel tonight */}
        {accommodation.length > 0 && (
          <div style={{ background: '#fff', borderRadius: 12, border: `1px solid ${border}`, overflow: 'hidden', marginBottom: 20 }}>
            <SectionHeader label="Hotel Tonight" />
            <div style={{ padding: '4px 20px' }}>
              {accommodation.map((a, i) => (
                <div key={i} style={{ padding: '14px 0', borderBottom: i < accommodation.length - 1 ? `1px solid ${border}` : 'none' }}>
                  <div style={{ fontWeight: 600, fontSize: 16, marginBottom: 4 }}>{a.name}</div>
                  {a.address && (
                    <a href={`https://maps.google.com/?q=${encodeURIComponent(a.address)}`}
                      target="_blank" rel="noreferrer"
                      style={{ fontSize: 13, color: accent, display: 'block', marginBottom: 8, textDecoration: 'none' }}>
                      📍 {a.address}
                    </a>
                  )}
                  <div style={{ display: 'flex', gap: 20, flexWrap: 'wrap' }}>
                    {a.check_in && <Detail label="Check in" value={a.check_in} />}
                    {a.check_out && <Detail label="Check out" value={a.check_out} />}
                    {a.confirmation && <Detail label="Confirmation" value={a.confirmation} />}
                  </div>
                  {a.notes && <div style={{ marginTop: 8, fontSize: 13, color: muted, fontStyle: 'italic' }}>{a.notes}</div>}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Key contacts */}
        {contacts.length > 0 && (
          <div style={{ background: '#fff', borderRadius: 12, border: `1px solid ${border}`, overflow: 'hidden', marginBottom: 20 }}>
            <SectionHeader label="Key Contacts" />
            <div style={{ padding: '4px 20px' }}>
              {contacts.map((c, i) => (
                <div key={i} style={{ padding: '14px 0', borderBottom: i < contacts.length - 1 ? `1px solid ${border}` : 'none', display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8 }}>
                  <div>
                    <div style={{ fontWeight: 600, fontSize: 15 }}>{c.name}</div>
                    {c.role && <div style={{ fontSize: 12, color: muted, fontFamily: 'monospace', letterSpacing: 1, textTransform: 'uppercase', marginTop: 2 }}>{c.role}</div>}
                  </div>
                  <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
                    {c.phone && (
                      <a href={`tel:${c.phone}`} style={{ fontSize: 14, color: accent, textDecoration: 'none', fontWeight: 600 }}>
                        📞 {c.phone}
                      </a>
                    )}
                    {c.email && (
                      <a href={`mailto:${c.email}`} style={{ fontSize: 14, color: accent, textDecoration: 'none' }}>
                        ✉️ {c.email}
                      </a>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Footer */}
        <div style={{ textAlign: 'center', paddingTop: 24, fontFamily: 'monospace', fontSize: 10, letterSpacing: 2, color: muted }}>
          ADVANCE · {artist?.name?.toUpperCase()} · {show?.date}
        </div>

      </div>
    </div>
  )
}

function SectionHeader({ label }: { label: string }) {
  return (
    <div style={{ padding: '10px 20px', borderBottom: '1px solid #E8E0D0', display: 'flex', alignItems: 'center', gap: 8 }}>
      <div style={{ width: 3, height: 14, background: '#C4622D', borderRadius: 2 }} />
      <span style={{ fontFamily: 'monospace', fontSize: 10, letterSpacing: 2, color: '#8A8580', textTransform: 'uppercase' }}>{label}</span>
    </div>
  )
}

function TimeBlock({ label, time, accent, highlight }: { label: string, time: string, accent: string, highlight?: boolean }) {
  return (
    <div style={{ background: highlight ? accent : '#F5F0E8', borderRadius: 8, padding: '12px 16px', textAlign: 'center' }}>
      <div style={{ fontFamily: 'monospace', fontSize: 9, letterSpacing: 2, color: highlight ? 'rgba(255,255,255,0.7)' : '#8A8580', textTransform: 'uppercase', marginBottom: 4 }}>{label}</div>
      <div style={{ fontSize: 22, fontWeight: 700, color: highlight ? '#fff' : '#1A1714' }}>{time}</div>
    </div>
  )
}

function Detail({ label, value }: { label: string, value: string }) {
  return (
    <div style={{ fontSize: 13 }}>
      <span style={{ color: '#8A8580', marginRight: 4 }}>{label}:</span>
      <span style={{ fontWeight: 600 }}>{value}</span>
    </div>
  )
}
