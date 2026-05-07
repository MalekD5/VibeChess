import type { RealtimeChannel } from 'ably';
import { getServerRealtime } from '@/lib/ably';
import { gameManager } from '@/manager/game-manager';
import { playAiTurnIfNeeded } from '@/manager/ai-turn';
import { parseClientGameActionMessage } from '@/lib/game-schemas';
import type { GameState } from '@/types/game';

const globalForVibeChess = globalThis as typeof globalThis & {
  __vibechessAblyActiveChannels?: Map<string, RealtimeChannel>;
};

const activeChannels =
  globalForVibeChess.__vibechessAblyActiveChannels ?? new Map<string, RealtimeChannel>();

globalForVibeChess.__vibechessAblyActiveChannels = activeChannels;

function getActionPlayer(state: GameState, playerId: string) {
  if (state.players.white?.id === playerId) return state.players.white;
  if (state.players.black?.id === playerId) return state.players.black;
  return null;
}

function isHumanControlledPlayer(player: ReturnType<typeof getActionPlayer>): boolean {
  return player !== null && player.kind !== 'ai';
}

class AblyGameAdapter {
  async publishState(gameId: string, state: GameState): Promise<void> {
    const channel = activeChannels.get(gameId) ?? getServerRealtime().channels.get(`game:${gameId}`);
    await channel.publish('state', state);
  }

  async subscribe(gameId: string): Promise<void> {
    if (activeChannels.has(gameId)) return;

    const channel = getServerRealtime().channels.get(`game:${gameId}`);

    await channel.subscribe('action', async (message) => {
      const action = parseClientGameActionMessage(message.data);

      if (!action) {
        console.warn(`[AblyGameAdapter] invalid message shape on game:${gameId}`);
        await channel.publish('error', { message: 'Invalid message shape' });
        return;
      }

      try {
        const currentState = gameManager.getGame(gameId);
        const actionPlayer =
          action.type === 'MAKE_MOVE' || action.type === 'RESIGN'
            ? getActionPlayer(currentState, action.playerId)
            : null;

        if (actionPlayer?.kind === 'ai') {
          throw new Error('AI players are server-controlled');
        }

        const state = await gameManager.processEvent(gameId, action);
        await this.publishState(gameId, state);

        if (action.type === 'MAKE_MOVE' && isHumanControlledPlayer(actionPlayer)) {
          await playAiTurnIfNeeded(state, (nextState) =>
            this.publishState(gameId, nextState),
          );
        }
      } catch (err) {
        const reason = err instanceof Error ? err.message : String(err);
        console.warn(`[AblyGameAdapter] rejected action on game:${gameId}: ${reason}`);
        await channel.publish('error', { message: reason });
      }
    });

    activeChannels.set(gameId, channel);
    console.log(`[AblyGameAdapter] subscribed to game:${gameId}`);
  }

  async unsubscribe(gameId: string): Promise<void> {
    const channel = activeChannels.get(gameId);
    if (!channel) return;
    await channel.detach();
    activeChannels.delete(gameId);
    console.log(`[AblyGameAdapter] unsubscribed from game:${gameId}`);
  }

  isSubscribed(gameId: string): boolean {
    return activeChannels.has(gameId);
  }
}

export const ablyGameAdapter = new AblyGameAdapter();
