import { gameManager } from '@/manager/game-manager';
import { hasActiveGameInvite } from '@/lib/active-game-invites';
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

export function getActiveGameAccess({
  gameId,
  userId,
  inviteToken,
}: ActiveGameAccessInput): ActiveGameAccess {
  let state: GameState;

  try {
    state = gameManager.getGame(gameId);
  } catch (err) {
    if (err instanceof Error && err.message.includes('not found')) {
      return { ok: false, reason: 'not_found' };
    }

    throw err;
  }

  if (isParticipantOrOwner(state, userId)) {
    return { ok: true, state, access: 'participant' };
  }

  if (state.status === 'waiting' && hasActiveGameInvite(gameId, inviteToken)) {
    return { ok: true, state, access: 'invite' };
  }

  return { ok: false, reason: 'forbidden' };
}
