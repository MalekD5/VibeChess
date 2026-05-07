import { selectAiMove } from '@/engine/ai-move-selector';
import { gameManager } from '@/manager/game-manager';
import type { GameState } from '@/types/game';

export async function playAiTurnIfNeeded(
  state: GameState,
  publishState: (state: GameState) => Promise<void>,
): Promise<GameState> {
  if (state.status !== 'active') return state;

  const player = state.players[state.currentTurn];
  if (!player || player.kind !== 'ai') return state;

  const move = selectAiMove(state.fen, player.aiDifficulty);
  if (!move) return state;

  const nextState = await gameManager.processEvent(state.gameId, {
    type: 'MAKE_MOVE',
    playerId: player.id,
    move,
  });
  await publishState(nextState);
  return nextState;
}
