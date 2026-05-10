/**
 * Error code used to identify a "game not found" condition.
 *
 * Used as the `code` property on {@link GameNotFoundError} and for
 * duck-type detection in {@link isGameNotFoundError}.
 */
export const GAME_NOT_FOUND = 'GAME_NOT_FOUND' as const;

interface GameErrorWithCode {
  code?: unknown;
}

/**
 * Error thrown when a requested game cannot be found.
 *
 * Carries a `code` property equal to {@link GAME_NOT_FOUND} so that
 * plain error objects originating outside this module can be recognized
 * by {@link isGameNotFoundError}.
 *
 * @example
 * throw new GameNotFoundError(gameId);
 *
 * @example
 * try { ... } catch (err) {
 *   if (isGameNotFoundError(err)) handleMissing(err);
 * }
 */
export class GameNotFoundError extends Error {
  readonly code = GAME_NOT_FOUND;

  constructor(gameId: string) {
    super(`Game ${gameId} not found`);
    this.name = 'GameNotFoundError';
  }
}

/**
 * Type guard that checks whether an unknown value is a {@link GameNotFoundError}.
 *
 * Accepts both true `GameNotFoundError` instances and plain objects that carry
 * a `code` property equal to {@link GAME_NOT_FOUND}, enabling cross-realm
 * and serialized-error detection.
 *
 * @param {unknown} err - The value to test.
 * @returns {boolean} `true` if `err` is a GameNotFoundError or a compatible
 *   error-like object; `false` otherwise.
 */
export function isGameNotFoundError(err: unknown): err is GameNotFoundError {
  if (err instanceof GameNotFoundError) {
    return true;
  }

  return (
    typeof err === 'object' &&
    err !== null &&
    (err as GameErrorWithCode).code === GAME_NOT_FOUND
  );
}
