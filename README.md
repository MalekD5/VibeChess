# VibeChess

VibeChess is a vibe-coded chess.com clone with a smaller scope. This project will serve as a way to figure out this '_spec driven development_' trend.

![Project Overview](/.github/images/project-overview.png)

## Specification Driven Development (SDD)
**Specification Driven Developement** is not a new concept, it has existed as long as software engineering did. The difference now code is completely driven by coding agents like [Claude](https://claude.com/product/overview) and [Codex](https://openai.com/codex/).

The way **SDD** works is by writing a formal or semi-formal specification of what your application/system should do before implementing any code. Traditionally, These **specifications** serve as documents for developers to read and implement.

Code is then checked against the spec itself (via testing, proofs, or validation)

### Agentic Coding
The current trend of how **SDD** being used is by defining two important things:
 - **Context**: Project overview, code guidelines, AI workflow rules, architecture, and UI context.
 - **Contracts (specs)**: For AI agents to validate, generate, and iterate on code.

The key mindset shift is that you are now designing a system where AI generates code that satisfies a specification and continuously corrects itself against it.

## Journey

The next sections are mostly observations/description of how I implemented this project, what were the challenges and blockers, and final honest assesment of Spec Driven Development powered by AI.

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
Early spec prompts used this pattern:
```md
read AGENTS.md for context about this project.

{spec details}

Do not forget to inforce invariants
```

That was too loose. Agents often forgot to update `context/progress-tracker.md`, added unwanted sections, or implemented behavior without checking the architecture invariants.

The preferred spec prompt is now:
```md
# Spec Name + Number

Read `AGENTS.md`, then read the required context files in the documented order.
Do not use files under `context/specs/` except this spec file.

Before implementation:
- Update `context/progress-tracker.md` to mark this spec as in progress.
- Identify the system boundary this spec belongs to.
- Note any ambiguity in `context/progress-tracker.md` before making assumptions.

## What this layer should do
{spec details}

## Constraints
- Keep the change limited to this spec.
- Preserve the invariants from `context/architecture-context.md`.
- Keep UI, game logic, networking, persistence, and orchestration concerns separate.
- Do not invent product behavior outside the context files and this spec.

## Verify
- Application builds.
- TypeScript does not emit errors.
- Required dependencies are installed and justified.
- Relevant tests or focused runtime checks pass.
- Every changed file respects the documented boundaries and standards.
- {any other custom things to check for}

Update progress-tracker.md when you are finished:
- Set In Progress back to None.
- Add only the completed current spec/item.
- Update Current Goal and Next Up if they changed.
- Do not add new sections.
```

This yields the most consistent results because it forces the agent to load context, declare scope, preserve invariants, verify the result, and keep progress tracking tidy.

## Prompt
```bash
Read `AGENTS.md`, then read `context/specs/{spec-file-name}.md`.
Update `context/progress-tracker.md` to mark the spec in progress, implement only that spec,
verify the result, then update `context/progress-tracker.md` to mark it complete.
```

## Codex Issues
While using Codex GPT 5.5, I observed multiple issues worth mentioning.

### Code Structure Issues
Codex tends to struggle with frontend structure. It often jams everything into a single file.

When asked to refactor the single file into something more modular and structurally coherent, it created a folder under `components` and generated 11 files inside it.

When asked to follow `code-standards.md` for file organization, it still missed five files and placed them under `components`.

I attempted to fix this by referencing `code-standards.md` in the spec, prompt, and verification step, but this did not yield positive results.

This modified prompt still did not yield a better result with Codex:
```bash
read @AGENTS.md , then read @context/specs/08-component-cleanup.md spec. 
update @context/progress-tracker.md to mark spec in progress,
 implement spec while respecting @context/code-standards.md file organization, 
 verify result against @context/code-standards.md, 
 then update @context/progress-tracker.md to mark spec as completed
```

So I gave up on Codex, dropped all Codex changes, and re-executed the spec implementation using Claude Sonnet 4.6. Running Sonnet on low initially yielded results in the right direction, but it still produced a 400+ line component with some utility functions left inside it.

I increased the model setting to high, and it produced a somewhat satisfactory result, though not what I wanted. For now, it is good enough to proceed.

### Weak Plan Mode Capabilities
Another issue with Codex is most of the times it jumps a head before actually understanding the problem at hand during the plan mode. 

When given a specific senario it mainly just try to find the problem quickly instead of actually collecting information and context to see what might be causing it (see [Realtime Issues](#realtime-issues)).

When prompted about the Realtime Issues problem, Codex ran for a grand total of 5 minutes on extra high.

When it was prompted to Claude, it ran for 1 hour on Sonnet 4.6 High before it actually figured out the issue (seat assignment broadcast rejection)

Both were on plan mode.

## Realtime Issues
During testing, I found out that the new structure that claude made completely broke the client-side handling for the realtime events.

Attempting to fix this using Codex 5.5 first in medium and extra high did not work. Here is the prompted that was used on Codex:

```bash
Here is the situation:
- I create a new game and pick white
- I get invalid state message recieved

However, when another player joins, it automatically assigns the black seat to the player

I tested the inverse state where the creator of the game chooses black, and when another player joined it automatically assigned the player to white. for the second player I got this message: Seat request was sent, but no server state update arrived.

for the creator of the game, he gets this messge: Invalid state message received
```

After manually checking, it appears that the server-side logic is correct. However, client is rejecting the broadcast event to confirm seat assignment. Problems happening at the frontend after the refactor was expected.

I'm going to use Claude to see if the issue could be caught. I used the same prompt above I used on Codex.

### Claude Findings
Claude was able to figure out the issue and it is broken down into 2 parts:
- The subscriber (`handleState` function) is suppose to use InboundMessage, not Message causing a response rejection
- Timestamp type mismatch (likely secondary cause)

and to Codex credit, it actually fixed other 3 issues that helped Claude to actually figure out where to look for to fix this rejection error.

For a grand total of an hour of reasoning, the fix is actually 6 line change:
![Subscriber Fix](/.github/images/subscriber-issue.png)
![Timestamp Fix](/.github/images/timestamp-issue.png)

However, after manual test the issue is still present, after giving Claude the error message with the object it fixed it.
![Undefined Result Fix](/.github/images/undefined-result-issue.png)

> The object is missing result entirely — the field is undefined, not null. The isResult guard only accepts null as the "no result yet" value - Claude

that was the issue, so all of the issues that Codex fixed had nothing to do with the actual issue. The server omits result from the payload when the game is in waiting/active state, and the client's type guard treated undefined differently from null.

## Multi-Modal

One thing that is apparent to me is that you need to have multiple models at hand to be able to work on a project that uses Spec Driven Development. One model is simply not suffiencent to do any real work. 

The only reason why I'm still sane is that I can switch between Codex and Claude depending on the task at hand.

## References
- [Specification Driven Development](https://en.wikipedia.org/wiki/Specification-driven_development)
- [javascript mastery approach to spec driven development](https://www.youtube.com/watch?v=14RP8liACqo)
- [reddit: casamia123 and Actual-Interest-2365 discussion offers great points and insight](https://www.reddit.com/r/ClaudeCode/comments/1rg0b9i/comment/obckjeg/)
