# Vibe Chess

## Overview

VibeChess is a modern, minimal chess platform inspired by Chess.com, focused on fast gameplay, clean UI, and a real-time experience

## Core Goals

- Enable real-time chess games between two players
- Provide a smooth, intuitive gameplay experience
- Maintain strict separation between UI, game logic, and networking
- Create a visually clean and modern chess interface
- Support basic user sessions (no full auth system initially)
- Support game sessions against AI

## Core User Flow

1. User signs in.
2. User selects game mode (Human or AI)
3. User selects a color (White or Black)
4. App initializes a new game session
5. User enters the game board
6. User plays by making moves
7. App validates moves and updates the game state
8. App determines the game outcome (win, loss, or draw)
9. App displays the final result
10. App returns the user to the main screen to start a new game

## Features

### Gameplay
- Create a game session
- Share human games with a server-issued invite link; game IDs alone do not grant access
- Real-time move synchronization (server authoritative)
- Legal move validation
- Turn enforcement

## AI
- Games against an AI user
- AI has different difficulties (easy, medium, hard)

### Game State
- Board state management (FEN)
- Move history tracking
- Game end detection (checkmate, stalemate)

### UI
- Interactive chessboard
- Piece movement (drag-and-drop or click-based)
- Game status display (turn, check, result)

## Scope

## In Scope
- Authentication and route protection
- Invite-only access for waiting human games
- Game history per account with result
- Basic private move-by-move review for completed game history
- Full chess game logic
- AI-Powered game play
- No Time limits
- Board State management (FEN)
- Real time game play against other human players
- Ability to share game result (FEN)
- Persistent Storage system for games

### Out Of Scope
- Player timers (blitz/rapid)
- Spectator mode
- Basic matchmaking (queue system)
- Game replay system
- Rating or ELO
- Game analysis
- Public or analysis-grade game replay system
- Billing and subscription systems
- Production object storage migration

## Constraints

- Must remain lightweight and fast (low latency focus)
- Must support real-time updates (WebSockets or equivalent)
- Must separate:
  - Game logic (pure, deterministic)
  - Transport layer (networking)
  - UI layer

- No premature optimization for scale
- No unnecessary abstractions

## Success Criteria
- Two players can complete a full game without desync
- One player and an AI can complete a game without desync
- Moves are validated correctly
- UI reflects game state in real-time
- Codebase remains modular and understandable
