export const importFields = {
  shows: ['type', 'date', 'venue', 'city', 'country', 'stage', 'set_time', 'doors_time', 'soundcheck_time', 'notes', 'catering', 'backline'],
  travel: ['travel_date', 'travel_type', 'departure_time', 'arrival_time', 'from_location', 'to_location', 'carrier', 'reference', 'travellers', 'notes'],
  accommodation: ['check_in', 'check_out', 'name', 'address', 'confirmation', 'notes'],
  contacts: ['name', 'role', 'phone', 'email'],
} as const
export type ImportCategory = keyof typeof importFields
export const importCategories = Object.keys(importFields) as ImportCategory[]
export type ImportData = Record<ImportCategory, Record<string, any>[]>
export type ImportChange = { field: string; before: string | null; after: string }
export type ImportEntry = {
  id: string; category: ImportCategory; title: string; action: 'add' | 'update' | 'unchanged' | 'skip';
  targetId?: string; recordId: string; incoming: Record<string, string>; before: Record<string, any>;
  changes: ImportChange[]; warning?: string; selected: boolean;
}
export type ImportSelection = { id: string; fields: string[] }
export type ImportOutcome = { id: string; category: ImportCategory; status: 'added' | 'updated' | 'failed' | 'already_applied'; error?: string }
export const fieldLabel = (field: string) => ({ set_time: 'Stage time', travel_date: 'Travel date', reference: 'Booking reference', type: 'Event type' }[field] || field.replace(/_/g, ' ').replace(/^./, c => c.toUpperCase()))
const normal = (value: any) => String(value || '').trim().toLowerCase().replace(/\s+/g, ' ')
export function sameValue(a: any, b: any) {
  if (a == null || a === '') return b == null || b === ''
  const time = (v: any) => typeof v === 'string' && /^\d{2}:\d{2}:00$/.test(v) ? v.slice(0, 5) : v
  return time(a) === time(b)
}
function similar(a: any, b: any) {
  const x = normal(a), y = normal(b)
  return !!x && !!y && (x.includes(y) || y.includes(x))
}
export function matchImport(category: ImportCategory, row: Record<string, any>, existing: Record<string, any>[]) {
  const eq = (a: any, b: any) => !!normal(a) && normal(a) === normal(b)
  const exact = existing.filter(e => {
    if (category === 'shows') return eq(e.date, row.date) && eq(e.venue, row.venue) && (!row.type || normal(e.type || 'show') === normal(row.type))
    if (category === 'travel') return eq(e.travel_date, row.travel_date) && ((eq(e.carrier, row.carrier) && (!row.from_location || eq(e.from_location, row.from_location)) && (!row.to_location || eq(e.to_location, row.to_location))) || (eq(e.from_location, row.from_location) && eq(e.to_location, row.to_location) && eq(e.departure_time?.slice(0, 5), row.departure_time?.slice(0, 5))))
    if (category === 'accommodation') return eq(e.check_in, row.check_in) && eq(e.name, row.name)
    return eq(e.email, row.email) || eq(String(e.phone || '').replace(/\D/g, ''), String(row.phone || '').replace(/\D/g, '')) || eq(e.name, row.name)
  })
  const possible = exact.length ? exact : existing.filter(e => {
    if (category === 'shows') return eq(e.date, row.date) && (!row.type || normal(e.type || 'show') === normal(row.type))
    if (category === 'travel') return eq(e.travel_date, row.travel_date) && (similar(e.carrier, row.carrier) || (similar(e.from_location, row.from_location) && similar(e.to_location, row.to_location)))
    if (category === 'accommodation') return eq(e.check_in, row.check_in) && similar(e.name, row.name)
    return similar(e.name, row.name)
  })
  return { candidates: possible, uncertain: exact.length !== 1 }
}
function clean(category: ImportCategory, raw: any) {
  const row: Record<string, string> = {}
  if (!raw || typeof raw !== 'object') return row
  for (const field of importFields[category]) {
    if (typeof raw[field] !== 'string' || !raw[field].trim()) continue
    const value = raw[field].trim()
    if (['date', 'travel_date', 'check_in', 'check_out'].includes(field)) {
      if (!/^\d{4}-\d{2}-\d{2}$/.test(value) || !Number.isFinite(Date.parse(value)) || new Date(value).toISOString().slice(0, 10) !== value) continue
    }
    if (field.endsWith('_time') && !/^([01]\d|2[0-3]):[0-5]\d(:00)?$/.test(value)) continue
    if (field === 'type' && !['show', 'recording', 'rehearsal', 'press'].includes(value)) continue
    row[field] = field.endsWith('_time') ? value.slice(0, 5) : value
  }
  return row
}
export function buildImportReview(extracted: any, existing: ImportData, uuid: () => string): ImportEntry[] {
  const entries: ImportEntry[] = []
  for (const category of importCategories) {
    const seen = new Set<string>(), targets = new Set<string>()
    for (const raw of Array.isArray(extracted[category]) ? extracted[category] : []) {
      const incoming = clean(category, raw)
      const title = category === 'shows' ? `${incoming.date || 'Date missing'} · ${incoming.venue || 'Venue missing'}` : category === 'travel' ? `${incoming.travel_date || 'Date missing'} · ${incoming.from_location || '?'} → ${incoming.to_location || '?'}${incoming.carrier ? ` · ${incoming.carrier}` : ''}` : category === 'accommodation' ? `${incoming.check_in || 'Date missing'} · ${incoming.name || 'Hotel missing'}` : incoming.name || incoming.email || incoming.phone || 'Unnamed contact'
      const entry: ImportEntry = { id: uuid(), recordId: uuid(), category, title, incoming, before: {}, changes: Object.entries(incoming).map(([field, after]) => ({ field, before: null, after })), action: 'add', selected: true }
      const required = category === 'shows' ? incoming.date && incoming.venue : category === 'travel' ? incoming.travel_date && (incoming.carrier || incoming.from_location || incoming.to_location) : category === 'accommodation' ? incoming.check_in && incoming.name : incoming.name || incoming.email || incoming.phone
      const fingerprint = JSON.stringify(Object.entries(incoming).sort())
      if (!required) { entry.action = 'skip'; entry.warning = 'Missing identifying details. Add this record manually once those details are confirmed.' }
      else if (seen.has(fingerprint)) { entry.action = 'skip'; entry.warning = 'Repeated entry in this document.' }
      else {
        const { candidates, uncertain } = matchImport(category, incoming, existing[category])
        if (candidates.length > 1) { entry.action = 'skip'; entry.warning = 'More than one possible match. Update the correct record manually.' }
        else if (candidates.length === 1) {
          const match = candidates[0]
          entry.targetId = match.id
          entry.before = Object.fromEntries(importFields[category].filter(f => Object.prototype.hasOwnProperty.call(match, f)).map(f => [f, match[f] ?? null]))
          entry.changes = Object.entries(incoming).filter(([f, v]) => !sameValue(match[f], v)).map(([field, after]) => ({ field, before: match[field] ?? null, after }))
          entry.action = entry.changes.length ? 'update' : 'unchanged'
          if (uncertain) entry.warning = `Possible duplicate of ${match.venue || match.name || match.carrier || 'an existing record'}. Check the match before selecting changes.`
          if (targets.has(match.id)) { entry.action = 'skip'; entry.warning = 'Another entry in this document matches this record. Review it separately after applying the first entry.' }
          targets.add(match.id)
        } else {
          // Compare with earlier additions too, so conflicting repeats cannot create duplicates.
          if (matchImport(category, incoming, entries.filter(e => e.category === category && e.action === 'add').map(e => e.incoming)).candidates.length) {
            entry.action = 'skip'; entry.warning = 'Possible repeat of an earlier entry in this document. Review manually.'
          }
          entry.changes = Object.entries(incoming).map(([field, after]) => ({ field, before: null, after }))
        }
      }
      seen.add(fingerprint)
      entry.selected = (entry.action === 'add' || entry.action === 'update') && !entry.warning
      entries.push(entry)
    }
  }
  return entries
}
