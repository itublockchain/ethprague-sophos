import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { ChannelData, ChannelRawData } from "@/types/Chess";
import { RefreshCcw } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import GamePreview from "./GamePreview";

export default function PreviewPart() {
  const [channels, setChannels] = useState<ChannelData[] | null>(null);

  const handleRefreshGames = () => {
    setChannels(null);
    handleGetActiveGames();
  };

  const handleGetActiveGames = async () => {
    try {
      const response = await fetch("https://lichess.org/api/tv/channels", {
        method: "GET",
      });

      if (!response.ok) {
        console.error(
          "Response is not okay from lichess when getting feed: ",
          await response.text()
        );
        return setChannels(null);
      }

      const data = (await response.json()) as ChannelRawData;

      const channelsData = Object.keys(data).map((gameType) => {
        const formattedData: ChannelData = {
          gameType,
          user: data[gameType].user,
          rating: data[gameType].rating,
          gameId: data[gameType].gameId,
          color: data[gameType].color,
        };
        return formattedData;
      });

      setChannels(
        channelsData.filter(
          (channel) =>
            channel.gameType === "bullet" ||
            channel.gameType === "blitz" ||
            channel.gameType === "classical"
        )
      );
    } catch (error) {
      console.error("Error when getting feed from lichess: ", error);
      toast.error("Error when getting feed from lichess");
      return setChannels(null);
    }
  };

  useEffect(() => {
    handleGetActiveGames();
  }, []);

  return (
    <div
      id="game-previews-area"
      className="h-full overflow-hidden flex flex-col gap-4"
    >
      <div
        id="label-refresh-button"
        className="flex flex-row gap-3 text-2xl font-bold"
      >
        Pick a Game to Start Playing!
        <Button
          variant="outline"
          size="icon"
          onClick={handleRefreshGames}
          disabled={channels === null}
        >
          {channels === null ? <Spinner size="small" /> : <RefreshCcw />}
        </Button>
      </div>

      {channels === null && <Spinner />}

      {channels && (
        <div
          id="previews-container"
          className="flex flex-col lg:flex-row w-full h-full gap-5"
        >
          {channels.map((channel) => (
            <GamePreview
              key={channel.gameId}
              channelData={channel}
              className="w-full lg:w-1/3 lg:max-w-1/3"
            />
          ))}
        </div>
      )}
    </div>
  );
}
