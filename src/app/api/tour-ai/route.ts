import Anthropic from '@anthropic-ai/sdk'
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

const TOOLS: any[] = [
  {
    name: 'add_show',
    description: 'Add a new show to the tour',
    input_schema: {
      type: 'object',
      properties: {
        date: { type: 'string', description: 'YYYY-MM-DD' },
        venue: { type: 'string' },
        city: { type: 'string' },
        country: { type: 'string' },
        type: { type: 'string', description: 'show|rehearsal|travel_day|day_off - default is show' },
        set_time: { type: 'string', description: 'HH:MM 24hr' },
        doors_time: { type: 'string', description: 'HH:MM 24hr' },
        soundcheck_time: { type: 'string', description: 'HH:MM 24hr' },
        notes: { type: 'string' },
        catering: { type: 'string' },
        backline: { type: 'string' },
      },
      required: ['date', 'venue'],
    },
  },
  {
    name: 'update_show',
    description: 'Update an existing show. Use the show id from the tour context.',
    input_schema: {
      type: 'object',
      properties: {
        id: { type: 'string', description: 'Show ID from tour data' },
        date: { type: 'string' },
        venue: { type: 'string' },
        city: { type: 'string' },
        type: { type: 'string', description: 'show|rehearsal|travel_day|day_off' },
        set_time: { type: 'string' },
        doors_time: { type: 'string' },
        soundcheck_time: { type: 'string' },
        notes: { type: 'string' },
        catering: { type: 'string' },
        backline: { type: 'string' },
      },
      required: ['id'],
    },
  },
  {
    name: 'delete_show',
    description: 'Delete a show from the tour',
    input_schema: {
      type: 'object',
      properties: { id: { type: 'string' } },
      required: ['id'],
    },
  },
  {
    name: 'add_travel',
    description: 'Add a travel leg (flight, drive, train etc) to the tour',
    input_schema: {
      type: 'object',
      properties: {
        travel_date: { type: 'string', description: 'YYYY-MM-DD' },
        travel_type: { type: 'string', description: 'Flight, Drive, Train, Bus, Ferry' },
        from_location: { type: 'string' },
        to_location: { type: 'string' },
        carrier: { type: 'string', description: 'Airline and flight number e.g. VA703' },
        departure_time: { type: 'string', description: 'HH:MM 24hr' },
        arrival_time: { type: 'string', description: 'HH:MM 24hr' },
        reference: { type: 'string' },
        travellers: { type: 'string', description: 'Names of people on this leg' },
        notes: { type: 'string' },
      },
      required: ['travel_date', 'from_location', 'to_location'],
    },
  },
  {
    name: 'update_travel',
    description: 'Update an existing travel leg. Use the travel id from the tour context.',
    input_schema: {
      type: 'object',
      properties: {
        id: { type: 'string', description: 'Travel ID from tour data' },
        travel_date: { type: 'string' },
        travel_type: { type: 'string' },
        from_location: { type: 'string' },
        to_location: { type: 'string' },
        carrier: { type: 'string' },
        departure_time: { type: 'string' },
        arrival_time: { type: 'string' },
        reference: { type: 'string' },
        notes: { type: 'string' },
      },
      required: ['id'],
    },
  },
  {
    name: 'delete_travel',
    description: 'Delete a travel leg from the tour',
    input_schema: {
      type: 'object',
      properties: { id: { type: 'string' } },
      required: ['id'],
    },
  },
  {
    name: 'add_accommodation',
    description: 'Add a hotel or accommodation to the tour',
    input_schema: {
      type: 'object',
      properties: {
        check_in: { type: 'string', description: 'YYYY-MM-DD' },
        check_out: { type: 'string', description: 'YYYY-MM-DD' },
        name: { type: 'string' },
        address: { type: 'string' },
        confirmation: { type: 'string' },
        rooming: { type: 'string', description: 'Rooming list text, one room per line e.g. "Room 1: Emma, Ben\\nRoom 2: David"' },
        notes: { type: 'string' },
      },
      required: ['check_in', 'name'],
    },
  },
  {
    name: 'update_accommodation',
    description: 'Update an existing accommodation',
    input_schema: {
      type: 'object',
      properties: {
        id: { type: 'string' },
        check_in: { type: 'string' },
        check_out: { type: 'string' },
        name: { type: 'string' },
        address: { type: 'string' },
        confirmation: { type: 'string' },
        rooming: { type: 'string' },
        notes: { type: 'string' },
      },
      required: ['id'],
    },
  },
  {
    name: 'delete_accommodation',
    description: 'Delete an accommodation from the tour',
    input_schema: {
      type: 'object',
      properties: { id: { type: 'string' } },
      required: ['id'],
    },
  },
  {
    name: 'add_contact',
    description: 'Add a contact to the tour',
    input_schema: {
      type: 'object',
      properties: {
        name: { type: 'string' },
        role: { type: 'string' },
        phone: { type: 'string' },
        email: { type: 'string' },
      },
      required: ['name'],
    },
  },
  {
    name: 'add_press',
    description: 'Add a press commitment (interview, radio, TV, photo shoot, podcast, etc)',
    input_schema: {
      type: 'object',
      properties: {
        date: { type: 'string', description: 'YYYY-MM-DD' },
        time: { type: 'string', description: 'HH:MM 24hr' },
        end_time: { type: 'string', description: 'HH:MM 24hr' },
        type: { type: 'string', description: 'interview|radio|tv|podcast|photo_shoot|press_conference|other' },
        outlet: { type: 'string', description: 'Publication, station or outlet name' },
        contact_name: { type: 'string' },
        contact_phone: { type: 'string' },
        contact_email: { type: 'string' },
        location: { type: 'string' },
        notes: { type: 'string' },
      },
      required: ['date'],
    },
  },
  {
    name: 'update_press',
    description: 'Update an existing press commitment',
    input_schema: {
      type: 'object',
      properties: {
        id: { type: 'string' },
        date: { type: 'string' },
        time: { type: 'string' },
        end_time: { type: 'string' },
        type: { type: 'string' },
        outlet: { type: 'string' },
        contact_name: { type: 'string' },
        contact_phone: { type: 'string' },
        contact_email: { type: 'string' },
        location: { type: 'string' },
        notes: { type: 'string' },
        status: { type: 'string' },
      },
      required: ['id'],
    },
  },
  {
    name: 'delete_press',
    description: 'Delete a press commitment',
    input_schema: {
      type: 'object',
      properties: { id: { type: 'string' } },
      required: ['id'],
    },
  },
  {
    name: 'set_setlist',
    description: 'Set or replace the setlist for a specific show. Songs array is a list of song objects with title, duration (e.g. "3:45"), and optional notes.',
    input_schema: {
      type: 'object',
      properties: {
        show_id: { type: 'string', description: 'The show ID to attach the setlist to' },
        songs: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              title: { type: 'string' },
              duration: { type: 'string' },
              notes: { type: 'string' },
            },
            required: ['title'],
          },
        },
        notes: { type: 'string', description: 'General notes about the setlist' },
      },
      required: ['show_id', 'songs'],
    },
  },
  {
    name: 'add_document',
    description: 'Add a document link to the tour (visa, tax, insurance, contract, or other)',
    input_schema: {
      type: 'object',
      properties: {
        category: { type: 'string', description: 'visa|tax|insurance|contract|other' },
        label: { type: 'string', description: 'Human-readable label e.g. "UK Certificate of Sponsorship"' },
        url: { type: 'string', description: 'Dropbox, Google Drive or any public URL' },
        notes: { type: 'string' },
      },
      required: ['label', 'url'],
    },
  },
  {
    name: 'delete_document',
    description: 'Delete a tour document link',
    input_schema: {
      type: 'object',
      properties: { id: { type: 'string' } },
      required: ['id'],
    },
  },
  {
    name: 'add_show_person',
    description: 'Add a support act, photographer, or other show-specific person. Use for supports (opening acts), photographers, videographers, DJs, MCs.',
    input_schema: {
      type: 'object',
      properties: {
        show_id: { type: 'string', description: 'The show they are attached to' },
        role: { type: 'string', description: 'support|photographer|videographer|dj|mc|other' },
        name: { type: 'string' },
        set_time: { type: 'string', description: 'HH:MM (useful for supports)' },
        duration_minutes: { type: 'number' },
        phone: { type: 'string' },
        email: { type: 'string' },
        instagram: { type: 'string' },
        fee: { type: 'number' },
        currency: { type: 'string' },
        notes: { type: 'string' },
      },
      required: ['show_id', 'name'],
    },
  },
  {
    name: 'update_show_person',
    description: 'Update a support/photographer/etc on a show',
    input_schema: {
      type: 'object',
      properties: {
        id: { type: 'string' },
        role: { type: 'string' },
        name: { type: 'string' },
        set_time: { type: 'string' },
        duration_minutes: { type: 'number' },
        phone: { type: 'string' },
        email: { type: 'string' },
        instagram: { type: 'string' },
        fee: { type: 'number' },
        currency: { type: 'string' },
        notes: { type: 'string' },
      },
      required: ['id'],
    },
  },
  {
    name: 'delete_show_person',
    description: 'Remove a support/photographer/etc from a show',
    input_schema: {
      type: 'object',
      properties: { id: { type: 'string' } },
      required: ['id'],
    },
  },
  {
    name: 'add_guest',
    description: 'Add a guest to the guest list for a specific show. plus_n is the number of additional guests (0 means just the person, 1 means +1).',
    input_schema: {
      type: 'object',
      properties: {
        show_id: { type: 'string' },
        name: { type: 'string' },
        plus_n: { type: 'number' },
        notes: { type: 'string' },
      },
      required: ['show_id', 'name'],
    },
  },
  {
    name: 'update_guest',
    description: 'Update a guest list entry',
    input_schema: {
      type: 'object',
      properties: {
        id: { type: 'string' },
        name: { type: 'string' },
        plus_n: { type: 'number' },
        notes: { type: 'string' },
      },
      required: ['id'],
    },
  },
  {
    name: 'delete_guest',
    description: 'Remove a guest from the guest list',
    input_schema: {
      type: 'object',
      properties: { id: { type: 'string' } },
      required: ['id'],
    },
  },
]

async function executeTool(
  toolName: string,
  toolInput: any,
  tourId: string,
  orgId: string,
  supabase: any
): Promise<{ success: boolean, message: string, data?: any }> {
  try {
    switch (toolName) {
      case 'add_show': {
        const { data, error } = await supabase.from('shows')
          .insert({ ...toolInput, tour_id: tourId, org_id: orgId }).select().single()
        if (error) throw error
        return { success: true, message: `Added show: ${toolInput.venue} on ${toolInput.date}`, data }
      }
      case 'update_show': {
        const { id, ...updates } = toolInput
        const { error } = await supabase.from('shows').update(updates).eq('id', id)
        if (error) throw error
        return { success: true, message: `Updated show` }
      }
      case 'delete_show': {
        const { error } = await supabase.from('shows').update({ deleted_at: new Date().toISOString() }).eq('id', toolInput.id)
        if (error) throw error
        return { success: true, message: `Deleted show` }
      }
      case 'add_travel': {
        const { data, error } = await supabase.from('travel')
          .insert({ ...toolInput, tour_id: tourId, org_id: orgId }).select().single()
        if (error) throw error
        return { success: true, message: `Added travel: ${toolInput.from_location} → ${toolInput.to_location}`, data }
      }
      case 'update_travel': {
        const { id, ...updates } = toolInput
        const { error } = await supabase.from('travel').update(updates).eq('id', id)
        if (error) throw error
        return { success: true, message: `Updated travel leg` }
      }
      case 'delete_travel': {
        const { error } = await supabase.from('travel').update({ deleted_at: new Date().toISOString() }).eq('id', toolInput.id)
        if (error) throw error
        return { success: true, message: `Deleted travel leg` }
      }
      case 'add_accommodation': {
        const { data, error } = await supabase.from('accommodation')
          .insert({ ...toolInput, tour_id: tourId, org_id: orgId }).select().single()
        if (error) throw error
        return { success: true, message: `Added hotel: ${toolInput.name}`, data }
      }
      case 'update_accommodation': {
        const { id, ...updates } = toolInput
        const { error } = await supabase.from('accommodation').update(updates).eq('id', id)
        if (error) throw error
        return { success: true, message: `Updated accommodation` }
      }
      case 'delete_accommodation': {
        const { error } = await supabase.from('accommodation').update({ deleted_at: new Date().toISOString() }).eq('id', toolInput.id)
        if (error) throw error
        return { success: true, message: `Deleted accommodation` }
      }
      case 'add_contact': {
        const { data, error } = await supabase.from('contacts')
          .insert({ ...toolInput, tour_id: tourId, org_id: orgId }).select().single()
        if (error) throw error
        return { success: true, message: `Added contact: ${toolInput.name}`, data }
      }
      case 'add_press': {
        const { data, error } = await supabase.from('press')
          .insert({ ...toolInput, tour_id: tourId, org_id: orgId }).select().single()
        if (error) throw error
        return { success: true, message: `Added press commitment: ${toolInput.outlet || toolInput.type} on ${toolInput.date}`, data }
      }
      case 'update_press': {
        const { id, ...updates } = toolInput
        const { error } = await supabase.from('press').update(updates).eq('id', id)
        if (error) throw error
        return { success: true, message: `Updated press commitment` }
      }
      case 'delete_press': {
        const { error } = await supabase.from('press').update({ deleted_at: new Date().toISOString() }).eq('id', toolInput.id)
        if (error) throw error
        return { success: true, message: `Deleted press commitment` }
      }
      case 'set_setlist': {
        const { show_id, songs, notes } = toolInput
        const existing = await supabase.from('setlists').select('id').eq('show_id', show_id).is('deleted_at', null).single()
        if (existing.data) {
          const { error } = await supabase.from('setlists')
            .update({ songs, notes: notes || null, updated_at: new Date().toISOString() })
            .eq('id', existing.data.id)
          if (error) throw error
          return { success: true, message: `Updated setlist (${songs.length} songs)` }
        } else {
          const { error } = await supabase.from('setlists')
            .insert({ show_id, tour_id: tourId, org_id: orgId, songs, notes: notes || null })
          if (error) throw error
          return { success: true, message: `Added setlist with ${songs.length} songs` }
        }
      }
      case 'add_document': {
        const { data, error } = await supabase.from('tour_documents')
          .insert({ ...toolInput, tour_id: tourId, org_id: orgId }).select().single()
        if (error) throw error
        return { success: true, message: `Added document: ${toolInput.label}`, data }
      }
      case 'delete_document': {
        const { error } = await supabase.from('tour_documents').update({ deleted_at: new Date().toISOString() }).eq('id', toolInput.id)
        if (error) throw error
        return { success: true, message: `Deleted document` }
      }
      case 'add_show_person': {
        const { data, error } = await supabase.from('show_people')
          .insert({ ...toolInput, tour_id: tourId, org_id: orgId }).select().single()
        if (error) throw error
        return { success: true, message: `Added ${toolInput.role || 'person'}: ${toolInput.name}`, data }
      }
      case 'update_show_person': {
        const { id, ...updates } = toolInput
        const { error } = await supabase.from('show_people').update(updates).eq('id', id)
        if (error) throw error
        return { success: true, message: `Updated show person` }
      }
      case 'delete_show_person': {
        const { error } = await supabase.from('show_people').update({ deleted_at: new Date().toISOString() }).eq('id', toolInput.id)
        if (error) throw error
        return { success: true, message: `Removed show person` }
      }
      case 'add_guest': {
        const { data, error } = await supabase.from('guest_list')
          .insert({ ...toolInput, tour_id: tourId, org_id: orgId }).select().single()
        if (error) throw error
        const total = 1 + (toolInput.plus_n || 0)
        return { success: true, message: `Added ${toolInput.name}${toolInput.plus_n ? ` +${toolInput.plus_n}` : ''} to guest list (${total} total)`, data }
      }
      case 'update_guest': {
        const { id, ...updates } = toolInput
        const { error } = await supabase.from('guest_list').update(updates).eq('id', id)
        if (error) throw error
        return { success: true, message: `Updated guest` }
      }
      case 'delete_guest': {
        const { error } = await supabase.from('guest_list').update({ deleted_at: new Date().toISOString() }).eq('id', toolInput.id)
        if (error) throw error
        return { success: true, message: `Removed from guest list` }
      }
      default:
        return { success: false, message: `Unknown tool: ${toolName}` }
    }
  } catch (err: any) {
    return { success: false, message: err.message }
  }
}

export async function POST(request: NextRequest) {
  try {
    const { messages, tourId, attachments, extractIfPossible } = await request.json()

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { auth: { autoRefreshToken: false, persistSession: false } }
    )

    // Load full tour context
    const [tourRes, showsRes, travelRes, accomRes, contactsRes, pressRes, setlistsRes, docsRes, peopleRes, guestsRes] = await Promise.all([
      supabase.from('tours').select('*, artists(name, project)').eq('id', tourId).single(),
      supabase.from('shows').select('*').eq('tour_id', tourId).is('deleted_at', null).order('date'),
      supabase.from('travel').select('*').eq('tour_id', tourId).is('deleted_at', null).order('travel_date'),
      supabase.from('accommodation').select('*').eq('tour_id', tourId).is('deleted_at', null).order('check_in'),
      supabase.from('contacts').select('*').eq('tour_id', tourId).is('deleted_at', null),
      supabase.from('press').select('*').eq('tour_id', tourId).is('deleted_at', null).order('date'),
      supabase.from('setlists').select('*').eq('tour_id', tourId).is('deleted_at', null),
      supabase.from('tour_documents').select('*').eq('tour_id', tourId).is('deleted_at', null),
      supabase.from('show_people').select('*').eq('tour_id', tourId).is('deleted_at', null),
      supabase.from('guest_list').select('*').eq('tour_id', tourId).is('deleted_at', null),
    ])

    const tour = tourRes.data
    const shows = showsRes.data || []
    const travel = travelRes.data || []
    const accommodation = accomRes.data || []
    const contacts = contactsRes.data || []
    const press = pressRes.data || []
    const setlists = setlistsRes.data || []
    const documents = docsRes.data || []
    const showPeople = peopleRes.data || []
    const guestList = guestsRes.data || []
    const orgId = tour?.org_id

    const context = `
TOUR: ${tour?.name} — ${tour?.artists?.name}
STATUS: ${tour?.status || 'routing'}

SHOWS (${shows.length}):
${shows.length ? shows.map(s => `- id:${s.id} | ${s.date} | [${s.type || 'show'}] ${s.venue}, ${s.city || ''}${s.set_time ? ' | Stage '+s.set_time : ''}${s.doors_time ? ' | Doors '+s.doors_time : ''}${s.soundcheck_time ? ' | SC '+s.soundcheck_time : ''}${s.catering ? ' | Catering: '+s.catering : ''}${s.notes ? ' | Notes: '+s.notes : ''}`).join('\n') : 'None'}

TRAVEL (${travel.length}):
${travel.length ? travel.map(t => `- id:${t.id} | ${t.travel_date} | ${t.from_location} → ${t.to_location}${t.carrier ? ' | '+t.carrier : ''}${t.departure_time ? ' | Dep '+t.departure_time : ''}${t.arrival_time ? ' | Arr '+t.arrival_time : ''}${t.reference ? ' | Ref: '+t.reference : ''}${t.travellers ? ' | 👤 '+t.travellers : ''}`).join('\n') : 'None'}

ACCOMMODATION (${accommodation.length}):
${accommodation.length ? accommodation.map(a => `- id:${a.id} | ${a.check_in}${a.check_out ? ' to '+a.check_out : ''} | ${a.name}${a.address ? ', '+a.address : ''}${a.confirmation ? ' | Ref: '+a.confirmation : ''}${a.rooming ? ' | Rooming: '+a.rooming.replace(/\n/g, ' · ') : ''}`).join('\n') : 'None'}

CONTACTS (${contacts.length}):
${contacts.length ? contacts.map(c => `- id:${c.id} | ${c.name}${c.role ? ' ('+c.role+')' : ''}${c.phone ? ' | '+c.phone : ''}${c.email ? ' | '+c.email : ''}`).join('\n') : 'None'}

PRESS (${press.length}):
${press.length ? press.map(p => `- id:${p.id} | ${p.date}${p.time ? ' '+p.time : ''} | ${p.type || 'interview'}${p.outlet ? ' - '+p.outlet : ''}${p.location ? ' | '+p.location : ''}${p.contact_name ? ' | Contact: '+p.contact_name : ''}${p.notes ? ' | '+p.notes : ''}`).join('\n') : 'None'}

SETLISTS (${setlists.length}):
${setlists.length ? setlists.map(sl => {
  const show = shows.find((s: any) => s.id === sl.show_id)
  const showLabel = show ? `${show.date} ${show.venue}` : 'Unknown show'
  const songCount = Array.isArray(sl.songs) ? sl.songs.length : 0
  return `- show:${showLabel} | ${songCount} songs${sl.notes ? ' | '+sl.notes : ''}`
}).join('\n') : 'None'}

DOCUMENTS (${documents.length}):
${documents.length ? documents.map(d => `- id:${d.id} | [${d.category || 'other'}] ${d.label} | ${d.url}${d.notes ? ' | '+d.notes : ''}`).join('\n') : 'None'}

SHOW PEOPLE - supports/photographers/etc (${showPeople.length}):
${showPeople.length ? showPeople.map(p => {
  const show = shows.find((s: any) => s.id === p.show_id)
  const showLabel = show ? `${show.date} ${show.venue}` : 'Unknown show'
  return `- id:${p.id} | show:${showLabel} | [${p.role || 'other'}] ${p.name}${p.set_time ? ' @ '+p.set_time : ''}${p.fee ? ' | '+(p.currency || 'AUD')+' '+p.fee : ''}${p.notes ? ' | '+p.notes : ''}`
}).join('\n') : 'None'}

GUEST LIST (${guestList.length}):
${guestList.length ? guestList.map(g => {
  const show = shows.find((s: any) => s.id === g.show_id)
  const showLabel = show ? `${show.date} ${show.venue}` : 'Unknown show'
  return `- id:${g.id} | show:${showLabel} | ${g.name}${g.plus_n ? ' +'+g.plus_n : ''}${g.notes ? ' | '+g.notes : ''}`
}).join('\n') : 'None'}`.trim()

    const systemPrompt = `You are an agentic tour management assistant. You have full access to this tour's data and can make changes directly.

TOUR DATA (includes IDs for each record — use these when updating or deleting):
${context}

You can:
- Answer questions about the tour
- Make changes: add/update/delete shows, travel, hotels, contacts, press commitments, setlists, documents
- Draft emails and documents
- Spot problems and fix them

When the user asks you to change something, DO IT using the available tools. Don't ask for confirmation unless something is ambiguous or destructive. After acting, confirm what you did concisely.

Examples:
- "Change the VA703 departure to 21:00" → find the VA703 travel record by id, call update_travel
- "Add a hotel in Perth, Westin, check in 22nd March" → call add_accommodation
- "Add a triple j interview on the 15th at 10am" → call add_press with type: radio, outlet: triple j
- "Set the setlist for the Alice Springs show: Song A 3:20, Song B 4:15, Song C 5:02" → find show by venue/date, call set_setlist
- "Add a dropbox link for the UK visa docs: https://..." → call add_document with category: visa
- "Add Hatchie as support for the Bochum show at 8pm, fee $500" → call add_show_person with role: support, name: Hatchie, set_time: 20:00, fee: 500
- "Add Sarah Smith as photographer for the Kaffee Kultus show" → call add_show_person with role: photographer
- "Add Emma's mum +1 to the Saarbrücken guest list" → call add_guest with name: Emma's mum, plus_n: 1
- "Put James from Sony on the London guest list plus 2" → call add_guest with name: James (Sony), plus_n: 2
- "Add a rehearsal day at Bakehouse on May 10 from 2-6pm" → call add_show with type: rehearsal, date: 2026-05-10, venue: Bakehouse, soundcheck_time: 14:00, set_time: 18:00
- "Set the rooming for the Premier Inn: Room 1 Emma and Ben, Room 2 David" → call update_accommodation with rooming: "Room 1: Emma, Ben\nRoom 2: David"
- "Delete the soundcheck on the 15th" → find the show, call update_show with soundcheck_time: ""

Be direct. Act first, explain briefly after. If you're unsure which record to update (e.g. multiple flights on same day), ask which one.`

    // Build message content with attachments if present
    const apiMessages = messages.map((m: any, i: number) => {
      if (i === messages.length - 1 && m.role === 'user' && attachments?.length > 0) {
        const parts: any[] = []
        for (const att of attachments) {
          if (att.type?.startsWith('image/')) {
            parts.push({ type: 'image', source: { type: 'base64', media_type: att.type, data: att.base64 } })
          } else {
            parts.push({ type: 'document', source: { type: 'base64', media_type: 'application/pdf', data: att.base64 } })
          }
        }
        parts.push({ type: 'text', text: m.content })
        return { role: m.role, content: parts }
      }
      return { role: m.role, content: m.content }
    })

    // Agentic loop — keep going until no more tool calls
    let currentMessages = [...apiMessages]
    const actionsPerformed: string[] = []
    let finalText = ''
    let iterations = 0
    const MAX_ITERATIONS = 5

    while (iterations < MAX_ITERATIONS) {
      iterations++

      const response = await anthropic.messages.create({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 1500,
        system: systemPrompt,
        tools: TOOLS,
        messages: currentMessages,
      })

      // Collect text from this response
      const textBlocks = response.content.filter(b => b.type === 'text')
      if (textBlocks.length > 0) {
        finalText = textBlocks.map((b: any) => b.text).join('\n')
      }

      // If no tool calls, we're done
      if (response.stop_reason === 'end_turn' || !response.content.some(b => b.type === 'tool_use')) {
        break
      }

      // Execute tool calls
      const toolUseBlocks = response.content.filter(b => b.type === 'tool_use')
      const toolResults: any[] = []

      for (const toolUse of toolUseBlocks) {
        const { id, name, input } = toolUse as any
        const result = await executeTool(name, input, tourId, orgId, supabase)
        actionsPerformed.push(result.message)
        toolResults.push({
          type: 'tool_result',
          tool_use_id: id,
          content: JSON.stringify(result),
        })
      }

      // Add assistant response + tool results to messages for next iteration
      currentMessages = [
        ...currentMessages,
        { role: 'assistant', content: response.content },
        { role: 'user', content: toolResults },
      ]
    }

    // If actions were performed but no final text, generate a summary
    if (actionsPerformed.length > 0 && !finalText) {
      finalText = actionsPerformed.join('\n')
    }

    return NextResponse.json({
      success: true,
      message: finalText,
      actionsPerformed,
      tourUpdated: actionsPerformed.length > 0,
    })

  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 })
  }
}
