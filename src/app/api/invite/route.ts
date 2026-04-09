import { createClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'
import { sendInviteEmail } from '@/lib/email'

export async function POST(request: NextRequest) {
  try {
    const { email, name, invitedByName, invitedByEmail } = await request.json()
    if (!email) return NextResponse.json({ success: false, error: 'Email required' }, { status: 400 })

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { auth: { autoRefreshToken: false, persistSession: false } }
    )

    const { error } = await supabase.auth.admin.inviteUserByEmail(email, {
      data: { full_name: name || email.split('@')[0] },
      redirectTo: `${process.env.NEXT_PUBLIC_APP_URL}/onboarding`,
    })

    if (error) return NextResponse.json({ success: false, error: error.message }, { status: 400 })

    // Send branded email via Resend
    await sendInviteEmail({
      toEmail: email,
      toName: name,
      invitedByName,
      invitedByEmail,
      acceptUrl: `${process.env.NEXT_PUBLIC_APP_URL}/onboarding`,
    })

    return NextResponse.json({ success: true })
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 })
  }
}
