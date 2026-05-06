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

export type GameConnectionStatus =
  | 'idle'
  | 'connecting'
  | 'connected'
  | 'disconnected'
  | 'failed';

export interface GameRealtimeSession {
  gameId: string;
  channelName: string;
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
  initialState?: GameState;
}

interface GameRealtimeProviderProps extends UseGameRealtimeInput {
  children: ReactNode;
}

const GameRealtimeContext = createContext<GameRealtimeSession | null>(null);

function createMountedPlayerId(): string {
  return crypto.randomUUID();
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

function isPlayer(value: unknown): value is GameState['players']['white'] {
  if (value === null) return true;
  if (typeof value !== 'object') return false;
  const obj = value as Record<string, unknown>;
  return (
    typeof obj.id === 'string' &&
    (obj.color === 'white' || obj.color === 'black')
  );
}

export function parseStateMessage(data: unknown): GameState | null {
  if (typeof data !== 'object' || data === null) return null;

  const msg = data as Record<string, unknown>;
  const players = msg.players as Record<string, unknown> | undefined;

  if (
    typeof msg.gameId !== 'string' ||
    typeof players !== 'object' ||
    players === null ||
    !isPlayer(players.white) ||
    !isPlayer(players.black) ||
    (msg.currentTurn !== 'white' && msg.currentTurn !== 'black') ||
    typeof msg.fen !== 'string' ||
    (msg.status !== 'waiting' && msg.status !== 'active' && msg.status !== 'finished') ||
    !Array.isArray(msg.moveHistory) ||
    !msg.moveHistory.every((move) => typeof move === 'string') ||
    typeof msg.createdAt !== 'number' ||
    typeof msg.updatedAt !== 'number'
  ) {
    return null;
  }

  return data as GameState;
}

function getMessageError(data: unknown): string {
  if (typeof data !== 'object' || data === null) return 'Realtime error';
  const msg = data as Record<string, unknown>;
  return typeof msg.message === 'string' ? msg.message : 'Realtime error';
}

function getErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

export function useGameRealtime(input: UseGameRealtimeInput): GameRealtimeSession {
  const { gameId, channelName = `game:${gameId}`, initialState } = input;
  const [playerId] = useState(createMountedPlayerId);
  const [state, setState] = useState<GameState | null>(initialState ?? null);
  const [connectionStatus, setConnectionStatus] =
    useState<GameConnectionStatus>('connecting');
  const [error, setError] = useState<string | null>(null);
  const channelRef = useRef<Ably.RealtimeChannel | null>(null);

  useEffect(() => {
    const realtime = new Ably.Realtime({
      authUrl: `/api/ably/auth?gameId=${encodeURIComponent(gameId)}`,
    });
    const nextChannel = realtime.channels.get(channelName);

    channelRef.current = nextChannel;

    const handleState = (message: Ably.Message): void => {
      const nextState = parseStateMessage(message.data);
      if (!nextState) {
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

    void nextChannel.subscribe('state', handleState).catch((err: unknown) => {
      setConnectionStatus('failed');
      setError(getErrorMessage(err));
    });
    void nextChannel.subscribe('error', handleChannelError).catch((err: unknown) => {
      setConnectionStatus('failed');
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
  }, [channelName, gameId]);

  const publishAction = useCallback(
    async (action: GameAction): Promise<void> => {
      const channel = channelRef.current;
      if (!channel) {
        throw new Error('Realtime channel is not ready');
      }

      try {
        await channel.publish('action', action);
        setError(null);
      } catch (err) {
        const message = getErrorMessage(err);
        setError(message);
        throw err;
      }
    },
    [],
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
  initialState,
}: GameRealtimeProviderProps) {
  const session = useGameRealtime({ gameId, channelName, initialState });

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
