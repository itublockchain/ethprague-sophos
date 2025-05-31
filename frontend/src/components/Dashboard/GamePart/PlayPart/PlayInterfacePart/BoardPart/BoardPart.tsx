import { Badge } from "@/components/ui/badge";
import { Spinner } from "@/components/ui/spinner";
import { GamePreviewData, BetData } from "@/types/Chess";
import { Chess } from "chess.js";
import { Clock, Gamepad2, RotateCcw, Star, Trophy, Zap } from "lucide-react";
import { useEffect, useRef, useState, useMemo } from "react";
import { Chessboard } from "react-chessboard";
import { Arrow } from "react-chessboard/dist/chessboard/types";

type Props = {
  gameId: string;
  setGameData: (gameData: GamePreviewData) => void;
  selectedMove: string | null;
  setSelectedMove: (move: string) => void;
  hoveredMove: string | null;
  onNewMove: (actualMove: string) => void;
  currentBet: BetData | null;
};

const formatGameTime = (timestamp: number) => {
  const date = new Date(timestamp);
  return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
};

export default function BoardPart({
  gameId,
  setGameData,
  selectedMove,
  hoveredMove,
  onNewMove,
  currentBet,
}: Props) {
  const [game] = useState<Chess>(new Chess());
  const [gameState, setGameState] = useState<GamePreviewData | null>(null);
  const [loading, setLoading] = useState(true);
  const abortControllerRef = useRef<AbortController | null>(null);

  // Different arrow arrays for different states
  const [hoverArrows, setHoverArrows] = useState<Arrow[]>([]);
  const [selectedArrows, setSelectedArrows] = useState<Arrow[]>([]);
  const [betArrows, setBetArrows] = useState<Arrow[]>([]);
  const [lastProcessedMove, setLastProcessedMove] = useState<string | null>(
    null
  );

  // Arrow color constants
  const ARROW_COLORS = {
    HOVER: "rgba(255, 140, 0, 0.8)",
    SELECTED: "rgba(65, 105, 225, 0.8)",
    BET: "rgba(138, 43, 226, 0.8)",
  } as const;

  useEffect(() => {
    const streamGame = async () => {
      try {
        abortControllerRef.current = new AbortController();

        const response = await fetch(
          `https://lichess.org/api/stream/game/${gameId}`,
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
                  // Set initial last move if it exists
                  if (data.lastMove) {
                    setLastProcessedMove(data.lastMove);
                  }
                  isFirstMessage = false;
                } else {
                  // Subsequent messages are move updates
                  if (data.fen) {
                    // Update the chess position
                    game.load(data.fen);

                    // Check if there's a new move to process for betting evaluation
                    if (data.lm && data.lm !== lastProcessedMove) {
                      setLastProcessedMove(data.lm);
                      // Trigger bet evaluation with the new move
                      console.log(
                        "New move detected:",
                        data.lm,
                        "triggering bet evaluation"
                      );
                      onNewMove(data.lm);
                    }

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
  }, [gameId, onNewMove]);

  // Update the game data when the game state changes.
  // Game data shared between the board and the bet part.
  useEffect(() => {
    if (gameState) {
      setGameData(gameState);
    }
  }, [gameState, setGameData]);

  // Update hover arrows when hoveredMove changes
  useEffect(() => {
    if (!hoveredMove || !gameState?.fen) {
      setHoverArrows([]);
      return;
    }

    const tempGame = new Chess();
    tempGame.load(gameState.fen);

    try {
      const from = hoveredMove.substring(0, 2);
      const to = hoveredMove.substring(2, 4);
      const promotion = hoveredMove.length === 5 ? hoveredMove[4] : undefined;

      const moveObj = { from, to, promotion };
      const parseMove = tempGame.move(moveObj);

      if (parseMove) {
        setHoverArrows([[parseMove.from, parseMove.to, ARROW_COLORS.HOVER]]);
      } else {
        setHoverArrows([]); // Clear arrows if move is invalid on current FEN
      }
    } catch (error) {
      console.warn(
        "Error processing hover move (potentially stale):",
        hoveredMove,
        error
      );
      setHoverArrows([]);
    }
  }, [hoveredMove, gameState?.fen]); // ARROW_COLORS.HOVER is constant

  // Update selected arrows when selectedMove changes
  useEffect(() => {
    if (!selectedMove || !gameState?.fen) {
      setSelectedArrows([]);
      return;
    }

    const tempGame = new Chess();
    tempGame.load(gameState.fen);

    try {
      const from = selectedMove.substring(0, 2);
      const to = selectedMove.substring(2, 4);
      const promotion = selectedMove.length === 5 ? selectedMove[4] : undefined;

      const moveObj = { from, to, promotion };
      const parseMove = tempGame.move(moveObj, { strict: true });

      if (parseMove) {
        setSelectedArrows([
          [parseMove.from, parseMove.to, ARROW_COLORS.SELECTED],
        ]);
      } else {
        setSelectedArrows([]); // Clear arrows if move is invalid on current FEN
      }
    } catch (error) {
      console.warn(
        "Error processing selected move (potentially stale):",
        selectedMove,
        error
      );
      setSelectedArrows([]);
    }
  }, [selectedMove, gameState?.fen]); // ARROW_COLORS.SELECTED is constant

  // Update bet arrows when currentBet changes
  useEffect(() => {
    if (
      !currentBet?.predictedMove ||
      currentBet.status !== "pending" ||
      !gameState?.fen
    ) {
      setBetArrows([]);
      return;
    }

    const tempGame = new Chess();
    tempGame.load(gameState.fen);

    try {
      const predictedMove = currentBet.predictedMove;
      const from = predictedMove.substring(0, 2);
      const to = predictedMove.substring(2, 4);
      const promotion =
        predictedMove.length === 5 ? predictedMove[4] : undefined;

      const moveObj = { from, to, promotion };
      const parseMove = tempGame.move(moveObj, { strict: true });

      if (parseMove) {
        setBetArrows([[parseMove.from, parseMove.to, ARROW_COLORS.BET]]);
      } else {
        setBetArrows([]); // Clear arrows if move is invalid on current FEN
      }
    } catch (error) {
      console.warn(
        "Error processing bet move (potentially stale):",
        currentBet.predictedMove,
        error
      );
      setBetArrows([]);
    }
  }, [currentBet, gameState?.fen]); // ARROW_COLORS.BET is constant

  // Combine all arrows with priority: bet > selected > hover
  const customArrows = useMemo(() => {
    const arrowMap = new Map<string, Arrow>();

    // Add arrows in order of priority (later ones override earlier ones)
    // Priority: hover (lowest) -> selected -> bet (highest)

    // Add hover arrows first (lowest priority)
    hoverArrows.forEach((arrow) => {
      const key = `${arrow[0]}-${arrow[1]}`;
      arrowMap.set(key, arrow);
    });

    // Add selected arrows (medium priority)
    selectedArrows.forEach((arrow) => {
      const key = `${arrow[0]}-${arrow[1]}`;
      arrowMap.set(key, arrow);
    });

    // Add bet arrows last (highest priority)
    betArrows.forEach((arrow) => {
      const key = `${arrow[0]}-${arrow[1]}`;
      arrowMap.set(key, arrow);
    });

    return Array.from(arrowMap.values());
  }, [hoverArrows, selectedArrows, betArrows]);

  if (loading) return <Spinner />;

  return (
    <div
      id="root"
      className="flex flex-col justify-between items-center w-full h-full"
    >
      <div
        id="badges"
        className="flex flex-row flex-wrap gap-2 w-full lg:w-[90%]"
      >
        {currentBet && currentBet.status && (
          <Badge
            variant={
              currentBet.status === "pending"
                ? "secondary"
                : currentBet.status === "won"
                ? "default"
                : "destructive"
            }
            className="flex items-center gap-1"
          >
            {currentBet.status === "pending" && "🎯"}
            {currentBet.status === "won" && "🎉"}
            {currentBet.status === "lost" && "😔"}
            Bet: {currentBet.predictedMove.toUpperCase()} - $
            {currentBet.betAmount}
            {currentBet.status !== "pending" &&
              ` (${currentBet.status.toUpperCase()})`}
          </Badge>
        )}

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

        {gameState?.variant && (
          <Badge variant="secondary" className="flex items-center gap-1">
            <Gamepad2 className="w-3 h-3" />
            {gameState.variant.name.toUpperCase()}
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

      <div id="board-container" className="flex w-full lg:w-[90%] self-center">
        <Chessboard
          position={gameState?.fen || "start"}
          areArrowsAllowed={false}
          arePiecesDraggable={false}
          customArrows={customArrows}
        />
      </div>

      <div id="sub-badges" className="flex flex-col gap-3 w-full lg:w-[90%]">
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
    </div>
  );
}
