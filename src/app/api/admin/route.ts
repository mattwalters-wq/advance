import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

const ADMIN_EMAIL = 'mattwaltersconsulting@gmail.com'

async function verifyAdmin(request: NextRequest) {
  const token = request.headers.get('Authorization')?.replace('Bearer ', '')
  if (!token) return null
  const { data: { user } } = await supabase.auth.getUser(token)
  if (!user || user.email !== ADMIN_EMAIL) return null
  return user
}

export async function GET(request: NextRequest) {
  const admin = await verifyAdmin(request)
  if (!admin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(request.url)
  const userId = searchParams.get('user_id')

  // Drilldown for a specific user
  if (userId) {
    const { data: profile } = await supabase.from('profiles').select('org_id').eq('id', userId).single()
    if (!profile) return NextResponse.json({ artists: [], tours: [], shows: [] })
    const orgId = profile.org_id

    const [artists, tours, shows, travel, accommodation] = await Promise.all([
      supabase.from('artists').select('*').eq('org_id', orgId),
      supabase.from('tours').select('*, artists(name)').eq('org_id', orgId).order('created_at', { ascending: false }),
      supabase.from('shows').select('*').eq('org_id', orgId).is('deleted_at', null),
      supabase.from('travel').select('*').eq('org_id', orgId).is('deleted_at', null),
      supabase.from('accommodation').select('*').eq('org_id', orgId).is('deleted_at', null),
    ])

    return NextResponse.json({
      artists: artists.data || [],
      tours: tours.data || [],
      shows: shows.data || [],
      travel: travel.data || [],
      accommodation: accommodation.data || [],
    })
  }

  // Full admin load
  const [authUsers, profiles, artists, tours, shows, travel, accommodation, guests, showPeople, setlists] = await Promise.all([
    supabase.auth.admin.listUsers({ perPage: 200 }),
    supabase.from('profiles').select('*'),
    supabase.from('artists').select('*, profiles(full_name, org_id)').order('created_at', { ascending: false }),
    supabase.from('tours').select('*, artists(name)').order('created_at', { ascending: false }),
    supabase.from('shows').select('*').is('deleted_at', null),
    supabase.from('travel').select('*').is('deleted_at', null),
    supabase.from('accommodation').select('*').is('deleted_at', null),
    supabase.from('guest_list').select('*').is('deleted_at', null),
    supabase.from('show_people').select('*').is('deleted_at', null),
    supabase.from('setlists').select('*').is('deleted_at', null),
  ])

  const profileMap = Object.fromEntries((profiles.data || []).map((p: any) => [p.id, p]))

  // Build user list with correct counts via org_id
  const users = (authUsers.data?.users || []).map((u: any) => {
    const profile = profileMap[u.id]
    const orgId = profile?.org_id
    const userArtists = orgId ? (artists.data || []).filter((a: any) => a.org_id === orgId) : []
    const userTours = orgId ? (tours.data || []).filter((t: any) => t.org_id === orgId) : []
    const userShows = orgId ? (shows.data || []).filter((s: any) => s.org_id === orgId) : []

    return {
      id: u.id,
      email: u.email,
      full_name: profile?.full_name || u.user_metadata?.full_name || '',
      org_id: orgId,
      created_at: u.created_at,
      last_sign_in: u.last_sign_in_at,
      artist_count: userArtists.length,
      tour_count: userTours.length,
      show_count: userShows.length,
    }
  }).sort((a: any, b: any) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())

  return NextResponse.json({
    users,
    artists: artists.data || [],
    tours: tours.data || [],
    shows: shows.data || [],
    travel: travel.data || [],
    accommodation: accommodation.data || [],
    guests: guests.data || [],
    showPeople: showPeople.data || [],
    setlists: setlists.data || [],
  })
}

export async function POST(request: NextRequest) {
  const admin = await verifyAdmin(request)
  if (!admin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { user_id, action } = await request.json()

  if (action === 'reset_password') {
    const { data: userData } = await supabase.auth.admin.getUserById(user_id)
    if (!userData?.user?.email) return NextResponse.json({ error: 'User not found' }, { status: 404 })
    const { error } = await supabase.auth.resetPasswordForEmail(userData.user.email)
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ success: true })
  }

  return NextResponse.json({ error: 'Unknown action' }, { status: 400 })
}
