import React, { useEffect, useState, useCallback } from "react";
import { useNitrolite } from "../contexts/NitroliteContext";
import { useWebSocketContext } from "../contexts/WebSocketContext";

export function useChannelBetting() {
  const nitrolite = useNitrolite();
  const { sendMessage, subscribeToMessages } = useWebSocketContext();
  const [currentChannelId, setCurrentChannelId] = useState<string | null>(null);
  const [sessionMessage, setSessionMessage] = useState<any>(null);
  const [channelBalance, setChannelBalance] = useState<number>(0);
  const [availableBalance, setAvailableBalance] = useState<number>(0);
  const [pendingStateUpdate, setPendingStateUpdate] = useState<any>(null);

  // Listen for messages
  useEffect(() => {
    const unsubscribe = subscribeToMessages((message) => {
      if (message.type === "session:request") {
        setSessionMessage(message.message);
      } else if (message.type === "channel:created") {
        setCurrentChannelId(message.channelId);
      } else if (message.type === "state:signRequest") {
        setPendingStateUpdate(message);
        // Auto-sign state updates
        if (message.stateUpdate && nitrolite.stateWallet) {
          signStateUpdate(message.stateUpdate).catch(console.error);
        }
      } else if (message.type === "state:updated") {
        // Update local balance tracking
        if (message.balances && nitrolite.primaryWallet) {
          const userBalance = message.balances[nitrolite.primaryWallet] || 0;
          setChannelBalance(userBalance);
        }
      } else if (message.type === "channel:stats") {
        // Update available balance from stats
        setAvailableBalance(message.availableBalance || 0);
        if (message.stats?.currentBalances && nitrolite.primaryWallet) {
          const userBalance =
            message.stats.currentBalances[nitrolite.primaryWallet] || 0;
          setChannelBalance(userBalance);
        }
      }
    });

    return unsubscribe;
  }, [subscribeToMessages, nitrolite.stateWallet, nitrolite.primaryWallet]);

  const signSession = useCallback(
    async (roomId: string) => {
      if (!nitrolite.stateWallet || !sessionMessage) {
        throw new Error("Wallet not connected or session not ready");
      }

      try {
        // Create EIP-712 domain and types
        const domain = {
          name: "Sagittarius Chess Betting",
          version: "1",
          chainId: sessionMessage.chain_id,
        };

        const types = {
          AppSession: [
            { name: "session_id", type: "string" },
            { name: "room_id", type: "string" },
            { name: "participants", type: "address[]" },
            { name: "token_address", type: "address" },
            { name: "chain_id", type: "uint256" },
            { name: "min_bet", type: "uint256" },
            { name: "max_bet", type: "uint256" },
            { name: "created_at", type: "uint256" },
            { name: "expires_at", type: "uint256" },
            { name: "rules", type: "Rules" },
          ],
          Rules: [
            { name: "bet_multiplier", type: "uint256" },
            { name: "server_fee_percent", type: "uint256" },
            { name: "dispute_period", type: "uint256" },
          ],
        };

        // Sign the session message
        const signature = await nitrolite.stateWallet._signTypedData(
          domain,
          types,
          sessionMessage
        );

        // Send signature to server
        sendMessage({
          type: "signSession",
          payload: {
            roomId,
            signature,
          },
        });

        return signature;
      } catch (error) {
        console.error("Failed to sign session:", error);
        throw error;
      }
    },
    [nitrolite.stateWallet, sessionMessage, sendMessage]
  );

  const signStateUpdate = useCallback(
    async (stateUpdate: any) => {
      if (!nitrolite.stateWallet) {
        throw new Error("Wallet not connected");
      }

      try {
        // Create EIP-712 domain and types for state update
        const domain = {
          name: "Sagittarius State Update",
          version: "1",
          chainId: sessionMessage?.chain_id || 137,
        };

        const types = {
          StateUpdate: [
            { name: "channelId", type: "string" },
            { name: "nonce", type: "uint256" },
            { name: "balances", type: "string" }, // JSON string of balances
            { name: "stateHash", type: "bytes32" },
            { name: "timestamp", type: "uint256" },
          ],
        };

        // Convert balances to JSON string for signing
        const value = {
          ...stateUpdate,
          balances: JSON.stringify(stateUpdate.balances),
        };

        // Sign the state update
        const signature = await nitrolite.stateWallet._signTypedData(
          domain,
          types,
          value
        );

        // Send signature to server
        sendMessage({
          type: "signStateUpdate",
          payload: {
            channelId: stateUpdate.channelId,
            nonce: stateUpdate.nonce,
            signature,
          },
        });

        return signature;
      } catch (error) {
        console.error("Failed to sign state update:", error);
        throw error;
      }
    },
    [nitrolite.stateWallet, sessionMessage, sendMessage]
  );

  const deposit = useCallback(
    async (roomId: string, amount: number): Promise<void> => {
      if (!nitrolite.stateWallet) {
        throw new Error("Wallet not connected");
      }

      if (amount <= 0) {
        throw new Error("Amount must be positive");
      }

      sendMessage({
        type: "deposit",
        payload: {
          roomId,
          amount,
        },
      });
    },
    [nitrolite.stateWallet, sendMessage]
  );

  const withdraw = useCallback(
    async (roomId: string, amount: number): Promise<void> => {
      if (!nitrolite.stateWallet) {
        throw new Error("Wallet not connected");
      }

      if (amount <= 0) {
        throw new Error("Amount must be positive");
      }

      if (amount > availableBalance) {
        throw new Error("Insufficient available balance");
      }

      sendMessage({
        type: "withdraw",
        payload: {
          roomId,
          amount,
        },
      });
    },
    [nitrolite.stateWallet, availableBalance, sendMessage]
  );

  const createChannel = useCallback(async (params: any) => {
    // This is now handled automatically when both players sign the session
    console.log("Channel creation is automatic after session signing");
  }, []);

  const placeBet = useCallback(
    async (
      roomId: string,
      predictedMove: string,
      amount: number
    ): Promise<void> => {
      if (!nitrolite.stateWallet) {
        throw new Error("Wallet not connected");
      }

      if (amount > availableBalance) {
        throw new Error(`Insufficient balance. Available: ${availableBalance}`);
      }

      sendMessage({
        type: "placeBet",
        payload: {
          roomId,
          predictedMove,
          amount,
        },
      });
    },
    [nitrolite.stateWallet, availableBalance, sendMessage]
  );

  const closeChannel = useCallback(
    async (roomId: string): Promise<void> => {
      if (!nitrolite.stateWallet || !currentChannelId) {
        throw new Error("Wallet not connected or no active channel");
      }

      sendMessage({
        type: "closeChannel",
        payload: {
          roomId,
          channelId: currentChannelId,
        },
      });
    },
    [nitrolite.stateWallet, currentChannelId, sendMessage]
  );

  const getChannelBalance = useCallback(async (): Promise<number> => {
    return channelBalance;
  }, [channelBalance]);

  const getAvailableBalance = useCallback(async (): Promise<number> => {
    return availableBalance;
  }, [availableBalance]);

  const refreshChannelStats = useCallback(
    (roomId: string) => {
      sendMessage({
        type: "getChannelStats",
        payload: { roomId },
      });
    },
    [sendMessage]
  );

  const isChannelReady = useCallback((): boolean => {
    return currentChannelId !== null;
  }, [currentChannelId]);

  return {
    createChannel,
    placeBet,
    closeChannel,
    getChannelBalance,
    getAvailableBalance,
    isChannelReady,
    channelId: currentChannelId,
    signSession,
    sessionMessage,
    deposit,
    withdraw,
    channelBalance,
    availableBalance,
    refreshChannelStats,
  };
}
