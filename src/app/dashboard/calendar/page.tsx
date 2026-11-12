'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import WorkspaceShell, { EmptyState, LoadError, Skeleton } from '@/components/workspace/WorkspaceShell'
import { WorkspaceProvider, useEvents, useWorkspace } from '@/components/workspace/WorkspaceProvider'
import Icon from '@/components/workspace/Icon'
import EventList from '@/components/workspace/EventList'
import { buildAgenda, calendarDays, dateKey, formatDay, formatTime, parseDay, tourHref } from '@/lib/workspace'

function Calendar() {
  const { artists, tours, adminOrg } = useWorkspace()
  const [today] = useState(() => dateKey(new Date()))
  const [month, setMonth] = useState(() => new Date()), [selected, setSelected] = useState(today)
  const [artistId, setArtistId] = useState('all'), [kind, setKind] = useState('all'), [view, setView] = useState<'month' | 'agenda'>('month')
  const days = calendarDays(month), monthKey = dateKey(month).slice(0, 7)
  const schedule = useEvents(days[0], days[41])
  const events = useMemo(() => buildAgenda(artists, tours, schedule.shows, schedule.travel), [artists, tours, schedule.shows, schedule.travel])
  const filtered = events.filter(e => (artistId === 'all' || e.artist.id === artistId) && (kind === 'all' || e.kind === kind))
  const monthEvents = filtered.filter(e => e.date.startsWith(monthKey))
  const byDate = new Map<string, typeof events>()
  for (const event of filtered) byDate.set(event.date, [...(byDate.get(event.date) || []), event])
  function changeMonth(offset: number) {
    const next = new Date(month.getFullYear(), month.getMonth() + offset, 1, 12)
    setMonth(next); setSelected(dateKey(next))
  }
  return <WorkspaceShell>
    <div className="ws-page-heading"><div><span className="ws-eyebrow">THE BIG PICTURE</span><h1>Every move, together.</h1><p>Shows and travel across your entire roster.</p></div>{!adminOrg && <Link href="/dashboard/import" className="ws-button"><Icon name="upload"/>Import documents</Link>}</div>
    <div className="ws-calendar-toolbar"><div className="ws-month-nav"><button className="ws-button ws-icon-button" aria-label="Previous month" onClick={() => changeMonth(-1)}><Icon name="chevron" style={{ transform: 'rotate(180deg)' }}/></button><h2>{month.toLocaleDateString('en-AU', { month: 'long', year: 'numeric' })}</h2><button className="ws-button ws-icon-button" aria-label="Next month" onClick={() => changeMonth(1)}><Icon name="chevron"/></button><button className="ws-button ws-small" onClick={() => { setMonth(parseDay(today)); setSelected(today) }}>Today</button></div><div className="ws-segments" aria-label="Calendar view"><button aria-pressed={view === 'month'} onClick={() => setView('month')}><Icon name="calendar" size={15}/>Month</button><button aria-pressed={view === 'agenda'} onClick={() => setView('agenda')}><Icon name="list" size={15}/>Agenda</button></div></div>
    <div className="ws-calendar-filters"><label>Artist<select value={artistId} onChange={e => setArtistId(e.target.value)}><option value="all">All artists</option>{artists.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}</select></label><label>Type<select value={kind} onChange={e => setKind(e.target.value)}><option value="all">Shows & travel</option><option value="show">Events</option><option value="travel">Travel</option></select></label><span className="ws-muted ws-small-text" aria-live="polite">{schedule.loading ? 'Loading schedule…' : schedule.error ? 'Schedule unavailable' : `${monthEvents.length} ${monthEvents.length === 1 ? 'event' : 'events'} this month`}</span></div>
    {schedule.error ? <LoadError message={schedule.error} retry={schedule.reload}/> : schedule.loading ? <Skeleton rows={6}/> : view === 'month' ? <div className="ws-calendar-layout"><section className="ws-panel ws-calendar-panel" aria-label="Monthly calendar"><div className="ws-calendar-scroll"><div className="ws-weekdays">{['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map(day => <span key={day}>{day}</span>)}</div><div className="ws-calendar-grid">{days.map(day => {
      const dayEvents = byDate.get(day) || []
      return <button key={day} className={`ws-calendar-day ${day.startsWith(monthKey) ? '' : 'outside'} ${day === selected ? 'selected' : ''}`} aria-pressed={day === selected} aria-label={`${formatDay(day, { weekday: 'long', day: 'numeric', month: 'long' })}, ${dayEvents.length} ${dayEvents.length === 1 ? 'event' : 'events'}`} onClick={() => setSelected(day)}><span className={day === today ? 'ws-today' : ''}>{parseDay(day).getDate()}</span><div className="ws-day-events">{dayEvents.slice(0, 3).map(event => <span key={event.id} className={`ws-calendar-chip ${event.kind}`}><span className="ws-color-dot" style={{ background: event.artist.color || '#397661' }}/><span>{event.artist.name} · {event.title}</span></span>)}{dayEvents.length > 3 && <small>+{dayEvents.length - 3} more</small>}</div><span className="ws-mobile-event-count">{dayEvents.length ? `${dayEvents.length} ${dayEvents.length === 1 ? 'event' : 'events'}` : ''}</span></button>
    })}</div></div><div className="ws-calendar-legend"><span><i className="show"/>Event</span><span><i className="travel"/>Travel</span><span>Times are local to each itinerary.</span></div></section><section className="ws-panel ws-day-detail"><div className="ws-panel-heading"><div><span className="ws-eyebrow">{formatDay(selected, { weekday: 'long' })}</span><h2>{formatDay(selected, { day: 'numeric', month: 'long' })}</h2></div><span className="ws-counter">{(byDate.get(selected) || []).length}</span></div>{(byDate.get(selected) || []).length ? <div className="ws-day-cards">{(byDate.get(selected) || []).map(event => <Link key={event.id} href={tourHref(event.artist.id, event.tour.id, adminOrg)}><span className={`ws-badge ${event.kind}`}>{event.kind === 'show' ? 'Event' : 'Travel'}</span><h3>{event.title}</h3><p>{event.artist.name} · {event.subtitle}</p><strong>{formatTime(event.time)} <Icon name="arrow" size={16}/></strong>{event.missing.length > 0 && <small className="ws-missing"><Icon name="alert" size={13}/>{event.missing.join(' · ')}</small>}</Link>)}</div> : <EmptyState title="Room to breathe"><p>No events match your filters for this day.</p></EmptyState>}</section></div> : <section className="ws-panel">{monthEvents.length ? [...new Set(monthEvents.map(e => e.date))].map(day => <div key={day}><h3 className="ws-agenda-date">{formatDay(day, { weekday: 'long', day: 'numeric', month: 'long' })}{day === today && <span className="ws-badge show">Today</span>}</h3><EventList events={byDate.get(day) || []} adminOrg={adminOrg} showDate={false}/></div>) : <EmptyState title="No events this month"><p>Try another month or change your artist and event filters.</p><button className="ws-button" onClick={() => { setArtistId('all'); setKind('all') }}>Clear filters</button></EmptyState>}</section>}
  </WorkspaceShell>
}
export default function CalendarPage() { return <WorkspaceProvider><Calendar/></WorkspaceProvider> }
