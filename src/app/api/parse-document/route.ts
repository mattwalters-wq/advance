import Anthropic from '@anthropic-ai/sdk'
import { NextRequest, NextResponse } from 'next/server'
import { getAuthUser, unauthorized } from '@/lib/api-auth'

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

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
- Times must be HH:MM 24hr format (e.g. "3:30pm" = "15:30", "9pm" = "21:00")
- Extract the venue full address if provided
- Extract ALL contacts (promoter, venue, sound, lighting, stage manager etc)
- For hotels, always capture reservation/confirmation codes
- For deals: capture fee amount and type
- travel_type must be exactly one of: flight, drive, train, bus, ferry
- Omit arrays entirely if nothing found for that category
- Extract ALL shows if multiple are present
- For runsheets: put support/opening act schedule details in the show notes field`

export async function POST(request: NextRequest) {
  try {
    if (!(await getAuthUser())) return unauthorized()

    const body = await request.json()
    const { text, pdf_base64, filename } = body

    let messageContent: any[]

    if (pdf_base64) {
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

    const message = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 8000,
      messages: [{ role: 'user', content: messageContent }],
    })

    const content = message.content[0]
    if (content.type !== 'text') throw new Error('Unexpected response type')

    let jsonText = content.text.trim()
    jsonText = jsonText.replace(/^```json\n?/, '').replace(/^```\n?/, '').replace(/\n?```$/, '').trim()

    const parsed = JSON.parse(jsonText)
    return NextResponse.json({ success: true, data: parsed })
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 })
  }
}
