# Spec 18: Active Game Invite Access

## Pre-Implementation Checklist

- Update `context/progress-tracker.md` to mark this spec as in progress before implementation.
- Read the relevant Next.js 16 route-handler guide under `node_modules/next/dist/docs/` before editing API routes.
- Use the `using-ably` skill before editing Ably token issuance, client auth, or channel behavior.
- Use Vercel React skills only for UI or hook changes that affect client behavior; note non-applicable skills in the progress update.
- Do not browse unrelated specs for extra scope.

## Purpose

Active game access must not rely on `gameId` as a shared secret. `gameId` is an identifier only. Joining or observing a waiting game requires a separate opaque invite token, and active or finished game access requires the signed-in user to be a participant or owner.

This closes the verified access gaps in:

- `POST /api/game/[gameId]/subscribe`
- `GET /api/game/[gameId]/legal-moves`
- `GET /api/ably/auth?gameId=...`
- `GET /api/game/[gameId]`, which currently acts as the waiting-game join/read endpoint

## Current Findings

- `POST /api/game/[gameId]/subscribe` does not require a session before subscribing the server to a game channel.
- `GET /api/game/[gameId]/legal-moves` reads active game state and legal moves without requiring a session or game access.
- `GET /api/ably/auth` requires sign-in, but grants `publish` and `subscribe` capability for any supplied `gameId`.
- `GET /api/game/[gameId]` requires sign-in, but still treats knowledge of a waiting `gameId` as sufficient to access the game.

## System Boundary

- `app/api` owns route-level session checks, query parsing, response status mapping, and calling shared access helpers before reading state or issuing tokens.
- `lib` owns shared active-game invite and access-control helpers.
- `manager` and `orchestrator` remain the source of active game state and gameplay transitions.
- `adapters` owns Ably channel subscription and message handling, but must not become the only access-control layer.
- `hooks` owns client realtime auth URL construction and passing invite material during the pre-join phase.
- `components` owns invite link display and join input behavior.

## Access Model

### Identity

- Every protected active-game route must call `getCurrentSession()`.
- Anonymous callers receive `401`.
- The signed-in user's `session.user.id` is the only user identity trusted by API routes and Ably JWTs.
- Client-supplied `playerId` remains untrusted. The Ably adapter must continue to reject messages where `message.clientId` does not match the action `playerId`.

### Game Access

A signed-in user may access an active-game resource only when one of these is true:

- The user is the game's `ownerId`.
- The user is seated as the white player.
- The user is seated as the black player.
- The game is still `waiting` and the caller presents the valid invite token for that game.

For `active` and `finished` games, invite tokens must not authorize non-participants.

### Invite Token

- Generate an opaque random invite token when creating a human game.
- Store invite authorization metadata in a durable shared store so access survives process restarts and is shared across workers.
- Store only a token hash server-side; do not persist the raw invite token.
- Return the invite token or invite URL only to the creating user.
- The invite token authorizes access only while the game status is `waiting`.
- Revoke the invite token when the game becomes `active`, when the game is deleted, or when creation cleanup runs.
- Persist token-hash-to-game association and revocation state in Prisma.
- Do not add invite token fields to `GameState`; invite authority is access metadata, not chess state.

## Route Requirements

### `POST /api/game`

- Continue to require sign-in before game creation.
- For human games, issue an invite token after the game is created.
- Return enough data for the client to build a shareable invite URL.
- For AI games, no second-player invite token is needed.
- If game creation or Ably server subscription fails and cleanup deletes the game, revoke any issued invite token.

### `GET /api/game/[gameId]`

- Require sign-in.
- Accept invite material using an `invite` query parameter.
- Read game state through a shared active-game access helper.
- A waiting game may be returned to:
  - the owner or existing participant without an invite token
  - a signed-in invite holder with a valid token
- A waiting game must not be returned to a signed-in user who only knows the `gameId`.
- Preserve the current behavior of returning the signed-in user's id as `playerId`.
- If the game is no longer waiting, do not allow a nonparticipant invite holder to load it.

### `POST /api/game/[gameId]/subscribe`

- Require sign-in.
- Accept invite material using an `invite` query parameter.
- Verify active-game access before calling `ablyGameAdapter.subscribe(gameId)`.
- Return `401` for anonymous callers and a forbidden response for signed-in callers without access.

### `GET /api/game/[gameId]/legal-moves`

- Require sign-in.
- Accept invite material using an `invite` query parameter.
- Validate the `from` square before returning move data.
- Verify active-game access before reading legal moves.
- Do not disclose legal moves to users who only know the `gameId`.

### `GET /api/ably/auth`

- Require sign-in.
- Require `gameId`.
- Accept invite material using an `invite` query parameter while the caller is not yet seated.
- Verify active-game access before signing any Ably JWT.
- Keep `x-ably-clientId` equal to `session.user.id`.
- Keep capabilities scoped to exactly `game:{gameId}` with `subscribe` and `publish`.
- Use a short token lifetime so stale invite-based access expires quickly after the game starts. Participants can refresh because they pass the participant access check.

## Client Requirements

- The game creation response type must include invite data only when the server returns it.
- The share URL must include both `game` and `invite` query parameters for human waiting games.
- Loading from a share URL must pass the `invite` query parameter to `/api/game/[gameId]`.
- Realtime setup must pass the invite token to:
  - `/api/ably/auth`
  - `/api/game/[gameId]/subscribe`
- After the invited user is seated, participant access must work without relying on the invite token.
- The manual join field should accept a full invite URL and extract the `game` and `invite` values. It may keep accepting raw game IDs only for owner or already-seated participant reloads.
- UI copy must not say that sharing the game ID alone is sufficient.

## Shared Helper Requirements

- Add a single active-game access helper in `src/lib` so the four routes do not duplicate authorization logic.
- The helper must:
  - read the current active game state from `gameManager`
  - identify owner/player participation from `ownerId`, `players.white.id`, and `players.black.id`
  - validate the invite token only for `waiting` games
  - validate invite material through the durable invite metadata store
  - return a consistent result that routes can map to `404`, `401`, `403`, and success responses
- Keep Prisma access limited to invite metadata lookup; do not use Prisma as active chess state.
- Keep invite-token storage separate from the orchestrator's chess state.

## Invariants

- `gameId` is not an authorization secret.
- Server-side route handlers enforce access before reading game state, returning legal moves, subscribing the server, or issuing Ably JWTs.
- The orchestrator remains the only authority over active game state.
- Clients never compute or mutate authoritative chess state.
- Prisma is not used in the active per-move path.
- Do not use `middleware.ts` to authorize requests.
- Ably capabilities remain channel-scoped and never use wildcard channel permissions.
- AI players remain server-controlled and cannot be authorized through invite tokens.

## Out Of Scope

- Spectator mode.
- Public game viewing.
- Persistent invite links for completed game review.
- Matchmaking or lobby discovery.
- Changing Ably channel names.
- Replacing Ably JWT auth with Ably token requests unless required by a future spec.
- Storing invite tokens in `GameState` or persisted history records.

## Implementation Workflow

1. Mark this spec in progress in `context/progress-tracker.md`.
2. Add active-game invite storage and access helpers under `src/lib`.
3. Update game creation to issue and clean up human-game invites.
4. Protect `/api/game/[gameId]`, `/subscribe`, `/legal-moves`, and `/api/ably/auth` with the shared helper.
5. Thread invite tokens through the client load, share, server-subscribe, and Ably auth flows.
6. Update UI copy so it refers to invite links instead of game IDs as share authority.
7. Revoke invites when a human game becomes active or is deleted.
8. Run the narrowest useful verification.
9. Finish by updating `context/progress-tracker.md`.

## Acceptance Criteria

- Anonymous callers cannot access active-game state, legal moves, subscribe setup, or Ably token issuance.
- A signed-in user who only knows a waiting `gameId` cannot load, subscribe to, or receive an Ably token for that game.
- A signed-in user with a valid waiting-game invite can load the waiting game and join an open human seat.
- Once the game becomes active, the invite token no longer authorizes nonparticipants.
- The owner and seated players can continue to receive Ably tokens and legal moves for their game.
- Ably JWTs remain scoped to `game:{gameId}` and use the signed-in user id as `x-ably-clientId`.
- The share link contains a separate invite token.
- The UI no longer instructs users to share the game ID by itself.
- No Prisma queries are introduced into the active per-move path.
- No architecture invariant from `context/architecture-context.md` is loosened.

## Verify

- Run `pnpm exec tsc --noEmit` or the repository's narrowest equivalent typecheck if available.
- Run `pnpm lint` if route, hook, or component files changed.
- Manually verify:
  - creating a human game returns or displays an invite link
  - opening only `?game=<gameId>` as another signed-in user is rejected
  - opening `?game=<gameId>&invite=<token>` as another signed-in user can join while waiting
  - the same invite no longer authorizes a third signed-in user after the game starts
  - owner and seated players still connect to Ably and can play
  - legal-moves returns no data for unauthorized users

## Progress Update Requirements

- Set `In Progress` to this spec during implementation.
- Set `In Progress` back to `None` when complete.
- Add only the completed current spec/item.
- Update `Current Goal` and `Next Up` if they changed.
- Do not add new sections.
