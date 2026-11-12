import { createHmac, randomUUID, timingSafeEqual } from 'node:crypto'
import type { SupabaseClient } from '@supabase/supabase-js'
import { buildImportReview, importCategories, importFields, matchImport, sameValue, type ImportData, type ImportEntry, type ImportSelection, type ImportOutcome } from './import-review'

type Review = { version: 1; userId: string; tourId: string; expires: number; entries: ImportEntry[]; extracted: any }
export class ImportReviewError extends Error { constructor(message: string, public status = 400) { super(message) } }
function signature(payload: string, secret: string) { return createHmac('sha256', secret).update(`advance-import-review-v1:${payload}`).digest('base64url') }
export function signReview(review: Review, secret: string) {
  const payload = Buffer.from(JSON.stringify(review)).toString('base64url')
  return `${payload}.${signature(payload, secret)}`
}
export function readReview(token: string, userId: string, tourId: string, secret: string, now = Date.now()): Review {
  if (typeof token !== 'string' || token.length > 4_000_000) throw new ImportReviewError('Invalid review. Read the document again.')
  const [payload, sig, extra] = token.split('.')
  const expected = signature(payload || '', secret)
  if (extra || !sig || !/^[A-Za-z0-9_-]{43}$/.test(sig) || !timingSafeEqual(Buffer.from(sig), Buffer.from(expected))) throw new ImportReviewError('Invalid review. Read the document again.')
  let review: Review
  try { review = JSON.parse(Buffer.from(payload, 'base64url').toString()) } catch { throw new ImportReviewError('Invalid review.') }
  if (review.version !== 1 || review.userId !== userId || review.tourId !== tourId) throw new ImportReviewError('This review belongs to a different tour or user.', 403)
  if (review.expires < now) throw new ImportReviewError('This review has expired. Refresh the review before applying changes.', 409)
  return review
}
export async function loadImportData(db: SupabaseClient, tourId: string): Promise<ImportData> {
  const results = await Promise.all(importCategories.map(c => db.from(c).select('*').eq('tour_id', tourId).is('deleted_at', null)))
  if (results.some(r => r.error)) throw new ImportReviewError('Could not load the tour. Try again.', 500)
  return Object.fromEntries(importCategories.map((c, i) => [c, results[i].data || []])) as ImportData
}
export function createReview(extracted: any, existing: ImportData, userId: string, tourId: string, secret: string) {
  const review: Review = { version: 1, extracted, userId, tourId, expires: Date.now() + 60 * 60 * 1000, entries: buildImportReview(extracted, existing, randomUUID) }
  return { entries: review.entries, token: signReview(review, secret) }
}
export async function applyImportReview(db: SupabaseClient, review: Review, selections: ImportSelection[], orgId: string) {
  if (!Array.isArray(selections) || !selections.length) throw new ImportReviewError('Select at least one change to apply.')
  const seen = new Set<string>()
  const selected = selections.map(selection => {
    if (!selection || typeof selection !== 'object') throw new ImportReviewError('Invalid selection. Refresh the review.')
    const entry = review.entries.find(e => e.id === selection.id)
    if (!entry || seen.has(entry.id) || !['add', 'update'].includes(entry.action) || !Array.isArray(selection.fields) || !selection.fields.length || new Set(selection.fields).size !== selection.fields.length || selection.fields.some(f => !entry.changes.some(c => c.field === f))) throw new ImportReviewError('Invalid selection. Refresh the review.')
    if (entry.action === 'add' && selection.fields.length !== entry.changes.length) throw new ImportReviewError('New records must include all reviewed details.')
    seen.add(entry.id)
    return { entry, fields: selection.fields, updates: Object.fromEntries(entry.changes.filter(c => selection.fields.includes(c.field)).map(c => [c.field, c.after])), already: false }
  })
  const current = await loadImportData(db, review.tourId)
  // Check all selected records before the first write. Never silently replace a newer edit.
  for (const item of selected) {
    const { entry, updates } = item
    if (entry.action === 'update') {
      const row = current[entry.category].find(r => r.id === entry.targetId)
      if (!row) throw new ImportReviewError('A selected record was removed. Refresh the review.', 409)
      item.already = Object.entries(updates).every(([f, v]) => sameValue(row[f], v)) && importFields[entry.category].every(f => f in updates || sameValue(row[f], entry.before[f]))
      if (!item.already && importFields[entry.category].some(f => !sameValue(row[f], entry.before[f]))) throw new ImportReviewError('The tour changed since this document was read. Refresh the review to see the latest values.', 409)
    } else {
      const prior = current[entry.category].find(r => r.id === entry.recordId)
      item.already = !!prior && Object.entries(updates).every(([f, v]) => sameValue(prior[f], v))
      if (!item.already && (prior || matchImport(entry.category, entry.incoming, current[entry.category]).candidates.length)) throw new ImportReviewError('A possible duplicate was added since this review. Refresh the review.', 409)
    }
  }
  const outcomes: ImportOutcome[] = []
  for (const { entry, updates, already } of selected) {
    if (already) { outcomes.push({ id: entry.id, category: entry.category, status: 'already_applied' }); continue }
    try {
      let response
      if (entry.action === 'add') {
        response = await db.from(entry.category).insert({ ...updates, id: entry.recordId, tour_id: review.tourId, org_id: orgId }).select('id')
      } else {
        let query = db.from(entry.category).update(updates).eq('id', entry.targetId!).eq('tour_id', review.tourId).is('deleted_at', null)
        for (const [field, value] of Object.entries(entry.before)) query = value == null ? query.is(field, null) : query.eq(field, value)
        response = await query.select('id')
      }
      if (response.error || !response.data?.length) outcomes.push({ id: entry.id, category: entry.category, status: 'failed', error: response.error ? 'Could not save this record. Refresh the review and try again.' : 'This record changed during import. Refresh the review.' })
      else outcomes.push({ id: entry.id, category: entry.category, status: entry.action === 'add' ? 'added' : 'updated' })
    } catch { outcomes.push({ id: entry.id, category: entry.category, status: 'failed', error: 'Could not confirm this record was saved. Retry to check its status.' }) }
  }
  return outcomes
}
