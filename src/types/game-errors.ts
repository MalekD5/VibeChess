export const GAME_NOT_FOUND = 'GAME_NOT_FOUND' as const;

interface GameErrorWithCode {
  code?: unknown;
}

export class GameNotFoundError extends Error {
  readonly code = GAME_NOT_FOUND;

  constructor(gameId: string) {
    super(`Game ${gameId} not found`);
    this.name = 'GameNotFoundError';
  }
}

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
