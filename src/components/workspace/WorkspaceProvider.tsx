'use client'

import { createContext, Suspense, useCallback, useContext, useEffect, useRef, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import type { User } from '@supabase/supabase-js'
import { createClient } from '@/lib/supabase'
import type { Artist, Tour, Show, Travel } from '@/lib/workspace'

type Profile = { full_name?: string; org_id?: string }
interface Workspace { artists: Artist[]; tours: Tour[]; profile: Profile | null; user: User | null; loading: boolean; error: string; adminOrg?: string; reload: () => void }
const Context = createContext<Workspace | null>(null)

// Fetch each page explicitly so a busy roster isn't silently cut off at the API row limit.
export async function readPages<T>(query: (from: number, to: number) => PromiseLike<{ data: unknown[] | null; error: { message: string } | null }>): Promise<T[]> {
  const rows: T[] = []
  for (let from = 0; ; from += 500) {
    const result = await query(from, from + 499)
    if (result.error) throw new Error(result.error.message)
    const page = (result.data || []) as T[]
    rows.push(...page)
    if (page.length < 500) return rows
  }
}

function Provider({ children }: { children: React.ReactNode }) {
  const router = useRouter(), params = useSearchParams()
  const requestedOrg = params.get('superadmin') === '1' ? params.get('org_id') : null
  const [version, setVersion] = useState(0)
  const [state, setState] = useState<Omit<Workspace, 'reload'>>({ artists: [], tours: [], profile: null, user: null, loading: true, error: '' })
  const reload = useCallback(() => setVersion(v => v + 1), [])
  useEffect(() => {
    let active = true
    setState(s => ({ ...s, loading: true, error: '' }))
    async function load() {
      try {
        const db = createClient()
        const { data: { user }, error } = await db.auth.getUser()
        if (error && error.name !== 'AuthSessionMissingError') throw error
        if (!user) { router.replace('/auth/signin'); return }
        const admin = requestedOrg && user.email === (process.env.NEXT_PUBLIC_ADMIN_EMAIL || 'mattwaltersconsulting@gmail.com')
        let profile: Profile | null = null
        let adminOrg: string | undefined
        if (admin) {
          const result = await db.from('profiles').select('full_name, org_id').eq('org_id', requestedOrg).limit(1).maybeSingle()
          if (result.error) throw result.error
          profile = result.data
          if (!profile) {
            const legacy = await db.from('profiles').select('full_name, org_id').eq('id', requestedOrg).maybeSingle()
            if (legacy.error) throw legacy.error
            profile = legacy.data
          }
          adminOrg = profile?.org_id || requestedOrg
        } else {
          const result = await db.from('profiles').select('full_name, org_id').eq('id', user.id).maybeSingle()
          if (result.error) throw result.error
          profile = result.data
          if (!profile?.org_id) {
            const response = await fetch('/api/setup-account', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ fullName: profile?.full_name || '' }) })
            const setup = await response.json()
            if (!response.ok || !setup.success) throw new Error(setup.error || 'Account setup could not finish.')
            const refreshed = await db.from('profiles').select('full_name, org_id').eq('id', user.id).single()
            if (refreshed.error) throw refreshed.error
            profile = refreshed.data
          }
        }
        const artists = await readPages<Artist>((from, to) => {
          let query = db.from('artists').select('id, name, project, color').order('name').order('id')
          if (adminOrg) query = query.eq('org_id', adminOrg)
          return query.range(from, to)
        })
        // Keep related queries scoped to the roster returned by RLS.
        const tours: Tour[] = []
        for (let i = 0; i < artists.length; i += 100) {
          tours.push(...await readPages<Tour>((from, to) => db.from('tours').select('id, artist_id, name, start_date, end_date, status').in('artist_id', artists.slice(i, i + 100).map(a => a.id)).order('id').range(from, to)))
        }
        if (active) setState({ artists, tours, profile, user, adminOrg, loading: false, error: '' })
      } catch {
        if (active) setState(s => ({ ...s, loading: false, error: 'We couldn’t load your workspace. Check your connection and try again.' }))
      }
    }
    void load()
    return () => { active = false }
  }, [requestedOrg, version, router])
  return <Context.Provider value={{ ...state, reload }}>{children}</Context.Provider>
}
export function WorkspaceProvider({ children }: { children: React.ReactNode }) {
  return <Suspense fallback={<div className="ws-boot" role="status">Opening your workspace…</div>}><Provider>{children}</Provider></Suspense>
}
export function useWorkspace() {
  const value = useContext(Context)
  if (!value) throw new Error('WorkspaceProvider is required')
  return value
}
export function useEvents(start: string, end: string) {
  const { tours, loading: workspaceLoading, error: workspaceError } = useWorkspace()
  const [state, setState] = useState<{ shows: Show[]; travel: Travel[]; loading: boolean; error: string }>({ shows: [], travel: [], loading: true, error: '' })
  const [version, setVersion] = useState(0)
  const request = useRef(0)
  useEffect(() => {
    const id = ++request.current
    if (workspaceLoading || workspaceError) return
    setState({ shows: [], travel: [], loading: true, error: '' })
    async function load() {
      try {
        const db = createClient(), shows: Show[] = [], travel: Travel[] = []
        for (let i = 0; i < tours.length; i += 100) {
          const ids = tours.slice(i, i + 100).map(t => t.id)
          const [showRows, travelRows] = await Promise.all([
            readPages<Show>((from, to) => db.from('shows').select('id, tour_id, date, venue, city, type, set_time').in('tour_id', ids).is('deleted_at', null).gte('date', start).lte('date', end).order('date').order('id').range(from, to)),
            readPages<Travel>((from, to) => db.from('travel').select('id, tour_id, travel_date, from_location, to_location, departure_time, carrier, reference').in('tour_id', ids).is('deleted_at', null).gte('travel_date', start).lte('travel_date', end).order('travel_date').order('id').range(from, to)),
          ])
          shows.push(...showRows); travel.push(...travelRows)
        }
        if (request.current === id) setState({ shows, travel, loading: false, error: '' })
      } catch {
        if (request.current === id) setState({ shows: [], travel: [], loading: false, error: 'Your schedule couldn’t be loaded. Please try again.' })
      }
    }
    void load()
    return () => { request.current++ }
  }, [tours, workspaceLoading, workspaceError, start, end, version])
  return { ...state, reload: () => setVersion(v => v + 1) }
}
