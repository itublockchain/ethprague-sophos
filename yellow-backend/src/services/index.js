/**
 * Services index - exports all service modules
 */

// Nitrolite RPC (WebSocket) client
export {
  initializeRPCClient,
  getRPCClient,
  NitroliteRPCClient,
  WSStatus,
} from "./nitroliteRPC.js";

// App sessions for game rooms
export {
  createAppSession,
  closeAppSession,
  getAppSession,
  hasAppSession,
  getAllAppSessions,
  generateAppSessionMessage,
  getPendingAppSessionMessage,
  addAppSessionSignature,
  createAppSessionWithSignatures,
} from "./appSessions.js";

// Room management
export { createRoomManager } from "./roomManager.js";

// Chess Betting game logic
export {
  createGame,
  placeBet,
  getGameStatus,
  formatGameState,
  formatGameOverMessage,
} from "./chessBetting.js";
