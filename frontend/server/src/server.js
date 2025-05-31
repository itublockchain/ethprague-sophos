import {
  createWebSocketServer,
  sendError,
  startPingInterval,
  validateMessage,
} from "./config/websocket.js";
import {
  generateAuthChallenge,
  verifyAuthSignature,
  verifyJWT,
  startChallengeCleanup,
} from "./services/auth.js";
import { initializeRPCClient, getRPCClient } from "./services/nitroliteRPC.js";
import { createRoomManager } from "./services/roomManager.js";
import { createBettingManager } from "./services/bettingManager.js";
import { createChannelManager } from "./services/channelManager.js";
import { createStateManager } from "./services/stateManager.js";
import logger from "./utils/logger.js";
import { PORT } from "./config/env.js";

// Create WebSocket server
const wss = createWebSocketServer();

// Create service instances
const roomManager = createRoomManager();
const bettingManager = createBettingManager();
const channelManager = createChannelManager();
const stateManager = createStateManager();

// Track active connections with auth status
const connections = new Map(); // Map<ws, { address, token, authenticated }>

// Track online users count
let onlineUsersCount = 0;

/**
 * Broadcast online users count to all clients
 */
const broadcastOnlineUsersCount = () => {
  const message = JSON.stringify({
    type: "onlineUsers",
    count: onlineUsersCount,
  });

  wss.clients.forEach((client) => {
    if (client.readyState === 1) {
      // WebSocket.OPEN
      client.send(message);
    }
  });

  logger.ws(`Broadcasting online users count: ${onlineUsersCount}`);
};

/**
 * Handle client connection
 */
wss.on("connection", (ws) => {
  logger.ws("Client connected");

  // Initialize connection data
  connections.set(ws, {
    address: null,
    token: null,
    authenticated: false,
  });

  // Increment online users count
  onlineUsersCount++;
  broadcastOnlineUsersCount();

  // Set up alive flag for ping/pong
  ws.isAlive = true;
  ws.on("pong", () => {
    ws.isAlive = true;
  });

  // Handle client messages
  ws.on("message", async (data) => {
    const message = validateMessage(data);

    if (!message) {
      return sendError(ws, "INVALID_MESSAGE", "Invalid message format");
    }

    logger.debug(`Received message type: ${message.type}`);

    // Process message based on type
    try {
      switch (message.type) {
        case "ping":
          // Simple ping/pong for connection testing
          ws.send(JSON.stringify({ type: "pong", timestamp: Date.now() }));
          break;

        case "auth":
          // Handle authentication request
          if (!message.payload?.address) {
            return sendError(
              ws,
              "INVALID_AUTH",
              "Address required for authentication"
            );
          }

          const challenge = generateAuthChallenge(message.payload.address);

          ws.send(
            JSON.stringify({
              type: "auth:challenge",
              challenge,
            })
          );

          logger.auth(`Sent challenge to ${message.payload.address}`);
          break;

        case "auth:verify":
          // Verify signature
          if (!message.payload?.address || !message.payload?.signature) {
            return sendError(
              ws,
              "INVALID_AUTH",
              "Address and signature required"
            );
          }

          const authResult = await verifyAuthSignature(
            message.payload.address,
            message.payload.signature
          );

          if (authResult) {
            // Update connection data
            const connData = connections.get(ws);
            connData.address = authResult.address;
            connData.token = authResult.token;
            connData.authenticated = true;

            ws.send(
              JSON.stringify({
                type: "auth:success",
                token: authResult.token,
                address: authResult.address,
              })
            );

            logger.auth(`User authenticated: ${authResult.address}`);
          } else {
            sendError(ws, "AUTH_FAILED", "Invalid signature");
          }
          break;

        case "auth:token":
          // Verify JWT token for reconnection
          if (!message.payload?.token) {
            return sendError(ws, "INVALID_AUTH", "Token required");
          }

          const decoded = verifyJWT(message.payload.token);
          if (decoded) {
            // Update connection data
            const connData = connections.get(ws);
            connData.address = decoded.address;
            connData.token = message.payload.token;
            connData.authenticated = true;

            ws.send(
              JSON.stringify({
                type: "auth:success",
                address: decoded.address,
              })
            );

            logger.auth(`User authenticated via token: ${decoded.address}`);
          } else {
            sendError(ws, "AUTH_FAILED", "Invalid or expired token");
          }
          break;

        case "joinRoom":
          // Check authentication
          const userData = connections.get(ws);
          if (!userData?.authenticated) {
            return sendError(ws, "UNAUTHORIZED", "Authentication required");
          }

          const { roomId } = message.payload || {};

          try {
            const { room, isNew } = roomManager.joinRoom(
              roomId || undefined,
              userData.address,
              ws
            );

            // Send room state
            ws.send(
              JSON.stringify({
                type: "room:joined",
                roomId: room.id,
                address: userData.address,
                symbol: room.getPlayerSymbol(userData.address),
                playerCount: room.getPlayerCount(),
                status: room.status,
              })
            );

            // If room is ready (2 players), broadcast to all players
            if (room.getPlayerCount() === 2) {
              roomManager.broadcastToRoom(room.id, "room:ready", {
                players: Array.from(room.players.keys()),
                status: room.status,
              });

              // Create app session for channel setup
              try {
                const sessionInfo = await channelManager.createAppSession(
                  room.id
                );

                // Request signatures from both players
                roomManager.broadcastToRoom(room.id, "session:request", {
                  sessionId: sessionInfo.sessionId,
                  message: sessionInfo.message,
                });

                logger.channel(
                  `Session created for room ${room.id}, requesting signatures`
                );
              } catch (sessionError) {
                logger.error("Failed to create session:", sessionError);
              }
            }

            logger.game(`Player ${userData.address} joined room ${room.id}`);
          } catch (error) {
            sendError(ws, "JOIN_FAILED", error.message);
          }
          break;

        case "placeBet":
          // Check authentication
          const betUser = connections.get(ws);
          if (!betUser?.authenticated) {
            return sendError(ws, "UNAUTHORIZED", "Authentication required");
          }

          const {
            roomId: betRoomId,
            predictedMove,
            amount,
            betId,
          } = message.payload || {};

          if (!betRoomId || !predictedMove || !amount) {
            return sendError(
              ws,
              "INVALID_BET",
              "Room ID, predicted move, and amount required"
            );
          }

          try {
            // Get room to verify player is in it
            const room = roomManager.getRoom(betRoomId);
            if (!room || !room.isPlayer(betUser.address)) {
              return sendError(ws, "NOT_IN_ROOM", "You are not in this room");
            }

            // Place the bet
            const bet = bettingManager.placeBet(
              betRoomId,
              betUser.address,
              predictedMove,
              amount,
              room.channelId
            );

            // Send confirmation
            ws.send(
              JSON.stringify({
                type: "bet:placed",
                betId: bet.id,
                predictedMove: bet.predictedMove,
                amount: bet.amount,
                status: bet.status,
              })
            );

            logger.bet(
              `Bet placed by ${betUser.address}: ${predictedMove} for ${amount}`
            );
          } catch (error) {
            sendError(ws, "BET_FAILED", error.message);
          }
          break;

        case "getAvailableRooms":
          // Check authentication
          const listUser = connections.get(ws);
          if (!listUser?.authenticated) {
            return sendError(ws, "UNAUTHORIZED", "Authentication required");
          }

          const availableRooms = roomManager.getAvailableRooms();

          ws.send(
            JSON.stringify({
              type: "room:available",
              rooms: availableRooms,
            })
          );
          break;

        case "signSession":
          // Handle session signature
          const signUser = connections.get(ws);
          if (!signUser?.authenticated) {
            return sendError(ws, "UNAUTHORIZED", "Authentication required");
          }

          const { roomId: sessionRoomId, signature } = message.payload || {};

          if (!sessionRoomId || !signature) {
            return sendError(
              ws,
              "INVALID_REQUEST",
              "Room ID and signature required"
            );
          }

          try {
            const result = await channelManager.addSessionSignature(
              sessionRoomId,
              signUser.address,
              signature
            );

            if (result.ready) {
              // Channel created successfully
              roomManager.broadcastToRoom(sessionRoomId, "channel:created", {
                channelId: result.channelId,
                sessionId: result.sessionId,
              });

              logger.channel(`Channel created for room ${sessionRoomId}`);
            } else {
              // Waiting for other player's signature
              ws.send(
                JSON.stringify({
                  type: "session:signed",
                  pendingSignatures: result.pendingSignatures,
                })
              );
            }
          } catch (error) {
            sendError(ws, "SIGNATURE_FAILED", error.message);
          }
          break;

        case "simulateMove":
          // Simulate a chess move (for testing - in production this would come from chess game)
          const moveUser = connections.get(ws);
          if (!moveUser?.authenticated) {
            return sendError(ws, "UNAUTHORIZED", "Authentication required");
          }

          const { roomId: moveRoomId, move } = message.payload || {};

          if (!moveRoomId || !move) {
            return sendError(
              ws,
              "INVALID_REQUEST",
              "Room ID and move required"
            );
          }

          try {
            // Resolve bets for this move
            const resolvedBets = await bettingManager.resolveBetsForMove(
              moveRoomId,
              move
            );

            // Broadcast move and bet results to room
            roomManager.broadcastToRoom(moveRoomId, "move:made", {
              move,
              resolvedBets,
              timestamp: Date.now(),
            });

            logger.game(
              `Move ${move} made in room ${moveRoomId}, resolved ${resolvedBets.length} bets`
            );
          } catch (error) {
            sendError(ws, "MOVE_FAILED", error.message);
          }
          break;

        case "deposit":
          // Handle channel deposit
          const depositUser = connections.get(ws);
          if (!depositUser?.authenticated) {
            return sendError(ws, "UNAUTHORIZED", "Authentication required");
          }

          const { roomId: depositRoomId, amount: depositAmount } =
            message.payload || {};

          if (!depositRoomId || !depositAmount || depositAmount <= 0) {
            return sendError(
              ws,
              "INVALID_REQUEST",
              "Valid room ID and positive amount required"
            );
          }

          try {
            // Create deposit state update
            const depositState = await stateManager.createDepositState(
              depositRoomId,
              depositUser.address,
              depositAmount
            );

            // Request signature from user
            ws.send(
              JSON.stringify({
                type: "state:signRequest",
                stateUpdate:
                  stateManager.getStateUpdateForSigning(depositState),
                stateType: depositState.type,
              })
            );

            logger.channel(
              `Deposit initiated: ${depositUser.address} depositing ${depositAmount}`
            );
          } catch (error) {
            sendError(ws, "DEPOSIT_FAILED", error.message);
          }
          break;

        case "withdraw":
          // Handle channel withdrawal
          const withdrawUser = connections.get(ws);
          if (!withdrawUser?.authenticated) {
            return sendError(ws, "UNAUTHORIZED", "Authentication required");
          }

          const { roomId: withdrawRoomId, amount: withdrawAmount } =
            message.payload || {};

          if (!withdrawRoomId || !withdrawAmount || withdrawAmount <= 0) {
            return sendError(
              ws,
              "INVALID_REQUEST",
              "Valid room ID and positive amount required"
            );
          }

          try {
            // Create withdrawal state update
            const withdrawalState = await stateManager.createWithdrawalState(
              withdrawRoomId,
              withdrawUser.address,
              withdrawAmount
            );

            // Request signature from user
            ws.send(
              JSON.stringify({
                type: "state:signRequest",
                stateUpdate:
                  stateManager.getStateUpdateForSigning(withdrawalState),
                stateType: withdrawalState.type,
              })
            );

            logger.channel(
              `Withdrawal initiated: ${withdrawUser.address} withdrawing ${withdrawAmount}`
            );
          } catch (error) {
            sendError(ws, "WITHDRAWAL_FAILED", error.message);
          }
          break;

        case "signStateUpdate":
          // Handle state update signature
          const stateUser = connections.get(ws);
          if (!stateUser?.authenticated) {
            return sendError(ws, "UNAUTHORIZED", "Authentication required");
          }

          const {
            channelId,
            nonce,
            signature: stateSignature,
          } = message.payload || {};

          if (!channelId || !nonce || !stateSignature) {
            return sendError(
              ws,
              "INVALID_REQUEST",
              "Channel ID, nonce, and signature required"
            );
          }

          try {
            // Add signature to state
            const state = stateManager.addSignatureToState(
              channelId,
              nonce,
              stateUser.address,
              stateSignature
            );

            // Broadcast state update to room
            const channelInfo = channelManager.channels.get(channelId);
            if (channelInfo) {
              roomManager.broadcastToRoom(channelInfo.roomId, "state:updated", {
                channelId,
                nonce,
                balances: state.balances,
                signatures: state.signatures,
              });
            }

            logger.channel(
              `State signature added from ${stateUser.address} for nonce ${nonce}`
            );
          } catch (error) {
            sendError(ws, "STATE_SIGNATURE_FAILED", error.message);
          }
          break;

        case "getChannelStats":
          // Get channel statistics
          const statsUser = connections.get(ws);
          if (!statsUser?.authenticated) {
            return sendError(ws, "UNAUTHORIZED", "Authentication required");
          }

          const { roomId: statsRoomId } = message.payload || {};

          if (!statsRoomId) {
            return sendError(ws, "INVALID_REQUEST", "Room ID required");
          }

          try {
            const channelInfo = channelManager.getChannelByRoom(statsRoomId);
            if (!channelInfo) {
              return sendError(ws, "NO_CHANNEL", "No channel found for room");
            }

            const stats = stateManager.getChannelStats(channelInfo.channelId);
            const state = stateManager.getChannelState(channelInfo.channelId);

            ws.send(
              JSON.stringify({
                type: "channel:stats",
                stats,
                availableBalance: state
                  ? state.getAvailableBalance(statsUser.address)
                  : 0,
              })
            );
          } catch (error) {
            sendError(ws, "STATS_FAILED", error.message);
          }
          break;

        default:
          sendError(
            ws,
            "UNKNOWN_MESSAGE_TYPE",
            `Unknown message type: ${message.type}`
          );
      }
    } catch (error) {
      logger.error(`Error handling message type ${message.type}:`, error);
      sendError(ws, "INTERNAL_ERROR", "An internal error occurred");
    }
  });

  // Handle disconnection
  ws.on("close", () => {
    // Clean up connection data
    const connData = connections.get(ws);
    if (connData?.address) {
      logger.ws(`User disconnected: ${connData.address}`);

      // Leave room if in one
      const result = roomManager.leaveRoom(connData.address);
      if (result.success && result.roomId) {
        // Notify other players in the room
        const room = roomManager.getRoom(result.roomId);
        if (room) {
          roomManager.broadcastToRoom(result.roomId, "player:left", {
            address: connData.address,
            playerCount: room.getPlayerCount(),
          });
        }
      }
    }
    connections.delete(ws);

    // Decrement online users count
    onlineUsersCount = Math.max(0, onlineUsersCount - 1);
    broadcastOnlineUsersCount();

    logger.ws("Client disconnected");
  });

  // Handle errors
  ws.on("error", (error) => {
    logger.error("WebSocket error:", error);
  });
});

// Initialize services
async function initializeServer() {
  try {
    logger.system(`Starting Sagittarius server on port ${PORT}`);

    // Start authentication challenge cleanup
    startChallengeCleanup();
    logger.auth("Authentication challenge cleanup started");

    // Initialize Nitrolite RPC client
    try {
      await initializeRPCClient();
      logger.nitro("Nitrolite RPC client initialized successfully");
    } catch (error) {
      logger.error("Failed to initialize Nitrolite RPC client:", error);
      logger.warn("Server will continue without Nitrolite integration");
    }

    // Log room manager initialization
    logger.game("Room manager initialized");

    // Log betting manager initialization
    logger.bet("Betting manager initialized");

    // Start ping interval to detect disconnected clients
    startPingInterval(wss);

    logger.success(
      `Server initialized successfully! WebSocket listening on port ${PORT}`
    );

    // Broadcast online users count periodically
    setInterval(broadcastOnlineUsersCount, 30000);

    // Log server stats periodically
    setInterval(() => {
      const roomStats = roomManager.getStats();
      const betStats = bettingManager.getStats();
      const channelStats = channelManager.getStats();

      logger.system(
        `Server Stats - Rooms: ${roomStats.totalRooms}, Players: ${roomStats.totalPlayers}, Bets: ${betStats.totalBets}, Channels: ${channelStats.totalChannels}`
      );
    }, 60000); // Every minute
  } catch (error) {
    logger.error("Failed to initialize server:", error);
    process.exit(1);
  }
}

// Handle server shutdown gracefully
process.on("SIGTERM", () => {
  logger.system("SIGTERM received, shutting down gracefully...");
  wss.close(() => {
    logger.system("WebSocket server closed");
    process.exit(0);
  });
});

process.on("SIGINT", () => {
  logger.system("SIGINT received, shutting down gracefully...");
  wss.close(() => {
    logger.system("WebSocket server closed");
    process.exit(0);
  });
});

// Start the server
initializeServer().catch((error) => {
  logger.error("Fatal error during initialization:", error);
  process.exit(1);
});
