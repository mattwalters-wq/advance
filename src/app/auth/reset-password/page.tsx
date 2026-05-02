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
    // Supabase puts the token in the URL hash - listen for the session
    supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'PASSWORD_RECOVERY' || session) {
        setSessionReady(true)
      }
    })
  }, [])

  async function handleReset() {
    if (!password.trim()) return
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
                placeholder="New password" autoFocus style={inputStyle} />
            </div>
            <div style={{ marginBottom: 24 }}>
              <input type="password" value={confirm} onChange={e => setConfirm(e.target.value)}
                placeholder="Confirm new password"
                onKeyDown={e => e.key === 'Enter' && handleReset()}
                style={inputStyle} />
            </div>

            <button onClick={handleReset} disabled={loading || !password.trim()}
              style={{ width: '100%', padding: 14, background: '#C4622D', color: '#fff', border: 'none', borderRadius: 8, fontFamily: 'monospace', fontSize: 10, letterSpacing: 3, cursor: password.trim() ? 'pointer' : 'default', opacity: !password.trim() ? 0.5 : 1 }}>
              {loading ? 'UPDATING...' : 'SET NEW PASSWORD →'}
            </button>
          </>
        )}
      </div>
    </div>
  )
}
