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

  if (checking) return <div style={{ background: '#F7F3EE', minHeight: '100vh' }} />

  return (
    <div style={{ background: '#F7F3EE', minHeight: '100vh', fontFamily: '"Georgia", serif', color: '#1A1714', overflowX: 'hidden' }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,400;0,700;1,400;1,700&display=swap');
        * { box-sizing: border-box; margin: 0; padding: 0; }
        @keyframes fadeUp { from { opacity: 0; transform: translateY(20px) } to { opacity: 1; transform: translateY(0) } }
        .f1 { animation: fadeUp 0.6s ease 0.05s both; }
        .f2 { animation: fadeUp 0.6s ease 0.15s both; }
        .f3 { animation: fadeUp 0.6s ease 0.25s both; }
        .f4 { animation: fadeUp 0.6s ease 0.35s both; }
        .f5 { animation: fadeUp 0.6s ease 0.45s both; }
        .cta-primary:hover { background: #B8561F !important; transform: translateY(-1px); }
        .cta-secondary:hover { border-color: #C4622D !important; color: #C4622D !important; }
        .feature-card:hover { box-shadow: 0 4px 20px rgba(0,0,0,0.08) !important; transform: translateY(-1px); }
        .feature-card { transition: all 0.2s; }
        .nav-link:hover { color: #1A1714 !important; }
      `}</style>

      {/* Nav */}
      <nav style={{ padding: '0 40px', height: 64, display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid #E8E0D4', background: '#F7F3EE', position: 'sticky', top: 0, zIndex: 10 }}>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
          <span style={{ fontFamily: '"Playfair Display", Georgia, serif', fontSize: 22, fontStyle: 'italic', letterSpacing: '-0.02em', color: '#1A1714' }}>Advance</span>
        </div>
        <div style={{ display: 'flex', gap: 24, alignItems: 'center' }}>
          <a href="/terms" className="nav-link" style={{ fontSize: 13, color: '#8A8580', textDecoration: 'none', transition: 'color 0.15s' }}>Terms</a>
          <a href="/privacy" className="nav-link" style={{ fontSize: 13, color: '#8A8580', textDecoration: 'none', transition: 'color 0.15s' }}>Privacy</a>
          <button onClick={() => router.push('/auth/signin')}
            style={{ padding: '8px 20px', background: 'transparent', border: '1.5px solid #C8BFB0', borderRadius: 6, color: '#5A5450', cursor: 'pointer', fontSize: 13, fontFamily: '"Georgia", serif', transition: 'all 0.2s' }}
            className="cta-secondary">
            Sign in
          </button>
          <button onClick={() => router.push('/auth/signup')}
            style={{ padding: '8px 20px', background: '#C4622D', border: 'none', borderRadius: 6, color: '#fff', cursor: 'pointer', fontSize: 13, fontFamily: '"Georgia", serif', transition: 'all 0.2s' }}
            className="cta-primary">
            Get started
          </button>
        </div>
      </nav>

      {/* Hero */}
      <section style={{ maxWidth: 820, margin: '0 auto', padding: '90px 40px 80px', textAlign: 'center' }}>
        <div className="f1" style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '5px 16px', border: '1.5px solid #E0D8CC', borderRadius: 20, marginBottom: 28, fontSize: 11, fontFamily: 'monospace', letterSpacing: '0.2em', color: '#8A8580', background: '#fff' }}>
          TOUR MANAGEMENT
        </div>
        <h1 className="f2" style={{ fontFamily: '"Playfair Display", Georgia, serif', fontSize: 'clamp(40px, 6vw, 64px)', fontWeight: 700, lineHeight: 1.1, marginBottom: 24, letterSpacing: '-0.02em', color: '#1A1714' }}>
          Drop a doc.<br />
          <em style={{ color: '#8A8580', fontWeight: 400 }}>Your tour builds itself.</em>
        </h1>
        <p className="f3" style={{ fontSize: 18, color: '#6A6058', lineHeight: 1.8, maxWidth: 480, margin: '0 auto 20px' }}>
          Advance reads your itineraries, flight confirmations, hotel bookings and venue worksheets, then builds and updates the tour for you.
        </p>
        <p className="f3" style={{ fontSize: 13, color: '#B0A898', fontFamily: 'monospace', letterSpacing: '0.1em', marginBottom: 44 }}>
          UNLIMITED ARTISTS · FREE DURING BETA
        </p>
        <div className="f4" style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
          <button onClick={() => router.push('/auth/signup')} className="cta-primary"
            style={{ padding: '14px 40px', background: '#C4622D', color: '#fff', border: 'none', borderRadius: 8, fontFamily: 'monospace', fontSize: 11, letterSpacing: '0.2em', cursor: 'pointer', transition: 'all 0.2s' }}>
            GET STARTED FREE
          </button>
          <button onClick={() => router.push('/auth/signin')} className="cta-secondary"
            style={{ padding: '14px 40px', background: 'transparent', color: '#8A8580', border: '1.5px solid #C8BFB0', borderRadius: 8, fontFamily: 'monospace', fontSize: 11, letterSpacing: '0.2em', cursor: 'pointer', transition: 'all 0.2s' }}>
            SIGN IN
          </button>
        </div>
      </section>

      {/* Replaces strip */}
      <div style={{ borderTop: '1px solid #E8E0D4', borderBottom: '1px solid #E8E0D4', background: '#fff', padding: '16px 40px' }}>
        <div style={{ maxWidth: 820, margin: '0 auto', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 40, flexWrap: 'wrap' }}>
          {['Master Tour', 'Spreadsheets', 'PDF day sheets', 'Email threads'].map((item, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12, color: '#B0A898', fontFamily: 'monospace', letterSpacing: '0.1em' }}>
              <span style={{ color: '#C4622D', fontSize: 13, fontWeight: 700 }}>x</span> {item.toUpperCase()}
            </div>
          ))}
        </div>
      </div>

      {/* How it works */}
      <section style={{ maxWidth: 900, margin: '0 auto', padding: '80px 40px' }}>
        <div className="f5" style={{ textAlign: 'center', marginBottom: 52 }}>
          <div style={{ fontFamily: 'monospace', fontSize: 10, letterSpacing: '0.3em', color: '#C4622D', marginBottom: 14 }}>HOW IT WORKS</div>
          <h2 style={{ fontFamily: '"Playfair Display", Georgia, serif', fontSize: 'clamp(26px, 3.5vw, 38px)', fontWeight: 400, color: '#1A1714' }}>
            Your agent sends docs. <em style={{ color: '#8A8580' }}>You drop them in.</em>
          </h2>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 24 }}>
          {[
            { step: '01', title: 'Drop any document', desc: 'PDF, Word, Excel, spreadsheet, screenshot. Booking confirmations, hotel reservations, flight itineraries, venue worksheets.' },
            { step: '02', title: 'Tour builds itself', desc: 'Shows, flights, hotels and contacts are extracted and matched against what is already there. No duplicates. Gaps filled automatically.' },
            { step: '03', title: 'Drop the next one', desc: 'Travel agent sends flights? Drop it in. Venue sends a worksheet? Drop it in. Each doc adds to what is already there.' },
            { step: '04', title: 'Talk to it', desc: '"Change the VA703 to depart at 21:00." "Add the Westin Perth check in 22nd." It acts on your instructions directly.' },
          ].map((item, i) => (
            <div key={i} className="feature-card"
              style={{ padding: '28px 24px', background: '#fff', borderRadius: 12, border: '1px solid #E8E0D4', boxShadow: '0 2px 8px rgba(0,0,0,0.04)' }}>
              <div style={{ fontFamily: 'monospace', fontSize: 11, color: '#C4622D', letterSpacing: '0.2em', marginBottom: 14 }}>{item.step}</div>
              <div style={{ fontFamily: '"Playfair Display", Georgia, serif', fontSize: 17, fontWeight: 700, marginBottom: 10, color: '#1A1714', lineHeight: 1.3 }}>{item.title}</div>
              <div style={{ fontSize: 13, color: '#6A6058', lineHeight: 1.8 }}>{item.desc}</div>
            </div>
          ))}
        </div>
      </section>

      {/* Features */}
      <section style={{ background: '#fff', borderTop: '1px solid #E8E0D4', borderBottom: '1px solid #E8E0D4', padding: '80px 40px' }}>
        <div style={{ maxWidth: 900, margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: 52 }}>
            <div style={{ fontFamily: 'monospace', fontSize: 10, letterSpacing: '0.3em', color: '#C4622D', marginBottom: 14 }}>EVERYTHING INCLUDED</div>
            <h2 style={{ fontFamily: '"Playfair Display", Georgia, serif', fontSize: 'clamp(26px, 3.5vw, 38px)', fontWeight: 400, color: '#1A1714' }}>
              One tool. <em style={{ color: '#8A8580' }}>The whole tour.</em>
            </h2>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 16 }}>
            {[
              ['📄', 'Smart Import', 'Drop any file and the tour updates itself.'],
              ['💬', 'Chat Assistant', 'Change flights, add hotels, fix details by asking.'],
              ['⚠', 'Logistics Flags', 'Auto-spots missing travel, hotels and tight connections.'],
              ['📅', 'Day Sheets', 'Auto-generated for every show. Print or share a link.'],
              ['🔗', 'Crew Share', 'No login needed. Tap to call, tap to map.'],
              ['▦', 'Schedule View', 'Every day of the tour at a glance, Master Tour style.'],
              ['💰', 'Settlements', 'Track deals, payments and what is still outstanding.'],
              ['🎸', 'Rider', 'Tech spec, backline and hospitality all in one place.'],
              ['🔍', 'Roster Search', 'Find any venue, contact or flight across all artists.'],
              ['👥', 'Team Access', 'Invite your TM with role-based tour access.'],
            ].map(([icon, title, desc], i) => (
              <div key={i} className="feature-card"
                style={{ padding: '20px', background: '#F7F3EE', borderRadius: 10, border: '1px solid #E8E0D4' }}>
                <div style={{ fontSize: 20, marginBottom: 8 }}>{icon}</div>
                <div style={{ fontSize: 14, fontWeight: 600, color: '#1A1714', marginBottom: 5 }}>{title}</div>
                <div style={{ fontSize: 12, color: '#6A6058', lineHeight: 1.65 }}>{desc}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Bottom CTA */}
      <section style={{ padding: '80px 40px', textAlign: 'center' }}>
        <div style={{ fontFamily: '"Playfair Display", Georgia, serif', fontSize: 'clamp(26px, 3.5vw, 38px)', marginBottom: 14, color: '#1A1714', lineHeight: 1.25 }}>
          Built for managers who are done<br /><em style={{ color: '#8A8580', fontWeight: 400 }}>patching things together.</em>
        </div>
        <div style={{ fontSize: 12, color: '#B0A898', marginBottom: 36, fontFamily: 'monospace', letterSpacing: '0.15em' }}>
          FREE DURING BETA · GETADVANCE.CO
        </div>
        <button onClick={() => router.push('/auth/signup')} className="cta-primary"
          style={{ padding: '14px 44px', background: '#C4622D', color: '#fff', border: 'none', borderRadius: 8, fontFamily: 'monospace', fontSize: 11, letterSpacing: '0.2em', cursor: 'pointer', transition: 'all 0.2s' }}>
          GET STARTED FREE
        </button>
      </section>

      {/* Footer */}
      <footer style={{ borderTop: '1px solid #E8E0D4', padding: '20px 40px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
        <div style={{ fontFamily: '"Playfair Display", Georgia, serif', fontSize: 16, fontStyle: 'italic', color: '#C8BFB0' }}>Advance</div>
        <div style={{ display: 'flex', gap: 24 }}>
          <a href="/terms" style={{ fontFamily: 'monospace', fontSize: 10, letterSpacing: '0.15em', color: '#C8BFB0', textDecoration: 'none' }}>TERMS</a>
          <a href="/privacy" style={{ fontFamily: 'monospace', fontSize: 10, letterSpacing: '0.15em', color: '#C8BFB0', textDecoration: 'none' }}>PRIVACY</a>
          <a href="mailto:hello@getadvance.co" style={{ fontFamily: 'monospace', fontSize: 10, letterSpacing: '0.15em', color: '#C8BFB0', textDecoration: 'none' }}>CONTACT</a>
        </div>
      </footer>
    </div>
  )
}
