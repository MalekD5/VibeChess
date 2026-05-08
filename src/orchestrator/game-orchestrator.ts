import { createInitialStateForOwner, reducer } from '@/orchestrator/reducer';
import { normalizeGameState } from '@/orchestrator/game-state-normalizer';
import type { GameState, GameAction } from '@/types/game';
import type { GameMode } from '@/types/game';

class GameOrchestrator {
  private games: Map<string, GameState> = new Map();

  private snapshot(state: GameState): GameState {
    return structuredClone(state);
  }

  createGame(gameId: string, ownerId: string, mode: GameMode = 'human'): GameState {
    if (this.games.has(gameId)) {
      throw new Error(`Game ${gameId} already exists`);
    }
    const state = createInitialStateForOwner(gameId, ownerId, mode);
    this.games.set(gameId, state);
    return this.snapshot(state);
  }

  getState(gameId: string): GameState {
    const state = this.games.get(gameId);
    if (!state) {
      throw new Error(`Game ${gameId} not found`);
    }
    const normalized = normalizeGameState(state);
    if (normalized !== state) {
      this.games.set(gameId, normalized);
    }
    return this.snapshot(normalized);
  }

  dispatch(gameId: string, action: GameAction): GameState {
    const current = this.getState(gameId);
    const next = reducer(current, action);
    this.games.set(gameId, next);
    return this.snapshot(next);
  }

  deleteGame(gameId: string): void {
    this.games.delete(gameId);
  }
}

const globalForVibeChess = globalThis as typeof globalThis & {
  __vibechessOrchestrator?: GameOrchestrator;
};

export const orchestrator =
  globalForVibeChess.__vibechessOrchestrator ?? new GameOrchestrator();

globalForVibeChess.__vibechessOrchestrator = orchestrator;
