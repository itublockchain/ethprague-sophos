import { currentStatusAtom } from "@/atoms/CurrentStatusAtom";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Spinner } from "@/components/ui/spinner";
import { useMetaMask } from "@/hooks/useMetaMask";
import { JoinRoomPayload } from "@/types/Index";
import { useAtom } from "jotai";
import {
  AlertCircle,
  Check,
  Copy,
  GamepadIcon,
  Loader2,
  LogIn,
  Play,
  Plus,
  Users,
  Wallet,
} from "lucide-react";
import { useCallback, useState, useEffect } from "react";

type Props = {
  isOpen: boolean;
  setEoaAddress: (eoa: string) => void;
  joinRoom: (payload: JoinRoomPayload) => void;
  connectedUserCount?: number;
  isHost?: boolean;
  awaitingHostStart?: boolean;
  signAndStartGame: () => void;
  startGame: (roomId: string) => void;
};

export function StarterDialog({
  isOpen,
  setEoaAddress,
  joinRoom,
  connectedUserCount,
  isHost,
  awaitingHostStart,
  signAndStartGame,
  startGame,
}: Props) {
  const [currentStatus, setCurrentStatus] = useAtom(currentStatusAtom);
  const { connectWallet, address, isConnected } = useMetaMask();

  const [gameId, setGameId] = useState("");
  const [isConnecting, setIsConnecting] = useState(false);
  const [isCreatingGame, setIsCreatingGame] = useState(false);
  const [isJoiningGame, setIsJoiningGame] = useState(false);
  const [isStartingGame, setIsStartingGame] = useState(false);
  const [gameIdError, setGameIdError] = useState("");
  const [copiedGameId, setCopiedGameId] = useState(false);

  // Check if wallet is already connected and update status
  useEffect(() => {
    if (isConnected && address && currentStatus.status === "not-connected") {
      setCurrentStatus({ status: "connected" });
    }
  }, [isConnected, address, currentStatus.status, setCurrentStatus]);

  // Validate game ID
  const validateGameId = useCallback((id: string) => {
    if (!id.trim()) {
      setGameIdError("Game ID is required");
      return false;
    }
    if (id.length < 3) {
      setGameIdError("Game ID must be at least 3 characters");
      return false;
    }
    setGameIdError("");
    return true;
  }, []);

  // Handle wallet connection
  const handleConnectWallet = async () => {
    setIsConnecting(true);
    try {
      const result = await connectWallet();
      if (result) {
        // Update the status atom to "connected" when wallet connection is successful
        setCurrentStatus({ status: "connected" });
      }
    } catch (error) {
      console.error("Failed to connect wallet:", error);
    } finally {
      setIsConnecting(false);
    }
  };

  // Handle creating a new room
  const handleCreateGame = async () => {
    if (!address) return;

    setIsCreatingGame(true);
    try {
      const payload: JoinRoomPayload = { roomId: undefined, eoa: address };
      setEoaAddress(payload.eoa);
      console.log("Creating new room as host, payload:", payload);

      joinRoom(payload);
    } catch (error) {
      console.error("Failed to create game:", error);
    } finally {
      setIsCreatingGame(false);
    }
  };

  // Handle joining a room
  const handleJoinGame = async () => {
    if (!address || !validateGameId(gameId)) return;

    setIsJoiningGame(true);
    try {
      const payload: JoinRoomPayload = { roomId: gameId.trim(), eoa: address };
      setEoaAddress(payload.eoa);
      console.log(
        "Joining existing room:",
        payload.roomId,
        "payload:",
        payload
      );

      joinRoom(payload);
    } catch (error) {
      console.error("Failed to join game:", error);
    } finally {
      setIsJoiningGame(false);
    }
  };

  // Handle starting the game (host only)
  const handleStartGame = async () => {
    if (!currentStatus.data?.roomId || !isHost) {
      console.error("Cannot start game: not host or no room ID");
      return;
    }

    setIsStartingGame(true);
    try {
      if (awaitingHostStart) {
        console.log(
          "Signing app session and starting game for room:",
          currentStatus.data?.roomId
        );
        signAndStartGame();
      } else {
        console.log(
          "Starting game as host for room:",
          currentStatus.data?.roomId
        );
        startGame(currentStatus.data?.roomId || "");
      }
    } catch (error) {
      console.error("Failed to start game:", error);
    } finally {
      setIsStartingGame(false);
    }
  };

  // Handle copying game ID
  const handleCopyGameId = async () => {
    if (!currentStatus.data?.roomId) return;

    try {
      await navigator.clipboard.writeText(currentStatus.data.roomId);
      setCopiedGameId(true);
      setTimeout(() => setCopiedGameId(false), 2000);
    } catch (error) {
      console.error("Failed to copy game ID:", error);
    }
  };

  return (
    <Dialog open={isOpen}>
      <DialogContent className="sm:max-w-[480px] p-0 overflow-hidden">
        <div className="relative">
          <div className="bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800 p-6">
            <DialogHeader className="text-center mb-6">
              <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-r from-blue-500 to-purple-600">
                <GamepadIcon className="h-8 w-8 text-white" />
              </div>
              <DialogTitle className="text-2xl self-center font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                Welcome to the Game
              </DialogTitle>
              <DialogDescription className="text-slate-600 dark:text-slate-300 self-center">
                Connect your wallet and join the action
              </DialogDescription>
            </DialogHeader>

            {/* Wallet Connection State */}
            {currentStatus.status === "not-connected" && (
              <Card className="border-blue-200 dark:border-blue-800 bg-blue-50/50 dark:bg-blue-950/20">
                <CardHeader className="text-center">
                  <div className="mx-auto mb-2 flex h-12 w-12 items-center justify-center rounded-full bg-blue-100 dark:bg-blue-900">
                    <Wallet className="h-6 w-6 text-blue-600 dark:text-blue-400" />
                  </div>
                  <CardTitle className="text-lg">Connect Your Wallet</CardTitle>
                  <CardDescription>
                    You need to connect your wallet to join or create a game
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <Button
                    onClick={handleConnectWallet}
                    disabled={isConnecting}
                    className="w-full bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700"
                    size="lg"
                  >
                    {isConnecting ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Connecting...
                      </>
                    ) : (
                      <>
                        <Wallet className="mr-2 h-4 w-4" />
                        Connect Wallet
                      </>
                    )}
                  </Button>
                </CardContent>
              </Card>
            )}

            {/* Game Selection State */}
            {currentStatus.status === "connected" && (
              <div className="space-y-4">
                <div className="text-center text-sm text-slate-600 dark:text-slate-300 mb-6">
                  Connected:{" "}
                  <span className="font-mono text-xs bg-slate-200 dark:bg-slate-700 px-2 py-1 rounded">
                    {address?.slice(0, 6)}...{address?.slice(-4)}
                  </span>
                </div>

                <div className="grid gap-4">
                  {/* Create Game Card */}
                  <Card className="border-green-200 dark:border-green-800 bg-green-50/50 dark:bg-green-950/20 hover:shadow-md transition-shadow">
                    <CardHeader>
                      <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-green-100 dark:bg-green-900">
                          <Plus className="h-5 w-5 text-green-600 dark:text-green-400" />
                        </div>
                        <div>
                          <CardTitle className="text-lg">
                            Create New Game
                          </CardTitle>
                          <CardDescription>
                            Start a new game as the host
                          </CardDescription>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <Button
                        onClick={handleCreateGame}
                        disabled={isCreatingGame}
                        className="w-full bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700"
                        size="lg"
                      >
                        {isCreatingGame ? (
                          <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            Creating Game...
                          </>
                        ) : (
                          <>
                            <Plus className="mr-2 h-4 w-4" />
                            Create Game
                          </>
                        )}
                      </Button>
                    </CardContent>
                  </Card>

                  {/* Join Game Card */}
                  <Card className="border-purple-200 dark:border-purple-800 bg-purple-50/50 dark:bg-purple-950/20 hover:shadow-md transition-shadow">
                    <CardHeader>
                      <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-purple-100 dark:bg-purple-900">
                          <LogIn className="h-5 w-5 text-purple-600 dark:text-purple-400" />
                        </div>
                        <div>
                          <CardTitle className="text-lg">
                            Join Existing Game
                          </CardTitle>
                          <CardDescription>
                            Enter a game ID to join
                          </CardDescription>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <div>
                        <Input
                          placeholder="Enter Game ID"
                          value={gameId}
                          onChange={(e) => {
                            setGameId(e.target.value);
                            if (gameIdError) setGameIdError("");
                          }}
                          className={
                            gameIdError
                              ? "border-red-500 focus:border-red-500"
                              : ""
                          }
                        />
                        {gameIdError && (
                          <div className="flex items-center gap-1 mt-1 text-red-500 text-sm">
                            <AlertCircle className="h-3 w-3" />
                            {gameIdError}
                          </div>
                        )}
                      </div>
                      <Button
                        onClick={handleJoinGame}
                        disabled={isJoiningGame || !gameId.trim()}
                        className="w-full bg-gradient-to-r from-purple-500 to-pink-600 hover:from-purple-600 hover:to-pink-700"
                        size="lg"
                      >
                        {isJoiningGame ? (
                          <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            Joining Game...
                          </>
                        ) : (
                          <>
                            <LogIn className="mr-2 h-4 w-4" />
                            Join Game
                          </>
                        )}
                      </Button>
                    </CardContent>
                  </Card>
                </div>
              </div>
            )}

            {/* Game Created State */}
            {currentStatus.status === "create-game" && (
              <Card className="border-amber-200 dark:border-amber-800 bg-amber-50/50 dark:bg-amber-950/20">
                <CardHeader className="text-center">
                  <div className="mx-auto mb-2 flex h-12 w-12 items-center justify-center rounded-full bg-amber-100 dark:bg-amber-900">
                    <GamepadIcon className="h-6 w-6 text-amber-600 dark:text-amber-400" />
                  </div>
                  <CardTitle className="text-lg">Game Created!</CardTitle>
                  <CardDescription>
                    You are the host of this game
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="bg-white dark:bg-slate-800 rounded-lg p-4 border">
                    <div className="text-sm text-slate-600 dark:text-slate-300 mb-2">
                      Game ID:
                    </div>
                    <div className="flex items-center gap-2">
                      <code className="flex-1 bg-slate-100 dark:bg-slate-700 px-3 py-2 rounded font-mono text-sm">
                        {currentStatus.data?.roomId}
                      </code>
                      <Button
                        onClick={handleCopyGameId}
                        variant="outline"
                        size="sm"
                        className="shrink-0"
                      >
                        {copiedGameId ? (
                          <>
                            <Check className="h-4 w-4 text-green-500" />
                          </>
                        ) : (
                          <>
                            <Copy className="h-4 w-4" />
                          </>
                        )}
                      </Button>
                    </div>
                    {copiedGameId && (
                      <div className="text-green-600 text-sm mt-1 flex items-center gap-1">
                        <Check className="h-3 w-3" />
                        Copied to clipboard!
                      </div>
                    )}
                  </div>

                  <div className="bg-white dark:bg-slate-800 rounded-lg p-4 border">
                    <div className="flex items-center gap-3">
                      <div className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-100 dark:bg-blue-900">
                        <Users className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                      </div>
                      <div>
                        <div className="text-sm font-medium">
                          Waiting for players
                        </div>
                        <div className="text-sm text-slate-600 dark:text-slate-300">
                          Connected players: {connectedUserCount || 0}
                        </div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Game Ready State */}
            {currentStatus.status === "room-ready" && (
              <Card className="border-green-200 dark:border-green-800 bg-green-50/50 dark:bg-green-950/20">
                <CardHeader className="text-center">
                  <div className="mx-auto mb-2 flex h-12 w-12 items-center justify-center rounded-full bg-green-100 dark:bg-green-900">
                    <Play className="h-6 w-6 text-green-600 dark:text-green-400" />
                  </div>
                  <CardTitle className="text-lg">Ready to Play!</CardTitle>
                  <CardDescription>
                    {isHost
                      ? "Start the game when ready"
                      : "Waiting for host to start"}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {isHost ? (
                    <Button
                      onClick={handleStartGame}
                      disabled={isStartingGame}
                      className="w-full bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700"
                      size="lg"
                    >
                      {isStartingGame ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          {awaitingHostStart
                            ? "Signing & Starting..."
                            : "Starting Game..."}
                        </>
                      ) : (
                        <>
                          <Play className="mr-2 h-4 w-4" />
                          Start Game
                        </>
                      )}
                    </Button>
                  ) : (
                    <div className="text-center">
                      <Spinner size="small" className="mb-2" />
                      <div className="text-sm text-slate-600 dark:text-slate-300">
                        Waiting for host to start the game...
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
