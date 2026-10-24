# MuscleMap AI frontend

The frontend is a React application built with Vite.

## Commands

- `npm start` starts the development server at `http://localhost:3000`.
- `npm test` runs the Vitest suite.
- `npm run build` creates an optimized production build in `dist/`.

Copy `.env.example` to `.env.local` only when local environment overrides are
needed. Variables exposed to the browser must use the `VITE_` prefix. Never put
a Supabase service-role key or an AI-provider key in a frontend variable.

## Judges demo account

On the sign-in screen, judges can enter `demo` as the email and the demo
password provided with the submission. The app resolves `demo` to
`demo@musclemap-ai.example` and signs in through Supabase like a regular user.

Before deploying, create that user in the Supabase Dashboard under
**Authentication → Users → Add user**, set its password to the demo password,
and confirm the user's email. The `.example` domain is reserved and does not
receive email, so the account must be created as confirmed. Keep this account
separate from personal data; anyone with the shared demo credentials can use
it.
