# Spec 9: Realtime and Board Stability

Read `AGENTS.md`, then read the required context files in the documented order.
Do not use files under `context/specs/` except this spec file.

Before implementation:
- Update `context/progress-tracker.md` to mark this spec as in progress.
- Identify the system boundary this spec belongs to.
- Note any ambiguity in `context/progress-tracker.md` before making assumptions.

## What this layer should do

Human game sessions had several reliability and UX issues:

- Server-side Ably subscriptions could be absent when a client published an action, causing join or move messages to be missed.
- Realtime payloads could arrive as JSON strings, nested `data`/`state` objects, or Ably inbound envelopes that were rejected by strict client parsing.
- Some state snapshots omitted `result` or used string timestamps, causing otherwise usable snapshots to fail validation.
- Hot reload or route module re-instantiation could create duplicate adapter-local channel maps.
- Manual side picking had no pending state, could be clicked repeatedly, and did not surface failures well.
- Move history growth in the sidebar could influence the board column height, making the board shift, zoom, or appear stretched.

## Public Interfaces

No new public product API is introduced.

Existing interfaces are hardened:

- `/api/game/[gameId]/subscribe` is called by the client before publishing realtime actions.
- Ably `action`, `state`, and `error` event handling accepts JSON-encoded and nested realtime payloads.
- `GameSidebar` receives `manualJoinColor` so the UI can display and disable pending manual joins.

## Implementation Changes

### Ably Adapter

- Store active realtime channels on `globalThis` so the server adapter keeps a stable channel map across route module instances.
- Parse incoming action data from either object payloads or JSON strings.
- Continue rejecting invalid action shapes after parsing.

### Realtime Client Hook

- Add a nested realtime payload parser that can unwrap JSON strings, `state`, `data`, and message-like objects.
- Accept `result` as `null` or `undefined` during active games.
- Accept numeric or string `createdAt`/`updatedAt` fields.
- Ignore non-message inbound Ably actions before parsing state payloads.
- Log raw invalid state payloads for diagnosis.
- Prepare the server subscription through `/api/game/[gameId]/subscribe` before subscribing/publishing.
- Cache the subscription promise per hook instance and reset it if preparation fails.
- Clear errors when the channel attaches successfully.

### Playable Game Screen

- Track manual join state with `manualJoinColor`.
- Make `runAction` return success/failure so callers can manage pending UI state.
- Add a timeout for manual seat requests that do not produce a server snapshot.
- Clear manual join pending state once a seat is claimed or the target seat changes.
- Clean up pending join timeout on unmount.
- Keep the game screen constrained to the viewport with `h-dvh`, `overflow-hidden`, and `min-h-0` where nested scroll regions need it.
- Align the two-column game grid to the start so sidebar content does not stretch the board panel.

### Game Sidebar

- Disable seat buttons while a manual join is pending.
- Show `Joining...` for the pending color.
- Make the sidebar its own scroll region with `min-h-0 overflow-y-auto`.

### Chess Board

- Remove height-driven board sizing.
- Keep board dimensions square and width-driven.
- Cap board width by available container width, viewport height minus surrounding chrome, and a 760px maximum.
- Keep `min-h-0` on the board wrapper so it can live inside constrained layouts.

### Context Tracker

- Record completed fixes for realtime payload normalization, server subscription readiness, JSON-encoded side-pick parsing, human-vs-human side-picking feedback, board/sidebar height coupling, and board sizing regression.

## Support Artifacts

Untracked diagnostic screenshots under `.github/images/` support the issues summarized here:

- `subscriber-issue.png`
- `timestamp-issue.png`
- `undefined-result-issue.png`

## Constraints

- Preserve the server-authoritative game state invariant.
- Do not move chess validation or state mutation into client components.
- Do not write to the database per move.
- Keep UI fixes scoped to component layout and feedback behavior.
- Do not include README changes in this spec.

## Verify

- `npm run lint`
  - Expected current result: no errors, with the existing warning that `actionError` is assigned but not rendered in `src/components/playable-game-screen.tsx`.
- `npm run build`
  - Expected current result: Next.js production build completes successfully.
- Manual smoke test:
  - Start or use the local dev server.
  - Create/join a human-vs-human game.
  - Pick a side and confirm the joining button shows pending feedback.
  - Make at least two moves.
  - Confirm the board remains square and does not shift, zoom, or stretch as move history grows.

Update `context/progress-tracker.md` when implementation of this spec is finished:

- Set In Progress back to None.
- Add only the completed current spec/item.
- Update Current Goal and Next Up if they changed.
- Do not add new sections.
