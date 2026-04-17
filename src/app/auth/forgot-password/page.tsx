'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase'
import { useRouter } from 'next/navigation'

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('')
  const [sent, setSent] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const router = useRouter()
  const supabase = createClient()

  async function handleSubmit() {
    if (!email.trim()) return
    setLoading(true)
    setError('')
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/auth/reset-password`,
      })
      if (error) throw error
      setSent(true)
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const inputStyle = {
    width: '100%', padding: '12px 14px', background: '#2A2520',
    border: '1px solid #333', borderRadius: 8, color: '#F5F0E8',
    fontSize: 14, fontFamily: 'Georgia, serif', outline: 'none',
    boxSizing: 'border-box' as const,
  }

  return (
    <div style={{ minHeight: '100vh', background: '#1A1714', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', fontFamily: 'Georgia, serif', padding: 24 }}>

      <div style={{ marginBottom: 48, textAlign: 'center', cursor: 'pointer' }} onClick={() => router.push('/')}>
        <div style={{ fontSize: 28, fontStyle: 'italic', color: '#F5F0E8', marginBottom: 4 }}>Advance</div>
        <div style={{ fontFamily: 'monospace', fontSize: 9, letterSpacing: 3, color: '#C4622D' }}>✦</div>
      </div>

      <div style={{ width: '100%', maxWidth: 380 }}>
        <div style={{ fontFamily: 'monospace', fontSize: 9, letterSpacing: 3, color: '#8A8580', textAlign: 'center', marginBottom: 28 }}>RESET PASSWORD</div>

        {sent ? (
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: 32, marginBottom: 16 }}>✉️</div>
            <div style={{ fontSize: 16, color: '#F5F0E8', marginBottom: 12 }}>Check your inbox</div>
            <div style={{ fontSize: 13, color: '#8A8580', lineHeight: 1.7, marginBottom: 28 }}>
              We sent a reset link to <strong style={{ color: '#F5F0E8' }}>{email}</strong>. Click it to set a new password.
            </div>
            <div style={{ fontSize: 13, color: '#8A8580' }}>
              <span onClick={() => router.push('/auth/signin')} style={{ color: '#F5F0E8', cursor: 'pointer', textDecoration: 'underline' }}>
                Back to sign in
              </span>
            </div>
          </div>
        ) : (
          <>
            <div style={{ fontSize: 13, color: '#8A8580', textAlign: 'center', lineHeight: 1.7, marginBottom: 24 }}>
              Enter your email and we'll send you a link to reset your password.
            </div>

            {error && (
              <div style={{ background: 'rgba(200,0,0,0.15)', border: '1px solid rgba(200,0,0,0.3)', borderRadius: 8, padding: '10px 14px', marginBottom: 16, fontSize: 12, color: '#ff8080', fontFamily: 'monospace' }}>
                {error}
              </div>
            )}

            <div style={{ marginBottom: 16 }}>
              <input type="email" value={email} onChange={e => setEmail(e.target.value)}
                placeholder="Email address" onKeyDown={e => e.key === 'Enter' && handleSubmit()}
                autoFocus style={inputStyle} />
            </div>

            <button onClick={handleSubmit} disabled={loading || !email.trim()}
              style={{ width: '100%', padding: 14, background: '#C4622D', color: '#fff', border: 'none', borderRadius: 8, fontFamily: 'monospace', fontSize: 10, letterSpacing: 3, cursor: email.trim() ? 'pointer' : 'default', marginBottom: 20, opacity: !email.trim() ? 0.5 : 1 }}>
              {loading ? 'SENDING...' : 'SEND RESET LINK →'}
            </button>

            <div style={{ textAlign: 'center', fontSize: 13, color: '#8A8580' }}>
              <span onClick={() => router.push('/auth/signin')} style={{ color: '#F5F0E8', cursor: 'pointer', textDecoration: 'underline' }}>
                Back to sign in
              </span>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
