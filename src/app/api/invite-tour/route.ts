import { createClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'
import { sendInviteEmail } from '@/lib/email'
import { getAuthUser, unauthorized, forbidden } from '@/lib/api-auth'

export async function POST(request: NextRequest) {
  try {
    const { email, name, role, tourIds, artistId, invitedByName } = await request.json()
    if (!email) return NextResponse.json({ success: false, error: 'Email required' }, { status: 400 })

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

    const { data: inviterProfile } = await supabase.from('profiles').select('org_id').eq('id', inviter.id).single()
    if (!inviterProfile?.org_id || inviterProfile.org_id !== org_id) return forbidden()

    // Only grant access to tours that actually belong to this org
    let allowedTourIds: string[] = []
    let tourNames: string[] = []
    if (tourIds?.length) {
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
    await sendInviteEmail({
      toEmail: email,
      toName: name,
      invitedByName,
      invitedByEmail,
      role,
      tourNames,
      artistName,
      acceptUrl: `${process.env.NEXT_PUBLIC_APP_URL}/onboarding`,
    })

    return NextResponse.json({ success: true })
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 })
  }
}
