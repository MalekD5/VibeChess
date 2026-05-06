# Spec 07: Playable Game Screen

Read `AGENTS.md`, then read the required context files in the documented order.
Do not use files under `context/specs/` except this spec file.

Before implementation:
- Update `context/progress-tracker.md` to mark this spec as in progress.
- Identify the system boundary this spec belongs to.
- Note any ambiguity in `context/progress-tracker.md` before making assumptions.

## What this layer should do

Build the first playable VibeChess screen on top of the completed Game Session API and client realtime hook/provider.

The screen should let users:

- Create a new game.
- Join an existing game by game ID.
- Join an existing game from a share link.
- Choose white or black.
- Automatically take the remaining color when only one seat is open.
- See the live board from the server `GameState.fen`.
- Make moves through the realtime hook.
- See turn/status/connection information.
- See legal destination hints after selecting a piece.
- Resign and start over.
- See a game result modal when the game ends.

## Required UI Flow

Replace the placeholder home page with the actual app experience.

Initial screen:

- Show app title.
- Show a `New Game` action.
- Show an input for an existing `gameId`.
- Show a `Join Game` action.

When `New Game` is clicked:

- Call `POST /api/game`.
- Use the returned `{ gameId, channelName, state }`.
- Mount `GameRealtimeProvider` with those values.
- Show the playable game screen.

When joining an existing game:

- Call `GET /api/game/{gameId}`.
- Use `channelName = game:{gameId}`.
- Mount `GameRealtimeProvider` with the returned state.
- Show the playable game screen.
- Reject joining games that are no longer waiting for a second player.

When opening a share link:

- Support a URL shaped like `/?game={gameId}`.
- Read the `game` query parameter on the client.
- Load the game using the existing join flow.
- Show the playable game screen if the game can still be joined.

## Playable Game Screen

Create app-level components under `src/components`, not `components/ui`.

The game screen should include:

- Responsive chessboard.
- White/black join buttons.
- Current turn.
- Game status.
- Connection status.
- Compact, human-friendly game ID display.
- Share link UI for quickly inviting the second player.
- Move history.
- Resign button.
- New game / back-to-start control.
- Game result modal when `GameState.status` becomes `finished`.

## Seat Assignment

- A user may manually choose white or black only while both seats are open.
- If one color is already taken, a joining user should automatically join the open color.
- A player who already occupies a color may rejoin the same color without changing state.
- A player must not be allowed to occupy both colors.
- A third player must not be allowed to join once both colors are taken or the game has started.
- Player identity should be stable per browser tab and game so remounts do not change the seated player ID.

## Board Interaction

Render the board from `GameState.fen`.

- FEN parsing is allowed only for rendering the board.
- Board orientation should follow the seated player's color.
- Observers should default to white perspective.
- Do not use Chess.js on the client.
- Do not validate move legality on the client.
- Clients must only publish user intent.
- The board should use algebraic square IDs like `e2`, `e4`.

Move input should be click-based:

1. User clicks one of their own pieces.
2. Client requests legal moves for that source square from the server.
3. Board highlights the legal target squares.
4. User clicks a highlighted target square.
5. Client calls `makeMove({ from, to, promotion })`.

Do not allow users to select an empty square as the first click.
Do not allow users to select an opponent piece as the first click.
Do not call `makeMove` when the clicked target is not in the legal target set.

For invalid clicks:

- Do not show or reserve a persistent error container in the layout.
- Flash the invalid square briefly with an error treatment.
- Remove the flash automatically.
- Avoid layout shifts or scroll jumps from transient errors.

For server-rejected moves:

- Do not compute fallback legality on the client.
- Flash the attempted target square briefly.
- Keep rendering state only from the latest server snapshot.

Legal move hints:

- Add a server route for legal move hints, for example `GET /api/game/{gameId}/legal-moves?from=e2`.
- The route may use Chess.js because it runs on the server.
- The route should return legal destination squares and any useful move metadata.
- The client may use this response only for highlighting and move target gating.

For pawn promotion, default `promotion` to `'q'` when a move targets the first or eighth rank. Do not build a promotion picker in this spec.

## Game Result

- Extend `GameState` with nullable result metadata for finished games.
- Result metadata should support checkmate, stalemate, draw, and resignation.
- When `GameState.status` becomes `finished`, display a modal with the result.
- The modal should allow starting a new game or returning to review the final board.

## Realtime Integration

Use the existing exports from `src/hooks/game-realtime.tsx`:

- `GameRealtimeProvider`
- `useGameRealtimeSession`

The UI must call:

- `joinGame('white')`
- `joinGame('black')`
- `makeMove({ from, to, promotion })`
- `resign()`

The board and status UI must render only from `session.state`.

Legal move hints are the exception to the render-only rule:

- They may be fetched from a server API route.
- They are used only to highlight target squares and prevent obviously invalid client intent.
- They must not mutate client game state.
- Final game state still comes only from realtime `state` messages.

## Constraints

- Keep this spec client/UI focused.
- Do not add auth, persistence, matchmaking, timers, AI moves, ratings, analysis, or replay.
- Do not modify foundation shadcn/ui components.
- Use the dark theme tokens from `ui-context.md`.
- Do not hardcode raw hex colors or raw Tailwind color families like `zinc-*`.
- Use `"use client"` only for interactive components.
- Keep game logic on the server; client-side code only renders FEN and publishes actions.
- Do not add URL-routed game pages in this spec; share links may use a query parameter on the home page.

## Things To Check

- Application builds.
- TypeScript does not emit errors.
- `pnpm lint` passes.
- A user can create a game and join a color.
- A second browser/session can join the same game ID as the opposite color.
- A second browser/session using the share link joins the same game.
- If one color is taken, the next joining player is automatically assigned the open color.
- A third player cannot join a game that has already started.
- White sees the board from white perspective; black sees the board from black perspective.
- Empty squares and opponent pieces cannot be selected as the first click.
- Selecting one of the current player's pieces shows legal target squares.
- Legal moves update both clients from Ably `state` messages.
- Invalid clicks and server-rejected moves flash briefly without layout shift.
- Resign ends the game.
- Finished games show a result modal.
- No client code imports Chess.js.
- No client code reads or exposes `ABLY_API_KEY`.

Update `context/progress-tracker.md` when finished:

- Set In Progress back to None.
- Add only `spec 07 — Playable Game Screen` to Completed.
- Set Next Up to `Add AI game mode foundation.`
- Do not add new sections.
