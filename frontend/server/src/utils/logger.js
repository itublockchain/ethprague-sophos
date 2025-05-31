/**
 * Simple logger utility with colored output
 */

const colors = {
  reset: "\x1b[0m",
  bright: "\x1b[1m",
  dim: "\x1b[2m",

  // Text colors
  black: "\x1b[30m",
  red: "\x1b[31m",
  green: "\x1b[32m",
  yellow: "\x1b[33m",
  blue: "\x1b[34m",
  magenta: "\x1b[35m",
  cyan: "\x1b[36m",
  white: "\x1b[37m",

  // Background colors
  bgRed: "\x1b[41m",
  bgGreen: "\x1b[42m",
  bgYellow: "\x1b[43m",
  bgBlue: "\x1b[44m",
  bgMagenta: "\x1b[45m",
  bgCyan: "\x1b[46m",
};

const timestamp = () => new Date().toISOString();

const logger = {
  info: (message, ...args) => {
    console.log(
      `${colors.blue}[INFO]${colors.reset} ${timestamp()} - ${message}`,
      ...args
    );
  },

  success: (message, ...args) => {
    console.log(
      `${colors.green}[SUCCESS]${colors.reset} ${timestamp()} - ${message}`,
      ...args
    );
  },

  warn: (message, ...args) => {
    console.warn(
      `${colors.yellow}[WARN]${colors.reset} ${timestamp()} - ${message}`,
      ...args
    );
  },

  error: (message, ...args) => {
    console.error(
      `${colors.red}[ERROR]${colors.reset} ${timestamp()} - ${message}`,
      ...args
    );
  },

  debug: (message, ...args) => {
    if (process.env.NODE_ENV === "development") {
      console.log(
        `${colors.magenta}[DEBUG]${colors.reset} ${timestamp()} - ${message}`,
        ...args
      );
    }
  },

  // Specialized loggers
  ws: (message, ...args) => {
    console.log(
      `${colors.cyan}[WS]${colors.reset} ${timestamp()} - ${message}`,
      ...args
    );
  },

  nitro: (message, ...args) => {
    console.log(
      `${colors.bright}${colors.magenta}[NITRO]${
        colors.reset
      } ${timestamp()} - ${message}`,
      ...args
    );
  },

  game: (message, ...args) => {
    console.log(
      `${colors.green}[GAME]${colors.reset} ${timestamp()} - ${message}`,
      ...args
    );
  },

  bet: (message, ...args) => {
    console.log(
      `${colors.yellow}[BET]${colors.reset} ${timestamp()} - ${message}`,
      ...args
    );
  },

  auth: (message, ...args) => {
    console.log(
      `${colors.blue}[AUTH]${colors.reset} ${timestamp()} - ${message}`,
      ...args
    );
  },

  system: (message, ...args) => {
    console.log(
      `${colors.bright}${colors.white}[SYSTEM]${
        colors.reset
      } ${timestamp()} - ${message}`,
      ...args
    );
  },

  channel: (message, ...args) => {
    console.log(
      `${colors.bright}${colors.blue}[CHANNEL]${
        colors.reset
      } ${timestamp()} - ${message}`,
      ...args
    );
  },

  // Log data in a formatted way
  data: (label, data) => {
    console.log(
      `${colors.dim}[DATA]${colors.reset} ${timestamp()} - ${label}:`,
      JSON.stringify(data, null, 2)
    );
  },
};

export default logger;
