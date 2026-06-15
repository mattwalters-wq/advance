import { NextRequest, NextResponse } from 'next/server'
import { getAuthUser, unauthorized } from '@/lib/api-auth'
import { extractStructured } from '@/lib/extract'

const str = { type: 'string' }
const EXTRACT_SCHEMA = {
  type: 'object',
  properties: {
    shows: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          type: str, date: str, venue: str, address: str, city: str, country: str, stage: str,
          arrival_time: str, soundcheck_time: str, doors_time: str, set_time: str,
          set_length: str, curfew: str, notes: str, catering: str, backline: str,
          parking: str, fee: str, deal_type: str, ticket_url: str, pa: str,
        },
      },
    },
    travel: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          travel_date: str, travel_type: str, departure_time: str, arrival_time: str,
          from_location: str, to_location: str, carrier: str, reference: str, notes: str,
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

const SYSTEM_PROMPT = `You are a tour management assistant. Extract ALL touring information from this document with high accuracy.

This document may be a tourbook, itinerary, runsheet, day sheet, or any other touring document. Adapt your extraction to whatever format is present.

For runsheets/day sheets with a time-based schedule, map times as follows:
- Load in / Band load in = arrival_time
- Soundcheck = soundcheck_time  
- Doors open / Doors = doors_time
- First act / Support / Opening act stage time = notes (not set_time)
- Headline / Main act stage time = set_time
- Finish / Curfew = curfew

Return ONLY a JSON object with these fields (omit any not found):
{
  "shows": [{
    "date": "YYYY-MM-DD",
    "venue": "",
    "address": "",
    "city": "",
    "country": "AU",
    "stage": "",
    "arrival_time": "HH:MM",
    "soundcheck_time": "HH:MM",
    "doors_time": "HH:MM",
    "set_time": "HH:MM",
    "set_length": "",
    "curfew": "",
    "notes": "",
    "catering": "",
    "backline": "",
    "parking": "",
    "fee": "",
    "deal_type": "",
    "ticket_url": "",
    "pa": ""
  }],
  "travel": [{
    "travel_date": "YYYY-MM-DD",
    "travel_type": "flight|drive|train|bus|ferry",
    "departure_time": "HH:MM",
    "arrival_time": "HH:MM",
    "from_location": "",
    "to_location": "",
    "carrier": "",
    "reference": "",
    "notes": ""
  }],
  "accommodation": [{
    "check_in": "YYYY-MM-DD",
    "check_out": "YYYY-MM-DD",
    "name": "",
    "address": "",
    "confirmation": "",
    "notes": ""
  }],
  "contacts": [{ "name": "", "role": "", "phone": "", "email": "" }]
}

Rules:
- Return raw JSON only, no markdown, no backticks
- Dates must be YYYY-MM-DD format. If only day/month given, infer the year from context
- If NO date appears anywhere in the document, set "date" to null — do NOT invent one. Never drop the show or the contacts just because the date or venue is missing.
- This may be a single-day RUNSHEET / DAY SHEET / studio session (e.g. "Like A Version") with no city or venue. Still extract it as ONE show: set "type" to "recording" for studio/Like A Version sessions, "rehearsal" for rehearsals, "press" for press/interview days, otherwise "show". If there's no venue but the sheet has a session/show name or branding, use that as the venue.
- Map the schedule: first arrival/load-in → arrival_time, soundcheck → soundcheck_time, doors → doors_time, the performance/record/set → set_time. Put the FULL list of timestamped schedule lines into notes so nothing is lost.
- Extract EVERY named person as a contact with their exact role as labelled — crew and studio staff count too (engineer, monitors, director, camera operator, producer, promoter, venue, sound, lighting, stage manager, tour manager, etc.)
- Times must be HH:MM 24hr format (e.g. "3:30pm" = "15:30", "9pm" = "21:00", "1130" = "11:30")
- Extract the venue full address if provided
- For hotels, always capture reservation/confirmation codes
- For deals: capture fee amount and type
- travel_type must be exactly one of: flight, drive, train, bus, ferry
- Omit arrays entirely if nothing found for that category
- Extract ALL shows if multiple are present`

export async function POST(request: NextRequest) {
  try {
    if (!(await getAuthUser())) return unauthorized()

    const body = await request.json()
    const { text, pdf_base64, image_base64, image_type, filename } = body

    let messageContent: any[]

    if (image_base64) {
      messageContent = [
        {
          type: 'image',
          source: {
            type: 'base64',
            media_type: image_type || 'image/png',
            data: image_base64,
          },
        },
        {
          type: 'text',
          text: `Extract all touring information from this image${filename ? ` (${filename})` : ''}. ${SYSTEM_PROMPT}`,
        },
      ]
    } else if (pdf_base64) {
      messageContent = [
        {
          type: 'document',
          source: {
            type: 'base64',
            media_type: 'application/pdf',
            data: pdf_base64,
          },
        },
        {
          type: 'text',
          text: `Extract all touring information from this document${filename ? ` (${filename})` : ''}. ${SYSTEM_PROMPT}`,
        },
      ]
    } else {
      messageContent = [
        {
          type: 'text',
          text: `${SYSTEM_PROMPT}\n\nDocument${filename ? ` (${filename})` : ''}:\n${(text || '').slice(0, 12000)}`,
        },
      ]
    }

    const parsed = await extractStructured({
      content: messageContent,
      toolName: 'save_tour_data',
      toolDescription: 'Save the touring information extracted from the document.',
      schema: EXTRACT_SCHEMA,
      maxTokens: 8000,
    })

    if (!parsed) {
      return NextResponse.json({ success: false, error: 'Could not extract data from this document. Try a different format or paste the text instead.' }, { status: 422 })
    }

    return NextResponse.json({ success: true, data: parsed })
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 })
  }
}
