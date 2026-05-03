import Anthropic from '@anthropic-ai/sdk'
import { NextRequest, NextResponse } from 'next/server'

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

const SYSTEM_PROMPT = `You are a tour management assistant. Extract ALL touring information from this document with high accuracy.

Return ONLY a JSON object with these fields (omit any not found):
{
  "shows": [{
    "date": "YYYY-MM-DD",
    "venue": "",
    "address": "",
    "city": "",
    "country": "",
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
- Dates must be YYYY-MM-DD format
- Times must be HH:MM 24hr format (e.g. "Get In 5pm" = arrival_time "17:00", "Stage Time 9pm" = set_time "21:00")
- "Get In" time = arrival_time on the show
- "Stage Time" = set_time on the show
- Extract the venue full address if provided
- Extract ALL contacts per show (venue phone/email, promoter name/phone)
- For hotels, always capture the reservation/confirmation code
- For deals: capture fee amount and type (e.g. "350€ fixed", "60% door", "vs 70% FFT")
- travel_type must be exactly one of: flight, drive, train, bus, ferry
- Omit arrays entirely if nothing found for that category
- If a tourbook has multiple shows, extract ALL of them`

export async function POST(request: NextRequest) {
  try {
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
