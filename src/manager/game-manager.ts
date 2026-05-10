import { orchestrator } from '@/orchestrator/game-orchestrator';
import { persistCompletedGame } from '@/lib/game-history';
import { revokeActiveGameInviteAccess } from '@/lib/active-game-invites';
import type { GameAction, GameMode, GameState } from '@/types/game';

const queues = new Map<string, Promise<unknown>>();

function enqueue<T>(gameId: string, task: () => T | Promise<T>): Promise<T> {
  const prev = queues.get(gameId) ?? Promise.resolve();
  const next = prev.then(task);
  // absorb errors so a rejected task never stalls subsequent enqueued tasks
  queues.set(gameId, next.catch(() => {}));
  return next;
}

/**
 * Serialises all per-game lifecycle operations through a per-game promise queue,
 * guaranteeing that concurrent callers never interleave create / delete / move
 * operations on the same game.
 */
class GameManager {
  /**
   * Creates a new game and returns its initial state snapshot.
   *
   * @param gameId - Unique identifier for the game to create.
   * @returns A promise that resolves to the initial {@link GameState}.
   * @throws If the orchestrator rejects the creation (e.g. duplicate id).
   */
  createGame(
    gameId: string,
    ownerId: string,
    mode: GameMode = 'human',
  ): Promise<GameState> {
    return enqueue(gameId, () => {
      const snapshot = orchestrator.createGame(gameId, ownerId, mode);
      console.log(`[GameManager] game created: ${gameId}`);
      return snapshot;
    });
  }

  /**
   * Returns the current state snapshot for an existing game.
   *
   * @param gameId - Unique identifier of the game.
   * @returns The current {@link GameState}.
   * @throws If no game with the given id exists.
   */
  getGame(gameId: string): GameState {
    return orchestrator.getState(gameId);
  }

  /**
   * Deletes a game and cleans up its queue entry.
   *
   * @param gameId - Unique identifier of the game to delete.
   * @returns A promise that resolves when deletion is complete.
   * @throws If the orchestrator rejects the deletion.
   */
  deleteGame(gameId: string): Promise<void> {
    const result = enqueue(gameId, async () => {
      orchestrator.deleteGame(gameId);
      await revokeActiveGameInviteAccess(gameId);
      console.log(`[GameManager] game deleted: ${gameId}`);
    });
    result.finally(() => queues.delete(gameId));
    return result;
  }

  /**
   * Dispatches a {@link GameAction} against an existing game and returns the
   * updated state snapshot.
   *
   * @param gameId - Unique identifier of the game.
   * @param action - The action to apply (e.g. `MAKE_MOVE`).
   * @returns A promise that resolves to the updated {@link GameState}.
   * @throws Re-throws any error raised by the orchestrator (invalid move, etc.).
   */
  processEvent(gameId: string, action: GameAction): Promise<GameState> {
    console.log(`[GameManager] event received: game=${gameId} type=${action.type}`);
    return enqueue(gameId, async () => {
      try {
        const previousStatus = orchestrator.getState(gameId).status;
        const snapshot = orchestrator.dispatch(gameId, action);
        if (previousStatus === 'waiting' && snapshot.status !== 'waiting') {
          await revokeActiveGameInviteAccess(gameId);
        }
        if (snapshot.status === 'finished') {
          await persistCompletedGame(snapshot);
          console.log(`[GameManager] completed game persisted: ${gameId}`);
        }
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

/** Singleton {@link GameManager} instance used throughout the application. */
export const gameManager = new GameManager();
