'use client'

import { useState } from 'react'
import { fieldLabel, type ImportEntry, type ImportSelection, type ImportOutcome } from '@/lib/import-review'

export default function ImportReview({ entries, busy, outcomes = [], error, onApply, onRefresh, onDiscard }: {
  entries: ImportEntry[]; busy: boolean; outcomes?: ImportOutcome[]; error?: string;
  onApply: (selection: ImportSelection[]) => void; onRefresh: () => void; onDiscard: () => void;
}) {
  const [selected, setSelected] = useState<Record<string, string[]>>(() => Object.fromEntries(entries.map(e => [e.id, e.selected ? e.changes.map(c => c.field) : []])))
  const completed = new Set(outcomes.filter(o => o.status !== 'failed').map(o => o.id))
  const choices = entries.filter(e => !completed.has(e.id) && selected[e.id]?.length).map(e => ({ id: e.id, fields: selected[e.id] }))
  const additions = entries.filter(e => e.action === 'add').length
  const updates = entries.filter(e => e.action === 'update').length
  const attention = entries.filter(e => e.warning).length
  function toggle(id: string, fields: string[]) { setSelected(prev => ({ ...prev, [id]: fields })) }
  return <section className="import-review" aria-label="Review imported information" aria-busy={busy}>
    <style>{`
      .import-review {color:var(--tour-text); margin-top:14px; overflow-wrap:anywhere;}
      .import-review h3 {font-size:16px;margin:0 0 6px;}
      .import-review p {font-size:13px;line-height:1.5;margin:6px 0 12px;color:var(--tour-muted);}
      .import-review article {border:1px solid var(--tour-border);border-radius:9px;margin:10px 0;padding:12px;}
      .import-review label {display:flex;gap:10px;align-items:flex-start;min-height:44px;cursor:pointer;}
      .import-review input {width:18px;height:18px;flex-shrink:0;margin-top:3px;accent-color:var(--tour-accent);}
      .import-review .change {padding:8px 0;border-top:1px solid var(--tour-border);font-size:13px;}
      .import-review .values {display:grid;grid-template-columns:1fr 1fr;gap:14px;width:100%;}
      .import-review .value {white-space:pre-wrap;min-width:0;}
      .import-review small {display:block;color:var(--tour-muted);font-size:11px;margin:3px 0;}
      .import-review .warning {border-left:3px solid var(--tour-accent);padding-left:10px;color:var(--tour-text);}
      .import-review button {min-height:44px;padding:10px 14px;border:1px solid var(--tour-border);border-radius:8px;background:var(--tour-card);color:var(--tour-text);cursor:pointer;}
      .import-review button:disabled {opacity:.5;cursor:default;}
      .import-review .apply {background:var(--tour-accent);color:white;border-color:var(--tour-accent);}
      .import-review .actions {display:flex;gap:8px;flex-wrap:wrap;margin-top:14px;}
      .import-review .error {color:var(--tour-text);border-left:3px solid #c00;padding:10px;}
      @media(max-width:480px) {.import-review .values {grid-template-columns:1fr;gap:8px;}}
    `}</style>
    <h3>Review before saving</h3>
    <p>{additions} new {additions === 1 ? 'record' : 'records'} · {updates} {updates === 1 ? 'update' : 'updates'}{attention ? ` · ${attention} to check` : ''}. {completed.size ? 'Saved records are marked below. Choose which remaining changes to apply.' : 'Nothing is saved until you apply your selections.'}</p>
    {entries.length === 0 && <p>No touring information found. Try another document or paste the relevant text.</p>}
    {entries.map(entry => {
      const canSelect = ['add', 'update'].includes(entry.action) && !completed.has(entry.id)
      const outcome = outcomes.find(o => o.id === entry.id)
      return <article key={entry.id}>
        <small>{entry.category === 'shows' ? 'Show / session' : fieldLabel(entry.category)} · {completed.has(entry.id) ? 'Saved' : { add: 'New record', update: 'Update existing', unchanged: 'Already up to date', skip: 'Needs attention' }[entry.action]}</small>
        {canSelect ? <label><input type="checkbox" aria-label={`Select ${entry.title}`} checked={!!selected[entry.id]?.length} disabled={busy} onChange={e => toggle(entry.id, e.target.checked ? entry.changes.map(c => c.field) : [])} /><strong>{entry.title}</strong></label> : <strong>{entry.title}</strong>}
        {entry.warning && <p className="warning">{entry.warning}</p>}
        {entry.action === 'update' && <small>Current record: {entry.before.venue || entry.before.name || entry.before.carrier || entry.title}</small>}
        {(canSelect || (entry.action === 'skip' && entry.changes.length > 0)) && <details open={entry.action === 'update' && !entry.warning}><summary style={{ minHeight: 44, cursor: 'pointer', paddingTop: 12, fontSize: 13 }}>{entry.changes.length} {entry.action !== 'update' ? 'details from document' : 'proposed changes'}</summary>{entry.changes.map(change => <div className="change" key={change.field}>
          {entry.action === 'update' ? <label>
            <input type="checkbox" aria-label={`${fieldLabel(change.field)} for ${entry.title}`} disabled={busy} checked={selected[entry.id]?.includes(change.field) || false} onChange={e => toggle(entry.id, e.target.checked ? [...(selected[entry.id] || []), change.field] : (selected[entry.id] || []).filter(f => f !== change.field))} />
            <div style={{ flex: 1, minWidth: 0 }}><strong>{fieldLabel(change.field)}</strong><div className="values"><div className="value"><small>Current</small>{change.before || 'Not set'}</div><div className="value"><small>From document</small>{change.after}</div></div></div>
          </label> : <div><small>{fieldLabel(change.field)}</small><div className="value">{change.after}</div></div>}
        </div>)}</details>}
        {outcome?.status === 'failed' && <p role="alert" className="error">{outcome.error}</p>}
      </article>
    })}
    {error && <p role="alert" className="error">{error}</p>}
    {outcomes.length > 0 && <p role="status">{outcomes.filter(o => o.status !== 'failed').length} saved · {outcomes.filter(o => o.status === 'failed').length} could not be saved.</p>}
    <div className="actions">
      <button className="apply" disabled={busy || choices.length === 0} onClick={() => onApply(choices)}>{busy ? 'Working…' : `Apply ${choices.length} selected ${choices.length === 1 ? 'record' : 'records'}`}</button>
      <button disabled={busy} onClick={onRefresh}>Refresh review</button>
      <button disabled={busy} onClick={onDiscard}>Discard document</button>
    </div>
  </section>
}
