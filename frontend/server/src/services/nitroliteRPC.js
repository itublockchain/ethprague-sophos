import { ethers } from "ethers";
import {
  NitroliteRPC,
  createAuthRequestMessage,
  createAuthVerifyMessage,
} from "@erc7824/nitrolite";
import WebSocket from "ws";
import {
  NITROLITE_NODE_URL,
  SERVER_PRIVATE_KEY,
  CUSTODY_ADDRESS,
  ADJUDICATOR_ADDRESS,
  USDC_TOKEN_ADDRESS,
  CHAIN_ID,
} from "../config/env.js";
import logger from "../utils/logger.js";

// RPC client instance
let rpcClient = null;
let rpcWebSocket = null;
let isAuthenticated = false;

/**
 * Create server wallet from private key
 */
function createServerWallet() {
  try {
    const wallet = new ethers.Wallet(SERVER_PRIVATE_KEY);
    logger.nitro(`Server wallet address: ${wallet.address}`);
    return wallet;
  } catch (error) {
    logger.error("Failed to create server wallet:", error);
    throw error;
  }
}

/**
 * Initialize RPC connection to Nitrolite node
 */
export async function initializeRPCClient() {
  return new Promise((resolve, reject) => {
    try {
      const serverWallet = createServerWallet();

      logger.nitro(`Connecting to Nitrolite node at ${NITROLITE_NODE_URL}`);

      rpcWebSocket = new WebSocket(NITROLITE_NODE_URL);

      rpcWebSocket.on("open", async () => {
        logger.nitro("Connected to Nitrolite node");

        try {
          // Authenticate with the Nitrolite node
          await authenticateWithNode(serverWallet);

          rpcClient = {
            ws: rpcWebSocket,
            wallet: serverWallet,
            address: serverWallet.address,
            signMessage: serverWallet.signMessage.bind(serverWallet),
            sendRequest: sendRPCRequest,
            isConnected: () => rpcWebSocket.readyState === WebSocket.OPEN,
          };

          logger.nitro("RPC client initialized successfully");
          resolve(rpcClient);
        } catch (authError) {
          logger.error(
            "Failed to authenticate with Nitrolite node:",
            authError
          );
          reject(authError);
        }
      });

      rpcWebSocket.on("error", (error) => {
        logger.error("Nitrolite WebSocket error:", error);
        reject(error);
      });

      rpcWebSocket.on("close", () => {
        logger.warn("Nitrolite WebSocket connection closed");
        isAuthenticated = false;
        rpcClient = null;

        // Attempt to reconnect after 5 seconds
        setTimeout(() => {
          logger.nitro("Attempting to reconnect to Nitrolite node...");
          initializeRPCClient().catch((err) => {
            logger.error("Reconnection failed:", err);
          });
        }, 5000);
      });

      rpcWebSocket.on("message", (data) => {
        try {
          const message = JSON.parse(data.toString());
          logger.data("Nitrolite RPC message:", message);
        } catch (error) {
          logger.error("Failed to parse Nitrolite message:", error);
        }
      });
    } catch (error) {
      logger.error("Failed to initialize RPC client:", error);
      reject(error);
    }
  });
}

/**
 * Authenticate with the Nitrolite node
 */
async function authenticateWithNode(wallet) {
  return new Promise(async (resolve, reject) => {
    try {
      // Create auth request
      const authRequest = await createAuthRequestMessage({
        wallet: wallet.address,
        participant: wallet.address,
        app_name: "Sagittarius Server",
        expire: String(Math.floor(Date.now() / 1000) + 86400),
        scope: "server.sagittarius",
        application: wallet.address,
        allowances: [],
      });

      logger.nitro("Sending auth request to Nitrolite node");
      rpcWebSocket.send(authRequest);

      // Handle auth response
      const authHandler = async (data) => {
        try {
          const response = JSON.parse(data.toString());

          if (response.res && response.res[1] === "auth_challenge") {
            logger.nitro("Received auth challenge, signing...");

            // Create signing function
            const sign = async (message) => {
              const signature = await wallet.signMessage(
                typeof message === "string" ? message : JSON.stringify(message)
              );
              return signature;
            };

            // Create auth verify message
            const authVerify = await createAuthVerifyMessage(
              sign,
              data.toString()
            );
            rpcWebSocket.send(authVerify);
          } else if (
            response.res &&
            (response.res[1] === "auth_verify" ||
              response.res[1] === "auth_success")
          ) {
            logger.nitro("Authentication successful with Nitrolite node");
            isAuthenticated = true;
            rpcWebSocket.removeListener("message", authHandler);
            resolve(true);
          } else if (response.err) {
            logger.error("Authentication error:", response.err);
            rpcWebSocket.removeListener("message", authHandler);
            reject(new Error(response.err[2] || "Authentication failed"));
          }
        } catch (error) {
          logger.error("Error handling auth response:", error);
        }
      };

      rpcWebSocket.on("message", authHandler);

      // Timeout after 10 seconds
      setTimeout(() => {
        rpcWebSocket.removeListener("message", authHandler);
        reject(new Error("Authentication timeout"));
      }, 10000);
    } catch (error) {
      logger.error("Authentication error:", error);
      reject(error);
    }
  });
}

/**
 * Send RPC request to Nitrolite node
 */
async function sendRPCRequest(method, params) {
  if (!rpcClient || !isAuthenticated) {
    throw new Error("RPC client not initialized or not authenticated");
  }

  return new Promise((resolve, reject) => {
    const requestId = Date.now();

    // Create RPC request
    const request = NitroliteRPC.createRequest(requestId, method, params);

    // Sign the request
    NitroliteRPC.signRequestMessage(request, rpcClient.signMessage)
      .then((signedRequest) => {
        logger.nitro(`Sending RPC request: ${method}`);

        // Handle response
        const responseHandler = (data) => {
          try {
            const message = JSON.parse(data.toString());

            // Check if this is the response to our request
            if (
              message.id === requestId ||
              (message.res && message.res[0] === requestId)
            ) {
              rpcWebSocket.removeListener("message", responseHandler);

              if (message.err) {
                reject(new Error(message.err[2] || "RPC request failed"));
              } else {
                resolve(message.res || message);
              }
            }
          } catch (error) {
            logger.error("Error handling RPC response:", error);
          }
        };

        rpcWebSocket.on("message", responseHandler);

        // Send the request
        rpcWebSocket.send(JSON.stringify(signedRequest));

        // Timeout after 30 seconds
        setTimeout(() => {
          rpcWebSocket.removeListener("message", responseHandler);
          reject(new Error("RPC request timeout"));
        }, 30000);
      })
      .catch((error) => {
        logger.error("Failed to sign RPC request:", error);
        reject(error);
      });
  });
}

/**
 * Get the RPC client instance
 */
export function getRPCClient() {
  return rpcClient;
}

/**
 * Get channel information
 */
export async function getChannelInfo(channelId) {
  if (!rpcClient) {
    throw new Error("RPC client not initialized");
  }

  try {
    const response = await sendRPCRequest("get_channel", [
      { channel_id: channelId },
    ]);
    return response[2];
  } catch (error) {
    logger.error(`Failed to get channel info for ${channelId}:`, error);
    throw error;
  }
}

/**
 * Get all channels for the server
 */
export async function getServerChannels() {
  if (!rpcClient) {
    throw new Error("RPC client not initialized");
  }

  try {
    const response = await sendRPCRequest("get_channels", [
      { participant: rpcClient.address },
    ]);
    return response[2];
  } catch (error) {
    logger.error("Failed to get server channels:", error);
    throw error;
  }
}

/**
 * Get contract addresses configuration
 */
export function getContractAddresses() {
  return {
    custody: CUSTODY_ADDRESS,
    adjudicator: ADJUDICATOR_ADDRESS,
    tokenAddress: USDC_TOKEN_ADDRESS,
    chainId: CHAIN_ID,
  };
}
