export type Game = {
  id: string;
  status: "not-started" | "started" | "ended";
  ts: number;
  players: string[];
  hostPlayer: string;
};
