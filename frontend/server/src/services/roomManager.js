import { v4 as uuidv4 } from "uuid";
import logger from "../utils/logger.js";

/**
 * Room status enum
 */
export const RoomStatus = {
  WAITING: "waiting",
  READY: "ready",
  CHANNEL_CREATING: "channel_creating",
  CHANNEL_READY: "channel_ready",
  PLAYING: "playing",
  ENDED: "ended",
};

/**
 * Game room class
 */
class GameRoom {
  constructor(id, hostAddress) {
    this.id = id;
    this.hostAddress = hostAddress;
    this.guestAddress = null;
    this.status = RoomStatus.WAITING;
    this.channelId = null;
    this.appSessionId = null;
    this.players = new Map(); // Map<address, { ws, symbol }>
    this.connections = new Map(); // Map<address, { ws, authenticated }>
    this.gameState = null;
    this.bets = new Map(); // Map<betId, bet>
    this.createdAt = Date.now();
    this.channelBalance = new Map(); // Map<address, balance>
  }

  addPlayer(address, ws) {
    if (this.players.size >= 2) {
      throw new Error("Room is full");
    }

    // First player is host (X), second is guest (O)
    const symbol = this.players.size === 0 ? "X" : "O";

    this.players.set(address, { ws, symbol });
    this.connections.set(address, { ws, authenticated: true });

    if (this.players.size === 1) {
      this.hostAddress = address;
    } else {
      this.guestAddress = address;
      this.status = RoomStatus.READY;
    }

    logger.game(`Player ${address} joined room ${this.id} as ${symbol}`);
    return symbol;
  }

  removePlayer(address) {
    this.players.delete(address);
    this.connections.delete(address);

    if (this.players.size === 0) {
      this.status = RoomStatus.ENDED;
    } else {
      this.status = RoomStatus.WAITING;
    }

    logger.game(`Player ${address} left room ${this.id}`);
  }

  getPlayerCount() {
    return this.players.size;
  }

  isPlayer(address) {
    return this.players.has(address);
  }

  getPlayerSymbol(address) {
    const player = this.players.get(address);
    return player ? player.symbol : null;
  }

  getOpponentAddress(playerAddress) {
    for (const [address, _] of this.players) {
      if (address !== playerAddress) {
        return address;
      }
    }
    return null;
  }

  broadcast(message) {
    for (const [_, connection] of this.connections) {
      if (connection.ws.readyState === 1) {
        // WebSocket.OPEN
        connection.ws.send(JSON.stringify(message));
      }
    }
  }

  toJSON() {
    return {
      id: this.id,
      hostAddress: this.hostAddress,
      guestAddress: this.guestAddress,
      status: this.status,
      playerCount: this.players.size,
      channelId: this.channelId,
      appSessionId: this.appSessionId,
      createdAt: this.createdAt,
    };
  }
}

/**
 * Room manager class
 */
export class RoomManager {
  constructor() {
    this.rooms = new Map(); // Map<roomId, GameRoom>
    this.playerRooms = new Map(); // Map<playerAddress, roomId>
  }

  /**
   * Create a new room
   */
  createRoom(hostAddress, ws) {
    const roomId = uuidv4();
    const room = new GameRoom(roomId, hostAddress);

    room.addPlayer(hostAddress, ws);

    this.rooms.set(roomId, room);
    this.playerRooms.set(hostAddress, roomId);

    logger.game(`Created room ${roomId} with host ${hostAddress}`);
    return room;
  }

  /**
   * Join an existing room
   */
  joinRoom(roomId, playerAddress, ws) {
    const room = this.rooms.get(roomId);

    if (!room) {
      // Create new room if it doesn't exist
      const newRoom = new GameRoom(roomId, playerAddress);
      newRoom.addPlayer(playerAddress, ws);

      this.rooms.set(roomId, newRoom);
      this.playerRooms.set(playerAddress, roomId);

      logger.game(`Created room ${roomId} for player ${playerAddress}`);
      return { room: newRoom, isNew: true };
    }

    // Check if player is already in the room
    if (room.isPlayer(playerAddress)) {
      // Update connection
      room.connections.set(playerAddress, { ws, authenticated: true });
      logger.game(`Player ${playerAddress} reconnected to room ${roomId}`);
      return { room, isNew: false };
    }

    // Add player to existing room
    room.addPlayer(playerAddress, ws);
    this.playerRooms.set(playerAddress, roomId);

    return { room, isNew: false };
  }

  /**
   * Leave a room
   */
  leaveRoom(playerAddress) {
    const roomId = this.playerRooms.get(playerAddress);

    if (!roomId) {
      return { success: false, message: "Player not in any room" };
    }

    const room = this.rooms.get(roomId);
    if (!room) {
      return { success: false, message: "Room not found" };
    }

    room.removePlayer(playerAddress);
    this.playerRooms.delete(playerAddress);

    // Delete room if empty or ended
    if (room.getPlayerCount() === 0 || room.status === RoomStatus.ENDED) {
      this.rooms.delete(roomId);
      logger.game(`Deleted room ${roomId}`);
    }

    return { success: true, roomId };
  }

  /**
   * Get a room by ID
   */
  getRoom(roomId) {
    return this.rooms.get(roomId);
  }

  /**
   * Get room by player address
   */
  getRoomByPlayer(playerAddress) {
    const roomId = this.playerRooms.get(playerAddress);
    return roomId ? this.rooms.get(roomId) : null;
  }

  /**
   * Get available rooms (waiting for players)
   */
  getAvailableRooms() {
    const availableRooms = [];

    for (const [roomId, room] of this.rooms) {
      if (room.status === RoomStatus.WAITING && room.getPlayerCount() === 1) {
        availableRooms.push({
          roomId,
          hostAddress: room.hostAddress,
          createdAt: room.createdAt,
        });
      }
    }

    return availableRooms;
  }

  /**
   * Update room channel info
   */
  updateRoomChannel(roomId, channelId, appSessionId) {
    const room = this.rooms.get(roomId);
    if (!room) {
      throw new Error("Room not found");
    }

    room.channelId = channelId;
    room.appSessionId = appSessionId;
    room.status = RoomStatus.CHANNEL_READY;

    logger.game(`Updated room ${roomId} with channel ${channelId}`);
  }

  /**
   * Start game in room
   */
  startGame(roomId) {
    const room = this.rooms.get(roomId);
    if (!room) {
      throw new Error("Room not found");
    }

    if (
      room.status !== RoomStatus.READY &&
      room.status !== RoomStatus.CHANNEL_READY
    ) {
      throw new Error("Room not ready to start");
    }

    room.status = RoomStatus.PLAYING;
    logger.game(`Game started in room ${roomId}`);

    return room;
  }

  /**
   * End game in room
   */
  endGame(roomId, winner) {
    const room = this.rooms.get(roomId);
    if (!room) {
      throw new Error("Room not found");
    }

    room.status = RoomStatus.ENDED;
    logger.game(`Game ended in room ${roomId}. Winner: ${winner || "Draw"}`);

    return room;
  }

  /**
   * Broadcast to all players in a room
   */
  broadcastToRoom(roomId, type, data) {
    const room = this.rooms.get(roomId);
    if (!room) {
      logger.warn(`Cannot broadcast to room ${roomId}: Room not found`);
      return;
    }

    const message = {
      type,
      ...data,
      roomId,
    };

    room.broadcast(message);
  }

  /**
   * Get room statistics
   */
  getStats() {
    return {
      totalRooms: this.rooms.size,
      waitingRooms: Array.from(this.rooms.values()).filter(
        (r) => r.status === RoomStatus.WAITING
      ).length,
      playingRooms: Array.from(this.rooms.values()).filter(
        (r) => r.status === RoomStatus.PLAYING
      ).length,
      totalPlayers: this.playerRooms.size,
    };
  }
}

// Create singleton instance
let roomManagerInstance = null;

export function createRoomManager() {
  if (!roomManagerInstance) {
    roomManagerInstance = new RoomManager();
  }
  return roomManagerInstance;
}

export function getRoomManager() {
  return roomManagerInstance;
}
