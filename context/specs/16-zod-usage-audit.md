# Spec 16: Zod Usage Audit and Standards

Read `AGENTS.md`, then read the required context files in the documented order.
Do not use files under `context/specs/` except this spec file when implementing this spec.

Before implementation:
- Update `context/progress-tracker.md` to mark this spec as in progress.
- Apply the project `zod` skill before editing Zod schemas or parse helpers.
- Identify the system boundary this spec belongs to.
- Note any ambiguity in `context/progress-tracker.md` before making assumptions.

## Purpose

Document every current Zod usage in the project, define the project standards for future Zod work, and identify the validation cleanup needed to align with the installed `zod` skill.

This spec is documentation-first. It does not change runtime behavior by itself.

## System Boundary

Zod belongs to the contracts and boundary-validation layer:

- `src/lib/game-schemas.ts` owns shared runtime schemas and parse helpers.
- `app/api` may call parse helpers for unknown request input.
- `src/adapters` may call parse helpers for unknown realtime messages.
- Client hooks may call parse helpers only when decoding unknown realtime snapshots or local storage-like data.

Zod must not own chess rules, orchestrator state transitions, persistence writes, authorization decisions, or UI state design.

## Current Zod Inventory

### Dependency

- `package.json` includes `zod` version `^4.4.3`.
- `tsconfig.json` has `strict: true`, which is required for reliable Zod type inference.

### Imports

The only source import from `zod` is:

- `src/lib/game-schemas.ts`

All other Zod usage flows through helper functions exported by that module:

- `src/app/api/game/route.ts` uses `parseGameCreationRequestBody`.
- `src/adapters/ably-game-adapter.ts` uses `parseClientGameActionMessage`.
- `src/hooks/game-realtime.tsx` uses `parseGameStateMessage` and `parseRealtimePayloadObject`.

### Schema Exports

`src/lib/game-schemas.ts` exports the following shared schemas:

- `PlayerColorSchema`
- `AiDifficultySchema`
- `PlayerKindSchema`
- `GameStatusSchema`
- `GameResultReasonSchema`
- `GameOutcomeSchema`
- `GameModeSchema`
- `HistoryResultSchema`
- `HistoryResultReasonSchema`
- `MoveInputSchema`
- `JoinGameActionSchema`
- `MakeMoveActionSchema`
- `ResignActionSchema`
- `GameActionSchema`
- `GameStateSchema`
- `HumanGameCreationRequestSchema`
- `AiGameCreationRequestSchema`
- `GameCreationRequestSchema`

`GameCreationRequest` is inferred with `z.infer<typeof GameCreationRequestSchema>`.

### Internal Schemas

`src/lib/game-schemas.ts` also defines internal schemas for reusable validation pieces:

- client action compatibility parsing
- human and AI player snapshots
- game result snapshots
- canonical game event snapshots
- timestamp coercion from numbers or numeric strings
- generic JSON object parsing
- game creation mode parsing

## Current Parse Helpers

### `parseGameCreationRequestBody(rawBody)`

Boundary:
- `POST /api/game`

Responsibilities:
- Accept an empty body as `{ mode: 'human' }`.
- Parse JSON as unknown data.
- Reject non-object bodies and arrays.
- Validate `mode`.
- Validate AI mode fields: `playerColor` and `aiDifficulty`.
- Preserve current route error messages by throwing `Error` instances with route-facing messages.

Skill alignment:
- Follows `parse-never-trust-json` by parsing JSON into `unknown`.
- Follows `parse-validate-early` by validating before game creation.
- Partially follows `parse-use-safeparse`; it uses `safeParse` for boundary checks but still uses `.parse()` for the human branch after earlier validation.
- Uses `z.infer` for the exported request type.

### `parseRealtimePayloadObject(value)`

Boundary:
- realtime message decoding

Responsibilities:
- Unwrap Ably-like payload shapes.
- Parse nested JSON strings up to a fixed depth.
- Return a plain record-like object or `null`.

Skill alignment:
- Follows `parse-never-trust-json` by treating parsed data as unknown.
- Protects against unbounded recursive payload parsing with a depth limit.
- Should remain a small compatibility adapter, not a domain parser.

### `parseClientGameActionMessage(data)`

Boundary:
- server-side Ably `action` messages

Responsibilities:
- Normalize action payload wrappers.
- Validate client-originated `JOIN_GAME`, `MAKE_MOVE`, and `RESIGN` message shapes.
- Return a trusted `GameAction` or `null`.
- Strip tolerated client-only passthrough data from action messages.

Skill alignment:
- Follows `parse-use-safeparse` and `parse-validate-early`.
- Uses discriminated action shapes for server actions.
- Keeps domain rules out of Zod; seating, turn rules, resign rules, and AI control remain in the orchestrator/adapter path.

### `parseGameStateMessage(data)`

Boundary:
- client-side realtime `state` messages

Responsibilities:
- Normalize action/state payload wrappers.
- Backfill legacy snapshot fields before validation.
- Validate state snapshots crossing from realtime into client state.
- Return a trusted `GameState` or `null`.

Skill alignment:
- Follows `parse-use-safeparse` for unknown realtime snapshots.
- Uses `satisfies z.ZodType<GameState>` to keep the schema and public `GameState` contract aligned.
- Uses transforms/defaults for compatibility normalization.

## Project Zod Standards

All future Zod usage must follow these standards from the installed `zod` skill:

- Define schemas at module scope. Do not create schemas inside hot request, render, loop, or realtime callback paths.
- Use `safeParse()` for user input, request bodies, realtime messages, local storage, query params, and other unknown external input.
- Parse `JSON.parse` output as `unknown`, then validate before use.
- Validate as early as possible at the system boundary.
- Export both shared schemas and inferred types when the type is part of the module contract.
- Prefer `z.infer`, `z.input`, or `z.output` over manually duplicating schema-derived types.
- Use enums from existing literal arrays in `src/types/game.ts` for fixed project values.
- Use discriminated unions when parsing action-like payloads with a stable `type` field.
- Use `unknown` over `any`.
- Prefer `z.coerce` or explicit transforms for query and form string inputs when the target type is not string.
- Use `.default()` when the default belongs to the data contract.
- Use `.nullable()` only when `null` is a meaningful value; use `.optional()` only when the key may be absent.
- Do not throw inside `refine`; return false and provide a useful error path/message when refinements are needed.
- Use `.flatten()` or `issue.path` when presenting validation errors to users.

## Required Cleanup for Full Skill Alignment

When this spec is implemented, update `src/lib/game-schemas.ts` without changing public payload shapes:

- Replace remaining branch-level `.parse()` calls on boundary input with `safeParse()` or a helper that converts Zod failures into the existing route-facing errors.
- Add string validations for chess-coordinate-shaped fields where Zod owns only shape validation:
  - `MoveInputSchema.from`
  - `MoveInputSchema.to`
  - optional `MoveInputSchema.promotion`
  These validations must not check move legality or FEN correctness.
- Add minimal non-empty string validation for IDs and required snapshot string fields where empty strings are not valid contract values.
- Derive `GameCreationModeSchema` from `GAME_MODES` instead of duplicating `['human', 'ai']`.
- Consider exporting inferred types for stable shared schema contracts that currently depend on manual public interfaces, but do not replace `src/types/game.ts` unless the implementation can avoid type churn.
- Keep legacy snapshot normalization explicit and isolated before `GameStateSchema.safeParse`.
- Keep Zod out of the reducer, chess engine, AI move selector, Prisma persistence helpers, and React render state derivation.

## Out Of Scope

- Do not validate chess move legality with Zod.
- Do not validate or transform FEN with Zod.
- Do not move `chess.js` imports outside `src/engine`.
- Do not change API response shapes beyond preserving current validation error compatibility.
- Do not change Ably channel names, event names, or action payload names.
- Do not change the orchestrator mutation model.
- Do not add React Hook Form integration.
- Do not switch to Zod Mini unless a measured frontend bundle issue is identified.

## Test Plan

Use the narrowest useful checks for the implementation slice:

- Run `npm run build` after schema changes.
- Verify empty human game creation still parses as human mode.
- Verify invalid JSON in `POST /api/game` still returns `invalid_game_setup`.
- Verify invalid AI mode fields still return the existing route-facing messages.
- Verify valid AI creation payloads still infer `GameCreationRequest` correctly.
- Verify invalid realtime action messages still publish `Invalid message shape`.
- Verify valid `JOIN_GAME`, `MAKE_MOVE`, and `RESIGN` messages still reach `gameManager.processEvent`.
- Verify invalid realtime state snapshots return `null` on the client parse path.
- Verify `chess.js` imports still appear only under `src/engine`.

## Acceptance Criteria

- This spec lists all current project Zod imports, exported schemas, internal schemas, and parse helper call sites.
- Future implementation work can use this spec to align Zod usage with the installed `zod` skill.
- No architecture invariant in `context/architecture-context.md` is loosened.
- Runtime chess rules remain owned by the server engine/orchestrator path, not by Zod.
- `context/progress-tracker.md` is updated when the documentation change is complete.

