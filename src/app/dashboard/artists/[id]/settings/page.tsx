'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'

const supabase = createClient()

const COLOURS = [
  '#C4622D', '#3D6B50', '#5B4B8A', '#2E6B8A', '#8A2E2E',
  '#B8860B', '#2E8A6B', '#8A5B2E', '#4A6B2E', '#6B2E6B',
  '#C4622D', '#1A6B8A', '#8A1A4A', '#4A8A1A', '#6B4A1A',
]

const TOUR_ROLES = [
  'Tour Manager', 'Production Manager', 'FOH Engineer', 'Monitor Engineer',
  'Lighting Designer', 'Stage Manager', 'Tour Accountant', 'Merchandise',
  'Backline Tech', 'Drum Tech', 'Guitar Tech', 'Bass Tech', 'Keys Tech',
  'Wardrobe', 'Catering', 'Security', 'Driver', 'Press/Promo',
  'Band Member', 'Agent', 'Publicist', 'Label Rep', 'Other',
]

export default function ArtistSettingsPage() {
  const params = useParams()
  const router = useRouter()
  const [artist, setArtist] = useState<any>(null)
  const [tours, setTours] = useState<any[]>([])
  const [teamMembers, setTeamMembers] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [darkMode, setDarkMode] = useState(false)
  const [confirmDeleteArtist, setConfirmDeleteArtist] = useState(false)
  const [confirmDeleteTour, setConfirmDeleteTour] = useState<any>(null)
  const [deleting, setDeleting] = useState(false)
  const [tab, setTab] = useState<'general' | 'team' | 'danger'>('general')

  // Artist form
  const [name, setName] = useState('')
  const [project, setProject] = useState('')
  const [color, setColor] = useState('#C4622D')

  // Invite form
  const [inviteEmail, setInviteEmail] = useState('')
  const [inviteName, setInviteName] = useState('')
  const [inviteRole, setInviteRole] = useState('Tour Manager')
  const [inviteTourIds, setInviteTourIds] = useState<string[]>([])
  const [inviting, setInviting] = useState(false)
  const [inviteMsg, setInviteMsg] = useState('')

  useEffect(() => { loadData() }, [params.id])

  async function loadData() {
    const { data: artistData } = await supabase.from('artists').select('*').eq('id', params.id).single()
    if (!artistData) { router.push('/dashboard'); return }
    setArtist(artistData)
    setName(artistData.name || '')
    setProject(artistData.project || '')
    setColor(artistData.color || '#C4622D')

    const { data: toursData } = await supabase.from('tours').select('*').eq('artist_id', params.id).order('start_date')
    setTours(toursData || [])

    // Load team members for this artist's tours
    const tourIds = (toursData || []).map((t: any) => t.id)
    if (tourIds.length > 0) {
      const { data: accessData } = await supabase
        .from('tour_access')
        .select('*, profiles(full_name, id)')
        .in('tour_id', tourIds)
      setTeamMembers(accessData || [])
    }

    setLoading(false)
  }

  async function handleSaveArtist() {
    setSaving(true)
    await supabase.from('artists').update({ name, project, color }).eq('id', params.id)
    setArtist({ ...artist, name, project, color })
    setSaving(false)
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  async function handleDeleteTour(tour: any) {
    setDeleting(true)
    await supabase.from('tours').delete().eq('id', tour.id)
    setTours(prev => prev.filter(t => t.id !== tour.id))
    setConfirmDeleteTour(null)
    setDeleting(false)
  }

  async function handleDeleteArtist() {
    setDeleting(true)
    await supabase.from('artists').delete().eq('id', params.id)
    router.push('/dashboard')
  }

  async function handleInvite() {
    if (!inviteEmail.trim()) return
    setInviting(true)
    setInviteMsg('')
    try {
      const res = await fetch('/api/invite-tour', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: inviteEmail,
          name: inviteName,
          role: inviteRole,
          tourIds: inviteTourIds,
          artistId: params.id,
        }),
      })
      const data = await res.json()
      if (data.success) {
        setInviteMsg(`Invite sent to ${inviteEmail}`)
        setInviteEmail('')
        setInviteName('')
        setInviteTourIds([])
        await loadData()
      } else {
        setInviteMsg(data.error || 'Failed to send invite')
      }
    } catch (err: any) {
      setInviteMsg(err.message)
    }
    setInviting(false)
  }

  async function handleRemoveAccess(accessId: string) {
    await supabase.from('tour_access').delete().eq('id', accessId)
    setTeamMembers(prev => prev.filter(m => m.id !== accessId))
  }

  const bg = darkMode ? '#1a1a1a' : '#F5F0E8'
  const card = darkMode ? '#2a2a2a' : '#fff'
  const text = darkMode ? '#e8e0d0' : '#1A1714'
  const muted = darkMode ? '#888' : '#8A8580'
  const border = darkMode ? '#333' : '#DDD8CE'
  const accent = '#C4622D'
  const inputStyle = { width: '100%', padding: '10px 12px', border: `1px solid ${border}`, borderRadius: 8, background: bg, color: text, fontSize: 14, fontFamily: 'Georgia, serif', outline: 'none', boxSizing: 'border-box' as const }

  if (loading) return <div style={{ background: bg, minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', color: text, fontFamily: 'Georgia, serif' }}>Loading...</div>

  return (
    <div style={{ background: bg, minHeight: '100vh', fontFamily: 'Georgia, serif', color: text }}>

      {/* Delete tour confirm */}
      {confirmDeleteTour && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}
          onClick={() => setConfirmDeleteTour(null)}>
          <div style={{ background: card, borderRadius: 16, padding: 28, width: '100%', maxWidth: 380 }} onClick={e => e.stopPropagation()}>
            <div style={{ fontSize: 16, fontWeight: 600, marginBottom: 8 }}>Delete "{confirmDeleteTour.name}"?</div>
            <div style={{ fontSize: 13, color: muted, marginBottom: 24 }}>This will permanently delete all shows, travel, accommodation and contacts for this tour. This cannot be undone.</div>
            <div style={{ display: 'flex', gap: 10 }}>
              <button onClick={() => setConfirmDeleteTour(null)} style={{ flex: 1, padding: 10, background: 'transparent', border: `1px solid ${border}`, borderRadius: 8, cursor: 'pointer', color: text }}>Cancel</button>
              <button onClick={() => handleDeleteTour(confirmDeleteTour)} disabled={deleting} style={{ flex: 1, padding: 10, background: '#C00', color: '#fff', border: 'none', borderRadius: 8, cursor: 'pointer' }}>{deleting ? 'Deleting...' : 'Delete Tour'}</button>
            </div>
          </div>
        </div>
      )}

      {/* Delete artist confirm */}
      {confirmDeleteArtist && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}
          onClick={() => setConfirmDeleteArtist(false)}>
          <div style={{ background: card, borderRadius: 16, padding: 28, width: '100%', maxWidth: 380 }} onClick={e => e.stopPropagation()}>
            <div style={{ fontSize: 16, fontWeight: 600, marginBottom: 8 }}>Delete {artist?.name}?</div>
            <div style={{ fontSize: 13, color: muted, marginBottom: 24 }}>This will permanently delete this artist and ALL their tours, shows, travel, and data. This cannot be undone.</div>
            <div style={{ display: 'flex', gap: 10 }}>
              <button onClick={() => setConfirmDeleteArtist(false)} style={{ flex: 1, padding: 10, background: 'transparent', border: `1px solid ${border}`, borderRadius: 8, cursor: 'pointer', color: text }}>Cancel</button>
              <button onClick={handleDeleteArtist} disabled={deleting} style={{ flex: 1, padding: 10, background: '#C00', color: '#fff', border: 'none', borderRadius: 8, cursor: 'pointer' }}>{deleting ? 'Deleting...' : 'Delete Artist'}</button>
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <div style={{ borderBottom: `1px solid ${border}`, padding: '16px 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <button onClick={() => router.push(`/dashboard/artists/${params.id}`)} style={{ background: 'none', border: 'none', color: muted, cursor: 'pointer', fontSize: 14 }}>← {artist?.name}</button>
          <div style={{ fontFamily: 'monospace', fontSize: 10, letterSpacing: 3, color: muted }}>SETTINGS</div>
        </div>
        <button onClick={() => setDarkMode(!darkMode)} style={{ background: 'none', border: `1px solid ${border}`, borderRadius: 6, padding: '6px 12px', color: text, cursor: 'pointer', fontSize: 13 }}>
          {darkMode ? '☀️' : '🌙'}
        </button>
      </div>

      <div style={{ maxWidth: 640, margin: '0 auto', padding: '24px 16px' }}>

        {/* Tabs */}
        <div style={{ display: 'flex', gap: 0, border: `1px solid ${border}`, borderRadius: 8, overflow: 'hidden', marginBottom: 28 }}>
          {([['general', 'General'], ['team', 'Team & Access'], ['danger', 'Danger Zone']] as const).map(([t, label]) => (
            <button key={t} onClick={() => setTab(t)}
              style={{ flex: 1, padding: '10px', background: tab === t ? (t === 'danger' ? '#C00' : accent) : 'transparent', color: tab === t ? '#fff' : t === 'danger' ? '#C00' : muted, border: 'none', cursor: 'pointer', fontFamily: 'monospace', fontSize: 9, letterSpacing: 2 }}>
              {label}
            </button>
          ))}
        </div>

        {/* GENERAL */}
        {tab === 'general' && (
          <div style={{ display: 'grid', gap: 20 }}>
            <div style={{ background: card, borderRadius: 12, padding: 24, border: `1px solid ${border}` }}>
              <div style={{ fontFamily: 'monospace', fontSize: 9, letterSpacing: 3, color: muted, marginBottom: 20 }}>ARTIST DETAILS</div>

              <div style={{ marginBottom: 16 }}>
                <label style={{ fontSize: 11, fontFamily: 'monospace', letterSpacing: 2, color: muted, display: 'block', marginBottom: 6 }}>NAME</label>
                <input value={name} onChange={e => setName(e.target.value)} style={inputStyle} />
              </div>
              <div style={{ marginBottom: 20 }}>
                <label style={{ fontSize: 11, fontFamily: 'monospace', letterSpacing: 2, color: muted, display: 'block', marginBottom: 6 }}>PROJECT / CURRENT WORK</label>
                <input value={project} onChange={e => setProject(e.target.value)} placeholder="e.g. Debut album campaign" style={inputStyle} />
              </div>

              {/* Colour picker */}
              <div style={{ marginBottom: 24 }}>
                <label style={{ fontSize: 11, fontFamily: 'monospace', letterSpacing: 2, color: muted, display: 'block', marginBottom: 10 }}>COLOUR</label>
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
                  {COLOURS.slice(0, 10).map(c => (
                    <button key={c} onClick={() => setColor(c)}
                      style={{ width: 28, height: 28, borderRadius: '50%', background: c, border: color === c ? '3px solid ' + text : '3px solid transparent', cursor: 'pointer', padding: 0, outline: 'none', transform: color === c ? 'scale(1.2)' : 'scale(1)', transition: 'transform 0.1s' }} />
                  ))}
                  <input type="color" value={color} onChange={e => setColor(e.target.value)}
                    style={{ width: 28, height: 28, borderRadius: '50%', border: '2px dashed ' + border, cursor: 'pointer', padding: 0, background: 'transparent' }} />
                </div>
              </div>

              {/* Preview */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 16px', background: bg, borderRadius: 8, marginBottom: 20 }}>
                <div style={{ width: 40, height: 40, borderRadius: '50%', background: color, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: 16, fontWeight: 700, flexShrink: 0 }}>
                  {name.charAt(0) || '?'}
                </div>
                <div>
                  <div style={{ fontSize: 15, fontWeight: 600 }}>{name || 'Artist name'}</div>
                  <div style={{ fontSize: 12, color: muted, fontStyle: 'italic' }}>{project || 'Project'}</div>
                </div>
              </div>

              <button onClick={handleSaveArtist} disabled={saving}
                style={{ width: '100%', padding: 12, background: saved ? '#2d7a4f' : accent, color: '#fff', border: 'none', borderRadius: 8, cursor: 'pointer', fontFamily: 'monospace', fontSize: 10, letterSpacing: 3 }}>
                {saved ? '✓ SAVED' : saving ? 'SAVING...' : 'SAVE CHANGES'}
              </button>
            </div>
          </div>
        )}

        {/* TEAM & ACCESS */}
        {tab === 'team' && (
          <div style={{ display: 'grid', gap: 20 }}>

            {/* Invite form */}
            <div style={{ background: card, borderRadius: 12, padding: 24, border: `1px solid ${border}` }}>
              <div style={{ fontFamily: 'monospace', fontSize: 9, letterSpacing: 3, color: muted, marginBottom: 20 }}>INVITE TEAM MEMBER</div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }}>
                <div>
                  <label style={{ fontSize: 11, fontFamily: 'monospace', letterSpacing: 2, color: muted, display: 'block', marginBottom: 6 }}>NAME</label>
                  <input value={inviteName} onChange={e => setInviteName(e.target.value)} placeholder="Their name" style={inputStyle} />
                </div>
                <div>
                  <label style={{ fontSize: 11, fontFamily: 'monospace', letterSpacing: 2, color: muted, display: 'block', marginBottom: 6 }}>EMAIL</label>
                  <input value={inviteEmail} onChange={e => setInviteEmail(e.target.value)} placeholder="email@example.com" type="email" style={inputStyle} />
                </div>
              </div>

              <div style={{ marginBottom: 16 }}>
                <label style={{ fontSize: 11, fontFamily: 'monospace', letterSpacing: 2, color: muted, display: 'block', marginBottom: 6 }}>ROLE</label>
                <select value={inviteRole} onChange={e => setInviteRole(e.target.value)} style={inputStyle}>
                  {TOUR_ROLES.map(r => <option key={r}>{r}</option>)}
                </select>
              </div>

              {/* Tour access */}
              {tours.length > 0 && (
                <div style={{ marginBottom: 20 }}>
                  <label style={{ fontSize: 11, fontFamily: 'monospace', letterSpacing: 2, color: muted, display: 'block', marginBottom: 10 }}>TOUR ACCESS</label>
                  <div style={{ display: 'grid', gap: 8 }}>
                    {tours.map(tour => (
                      <label key={tour.id} style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer', fontSize: 13 }}>
                        <input type="checkbox"
                          checked={inviteTourIds.includes(tour.id)}
                          onChange={e => setInviteTourIds(prev => e.target.checked ? [...prev, tour.id] : prev.filter(id => id !== tour.id))}
                          style={{ width: 16, height: 16, accentColor: accent }} />
                        <span>{tour.name}</span>
                        {tour.status && <span style={{ fontFamily: 'monospace', fontSize: 9, color: muted, letterSpacing: 1 }}>{tour.status}</span>}
                      </label>
                    ))}
                  </div>
                  <button onClick={() => setInviteTourIds(tours.map(t => t.id))}
                    style={{ marginTop: 8, background: 'none', border: 'none', color: muted, cursor: 'pointer', fontSize: 11, fontFamily: 'monospace', letterSpacing: 1, padding: 0 }}>
                    SELECT ALL
                  </button>
                </div>
              )}

              {inviteMsg && <div style={{ marginBottom: 12, fontSize: 12, color: inviteMsg.includes('sent') ? '#2d7a4f' : '#C00', fontFamily: 'monospace' }}>{inviteMsg}</div>}

              <button onClick={handleInvite} disabled={inviting || !inviteEmail.trim()}
                style={{ width: '100%', padding: 12, background: accent, color: '#fff', border: 'none', borderRadius: 8, cursor: 'pointer', fontFamily: 'monospace', fontSize: 10, letterSpacing: 3, opacity: !inviteEmail.trim() ? 0.5 : 1 }}>
                {inviting ? 'SENDING...' : 'SEND INVITE'}
              </button>
              <div style={{ marginTop: 10, fontSize: 12, color: muted, textAlign: 'center', lineHeight: 1.6 }}>
                They'll get a magic link and land on a view filtered to their tours.
              </div>
            </div>

            {/* Current team */}
            {teamMembers.length > 0 && (
              <div style={{ background: card, borderRadius: 12, padding: 24, border: `1px solid ${border}` }}>
                <div style={{ fontFamily: 'monospace', fontSize: 9, letterSpacing: 3, color: muted, marginBottom: 16 }}>CURRENT TEAM — {teamMembers.length}</div>
                {teamMembers.map((member, i) => {
                  const tour = tours.find(t => t.id === member.tour_id)
                  return (
                    <div key={member.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 0', borderBottom: i < teamMembers.length - 1 ? `1px solid ${border}` : 'none', flexWrap: 'wrap', gap: 8 }}>
                      <div>
                        <div style={{ fontSize: 14, fontWeight: 600 }}>{member.profiles?.full_name || member.email || 'Invited user'}</div>
                        <div style={{ fontSize: 12, color: muted }}>{member.role} · {tour?.name || 'Unknown tour'}</div>
                      </div>
                      <button onClick={() => handleRemoveAccess(member.id)}
                        style={{ background: 'none', border: `1px solid ${border}`, borderRadius: 6, color: muted, cursor: 'pointer', fontSize: 11, padding: '4px 10px', fontFamily: 'monospace' }}>
                        REMOVE
                      </button>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        )}

        {/* DANGER ZONE */}
        {tab === 'danger' && (
          <div style={{ display: 'grid', gap: 16 }}>

            {/* Delete tours */}
            {tours.length > 0 && (
              <div style={{ background: card, borderRadius: 12, padding: 24, border: '1px solid #ffcccc' }}>
                <div style={{ fontFamily: 'monospace', fontSize: 9, letterSpacing: 3, color: '#C00', marginBottom: 16 }}>DELETE TOURS</div>
                {tours.map((tour, i) => (
                  <div key={tour.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 0', borderBottom: i < tours.length - 1 ? `1px solid ${border}` : 'none' }}>
                    <div>
                      <div style={{ fontSize: 14, fontWeight: 600 }}>{tour.name}</div>
                      <div style={{ fontSize: 12, color: muted }}>{tour.start_date || 'No dates set'}</div>
                    </div>
                    <button onClick={() => setConfirmDeleteTour(tour)}
                      style={{ background: '#fff0f0', border: '1px solid #ffcccc', borderRadius: 6, color: '#C00', cursor: 'pointer', fontSize: 11, padding: '6px 14px', fontFamily: 'monospace', letterSpacing: 1 }}>
                      DELETE
                    </button>
                  </div>
                ))}
              </div>
            )}

            {/* Delete artist */}
            <div style={{ background: card, borderRadius: 12, padding: 24, border: '1px solid #ffcccc' }}>
              <div style={{ fontFamily: 'monospace', fontSize: 9, letterSpacing: 3, color: '#C00', marginBottom: 8 }}>DELETE ARTIST</div>
              <div style={{ fontSize: 13, color: muted, marginBottom: 16, lineHeight: 1.6 }}>
                Permanently deletes {artist?.name} and all associated tours, shows, travel, accommodation, contacts, and data.
              </div>
              <button onClick={() => setConfirmDeleteArtist(true)}
                style={{ width: '100%', padding: 12, background: '#C00', color: '#fff', border: 'none', borderRadius: 8, cursor: 'pointer', fontFamily: 'monospace', fontSize: 10, letterSpacing: 3 }}>
                DELETE {artist?.name?.toUpperCase()}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
