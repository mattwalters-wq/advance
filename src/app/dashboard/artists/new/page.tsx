'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase'
import { useRouter } from 'next/navigation'

export default function NewArtistPage() {
  const [name, setName] = useState('')
  const [project, setProject] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const router = useRouter()
  const supabase = createClient()

  async function handleSubmit() {
    setLoading(true)
    setError('')

    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Not logged in')

      const { data: profile } = await supabase
        .from('profiles')
        .select('org_id')
        .eq('id', user.id)
        .single()
      if (!profile) throw new Error('No profile found')

      const { error } = await supabase
        .from('artists')
        .insert({ name, project, org_id: profile.org_id })
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
        width: 440,
      }}>
        <div style={{ marginBottom: 28 }}>
          <button
            onClick={() => router.push('/dashboard')}
            style={{ fontFamily: 'monospace', fontSize: 9, letterSpacing: 2, color: '#8A8580', background: 'transparent', border: 'none', cursor: 'pointer', marginBottom: 16, padding: 0 }}
          >← BACK TO ROSTER</button>
          <div style={{ fontSize: 22, fontStyle: 'italic', color: '#1A1714', marginBottom: 4 }}>Add Artist</div>
          <div style={{ fontFamily: 'monospace', fontSize: 9, letterSpacing: 3, color: '#8A8580' }}>NEW ROSTER MEMBER</div>
        </div>

        {error && (
          <div style={{ background: '#FEE', border: '1px solid #FCC', borderRadius: 6, padding: '10px 14px', marginBottom: 16, fontSize: 12, color: '#C00' }}>
            {error}
          </div>
        )}

        <div style={{ marginBottom: 14 }}>
          <label style={{ fontFamily: 'monospace', fontSize: 9, letterSpacing: 2, color: '#8A8580', display: 'block', marginBottom: 6 }}>ARTIST NAME</label>
          <input
            value={name}
            onChange={e => setName(e.target.value)}
            placeholder="Emma Donovan"
            style={{ width: '100%', padding: '10px 12px', border: '1px solid #DDD8CE', borderRadius: 6, fontSize: 13, fontFamily: 'Georgia, serif', outline: 'none' }}
          />
        </div>

        <div style={{ marginBottom: 28 }}>
          <label style={{ fontFamily: 'monospace', fontSize: 9, letterSpacing: 2, color: '#8A8580', display: 'block', marginBottom: 6 }}>CURRENT PROJECT</label>
          <input
            value={project}
            onChange={e => setProject(e.target.value)}
            placeholder="Take Me To The River"
            style={{ width: '100%', padding: '10px 12px', border: '1px solid #DDD8CE', borderRadius: 6, fontSize: 13, fontFamily: 'Georgia, serif', outline: 'none' }}
          />
        </div>

        <button
          onClick={handleSubmit}
          disabled={loading || !name}
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
            cursor: loading || !name ? 'not-allowed' : 'pointer',
            opacity: loading || !name ? 0.6 : 1,
          }}
        >
          {loading ? 'SAVING...' : 'ADD TO ROSTER'}
        </button>
      </div>
    </div>
  )
}