import { createClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    const { email, name, role, tourIds, artistId } = await request.json()
    if (!email) return NextResponse.json({ success: false, error: 'Email required' }, { status: 400 })

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { auth: { autoRefreshToken: false, persistSession: false } }
    )

    // Get org_id from artist
    const { data: artist } = await supabase.from('artists').select('org_id').eq('id', artistId).single()
    const org_id = artist?.org_id

    // Send invite (creates user if not exists)
    const { data: inviteData, error: inviteError } = await supabase.auth.admin.inviteUserByEmail(email, {
      data: { full_name: name || email.split('@')[0] },
    })

    if (inviteError && !inviteError.message.includes('already been registered')) {
      return NextResponse.json({ success: false, error: inviteError.message }, { status: 400 })
    }

    // Get or find the user
    let userId = inviteData?.user?.id
    if (!userId) {
      const { data: { users } } = await supabase.auth.admin.listUsers()
      const existing = users.find((u: any) => u.email === email)
      userId = existing?.id
    }

    if (userId) {
      // Ensure profile exists
      const { data: profile } = await supabase.from('profiles').select('id').eq('id', userId).single()
      if (!profile) {
        await supabase.from('profiles').insert({ id: userId, full_name: name || email.split('@')[0], org_id, role: 'member' })
      }

      // Create tour_access records
      for (const tourId of (tourIds || [])) {
        await supabase.from('tour_access').upsert({
          user_id: userId,
          tour_id: tourId,
          role,
          email,
          org_id,
        }, { onConflict: 'user_id,tour_id' })
      }
    }

    return NextResponse.json({ success: true })
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 })
  }
}
