import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { useGameManagement } from "@/hooks/useGameManagement";
import { BetData, GamePreviewData } from "@/types/Chess";
import { Game } from "@/types/Game";
import { useDynamicContext } from "@dynamic-labs/sdk-react-core";
import { Clock, Crown, Play, Users } from "lucide-react";
import React, { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import BetPart from "./BetPart/BetPart";
import BoardPart from "./BoardPart/BoardPart";

type Props = {
  gameId: string;
};

// Component to display game status and players
function GameStatusDisplay({
  gameDoc,
  players,
  playerCount,
  isHost,
  onStartGame,
  startingGame,
}: {
  gameDoc: Game;
  players: string[];
  playerCount: number;
  isHost: boolean;
  onStartGame: () => void;
  startingGame: boolean;
}) {
  const formatTimestamp = (ts: number) => {
    return new Date(ts).toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const getStatusColor = (status: Game["status"]) => {
    switch (status) {
      case "not-started":
        return "secondary";
      case "started":
        return "default";
      case "ended":
        return "destructive";
      default:
        return "outline";
    }
  };

  const canStartGame =
    gameDoc.status === "not-started" && playerCount >= 2 && isHost;

  return (
    <div className="flex flex-col gap-3 p-4 bg-gradient-to-r from-blue-50 to-purple-50 rounded-lg border border-gray-200 mb-4">
      <div className="flex flex-wrap items-center gap-2">
        <Badge
          variant={getStatusColor(gameDoc.status)}
          className="flex items-center gap-1"
        >
          <Play className="w-3 h-3" />
          {gameDoc.status.toUpperCase()}
        </Badge>

        <Badge variant="outline" className="flex items-center gap-1">
          <Users className="w-3 h-3" />
          {playerCount} Player
          {playerCount !== 1 ? "s" : ""}
        </Badge>

        <Badge variant="outline" className="flex items-center gap-1">
          <Clock className="w-3 h-3" />
          Created {formatTimestamp(gameDoc.ts)}
        </Badge>
      </div>

      <div className="flex flex-col gap-2">
        <div className="text-sm font-medium text-gray-700">Players:</div>
        <div className="flex flex-wrap gap-2">
          {players.map((player) => (
            <Badge
              key={player}
              variant={player === gameDoc.hostPlayer ? "default" : "secondary"}
              className="flex items-center gap-1"
            >
              {player === gameDoc.hostPlayer && <Crown className="w-3 h-3" />}
              {player}
              {player === gameDoc.hostPlayer && " (Host)"}
            </Badge>
          ))}
        </div>
      </div>

      {gameDoc.status === "not-started" && (
        <div className="flex flex-col gap-2">
          {playerCount < 2 && (
            <div className="text-sm text-gray-600 italic">
              Waiting for more players to join... (Need at least 2 players to
              start)
            </div>
          )}

          {canStartGame && (
            <div className="flex flex-col gap-2">
              <div className="text-sm text-green-600 font-medium">
                Ready to start! You have {playerCount} players.
              </div>
              <Button
                onClick={onStartGame}
                disabled={startingGame}
                className="w-fit"
                size="sm"
              >
                {startingGame ? (
                  <>
                    <Spinner className="w-4 h-4 mr-2" />
                    Starting Game...
                  </>
                ) : (
                  <>
                    <Play className="w-4 h-4 mr-2" />
                    Start Game
                  </>
                )}
              </Button>
            </div>
          )}

          {playerCount >= 2 && !isHost && (
            <div className="text-sm text-blue-600 italic">
              Waiting for host to start the game...
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default function PlayInterfacePart({ gameId }: Props) {
  const [gameData, setGameData] = useState<GamePreviewData | null>(null);
  const [selectedMove, setSelectedMove] = useState<string | null>(null);
  const [hoveredMove, setHoveredMove] = useState<string | null>(null);
  const [currentBet, setCurrentBet] = useState<BetData | null>(null);
  const [startingGame, setStartingGame] = useState(false);
  const currentBetRef = useRef<BetData | null>(null);

  const { primaryWallet } = useDynamicContext();

  const userAddress = primaryWallet?.address || "";

  // Use the game management hook with realtime data
  const {
    gameDoc,
    players,
    playerCount,
    hostPlayer,
    loading,
    error,
    startGame,
  } = useGameManagement({
    gameId,
    userAddress: userAddress,
  });

  // Check if current user is the host
  const isHost = hostPlayer === userAddress;

  // Keep ref in sync with state
  useEffect(() => {
    currentBetRef.current = currentBet;
  }, [currentBet]);

  // Show success toast when game document is created/updated
  useEffect(() => {
    if (!userAddress) return;

    if (gameDoc) {
      if (playerCount === 1) {
        toast.success("🎮 Game created!", {
          description: `You are the host. Game ID: ${gameDoc.id}`,
          duration: 3000,
        });
      } else if (players.includes(userAddress) && playerCount > 1) {
        toast.success("🎯 Joined game!", {
          description: `${playerCount} players in game. Status: ${gameDoc.status}`,
          duration: 3000,
        });
      }
    }
  }, [gameDoc, playerCount, players, userAddress]);

  // Show error toast if there's an issue
  useEffect(() => {
    if (error) {
      toast.error("❌ Game error", {
        description: error,
        duration: 5000,
      });
    }
  }, [error]);

  const handleStartGame = useCallback(async () => {
    setStartingGame(true);
    try {
      await startGame();
      toast.success("🚀 Game started!", {
        description: "The game has begun. Good luck!",
        duration: 3000,
      });
    } catch (error) {
      console.error("Error: ", error);
      toast.error("❌ Failed to start game", {
        description: "Please try again",
        duration: 3000,
      });
    } finally {
      setStartingGame(false);
    }
  }, [startGame]);

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
    console.log("handleBetResult called with actualMove:", actualMove);
    console.log("currentBet:", currentBetRef.current);

    if (!currentBetRef.current || currentBetRef.current.status !== "pending") {
      console.log("No pending bet, skipping evaluation");
      return;
    }

    const normalizedActualMove = actualMove.toLowerCase();
    const normalizedPredictedMove =
      currentBetRef.current.predictedMove.toLowerCase();

    console.log(
      "Comparing moves - predicted:",
      normalizedPredictedMove,
      "actual:",
      normalizedActualMove
    );

    const isWin = normalizedActualMove === normalizedPredictedMove;

    console.log("Bet result:", isWin ? "WIN" : "LOSS");

    const updatedBet: BetData = {
      ...currentBetRef.current,
      status: isWin ? "won" : "lost",
      resolvedAt: Date.now(),
    };

    setCurrentBet(updatedBet);

    if (isWin) {
      toast.success(`🎉 You won! Actual move: ${actualMove.toUpperCase()}`, {
        description: `You correctly predicted the move and won $${currentBetRef.current.betAmount}!`,
        duration: 5000,
      });
    } else {
      toast.error(`😔 You lost! Actual move: ${actualMove.toUpperCase()}`, {
        description: `You predicted ${currentBetRef.current.predictedMove.toUpperCase()} but the actual move was different. You lost $${
          currentBetRef.current.betAmount
        }.`,
        duration: 5000,
      });
    }
  }, []); // Empty dependency array - function never changes

  // Show loading spinner while game document is being loaded/created
  if (loading) {
    return (
      <div className="flex items-center justify-center w-full h-full min-h-[400px]">
        <div className="flex flex-col items-center gap-4">
          <Spinner className="w-8 h-8" />
          <p className="text-gray-600">Setting up game...</p>
        </div>
      </div>
    );
  }

  return (
    <div id="root" className="flex flex-col w-full h-full">
      {/* Game Status Display - Full Width */}
      {gameDoc && (
        <div className="w-full mb-4">
          <GameStatusDisplay
            gameDoc={gameDoc}
            players={players}
            playerCount={playerCount}
            isHost={isHost}
            onStartGame={handleStartGame}
            startingGame={startingGame}
          />
        </div>
      )}

      {/* Board and Bet Container */}
      <div className="flex flex-col gap-5 lg:gap-0 lg:flex-row w-full h-full">
        <div id="board-container" className="flex w-full lg:w-1/2">
          <BoardPart
            gameId={gameId}
            setGameData={setGameData}
            selectedMove={selectedMove}
            setSelectedMove={setSelectedMove}
            hoveredMove={hoveredMove}
            onNewMove={handleBetResult}
            currentBet={currentBet}
          />
        </div>

        <div id="bet-container" className="flex w-full lg:w-1/2">
          <BetPart
            gameData={gameData}
            selectedMove={selectedMove}
            setSelectedMove={setSelectedMove}
            hoveredMove={hoveredMove}
            setHoveredMove={setHoveredMove}
            onPlaceBet={handlePlaceBet}
            currentBet={currentBet}
          />
        </div>
      </div>
    </div>
  );
}
