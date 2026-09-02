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
4. For durable backend memory, also add `SUPABASE_URL` and
   `SUPABASE_SERVICE_ROLE_KEY`, then apply
   `musclemapai-backend/supabase_schema.sql` to that Supabase project. Never
   expose the service-role key through a `REACT_APP_*` variable.
   Backend memory is scoped to each conversation. Deleting a conversation
   removes its profile, hidden model history, and pending follow-up state.
   Injury details expire automatically based on a finite recovery-oriented
   retention window; expiry is a privacy rule, not a medical determination.
5. Deploy. The health endpoint will be available at `/api`.

For email verification, set **Supabase > Authentication > URL Configuration >
Site URL** to the deployed app URL and add that URL under **Redirect URLs**.
The frontend sends the current app origin as the verification return URL. Set
`REACT_APP_SITE_URL` to a canonical production URL if verification should
always return to one domain.

The frontend's existing public Supabase URL and publishable key remain as
fallbacks. You can override them at build time with
`REACT_APP_SUPABASE_URL` and `REACT_APP_SUPABASE_ANON_KEY`.

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
