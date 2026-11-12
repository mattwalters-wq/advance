const test = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs')
const ts = require('typescript')
const Module = require('node:module')
const filename = require('node:path').resolve('src/lib/shared-itinerary.ts')
const loaded = new Module(filename, module)
loaded._compile(ts.transpileModule(fs.readFileSync(filename, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 } }).outputText, filename)
const {groupTravel, matchesTraveller, itineraryDates, focusDate, showStart} = loaded.exports
const flight = {travel_date:'2026-11-13',departure_time:'09:00',arrival_time:'10:30',carrier:'QF400',travel_type:'flight',from_location:'Melbourne',to_location:'Sydney'}
test('travel grouping preserves separate dates, departure times, and operational notes', () => {
 const rows = [flight, {...flight,travel_date:'2026-11-14'}, {...flight,departure_time:'11:00'}, {...flight,notes:'Different pickup'}]
 assert.equal(groupTravel(rows).length,4)
 assert.deepEqual(rows[0],flight)
})
test('same journey combines passengers and references without mutating source records', () => {
 const rows=[{...flight,travellers:'Ann',reference:'ABC'}, {...flight,travellers:'Anna, Ann',reference:'XYZ'}]
 const result=groupTravel(rows)
 assert.equal(result.length,1)
 assert.equal(result[0].travellers,'Ann, Anna')
 assert.equal(result[0].reference,'ABC, XYZ')
 assert.equal(rows[0].travellers,'Ann')
})
test('unconfirmed departure bookings remain separate and sort after timed travel', () => {
 assert.equal(groupTravel([{...flight,departure_time:null},{...flight,departure_time:null}]).length,2)
 assert.equal(groupTravel([{...flight,departure_time:null},flight])[0].departure_time,'09:00')
})
test('person filter matches a complete name, not a substring', () => {
 assert.equal(matchesTraveller('Anna, Matt','Ann'),false)
 assert.equal(matchesTraveller('  ANN , Matt','ann'),true)
 assert.equal(matchesTraveller(null,'everyone'),true)
 assert.equal(matchesTraveller(null,'Ann'),false)
})
test('crew date navigation includes hotel checkout and chooses the next or last day', () => {
 const dates=itineraryDates([{date:'2026-11-13'}],[{travel_date:'2026-11-14'}],[],[{check_in:'2026-11-13',check_out:'2026-11-15'}])
 assert.deepEqual(dates,['2026-11-13','2026-11-14','2026-11-15'])
 assert.equal(focusDate(dates,'2026-11-14'),'2026-11-14')
 assert.equal(focusDate(dates,'2026-12-01'),'2026-11-15')
 assert.equal(focusDate([],'2026-12-01'),'')
})
test('crew events sort by the first commitment and retain arrival-only events', () => {
 assert.equal(showStart({arrival_time:'14:00',soundcheck_time:'16:00',set_time:'21:00'}),'14:00')
 assert.equal(showStart({arrival_time:'08:00'}),'08:00')
 assert.equal(showStart({}),undefined)
})
