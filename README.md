This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app), configured for static export via [Capacitor](https://capacitorjs.com) so it can also ship as a native iOS/Android app.

## Getting Started

### 1. Supabase

The app has no server of its own (static export), so auth, database and photo storage live in [Supabase](https://supabase.com).

1. Create a project at supabase.com.
2. Open **SQL Editor** and run each file in [`supabase/migrations/`](./supabase/migrations/) once, in filename order:
   - [`20260927000000_init.sql`](./supabase/migrations/20260927000000_init.sql): tables, Row Level Security (each couple only sees its own data), the invite RPCs, the private `photos` storage bucket and the built-in quiz questions.
   - [`20261003000000_couple_features.sql`](./supabase/migrations/20261003000000_couple_features.sql): notes, moods, daily question, lists, goals, special dates, date ideas, time capsule (with its private `capsules` bucket) and the "on this day" RPC.
3. In **Authentication → URL Configuration**, set the Site URL to your web URL and add `http://localhost:3000/**` (plus your production URL) to the redirect allow-list, so email confirmation links land back in the app.
4. Copy `.env.example` to `.env.local` and fill in the project URL and publishable key from **Project Settings → API Keys** (a legacy `NEXT_PUBLIC_SUPABASE_ANON_KEY` also works).

### 2. Run

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Features

| Route | What it does |
| --- | --- |
| `/cadastro`, `/entrar` | Sign up / sign in (email + password) |
| `/onboarding` | Create the couple (relationship start date) and get the invite link |
| `/convite/?token=…` | Partner opens the invite, creates an account and joins the couple |
| `/inicio` | Live "together for" counter, partner's latest note, mood of the day, question of the day, upcoming special dates, next date, "on this day" memories, latest moments |
| `/calendario` | Month calendar of moments you lived together, plus scheduled dates, special dates and both moods |
| `/dates` | Date planner; marking one done turns it into a calendar moment. The "Ideias" tab has a roulette over built-in and saved ideas, filtered by home/out and budget |
| `/quiz` | Each partner answers questions about themselves (built-in or custom); the other guesses. Rounds also include questions generated from calendar moments |
| `/album` | Shared photo album with "special moment" stars; photos are compressed client-side and served via signed URLs |
| `/mais` | Entry point to everything below |
| `/recados` | Notes to your partner; a note can be scheduled to appear on a future day |
| `/pergunta` | Question of the day; your partner's answer stays hidden until you answer too (enforced by RLS) |
| `/listas` | Shared lists (movies, restaurants, trips, groceries…); done items can become calendar moments |
| `/metas` | Couple bucket list with progress; realizing a goal creates a moment and an optional special photo |
| `/datas` | Special dates (birthdays, proposal…) with countdown; yearly ones repeat and show up in the calendar |
| `/historia` | Timeline of moments and special photos since the start date |
| `/capsula` | Time capsule: the message and photo are unreadable by anyone, author included, until the opening date |
| `/perfil` | Edit name and start date, invite partner, sign out |

All data access goes through the browser Supabase client; security is enforced by the RLS policies in the migration, not by the frontend.

## Project structure

This repo (`web`) is one of three sibling repos that make up the product:

```
JUST2OFUS/
├── web/       <- this repo (Next.js source of truth)
├── ios/       <- native Xcode project (Capacitor)
└── android/   <- native Android Studio project (Capacitor)
```

The native projects live outside this repo and are configured in [`capacitor.config.ts`](./capacitor.config.ts) via `ios.path: '../ios'` and `android.path: '../android'`. Each native project is its own git repository.

## Native build workflow

Because `output: 'export'` is set in [`next.config.ts`](./next.config.ts), `next build` produces a fully static site in `out/` that Capacitor copies into the native projects.

1. Build the web app:
   ```bash
   npm run build
   ```
2. Copy the new web assets into the native projects (`../ios`, `../android`):
   ```bash
   npx cap sync
   ```
3. Open and run the native project:
   ```bash
   npx cap open ios      # requires Xcode
   npx cap open android  # requires Android Studio
   ```

Any change to the web app that should reach the apps needs steps 1–2 repeated, then the native repos (`../ios`, `../android`) commit the updated generated files.

## Learn More

- [Next.js Documentation](https://nextjs.org/docs)
- [Capacitor Documentation](https://capacitorjs.com/docs)
