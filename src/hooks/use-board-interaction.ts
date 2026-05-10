'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import type { GameState, MoveInput, PlayerColor } from '@/types/game';
import type { BoardSquare } from '@/components/chess-board';
import { getPromotion } from '@/components/chess-board';
import { parseJsonResponse } from '@/lib/api-client';

interface LegalMovesResponse {
  moves: { from: string; to: string; san: string; promotion?: string }[];
}

interface UseBoardInteractionInput {
  state: GameState | null;
  seatedColor: PlayerColor | null;
  squareById: Map<string, BoardSquare>;
  gameId: string;
  inviteToken?: string;
  makeMove: (move: MoveInput) => Promise<void>;
}

export interface BoardInteraction {
  selectedSquare: string | null;
  legalTargets: Set<string>;
  flashSquare: string | null;
  isSending: boolean;
  handleSquareClick: (squareId: string) => Promise<void>;
}

export function useBoardInteraction({
  state,
  seatedColor,
  squareById,
  gameId,
  inviteToken,
  makeMove,
}: UseBoardInteractionInput): BoardInteraction {
  const [selectedSquare, setSelectedSquare] = useState<string | null>(null);
  const [legalTargets, setLegalTargets] = useState<Set<string>>(() => new Set());
  const [flashSquare, setFlashSquare] = useState<string | null>(null);
  const [isSending, setIsSending] = useState(false);
  const isMoveInFlight = useRef(false);
  const flashTimeoutRef = useRef<number | null>(null);
  const latestLegalRequestRef = useRef<number>(0);

  const flashInvalidSquare = useCallback((squareId: string): void => {
    if (flashTimeoutRef.current !== null) {
      window.clearTimeout(flashTimeoutRef.current);
    }

    setFlashSquare(squareId);
    flashTimeoutRef.current = window.setTimeout(() => {
      setFlashSquare(null);
      flashTimeoutRef.current = null;
    }, 450);
  }, []);

  async function fetchLegalTargets(from: string): Promise<Set<string>> {
    const response = await fetch(
      `/api/game/${encodeURIComponent(gameId)}/legal-moves?from=${encodeURIComponent(from)}`,
      inviteToken ? { headers: { 'x-invite-token': inviteToken } } : undefined,
    );
    const data = await parseJsonResponse<LegalMovesResponse>(
      response,
      'Could not load legal moves',
    );
    return new Set(data.moves.map((move) => move.to));
  }

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setSelectedSquare(null);
      setLegalTargets(new Set());
    }, 0);

    return () => window.clearTimeout(timer);
  }, [state?.currentTurn, state?.fen, state?.status]);

  useEffect(() => {
    return () => {
      if (flashTimeoutRef.current !== null) {
        window.clearTimeout(flashTimeoutRef.current);
      }
    };
  }, []);

  const handleSquareClick = useCallback(
    async (squareId: string): Promise<void> => {
      if (isMoveInFlight.current) return;
      if (!state || isSending) return;

      if (state.status !== 'active') {
        flashInvalidSquare(squareId);
        return;
      }

      if (seatedColor !== state.currentTurn) {
        flashInvalidSquare(squareId);
        return;
      }

      const square = squareById.get(squareId);

      if (!selectedSquare) {
        if (!square?.piece || square.pieceColor !== seatedColor) {
          flashInvalidSquare(squareId);
          return;
        }

        const requestId = ++latestLegalRequestRef.current;
        setSelectedSquare(squareId);
        try {
          const targets = await fetchLegalTargets(squareId);
          if (latestLegalRequestRef.current === requestId) {
            setLegalTargets(targets);
          }
        } catch {
          if (latestLegalRequestRef.current === requestId) {
            setLegalTargets(new Set());
            flashInvalidSquare(squareId);
          }
        }
        return;
      }

      if (selectedSquare === squareId) {
        setSelectedSquare(null);
        setLegalTargets(new Set());
        return;
      }

      if (square?.piece && square.pieceColor === seatedColor) {
        const requestId = ++latestLegalRequestRef.current;
        setSelectedSquare(squareId);
        try {
          const targets = await fetchLegalTargets(squareId);
          if (latestLegalRequestRef.current === requestId) {
            setLegalTargets(targets);
          }
        } catch {
          if (latestLegalRequestRef.current === requestId) {
            setLegalTargets(new Set());
            flashInvalidSquare(squareId);
          }
        }
        return;
      }

      if (!legalTargets.has(squareId)) {
        flashInvalidSquare(squareId);
        return;
      }

      const from = selectedSquare;
      const to = squareId;
      setSelectedSquare(null);
      setLegalTargets(new Set());
      isMoveInFlight.current = true;
      setIsSending(true);
      void makeMove({
        from,
        to,
        promotion: getPromotion(squareById.get(from)?.piece, from, to),
      })
        .catch(() => flashInvalidSquare(to))
        .finally(() => {
          isMoveInFlight.current = false;
          setIsSending(false);
        });
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [flashInvalidSquare, gameId, inviteToken, isSending, legalTargets, makeMove, seatedColor, selectedSquare, squareById, state],
  );

  return { selectedSquare, legalTargets, flashSquare, isSending, handleSquareClick };
}
