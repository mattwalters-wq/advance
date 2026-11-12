'use client'

import Link from 'next/link'
import { useMemo, useState } from 'react'
import WorkspaceShell, { EmptyState, LoadError, Skeleton } from '@/components/workspace/WorkspaceShell'
import { WorkspaceProvider, useEvents, useWorkspace } from '@/components/workspace/WorkspaceProvider'
import Icon from '@/components/workspace/Icon'
import EventList from '@/components/workspace/EventList'
import { buildAgenda, dateKey, formatDay, shiftDay, tourHref } from '@/lib/workspace'

function Overview() {
  const { artists, tours, profile, adminOrg } = useWorkspace()
  const [today] = useState(() => dateKey(new Date()))
  const [rosterQuery, setRosterQuery] = useState(''), [activeOnly, setActiveOnly] = useState(false)
  const [eventFilter, setEventFilter] = useState<'all' | 'show' | 'travel'>('all'), [limit, setLimit] = useState(6)
  const schedule = useEvents(today, shiftDay(today, 29))
  const events = useMemo(() => buildAgenda(artists, tours, schedule.shows, schedule.travel), [artists, tours, schedule.shows, schedule.travel])
  const visibleEvents = events.filter(e => eventFilter === 'all' || e.kind === eventFilter)
  const attention = events.filter(e => e.missing.length && e.date <= shiftDay(today, 6))
  const activeTours = tours.filter(t => t.status !== 'completed' && (!t.end_date || t.end_date >= today))
  const filteredArtists = artists.filter(a => `${a.name} ${a.project || ''}`.toLowerCase().includes(rosterQuery.trim().toLowerCase()) && (!activeOnly || activeTours.some(t => t.artist_id === a.id)))
  const suffix = adminOrg ? `?superadmin=1&org_id=${encodeURIComponent(adminOrg)}` : ''
  const firstName = profile?.full_name?.trim().split(/\s+/)[0]
  const metric = (value: number) => schedule.loading || schedule.error ? '—' : value
  return <WorkspaceShell>
    <div className="ws-page-heading"><div><span className="ws-eyebrow">{formatDay(today, { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}</span><h1>{firstName ? `Your day, ${firstName}.` : 'Your day, in focus.'}</h1><p>Everything moving. Nothing missed.</p></div>{!adminOrg && <div className="ws-heading-actions"><Link className="ws-button" href="/dashboard/import"><Icon name="upload"/>Import documents</Link><Link className="ws-button ws-primary" href="/dashboard/artists/new"><Icon name="plus"/>Add artist</Link></div>}</div>
    <div className="ws-stats">
      <a href="#roster" className="ws-stat"><span>Your roster<Icon name="music"/></span><strong>{artists.length.toString().padStart(2, '0')}</strong><small>{activeTours.length} current or upcoming tours</small></a>
      <Link href={`/dashboard/calendar${suffix}`} className="ws-stat"><span>Upcoming events<Icon name="calendar"/></span><strong>{metric(events.filter(e => e.kind === 'show').length)}</strong><small>Over the next 30 days</small></Link>
      <button className="ws-stat" onClick={() => { setEventFilter('travel'); document.getElementById('schedule')?.scrollIntoView({ behavior: 'smooth', block: 'start' }) }}><span>Travel legs<Icon name="plane"/></span><strong>{metric(events.filter(e => e.kind === 'travel').length)}</strong><small>Over the next 30 days</small></button>
      <a href="#attention" className={`ws-stat ${attention.length ? 'ws-stat-attention' : ''}`}><span>Needs attention<Icon name="alert"/></span><strong>{metric(attention.length)}</strong><small>Events with missing details this week</small></a>
    </div>
    <div className="ws-overview-columns">
      <section className="ws-panel" id="schedule"><div className="ws-panel-heading"><div><span className="ws-eyebrow">THE NEXT 30 DAYS</span><h2>Coming up</h2></div><Link className="ws-text-link" href={`/dashboard/calendar${suffix}`}>Calendar <Icon name="arrow" size={16}/></Link></div>
        <div className="ws-segment-row"><div className="ws-segments" aria-label="Schedule filter">{(['all', 'show', 'travel'] as const).map(filter => <button key={filter} aria-pressed={eventFilter === filter} onClick={() => { setEventFilter(filter); setLimit(6) }}>{filter === 'all' ? 'Everything' : filter === 'show' ? 'Events' : 'Travel'}</button>)}</div><span className="ws-muted ws-small-text">{schedule.loading ? 'Loading…' : `${visibleEvents.length} on the horizon`}</span></div>
        {schedule.loading ? <Skeleton/> : schedule.error ? <LoadError message={schedule.error} retry={schedule.reload}/> : visibleEvents.length ? <><EventList events={visibleEvents.slice(0, limit)} adminOrg={adminOrg}/>{visibleEvents.length > limit && <button className="ws-show-more" onClick={() => setLimit(n => n + 10)}>Show more <Icon name="plus" size={15}/></button>}</> : <EmptyState title={artists.length ? 'A clear stretch ahead' : 'Your next show starts here'}><p>{artists.length ? 'No matching events in the next 30 days. Open an artist to plan their next tour.' : 'Add your first artist, then bring their itinerary into Advance.'}</p>{!adminOrg && <Link className="ws-text-link" href={artists.length ? '/dashboard/import' : '/dashboard/artists/new'}>{artists.length ? 'Import an itinerary' : 'Add your first artist'} <Icon name="arrow" size={16}/></Link>}</EmptyState>}
      </section>
      <aside className="ws-side-stack">
        <section className="ws-panel ws-attention" id="attention"><div className="ws-panel-heading"><div><span className="ws-eyebrow">BEFORE YOU GO</span><h2>A little attention</h2></div><span className="ws-counter">{metric(attention.length)}</span></div><p className="ws-panel-description">Missing details for the next 7 days.</p>
          {schedule.loading ? <Skeleton rows={2}/> : schedule.error ? <p className="ws-panel-description">Retry the schedule to check missing details.</p> : attention.length ? <div className="ws-attention-list">{attention.slice(0, 5).map(event => <Link key={event.id} href={tourHref(event.artist.id, event.tour.id, adminOrg)}><span className="ws-attention-dot"/><div><strong>{event.missing.join(' · ')}</strong><span>{event.artist.name} · {formatDay(event.date)}</span><small>{event.title}</small></div><Icon name="chevron" size={14}/></Link>)}{attention.length > 5 && <Link className="ws-text-link" href={`/dashboard/calendar${suffix}`}>View all {attention.length} in calendar →</Link>}</div> : <div className="ws-all-clear"><span><Icon name="check"/></span><strong>{events.length ? 'The essentials are covered' : 'Nothing to flag yet'}</strong><p>{events.length ? 'No missing venue, route or time details in this week’s schedule.' : 'Upcoming events will appear here when details need filling in.'}</p></div>}
        </section>
        {!adminOrg && <Link href="/dashboard/import" className="ws-import-card"><span className="ws-import-art" aria-hidden="true"><span>PDF</span><span>XLS</span><Icon name="upload" size={26}/></span><span className="ws-eyebrow">FROM INBOX TO ITINERARY</span><h2>Bring the details.<br/>We’ll bring the order.</h2><p>Turn your tour documents into shows, travel and stays.</p><strong>Import documents <Icon name="arrow" size={17}/></strong></Link>}
      </aside>
    </div>
    <section id="roster" className="ws-roster-section"><div className="ws-section-heading"><div><span className="ws-eyebrow">THE PEOPLE BEHIND THE SHOW</span><h2>Your roster <span>{artists.length}</span></h2></div><div className="ws-roster-tools"><label className="ws-input-wrap"><Icon name="search" size={17}/><input aria-label="Filter artists" value={rosterQuery} onChange={e => setRosterQuery(e.target.value)} placeholder="Find an artist…"/>{rosterQuery && <button aria-label="Clear artist filter" onClick={() => setRosterQuery('')}><Icon name="close" size={15}/></button>}</label><label className="ws-checkbox"><input type="checkbox" checked={activeOnly} onChange={e => setActiveOnly(e.target.checked)}/>With current tours</label></div></div>
      {filteredArtists.length ? <div className="ws-artist-grid">{filteredArtists.map((artist, i) => {
        const artistTours = activeTours.filter(t => t.artist_id === artist.id), next = events.find(e => e.artist.id === artist.id)
        return <Link key={artist.id} href={tourHref(artist.id, undefined, adminOrg)} className="ws-artist-card"><div className={`ws-artist-art ws-tone-${i % 4}`}><span className="ws-artist-monogram">{artist.name.split(/\s+/).map(w => w[0]).slice(0, 2).join('')}</span><span className="ws-artist-count">{artistTours.length} current {artistTours.length === 1 ? 'tour' : 'tours'}</span><span className="ws-artist-open"><Icon name="arrow" size={18}/></span></div><div className="ws-artist-details"><h3><span className="ws-color-dot" style={{ background: artist.color || '#397661' }}/>{artist.name}</h3><p>{artist.project || 'Ready for what’s next'}</p><div>{schedule.loading ? 'Checking schedule…' : schedule.error ? 'Schedule unavailable' : next ? <><Icon name={next.kind === 'show' ? 'music' : 'plane'} size={14}/><span>{formatDay(next.date)} · {next.title}</span></> : <><Icon name="calendar" size={14}/><span>No events in the next 30 days</span></>}</div></div></Link>
      })}</div> : <div className="ws-panel"><EmptyState title={artists.length ? 'No artists match' : 'Build your roster'} icon="music"><p>{artists.length ? 'Try another name or clear the current-tours filter.' : 'Keep every artist, tour and detail together in one place.'}</p>{artists.length ? <button className="ws-button" onClick={() => { setRosterQuery(''); setActiveOnly(false) }}>Clear filters</button> : !adminOrg && <Link className="ws-button ws-primary" href="/dashboard/artists/new">Add artist</Link>}</EmptyState></div>}
    </section>
  </WorkspaceShell>
}
export default function DashboardPage() { return <WorkspaceProvider><Overview/></WorkspaceProvider> }
