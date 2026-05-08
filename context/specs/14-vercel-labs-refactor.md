# Spec 14: Vercel Labs Refactor

Read `AGENTS.md`, then read the required context files in the documented order.
Do not use files under `context/specs/` except this spec file.

Before implementation:
- Update `context/progress-tracker.md` to mark this spec as in progress.
- Read the relevant Next.js 16 guide under `node_modules/next/dist/docs/` before editing Next.js code.
- Read only the Vercel skill files needed for the refactor area being touched.
- Identify the system boundary this spec belongs to.
- Note any ambiguity in `context/progress-tracker.md` before making assumptions.

## What this layer should do

Refactor the current project using the newly added Vercel Labs skills as implementation guardrails while preserving the existing VibeChess product behavior, architecture boundaries, and dark technical UI direction.

This spec is a quality refactor, not a feature expansion. It should make the React and Next.js implementation easier to maintain, faster to render, more composable, and more visually consistent without changing the rules of chess, the orchestrator authority model, Ably transport semantics, auth behavior, or persistence scope.

## System Boundary

- `components` owns UI composition, layout extraction, reusable view primitives, and view transition wrappers.
- `hooks` owns client state subscriptions and browser-only interaction state.
- `app` owns routing, layouts, server/client component boundaries, and route-level transitions.
- `lib` owns shared helpers that are not UI-specific.
- `engine`, `orchestrator`, `manager`, `adapters`, and `types` may only be touched when a UI refactor exposes an existing boundary violation that must be corrected.

Do not move chess validation, active game authority, Ably publish/subscribe behavior, Prisma access, or AI move generation into UI components or hooks.

## Required Skills

Use these skills as scoped references during implementation:

- `vercel-react-best-practices` for React and Next.js performance, data loading, bundle size, server/client boundaries, and rerender control.
- `vercel-composition-patterns` for component API cleanup, compound components, provider boundaries, and avoiding boolean prop proliferation.
- `vercel-react-view-transitions` for native-feeling route, reveal, list identity, and shared element animations.
- `web-design-guidelines` for UI, accessibility, layout, and interaction review.

## Refactor Goals

### React and Next.js Performance

- Prefer React Server Components by default.
- Keep `"use client"` scoped to components that need browser interactivity, hooks, realtime subscriptions, or direct DOM APIs.
- Avoid unnecessary client serialization by passing compact, stable props into client components.
- Remove avoidable request and render waterfalls by starting independent async work early and resolving independent work in parallel.
- Use dynamic imports only for genuinely heavy or optional client-only UI.
- Avoid broad barrel imports when direct imports reduce bundle size.
- Keep expensive derived values out of render paths unless memoized for a measurable reason.
- Split hooks when independent state subscriptions cause unrelated rerenders.
- Use functional state updates for callbacks that depend on previous state.

### Component Composition

- Break large page or app components into focused app-level components.
- Prefer explicit child composition over boolean props that create many modes.
- Use compound components or provider-backed composition only when sibling coordination or shared state justifies it.
- Keep provider components as the only layer that knows how their state is implemented.
- Create explicit variants for meaningfully different UI states instead of adding flag combinations.
- Keep shadcn/ui foundation components reusable and unmodified unless a task explicitly requires changing them.

### View Transitions

- Add view transitions only where they communicate continuity or spatial relationship.
- Follow `vercel-react-view-transitions/references/implementation.md` before implementation.
- Use the provided CSS recipes from `vercel-react-view-transitions/references/css-recipes.md`; do not invent animation CSS for this spec.
- Include reduced-motion support for every transition style.
- Use `default="none"` unless an animation should intentionally respond to every transition.
- Pair `enter` and `exit` transitions where directional or state-change animations are used.
- Use shared element names only when exactly one source and one destination can be mounted at the same time.
- Use list identity transitions for reordered or filtered repeated items.
- Do not call `document.startViewTransition` directly from app code.

### Web Design and Accessibility

- Preserve the dark-only VibeChess theme from `context/ui-context.md`.
- Use existing CSS custom property tokens and Tailwind token utilities; do not add hardcoded hex values or raw palette classes.
- Use `lucide-react` icons for tool buttons and common symbolic actions.
- Keep controls discoverable with proper labels, accessible names, focus states, and keyboard paths.
- Avoid nested cards and decorative page-section cards.
- Keep text within containers across mobile and desktop viewports.
- Preserve board readability and gameplay clarity over decorative motion or layout novelty.
- Review changed UI against the latest Web Interface Guidelines before completing the spec.

## Implementation Workflow

1. Audit the current React tree and identify the smallest coherent refactor unit.
2. Mark this spec in progress in `context/progress-tracker.md`.
3. Read the applicable Vercel skill rule files for that unit.
4. Refactor one boundary at a time.
5. Preserve visible behavior unless the spec explicitly calls out a visual or interaction improvement.
6. Run the narrowest useful verification after each meaningful slice.
7. Update `context/progress-tracker.md` when the refactor slice completes.

Prefer small slices such as:

- component extraction without behavior changes
- server/client boundary cleanup
- hook subscription cleanup
- route-level transition setup
- repeated UI pattern cleanup
- focused accessibility and layout fixes

Do not combine unrelated slices in one change.

## Invariants

- Server orchestrator remains the only authority over active game state.
- Clients render orchestrator snapshots; they do not compute authoritative chess state.
- Chess.js remains server-side only for validation and state transitions.
- Prisma is not used in the per-move critical path.
- Ably remains transport only.
- UI refactors must not alter canonical event ordering, move validation, game result calculation, auth checks, or ownership checks.
- Next.js runtime rules from `context/architecture-context.md` remain in force.

## Out Of Scope

- New product features.
- Replacing Tailwind, shadcn/ui, Ably, Prisma, Better Auth, Chess.js, or Next.js.
- Changing the game authority model.
- Adding timers, replay, ratings, spectator mode, or matchmaking.
- Redesigning the brand or creating a light theme.
- Broad dependency upgrades unless required by a selected Vercel rule and justified in the tracker.

## Acceptance Criteria

- The refactored area is smaller, more composable, and easier to follow than before.
- No product behavior changes unless explicitly documented in this spec or the tracker.
- Client components are limited to browser-interactive boundaries.
- Large components are split by responsibility without mixing UI, game logic, networking, and persistence.
- Applicable Vercel React performance and composition rules are followed.
- Any view transitions use React's `ViewTransition` patterns, provided CSS recipes, and reduced-motion support.
- Changed UI remains consistent with `context/ui-context.md` and passes a focused design/accessibility review.
- The progress tracker is updated when implementation starts and completes.

## Verify

Use the narrowest useful checks for the refactor slice:

- `npm run lint`
- TypeScript or Next.js build check if the slice touches component contracts, routing, or server/client boundaries
- Targeted runtime check for the changed screen or flow
- Browser viewport check for changed UI on desktop and mobile
- Reduced-motion check if transitions are added

Update `context/progress-tracker.md` when you are finished:
- Set In Progress back to None.
- Add only the completed current spec/item.
- Update Current Goal and Next Up if they changed.
- Do not add new sections.
