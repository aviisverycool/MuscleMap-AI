# MuscleMap AI

MuscleMap AI is a React frontend with a FastAPI backend. The repository is
configured as one Vercel Services project:

- `/api/*` is handled by `musclemapai-backend`.
- Every other route is handled by `musclemapai-frontend`.
- The production frontend uses the same-origin `/api` path, so Vercel preview
  URLs and custom domains require no API URL changes.

## Deploy to Vercel

1. Import this repository into Vercel with the repository root as the Root
   Directory.
2. In **Project Settings > Build and Deployment**, select **Services** as the
   Framework Preset if Vercel has not selected it automatically.
3. Add `GROQ_API_KEY` in **Project Settings > Environment Variables** for
   Production, Preview, and Development as appropriate.
   The backend uses Groq's free tier and defaults to `openai/gpt-oss-120b`.
   It automatically falls back to `openai/gpt-oss-20b` when the primary model
   is unavailable. You can override these with `GROQ_MODEL` and
   `GROQ_FALLBACK_MODEL`, and tune reasoning with
   `GROQ_REASONING_EFFORT` (`low`, `medium`, or `high`). If no Groq key is
   present, the backend can still use `CEREBRAS_API_KEY` as a paid fallback.
4. Add `SUPABASE_URL`, `SUPABASE_PUBLISHABLE_KEY`, and
   `SUPABASE_SERVICE_ROLE_KEY` to the backend service. These are required for
   API token validation, account deletion, owner-scoped memory, and shared rate
   limiting. Apply `musclemapai-backend/supabase_schema.sql` to the same
   Supabase project before deploying. Never expose the service-role key through
   a `VITE_*` variable.
   Backend memory is scoped to each conversation. Deleting a conversation
   removes its profile, hidden model history, and pending follow-up state.
   Injury details expire automatically based on a finite recovery-oriented
   retention window; expiry is a privacy rule, not a medical determination.
5. Set `ALLOWED_ORIGINS` only when a separate frontend origin must call the
   backend. Use complete, comma-separated origins; do not use wildcards. The
   normal Vercel deployment uses same-origin `/api` and needs no production
   entry.
6. Deploy. The health endpoint will be available at `/api`. Every chat, title,
   conversation-deletion, and account-deletion endpoint requires a valid
   Supabase bearer token.

For email verification, set **Supabase > Authentication > URL Configuration >
Site URL** to the deployed app URL and add that URL under **Redirect URLs**.
The frontend sends the current app origin as the verification return URL. Set
`VITE_SITE_URL` to a canonical production URL if verification should
always return to one domain.

The frontend's existing public Supabase URL and publishable key remain as
fallbacks. You can override them at build time with
`VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY`.

## Required security setup

- In Supabase Authentication settings, require email confirmation, set the
  minimum password length to at least 12, enable leaked-password protection,
  and enable CAPTCHA for sign-up and sign-in.
- Run `musclemapai-backend/supabase_schema.sql` after every policy change. It
  enables RLS for user conversations and removes browser access to backend-only
  health memory and rate-limit tables.
- Revoke the Cerebras credential that appeared in commit `208e660`, even though
  the `.env` file was removed later. Replace any matching Vercel variable with a
  newly generated credential.
- Keep Vercel Deployment Protection enabled until the SQL migration and all
  required environment variables are present.

## Run locally

Copy the backend environment example and add your secret:

```bash
cp musclemapai-backend/.env.example musclemapai-backend/.env
./start-all.sh
```

The frontend runs at `http://localhost:3000` and calls the backend at
`http://localhost:8000/api`.

## Build

```bash
npm run build
```
