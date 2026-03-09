'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase'
import { useRouter } from 'next/navigation'

export default function SignUpPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [fullName, setFullName] = useState('')
  const [orgName, setOrgName] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const router = useRouter()
  const supabase = createClient()

  async function handleSignUp() {
    setLoading(true)
    setError('')

    try {
      // 1. Create auth user
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email,
        password,
      })
      if (authError) throw authError

      const userId = authData.user?.id
      if (!userId) throw new Error('No user ID returned')

      // 2. Create org
      const slug = orgName.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '')
      const { data: org, error: orgError } = await supabase
        .from('orgs')
        .insert({ name: orgName, slug })
        .select()
        .single()
      if (orgError) throw orgError

      // 3. Create profile
      const { error: profileError } = await supabase
        .from('profiles')
        .insert({ id: userId, org_id: org.id, full_name: fullName, role: 'manager' })
      if (profileError) throw profileError

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
          <div style={{ fontFamily: 'monospace', fontSize: 10, letterSpacing: 3, color: '#8A8580' }}>CREATE YOUR ACCOUNT</div>
        </div>

        {error && (
          <div style={{ background: '#FEE', border: '1px solid #FCC', borderRadius: 6, padding: '10px 14px', marginBottom: 16, fontSize: 12, color: '#C00' }}>
            {error}
          </div>
        )}

        <div style={{ marginBottom: 14 }}>
          <label style={{ fontFamily: 'monospace', fontSize: 9, letterSpacing: 2, color: '#8A8580', display: 'block', marginBottom: 6 }}>YOUR NAME</label>
          <input
            value={fullName}
            onChange={e => setFullName(e.target.value)}
            placeholder="Matt Walters"
            style={{ width: '100%', padding: '10px 12px', border: '1px solid #DDD8CE', borderRadius: 6, fontSize: 13, fontFamily: 'Georgia, serif', outline: 'none' }}
          />
        </div>

        <div style={{ marginBottom: 14 }}>
          <label style={{ fontFamily: 'monospace', fontSize: 9, letterSpacing: 2, color: '#8A8580', display: 'block', marginBottom: 6 }}>COMPANY / AGENCY NAME</label>
          <input
            value={orgName}
            onChange={e => setOrgName(e.target.value)}
            placeholder="UNIFIED Music Group"
            style={{ width: '100%', padding: '10px 12px', border: '1px solid #DDD8CE', borderRadius: 6, fontSize: 13, fontFamily: 'Georgia, serif', outline: 'none' }}
          />
        </div>

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
          onClick={handleSignUp}
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
          {loading ? 'CREATING ACCOUNT...' : 'CREATE ACCOUNT'}
        </button>

        <div style={{ textAlign: 'center', marginTop: 16, fontFamily: 'monospace', fontSize: 10, color: '#8A8580', letterSpacing: 1 }}>
          Already have an account?{' '}
          <a href="/auth/signin" style={{ color: '#C4622D' }}>SIGN IN</a>
        </div>
      </div>
    </div>
  )
}