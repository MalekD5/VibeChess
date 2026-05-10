'use client';

import Ably from 'ably';
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import type { GameAction, GameState, MoveInput, PlayerColor } from '@/types/game';
import {
  parseGameStateMessage,
  parseRealtimePayloadObject,
} from '@/lib/game-schemas';


export type GameConnectionStatus =
  | 'idle'
  | 'connecting'
  | 'connected'
  | 'disconnected'
  | 'failed';

export interface GameRealtimeSession {
  gameId: string;
  channelName: string;
  inviteToken?: string;
  playerId: string;
  state: GameState | null;
  connectionStatus: GameConnectionStatus;
  error: string | null;
  joinGame(color: PlayerColor): Promise<void>;
  makeMove(move: MoveInput): Promise<void>;
  resign(): Promise<void>;
}

export interface UseGameRealtimeInput {
  gameId: string;
  channelName?: string;
  inviteToken?: string;
  initialState?: GameState;
  initialPlayerId?: string;
}

interface GameRealtimeProviderProps extends UseGameRealtimeInput {
  children: ReactNode;
}

const GameRealtimeContext = createContext<GameRealtimeSession | null>(null);

function createMountedPlayerId(gameId: string, initialPlayerId?: string): string {
  if (typeof window === 'undefined') {
    return initialPlayerId ?? crypto.randomUUID();
  }

  const storageKey = `vibechess:player:${gameId}`;
  if (initialPlayerId) {
    window.sessionStorage.setItem(storageKey, initialPlayerId);
    return initialPlayerId;
  }

  const storedPlayerId = window.sessionStorage.getItem(storageKey);

  if (storedPlayerId) {
    return storedPlayerId;
  }

  const nextPlayerId = crypto.randomUUID();
  window.sessionStorage.setItem(storageKey, nextPlayerId);
  return nextPlayerId;
}

export function buildJoinGameAction(playerId: string, color: PlayerColor): GameAction {
  return { type: 'JOIN_GAME', playerId, color };
}

export function buildMakeMoveAction(playerId: string, move: MoveInput): GameAction {
  return { type: 'MAKE_MOVE', playerId, move };
}

export function buildResignAction(playerId: string): GameAction {
  return { type: 'RESIGN', playerId };
}

export function parseStateMessage(data: unknown): GameState | null {
  return parseGameStateMessage(data);
}

function getMessageError(data: unknown): string {
  const msg = parseRealtimePayloadObject(data);
  if (!msg) return 'Realtime error';
  return typeof msg.message === 'string' ? msg.message : 'Realtime error';
}

function getErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

export function useGameRealtime(input: UseGameRealtimeInput): GameRealtimeSession {
  const {
    gameId,
    channelName = `game:${gameId}`,
    inviteToken,
    initialState,
    initialPlayerId,
  } = input;
  const [playerId] = useState(() => createMountedPlayerId(gameId, initialPlayerId));
  const [state, setState] = useState<GameState | null>(initialState ?? null);
  const [connectionStatus, setConnectionStatus] =
    useState<GameConnectionStatus>('connecting');
  const [error, setError] = useState<string | null>(null);
  const channelRef = useRef<Ably.RealtimeChannel | null>(null);
  const serverSubscriptionRef = useRef<Promise<void> | null>(null);

  const ensureServerSubscription = useCallback(async (): Promise<void> => {
    if (serverSubscriptionRef.current) {
      return serverSubscriptionRef.current;
    }

    const subscription = (async () => {
      const response = await fetch(
        `/api/game/${encodeURIComponent(gameId)}/subscribe`,
        {
          method: 'POST',
          ...(inviteToken ? { headers: { 'x-invite-token': inviteToken } } : {}),
        },
      );

      if (!response.ok) {
        throw new Error('Could not prepare game realtime subscription');
      }
    })();

    serverSubscriptionRef.current = subscription;

    try {
      await subscription;
    } catch (err) {
      if (serverSubscriptionRef.current === subscription) {
        serverSubscriptionRef.current = null;
      }
      throw err;
    }
  }, [gameId, inviteToken]);

  useEffect(() => {
    serverSubscriptionRef.current = null;
  }, [gameId, inviteToken]);

  useEffect(() => {
    const realtime = new Ably.Realtime({
      authUrl: `/api/ably/auth?gameId=${encodeURIComponent(gameId)}`,
      ...(inviteToken ? { authHeaders: { 'x-invite-token': inviteToken } } : {}),
    });
    const nextChannel = realtime.channels.get(channelName);

    channelRef.current = nextChannel;

    const handleState = (message: Ably.InboundMessage): void => {
      if (message.action && message.action !== 'message.create') return;

      const nextState = parseStateMessage(message.data);
      if (!nextState) {
        console.error('[game-realtime] parseStateMessage failed. Raw data:', message.data);
        setError('Invalid state message received');
        return;
      }
      setState(nextState);
      setError(null);
    };

    const handleChannelError = (message: Ably.Message): void => {
      setError(getMessageError(message.data));
    };

    realtime.connection.on('connected', () => {
      setConnectionStatus('connected');
      setError(null);
    });
    realtime.connection.on('connecting', () => setConnectionStatus('connecting'));
    realtime.connection.on('disconnected', () => setConnectionStatus('disconnected'));
    realtime.connection.on('suspended', () => setConnectionStatus('disconnected'));
    realtime.connection.on('failed', (stateChange) => {
      setConnectionStatus('failed');
      setError(stateChange.reason?.message ?? 'Realtime connection failed');
    });

    nextChannel.on('attached', () => setError(null));

    void nextChannel.subscribe('state', handleState).catch((err: unknown) => {
      setError(getErrorMessage(err));
    });
    void nextChannel.subscribe('error', handleChannelError).catch((err: unknown) => {
      setError(getErrorMessage(err));
    });
    void ensureServerSubscription().catch((err: unknown) => {
      setError(getErrorMessage(err));
    });

    return () => {
      if (channelRef.current === nextChannel) {
        channelRef.current = null;
      }
      nextChannel.unsubscribe('state', handleState);
      nextChannel.unsubscribe('error', handleChannelError);
      void nextChannel.detach().catch(() => undefined);
      realtime.close();
    };
  }, [channelName, ensureServerSubscription, gameId, inviteToken]);

  const publishAction = useCallback(
    async (action: GameAction): Promise<void> => {
      const channel = channelRef.current;
      if (!channel) {
        throw new Error('Realtime channel is not ready');
      }

      try {
        await ensureServerSubscription();
        await channel.publish('action', action);
        setError(null);
      } catch (err) {
        const message = getErrorMessage(err);
        setError(message);
        throw err;
      }
    },
    [ensureServerSubscription],
  );

  const joinGame = useCallback(
    (color: PlayerColor) => publishAction(buildJoinGameAction(playerId, color)),
    [playerId, publishAction],
  );

  const makeMove = useCallback(
    (move: MoveInput) => publishAction(buildMakeMoveAction(playerId, move)),
    [playerId, publishAction],
  );

  const resign = useCallback(
    () => publishAction(buildResignAction(playerId)),
    [playerId, publishAction],
  );
  const sessionState = state?.gameId === gameId ? state : initialState ?? null;

  return useMemo(
    () => ({
      gameId,
      channelName,
      inviteToken,
      playerId,
      state: sessionState,
      connectionStatus,
      error,
      joinGame,
      makeMove,
      resign,
    }),
    [
      gameId,
      channelName,
      inviteToken,
      playerId,
      sessionState,
      connectionStatus,
      error,
      joinGame,
      makeMove,
      resign,
    ],
  );
}

export function GameRealtimeProvider({
  children,
  gameId,
  channelName,
  inviteToken,
  initialState,
  initialPlayerId,
}: GameRealtimeProviderProps) {
  const session = useGameRealtime({
    gameId,
    channelName,
    inviteToken,
    initialState,
    initialPlayerId,
  });

  return (
    <GameRealtimeContext.Provider value={session}>
      {children}
    </GameRealtimeContext.Provider>
  );
}

export function useGameRealtimeSession(): GameRealtimeSession {
  const session = useContext(GameRealtimeContext);
  if (!session) {
    throw new Error('useGameRealtimeSession must be used within GameRealtimeProvider');
  }
  return session;
}
