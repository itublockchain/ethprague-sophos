import { ethers } from "ethers";
import jwt from "jsonwebtoken";
import { JWT_SECRET, AUTH_CHALLENGE_EXPIRE_TIME } from "../config/env.js";
import logger from "../utils/logger.js";

// Store active challenges
const activeChallenges = new Map();

// EIP-712 domain for Sagittarius
const EIP712_DOMAIN = {
  name: "Sagittarius Chess Betting",
  version: "1",
  chainId: 137, // Polygon
};

// EIP-712 types for authentication
const AUTH_TYPES = {
  Challenge: [
    { name: "message", type: "string" },
    { name: "timestamp", type: "uint256" },
    { name: "nonce", type: "uint256" },
  ],
};

/**
 * Generate authentication challenge
 * @param {string} address - User's wallet address
 * @returns {object} Challenge data
 */
export function generateAuthChallenge(address) {
  const nonce = Math.floor(Math.random() * 1000000);
  const message = `Welcome to Sagittarius Chess Betting!\n\nSign this message to authenticate.\n\nWallet: ${address}\nTimestamp: ${timestamp}\nNonce: ${nonce}`;

  const challenge = {
    message,
    timestamp,
    nonce,
    address: address.toLowerCase(),
    expiresAt: AUTH_CHALLENGE_EXPIRE_TIME,
  };

  // Store challenge
  activeChallenges.set(address.toLowerCase(), challenge);

  logger.auth(`Generated challenge for ${address}`);

  return {
    domain: EIP712_DOMAIN,
    types: AUTH_TYPES,
    value: {
      message,
      timestamp,
      nonce,
    },
  };
}

/**
 * Verify authentication signature
 * @param {string} address - User's wallet address
 * @param {string} signature - EIP-712 signature
 * @returns {object|null} JWT token if valid, null otherwise
 */
export async function verifyAuthSignature(address, signature) {
  try {
    const normalizedAddress = address.toLowerCase();
    const challenge = activeChallenges.get(normalizedAddress);

    if (!challenge) {
      logger.auth(`No active challenge for ${address}`);
      return null;
    }

    // Check if challenge expired
    if (Math.floor(Date.now() / 1000) > challenge.expiresAt) {
      logger.auth(`Challenge expired for ${address}`);
      activeChallenges.delete(normalizedAddress);
      return null;
    }

    // Verify EIP-712 signature
    const typedDataHash = ethers.TypedDataEncoder.hash(
      EIP712_DOMAIN,
      AUTH_TYPES,
      {
        message: challenge.message,
        timestamp: challenge.timestamp,
        nonce: challenge.nonce,
      }
    );

    const recoveredAddress = ethers.recoverAddress(typedDataHash, signature);

    if (recoveredAddress.toLowerCase() !== normalizedAddress) {
      logger.auth(
        `Signature verification failed for ${address}. Recovered: ${recoveredAddress}`
      );
      return null;
    }

    // Generate JWT token
    const token = jwt.sign(
      {
        address: normalizedAddress,
        timestamp: challenge.timestamp,
      },
      JWT_SECRET,
      {
        expiresIn: "24h",
      }
    );

    // Clean up challenge
    activeChallenges.delete(normalizedAddress);

    logger.auth(`Authentication successful for ${address}`);

    return {
      token,
      address: normalizedAddress,
    };
  } catch (error) {
    logger.error("Error verifying signature:", error);
    return null;
  }
}

/**
 * Verify JWT token
 * @param {string} token - JWT token
 * @returns {object|null} Decoded token if valid, null otherwise
 */
export function verifyJWT(token) {
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    return decoded;
  } catch (error) {
    logger.auth("Invalid JWT token");
    return null;
  }
}

/**
 * Extract token from authorization header
 * @param {string} authHeader - Authorization header
 * @returns {string|null} Token or null
 */
export function extractToken(authHeader) {
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return null;
  }
  return authHeader.substring(7);
}

/**
 * Clean up expired challenges periodically
 */
export function startChallengeCleanup() {
  setInterval(() => {
    const now = Math.floor(Date.now() / 1000);
    let cleaned = 0;

    for (const [address, challenge] of activeChallenges.entries()) {
      if (now > challenge.expiresAt) {
        activeChallenges.delete(address);
        cleaned++;
      }
    }

    if (cleaned > 0) {
      logger.auth(`Cleaned up ${cleaned} expired challenges`);
    }
  }, 60000); // Run every minute
}
