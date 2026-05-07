# Spec 11: Zod Validation Migration

Read `AGENTS.md`, then read the required context files in the documented order.
Do not use files under `context/specs/` except this spec file.

Before implementation:
- Update `context/progress-tracker.md` to mark this spec as in progress.
- Identify the system boundary this spec belongs to.
- Note any ambiguity in `context/progress-tracker.md` before making assumptions.

## What this layer should do

Migrate external input shape validation from hand-written type guards to Zod schemas. This migration is only for parsing and validating unknown request, realtime, and persisted/snapshot payload shapes at system boundaries.

Do not migrate chess legality, FEN transformation, legal move generation, check/checkmate/draw detection, or move application into Zod. Those remain the responsibility of `chess.js` behind `src/engine/chess-engine.ts`.

## Public Interfaces

- Add `zod` as an application dependency.
- Add a shared schema module for game contracts under the existing contracts/boundary layer.
- Keep exported TypeScript interfaces/types in `src/types/game.ts` as the public type contract unless a specific type is safely inferred from a schema without changing callers.
- Preserve existing API and realtime payload shapes:
  - game creation accepts missing/empty body for human games
  - AI game creation accepts `mode`, `playerColor`, and `aiDifficulty`
  - Ably client actions continue using `JOIN_GAME`, `MAKE_MOVE`, and `RESIGN`
  - Ably state snapshots remain compatible with existing clients

## Implementation Changes

- Create Zod schemas for shared boundary values:
  - `PlayerColor`
  - `AiDifficulty`
  - `PlayerKind`
  - `GameStatus`
  - `GameResultReason`
  - `GameOutcome`
  - `MoveInput` shape only
  - `GameAction` shape only
  - `GameState` snapshot shape
  - game creation request body shape
- Replace manual API request body validation in `POST /api/game` with a Zod parser.
- Replace manual Ably action shape validation with a Zod parser.
- Replace realtime state snapshot normalization/validation with Zod where snapshots cross from unknown external data into trusted app state.
- Keep route handlers and adapters thin by moving schema definitions and parse helpers out of route/component files.
- Return or publish the same error semantics currently used for invalid payloads unless the spec explicitly defines a better message.
- Avoid duplicating enum-like values across schema files and type files where practical.

## Out Of Scope

- Do not validate chess move legality with Zod.
- Do not validate whether a move is legal for a position with Zod.
- Do not parse, validate, or transform FEN with Zod.
- Do not replace `validateAndApplyMove`, legal-move helpers, or AI move selection logic with schema logic.
- Do not move `chess.js` imports outside `src/engine`.
- Do not change the game state mutation model, orchestrator dispatch flow, or Ably channel names.
- Do not introduce database persistence changes.
- Do not redesign API response shapes beyond validation error consistency.

## Boundary Rules

- Zod validates unknown data at ingress boundaries only.
- The orchestrator should receive already parsed `GameAction` objects.
- The reducer remains responsible for domain rules such as turn enforcement, seating rules, resign rules, and active/finished status checks.
- The engine remains responsible for chess rules.
- Client components may use schemas only when parsing unknown realtime snapshots or local storage-like data; they must not use schemas to compute authoritative game state.

## Test Plan

- Verify human game creation still works with no request body.
- Verify invalid JSON in game creation returns the existing invalid setup error behavior.
- Verify invalid game creation modes, colors, and AI difficulties are rejected.
- Verify valid human and AI game creation payloads still produce the same response shape.
- Verify invalid Ably action messages publish the existing invalid message shape error.
- Verify valid `JOIN_GAME`, `MAKE_MOVE`, and `RESIGN` messages still reach `gameManager.processEvent`.
- Verify legal and illegal chess moves still depend on `validateAndApplyMove`.
- Verify no `chess.js` import appears outside `src/engine`.
- Run the narrowest useful check: lint/build or focused TypeScript check available in the repo.

## Assumptions

- `zod` is acceptable as a runtime dependency because it validates untrusted boundary input.
- Existing manual validation behavior is the compatibility baseline.
- The migration may be implemented incrementally, but each changed boundary must be fully migrated before it is considered complete.
- No product behavior changes are intended.

## Constraints

- Keep the change limited to validation migration.
- Preserve the invariants from `context/architecture-context.md`.
- Keep UI, game logic, networking, persistence, and orchestration concerns separate.
- Do not invent product behavior outside the context files and this spec.
- Keep Zod schemas small, named after the contract they validate, and colocated with shared contracts rather than hidden inside route handlers.

## Verify

- `context/code-standards.md` is correctly followed during the migration.
- Application builds.
- TypeScript does not emit errors.
- Required dependencies are installed and justified.
- Relevant tests or focused runtime checks pass.
- Every changed file respects the documented boundaries and standards.
- `chess.js` remains responsible for chess legality and state transformation.

Update progress-tracker.md when you are finished:
- Set In Progress back to None.
- Add only the completed current spec/item.
- Update Current Goal and Next Up if they changed.
- Do not add new sections.
