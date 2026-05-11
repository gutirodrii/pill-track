# Pill Track

Mobile-first medication tracking app built with Next.js, Supabase, and Vercel.

## Local Setup

1. Create a Supabase project.
2. Run `supabase/migrations/001_pill_track_schema.sql` in the Supabase SQL editor.
3. Copy `.env.example` to `.env.local` and fill in:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`
4. Install dependencies and run the app:

```bash
npm install
npm run dev
```

## Deployment

Deploy to Vercel as a Next.js project and add the same environment variables in Vercel project settings.
