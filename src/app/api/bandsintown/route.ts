import { NextRequest, NextResponse } from 'next/server'
import { getAuthUser, unauthorized } from '@/lib/api-auth'

export async function GET(request: NextRequest) {
  if (!(await getAuthUser())) return unauthorized()

  const { searchParams } = new URL(request.url)
  const artistName = searchParams.get('artist')
  const appId = searchParams.get('app_id')

  if (!artistName) return NextResponse.json({ error: 'artist name required' }, { status: 400 })
  if (!appId) return NextResponse.json({ error: 'Bandsintown API key required. Get it from Settings → General in your Bandsintown for Artists dashboard.' }, { status: 400 })

  try {
    const encoded = encodeURIComponent(artistName)
    const url = `https://rest.bandsintown.com/artists/${encoded}/events/?app_id=${appId}&date=upcoming`
    const res = await fetch(url, {
      headers: { 'Accept': 'application/json', 'User-Agent': 'Advance/1.0' }
    })

    if (!res.ok) {
      if (res.status === 404) return NextResponse.json({ error: 'Artist not found on Bandsintown' }, { status: 404 })
      if (res.status === 403) return NextResponse.json({ error: 'Invalid API key or access denied. Check your Bandsintown API key.' }, { status: 403 })
      throw new Error(`Bandsintown API error: ${res.status}`)
    }

    const events = await res.json()

    const shows = (Array.isArray(events) ? events : []).map((e: any) => ({
      bandsintown_id: e.id,
      date: e.datetime?.split('T')[0] || null,
      set_time: e.datetime?.split('T')[1]?.slice(0, 5) || null,
      venue: e.venue?.name || null,
      city: e.venue?.city || null,
      country: e.venue?.country || null,
      region: e.venue?.region || null,
      ticket_url: e.offers?.[0]?.url || null,
      bandsintown_url: e.url || null,
      artist: e.artist?.name || artistName,
    }))

    return NextResponse.json({ shows, total: shows.length })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
