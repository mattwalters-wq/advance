'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase'
import { useRouter } from 'next/navigation'

const supabase = createClient()

export default function OnboardingPage() {
  const router = useRouter()
  const [step, setStep] = useState(1)
  const [name, setName] = useState('')
  const [saving, setSaving] = useState(false)
  const [sessionReady, setSessionReady] = useState(false)

  useEffect(() => {
    // Exchange the token from the invite link URL for a real session
    supabase.auth.onAuthStateChange((event, session) => {
      if (session) setSessionReady(true)
    })
    // Also check if session already exists
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) setSessionReady(true)
    })
  }, [])

  async function handleSaveName() {
    if (!name.trim()) return
    setSaving(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (user) {
      await supabase.from('profiles').upsert({
        id: user.id,
        full_name: name.trim(),
        role: 'member',
      }, { onConflict: 'id' })
    }
    setSaving(false)
    setStep(2)
  }

  const accent = '#C4622D'

  return (
    <div style={{ background: '#1A1714', minHeight: '100vh', fontFamily: 'Georgia, serif', color: '#F5F0E8', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 24 }}>

      {/* Logo */}
      <div style={{ marginBottom: 48, textAlign: 'center' }}>
        <div style={{ fontSize: 28, fontStyle: 'italic', marginBottom: 4 }}>Advance</div>
        <div style={{ fontFamily: 'monospace', fontSize: 9, letterSpacing: 3, color: accent }}>✦</div>
      </div>

      <div style={{ width: '100%', maxWidth: 480 }}>

        {step === 1 && (
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontFamily: 'monospace', fontSize: 10, letterSpacing: 3, color: '#8A8580', marginBottom: 16 }}>WELCOME</div>
            <h1 style={{ fontSize: 28, fontWeight: 400, marginBottom: 12 }}>What should we call you?</h1>
            <p style={{ fontSize: 14, color: '#8A8580', marginBottom: 32 }}>Your name appears on tour notes so your team knows who said what.</p>
            <input
              value={name}
              onChange={e => setName(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleSaveName()}
              placeholder="Your full name"
              autoFocus
              style={{ width: '100%', padding: '14px 16px', background: '#2A2520', border: '1px solid #333', borderRadius: 10, color: '#F5F0E8', fontSize: 16, fontFamily: 'Georgia, serif', outline: 'none', boxSizing: 'border-box' as const, marginBottom: 16, textAlign: 'center' }}
            />
            <button onClick={handleSaveName} disabled={saving || !name.trim()}
              style={{ width: '100%', padding: 14, background: name.trim() ? accent : '#333', color: '#fff', border: 'none', borderRadius: 8, fontFamily: 'monospace', fontSize: 10, letterSpacing: 3, cursor: name.trim() ? 'pointer' : 'default' }}>
              {saving ? 'SAVING...' : 'CONTINUE →'}
            </button>
          </div>
        )}

        {step === 2 && (
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontFamily: 'monospace', fontSize: 10, letterSpacing: 3, color: accent, marginBottom: 16 }}>YOU'RE IN</div>
            <h1 style={{ fontSize: 28, fontWeight: 400, marginBottom: 12 }}>Here's how Advance works</h1>
            <p style={{ fontSize: 14, color: '#8A8580', marginBottom: 40, lineHeight: 1.7 }}>Three things to do first:</p>

            <div style={{ display: 'grid', gap: 12, marginBottom: 40, textAlign: 'left' }}>
              {[
                { num: '01', title: 'Add your artists', desc: 'Start with your roster — each artist gets their own space for tours, shows, and contacts.' },
                { num: '02', title: 'Import a tour document', desc: 'Drop in any PDF, email, or spreadsheet. Advance reads and builds the tour automatically.' },
                { num: '03', title: 'Share with your team', desc: 'Invite co-managers or send a read-only crew link to the band — no login needed.' },
              ].map(item => (
                <div key={item.num} style={{ background: '#2A2520', borderRadius: 10, padding: '18px 20px', display: 'flex', gap: 16, alignItems: 'flex-start' }}>
                  <div style={{ fontFamily: 'monospace', fontSize: 11, color: accent, letterSpacing: 2, flexShrink: 0, marginTop: 2 }}>{item.num}</div>
                  <div>
                    <div style={{ fontSize: 15, fontWeight: 600, marginBottom: 4 }}>{item.title}</div>
                    <div style={{ fontSize: 13, color: '#8A8580', lineHeight: 1.6 }}>{item.desc}</div>
                  </div>
                </div>
              ))}
            </div>

            <button onClick={() => router.replace('/dashboard')}
              style={{ width: '100%', padding: 14, background: accent, color: '#fff', border: 'none', borderRadius: 8, fontFamily: 'monospace', fontSize: 10, letterSpacing: 3, cursor: 'pointer' }}>
              GO TO MY ROSTER →
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
