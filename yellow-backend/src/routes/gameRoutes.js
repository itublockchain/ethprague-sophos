/**
 * Game-related WebSocket message handlers
 */

import {
  closeAppSession,
  createAppSession,
  createGame,
  formatGameOverMessage,
  formatGameState,
  hasAppSession,
} from "../services/index.js";
import logger from "../utils/logger.js";
import { validateBetPayload } from "../utils/validators.js";

/**
 * Handles a start game request
 * @param {WebSocket} ws - WebSocket connection
 * @param {Object} payload - Request payload
 * @param {Object} context - Application context containing roomManager and connections
 */
export async function handleStartGame(
  ws,
  payload,
  { roomManager, connections, sendError }
) {
  if (!payload || typeof payload !== "object") {
    return sendError(ws, "INVALID_PAYLOAD", "Invalid payload format");
  }

  const { roomId } = payload;

  if (!roomId) {
    return sendError(ws, "INVALID_PAYLOAD", "Room ID is required");
  }

  // Find the player trying to start the game
  let playerEoa = null;
  for (const [eoa, connection] of connections.entries()) {
    if (connection.ws === ws) {
      playerEoa = eoa;
      break;
    }
  }

  if (!playerEoa) {
    return sendError(ws, "NOT_AUTHENTICATED", "Player not authenticated");
  }

  // Get the room
  const room = roomManager.rooms.get(roomId);
  if (!room) {
    return sendError(ws, "ROOM_NOT_FOUND", "Room not found");
  }

  // Only the host can start the game
  if (room.players.host !== playerEoa) {
    return sendError(ws, "NOT_AUTHORIZED", "Only the host can start the game");
  }

  // Need both players
  if (!room.players.host || !room.players.guest) {
    return sendError(
      ws,
      "ROOM_NOT_FULL",
      "Room must have two players to start the game"
    );
  }

  // Initialize game state if not already done
  if (!room.gameState) {
    room.gameState = createGame(room.players.host, room.players.guest);
  }

  // Create an app session for this game if not already created
  if (!hasAppSession(roomId)) {
    try {
      logger.nitro(`Creating app session for room ${roomId}`);
      const appId = await createAppSession(
        roomId,
        room.players.host,
        room.players.guest
      );
      logger.nitro(`App session created with ID ${appId}`);

      // Store the app ID in the room object
      room.appId = appId;
    } catch (error) {
      logger.error(`Failed to create app session for room ${roomId}:`, error);
      // Continue with the game even if app session creation fails
      // This allows the game to work in a fallback mode
    }
  }

  // Broadcast game started
  roomManager.broadcastToRoom(roomId, "game:started", {
    roomId,
    firstTurn: "X",
  });

  // Send the initial game state
  roomManager.broadcastToRoom(
    roomId,
    "room:state",
    formatGameState(room.gameState, roomId)
  );
}

/**
 * Handles a bet request
 * @param {WebSocket} ws - WebSocket connection
 * @param {Object} payload - Request payload
 * @param {Object} context - Application context containing roomManager and connections
 */
export async function handleBet(
  ws,
  payload,
  { roomManager, connections, sendError }
) {
  // Validate payload
  const validation = validateBetPayload(payload);
  if (!validation.success) {
    return sendError(ws, "INVALID_PAYLOAD", validation.error);
  }

  const { roomId, balanceDifference } = payload;

  // Find the player making the bet
  let playerEoa = null;
  for (const [eoa, connection] of connections.entries()) {
    if (connection.ws === ws) {
      playerEoa = eoa;
      break;
    }
  }

  if (!playerEoa) {
    return sendError(ws, "NOT_AUTHENTICATED", "Player not authenticated");
  }

  // Process the bet
  const result = roomManager.processBet(roomId, balanceDifference, playerEoa);
  if (!result.success) {
    return sendError(ws, "BET_FAILED", result.error);
  }

  // Since you mentioned you don't need broadcasting, we'll skip the real-time updates
  // Just store the result in a simple database or log it
  logger.info(
    `Bet processed for room ${roomId}: ${JSON.stringify({
      roomId,
      balanceDifference,
      player: playerEoa,
      gameState: result.gameState,
    })}`
  );

  // Handle game over condition (after 4 steps)
  if (result.isGameOver) {
    const gameOverData = formatGameOverMessage(result.gameState);

    logger.info(
      `Game finished for room ${roomId}: ${JSON.stringify(gameOverData)}`
    );

    // Close the app session if one was created
    try {
      const room = roomManager.rooms.get(roomId);

      // First check if the room has an appId directly
      if (room && room.appId) {
        logger.nitro(
          `Closing app session with ID ${room.appId} for room ${roomId}`
        );

        // Create the final allocations based on the game result
        // Using the actual balance differences from the game
        const { player1, player2 } = result.gameState.players;
        const balance1 = result.gameState.balances[player1];
        const balance2 = result.gameState.balances[player2];

        // Convert balances to allocations (you may need to adjust this logic)
        const finalAllocations = [balance1, balance2, 0];

        await closeAppSession(roomId, finalAllocations);
        logger.nitro(`App session closed for room ${roomId}`);
      }
      // Otherwise check the app sessions storage
      else if (hasAppSession(roomId)) {
        logger.nitro(`Closing app session from storage for room ${roomId}`);
        const { player1, player2 } = result.gameState.players;
        const balance1 = result.gameState.balances[player1];
        const balance2 = result.gameState.balances[player2];
        const finalAllocations = [balance1, balance2, 0];
        await closeAppSession(roomId, finalAllocations);
        logger.nitro(`App session closed for room ${roomId}`);
      }
    } catch (error) {
      logger.error(`Failed to close app session for room ${roomId}:`, error);
      // Continue with room cleanup even if app session closure fails
    }

    // Clean up the room after a short delay
    setTimeout(() => {
      roomManager.closeRoom(roomId);
    }, 5000);
  }

  // Return the result payload as requested
  return {
    roomId,
    balanceDifference,
    success: true,
    isGameOver: result.isGameOver,
    currentStep: result.gameState.currentStep,
    balances: result.gameState.balances,
  };
}
