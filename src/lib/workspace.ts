export interface Artist { id: string; name: string; project?: string | null; color?: string | null }
export interface Tour { id: string; artist_id: string; name: string; start_date?: string | null; end_date?: string | null; status?: string | null }
export interface Show { id: string; tour_id: string; date: string; venue?: string | null; city?: string | null; type?: string | null; set_time?: string | null; deleted_at?: string | null }
export interface Travel { id: string; tour_id: string; travel_date: string; from_location?: string | null; to_location?: string | null; departure_time?: string | null; carrier?: string | null; reference?: string | null; deleted_at?: string | null }
export interface AgendaEvent { id: string; kind: 'show' | 'travel'; date: string; time: string | null; title: string; subtitle: string; artist: Artist; tour: Tour; missing: string[] }

// Date-only itinerary values are local calendar days, never UTC timestamps.
export function dateKey(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
}
export function parseDay(value: string): Date { return new Date(`${value}T12:00:00`) }
export function shiftDay(value: string, days: number): string {
  const date = parseDay(value); date.setDate(date.getDate() + days); return dateKey(date)
}
export function formatDay(value: string, options: Intl.DateTimeFormatOptions = { day: 'numeric', month: 'short' }): string {
  return parseDay(value).toLocaleDateString('en-AU', options)
}
export function formatTime(value?: string | null): string {
  if (!value) return 'Time TBC'
  const [hour, minute] = value.split(':').map(Number)
  if (!Number.isInteger(hour) || hour < 0 || hour > 23 || !Number.isInteger(minute) || minute < 0 || minute > 59) return 'Time TBC'
  return `${hour % 12 || 12}:${String(minute).padStart(2, '0')}${hour >= 12 ? 'pm' : 'am'}`
}
export function calendarDays(month: Date): string[] {
  const start = new Date(month.getFullYear(), month.getMonth(), 1, 12)
  start.setDate(start.getDate() - (start.getDay() + 6) % 7)
  return Array.from({ length: 42 }, (_, i) => shiftDay(dateKey(start), i))
}
export function buildAgenda(artists: Artist[], tours: Tour[], shows: Show[], travel: Travel[]): AgendaEvent[] {
  const artistMap = new Map(artists.map(a => [a.id, a]))
  const tourMap = new Map(tours.map(t => [t.id, t]))
  const events: AgendaEvent[] = []
  for (const show of shows) {
    const tour = tourMap.get(show.tour_id), artist = tour && artistMap.get(tour.artist_id)
    if (!tour || !artist || !show.date || show.deleted_at) continue
    const isShow = !show.type || show.type === 'show'
    events.push({ id: `show:${show.id}`, kind: 'show', date: show.date, time: show.set_time || null,
      title: show.venue || (isShow ? 'Venue to be confirmed' : show.type || 'Event'), subtitle: show.city || tour.name,
      artist, tour, missing: isShow ? [...(!show.venue ? ['Venue missing'] : []), ...(!show.set_time ? ['Stage time missing'] : [])] : [] })
  }
  for (const leg of travel) {
    const tour = tourMap.get(leg.tour_id), artist = tour && artistMap.get(tour.artist_id)
    if (!tour || !artist || !leg.travel_date || leg.deleted_at) continue
    events.push({ id: `travel:${leg.id}`, kind: 'travel', date: leg.travel_date, time: leg.departure_time || null,
      title: `${leg.from_location || 'Origin TBC'} → ${leg.to_location || 'Destination TBC'}`, subtitle: [leg.carrier, leg.reference].filter(Boolean).join(' · ') || tour.name,
      artist, tour, missing: [...(!leg.departure_time ? ['Departure time missing'] : []), ...(!leg.from_location || !leg.to_location ? ['Route incomplete'] : [])] })
  }
  return events.sort((a, b) => a.date.localeCompare(b.date) || (a.time || '99').localeCompare(b.time || '99') || a.title.localeCompare(b.title) || a.id.localeCompare(b.id))
}
export function tourHref(artistId: string, tourId?: string, adminOrg?: string): string {
  const query = new URLSearchParams()
  if (tourId) query.set('tour', tourId)
  if (adminOrg) { query.set('superadmin', '1'); query.set('org_id', adminOrg) }
  return `/dashboard/artists/${encodeURIComponent(artistId)}${query.size ? `?${query}` : ''}`
}
// PostgREST OR clauses need quoted values; escape LIKE metacharacters as literals.
export function searchPattern(query: string): string {
  return `"%${query.trim().replace(/\\/g, '\\\\').replace(/%/g, '\\%').replace(/_/g, '\\_').replace(/"/g, '\\"')}%"`
}
