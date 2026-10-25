# MuscleMap AI frontend

The frontend is a React application built with Vite.

## Commands

- `npm start` starts the development server at `http://localhost:3000`.
- `npm test` runs the Vitest suite.
- `npm run build` creates an optimized production build in `dist/`.

Copy `.env.example` to `.env.local` only when local environment overrides are
needed. Variables exposed to the browser must use the `VITE_` prefix. Never put
a Supabase service-role key or an AI-provider key in a frontend variable.
For the demo login, `VITE_DEMO_ACCOUNT_EMAIL` is optional. It defaults to the
confirmed Supabase email that `demo` maps to; set it only to override that
address.

## Judges demo account

The deployed app maps the username `demo` to a confirmed Supabase account, so
judges can sign in with `demo` and the shared demo password without any extra
configuration. To point the alias at a different account, set the frontend
environment variable `VITE_DEMO_ACCOUNT_EMAIL` in the hosting provider and
redeploy. The app signs in through Supabase normally.

Keep the demo account separate from personal data; anyone with the shared
credentials can use it.
