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

Set the frontend environment variable `VITE_DEMO_ACCOUNT_EMAIL` to a valid
email address you control. Do not use a placeholder domain such as `.example`;
it is reserved and cannot receive confirmation emails. Create a Supabase user
with that same email, set its password to the demo password, and confirm the
account. In the deployed frontend, set the variable in the hosting provider and
redeploy. Judges can then enter `demo` and the demo password; the app maps
`demo` to the configured address and signs in through Supabase normally.

Keep the demo account separate from personal data; anyone with the shared
credentials can use it.
