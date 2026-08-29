# Sailing Logbook

A simple, mobile-first digital sailing logbook. Passwordless email login, private per-user log entries, and running totals — no more, no less.

## Setup

This app uses [Supabase](https://supabase.com) for authentication (magic-link email sign-in) and data storage.

1. **Create a Supabase project** at [supabase.com](https://supabase.com) (free tier is enough).
2. **Run the schema**: open the SQL Editor in your Supabase project and run the contents of [`supabase-schema.sql`](./supabase-schema.sql). This creates the `logs` table and the row-level security policies that keep each user's entries private.
3. **Get your API credentials**: in your Supabase project go to *Project Settings → API* and copy the **Project URL** and the **anon public key**.
4. **Fill in `config.js`** with those two values.
5. **Configure redirect URLs**: in your Supabase project go to *Authentication → URL Configuration* and add the URL(s) where the app is hosted (e.g. `https://<your-username>.github.io/Sailing-App/`) to both the Site URL and the Redirect URLs list. Add `http://localhost:PORT` too if you want to test locally.

## Running it

No build step — just serve the folder statically:

```bash
python3 -m http.server 8000
```

Then visit `http://localhost:8000`.

## How it works

- Enter your email and Supabase sends you a magic sign-in link. Clicking it signs you in, creating your account automatically the first time.
- Each log entry is tied to your account, and Row Level Security in Postgres ensures you can only ever read or edit your own entries.
- The logbook screen shows running totals (total nm, sailing days, night hours, days as skipper) and a chronological list of entries. Tap an entry to view and edit it.

**Note on totals**: "Sailing days" and "days as skipper" are simply counts of log entries (each entry represents one logged day/passage), matching how a traditional paper logbook is kept.
