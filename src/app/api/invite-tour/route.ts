import { createClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'
import { sendInviteEmail } from '@/lib/email'
import { getAuthUser, unauthorized, forbidden } from '@/lib/api-auth'

// Must match TOUR_ROLES in dashboard/artists/[id]/settings. Unknown values fall back to 'Other'.
const TOUR_ROLES = [
  'Tour Manager', 'Production Manager', 'FOH Engineer', 'Monitor Engineer',
  'Lighting Designer', 'Stage Manager', 'Tour Accountant', 'Merchandise',
  'Backline Tech', 'Drum Tech', 'Guitar Tech', 'Bass Tech', 'Keys Tech',
  'Wardrobe', 'Catering', 'Security', 'Driver', 'Press/Promo',
  'Band Member', 'Agent', 'Publicist', 'Label Rep', 'Other',
]

// listUsers is paginated — walk every page so this works for any number of users.
async function findUserIdByEmail(supabase: any, email: string): Promise<string | undefined> {
  const target = email.trim().toLowerCase()
  const perPage = 1000
  for (let page = 1; ; page++) {
    const { data, error } = await supabase.auth.admin.listUsers({ page, perPage })
    if (error) throw error
    const users = data?.users || []
    const found = users.find((u: any) => u.email?.toLowerCase() === target)
    if (found) return found.id
    if (users.length < perPage) return undefined
  }
}

export async function POST(request: NextRequest) {
  try {
    // invitedByName from the client is ignored — it's read from the inviter's profile
    const { email, name, role: requestedRole, tourIds, artistId } = await request.json()
    if (!email || typeof email !== 'string') return NextResponse.json({ success: false, error: 'Email required' }, { status: 400 })
    const role = TOUR_ROLES.includes(requestedRole) ? requestedRole : 'Other'

    const inviter = await getAuthUser()
    if (!inviter) return unauthorized()
    const invitedByEmail = inviter.email

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { auth: { autoRefreshToken: false, persistSession: false } }
    )

    // Get org_id and artist name, and verify the inviter belongs to that org
    const { data: artist } = await supabase.from('artists').select('org_id, name').eq('id', artistId).single()
    if (!artist) return NextResponse.json({ success: false, error: 'Artist not found' }, { status: 404 })
    const org_id = artist.org_id
    const artistName = artist.name

    const { data: inviterProfile } = await supabase.from('profiles').select('org_id, full_name').eq('id', inviter.id).single()
    if (!inviterProfile?.org_id || inviterProfile.org_id !== org_id) return forbidden()
    const invitedByName = inviterProfile.full_name || invitedByEmail

    // Only grant access to tours that actually belong to this org
    let allowedTourIds: string[] = []
    let tourNames: string[] = []
    if (Array.isArray(tourIds) && tourIds.length) {
      const { data: tours } = await supabase.from('tours').select('id, name').in('id', tourIds).eq('org_id', org_id)
      allowedTourIds = (tours || []).map((t: any) => t.id)
      tourNames = (tours || []).map((t: any) => t.name).filter(Boolean)
    }

    // Send invite (creates user if not exists)
    const { data: inviteData, error: inviteError } = await supabase.auth.admin.inviteUserByEmail(email, {
      data: { full_name: name || email.split('@')[0] },
      redirectTo: `${process.env.NEXT_PUBLIC_APP_URL}/onboarding`,
    })

    if (inviteError && !inviteError.message.includes('already been registered')) {
      return NextResponse.json({ success: false, error: inviteError.message }, { status: 400 })
    }

    // Get or find the user
    let userId = inviteData?.user?.id
    if (!userId) {
      userId = await findUserIdByEmail(supabase, email)
    }

    if (userId) {
      // Ensure profile exists
      const { data: profile } = await supabase.from('profiles').select('id').eq('id', userId).single()
      if (!profile) {
        await supabase.from('profiles').insert({ id: userId, full_name: name || email.split('@')[0], org_id, role: 'member' })
      }

      // Create tour_access records
      for (const tourId of allowedTourIds) {
        await supabase.from('tour_access').upsert({
          user_id: userId,
          tour_id: tourId,
          role,
          email,
          org_id,
        }, { onConflict: 'user_id,tour_id' })
      }
    }

    // Send branded email via Resend
    const { error: emailError } = await sendInviteEmail({
      toEmail: email,
      toName: name,
      invitedByName,
      invitedByEmail,
      role,
      tourNames,
      artistName,
      acceptUrl: `${process.env.NEXT_PUBLIC_APP_URL}/onboarding`,
    })
    if (emailError) {
      return NextResponse.json({ success: false, error: `Access granted but the invite email failed to send: ${emailError.message}` }, { status: 502 })
    }

    return NextResponse.json({ success: true })
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 })
  }
}
