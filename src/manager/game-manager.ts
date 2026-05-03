import { orchestrator } from '@/orchestrator/game-orchestrator';
import type { GameAction, GameState } from '@/types/game';

const queues = new Map<string, Promise<unknown>>();

function enqueue<T>(gameId: string, task: () => T): Promise<T> {
  const prev = queues.get(gameId) ?? Promise.resolve();
  const next = prev.then(task);
  // absorb errors so a rejected task never stalls subsequent enqueued tasks
  queues.set(gameId, next.catch(() => {}));
  return next;
}

class GameManager {
  createGame(gameId: string): Promise<GameState> {
    return enqueue(gameId, () => {
      const snapshot = orchestrator.createGame(gameId);
      console.log(`[GameManager] game created: ${gameId}`);
      return snapshot;
    });
  }

  getGame(gameId: string): GameState {
    return orchestrator.getState(gameId);
  }

  deleteGame(gameId: string): Promise<void> {
    const result = enqueue(gameId, () => {
      orchestrator.deleteGame(gameId);
      console.log(`[GameManager] game deleted: ${gameId}`);
    });
    result.finally(() => queues.delete(gameId));
    return result;
  }

  processEvent(gameId: string, action: GameAction): Promise<GameState> {
    console.log(`[GameManager] event received: game=${gameId} type=${action.type}`);
    return enqueue(gameId, () => {
      try {
        const snapshot = orchestrator.dispatch(gameId, action);
        if (action.type === 'MAKE_MOVE') {
          console.log(`[GameManager] move applied: game=${gameId} move=${JSON.stringify(action.move)}`);
        } else {
          console.log(`[GameManager] action applied: game=${gameId} type=${action.type}`);
        }
        return snapshot;
      } catch (err) {
        const reason = err instanceof Error ? err.message : String(err);
        console.warn(`[GameManager] invalid move rejected: game=${gameId} type=${action.type} reason=${reason}`);
        throw err;
      }
    });
  }
}

export const gameManager = new GameManager();
