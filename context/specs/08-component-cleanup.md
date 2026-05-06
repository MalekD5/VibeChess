# Spec 08: Component Cleanup

Read `AGENTS.md`, then read the required context files in the documented order.
Do not use files under `context/specs/` except this spec file.

Before implementation:
- Update `context/progress-tracker.md` to mark this spec as in progress.
- Identify the system boundary this spec belongs to.
- Note any ambiguity in `context/progress-tracker.md` before making assumptions.

## What this layer should do

The current component `src/components/vibe-chess-app.tsx` is a 700+ lines and very difficult to read. This should be split into a modular code without changing the logic so it can be clean and readable.

respect `context/code-standards.md` while implementing this spec.

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