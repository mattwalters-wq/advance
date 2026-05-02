import Anthropic from '@anthropic-ai/sdk'
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

// Similarity score between two strings (0-1)
function stringSimilarity(a: string, b: string): number {
  if (!a || !b) return 0
  const al = a.toLowerCase().trim()
  const bl = b.toLowerCase().trim()
  if (al === bl) return 1
  if (al.includes(bl) || bl.includes(al)) return 0.8
  // Check word overlap
  const aWords = new Set(al.split(/\s+/))
  const bWords = new Set(bl.split(/\s+/))
  const intersection = [...aWords].filter(w => bWords.has(w)).length
  const union = new Set([...aWords, ...bWords]).size
  return intersection / union
}

function findMatchingShow(newShow: any, existingShows: any[]): any | null {
  // Match on date first (exact), then venue similarity
  const sameDateShows = existingShows.filter(s => s.date === newShow.date)
  if (sameDateShows.length === 0) return null
  if (sameDateShows.length === 1) return sameDateShows[0]

  // Multiple shows on same date — match by venue
  let best = null
  let bestScore = 0.3 // minimum threshold
  for (const s of sameDateShows) {
    const score = stringSimilarity(newShow.venue || '', s.venue || '')
    if (score > bestScore) { bestScore = score; best = s }
  }
  return best
}

function findMatchingTravel(newTravel: any, existingTravel: any[]): any | null {
  // First try: same date + same carrier/flight number (catches same flight, different booking ref)
  if (newTravel.carrier) {
    const byCarrier = existingTravel.find(t =>
      t.travel_date === newTravel.travel_date &&
      t.carrier && t.carrier.toUpperCase().trim() === newTravel.carrier.toUpperCase().trim()
    )
    if (byCarrier) return byCarrier
  }
  // Second try: same date + same route
  return existingTravel.find(t =>
    t.travel_date === newTravel.travel_date &&
    stringSimilarity(t.from_location || '', newTravel.from_location || '') > 0.5 &&
    stringSimilarity(t.to_location || '', newTravel.to_location || '') > 0.5
  ) || null
}

function findMatchingAccom(newAccom: any, existingAccom: any[]): any | null {
  return existingAccom.find(a =>
    a.check_in === newAccom.check_in &&
    stringSimilarity(a.name || '', newAccom.name || '') > 0.4
  ) || null
}

function findMatchingContact(newContact: any, existingContacts: any[]): any | null {
  return existingContacts.find(c =>
    stringSimilarity(c.name || '', newContact.name || '') > 0.7 ||
    (c.email && c.email === newContact.email) ||
    (c.phone && c.phone === newContact.phone)
  ) || null
}

// Merge new fields into existing, only filling in blanks or updating with better data
function mergeFields(existing: any, incoming: any, fields: string[]): { updates: any, changed: string[] } {
  const updates: any = {}
  const changed: string[] = []
  for (const field of fields) {
    const existingVal = existing[field]
    const newVal = incoming[field]
    if (!newVal) continue
    if (!existingVal) {
      // Fill blank
      updates[field] = newVal
      changed.push(field)
    } else if (newVal !== existingVal && typeof newVal === 'string' && newVal.length > (existingVal?.length || 0)) {
      // New value is more detailed — update
      updates[field] = newVal
      changed.push(field)
    }
  }
  return { updates, changed }
}

export async function POST(request: NextRequest) {
  try {
    const { tourId, text, pdf_base64, filename } = await request.json()

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { auth: { autoRefreshToken: false, persistSession: false } }
    )

    // 1. Load existing tour data
    const [showsRes, travelRes, accomRes, contactsRes] = await Promise.all([
      supabase.from('shows').select('*').eq('tour_id', tourId),
      supabase.from('travel').select('*').eq('tour_id', tourId),
      supabase.from('accommodation').select('*').eq('tour_id', tourId),
      supabase.from('contacts').select('*').eq('tour_id', tourId),
    ])
    const existingShows = showsRes.data || []
    const existingTravel = travelRes.data || []
    const existingAccom = accomRes.data || []
    const existingContacts = contactsRes.data || []

    // 2. Build context string of what already exists
    const existingContext = existingShows.length > 0 ? `
EXISTING SHOWS IN THIS TOUR:
${existingShows.map(s => `- ${s.date}: ${s.venue}, ${s.city || ''}${s.set_time ? ' | Stage '+s.set_time : ''}${s.doors_time ? ' | Doors '+s.doors_time : ''}${s.soundcheck_time ? ' | SC '+s.soundcheck_time : ''}`).join('\n')}

Focus on extracting data that fills in missing fields or adds new shows/travel not already listed.` : ''

    // 3. Extract from document
    const SYSTEM_PROMPT = `You are a tour management assistant. Extract touring information from this document.
${existingContext}

Return ONLY a JSON object with these fields (omit any not found):
{
  "shows": [{ "date": "YYYY-MM-DD", "venue": "", "city": "", "country": "", "stage": "", "set_time": "HH:MM", "doors_time": "HH:MM", "soundcheck_time": "HH:MM", "notes": "", "catering": "", "backline": "" }],
  "travel": [{ "travel_date": "YYYY-MM-DD", "travel_type": "Flight/Drive/Train/Bus/Ferry", "departure_time": "HH:MM", "arrival_time": "HH:MM", "from_location": "City name", "to_location": "City name", "carrier": "AIRLINE + FLIGHT NUMBER e.g. VA703 or QF465 (not booking reference)", "reference": "BOOKING REFERENCE CODE only e.g. ABC123 (not flight number)", "travellers": "passenger names if shown", "notes": "" }],
  "accommodation": [{ "check_in": "YYYY-MM-DD", "check_out": "YYYY-MM-DD", "name": "", "address": "", "confirmation": "", "notes": "" }],
  "contacts": [{ "name": "", "role": "", "phone": "", "email": "" }]
}

Rules:
- Return raw JSON only, no markdown, no backticks
- Dates must be YYYY-MM-DD format
- Times must be HH:MM 24hr format
- All values must be plain strings
- Omit arrays entirely if nothing found for that category`

    let messageContent: any[]
    if (pdf_base64) {
      messageContent = [
        { type: 'document', source: { type: 'base64', media_type: 'application/pdf', data: pdf_base64 } },
        { type: 'text', text: `Extract all touring information from this document${filename ? ` (${filename})` : ''}. ${SYSTEM_PROMPT}` },
      ]
    } else {
      messageContent = [{ type: 'text', text: `${SYSTEM_PROMPT}\n\nDocument${filename ? ` (${filename})` : ''}:\n${(text || '').slice(0, 20000)}` }]
    }

    const message = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 2000,
      messages: [{ role: 'user', content: messageContent }],
    })

    let jsonText = message.content[0].type === 'text' ? message.content[0].text.trim() : ''
    jsonText = jsonText.replace(/^```json\n?/, '').replace(/^```\n?/, '').replace(/\n?```$/, '').trim()
    let extracted: any = {}
    try {
      extracted = JSON.parse(jsonText)
    } catch (parseErr) {
      // Claude didn't return valid JSON — likely an error or empty response
      console.error('JSON parse failed:', jsonText.slice(0, 200))
      return NextResponse.json({ success: false, error: 'Could not extract data from this document. Try a different format or paste the text instead.' }, { status: 422 })
    }

    // 4. Get tour org_id
    const { data: tour } = await supabase.from('tours').select('org_id').eq('id', tourId).single()
    const org_id = tour?.org_id

    // 5. Smart merge
    const result = {
      shows: { added: 0, updated: 0, unchanged: 0, details: [] as any[] },
      travel: { added: 0, updated: 0, unchanged: 0 },
      accommodation: { added: 0, updated: 0, unchanged: 0 },
      contacts: { added: 0, updated: 0, unchanged: 0 },
    }

    // Shows
    for (const newShow of extracted.shows || []) {
      const match = findMatchingShow(newShow, existingShows)
      if (match) {
        const { updates, changed } = mergeFields(match, newShow, ['venue', 'city', 'country', 'stage', 'set_time', 'doors_time', 'soundcheck_time', 'notes', 'catering', 'backline'])
        if (Object.keys(updates).length > 0) {
          // Strip fields that may not exist in schema yet
          const safeUpdates = { ...updates }
          const { error: updateErr } = await supabase.from('shows').update(safeUpdates).eq('id', match.id)
          if (updateErr && updateErr.message?.includes('column')) {
            const { catering: _c, backline: _b, ...baseUpdates } = safeUpdates
            await supabase.from('shows').update(baseUpdates).eq('id', match.id)
          }
          result.shows.updated++
          result.shows.details.push({ action: 'updated', date: newShow.date, venue: newShow.venue, fields: changed })
        } else {
          result.shows.unchanged++
          result.shows.details.push({ action: 'unchanged', date: newShow.date, venue: newShow.venue, fields: [] })
        }
      } else {
        // Strip any fields that may not exist in schema yet
        const { catering, backline, ...safeShow } = newShow
        const insertData: any = { ...safeShow, tour_id: tourId, org_id }
        // Try with extra fields first, fall back without
        const { error: insertErr } = await supabase.from('shows').insert(insertData)
        if (insertErr && insertErr.message?.includes('column')) {
          // Schema doesn't have new columns yet — insert without them
          const { catering: _c, backline: _b, ...baseShow } = insertData
          await supabase.from('shows').insert(baseShow)
        }
        result.shows.added++
        result.shows.details.push({ action: 'added', date: newShow.date, venue: newShow.venue, fields: [] })
      }
    }

    // Travel
    for (const newTravel of extracted.travel || []) {
      const match = findMatchingTravel(newTravel, existingTravel)
      if (match) {
        const { updates } = mergeFields(match, newTravel, ['travel_type', 'departure_time', 'arrival_time', 'carrier', 'reference', 'notes'])
        if (Object.keys(updates).length > 0) {
          await supabase.from('travel').update(updates).eq('id', match.id)
          result.travel.updated++
        } else {
          result.travel.unchanged++
        }
      } else {
        await supabase.from('travel').insert({ ...newTravel, tour_id: tourId, org_id })
        result.travel.added++
      }
    }

    // Accommodation
    for (const newAccom of extracted.accommodation || []) {
      const match = findMatchingAccom(newAccom, existingAccom)
      if (match) {
        const { updates } = mergeFields(match, newAccom, ['check_out', 'address', 'confirmation', 'notes'])
        if (Object.keys(updates).length > 0) {
          await supabase.from('accommodation').update(updates).eq('id', match.id)
          result.accommodation.updated++
        } else {
          result.accommodation.unchanged++
        }
      } else {
        await supabase.from('accommodation').insert({ ...newAccom, tour_id: tourId, org_id })
        result.accommodation.added++
      }
    }

    // Contacts — match by name/email/phone, merge missing fields
    for (const newContact of extracted.contacts || []) {
      const match = findMatchingContact(newContact, existingContacts)
      if (match) {
        const { updates } = mergeFields(match, newContact, ['role', 'phone', 'email'])
        if (Object.keys(updates).length > 0) {
          await supabase.from('contacts').update(updates).eq('id', match.id)
          result.contacts.updated++
        } else {
          result.contacts.unchanged++
        }
      } else {
        await supabase.from('contacts').insert({ ...newContact, tour_id: tourId, org_id })
        result.contacts.added++
      }
    }

    return NextResponse.json({ success: true, result, extracted })
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 })
  }
}
