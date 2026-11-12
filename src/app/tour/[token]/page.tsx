'use client'

import { useEffect, useRef, useState } from 'react'
import { useParams } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import SheetDetails from '@/components/SheetDetails'
import { SharedPage, SharedHero, SharedState, SharedDock, MapLink, CopyReference, ContactCards } from '@/components/shared/SharedPage'
import { itineraryDates, focusDate, showStart, groupTravel } from '@/lib/shared-itinerary'

const supabase = createClient()
const fmt = (time?: string) => {
  if (!time) return 'Time TBC'
  const [h, m] = time.split(':'); const hour = Number(h)
  return `${hour % 12 || 12}:${m}${hour >= 12 ? 'pm' : 'am'}`
}
const dateLabel = (date: string) => date === 'TBC' ? 'Date to be confirmed' : new Date(`${date}T00:00:00`).toLocaleDateString('en-AU', { weekday: 'long', day: 'numeric', month: 'long' })

export default function PublicTourPage() {
  const params = useParams()
  const [data, setData] = useState<any>(null)
  const [status, setStatus] = useState<'loading' | 'error' | 'missing' | 'ready'>('loading')
  const request = useRef(0)
  async function loadTour() {
    const id = ++request.current
    setStatus('loading')
    try {
      const result = await supabase.rpc('public_tour', { p_token: params.token })
      if (id !== request.current) return
      if (result.error) throw result.error
      if (!result.data?.tour) { setStatus('missing'); return }
      setData(result.data); setStatus('ready')
    } catch { if (id === request.current) setStatus('error') }
  }
  useEffect(() => { loadTour(); return () => { request.current++ } }, [params.token])
  if (status !== 'ready') return <SharedState state={status} retry={loadTour}/>
  const { tour, shows = [], travel = [], accommodation = [], contacts = [], press = [] } = data
  const now = new Date()
  const today = `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}-${String(now.getDate()).padStart(2,'0')}`
  const dates = itineraryDates(shows, travel, press, accommodation)
  const focus = focusDate(dates, today)
  const items: any[] = [
    ...shows.map((s: any) => ({ date: s.date || 'TBC', time: showStart(s), kind: 'show', data: s })),
    ...groupTravel<any>(travel).map((t: any) => ({ date: t.travel_date || 'TBC', time: t.departure_time, kind: 'travel', data: t })),
    ...press.map((p: any) => ({ date: p.date || 'TBC', time: p.time, kind: 'press', data: p })),
  ]
  const unknownStays = accommodation.filter((a: any) => !a.check_in)
  const ordered = [...dates.filter(d => d >= focus), ...dates.filter(d => d < focus), ...(items.some(i => i.date === 'TBC') || unknownStays.length ? ['TBC'] : [])]
  function jumpToDay(date: string) {
    const section = document.getElementById(`crew-${date}`)
    const details = section?.querySelector('details')
    if (details) details.open = true
    section?.scrollIntoView({ block: 'start' })
    section?.querySelector('summary')?.focus({ preventScroll: true })
  }
  return <SharedPage label="Crew itinerary">
    <SharedHero eyebrow="Your crew itinerary" title={tour.artists?.name || tour.name || 'On the road'} subtitle={tour.name}>
      <div className="shared-hero-meta"><span>{shows.length} {shows.length === 1 ? 'event' : 'events'}</span><span>{dates.length} scheduled {dates.length === 1 ? 'day' : 'days'}</span></div>
    </SharedHero>
    <section id="itinerary" aria-label="Tour itinerary">
      <div className="crew-intro"><div><h2>Ready for the road.</h2><p>Times, travel and where to be. All in one place.</p></div></div>
      {ordered.length > 0 && <div className="crew-date-picker no-print"><label htmlFor="crew-day">Jump to a day</label><select id="crew-day" defaultValue={focus || 'TBC'} onChange={e => jumpToDay(e.target.value)}>{ordered.map(date => <option key={date} value={date}>{date === today ? 'Today · ' : ''}{dateLabel(date)}</option>)}</select></div>}
      {!ordered.length && <div className="shared-section shared-empty">Your itinerary is taking shape. Scheduled events and bookings will appear here.</div>}
      {ordered.map(date => {
        const dayItems = items.filter(i => i.date === date).sort((a,b) => (a.time || '99').localeCompare(b.time || '99'))
        const stays = date === 'TBC' ? unknownStays : accommodation.filter((a: any) => a.check_in && a.check_in <= date && (a.check_out ? a.check_out >= date : a.check_in === date))
        return <section key={date} id={`crew-${date}`} className="crew-day">
          {date === dates.find(d => d < focus) && <h2 className="crew-earlier">Earlier dates</h2>}
          <SheetDetails defaultOpen={date === focus || (!focus && date === 'TBC')} title={`${date === today ? 'Today · ' : date === focus && date > today ? 'Up next · ' : ''}${dateLabel(date)}`} hint={[dayItems.find(i => i.kind === 'show')?.data.venue, ...(['show', 'travel', 'press'] as const).map(kind => { const count = dayItems.filter(i => i.kind === kind).length; return count ? `${count} ${kind === 'show' ? count === 1 ? 'event' : 'events' : kind === 'travel' ? count === 1 ? 'journey' : 'journeys' : 'press'}` : '' }), stays.length ? `${stays.length} ${stays.length === 1 ? 'stay' : 'stays'}` : ''].filter(Boolean).join(' · ') || 'No events scheduled'}>
            {dayItems.map((item, index) => {
              const s = item.data
              return <article className="crew-event" key={`${item.kind}-${s.id || index}`}>
                <div className="crew-event-kicker"><span className="shared-eyebrow">{item.kind === 'show' ? (s.type || 'Show').replaceAll('_',' ') : item.kind === 'travel' ? (s.travel_type || 'Travel') : (s.type || 'Press').replaceAll('_',' ')}</span><span className="crew-time">{fmt(item.time)}</span></div>
                {item.kind === 'show' ? <>
                  <h3>{s.venue || (s.type === 'day_off' ? 'A day to recharge' : 'Venue to be confirmed')}</h3>
                  {s.city && <p className="shared-location">{[s.city,s.country && s.country !== 'AU' ? s.country : ''].filter(Boolean).join(', ')}</p>}
                  <div className="crew-event-times">{[[s.arrival_label || 'Arrive',s.arrival_time],['rehearsal','recording','press'].includes(s.type) ? ['Start',s.soundcheck_time] : ['Soundcheck',s.soundcheck_time],['Doors',s.doors_time],['rehearsal','recording','press'].includes(s.type) ? ['Finish',s.set_time] : ['On stage',s.set_time]].filter(([,time]) => time).map(([label,time]) => <div key={label}><span>{label}</span><strong>{fmt(time)}</strong></div>)}</div>
                  {s.set_length && <p className="shared-muted">Set length · {s.set_length}</p>}
                  {s.address && <p className="shared-location">{s.address}</p>}
                  <div className="shared-actions">{s.id && <a className="shared-action primary" href={`/daysheet/${s.id}`}>Open day sheet <span aria-hidden="true">↗</span></a>}{s.address && <MapLink address={s.address}/>}</div>
                </> : item.kind === 'travel' ? <>
                  <h3>{s.from_location || 'Origin TBC'} <span aria-hidden="true">→</span> {s.to_location || 'Destination TBC'}</h3>
                  <div className="crew-event-times"><div><span>Departs</span><strong>{fmt(s.departure_time)}</strong></div><div><span>Arrives</span><strong>{fmt(s.arrival_time)}</strong></div></div>
                  {s.carrier && <p className="shared-muted">{s.carrier}</p>}{s.travellers && <p className="crew-travellers">{s.travellers}</p>}
                  {s.reference && <CopyReference value={s.reference}/>}
                  {s.notes && <SheetDetails title="Travel notes"><p className="crew-notes">{s.notes}</p></SheetDetails>}
                </> : <>
                  <h3>{s.outlet || 'Press commitment'}</h3>{s.end_time && <p className="shared-muted">Until {fmt(s.end_time)}</p>}
                  {s.location && <><p className="shared-location">{s.location}</p><div className="shared-actions"><MapLink address={s.location}/></div></>}
                  {(s.contact_name || s.contact_phone || s.contact_email) && <ContactCards contacts={[{name:s.contact_name || 'Press contact',phone:s.contact_phone,email:s.contact_email}]}/>}
                  {s.notes && <SheetDetails title="Press notes"><p className="crew-notes">{s.notes}</p></SheetDetails>}
                </>}
              </article>
            })}
            {stays.map((a: any, index: number) => <article className="crew-event crew-stay" key={a.id || index}>
              <span className="shared-eyebrow">{a.check_out === date ? 'Checking out' : a.check_in === date ? 'Checking in' : 'Where you’re staying'}</span><h3>{a.name || 'Accommodation'}</h3>
              {a.address && <p className="shared-location">{a.address}</p>}
              <div className="crew-event-times"><div><span>Check in</span><strong>{a.check_in ? dateLabel(a.check_in) : 'Date TBC'}</strong></div><div><span>Check out</span><strong>{a.check_out ? dateLabel(a.check_out) : 'Date TBC'}</strong></div></div>
              {a.travellers && <p className="crew-travellers">{a.travellers}</p>}{a.confirmation && <CopyReference value={a.confirmation}/>}
              {a.address && <div className="shared-actions"><MapLink address={a.address} label="Hotel directions"/></div>}
              {(a.rooming || a.notes) && <SheetDetails title="Rooming & stay details"><p className="crew-notes">{[a.rooming,a.notes].filter(Boolean).join('\n\n')}</p></SheetDetails>}
            </article>)}
          </SheetDetails>
        </section>
      })}
    </section>
    {contacts.length > 0 && <section id="contacts" className="shared-section"><div className="shared-section-heading"><h2>Your people</h2><span>Tour contacts</span></div><ContactCards contacts={contacts}/></section>}
    <SharedDock items={[{href:'#itinerary',label:'Itinerary',icon:'calendar'},...(contacts.length ? [{href:'#contacts',label:'Contacts',icon:'list' as const}] : [])]}/>
  </SharedPage>
}
