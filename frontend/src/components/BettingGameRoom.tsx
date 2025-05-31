"use client";

import React, { useState, useEffect } from "react";
import { useWebSocketContext } from "../contexts/WebSocketContext";
import { useChannelBetting } from "../hooks/useChannelBetting";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Alert, AlertDescription } from "./ui/alert";
import { useAppKit } from "@reown/appkit/react";

export function BettingGameRoom() {
  const { address } = useAppKit();
  const { sendMessage, subscribeToMessages, isConnected } =
    useWebSocketContext();
  const {
    signSession,
    channelId,
    placeBet,
    isChannelReady,
    deposit,
    withdraw,
    channelBalance,
    availableBalance,
    refreshChannelStats,
  } = useChannelBetting();

  const [roomId, setRoomId] = useState<string>("");
  const [currentRoom, setCurrentRoom] = useState<any>(null);
  const [depositAmount, setDepositAmount] = useState<string>("");
  const [withdrawAmount, setWithdrawAmount] = useState<string>("");
  const [predictedMove, setPredictedMove] = useState<string>("");
  const [betAmount, setBetAmount] = useState<string>("10");
  const [bets, setBets] = useState<any[]>([]);
  const [gameStatus, setGameStatus] = useState<string>("Not in room");
  const [error, setError] = useState<string>("");
  const [success, setSuccess] = useState<string>("");

  // Clear messages after 5 seconds
  useEffect(() => {
    if (error) {
      const timer = setTimeout(() => setError(""), 5000);
      return () => clearTimeout(timer);
    }
  }, [error]);

  useEffect(() => {
    if (success) {
      const timer = setTimeout(() => setSuccess(""), 5000);
      return () => clearTimeout(timer);
    }
  }, [success]);

  // Refresh channel stats periodically
  useEffect(() => {
    if (currentRoom && isChannelReady()) {
      refreshChannelStats(currentRoom.id);
      const interval = setInterval(() => {
        refreshChannelStats(currentRoom.id);
      }, 5000); // Every 5 seconds
      return () => clearInterval(interval);
    }
  }, [currentRoom, isChannelReady, refreshChannelStats]);

  // Subscribe to WebSocket messages
  useEffect(() => {
    const unsubscribe = subscribeToMessages((message) => {
      console.log("Betting room received message:", message);

      switch (message.type) {
        case "room:joined":
          setCurrentRoom({
            id: message.roomId,
            playerCount: message.playerCount,
            symbol: message.symbol,
            status: message.status,
          });
          setGameStatus(`Joined as ${message.symbol}`);
          break;

        case "room:ready":
          setGameStatus("Room ready - waiting for session");
          break;

        case "session:request":
          setGameStatus("Session created - please sign");
          if (message.message && currentRoom) {
            signSession(currentRoom.id).catch((err) => {
              setError(`Failed to sign session: ${err.message}`);
            });
          }
          break;

        case "channel:created":
          setGameStatus("Channel ready - deposit funds to start betting!");
          setSuccess("Channel created successfully!");
          break;

        case "state:signRequest":
          // State signing is handled automatically in the hook
          if (message.stateType === "deposit") {
            setSuccess("Deposit processed!");
          } else if (message.stateType === "withdrawal") {
            setSuccess("Withdrawal processed!");
          }
          break;

        case "bet:placed":
          setBets((prev) => [
            ...prev,
            {
              id: message.betId,
              predictedMove: message.predictedMove,
              amount: message.amount,
              status: message.status,
              placedAt: Date.now(),
            },
          ]);
          setSuccess("Bet placed successfully!");
          setPredictedMove("");
          break;

        case "move:made":
          setGameStatus(`Move ${message.move} made`);
          if (message.resolvedBets) {
            setBets((prev) =>
              prev.map((bet) => {
                const resolved = message.resolvedBets.find(
                  (r: any) => r.bet.id === bet.id
                );
                if (resolved) {
                  return {
                    ...bet,
                    status: resolved.won ? "won" : "lost",
                    payout: resolved.payout,
                    resolvedAt: Date.now(),
                  };
                }
                return bet;
              })
            );
          }
          break;

        case "error":
          setError(message.message || "An error occurred");
          break;
      }
    });

    return unsubscribe;
  }, [subscribeToMessages, signSession, currentRoom]);

  const joinRoom = () => {
    if (!isConnected || !address) {
      setError("Please connect wallet first");
      return;
    }

    sendMessage({
      type: "joinRoom",
      payload: roomId ? { roomId } : {},
    });
  };

  const handleDeposit = async () => {
    if (!currentRoom || !isChannelReady()) {
      setError("Channel not ready");
      return;
    }

    try {
      await deposit(currentRoom.id, Number(depositAmount));
      setDepositAmount("");
    } catch (error: any) {
      setError(`Deposit failed: ${error.message}`);
    }
  };

  const handleWithdraw = async () => {
    if (!currentRoom || !isChannelReady()) {
      setError("Channel not ready");
      return;
    }

    try {
      await withdraw(currentRoom.id, Number(withdrawAmount));
      setWithdrawAmount("");
    } catch (error: any) {
      setError(`Withdrawal failed: ${error.message}`);
    }
  };

  const handlePlaceBet = async () => {
    if (!currentRoom || !isChannelReady()) {
      setError("Channel not ready");
      return;
    }

    try {
      await placeBet(currentRoom.id, predictedMove, Number(betAmount));
    } catch (error: any) {
      setError(`Failed to place bet: ${error.message}`);
    }
  };

  const simulateMove = (move: string) => {
    if (!currentRoom) return;

    sendMessage({
      type: "simulateMove",
      payload: {
        roomId: currentRoom.id,
        move,
      },
    });
  };

  // Calculate totals
  const totalWon = bets
    .filter((bet) => bet.status === "won")
    .reduce((sum, bet) => sum + (bet.payout || 0), 0);

  const totalLost = bets
    .filter((bet) => bet.status === "lost")
    .reduce((sum, bet) => sum + bet.amount, 0);

  const pendingBets = bets.filter((bet) => bet.status === "pending");

  return (
    <div className="container mx-auto p-4 max-w-6xl">
      <h1 className="text-3xl font-bold mb-6">State Channel Betting Demo</h1>

      {/* Alerts */}
      {error && (
        <Alert variant="destructive" className="mb-4">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}
      {success && (
        <Alert className="mb-4 border-green-600 bg-green-50">
          <AlertDescription className="text-green-800">
            {success}
          </AlertDescription>
        </Alert>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Left Column */}
        <div className="space-y-4">
          {/* Connection Status */}
          <Card>
            <CardContent className="pt-6">
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span>WebSocket:</span>
                  <span
                    className={isConnected ? "text-green-600" : "text-red-600"}
                  >
                    {isConnected ? "✅ Connected" : "❌ Disconnected"}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>Wallet:</span>
                  <span>
                    {address
                      ? `${address.slice(0, 6)}...${address.slice(-4)}`
                      : "Not connected"}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>Channel:</span>
                  <span
                    className={channelId ? "text-green-600" : "text-gray-400"}
                  >
                    {channelId ? "Active" : "Not created"}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Join Room */}
          <Card>
            <CardHeader>
              <CardTitle>Join Room</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex gap-2">
                <Input
                  placeholder="Room ID (leave empty for new room)"
                  value={roomId}
                  onChange={(e) => setRoomId(e.target.value)}
                />
                <Button onClick={joinRoom} disabled={!isConnected || !address}>
                  Join
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Room & Channel Info */}
          {currentRoom && (
            <Card>
              <CardHeader>
                <CardTitle>Game Status</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span>Room ID:</span>
                    <span className="font-mono">
                      {currentRoom.id.slice(0, 8)}...
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span>Players:</span>
                    <span>{currentRoom.playerCount}/2</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Your Symbol:</span>
                    <span className="font-bold">{currentRoom.symbol}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Status:</span>
                    <span>{gameStatus}</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Channel Balance */}
          {currentRoom && isChannelReady() && (
            <Card>
              <CardHeader>
                <CardTitle>Channel Balance</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="text-center p-4 bg-blue-50 rounded">
                      <div className="text-2xl font-bold">{channelBalance}</div>
                      <div className="text-sm text-gray-600">Total Balance</div>
                    </div>
                    <div className="text-center p-4 bg-green-50 rounded">
                      <div className="text-2xl font-bold">
                        {availableBalance}
                      </div>
                      <div className="text-sm text-gray-600">Available</div>
                    </div>
                  </div>

                  {/* Deposit */}
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Deposit Funds</label>
                    <div className="flex gap-2">
                      <Input
                        type="number"
                        placeholder="Amount"
                        value={depositAmount}
                        onChange={(e) => setDepositAmount(e.target.value)}
                      />
                      <Button onClick={handleDeposit} disabled={!depositAmount}>
                        Deposit
                      </Button>
                    </div>
                  </div>

                  {/* Withdraw */}
                  <div className="space-y-2">
                    <label className="text-sm font-medium">
                      Withdraw Funds
                    </label>
                    <div className="flex gap-2">
                      <Input
                        type="number"
                        placeholder="Amount"
                        value={withdrawAmount}
                        onChange={(e) => setWithdrawAmount(e.target.value)}
                      />
                      <Button
                        onClick={handleWithdraw}
                        disabled={
                          !withdrawAmount ||
                          Number(withdrawAmount) > availableBalance
                        }
                        variant="outline"
                      >
                        Withdraw
                      </Button>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Right Column */}
        <div className="space-y-4">
          {/* Place Bet */}
          {currentRoom && isChannelReady() && availableBalance > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Place Bet</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div>
                    <label className="text-sm font-medium">
                      Predicted Move
                    </label>
                    <Input
                      placeholder="e.g., e2e4"
                      value={predictedMove}
                      onChange={(e) => setPredictedMove(e.target.value)}
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium">Bet Amount</label>
                    <Input
                      type="number"
                      placeholder="Amount"
                      value={betAmount}
                      onChange={(e) => setBetAmount(e.target.value)}
                      className="mt-1"
                    />
                  </div>
                  <Button
                    onClick={handlePlaceBet}
                    disabled={
                      !predictedMove ||
                      !betAmount ||
                      Number(betAmount) > availableBalance
                    }
                    className="w-full"
                  >
                    Place Bet
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Simulate Moves */}
          {currentRoom && pendingBets.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Simulate Chess Move</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-2">
                  <Button
                    onClick={() => simulateMove("e2e4")}
                    variant="outline"
                  >
                    e2e4
                  </Button>
                  <Button
                    onClick={() => simulateMove("d2d4")}
                    variant="outline"
                  >
                    d2d4
                  </Button>
                  <Button onClick={() => simulateMove("Nf3")} variant="outline">
                    Nf3
                  </Button>
                  <Button
                    onClick={() => simulateMove("c2c4")}
                    variant="outline"
                  >
                    c2c4
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Betting Stats */}
          {bets.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Betting Statistics</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-3 gap-4 mb-4">
                  <div className="text-center">
                    <div className="text-xl font-bold text-green-600">
                      +{totalWon}
                    </div>
                    <div className="text-xs text-gray-600">Won</div>
                  </div>
                  <div className="text-center">
                    <div className="text-xl font-bold text-red-600">
                      -{totalLost}
                    </div>
                    <div className="text-xs text-gray-600">Lost</div>
                  </div>
                  <div className="text-center">
                    <div className="text-xl font-bold">
                      {pendingBets.length}
                    </div>
                    <div className="text-xs text-gray-600">Pending</div>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Bet History */}
          {bets.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Bet History</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2 max-h-64 overflow-y-auto">
                  {bets.map((bet) => (
                    <div
                      key={bet.id}
                      className="flex justify-between items-center p-3 border rounded-lg"
                    >
                      <div>
                        <div className="font-medium">{bet.predictedMove}</div>
                        <div className="text-sm text-gray-600">
                          Amount: {bet.amount}
                        </div>
                      </div>
                      <div className="text-right">
                        <div
                          className={`font-medium ${
                            bet.status === "won"
                              ? "text-green-600"
                              : bet.status === "lost"
                              ? "text-red-600"
                              : "text-yellow-600"
                          }`}
                        >
                          {bet.status.toUpperCase()}
                        </div>
                        {bet.payout && (
                          <div className="text-sm text-gray-600">
                            +{bet.payout}
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
