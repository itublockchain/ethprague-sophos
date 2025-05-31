import { ethers } from "ethers";
import logger from "../utils/logger.js";
import { getChannelManager } from "./channelManager.js";
import { CHAIN_ID } from "../config/env.js";

/**
 * State types enum
 */
export const StateType = {
  DEPOSIT: "deposit",
  BET_PLACED: "bet_placed",
  BET_RESOLVED: "bet_resolved",
  WITHDRAWAL: "withdrawal",
};

/**
 * Channel state class
 */
class ChannelState {
  constructor(channelId, nonce = 0) {
    this.channelId = channelId;
    this.nonce = nonce;
    this.balances = {};
    this.lockedBets = new Map(); // Map<betId, lockedAmount>
    this.pendingBets = new Map(); // Map<betId, betDetails>
    this.stateHash = null;
    this.signatures = {};
  }

  /**
   * Calculate available balance (total - locked in bets)
   */
  getAvailableBalance(address) {
    const totalBalance = this.balances[address] || 0;
    let lockedAmount = 0;

    for (const [betId, bet] of this.pendingBets) {
      if (bet.playerAddress === address) {
        lockedAmount += bet.amount;
      }
    }

    return totalBalance - lockedAmount;
  }

  /**
   * Lock funds for a bet
   */
  lockFundsForBet(betId, playerAddress, amount) {
    const available = this.getAvailableBalance(playerAddress);
    if (available < amount) {
      throw new Error("Insufficient available balance");
    }

    this.lockedBets.set(betId, amount);
    this.pendingBets.set(betId, { playerAddress, amount });
  }

  /**
   * Resolve a bet and update balances
   */
  resolveBet(betId, won, payout) {
    const bet = this.pendingBets.get(betId);
    if (!bet) {
      throw new Error("Bet not found");
    }

    // Remove from pending
    this.pendingBets.delete(betId);
    this.lockedBets.delete(betId);

    // Update balance based on result
    if (won) {
      this.balances[bet.playerAddress] =
        (this.balances[bet.playerAddress] || 0) + payout;
    }
    // If lost, the locked amount is already deducted from available balance

    return this.balances;
  }

  /**
   * Generate state hash for signing
   */
  generateStateHash() {
    const stateData = {
      channelId: this.channelId,
      nonce: this.nonce,
      balances: this.balances,
      lockedBets: Object.fromEntries(this.lockedBets),
      timestamp: Math.floor(Date.now() / 1000),
    };

    this.stateHash = ethers.id(JSON.stringify(stateData));
    return this.stateHash;
  }
}

/**
 * State manager class
 */
export class StateManager {
  constructor() {
    this.channelStates = new Map(); // Map<channelId, ChannelState>
    this.stateHistory = new Map(); // Map<channelId, Array<state>>
  }

  /**
   * Initialize channel state
   */
  initializeChannelState(channelId, initialBalances = {}) {
    const state = new ChannelState(channelId);
    state.balances = { ...initialBalances };

    this.channelStates.set(channelId, state);
    this.stateHistory.set(channelId, []);

    logger.channel(`Initialized state for channel ${channelId}`);
    return state;
  }

  /**
   * Get current channel state
   */
  getChannelState(channelId) {
    return this.channelStates.get(channelId);
  }

  /**
   * Create deposit state update
   */
  async createDepositState(roomId, playerAddress, amount) {
    const channelManager = getChannelManager();
    const channelInfo = channelManager.getChannelByRoom(roomId);

    if (!channelInfo) {
      throw new Error("Channel not found for room");
    }

    let state = this.getChannelState(channelInfo.channelId);
    if (!state) {
      state = this.initializeChannelState(
        channelInfo.channelId,
        channelInfo.balances
      );
    }

    // Update state
    state.nonce++;
    state.balances[playerAddress] =
      (state.balances[playerAddress] || 0) + amount;

    // Generate state hash
    const stateHash = state.generateStateHash();

    // Create state update message
    const stateUpdate = {
      type: StateType.DEPOSIT,
      channelId: channelInfo.channelId,
      nonce: state.nonce,
      balances: state.balances,
      playerAddress,
      amount,
      stateHash,
      timestamp: Math.floor(Date.now() / 1000),
    };

    // Save to history
    this.saveStateToHistory(channelInfo.channelId, stateUpdate);

    logger.channel(
      `Created deposit state: ${playerAddress} deposited ${amount}`
    );
    return stateUpdate;
  }

  /**
   * Create bet placement state update
   */
  async createBetState(roomId, betId, playerAddress, predictedMove, amount) {
    const channelManager = getChannelManager();
    const channelInfo = channelManager.getChannelByRoom(roomId);

    if (!channelInfo) {
      throw new Error("Channel not found for room");
    }

    const state = this.getChannelState(channelInfo.channelId);
    if (!state) {
      throw new Error("Channel state not initialized");
    }

    // Lock funds for bet
    state.lockFundsForBet(betId, playerAddress, amount);

    // Update state
    state.nonce++;

    // Generate state hash
    const stateHash = state.generateStateHash();

    // Create state update message
    const stateUpdate = {
      type: StateType.BET_PLACED,
      channelId: channelInfo.channelId,
      nonce: state.nonce,
      balances: state.balances,
      lockedBets: Object.fromEntries(state.lockedBets),
      betDetails: {
        betId,
        playerAddress,
        predictedMove,
        amount,
      },
      stateHash,
      timestamp: Math.floor(Date.now() / 1000),
    };

    // Save to history
    this.saveStateToHistory(channelInfo.channelId, stateUpdate);

    logger.channel(
      `Created bet state: ${playerAddress} bet ${amount} on ${predictedMove}`
    );
    return stateUpdate;
  }

  /**
   * Create bet resolution state update
   */
  async createBetResolutionState(roomId, betId, won, payout) {
    const channelManager = getChannelManager();
    const channelInfo = channelManager.getChannelByRoom(roomId);

    if (!channelInfo) {
      throw new Error("Channel not found for room");
    }

    const state = this.getChannelState(channelInfo.channelId);
    if (!state) {
      throw new Error("Channel state not initialized");
    }

    // Resolve bet and update balances
    const newBalances = state.resolveBet(betId, won, payout);

    // Update state
    state.nonce++;

    // Generate state hash
    const stateHash = state.generateStateHash();

    // Create state update message
    const stateUpdate = {
      type: StateType.BET_RESOLVED,
      channelId: channelInfo.channelId,
      nonce: state.nonce,
      balances: newBalances,
      lockedBets: Object.fromEntries(state.lockedBets),
      betResolution: {
        betId,
        won,
        payout,
      },
      stateHash,
      timestamp: Math.floor(Date.now() / 1000),
    };

    // Save to history
    this.saveStateToHistory(channelInfo.channelId, stateUpdate);

    logger.channel(
      `Created bet resolution state: Bet ${betId} ${
        won ? "won" : "lost"
      }, payout: ${payout}`
    );
    return stateUpdate;
  }

  /**
   * Create withdrawal state update
   */
  async createWithdrawalState(roomId, playerAddress, amount) {
    const channelManager = getChannelManager();
    const channelInfo = channelManager.getChannelByRoom(roomId);

    if (!channelInfo) {
      throw new Error("Channel not found for room");
    }

    const state = this.getChannelState(channelInfo.channelId);
    if (!state) {
      throw new Error("Channel state not initialized");
    }

    // Check available balance
    const available = state.getAvailableBalance(playerAddress);
    if (available < amount) {
      throw new Error("Insufficient available balance for withdrawal");
    }

    // Update state
    state.nonce++;
    state.balances[playerAddress] =
      (state.balances[playerAddress] || 0) - amount;

    // Generate state hash
    const stateHash = state.generateStateHash();

    // Create state update message
    const stateUpdate = {
      type: StateType.WITHDRAWAL,
      channelId: channelInfo.channelId,
      nonce: state.nonce,
      balances: state.balances,
      playerAddress,
      amount,
      stateHash,
      timestamp: Math.floor(Date.now() / 1000),
    };

    // Save to history
    this.saveStateToHistory(channelInfo.channelId, stateUpdate);

    logger.channel(
      `Created withdrawal state: ${playerAddress} withdrew ${amount}`
    );
    return stateUpdate;
  }

  /**
   * Get state update message for signing
   */
  getStateUpdateForSigning(stateUpdate) {
    return {
      channelId: stateUpdate.channelId,
      nonce: stateUpdate.nonce,
      balances: stateUpdate.balances,
      stateHash: stateUpdate.stateHash,
      timestamp: stateUpdate.timestamp,
    };
  }

  /**
   * Add signature to state update
   */
  addSignatureToState(channelId, nonce, playerAddress, signature) {
    const state = this.getChannelState(channelId);
    if (!state) {
      throw new Error("Channel state not found");
    }

    if (state.nonce !== nonce) {
      throw new Error("Nonce mismatch");
    }

    state.signatures[playerAddress] = signature;

    logger.channel(`Added signature from ${playerAddress} to state ${nonce}`);
    return state;
  }

  /**
   * Save state to history
   */
  saveStateToHistory(channelId, stateUpdate) {
    const history = this.stateHistory.get(channelId) || [];
    history.push({
      ...stateUpdate,
      savedAt: Date.now(),
    });
    this.stateHistory.set(channelId, history);
  }

  /**
   * Get state history for channel
   */
  getStateHistory(channelId) {
    return this.stateHistory.get(channelId) || [];
  }

  /**
   * Get channel statistics
   */
  getChannelStats(channelId) {
    const state = this.getChannelState(channelId);
    if (!state) {
      return null;
    }

    const history = this.getStateHistory(channelId);
    const deposits = history.filter((h) => h.type === StateType.DEPOSIT);
    const bets = history.filter((h) => h.type === StateType.BET_PLACED);
    const resolutions = history.filter(
      (h) => h.type === StateType.BET_RESOLVED
    );
    const withdrawals = history.filter((h) => h.type === StateType.WITHDRAWAL);

    return {
      currentNonce: state.nonce,
      totalDeposits: deposits.reduce((sum, d) => sum + d.amount, 0),
      totalBets: bets.length,
      totalBetVolume: bets.reduce((sum, b) => sum + b.betDetails.amount, 0),
      resolvedBets: resolutions.length,
      totalWithdrawals: withdrawals.reduce((sum, w) => sum + w.amount, 0),
      currentBalances: state.balances,
      pendingBets: state.pendingBets.size,
      lockedAmount: Array.from(state.lockedBets.values()).reduce(
        (sum, amount) => sum + amount,
        0
      ),
    };
  }
}

// Create singleton instance
let stateManagerInstance = null;

export function createStateManager() {
  if (!stateManagerInstance) {
    stateManagerInstance = new StateManager();
  }
  return stateManagerInstance;
}

export function getStateManager() {
  return stateManagerInstance;
}
