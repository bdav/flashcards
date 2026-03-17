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

## Lint Rules to Know

- **`react-hooks/set-state-in-effect`**: The ESLint config disallows calling `setState` synchronously inside `useEffect`. Instead of using an effect to reset/sync state, prefer deriving the value, computing it inline, or resetting state inside the event handler/callback that triggers the change.

## TDD Workflow

This project is an exercise in test-driven development. Follow the red-green-refactor cycle:

1. **Write a failing test** for the behavior you're about to implement
2. **Implement the minimal code** to make the test pass
3. **Refactor** while keeping tests green

TDD is most valuable for: CSV parsing, auth helpers, permission/ownership rules, study session logic, stats calculations, API procedure behavior. Be more pragmatic for static presentational components and trivial layout code.

## Current State (MVP Complete)

The full MVP from `implementation-plan.md` is implemented. All 18 planned PRs are delivered. 119 API tests, 103 web tests passing.

### Features

- **Auth**: Email/password signup & login, bcrypt password hashing, session cookies (HTTP-only), protected routes with redirect to `/login`
- **Decks**: Create, list (with summary stats: accuracy, card count, last studied), update name/description, delete with cascade
- **Cards**: Create single cards, CSV import (header validation, whitespace trimming, blank row skipping), update (partial), delete, list by deck
- **Study**: Type-answer flow with server-side grading, flashcard-style UI (front/back), incorrect cards re-queued, multi-attempt tracking with `attemptNumber`, session start/finish lifecycle
- **Stats**: Per-deck stats (first-try accuracy, overall accuracy, per-card avg attempts-to-correct), overall stats (aggregates + weak cards), empty/loading/error states
- **UX Polish**: Loading skeletons, Sonner toast notifications, error boundaries (app root + per-route), seed data (4 decks, 30 cards, 3 study sessions)

### Routes

| Path                   | Page                | Auth      |
| ---------------------- | ------------------- | --------- |
| `/login`               | LoginPage           | Public    |
| `/signup`              | SignupPage          | Public    |
| `/`                    | DeckListPage (home) | Protected |
| `/decks/:deckId`       | StudyPage           | Protected |
| `/decks/:deckId/cards` | DeckCardsPage       | Protected |
| `/decks/:deckId/stats` | DeckStatsPage       | Protected |
| `/stats`               | StatsPage (overall) | Protected |

### tRPC API

All procedures except `auth.*` and `healthCheck` require authentication via `protectedProcedure`. All data procedures enforce ownership (user can only access their own decks/cards/sessions).

| Router  | Procedure                                        | Type     |
| ------- | ------------------------------------------------ | -------- |
| `auth`  | `signup`, `login`, `logout`                      | mutation |
| `auth`  | `me`                                             | query    |
| `deck`  | `create`, `update`, `delete`                     | mutation |
| `deck`  | `getById`, `list`                                | query    |
| `card`  | `create`, `update`, `delete`, `importCsv`        | mutation |
| `card`  | `listByDeck`                                     | query    |
| `study` | `startSession`, `submitAttempt`, `finishSession` | mutation |
| `study` | `getSession`                                     | query    |
| `stats` | `deckStats`, `overallStats`                      | query    |

### Key Services

- **`answerGrader.ts`**: Tier 1 deterministic grading — normalizes answers (lowercase, strip diacritics/punctuation, trim whitespace) and compares. Designed for future extension with embedding similarity (Tier 2) and local LLM adjudication (Tier 3). See `implementation-plan.md` "Future Enhancement" section.

### Data Model

Five models in `prisma/schema.prisma`: `User`, `Deck`, `Card`, `StudySession`, `CardAttempt`. `AttemptResult` enum (`CORRECT`/`INCORRECT`). Cascade deletes on all parent relationships. Composite index on `[studySessionId, cardId]` for attempt lookups.

### Testing Patterns

- **API tests** use isolated per-suite SQLite databases via `apps/api/src/test-helpers.ts` — each test suite gets its own DB, Prisma client, and tRPC caller
- **Web tests** use Vitest + React Testing Library with mocked tRPC hooks
- **Seed data** is idempotent (`deleteMany` before re-seeding)

## Implementation Plan

See `implementation-plan.md` for the original plan, PR breakdown, and design decisions. The plan is fully delivered. Future work is post-MVP.

### Post-MVP Enhancement Ideas

- **AI answer grading**: 3-tier pipeline (deterministic → embedding similarity → local LLM). Architecture detailed in `implementation-plan.md`
- **Spaced repetition**: `CardProgress` model with ease/streak/dueAt fields
- **PostgreSQL deployment**: Schema is Postgres-ready, swap adapter + connection string
- **E2E tests**: Playwright for core user journeys
- **Deck sharing / public marketplace**
- **Import preview before commit**
