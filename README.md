# VibeChess

VibeChess is a vibe-coded chess.com clone with a smaller scope. This project will serve as a way to figure out this '_spec driven development_' trend.

## Specification Driven Development (SDD)
**Specification Driven Developement** is not a new concept, it has existed as long as software engineering did. The difference now code is completely driven by coding agents like [Claude](https://claude.com/product/overview) and [Codex](https://openai.com/codex/).

The way **SDD** works is by writing a formal or semi-formal specification of what your application/system should do before implementing any code. Traditionally, These **specifications** serve as documents for developers to read and implement.

Code is then checked against the spec itself (via testing, proofs, or validation)

### Agentic Coding
The current trend of how **SDD** being used is by defining two important things:
 - **Context**: Project overview, code guidelines, AI workflow rules, architecture, and UI context.
 - **Contracts (specs)**: For AI agents to validate, generate, and iterate on code.

The key mindset shift is that you are now designing a system where AI generates code that satisfies a specification and continuously corrects itself against it.

## Methdology
This project is setup from scratch, the only manual work that is being done by a Human is the `context/` folder and the `AGENTS.md` file, both found in the root of this project. 

The code implementation is completely written by [Claude](https://claude.com/product/overview) and [Codex](https://openai.com/codex/).

### Context Folder
The context folder is structured as follows:
1. `context/project-overview.md`: product definition, goals, features, and scope
2. `context/architecture-context.md`: system structure, boundaries, storage model, and invariants
3. `context/ui-context.md`: theme, colors, typography, canvas design, and component conventions
4. `context/code-standards.md`: implementation rules and conventions
5. `context/ai-workflow-rules.md`: development workflow, scoping rules, and delivery approach
6. `context/progress-tracker.md`: current phase, completed work, open questions, and next steps
7. `context/spec/ folder`: contains specs that will be implemented.

Another file that you will not find committed is `context/current-issues.md`, this contains any issues found during manual testing by a Human. this is meant as one off prompt as we do not want errors to conflict with other developers.

### Spec Files
For Spec files I first followed this pattern:
```md
read AGENTS.md for context about this project.

{spec details}

Do not forget to inforce invariants
```

However I noticed that after it is done, the agent does not update progress tracker file to indicate that this spec is done. Additionally, I noticed it adding more sections inside the
progress tracker which I did not ask for. Additionally, I found out it did not enforce the invariants defined in the context files.

After some testing, This is the structure I settled on:
```md
# Spec Name + Number
read AGENTS.md for context about this project.

## What this layer should do
{spec details}

## Things to Check
- application builds
- all necessary libraries are installed
- typescript does not emit errors
- do not forget to enforce invariants
- {any other custom things to check for}

Update progress-tracker.md when you are finished:
- remove any unnecessary session context
- update completed items (no need to mention past completed items, just the current item)
- do not add any new sections
```

This yielded the most consistent results

## Prompt
```bash
read @context/specs/{spec-file-name}.md, update @context/progress-tracker.md to mark this spec
as in progress, then implement spec as specified.
```

## References
- [Specification Driven Development](https://en.wikipedia.org/wiki/Specification-driven_development)
- [javascript mastery approach to spec driven development](https://www.youtube.com/watch?v=14RP8liACqo)
- [reddit: casamia123 and Actual-Interest-2365 discussion offers great points and insight](https://www.reddit.com/r/ClaudeCode/comments/1rg0b9i/comment/obckjeg/)
