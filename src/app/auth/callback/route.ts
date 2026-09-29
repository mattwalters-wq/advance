import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

export async function GET(request: NextRequest) {
  const url = new URL(request.url)
  const code = url.searchParams.get('code')
  // Only allow same-origin relative paths — blocks open redirects like
  // ?next=//evil.com or ?next=/\evil.com
  const rawNext = url.searchParams.get('next')
  const next = rawNext && rawNext.startsWith('/') && !rawNext.startsWith('//') && !rawNext.startsWith('/\\')
    ? rawNext
    : '/dashboard'

  if (code) {
    const cookieStore = cookies()
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() { return cookieStore.getAll() },
          setAll(cookiesToSet: { name: string; value: string; options?: any }[]) {
            cookiesToSet.forEach(({ name, value, options }: { name: string; value: string; options?: any }) => {
              cookieStore.set(name, value, options)
            })
          },
        },
      }
    )
    const { error } = await supabase.auth.exchangeCodeForSession(code)
    if (!error) {
      const target = new URL(next, request.url)
      // Belt and braces: the URL parser strips tabs/newlines, so re-check origin
      return NextResponse.redirect(target.origin === url.origin ? target : new URL('/dashboard', request.url))
    }
  }

  // Fallback - redirect to dashboard anyway (client will handle token from hash)
  return NextResponse.redirect(new URL('/dashboard', request.url))
}
