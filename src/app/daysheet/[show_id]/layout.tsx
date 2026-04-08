import { createClient } from '@supabase/supabase-js'

export async function generateMetadata({ params }: { params: { show_id: string } }) {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )

  const { data: show } = await supabase
    .from('shows')
    .select('*')
    .eq('id', params.show_id)
    .single()

  const { data: tour } = show
    ? await supabase
        .from('tours')
        .select('*, artists(name)')
        .eq('id', show.tour_id)
        .single()
    : { data: null }

  const artist = (tour as any)?.artists

  if (!show || !artist) {
    return {
      title: 'Day Sheet - Advance',
      description: 'Tour day sheet',
    }
  }

  function fmt(t: string) {
    if (!t) return ''
    const [h, m] = t.split(':')
    const hour = parseInt(h)
    return `${hour % 12 || 12}:${m}${hour >= 12 ? 'pm' : 'am'}`
  }

  function fmtDate(d: string) {
    if (!d) return ''
    return new Date(d + 'T00:00:00').toLocaleDateString('en-AU', {
      weekday: 'short',
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    })
  }

  // Clean venue name - strip access/directions info
  const venueName = show.venue
    ? show.venue.length > 60
      ? show.venue.split(/[-–](?:\s*Access|\s*Park|\s*Contact|\s*via|\s*Turn|\s*From)/i)[0].trim()
      : show.venue
    : null

  // Build description from actual show data
  const parts: string[] = []

  if (venueName) parts.push(venueName)
  if (show.city) parts.push(show.city)
  if (show.date) parts.push(fmtDate(show.date))

  const times: string[] = []
  if (show.soundcheck_time) times.push(`Soundcheck ${fmt(show.soundcheck_time)}`)
  if (show.doors_time) times.push(`Doors ${fmt(show.doors_time)}`)
  if (show.set_time) times.push(`Stage ${fmt(show.set_time)}`)
  if (times.length) parts.push(times.join(' · '))

  const description = parts.join(' - ')
  const title = `${artist.name} - Day Sheet`

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      siteName: 'Advance',
    },
    twitter: {
      title,
      description,
    },
  }
}

export default function DaySheetLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
