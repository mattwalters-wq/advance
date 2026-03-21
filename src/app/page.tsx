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
        @keyframes grain {
          0%, 100% { transform: translate(0,0) }
          10% { transform: translate(-2%,-3%) }
          20% { transform: translate(3%,2%) }
          30% { transform: translate(-1%,4%) }
          40% { transform: translate(4%,-1%) }
          50% { transform: translate(-3%,1%) }
          60% { transform: translate(2%,3%) }
          70% { transform: translate(-4%,-2%) }
          80% { transform: translate(1%,-4%) }
          90% { transform: translate(-2%,2%) }
        }
        .grain::after {
          content: '';
          position: fixed;
          inset: -200%;
          width: 400%;
          height: 400%;
          background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)' opacity='0.04'/%3E%3C/svg%3E");
          animation: grain 0.5s steps(1) infinite;
          pointer-events: none;
          z-index: 0;
          opacity: 0.4;
        }
        .f1 { animation: fadeUp 0.7s ease 0.1s both; }
        .f2 { animation: fadeUp 0.7s ease 0.25s both; }
        .f3 { animation: fadeUp 0.7s ease 0.4s both; }
        .f4 { animation: fadeUp 0.7s ease 0.55s both; }
        .f5 { animation: fadeUp 0.7s ease 0.7s both; }
        .cta-primary { transition: background 0.2s, transform 0.15s; }
        .cta-primary:hover { background: #D4723D !important; transform: translateY(-1px); }
        .cta-secondary:hover { border-color: #C4622D !important; color: #C4622D !important; }
        .feature-card:hover { border-color: #2E2A24 !important; background: #161410 !important; }
      `}</style>

      <div className="grain" style={{ position: 'relative', zIndex: 1 }}>

        {/* Nav */}
        <nav style={{ padding: '0 32px', height: 60, display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid #1E1C18', position: 'sticky', top: 0, background: 'rgba(15,14,12,0.9)', backdropFilter: 'blur(12px)', zIndex: 10 }}>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 10 }}>
            <span style={{ fontFamily: '"Playfair Display", Georgia, serif', fontSize: 22, fontStyle: 'italic', letterSpacing: '-0.02em' }}>Advance</span>
            <span style={{ fontFamily: 'monospace', fontSize: 8, letterSpacing: '0.25em', color: '#C4622D' }}>AI ✦</span>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button onClick={() => router.push('/auth/signin')}
              style={{ padding: '8px 18px', background: 'transparent', border: '1px solid #2E2A24', borderRadius: 6, color: '#8A8580', cursor: 'pointer', fontSize: 13, fontFamily: '"Georgia", serif', transition: 'border-color 0.2s, color 0.2s' }}
              className="cta-secondary">
              Sign in
            </button>
            <button onClick={() => router.push('/auth/signup')}
              style={{ padding: '8px 18px', background: '#C4622D', border: 'none', borderRadius: 6, color: '#fff', cursor: 'pointer', fontSize: 13, fontFamily: '"Georgia", serif' }}
              className="cta-primary">
              Get started
            </button>
          </div>
        </nav>

        {/* Hero */}
        <section style={{ maxWidth: 900, margin: '0 auto', padding: '110px 32px 90px', textAlign: 'center' }}>
          <div className="f1" style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '5px 14px', border: '1px solid #2E2A24', borderRadius: 20, marginBottom: 32, fontSize: 11, fontFamily: 'monospace', letterSpacing: '0.2em', color: '#C4622D' }}>
            ✦ TOUR MANAGEMENT · REINVENTED
          </div>
          <h1 className="f2" style={{ fontFamily: '"Playfair Display", Georgia, serif', fontSize: 'clamp(44px, 7vw, 76px)', fontWeight: 700, lineHeight: 1.05, marginBottom: 28, letterSpacing: '-0.02em', color: '#F4EFE6' }}>
            Everything your tour needs.<br />
            <em style={{ color: '#6A6058', fontWeight: 400 }}>Nothing it doesn't.</em>
          </h1>
          <p className="f3" style={{ fontSize: 18, color: '#6A6058', lineHeight: 1.75, marginBottom: 44, maxWidth: 500, margin: '0 auto 44px' }}>
            Drop any document. AI extracts your shows, flights, hotels, contacts. Everything updates live as new info comes in.
          </p>
          <div className="f4" style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
            <button onClick={() => router.push('/auth/signup')} className="cta-primary"
              style={{ padding: '14px 36px', background: '#C4622D', color: '#fff', border: 'none', borderRadius: 8, fontFamily: 'monospace', fontSize: 11, letterSpacing: '0.2em', cursor: 'pointer' }}>
              GET STARTED FREE
            </button>
            <button onClick={() => router.push('/auth/signin')} className="cta-secondary"
              style={{ padding: '14px 36px', background: 'transparent', color: '#6A6058', border: '1px solid #2E2A24', borderRadius: 8, fontFamily: 'monospace', fontSize: 11, letterSpacing: '0.2em', cursor: 'pointer', transition: 'all 0.2s' }}>
              SIGN IN
            </button>
          </div>
        </section>

        {/* Divider */}
        <div style={{ maxWidth: 900, margin: '0 auto 80px', padding: '0 32px' }}>
          <div style={{ borderTop: '1px solid #1E1C18', display: 'flex', alignItems: 'center', justifyContent: 'center', paddingTop: 24, gap: 32, flexWrap: 'wrap' }}>
            {['Drop any document', 'AI fills the gaps', 'Share with crew instantly'].map((item, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12, color: '#4A4540', fontFamily: 'monospace', letterSpacing: '0.1em' }}>
                <span style={{ color: '#C4622D' }}>✦</span> {item.toUpperCase()}
              </div>
            ))}
          </div>
        </div>

        {/* Features */}
        <section className="f5" style={{ maxWidth: 1000, margin: '0 auto', padding: '0 32px 100px' }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 1, background: '#1A1814', borderRadius: 16, overflow: 'hidden', border: '1px solid #1A1814' }}>
            {[
              { icon: '✦', title: 'Smart Document Import', desc: 'PDF, Word, Excel, email — drop anything. AI extracts shows, flights, hotels and contacts, then merges with what\'s already there.' },
              { icon: '▦', title: 'Living Tour', desc: 'Import from your booking agent, then the travel agent, then each venue. Each doc fills the gaps. Nothing gets duplicated.' },
              { icon: '⚠', title: 'Logistics Warnings', desc: 'Automatic flags for missing travel between cities, shows with no hotel, tight international jumps. Catches what you\'d miss.' },
              { icon: '📄', title: 'Day Sheets', desc: 'Auto-generated for every show — times, hotel, travel, contacts. Print or share a link. Updates as info comes in.' },
              { icon: '🔗', title: 'Crew Share Links', desc: 'One link for the whole tour. Band and crew see everything they need, tap to call contacts, tap to map the hotel.' },
              { icon: '💬', title: 'Tour AI', desc: 'Full context on every tour. Ask anything, draft emails to promoters, find gaps, get answers in seconds.' },
            ].map((f, i) => (
              <div key={i} className="feature-card"
                style={{ padding: '32px 28px', background: '#0F0E0C', transition: 'background 0.2s, border-color 0.2s', borderRight: '1px solid #1A1814', borderBottom: '1px solid #1A1814', cursor: 'default' }}>
                <div style={{ fontSize: 20, marginBottom: 16, color: '#C4622D' }}>{f.icon}</div>
                <div style={{ fontFamily: '"Playfair Display", Georgia, serif', fontSize: 17, fontWeight: 700, marginBottom: 10, color: '#F4EFE6', lineHeight: 1.3 }}>{f.title}</div>
                <div style={{ fontSize: 13, color: '#5A5450', lineHeight: 1.75 }}>{f.desc}</div>
              </div>
            ))}
          </div>
        </section>

        {/* Bottom CTA */}
        <section style={{ borderTop: '1px solid #1E1C18', padding: '80px 32px', textAlign: 'center' }}>
          <div style={{ fontFamily: '"Playfair Display", Georgia, serif', fontSize: 'clamp(28px, 4vw, 42px)', marginBottom: 20, color: '#F4EFE6', lineHeight: 1.2 }}>
            Built for managers who are<br /><em style={{ color: '#6A6058' }}>done patching things together.</em>
          </div>
          <div style={{ fontSize: 14, color: '#4A4540', marginBottom: 36, fontFamily: 'monospace', letterSpacing: '0.1em' }}>
            REPLACE MASTER TOUR · SPREADSHEETS · EMAIL THREADS
          </div>
          <button onClick={() => router.push('/auth/signup')} className="cta-primary"
            style={{ padding: '14px 40px', background: '#C4622D', color: '#fff', border: 'none', borderRadius: 8, fontFamily: 'monospace', fontSize: 11, letterSpacing: '0.2em', cursor: 'pointer' }}>
            GET STARTED
          </button>
        </section>

        {/* Footer */}
        <footer style={{ borderTop: '1px solid #1A1814', padding: '20px 32px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
          <div style={{ fontFamily: '"Playfair Display", Georgia, serif', fontSize: 16, fontStyle: 'italic', color: '#2E2A24' }}>Advance</div>
          <div style={{ fontFamily: 'monospace', fontSize: 9, letterSpacing: '0.2em', color: '#2E2A24' }}>MONDA MANAGEMENT · AI-POWERED TOUR MANAGEMENT</div>
        </footer>
      </div>
    </div>
  )
}
