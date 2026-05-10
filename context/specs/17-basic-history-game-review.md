# Spec 17: Basic History Game Review

Read `AGENTS.md`, then read the required context files in the documented order.
Do not use files under `context/specs/` except this spec file.

Before implementation:
- Update `context/progress-tracker.md` to mark this spec as in progress.
- Read the relevant Next.js 16 guide under `node_modules/next/dist/docs/` before editing routing, data loading, or page files.
- Read only the Vercel skill files needed for this page implementation.
- Identify the system boundary this spec belongs to.
- Note any ambiguity in `context/progress-tracker.md` before making assumptions.

## Feasibility Assessment

This feature is possible with the current structure.

The current `ChessGame` persistence model already stores the data needed for a basic move-by-move completed-game review:

- `initialFen` for the starting position
- `finalFen` for the terminal position
- ordered canonical `events` JSON
- `move` events with `ply`, `playerId`, `uci`, `san`, and `fenAfter`
- a terminal `game.end` event with `finalFen`
- `lastSeq` and `plyCount` summary fields

The existing history detail read path also already enforces current-user access through `getOwnedGameHistoryDetail(gameId, userId)` and `/api/history/[gameId]`.

No database schema change is required for the basic version. The missing layer is the authenticated page and read-only UI that turns the stored event stream into a navigable sequence of board positions.

## What this layer should do

Build a private completed-game review page for games in the signed-in player's history.

The page lets the player step through the stored game one move at a time. It is a read-only review of canonical historical data, not an active game, analysis board, or engine evaluation surface.

The review must show:

- the board position at the start of the game
- every stored move position in order
- the selected move's SAN text and move number
- a compact move list that can select any ply
- previous, next, start, and final controls
- final result metadata

This spec consumes the history persistence contract from Spec 13 and extends the history page from Spec 15 with navigation to a detail page.

## System Boundary

- `app` owns the authenticated review route, route metadata, and server-side data loading.
- `lib` owns shared history detail query helpers, ownership checks, and any conversion from stored events to UI-facing review data.
- `components` owns the read-only review board, move controls, result summary, and move list UI.
- `types` owns stable UI-facing history review contracts if the data shape is shared across components.
- `engine` may provide deterministic helper functions only if validating or reconstructing stored event data is needed on the server.

Do not move active game authority, Ably behavior, live game move handling, AI move generation, or game finalization logic into this page.

## Route Requirements

Create a dedicated page for one completed history game.

Recommended route:

- `/history/[gameId]`

Route behavior:

- Anonymous users cannot view the page.
- A signed-in user can only view a game where they are the owner, white player, or black player according to the existing history access rules.
- Missing or unauthorized games must not disclose another user's game data.
- The route should use the Node runtime when Prisma is accessed directly.
- The page should include a clear navigation path back to `/history`.

The existing `/api/history/[gameId]` route may remain available. Prefer direct server-side loading through shared `lib` helpers for the page unless a client-only review flow is deliberately needed.

## Data Requirements

Load one completed game with full detail data:

- game id
- white player id
- black player id
- mode
- status
- result
- result reason
- initial FEN
- final FEN
- ordered canonical events
- started and ended timestamps
- ply count
- optional PGN, opening name, and opening ECO if already present

Convert the stored event stream into a compact review model:

- position 0: initial position from `initialFen`
- one position for each `move` event using `fenAfter`
- move display data from `san`, `uci`, `ply`, and `playerId`
- final state from the terminal `game.end` event or persisted `finalFen`

The review model must ignore non-move events for position stepping, except that `game.end` supplies result metadata.

## Event Validation Requirements

The page must not trust malformed historical JSON blindly.

Before rendering the review:

- ensure `events` is an array
- accept only known canonical event shapes needed by this page
- sort only if the data is already a valid contiguous sequence; otherwise reject as invalid history
- require move events to have sequential `seq` values in stored order
- require move `ply` values to match the visible move sequence
- require every visible move event to include `san`, `uci`, and `fenAfter`
- handle missing or invalid review data with a friendly unavailable-history state

Do not use the client to repair invalid history. If reconstruction or validation needs Chess.js, perform that work in the server/lib boundary.

## UI Requirements

The review page should feel like a focused chess workspace.

Layout:

- Main board area on the left or top, depending on viewport width.
- Move list and controls on the right or below on smaller screens.
- Compact game summary near the top.
- Back link or button to the history list.

Board:

- Read-only.
- Displays position 0 before any move is selected.
- Displays `fenAfter` for the selected ply.
- Uses stable square dimensions and responsive constraints.
- Does not allow drag, drop, click-to-move, legal move hints, or active-game actions.
- Highlights the selected move's from/to squares if the `uci` value can be parsed safely.

Controls:

- Start button
- Previous move button
- Next move button
- Final position button
- Disabled states at the beginning and end
- Keyboard support for left/right arrow navigation when focus is inside the review surface

Move list:

- Show moves grouped by full move number.
- Show white and black SAN side by side when both exist.
- Selecting a SAN entry updates the board to that ply.
- The selected move is visually distinct and accessible.
- Long SAN strings must not overflow their container.

Result summary:

- Show matchup using the same display-name conventions as the history list.
- Show result and result reason.
- Show ended date.
- Show ply count.

Design constraints:

- Use the dark-only VibeChess theme tokens from `context/ui-context.md`.
- Do not use hardcoded hex values or raw Tailwind palette classes.
- Do not nest cards inside cards.
- Use `lucide-react` icons for navigation controls.
- Keep text within containers across mobile and desktop viewports.
- Preserve board readability over decorative motion.

## Navigation From History

Update the history list so each completed game row links to `/history/[gameId]`.

Requirements:

- The row or a clear review action must be keyboard accessible.
- Link styling must make the row feel interactive without becoming visually noisy.
- Existing infinite scroll behavior must keep working.
- The list page must still use compact history data and must not load full event streams.

## Required Skills

Use these skills as scoped references during implementation:

- `vercel-react-best-practices` for server component data loading, client boundary placement, serialization, and avoiding unnecessary rerenders.
- `vercel-composition-patterns` if extracting reusable board, move list, or review-control composition.
- `web-design-guidelines` for responsive layout, accessibility, keyboard navigation, and visual polish.
- `vercel-react-view-transitions` only if adding a meaningful transition between the history list and review page; otherwise mark it non-applicable in the progress update.

## Implementation Workflow

1. Mark this spec in progress in `context/progress-tracker.md`.
2. Read the relevant Next.js 16 docs before touching route or server component files.
3. Read the applicable Vercel skill files for the UI and data-loading work.
4. Confirm the history detail helper returns only current-user-scoped games.
5. Add a server-side history review data helper that validates stored events and produces the review model.
6. Add the `/history/[gameId]` route.
7. Build read-only review components for the board, controls, move list, and summary.
8. Link completed game rows from `/history` to the review route.
9. Verify auth scoping, invalid history handling, move navigation, keyboard behavior, and responsive layout.
10. Update `context/progress-tracker.md` when finished.

## Invariants

- The page only displays games readable by the current authenticated user.
- Clients never compute or mutate authoritative chess state.
- Historical review state is derived from server-authored canonical events.
- The review page never writes to Prisma.
- Prisma is not used in the per-move critical path.
- The database is not the source of truth for active games.
- Ably is not needed for this page.
- The list page must not load full event streams.
- The review page is read-only and cannot send active game commands.
- Malformed event history must not crash the page.

## Out Of Scope

- Engine analysis, evaluation bars, centipawn scores, blunder detection, coaching, or suggested moves.
- Editing or annotating historical games.
- Public or shareable review pages.
- Spectator mode.
- Replaying unfinished active games.
- Persisting per-move relational rows.
- Importing PGN.
- Exporting PGN/FEN beyond displaying existing stored data.
- Realtime updates while reviewing a completed game.

## Acceptance Criteria

- A signed-in user can open `/history/[gameId]` for one of their completed games.
- Anonymous users are blocked according to the app's auth routing pattern.
- Unauthorized users cannot view another user's completed game.
- The page shows the initial board position before move 1.
- The page can step forward and backward through every stored move.
- Selecting a move in the move list updates the board to that ply.
- Start, previous, next, and final controls work and expose disabled states correctly.
- The selected move is visible in the move list.
- The page shows matchup, result, result reason, ended date, and ply count.
- The history list links completed game rows to their review page without loading full events.
- Invalid or incomplete event history shows an unavailable-history state instead of crashing.
- The UI follows the dark theme tokens and responsive layout rules.
- The progress tracker is updated when implementation starts and completes.

## Verify

Use the narrowest useful checks for the implementation:

- TypeScript check for route, helper, and component contracts.
- Targeted helper tests for event validation and review model creation if test infrastructure exists.
- Manual runtime check for:
  - anonymous access
  - authorized completed game access
  - unauthorized game access
  - game with no moves
  - game with white and black moves
  - final position matching stored `finalFen`
  - malformed event payload fallback
  - desktop and mobile review layout
  - keyboard previous/next navigation

Update `context/progress-tracker.md` when you are finished:
- Set In Progress back to None.
- Add only the completed current spec/item.
- Update Current Goal and Next Up if they changed.
- Do not add new sections.
