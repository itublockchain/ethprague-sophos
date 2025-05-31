import { type Channel } from "@erc7824/nitrolite";

// Betting channel types
export interface BettingChannel extends Channel {
  roomId: string;
  playerA: string;
  playerB: string;
  serverAddress: string;
  totalDeposit: bigint;
  isActive: boolean;
}

// App session types
export interface AppSessionData {
  roomId: string;
  sessionId: string;
  participants: string[];
  signatures: string[];
  status: "pending" | "active" | "closed";
  createdAt: number;
}

// Bet types for state channels
export interface ChannelBet {
  betId: string;
  roomId: string;
  channelId: string;
  player: string;
  predictedMove: string;
  amount: number;
  status: "pending" | "won" | "lost";
  timestamp: number;
  resolvedAt?: number;
  payout?: number;
}

// Channel state updates
export interface ChannelStateUpdate {
  channelId: string;
  nonce: number;
  balances: {
    [address: string]: bigint;
  };
  pendingBets: ChannelBet[];
  timestamp: number;
  signatures: string[];
}

// WebSocket message types for Nitrolite operations
export interface NitroliteMessage {
  type: 
    | "channel:create"
    | "channel:created"
    | "channel:join"
    | "channel:joined"
    | "channel:update"
    | "channel:updated"
    | "channel:close"
    | "channel:closed"
    | "channel:error"
    | "appSession:create"
    | "appSession:created"
    | "appSession:sign"
    | "appSession:signed"
    | "appSession:error";
  payload?: any;
  error?: string;
}

// Configuration for betting channels
export interface ChannelConfig {
  minDeposit: number;
  maxDeposit: number;
  challengePeriod: number;
  serverQuorum: number; // Server's weight in the channel (e.g., 100 for full control)
} 