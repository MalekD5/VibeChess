read AGENTS.md for context about this project.

Implement a game manager: this will act as the process level controller that owns all active orchestrators

What this layer should do:
- Game Registry: a simple in-memory map which handles create, get delete (on game end)
- Single Entry Point for Events, responsible for:
 - finding the correct game
 - pass event to orchestrator
 - return updated snapshot
- Concurrency Safety: events processed sequentially per game
- Lifecycle Management: handles game creation, cleanup, player joining
- Logging/Debugging Hooks: basic logging for event received, move applied, and invalid move rejected

Do not forget to enforce invariants

Update progress-tracker.md when you are finished:
- remove any unnecessary session context
- update completed items (no need to mention past completed items, just the current item)
- do not add any new sections