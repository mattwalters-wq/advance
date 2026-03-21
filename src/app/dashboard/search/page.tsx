'use client'

import { useEffect, useState, useCallback } from 'react'
import { createClient } from '@/lib/supabase'
import { useRouter } from 'next/navigation'

const supabase = createClient()

export default function SearchPage() {
  const router = useRouter()
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<any>({ shows: [], travel: [], contacts: [], artists: [] })
  const [searching, setSearching] = useState(false)
  const [darkMode, setDarkMode] = useState(false)
  const [artists, setArtists] = useState<any[]>([])

  useEffect(() => {
    supabase.from('artists').select('*').then(({ data }) => setArtists(data || []))
  }, [])

  function artistName(tourId: string) {
    // We'll look this up via tours join
    return ''
  }

  const search = useCallback(async (q: string) => {
    if (!q.trim()) { setResults({ shows: [], travel: [], contacts: [], artists: [] }); return }
    setSearching(true)

    const term = `%${q}%`
    const [showsRes, travelRes, contactsRes, artistsRes] = await Promise.all([
      supabase.from('shows').select('*, tours(name, artist_id, artists(name))').or(`venue.ilike.${term},city.ilike.${term},country.ilike.${term},notes.ilike.${term}`).limit(20),
      supabase.from('travel').select('*, tours(name, artist_id, artists(name))').or(`from_location.ilike.${term},to_location.ilike.${term},carrier.ilike.${term},reference.ilike.${term}`).limit(20),
      supabase.from('contacts').select('*, tours(name, artist_id, artists(name))').or(`name.ilike.${term},role.ilike.${term},phone.ilike.${term},email.ilike.${term}`).limit(20),
      supabase.from('artists').select('*').or(`name.ilike.${term},project.ilike.${term}`).limit(10),
    ])

    setResults({
      shows: showsRes.data || [],
      travel: travelRes.data || [],
      contacts: contactsRes.data || [],
      artists: artistsRes.data || [],
    })
    setSearching(false)
  }, [])

  useEffect(() => {
    const t = setTimeout(() => search(query), 300)
    return () => clearTimeout(t)
  }, [query, search])

  const total = results.shows.length + results.travel.length + results.contacts.length + results.artists.length

  const bg = darkMode ? '#1a1a1a' : '#F5F0E8'
  const card = darkMode ? '#2a2a2a' : '#fff'
  const text = darkMode ? '#e8e0d0' : '#1A1714'
  const muted = darkMode ? '#888' : '#8A8580'
  const border = darkMode ? '#333' : '#DDD8CE'
  const accent = '#C4622D'

  function highlight(str: string) {
    if (!str || !query) return str
    const parts = str.split(new RegExp(`(${query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi'))
    return parts.map((p, i) => p.toLowerCase() === query.toLowerCase()
      ? <mark key={i} style={{ background: '#FFE066', color: text, borderRadius: 2, padding: '0 2px' }}>{p}</mark>
      : p)
  }

  return (
    <div style={{ background: bg, minHeight: '100vh', fontFamily: 'Georgia, serif', color: text }}>
      <div style={{ background: darkMode ? '#111' : '#1A1714', padding: '14px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <button onClick={() => router.push('/dashboard')} style={{ fontFamily: 'monospace', fontSize: 9, letterSpacing: 2, color: '#8A8580', background: 'transparent', border: '1px solid #2A2520', borderRadius: 4, padding: '6px 10px', cursor: 'pointer' }}>← ROSTER</button>
          <span style={{ fontSize: 18, fontStyle: 'italic', color: '#F5F0E8' }}>Search</span>
        </div>
        <button onClick={() => setDarkMode(!darkMode)} style={{ background: 'none', border: '1px solid #333', borderRadius: 6, padding: '6px 10px', color: '#F5F0E8', cursor: 'pointer', fontSize: 12 }}>
          {darkMode ? '☀️' : '🌙'}
        </button>
      </div>

      <div style={{ maxWidth: 720, margin: '0 auto', padding: '24px 16px' }}>

        {/* Search input */}
        <div style={{ position: 'relative', marginBottom: 28 }}>
          <input
            autoFocus
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="Search venues, cities, contacts, artists..."
            style={{ width: '100%', padding: '14px 48px 14px 18px', border: `2px solid ${query ? accent : border}`, borderRadius: 12, background: card, color: text, fontSize: 16, fontFamily: 'Georgia, serif', outline: 'none', boxSizing: 'border-box' as const, transition: 'border-color 0.15s' }}
          />
          <div style={{ position: 'absolute', right: 16, top: '50%', transform: 'translateY(-50%)', color: muted, fontSize: 18 }}>
            {searching ? '⟳' : '🔍'}
          </div>
        </div>

        {/* Results */}
        {query && total === 0 && !searching && (
          <div style={{ textAlign: 'center', padding: '40px 20px', color: muted }}>
            <div style={{ fontSize: 28, marginBottom: 12 }}>🔍</div>
            No results for "{query}"
          </div>
        )}

        {results.artists.length > 0 && (
          <ResultSection title="Artists" count={results.artists.length} border={border} card={card} muted={muted} accent={accent}>
            {results.artists.map((a: any, i: number) => (
              <ResultItem key={i} last={i === results.artists.length - 1} border={border} onClick={() => router.push(`/dashboard/artists/${a.id}`)}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <div style={{ width: 32, height: 32, borderRadius: '50%', background: a.color || accent, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: 13, fontWeight: 700, flexShrink: 0 }}>{a.name.charAt(0)}</div>
                  <div>
                    <div style={{ fontWeight: 600 }}>{highlight(a.name)}</div>
                    {a.project && <div style={{ fontSize: 12, color: muted, fontStyle: 'italic' }}>{highlight(a.project)}</div>}
                  </div>
                </div>
              </ResultItem>
            ))}
          </ResultSection>
        )}

        {results.shows.length > 0 && (
          <ResultSection title="Shows" count={results.shows.length} border={border} card={card} muted={muted} accent={accent}>
            {results.shows.map((s: any, i: number) => (
              <ResultItem key={i} last={i === results.shows.length - 1} border={border} onClick={() => router.push(`/dashboard/artists/${s.tours?.artist_id}`)}>
                <div style={{ fontWeight: 600, marginBottom: 2 }}>{highlight(s.venue)}</div>
                <div style={{ fontSize: 13, color: muted }}>{highlight(s.city)}{s.country ? `, ${s.country}` : ''} · {s.date}</div>
                {s.tours?.artists?.name && <div style={{ fontSize: 11, color: accent, fontFamily: 'monospace', letterSpacing: 1, marginTop: 2 }}>{s.tours.artists.name}</div>}
              </ResultItem>
            ))}
          </ResultSection>
        )}

        {results.travel.length > 0 && (
          <ResultSection title="Travel" count={results.travel.length} border={border} card={card} muted={muted} accent={accent}>
            {results.travel.map((t: any, i: number) => (
              <ResultItem key={i} last={i === results.travel.length - 1} border={border} onClick={() => router.push(`/dashboard/artists/${t.tours?.artist_id}`)}>
                <div style={{ fontWeight: 600, marginBottom: 2 }}>{highlight(t.from_location)} → {highlight(t.to_location)}</div>
                <div style={{ fontSize: 13, color: muted }}>{t.travel_date}{t.carrier ? ` · ${highlight(t.carrier)}` : ''}{t.reference ? ` · ${highlight(t.reference)}` : ''}</div>
                {t.tours?.artists?.name && <div style={{ fontSize: 11, color: accent, fontFamily: 'monospace', letterSpacing: 1, marginTop: 2 }}>{t.tours.artists.name}</div>}
              </ResultItem>
            ))}
          </ResultSection>
        )}

        {results.contacts.length > 0 && (
          <ResultSection title="Contacts" count={results.contacts.length} border={border} card={card} muted={muted} accent={accent}>
            {results.contacts.map((c: any, i: number) => (
              <ResultItem key={i} last={i === results.contacts.length - 1} border={border} onClick={() => router.push(`/dashboard/artists/${c.tours?.artist_id}`)}>
                <div style={{ fontWeight: 600, marginBottom: 2 }}>{highlight(c.name)}</div>
                {c.role && <div style={{ fontSize: 12, color: muted, fontFamily: 'monospace', letterSpacing: 1, textTransform: 'uppercase' as const }}>{highlight(c.role)}</div>}
                <div style={{ display: 'flex', gap: 14, marginTop: 4, flexWrap: 'wrap' as const }}>
                  {c.phone && <a href={`tel:${c.phone}`} style={{ fontSize: 13, color: accent, textDecoration: 'none' }} onClick={e => e.stopPropagation()}>📞 {highlight(c.phone)}</a>}
                  {c.email && <a href={`mailto:${c.email}`} style={{ fontSize: 13, color: accent, textDecoration: 'none' }} onClick={e => e.stopPropagation()}>✉️ {highlight(c.email)}</a>}
                </div>
                {c.tours?.artists?.name && <div style={{ fontSize: 11, color: accent, fontFamily: 'monospace', letterSpacing: 1, marginTop: 4 }}>{c.tours.artists.name}</div>}
              </ResultItem>
            ))}
          </ResultSection>
        )}

        {!query && (
          <div style={{ textAlign: 'center', padding: '60px 20px', color: muted }}>
            <div style={{ fontSize: 40, marginBottom: 16 }}>🔍</div>
            <div style={{ fontSize: 16, marginBottom: 8, color: text }}>Search your roster</div>
            <div style={{ fontSize: 13 }}>Venues, cities, contacts, flights, artists — everything in one place</div>
          </div>
        )}
      </div>
    </div>
  )
}

function ResultSection({ title, count, children, border, card, muted, accent }: any) {
  return (
    <div style={{ marginBottom: 20 }}>
      <div style={{ fontFamily: 'monospace', fontSize: 9, letterSpacing: 3, color: muted, marginBottom: 10, textTransform: 'uppercase' }}>{title} — {count}</div>
      <div style={{ background: card, borderRadius: 12, border: `1px solid ${border}`, overflow: 'hidden' }}>
        {children}
      </div>
    </div>
  )
}

function ResultItem({ children, last, border, onClick }: any) {
  return (
    <div onClick={onClick} style={{ padding: '14px 18px', borderBottom: last ? 'none' : `1px solid ${border}`, cursor: 'pointer' }}
      onMouseEnter={e => (e.currentTarget.style.background = 'rgba(196,98,45,0.04)')}
      onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
      {children}
    </div>
  )
}
