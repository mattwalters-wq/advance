'use client'

import { useEffect, useState } from 'react'
import Icon, { type IconName } from '@/components/workspace/Icon'
import './shared.css'

export function SharedPage({ children, label = 'On the road', print = true }: { children: React.ReactNode; label?: string; print?: boolean }) {
  return <div className="shared-page">
    <a href="#shared-content" className="shared-skip">Skip to itinerary</a>
    <header className="shared-brandbar no-print"><span className="shared-brand" aria-label="Advance">advance<span aria-hidden="true">✳</span></span><span className="shared-brand-label">{label}</span>{print && <button className="shared-print" onClick={() => window.print()} aria-label="Print or save as PDF"><Icon name="list" size={16}/><span>Save / print</span></button>}</header>
    <main className="shared-content" id="shared-content">{children}</main>
    <footer className="shared-footer"><span className="shared-brand">advance<span aria-hidden="true">✳</span></span><p>For everything before the show.</p></footer>
  </div>
}
export function SharedHero({ eyebrow, title, subtitle, children }: { eyebrow: string; title: string; subtitle?: string; children?: React.ReactNode }) {
  return <header className="shared-hero"><span className="shared-eyebrow">{eyebrow}</span><h1>{title}</h1>{subtitle && <p>{subtitle}</p>}{children}</header>
}
export function SharedState({ state, retry, noun = 'itinerary' }: { state: 'loading' | 'error' | 'missing'; retry?: () => void; noun?: string }) {
  return <SharedPage print={false}><section className="shared-state" role={state === 'error' ? 'alert' : 'status'}><span className="shared-state-icon"><Icon name={state === 'loading' ? 'calendar' : state === 'error' ? 'refresh' : 'music'} size={28}/></span><h1>{state === 'loading' ? 'Getting you ready.' : state === 'error' ? 'Let’s try that again.' : `This ${noun} isn’t available.`}</h1><p>{state === 'loading' ? 'Opening your itinerary and the latest details…' : state === 'error' ? 'We couldn’t load the details. Check your connection, then try again.' : 'The link may have changed. Ask your tour manager for an updated link.'}</p>{state === 'loading' && <div className="shared-loading-bar"/>}{state === 'error' && <button className="shared-action primary" onClick={retry}><Icon name="refresh"/>Try again</button>}</section></SharedPage>
}
export function SharedDock({ items }: { items: { href: string; label: string; icon: IconName }[] }) {
  if (items.length < 2) return null
  return <nav className="shared-dock no-print" aria-label="Jump to section">{items.map(item => <a key={item.href} href={item.href}><Icon name={item.icon} size={19}/><span>{item.label}</span></a>)}</nav>
}
export function MapLink({ address, label = 'Directions' }: { address: string; label?: string }) {
  return <a className="shared-action" href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`} target="_blank" rel="noreferrer"><Icon name="arrow" size={17}/>{label}<span className="shared-sr-only"> to {address} (opens maps)</span></a>
}
export function CopyReference({ value }: { value: string }) {
  const [copied, setCopied] = useState(false), [failed, setFailed] = useState(false)
  useEffect(() => { setCopied(false); setFailed(false) }, [value])
  async function copy() {
    try { await navigator.clipboard.writeText(value); setCopied(true); setFailed(false) }
    catch { setFailed(true) }
  }
  return <div className="shared-reference"><div><span className="shared-eyebrow">Booking reference</span><strong>{value}</strong></div><button aria-label={`Copy booking reference ${value}`} className="shared-action" onClick={copy}>{copied ? <><Icon name="check" size={15}/>Copied</> : 'Copy'}</button><span className="shared-sr-only" role="status">{copied ? 'Booking reference copied' : ''}</span>{failed && <small role="status">Select and copy the reference above.</small>}</div>
}
export function ContactCards({ contacts }: { contacts: { id?: string; name: string; role?: string; phone?: string; email?: string }[] }) {
  return <div className="shared-contacts">{contacts.map((contact, i) => <article key={contact.id || `${contact.name}-${i}`} className="shared-contact"><div className="shared-contact-top"><span className="shared-avatar" aria-hidden="true">{contact.name?.charAt(0)}</span><div><h3>{contact.name}</h3>{contact.role && <p>{contact.role}</p>}</div></div><div className="shared-contact-actions">{contact.phone && <a href={`tel:${contact.phone.replace(/[^+\d,;*#]/g, '')}`} className="shared-action" aria-label={`Call ${contact.name} on ${contact.phone}`}><span>Call</span><span>{contact.phone}</span></a>}{contact.email && <a href={`mailto:${contact.email}`} className="shared-action" aria-label={`Email ${contact.name} at ${contact.email}`}><span>Email</span><span>{contact.email}</span></a>}</div></article>)}</div>
}
