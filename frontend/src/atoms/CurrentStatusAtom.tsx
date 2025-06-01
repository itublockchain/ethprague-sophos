import { atom } from "jotai";

type CurrentStatus = {
  status:
    | "not-connected"
    | "connected"
    | "create-game"
    | "room-ready"
    | "game-ready";
  data?: {
    roomId: string;
  };
};

export const currentStatusAtom = atom<CurrentStatus>({
  status: "not-connected",
  data: undefined,
});
