# stamps land

Community app for The Stamps - Sofia, Scarlett & Rubina.

## Setup

### 1. Create a Supabase project
- Go to [supabase.com](https://supabase.com) and create a new project
- Go to SQL Editor and run `supabase-schema.sql`
- Go to Authentication > Providers and enable Google (optional)

### 2. Environment variables
- Copy `.env.local.example` to `.env.local`
- Fill in your Supabase URL and anon key from Settings > API

### 3. Run locally
```
npm install
npm run dev
```

### 4. Deploy to Vercel
- Push to GitHub
- Import in Vercel
- Add environment variables in Vercel project settings

## Tech
- Next.js 14
- Supabase (auth, database, storage)
- Deployed on Vercel
