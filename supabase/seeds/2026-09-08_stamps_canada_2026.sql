-- =============================================================================
-- SEED: The Stamps — Canada 2026 (1 Oct – 4 Nov 2026)
-- Project: pvrjkkzguwkwtihkujvz
--
-- Sources: Midnight Agency support itinerary PDF (2026-06-15), Matt's email
-- confirmations, Outlook thread "The Stamps (AUS) - Winter 2026/27 Canadian
-- Tour" (Hotel Wolfe Island, read 2026-09-08).
--
-- This repo seeds data with plain SQL run in the Supabase SQL editor
-- (see supabase-schema.sql), so this follows the same convention.
--
-- Idempotent: reuses the existing artist, tour, shows and contacts by id and
-- guards every insert with NOT EXISTS. Safe to re-run.
--
-- HOW TO RUN
--   Dry run : execute SECTION 1 + SECTION 2 only (no writes).
--   Apply   : execute the whole file (SECTION 3 is wrapped in a transaction).
--
-- Fields with no home in the schema live in shows.notes / settlements.notes /
-- tour_notes and are listed in the session summary.
-- =============================================================================

-- ---------------------------------------------------------------------------
-- SECTION 1 — proposed data (temp tables, no writes to real tables)
-- ---------------------------------------------------------------------------
create temp table if not exists seed_ctx as
select '0c82a5bd-4407-42fe-9de0-eeb75c9b38c0'::uuid as tour_id,
       '473ba104-f730-4517-a245-0f9cbc5f4d46'::uuid as org_id,
       '5c47dbb8-fdef-4c5f-849a-1058fdfe038c'::uuid as artist_id;

create temp table if not exists seed_shows (
  existing_id uuid,           -- null = insert
  date date, type text, venue text, city text, country text, address text,
  arrival_time time, arrival_label text,
  doors_time text, soundcheck_time text, set_time text,
  fee text, notes text,
  -- settlement
  deal_type text, deal_type_detail text, capacity int, ticket_price numeric,
  settlement_notes text
);
truncate seed_shows;
insert into seed_shows values
-- ===== LEG 1: MOONDOGGY SUPPORT RUN =========================================
('904704aa-d078-4462-a30a-74353dcc2da3','2026-10-01','support','Maxwell''s Concerts and Events','Waterloo','Canada',
 '35 University Ave E, Waterloo ON N2J 2V9', null,null,'19:30',null,'20:00', null,
 E'Support — Direct Support to Moondoggy · Leg: Moondoggy Support Run\nPromoter: Paul Maxwell (Maxwell''s Concerts and Events). Venue phone (226) 240-7020.\nCapacity 500 · 19+\nHeadliner 9:15pm · Curfew 11:15pm\nMerch: Artist sells · 85% soft / 85% hard (venue takes 15%)\nStatus: Confirmed · Announced 16 June\nFEE TBC — support fee not in Midnight itinerary, confirm with Grant. Earlier budget-sheet figure (June): $350.',
 null,null,500,20.00,'Advance $20 (500 allocated) · Door $25. Support fee TBC (June budget-sheet figure $350, unconfirmed). Merch 85%/85%.'),
('63b45e3e-4b8d-49ad-9ef3-09d902c4bbf8','2026-10-03','support','Refined Fool Brewing Company','Sarnia','Canada',
 '1326 London Rd, Sarnia ON N7S 1P7', null,null,null,null,null, null,
 E'Support — Direct Support to Moondoggy · Leg: Moondoggy Support Run\nPromoter: Billie Jo Gage (Refined Fool Brewing Company). Venue phone (519) 704-1665.\nCapacity 175 · 19+\nSchedule TBC\nMerch: seller TBC · 100% soft / 100% hard\nStatus: Confirmed · Announced 18 June\nDate note: earlier correspondence had 2 or 3 Oct; Midnight itinerary says Sat 3 Oct — using 3 Oct.\nFEE TBC — confirm with Grant. Earlier budget-sheet figure (June): $100.',
 null,null,175,10.00,'Advance $10 (175 allocated) · Door $15. Support fee TBC (June budget-sheet figure $100, unconfirmed). Merch 100%/100%.'),
('c6cca84c-6454-4b5d-83d5-c23c9c1fd342','2026-10-08','support','Sonic Hall','Guelph','Canada',
 null, null,null,null,null,null, null,
 E'Support — Direct Support to Moondoggy · Leg: Moondoggy Support Run\n*** CHASE GRANT: this date is MISSING from the Midnight itinerary PDF (15 June). Confirmed per Grant''s 8 June email only. Venue address, contact, promoter, schedule, tickets and fee all TBC. ***\nPromoter: TBC (existing contact on file: Matt Paxton, Sonic Unyon — unverified)\nStatus: Confirmed (per Grant, 8 June)\nFEE TBC. Earlier budget-sheet figure (June): $150.',
 null,null,null,null,'All ticketing TBC — not on Midnight itinerary. Support fee TBC (June budget-sheet figure $150, unconfirmed).'),
('0094fcdc-b050-47bb-b2ec-ef2ca4096ce0','2026-10-10','support','BOND|ST Event Centre','Oshawa','Canada',
 '44 Bond St E, Oshawa ON L1G 1B1', null,null,'19:30',null,'20:30', null,
 E'Support — Direct Support to Moondoggy · Leg: Moondoggy Support Run\nPromoter: Cheryl Ireland (BOND|ST Event Centre). Venue phone (905) 576-9180.\nCapacity 1200 · All Ages + Licensed\nHeadliner 9:30pm\nMerch: seller TBC · 100% / 100%\nStatus: Confirmed · Announce date listed as 10 Oct (same day as show — likely a placeholder, check)\nFEE TBC — confirm with Grant. Earlier budget-sheet figure (June): $200.',
 null,null,1200,20.00,'Advance $20 (350 allocated of 1200 cap) · Door $25. Support fee TBC (June budget-sheet figure $200, unconfirmed). Merch 100%/100%.'),
('19d003db-2dbe-4352-b801-3e27275d26ee','2026-10-15','support','The Mod Club','Toronto','Canada',
 '722 College St, Toronto ON M6G 1C2', null,null,'19:00',null,null, null,
 E'Support — Direct Support to Moondoggy · Leg: Moondoggy Support Run\nPromoter: Mary Ditta, Live Nation Canada, Inc. (40 Hanna Ave 3rd floor, Toronto ON M6K 0C3 · office (416) 260-5600).\nCapacity 600 · 19+\nShow 8:00pm — SUPPORT SLOT TIME NOT GIVEN, confirm.\nMerch: seller TBC · 100% / 100%\nStatus: Confirmed · Announced 16 June\nFEE TBC — confirm with Grant. Earlier budget-sheet figure (June): $350.',
 null,null,600,35.00,'GA $35 (580 allocated). Support fee TBC (June budget-sheet figure $350, unconfirmed). Merch 100%/100%.'),
('61ddec5e-11cf-4fa2-8e33-e8ef8ada4b25','2026-10-16','support','Broom Factory','Kingston','Canada',
 '305 Rideau St, Kingston ON K7K 3A9', '16:00','Load in / soundcheck','19:00','16:00',null, null,
 E'Support — Direct Support to Moondoggy · Leg: Moondoggy Support Run\nPromoter: Virginia Clark, Flying V Productions (40 John St, Kingston ON K7K 1S9).\nCapacity 250 · Min age TBC\nShow 8:30pm–10:00pm — support slot time not given, confirm.\nTickets: https://link.dice.fm/g50d13a580dc\nMerch: seller TBC · 100% / 100%\nStatus: Confirmed · Announced 16 June\nFEE TBC — confirm with Grant. Earlier budget-sheet figure (June): $200.',
 null,null,250,22.50,'T1 $22.50 (240 allocated) · Comps 10. Ticket link https://link.dice.fm/g50d13a580dc. Support fee TBC (June budget-sheet figure $200, unconfirmed). Merch 100%/100%.'),
('f51251ce-0259-45a8-b3ec-d80907543ea7','2026-10-17','support','The 27 Club','Ottawa','Canada',
 '27 York St, Ottawa ON K1N 5S7', '16:00','Load in','19:00',null,null, null,
 E'Support — Direct Support to Moondoggy · Leg: Moondoggy Support Run\nPromoter: Shawn Scallen, Spectrasonic (Box 57043 RPO Gladstone Ave, Ottawa ON K1R 1A1). Venue phone (613) 562-8330.\nCapacity 280 · 19+\nShow 9:00pm–10:00pm — support slot time not given, confirm.\nMerch: Artist sells · 100% / 100%\nStatus: Confirmed · Announced 16 June\nFEE TBC — confirm with Grant. Earlier budget-sheet figure (June): $250.',
 null,null,280,22.50,'Advance $22.50 (250 allocated) · Door $30. Support fee TBC (June budget-sheet figure $250, unconfirmed). Merch 100%/100%.'),
('a8592b51-cb3e-4f81-b18c-3686bf498670','2026-10-23','support','Petit Campus','Montréal','Canada',
 '57-b Rue Prince-Arthur E, Montréal QC H2X 1B4', null,null,null,null,null, null,
 E'Support — Direct Support to Moondoggy · Leg: Moondoggy Support Run\nPromoter: David Mitchell, Blue Skies Turn Black (5230-A Av du Parc, Montréal QC H2V 4G7).\nCapacity 300 · 18+\nSchedule TBC\nMerch: seller TBC · 100% / 100%\nStatus: Confirmed · Announced 16 June\nFEE TBC — confirm with Grant. Earlier budget-sheet figure (June): $250.',
 null,null,300,22.00,'Advance $22 (300 allocated). Support fee TBC (June budget-sheet figure $250, unconfirmed). Merch 100%/100%.'),
('9df2aebd-b089-4e62-80f4-e89e98f9fca4','2026-10-24','support','Neat Cafe','Burnstown','Canada',
 '1715 Calabogie Road, Burnstown ON K0J 1G0', null,null,null,null,null, null,
 E'Support — Direct Support to Moondoggy · Leg: Moondoggy Support Run\nPromoter: Mark Enright (Neat Cafe).\nCapacity 100 · All Ages\nSchedule TBC\nMerch: seller TBC · 100% / 100%\nStatus: Confirmed · Announced 16 June\nFEE TBC (itinerary also says fee TBC).',
 null,null,100,30.00,'Gate $30 (120 allocated — exceeds stated capacity 100, check). Fee TBC. Merch 100%/100%.'),
-- ===== LEG 2: HEADLINE TAIL =================================================
(null,'2026-10-30','headline','Motel Chelsea','Chelsea','Canada',
 '1418 Route 105, Chelsea QC J9B 1P4', null,null,null,null,'20:00', null,
 E'Headline · Leg: Headline Tail · Booked direct (no agent)\nContact: Julia (Motel Chelsea)\nPresale via Humanitix: https://events.humanitix.com/the-stamps\nDeal: 80/20 door split after expenses. Mandatory venue sound tech fee comes out of expenses. Accommodation at the venue is a cost line.\nStatus: Confirmed · Performer agreement signed and countersigned May 2026',
 'door','80/20 door split after expenses',null,null,'80/20 door split after expenses. Mandatory venue sound tech fee deducted from expenses. Accommodation at venue is a cost line (see expenses). Presale: https://events.humanitix.com/the-stamps'),
(null,'2026-10-31','headline','Hotel Wolfe Island','Wolfe Island','Canada',
 '1237 County Rd 96, Wolfe Island ON K0H 2Y0', null,null,null,null,'20:00', null,
 E'Headline · Leg: Headline Tail · Booked direct (no agent)\nVenue also known as "Wolfe Island Hotel" (Matt''s records) — official name per venue is Hotel Wolfe Island; use that in all promo (Carlos, 3 Sep).\nContacts: Claire Grady-Smith (head of media) and Chris (Hugh Christopher Brown). Carlos Gouveia building the event listing on the hotel site.\nHalloween show — also doubling as a TV pilot shoot.\n8:00pm is a PLACEHOLDER — not yet confirmed (venue usually does 8 or 8:30pm; no doors time advertised, dinner/drinks beforehand).\nTickets: venue is setting up its own listing at $25 CAD (13% tax + 4.5% service charge on top or inclusive — TBC). Link pending.\nDEAL TBC — deal sheet from Claire still outstanding (Matt''s 1 Sep budget email; Claire 2 Sep said she''d get to it). No age restriction (hotel/restaurant). Apartment with 2–3 rooms offered for the band.\nStatus: Confirmed',
 null,null,null,25.00,'DEAL TBC — deal sheet from Claire outstanding as of 2 Sep 2026. Ticket $25 CAD target (venue listing in progress via Carlos Gouveia; tax/service-charge treatment TBC).'),
(null,'2026-11-01','headline','Sellers & Newel','Toronto','Canada',
 '672 College Street, Toronto ON M6G 1B8', null,null,null,null,'20:00', null,
 E'Headline · Leg: Headline Tail · Booked direct (no agent)\nContact: Peter (Sellers & Newel)\nShow 8:00pm confirmed via email.\nTickets: door only — cash minimum donation, no presale link.\nStatus: Confirmed',
 'door','Cash minimum donation at door',null,null,'Door only — cash minimum donation. No presale.'),
(null,'2026-11-04','headline','Drom Taberna','Toronto','Canada',
 '458 Queen Street West, Toronto ON M5V 2A8', null,null,null,null,'20:00', null,
 E'Headline · Leg: Headline Tail · Booked direct (no agent)\nShow 8:00pm confirmed via email.\nTickets: door only — pay what you can, no presale link.\nStatus: Confirmed\nCHECK: Matt''s 1 Sep budget email counts "Drom''s floor" as a confirmed fee — if there is a guaranteed floor, add it to the settlement.',
 'door','Pay what you can',null,null,'Door only — pay what you can. No presale. Budget email (1 Sep) mentions a Drom floor/guarantee — confirm and record amount.');

-- Contacts: existing_id = update in place; null = insert
create temp table if not exists seed_contacts (existing_id uuid, name text, role text, phone text, email text);
truncate seed_contacts;
insert into seed_contacts values
('ebab7fd7-b0e0-400c-84fe-f2bbba2ca61e','Paul Maxwell','Promoter - Maxwell''s Concerts and Events, Waterloo (1 Oct)','(519) 498-5705','paul@maxwellswaterloo.com'),
('c6a61c40-010b-435a-869d-a222576a6eac','Billie Jo Gage','Promoter - Refined Fool Brewing Company, Sarnia (3 Oct)','(519) 402-4111','billiejo@refinedfool.com'),
('9b42a580-ac22-4b6b-83fa-d33ff6aa979a','Matt Paxton','Venue Contact - Sonic Hall, Guelph (8 Oct) (Sonic Unyon) — UNVERIFIED, promoter TBC per Midnight',null,null),
('18183337-6f32-4426-bb90-112e7e82804a','Hailey','Venue Contact - BOND|ST Event Centre, Oshawa (10 Oct) — from June notes; promoter per Midnight is Cheryl Ireland',null,null),
(null,'Cheryl Ireland','Promoter - BOND|ST Event Centre, Oshawa (10 Oct)',null,'cheryl@bondst.ca'),
('1df56712-c083-419b-a4b3-de382618b442','Mary Ditta','Promoter - The Mod Club, Toronto (15 Oct) — Live Nation Canada, Inc., 40 Hanna Ave 3rd floor, Toronto ON M6K 0C3 · office (416) 260-5600','(647) 309-9680','maryditta@livenation.com'),
('6217d465-1ac7-4d67-8c93-4eddb60f0db7','Virginia Clark','Promoter - Broom Factory, Kingston (16 Oct) — Flying V Productions, 40 John St, Kingston ON K7K 1S9','(613) 539-5299','virginiaclark@me.com'),
('7c0e9d80-3854-4c37-974d-903e9fa09b97','Shawn Scallen','Promoter - The 27 Club, Ottawa (17 Oct) — Spectrasonic, Box 57043 RPO Gladstone Ave, Ottawa ON K1R 1A1','(613) 265-1253','scallen@spectrasonic.com'),
('482ed314-b564-4055-bd21-d1e8e89bc3cf','David Mitchell','Promoter - Petit Campus, Montréal (23 Oct) — Blue Skies Turn Black, 5230-A Av du Parc, Montréal QC H2V 4G7','(514) 247-0955','david@blueskiesturnblack.com'),
('e1b660ea-63c8-49e2-abd5-c65c284fa7a1','Mark Enright','Promoter - Neat Cafe, Burnstown (24 Oct)','(613) 371-7974','neatmusicandcoffee@gmail.com'),
(null,'Julia','Venue Contact - Motel Chelsea, Chelsea QC (30 Oct)',null,null),
(null,'Claire Grady-Smith','Venue Contact - Hotel Wolfe Island (31 Oct) — head of media; deal sheet owner',null,'gradysmithclaire@gmail.com'),
(null,'Chris (Hugh Christopher Brown)','Venue Contact - Hotel Wolfe Island (31 Oct)',null,'hchrisbrown@gmail.com'),
(null,'Peter','Venue Contact - Sellers & Newel, Toronto (1 Nov)',null,null);

-- ---------------------------------------------------------------------------
-- SECTION 2 — DRY RUN (read-only): what would change
-- ---------------------------------------------------------------------------
select
  case when p.existing_id is null then 'INSERT' else 'UPDATE' end as action,
  p.date, p.city, p.venue as venue_new, s.venue as venue_current,
  p.type as type_new, s.type as type_current,
  p.doors_time, p.soundcheck_time, p.set_time, p.arrival_time, p.address,
  p.deal_type, p.capacity, p.ticket_price,
  exists (select 1 from settlements x where x.show_id = p.existing_id) as settlement_exists
from seed_shows p left join shows s on s.id = p.existing_id
order by p.date;

-- ---------------------------------------------------------------------------
-- SECTION 3 — APPLY
-- ---------------------------------------------------------------------------
begin;

-- 3a. Tour: reuse existing "Canada" tour (id 0c82a5bd…), rename + extend.
update tours t set
  name = 'Canada 2026',
  start_date = '2026-10-01',
  end_date   = '2026-11-04',
  status     = 'confirmed',
  perdiem_settings    = coalesce(t.perdiem_settings, '{}'::jsonb) || '{"people":"3","days":"35","currency":"CAD"}'::jsonb,
  calculator_settings = coalesce(t.calculator_settings, '{}'::jsonb) || '{"currency":"CAD"}'::jsonb
from seed_ctx c where t.id = c.tour_id;

-- 3b. Tour-level note (no columns exist for legs, timezone, agent, grant, transport).
insert into tour_notes (tour_id, org_id, author_name, content)
select c.tour_id, c.org_id, 'Matt Walters',
E'CANADA 2026 — TOUR BRIEF\nArtist: The Stamps (three-piece, Fremantle WA: Sofia, Scarlett, Rubina)\nDates: 1 Oct – 4 Nov 2026 · Timezone for all shows: America/Toronto · Currency for all fees and ticket prices: CAD\nTravellers: 3 (band only — no tour manager, Matt not travelling)\n\nLEG 1 — Moondoggy Support Run (9 shows, 1–24 Oct): booked through Grant Paley, Midnight Agency (colleague Jake also on correspondence). Billing on all support dates: "Direct Support to Moondoggy". Support fees NOT in the Midnight itinerary (15 June) — chase Grant''s confirmation and fill in the settlement for each show.\nLEG 2 — Headline Tail (4 shows, 30 Oct – 4 Nov): booked direct by Matt, no agent.\n\n$16k WA government touring grant secured.\nGround transport still undecided (van hire for whole run vs Jake''s car for the Moondoggy dates + hire after).\n\nNOT on this tour (dropped): Handsome Daughter, Winnipeg 29 Oct; Lana Lou''s, Vancouver 6–7 Nov; the BC and Alberta headline leg (dropped June).'
from seed_ctx c
where not exists (select 1 from tour_notes n where n.tour_id = c.tour_id and n.content like 'CANADA 2026 — TOUR BRIEF%');

-- 3c. Shows — update the 9 existing rows in place.
update shows s set
  type = p.type, venue = p.venue, city = p.city, country = p.country, address = p.address,
  arrival_time = p.arrival_time, arrival_label = p.arrival_label,
  doors_time = p.doors_time, soundcheck_time = p.soundcheck_time, set_time = p.set_time,
  fee = p.fee, notes = p.notes, deleted_at = null
from seed_shows p where p.existing_id is not null and s.id = p.existing_id;

-- 3d. Shows — insert the 4 headline dates (guarded).
insert into shows (tour_id, org_id, date, type, venue, city, country, address, arrival_time, arrival_label,
                   doors_time, soundcheck_time, set_time, fee, notes)
select c.tour_id, c.org_id, p.date, p.type, p.venue, p.city, p.country, p.address, p.arrival_time, p.arrival_label,
       p.doors_time, p.soundcheck_time, p.set_time, p.fee, p.notes
from seed_shows p cross join seed_ctx c
where p.existing_id is null
  and not exists (select 1 from shows s where s.tour_id = c.tour_id and s.date = p.date and s.venue = p.venue and s.deleted_at is null);

-- 3e. Settlements — one per show (deal / capacity / ticket price / currency CAD). Guarded on show_id.
insert into settlements (tour_id, org_id, show_id, deal_type, deal_type_detail, agreed_amount, currency, status, capacity, ticket_price, notes)
select c.tour_id, c.org_id, s.id, p.deal_type, p.deal_type_detail, null, 'CAD', 'pending', p.capacity, p.ticket_price, p.settlement_notes
from seed_shows p cross join seed_ctx c
join shows s on s.tour_id = c.tour_id and s.date = p.date and s.venue = p.venue and s.deleted_at is null
where not exists (select 1 from settlements x where x.show_id = s.id);

-- 3f. Expenses — Motel Chelsea cost lines named in the deal (amounts TBC).
insert into expenses (tour_id, org_id, show_id, category, description, amount, currency, status, notes)
select c.tour_id, c.org_id, s.id, e.category, e.description, null, 'CAD', 'pending', e.notes
from seed_ctx c
join shows s on s.tour_id = c.tour_id and s.date = '2026-10-30' and s.venue = 'Motel Chelsea' and s.deleted_at is null
cross join (values
  ('accommodation','Motel Chelsea — accommodation at venue (cost line in deal)','Amount TBC. Per performer agreement, accommodation at the venue is a cost line.'),
  ('production','Motel Chelsea — mandatory venue sound tech fee','Amount TBC. Comes out of expenses before the 80/20 door split.')
) e(category, description, notes)
where not exists (select 1 from expenses x where x.show_id = s.id and x.description = e.description);

-- 3g. Contacts — update existing rows in place, insert the new ones (guarded on name).
update contacts k set name = p.name, role = p.role,
  phone = coalesce(p.phone, k.phone), email = coalesce(p.email, k.email), deleted_at = null
from seed_contacts p where p.existing_id is not null and k.id = p.existing_id;

insert into contacts (tour_id, org_id, name, role, phone, email)
select c.tour_id, c.org_id, p.name, p.role, p.phone, p.email
from seed_contacts p cross join seed_ctx c
where p.existing_id is null
  and not exists (select 1 from contacts k where k.tour_id = c.tour_id and lower(k.name) = lower(p.name) and k.deleted_at is null);

commit;

-- ---------------------------------------------------------------------------
-- SECTION 4 — VERIFY
-- ---------------------------------------------------------------------------
select s.date, s.city, s.venue, s.type, s.set_time, x.deal_type, x.capacity, x.ticket_price, x.currency
from shows s left join settlements x on x.show_id = s.id
where s.tour_id = '0c82a5bd-4407-42fe-9de0-eeb75c9b38c0' and s.deleted_at is null
order by s.date;
