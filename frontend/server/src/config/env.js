import dotenv from "dotenv";

// Load environment variables
dotenv.config();

// Server Configuration
export const PORT = process.env.PORT || 8080;
export const NODE_ENV = process.env.NODE_ENV || "development";

// WebSocket Configuration
export const WS_PORT = process.env.WS_PORT || 8080;
export const WS_PATH = process.env.WS_PATH || "/ws";

// Nitrolite Configuration
export const NITROLITE_NODE_URL =
  process.env.NITROLITE_NODE_URL || "ws://localhost:9545";
export const NITROLITE_RPC_URL =
  process.env.NITROLITE_RPC_URL || "http://localhost:8545";

// Blockchain Configuration
export const CHAIN_ID = parseInt(process.env.CHAIN_ID || "137");
export const CHAIN_NAME = process.env.CHAIN_NAME || "polygon";

// Contract Addresses
export const USDC_TOKEN_ADDRESS =
  process.env.USDC_TOKEN_ADDRESS ||
  "0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174";
export const CUSTODY_ADDRESS =
  process.env.CUSTODY_ADDRESS || "0x0000000000000000000000000000000000000000";
export const ADJUDICATOR_ADDRESS =
  process.env.ADJUDICATOR_ADDRESS ||
  "0x0000000000000000000000000000000000000000";
export const DEFAULT_GUEST_ADDRESS =
  process.env.DEFAULT_GUEST_ADDRESS ||
  "0x0000000000000000000000000000000000000000";

// Challenge Period (in seconds)
export const CHALLENGE_PERIOD = parseInt(process.env.CHALLENGE_PERIOD || "300");

// Server Wallet Configuration
export const SERVER_PRIVATE_KEY =
  process.env.SERVER_PRIVATE_KEY ||
  "0x0000000000000000000000000000000000000000000000000000000000000001";

// Authentication
export const JWT_SECRET =
  process.env.JWT_SECRET || "default-jwt-secret-change-in-production";
export const AUTH_CHALLENGE_EXPIRE_TIME = 86400;

// Chess Game Configuration
export const MIN_BET_AMOUNT = parseFloat(process.env.MIN_BET_AMOUNT || "1");
export const MAX_BET_AMOUNT = parseFloat(process.env.MAX_BET_AMOUNT || "1000");
export const BET_TIMEOUT_SECONDS = parseInt(
  process.env.BET_TIMEOUT_SECONDS || "30"
);

// App Configuration
export const APP_CONFIG = {
  WEBSOCKET: {
    URL: NITROLITE_NODE_URL,
  },
  CUSTODIES: {
    [CHAIN_ID]: CUSTODY_ADDRESS,
  },
  ADJUDICATORS: {
    [CHAIN_ID]: ADJUDICATOR_ADDRESS,
  },
  TOKENS: {
    [CHAIN_ID]: USDC_TOKEN_ADDRESS,
  },
  CHANNEL: {
    DEFAULT_GUEST: DEFAULT_GUEST_ADDRESS,
    CHALLENGE_PERIOD: CHALLENGE_PERIOD,
  },
  AUTH: {
    JWT_SECRET,
    CHALLENGE_EXPIRE_TIME: AUTH_CHALLENGE_EXPIRE_TIME,
  },
  BETTING: {
    MIN_AMOUNT: MIN_BET_AMOUNT,
    MAX_AMOUNT: MAX_BET_AMOUNT,
    TIMEOUT_SECONDS: BET_TIMEOUT_SECONDS,
  },
};

// Validation
if (NODE_ENV === "production") {
  if (
    SERVER_PRIVATE_KEY ===
    "0x0000000000000000000000000000000000000000000000000000000000000001"
  ) {
    throw new Error("SERVER_PRIVATE_KEY must be set in production!");
  }
  if (JWT_SECRET === "default-jwt-secret-change-in-production") {
    throw new Error("JWT_SECRET must be set in production!");
  }
  if (CUSTODY_ADDRESS === "0x0000000000000000000000000000000000000000") {
    console.warn("WARNING: CUSTODY_ADDRESS is not set!");
  }
  if (ADJUDICATOR_ADDRESS === "0x0000000000000000000000000000000000000000") {
    console.warn("WARNING: ADJUDICATOR_ADDRESS is not set!");
  }
}
