import { atom } from "jotai";

type CurrentStatus = {
  status: "not-connected" | "connected" | "join-game" | "create-game";
  data?: {
    roomId: string;
  };
};

export const currentStatusAtom = atom<CurrentStatus>({
  status: "not-connected",
  data: undefined,
});
