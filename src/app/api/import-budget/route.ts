import Anthropic from '@anthropic-ai/sdk'
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

export async function POST(request: NextRequest) {
  try {
    const { tourId, pdf_base64, text } = await request.json()

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { auth: { autoRefreshToken: false, persistSession: false } }
    )

    const { data: shows } = await supabase.from('shows').select('*').eq('tour_id', tourId).order('date')
    const showList = (shows || []).map(s => `- id:${s.id} | ${s.date} | ${s.venue}, ${s.city || ''}`).join('\n')

    const prompt = `You are extracting budget data from a tour budget document. Match each show fee/income line to the correct show, and extract all expense items.

Here are the shows in this tour:
${showList}

Extract and return ONLY valid JSON in this exact format:
{
  "settlements": [
    {
      "show_id": "<exact show id from the list above, or null if not a show>",
      "deal_type": "guarantee|door|vs|flat|profit_share",
      "agreed_amount": 1500,
      "currency": "AUD",
      "notes": "any notes about this fee"
    }
  ],
  "expenses": [
    {
      "category": "flights|accommodation|ground_transport|per_diem|gear|marketing|crew|other",
      "description": "what it is",
      "amount": 450,
      "currency": "AUD",
      "show_id": "<show id if specific to one show, otherwise null>"
    }
  ],
  "summary": "one sentence description of what was found"
}

Rules:
- Return raw JSON only, no markdown
- Match show fees to show_ids using date and venue name
- If you can't match a fee to a specific show, set show_id to null
- All amounts as numbers, no currency symbols or commas
- If a row has LOW and HIGH estimates, use the midpoint as the amount and note the range in description
- Skip any rows where the amount is TBC, TBD, or clearly unknown
- Strip ~ prefix from amounts (e.g. ~AUD 12,500 becomes 12500)
- Skip summary/total rows at the bottom of the document
- For confirmed items, use the confirmed amount directly
- Preserve the original currency (AUD, EUR, GBP) per line item - do not convert`

    let messageContent: any[]
    if (pdf_base64) {
      messageContent = [
        { type: 'document', source: { type: 'base64', media_type: 'application/pdf', data: pdf_base64 } },
        { type: 'text', text: prompt },
      ]
    } else {
      messageContent = [{ type: 'text', text: `${prompt}\n\nDocument:\n${(text || '').slice(0, 16000)}` }]
    }

    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 2000,
      messages: [{ role: 'user', content: messageContent }],
    })

    const raw = response.content[0].type === 'text' ? response.content[0].text : ''
    const clean = raw.replace(/^```json\n?/, '').replace(/^```\n?/, '').replace(/\n?```$/, '').trim()
    const parsed = JSON.parse(clean)

    return NextResponse.json({ success: true, data: parsed })
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 })
  }
}
