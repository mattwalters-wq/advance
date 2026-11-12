'use client'

import Link from 'next/link'
import { useEffect, useRef, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import { Artist, Show, Travel, formatDay, searchPattern, tourHref } from '@/lib/workspace'
import WorkspaceShell, { EmptyState, LoadError, Skeleton } from '@/components/workspace/WorkspaceShell'
import { WorkspaceProvider, useWorkspace } from '@/components/workspace/WorkspaceProvider'
import Icon from '@/components/workspace/Icon'

interface Contact { id: string; tour_id: string; name: string; role?: string; email?: string; phone?: string }
type Results = { artists: Artist[]; shows: Show[]; travel: Travel[]; contacts: Contact[] }
type Category = keyof Results
const empty: Results = { artists: [], shows: [], travel: [], contacts: [] }
const labels = { artists: 'Artists', shows: 'Events', travel: 'Travel', contacts: 'Contacts' }

function Search() {
  const { artists, tours, loading, error: workspaceError, adminOrg } = useWorkspace()
  const params = useSearchParams()
  const [query, setQuery] = useState(params.get('q') || ''), [category, setCategory] = useState<'all' | Category>('all')
  const [results, setResults] = useState<Results>(empty), [searching, setSearching] = useState(false), [error, setError] = useState('')
  const [settledQuery, setSettledQuery] = useState(''), [attempt, setAttempt] = useState(0)
  const requestId = useRef(0), inputRef = useRef<HTMLInputElement>(null)
  const term = query.trim(), pending = searching || term !== settledQuery
  useEffect(() => {
    const id = ++requestId.current
    setError(''); setResults(empty)
    if (loading || workspaceError) return
    if (!term) { setSearching(false); setSettledQuery(''); return }
    setSearching(true)
    const controller = new AbortController()
    const timer = setTimeout(async () => {
      try {
        const db = createClient(), pattern = searchPattern(term)
        const found: Results = { ...empty, artists: artists.filter(a => `${a.name} ${a.project || ''}`.toLowerCase().includes(term.toLowerCase())).slice(0, 50), shows: [], travel: [], contacts: [] }
        // Query only accessible tours and bound each category's results.
        for (let offset = 0; offset < tours.length; offset += 100) {
          const ids = tours.slice(offset, offset + 100).map(t => t.id)
          const responses = await Promise.all([
            db.from('shows').select('id, tour_id, date, venue, city, set_time').in('tour_id', ids).is('deleted_at', null).or(`venue.ilike.${pattern},city.ilike.${pattern},country.ilike.${pattern},notes.ilike.${pattern}`).order('date', { ascending: false }).order('id').limit(50).abortSignal(controller.signal),
            db.from('travel').select('id, tour_id, travel_date, from_location, to_location, carrier, reference').in('tour_id', ids).is('deleted_at', null).or(`from_location.ilike.${pattern},to_location.ilike.${pattern},carrier.ilike.${pattern},reference.ilike.${pattern}`).order('travel_date', { ascending: false }).order('id').limit(50).abortSignal(controller.signal),
            db.from('contacts').select('id, tour_id, name, role, phone, email').in('tour_id', ids).is('deleted_at', null).or(`name.ilike.${pattern},role.ilike.${pattern},phone.ilike.${pattern},email.ilike.${pattern}`).order('name').order('id').limit(50).abortSignal(controller.signal),
          ])
          if (responses.some(r => r.error)) throw new Error('Search failed')
          found.shows.push(...(responses[0].data || [])); found.travel.push(...(responses[1].data || [])); found.contacts.push(...(responses[2].data || []))
        }
        found.shows = found.shows.sort((a,b) => b.date.localeCompare(a.date)).slice(0,50)
        found.travel = found.travel.sort((a,b) => b.travel_date.localeCompare(a.travel_date)).slice(0,50)
        found.contacts = found.contacts.sort((a,b) => a.name.localeCompare(b.name)).slice(0,50)
        if (id === requestId.current) { setResults(found); setSettledQuery(term) }
      } catch {
        if (id === requestId.current) { setError('Search couldn’t finish. Check your connection and try again.'); setSettledQuery(term) }
      } finally { if (id === requestId.current) setSearching(false) }
    }, 300)
    return () => { clearTimeout(timer); controller.abort(); requestId.current++ }
  }, [term, artists, tours, loading, workspaceError, attempt])
  const total = Object.values(results).reduce((count, rows) => count + rows.length, 0)
  const categories = (Object.keys(labels) as Category[]).filter(key => category === 'all' || category === key)
  const visibleTotal = categories.reduce((count, key) => count + results[key].length, 0)
  function highlight(text?: string | null) {
    if (!text || !term) return text
    const parts = text.split(new RegExp(`(${term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi'))
    return parts.map((part, i) => part.toLowerCase() === term.toLowerCase() ? <mark key={i}>{part}</mark> : part)
  }
  function context(tourId: string) {
    const tour = tours.find(t => t.id === tourId), artist = artists.find(a => a.id === tour?.artist_id)
    return { href: tour ? tourHref(tour.artist_id, tour.id, adminOrg) : '/dashboard', label: [artist?.name, tour?.name].filter(Boolean).join(' · ') }
  }
  return <WorkspaceShell>
    <div className="ws-page-heading"><div><span className="ws-eyebrow">LESS LOOKING. MORE FINDING.</span><h1>It’s in here somewhere.</h1><p>Artists, venues, cities, flight references and people. One search.</p></div></div>
    <div className="ws-search-box"><Icon name="search" size={23}/><input ref={inputRef} type="search" autoFocus aria-label="Search your workspace" placeholder="A venue, an artist, a flight number…" value={query} maxLength={200} onChange={e => { setQuery(e.target.value); setResults(empty); requestId.current++ }} onKeyDown={e => { if (e.key === 'Escape') setQuery('') }}/>{query && <button aria-label="Clear search" onClick={() => { setQuery(''); inputRef.current?.focus() }}><Icon name="close"/></button>}<kbd>ESC</kbd></div>
    <div className="ws-search-toolbar"><div className="ws-segments" aria-label="Search category"><button aria-pressed={category === 'all'} onClick={() => setCategory('all')}>Everything</button>{(Object.keys(labels) as Category[]).map(key => <button key={key} aria-pressed={category === key} onClick={() => setCategory(key)}>{labels[key]}{!pending && term && <span>{results[key].length === 50 ? '50+' : results[key].length}</span>}</button>)}</div><span className="ws-muted ws-small-text" role="status">{term ? pending ? 'Searching…' : error ? 'Search unavailable' : `${total} matches${Object.values(results).some(rows => rows.length === 50) ? ' · Showing up to 50 per category' : ''}` : 'Search across your roster'}</span></div>
    {!term ? <div className="ws-panel ws-search-intro"><EmptyState title="One place to find the details" icon="search"><p>Search by venue, city, artist, contact or booking reference. Results link straight to the right tour.</p></EmptyState><div className="ws-search-suggestions"><span className="ws-eyebrow">TRY AN ARTIST</span>{artists.slice(0, 6).map(artist => <button key={artist.id} className="ws-button ws-small" onClick={() => { setQuery(artist.name); inputRef.current?.focus() }}><Icon name="music" size={13}/>{artist.name}</button>)}{!artists.length && <span className="ws-muted ws-small-text">Add your first artist to start building your workspace.</span>}</div></div> : pending ? <Skeleton rows={4}/> : error ? <LoadError message={error} retry={() => setAttempt(n => n + 1)}/> : !visibleTotal ? <div className="ws-panel"><EmptyState title={`No ${category === 'all' ? 'results' : labels[category].toLowerCase()} for “${term}”`} icon="search"><p>Try a shorter name, a city, or another category.</p>{category !== 'all' && <button className="ws-button" onClick={() => setCategory('all')}>Search all categories</button>}</EmptyState></div> : <div className="ws-search-results">{categories.map(key => results[key].length ? <section className="ws-panel" key={key}><div className="ws-search-section-heading"><h2>{labels[key]}</h2><span className="ws-counter">{results[key].length === 50 ? '50+' : results[key].length}</span></div>
      {key === 'artists' && results.artists.map(artist => <Link className="ws-search-result" href={tourHref(artist.id, undefined, adminOrg)} key={artist.id}><span className="ws-result-symbol"><Icon name="music"/></span><div><strong>{highlight(artist.name)}</strong><p>{highlight(artist.project) || 'Artist workspace'}</p></div><Icon name="arrow" size={17}/></Link>)}
      {key === 'shows' && results.shows.map(show => { const item = context(show.tour_id); return <Link className="ws-search-result" href={item.href} key={show.id}><span className="ws-result-symbol"><Icon name="calendar"/></span><div><strong>{highlight(show.venue) || 'Venue TBC'}{show.city && <> · {highlight(show.city)}</>}</strong><p>{show.date && formatDay(show.date, { day: 'numeric', month: 'short', year: 'numeric' })} · {item.label}</p></div><Icon name="arrow" size={17}/></Link> })}
      {key === 'travel' && results.travel.map(leg => { const item = context(leg.tour_id); return <Link className="ws-search-result" href={item.href} key={leg.id}><span className="ws-result-symbol"><Icon name="plane"/></span><div><strong>{highlight(leg.from_location) || 'Origin TBC'} → {highlight(leg.to_location) || 'Destination TBC'}</strong><p>{leg.travel_date && formatDay(leg.travel_date)} · {highlight([leg.carrier, leg.reference].filter(Boolean).join(' · '))}</p><small>{item.label}</small></div><Icon name="arrow" size={17}/></Link> })}
      {key === 'contacts' && results.contacts.map(contact => { const item = context(contact.tour_id); return <div className="ws-search-contact" key={contact.id}><Link className="ws-search-result" href={item.href}><span className="ws-result-symbol">{contact.name.charAt(0).toUpperCase()}</span><div><strong>{highlight(contact.name)}</strong><p>{highlight(contact.role)}{contact.role ? ' · ' : ''}{item.label}</p></div><Icon name="arrow" size={17}/></Link><div className="ws-contact-links">{contact.phone && <a href={`tel:${contact.phone}`}>{highlight(contact.phone)}</a>}{contact.email && <a href={`mailto:${contact.email}`}>{highlight(contact.email)}</a>}</div></div> })}
    </section> : null)}</div>}
  </WorkspaceShell>
}
export default function SearchPage() { return <WorkspaceProvider><Search/></WorkspaceProvider> }
