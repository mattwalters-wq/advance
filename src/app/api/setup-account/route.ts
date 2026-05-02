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

    // Generate a unique slug from userId prefix + random suffix
    const slug = 'org-' + userId.replace(/-/g, '').slice(0, 12)

    const { data: org, error: orgError } = await supabase
      .from('orgs')
      .insert({ name: orgName, slug })
      .select()
      .single()

    if (orgError) {
      // Slug conflict — try with more randomness
      const slug2 = 'org-' + Math.random().toString(36).slice(2, 14)
      const { data: org2, error: org2Error } = await supabase
        .from('orgs')
        .insert({ name: orgName, slug: slug2 })
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
