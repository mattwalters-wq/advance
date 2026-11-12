'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useEffect, useRef, useState } from 'react'
import { createClient } from '@/lib/supabase'
import { useWorkspace } from './WorkspaceProvider'
import Icon from './Icon'
import './workspace.css'

export function EmptyState({ title, children, icon = 'calendar' }: { title: string; children: React.ReactNode; icon?: 'calendar' | 'search' | 'music' | 'check' }) {
  return <div className="ws-empty"><span className="ws-empty-icon"><Icon name={icon} size={25}/></span><h3>{title}</h3><div>{children}</div></div>
}
export function LoadError({ message, retry }: { message: string; retry: () => void }) {
  return <div className="ws-error" role="alert"><Icon name="alert"/><span>{message}</span><button className="ws-button ws-small" onClick={retry}><Icon name="refresh" size={15}/>Try again</button></div>
}
export function Skeleton({ rows = 3 }: { rows?: number }) {
  return <div className="ws-skeletons" role="status" aria-label="Loading"><span className="ws-sr-only">Loading…</span>{Array.from({ length: rows }, (_, i) => <div className="ws-skeleton" key={i}/>)}</div>
}
export default function WorkspaceShell({ children }: { children: React.ReactNode }) {
  const workspace = useWorkspace(), pathname = usePathname(), router = useRouter()
  const [menu, setMenu] = useState(false), [signingOut, setSigningOut] = useState(false), [signoutError, setSignoutError] = useState('')
  const menuRef = useRef<HTMLDivElement>(null), buttonRef = useRef<HTMLButtonElement>(null)
  const name = workspace.user?.email || 'Your account'
  const initial = (workspace.adminOrg ? name : workspace.profile?.full_name || name).charAt(0).toUpperCase()
  const suffix = workspace.adminOrg ? `?superadmin=1&org_id=${encodeURIComponent(workspace.adminOrg)}` : ''
  useEffect(() => {
    function keydown(event: KeyboardEvent) {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') { event.preventDefault(); router.push(`/dashboard/search${suffix}`) }
      if (event.key === 'Escape' && menu) { setMenu(false); buttonRef.current?.focus() }
    }
    function outside(event: PointerEvent) { if (!menuRef.current?.contains(event.target as Node)) setMenu(false) }
    window.addEventListener('keydown', keydown); window.addEventListener('pointerdown', outside)
    return () => { window.removeEventListener('keydown', keydown); window.removeEventListener('pointerdown', outside) }
  }, [router, suffix, menu])
  async function signout() {
    setSigningOut(true); setSignoutError('')
    try {
      const { error } = await createClient().auth.signOut()
      if (error) throw error
      router.replace('/auth/signin')
    } catch { setSignoutError('Sign out failed. Please try again.'); setSigningOut(false) }
  }
  return <div className="ws">
    <a href="#workspace-main" className="ws-skip">Skip to content</a>
    <aside className="ws-sidebar">
      <Link href={`/dashboard${suffix}`} className="ws-logo" aria-label="Advance home">advance<span>✳</span></Link>
      <div className="ws-workspace-label"><span className="ws-workspace-mark">A</span><div>Your workspace<small>TOUR MANAGEMENT</small></div></div>
      <div className="ws-nav-label">WORKSPACE</div>
      <nav className="ws-nav" aria-label="Main navigation">
        {([{ href: '/dashboard', label: 'Overview', icon: 'overview' }, { href: '/dashboard/calendar', label: 'Calendar', icon: 'calendar' }, { href: '/dashboard/search', label: 'Search', icon: 'search' }] as const).map(item => <Link key={item.href} href={`${item.href}${suffix}`} aria-current={pathname === item.href ? 'page' : undefined}><Icon name={item.icon}/><span>{item.label}</span>{item.icon === 'search' && <kbd>⌘ K</kbd>}</Link>)}
      </nav>
      {!workspace.adminOrg && <Link href="/dashboard/import" className="ws-import-nav"><Icon name="upload"/>Import documents<Icon name="plus" size={15}/></Link>}
      <div className="ws-sidebar-note"><span className="ws-eyebrow">LESS ADMIN. MORE MUSIC.</span><p>A little more organised.<br/>A lot more ready.</p><span className="ws-note-line"/></div>
      <div className="ws-account" ref={menuRef}>
        <button ref={buttonRef} className="ws-account-button" onClick={() => setMenu(!menu)} aria-label="Account and session options" aria-expanded={menu} aria-controls="account-options"><span className="ws-avatar">{initial}</span><span className="ws-account-name">{workspace.adminOrg ? 'Admin workspace' : workspace.profile?.full_name || 'Your account'}<small>Account & session</small></span><Icon name="chevron" size={15}/></button>
        {menu && <div id="account-options" className="ws-account-menu"><span>{name}</span>{signoutError && <p role="alert">{signoutError}</p>}<button onClick={signout} disabled={signingOut}><Icon name="logout" size={15}/>{signingOut ? 'Signing out…' : 'Sign out'}</button></div>}
      </div>
    </aside>
    <div className="ws-body">
      <header className="ws-topbar"><div className="ws-breadcrumb">Workspace <span>/</span> <strong>{pathname.endsWith('/calendar') ? 'Calendar' : pathname.endsWith('/search') ? 'Search' : 'Overview'}</strong></div><Link href={`/dashboard/search${suffix}`} className="ws-top-search" aria-label="Search workspace"><Icon name="search" size={16}/><span>Find anything</span><kbd>⌘ K</kbd></Link></header>
      <main id="workspace-main" className="ws-main">
        {workspace.adminOrg && <div className="ws-admin-banner">Viewing {workspace.profile?.full_name || 'another workspace'}<Link href="/admin">Back to admin →</Link></div>}
        {workspace.error ? <LoadError message={workspace.error} retry={workspace.reload}/> : workspace.loading ? <><div className="ws-page-heading"><div><span className="ws-eyebrow">YOUR WORKSPACE</span><h1>Getting things ready…</h1></div></div><Skeleton rows={5}/></> : children}
      </main>
      <footer className="ws-footer"><span>Advance <span aria-hidden="true">✳</span></span><span>For everything before the show.</span></footer>
    </div>
  </div>
}
