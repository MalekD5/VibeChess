# Progress Tracker

Update this file whenever the current phase, active feature, or implementation state changes.

## Current Phase

- Phase 1 — Foundation

## Current Goal

- No active implementation goal.

## Completed

- Spec 14: Vercel Labs refactor — game sidebar composition and accessibility slice.
- Non-web Vercel skill references removed from workflow docs.
- Vercel Labs skill requirements added to standing context files.
- Spec 14: Vercel Labs refactor spec.
- Legacy realtime game-state compatibility fix after Spec 13.
- Spec 13: Player game history.
- Spec 12: Auth user persistence.

## In Progress

- None

## Next Up

- None

## Open Questions

- None

## Architecture Decisions

- Chess.js is wrapped in `src/engine/chess-engine.ts`; it never leaks into orchestrator or types layers.
- `orchestrator` singleton is the only in-memory authority over active game state.
- `dispatch` is the single function that writes back to the game map (enforces the "exactly one mutation function" invariant).
- All source folders live under `src/`; `@/*` alias resolves to `src/*`.
