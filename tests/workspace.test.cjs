const test = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs')
const ts = require('typescript')
const Module = require('node:module')
const filename = require('node:path').resolve('src/lib/workspace.ts')
const loaded = new Module(filename, module)
loaded.filename = filename
loaded._compile(ts.transpileModule(fs.readFileSync(filename, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText, filename)
const { dateKey, shiftDay, calendarDays, buildAgenda, formatTime, tourHref, searchPattern } = loaded.exports

test('date-only navigation survives DST, leap years and year boundaries', () => {
  const previous = process.env.TZ
  try {
    for (const timezone of ['Australia/Melbourne', 'America/Los_Angeles', 'Pacific/Auckland']) {
      process.env.TZ = timezone
      assert.equal(shiftDay('2026-10-04', 1), '2026-10-05')
      assert.equal(shiftDay('2026-11-01', 1), '2026-11-02')
      assert.equal(shiftDay('2028-02-28', 1), '2028-02-29')
      assert.equal(shiftDay('2026-12-31', 1), '2027-01-01')
      assert.equal(dateKey(new Date(2026, 0, 1, 0, 5)), '2026-01-01')
    }
  } finally { if (previous === undefined) delete process.env.TZ; else process.env.TZ = previous }
})
test('calendar fills complete Monday-first weeks including adjacent months', () => {
  const days = calendarDays(new Date(2026, 10, 12))
  assert.equal(days.length, 42)
  assert.equal(new Set(days).size, 42)
  assert.equal(days[0], '2026-10-26')
  assert.equal(days[41], '2026-12-06')
  assert.equal(days.filter(d => d.startsWith('2026-11')).length, 30)
})
const artists = [{ id: 'a1', name: 'One' }, { id: 'a2', name: 'Two' }]
const tours = [{ id: 't1', artist_id: 'a1', name: 'First' }, { id: 't2', artist_id: 'a2', name: 'Second' }]
test('agenda joins only the accessible roster, omits deleted records and sorts known times first', () => {
  const events = buildAgenda(artists, tours, [
    { id: 'late', tour_id: 't1', date: '2026-11-12', venue: 'Club', set_time: '21:00' },
    { id: 'unknown', tour_id: 't1', date: '2026-11-12', venue: 'Hall' },
    { id: 'deleted', tour_id: 't1', date: '2026-11-12', deleted_at: '2026-11-01' },
    { id: 'foreign', tour_id: 't3', date: '2026-11-12' },
  ], [{ id: 'flight', tour_id: 't2', travel_date: '2026-11-12', departure_time: '09:00', from_location: 'Melbourne', to_location: 'Sydney' }])
  assert.deepEqual(events.map(e => e.id), ['travel:flight', 'show:late', 'show:unknown'])
  assert.equal(events[0].artist.name, 'Two')
  assert.deepEqual(events[2].missing, ['Stage time missing'])
})
test('attention distinguishes non-show days and incomplete routes from show details', () => {
  const events = buildAgenda(artists, tours, [
    { id: 'off', tour_id: 't1', date: '2026-11-12', type: 'day_off' },
    { id: 'show', tour_id: 't1', date: '2026-11-12' },
  ], [{ id: 'flight', tour_id: 't1', travel_date: '2026-11-12', to_location: 'Perth' }])
  assert.deepEqual(events.find(e => e.id === 'show:off').missing, [])
  assert.deepEqual(events.find(e => e.id === 'show:show').missing, ['Venue missing', 'Stage time missing'])
  assert.deepEqual(events.find(e => e.id === 'travel:flight').missing, ['Departure time missing', 'Route incomplete'])
})
test('tour links preserve explicit tour and admin scope while encoding identifiers', () => {
  const url = new URL(tourHref('artist/one', 'tour&two', 'org=three'), 'https://example.test')
  assert.equal(url.pathname, '/dashboard/artists/artist%2Fone')
  assert.equal(url.searchParams.get('tour'), 'tour&two')
  assert.equal(url.searchParams.get('org_id'), 'org=three')
  assert.equal(url.searchParams.get('superadmin'), '1')
  assert.equal(tourHref('a1'), '/dashboard/artists/a1')
})
test('search treats quotes, commas, percent and underscore as a literal search value', () => {
  assert.equal(searchPattern('  Corner, (Hotel)  '), '"%Corner, (Hotel)%"')
  assert.equal(searchPattern('100%_"'), '"%100\\%\\_\\"%"')
  assert.equal(searchPattern('A\\B'), '"%A\\\\B%"')
})
test('times handle midnight, noon, database seconds and malformed values', () => {
  assert.equal(formatTime('00:00:00'), '12:00am')
  assert.equal(formatTime('12:30:00'), '12:30pm')
  assert.equal(formatTime('21:05'), '9:05pm')
  assert.equal(formatTime(null), 'Time TBC')
  assert.equal(formatTime('27:99'), 'Time TBC')
})
