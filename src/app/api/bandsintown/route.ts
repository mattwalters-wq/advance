import { NextRequest, NextResponse } from 'next/server'

const APP_ID = 'advance-app'

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const artistName = searchParams.get('artist')

  if (!artistName) {
    return NextResponse.json({ error: 'artist name required' }, { status: 400 })
  }

  try {
    const encoded = encodeURIComponent(artistName)
    const url = `https://rest.bandsintown.com/artists/${encoded}/events/?app_id=${APP_ID}&date=upcoming`
    const res = await fetch(url, {
      headers: { 'Accept': 'application/json', 'User-Agent': 'Advance/1.0' }
    })

    if (!res.ok) {
      if (res.status === 404) return NextResponse.json({ error: 'Artist not found on Bandsintown' }, { status: 404 })
      throw new Error(`Bandsintown API error: ${res.status}`)
    }

    const events = await res.json()

    // Normalise into show-shaped objects
    const shows = (Array.isArray(events) ? events : []).map((e: any) => ({
      bandsintown_id: e.id,
      date: e.datetime?.split('T')[0] || null,
      set_time: e.datetime?.split('T')[1]?.slice(0, 5) || null,
      venue: e.venue?.name || null,
      city: e.venue?.city || null,
      country: e.venue?.country || null,
      region: e.venue?.region || null,
      ticket_url: e.offers?.[0]?.url || null,
      description: e.description || null,
      on_sale_datetime: e.on_sale_datetime || null,
      bandsintown_url: e.url || null,
      artist: e.artist?.name || artistName,
    }))

    return NextResponse.json({ shows, total: shows.length })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
