import Anthropic from '@anthropic-ai/sdk'
import { NextRequest, NextResponse } from 'next/server'

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
})

export async function POST(request: NextRequest) {
  try {
    const { text } = await request.json()

    const message = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 2000,
      messages: [
        {
          role: 'user',
          content: `You are a tour management assistant. Extract touring information from this document.

Return ONLY a JSON object with these fields (omit any not found):
{
  "shows": [{ "date": "", "venue": "", "city": "", "country": "", "stage": "", "set_time": "", "doors_time": "", "soundcheck_time": "", "notes": "" }],
  "travel": [{ "travel_date": "", "travel_type": "", "departure_time": "", "arrival_time": "", "from_location": "", "to_location": "", "carrier": "", "reference": "", "notes": "" }],
  "accommodation": [{ "check_in": "", "check_out": "", "name": "", "address": "", "confirmation": "", "notes": "" }],
  "contacts": [{ "name": "", "role": "", "phone": "", "email": "" }],
  "personnel": [{ "name": "", "role": "", "phone": "", "email": "", "travel_notes": "" }]
}

Important:
- Return raw JSON only, no markdown, no backticks
- All values must be plain strings with no special characters
- Do not include newlines inside string values
- If nothing found for a category, omit that array entirely

Document:
${text.slice(0, 3000)}`,
        },
      ],
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