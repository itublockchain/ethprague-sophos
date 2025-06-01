import { useState, useEffect, useMemo } from "react";
import { Chess, Square } from "chess.js";

interface Move {
  from: string;
  to: string;
  san: string;
  piece: string;
  color: "w" | "b";
  flags: string;
  promotion?: string;
}

interface UseChessMovesOptions {
  square?: string; // Optional: get moves for specific square only
  verbose?: boolean; // Whether to return verbose move objects
}

export const useChessMoves = (
  input: string | Chess,
  options: UseChessMovesOptions = {}
) => {
  const [moves, setMoves] = useState<Move[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Memoize the chess instance to avoid unnecessary recreations
  const chess = useMemo(() => {
    try {
      if (typeof input === "string") {
        const chessInstance = new Chess();
        if (input.trim() !== "") {
          chessInstance.load(input);
        }
        return chessInstance;
      } else {
        return input;
      }
    } catch (err) {
      console.error("Error creating chess instance: ", err);
      return null;
    }
  }, [input]);

  useEffect(() => {
    const generateMoves = async () => {
      setIsLoading(true);
      setError(null);

      try {
        if (!chess) {
          throw new Error("Invalid FEN string or Chess instance");
        }

        const { square, verbose = true } = options;

        let possibleMoves: Move[] | string[];

        if (square) {
          // Get moves for specific square
          possibleMoves = chess.moves({
            square: square as Square,
            verbose,
          });
        } else {
          // Get all possible moves
          possibleMoves = chess.moves({ verbose });
        }

        setMoves(possibleMoves as Move[]);
      } catch (err) {
        const errorMsg =
          err instanceof Error ? err.message : "Unknown error occurred";
        setError(errorMsg);
        setMoves([]);
      } finally {
        setIsLoading(false);
      }
    };

    generateMoves();
  }, [chess, options.square, options.verbose]);

  // Additional helper methods
  const getMovesForSquare = (square: string): Move[] | string[] => {
    if (!chess) return [];
    return chess.moves({
      square: square as Square,
      verbose: options.verbose ?? true,
    });
  };

  const isMoveLegal = (
    from: string,
    to: string,
    promotion?: string
  ): boolean => {
    if (!chess) return false;
    try {
      const move = chess.move({ from, to, promotion });
      if (move) {
        chess.undo(); // Undo the move to keep the original state
        return true;
      }
      return false;
    } catch {
      return false;
    }
  };

  const moveCount = moves.length;
  const isInCheck = chess?.inCheck() ?? false;
  const isCheckmate = chess?.isCheckmate() ?? false;
  const isStalemate = chess?.isStalemate() ?? false;
  const isGameOver = chess?.isGameOver() ?? false;
  const turn = chess?.turn() ?? "w";

  return {
    moves,
    moveCount,
    isLoading,
    error,
    isInCheck,
    isCheckmate,
    isStalemate,
    isGameOver,
    turn,
    getMovesForSquare,
    isMoveLegal,
    chess, // Expose chess instance for additional operations
  };
};
