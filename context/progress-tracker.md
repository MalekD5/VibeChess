# Progress Tracker

Update this file whenever the current phase, active feature, or implementation state changes.

## Current Phase

- Phase 1 — Foundation

## Current Goal

- Build the server-side game state machine (orchestrator, reducer, engine wrapper)

## Completed

- Game Orchestrator (spec 01)
  - `types/game.ts` — GameState, Player, GameAction contracts
  - `engine/chess-engine.ts` — Chess.js wrapper (contained; not exported outside engine)
  - `orchestrator/reducer.ts` — pure reducer enforcing all invariants
  - `orchestrator/game-orchestrator.ts` — in-memory registry; `dispatch` is the sole mutation point

## In Progress

- None

## Next Up

- Add the next planned feature unit here.

## Open Questions

- Add unresolved product or implementation questions here.

## Architecture Decisions

- Chess.js is wrapped in `engine/chess-engine.ts`; it never leaks into orchestrator or types layers.
- `orchestrator` singleton is the only in-memory authority over active game state.
- `dispatch` is the single function that writes back to the game map (enforces the "exactly one mutation function" invariant).

## Session Notes

- All four files (types, engine, reducer, orchestrator) were created in one pass as spec 01.
- No DB, no Ably, no Next.js — purely in-memory logic. Safe to run on Node runtime only.
