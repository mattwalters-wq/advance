import { ImageResponse } from 'next/og'
import { createClient } from '@supabase/supabase-js'

export const runtime = 'edge'
export const alt = 'Tour'
export const size = { width: 1200, height: 630 }
export const contentType = 'image/png'

export default async function Image({ params }: { params: { token: string } }) {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )

  const { data: tour } = await supabase.from('tours').select('*, artists(name, color)').eq('share_token', params.token).single()
  const artist = (tour as any)?.artists
  const accent = artist?.color || '#C4622D'

  const { data: shows } = tour
    ? await supabase.from('shows').select('date, venue, city, set_time').eq('tour_id', tour.id).order('date').limit(4)
    : { data: [] }

  function fmtDateShort(d: string) {
    if (!d) return ''
    return new Date(d + 'T00:00:00').toLocaleDateString('en-AU', { day: 'numeric', month: 'short' }).toUpperCase()
  }

  return new ImageResponse(
    (
      <div style={{ width: '1200px', height: '630px', background: '#0F0E0C', display: 'flex', flexDirection: 'column', fontFamily: 'serif', position: 'relative', overflow: 'hidden' }}>
        <div style={{ position: 'absolute', left: 0, top: 0, width: 6, height: '100%', background: accent }} />

        <div style={{ display: 'flex', alignItems: 'center', padding: '44px 60px 0', gap: 16 }}>
          <div style={{ fontFamily: 'serif', fontSize: 28, fontStyle: 'italic', color: '#F4EFE6' }}>Advance</div>
          <div style={{ fontFamily: 'monospace', fontSize: 11, letterSpacing: '3px', color: accent }}>CREW LINK</div>
        </div>

        <div style={{ display: 'flex', flex: 1, padding: '32px 60px 44px', gap: 48, alignItems: 'center' }}>
          <div style={{ display: 'flex', flexDirection: 'column', flex: 1 }}>
            <div style={{ fontSize: 64, fontWeight: 700, color: '#F4EFE6', lineHeight: 1.05, marginBottom: 12, letterSpacing: '-1px' }}>
              {artist?.name || 'Tour'}
            </div>
            <div style={{ width: 60, height: 3, background: accent, marginBottom: 20 }} />
            <div style={{ fontSize: 24, color: '#5A5450', fontFamily: 'monospace', letterSpacing: '1px' }}>
              {tour?.name?.toUpperCase() || ''}
            </div>
          </div>

          {/* Show list */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10, minWidth: 280 }}>
            {(shows || []).slice(0, 4).map((s: any, i: number) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 16, background: '#1A1714', borderRadius: 8, padding: '12px 20px', border: '1px solid #2A2520' }}>
                <div style={{ fontFamily: 'monospace', fontSize: 11, color: accent, letterSpacing: '1px', minWidth: 60 }}>{fmtDateShort(s.date)}</div>
                <div style={{ fontSize: 16, color: '#C8BFB0', overflow: 'hidden' }}>
                  {(s.venue || '').length > 28 ? (s.venue || '').slice(0, 28) + '…' : (s.venue || '')}
                </div>
              </div>
            ))}
            {(shows?.length || 0) > 4 && (
              <div style={{ fontFamily: 'monospace', fontSize: 11, color: '#3A3530', letterSpacing: '1px', paddingLeft: 20 }}>
                +{(shows?.length || 0) - 4} MORE SHOWS
              </div>
            )}
          </div>
        </div>

        <div style={{ display: 'flex', padding: '0 60px 32px', justifyContent: 'space-between' }}>
          <div style={{ fontFamily: 'monospace', fontSize: 11, letterSpacing: '2px', color: '#2A2520' }}>GETADVANCE.CO</div>
          <div style={{ fontFamily: 'monospace', fontSize: 11, letterSpacing: '2px', color: '#2A2520' }}>POWERED BY ADVANCE</div>
        </div>
      </div>
    ),
    { ...size }
  )
}
