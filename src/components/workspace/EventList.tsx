import Link from 'next/link'
import { AgendaEvent, formatDay, formatTime, tourHref } from '@/lib/workspace'
import Icon from './Icon'
export default function EventList({ events, adminOrg, showDate = true }: { events: AgendaEvent[]; adminOrg?: string; showDate?: boolean }) {
  return <div className="ws-event-list">{events.map(event => <Link className="ws-event" key={event.id} href={tourHref(event.artist.id, event.tour.id, adminOrg)}>
    {showDate && <div className="ws-date-tile"><strong>{formatDay(event.date, { day: '2-digit' })}</strong><span>{formatDay(event.date, { month: 'short' })}</span></div>}
    <span className={`ws-event-icon ${event.kind}`}><Icon name={event.kind === 'travel' ? 'plane' : 'music'}/></span>
    <div className="ws-event-info"><strong>{event.title}</strong><span>{event.artist.name} <span aria-hidden="true">·</span> {event.subtitle}</span></div>
    <div className="ws-event-meta"><span className={`ws-badge ${event.kind}`}>{event.kind === 'show' ? 'Event' : 'Travel'}</span><span>{formatTime(event.time)}</span></div><Icon name="chevron" size={15}/>
  </Link>)}</div>
}
