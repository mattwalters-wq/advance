import { ImageResponse } from 'next/og'
import { createClient } from '@supabase/supabase-js'

export const runtime = 'edge'
export const alt = 'Day Sheet'
export const size = { width: 1200, height: 630 }
export const contentType = 'image/png'

export default async function Image({ params }: { params: { show_id: string } }) {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )

  const { data: show } = await supabase.from('shows').select('*').eq('id', params.show_id).single()
  const { data: tour } = show ? await supabase.from('tours').select('*, artists(name, color)').eq('id', show.tour_id).single() : { data: null }

  const artist = (tour as any)?.artists
  const accent = artist?.color || '#C4622D'
  const artistName = artist?.name || 'Advance'
  const venueName = show?.venue
    ? show.venue.length > 55
      ? show.venue.split(/[-–](?:\s*Access|\s*Park|\s*Contact|\s*via|\s*Turn|\s*From)/i)[0].trim()
      : show.venue
    : 'Show'
  const location = [show?.city, show?.country && show?.country !== 'AU' ? show?.country : null].filter(Boolean).join(', ')

  function fmtDate(d: string) {
    if (!d) return ''
    return new Date(d + 'T00:00:00').toLocaleDateString('en-AU', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })
  }

  function fmt(t: string) {
    if (!t) return ''
    const [h, m] = t.split(':')
    const hour = parseInt(h)
    return `${hour % 12 || 12}:${m}${hour >= 12 ? 'pm' : 'am'}`
  }

  return new ImageResponse(
    (
      <div
        style={{
          width: '1200px',
          height: '630px',
          background: '#0F0E0C',
          display: 'flex',
          flexDirection: 'column',
          fontFamily: 'serif',
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        {/* Left accent bar */}
        <div style={{ position: 'absolute', left: 0, top: 0, width: 6, height: '100%', background: accent }} />

        {/* Top label */}
        <div style={{ display: 'flex', alignItems: 'center', padding: '44px 60px 0', gap: 16 }}>
          <div style={{ fontFamily: 'serif', fontSize: 28, fontStyle: 'italic', color: '#F4EFE6', letterSpacing: '-0.5px' }}>Advance</div>
          <div style={{ fontFamily: 'monospace', fontSize: 11, letterSpacing: '3px', color: accent }}>DAY SHEET</div>
        </div>

        {/* Main content */}
        <div style={{ display: 'flex', flex: 1, padding: '32px 60px 44px', gap: 48, alignItems: 'center' }}>

          {/* Left */}
          <div style={{ display: 'flex', flexDirection: 'column', flex: 1 }}>
            <div style={{ fontSize: 18, letterSpacing: '2px', color: accent, fontFamily: 'monospace', marginBottom: 12 }}>
              {show?.date ? fmtDate(show.date).toUpperCase() : ''}
            </div>
            <div style={{ fontSize: 58, fontWeight: 700, color: '#F4EFE6', lineHeight: 1.05, marginBottom: 10, letterSpacing: '-1px' }}>
              {artistName}
            </div>
            <div style={{ width: 60, height: 3, background: accent, marginBottom: 20 }} />
            <div style={{ fontSize: 28, color: '#C8BFB0', lineHeight: 1.3, marginBottom: 8 }}>
              {venueName}
            </div>
            {location && (
              <div style={{ fontSize: 20, color: '#5A5450', fontFamily: 'monospace', letterSpacing: '1px' }}>
                {location.toUpperCase()}
              </div>
            )}
          </div>

          {/* Right — times card */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12, minWidth: 240 }}>
            {show?.soundcheck_time && (
              <div style={{ display: 'flex', flexDirection: 'column', background: '#1A1714', borderRadius: 10, padding: '16px 24px', border: '1px solid #2A2520' }}>
                <div style={{ fontFamily: 'monospace', fontSize: 10, letterSpacing: '2px', color: '#5A5450', marginBottom: 6 }}>SOUNDCHECK</div>
                <div style={{ fontSize: 28, fontWeight: 700, color: '#F4EFE6' }}>{fmt(show.soundcheck_time)}</div>
              </div>
            )}
            {show?.doors_time && (
              <div style={{ display: 'flex', flexDirection: 'column', background: '#1A1714', borderRadius: 10, padding: '16px 24px', border: '1px solid #2A2520' }}>
                <div style={{ fontFamily: 'monospace', fontSize: 10, letterSpacing: '2px', color: '#5A5450', marginBottom: 6 }}>DOORS</div>
                <div style={{ fontSize: 28, fontWeight: 700, color: '#F4EFE6' }}>{fmt(show.doors_time)}</div>
              </div>
            )}
            {show?.set_time && (
              <div style={{ display: 'flex', flexDirection: 'column', background: accent, borderRadius: 10, padding: '16px 24px' }}>
                <div style={{ fontFamily: 'monospace', fontSize: 10, letterSpacing: '2px', color: 'rgba(255,255,255,0.7)', marginBottom: 6 }}>STAGE</div>
                <div style={{ fontSize: 32, fontWeight: 700, color: '#fff' }}>{fmt(show.set_time)}</div>
              </div>
            )}
            {!show?.soundcheck_time && !show?.doors_time && !show?.set_time && (
              <div style={{ display: 'flex', flexDirection: 'column', background: '#1A1714', borderRadius: 10, padding: '20px 28px', border: '1px solid #2A2520' }}>
                <div style={{ fontFamily: 'monospace', fontSize: 10, letterSpacing: '2px', color: '#5A5450', marginBottom: 6 }}>SHOW DAY</div>
                <div style={{ fontSize: 24, fontWeight: 700, color: '#F4EFE6' }}>{tour?.name || ''}</div>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div style={{ display: 'flex', alignItems: 'center', padding: '0 60px 32px', justifyContent: 'space-between' }}>
          <div style={{ fontFamily: 'monospace', fontSize: 11, letterSpacing: '2px', color: '#2A2520' }}>GETADVANCE.CO</div>
          <div style={{ fontFamily: 'monospace', fontSize: 11, letterSpacing: '2px', color: '#2A2520' }}>POWERED BY ADVANCE</div>
        </div>
      </div>
    ),
    { ...size }
  )
}
