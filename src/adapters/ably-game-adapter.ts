import type { RealtimeChannel } from 'ably';
import { getServerRealtime } from '@/lib/ably';
import { gameManager } from '@/manager/game-manager';
import { playAiTurnIfNeeded } from '@/manager/ai-turn';
import type { GameAction, GameState, MoveInput, PlayerColor } from '@/types/game';

const globalForVibeChess = globalThis as typeof globalThis & {
  __vibechessAblyActiveChannels?: Map<string, RealtimeChannel>;
};

const activeChannels =
  globalForVibeChess.__vibechessAblyActiveChannels ?? new Map<string, RealtimeChannel>();

globalForVibeChess.__vibechessAblyActiveChannels = activeChannels;

function isPlayerColor(value: unknown): value is PlayerColor {
  return value === 'white' || value === 'black';
}

function isMoveInput(value: unknown): value is MoveInput {
  if (typeof value === 'string') return true;
  if (typeof value !== 'object' || value === null) return false;
  const obj = value as Record<string, unknown>;
  return typeof obj.from === 'string' && typeof obj.to === 'string';
}

function parseJsonObject(value: unknown): Record<string, unknown> | null {
  if (typeof value === 'object' && value !== null) {
    return value as Record<string, unknown>;
  }

  if (typeof value !== 'string') return null;

  try {
    const parsed = JSON.parse(value) as unknown;
    return typeof parsed === 'object' && parsed !== null
      ? (parsed as Record<string, unknown>)
      : null;
  } catch {
    return null;
  }
}

function parseAction(data: unknown): GameAction | null {
  const msg = parseJsonObject(data);
  if (!msg) return null;
  if (typeof msg.playerId !== 'string') return null;

  switch (msg.type) {
    case 'JOIN_GAME':
      if (!isPlayerColor(msg.color)) return null;
      return { type: 'JOIN_GAME', playerId: msg.playerId, color: msg.color };

    case 'MAKE_MOVE':
      if (!isMoveInput(msg.move)) return null;
      return { type: 'MAKE_MOVE', playerId: msg.playerId, move: msg.move as MoveInput };

    case 'RESIGN':
      return { type: 'RESIGN', playerId: msg.playerId };

    default:
      return null;
  }
}

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
      const action = parseAction(message.data);

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
