'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase'
import { useRouter } from 'next/navigation'

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

  if (checking) return <div style={{ background: '#0F0E0C', minHeight: '100vh' }} />

  return (
    <div style={{ background: '#0F0E0C', minHeight: '100vh', fontFamily: '"Georgia", serif', color: '#F4EFE6', overflowX: 'hidden' }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,400;0,700;1,400;1,700&display=swap');
        * { box-sizing: border-box; margin: 0; padding: 0; }
        @keyframes fadeUp { from { opacity: 0; transform: translateY(24px) } to { opacity: 1; transform: translateY(0) } }
        .f1 { animation: fadeUp 0.7s ease 0.1s both; }
        .f2 { animation: fadeUp 0.7s ease 0.25s both; }
        .f3 { animation: fadeUp 0.7s ease 0.4s both; }
        .f4 { animation: fadeUp 0.7s ease 0.55s both; }
        .f5 { animation: fadeUp 0.7s ease 0.7s both; }
        .cta-primary { transition: background 0.2s, transform 0.15s; }
        .cta-primary:hover { background: #D4723D !important; transform: translateY(-1px); }
        .cta-secondary:hover { border-color: #C4622D !important; color: #C4622D !important; }
        .feature-card { transition: background 0.2s, border-color 0.2s; }
        .feature-card:hover { background: #161410 !important; border-color: #2E2A24 !important; }
        .nav-link:hover { color: #F4EFE6 !important; }
        .price-card:hover { border-color: #C4622D !important; }
      `}</style>

      {/* Nav */}
      <nav style={{ padding: '0 32px', height: 60, display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid #1E1C18', position: 'sticky', top: 0, background: 'rgba(15,14,12,0.92)', backdropFilter: 'blur(12px)', zIndex: 10 }}>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 10 }}>
          <span style={{ fontFamily: '"Playfair Display", Georgia, serif', fontSize: 22, fontStyle: 'italic', letterSpacing: '-0.02em' }}>Advance</span>
          <span style={{ fontFamily: 'monospace', fontSize: 8, letterSpacing: '0.25em', color: '#C4622D' }}>AI ✦</span>
        </div>
        <div style={{ display: 'flex', gap: 20, alignItems: 'center' }}>
          <a href="/terms" className="nav-link" style={{ fontSize: 13, color: '#6A6058', textDecoration: 'none', transition: 'color 0.15s' }}>Terms</a>
          <a href="/privacy" className="nav-link" style={{ fontSize: 13, color: '#6A6058', textDecoration: 'none', transition: 'color 0.15s' }}>Privacy</a>
          <button onClick={() => router.push('/auth/signin')}
            style={{ padding: '8px 18px', background: 'transparent', border: '1px solid #2E2A24', borderRadius: 6, color: '#8A8580', cursor: 'pointer', fontSize: 13, fontFamily: '"Georgia", serif' }}
            className="cta-secondary">
            Sign in
          </button>
          <button onClick={() => router.push('/auth/signup')}
            style={{ padding: '8px 18px', background: '#C4622D', border: 'none', borderRadius: 6, color: '#fff', cursor: 'pointer', fontSize: 13, fontFamily: '"Georgia", serif' }}
            className="cta-primary">
            Get started free
          </button>
        </div>
      </nav>

      {/* Hero */}
      <section style={{ maxWidth: 860, margin: '0 auto', padding: '100px 32px 80px', textAlign: 'center' }}>
        <div className="f1" style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '5px 14px', border: '1px solid #2E2A24', borderRadius: 20, marginBottom: 28, fontSize: 11, fontFamily: 'monospace', letterSpacing: '0.2em', color: '#C4622D' }}>
          ✦ AI-POWERED TOUR MANAGEMENT
        </div>
        <h1 className="f2" style={{ fontFamily: '"Playfair Display", Georgia, serif', fontSize: 'clamp(40px, 6.5vw, 68px)', fontWeight: 700, lineHeight: 1.08, marginBottom: 24, letterSpacing: '-0.02em' }}>
          Drop a doc.<br />
          <em style={{ color: '#6A6058', fontWeight: 400 }}>Your tour builds itself.</em>
        </h1>
        <p className="f3" style={{ fontSize: 18, color: '#6A6058', lineHeight: 1.75, maxWidth: 520, margin: '0 auto 20px' }}>
          Advance reads your itineraries, flight confirmations, hotel bookings and venue worksheets — then builds and updates the tour automatically.
        </p>
        <p className="f3" style={{ fontSize: 15, color: '#4A4540', lineHeight: 1.7, maxWidth: 460, margin: '0 auto 44px', fontFamily: 'monospace', letterSpacing: '0.05em' }}>
          Unlimited artists. One price. No per-artist fees.
        </p>
        <div className="f4" style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
          <button onClick={() => router.push('/auth/signup')} className="cta-primary"
            style={{ padding: '14px 36px', background: '#C4622D', color: '#fff', border: 'none', borderRadius: 8, fontFamily: 'monospace', fontSize: 11, letterSpacing: '0.2em', cursor: 'pointer' }}>
            START FREE
          </button>
          <button onClick={() => router.push('/auth/signin')} className="cta-secondary"
            style={{ padding: '14px 36px', background: 'transparent', color: '#6A6058', border: '1px solid #2E2A24', borderRadius: 8, fontFamily: 'monospace', fontSize: 11, letterSpacing: '0.2em', cursor: 'pointer', transition: 'all 0.2s' }}>
            SIGN IN
          </button>
        </div>
      </section>

      {/* Social proof strip */}
      <div style={{ borderTop: '1px solid #1A1814', borderBottom: '1px solid #1A1814', padding: '18px 32px' }}>
        <div style={{ maxWidth: 900, margin: '0 auto', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 40, flexWrap: 'wrap' }}>
          {[
            'Replaces Master Tour',
            'Replaces spreadsheets',
            'Replaces PDF day sheets',
            'Replaces email threads',
          ].map((item, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12, color: '#3A3530', fontFamily: 'monospace', letterSpacing: '0.1em' }}>
              <span style={{ color: '#C4622D', fontSize: 14 }}>✕</span> {item.toUpperCase()}
            </div>
          ))}
        </div>
      </div>

      {/* How it works */}
      <section style={{ maxWidth: 900, margin: '0 auto', padding: '80px 32px' }}>
        <div className="f5" style={{ textAlign: 'center', marginBottom: 56 }}>
          <div style={{ fontFamily: 'monospace', fontSize: 10, letterSpacing: '0.3em', color: '#C4622D', marginBottom: 14 }}>HOW IT WORKS</div>
          <h2 style={{ fontFamily: '"Playfair Display", Georgia, serif', fontSize: 'clamp(28px, 4vw, 40px)', fontWeight: 400 }}>
            Your agent sends docs. <em>You drop them in.</em>
          </h2>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 2, background: '#1A1814', borderRadius: 16, overflow: 'hidden', border: '1px solid #1A1814' }}>
          {[
            {
              step: '01',
              title: 'Drop any document',
              desc: 'PDF, Word, Excel, CSV, screenshots. Booking confirmations, hotel reservations, flight itineraries, venue worksheets — anything.',
            },
            {
              step: '02',
              title: 'AI reads and merges',
              desc: 'Shows, flights, hotels and contacts are extracted and matched against what\'s already in the tour. No duplicates. Gaps filled automatically.',
            },
            {
              step: '03',
              title: 'Drop the next one',
              desc: 'Travel agent sends flights? Drop it. Venue sends a worksheet? Drop it. Each doc adds to what\'s already there.',
            },
            {
              step: '04',
              title: 'Ask it anything',
              desc: '"Change the VA703 to depart at 21:00." "Add the Westin Perth, check in 22nd." The AI acts on your instructions directly.',
            },
          ].map((item, i) => (
            <div key={i} className="feature-card"
              style={{ padding: '32px 28px', background: '#0F0E0C', borderRight: '1px solid #1A1814', borderBottom: '1px solid #1A1814' }}>
              <div style={{ fontFamily: 'monospace', fontSize: 11, color: '#C4622D', letterSpacing: '0.2em', marginBottom: 14 }}>{item.step}</div>
              <div style={{ fontFamily: '"Playfair Display", Georgia, serif', fontSize: 17, fontWeight: 700, marginBottom: 10, color: '#F4EFE6', lineHeight: 1.3 }}>{item.title}</div>
              <div style={{ fontSize: 13, color: '#5A5450', lineHeight: 1.75 }}>{item.desc}</div>
            </div>
          ))}
        </div>
      </section>

      {/* Features */}
      <section style={{ background: '#0A0908', borderTop: '1px solid #1A1814', borderBottom: '1px solid #1A1814', padding: '80px 32px' }}>
        <div style={{ maxWidth: 900, margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: 56 }}>
            <div style={{ fontFamily: 'monospace', fontSize: 10, letterSpacing: '0.3em', color: '#C4622D', marginBottom: 14 }}>EVERYTHING INCLUDED</div>
            <h2 style={{ fontFamily: '"Playfair Display", Georgia, serif', fontSize: 'clamp(28px, 4vw, 40px)', fontWeight: 400 }}>
              One tool. <em>The whole tour.</em>
            </h2>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16 }}>
            {[
              ['📄', 'AI Document Import', 'Drop any file. AI extracts and merges intelligently.'],
              ['💬', 'Agentic AI Chat', 'Ask it to change flights, add hotels, fix details. It does it.'],
              ['⚠', 'Logistics Warnings', 'Auto-flags missing travel, hotels, tight connections.'],
              ['📅', 'Day Sheets', 'Auto-generated for every show. Print or share a link.'],
              ['🔗', 'Crew Share Links', 'No login needed. Tap to call, tap to map.'],
              ['▦', 'Calendar + iCal', 'Every show and flight in one view. Export to any calendar.'],
              ['💰', 'Settlement Tracking', 'Track deals, payments, and what\'s still outstanding.'],
              ['🎸', 'Rider Management', 'Tech spec, backline, hospitality — all in one place.'],
              ['🔍', 'Roster Search', 'Find any venue, contact, or flight across all artists.'],
              ['👥', 'Team Access', 'Invite tour managers with role-based tour access.'],
            ].map(([icon, title, desc], i) => (
              <div key={i} style={{ padding: '20px', background: '#0F0E0C', borderRadius: 10, border: '1px solid #1E1C18' }}>
                <div style={{ fontSize: 20, marginBottom: 8 }}>{icon}</div>
                <div style={{ fontSize: 14, fontWeight: 600, color: '#F4EFE6', marginBottom: 6 }}>{title}</div>
                <div style={{ fontSize: 12, color: '#4A4540', lineHeight: 1.6 }}>{desc}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Bottom CTA */}
      <section style={{ borderTop: '1px solid #1E1C18', padding: '80px 32px', textAlign: 'center' }}>
        <div style={{ fontFamily: '"Playfair Display", Georgia, serif', fontSize: 'clamp(26px, 4vw, 40px)', marginBottom: 16, color: '#F4EFE6', lineHeight: 1.2 }}>
          Built for managers who are done<br /><em style={{ color: '#6A6058' }}>patching things together.</em>
        </div>
        <div style={{ fontSize: 13, color: '#3A3530', marginBottom: 36, fontFamily: 'monospace', letterSpacing: '0.1em' }}>
          GETADVANCE.CO · AI-POWERED TOUR MANAGEMENT
        </div>
        <button onClick={() => router.push('/auth/signup')} className="cta-primary"
          style={{ padding: '14px 40px', background: '#C4622D', color: '#fff', border: 'none', borderRadius: 8, fontFamily: 'monospace', fontSize: 11, letterSpacing: '0.2em', cursor: 'pointer' }}>
          GET STARTED FREE
        </button>
      </section>

      {/* Footer */}
      <footer style={{ borderTop: '1px solid #1A1814', padding: '20px 32px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
        <div style={{ fontFamily: '"Playfair Display", Georgia, serif', fontSize: 16, fontStyle: 'italic', color: '#2E2A24' }}>Advance</div>
        <div style={{ display: 'flex', gap: 24 }}>
          <a href="/terms" style={{ fontFamily: 'monospace', fontSize: 10, letterSpacing: '0.15em', color: '#2E2A24', textDecoration: 'none' }}>TERMS</a>
          <a href="/privacy" style={{ fontFamily: 'monospace', fontSize: 10, letterSpacing: '0.15em', color: '#2E2A24', textDecoration: 'none' }}>PRIVACY</a>
          <a href="mailto:hello@getadvance.co" style={{ fontFamily: 'monospace', fontSize: 10, letterSpacing: '0.15em', color: '#2E2A24', textDecoration: 'none' }}>CONTACT</a>
        </div>
      </footer>
    </div>
  )
}
