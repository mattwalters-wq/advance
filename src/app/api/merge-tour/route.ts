import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { getAuthUser, userCanAccessTour, unauthorized, forbidden } from '@/lib/api-auth'
import { applyImportReview, createReview, readReview, loadImportData, ImportReviewError } from '@/lib/import-review-server'
import { extractStructured } from '@/lib/extract'
import { isSupportedImageType, UNSUPPORTED_IMAGE_ERROR } from '@/lib/attach'

const str = { type: 'string' }
const MERGE_SCHEMA = {
  type: 'object',
  properties: {
    shows: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          type: str, date: str, venue: str, city: str, country: str, stage: str,
          set_time: str, doors_time: str, soundcheck_time: str, notes: str, catering: str, backline: str,
        },
      },
    },
    travel: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          travel_date: str, travel_type: str, departure_time: str, arrival_time: str,
          from_location: str, to_location: str, carrier: str, reference: str, travellers: str, notes: str,
        },
      },
    },
    accommodation: {
      type: 'array',
      items: {
        type: 'object',
        properties: { check_in: str, check_out: str, name: str, address: str, confirmation: str, notes: str },
      },
    },
    contacts: {
      type: 'array',
      items: { type: 'object', properties: { name: str, role: str, phone: str, email: str } },
    },
  },
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { tourId, text, pdf_base64, image_base64, image_type, filename } = body
    if (typeof tourId !== 'string' || !tourId) return NextResponse.json({ success: false, error: 'Choose a tour first.' }, { status: 400 })

    const user = await getAuthUser()
    if (!user) return unauthorized()

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { auth: { autoRefreshToken: false, persistSession: false } }
    )

    if (!(await userCanAccessTour(supabase, user.id, tourId))) return forbidden()

    const secret = process.env.SUPABASE_SERVICE_ROLE_KEY!
    if (body.mode === 'apply' || body.mode === 'refresh') {
      const review = readReview(body.token, user.id, tourId, secret, body.mode === 'refresh' ? 0 : Date.now())
      if (body.mode === 'refresh') {
        const current = await loadImportData(supabase, tourId)
        return NextResponse.json({ success: true, review: createReview(review.extracted, current, user.id, tourId, secret) })
      }
      const { data: tour, error } = await supabase.from('tours').select('org_id, artist_id').eq('id', tourId).single()
      if (error || !tour) throw new ImportReviewError('Could not load the tour. Try again.', 500)
      let orgId = tour.org_id
      if (!orgId && tour.artist_id) {
        const { data: artist, error: artistError } = await supabase.from('artists').select('org_id').eq('id', tour.artist_id).single()
        if (artistError) throw new ImportReviewError('Could not load the tour organisation. Try again.', 500)
        orgId = artist?.org_id
      }
      if (!orgId) throw new ImportReviewError('This tour needs an organisation before it can accept imports.', 409)
      const outcomes = await applyImportReview(supabase, review, body.selections, orgId)
      return NextResponse.json({ success: true, outcomes })
    }
    if (body.mode && body.mode !== 'preview') throw new ImportReviewError('Unknown import action.')

    if (image_base64 && image_type && !isSupportedImageType(image_type)) {
      return NextResponse.json({ success: false, error: UNSUPPORTED_IMAGE_ERROR }, { status: 400 })
    }

    // 1. Load existing tour data
    const existing = await loadImportData(supabase, tourId)
    const existingShows = existing.shows

    // 2. Build context string of what already exists
    const existingContext = existingShows.length > 0 ? `
EXISTING SHOWS IN THIS TOUR:
${existingShows.map(s => `- ${s.date}: ${s.venue}, ${s.city || ''}${s.set_time ? ' | Stage '+s.set_time : ''}${s.doors_time ? ' | Doors '+s.doors_time : ''}${s.soundcheck_time ? ' | SC '+s.soundcheck_time : ''}`).join('\n')}

Extract all touring information in the document, including existing records, so the user can review any differences.` : ''

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
- Dates must be YYYY-MM-DD format. If NO date appears anywhere, set "date" to null — do NOT invent one, but still extract all contacts and schedule.
- This may be a single-day RUNSHEET / DAY SHEET / studio session (e.g. "Like A Version"). Extract it as ONE show: set "type" to "recording"/"rehearsal"/"press"/"show" as appropriate, map the schedule (load-in → not stored, soundcheck → soundcheck_time, doors → doors_time, performance/record/set → set_time) and put the FULL timestamped schedule into notes.
- Extract EVERY named person as a contact with their role — crew and studio staff count (engineer, monitors, director, camera operator, producer, promoter, sound, lighting, stage/tour manager, etc.)
- Times must be HH:MM 24hr format
- All values must be plain strings
- Omit arrays entirely if nothing found for that category`

    let messageContent: any[]
    if (image_base64) {
      messageContent = [
        { type: 'image', source: { type: 'base64', media_type: image_type || 'image/png', data: image_base64 } },
        { type: 'text', text: `Extract all touring information from this image${filename ? ` (${filename})` : ''}. ${SYSTEM_PROMPT}` },
      ]
    } else if (pdf_base64) {
      messageContent = [
        { type: 'document', source: { type: 'base64', media_type: 'application/pdf', data: pdf_base64 } },
        { type: 'text', text: `Extract all touring information from this document${filename ? ` (${filename})` : ''}. ${SYSTEM_PROMPT}` },
      ]
    } else {
      messageContent = [{ type: 'text', text: `${SYSTEM_PROMPT}\n\nDocument${filename ? ` (${filename})` : ''}:\n${(text || '').slice(0, 20000)}` }]
    }

    const extracted: any = await extractStructured({
      content: messageContent,
      toolName: 'review_tour_data',
      toolDescription: 'Extract touring information for a review before any changes are saved.',
      schema: MERGE_SCHEMA,
      maxTokens: 8000,
    })

    if (!extracted) {
      return NextResponse.json({ success: false, error: 'Could not extract data from this document. Try a different format or paste the text instead.' }, { status: 422 })
    }

    return NextResponse.json({ success: true, review: createReview(extracted, existing, user.id, tourId, secret) })
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: err instanceof ImportReviewError ? err.status : 500 })
  }
}
