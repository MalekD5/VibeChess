read AGENTS.md for context about this project.

Define a single source of truth object for game state:
 - gameId
 - players (white/black)
 - current turn
 - board state (FEN)
 - status (waiting / active / finished)
 - move history (array)
 - timestamps

integrate Chess.js engine, which is already installed. Do not let Chess.js leak outside.

add also Orchestrator wrapper, which is a thin layer around the reducer:
 - holds current state in memory
 - contains mutation functions which should only happen via the reducer

Do not forget to inforce invariants