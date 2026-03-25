import Anthropic from '@anthropic-ai/sdk'
import { NextRequest, NextResponse } from 'next/server'

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

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

    const message = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 1000,
      messages: [{ role: 'user', content: messageContent }],
    })

    const raw = message.content[0].type === 'text' ? message.content[0].text.trim() : ''
    const clean = raw.replace(/^```json\n?/, '').replace(/^```\n?/, '').replace(/\n?```$/, '').trim()

    if (!clean || clean === 'null' || clean === '[]') {
      return NextResponse.json({ success: true, travel: [] })
    }

    let travel
    try {
      travel = JSON.parse(clean)
    } catch {
      return NextResponse.json({ success: true, travel: [] })
    }

    return NextResponse.json({ success: true, travel: Array.isArray(travel) ? travel : [travel] })
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 })
  }
}
