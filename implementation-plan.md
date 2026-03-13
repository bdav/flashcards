# Flashcard App — Implementation Plan (TDD-Oriented)

## Project Summary

Build a modern full-stack flashcard study web app where users can:

- create an account
- upload a CSV of flashcards
- browse decks and cards
- study a deck
- record study results
- view simple performance stats
- later evolve toward spaced repetition

This project is optimized for:

- practicing full-stack product engineering
- using a modern 2026-relevant stack
- making the project an exercise in test-driven development
- keeping initial scope small enough to finish
- leaving room for future portfolio expansion

---

## Chosen Stack

### Frontend

- React
- TypeScript
- Vite
- React Router
- Tailwind CSS
- shadcn/ui
- TanStack Query

### Backend

- Node.js
- TypeScript
- tRPC
- Prisma

### Database

- SQLite (local dev, via better-sqlite3 adapter)
- PostgreSQL (future production target)

### Repo / Package Management

- pnpm workspaces

---

## Why This Stack

- **Vite + React + TypeScript** gives a fast, modern SPA workflow.
- **React Router** is the standard routing choice for a Vite React app.
- **TanStack Query** handles server state, caching, loading states, and mutations.
- **tRPC** gives end-to-end type safety without GraphQL ceremony.
- **Prisma + SQLite** gives zero-config local dev; Postgres remains the production target.
- **pnpm workspaces** keeps frontend and backend in one repo with clean boundaries.

We are explicitly **not** using:

- GraphQL
- Relay
- Redux
- Next.js
- multiple repos

The goal is a clean, practical full-stack architecture, not maximum framework complexity.

---

## Repo Strategy

Use a single pnpm monorepo.

### Proposed Structure

```text
flashcards/
  apps/
    web/
    api/
  prisma/
  tests/
  package.json
  pnpm-workspace.yaml
  tsconfig.base.json
  README.md
  .gitignore
```

### Directory Roles

#### `apps/web`

- Vite React SPA
- routes
- pages
- components
- API client wiring
- query client wiring

#### `apps/api`

- Node server
- tRPC routers
- auth/session logic
- business logic
- CSV import logic

#### `prisma`

- schema
- migrations
- seed script

#### `tests`

- integration-style tests
- cross-layer tests
- shared test helpers if needed

We intentionally avoid premature packages like:

```text
packages/ui
packages/types
packages/config
apps/worker
```

Those can be added later if real reuse appears.

---

## Architecture Overview

```text
React SPA (apps/web)
  -> tRPC client + TanStack Query
  -> Node API (apps/api)
  -> Prisma
  -> PostgreSQL
```

### Responsibilities

#### Frontend

Owns:

- routing
- page layout
- auth screens
- deck browsing UI
- import UI
- study UI
- stats UI
- calling typed tRPC procedures

#### Backend

Owns:

- auth and session logic
- input validation
- CSV parsing and validation
- deck/card CRUD
- study session writes
- stats queries
- all DB access

#### Database

Owns:

- schema
- migrations
- relational integrity

---

## Product Scope

### MVP Features

User can:

- sign up
- log in
- create decks
- upload a CSV of cards
- browse decks
- open a deck
- study cards one at a time
- reveal the answer
- mark correct / incorrect
- view simple performance stats

### Explicitly Out of Scope for MVP

Do **not** build these in the first version:

- advanced spaced repetition algorithm
- collaboration
- deck sharing
- public deck marketplace
- AI card generation
- offline mode
- mobile app
- heavy analytics
- notifications

---

## Routing Plan

Use React Router.

### Initial Routes

```text
/                  Dashboard
/login             Login
/signup            Signup
/decks             Deck list
/decks/:deckId     Deck detail
/decks/:deckId/study
/import            Import flow
/stats             Stats overview
```

### Route Structure Guidance

- public auth routes live outside the main authenticated shell
- app routes live inside a shared authenticated layout
- keep route count small in MVP

---

## Data Model

Start simple.

### User

```text
id
email
passwordHash
createdAt
updatedAt
```

### Deck

```text
id
userId
name
description nullable
createdAt
updatedAt
```

### Card

```text
id
deckId
front
back
createdAt
updatedAt
```

### StudySession

```text
id
userId
deckId
startedAt
endedAt nullable
```

### CardAttempt

```text
id
studySessionId
cardId
result
createdAt
```

### Relationships

- User has many Decks
- Deck has many Cards
- User has many StudySessions
- Deck has many StudySessions
- StudySession has many CardAttempts
- Card has many CardAttempts

### Future Model, Not MVP

Later, if spaced repetition becomes real, add something like:

```text
CardProgress
```

That could track:

- ease
- streak
- dueAt
- miss count
- last reviewed time

Do not add this now.

---

## CSV Format

### Accepted MVP Format

```csv
front,back
Capital of France,Paris
2 + 2,4
```

### CSV Rules

- require a header row
- require exactly `front` and `back`
- ignore blank rows
- trim whitespace
- reject rows missing either field
- return clear validation errors

### Later Nice-to-Haves

- import preview before commit
- alternate headers
- multiline support
- duplicate detection
- optional tags column

---

## API Design

Use tRPC routers organized by domain.

### Routers

```text
authRouter
deckRouter
cardRouter
studyRouter
statsRouter
```

### Example Procedures

#### `authRouter`

```text
signup
login
logout
me
```

#### `deckRouter`

```text
list
getById
create
update
delete
```

#### `cardRouter`

```text
listByDeck
create
update
delete
importCsv
```

#### `studyRouter`

```text
startSession
submitAttempt
finishSession
getSession
```

#### `statsRouter`

```text
deckStats
overallStats
```

### API Principles

- validate all inputs with Zod
- keep procedures narrow and explicit
- require auth where appropriate
- enforce ownership checks server-side
- keep DB access on the server only
- prefer server-derived stats over duplicated client computation

---

## Frontend State Strategy

### Use TanStack Query For

- current user bootstrap
- deck list fetching
- deck detail fetching
- CSV import mutation
- study session start / finish
- card attempt submission
- stats fetching

### Use Local Component State For

- current card index
- reveal/hide answer state
- form inputs
- local UI toggles
- transient errors

### Avoid

- Redux
- custom global stores
- mirroring server state in local state unnecessarily

---

## Authentication Plan

Use simple email/password auth with cookie sessions.

### Flow

1. user signs up with email + password
2. backend hashes password
3. backend creates session
4. session stored in HTTP-only cookie
5. frontend calls `auth.me` to bootstrap current user

### Auth Rules

- protect all deck/study/stats routes
- users only access their own decks and study data
- never trust user IDs from the frontend
- all authorization checks happen on the server

---

## UI Plan

Use Tailwind + shadcn/ui.

### Initial Pages

#### Dashboard

- quick summary
- recent decks
- primary actions

#### Deck List Page

- list of decks
- create deck action
- import action

#### Deck Detail Page

- deck title
- card count
- card preview/list
- start study action

#### Import Page

- create or choose deck
- upload CSV
- validation messages
- import success/failure state

#### Study Page

- show one card at a time
- reveal answer button
- mark correct / incorrect
- simple progress indicator

#### Stats Page

- total attempts
- percent correct
- per-deck summary

### UI Priorities

- clean and simple
- obvious empty states
- obvious loading states
- obvious error states
- good usability over visual flourish

Do not overdesign the visual system in MVP.

---

## Folder Structure Details

### `apps/web`

```text
apps/web/
  src/
    app/
    components/
    features/
      auth/
      decks/
      import/
      study/
      stats/
    hooks/
    lib/
    pages/
    routes/
    main.tsx
    App.tsx
```

### Suggested `apps/web` Conventions

- `features/` holds domain-specific UI + hooks
- `components/` holds reusable generic UI
- `lib/` holds helpers, query client, API client, utils
- `pages/` holds route-level components
- `routes/` holds router config

### `apps/api`

```text
apps/api/
  src/
    server.ts
    app.ts
    routers/
      index.ts
      auth.ts
      deck.ts
      card.ts
      study.ts
      stats.ts
    middleware/
    services/
    auth/
    lib/
```

### Suggested `apps/api` Conventions

- `routers/` for tRPC route definitions
- `services/` for reusable business logic
- `auth/` for password/session code
- `middleware/` for auth guards and request context
- `lib/` for general helpers

### `prisma`

```text
prisma/
  schema.prisma
  migrations/
  seed.ts
```

### `tests`

```text
tests/
  integration/
  e2e/
  helpers/
```

Keep this lightweight. Do not over-architect the test folders.

---

## TDD Strategy

This project should be implemented as an exercise in test-driven development.

### TDD Loop

```text
1. Write a failing test
2. Implement the smallest amount of code to pass
3. Refactor while keeping tests green
```

### TDD Philosophy for This Project

- write tests before implementation whenever practical
- focus first on business logic and boundaries
- do not let TDD become ceremony for trivial presentational code
- prioritize tests around behavior, not implementation details
- keep the red-green-refactor cycle tight

### Where TDD Is Most Valuable Here

TDD is especially valuable for:

- CSV parsing
- auth helpers
- permission/ownership rules
- study session logic
- stats calculations
- API procedure behavior
- critical route protection

### Where TDD Can Be Lighter

Be more pragmatic for:

- static presentational components
- simple wrappers
- trivial layout code
- shadcn/Tailwind composition with no real logic

---

## Testing Stack

Recommended tools:

- Vitest
- React Testing Library
- Supertest or HTTP-level API tests
- Prisma test database
- optionally Playwright later for a few critical end-to-end flows

### Test Types

#### Unit Tests

Test pure logic:

- CSV parsing and validation
- password helper behavior
- stats calculations
- study progression logic
- mapper/helper functions

#### API / Integration Tests

Test backend behavior:

- signup
- login
- protected procedure access
- deck creation
- CSV import
- study session flow
- stats retrieval
- ownership enforcement

#### Frontend Component / Flow Tests

Test UI behavior where it matters:

- login form submission
- protected route redirect
- import flow states
- study card reveal and answer marking

#### E2E Tests

Add a small number later for core user journeys:

- sign up
- create deck
- import CSV
- study a deck
- view stats

Do not begin with lots of E2E tests.

---

## TDD Test Priorities by Layer

### First Priority: Pure Domain Logic

Start with test-first development for the logic that is easiest to isolate and highest value:

1. CSV parser
2. auth/password helpers
3. study result calculation
4. stats aggregation

### Second Priority: Backend Procedure Behavior

Then add tests for:

1. signup/login behavior
2. session enforcement
3. deck CRUD with ownership
4. CSV import into a deck
5. study session persistence

### Third Priority: Frontend User Flows

Then add tests for:

1. login redirect behavior
2. import page states
3. study interaction flow
4. stats page success/error/empty states

---

## Suggested TDD Conventions

### Naming

Use behavior-oriented test names, for example:

```text
returns validation errors when csv headers are incorrect
rejects deck access when the deck belongs to another user
marks session complete when finishSession is called
shows answer after reveal button is clicked
```

### Style

- one behavior per test when practical
- keep tests short and intention-revealing
- avoid asserting on incidental implementation details
- prefer black-box assertions over internal state peeking

### Test Data

Create small factories/builders for:

- user
- deck
- card
- study session

Keep them simple and explicit.

---

## Implementation Order — PR Breakdown

Build vertical slices in TDD fashion. Each PR should be a focused, reviewable unit.
Backend PRs land before their corresponding frontend PRs so the UI can build on real APIs.

Auth is deferred. The first pass builds a single-user app with no login — just decks, cards,
study, and stats working end-to-end. Auth wraps around it later.

The schema includes a User model from the start (to avoid a painful migration later), but
procedures don’t require authentication until the auth PRs land. A seed user is created on
first migration and used implicitly by all procedures.

---

### PR 1: Monorepo Skeleton

**Scope:** Repo infrastructure only — no app code yet.

- initialize git repo
- configure pnpm workspace
- root `package.json` with workspace scripts
- root `tsconfig.base.json`
- `.gitignore`
- `README.md` skeleton

**Definition of Done:**

- `pnpm install` works
- repo structure matches the plan

---

### PR 2: API App Scaffold

**Scope:** Minimal `apps/api` that starts and has a passing test.

- create `apps/api` with TypeScript + Vitest
- add a basic Express or standalone HTTP server entry point
- scaffold tRPC with a health check procedure
- add one passing test (health check returns OK)

**Definition of Done:**

- `pnpm dev:api` starts the server
- `pnpm --filter api test` passes

---

### PR 3: Web App Scaffold

**Scope:** Minimal `apps/web` that starts and has a passing test.

- create `apps/web` with Vite + React + TypeScript
- install Tailwind CSS and shadcn/ui
- install React Router, TanStack Query
- add Vitest + React Testing Library
- wire tRPC client to API
- add one passing test (app renders)

**Definition of Done:**

- `pnpm dev:web` starts the dev server
- `pnpm --filter web test` passes

---

### PR 4: Database + Prisma Setup

**Scope:** Prisma schema with all models, connected to SQLite (local dev). Seed data for pre-auth development
including a sample deck with cards so the study flow can be built immediately.

- add Prisma with `prisma.config.ts`
- define full schema (User, Deck, Card, StudySession, CardAttempt)
- run first migration
- add seed script that creates a default dev user, a sample deck, and sample cards
- wire Prisma client into API context
- add integration test proving DB connection works

**Definition of Done:**

- migration succeeds against local SQLite
- `pnpm db:seed` creates the dev user, a deck, and cards
- integration test passes

---

### PR 5: Study Flow — Backend

**Scope:** Study session and card attempt procedures on the API side. Uses the seed deck.
Also includes a minimal deck `getById` procedure so the study page can fetch deck + cards.

**TDD Sequence — write tests first for:**

1. fetching a deck by ID returns the deck with its cards
2. starting a session creates a StudySession record
3. submitting a correct attempt stores result
4. submitting an incorrect attempt stores result
5. finishing a session sets `endedAt`
6. `getSession` returns session with attempts

**Tasks:**

- implement `deckRouter.getById` (just this one procedure — full CRUD comes later)
- implement `studyRouter` with startSession/submitAttempt/finishSession/getSession
- hardcode the seed user ID in the tRPC context for now

**Definition of Done:**

- all study API tests pass
- attempts and sessions are persisted correctly
- can fetch a deck with its cards

---

### PR 6: Study Flow — Frontend

**Scope:** Study page UI for studying cards in a deck. Minimal navigation to reach it.

**Tasks:**

- create a simple home page that links to the seed deck
- create study page at `/decks/:deckId/study`
- show one card at a time (front only)
- reveal answer button
- correct / incorrect buttons after reveal
- progress indicator (e.g., "3 of 12")
- session complete state

**Tests:**

- card front is shown initially, answer is hidden
- clicking reveal shows the answer
- correct/incorrect buttons submit attempts

**Definition of Done:**

- user can study through all cards in the seed deck
- attempts are recorded
- session completes when all cards are done

**This is the naive MVP checkpoint.** At this point the core study loop works:
open app -> study seed deck -> record results.

---

### PR 7: Stats — Backend

**Scope:** Stats aggregation queries on the API side.

**TDD Sequence — write tests first for:**

1. deck stats returns total attempts and percent correct
2. overall stats aggregates across all decks
3. stats handle zero-attempt case gracefully

**Tasks:**

- implement `statsRouter` with deckStats/overallStats procedures

**Definition of Done:**

- all stats tests pass
- stats are accurate

---

### PR 8: Stats — Frontend

**Scope:** Stats page UI.

**Tasks:**

- create stats page at `/stats`
- show overall stats (total attempts, percent correct)
- show per-deck summary table
- empty state when no study sessions exist
- add nav links between home, study, and stats

**Tests:**

- stats page renders data correctly
- empty state renders when no data

**Definition of Done:**

- user can view their study performance
- stats page handles empty and populated states

---

### PR 9: Deck CRUD — Backend

**Scope:** Full deck creation, listing, update, and delete on the API side.

**TDD Sequence — write tests first for:**

1. creating a deck
2. listing all decks
3. updating a deck
4. deleting a deck

**Tasks:**

- expand `deckRouter` with list/create/update/delete procedures
  (getById already exists from PR 5)

**Definition of Done:**

- all deck CRUD tests pass

---

### PR 10: Deck CRUD — Frontend

**Scope:** Deck list page, deck detail page, create deck UI.

**Tasks:**

- create deck list page at `/decks` (replace the simple home page)
- create deck detail page at `/decks/:deckId` showing cards and a study button
- add create deck form/modal
- wire TanStack Query to deck procedures

**Tests:**

- deck list renders decks
- empty state shows when no decks exist

**Definition of Done:**

- user can create a deck and see it in the list
- user can open a deck detail page and start studying from it

---

### PR 11: CSV Import — Backend

**Scope:** CSV parser + import procedure on the API side.

**TDD Sequence — write tests first for:**

1. valid CSV with `front,back` headers parses successfully
2. CSV with wrong headers is rejected
3. rows missing `front` or `back` are rejected
4. blank rows are ignored
5. whitespace is trimmed
6. parsed rows are persisted as cards on a deck

**Tasks:**

- implement CSV parser as a pure function
- implement `cardRouter.importCsv` procedure
- implement `cardRouter.listByDeck` procedure

**Definition of Done:**

- CSV parser unit tests pass
- import procedure integration tests pass
- cards are persisted and retrievable by deck

---

### PR 12: CSV Import — Frontend

**Scope:** Import page UI for uploading a CSV to a deck.

**Tasks:**

- create import page at `/import`
- deck selector (create new or choose existing)
- file upload input
- validation error display
- success state with link to deck

**Tests:**

- import page shows validation errors for bad CSV
- success state renders after import

**Definition of Done:**

- user can upload a CSV and see cards appear on the deck detail page
- invalid CSVs show clear error messages

---

### PR 13: Auth — Backend

**Scope:** Signup, login, logout, session management on the API side.

**TDD Sequence — write tests first for:**

1. password hashing helper (hash + verify)
2. signup creates a user and returns a session
3. login succeeds with correct credentials
4. login rejects invalid credentials
5. `me` procedure returns user when session is valid
6. protected procedure rejects requests without a session

**Tasks:**

- implement password hashing helpers (bcrypt or argon2)
- implement session cookie handling
- add `authRouter` with signup/login/logout/me procedures
- add auth middleware for protected procedures
- update all existing routers to use authenticated user from session instead of hardcoded seed user
- add ownership checks to deck, card, study, and stats procedures

**Definition of Done:**

- all auth tests pass
- session cookie is set on signup/login
- protected procedures reject unauthenticated requests
- existing procedure tests still pass with auth wired in
- ownership is enforced (user A cannot access user B’s decks)

---

### PR 14: Auth — Frontend

**Scope:** Login and signup pages, protected route logic, auth state bootstrap.

**Tasks:**

- create login page
- create signup page
- add `auth.me` query to bootstrap current user on load
- add protected route wrapper (redirects to `/login` if unauthenticated)
- add authenticated layout shell with logout

**Tests:**

- login form submits credentials
- protected route redirects when unauthenticated

**Definition of Done:**

- user can sign up and log in through the UI
- refresh preserves session
- unauthenticated users are redirected to login

---

### PR 15: Polish — Loading, Empty, and Error States

**Scope:** Improve UX across all pages.

**Tasks:**

- add loading skeletons/spinners to all data-fetching pages
- review and improve empty states (no decks, no cards, no sessions)
- add error boundaries or error messages for failed queries
- add toast notifications for mutations (create deck, import, etc.)

**Definition of Done:**

- every page handles loading, empty, and error states
- mutations give user feedback on success/failure

---

### PR 16: Seed Data and Documentation

**Scope:** Make the app easy to set up and demo.

**Tasks:**

- expand seed script with multiple decks, richer card data, and sample study sessions
- finalize README with setup instructions, env vars, scripts, CSV format
- verify fresh `git clone` -> setup -> working app flow

**Definition of Done:**

- `pnpm db:seed` populates full demo data
- README is complete and accurate
- a new developer can set up the project from the README alone

---

## Suggested Root Scripts

Example root `package.json` scripts:

```json
{
  "scripts": {
    "dev:web": "pnpm --filter web dev",
    "dev:api": "pnpm --filter api dev",
    "dev": "concurrently \"pnpm dev:api\" \"pnpm dev:web\"",
    "build": "pnpm -r build",
    "test": "pnpm -r test",
    "test:watch": "pnpm -r test:watch",
    "lint": "pnpm -r lint",
    "typecheck": "pnpm -r typecheck",
    "db:migrate": "prisma migrate dev",
    "db:generate": "prisma generate",
    "db:seed": "tsx prisma/seed.ts"
  }
}
```

Example `pnpm-workspace.yaml`:

```yaml
packages:
  - "apps/*"
```

---

## Error Handling Expectations

### CSV Import

- invalid headers -> clear user message
- blank fields -> row-level or summarized validation error
- malformed file -> general import error
- wrong deck ownership -> authorization error

### Auth

- invalid credentials -> generic error message
- expired session -> redirect to login
- unauthorized API access -> standard auth error response

### Study Flow

- empty deck -> empty state
- submit failure -> clear retry path
- duplicate finish/submit -> handle safely if possible

---

## README Expectations

The README should eventually include:

- project purpose
- stack
- repo structure
- local setup
- environment variables
- how to run web/api
- how to run tests
- how to run Prisma migrations
- CSV format example
- deployment notes

---

## Engineering Principles

1. Optimize for finishability.
2. Prefer conventional patterns over clever abstractions.
3. Keep frontend/backend boundaries clear.
4. Use strong typing without type gymnastics.
5. Validate at boundaries.
6. Build vertical slices end-to-end.
7. Use TDD where it adds the most value.
8. Keep tests behavior-focused.
9. Keep ownership and auth checks server-side.

---

## Decisions Summary

### We are choosing

- one repo
- pnpm workspaces
- Vite + React + TypeScript
- React Router
- TanStack Query
- Node + tRPC
- Prisma + Postgres
- Tailwind + shadcn/ui
- TDD-oriented implementation

### We are not choosing

- two repos
- GraphQL
- Relay
- Next.js
- Redux
- premature shared packages
- excessive E2E coverage at the start

---

## Guidance for Claude Code

Implement this project with the following priorities:

1. Keep the codebase simple and readable.
2. Build vertical slices so usable features appear early.
3. Use test-driven development for business logic and API behavior.
4. Write failing tests before implementation whenever practical.
5. Prefer minimal implementations that satisfy the current test.
6. Refactor only after tests are green.
7. Do not prematurely create shared packages or abstractions.
8. Keep auth and ownership checks on the server.
9. Favor maintainability and finishability over theoretical ideal architecture.
10. Be pragmatic: not every presentational component needs heavy test coverage.

When in doubt, choose the simpler implementation that preserves clean boundaries, strong typing, and a fast feedback loop.
