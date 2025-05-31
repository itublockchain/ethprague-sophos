import { WebSocketServer } from "ws";
import { WS_PORT } from "./env.js";

/**
 * Creates and configures the WebSocket server
 * @returns {WebSocketServer} Configured WebSocket server instance
 */
export function createWebSocketServer() {
  const wss = new WebSocketServer({
    port: WS_PORT,
    perMessageDeflate: {
      zlibDeflateOptions: {
        // See zlib defaults.
        chunkSize: 1024,
        memLevel: 7,
        level: 3,
      },
      zlibInflateOptions: {
        chunkSize: 10 * 1024,
      },
      // Other options settable:
      clientNoContextTakeover: true,
      serverNoContextTakeover: true,
      serverMaxWindowBits: 10,
      // Below options specified as default values.
      concurrencyLimit: 10,
      threshold: 1024,
    },
  });

  console.log(`WebSocket server created on port ${WS_PORT}`);

  return wss;
}

/**
 * Sends an error message to a WebSocket client
 * @param {WebSocket} ws - The WebSocket connection
 * @param {string} code - Error code
 * @param {string} msg - Error message
 */
export function sendError(ws, code, msg) {
  if (ws.readyState === 1) {
    // WebSocket.OPEN
    ws.send(
      JSON.stringify({
        type: "error",
        code,
        msg,
      })
    );
  }
}

/**
 * Broadcasts a message to all connected clients
 * @param {WebSocketServer} wss - The WebSocket server
 * @param {string} type - Message type
 * @param {object} data - Message data
 */
export function broadcast(wss, type, data) {
  const message = JSON.stringify({
    type,
    ...data,
  });

  wss.clients.forEach((client) => {
    if (client.readyState === 1) {
      // WebSocket.OPEN
      client.send(message);
    }
  });
}

/**
 * Sends a typed message to a specific client
 * @param {WebSocket} ws - The WebSocket connection
 * @param {string} type - Message type
 * @param {object} data - Message data
 */
export function sendMessage(ws, type, data) {
  if (ws.readyState === 1) {
    // WebSocket.OPEN
    ws.send(
      JSON.stringify({
        type,
        ...data,
      })
    );
  }
}

/**
 * Sets up ping/pong mechanism to detect disconnected clients
 * @param {WebSocketServer} wss - The WebSocket server
 */
export function startPingInterval(wss) {
  const interval = setInterval(() => {
    wss.clients.forEach((ws) => {
      if (ws.isAlive === false) {
        return ws.terminate();
      }

      ws.isAlive = false;
      ws.ping();
    });
  }, 30000); // 30 seconds

  wss.on("close", () => {
    clearInterval(interval);
  });
}

/**
 * Validates WebSocket message format
 * @param {any} data - Raw message data
 * @returns {object|null} Parsed message or null if invalid
 */
export function validateMessage(data) {
  try {
    const message = JSON.parse(data);

    if (!message.type) {
      return null;
    }

    return message;
  } catch (error) {
    return null;
  }
}
