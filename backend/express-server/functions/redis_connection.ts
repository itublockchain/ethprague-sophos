import { redis } from "bun";
import { BidState } from "../types";
import { queue } from "../bullmq/queue";

class RedisConnection {
  private static instance: RedisConnection; 

  private constructor() {}

  public static getInstance(): RedisConnection {
    if (!RedisConnection.instance) {
      RedisConnection.instance = new RedisConnection();
    }
    return RedisConnection.instance;
  }
 
  public async initializeNewGame(gameJSON: any, sha?: string) {
    let GAME = {...gameJSON,
      bids: [],
      proofs: {},
      sha: sha || "undefined"
    }

    await redis.set("game_data", JSON.stringify(GAME)); 
    await redis.set("game_id", gameJSON.id);
  }

  public async updateGameData(new_updated_game: any, sha: string) {
    const new_updated_game_json = JSON.parse(new_updated_game);

    const cached_data_string = await redis.get("game_data");
    if(!cached_data_string) return await this.initializeNewGame(new_updated_game_json, sha);
    
    const cached_data = JSON.parse(cached_data_string);
    
    const updated_game = {
      ...new_updated_game_json,
      bids: cached_data.bids,
      proofs: cached_data.proofs,
      sha
    }
    
    console.log("[redis_connection]: Updated game data: ", JSON.stringify(updated_game));
    await redis.set("game_data", JSON.stringify(updated_game)); 
  }

  public async changeGameID(gameID: any) {
    await redis.set("game_id", gameID);
  }

  public async newBid(bid_data: any) {
    const new_bid = {
      account_address: bid_data.account_address,
      move: bid_data.move,
      amount: bid_data.amount,
      turn: bid_data.turn,
      state: BidState.PENDING,
    }

    const game_data = await redis.get("game_data");
    if(!game_data) return;

    const game = JSON.parse(game_data);
    game.bids = [...game.bids, new_bid];

    await redis.set("game_data", JSON.stringify(game));
  }

  public async newProof(proof: any) {
    const game_data = await redis.get("game_data");
    if(!game_data) throw new Error("Game data not found");

    const game = JSON.parse(game_data);

    const proofs_length = Object.keys(game.proofs).length;
    game.proofs[proofs_length] = proof;

    await redis.set("game_data", JSON.stringify(game));
  }

  public async getMoves() {
    const game_data = await redis.get("game_data");
    if(!game_data) return "";

    const game = JSON.parse(game_data);
    return game.moves;
  }

  public async getBids() {
    const game_data = await redis.get("game_data");
    if(!game_data) return "undefined";

    const game = JSON.parse(game_data);
    return game.bids;
  }

  public async getByKey(key: string) {
    const value = await redis.get(key);
    if(!value) return "";
    return value;
  }


  public async getGameID() {
    return await redis.get("game_id");
  }

  public async getGameSHA() {
    const game_data = await redis.get("game_data");
    if(!game_data) return "undefined";
    const game = JSON.parse(game_data);

    return game.sha;
  }

  public async updateBids(bids: any) {
    const game_data = await redis.get("game_data");
    if(!game_data) throw new Error("Game data not found");
    const game = JSON.parse(game_data);

    game.bids = bids;
    await redis.set("game_data", JSON.stringify(game));
    console.log("[redis_connection]: Bids are updated.");
  }

  public async getAllocations() {
    const allocations = await redis.get("game_allocations");
    if(!allocations) return {};
    return JSON.parse(allocations);
  }

  public async updateAllocations(allocations: any) {
    await redis.set("game_allocations", JSON.stringify(allocations));
  }
}

export const redisConnection = RedisConnection.getInstance();
