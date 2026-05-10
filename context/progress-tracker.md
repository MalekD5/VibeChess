# Progress Tracker

Update this file whenever the current phase, active feature, or implementation state changes.

## Current Phase

- Phase 1 — Foundation

## Current Goal

- No active implementation goal.

## Completed

- Active-game invite helper JSDoc follow-up.
- Ably auth API key presence check now fails fast before active-game access checks.
- Typed active-game not-found error handling.
- Shared invite URL parameter helper extracted for realtime game hooks.
- Game invite access revocation is best-effort during manager lifecycle mutations.
- Spec 18 durable active-game invite access follow-up.
- Spec 18 invite-based Ably subscriber revocation follow-up.
- Spec 18: Active Game Invite Access; view transitions were not applicable for this access-control and invite-link flow.
- Spec 17: Basic history game review; view transitions were not applicable for this read-only review route.
- Zod schema audit follow-up fixes for timestamp parsing, action validation, and schema consistency.
- Replaced deprecated Zod passthrough usage with Zod v4 loose object APIs.
- Spec 16: Zod usage audit and standards.
- Player history duplicate load-more request guard.
- Spec 15: Player history row readability polish.
- Spec 15: Player history page at `/history`; view transitions were not applicable for this non-navigating list page.
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

- Spec 17 uses `/history/[gameId]` for private completed-game move review.
- Spec 15 uses `/history` for the signed-in player's private game history page.
- Spec 15 displays AI opponents as `Vibe AI`.
- Chess.js is wrapped in `src/engine/chess-engine.ts`; it never leaks into orchestrator or types layers.
- `orchestrator` singleton is the only in-memory authority over active game state.
- `dispatch` is the single function that writes back to the game map (enforces the "exactly one mutation function" invariant).
- All source folders live under `src/`; `@/*` alias resolves to `src/*`.
