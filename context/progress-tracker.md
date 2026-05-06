# Progress Tracker

Update this file whenever the current phase, active feature, or implementation state changes.

## Current Phase

- Phase 1 — Foundation

## Current Goal

- No active implementation goal.

## Completed

- spec 03 — Game Manager
- spec 04 — Ably Adapter
- spec 05 — Game Session API
- spec 06 — Client Realtime Hook/Provider
- Prompt workflow guidance optimized.

## In Progress

- None

## Next Up

- Build the playable game screen on top of the realtime hook/provider.

## Open Questions

- Add unresolved product or implementation questions here.

## Architecture Decisions

- Chess.js is wrapped in `src/engine/chess-engine.ts`; it never leaks into orchestrator or types layers.
- `orchestrator` singleton is the only in-memory authority over active game state.
- `dispatch` is the single function that writes back to the game map (enforces the "exactly one mutation function" invariant).
- All source folders live under `src/`; `@/*` alias resolves to `src/*`.
