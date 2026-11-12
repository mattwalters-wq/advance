# Advance

Tour management for artist managers: organise artists, shows, travel, accommodation, contacts and tour documents.

## Local development

1. Install dependencies with `npm ci`.
2. Copy `.env.example` to `.env.local` and supply the existing Advance Supabase project's URL and public anon key. Server features also require the service role key, Anthropic API key and Resend configuration described in that file. Never expose server keys through `NEXT_PUBLIC_` variables.
3. Run `npm run dev` and open `http://localhost:3000`.

**Database note:** `supabase-schema.sql` is a legacy community-app schema, not a complete Advance migration. Do not apply it to provision or replace an Advance database. This checkout relies on the existing Advance tables and row-level security policies; a clean-install migration is not included.

## Workspace

- **Overview:** roster, upcoming events and travel for the next 30 calendar days, and missing venue, stage-time, route or departure-time details for the next 7 days. These checks describe recorded details, not confirmed booking status.
- **Calendar:** Monday-first month view, selected-day details, agenda view, artist/type filters and Today navigation. Times remain local to the source itinerary; date-only values are not converted through UTC.
- **Search:** artists, show venues/cities/notes, travel details and contacts. Searches are debounced, cancel superseded requests and show up to 50 matches per category. Use Command/Ctrl+K from a workspace page.
- **Tour links:** `?tour=<tour-id>` opens the specific tour if it belongs to the selected artist.
- **Import review:** review incoming tour changes before applying selected records and fields.

The workspace reads through the signed-in Supabase client and existing RLS policies. Admin roster links retain their organisation context. It does not add a database migration or change permissions.

## Verification

```sh
npm test
npm run typecheck
npm run build
```

Tests cover import review authorization, concurrency and retries, plus date boundaries, calendar layout, agenda scoping, missing-details checks, tour links and literal search escaping. A production build requires the public Supabase environment variables; use real project values for deployment. Local fixture credentials are not deployment configuration.

## Stack

Next.js 14 App Router, React 18, TypeScript, Supabase, Anthropic and Resend. The workspace uses native responsive CSS and the existing Bricolage Grotesque, Instrument Sans and IBM Plex Mono font stack.
