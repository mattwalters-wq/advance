// Run with: node --test tests/import-review.test.cjs
const test = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs')
const ts = require('typescript')
// Load the project's TypeScript helpers without adding a test-runner dependency.
const previous = require.extensions['.ts']
require.extensions['.ts'] = (module, filename) => module._compile(ts.transpileModule(fs.readFileSync(filename, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 } }).outputText, filename)
const { buildImportReview } = require('../src/lib/import-review.ts')
const { createReview, readReview, signReview, applyImportReview } = require('../src/lib/import-review-server.ts')
if (previous) require.extensions['.ts'] = previous
else delete require.extensions['.ts']
let seq = 0
const uuid = () => `id-${++seq}`
const empty = () => ({ shows: [], travel: [], accommodation: [], contacts: [] })
const show = { id: 'show-1', tour_id: 'tour-1', date: '2026-10-01', venue: 'The Corner', set_time: '20:00:00', notes: 'Keep this', deleted_at: null }
const source = { shows: [{ date: show.date, venue: show.venue, set_time: '21:00', notes: '', id: 'injected', tour_id: 'wrong' }] }
function reviewFor(extracted, current) {
  const preview = createReview(extracted, current, 'user-1', 'tour-1', 'test-secret')
  return readReview(preview.token, 'user-1', 'tour-1', 'test-secret')
}
function fakeDb(records) {
  const db = { records: structuredClone(records), writes: [], failCategory: null, race: false }
  db.from = category => {
    let filters = [], operation = 'select', payload
    const query = {
      select() { return query },
      eq(field, value) { filters.push(row => row[field] === value); return query },
      is(field, value) { filters.push(row => (row[field] ?? null) === value); return query },
      update(value) { operation = 'update'; payload = value; return query },
      insert(value) { operation = 'insert'; payload = value; return query },
      then(resolve, reject) {
        try {
          if (operation === 'select') return Promise.resolve({ data: db.records[category].filter(row => filters.every(f => f(row))), error: null }).then(resolve, reject)
          db.writes.push({ category, operation, payload })
          if (db.failCategory === category) return Promise.resolve({ data: null, error: { message: 'Database failure' } }).then(resolve, reject)
          if (operation === 'insert') {
            if (db.records[category].some(r => r.id === payload.id)) return Promise.resolve({ data: null, error: { message: 'Duplicate key' } }).then(resolve, reject)
            db.records[category].push({ ...payload, deleted_at: null })
            return Promise.resolve({ data: [{ id: payload.id }], error: null }).then(resolve, reject)
          }
          if (db.race) db.records[category][0].set_time = '22:00'
          const rows = db.records[category].filter(row => filters.every(f => f(row)))
          rows.forEach(row => Object.assign(row, payload))
          return Promise.resolve({ data: rows.map(r => ({ id: r.id })), error: null }).then(resolve, reject)
        } catch (error) { return Promise.reject(error).then(resolve, reject) }
      },
    }
    return query
  }
  return db
}
test('preview exposes equal-length changes, ignores blanks and injected fields, normalizes stored times', () => {
  const data = empty(); data.shows = [show]
  const entries = buildImportReview(source, data, uuid)
  assert.deepEqual(entries[0].changes, [{ field: 'set_time', before: '20:00:00', after: '21:00' }])
  assert.equal(entries[0].incoming.id, undefined)
  assert.equal(entries[0].incoming.tour_id, undefined)
  assert.equal(buildImportReview({ shows: [{ ...source.shows[0], set_time: '20:00' }] }, data, uuid)[0].action, 'unchanged')
  assert.deepEqual(data.shows, [show])
})
test('uncertain venue is unselected, ambiguous matches and missing/invalid dates cannot apply', () => {
  const data = empty(); data.shows = [show]
  const uncertain = buildImportReview({ shows: [{ date: show.date, venue: 'Another venue' }] }, data, uuid)[0]
  assert.equal(uncertain.selected, false); assert.match(uncertain.warning, /Possible duplicate/)
  data.shows.push({ ...show, id: 'show-2', venue: 'Second venue' })
  assert.equal(buildImportReview({ shows: [{ date: show.date, venue: 'Another venue' }] }, data, uuid)[0].action, 'skip')
  for (const date of [null, '2026-02-30', 'garbage']) assert.equal(buildImportReview({ shows: [{ date, venue: 'A' }] }, empty(), uuid)[0].action, 'skip')
})
test('repeated rows and repeated targets do not produce multiple writes', () => {
  const row = { date: show.date, venue: show.venue }
  const added = buildImportReview({ shows: [row, row, { ...row, city: 'Melbourne' }] }, empty(), uuid)
  assert.deepEqual(added.map(e => e.action), ['add', 'skip', 'skip'])
  const data = empty(); data.shows = [show]
  const updated = buildImportReview({ shows: [{ ...row, set_time: '21:00' }, { ...row, set_time: '22:00' }] }, data, uuid)
  assert.deepEqual(updated.map(e => e.action), ['update', 'skip'])
})
test('review signature rejects tampering, wrong tour/user and expired tokens', () => {
  const preview = createReview(source, empty(), 'user-1', 'tour-1', 'test-secret')
  assert.throws(() => readReview(preview.token + 'a', 'user-1', 'tour-1', 'test-secret'))
  assert.throws(() => readReview(preview.token, 'user-2', 'tour-1', 'test-secret'), /different tour or user/)
  assert.throws(() => readReview(preview.token, 'user-1', 'tour-2', 'test-secret'), /different tour or user/)
  assert.throws(() => readReview(preview.token, 'user-1', 'tour-1', 'test-secret', Date.now() + 3_600_001), /expired/)
})
test('apply only chosen fields and records, then replay without writing twice', async () => {
  const data = empty(); data.shows = [show]
  const review = reviewFor({ shows: [{ date: show.date, venue: show.venue, set_time: '21:00', notes: 'Replace notes' }], contacts: [{ name: 'Alex' }] }, data)
  const db = fakeDb(data)
  const selection = [{ id: review.entries[0].id, fields: ['set_time'] }]
  assert.equal((await applyImportReview(db, review, selection, 'org-1'))[0].status, 'updated')
  assert.equal(db.records.shows[0].notes, 'Keep this'); assert.equal(db.records.contacts.length, 0)
  assert.equal((await applyImportReview(db, review, selection, 'org-1'))[0].status, 'already_applied')
  assert.equal(db.writes.length, 1)
})
test('stale review or newly added duplicate blocks all writes', async () => {
  const data = empty(); data.shows = [show]
  const review = reviewFor({ ...source, contacts: [{ name: 'Alex' }] }, data)
  const selections = review.entries.map(e => ({ id: e.id, fields: e.changes.map(c => c.field) }))
  const db = fakeDb(data); db.records.shows[0].notes = 'Newer edit'
  await assert.rejects(applyImportReview(db, review, selections, 'org-1'), /tour changed/); assert.equal(db.writes.length, 0)
  const duplicate = fakeDb(data); duplicate.records.contacts.push({ id: 'new', tour_id: 'tour-1', name: 'Alex' })
  await assert.rejects(applyImportReview(duplicate, review, selections, 'org-1'), /duplicate/); assert.equal(duplicate.writes.length, 0)
})
test('optimistic update catches changes between preflight and save', async () => {
  const data = empty(); data.shows = [show]
  const review = reviewFor(source, data), db = fakeDb(data); db.race = true
  const result = await applyImportReview(db, review, [{ id: review.entries[0].id, fields: ['set_time'] }], 'org-1')
  assert.equal(result[0].status, 'failed'); assert.equal(db.records.shows[0].set_time, '22:00')
})
test('partial failures are visible; successful additions can be safely retried', async () => {
  const review = reviewFor({ shows: [{ date: show.date, venue: show.venue }], contacts: [{ name: 'Alex' }] }, empty())
  const selections = review.entries.map(e => ({ id: e.id, fields: e.changes.map(c => c.field) }))
  const db = fakeDb(empty()); db.failCategory = 'contacts'
  const first = await applyImportReview(db, review, selections, 'org-1')
  assert.deepEqual(first.map(o => o.status), ['added', 'failed'])
  db.failCategory = null
  assert.deepEqual((await applyImportReview(db, review, selections, 'org-1')).map(o => o.status), ['already_applied', 'added'])
  assert.equal(db.records.shows.length, 1); assert.equal(db.records.contacts.length, 1)
})
test('forged selections, incomplete additions and duplicate selection IDs cannot write', async () => {
  const review = reviewFor(source, empty()), db = fakeDb(empty())
  const id = review.entries[0].id, fields = review.entries[0].changes.map(c => c.field)
  for (const selected of [[{ id: 'wrong', fields }], [{ id, fields: ['tour_id'] }], [{ id, fields: ['date'] }], [{ id, fields }, { id, fields }]]) await assert.rejects(applyImportReview(db, review, selected, 'org-1'))
  assert.equal(db.writes.length, 0)
})
test('endpoint preview never writes; every mode checks authentication and tour access before extraction or apply', async () => {
  const Module = require('node:module'), originalLoad = Module._load
  const { NextResponse } = require('next/server')
  const helpers = require('../src/lib/import-review-server.ts')
  let authenticated = true, authorized = true, extractedCalls = 0
  const records = empty(); records.shows = [show]
  const db = fakeDb(records), from = db.from
  db.from = category => category === 'tours' ? { select() { return this }, eq() { return this }, async single() { return { data: { org_id: 'org-1' }, error: null } } } : from(category)
  let POST
  const oldExtension = require.extensions['.ts']
  require.extensions['.ts'] = (module, filename) => module._compile(ts.transpileModule(fs.readFileSync(filename, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 } }).outputText, filename)
  Module._load = function(request, parent, isMain) {
    if (request === '@supabase/supabase-js') return { createClient: () => db }
    if (request === '@/lib/api-auth') return { getAuthUser: async () => authenticated ? { id: 'user-1' } : null, userCanAccessTour: async () => authorized, unauthorized: () => NextResponse.json({ success: false }, { status: 401 }), forbidden: () => NextResponse.json({ success: false }, { status: 403 }) }
    if (request === '@/lib/import-review-server') return helpers
    if (request === '@/lib/extract') return { extractStructured: async () => { extractedCalls++; return source } }
    if (request === '@/lib/attach') return { isSupportedImageType: () => true }
    return originalLoad.call(this, request, parent, isMain)
  }
  try { POST = require('../src/app/api/merge-tour/route.ts').POST }
  finally { Module._load = originalLoad; if (oldExtension) require.extensions['.ts'] = oldExtension; else delete require.extensions['.ts'] }
  const previousSecret = process.env.SUPABASE_SERVICE_ROLE_KEY
  process.env.SUPABASE_SERVICE_ROLE_KEY = 'test-secret'
  try {
    const request = body => ({ json: async () => ({ tourId: 'tour-1', ...body }) })
    const previewResponse = await POST(request({ text: 'The Corner stage 21:00', mode: 'preview' }))
    assert.equal(previewResponse.status, 200)
    const preview = await previewResponse.json();assert.ok(preview.review.token);assert.equal(db.writes.length, 0);assert.equal(extractedCalls, 1)
    for (const mode of ['preview', 'refresh', 'apply']) {
      authenticated = false; assert.equal((await POST(request({ mode, token: preview.review.token }))).status, 401)
      authenticated = true; authorized = false; assert.equal((await POST(request({ mode, token: preview.review.token }))).status, 403)
      authorized = true
    }
    assert.equal(extractedCalls, 1);assert.equal(db.writes.length, 0)
    const refresh = await POST(request({ mode: 'refresh', token: preview.review.token }))
    assert.equal(refresh.status, 200);assert.equal(extractedCalls, 1);assert.equal(db.writes.length, 0)
    const result = await POST(request({ mode: 'apply', token: preview.review.token, selections: [{ id: preview.review.entries[0].id, fields: ['set_time'] }] }))
    assert.equal(result.status, 200);assert.equal((await result.json()).outcomes[0].status, 'updated');assert.equal(db.writes.length, 1)
  } finally { if (previousSecret === undefined) delete process.env.SUPABASE_SERVICE_ROLE_KEY; else process.env.SUPABASE_SERVICE_ROLE_KEY = previousSecret }
})
