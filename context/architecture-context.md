# Architecture Context

## Stack

| Layer            | Technology              | Role                                                                            |
| ---------------- | ----------------------- | --------------------------------------------------------------------------------|
| Framework        | Next.js 16 + TypeScript | Full-stack app with server/client boundaries                                    |
| UI               | Tailwind + shadcn/ui    | Component composition and styling                                               |
| Auth             | better-auth             | User identity and route protection                                              |
| Database         | Prisma + PostgreSQL     | Relational metadata: games, users, scores, task runs                            |
| Real-Time        | Ably                    | multiplayer, game state sync                                                    |
| Game Engine      | Chess.js                | chess move validation, piece placement/movement, check/checkmate/draw detection |

## System Boundaries

- `app/api` — Authenticated request handlers: input validation, ownership checks, task triggering, and persistence
- `lib` — Shared infrastructure: Prisma client, access control helpers, and utilities
- `engine` — deterministic chess computation only (legal move validation, FEN transformation, position evaluation)
- `orchestrator` — deterministic state machine + side-effect dispatcher
- `manager` — process-level controller: owns all orchestrators, single event entry point, per-game sequential queue, lifecycle management, logging hooks
- `types` — shared types/contracts layer
- `hooks` — client state layer (react hooks)
- `components` — UI composition: canvas surfaces, sidebars, dialogs, and interactive elements
- `prisma` — Database schema and generated client output
- `data` — Legacy local directory. Not used for new artifacts

## Storage Model

### Active Game State (Ephemeral)

- Lives in memory inside the Game Orchestrator
- Represents live gameplay

This does NOT go to DB on every update

### Active Game Invite Metadata

- Lives in PostgreSQL via Prisma in `active_game_invite`
- Stores game-to-invite authorization metadata and revocation state
- Stores invite token hashes, not raw invite tokens
- Is queried during active-game access checks and updated when invite access is revoked
- Is not part of `GameState` and is not the source of truth for chess state

### Persistent Game Record

Stored in PostgreSQL via Prisma.

Represents a finalized or recoverable game.

Stored when:
 - Game ends

### User Data
Stored persistently.

Includes:
 - User profile
 - Auth identity (better-auth)
 - Game history references

## Game State Model
- The game state is a single in-memory truth object per active game.
- It is owned by the Game Orchestrator
- It is updated only through server-validated transitions
- It is never partially updated or client-controlled

### Recovery
Game state can be reconstructed from:
 - Initial FEN
 - Ordered move list or event log

## Communication Model

- Clients send events (move, join, create)
- Server broadcasts state updates
- All communication is event-driven through Ably channels
- Each game has a dedicated real-time channel
- All client state updates are derived exclusively from orchestrator snapshots
- `gameId` is an identifier, not an authorization secret
- Waiting human games require a separate server-issued invite token before a nonparticipant can load, subscribe to, or receive an Ably token for the game
- Active and finished games are accessible only to the owner or seated players
- Active-game invite metadata is stored durably in Prisma, separate from `GameState`; raw invite tokens are not stored
- Ably JWTs issued through invite-only access carry a game-scoped revocation key and are revoked when the game stops waiting or is deleted
- The Ably API key used for realtime auth must have revocable tokens enabled so invite-only JWTs can be invalidated immediately

Next.js API routes are only for non-realtime commands (auth, game creation, history fetch)

## Edge Runtime
for next.js runtime models, use edge runtime only for the following:
 - Auth protection
 - Route gaurds
 - Lightweight request validation

Edge runtime must NOT access:

 - Prisma
 - Ably
 - Chess.js
 - Game state

## Node Runtime
for next.js runtime models, use node runtime only for the following:

 - Game Orchestrator
 - Chess.js logic
 - Ably event handling
 - Prisma DB operations
 - AI moves

State is mutated only inside the Orchestrator module running in Node runtime

## Invariants

- Server (Game Orchestrator) is the only authority over game state
- AI behaves like a virtual player (not a separate system)
- Prisma is not used in per-move critical path
- Never write to DB per move synchronously
- Clients never compute state, they only render it
- The database is not the source of truth for active games
- Chess.js is used only on the server for validation and state transitions
- Do not use `middleware.ts` to authorize requests
- Active-game API routes must enforce session and active-game access checks before reading state, returning legal moves, subscribing the server, or issuing Ably JWTs
- Never treat a route identifier or database id as an access secret
- Events for a single game must be processed in arrival order by the Game Orchestrator
- All clients in a game must converge to the same state after every server update
- There is exactly one function that mutates game state
- Every valid move produces exactly one state transition
