import { gameManager } from '@/manager/game-manager';
import { hasActiveGameInvite } from '@/lib/active-game-invites';
import { isGameNotFoundError } from '@/types/game-errors';
import type { GameState } from '@/types/game';

export type ActiveGameAccess =
  | {
      ok: true;
      state: GameState;
      access: 'participant' | 'invite';
    }
  | {
      ok: false;
      reason: 'not_found' | 'forbidden';
    };

interface ActiveGameAccessInput {
  gameId: string;
  userId: string;
  inviteToken?: string | null;
}

function isParticipantOrOwner(state: GameState, userId: string): boolean {
  return (
    state.ownerId === userId ||
    state.players.white?.id === userId ||
    state.players.black?.id === userId
  );
}

export async function getActiveGameAccess({
  gameId,
  userId,
  inviteToken,
}: ActiveGameAccessInput): Promise<ActiveGameAccess> {
  let state: GameState;

  try {
    state = gameManager.getGame(gameId);
  } catch (err) {
    if (isGameNotFoundError(err)) {
      return { ok: false, reason: 'not_found' };
    }

    throw err;
  }

  if (isParticipantOrOwner(state, userId)) {
    return { ok: true, state, access: 'participant' };
  }

  if (state.status === 'waiting' && (await hasActiveGameInvite(gameId, inviteToken))) {
    return { ok: true, state, access: 'invite' };
  }

  return { ok: false, reason: 'forbidden' };
}
