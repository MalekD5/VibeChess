# Spec 13: Player Game History

Read `AGENTS.md`, then read the required context files in the documented order.
Do not use files under `context/specs/` except this spec file.

Before implementation:
- Update `context/progress-tracker.md` to mark this spec as in progress.
- Identify the system boundary this spec belongs to.
- Note any ambiguity in `context/progress-tracker.md` before making assumptions.

## What this layer should do

Player game history persists completed chess games for the signed-in user and stores enough structured data to support reliable history views, result summaries, PGN/FEN sharing, and future replay or analysis without introducing a per-move relational table.

This spec defines the persistent game-history record and the event/snapshot shape that finalized games should store. It does not change the live-game authority model: active game state remains owned by the Node runtime game orchestrator.

## System Boundary

- `orchestrator` owns active game transitions and produces canonical game events.
- `engine` remains deterministic chess computation only.
- `app/api` exposes authenticated history read endpoints and any finalized-game persistence endpoint or server action required by the orchestrator boundary.
- `lib` owns shared persistence helpers, auth checks, and Prisma access.
- `types` owns shared game-history and game-event contracts.
- `components` and `hooks` may read and display history, but never compute authoritative chess state.

## Architecture Decision

Use a hybrid event + snapshot persistence model.

The persistent game record stores:

- relational metadata for ownership, listing, filtering, and summaries
- a compact ordered canonical event stream in one JSON field
- snapshot fields for fast loading and recovery
- optional PGN for export and sharing

Do not create a normalized per-move table for this spec.

Do not put Prisma into the synchronous per-move critical path unless the architecture context is deliberately updated in the same change. Under the current architecture, Prisma persistence for game history happens when a game is finalized, or through a background/asynchronous persistence path that does not make the database the active-game authority.

Ably remains transport only. Ably messages notify clients of orchestrator state changes; Ably history is not used as durable game storage.

## Data Model

Add or evolve a single persistent `ChessGame`-style model for completed or recoverable games.

Required fields:

- `id`: stable game id
- `userId`: owner for player history queries
- `whitePlayerId`: nullable user id or virtual AI id
- `blackPlayerId`: nullable user id or virtual AI id
- `mode`: human or AI game mode
- `status`: completed, abandoned, or recoverable if later supported
- `result`: white win, black win, draw, or unknown
- `resultReason`: checkmate, stalemate, resignation, draw agreement, timeout, abandonment, or unknown
- `initialFen`: starting position
- `finalFen`: final board position
- `events`: JSON array of canonical game events
- `pgn`: optional generated PGN cache
- `startedAt`: when the game began
- `endedAt`: when the game ended
- `createdAt`
- `updatedAt`

Recommended summary fields:

- `lastSeq`: highest canonical event sequence stored
- `plyCount`: number of half-moves
- `openingName`: nullable future-derived display field
- `openingEco`: nullable future-derived display field

The `events` field is for canonical game events only. Large engine analysis, coaching text, or generated commentary should not be embedded into the canonical event stream in this spec.

## Canonical Event Contract

Every stored event must be server-created and ordered.

Shared fields:

```ts
interface BaseGameEvent {
  id: string;
  gameId: string;
  seq: number;
  type: string;
  actorId?: string;
  createdAt: string;
  schemaVersion: number;
  idempotencyKey?: string;
}
```

Move event:

```ts
interface MoveGameEvent extends BaseGameEvent {
  type: "move";
  ply: number;
  playerId: string;
  uci: string;
  san: string;
  fenAfter: string;
}
```

Game end event:

```ts
interface GameEndEvent extends BaseGameEvent {
  type: "game.end";
  result: "white" | "black" | "draw";
  reason:
    | "checkmate"
    | "stalemate"
    | "resignation"
    | "draw-agreement"
    | "timeout"
    | "abandonment"
    | "unknown";
  finalFen: string;
}
```

Future event families may include:

- draw offers
- resignations
- discrete clock state changes
- system events for migration or recovery metadata
- derived annotation events

Derived annotation events must be clearly marked as derived and must not be required to reconstruct the legal game.

## Invariants

- The server orchestrator is the only authority that creates canonical game events.
- Clients never append directly to history.
- Events for a game are strictly ordered by `seq`.
- `seq` starts at 1 and increments by 1 for every canonical event.
- The client must be able to detect missing real-time messages by comparing event sequence values.
- Every accepted legal move produces exactly one `move` event.
- Every completed game has exactly one terminal `game.end` event.
- `finalFen` must match the final canonical event state.
- `plyCount` must match the number of stored move events.
- `pgn`, if present, is a generated cache, not the source of truth.
- Engine analysis and coaching output are derived data, not gameplay truth.

## Persistence Flow

For the current architecture:

1. Client sends a command through the established game input path.
2. Orchestrator serializes commands per game.
3. Orchestrator validates the move through the engine boundary.
4. Orchestrator mutates active state through the single dispatch path.
5. Orchestrator emits a server-authored ordered event and state snapshot.
6. Server publishes the update through Ably.
7. When the game reaches a terminal state, the finalized game record is persisted to PostgreSQL.

If mid-game durability is introduced later, use one of these approaches:

- asynchronous append outside the latency-critical move path
- optimistic concurrency with `lastSeq` or row version checks
- transactional outbox for reliable DB-to-Ably publishing

Do not silently switch to synchronous per-move DB writes without updating `context/architecture-context.md`.

## Real-Time Recovery Contract

Ably is a delivery channel, not storage.

Real-time messages should include:

- `gameId`
- `seq`
- event payload or authoritative snapshot payload
- current status
- current FEN

Clients should treat Ably updates as notifications from the authoritative server. If a client detects a sequence gap or reconnects after missing updates, it should fetch the latest authoritative game state from the server instead of trusting local state.

## Failure Handling

Duplicate commands:

- Include an idempotency key or expected ply/version in client commands before accepting persistent move history.
- Reject commands that do not match the current turn, player, or expected ply.

Concurrent commands:

- Process through the per-game orchestrator queue.
- Only the first valid command against the current state may transition the game.

Partial DB/Ably failures:

- Under final-only persistence, Ably failure affects live sync but not finalized history.
- Under future per-event persistence, prefer DB-first plus client refetch, or use a transactional outbox.

Dropped connections:

- Client can resubscribe to Ably.
- Client can fetch the current or completed game record from the server.
- Client must not reconstruct authority from stale local events alone.

## History API Requirements

Provide authenticated APIs or server functions for:

- listing the signed-in user's games
- fetching one owned game by id
- returning compact list rows without loading large event payloads unnecessarily
- returning full game detail with events only when needed

Access rules:

- A user may read games where they are the owner or one of the recorded players.
- Anonymous users may not read account game history.
- AI player ids do not grant access.
- Route handlers must run in Node runtime when using Prisma.

List view should include:

- game id
- opponent display name or AI label
- player color
- result
- result reason
- final FEN or thumbnail input
- ply count
- started and ended timestamps

Detail view should include:

- all summary fields
- full canonical event stream
- final FEN
- optional PGN

## Future Extensibility

Game replay:

- Use ordered move events.
- Prefer `fenAfter` caches to avoid recomputing every intermediate board from the start for every UI interaction.

Engine analysis:

- Run asynchronously after game completion.
- Store compact derived analysis separately from canonical gameplay events if the payload becomes large.
- Do not block game persistence, result display, or history listing on engine completion.

Blunder detection and evaluation graphs:

- Derive from move events and stored FEN snapshots.
- Store as separate analysis JSON or a future analysis model if query needs grow.

AI coaching:

- Treat generated coaching as derived content.
- Avoid embedding long natural-language commentary in the core game record unless there is a clear size limit.

Opening statistics and analytics:

- Do not query heterogeneous event arrays for product analytics at scale.
- Add derived indexed summary fields or future read models when analytics become in scope.

## Out Of Scope

- Normalized per-move relational tables
- Real-time spectator history
- Rating or ELO updates
- Opening database/statistics product
- Full engine analysis implementation
- Move-by-move replay UI
- Persistent mid-game recovery guarantees beyond the current architecture
- Clock tick streams or high-frequency timer persistence

## Acceptance Criteria

- A completed game is persisted as one owned game-history record.
- The record stores ordered canonical events and final snapshot fields.
- The list API can show user game history without loading full event streams.
- The detail API can return enough data to reconstruct moves and final position.
- Persistence does not make the database the active source of truth for live games.
- Ably remains transport only.
- The implementation does not introduce a per-move relational table.
- The progress tracker is updated when implementation starts and completes.

## Verify

Use the narrowest useful checks for the implementation:

- TypeScript typecheck for shared event contracts and route usage.
- Prisma validation or migration check if the schema changes.
- Targeted tests for event ordering, result persistence, and ownership checks if test infrastructure exists.
- Manual runtime check that a completed game appears in the signed-in user's history.

Update progress-tracker.md when you are finished:
- Set In Progress back to None.
- Add only the completed current spec/item.
- Update Current Goal and Next Up if they changed.
- Do not add new sections.
