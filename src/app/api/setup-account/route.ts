import { createClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    const { userId, email, fullName } = await request.json()
    if (!userId) return NextResponse.json({ success: false, error: 'userId required' }, { status: 400 })

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { auth: { autoRefreshToken: false, persistSession: false } }
    )

    // Check if profile already has an org
    const { data: existing } = await supabase
      .from('profiles')
      .select('org_id')
      .eq('id', userId)
      .single()

    if (existing?.org_id) {
      // Already set up — nothing to do
      return NextResponse.json({ success: true, org_id: existing.org_id })
    }

    // Create a personal org for this user
    const orgName = fullName
      ? `${fullName}'s Workspace`
      : email
        ? `${email.split('@')[0]}'s Workspace`
        : 'My Workspace'

    const { data: org, error: orgError } = await supabase
      .from('orgs')
      .insert({ name: orgName, slug: userId })
      .select()
      .single()

    if (orgError) {
      // orgs table might not exist or slug might conflict — try without slug
      const { data: org2, error: org2Error } = await supabase
        .from('orgs')
        .insert({ name: orgName })
        .select()
        .single()
      if (org2Error) throw org2Error
      var orgId = org2.id
    } else {
      var orgId = org.id
    }

    // Upsert profile with org_id
    await supabase.from('profiles').upsert({
      id: userId,
      full_name: fullName || email?.split('@')[0] || '',
      org_id: orgId,
      role: 'admin',
    }, { onConflict: 'id' })

    return NextResponse.json({ success: true, org_id: orgId })
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 })
  }
}
