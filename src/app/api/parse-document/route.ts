import Anthropic from '@anthropic-ai/sdk'
import { NextRequest, NextResponse } from 'next/server'

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

const SYSTEM_PROMPT = `You are a tour management assistant. Extract touring information from this document.

Return ONLY a JSON object with these fields (omit any not found):
{
  "shows": [{ "date": "YYYY-MM-DD", "venue": "", "city": "", "country": "", "stage": "", "set_time": "HH:MM", "doors_time": "HH:MM", "soundcheck_time": "HH:MM", "notes": "", "catering": "", "backline": "" }],
  "travel": [{ "travel_date": "YYYY-MM-DD", "travel_type": "", "departure_time": "HH:MM", "arrival_time": "HH:MM", "from_location": "", "to_location": "", "carrier": "", "reference": "", "notes": "" }],
  "accommodation": [{ "check_in": "YYYY-MM-DD", "check_out": "YYYY-MM-DD", "name": "", "address": "", "confirmation": "", "notes": "" }],
  "contacts": [{ "name": "", "role": "", "phone": "", "email": "" }],
  "personnel": [{ "name": "", "role": "", "phone": "", "email": "", "travel_notes": "" }]
}

Rules:
- Return raw JSON only, no markdown, no backticks
- Dates must be YYYY-MM-DD format
- Times must be HH:MM 24hr format
- All values must be plain strings
- Omit arrays entirely if nothing found for that category`

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { text, pdf_base64, filename } = body

    let messageContent: any[]

    if (pdf_base64) {
      // Native PDF reading via Claude's document API
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
      // Plain text (pasted or extracted from Word)
      messageContent = [
        {
          type: 'text',
          text: `${SYSTEM_PROMPT}\n\nDocument${filename ? ` (${filename})` : ''}:\n${(text || '').slice(0, 8000)}`,
        },
      ]
    }

    const message = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 2000,
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
