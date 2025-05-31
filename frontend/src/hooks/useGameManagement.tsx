import { useState, useEffect, useCallback } from "react";
import {
  doc,
  getDoc,
  setDoc,
  updateDoc,
  arrayUnion,
  onSnapshot,
} from "firebase/firestore";
import { firestore } from "@/firebase/clientApp";
import { Game } from "@/types/Game";

interface UseGameManagementReturn {
  gameDoc: Game | null;
  players: string[];
  playerCount: number;
  hostPlayer: string | null;
  loading: boolean;
  error: string | null;
  joinGame: () => Promise<void>;
  startGame: () => Promise<void>;
}

interface UseGameManagementParams {
  gameId: string;
  userAddress?: string;
}

export const useGameManagement = ({
  gameId,
  userAddress, // Default address as requested
}: UseGameManagementParams): UseGameManagementReturn => {
  const [gameDoc, setGameDoc] = useState<Game | null>(null);
  const [players, setPlayers] = useState<string[]>([]);
  const [hostPlayer, setHostPlayer] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const startGame = useCallback(async () => {
    if (!gameId || !userAddress) {
      setError("Game ID and user address are required");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const gameDocRef = doc(firestore, "games", gameId);
      const gameSnapshot = await getDoc(gameDocRef);

      if (gameSnapshot.exists()) {
        const existingGame = gameSnapshot.data() as Game;

        // Only allow host to start the game
        if (existingGame.hostPlayer !== userAddress) {
          setError("Only the host can start the game");
          setLoading(false);
          return;
        }

        // Only start if we have at least 2 players and game is not started
        if (
          existingGame.players.length >= 2 &&
          existingGame.status === "not-started"
        ) {
          await updateDoc(gameDocRef, {
            status: "started",
          });

          console.log("Game started manually");
        } else {
          setError("Need at least 2 players to start the game");
        }
      }
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : "Unknown error occurred";
      setError(errorMessage);
      console.error("Error starting game:", err);
    } finally {
      setLoading(false);
    }
  }, [gameId, userAddress]);

  const joinGame = useCallback(async () => {
    if (!gameId || !userAddress) {
      setError("Game ID and user address are required");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const gameDocRef = doc(firestore, "games", gameId);
      const gameSnapshot = await getDoc(gameDocRef);

      if (!gameSnapshot.exists()) {
        // Step 2: Create new game document if it doesn't exist
        const newGame: Game = {
          id: gameId,
          status: "not-started",
          ts: Date.now(),
          players: [userAddress],
          hostPlayer: userAddress,
        };

        await setDoc(gameDocRef, newGame);
        console.log("Created new game document:", newGame);
      } else {
        // Step 3: Update existing game document
        const existingGame = gameSnapshot.data() as Game;

        // Check if user is already in the game
        if (!existingGame.players.includes(userAddress)) {
          // Add user to players array but DON'T change the host
          await updateDoc(gameDocRef, {
            players: arrayUnion(userAddress),
            // Don't update hostPlayer - keep the original host
          });

          console.log("Updated existing game document");
        } else {
          // User already in game
          console.log("User already in game:", existingGame);
        }
      }
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : "Unknown error occurred";
      setError(errorMessage);
      console.error("Error managing game document:", err);
    } finally {
      setLoading(false);
    }
  }, [gameId, userAddress]);

  // Set up realtime listener for game document
  useEffect(() => {
    if (!gameId) {
      setError("Game ID is required");
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    // Set up real-time listener for the game document
    const gameDocRef = doc(firestore, "games", gameId);
    const unsubscribe = onSnapshot(
      gameDocRef,
      (docSnapshot) => {
        if (docSnapshot.exists()) {
          const gameData = docSnapshot.data() as Game;
          setGameDoc(gameData);
          setPlayers(gameData.players || []);
          setHostPlayer(gameData.hostPlayer);
        } else {
          // Document doesn't exist, trigger joinGame to create it
          setGameDoc(null);
          setPlayers([]);
          setHostPlayer(null);
        }
        setLoading(false);
      },
      (err) => {
        const errorMessage =
          err instanceof Error ? err.message : "Unknown error occurred";
        setError(errorMessage);
        setLoading(false);
        console.error("Error listening to game document:", err);
      }
    );

    // Cleanup subscription on unmount
    return () => unsubscribe();
  }, [gameId]);

  // Auto-join when component mounts and user is not in the game yet
  useEffect(() => {
    if (
      gameId &&
      userAddress &&
      !loading &&
      (!gameDoc || // No game doc exists, create new game
        (gameDoc && !players.includes(userAddress))) // Game exists but user not in it
    ) {
      joinGame();
    }
  }, [gameId, userAddress, loading, gameDoc, players, joinGame]);

  return {
    gameDoc,
    players,
    playerCount: players.length,
    hostPlayer,
    loading,
    error,
    joinGame,
    startGame,
  };
};
