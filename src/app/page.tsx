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

  if (checking) return <div style={{ background: '#1A1714', minHeight: '100vh' }} />

  return (
    <div style={{ background: '#1A1714', minHeight: '100vh', fontFamily: 'Georgia, serif', color: '#F5F0E8' }}>

      <style>{`
        @keyframes fadeUp {
          from { opacity: 0; transform: translateY(20px) }
          to { opacity: 1; transform: translateY(0) }
        }
        .fade-1 { animation: fadeUp 0.6s ease forwards; }
        .fade-2 { animation: fadeUp 0.6s ease 0.15s forwards; opacity: 0; }
        .fade-3 { animation: fadeUp 0.6s ease 0.3s forwards; opacity: 0; }
        .fade-4 { animation: fadeUp 0.6s ease 0.45s forwards; opacity: 0; }
        .fade-5 { animation: fadeUp 0.6s ease 0.6s forwards; opacity: 0; }
      `}</style>

      {/* Nav */}
      <div style={{ padding: '20px 32px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{ fontSize: 22, fontStyle: 'italic' }}>Advance</span>
          <span style={{ fontFamily: 'monospace', fontSize: 9, letterSpacing: 2, color: '#C4622D' }}>AI ✦</span>
        </div>
        <button onClick={() => router.push('/auth/signin')}
          style={{ fontFamily: 'monospace', fontSize: 9, letterSpacing: 2, color: '#8A8580', background: 'transparent', border: '1px solid #2A2520', borderRadius: 4, padding: '8px 16px', cursor: 'pointer' }}>
          SIGN IN
        </button>
      </div>

      {/* Hero */}
      <div style={{ maxWidth: 800, margin: '0 auto', padding: '80px 32px 60px', textAlign: 'center' }}>
        <div className="fade-1" style={{ fontFamily: 'monospace', fontSize: 10, letterSpacing: 4, color: '#C4622D', marginBottom: 24 }}>
          TOUR MANAGEMENT · REINVENTED
        </div>
        <h1 className="fade-2" style={{ fontSize: 'clamp(36px, 6vw, 64px)', fontWeight: 400, lineHeight: 1.15, marginBottom: 24, letterSpacing: '-0.5px' }}>
          Everything your tour needs.<br />
          <span style={{ fontStyle: 'italic', color: '#8A8580' }}>Nothing it doesn't.</span>
        </h1>
        <p className="fade-3" style={{ fontSize: 18, color: '#8A8580', lineHeight: 1.7, marginBottom: 40, maxWidth: 520, margin: '0 auto 40px' }}>
          Advance replaces the spreadsheets, email threads and master tour subscriptions your team has been duct-taping together for years.
        </p>
        <div className="fade-4" style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
          <button onClick={() => router.push('/auth/signup')}
            style={{ padding: '14px 32px', background: '#C4622D', color: '#fff', border: 'none', borderRadius: 8, fontFamily: 'monospace', fontSize: 10, letterSpacing: 3, cursor: 'pointer' }}>
            GET STARTED
          </button>
          <button onClick={() => router.push('/auth/signin')}
            style={{ padding: '14px 32px', background: 'transparent', color: '#F5F0E8', border: '1px solid #2A2520', borderRadius: 8, fontFamily: 'monospace', fontSize: 10, letterSpacing: 3, cursor: 'pointer' }}>
            SIGN IN
          </button>
        </div>
      </div>

      {/* Feature grid */}
      <div className="fade-5" style={{ maxWidth: 900, margin: '0 auto', padding: '40px 32px 80px', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 1, border: '1px solid #2A2520', borderRadius: 16, overflow: 'hidden' }}>
        {[
          { icon: '✦', title: 'AI Document Import', desc: 'Drop any PDF, email, or spreadsheet. AI extracts shows, flights, hotels and contacts instantly.' },
          { icon: '📅', title: 'Calendar + iCal', desc: 'Every show, flight and hotel in one view. Export to Google Calendar or Apple Calendar in one click.' },
          { icon: '📄', title: 'Day Sheets', desc: 'Auto-generated printable day sheets for every show. Send to the band the morning of the gig.' },
          { icon: '🔗', title: 'Crew Share Links', desc: 'Share a read-only tour link with band and crew. No login required. Tap to call, tap to map.' },
          { icon: '⚠', title: 'Logistics Warnings', desc: 'Automatically flags missing travel, hotels on show nights, tight international jumps.' },
          { icon: '💬', title: 'Tour AI Assistant', desc: 'Ask anything about the tour. Draft emails, find gaps, get answers instantly.' },
        ].map((f, i) => (
          <div key={i} style={{ padding: '28px 24px', background: '#1A1714', borderRight: '1px solid #2A2520', borderBottom: '1px solid #2A2520' }}>
            <div style={{ fontSize: 24, marginBottom: 12 }}>{f.icon}</div>
            <div style={{ fontSize: 15, fontWeight: 600, marginBottom: 8 }}>{f.title}</div>
            <div style={{ fontSize: 13, color: '#8A8580', lineHeight: 1.6 }}>{f.desc}</div>
          </div>
        ))}
      </div>

      {/* Social proof / positioning */}
      <div style={{ maxWidth: 600, margin: '0 auto', padding: '20px 32px 80px', textAlign: 'center' }}>
        <div style={{ fontFamily: 'monospace', fontSize: 10, letterSpacing: 3, color: '#2A2520', marginBottom: 20 }}>BUILT FOR</div>
        <div style={{ fontSize: 14, color: '#8A8580', lineHeight: 1.8 }}>
          Independent artist managers who are done paying $75/month per artist for software that still doesn't have a calendar export.
        </div>
      </div>

      {/* Footer */}
      <div style={{ borderTop: '1px solid #2A2520', padding: '20px 32px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
        <div style={{ fontFamily: 'monospace', fontSize: 9, letterSpacing: 2, color: '#2A2520' }}>ADVANCE · AI-POWERED TOUR MANAGEMENT</div>
        <div style={{ fontFamily: 'monospace', fontSize: 9, letterSpacing: 2, color: '#2A2520' }}>MONDA MANAGEMENT</div>
      </div>
    </div>
  )
}
