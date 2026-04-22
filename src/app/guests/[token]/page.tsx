'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import { createClient } from '@/lib/supabase'

const supabase = createClient()

export default function PublicGuestListPage() {
  const params = useParams()
  const [show, setShow] = useState<any>(null)
  const [tour, setTour] = useState<any>(null)
  const [artist, setArtist] = useState<any>(null)
  const [guests, setGuests] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)

  useEffect(() => { loadData() }, [params.token])

  async function loadData() {
    const { data: showData } = await supabase.from('shows')
      .select('*, tours(*, artists(*))')
      .eq('guest_list_token', params.token)
      .single()
    if (!showData) { setNotFound(true); setLoading(false); return }
    setShow(showData)
    if (showData.tours) {
      setTour(showData.tours)
      if (showData.tours.artists) setArtist(showData.tours.artists)
    }
    const { data: guestsData } = await supabase.from('guest_list')
      .select('*')
      .eq('show_id', showData.id)
      .order('name')
    setGuests(guestsData || [])
    setLoading(false)
  }

  const accent = '#C4622D'
  const border = '#E8E2D8'
  const muted = '#8A8580'
  const text = '#1A1714'
  const sectionBg = '#F9F6F2'

  if (loading) {
    return <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: sectionBg, fontFamily: 'sans-serif', color: muted }}>Loading...</div>
  }

  if (notFound) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: sectionBg, fontFamily: 'sans-serif', color: muted, padding: 20, textAlign: 'center' }}>
        <div>
          <div style={{ fontSize: 40, marginBottom: 10 }}>🎟</div>
          <div style={{ fontSize: 16, color: text, fontWeight: 600 }}>Guest list not found</div>
          <div style={{ fontSize: 13, color: muted, marginTop: 6 }}>This link may have been removed or is no longer active.</div>
        </div>
      </div>
    )
  }

  const totalHeads = guests.reduce((sum: number, g: any) => sum + 1 + (g.plus_n || 0), 0)
  const formattedDate = show.date ? new Date(show.date + 'T00:00:00').toLocaleDateString('en-AU', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }) : ''

  return (
    <div style={{ background: sectionBg, minHeight: '100vh', fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Helvetica, Arial, sans-serif', color: text }}>
      <style>{`
        * { box-sizing: border-box; }
        @media print {
          .no-print { display: none !important; }
          body { background: white !important; }
          @page { margin: 1.5cm; size: A4; }
        }
      `}</style>

      {/* Toolbar */}
      <div className="no-print" style={{ background: '#1A1714', padding: '0 16px 0 24px', height: 52, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <span style={{ fontSize: 17, fontStyle: 'italic', color: '#F5F0E8', fontFamily: 'Georgia, serif' }}>Advance</span>
          <span style={{ fontFamily: 'monospace', fontSize: 9, letterSpacing: 2, color: accent }}>GUEST LIST</span>
        </div>
        <button onClick={() => window.print()}
          style={{ padding: '7px 18px', background: accent, color: '#fff', border: 'none', borderRadius: 6, cursor: 'pointer', fontFamily: 'monospace', fontSize: 10, letterSpacing: 2 }}>
          PRINT
        </button>
      </div>

      <div style={{ maxWidth: 700, margin: '0 auto', padding: '32px 16px 60px' }}>

        {/* Header */}
        <div style={{ background: '#fff', borderRadius: 12, border: `1px solid ${border}`, overflow: 'hidden', marginBottom: 16 }}>
          <div style={{ height: 5, background: artist?.color || accent }} />
          <div style={{ padding: '24px 28px' }}>
            <div style={{ fontFamily: 'monospace', fontSize: 10, letterSpacing: '0.2em', color: muted, marginBottom: 6, textTransform: 'uppercase' }}>Guest List</div>
            <div style={{ fontSize: 26, fontWeight: 700, letterSpacing: '-0.02em', marginBottom: 2, lineHeight: 1.1 }}>{artist?.name}</div>
            <div style={{ fontSize: 15, color: text, fontWeight: 600, marginTop: 6 }}>{show.venue}</div>
            {show.city && <div style={{ fontSize: 13, color: muted, marginTop: 2 }}>{show.city}{show.country ? `, ${show.country}` : ''}</div>}
            <div style={{ fontSize: 13, color: muted, marginTop: 8, fontFamily: 'monospace', letterSpacing: 1 }}>
              {formattedDate}
              {show.set_time && <span style={{ marginLeft: 10, color: accent, fontWeight: 700 }}>· Stage {formatTime(show.set_time)}</span>}
            </div>
          </div>
        </div>

        {/* Summary */}
        <div style={{ background: '#fff', borderRadius: 12, border: `1px solid ${border}`, padding: '16px 24px', marginBottom: 16, display: 'flex', gap: 32, flexWrap: 'wrap' }}>
          <div>
            <div style={{ fontFamily: 'monospace', fontSize: 9, letterSpacing: 2, color: muted, marginBottom: 4 }}>ENTRIES</div>
            <div style={{ fontSize: 22, fontWeight: 700 }}>{guests.length}</div>
          </div>
          <div>
            <div style={{ fontFamily: 'monospace', fontSize: 9, letterSpacing: 2, color: muted, marginBottom: 4 }}>TOTAL HEADS</div>
            <div style={{ fontSize: 22, fontWeight: 700, color: accent }}>{totalHeads}</div>
          </div>
        </div>

        {/* List */}
        <div style={{ background: '#fff', borderRadius: 12, border: `1px solid ${border}`, overflow: 'hidden' }}>
          <div style={{ padding: '14px 24px', borderBottom: `1px solid ${border}`, fontFamily: 'monospace', fontSize: 10, letterSpacing: 2, color: muted, textTransform: 'uppercase' }}>
            Names
          </div>
          {guests.length === 0 ? (
            <div style={{ padding: '30px 24px', textAlign: 'center', color: muted, fontStyle: 'italic' }}>
              No guests yet.
            </div>
          ) : (
            guests.map((g: any, i: number) => (
              <div key={g.id} style={{ display: 'grid', gridTemplateColumns: '28px 1fr auto', gap: 12, padding: '14px 24px', borderBottom: i < guests.length - 1 ? `1px solid ${border}` : 'none', alignItems: 'baseline' }}>
                <span style={{ fontFamily: 'monospace', fontSize: 11, color: muted, textAlign: 'right' }}>{i + 1}</span>
                <div>
                  <div style={{ fontSize: 15, fontWeight: 600 }}>
                    {g.name}
                    {g.plus_n > 0 && <span style={{ fontFamily: 'monospace', fontSize: 13, color: accent, marginLeft: 8, fontWeight: 700 }}>+{g.plus_n}</span>}
                  </div>
                  {g.notes && <div style={{ fontSize: 12, color: muted, fontStyle: 'italic', marginTop: 2 }}>{g.notes}</div>}
                </div>
                <div style={{ fontFamily: 'monospace', fontSize: 11, color: muted }}>
                  {1 + (g.plus_n || 0)} {1 + (g.plus_n || 0) === 1 ? 'head' : 'heads'}
                </div>
              </div>
            ))
          )}
        </div>

        <div style={{ textAlign: 'center', paddingTop: 20, fontFamily: 'monospace', fontSize: 10, letterSpacing: '0.2em', color: '#C8BFB0' }}>
          ADVANCE · {artist?.name?.toUpperCase()}
        </div>
      </div>
    </div>
  )
}

function formatTime(t: string) {
  if (!t) return ''
  const [h, m] = t.split(':')
  const hour = parseInt(h)
  return `${hour % 12 || 12}:${m}${hour >= 12 ? 'pm' : 'am'}`
}
