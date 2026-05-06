# Spec 06: Client Realtime Hook/Provider

Read `AGENTS.md`, then read the required context files in the documented order.
Do not use files under `context/specs/` except this spec file.

Before implementation:
- Update `context/progress-tracker.md` to mark this spec as in progress.
- Identify the system boundary this spec belongs to.
- Note any ambiguity in `context/progress-tracker.md` before making assumptions.

## What this layer should do
Add the client-side realtime layer that connects the browser to an existing game channel, listens for full GameState snapshots, and publishes player actions through Ably. This should be foundation-only: no chessboard UI yet, but enough API for the next spec to build the playable screen.

## Key Changes
- Add a client-only provider/hook layer under `src/hooks` that owns one Ably Realtime client per mounted game session and cleans it up on unmount.
- Public hook contract:
  ```ts
  interface GameRealtimeSession {
    gameId: string;
    channelName: string;
    playerId: string;
    state: GameState | null;
    connectionStatus: 'idle' | 'connecting' | 'connected' | 'disconnected' | 'failed';
    error: string | null;
    joinGame(color: PlayerColor): Promise<void>;
    makeMove(move: MoveInput): Promise<void>;
    resign(): Promise<void>;
  }
  ```
- Hook input:
  ```ts
  interface UseGameRealtimeInput {
    gameId: string;
    channelName?: string;
    initialState?: GameState;
  }
  ```
- Use `Ably.Realtime` from the existing `ably` dependency with `authUrl: /api/ably/auth?gameId={gameId}`; do not expose `ABLY_API_KEY` in client code.
- Subscribe to `state` messages and replace local state with the full server snapshot; clients must not compute chess state.
- Publish only `action` messages shaped as existing `GameAction` values: `JOIN_GAME`, `MAKE_MOVE`, and `RESIGN`.
- Generate a browser-local `playerId` once per mounted session with `crypto.randomUUID()`; this is temporary until real auth/session identity exists.

## Test Plan
- Run `pnpm lint`.
- Run `pnpm build`.
- Add focused checks where practical for action payload construction and state-message handling.
- Manual smoke path for the next implementer:
  - Create a game with `POST /api/game`.
  - Mount the hook with returned `gameId`, `channelName`, and `state`.
  - Confirm the hook connects, receives `state` messages, and publishes `JOIN_GAME`/`MAKE_MOVE` actions without client API key exposure.

## Assumptions
- No visible chessboard or page workflow in this spec; that comes next.
- No persistence, matchmaking, account auth, or player identity hardening yet.
- The hook may keep state in React only because the authoritative state remains the server orchestrator snapshot.
- If Ably connection behavior requires API-name confirmation during implementation, check current Ably JavaScript/React docs before writing code.


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