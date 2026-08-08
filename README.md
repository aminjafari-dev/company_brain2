# CompanyBrain Workspace — Engineering Intelligence (Dynamic Free MVP)

React + Vite app that turns the static AI Studio demo into a **dynamic** product:

- **Auth + roles** (Client / PM / Developer / Admin)
- **Persisted workspace data** (requests, chat, Jira mocks, activity, settings)
- **Live overview metrics** computed from stored requests
- **Gemini AI** via a local proxy (API key never in the browser)
- Optional **Supabase Free** (Auth + Postgres) when you add credentials

## Quick start (free local mode — no paid services)

1. Use Node 20+
2. `npm install`
3. Copy env: `cp .env.example .env.local`
4. (Optional) set `GEMINI_API_KEY` in `.env.local` for live AI
5. In one terminal: `npm run ai-server`
6. In another: `npm run dev`
7. Open http://localhost:3000

### Demo login (local mode)

Password for all demo users: `demo1234`

| Role | Email |
|------|--------|
| Admin | admin@CompanyBrain.demo |
| PM | pm@CompanyBrain.demo |
| Developer | dev@CompanyBrain.demo |
| Client | client@CompanyBrain.demo |

Or use the quick role buttons on the login screen.

Data persists in **localStorage** and survives refresh. Use **Settings → Reset demo data** to reseed.

Without `GEMINI_API_KEY` / AI server, chat and analyze still work with an offline fallback.

## Optional: Supabase Free

1. Create a free Supabase project
2. Run SQL in `supabase/migrations/001_schema.sql` then `002_seed.sql`
3. Set in `.env.local`:

```
VITE_SUPABASE_URL=https://YOUR_PROJECT.supabase.co
VITE_SUPABASE_ANON_KEY=your_anon_key
```

4. Create Auth users matching demo emails and link `profiles` rows
5. (Optional) Deploy `supabase/functions/ai-chat` and set `GEMINI_API_KEY` secret

The app prefers Supabase when configured and falls back to local persistence if queries fail.

## Architecture

```
src/
  services/     # domain services (no API calls in views)
  stores/       # Zustand (auth, workspace, ui)
  data/         # seed + localStorage store
  views/        # screens
server/         # Express Gemini proxy (free local)
supabase/       # schema + Edge Function
```

## Security

- Never put `GEMINI_API_KEY` or `service_role` in `VITE_*` vars
- Rotate any key that was previously committed to `.env.example`

## Scripts

| Script | Purpose |
|--------|---------|
| `npm run dev` | Vite frontend (:3000) |
| `npm run ai-server` | Gemini proxy (:8787) |
| `npm run lint` | Typecheck |
| `npm run build` | Production build |
