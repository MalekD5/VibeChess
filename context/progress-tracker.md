# Progress Tracker

Update this file whenever the current phase, active feature, or implementation state changes.

## Current Phase

- Phase 1 — Foundation

## Current Goal

- No active implementation goal.

## Completed

- Fixed board sizing regression from height-based constraints.
- Fixed board/sidebar height coupling after move history growth.
- Fixed realtime state payload normalization.
- Fixed server realtime subscription readiness before side picking.
- Fixed realtime JSON-encoded side-pick message parsing.
- Fixed human-vs-human side picking feedback and realtime error visibility.
- Fixed chessboard dark-square parity so a1 renders dark.
- Fixed client promotion detection so only pawns auto-promote.
- Fixed share-link copy failure handling.
- Fixed failed auto-join retry handling.
- spec 03 — Game Manager
- spec 04 — Ably Adapter
- spec 05 — Game Session API
- spec 06 — Client Realtime Hook/Provider
- spec 07 — Playable Game Screen
- Fixed playable game screen join and seat handling.
- Stabilized active game singleton across route module instances.
- Fixed chessboard seated-color perspective and move square mapping.
- Added server legal-move hints, square-only flash feedback, result modal, and share links.
- Prompt workflow guidance optimized.
- Fixed duplicate move submissions from rapid board clicks.
- spec 08 — Component Cleanup
- spec 10 — AI Players
- Fixed AI follow-up trigger for human seats without explicit kind metadata.

## In Progress

- None

## Next Up

- None

## Open Questions

- Add unresolved product or implementation questions here.

## Architecture Decisions

- Chess.js is wrapped in `src/engine/chess-engine.ts`; it never leaks into orchestrator or types layers.
- `orchestrator` singleton is the only in-memory authority over active game state.
- `dispatch` is the single function that writes back to the game map (enforces the "exactly one mutation function" invariant).
- All source folders live under `src/`; `@/*` alias resolves to `src/*`.
