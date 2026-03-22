'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase'
import { useRouter } from 'next/navigation'

const COLOURS = [
  '#C4622D', '#3D6B50', '#5B4B8A', '#2E6B8A', '#8A2E2E',
  '#B8860B', '#2E8A6B', '#8A5B2E', '#4A6B2E', '#6B2E6B',
]

export default function NewArtistPage() {
  const [name, setName] = useState('')
  const [project, setProject] = useState('')
  const [color, setColor] = useState('#C4622D')
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
      let { data: profile } = await supabase.from('profiles').select('org_id').eq('id', user.id).single()
      // If no profile or no org_id, run full account setup
      if (!profile?.org_id) {
        const res = await fetch('/api/setup-account', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ userId: user.id, email: user.email, fullName: (profile as any)?.full_name || '' }),
        })
        const setupData = await res.json()
        if (setupData.success) {
          profile = { ...profile, org_id: setupData.org_id }
        }
      }
      const { error } = await supabase.from('artists').insert({ name, project, org_id: profile?.org_id, color, status: 'active' })
      if (error) throw error
      router.push('/dashboard')
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const inputStyle = { width: '100%', padding: '10px 12px', border: '1px solid #DDD8CE', borderRadius: 6, fontSize: 13, fontFamily: 'Georgia, serif', color: '#1A1714', outline: 'none', boxSizing: 'border-box' as const }

  return (
    <div style={{ minHeight: '100vh', background: '#F5F0E8', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'Georgia, serif', padding: 16 }}>
      <div style={{ width: '100%', maxWidth: 400, background: '#fff', borderRadius: 12, padding: 40, border: '1px solid #DDD8CE' }}>
        <button onClick={() => router.push('/dashboard')} style={{ background: 'none', border: 'none', color: '#8A8580', cursor: 'pointer', fontSize: 13, marginBottom: 24, padding: 0 }}>← Back</button>
        <div style={{ fontFamily: 'monospace', fontSize: 9, letterSpacing: 3, color: '#8A8580', marginBottom: 24 }}>ADD ARTIST</div>
        {error && <div style={{ background: '#FEE', border: '1px solid #FCC', borderRadius: 6, padding: '10px 14px', marginBottom: 16, fontSize: 12, color: '#C00', fontFamily: 'monospace' }}>{error}</div>}

        <div style={{ marginBottom: 16 }}>
          <div style={{ fontFamily: 'monospace', fontSize: 9, letterSpacing: 2, color: '#8A8580', marginBottom: 6 }}>ARTIST NAME</div>
          <input value={name} onChange={e => setName(e.target.value)} placeholder="Emma Donovan" style={inputStyle} />
        </div>
        <div style={{ marginBottom: 16 }}>
          <div style={{ fontFamily: 'monospace', fontSize: 9, letterSpacing: 2, color: '#8A8580', marginBottom: 6 }}>PROJECT / TOUR</div>
          <input value={project} onChange={e => setProject(e.target.value)} placeholder="Take Me To The River" style={inputStyle} />
        </div>

        {/* Colour picker */}
        <div style={{ marginBottom: 24 }}>
          <div style={{ fontFamily: 'monospace', fontSize: 9, letterSpacing: 2, color: '#8A8580', marginBottom: 10 }}>COLOUR</div>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
            {COLOURS.map(c => (
              <button key={c} onClick={() => setColor(c)}
                style={{ width: 28, height: 28, borderRadius: '50%', background: c, border: color === c ? '3px solid #1A1714' : '3px solid transparent', cursor: 'pointer', padding: 0, outline: 'none', transition: 'transform 0.1s', transform: color === c ? 'scale(1.2)' : 'scale(1)' }} />
            ))}
            <input type="color" value={color} onChange={e => setColor(e.target.value)}
              style={{ width: 28, height: 28, borderRadius: '50%', border: '2px dashed #DDD8CE', cursor: 'pointer', padding: 0, background: 'transparent' }}
              title="Custom colour" />
          </div>
        </div>

        {/* Preview */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 16px', background: '#F5F0E8', borderRadius: 8, marginBottom: 20 }}>
          <div style={{ width: 36, height: 36, borderRadius: '50%', background: color, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: 16, fontWeight: 700, flexShrink: 0 }}>
            {name ? name.charAt(0).toUpperCase() : '?'}
          </div>
          <div>
            <div style={{ fontSize: 14, fontWeight: 600 }}>{name || 'Artist name'}</div>
            <div style={{ fontSize: 12, color: '#8A8580', fontStyle: 'italic' }}>{project || 'Project'}</div>
          </div>
        </div>

        <button onClick={handleSubmit} disabled={loading}
          style={{ width: '100%', padding: 13, background: '#1A1714', color: '#F5F0E8', border: 'none', borderRadius: 8, fontFamily: 'monospace', fontSize: 10, letterSpacing: 3, cursor: 'pointer' }}>
          {loading ? 'ADDING...' : 'ADD ARTIST'}
        </button>
      </div>
    </div>
  )
}
