import { NextRequest, NextResponse } from 'next/server'
import { getAuthUser, unauthorized } from '@/lib/api-auth'
import { extractStructured } from '@/lib/extract'

const str = { type: 'string' }
const TRAVEL_SCHEMA = {
  type: 'object',
  properties: {
    travel: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          travel_date: str, travel_type: str, from_location: str, to_location: str,
          carrier: str, departure_time: str, arrival_time: str, reference: str, notes: str,
        },
      },
    },
  },
}

const PROMPT = `Extract all flight/travel details from this image or document.

Return ONLY valid JSON in this exact format (array, even for single flights):
[
  {
    "travel_date": "YYYY-MM-DD",
    "travel_type": "Flight",
    "from_location": "CITY NAME",
    "to_location": "CITY NAME",
    "carrier": "AIRLINE CODE+NUMBER e.g. VA703",
    "departure_time": "HH:MM",
    "arrival_time": "HH:MM",
    "reference": "booking reference if visible",
    "notes": "any other relevant info e.g. baggage allowance, seat"
  }
]

Rules:
- Dates must be YYYY-MM-DD format
- Times must be HH:MM 24-hour format
- City names should be full city names not airport codes (e.g. "Melbourne" not "MEL")
- Include ALL legs shown, even connections
- If a field is not visible, omit it (don't include empty strings)
- Return raw JSON array only, no markdown, no explanation`

export async function POST(request: NextRequest) {
  try {
    if (!(await getAuthUser())) return unauthorized()

    const { image_base64, image_type, pdf_base64, text, filename } = await request.json()

    let messageContent: any[]

    if (image_base64) {
      messageContent = [
        {
          type: 'image',
          source: { type: 'base64', media_type: image_type || 'image/jpeg', data: image_base64 }
        },
        { type: 'text', text: PROMPT }
      ]
    } else if (pdf_base64) {
      messageContent = [
        {
          type: 'document',
          source: { type: 'base64', media_type: 'application/pdf', data: pdf_base64 }
        },
        { type: 'text', text: PROMPT }
      ]
    } else {
      messageContent = [{ type: 'text', text: `${PROMPT}\n\nDocument:\n${(text || '').slice(0, 6000)}` }]
    }

    const result = await extractStructured<{ travel?: unknown }>({
      content: messageContent,
      toolName: 'save_travel',
      toolDescription: 'Save the flight/travel details extracted from the image or document.',
      schema: TRAVEL_SCHEMA,
      maxTokens: 2000,
    })

    const travel = result?.travel
    return NextResponse.json({ success: true, travel: Array.isArray(travel) ? travel : [] })
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 })
  }
}
