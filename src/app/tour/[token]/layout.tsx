import { createClient } from '@supabase/supabase-js'

export async function generateMetadata({ params }: { params: { token: string } }) {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )

  const { data: tour } = await supabase
    .from('tours')
    .select('*, artists(name)')
    .eq('share_token', params.token)
    .single()

  if (!tour) {
    return {
      title: 'Tour - Advance',
      description: 'Tour itinerary',
    }
  }

  const artist = (tour as any).artists
  const artistName = artist?.name || 'Tour'

  // Grab first few shows for the description
  const { data: shows } = await supabase
    .from('shows')
    .select('date, venue, city, country')
    .eq('tour_id', tour.id)
    .order('date')
    .limit(4)

  function fmtDate(d: string) {
    if (!d) return ''
    return new Date(d + 'T00:00:00').toLocaleDateString('en-AU', {
      day: 'numeric',
      month: 'short',
    })
  }

  const showCount = shows?.length || 0
  const title = `${artistName} - ${tour.name || 'Tour'}`

  let description = ''
  if (showCount === 0) {
    description = `${artistName} tour itinerary`
  } else {
    const firstShow = shows![0]
    const lastShow = shows![showCount - 1]
    const dateRange =
      firstShow.date === lastShow.date
        ? fmtDate(firstShow.date)
        : `${fmtDate(firstShow.date)} - ${fmtDate(lastShow.date)}`

    // List first 3 cities
    const cities = [...new Set(shows!.map((s: any) => s.city).filter(Boolean))]
    const cityList =
      cities.length > 3
        ? `${cities.slice(0, 3).join(', ')} + more`
        : cities.join(', ')

    description = [dateRange, cityList].filter(Boolean).join(' · ')
  }

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

export default function TourLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
