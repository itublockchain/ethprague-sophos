import { useCallback, useEffect, useState } from "react";

interface UseBestMovesParams {
  fen: string;
}

interface UseBestMovesReturn {
  bestMove: string | null;
  loading: boolean;
  error: string | null;
  refetch: () => void;
}

const url = process.env.NEXT_PUBLIC_STOCK_FISH_API_URL as string;
if (!url) throw new Error("NEXT_PUBLIC_STOCK_FISH_API_URL is not set");

const rapidApiKey = process.env.NEXT_PUBLIC_RAPID_API_KEY as string;
if (!rapidApiKey) throw new Error("NEXT_PUBLIC_RAPID_API_KEY is not set");

const rapidApiHost = process.env.NEXT_PUBLIC_RAPID_API_HOST as string;
if (!rapidApiHost) throw new Error("NEXT_PUBLIC_RAPID_API_HOST is not set");

async function getBestMove(fen: string) {
  const encodedParams = new URLSearchParams();
  encodedParams.set("fen", fen);

  const options = {
    method: "POST",
    headers: {
      "x-rapidapi-key": rapidApiKey,
      "x-rapidapi-host": rapidApiHost,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: encodedParams,
  };

  try {
    const response = await fetch(url, options);
    const result = (await response.json()) as {
      position: string;
      bestmove: string;
      ponder: string;
      depth: number;
    };

    return result.bestmove;
  } catch (error) {
    console.error("Error getting best moves: ", error);
    return false;
  }
}

export const useBestMove = ({
  fen,
}: UseBestMovesParams): UseBestMovesReturn => {
  const [bestMove, setBestMove] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const fetchBestMove = useCallback(async () => {
    if (!fen) {
      setBestMove(null);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const bestMove = await getBestMove(fen);
      if (!bestMove) {
        throw new Error("Failed to get best move");
      }

      setBestMove(bestMove);
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : "An unknown error occurred";
      setError(errorMessage);
      setBestMove(null);
    } finally {
      setLoading(false);
    }
  }, [fen]);

  useEffect(() => {
    fetchBestMove();
  }, [fetchBestMove]);

  const refetch = useCallback(() => {
    fetchBestMove();
  }, [fetchBestMove]);

  return {
    bestMove,
    loading,
    error,
    refetch,
  };
};
