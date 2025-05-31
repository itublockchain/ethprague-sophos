import { ethers } from "ethers";
import logger from "../utils/logger.js";
import { getRPCClient } from "./nitroliteRPC.js";
import { getRoomManager } from "./roomManager.js";
import {
  USDC_TOKEN_ADDRESS,
  CHAIN_ID,
  MIN_BET_AMOUNT,
  MAX_BET_AMOUNT,
} from "../config/env.js";

/**
 * Channel status enum
 */
export const ChannelStatus = {
  NONE: "none",
  SESSION_PENDING: "session_pending",
  SESSION_READY: "session_ready",
  CHANNEL_CREATING: "channel_creating",
  CHANNEL_READY: "channel_ready",
  CHANNEL_CLOSING: "channel_closing",
  CHANNEL_CLOSED: "channel_closed",
};

/**
 * App session class
 */
class AppSession {
  constructor(roomId, hostAddress, guestAddress) {
    this.roomId = roomId;
    this.hostAddress = hostAddress;
    this.guestAddress = guestAddress;
    this.sessionId = null;
    this.hostSignature = null;
    this.guestSignature = null;
    this.sessionMessage = null;
    this.status = ChannelStatus.SESSION_PENDING;
    this.createdAt = Date.now();
  }

  isReady() {
    return this.hostSignature && this.guestSignature;
  }

  addSignature(playerAddress, signature) {
    if (playerAddress === this.hostAddress) {
      this.hostSignature = signature;
    } else if (playerAddress === this.guestAddress) {
      this.guestSignature = signature;
    } else {
      throw new Error("Invalid player address");
    }

    if (this.isReady()) {
      this.status = ChannelStatus.SESSION_READY;
    }
  }
}

/**
 * Channel manager class
 */
export class ChannelManager {
  constructor() {
    this.sessions = new Map(); // Map<roomId, AppSession>
    this.channels = new Map(); // Map<roomId, channelInfo>
    this.playerChannels = new Map(); // Map<playerAddress, Set<channelId>>
  }

  /**
   * Create app session for a room
   */
  async createAppSession(roomId) {
    const room = getRoomManager().getRoom(roomId);
    if (!room) {
      throw new Error("Room not found");
    }

    if (room.getPlayerCount() !== 2) {
      throw new Error("Room must have exactly 2 players");
    }

    // Get player addresses
    const players = Array.from(room.players.keys());
    const hostAddress = players[0];
    const guestAddress = players[1];

    // Create app session
    const session = new AppSession(roomId, hostAddress, guestAddress);

    // Generate session message for signing
    const sessionMessage = this.generateSessionMessage(
      roomId,
      hostAddress,
      guestAddress
    );
    session.sessionMessage = sessionMessage;

    this.sessions.set(roomId, session);

    logger.channel(`Created app session for room ${roomId}`);
    return {
      sessionId: sessionMessage.session_id,
      message: sessionMessage,
    };
  }

  /**
   * Generate session message for EIP-712 signing
   */
  generateSessionMessage(roomId, hostAddress, guestAddress) {
    const timestamp = Math.floor(Date.now() / 1000);
    const sessionId = ethers.id(`${roomId}-${timestamp}`);

    return {
      session_id: sessionId,
      room_id: roomId,
      participants: [hostAddress, guestAddress],
      token_address: USDC_TOKEN_ADDRESS,
      chain_id: CHAIN_ID,
      min_bet: MIN_BET_AMOUNT.toString(),
      max_bet: MAX_BET_AMOUNT.toString(),
      created_at: timestamp,
      expires_at: timestamp + 86400, // 24 hours
      rules: {
        bet_multiplier: 2,
        server_fee_percent: 0,
        dispute_period: 300, // 5 minutes
      },
    };
  }

  /**
   * Add player signature to app session
   */
  async addSessionSignature(roomId, playerAddress, signature) {
    const session = this.sessions.get(roomId);
    if (!session) {
      throw new Error("Session not found");
    }

    // Add signature
    session.addSignature(playerAddress, signature);

    logger.channel(
      `Added signature from ${playerAddress} to session ${roomId}`
    );

    // If session is ready, create channel
    if (session.isReady()) {
      logger.channel(`Session ${roomId} ready, creating channel...`);
      return await this.createChannel(roomId);
    }

    return {
      ready: false,
      pendingSignatures: session.isReady() ? 0 : 1,
    };
  }

  /**
   * Create channel with collected signatures
   */
  async createChannel(roomId) {
    const session = this.sessions.get(roomId);
    if (!session || !session.isReady()) {
      throw new Error("Session not ready");
    }

    const room = getRoomManager().getRoom(roomId);
    if (!room) {
      throw new Error("Room not found");
    }

    const rpcClient = getRPCClient();
    if (!rpcClient) {
      throw new Error("RPC client not initialized");
    }

    try {
      room.status = ChannelStatus.CHANNEL_CREATING;

      // Create channel parameters
      const channelParams = {
        session_id: session.sessionMessage.session_id,
        participants: session.sessionMessage.participants,
        token_address: USDC_TOKEN_ADDRESS,
        initial_balances: {
          [session.hostAddress]: "0",
          [session.guestAddress]: "0",
        },
        signatures: {
          [session.hostAddress]: session.hostSignature,
          [session.guestAddress]: session.guestSignature,
        },
        metadata: {
          room_id: roomId,
          game_type: "chess_betting",
        },
      };

      logger.channel(`Creating channel with params:`, channelParams);

      // Send create_channel RPC request
      const response = await rpcClient.sendRequest("create_channel", [
        channelParams,
      ]);

      const channelId = response[2]?.channel_id;
      if (!channelId) {
        throw new Error("Failed to get channel ID from response");
      }

      // Store channel info
      const channelInfo = {
        channelId,
        roomId,
        participants: session.sessionMessage.participants,
        sessionId: session.sessionMessage.session_id,
        createdAt: Date.now(),
        status: ChannelStatus.CHANNEL_READY,
        balances: {
          [session.hostAddress]: 0,
          [session.guestAddress]: 0,
        },
      };

      this.channels.set(roomId, channelInfo);

      // Track channels by player
      for (const participant of channelInfo.participants) {
        if (!this.playerChannels.has(participant)) {
          this.playerChannels.set(participant, new Set());
        }
        this.playerChannels.get(participant).add(channelId);
      }

      // Update room with channel info
      getRoomManager().updateRoomChannel(
        roomId,
        channelId,
        session.sessionMessage.session_id
      );

      logger.channel(`Channel created successfully: ${channelId}`);
      return {
        ready: true,
        channelId,
        sessionId: session.sessionMessage.session_id,
      };
    } catch (error) {
      logger.error(`Failed to create channel for room ${roomId}:`, error);
      room.status = ChannelStatus.SESSION_READY;
      throw error;
    }
  }

  /**
   * Update channel balance after bet resolution
   */
  async updateChannelBalance(roomId, updates) {
    const channelInfo = this.channels.get(roomId);
    if (!channelInfo) {
      throw new Error("Channel not found for room");
    }

    const rpcClient = getRPCClient();
    if (!rpcClient) {
      throw new Error("RPC client not initialized");
    }

    try {
      // Update local balances
      for (const [address, delta] of Object.entries(updates)) {
        channelInfo.balances[address] =
          (channelInfo.balances[address] || 0) + delta;
      }

      // Create state update message
      const stateUpdate = {
        channel_id: channelInfo.channelId,
        nonce: Date.now(),
        balances: channelInfo.balances,
        timestamp: Math.floor(Date.now() / 1000),
      };

      logger.channel(
        `Updating channel ${channelInfo.channelId} balances:`,
        channelInfo.balances
      );

      // Send update_state RPC request
      const response = await rpcClient.sendRequest("update_state", [
        stateUpdate,
      ]);

      logger.channel(`Channel state updated successfully`);
      return channelInfo.balances;
    } catch (error) {
      logger.error(`Failed to update channel balance:`, error);
      throw error;
    }
  }

  /**
   * Get channel info for a room
   */
  getChannelByRoom(roomId) {
    return this.channels.get(roomId);
  }

  /**
   * Get all channels for a player
   */
  getPlayerChannels(playerAddress) {
    const channelIds = this.playerChannels.get(playerAddress);
    if (!channelIds) return [];

    const channels = [];
    for (const channelId of channelIds) {
      for (const [roomId, channelInfo] of this.channels) {
        if (channelInfo.channelId === channelId) {
          channels.push(channelInfo);
        }
      }
    }

    return channels;
  }

  /**
   * Close channel
   */
  async closeChannel(roomId, initiatorAddress) {
    const channelInfo = this.channels.get(roomId);
    if (!channelInfo) {
      throw new Error("Channel not found");
    }

    const rpcClient = getRPCClient();
    if (!rpcClient) {
      throw new Error("RPC client not initialized");
    }

    try {
      channelInfo.status = ChannelStatus.CHANNEL_CLOSING;

      const closeParams = {
        channel_id: channelInfo.channelId,
        initiator: initiatorAddress,
        final_balances: channelInfo.balances,
      };

      logger.channel(`Closing channel ${channelInfo.channelId}`);

      // Send close_channel RPC request
      const response = await rpcClient.sendRequest("close_channel", [
        closeParams,
      ]);

      channelInfo.status = ChannelStatus.CHANNEL_CLOSED;
      logger.channel(`Channel closed successfully`);

      return true;
    } catch (error) {
      logger.error(`Failed to close channel:`, error);
      channelInfo.status = ChannelStatus.CHANNEL_READY;
      throw error;
    }
  }

  /**
   * Get statistics
   */
  getStats() {
    return {
      totalSessions: this.sessions.size,
      totalChannels: this.channels.size,
      activeChannels: Array.from(this.channels.values()).filter(
        (c) => c.status === ChannelStatus.CHANNEL_READY
      ).length,
    };
  }
}

// Create singleton instance
let channelManagerInstance = null;

export function createChannelManager() {
  if (!channelManagerInstance) {
    channelManagerInstance = new ChannelManager();
  }
  return channelManagerInstance;
}

export function getChannelManager() {
  return channelManagerInstance;
}
