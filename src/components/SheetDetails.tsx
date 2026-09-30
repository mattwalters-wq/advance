'use client'

import { useEffect, useRef, type ReactNode } from 'react'

export default function SheetDetails({ title, hint, children, defaultOpen = false }: {
  title: string
  hint?: string
  children: ReactNode
  defaultOpen?: boolean
}) {
  const ref = useRef<HTMLDetailsElement>(null)

  useEffect(() => {
    let wasOpen: boolean | null = null
    const beforePrint = () => {
      if (!ref.current) return
      if (wasOpen === null) wasOpen = ref.current.open
      ref.current.open = true
    }
    const afterPrint = () => {
      if (ref.current && wasOpen !== null) ref.current.open = wasOpen
      wasOpen = null
    }
    window.addEventListener('beforeprint', beforePrint)
    window.addEventListener('afterprint', afterPrint)
    return () => {
      window.removeEventListener('beforeprint', beforePrint)
      window.removeEventListener('afterprint', afterPrint)
    }
  }, [])

  return (
    <details ref={ref} open={defaultOpen} className="sheet-details">
      <summary className="sheet-summary">
        <span className="sheet-heading">{title}{hint && <span className="sheet-hint">{hint}</span>}</span>
        <span className="sheet-chevron" aria-hidden="true">⌄</span>
      </summary>
      <style>{`.sheet-details { margin-bottom: 16px; border: 1px solid #e8e2d8; border-radius: 12px; background: #fff; color: #1a1714; overflow: hidden; }
.sheet-summary { display: flex; align-items: center; justify-content: space-between; gap: 16px; padding: 18px 20px; min-height: 56px; cursor: pointer; list-style: none; }
.sheet-summary::-webkit-details-marker { display: none; }
.sheet-summary:hover { background: #f9f6f2; }
.sheet-summary:focus-visible { outline: 2px solid #c4622d; outline-offset: -4px; border-radius: 10px; }
.sheet-heading { font-size: 15px; font-weight: 600; line-height: 1.4; min-width: 0; }
.sheet-hint { display: block; font-size: 12px; font-weight: 400; color: #706960; margin-top: 4px; }
.sheet-chevron { font-size: 22px; flex-shrink: 0; color: #706960; }
.sheet-details[open] > .sheet-summary { border-bottom: 1px solid #e8e2d8; }
.sheet-details[open] > .sheet-summary .sheet-chevron { transform: rotate(180deg); }
.sheet-content { padding: 16px; overflow-wrap: anywhere; }
@media print {
  .sheet-chevron { display: none; }
  .sheet-details { overflow: visible; }
  .sheet-content { display: block !important; }
}
`}</style>
      <div className="sheet-content">{children}</div>
    </details>
  )
}
