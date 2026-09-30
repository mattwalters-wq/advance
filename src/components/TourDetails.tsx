import type { ReactNode } from 'react'

export default function TourDetails({ title, hint, children }: { title: string; hint?: string; children: ReactNode }) {
  return (
    <details className="tour-details">
      <summary><span><strong>{title}</strong>{hint && <span className="tour-details-hint">{hint}</span>}</span><span className="tour-details-chevron" aria-hidden="true">⌄</span></summary>
      <div className="tour-details-content">{children}</div>
    </details>
  )
}
