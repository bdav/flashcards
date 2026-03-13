# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Flashcard study app — pnpm monorepo with a React frontend (`apps/web`) and Express/tRPC backend (`apps/api`), using Prisma with SQLite (local dev; Postgres is the future production target). The project follows a TDD-oriented development approach outlined in `implementation-plan.md`.

## Commands

### Development
- `pnpm dev` — start both API (port 3001) and web (port 5173) concurrently
- `pnpm dev:api` — start API server only
- `pnpm dev:web` — start web dev server only

### Testing
- `pnpm --filter web test` — run web Vitest tests
- `pnpm --filter web test:watch` — run web tests in watch mode
- `pnpm --filter api test` — run API Vitest tests

### Web App (`apps/web`)
- `pnpm --filter web build` — production build (`tsc -b && vite build`)
- `pnpm --filter web lint` — run ESLint

### Database
- `pnpm prisma migrate dev` — run migrations
- `pnpm prisma generate` — regenerate Prisma client

### Environment Variables
- `DATABASE_URL` — SQLite connection string (default: `file:./dev.db`), defined in `.env`

## Architecture

**Frontend** (`apps/web/src/`): Vite + React 19 + TypeScript. Uses React Router for routing (`router.tsx`), TanStack Query for server state (`providers.tsx`), Tailwind CSS + shadcn/ui for styling. Path alias `@/*` maps to `src/*`.

**Backend** (`apps/api/src/`): Express 5 + tRPC + Zod validation. Entry point is `server.ts` (port 3001). Prisma client initialized in `db.ts` using better-sqlite3 adapter. All tRPC procedure inputs must be validated with Zod schemas.

**Database**: SQLite via Prisma ORM (local dev). Schema in `prisma/schema.prisma`, database file at `dev.db`. Config in `prisma.config.ts`. Production target is PostgreSQL — avoid SQLite-specific behavior in application code.

**Communication**: tRPC provides end-to-end type safety between frontend and backend. No REST API beyond the `/health` check endpoint.

**Both apps use ES modules** (`"type": "module"`). The API runs TypeScript directly via `tsx`.

## TDD Workflow

This project is an exercise in test-driven development. Follow the red-green-refactor cycle:

1. **Write a failing test** for the behavior you're about to implement
2. **Implement the minimal code** to make the test pass
3. **Refactor** while keeping tests green

TDD is most valuable for: CSV parsing, auth helpers, permission/ownership rules, study session logic, stats calculations, API procedure behavior. Be more pragmatic for static presentational components and trivial layout code.

## Implementation Plan

See `implementation-plan.md` for the full plan, PR breakdown, and implementation order. Key points:

- **Auth is deferred.** The first pass builds a single-user app with no login. A seed user is used implicitly by all procedures. Auth wraps around the app later.
- **Backend PRs land before frontend PRs** so the UI builds on real APIs.
- **Build vertical slices** — each PR is a focused, reviewable unit delivering end-to-end functionality.
- **tRPC routers** are organized by domain: auth, deck, card, study, stats.
