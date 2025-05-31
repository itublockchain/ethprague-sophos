"use client";

import React, { useState, useEffect } from "react";
import { useWebSocketContext } from "../contexts/WebSocketContext";
import { useChannelBetting } from "../hooks/useChannelBetting";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { useAppKit } from "@reown/appkit/react";

export function GameRoom() {
  const { address } = useAppKit();
  const { sendMessage, subscribeToMessages, isConnected } =
    useWebSocketContext();
  const { signSession, sessionMessage, channelId, placeBet, isChannelReady } =
    useChannelBetting();

  const [roomId, setRoomId] = useState<string>("");
  const [currentRoom, setCurrentRoom] = useState<any>(null);
  const [predictedMove, setPredictedMove] = useState<string>("");
  const [betAmount, setBetAmount] = useState<string>("10");
  const [bets, setBets] = useState<any[]>([]);
  const [gameStatus, setGameStatus] = useState<string>("Not in room");

  // Subscribe to WebSocket messages
  useEffect(() => {
    const unsubscribe = subscribeToMessages((message) => {
      console.log("Game room received message:", message);

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
          // Auto-sign session if we have it
          if (message.message && currentRoom) {
            signSession(currentRoom.id).catch(console.error);
          }
          break;

        case "channel:created":
          setGameStatus("Channel ready - you can place bets!");
          break;

        case "bet:placed":
          setBets((prev) => [
            ...prev,
            {
              id: message.betId,
              predictedMove: message.predictedMove,
              amount: message.amount,
              status: message.status,
            },
          ]);
          break;

        case "move:made":
          setGameStatus(`Move ${message.move} made`);
          // Update bet statuses
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
                  };
                }
                return bet;
              })
            );
          }
          break;

        case "player:left":
          setGameStatus("Other player left");
          break;
      }
    });

    return unsubscribe;
  }, [subscribeToMessages, signSession, currentRoom]);

  const joinRoom = () => {
    if (!isConnected || !address) {
      alert("Please connect wallet first");
      return;
    }

    sendMessage({
      type: "joinRoom",
      payload: roomId ? { roomId } : {},
    });
  };

  const handlePlaceBet = async () => {
    if (!currentRoom || !isChannelReady()) {
      alert("Channel not ready");
      return;
    }

    try {
      await placeBet(currentRoom.id, predictedMove, Number(betAmount));
      setPredictedMove("");
    } catch (error) {
      console.error("Failed to place bet:", error);
      alert("Failed to place bet");
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

  return (
    <div className="container mx-auto p-4 max-w-4xl">
      <h1 className="text-3xl font-bold mb-6">Sagittarius Game Room Demo</h1>

      {/* Connection Status */}
      <Card className="mb-4">
        <CardContent className="pt-6">
          <div className="flex items-center justify-between">
            <span>
              WebSocket: {isConnected ? "✅ Connected" : "❌ Disconnected"}
            </span>
            <span>
              Wallet:{" "}
              {address
                ? `${address.slice(0, 6)}...${address.slice(-4)}`
                : "Not connected"}
            </span>
          </div>
        </CardContent>
      </Card>

      {/* Join Room */}
      <Card className="mb-4">
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
              Join Room
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Room Status */}
      {currentRoom && (
        <Card className="mb-4">
          <CardHeader>
            <CardTitle>Room Status</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <p>Room ID: {currentRoom.id}</p>
              <p>Players: {currentRoom.playerCount}/2</p>
              <p>Your Symbol: {currentRoom.symbol}</p>
              <p>Status: {gameStatus}</p>
              <p>Channel ID: {channelId || "Not created"}</p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Place Bet */}
      {currentRoom && isChannelReady() && (
        <Card className="mb-4">
          <CardHeader>
            <CardTitle>Place Bet</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <Input
                placeholder="Predicted move (e.g., e2e4)"
                value={predictedMove}
                onChange={(e) => setPredictedMove(e.target.value)}
              />
              <Input
                type="number"
                placeholder="Bet amount"
                value={betAmount}
                onChange={(e) => setBetAmount(e.target.value)}
              />
              <Button
                onClick={handlePlaceBet}
                disabled={!predictedMove || !betAmount}
              >
                Place Bet
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Simulate Moves */}
      {currentRoom && bets.length > 0 && (
        <Card className="mb-4">
          <CardHeader>
            <CardTitle>Simulate Chess Move</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex gap-2 flex-wrap">
              <Button onClick={() => simulateMove("e2e4")} variant="outline">
                e2e4
              </Button>
              <Button onClick={() => simulateMove("d2d4")} variant="outline">
                d2d4
              </Button>
              <Button onClick={() => simulateMove("Nf3")} variant="outline">
                Nf3
              </Button>
              <Button onClick={() => simulateMove("c2c4")} variant="outline">
                c2c4
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Bets History */}
      {bets.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Your Bets</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {bets.map((bet) => (
                <div
                  key={bet.id}
                  className="flex justify-between items-center p-2 border rounded"
                >
                  <span>Predicted: {bet.predictedMove}</span>
                  <span>Amount: {bet.amount}</span>
                  <span
                    className={
                      bet.status === "won"
                        ? "text-green-600"
                        : bet.status === "lost"
                        ? "text-red-600"
                        : "text-yellow-600"
                    }
                  >
                    {bet.status.toUpperCase()}
                    {bet.payout && ` (+${bet.payout})`}
                  </span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
