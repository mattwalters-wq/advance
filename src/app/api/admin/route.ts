import { createClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'

const ADMIN_EMAIL = 'mattwaltersconsulting@gmail.com'

function getServiceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )
}

async function verifyAdmin(request: NextRequest) {
  const anonClient = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
  const authHeader = request.headers.get('authorization')
  if (!authHeader) return null
  const token = authHeader.replace('Bearer ', '')
  const { data: { user }, error } = await anonClient.auth.getUser(token)
  if (error || !user || user.email !== ADMIN_EMAIL) return null
  return user
}

export async function GET(request: NextRequest) {
  try {
    const admin = await verifyAdmin(request)
    if (!admin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const supabase = getServiceClient()
    const url = new URL(request.url)
    const drilldown = url.searchParams.get('user_id')

    if (drilldown) {
      const [artistsRes, profileRes] = await Promise.all([
        supabase.from('artists').select('*').eq('org_id', drilldown).order('created_at', { ascending: false }),
        supabase.from('profiles').select('*').eq('id', drilldown).single(),
      ])
      const artists = artistsRes.data || []
      const artistIds = artists.map((a: any) => a.id)
      const tourIds: string[] = []

      const toursRes = await supabase.from('tours').select('*, artists(name)').eq('org_id', drilldown).order('created_at', { ascending: false })
      const tours = toursRes.data || []
      tours.forEach((t: any) => tourIds.push(t.id))

      const [showsRes, travelRes, accomRes, guestsRes, peopleRes] = await Promise.all([
        supabase.from('shows').select('id, date, venue, city, tour_id, type').eq('org_id', drilldown).order('date', { ascending: false }),
        supabase.from('travel').select('id, travel_date, from_location, to_location, tour_id').eq('org_id', drilldown),
        supabase.from('accommodation').select('id, name, check_in, tour_id').eq('org_id', drilldown),
        supabase.from('guest_list').select('id, name, plus_n, tour_id').eq('org_id', drilldown),
        supabase.from('show_people').select('id, name, role, tour_id').eq('org_id', drilldown),
      ])

      return NextResponse.json({
        profile: profileRes.data,
        artists,
        tours,
        shows: showsRes.data || [],
        travel: travelRes.data || [],
        accommodation: accomRes.data || [],
        guests: guestsRes.data || [],
        showPeople: peopleRes.data || [],
      })
    }

    const { data: { users: authUsers } } = await supabase.auth.admin.listUsers({ perPage: 1000 })
    const emailMap: Record<string, string> = {}
    const lastSignInMap: Record<string, string> = {}
    authUsers?.forEach((u: any) => {
      emailMap[u.id] = u.email
      lastSignInMap[u.id] = u.last_sign_in_at
    })

    const [profilesRes, artistsRes, toursRes, showsRes, travelRes, accomRes, guestsRes, peopleRes, setlistsRes] = await Promise.all([
      supabase.from('profiles').select('*').order('created_at', { ascending: false }),
      supabase.from('artists').select('*, profiles(full_name)').order('created_at', { ascending: false }),
      supabase.from('tours').select('*, artists(name)').order('created_at', { ascending: false }),
      supabase.from('shows').select('id, date, venue, city, tour_id, org_id').order('date', { ascending: false }),
      supabase.from('travel').select('id, travel_date, from_location, to_location, tour_id, org_id').order('travel_date', { ascending: false }),
      supabase.from('accommodation').select('id, name, check_in, tour_id, org_id'),
      supabase.from('guest_list').select('id, name, plus_n, tour_id, org_id'),
      supabase.from('show_people').select('id, name, role, tour_id, org_id'),
      supabase.from('setlists').select('id, tour_id, org_id, songs'),
    ])

    const usersWithMeta = (profilesRes.data || []).map((p: any) => ({
      ...p,
      email: emailMap[p.id] || null,
      last_sign_in: lastSignInMap[p.id] || null,
      artist_count: (artistsRes.data || []).filter((a: any) => a.org_id === p.id).length,
      tour_count: (toursRes.data || []).filter((t: any) => t.org_id === p.id).length,
      show_count: (showsRes.data || []).filter((s: any) => s.org_id === p.id).length,
    }))

    return NextResponse.json({
      users: usersWithMeta,
      artists: artistsRes.data || [],
      tours: toursRes.data || [],
      shows: showsRes.data || [],
      travel: travelRes.data || [],
      accommodation: accomRes.data || [],
      guests: guestsRes.data || [],
      showPeople: peopleRes.data || [],
      setlists: setlistsRes.data || [],
    })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const admin = await verifyAdmin(request)
    if (!admin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { user_id, action } = await request.json()
    if (!user_id) return NextResponse.json({ error: 'user_id required' }, { status: 400 })

    const supabase = getServiceClient()

    if (action === 'impersonate') {
      const { data: authUser } = await supabase.auth.admin.getUserById(user_id)
      if (!authUser?.user?.email) return NextResponse.json({ error: 'User not found' }, { status: 404 })
      const { data, error } = await supabase.auth.admin.generateLink({
        type: 'magiclink',
        email: authUser.user.email,
        options: { redirectTo: `${process.env.NEXT_PUBLIC_APP_URL}/auth/callback?next=/dashboard` }
      })
      if (error) throw error
      return NextResponse.json({ link: data.properties?.action_link, email: authUser.user.email })
    }

    if (action === 'reset_password') {
      const { data: authUser } = await supabase.auth.admin.getUserById(user_id)
      if (!authUser?.user?.email) return NextResponse.json({ error: 'User not found' }, { status: 404 })
      const { error } = await supabase.auth.resetPasswordForEmail(authUser.user.email)
      if (error) throw error
      return NextResponse.json({ success: true })
    }

    return NextResponse.json({ error: 'Unknown action' }, { status: 400 })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
