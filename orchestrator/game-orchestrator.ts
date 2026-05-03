import { createInitialState, reducer } from '@/orchestrator/reducer';
import type { GameState, GameAction } from '@/types/game';

class GameOrchestrator {
  private games: Map<string, GameState> = new Map();

  createGame(gameId: string): GameState {
    if (this.games.has(gameId)) {
      throw new Error(`Game ${gameId} already exists`);
    }
    const state = createInitialState(gameId);
    this.games.set(gameId, state);
    return state;
  }

  getState(gameId: string): GameState {
    const state = this.games.get(gameId);
    if (!state) {
      throw new Error(`Game ${gameId} not found`);
    }
    return state;
  }

  dispatch(gameId: string, action: GameAction): GameState {
    const current = this.getState(gameId);
    const next = reducer(current, action);
    this.games.set(gameId, next);
    return next;
  }

  deleteGame(gameId: string): void {
    this.games.delete(gameId);
  }
}

export const orchestrator = new GameOrchestrator();
