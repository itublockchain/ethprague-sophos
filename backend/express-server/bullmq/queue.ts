import { Job, Queue, Worker } from "bullmq";

const connection = {
  host: "0.0.0.0",
  port: 6379,
};

import { BidState } from "../types";

import { redisConnection } from "../functions/redis_connection";
import proveLichessData from "../functions/prove_data";
import { sha256 } from "../utils";

export const queue = new Queue("Chess");

const worker = new Worker(
  "Chess",
  async (job: Job) => {
    switch (job.name) {
      case "wait-for-fetch-and-prove":
        const _gameID = await redisConnection.getGameID();
        if (!_gameID) {
          console.log("[wait-for-fetch-and-prove]: No game ID found");
          return;
        }
        queue.add("check-game-data", { gameID: _gameID });
        queue.add("finalize-new-bids", { gameID: _gameID });
        break;
      case "check-game-data":
        const gameID = job.data.gameID;
        const LICHESS_URL = `https://lichess.org/game/export/${gameID}`;

        const [lichess_raw_data, gameSHA] = await Promise.all([
          (async () => {
            const res = await fetch(LICHESS_URL, {
              method: "GET",
              headers: {
                Accept: "application/json",
              },
            });
            return await res.text();
          })(),
          redisConnection.getGameSHA(),
        ]);

        const newGameSHA = sha256(lichess_raw_data);

        console.log("[check-game-data]: Game SHA: ", gameSHA);
        console.log("[check-game-data]: New Game SHA: ", newGameSHA);
        if (newGameSHA === gameSHA) {
          return console.log("[check-game-data]: Game data is up to date.");
        }

        await redisConnection.updateGameData(lichess_raw_data, newGameSHA);

        // Game is not up to date, fetch and prove.
        queue.add("fetch-and-prove", {
          URL: LICHESS_URL,
          new_game_data: lichess_raw_data,
          newGameSHA: newGameSHA,
        });
        console.log("[check-game-data]: Fetch and prove job added.");
        break;
      case "validate-bid":
        console.log("[validate-bid]: Validating bids...");
        const __bids = await redisConnection.getBids();
        console.log("[validate-bid]: Bids: ", __bids);
        const __moves = await redisConnection.getMoves();

        const current_turn = __moves.split(" ").length;

        const __new_bids = __bids.map((bid: any) => {
          if (bid.state !== BidState.PENDING) return bid;

          // Turn pending bids into valid or invalid state
          if (bid.turn > current_turn) bid.state = BidState.VALID;
          else bid.state = BidState.INVALID;

          console.log("[validate-bid]: Bid: ", bid);

          return bid;
        });

        await redisConnection.updateBids(__new_bids);
        console.log("[validate-bid]: Bids validated: ", __new_bids);
        break;
      case "fetch-and-prove":
        const proof = await proveLichessData(job.data.URL);
        console.log("[fetch-and-prove]: New Proof fetched");
        console.log("[fetch-and-prove]: Proof: ", JSON.stringify(proof));

        await redisConnection.newProof(proof);
        console.log("[fetchAndProve]: Proof added to redis");
        break;
      case "finalize-new-bids":
        const moves = await redisConnection.getMoves();
        const bids = await redisConnection.getBids();
        const last_round = moves.split(" ").length; // lets suppose its 5

        const new_bids = bids.map((bid: any) => {
          if (bid.state !== BidState.VALID) return bid;
          if (bid.turn > last_round) return bid;

          console.log("[finalize-new-bids]: ================================");
          console.log(
            "[finalize-new-bids]: Bid: ",
            bid.move,
            "Turn: ",
            bid.turn
          );
          console.log(
            "[finalize-new-bids]: Move: ",
            moves[bid.turn],
            "Turn: ",
            bid.turn
          );
          console.log("[finalize-new-bids]: ================================");

          if (bid.move === moves[bid.turn]) {
            // lets suppose its axbc === axbc for turn 3 and our last round is 5
            bid.state = BidState.WON;
          } else {
            // lets suppose its axbc === fxdk for turn 3 and our last round is 5
            bid.state = BidState.LOST;
          }

          return bid;
        });

        await redisConnection.updateBids(new_bids);
        queue.add("calculate-allocations", { gameID });

        console.log("[finalize-new-bids]: New bids: ", new_bids);
        break;
      case "calculate-allocations":
        const _bids = await redisConnection.getBids();
        const allocations = await redisConnection.getAllocations();

        const total_bids = {
          winners: _bids
            .filter((bid: any) => bid.state === BidState.WON)
            .reduce((acc: any, bid: any) => acc + bid.amount, 0),
          losers: _bids
            .filter((bid: any) => bid.state === BidState.LOST)
            .reduce((acc: any, bid: any) => acc + bid.amount, 0),
        };

        _bids.forEach((bid: any) => {
          switch (bid.state) {
            case BidState.WON:
              allocations[bid.account].balance +=
                (bid.amount / total_bids.winners) *
                (total_bids.winners + total_bids.losers);
              bid.state = BidState.FINALIZED;
              break;
            case BidState.LOST:
              allocations[bid.account].balance -=
                (bid.amount / total_bids.losers) *
                (total_bids.winners + total_bids.losers);
              bid.state = BidState.FINALIZED;
              break;
            default:
              return;
          }
        });

        await redisConnection.updateAllocations(allocations);
        console.log("[calculate-allocations]: Allocations: ", allocations);
        break;
    }
  },
  { connection }
);
queue
// INITIAL JOB!
await queue.upsertJobScheduler(
  "Chess",
  { pattern: "*/5 * * * * *" },
  {
    name: "wait-for-fetch-and-prove",
    opts: {
      backoff: 3,
      attempts: 5,
      removeOnFail: 1000,
    },
  }
);
