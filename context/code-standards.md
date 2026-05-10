# Code Standards

## General

- Keep modules small and single-purpose.
- Fix root causes — do not layer workarounds.
- Do not mix unrelated concerns in one component or route.
- Respect the system boundaries defined in `architecture-context.md`.
- Use `pnpm` for all package management and project scripts; do not use `npm` commands in this repository.

## TypeScript

- Strict mode is required throughout the project.
- Avoid `any`; use explicit interfaces or narrowly scoped types.
- Validate unknown external input at system boundaries before trusting it.
- Use `interface` for object contracts.

## Next.js

- Default to React Server Components.
- Add `"use client"` only when the component needs browser interactivity, hooks, or real-time state.
- Keep route handlers focused on a single responsibility.
- Long-running work belongs in background tasks, not in request handlers.
- Before editing Next.js code, read the relevant guide in `node_modules/next/dist/docs/` because this project uses Next.js 16.

## React and Vercel Labs Standards

- Follow `vercel-react-best-practices` for React and Next.js performance work.
- Avoid render and request waterfalls by resolving independent async work in parallel.
- Keep client component props compact and stable to avoid unnecessary serialization and rerenders.
- Avoid broad barrel imports when direct imports keep bundles smaller.
- Split hooks when independent subscriptions cause unrelated rerenders.
- Derive render state during render when possible instead of syncing derived state with effects.
- Use functional state updates for callbacks that depend on previous state.
- Follow `vercel-composition-patterns` when refactoring or creating reusable components.
- Prefer composition, children, and explicit variants over boolean prop combinations.
- Use provider-backed or compound component patterns only when shared state or sibling coordination justifies them.
- Keep provider components as the only layer that knows how their state is implemented.

## Styling

- Use CSS custom property tokens defined in `globals.css` — no raw Tailwind color classes like `zinc-*` or hardcoded hex values.
- Reference tokens through their Tailwind utility names: `bg-base`, `text-copy-primary`, `border-surface-border`, `text-brand`, etc.
- Maintain the border radius scale: `rounded-xl` for small elements, `rounded-2xl` for cards, `rounded-3xl` for modals.

## API Routes

- Validate and parse request input before any logic runs.
- Enforce auth and project ownership checks before any mutation.
- Enforce active-game access before reading game state, returning legal moves, preparing realtime subscriptions, or issuing realtime tokens.
- Do not treat IDs such as `gameId` as authorization secrets; use explicit access checks or invite tokens.
- Return consistent, predictable response shapes.
- Keep route handlers thin — push complexity into shared modules or background tasks.

## Data and Storage

- Project metadata and relationships belong in PostgreSQL via Prisma.
- Canvas snapshots and generated specs belong in Vercel Blob; Prisma stores only the blob URL reference.
- Do not store large generated content directly in the database.
- Task run records are first-class relational data — treat ownership and run IDs as verified before any token issuance.

## File Organization

- `lib/` — shared infrastructure: Prisma client, auth helpers, utilities.
- `components/` — UI composition only; no business logic.
- `app/api/` — route handlers for auth, triggering, and persistence.
- `engine` — deterministic chess computation only (legal move validation, FEN transformation, position evaluation)
- `orchestrator` — deterministic state machine + side-effect dispatcher
- `types` — shared types/contracts layer
- `hooks` — client state layer (react hooks)
- `prisma` — Database schema and generated client output
- `data` — Legacy local directory. Not used for new artifacts
- Name files after the responsibility they contain, not the technology.
