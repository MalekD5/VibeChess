<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

<!-- BEGIN:zod-agent-rules -->
# This is NOT the Zod you know

This project uses Zod v4.4.3. Your training data may describe older Zod APIs and type behavior. Before writing or changing Zod schemas, use the `zod` skill first, then confirm the exact current API and inferred types against the installed package in `node_modules/zod/` (especially the `.d.ts` files) instead of relying on memory.
<!-- END:zod-agent-rules -->

## Application Building Context

Read the following files in order before implementing or making any architectural decision:

1. `context/project-overview.md` — product definition, goals, features, and scope
2. `context/architecture-context.md` — system structure, boundaries, storage model, and invariants
3. `context/ui-context.md` — theme, colors, typography, canvas design, and component conventions
4. `context/code-standards.md` — implementation rules and conventions
5. `context/ai-workflow-rules.md` — development workflow, scoping rules, and delivery approach
6. `context/progress-tracker.md` — current phase, completed work, open questions, and next steps

Update `context/progress-tracker.md` after each meaningful implementation change.

If implementation changes the architecture, scope, or standards documented in the context files, update the relevant file before continuing.

## Spec Implementation Discipline

When implementing a spec:

1. Read only the requested spec file under `context/specs/`; do not browse unrelated specs for extra scope.
2. Mark the spec as in progress in `context/progress-tracker.md` before changing implementation files.
3. Keep the change limited to the named spec and the documented system boundary.
4. Enforce the invariants in `context/architecture-context.md` before considering the work complete.
5. Verify the change with the narrowest useful build, typecheck, test, or runtime check.
6. Finish by updating `context/progress-tracker.md` without adding new sections.
