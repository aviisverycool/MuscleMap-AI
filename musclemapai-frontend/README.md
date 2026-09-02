# MuscleMap AI frontend

The frontend is a React application built with Vite.

## Commands

- `npm start` starts the development server at `http://localhost:3000`.
- `npm test` runs the Vitest suite.
- `npm run build` creates an optimized production build in `dist/`.

Copy `.env.example` to `.env.local` only when local environment overrides are
needed. Variables exposed to the browser must use the `VITE_` prefix. Never put
a Supabase service-role key or an AI-provider key in a frontend variable.
