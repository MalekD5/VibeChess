# Spec 15: Player History Page

Read `AGENTS.md`, then read the required context files in the documented order.
Do not use files under `context/specs/` except this spec file.

Before implementation:
- Update `context/progress-tracker.md` to mark this spec as in progress.
- Read the relevant Next.js 16 guide under `node_modules/next/dist/docs/` before editing Next.js routing, data loading, or page files.
- Read only the Vercel skill files needed for this page implementation.
- Identify the system boundary this spec belongs to.
- Note any ambiguity in `context/progress-tracker.md` before making assumptions.

## What this layer should do

Build a separate authenticated player history page for the currently logged-in user.

The page gives the player a compact account-level overview and a row-based list of their completed games. Each row includes a small rendered chess board showing the final FEN position and text metadata for the matchup, result, and game date.

This spec consumes the game-history persistence and listing contract from Spec 13. It does not create a game review page, move-by-move replay UI, game analysis flow, or public player profile.

## System Boundary

- `app` owns the separate route, server-side auth check, page-level data loading, and route metadata.
- `lib` owns shared history query helpers, user ownership checks, result aggregation helpers, and Prisma access.
- `components` owns the player history overview, game history rows, and final-position board presentation.
- `types` owns shared display contracts if existing API or Prisma shapes need a stable UI-facing type.
- `engine`, `orchestrator`, `manager`, and realtime adapters are not part of this page unless an existing history contract bug must be fixed.

Do not move chess validation, active game authority, Ably behavior, AI move generation, or game finalization logic into this page.

## Route Requirements

Create a dedicated page for the signed-in player's game history.

Recommended route:

- `/history`

Route behavior:

- Anonymous users cannot view the page.
- The page only shows games owned by, or playable by, the current authenticated user according to the history access rules.
- The route must not accept an arbitrary user id for this spec.
- The route must not expose another player's private history.
- The route should use the Node runtime when Prisma is accessed directly.

If the implementation already has a route naming convention for account pages, follow the existing convention and document the chosen route in `context/progress-tracker.md`.

## Data Requirements

Load enough data to render the overview and list without fetching full canonical event streams.

Required user overview data:

- current user's display name
- total completed games shown in history
- total wins
- total losses

Recommended overview data if inexpensive from existing fields:

- draws
- most recent game date

Required row data:

- game id
- white player display name
- black player display name
- current player's color
- result from the current player's perspective: win, loss, or draw
- raw game result: white win, black win, draw, or unknown
- result reason when available
- final FEN
- ended date, falling back to created or started date only if the stored record lacks `endedAt`

Pagination requirements:

- Show 5 game rows in the initial rendered list.
- Load additional games in batches of 5 as the user scrolls near the end of the list.
- Preserve current-user ownership checks for every loaded batch.
- Use a stable pagination strategy, preferably cursor-based pagination ordered by `endedAt` descending with a deterministic tie-breaker such as `id`.
- Return a `hasMore` signal, next cursor, or equivalent pagination metadata so the UI knows when to stop requesting more rows.
- Do not refetch full previous pages just to append the next 5 rows.

Do not load full `events` JSON for the list page unless no compact query path exists yet. If a compact query path is missing, add one in the smallest shared helper or API boundary that matches the current codebase.

## Result Rules

Compute display result from the current user's perspective.

- If the user played white and `result` is white win, display win.
- If the user played black and `result` is black win, display win.
- If `result` is draw, display draw.
- If the opposing side won, display loss.
- If `result` is unknown, display unknown without counting it as a win or loss.

Wins, losses, and draw counts in the overview must use the same perspective rules as the rows.

AI players should be displayed with the existing AI label convention. If no convention exists, use a short product-consistent label such as `Vibe AI` and note the decision in `context/progress-tracker.md`.

## UI Requirements

The history page should feel like a focused account workspace, not a marketing page.

Page structure:

- A compact header area with the current user's name and summary stats.
- A row-based game list beneath the summary.
- The list initially displays 5 rows and appends 5 more rows at a time with infinite scroll behavior.
- An empty state when the player has no completed games.
- A loading state for the initial list if needed.
- A small append-loading state while the next 5 rows are being fetched.
- An end-of-list state when no more games are available.

Overview:

- Show the user name as the primary identifier.
- Show wins, losses, and total games as scan-friendly stats.
- Include draws only if supported by the loaded data.

Game rows:

- Left side: final FEN rendered as a small chess board with pieces in the correct squares.
- Right side: text summary in this order:
  - `White Name vs Black Name`
  - current player's result
  - date of the game
- Rows should be comfortable to scan on desktop and stack cleanly on mobile.
- The board preview must have stable dimensions so rows do not shift while data renders.
- The board preview is read-only and must not allow piece movement.

Design constraints:

- Use the dark-only VibeChess theme tokens from `context/ui-context.md`.
- Do not use hardcoded hex values or raw Tailwind palette classes.
- Do not nest cards inside cards.
- Keep repeated rows visually separated with existing border and surface tokens.
- Use accessible text labels for result and date.
- Keep text within containers across mobile and desktop viewports.

## Chess Board Preview

Render the final FEN as a board preview.

Requirements:

- Pieces must appear on the correct squares from the stored `finalFen`.
- The board must be visually recognizable at row-preview size.
- The preview must not compute legal moves, validate chess state, or mutate game state.
- The preview may parse FEN only for display.
- Invalid or missing `finalFen` should degrade gracefully with a compact unavailable-board state and must not crash the page.

Prefer reusing an existing board or square component only if it can be made read-only without dragging in live-game state, realtime subscriptions, move handlers, or orchestrator-specific assumptions. If the existing playable board is tightly coupled to live gameplay, create a small dedicated read-only preview component for this page.

## Navigation Requirements

This spec does not build a game review or detail page.

Rows may be non-clickable.

If the implementation chooses to make rows visually interactive for a future detail route, the click must not navigate to an unimplemented route. Prefer non-clickable rows for this spec unless a completed detail route already exists.

## Required Skills

Use these skills as scoped references during implementation:

- `vercel-react-best-practices` for server component data loading, route boundaries, serialization, client pagination boundaries, and avoiding unnecessary client code.
- `vercel-composition-patterns` if extracting reusable history list, stats, or board-preview composition.
- `web-design-guidelines` for responsive layout, accessibility, scanability, and visual polish.
- `vercel-react-view-transitions` only if adding a meaningful route or list transition; otherwise mark it non-applicable in the progress update.

## Implementation Workflow

1. Mark this spec in progress in `context/progress-tracker.md`.
2. Read the relevant Next.js 16 docs before touching route or server component files.
3. Read the applicable Vercel skill files for the page work.
4. Locate the existing auth/session helper and game-history persistence/query helper.
5. Add or refine a compact current-user history query that excludes full event payloads and supports 5-row pagination.
6. Build the separate page route and UI components.
7. Add infinite scroll behavior that loads the next 5 rows without navigating away or exposing another user's history.
8. Verify auth scoping, empty state, populated state, infinite scroll, and responsive row layout.
9. Update `context/progress-tracker.md` when finished.

## Invariants

- The page only displays history for the current authenticated user.
- Clients never compute authoritative chess state.
- FEN parsing in the UI is display-only.
- The database is not used as the source of truth for active games.
- Prisma is not used in the per-move critical path.
- Ably remains transport only and is not needed for this page.
- The page must not load full event streams for normal list rendering if compact history fields are available.
- Infinite scroll must only fetch the next current-user-scoped history batch.
- The page must not create a game review, replay, analysis, or detail experience.

## Out Of Scope

- Game review page.
- Move-by-move replay UI.
- Engine analysis, blunder detection, coaching, or evaluation graphs.
- Public player profiles.
- Filtering or search.
- Rating or ELO display.
- Sharing or exporting PGN/FEN from this page.
- Realtime updates to history while the page is open.

## Acceptance Criteria

- A signed-in user can open a separate player history page.
- Anonymous users are blocked according to the app's auth routing pattern.
- The page displays the current user's name, wins, losses, and total games.
- The game list is row-based.
- The game list initially displays 5 rows when at least 5 games are available.
- Scrolling near the end of the list loads the next 5 current-user-scoped rows until no more games remain.
- Each populated row shows a final-position board preview from `finalFen`.
- Each populated row shows `White Name vs Black Name`, the current player's result, and the game date.
- The page does not expose another user's history.
- The page does not load or render a game review/detail view.
- The UI follows the dark theme tokens and responsive layout rules.
- The progress tracker is updated when implementation starts and completes.

## Verify

Use the narrowest useful checks for the implementation:

- TypeScript check for route, query, and component contracts.
- Prisma query validation if a shared history query changes.
- Targeted auth or helper tests if test infrastructure exists.
- Manual runtime check for:
  - anonymous access
  - signed-in user with no games
  - signed-in user with completed games
  - 5-row initial list loading
  - next 5 rows appended by infinite scroll
  - end-of-list behavior
  - final FEN board orientation and piece placement
  - desktop and mobile row layout

Update progress-tracker.md when you are finished:
- Set In Progress back to None.
- Add only the completed current spec/item.
- Update Current Goal and Next Up if they changed.
- Do not add new sections.
