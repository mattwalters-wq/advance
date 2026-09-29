import { createClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'
import { sendInviteEmail } from '@/lib/email'
import { getAuthUser, unauthorized } from '@/lib/api-auth'

export async function POST(request: NextRequest) {
  try {
    // invitedByName from the client is ignored — it's read from the inviter's profile
    const { email, name } = await request.json()
    if (!email || typeof email !== 'string') return NextResponse.json({ success: false, error: 'Email required' }, { status: 400 })

    const inviter = await getAuthUser()
    if (!inviter) return unauthorized()
    const invitedByEmail = inviter.email

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { auth: { autoRefreshToken: false, persistSession: false } }
    )

    // Only users who belong to an org (i.e. have a set-up workspace) may invite
    const { data: inviterProfile } = await supabase.from('profiles').select('org_id, full_name').eq('id', inviter.id).single()
    if (!inviterProfile?.org_id) {
      return NextResponse.json({ success: false, error: 'You need to belong to a workspace to invite people' }, { status: 403 })
    }
    const invitedByName = inviterProfile.full_name || invitedByEmail

    const { error } = await supabase.auth.admin.inviteUserByEmail(email, {
      data: { full_name: name || email.split('@')[0] },
      redirectTo: `${process.env.NEXT_PUBLIC_APP_URL}/onboarding`,
    })

    if (error) return NextResponse.json({ success: false, error: error.message }, { status: 400 })

    // Send branded email via Resend
    const { error: emailError } = await sendInviteEmail({
      toEmail: email,
      toName: name,
      invitedByName,
      invitedByEmail,
      acceptUrl: `${process.env.NEXT_PUBLIC_APP_URL}/onboarding`,
    })
    if (emailError) {
      return NextResponse.json({ success: false, error: `Invite created but the email failed to send: ${emailError.message}` }, { status: 502 })
    }

    return NextResponse.json({ success: true })
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 })
  }
}
