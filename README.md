# Bitwhaletrack — Cryptocurrency News Platform

A modern crypto news platform built with Vite, React, TypeScript, Tailwind, and Supabase.

## Quick start

```sh
# 1) Install dependencies
npm ci

# 2) Configure environment
cp .env.example .env
# Edit .env with your Supabase project URL and anon key

# 3) Run locally
npm run dev

# 4) Lint and build
npm run lint
npm run build
```

## Environment variables
Create a `.env` file at the project root:

```bash
VITE_SUPABASE_URL=https://YOUR_PROJECT.supabase.co
VITE_SUPABASE_ANON_KEY=YOUR_SUPABASE_ANON_KEY
```

Notes:
- Never commit real secrets. The Supabase anon key is public for client apps, but still keep it outside source code via envs.
- Production deployments should set these as environment variables in the host platform.

## Security
- No raw SQL is used directly; Supabase client APIs prevent SQL injection.
- Avoid `dangerouslySetInnerHTML` to reduce XSS risk. Sanitize any user-provided content before rendering.
- API keys are loaded from environment variables and not hardcoded in the repo.

## Scripts
- `npm run dev`: Start the development server
- `npm run lint`: Run ESLint
- `npm run build`: Create a production build
- `npm run preview`: Preview the production build

## Tech stack
- React + TypeScript + Vite
- Tailwind CSS + shadcn/ui
- Supabase (Auth, DB, Storage)
