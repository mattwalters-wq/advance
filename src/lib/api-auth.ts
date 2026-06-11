import { createClient as createSupabaseClient, SupabaseClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'
import { createClient as createCookieClient } from '@/lib/supabase-server'

// Privileged client — bypasses RLS. Only use after the caller has been
// authenticated and authorized for the data being touched.
export function getServiceClient(): SupabaseClient {
  return createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )
}

// Resolve the calling user from the Supabase session cookie.
// Returns null for unauthenticated requests.
export async function getAuthUser() {
  try {
    const supabase = await createCookieClient()
    const { data: { user } } = await supabase.auth.getUser()
    return user
  } catch {
    return null
  }
}

// A user may act on a tour if it belongs to their org, or they have an
// explicit tour_access grant (invited TMs / crew).
export async function userCanAccessTour(service: SupabaseClient, userId: string, tourId: string) {
  if (!tourId || typeof tourId !== 'string') return false

  const [{ data: tour }, { data: profile }] = await Promise.all([
    service.from('tours').select('id, org_id').eq('id', tourId).single(),
    service.from('profiles').select('org_id').eq('id', userId).single(),
  ])
  if (!tour) return false
  if (tour.org_id && profile?.org_id && tour.org_id === profile.org_id) return true

  const { data: access } = await service
    .from('tour_access')
    .select('tour_id')
    .eq('user_id', userId)
    .eq('tour_id', tourId)
    .maybeSingle()
  return !!access
}

export function unauthorized() {
  return NextResponse.json({ success: false, error: 'Not signed in' }, { status: 401 })
}

export function forbidden() {
  return NextResponse.json({ success: false, error: 'You do not have access to this tour' }, { status: 403 })
}
