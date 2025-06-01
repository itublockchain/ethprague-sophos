import { FlickeringGrid } from "@/components/magicui/flickering-grid";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { cn } from "@/lib/utils";
import { ChannelData, GamePreviewData } from "@/types/Chess";
import { Chess } from "chess.js";
import { Clock, Gamepad2, RotateCcw, Star, Trophy, Zap } from "lucide-react";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { Chessboard } from "react-chessboard";

type Props = {
  channelData: ChannelData;
  className?: string;
};

export default function GamePreview({ channelData, className }: Props) {
  const [game] = useState<Chess>(new Chess());
  const [gameState, setGameState] = useState<GamePreviewData | null>(null);
  const [loading, setLoading] = useState(true);
  const abortControllerRef = useRef<AbortController | null>(null);

  useEffect(() => {
    const streamGame = async () => {
      try {
        abortControllerRef.current = new AbortController();

        const response = await fetch(
          `https://lichess.org/api/stream/game/${channelData.gameId}`,
          {
            signal: abortControllerRef.current.signal,
          }
        );

        if (!response.ok) {
          throw new Error(
            `HTTP error! status: ${response.status} + ${await response.text()}`
          );
        }

        const reader = response.body?.getReader();
        if (!reader) {
          throw new Error("No reader available");
        }

        const decoder = new TextDecoder();
        let buffer = "";
        let isFirstMessage = true;

        while (true) {
          const { done, value } = await reader.read();

          if (done) {
            break;
          }

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split("\n");

          for (let i = 0; i < lines.length - 1; i++) {
            const line = lines[i].trim();
            if (line) {
              try {
                const data = JSON.parse(line);

                if (isFirstMessage) {
                  // First message contains the full game description
                  setGameState({
                    id: data.id,
                    variant: data.variant,
                    speed: data.speed,
                    perf: data.perf,
                    rated: data.rated,
                    initialFen: data.initialFen,
                    fen: data.fen,
                    player: data.player,
                    turns: data.turns,
                    startedAtTurn: data.startedAtTurn,
                    source: data.source,
                    status: data.status,
                    createdAt: data.createdAt,
                    lastMove: data.lastMove,
                    players: data.players,
                  });

                  // Load the game position from FEN
                  game.load(data.fen);
                  isFirstMessage = false;
                } else {
                  // Subsequent messages are move updates
                  if (data.fen) {
                    // Update the chess position
                    game.load(data.fen);

                    // Update game state with new position data
                    setGameState((prevState) => {
                      if (!prevState) return null;

                      return {
                        ...prevState,
                        fen: data.fen,
                        lastMove: data.lm || prevState.lastMove,
                        // Update clocks if provided
                        whiteTime:
                          data.wc !== undefined ? data.wc : prevState.whiteTime,
                        blackTime:
                          data.bc !== undefined ? data.bc : prevState.blackTime,
                        // Increment turn count if a move was made
                        turns: data.lm ? prevState.turns + 1 : prevState.turns,
                      };
                    });
                  }

                  // Handle game end
                  if (data.status && data.status.name !== "started") {
                    setGameState((prevState) => {
                      if (!prevState) return null;

                      return {
                        ...prevState,
                        status: data.status,
                        winner: data.winner,
                      };
                    });
                  }
                }
              } catch (e) {
                console.error("Error parsing JSON:", e);
              } finally {
                setLoading(false);
              }
            }
          }

          buffer = lines[lines.length - 1];
        }
      } catch (error) {
        // @ts-expect-error - error is of type any
        if (error.name === "AbortError") {
          console.log("Fetch aborted");
        } else {
          console.error("Error streaming game:", error);
          setLoading(false);
        }
      }
    };

    streamGame();

    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, [channelData.gameId]);

  const formatGameTime = (timestamp: number) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center w-full h-full min-h-[300px]">
        <Spinner />
      </div>
    );
  }

  return (
    <Link
      href={`/game/?gameId=${channelData.gameId}`}
      id="container"
      className={cn(
        "relative flex flex-col gap-3 border border-gray-500 rounded-lg p-3",
        className
      )}
    >
      <FlickeringGrid className="absolute -z-50 opacity-20 flex w-full h-full" />

      <div id="badges" className="flex flex-row flex-wrap gap-2 w-full">
        {gameState?.rated !== undefined && (
          <Badge
            variant={gameState.rated ? "default" : "outline"}
            className="flex items-center gap-1"
          >
            {gameState.rated ? (
              <Trophy className="w-3 h-3" />
            ) : (
              <Star className="w-3 h-3" />
            )}
            {gameState.rated ? "Rated" : "Casual"}
          </Badge>
        )}

        {channelData.gameType && (
          <Badge variant="secondary" className="flex items-center gap-1">
            <Gamepad2 className="w-3 h-3" />
            {channelData.gameType.toUpperCase()}
          </Badge>
        )}

        {gameState?.createdAt && (
          <Badge variant="secondary" className="flex items-center gap-1">
            <Clock className="w-3 h-3" />
            {formatGameTime(gameState.createdAt)}
          </Badge>
        )}

        {gameState?.turns !== undefined && (
          <Badge variant="secondary" className="flex items-center gap-1">
            <RotateCcw className="w-3 h-3" />
            {gameState.turns} moves
          </Badge>
        )}

        {gameState?.players && (
          <>
            <Badge variant="outline" className="flex items-center gap-1">
              <Zap className="w-3 h-3" />
              White: {gameState.players.white.rating}
            </Badge>
            <Badge variant="outline" className="flex items-center gap-1">
              <Zap className="w-3 h-3" />
              Black: {gameState.players.black.rating}
            </Badge>
          </>
        )}
      </div>

      <Chessboard
        position={gameState?.fen || "start"}
        areArrowsAllowed={false}
        showBoardNotation={false}
        arePiecesDraggable={false}
      />

      <Button className="w-full">Play</Button>

      <div id="sub-badges" className="flex flex-col gap-3 mt-auto">
        <div id="label" className="text-sm text-center font-semibold">
          Remaning Times
        </div>

        <div id="badges" className="flex flex-col gap-2">
          <Badge
            id="white-remaning-time"
            className="flex flex-row w-full items-center gap-2 p-1"
            variant="secondary"
          >
            <Clock className="w-3 h-3" />
            <span>White: {gameState?.whiteTime} Seconds</span>
          </Badge>
          <Badge
            id="black-remaning-time"
            className="flex flex-row w-full items-center gap-2 p-1"
          >
            <Clock className="w-3 h-3" />
            <span>Black: {gameState?.blackTime} Seconds</span>
          </Badge>
        </div>
      </div>
    </Link>
  );
}
