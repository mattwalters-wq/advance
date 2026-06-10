'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase'
import { useRouter } from 'next/navigation'

const MONO = "'IBM Plex Mono', monospace"
const SERIF = "'Instrument Sans', sans-serif"
const DISPLAY = "'Bricolage Grotesque', sans-serif"
const INK = '#13241c'
const MUTED = '#5f6e64'
const DUR = '14s'

function Tag({ label, bg, color }: { label: string; bg: string; color: string }) {
  return (
    <span style={{ fontFamily: MONO, fontSize: 10, letterSpacing: '0.1em', padding: '4px 8px', borderRadius: 4, background: bg, color, flexShrink: 0, minWidth: 52, textAlign: 'center' }}>
      {label}
    </span>
  )
}

function Row({ anim, tag, text, right, isLast }: { anim: string; tag: React.ReactNode; text: string; right?: string; isLast?: boolean }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 2px', borderBottom: isLast ? 'none' : '1px solid rgba(19,36,28,0.07)', animation: `${anim} ${DUR} ease-in-out infinite`, opacity: 0 }}>
      {tag}
      <span style={{ fontFamily: SERIF, fontSize: 15, color: INK, flexGrow: 1, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{text}</span>
      {right ? <span style={{ fontFamily: MONO, fontSize: 11.5, color: MUTED, flexShrink: 0, whiteSpace: 'nowrap' }}>{right}</span> : null}
    </div>
  )
}

function Doc({ anim, name, type }: { anim: string; name: string; type: string }) {
  return (
    <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', pointerEvents: 'none' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, background: '#ffffff', border: '1px solid rgba(19,36,28,0.14)', borderRadius: 10, padding: '11px 16px', boxShadow: '0 14px 30px rgba(19,36,28,0.16)', animation: `${anim} ${DUR} ease-in-out infinite`, opacity: 0 }}>
        <span style={{ fontFamily: MONO, fontSize: 9.5, letterSpacing: '0.08em', padding: '3px 6px', borderRadius: 3, background: 'rgba(31,111,84,0.12)', color: '#1f6f54' }}>{type}</span>
        <span style={{ fontFamily: MONO, fontSize: 12, color: INK, whiteSpace: 'nowrap' }}>{name}</span>
      </div>
    </div>
  )
}

function HeroStage() {
  return (
    <div style={{ position: 'relative' }}>
      {/* backdrop offset card */}
      <div style={{ position: 'absolute', inset: '14px -14px -14px 14px', background: 'rgba(19,36,28,0.05)', borderRadius: 18 }} />
      <div style={{ position: 'relative', background: '#fdfdfb', border: '1px solid rgba(19,36,28,0.1)', borderRadius: 18, padding: 24, boxShadow: '0 24px 60px rgba(19,36,28,0.1)' }}>
        {/* drop zone */}
        <div style={{ position: 'relative', height: 96, border: '1.5px dashed rgba(19,36,28,0.18)', borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#eef1ec', animation: `adv-zone ${DUR} ease-in-out infinite` }}>
          <span style={{ fontFamily: MONO, fontSize: 10.5, letterSpacing: '0.18em', color: '#8b968f', whiteSpace: 'nowrap' }}>DROP A DOC — PDF · XLSX · PNG</span>
          <Doc anim="adv-doc1" name="QF583-flight-confirmation.pdf" type="PDF" />
          <Doc anim="adv-doc2" name="corner-hotel-worksheet.xlsx" type="XLS" />
        </div>
        {/* itinerary header */}
        <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', margin: '22px 2px 4px' }}>
          <div>
            <div style={{ fontFamily: MONO, fontSize: 10, letterSpacing: '0.2em', color: '#1f6f54' }}>EAST COAST RUN · JUN 2026</div>
            <div style={{ fontFamily: DISPLAY, fontSize: 21, fontWeight: 600, color: INK, marginTop: 6 }}>Thu 18 Jun — Melbourne</div>
          </div>
          <span style={{ fontFamily: MONO, fontSize: 10.5, color: '#8b968f', letterSpacing: '0.1em', whiteSpace: 'nowrap' }}>DAY 4 OF 12</span>
        </div>
        {/* rows */}
        <div style={{ marginTop: 8 }}>
          <Row anim="adv-row1" tag={<Tag label="FLIGHT" bg="rgba(31,111,84,0.12)" color="#1f6f54" />} text="QF583 · SYD → MEL" right="09:05" />
          <Row anim="adv-row2" tag={<Tag label="HOTEL" bg="rgba(53,96,141,0.12)" color="#35608d" />} text="The Prince, St Kilda" right="IN 14:00" />
          <Row anim="adv-row3" tag={<Tag label="SHOW" bg="rgba(19,36,28,0.1)" color={INK} />} text="Corner Hotel, Richmond" right="20:30" />
          <Row anim="adv-row4" tag={<Tag label="SOUND" bg="rgba(19,36,28,0.06)" color={MUTED} />} text="Soundcheck" right="16:30" />
          <Row anim="adv-row5" tag={<Tag label="DOORS" bg="rgba(19,36,28,0.06)" color={MUTED} />} text="Doors open" right="19:00" isLast />
        </div>
        {/* badge */}
        <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 14 }}>
          <span style={{ fontFamily: MONO, fontSize: 11, letterSpacing: '0.14em', color: '#f6faf7', background: '#1f6f54', padding: '8px 14px', borderRadius: 100, animation: `adv-badge ${DUR} ease-in-out infinite`, opacity: 0 }}>DAY SHEET READY →</span>
        </div>
      </div>
    </div>
  )
}

export default function LandingPage() {
  const router = useRouter()
  const supabase = createClient()
  const [checking, setChecking] = useState(true)

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) router.push('/dashboard')
      else setChecking(false)
    })
  }, [])

  if (checking) return <div style={{ background: '#f3f4f0', minHeight: '100vh' }} />

  return (
    <div style={{ fontFamily: SERIF, background: '#f3f4f0', minHeight: '100vh', color: INK }}>
      <style>{`
        ::selection { background: rgba(31,111,84,0.22); }
        @keyframes adv-doc1 {
          0%, 1.5% { opacity: 0; transform: translateY(-110px) rotate(-6deg); }
          6% { opacity: 1; transform: translateY(0) rotate(1.5deg); }
          10% { opacity: 1; transform: translateY(0) rotate(1.5deg); }
          13%, 100% { opacity: 0; transform: translateY(12px) scale(0.92); }
        }
        @keyframes adv-doc2 {
          0%, 29% { opacity: 0; transform: translateY(-110px) rotate(5deg); }
          33.5% { opacity: 1; transform: translateY(0) rotate(-1.5deg); }
          37.5% { opacity: 1; transform: translateY(0) rotate(-1.5deg); }
          40.5%, 100% { opacity: 0; transform: translateY(12px) scale(0.92); }
        }
        @keyframes adv-row1 { 0%, 13.5% { opacity: 0; transform: translateY(10px); } 17% { opacity: 1; transform: translateY(0); } 90% { opacity: 1; } 95%, 100% { opacity: 0; } }
        @keyframes adv-row2 { 0%, 17% { opacity: 0; transform: translateY(10px); } 20.5% { opacity: 1; transform: translateY(0); } 90% { opacity: 1; } 95%, 100% { opacity: 0; } }
        @keyframes adv-row3 { 0%, 41% { opacity: 0; transform: translateY(10px); } 44.5% { opacity: 1; transform: translateY(0); } 90% { opacity: 1; } 95%, 100% { opacity: 0; } }
        @keyframes adv-row4 { 0%, 44.5% { opacity: 0; transform: translateY(10px); } 48% { opacity: 1; transform: translateY(0); } 90% { opacity: 1; } 95%, 100% { opacity: 0; } }
        @keyframes adv-row5 { 0%, 48% { opacity: 0; transform: translateY(10px); } 51.5% { opacity: 1; transform: translateY(0); } 90% { opacity: 1; } 95%, 100% { opacity: 0; } }
        @keyframes adv-badge { 0%, 57% { opacity: 0; transform: translateY(8px) scale(0.96); } 61% { opacity: 1; transform: translateY(0) scale(1); } 90% { opacity: 1; } 95%, 100% { opacity: 0; } }
        @keyframes adv-zone { 0%, 1% { border-color: rgba(19,36,28,0.18); } 4% { border-color: rgba(31,111,84,0.65); } 12% { border-color: rgba(31,111,84,0.65); } 16% { border-color: rgba(19,36,28,0.18); } 29% { border-color: rgba(19,36,28,0.18); } 32% { border-color: rgba(31,111,84,0.65); } 39% { border-color: rgba(31,111,84,0.65); } 43%, 100% { border-color: rgba(19,36,28,0.18); } }
        html { scroll-behavior: smooth; }
        .adv-link-muted { color: #7d7468; transition: color 0.15s; }
        .adv-link-muted:hover { color: #13241c; }
        .adv-btn-solid { background: #1f6f54; transition: background 0.15s; }
        .adv-btn-solid:hover { background: #175940; }
        .adv-btn-ghost { transition: border-color 0.15s; }
        .adv-btn-ghost:hover { border-color: #13241c !important; }
        .adv-footer-link { color: #84908a; transition: color 0.15s; }
        .adv-footer-link:hover { color: #13241c; }
        @media (max-width: 900px) {
          .adv-hero { grid-template-columns: 1fr !important; }
          .adv-how-grid { grid-template-columns: repeat(2, 1fr) !important; }
          .adv-features-grid { grid-template-columns: 1fr !important; column-gap: 0 !important; }
          .adv-nav-links { display: none !important; }
        }
        @media (max-width: 560px) {
          .adv-how-grid { grid-template-columns: 1fr !important; }
        }
      `}</style>

      {/* ============ NAV ============ */}
      <nav style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', maxWidth: 1240, margin: '0 auto', padding: '26px 48px' }}>
        <div style={{ fontFamily: DISPLAY, fontWeight: 700, fontSize: 25, letterSpacing: '-0.01em' }}>Advance</div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
          <a href="#how" className="adv-nav-links adv-link-muted" style={{ whiteSpace: 'nowrap', fontFamily: MONO, fontSize: 12, letterSpacing: '0.12em', textTransform: 'uppercase', textDecoration: 'none' }}>How it works</a>
          <a href="#features" className="adv-nav-links adv-link-muted" style={{ whiteSpace: 'nowrap', fontFamily: MONO, fontSize: 12, letterSpacing: '0.12em', textTransform: 'uppercase', textDecoration: 'none' }}>Features</a>
          <a href="/auth/signin" className="adv-btn-ghost" style={{ whiteSpace: 'nowrap', fontFamily: MONO, fontSize: 12, letterSpacing: '0.12em', textTransform: 'uppercase', color: INK, textDecoration: 'none', padding: '10px 18px', border: '1px solid rgba(19,36,28,0.22)', borderRadius: 7 }}>Sign in</a>
          <a href="/auth/signup" className="adv-btn-solid" style={{ whiteSpace: 'nowrap', fontFamily: MONO, fontSize: 12, letterSpacing: '0.12em', textTransform: 'uppercase', color: '#f6faf7', textDecoration: 'none', padding: '11px 19px', borderRadius: 7 }}>Get started</a>
        </div>
      </nav>

      {/* ============ HERO ============ */}
      <header className="adv-hero" style={{ maxWidth: 1240, margin: '0 auto', padding: '72px 48px 96px', display: 'grid', gridTemplateColumns: '1.04fr 0.96fr', gap: 'clamp(40px, 5vw, 72px)', alignItems: 'center' }}>
        <div>
          <div style={{ display: 'inline-block', whiteSpace: 'nowrap', fontFamily: MONO, fontSize: 11, letterSpacing: '0.22em', color: '#7d7468', border: '1px solid rgba(19,36,28,0.18)', borderRadius: 100, padding: '7px 16px', background: '#fbfcfa' }}>TOUR MANAGEMENT</div>
          <h1 style={{ fontFamily: DISPLAY, fontSize: 'clamp(46px, 5.6vw, 72px)', lineHeight: 1.04, margin: '28px 0 0', fontWeight: 600, letterSpacing: '-0.015em' }}>
            Drop a doc.<br />
            <em style={{ fontStyle: 'normal', fontWeight: 500, color: '#4c5e54' }}>Your tour <span style={{ display: 'inline-block', position: 'relative' }}>builds itself.<svg width="100%" height="11" viewBox="0 0 320 11" preserveAspectRatio="none" style={{ position: 'absolute', left: 0, bottom: -12, display: 'block' }}><path d="M4 8 Q 160 1 316 6" stroke="#1f6f54" strokeWidth="3.5" fill="none" strokeLinecap="round" /></svg></span></em>
          </h1>
          <p style={{ fontSize: 19, lineHeight: 1.65, color: '#46554c', margin: '36px 0 0', maxWidth: '47ch' }}>Advance reads itineraries, flight confirmations, hotel bookings and venue worksheets — then builds and updates the tour for you. No retyping. No spreadsheet.</p>
          <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 16, marginTop: 38 }}>
            <a href="/auth/signup" className="adv-btn-solid" style={{ whiteSpace: 'nowrap', fontFamily: MONO, fontSize: 13, letterSpacing: '0.14em', textTransform: 'uppercase', color: '#f6faf7', textDecoration: 'none', padding: '17px 30px', borderRadius: 8, boxShadow: '0 10px 24px rgba(31,111,84,0.28)' }}>Get started free</a>
            <a href="#how" className="adv-btn-ghost" style={{ whiteSpace: 'nowrap', fontFamily: MONO, fontSize: 13, letterSpacing: '0.14em', textTransform: 'uppercase', color: INK, textDecoration: 'none', padding: '16px 28px', border: '1px solid rgba(19,36,28,0.25)', borderRadius: 8 }}>See how it works</a>
          </div>
          <div style={{ whiteSpace: 'nowrap', fontFamily: MONO, fontSize: 11.5, letterSpacing: '0.18em', color: '#84908a', marginTop: 28 }}>UNLIMITED ARTISTS &nbsp;·&nbsp; FREE DURING BETA</div>
        </div>
        <HeroStage />
      </header>

      {/* ============ REPLACES STRIP ============ */}
      <section style={{ background: '#fbfcfa', borderTop: '1px solid rgba(19,36,28,0.09)', borderBottom: '1px solid rgba(19,36,28,0.09)' }}>
        <div style={{ maxWidth: 1240, margin: '0 auto', padding: '26px 48px', display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'center', gap: '18px 36px' }}>
          <span style={{ whiteSpace: 'nowrap', fontFamily: MONO, fontSize: 12, letterSpacing: '0.16em', color: '#84908a' }}>REPLACES</span>
          {['MASTER TOUR', 'SPREADSHEETS', 'PDF DAY SHEETS', 'EMAIL THREADS'].map((item) => (
            <span key={item} style={{ whiteSpace: 'nowrap', fontFamily: MONO, fontSize: 13, letterSpacing: '0.14em', color: '#46554c' }}>
              <span style={{ color: '#1f6f54', marginRight: 9 }}>✕</span>
              <span style={{ textDecoration: 'line-through', textDecorationColor: 'rgba(31,111,84,0.55)', textDecorationThickness: '1.5px' }}>{item}</span>
            </span>
          ))}
        </div>
      </section>

      {/* ============ HOW IT WORKS ============ */}
      <section id="how" style={{ maxWidth: 1240, margin: '0 auto', padding: '110px 48px 120px' }}>
        <div style={{ textAlign: 'center', whiteSpace: 'nowrap', fontFamily: MONO, fontSize: 11.5, letterSpacing: '0.24em', color: '#1f6f54' }}>HOW IT WORKS</div>
        <h2 style={{ fontFamily: DISPLAY, fontSize: 'clamp(36px, 4.2vw, 50px)', fontWeight: 600, textAlign: 'center', margin: '18px 0 0', letterSpacing: '-0.01em' }}>Your agent sends docs. <em style={{ fontStyle: 'normal', fontWeight: 500, color: '#4c5e54' }}>You drop them in.</em></h2>
        <div className="adv-how-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 40, marginTop: 72 }}>
          {[
            ['01', 'Drop any document', 'PDF, Word, Excel, screenshot. Booking confirmations, hotel reservations, flight itineraries, venue worksheets.'],
            ['02', 'The tour builds itself', "Shows, flights, hotels and contacts are extracted and matched against what's already there. No duplicates. Gaps filled."],
            ['03', 'Drop the next one', "Travel agent sends flights? Drop it in. Venue sends a worksheet? Drop it in. Each doc adds to what's already there."],
            ['04', 'Talk to it', '"Change the VA703 to depart at 21:00." "Add the Westin Perth, check-in 22nd." It acts on your instructions directly.'],
          ].map(([num, title, desc]) => (
            <div key={num} style={{ borderTop: '2px solid #13241c', paddingTop: 24 }}>
              <div style={{ whiteSpace: 'nowrap', fontFamily: MONO, fontSize: 13, letterSpacing: '0.1em', color: '#1f6f54' }}>{num}</div>
              <h3 style={{ fontFamily: DISPLAY, fontSize: 23, fontWeight: 600, margin: '14px 0 0' }}>{title}</h3>
              <p style={{ fontSize: 15.5, lineHeight: 1.65, color: '#4c5e54', margin: '12px 0 0' }}>{desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ============ SPEED BAND ============ */}
      <section style={{ background: '#102019', padding: '120px 48px', textAlign: 'center' }}>
        <div style={{ whiteSpace: 'nowrap', fontFamily: MONO, fontSize: 11.5, letterSpacing: '0.24em', color: '#4fbf8d' }}>BUILT FOR SPEED</div>
        <h2 style={{ fontFamily: DISPLAY, fontSize: 'clamp(40px, 4.6vw, 58px)', fontWeight: 600, color: '#f3f4f0', margin: '22px auto 0', maxWidth: '18ch', lineHeight: 1.12, letterSpacing: '-0.01em' }}>No more typing it in <em style={{ fontStyle: 'normal', fontWeight: 500, color: '#4fbf8d' }}>twice.</em></h2>
        <p style={{ fontSize: 19, lineHeight: 1.7, color: 'rgba(243,244,240,0.72)', maxWidth: '52ch', margin: '28px auto 0' }}>What used to be an evening of data entry after every email is a thirty-second drag and drop. Forward it, drop it, move on with your day.</p>
        <div style={{ whiteSpace: 'nowrap', fontFamily: MONO, fontSize: 12, letterSpacing: '0.2em', color: 'rgba(243,244,240,0.45)', marginTop: 40 }}>PDF &nbsp;·&nbsp; WORD &nbsp;·&nbsp; EXCEL &nbsp;·&nbsp; SCREENSHOTS — ALL OF IT</div>
      </section>

      {/* ============ FEATURES ============ */}
      <section id="features" style={{ maxWidth: 1240, margin: '0 auto', padding: '110px 48px 120px' }}>
        <div style={{ textAlign: 'center', whiteSpace: 'nowrap', fontFamily: MONO, fontSize: 11.5, letterSpacing: '0.24em', color: '#1f6f54' }}>EVERYTHING INCLUDED</div>
        <h2 style={{ fontFamily: DISPLAY, fontSize: 'clamp(36px, 4.2vw, 50px)', fontWeight: 600, textAlign: 'center', margin: '18px 0 0', letterSpacing: '-0.01em' }}>One tool. <em style={{ fontStyle: 'normal', fontWeight: 500, color: '#4c5e54' }}>The whole tour.</em></h2>
        <div className="adv-features-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', columnGap: 80, marginTop: 64 }}>
          {[
            ['01', 'Smart Import', 'Drop any file and the tour updates itself.'],
            ['02', 'Chat Assistant', 'Change flights, add hotels, fix details by asking.'],
            ['03', 'Day Sheets', 'Auto-generated for every show. Print or share a link.'],
            ['04', 'Logistics Flags', 'Auto-spots missing travel, hotels and tight connections.'],
            ['05', 'Schedule View', 'Every day of the tour at a glance, Master Tour style.'],
            ['06', 'Crew Share', 'No login needed. Tap to call, tap to map.'],
            ['07', 'Settlements', "Track deals, payments and what's still outstanding."],
            ['08', 'Rider', 'Tech spec, backline and hospitality all in one place.'],
            ['09', 'Roster Search', 'Find any venue, contact or flight across all artists.'],
            ['10', 'Team Access', 'Invite your TM with role-based tour access.'],
          ].map(([num, title, desc], i) => {
            const lastRow = i >= 8
            return (
              <div key={num} style={{ display: 'flex', gap: 24, padding: '26px 4px', borderTop: '1px solid rgba(19,36,28,0.14)', borderBottom: lastRow ? '1px solid rgba(19,36,28,0.14)' : undefined }}>
                <span style={{ whiteSpace: 'nowrap', fontFamily: MONO, fontSize: 13, color: '#1f6f54', paddingTop: 5, flexShrink: 0 }}>{num}</span>
                <div>
                  <h3 style={{ fontFamily: DISPLAY, fontSize: 21, fontWeight: 600, margin: 0, display: 'inline' }}>{title}</h3>
                  <p style={{ fontSize: 15.5, lineHeight: 1.6, color: '#4c5e54', margin: '8px 0 0' }}>{desc}</p>
                </div>
              </div>
            )
          })}
        </div>
      </section>

      {/* ============ FINAL CTA ============ */}
      <section style={{ borderTop: '1px solid rgba(19,36,28,0.09)', padding: '130px 48px 140px', textAlign: 'center' }}>
        <h2 style={{ fontFamily: DISPLAY, fontSize: 'clamp(38px, 4.4vw, 54px)', fontWeight: 600, margin: '0 auto', maxWidth: '22ch', lineHeight: 1.15, letterSpacing: '-0.01em' }}>Built for managers who are done <em style={{ fontStyle: 'normal', fontWeight: 500, color: '#4c5e54' }}>patching things together.</em></h2>
        <div style={{ whiteSpace: 'nowrap', fontFamily: MONO, fontSize: 12, letterSpacing: '0.2em', color: '#84908a', marginTop: 26 }}>FREE DURING BETA &nbsp;·&nbsp; UNLIMITED ARTISTS &nbsp;·&nbsp; GETADVANCE.CO</div>
        <div style={{ display: 'flex', justifyContent: 'center', marginTop: 38 }}>
          <a href="/auth/signup" className="adv-btn-solid" style={{ whiteSpace: 'nowrap', fontFamily: MONO, fontSize: 13, letterSpacing: '0.14em', textTransform: 'uppercase', color: '#f6faf7', textDecoration: 'none', padding: '18px 34px', borderRadius: 8, boxShadow: '0 10px 24px rgba(31,111,84,0.28)' }}>Get started free</a>
        </div>
      </section>

      {/* ============ FOOTER ============ */}
      <footer style={{ borderTop: '1px solid rgba(19,36,28,0.09)', maxWidth: 1240, margin: '0 auto', padding: '34px 48px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 16 }}>
        <div style={{ fontFamily: DISPLAY, fontWeight: 700, fontSize: 18, color: '#84908a' }}>Advance</div>
        <div style={{ display: 'flex', gap: 32 }}>
          <a href="/terms" className="adv-footer-link" style={{ whiteSpace: 'nowrap', fontFamily: MONO, fontSize: 11.5, letterSpacing: '0.16em', textDecoration: 'none' }}>TERMS</a>
          <a href="/privacy" className="adv-footer-link" style={{ whiteSpace: 'nowrap', fontFamily: MONO, fontSize: 11.5, letterSpacing: '0.16em', textDecoration: 'none' }}>PRIVACY</a>
          <a href="/contact" className="adv-footer-link" style={{ whiteSpace: 'nowrap', fontFamily: MONO, fontSize: 11.5, letterSpacing: '0.16em', textDecoration: 'none' }}>CONTACT</a>
        </div>
      </footer>
    </div>
  )
}
