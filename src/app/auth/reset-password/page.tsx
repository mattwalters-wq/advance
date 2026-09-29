'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase'
import { useRouter } from 'next/navigation'

export default function ResetPasswordPage() {
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [done, setDone] = useState(false)
  const [sessionReady, setSessionReady] = useState(false)
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    // Surface errors Supabase puts in the URL (query or hash), e.g. error_code=otp_expired
    const query = new URLSearchParams(window.location.search)
    const hash = new URLSearchParams(window.location.hash.replace(/^#/, ''))
    const errorCode = query.get('error_code') || hash.get('error_code')
    const errorDescription = query.get('error_description') || hash.get('error_description')
    if (errorCode || errorDescription) {
      setError(errorCode === 'otp_expired'
        ? 'This reset link has expired or has already been used. Please request a new one.'
        : (errorDescription || errorCode || '').replace(/\+/g, ' '))
    }

    // Supabase puts the token in the URL (code / hash) - listen for the session
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'PASSWORD_RECOVERY' || session) {
        setSessionReady(true)
      }
    })
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) setSessionReady(true)
    })

    // Email templates using token_hash links: verify the recovery OTP directly
    const tokenHash = query.get('token_hash')
    if (tokenHash && query.get('type') === 'recovery') {
      supabase.auth.verifyOtp({ token_hash: tokenHash, type: 'recovery' }).then(({ data, error }) => {
        if (error) setError(error.message)
        else if (data.session) setSessionReady(true)
      })
    }

    return () => subscription.unsubscribe()
  }, [])

  async function handleReset() {
    if (!password.trim() || !sessionReady) return
    if (password !== confirm) { setError('Passwords do not match'); return }
    if (password.length < 8) { setError('Password must be at least 8 characters'); return }

    setLoading(true)
    setError('')
    try {
      const { error } = await supabase.auth.updateUser({ password })
      if (error) throw error
      setDone(true)
      setTimeout(() => router.push('/dashboard'), 2000)
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

      <div style={{ marginBottom: 48, textAlign: 'center' }}>
        <div style={{ fontSize: 28, fontStyle: 'italic', color: '#F5F0E8', marginBottom: 4 }}>Advance</div>
        <div style={{ fontFamily: 'monospace', fontSize: 9, letterSpacing: 3, color: '#C4622D' }}>✦</div>
      </div>

      <div style={{ width: '100%', maxWidth: 380 }}>
        <div style={{ fontFamily: 'monospace', fontSize: 9, letterSpacing: 3, color: '#8A8580', textAlign: 'center', marginBottom: 28 }}>NEW PASSWORD</div>

        {done ? (
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: 32, marginBottom: 16 }}>✓</div>
            <div style={{ fontSize: 16, color: '#F5F0E8', marginBottom: 8 }}>Password updated</div>
            <div style={{ fontSize: 13, color: '#8A8580' }}>Taking you to the dashboard...</div>
          </div>
        ) : (
          <>
            {error && (
              <div style={{ background: 'rgba(200,0,0,0.15)', border: '1px solid rgba(200,0,0,0.3)', borderRadius: 8, padding: '10px 14px', marginBottom: 16, fontSize: 12, color: '#ff8080', fontFamily: 'monospace' }}>
                {error}
              </div>
            )}

            <div style={{ marginBottom: 14 }}>
              <input type="password" value={password} onChange={e => setPassword(e.target.value)}
                placeholder="New password" autoFocus disabled={!sessionReady} style={{ ...inputStyle, opacity: sessionReady ? 1 : 0.5 }} />
            </div>
            <div style={{ marginBottom: 24 }}>
              <input type="password" value={confirm} onChange={e => setConfirm(e.target.value)}
                placeholder="Confirm new password"
                onKeyDown={e => e.key === 'Enter' && handleReset()}
                disabled={!sessionReady} style={{ ...inputStyle, opacity: sessionReady ? 1 : 0.5 }} />
            </div>

            <button onClick={handleReset} disabled={loading || !password.trim() || !sessionReady}
              style={{ width: '100%', padding: 14, background: '#C4622D', color: '#fff', border: 'none', borderRadius: 8, fontFamily: 'monospace', fontSize: 10, letterSpacing: 3, cursor: password.trim() && sessionReady ? 'pointer' : 'default', opacity: !password.trim() || !sessionReady ? 0.5 : 1 }}>
              {loading ? 'UPDATING...' : !sessionReady ? 'VERIFYING LINK...' : 'SET NEW PASSWORD →'}
            </button>

            {!sessionReady && error && (
              <div style={{ textAlign: 'center', fontSize: 13, color: '#8A8580', marginTop: 16 }}>
                <span onClick={() => router.push('/auth/forgot-password')} style={{ color: '#F5F0E8', cursor: 'pointer', textDecoration: 'underline' }}>
                  Request a new reset link
                </span>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}
