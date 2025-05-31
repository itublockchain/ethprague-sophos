export type ChannelRawData = {
  [gameType: string]: {
    user: {
      name: string;
      flair: string;
      id: string;
    };

    rating: number;

    gameId: string;

    color: "white" | "black";
  };
};

export type ChannelData = {
  gameType: string;
  user: {
    name: string;
    flair: string;
    id: string;
  };

  rating: number;

  gameId: string;

  color: "white" | "black";
};

export type GamePreviewData = {
  id: string;
  variant: {
    name: string;
  };
  speed: string;
  perf: string;
  rated: boolean;
  initialFen: string;
  fen: string;
  player: string;
  turns: number;
  startedAtTurn: number;
  source: string;
  status: {
    id: number;
    name: string;
  };
  createdAt: number;
  lastMove?: string;
  players: {
    white: {
      rating: number;
    };
    black: {
      rating: number;
    };
  };
  whiteTime?: number;
  blackTime?: number;
  winner?: string;
};

export type BetStatus = "pending" | "won" | "lost" | null;

export type BetData = {
  predictedMove: string;
  betAmount: number;
  status: BetStatus;
  placedAt: number;
  resolvedAt?: number;
};
