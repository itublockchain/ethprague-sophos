import express, { type Request, type Response } from "express";
import http from "http";
import { redisConnection } from "./functions/redis_connection";

import { queue } from "./bullmq/queue";

// Express uygulaması oluşturma
const app = express();
const server = http.createServer(app);
const PORT = process.env.EXPRESS_PORT || 5000;

// Express middleware'leri
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
 
// GET: /api/game/id
app.get("/api/game/id", async (req: Request, res: Response): Promise<any> => {
  const gameID = await redisConnection.getGameID();

  if(!gameID) {
    res.status(400).json({ error: "Game ID is not set" });
    return;
  }

  res.json({ gameID });
});

// POST: /api/game/changeID
app.post(
  "/api/game/changeID",
  async (req: Request, res: Response): Promise<any> => {

    const data = await fetch("https://lichess.org/api/tv/channels", {
      headers: {
        "Accept": "application/json",
       },
    }).then(res => res.json());

    if(!data) return;

    //@ts-ignore
    const id = data.rapid.gameId;
    

    await redisConnection.changeGameID(id);
    console.log("[Express]: Game ID changed to: ", id); 

    res.send(200);
  }
);

// POST: /api/game/id
app.post(
  "/api/bet/place",
  async (req: Request, res: Response): Promise<any> => {
    const { account_address, move, amount, turn } = req.body;

    const bid_data = {
      account_address: account_address,
      move: move,
      amount: amount,
      turn: turn,
    };

    await redisConnection.newBid(bid_data);
    await queue.add("validate-bid", {});
    console.log("[Express]: Bid request added to queue: ", bid_data);

    res.send(200);
  }
);

//! GET: for development!
app.get(
  "/api/redis/get/:key",
  async (req: Request, res: Response): Promise<any> => {
    const key = req.params.key;
    const value = await redisConnection.getByKey(key || "");
    res.send(JSON.parse(value));
  }
);

// Sunucuyu başlat
server.listen(PORT, () => {
  console.log(`API sunucusu http://localhost:${PORT} adresinde çalışıyor`);
});
