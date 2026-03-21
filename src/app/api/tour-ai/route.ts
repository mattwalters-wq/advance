import Anthropic from '@anthropic-ai/sdk'
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

export async function POST(request: NextRequest) {
  try {
    const { messages, tourId, attachments, extractIfPossible } = await request.json()

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { auth: { autoRefreshToken: false, persistSession: false } }
    )

    const [tourRes, showsRes, travelRes, accomRes, contactsRes, notesRes, settlementsRes] = await Promise.all([
      supabase.from('tours').select('*, artists(name, project)').eq('id', tourId).single(),
      supabase.from('shows').select('*').eq('tour_id', tourId).order('date'),
      supabase.from('travel').select('*').eq('tour_id', tourId).order('travel_date'),
      supabase.from('accommodation').select('*').eq('tour_id', tourId).order('check_in'),
      supabase.from('contacts').select('*').eq('tour_id', tourId),
      supabase.from('tour_notes').select('*').eq('tour_id', tourId).order('created_at'),
      supabase.from('settlements').select('*').eq('tour_id', tourId),
    ])

    const tour = tourRes.data
    const shows = showsRes.data || []
    const travel = travelRes.data || []
    const accommodation = accomRes.data || []
    const contacts = contactsRes.data || []
    const tourNotes = notesRes.data || []
    const settlements = settlementsRes.data || []

    const context = `
TOUR: ${tour?.name} — ${tour?.artists?.name} (${tour?.artists?.project})
STATUS: ${tour?.status || 'not set'}
DATES: ${tour?.start_date || '?'} to ${tour?.end_date || '?'}

SHOWS (${shows.length}):
${shows.length ? shows.map(s => `- ${s.date}: ${s.venue}, ${s.city || ''}${s.country ? ', '+s.country : ''}${s.set_time ? ' | Stage '+s.set_time : ''}${s.doors_time ? ' | Doors '+s.doors_time : ''}${s.soundcheck_time ? ' | SC '+s.soundcheck_time : ''}${s.notes ? '\n  Notes: '+s.notes : ''}`).join('\n') : 'None'}

TRAVEL (${travel.length}):
${travel.length ? travel.map(t => `- ${t.travel_date}: ${t.from_location} → ${t.to_location}${t.carrier ? ' | '+t.carrier : ''}${t.reference ? ' '+t.reference : ''}${t.departure_time ? ' | Dep '+t.departure_time : ''}${t.arrival_time ? ' | Arr '+t.arrival_time : ''}`).join('\n') : 'None'}

ACCOMMODATION (${accommodation.length}):
${accommodation.length ? accommodation.map(a => `- ${a.check_in}${a.check_out ? ' to '+a.check_out : ''}: ${a.name}${a.address ? ', '+a.address : ''}${a.confirmation ? ' | Ref: '+a.confirmation : ''}`).join('\n') : 'None'}

CONTACTS (${contacts.length}):
${contacts.length ? contacts.map(c => `- ${c.name}${c.role ? ' ('+c.role+')' : ''}${c.phone ? ' | '+c.phone : ''}${c.email ? ' | '+c.email : ''}`).join('\n') : 'None'}

SETTLEMENTS (${settlements.length}):
${settlements.length ? settlements.map(s => {
  const show = shows.find(sh => sh.id === s.show_id)
  return `- ${show?.venue||'?'} (${show?.date||'?'}): ${s.deal_type||'?'} | Agreed $${s.agreed_amount||0} | Paid $${s.paid_amount||0} | ${s.status}`
}).join('\n') : 'None'}

NOTES (${tourNotes.length}):
${tourNotes.length ? tourNotes.map(n => `- ${n.author_name}: ${n.content}`).join('\n') : 'None'}`.trim()

    const systemPrompt = `You are Advance AI — an intelligent assistant embedded inside a tour management platform. You have complete knowledge of this tour and help managers work faster.

TOUR DATA:
${context}

You can:
- Answer any question about this tour instantly
- Draft emails to promoters, venues, agents
- Identify logistics gaps and risks
- Extract and interpret pasted info (emails, confirmations, hotel bookings, itineraries)
- Suggest next actions
- Help with any tour management task

When the user pastes raw information, extract key details clearly and tell them what should be added to the system.

Be direct and concise. These are busy music industry professionals. No unnecessary filler.`

    // Build messages, adding attachments to the last user message if present
    const apiMessages = messages.map((m: any, i: number) => {
      if (i === messages.length - 1 && m.role === 'user' && attachments?.length > 0) {
        const contentParts: any[] = []
        for (const att of attachments) {
          if (att.type.startsWith('image/')) {
            contentParts.push({ type: 'image', source: { type: 'base64', media_type: att.type, data: att.base64 } })
          } else {
            contentParts.push({ type: 'document', source: { type: 'base64', media_type: 'application/pdf', data: att.base64 } })
          }
        }
        contentParts.push({ type: 'text', text: m.content })
        return { role: m.role, content: contentParts }
      }
      return { role: m.role, content: m.content }
    })

    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 1500,
      system: systemPrompt,
      messages: apiMessages,
    })

    const responseText = response.content[0].type === 'text' ? response.content[0].text : ''

    // If files were attached, also try to extract structured data
    let extracted = null
    if (extractIfPossible && attachments?.length > 0) {
      try {
        const extractPrompt = `Based on what you just saw in the attached file(s), extract any tour data in this exact JSON format. Return ONLY valid JSON or null if nothing extractable:
{"shows":[{"date":"YYYY-MM-DD","venue":"","city":"","country":"","set_time":"HH:MM","doors_time":"HH:MM","notes":""}],"travel":[{"travel_date":"YYYY-MM-DD","from_location":"","to_location":"","carrier":"","reference":"","departure_time":"HH:MM","arrival_time":"HH:MM"}],"accommodation":[{"check_in":"YYYY-MM-DD","check_out":"YYYY-MM-DD","name":"","address":"","confirmation":""}],"contacts":[{"name":"","role":"","phone":"","email":""}]}`

        const extractResponse = await anthropic.messages.create({
          model: 'claude-sonnet-4-20250514',
          max_tokens: 1000,
          messages: [
            ...apiMessages,
            { role: 'assistant', content: responseText },
            { role: 'user', content: extractPrompt }
          ],
        })
        const extractText = extractResponse.content[0].type === 'text' ? extractResponse.content[0].text.trim() : ''
        if (extractText && extractText !== 'null') {
          const clean = extractText.replace(/^```json\n?/, '').replace(/^```\n?/, '').replace(/\n?```$/, '').trim()
          extracted = JSON.parse(clean)
          // Only return extracted if there's actually something
          const hasData = Object.values(extracted).some((arr: any) => arr?.length > 0)
          if (!hasData) extracted = null
        }
      } catch (e) {
        // extraction failed silently — not critical
      }
    }

    return NextResponse.json({
      success: true,
      message: responseText,
      extracted,
    })
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 })
  }
}
