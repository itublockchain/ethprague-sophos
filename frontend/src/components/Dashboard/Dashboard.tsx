"use client";

import { Suspense, useEffect, useState } from "react";
import WalletPart from "./WalletPart/WalletPart";

import { currentStatusAtom } from "@/atoms/CurrentStatusAtom";
import { useNitrolite } from "@/context/NitroliteClientWrapper";
import { useGameState } from "@/hooks/useGameState";
import { useMetaMask } from "@/hooks/useMetaMask";
import { useNitroliteIntegration } from "@/hooks/useNitroliteIntegration";
import { useWebSocket } from "@/hooks/useWebSocket";
import { useWebSocketNitrolite } from "@/hooks/useWebSocketNitrolite";
import { AvailableRoom } from "@/types/Index";
import { useAtom } from "jotai";
import { StarterDialog } from "../Dialogs/StarterDialog/StarterDialog";
import GamePart from "./GamePart/GamePart";
import HowToPlayPart from "./HowToPlayPart/HowToPlayPart";

export default function Dashboard() {
  // Player's Ethereum address - now managed by useMetaMask hook in Lobby
  const [eoaAddress, setEoaAddress] = useState<string>("");
  // Game view state
  const [gameView, setGameView] = useState<"lobby" | "game">("game");

  // WebSocket connection
  const {
    error: wsError,
    lastMessage,
    joinRoom,
    makeMove,
    startGame,
    getAvailableRooms,
    sendAppSessionSignature,
    sendAppSessionStartGame,
  } = useWebSocket();

  // This will like this.
  useWebSocketNitrolite();

  const {
    client,
    loading: nitroliteLoading,
    error: nitroliteError,
  } = useNitrolite();

  const { initializeNitroliteClient } = useNitroliteIntegration();

  // When the Nitrolite client is available, initialize it
  useEffect(() => {
    if (client && !nitroliteLoading && !nitroliteError) {
      console.log("Initializing Nitrolite client in App component");
      initializeNitroliteClient(client);
    } else if (nitroliteError) {
      console.warn("Nitrolite client error:", nitroliteError);
    } else {
      console.log("Nitrolite client not available.");
    }
  }, [client, nitroliteLoading, nitroliteError, initializeNitroliteClient]);

  const [availableRooms, setAvailableRooms] = useState<AvailableRoom[]>([]);
  const [onlineUsers, setOnlineUsers] = useState<number>(1);

  const { address } = useMetaMask();

  // Game state
  const {
    gameState,
    gameOver,
    roomId,
    errorMessage,
    isRoomReady,
    isGameStarted,
    isHost,
    playerSymbol,
    isPlayerTurn,
    formatShortAddress,
    getOpponentAddress,
    resetGame,
    awaitingHostStart,
    signAndStartGame,
    isSigningInProgress,
    signatureError,
  } = useGameState(
    lastMessage,
    eoaAddress,
    sendAppSessionSignature,
    sendAppSessionStartGame
  );

  const [isStarterDialogOpen, setIsStarterDialogOpen] = useState(false);

  const [currentStatus, setCurrentStatus] = useAtom(currentStatusAtom);

  useEffect(() => {
    if (
      currentStatus.status === "not-connected" ||
      currentStatus.status === "connected"
    ) {
      setIsStarterDialogOpen(true);
    } else {
      setIsStarterDialogOpen(false);
    }
  }, [currentStatus]);

  useEffect(() => {
    if (gameState.roomId) {
      setCurrentStatus({
        status: "connected",
        data: {
          roomId: gameState.roomId,
        },
      });
    }
  }, [gameState]);

  return (
    <>
      <div
        id="root"
        className="flex flex-col w-full lg:flex-row  gap-5 p-5 lg:p-14"
      >
        <div
          id="wallet-how-to-play-part"
          className="flex flex-col w-full lg:w-1/5 max-h-full overflow-auto gap-5 "
        >
          <WalletPart />
          <HowToPlayPart />
        </div>
        <div
          id="game-part"
          className="w-full max-h-full overflow-auto lg:w-4/5"
        >
          <Suspense fallback={<div>Loading...</div>}>
            <GamePart />
          </Suspense>
        </div>
      </div>

      <StarterDialog
        isOpen={isStarterDialogOpen}
        setEoaAddress={setEoaAddress}
        joinRoom={joinRoom}
      />
    </>
  );
}
