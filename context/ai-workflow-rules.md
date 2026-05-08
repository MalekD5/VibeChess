# Development Workflow

## Approach

Build this project incrementally using a spec-driven workflow. Context files define what to build, how to build it, and what the current state of progress is. Always implement against these specs — do not infer or invent behavior from scratch.

## Required Skill Usage

Every new spec implementation must apply the relevant Vercel Labs skills before editing code:

- Use `vercel-react-best-practices` for React components, Next.js pages/layouts, data loading, bundle size, server/client boundaries, and performance-sensitive changes.
- Use `vercel-composition-patterns` for component refactors, reusable component APIs, provider design, and avoiding boolean prop proliferation.
- Use `vercel-react-view-transitions` for route transitions, shared element animations, list identity animations, Suspense reveals, and UI state transitions.
- Use `web-design-guidelines` for UI, accessibility, responsive layout, interaction design, and visual polish reviews.

If a skill is not applicable to the spec, note that briefly in the implementation reasoning or progress update instead of forcing unrelated patterns.

## Scoping Rules

- Work on one feature unit or subsystem at a time.
- Prefer small, verifiable increments over large speculative changes.
- Do not combine unrelated system boundaries in a single implementation step.

## When To Split Work

Split an implementation step if it combines:

- UI changes and background task changes
- Multiple unrelated API routes
- Behavior that is not clearly defined in the context files

If a change cannot be verified end to end quickly, the scope is too broad — split it.

## Handling Missing Requirements

- Do not invent product behavior that is not defined in the cont ext files.
- If a requirement is ambiguous, resolve it in the relevant context file before implementing.
- If a requirement is missing, add it as an open question in `progress-tracker.md` before continuing.

## Protected Foundation Components

Do not modify generated third-party foundation components unless explicitly instructed.

This includes:

- `components/ui/*` (shadcn/ui components)
- third-party library internals

These should remain default and reusable.

Project-specific styling, layout changes, and feature logic must be implemented in app-level components instead of modifying foundation components.

Only modify these files when a task explicitly requires it.

## Keeping Docs In Sync

Update the relevant context file whenever implementation changes:

- System architecture or boundaries
- Storage model decisions
- Code conventions or standards
- Feature scope

Progress state must reflect the actual state of the implementation, not the intended state.

## Before Moving To The Next Unit

1. The current unit works end to end within its defined scope.
2. No invariant defined in `architecture-context.md` was violated.
3. Applicable Vercel Labs skill guidance was followed or explicitly marked non-applicable.
4. `progress-tracker.md` reflects the completed work.
   - remove any unnecessary session context
   - update completed items (no need to mention past completed items, just the current item)
   - do not add any new sections
