# Spec 05: Game Session API

Read `AGENTS.md`, then read the required context files in the documented order.
Do not use files under `context/specs/` except this spec file.

Before implementation:
- Update `context/progress-tracker.md` to mark this spec as in progress.
- Identify the system boundary this spec belongs to.
- Note any ambiguity in `context/progress-tracker.md` before making assumptions.

## What this layer should do

Build the missing server entrypoint between the placeholder app and the completed game manager/Ably adapter. The next unit should let a client create an in-memory game, start the server-side Ably listener for that game, and receive the initial state needed to connect.

## Key Changes
- Add a Node runtime route: `POST /api/game`.
- The route creates a server-generated `gameId` with `crypto.randomUUID()`, calls `gameManager.createGame(gameId)`, starts `ablyGameAdapter.subscribe(gameId)`, and returns:
  ```ts
  {
    gameId: string;
    channelName: `game:${string}`;
    state: GameState;
  }
  ```
- Add `GET /api/game/[gameId]` to return the current in-memory snapshot via `gameManager.getGame(gameId)`.
- Keep player joining out of this API; clients still join by publishing `JOIN_GAME` on the game channel.
- Leave Ably auth as `GET /api/ably/auth?gameId=...`; it already scopes JWTs to `game:{gameId}`.
- Make `POST /api/game/[gameId]/subscribe` idempotent if touched: return `{ gameId, subscribed: true }` when already subscribed instead of a 409.

## Test Plan
- Run `pnpm lint`.
- Run `pnpm build`.
- Manually verify route behavior:
  - `POST /api/game` returns a new `gameId`, `channelName`, and initial `waiting` state.
  - `GET /api/game/[gameId]` returns the same game snapshot.
  - Missing/nonexistent game IDs return a predictable 404 JSON response.
  - If `ABLY_API_KEY` is missing, game creation fails cleanly when subscription setup cannot start.

## Assumptions
- This is still Phase 1 foundation work: no database persistence, auth ownership checks, matchmaking, timers, or UI chessboard yet.
- Active games remain in memory only.
- The next spec after this should be the client realtime hook/provider, then the board UI.
- If implementation changes route behavior, update `context/progress-tracker.md` only; no architecture context change is needed unless persistence or auth is introduced.

## Constraints
- Keep the change limited to this spec.
- Preserve the invariants from `context/architecture-context.md`.
- Keep UI, game logic, networking, persistence, and orchestration concerns separate.
- Do not invent product behavior outside the context files and this spec.

## Verify
- Application builds.
- TypeScript does not emit errors.
- Required dependencies are installed and justified.
- Relevant tests or focused runtime checks pass.
- Every changed file respects the documented boundaries and standards.

Update progress-tracker.md when you are finished:
- Set In Progress back to None.
- Add only the completed current spec/item.
- Update Current Goal and Next Up if they changed.
- Do not add new sections.