// Helpers for the public, read-only itinerary. Keep incomplete bookings visible.
export function travellerNames(value?: string | null): string[] {
  return (value || '').split(',').map(name => name.trim()).filter(Boolean)
}
export function matchesTraveller(value: string | null | undefined, person: string): boolean {
  return person === 'everyone' || travellerNames(value).some(name => name.toLocaleLowerCase() === person.toLocaleLowerCase())
}
export function groupTravel<T extends { id?: string; travel_date?: string; departure_time?: string; arrival_time?: string; carrier?: string; travel_type?: string; from_location?: string; to_location?: string; travellers?: string; reference?: string; notes?: string }>(items: T[]): T[] {
  const groups = new Map<string, T>()
  items.forEach((item, index) => {
    // Without a departure time, two rows cannot safely be identified as the same journey.
    const key = item.departure_time ? JSON.stringify([item.travel_date, item.departure_time, item.arrival_time, item.carrier, item.travel_type, item.from_location, item.to_location, item.notes]) : `unconfirmed:${index}`
    const existing = groups.get(key)
    if (!existing) { groups.set(key, { ...item }); return }
    existing.travellers = [...new Set([...travellerNames(existing.travellers), ...travellerNames(item.travellers)])].join(', ')
    existing.reference = [...new Set([...(existing.reference || '').split(', '), item.reference].filter(Boolean))].join(', ')
  })
  return [...groups.values()].sort((a, b) => (a.travel_date || '9999').localeCompare(b.travel_date || '9999') || (a.departure_time || '99').localeCompare(b.departure_time || '99'))
}
export function itineraryDates(shows: { date?: string }[], travel: { travel_date?: string }[], press: { date?: string }[], stays: { check_in?: string; check_out?: string }[]): string[] {
  const dates = new Set<string>()
  const add = (value?: string) => { if (value && /^\d{4}-\d{2}-\d{2}$/.test(value)) dates.add(value) }
  shows.forEach(item => add(item.date)); travel.forEach(item => add(item.travel_date)); press.forEach(item => add(item.date))
  stays.forEach(item => { add(item.check_in); add(item.check_out) })
  return [...dates].sort()
}
export function focusDate(dates: string[], today: string): string {
  return dates.find(date => date >= today) || dates[dates.length - 1] || ''
}
export function showStart(show: { type?: string; arrival_time?: string; soundcheck_time?: string; set_time?: string }): string | undefined {
  // Earliest actual commitment comes first, including arrival-only events.
  return [show.arrival_time, show.soundcheck_time, show.set_time].filter(Boolean).sort()[0]
}
