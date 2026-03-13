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

  return (
    <div style={{ minHeight: '100vh', background: '#F5F0E8', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'Georgia, serif' }}>
      <div style={{ width: 400, background: '#fff', borderRadius: 12, padding: 40, border: '1px solid #DDD8CE' }}>
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <div style={{ fontSize: 24, fontStyle: 'italic', color: '#1A1714', marginBottom: 4 }}>Advance</div>
          <div style={{ fontFamily: 'monospace', fontSize: 9, letterSpacing: 3, color: '#8A8580' }}>SIGN IN</div>
        </div>
        {error && <div style={{ background: '#FEE', border: '1px solid #FCC', borderRadius: 6, padding: '10px 14px', marginBottom: 16, fontSize: 12, color: '#C00', fontFamily: 'monospace' }}>{error}</div>}
        {[
          { label: 'EMAIL', value: email, set: setEmail, type: 'email', placeholder: 'matt@unified.com' },
          { label: 'PASSWORD', value: password, set: setPassword, type: 'password', placeholder: '••••••••' },
        ].map(f => (
          <div key={f.label} style={{ marginBottom: 16 }}>
            <div style={{ fontFamily: 'monospace', fontSize: 9, letterSpacing: 2, color: '#8A8580', marginBottom: 6 }}>{f.label}</div>
            <input type={f.type} value={f.value} onChange={e => f.set(e.target.value)} placeholder={f.placeholder}
              onKeyDown={e => e.key === 'Enter' && handleSignin()}
              style={{ width: '100%', padding: '10px 12px', border: '1px solid #DDD8CE', borderRadius: 6, fontSize: 13, fontFamily: 'Georgia, serif', color: '#1A1714', outline: 'none', boxSizing: 'border-box' }} />
          </div>
        ))}
        <button onClick={handleSignin} disabled={loading}
          style={{ width: '100%', padding: 13, background: '#1A1714', color: '#F5F0E8', border: 'none', borderRadius: 8, fontFamily: 'monospace', fontSize: 10, letterSpacing: 3, cursor: 'pointer', marginTop: 8 }}>
          {loading ? 'SIGNING IN...' : 'SIGN IN'}
        </button>
        <div style={{ textAlign: 'center', marginTop: 20, fontSize: 12, color: '#8A8580' }}>
          No account? <a href="/auth/signup" style={{ color: '#1A1714' }}>Create one</a>
        </div>
      </div>
    </div>
  )
}
