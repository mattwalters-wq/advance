import { createClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'

const ADMIN_EMAIL = 'mattwaltersconsulting@gmail.com'

export async function GET(request: NextRequest) {
  try {
    // Verify the requesting user is the admin
    const anonClient = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    )

    const authHeader = request.headers.get('authorization')
    if (!authHeader) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const token = authHeader.replace('Bearer ', '')
    const { data: { user }, error } = await anonClient.auth.getUser(token)
    if (error || !user || user.email !== ADMIN_EMAIL) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Use service role to read all data
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { auth: { autoRefreshToken: false, persistSession: false } }
    )

    // Get emails from auth.users (service role only)
    const { data: { users: authUsers } } = await supabase.auth.admin.listUsers({ perPage: 1000 })
    const emailMap: Record<string, string> = {}
    authUsers?.forEach((u: any) => { emailMap[u.id] = u.email })

    const [profilesRes, artistsRes, toursRes, showsRes, travelRes] = await Promise.all([
      supabase.from('profiles').select('*').order('created_at', { ascending: false }),
      supabase.from('artists').select('*, profiles(full_name)').order('created_at', { ascending: false }),
      supabase.from('tours').select('*, artists(name)').order('created_at', { ascending: false }),
      supabase.from('shows').select('id, date, venue, city, tour_id').order('date', { ascending: false }),
      supabase.from('travel').select('id, travel_date, from_location, to_location, tour_id').order('travel_date', { ascending: false }),
    ])

    const usersWithEmail = (profilesRes.data || []).map((p: any) => ({
      ...p,
      email: emailMap[p.id] || null,
    }))

    return NextResponse.json({
      users: usersWithEmail,
      artists: artistsRes.data || [],
      tours: toursRes.data || [],
      shows: showsRes.data || [],
      travel: travelRes.data || [],
    })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
