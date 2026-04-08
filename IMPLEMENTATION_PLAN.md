# MOMENTUM Implementation Plan

Date: 2026-04-09
Status: Planning only. No application code changed.
Build gate: Await explicit approval before Phase 1 implementation.

## 1. Goal

Build MOMENTUM as a single-user, offline-first mission control system for Goutham's 577-day placement target, with:

- Web first in the current repo
- Supabase as sync/backend system
- Local storage as primary client store
- AI features routed through server-side functions only
- Dark-only, JetBrains Mono, mobile-first interface

## 2. Current Repo Assessment

The current repo is not greenfield. It already contains:

- Next.js App Router app with `app/` routes
- `next` `16.2.1`, `react` `19.2.4`, Tailwind `4`
- Existing localStorage-driven stores and partial MOMENTUM UI
- Existing API routes under `app/api/*`
- Existing app routes: `/today`, `/schedule`, `/gym`, `/roadmap`, `/stats`, `/hunt`, `/settings`, `/health`, `/chain`, `/report`, `/why`

Key implication:

- The requested spec says "Next.js 14", but this repo is already on Next 16.2.1. I will plan against the installed version and the local Next docs in `node_modules/next/dist/docs/`, not older assumptions.
- The requested structure and the current structure differ. I will preserve working App Router conventions while reshaping the codebase toward the MOMENTUM spec.

## 3. Constraints And Non-Negotiables

- No blocking launch screen. Root route redirects to `/today`.
- `DAY [X] / 577` must be computed from 2026-03-23 accurately.
- `₹60L` always visible in header on Today and Stats, and effectively across app shell.
- TypeScript strict mode remains enabled. No `any`.
- Offline-first: local storage remains source of truth on the client.
- Supabase acts as sync, realtime, reporting, and server-side AI execution layer.
- Medical habits always first, always critical, always red.
- S-Celepra warning text must remain explicit.
- All AI secrets remain server-side only.
- All async operations need loading and error states.
- All animations must respect reduced motion.

## 4. Delivery Strategy

I will execute the build in five implementation tracks, but only Phase 1 after approval.

### Track A. Domain Foundation

- Normalize all domain types around the requested schema.
- Introduce a single canonical date/day engine for:
  - day count from 2026-03-23
  - placement countdown to October 2027
  - phase windows
  - week numbering
- Define local client models separately from Supabase row models where needed.

### Track B. Offline-First Data Layer

- Replace scattered localStorage stores with a unified storage facade.
- Keep local state authoritative for web UX.
- Add queued sync jobs for Supabase when online.
- Add conflict strategy for single-user operation:
  - last-write-wins for most scalar fields
  - append/merge for logs
  - idempotent upserts for completions/streaks

### Track C. Supabase Backend

- Add SQL migrations for all requested tables, constraints, indexes, RLS, and seeds.
- Add deterministic seed data for profile, habits, milestones, flashcards, progress letter.
- Add server-side edge functions for all requested AI endpoints.

### Track D. Web Product Surface

- Rebuild Today around the mission-control spec first.
- Expand Schedule, Gym, Roadmap, Stats, Hunt, Settings incrementally.
- Preserve App Router structure and shared shell patterns where useful.

### Track E. Quality + Platform

- PWA manifest and service worker hardening
- Realtime sync wiring
- Loading/error states
- Build/type validation
- Mobile audit at 375px

## 5. Architecture Decisions

### 5.1 App Structure

Planned web structure:

- Keep `app/` App Router.
- Keep root redirect in `app/page.tsx`.
- Use nested shared layout components instead of fully mirroring the requested folder tree if the current tree is cleaner.
- Consolidate duplicated page logic into feature modules under `components/` and `lib/`.

### 5.2 State Model

Client:

- localStorage-backed repositories per domain
- event-driven hydration for UI
- optimistic updates by default

Remote:

- Supabase tables mirror durable records
- background sync on load, visibility change, and manual refresh
- realtime subscriptions for completions, streaks, profile

### 5.3 AI Boundary

- Client never calls Anthropic directly.
- Web app calls either:
  - Supabase Edge Functions directly with anon/auth context, or
  - thin Next route handlers that proxy to Supabase functions if needed for client ergonomics
- Secrets stored in Supabase secrets only

### 5.4 Auth

Spec conflict noted:

- Requested tabs say no login screen.
- Build order mentions Supabase auth with magic link.

Plan:

- No blocking login UI on app launch.
- Phase 1 backend will be single-user oriented with a seeded profile and RLS policies designed for future auth.
- Auth UI can be added later as a non-blocking settings/onboarding mechanism if needed, without changing initial open-to-Today behavior.

## 6. Phase-by-Phase Implementation Plan

## Phase 1. Backend Foundation

Goal: establish durable backend, seeds, AI execution surface, and environment scaffolding without breaking current UI.

### 1.1 Environment + config

- Add `.env.example` with:
  - `NEXT_PUBLIC_SUPABASE_URL`
  - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
  - `SUPABASE_SERVICE_ROLE_KEY`
  - `ANTHROPIC_API_KEY`
- Add `lib/supabase/` client helpers for browser and server access.
- Add a single constants module for mission dates and static labels.

### 1.2 Database migrations

Create ordered migrations for:

- extensions/utilities as needed
- tables:
  - `profile`
  - `habits`
  - `completions`
  - `streaks`
  - `leetcode_log`
  - `gym_sessions`
  - `exercises`
  - `body_metrics`
  - `mood_log`
  - `energy_log`
  - `journal_entries`
  - `weekly_reports`
  - `ai_briefs`
  - `milestones`
  - `projects`
  - `applications`
  - `network_contacts`
  - `spaced_repetition_cards`
  - `mock_interviews`
  - `win_log`
  - `sleep_log`
  - `study_plans`
  - `accountability_checks`
  - `cs_questions`
  - `linkedin_tasks`
  - `backlog_subjects`
  - `college_subjects`
  - `time_blocks`
  - `progress_letter`

Migration rules:

- UUID primary keys where appropriate
- `created_at` / `updated_at` timestamps where useful
- check constraints for enums where Postgres enum adds friction
- foreign keys on user/profile-linked records
- indexes for high-frequency access:
  - `(user_id, date)`
  - `(habit_id, date)`
  - `(date desc)`
  - `(next_review_date)`
  - `(week_start_date)`
  - `(status)`
- unique constraints where needed:
  - single profile row per user
  - one completion per habit/date/user
  - one streak row per habit/user
  - single progress letter row per user

### 1.3 RLS policies

- Enable RLS on every table.
- Policies initially target authenticated owner access by `auth.uid()`.
- Seed path will use service role.
- For the current single-user/no-login product phase, local storage continues to function without blocking on auth.

### 1.4 Seed data

Seed:

- profile row for Goutham / Sachi
- 14 habits with exact categories, times, XP, ordering, critical flags
- S-Celepra warning note exactly as specified
- 10 milestones
- 12 spaced repetition pattern cards
- default progress letter
- default time blocks for schedule
- baseline gym exercise catalog

Seed implementation shape:

- SQL seed inserts inside migration files where static and deterministic
- JSON or TS source files only if the volume makes SQL unreadable

### 1.5 Edge Functions

Create:

- `_shared/supabaseClient.ts`
- shared Anthropic request helper
- 13 unique AI functions from the spec

Note:

- The spec lists `generate-weekly-plan` twice. I will implement it once.

Each function will include:

- typed request parsing
- server-side prompt assembly
- secret access from env
- explicit error handling
- structured JSON response
- low-token, deterministic response formatting

### 1.6 Phase 1 validation

- SQL migration review
- typecheck on web project
- edge function request payload validation
- curl command examples documented, but live curl execution depends on local Supabase project wiring and network approval

Deliverables for Phase 1:

- migrations committed
- seed data committed
- edge functions committed
- `.env.example` committed
- basic Supabase helpers committed
- validation notes committed or included in closeout

## Phase 2. Today + Core Loop

Goal: replace current `/today` task tracker with the real MOMENTUM Today experience.

### 2.1 Shared shell

- Persistent header:
  - day count left
  - MOMENTUM center
  - momentum score + `₹60L` right
- bottom nav:
  - Today
  - Schedule
  - Gym
  - Roadmap
  - Stats

### 2.2 Today surface

- sleep cognition card
- AI morning brief card
- collapsed medications card with expand/collapse
- 3 primary habit cards:
  - gym
  - coding
  - leetcode
- energy check-ins
- mood check-in
- daily CS question
- today’s one thing
- can’t start flow
- accountability check
- streak death warning
- perfect day screen
- rotating quote rail

### 2.3 Core mechanics

- variable reward engine
- streak engine with grace day support
- comeback mode
- XP accumulation
- win log auto-generation
- reduced motion fallbacks

### 2.4 Sync

- local completion write
- queued Supabase sync
- realtime profile/streak/completion updates

## Phase 3. Remaining Web Product

### 3.1 Schedule

- timeline day view
- preloaded time blocks
- current time line
- free gap insertion
- lock-in mode
- body doubling state and realtime count

### 3.2 Gym

- workout session tracker
- exercise cards and set rows
- rest timer
- history
- stats
- milestones and body-weight chart
- AI coach integration

### 3.3 Roadmap

- topics tree
- referral readiness meter
- spaced review
- flashcards
- weekly plan
- mock interview flows
- think-aloud evaluation
- leetcode log

### 3.4 Stats + Hunt

- honest numbers
- identity system
- sleep science
- mood/energy analytics
- win log
- progress letter
- academic tracker
- application tracker
- network builder
- project showcase
- resume builder
- linkedin optimizer
- offer tracker

### 3.5 Settings + AI chat

- settings page
- export hooks
- destructive actions with typed confirmation
- floating AI chat with local message history

## Phase 4. iOS

This repo currently appears web-only. iOS work is a separate downstream track, not Phase 1.

Plan for later:

- create `ios/Momentum/`
- mirror domain models
- repositories aligned to Supabase schema
- notifications, haptics, background sync, realtime

## Phase 5. QA + Hardening

- 375px layout audit
- 44px touch target audit
- reduced motion audit
- offline behavior matrix
- streak edge case tests
- notification timing review
- sync failure and retry review

## 7. Data Model Notes

### Canonical computed values

These should be computed in code, not manually edited:

- `days_since_day1`
- `days_to_placement`
- current phase progress
- daily avg LeetCode needed
- referral readiness state
- cognition score from sleep

### Local-first sync scope

Local-only until sync or offline:

- transient UI state
- in-progress forms
- AI chat last 10 messages
- lock-in timer session state

Durable local + remote:

- habits
- completions
- streaks
- profile stats
- leetcode log
- gym sessions
- body metrics
- journal
- reports

## 8. Design System Execution

- Keep global background at `#060606`
- JetBrains Mono everywhere via `next/font/google`
- Tailwind v4 tokens via CSS custom properties in globals
- card surfaces at `#0d0d0d` and `#111111`
- no shadows
- color-coded borders by category
- restrained motion only

Planned design primitives:

- app shell container
- mission card
- category card
- compact stat chip
- full-width action button
- alert banner
- tab strip

## 9. Risks And Decisions To Hold Constant

### Risks

- Existing repo already includes overlapping local stores and partial features; migration must avoid silent regressions.
- Supabase schema is large. One-shot implementation needs disciplined migration ordering.
- Local-first plus realtime plus no-login launch behavior creates edge cases around identity and sync bootstrapping.
- The spec is broad enough that trying to build all tabs before stabilizing Today would slow delivery.

### Locked decisions

- Build Phase 1 only after approval.
- Keep Next 16 and App Router conventions already in repo.
- Keep local storage primary, Supabase secondary.
- Do not introduce client-side Anthropic calls.
- Treat this as a single-user mission system, not a generic SaaS product.

## 10. Phase 1 File Plan

Expected additions/changes in Phase 1 after approval:

- `.env.example`
- `lib/supabase/*`
- `lib/mission/*` or equivalent date/domain utilities
- `supabase/migrations/*`
- `supabase/functions/_shared/*`
- `supabase/functions/generate-morning-brief/*`
- `supabase/functions/expand-journal-entry/*`
- `supabase/functions/weekly-oracle/*`
- `supabase/functions/streak-at-risk-alert/*`
- `supabase/functions/generate-daily-task/*`
- `supabase/functions/generate-weekly-plan/*`
- `supabase/functions/evaluate-think-aloud/*`
- `supabase/functions/generate-oa-feedback/*`
- `supabase/functions/generate-resume-bullet/*`
- `supabase/functions/generate-outreach-message/*`
- `supabase/functions/score-linkedin-profile/*`
- `supabase/functions/generate-cold-email/*`
- `supabase/functions/generate-star-story-feedback/*`
- possibly `lib/types.ts` refactor to align with schema

## 11. Acceptance Criteria For Phase 1

Phase 1 is complete when:

- full requested schema exists as migrations
- all required tables have RLS enabled
- indexes exist on date/user/habit-heavy paths
- seed data exists for profile, habits, milestones, cards, progress letter, baseline schedule/gym records
- all requested AI functions exist and compile
- no secrets are hardcoded in web code
- `.env.example` documents required variables
- current web app still builds after backend additions

## 12. Approval Gate

If you approve, I will start Phase 1 only:

1. Add Supabase directory structure and migrations
2. Add seed data
3. Add shared server helpers
4. Add all edge functions
5. Run type/build validation as far as the local environment allows

No web UI rewrite will happen until Phase 1 is complete.
