'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase'
import { useRouter } from 'next/navigation'

export default function SignInPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const router = useRouter()
  const supabase = createClient()

  async function handleSignIn() {
    setLoading(true)
    setError('')

    try {
      const { error } = await supabase.auth.signInWithPassword({ email, password })
      if (error) throw error
      router.push('/dashboard')
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{
      minHeight: '100vh',
      background: '#F5F0E8',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      fontFamily: 'Georgia, serif',
    }}>
      <div style={{
        background: '#fff',
        border: '1px solid #DDD8CE',
        borderRadius: 12,
        padding: '40px 36px',
        width: 400,
      }}>
        <div style={{ marginBottom: 28 }}>
          <div style={{ fontSize: 26, fontStyle: 'italic', color: '#1A1714', marginBottom: 4 }}>advance</div>
          <div style={{ fontFamily: 'monospace', fontSize: 10, letterSpacing: 3, color: '#8A8580' }}>SIGN IN</div>
        </div>

        {error && (
          <div style={{ background: '#FEE', border: '1px solid #FCC', borderRadius: 6, padding: '10px 14px', marginBottom: 16, fontSize: 12, color: '#C00' }}>
            {error}
          </div>
        )}

        <div style={{ marginBottom: 14 }}>
          <label style={{ fontFamily: 'monospace', fontSize: 9, letterSpacing: 2, color: '#8A8580', display: 'block', marginBottom: 6 }}>EMAIL</label>
          <input
            value={email}
            onChange={e => setEmail(e.target.value)}
            placeholder="matt@unified.com"
            type="email"
            style={{ width: '100%', padding: '10px 12px', border: '1px solid #DDD8CE', borderRadius: 6, fontSize: 13, fontFamily: 'Georgia, serif', outline: 'none' }}
          />
        </div>

        <div style={{ marginBottom: 24 }}>
          <label style={{ fontFamily: 'monospace', fontSize: 9, letterSpacing: 2, color: '#8A8580', display: 'block', marginBottom: 6 }}>PASSWORD</label>
          <input
            value={password}
            onChange={e => setPassword(e.target.value)}
            type="password"
            placeholder="••••••••"
            style={{ width: '100%', padding: '10px 12px', border: '1px solid #DDD8CE', borderRadius: 6, fontSize: 13, fontFamily: 'Georgia, serif', outline: 'none' }}
          />
        </div>

        <button
          onClick={handleSignIn}
          disabled={loading}
          style={{
            width: '100%',
            padding: 13,
            background: '#1A1714',
            color: '#F5F0E8',
            border: 'none',
            borderRadius: 8,
            fontFamily: 'monospace',
            fontSize: 10,
            letterSpacing: 3,
            cursor: loading ? 'not-allowed' : 'pointer',
            opacity: loading ? 0.7 : 1,
          }}
        >
          {loading ? 'SIGNING IN...' : 'SIGN IN'}
        </button>

        <div style={{ textAlign: 'center', marginTop: 16, fontFamily: 'monospace', fontSize: 10, color: '#8A8580', letterSpacing: 1 }}>
          No account yet?{' '}
          <a href="/auth/signup" style={{ color: '#C4622D' }}>CREATE ONE</a>
        </div>
      </div>
    </div>
  )
}