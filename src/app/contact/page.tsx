'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

export default function ContactPage() {
  const router = useRouter()
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [message, setMessage] = useState('')
  const [sending, setSending] = useState(false)
  const [sent, setSent] = useState(false)
  const [error, setError] = useState('')

  const accent = '#C4622D'
  const border = '#E8E0D4'
  const muted = '#8A8580'
  const text = '#1A1714'
  const bg = '#F7F3EE'

  const inputStyle = {
    width: '100%',
    padding: '12px 14px',
    border: `1px solid ${border}`,
    borderRadius: 8,
    background: '#fff',
    color: text,
    fontSize: 14,
    fontFamily: '"Georgia", serif',
    outline: 'none',
    boxSizing: 'border-box' as const,
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!name || !email || !message) return
    setSending(true)
    setError('')
    try {
      const res = await fetch('/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, message }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to send')
      setSent(true)
    } catch (err: any) {
      setError(err.message)
    }
    setSending(false)
  }

  return (
    <div style={{ minHeight: '100vh', background: bg, fontFamily: '"Georgia", serif', color: text }}>
      {/* Nav */}
      <nav style={{ padding: '0 32px', height: 64, display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: `1px solid ${border}`, background: bg }}>
        <span onClick={() => router.push('/')} style={{ fontFamily: '"Playfair Display", Georgia, serif', fontSize: 20, fontStyle: 'italic', cursor: 'pointer', letterSpacing: '-0.02em' }}>
          Advance
        </span>
        <button onClick={() => router.push('/auth/signin')}
          style={{ padding: '8px 18px', border: `1px solid ${border}`, borderRadius: 8, background: 'transparent', color: muted, cursor: 'pointer', fontSize: 13 }}>
          Sign in
        </button>
      </nav>

      <div style={{ maxWidth: 520, margin: '0 auto', padding: '60px 24px' }}>
        <div style={{ fontFamily: 'monospace', fontSize: 10, letterSpacing: '0.2em', color: muted, marginBottom: 12 }}>CONTACT</div>
        <h1 style={{ fontSize: 32, fontWeight: 700, marginBottom: 8, letterSpacing: '-0.02em', lineHeight: 1.1 }}>Get in touch</h1>
        <p style={{ fontSize: 15, color: muted, marginBottom: 36, lineHeight: 1.6 }}>
          Questions, feedback, or just want to know more about Advance? We'd love to hear from you.
        </p>

        {sent ? (
          <div style={{ background: '#F0FFF4', border: '1px solid #2d7a4f', borderRadius: 12, padding: '28px 24px', textAlign: 'center' }}>
            <div style={{ fontSize: 28, marginBottom: 10 }}>✓</div>
            <div style={{ fontSize: 16, fontWeight: 600, color: '#2d7a4f', marginBottom: 6 }}>Message sent</div>
            <div style={{ fontSize: 14, color: muted }}>We'll get back to you at {email}.</div>
            <button onClick={() => router.push('/')}
              style={{ marginTop: 20, padding: '10px 24px', background: accent, color: '#fff', border: 'none', borderRadius: 8, cursor: 'pointer', fontSize: 13 }}>
              Back to home
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit}>
            <div style={{ display: 'grid', gap: 16 }}>
              <div>
                <label style={{ display: 'block', fontFamily: 'monospace', fontSize: 9, letterSpacing: 2, color: muted, marginBottom: 6 }}>NAME *</label>
                <input value={name} onChange={e => setName(e.target.value)} required style={inputStyle} placeholder="Your name" />
              </div>
              <div>
                <label style={{ display: 'block', fontFamily: 'monospace', fontSize: 9, letterSpacing: 2, color: muted, marginBottom: 6 }}>EMAIL *</label>
                <input type="email" value={email} onChange={e => setEmail(e.target.value)} required style={inputStyle} placeholder="your@email.com" />
              </div>
              <div>
                <label style={{ display: 'block', fontFamily: 'monospace', fontSize: 9, letterSpacing: 2, color: muted, marginBottom: 6 }}>MESSAGE *</label>
                <textarea value={message} onChange={e => setMessage(e.target.value)} required rows={5}
                  style={{ ...inputStyle, resize: 'vertical' as const, minHeight: 120 }}
                  placeholder="What's on your mind?" />
              </div>
              {error && (
                <div style={{ color: '#C00', fontSize: 13, padding: '10px 14px', background: '#fff0f0', borderRadius: 8 }}>
                  {error}
                </div>
              )}
              <button type="submit" disabled={sending || !name || !email || !message}
                style={{ padding: '14px', background: (name && email && message) ? accent : border, color: '#fff', border: 'none', borderRadius: 8, cursor: (name && email && message) ? 'pointer' : 'default', fontFamily: 'monospace', fontSize: 10, letterSpacing: 3, transition: 'background 0.15s' }}>
                {sending ? 'SENDING...' : 'SEND MESSAGE'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  )
}
