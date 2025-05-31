import { useState, useCallback, useEffect } from "react";
import { useNitrolite } from "@/context/NitroliteClientWrapper";
import { useWebSocketContext } from "@/context/WebSocketContext";
import { type Channel } from "@erc7824/nitrolite";
import { toast } from "sonner";

export interface BetDetails {
  roomId: string;
  predictedMove: string;
  amount: number;
  betId?: string;
}

export interface ChannelState {
  channel: Channel | null;
  channelId: string | null;
  isCreating: boolean;
  isClosing: boolean;
  balance: number;
}

export function useChannelBetting(roomId: string) {
  const { client, stateWallet, error: nitroliteError } = useNitrolite();
  const { sendMessage, lastMessage, isConnected } = useWebSocketContext();

  const [channelState, setChannelState] = useState<ChannelState>({
    channel: null,
    channelId: null,
    isCreating: false,
    isClosing: false,
    balance: 0,
  });

  const [pendingBets, setPendingBets] = useState<Map<string, BetDetails>>(
    new Map()
  );

  // Create or join a betting channel for the room
  const createOrJoinChannel = useCallback(
    async (opponentAddress: string, initialDeposit: number) => {
      if (!client || !stateWallet) {
        toast.error("Nitrolite client not initialized");
        return null;
      }

      setChannelState((prev) => ({ ...prev, isCreating: true }));

      try {
        // Send request to server to create/join channel
        sendMessage({
          type: "channel:create",
          payload: {
            roomId,
            opponentAddress,
            deposit: initialDeposit,
          },
        });

        // Server will respond with channel details
        // For now, return a placeholder
        toast.success("Channel creation initiated");
        return true;
      } catch (error) {
        console.error("Failed to create channel:", error);
        toast.error("Failed to create betting channel");
        return null;
      } finally {
        setChannelState((prev) => ({ ...prev, isCreating: false }));
      }
    },
    [client, stateWallet, roomId, sendMessage]
  );

  // Place a bet through the state channel
  const placeBet = useCallback(
    async (betDetails: BetDetails) => {
      if (!isConnected) {
        toast.error("Not connected to server");
        return false;
      }

      if (!channelState.channelId && betDetails.amount > 0) {
        toast.error("No active betting channel. Please create one first.");
        return false;
      }

      try {
        const betId = `bet-${Date.now()}-${Math.random()
          .toString(36)
          .substr(2, 9)}`;

        // Store bet locally
        setPendingBets((prev) => {
          const newBets = new Map(prev);
          newBets.set(betId, { ...betDetails, betId });
          return newBets;
        });

        // Send bet to server
        sendMessage({
          type: "placeBet",
          payload: {
            ...betDetails,
            betId,
            channelId: channelState.channelId,
          },
        });

        toast.success(
          `Bet placed! Predicting: ${betDetails.predictedMove.toUpperCase()}`
        );
        return true;
      } catch (error) {
        console.error("Failed to place bet:", error);
        toast.error("Failed to place bet");
        return false;
      }
    },
    [isConnected, channelState.channelId, sendMessage]
  );

  // Handle bet resolution
  const resolveBet = useCallback(
    async (betId: string, won: boolean, payout?: number) => {
      const bet = pendingBets.get(betId);
      if (!bet) return;

      try {
        if (won && payout) {
          toast.success(`🎉 You won ${payout} USDC!`);
          setChannelState((prev) => ({
            ...prev,
            balance: prev.balance + payout,
          }));
        } else {
          toast.error(`😔 You lost ${bet.amount} USDC`);
          setChannelState((prev) => ({
            ...prev,
            balance: prev.balance - bet.amount,
          }));
        }

        // Remove from pending
        setPendingBets((prev) => {
          const newBets = new Map(prev);
          newBets.delete(betId);
          return newBets;
        });
      } catch (error) {
        console.error("Failed to resolve bet:", error);
      }
    },
    [pendingBets]
  );

  // Close the betting channel
  const closeChannel = useCallback(async () => {
    if (!channelState.channelId) {
      toast.error("No active channel to close");
      return false;
    }

    setChannelState((prev) => ({ ...prev, isClosing: true }));

    try {
      sendMessage({
        type: "channel:close",
        payload: {
          roomId,
          channelId: channelState.channelId,
        },
      });

      toast.success("Channel closure initiated");
      return true;
    } catch (error) {
      console.error("Failed to close channel:", error);
      toast.error("Failed to close channel");
      return false;
    } finally {
      setChannelState((prev) => ({ ...prev, isClosing: false }));
    }
  }, [channelState.channelId, roomId, sendMessage]);

  // Listen for WebSocket messages
  useEffect(() => {
    if (!lastMessage) return;

    switch (lastMessage.type) {
      case "channel:created":
        if (lastMessage.roomId === roomId) {
          setChannelState((prev) => ({
            ...prev,
            channel: lastMessage.channel,
            channelId: lastMessage.channelId,
            balance: lastMessage.balance || 0,
          }));
          toast.success("Betting channel created!");
        }
        break;

      case "bet:resolved":
        if (lastMessage.betId) {
          resolveBet(lastMessage.betId, lastMessage.won, lastMessage.payout);
        }
        break;

      case "channel:closed":
        if (lastMessage.roomId === roomId) {
          setChannelState({
            channel: null,
            channelId: null,
            isCreating: false,
            isClosing: false,
            balance: 0,
          });
          toast.success(
            `Channel closed. Final balance: ${lastMessage.finalBalance} USDC`
          );
        }
        break;

      case "channel:error":
        toast.error(lastMessage.message || "Channel operation failed");
        break;
    }
  }, [lastMessage, roomId, resolveBet]);

  return {
    // State
    channelState,
    pendingBets: Array.from(pendingBets.values()),
    hasActiveChannel: !!channelState.channelId,

    // Actions
    createOrJoinChannel,
    placeBet,
    closeChannel,

    // Status
    isReady: isConnected && !nitroliteError,
    error: nitroliteError,
  };
}
