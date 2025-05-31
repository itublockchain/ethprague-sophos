"use client";

import React, {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
  useCallback,
} from "react";
import { useDynamicContext } from "@dynamic-labs/sdk-react-core";

// WebSocket message types
export interface WebSocketMessage {
  type: string;
  [key: string]: any;
}

interface WebSocketContextType {
  isConnected: boolean;
  sendMessage: (message: WebSocketMessage) => void;
  lastMessage: WebSocketMessage | null;
  error: string | null;
  onlineUsers: number;
}

const WebSocketContext = createContext<WebSocketContextType>({
  isConnected: false,
  sendMessage: () => {},
  lastMessage: null,
  error: null,
  onlineUsers: 0,
});

export const useWebSocketContext = () => useContext(WebSocketContext);

interface WebSocketProviderProps {
  children: React.ReactNode;
}

export function WebSocketProvider({ children }: WebSocketProviderProps) {
  const [isConnected, setIsConnected] = useState(false);
  const [lastMessage, setLastMessage] = useState<WebSocketMessage | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [onlineUsers, setOnlineUsers] = useState(0);
  const webSocketRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const reconnectAttemptsRef = useRef(0);

  const { primaryWallet } = useDynamicContext();

  // WebSocket server URL
  const wsUrl = process.env.NEXT_PUBLIC_WS_URL || "ws://localhost:8080";

  const connect = useCallback(() => {
    if (webSocketRef.current?.readyState === WebSocket.OPEN) {
      return;
    }

    try {
      const ws = new WebSocket(wsUrl);

      ws.onopen = () => {
        console.log("WebSocket connected");
        setIsConnected(true);
        setError(null);
        reconnectAttemptsRef.current = 0;

        // Send authentication if wallet is connected
        if (primaryWallet) {
          ws.send(
            JSON.stringify({
              type: "auth",
              payload: {
                address: primaryWallet.address,
              },
            })
          );
        }
      };

      ws.onclose = () => {
        console.log("WebSocket disconnected");
        setIsConnected(false);
        webSocketRef.current = null;

        // Attempt to reconnect
        if (reconnectAttemptsRef.current < 5) {
          reconnectAttemptsRef.current++;
          const delay = Math.min(
            1000 * Math.pow(2, reconnectAttemptsRef.current),
            30000
          );

          reconnectTimeoutRef.current = setTimeout(() => {
            console.log(
              `Attempting to reconnect... (attempt ${reconnectAttemptsRef.current})`
            );
            connect();
          }, delay);
        } else {
          setError("Failed to connect to game server after multiple attempts");
        }
      };

      ws.onerror = (event) => {
        console.error("WebSocket error:", event);
        setError("Connection error occurred");
      };

      ws.onmessage = (event) => {
        try {
          const message = JSON.parse(event.data) as WebSocketMessage;

          // Handle specific message types
          switch (message.type) {
            case "onlineUsers":
              setOnlineUsers(message.count || 0);
              break;
            case "error":
              setError(message.msg || "Unknown error");
              break;
            default:
              setLastMessage(message);
          }

          // Always set last message for general access
          setLastMessage(message);
        } catch (err) {
          console.error("Error parsing WebSocket message:", err);
        }
      };

      webSocketRef.current = ws;
    } catch (err) {
      console.error("Failed to create WebSocket connection:", err);
      setError("Failed to connect to game server");
    }
  }, [wsUrl, primaryWallet]);

  const sendMessage = useCallback((message: WebSocketMessage) => {
    if (webSocketRef.current?.readyState === WebSocket.OPEN) {
      webSocketRef.current.send(JSON.stringify(message));
    } else {
      console.error("WebSocket is not connected");
      setError("Not connected to server");
    }
  }, []);

  // Initialize connection
  useEffect(() => {
    connect();

    return () => {
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
      if (webSocketRef.current) {
        webSocketRef.current.close();
      }
    };
  }, [connect]);

  // Re-authenticate when wallet changes
  useEffect(() => {
    if (
      isConnected &&
      primaryWallet &&
      webSocketRef.current?.readyState === WebSocket.OPEN
    ) {
      sendMessage({
        type: "auth",
        payload: {
          address: primaryWallet.address,
        },
      });
    }
  }, [primaryWallet, isConnected, sendMessage]);

  const value = {
    isConnected,
    sendMessage,
    lastMessage,
    error,
    onlineUsers,
  };

  return (
    <WebSocketContext.Provider value={value}>
      {children}
    </WebSocketContext.Provider>
  );
}
