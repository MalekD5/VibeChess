# Spec 4: Ably Adapter
read @AGENTS.md for context about this project.

Implement Realtime adapter for Able

```
Ably messages → Game Manager → Orchestrator → State → Ably broadcast
```

## What this layer should do

- Channel per game model: each game = one ably channel
    - namming convention: `game:{gameId}`
- Incoming event handling: when a client sends a JSON message you validate the basic shape of the message and pass it to a handler function from the game manager
- Outgoing state broadcast: after every valid event:
   - get updatred state snapshot
   - broadcast full state
   - always send full snapshot, not diffs
- Connectivity Flow
   - Client: subscribes to `game:{gameId}` and sends events via channel
   - Server: subscribes to the same channel (or uses Ably server SDK) [listens → routes → broadcasts]

## Things to Check
- application builds
- all necessary libraries are installed
- typescript does not emit errors
- do not forget to enforce invariants

Update progress-tracker.md when you are finished:
- remove any unnecessary session context
- update completed items (no need to mention past completed items, just the current item)
- do not add any new sections