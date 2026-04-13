'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase'
import { useRouter } from 'next/navigation'

export default function SigninPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const router = useRouter()
  const supabase = createClient()

  async function handleSignin() {
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

  const inputStyle = {
    width: '100%', padding: '12px 14px', background: '#2A2520',
    border: '1px solid #333', borderRadius: 8, color: '#F5F0E8',
    fontSize: 14, fontFamily: 'Georgia, serif', outline: 'none',
    boxSizing: 'border-box' as const,
  }

  return (
    <div style={{ minHeight: '100vh', background: '#1A1714', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', fontFamily: 'Georgia, serif', padding: 24 }}>

      {/* Logo */}
      <div style={{ marginBottom: 48, textAlign: 'center', cursor: 'pointer' }} onClick={() => router.push('/')}>
        <div style={{ fontSize: 28, fontStyle: 'italic', color: '#F5F0E8', marginBottom: 4 }}>Advance</div>
        <div style={{ fontFamily: 'monospace', fontSize: 9, letterSpacing: 3, color: '#C4622D' }}>✦</div>
      </div>

      <div style={{ width: '100%', maxWidth: 380 }}>
        <div style={{ fontFamily: 'monospace', fontSize: 9, letterSpacing: 3, color: '#8A8580', textAlign: 'center', marginBottom: 28 }}>SIGN IN</div>

        {error && (
          <div style={{ background: 'rgba(200,0,0,0.15)', border: '1px solid rgba(200,0,0,0.3)', borderRadius: 8, padding: '10px 14px', marginBottom: 16, fontSize: 12, color: '#ff8080', fontFamily: 'monospace' }}>
            {error}
          </div>
        )}

        <div style={{ marginBottom: 14 }}>
          <input type="email" value={email} onChange={e => setEmail(e.target.value)}
            placeholder="Email address" onKeyDown={e => e.key === 'Enter' && handleSignin()}
            style={inputStyle} />
        </div>
        <div style={{ marginBottom: 24 }}>
          <input type="password" value={password} onChange={e => setPassword(e.target.value)}
            placeholder="Password" onKeyDown={e => e.key === 'Enter' && handleSignin()}
            style={inputStyle} />
        </div>

        <button onClick={handleSignin} disabled={loading}
          style={{ width: '100%', padding: 14, background: '#C4622D', color: '#fff', border: 'none', borderRadius: 8, fontFamily: 'monospace', fontSize: 10, letterSpacing: 3, cursor: 'pointer', marginBottom: 16 }}>
          {loading ? 'SIGNING IN...' : 'SIGN IN →'}
        </button>

        <div style={{ textAlign: 'center', fontSize: 13, color: '#8A8580' }}>
          No account?{' '}
          <span onClick={() => router.push('/auth/signup')} style={{ color: '#F5F0E8', cursor: 'pointer', textDecoration: 'underline' }}>
            Get started
          </span>
        </div>
      </div>
    </div>
  )
}
