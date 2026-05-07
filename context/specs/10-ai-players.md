# Spec 09: AI Players

## Summary

Create `context/specs/09-ai-players.md` for a local, lightweight AI game mode. AI players behave as virtual seated players inside the existing Node runtime game manager/orchestrator flow, never as client-controlled state or a separate game system.

## Public Interfaces

- Extend game creation so `POST /api/game` accepts an optional JSON body:
  - `mode?: 'human' | 'ai'`, default `'human'`
  - `playerColor?: 'white' | 'black'`, required for AI mode
  - `aiDifficulty?: 'easy' | 'medium' | 'hard'`, required for AI mode
- Extend shared game types with AI-safe metadata:
  - player kind: `'human' | 'ai'`
  - AI difficulty only on AI players
- Preserve current no-body human game creation behavior.

## Implementation Changes

- Add a server-only AI move selector under the engine/AI boundary.
  - `easy`: random legal move.
  - `medium`: prefer captures, checks, promotions, then random legal move.
  - `hard`: one-ply material-oriented evaluation with deterministic tie-breaking.
- Add an engine helper that returns all legal moves for a FEN without exposing `chess.js` outside `src/engine`.
- Update game creation so AI mode creates the game, seats the human, seats the AI in the opposite color, and starts immediately.
- If AI is white, trigger its first move after game creation.
- After every human move, if the next turn belongs to AI and the game is still active, enqueue exactly one AI move through `gameManager.processEvent`.
- Publish every accepted state transition through the existing Ably `state` event so clients still render only server snapshots.
- Keep `orchestrator.dispatch` as the only function that writes game state back to the in-memory map.

## UI Requirements

- Update the start screen to choose Human or AI mode.
- For AI mode, show color selection and easy/medium/hard difficulty controls.
- Do not allow joining an AI seat.
- Show the AI opponent in the game UI using the existing dark theme tokens and AI accent tokens.

## Test Plan

- Verify human game creation still works with no request body.
- Verify AI game creation seats both players and becomes active immediately.
- Verify AI-white games produce an opening AI move.
- Verify a human move followed by an AI turn produces ordered, legal state transitions.
- Verify AI cannot move when it is not the AI player’s turn.
- Run the narrowest useful check: lint/build or focused TypeScript check available in the repo.

## Assumptions

- This spec targets `context/specs/09-ai-players.md`.
- AI is local and deterministic enough for testing; no external LLM/API dependency is introduced.
- No database persistence changes are included in this spec.
- No timers, ratings, analysis, or replay features are included.

## Constraints
- Keep the change limited to this spec.
- Preserve the invariants from `context/architecture-context.md`.
- Keep UI, game logic, networking, persistence, and orchestration concerns separate.
- Do not invent product behavior outside the context files and this spec.

## Verify
- `context/code-standards.md` is correctly followed during the refactor.
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