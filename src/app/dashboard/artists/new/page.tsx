'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase'
import { useRouter } from 'next/navigation'

export default function NewArtistPage() {
  const [name, setName] = useState('')
  const [project, setProject] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const router = useRouter()
  const supabase = createClient()

  async function handleSubmit() {
    if (!name.trim()) { setError('Artist name is required'); return }
    setLoading(true)
    setError('')
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Not logged in')
      const { data: profile } = await supabase.from('profiles').select('org_id').eq('id', user.id).single()
      if (!profile) throw new Error('No profile found')
      const colors = ['#C4622D', '#3D6B50', '#5B4B8A', '#2E6B8A', '#8A2E2E']
      const color = colors[Math.floor(Math.random() * colors.length)]
      const { error } = await supabase.from('artists').insert({ name, project, org_id: profile.org_id, color, status: 'active' })
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
        <button onClick={() => router.push('/dashboard')} style={{ background: 'none', border: 'none', color: '#8A8580', cursor: 'pointer', fontSize: 13, marginBottom: 24, padding: 0 }}>← Back</button>
        <div style={{ fontFamily: 'monospace', fontSize: 9, letterSpacing: 3, color: '#8A8580', marginBottom: 24 }}>ADD ARTIST</div>
        {error && <div style={{ background: '#FEE', border: '1px solid #FCC', borderRadius: 6, padding: '10px 14px', marginBottom: 16, fontSize: 12, color: '#C00', fontFamily: 'monospace' }}>{error}</div>}
        {[
          { label: 'ARTIST NAME', value: name, set: setName, placeholder: 'Emma Donovan' },
          { label: 'PROJECT / TOUR', value: project, set: setProject, placeholder: 'Take Me To The River' },
        ].map(f => (
          <div key={f.label} style={{ marginBottom: 16 }}>
            <div style={{ fontFamily: 'monospace', fontSize: 9, letterSpacing: 2, color: '#8A8580', marginBottom: 6 }}>{f.label}</div>
            <input value={f.value} onChange={e => f.set(e.target.value)} placeholder={f.placeholder}
              style={{ width: '100%', padding: '10px 12px', border: '1px solid #DDD8CE', borderRadius: 6, fontSize: 13, fontFamily: 'Georgia, serif', color: '#1A1714', outline: 'none', boxSizing: 'border-box' }} />
          </div>
        ))}
        <button onClick={handleSubmit} disabled={loading}
          style={{ width: '100%', padding: 13, background: '#1A1714', color: '#F5F0E8', border: 'none', borderRadius: 8, fontFamily: 'monospace', fontSize: 10, letterSpacing: 3, cursor: 'pointer', marginTop: 8 }}>
          {loading ? 'ADDING...' : 'ADD ARTIST'}
        </button>
      </div>
    </div>
  )
}
