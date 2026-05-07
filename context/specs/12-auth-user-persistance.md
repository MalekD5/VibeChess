# Spec 12: Auth User Persistence

Read `AGENTS.md`, then read the required context files in the documented order.
Do not use files under `context/specs/` except this spec file.

Before implementation:
- Update `context/progress-tracker.md` to mark this spec as in progress.
- Identify the system boundary this spec belongs to.
- Note any ambiguity in `context/progress-tracker.md` before making assumptions.

## What this layer should do

Add user authentication using better-auth as the authentication provider with Google sign-in only, backed by Prisma and PostgreSQL.

This spec establishes trusted human user identity for future per-account game history and completed game persistence. It does not persist completed games yet.

Unauthenticated users must not be able to see or use the new game page or new game controls. They should see an authentication entry state instead. Server-side API enforcement remains the real security boundary.

## System Boundary

This spec belongs to:

- `app/api` for auth route handlers and authenticated game creation checks
- `lib` for auth, Prisma, session, and access helper utilities
- `components` for sign-in/sign-out UI and authenticated new-game gating
- `prisma` for database schema and generated client output

This spec must not change:

- `engine` chess legality or FEN transformation
- `orchestrator` reducer semantics
- Ably channel naming
- AI move selection
- completed game persistence behavior

## Public Interfaces

- Add or complete a Prisma/PostgreSQL setup for better-auth.
- Add a shared Prisma client helper under `src/lib`.
- Add a better-auth server configuration under `src/lib`.
- Add the better-auth route handler under `src/app/api/auth/[...all]/route.ts` or the current better-auth documented Next.js route shape.
- Add a server-side session helper such as `getCurrentUser` or `getCurrentSession`.
- Add a client auth entry point for Google sign-in.
- Add a sign-out action/control for authenticated users.
- Preserve existing game creation response shape for authenticated users.
- Preserve existing realtime action names and payload shapes.

## Authentication Rules

- Google is the only sign-in provider for this spec.
- Anonymous users cannot start games.
- Anonymous users must not see the new game page or new game controls.
- Authenticated human users can start human games.
- Authenticated human users can start AI games.
- AI virtual players do not authenticate and must not require user/session rows.
- Auth checks must run on the server before `POST /api/game` creates a game.
- Client-side auth state must not be trusted for authorization decisions.
- Do not use `middleware.ts` for authorization because the architecture context forbids it.

## New Game Page Behavior

- If no authenticated session exists, render a sign-in-focused state instead of the new game page.
- The unauthenticated state must not render game mode, color, difficulty, or start-game controls.
- After successful sign-in, the authenticated user can access the existing game creation flow.
- If an unauthenticated request reaches `POST /api/game`, return a consistent unauthorized response and do not create an orchestrator game.
- Do not rely only on hiding buttons; enforce the same rule in the API route.

## Database Requirements

- Define the database structure required by better-auth and Prisma for:
  - users
  - sessions
  - accounts
  - verification records if required by better-auth
- Use better-auth recommended column names, constraints, and indexes unless there is a documented reason not to.
- Use Prisma best practices for IDs, timestamps, uniqueness, and relations.
- Use PostgreSQL-compatible field types.
- Keep auth tables separate from future game history tables.
- Do not add completed game persistence tables in this spec unless better-auth setup requires an auth-related relation.
- Do not store secrets, OAuth tokens, or provider data in ad hoc local files.

## Environment Requirements

- Document required environment variables in the appropriate local example or setup notes if such a file exists.
- Required values should include:
  - database connection string
  - better-auth secret
  - better-auth base URL
  - Google OAuth client ID
  - Google OAuth client secret
- Do not commit real secrets.
- Ensure `.gitignore` protects local environment files.

## Implementation Changes

- Install or verify required dependencies:
  - `better-auth`
  - `prisma`
  - `@prisma/client`
  - PostgreSQL driver or Prisma adapter required by the project setup
- Create or complete Prisma schema/configuration for PostgreSQL.
- Generate Prisma client after schema changes.
- Add a single shared Prisma client helper to avoid duplicate clients in development.
- Configure better-auth with Google provider and Prisma adapter.
- Add auth API route handler.
- Add server session/user helper.
- Update `POST /api/game` so game creation requires an authenticated human user.
- Ensure AI game creation still creates an AI virtual player without treating AI as an authenticated user.
- Update the main/new-game UI so unauthenticated users see only sign-in UI.
- Add authenticated user display and sign-out affordance where appropriate.
- Keep route handlers thin by pushing auth/session lookup into shared helpers.

## Out Of Scope

- Email/password auth.
- Additional OAuth providers.
- Full profile management.
- Account linking UI.
- Role-based authorization.
- Admin tools.
- Game history UI.
- Completed game persistence.
- Per-move persistence.
- Matchmaking.
- Replay or analysis.
- Changing chess rules, reducer behavior, or engine behavior.

## Boundary Rules

- Auth establishes human identity only.
- Active game state remains in memory inside the orchestrator.
- The database is not the source of truth for active games.
- Prisma must not be used in the per-move critical path.
- API routes enforce auth before mutation.
- Client components can branch on session state for rendering, but cannot be the authority for access control.
- Edge runtime may be used only for lightweight auth protection or route guards.
- Node runtime is required wherever Prisma, Ably, Chess.js, orchestrator state, or AI moves are used.

## Error Behavior

- Unauthenticated game creation must return an unauthorized response.
- Invalid game creation payloads must continue using the validation behavior from Spec 11.
- Auth failures must not expose secrets, provider tokens, stack traces, or database details.
- Failed Google sign-in should return the user to a clear sign-in state.

## Test Plan

- Verify unauthenticated users do not see the new game page or start-game controls.
- Verify unauthenticated `POST /api/game` does not create a game.
- Verify authenticated users can create human games.
- Verify authenticated users can create AI games.
- Verify AI virtual players do not require auth records.
- Verify invalid game creation payloads are still rejected by the Zod validation layer.
- Verify sign-in and sign-out update the UI state correctly.
- Verify better-auth tables are created with expected fields, indexes, and constraints.
- Verify Prisma client generation succeeds.
- Verify no Prisma access was added to per-move realtime processing.
- Verify no `middleware.ts` authorization is introduced.
- Run the narrowest useful check: lint/build or focused TypeScript check available in the repo.

## Assumptions

- Google OAuth is sufficient for initial product authentication.
- better-auth remains the project-standard auth library.
- PostgreSQL is available for local development.
- Existing browser `sessionStorage` player IDs may continue to exist as game-seat identifiers, but they are not trusted account identity.
- Future specs will connect authenticated users to completed game persistence and history.

## Constraints

- Keep this change limited to auth and user persistence foundation.
- Preserve all architecture invariants from `context/architecture-context.md`.
- Do not make active games database-backed.
- Do not write game moves to the database in this spec.
- Do not add a broad auth abstraction beyond what better-auth and local helpers require.
- Use official current Next.js, better-auth, and Prisma documentation during implementation.
- Read `node_modules/next/dist/docs/` before writing Next.js route or runtime code.

## Verify

- `context/code-standards.md` is correctly followed during the implementation.
- Application builds.
- TypeScript does not emit errors.
- Required dependencies are installed and justified.
- Relevant tests or focused runtime checks pass.
- Every changed file respects the documented boundaries and standards.
- Only authenticated human players can start games.
- AI virtual players are excluded from the authentication requirement.
- The new game page and new game controls do not appear for unauthenticated users.
- Database structure is consistent with Prisma and better-auth best practices.
- Database types are correct and consistent.

Update progress-tracker.md when you are finished:
- Set In Progress back to None.
- Add only the completed current spec/item.
- Update Current Goal and Next Up if they changed.
- Do not add new sections.
