'use client'

type ShowSummary = {
  id: string
  date?: string | null
  type?: string | null
  venue?: string | null
  city?: string | null
  country?: string | null
  address?: string | null
  arrival_time?: string | null
  soundcheck_time?: string | null
  set_time?: string | null
}

export function missingShowDetails(show: ShowSummary) {
  if (['day_off', 'travel_day'].includes(show.type || '')) return []
  const missing: string[] = []
  if (!show.date) missing.push('date')
  if (!show.venue?.trim()) missing.push('venue')
  if (!show.address?.trim()) missing.push('address')
  if (['rehearsal', 'recording', 'press'].includes(show.type || '')) {
    if (!show.soundcheck_time) missing.push('start time')
  } else {
    if (!show.arrival_time) missing.push('arrival')
    if (!show.soundcheck_time) missing.push('soundcheck')
    if (!show.set_time) missing.push('stage time')
  }
  return missing
}

function time(value: string) {
  const [h, m] = value.split(':')
  const hour = Number(h)
  return `${hour % 12 || 12}:${m}${hour >= 12 ? 'pm' : 'am'}`
}

export default function TourShowSummary({ show, venueName, expanded, festival, sheetUrl, onToggle, onEdit }: {
  show: ShowSummary
  venueName: string
  expanded: boolean
  festival: boolean
  sheetUrl: string
  onToggle: () => void
  onEdit: () => void
}) {
  const date = show.date ? new Date(show.date + 'T00:00:00') : null
  const missing = missingShowDetails(show)
  const session = ['rehearsal', 'recording', 'press'].includes(show.type || '')
  const typeLabels: Record<string, string> = { rehearsal: 'Rehearsal', recording: 'Recording', press: 'Press day', day_off: 'Day off', travel_day: 'Travel day' }
  const times = session
    ? [['Start', show.soundcheck_time], ['Finish', show.set_time]]
    : [['Arrive', show.arrival_time], ['Soundcheck', show.soundcheck_time], ['Stage', show.set_time]]

  return (
    <div className="tour-show-summary">
      <button type="button" className="tour-show-toggle" onClick={onToggle}
        aria-expanded={expanded} aria-controls={`show-details-${show.id}`} aria-label={`${expanded ? 'Collapse' : 'Expand'} ${venueName || 'Venue to be confirmed'}`}>
        <span className="tour-show-date">
          {date ? <><span>{date.toLocaleDateString('en-AU', { weekday: 'short' })}</span><strong>{date.getDate()}</strong><span>{date.toLocaleDateString('en-AU', { month: 'short' })}</span></> : <strong style={{ fontSize: 14 }}>TBC</strong>}
        </span>
        <span className="tour-show-main">
          {(festival || typeLabels[show.type || '']) && <span className="tour-show-type">{festival ? 'Festival' : typeLabels[show.type || '']}</span>}
          <span className="tour-show-venue">{venueName || 'Venue to be confirmed'}</span>
          {show.city && <span className="tour-show-city">{show.city}{show.country && show.country !== 'AU' ? `, ${show.country}` : ''}</span>}
          <span className="tour-show-times">{times.filter(([, value]) => value).map(([label, value]) => <span key={label}>{label} <strong>{time(value!)}</strong></span>)}</span>
          {!['day_off', 'travel_day'].includes(show.type || '') && <span className={`tour-show-readiness ${missing.length ? 'needs-details' : ''}`}>{missing.length ? `Missing: ${missing.join(', ')}` : 'Key details ready'}</span>}
        </span>
        <span className="tour-show-chevron" aria-hidden="true">{expanded ? '⌃' : '⌄'}</span>
      </button>
      <div className="tour-show-actions">
        <a href={sheetUrl} target="_blank" rel="noreferrer">{festival ? 'Festival sheet' : 'Day sheet'} ↗</a>
        <button type="button" onClick={onEdit} aria-label={`Edit ${venueName || 'show'}`}>Edit</button>
      </div>
    </div>
  )
}
