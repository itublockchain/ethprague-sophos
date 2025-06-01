import { useWebSocket } from "@/hooks/useWebSocket";
import { BetData, GamePreviewData } from "@/types/Chess";
import { GameState } from "@/types/Index";
import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import BetPart from "./BetPart/BetPart";
import BoardPart from "./BoardPart/BoardPart";

type Props = {
  gameId: string;
  gameState: GameState;
};

export default function PlayInterfacePart({ gameId, gameState }: Props) {
  const [gameData, setGameData] = useState<GamePreviewData | null>(null);
  const [selectedMove, setSelectedMove] = useState<string | null>(null);
  const [hoveredMove, setHoveredMove] = useState<string | null>(null);
  const [currentBet, setCurrentBet] = useState<BetData | null>(null);
  const currentBetRef = useRef<BetData | null>(null);

  const { makeBet } = useWebSocket();

  // Keep ref in sync with state
  useEffect(() => {
    currentBetRef.current = currentBet;
  }, [currentBet]);

  const handlePlaceBet = useCallback(
    (predictedMove: string, betAmount: number) => {
      const newBet: BetData = {
        predictedMove,
        betAmount,
        status: "pending",
        placedAt: Date.now(),
      };

      setCurrentBet(newBet);
      setSelectedMove(null); // Reset selected move after placing bet
      setHoveredMove(null); // Reset hovered move after placing bet

      toast.success(
        `Bet placed! 🎯 Predicted move: ${predictedMove.toUpperCase()} for $${betAmount}`,
        {
          description: "Waiting for the next move to be played...",
          duration: 3000,
        }
      );
    },
    []
  );

  const handleBetResult = useCallback((actualMove: string) => {
    if (!currentBetRef.current || currentBetRef.current.status !== "pending") {
      return;
    }

    const normalizedActualMove = actualMove.toLowerCase();
    const normalizedPredictedMove =
      currentBetRef.current.predictedMove.toLowerCase();

    const isWin = normalizedActualMove === normalizedPredictedMove;

    const updatedBet: BetData = {
      ...currentBetRef.current,
      status: isWin ? "won" : "lost",
      resolvedAt: Date.now(),
    };

    setCurrentBet(updatedBet);

    if (isWin) {
      makeBet({
        roomId: gameId,
        balanceDifference: currentBetRef.current.betAmount,
      });

      toast.success(`🎉 You won! Actual move: ${actualMove.toUpperCase()}`, {
        description: `You correctly predicted the move and won $${currentBetRef.current.betAmount}!`,
        duration: 5000,
      });
    } else {
      makeBet({
        roomId: gameId,
        balanceDifference: -currentBetRef.current.betAmount,
      });

      toast.error(`😔 You lost! Actual move: ${actualMove.toUpperCase()}`, {
        description: `You predicted ${currentBetRef.current.predictedMove.toUpperCase()} but the actual move was different. You lost $${
          currentBetRef.current.betAmount
        }.`,
        duration: 5000,
      });
    }
  }, []); // Empty dependency array - function never changes

  return (
    <div
      id="root"
      className="flex flex-col gap-5 lg:gap-0 lg:flex-row w-full h-screen"
    >
      <div id="bet-container" className="flex w-full h-full lg:w-1/3">
        <BetPart
          gameData={gameData}
          selectedMove={selectedMove}
          setSelectedMove={setSelectedMove}
          hoveredMove={hoveredMove}
          setHoveredMove={setHoveredMove}
          onPlaceBet={handlePlaceBet}
          currentBet={currentBet}
          gameState={gameState}
        />
      </div>

      <div id="board-container" className="flex w-full h-full lg:w-2/3">
        <BoardPart
          gameId={gameId}
          setGameData={setGameData}
          selectedMove={selectedMove}
          setSelectedMove={setSelectedMove}
          hoveredMove={hoveredMove}
          onNewMove={handleBetResult}
          currentBet={currentBet}
          gameState={gameState}
        />
      </div>
    </div>
  );
}
