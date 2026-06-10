import { ImageResponse } from 'next/og'

export const runtime = 'edge'
export const alt = 'Advance — Drop a doc. Your tour builds itself.'
export const size = { width: 1200, height: 630 }
export const contentType = 'image/png'

const INK = '#13241c'
const MUTED = '#4c5e54'
const ACCENT = '#1f6f54'

function Chip({ label, bg, color }: { label: string; bg: string; color: string }) {
  return (
    <div style={{ display: 'flex', fontFamily: 'monospace', fontSize: 13, letterSpacing: '1px', padding: '5px 9px', borderRadius: 5, background: bg, color, minWidth: 64, justifyContent: 'center' }}>
      {label}
    </div>
  )
}

function Line({ chip, text, time, last }: { chip: React.ReactNode; text: string; time: string; last?: boolean }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '13px 2px', borderBottom: last ? 'none' : '1px solid rgba(19,36,28,0.08)' }}>
      {chip}
      <div style={{ display: 'flex', flex: 1, fontSize: 17, color: INK }}>{text}</div>
      <div style={{ display: 'flex', fontFamily: 'monospace', fontSize: 13, color: '#5f6e64' }}>{time}</div>
    </div>
  )
}

export default function Image() {
  return new ImageResponse(
    (
      <div style={{ width: '1200px', height: '630px', background: '#f3f4f0', display: 'flex', alignItems: 'center', padding: '0 64px', gap: 56, fontFamily: 'sans-serif' }}>
        {/* Left column */}
        <div style={{ display: 'flex', flexDirection: 'column', flex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            <div style={{ display: 'flex', fontSize: 30, fontWeight: 700, color: INK, letterSpacing: '-0.5px' }}>Advance</div>
            <div style={{ display: 'flex', fontFamily: 'monospace', fontSize: 13, letterSpacing: '4px', color: ACCENT }}>TOUR MANAGEMENT</div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', marginTop: 40 }}>
            <div style={{ display: 'flex', fontSize: 62, fontWeight: 700, color: INK, letterSpacing: '-1.5px', lineHeight: 1.05 }}>Drop a doc.</div>
            <div style={{ display: 'flex', fontSize: 62, fontWeight: 600, color: MUTED, letterSpacing: '-1.5px', lineHeight: 1.05 }}>Your tour builds itself.</div>
            <div style={{ display: 'flex', width: 430, height: 6, borderRadius: 3, background: ACCENT, marginTop: 8 }} />
          </div>

          <div style={{ display: 'flex', fontSize: 23, color: '#46554c', lineHeight: 1.5, marginTop: 32, maxWidth: 560 }}>
            Reads itineraries, flights, hotels and venue worksheets — then builds and updates the tour for you.
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 26, marginTop: 40 }}>
            {['MASTER TOUR', 'SPREADSHEETS', 'PDF DAY SHEETS'].map((t) => (
              <div key={t} style={{ display: 'flex', alignItems: 'center', gap: 8, fontFamily: 'monospace', fontSize: 14, letterSpacing: '1px', color: '#46554c' }}>
                <div style={{ display: 'flex', color: ACCENT }}>✕</div>
                <div style={{ display: 'flex', textDecoration: 'line-through' }}>{t}</div>
              </div>
            ))}
          </div>

          <div style={{ display: 'flex', fontFamily: 'monospace', fontSize: 16, letterSpacing: '3px', color: '#84908a', marginTop: 56 }}>GETADVANCE.CO</div>
        </div>

        {/* Right column — demo card */}
        <div style={{ display: 'flex', position: 'relative', width: 430 }}>
          <div style={{ display: 'flex', position: 'absolute', top: 14, left: 14, width: 430, height: 360, background: 'rgba(19,36,28,0.05)', borderRadius: 18 }} />
          <div style={{ display: 'flex', flexDirection: 'column', width: 430, background: '#fdfdfb', border: '1px solid rgba(19,36,28,0.1)', borderRadius: 18, padding: 22, boxShadow: '0 24px 60px rgba(19,36,28,0.12)' }}>
            {/* drop zone */}
            <div style={{ display: 'flex', height: 88, border: `1.5px dashed ${ACCENT}`, borderRadius: 12, background: '#eef1ec', alignItems: 'center', justifyContent: 'center' }}>
              <div style={{ display: 'flex', fontFamily: 'monospace', fontSize: 12, letterSpacing: '2px', color: '#8b968f' }}>DROP A DOC — PDF · XLSX · PNG</div>
            </div>
            {/* itinerary header */}
            <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', marginTop: 20, marginBottom: 4 }}>
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                <div style={{ display: 'flex', fontFamily: 'monospace', fontSize: 11, letterSpacing: '2px', color: ACCENT }}>EAST COAST RUN · JUN 2026</div>
                <div style={{ display: 'flex', fontSize: 21, fontWeight: 600, color: INK, marginTop: 6 }}>Thu 18 Jun — Melbourne</div>
              </div>
              <div style={{ display: 'flex', fontFamily: 'monospace', fontSize: 11, letterSpacing: '1px', color: '#8b968f' }}>DAY 4 OF 12</div>
            </div>
            {/* rows */}
            <div style={{ display: 'flex', flexDirection: 'column', marginTop: 6 }}>
              <Line chip={<Chip label="FLIGHT" bg="rgba(31,111,84,0.12)" color={ACCENT} />} text="QF583 · SYD → MEL" time="09:05" />
              <Line chip={<Chip label="HOTEL" bg="rgba(53,96,141,0.12)" color="#35608d" />} text="The Prince, St Kilda" time="IN 14:00" />
              <Line chip={<Chip label="SHOW" bg="rgba(19,36,28,0.1)" color={INK} />} text="Corner Hotel, Richmond" time="20:30" last />
            </div>
            {/* badge */}
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 14 }}>
              <div style={{ display: 'flex', fontFamily: 'monospace', fontSize: 12, letterSpacing: '1.5px', color: '#f6faf7', background: ACCENT, padding: '8px 14px', borderRadius: 100 }}>DAY SHEET READY →</div>
            </div>
          </div>
        </div>
      </div>
    ),
    { ...size }
  )
}
