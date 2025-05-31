import { v4 as uuidv4 } from "uuid";
import logger from "../utils/logger.js";
import { getRoomManager } from "./roomManager.js";
import { getChannelManager } from "./channelManager.js";
import { getStateManager } from "./stateManager.js";

/**
 * Bet status enum
 */
export const BetStatus = {
  PENDING: "pending",
  WON: "won",
  LOST: "lost",
  CANCELLED: "cancelled",
};

/**
 * Bet class
 */
class Bet {
  constructor(id, roomId, playerAddress, predictedMove, amount) {
    this.id = id;
    this.roomId = roomId;
    this.playerAddress = playerAddress;
    this.predictedMove = predictedMove.toLowerCase();
    this.amount = amount;
    this.status = BetStatus.PENDING;
    this.placedAt = Date.now();
    this.resolvedAt = null;
    this.actualMove = null;
    this.payout = 0;
  }

  resolve(actualMove, won) {
    this.actualMove = actualMove.toLowerCase();
    this.status = won ? BetStatus.WON : BetStatus.LOST;
    this.resolvedAt = Date.now();

    if (won) {
      // 2x payout for correct prediction
      this.payout = this.amount * 2;
    }

    return this.payout;
  }

  cancel() {
    this.status = BetStatus.CANCELLED;
    this.resolvedAt = Date.now();
    this.payout = this.amount; // Refund

    return this.payout;
  }

  toJSON() {
    return {
      id: this.id,
      roomId: this.roomId,
      playerAddress: this.playerAddress,
      predictedMove: this.predictedMove,
      amount: this.amount,
      status: this.status,
      placedAt: this.placedAt,
      resolvedAt: this.resolvedAt,
      actualMove: this.actualMove,
      payout: this.payout,
    };
  }
}

/**
 * Betting manager class
 */
export class BettingManager {
  constructor() {
    this.bets = new Map(); // Map<betId, Bet>
    this.playerBets = new Map(); // Map<playerAddress, Set<betId>>
    this.roomBets = new Map(); // Map<roomId, Set<betId>>
    this.pendingBets = new Map(); // Map<roomId, Set<betId>> - bets waiting for next move
  }

  /**
   * Place a bet
   */
  placeBet(roomId, playerAddress, predictedMove, amount, channelId = null) {
    // Validate amount
    if (amount <= 0) {
      throw new Error("Bet amount must be positive");
    }

    // Validate move format (should be like 'e2e4')
    if (!this.isValidMoveFormat(predictedMove)) {
      throw new Error(
        "Invalid move format. Use algebraic notation (e.g., e2e4)"
      );
    }

    // Check if channel exists and player has sufficient balance
    const stateManager = getStateManager();
    const channelManager = getChannelManager();
    const channelInfo = channelManager.getChannelByRoom(roomId);

    if (channelInfo) {
      const channelState = stateManager.getChannelState(channelInfo.channelId);
      if (channelState) {
        const availableBalance =
          channelState.getAvailableBalance(playerAddress);
        if (availableBalance < amount) {
          throw new Error(
            `Insufficient channel balance. Available: ${availableBalance}`
          );
        }
      }
    }

    // Create bet
    const betId = uuidv4();
    const bet = new Bet(betId, roomId, playerAddress, predictedMove, amount);

    // Store bet
    this.bets.set(betId, bet);

    // Track by player
    if (!this.playerBets.has(playerAddress)) {
      this.playerBets.set(playerAddress, new Set());
    }
    this.playerBets.get(playerAddress).add(betId);

    // Track by room
    if (!this.roomBets.has(roomId)) {
      this.roomBets.set(roomId, new Set());
    }
    this.roomBets.get(roomId).add(betId);

    // Add to pending bets for this room
    if (!this.pendingBets.has(roomId)) {
      this.pendingBets.set(roomId, new Set());
    }
    this.pendingBets.get(roomId).add(betId);

    // Create state update if channel exists
    if (channelInfo && stateManager) {
      try {
        const stateUpdate = stateManager.createBetState(
          roomId,
          betId,
          playerAddress,
          predictedMove,
          amount
        );
        logger.channel(`State update created for bet ${betId}`);
      } catch (error) {
        logger.error(`Failed to create state update for bet:`, error);
        // Remove the bet if state update fails
        this.bets.delete(betId);
        this.playerBets.get(playerAddress)?.delete(betId);
        this.roomBets.get(roomId)?.delete(betId);
        this.pendingBets.get(roomId)?.delete(betId);
        throw error;
      }
    }

    logger.bet(
      `Bet placed: ${betId} by ${playerAddress} in room ${roomId}. Predicted: ${predictedMove}, Amount: ${amount}`
    );

    return bet;
  }

  /**
   * Resolve bets for a room after a move
   */
  async resolveBetsForMove(roomId, actualMove) {
    const pendingBetIds = this.pendingBets.get(roomId);
    if (!pendingBetIds || pendingBetIds.size === 0) {
      logger.bet(`No pending bets to resolve for room ${roomId}`);
      return [];
    }

    const resolvedBets = [];
    const normalizedActualMove = actualMove.toLowerCase();
    const balanceUpdates = {}; // Track balance changes per player

    // Get state manager
    const stateManager = getStateManager();
    const channelManager = getChannelManager();
    const channelInfo = channelManager.getChannelByRoom(roomId);

    for (const betId of pendingBetIds) {
      const bet = this.bets.get(betId);
      if (!bet) continue;

      const won = bet.predictedMove === normalizedActualMove;
      const payout = bet.resolve(actualMove, won);

      resolvedBets.push({
        bet: bet.toJSON(),
        won,
        payout,
      });

      // Track balance changes
      if (won) {
        // Winner gets their bet amount back plus winnings
        balanceUpdates[bet.playerAddress] =
          (balanceUpdates[bet.playerAddress] || 0) + bet.amount;
      } else {
        // Loser loses their bet amount
        balanceUpdates[bet.playerAddress] =
          (balanceUpdates[bet.playerAddress] || 0) - bet.amount;
      }

      // Create state update for bet resolution if channel exists
      if (channelInfo && stateManager) {
        try {
          await stateManager.createBetResolutionState(
            roomId,
            betId,
            won,
            payout
          );
          logger.channel(`State update created for bet resolution ${betId}`);
        } catch (error) {
          logger.error(
            `Failed to create state update for bet resolution:`,
            error
          );
        }
      }

      logger.bet(
        `Bet ${betId} resolved: ${won ? "WON" : "LOST"}. Payout: ${payout}`
      );
    }

    // Clear pending bets for this room
    this.pendingBets.delete(roomId);

    // Update channel balances if channel exists
    if (channelManager && channelInfo) {
      try {
        await channelManager.updateChannelBalance(roomId, balanceUpdates);
        logger.bet(`Channel balances updated for room ${roomId}`);
      } catch (error) {
        logger.error(`Failed to update channel balances:`, error);
      }
    }

    return resolvedBets;
  }

  /**
   * Cancel all pending bets for a room
   */
  cancelRoomBets(roomId) {
    const roomBetIds = this.roomBets.get(roomId);
    if (!roomBetIds) return [];

    const cancelledBets = [];

    for (const betId of roomBetIds) {
      const bet = this.bets.get(betId);
      if (!bet || bet.status !== BetStatus.PENDING) continue;

      const refund = bet.cancel();
      cancelledBets.push({
        bet: bet.toJSON(),
        refund,
      });

      logger.bet(`Bet ${betId} cancelled. Refund: ${refund}`);
    }

    // Clean up pending bets
    this.pendingBets.delete(roomId);

    return cancelledBets;
  }

  /**
   * Get bet by ID
   */
  getBet(betId) {
    return this.bets.get(betId);
  }

  /**
   * Get all bets for a player
   */
  getPlayerBets(playerAddress) {
    const betIds = this.playerBets.get(playerAddress);
    if (!betIds) return [];

    return Array.from(betIds)
      .map((betId) => this.bets.get(betId))
      .filter((bet) => bet)
      .map((bet) => bet.toJSON());
  }

  /**
   * Get all bets for a room
   */
  getRoomBets(roomId) {
    const betIds = this.roomBets.get(roomId);
    if (!betIds) return [];

    return Array.from(betIds)
      .map((betId) => this.bets.get(betId))
      .filter((bet) => bet)
      .map((bet) => bet.toJSON());
  }

  /**
   * Get pending bets for a room
   */
  getPendingBets(roomId) {
    const betIds = this.pendingBets.get(roomId);
    if (!betIds) return [];

    return Array.from(betIds)
      .map((betId) => this.bets.get(betId))
      .filter((bet) => bet && bet.status === BetStatus.PENDING)
      .map((bet) => bet.toJSON());
  }

  /**
   * Calculate total exposure for a room (total pending bet amounts)
   */
  getRoomExposure(roomId) {
    const pendingBetIds = this.pendingBets.get(roomId);
    if (!pendingBetIds) return 0;

    let totalExposure = 0;
    for (const betId of pendingBetIds) {
      const bet = this.bets.get(betId);
      if (bet && bet.status === BetStatus.PENDING) {
        totalExposure += bet.amount * 2; // Maximum payout is 2x
      }
    }

    return totalExposure;
  }

  /**
   * Validate move format
   */
  isValidMoveFormat(move) {
    // Basic validation for algebraic notation (e.g., 'e2e4', 'Nf3', 'O-O')
    // This is simplified - real chess move validation would be more complex
    const basicMovePattern = /^[a-h][1-8][a-h][1-8]$/; // e2e4 format
    const pieceMovePatter = /^[NBRQK]?[a-h]?[1-8]?x?[a-h][1-8]$/; // Nf3, Bxe5 format
    const castlingPattern = /^(O-O|O-O-O)$/; // Castling

    const normalizedMove = move.trim();
    return (
      basicMovePattern.test(normalizedMove) ||
      pieceMovePatter.test(normalizedMove) ||
      castlingPattern.test(normalizedMove)
    );
  }

  /**
   * Get betting statistics
   */
  getStats() {
    let totalBets = 0;
    let totalVolume = 0;
    let totalPayout = 0;
    let wonBets = 0;
    let lostBets = 0;
    let pendingBets = 0;

    for (const bet of this.bets.values()) {
      totalBets++;
      totalVolume += bet.amount;

      switch (bet.status) {
        case BetStatus.WON:
          wonBets++;
          totalPayout += bet.payout;
          break;
        case BetStatus.LOST:
          lostBets++;
          break;
        case BetStatus.PENDING:
          pendingBets++;
          break;
      }
    }

    return {
      totalBets,
      totalVolume,
      totalPayout,
      wonBets,
      lostBets,
      pendingBets,
      winRate: totalBets > 0 ? wonBets / (wonBets + lostBets) : 0,
    };
  }
}

// Create singleton instance
let bettingManagerInstance = null;

export function createBettingManager() {
  if (!bettingManagerInstance) {
    bettingManagerInstance = new BettingManager();
  }
  return bettingManagerInstance;
}

export function getBettingManager() {
  return bettingManagerInstance;
}
