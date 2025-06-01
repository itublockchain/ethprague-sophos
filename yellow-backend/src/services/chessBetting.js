/**
 * Chess Betting game engine
 */
import { ethers } from "ethers";

/**
 * @typedef {Object} BettingGameState
 * @property {number} currentStep - Current step in the game (0-3, game ends after 4 steps)
 * @property {string} nextTurn - The player whose turn is next
 * @property {boolean} isGameOver - Whether the game is over
 * @property {Object} players - Object with player information
 * @property {string} players.player1 - EOA address of player 1
 * @property {string} players.player2 - EOA address of player 2
 * @property {Array<Object>} bets - Array of betting rounds
 * @property {Object} balances - Current balance differences for each player
 */

/**
 * Creates a new betting game state
 * @param {string} hostEoa - Host's Ethereum address (player1)
 * @param {string} guestEoa - Guest's Ethereum address (player2)
 * @returns {BettingGameState} Initial game state
 */
export function createGame(hostEoa, guestEoa) {
  // Format addresses to proper checksum format
  const formattedHostEoa = ethers.getAddress(hostEoa);
  const formattedGuestEoa = ethers.getAddress(guestEoa);

  return {
    currentStep: 0,
    nextTurn: formattedHostEoa, // Host goes first
    isGameOver: false,
    players: {
      player1: formattedHostEoa,
      player2: formattedGuestEoa,
    },
    bets: [],
    balances: {
      [formattedHostEoa]: 0,
      [formattedGuestEoa]: 0,
    },
  };
}

/**
 * Places a bet in the current step
 * @param {BettingGameState} gameState - Current game state
 * @param {number} balanceDifference - Balance difference for this bet (+30 for win, -30 for loss)
 * @param {string} playerEoa - Player's Ethereum address
 * @returns {Object} Result with updated game state or error
 */
export function placeBet(gameState, balanceDifference, playerEoa) {
  // Format player address to proper checksum format
  const formattedPlayerEoa = ethers.getAddress(playerEoa);

  // Check if the game is already over
  if (gameState.isGameOver) {
    return { success: false, error: "Game is already over" };
  }

  // Check if it's the player's turn
  if (gameState.nextTurn !== formattedPlayerEoa) {
    return { success: false, error: "Not your turn" };
  }

  // Validate balance difference (should be +30 or -30)
  if (balanceDifference !== 30 && balanceDifference !== -30) {
    return {
      success: false,
      error: "Invalid balance difference. Must be +30 or -30",
    };
  }

  // Record the bet
  const bet = {
    step: gameState.currentStep,
    player: formattedPlayerEoa,
    balanceDifference: balanceDifference,
    timestamp: Date.now(),
  };

  // Update balances
  const newBalances = { ...gameState.balances };
  newBalances[formattedPlayerEoa] += balanceDifference;

  // Determine next player
  const { player1, player2 } = gameState.players;
  const nextPlayer = formattedPlayerEoa === player1 ? player2 : player1;

  // Check how many bets have been placed in the current step
  const currentStepBets = gameState.bets.filter(
    (b) => b.step === gameState.currentStep
  );
  const isStepComplete = currentStepBets.length === 1; // This bet will make it 2 total

  // Update game state
  const newCurrentStep = isStepComplete
    ? gameState.currentStep + 1
    : gameState.currentStep;
  const isGameOver = newCurrentStep >= 4;

  const updatedGameState = {
    ...gameState,
    currentStep: newCurrentStep,
    nextTurn: isGameOver ? null : isStepComplete ? player1 : nextPlayer,
    isGameOver: isGameOver,
    bets: [...gameState.bets, bet],
    balances: newBalances,
  };

  return {
    success: true,
    gameState: updatedGameState,
  };
}

/**
 * Gets the current game status
 * @param {BettingGameState} gameState - Current game state
 * @returns {Object} Game status information
 */
export function getGameStatus(gameState) {
  return {
    currentStep: gameState.currentStep,
    totalSteps: 4,
    isGameOver: gameState.isGameOver,
    nextTurn: gameState.nextTurn,
    balances: gameState.balances,
  };
}

/**
 * Formats game state for client consumption
 * @param {BettingGameState} gameState - Current game state
 * @param {string} roomId - Room ID
 * @returns {Object} Formatted game state for client
 */
export function formatGameState(gameState, roomId) {
  return {
    roomId,
    currentStep: gameState.currentStep,
    nextTurn: gameState.nextTurn,
    players: gameState.players,
    balances: gameState.balances,
    bets: gameState.bets,
    isGameOver: gameState.isGameOver,
  };
}

/**
 * Formats game over message
 * @param {BettingGameState} gameState - Current game state
 * @returns {Object} Game over message with final results
 */
export function formatGameOverMessage(gameState) {
  const { player1, player2 } = gameState.players;
  const player1Balance = gameState.balances[player1];
  const player2Balance = gameState.balances[player2];

  let winner = null;
  if (player1Balance > player2Balance) {
    winner = player1;
  } else if (player2Balance > player1Balance) {
    winner = player2;
  }

  return {
    isGameOver: true,
    winner: winner,
    balances: gameState.balances,
    finalResults: {
      [player1]: player1Balance,
      [player2]: player2Balance,
    },
    totalBets: gameState.bets.length,
  };
}
