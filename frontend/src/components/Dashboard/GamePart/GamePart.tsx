import { useEffect, useState } from "react";
import PlayInterfacePart from "./PlayPart/PlayInterfacePart/PlayInterfacePart";
import { Spinner } from "@/components/ui/spinner";
import { GameState } from "@/types/Index";

type Props = {
  gameState: GameState;
};

export default function GamePart({ gameState }: Props) {
  const [gameId, setGameId] = useState("");

  const handleGetGameId = async () => {
    try {
      const response = await fetch("/api/game/id", {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
        },
      });

      if (!response.ok) {
        console.error(
          "Response is not ok from server: ",
          await response.text()
        );
        return setGameId("");
      }

      const data = (await response.json()) as { gameID: string };

      console.log("Data: ", data);

      setGameId(data.gameID);
    } catch (error) {
      console.error("Error: ", error);
      setGameId("");
    }
  };

  useEffect(() => {
    handleGetGameId();
  }, []);

  if (!gameId) {
    return <Spinner />;
  }

  return <PlayInterfacePart gameId={gameId} gameState={gameState} />;
}
