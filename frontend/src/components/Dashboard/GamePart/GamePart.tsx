import React, { useEffect, useState } from "react";
import PreviewPart from "./Preview/PreviewPart";
import { useSearchParams } from "next/navigation";
import PlayPart from "./PlayPart/PlayPart";

export default function GamePart() {
  const [selectedGameId, setSelectedGameId] = useState("");

  const searchParams = useSearchParams();

  useEffect(() => {
    const gameId = searchParams.get("gameId") as string;
    if (!gameId) setSelectedGameId("");

    setSelectedGameId(gameId);
  }, [searchParams]);

  if (!selectedGameId) {
    return <PreviewPart />;
  }

  return <PlayPart gameId={selectedGameId} />;
}
