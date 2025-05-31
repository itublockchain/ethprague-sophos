import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { useMetaMask } from "@/hooks/useMetaMask";
import { JoinRoomPayload } from "@/types/Index";

type Props = {
  isOpen: boolean;
  setEoaAddress: (eoa: string) => void;
  joinRoom: (payload: JoinRoomPayload) => void;
};

export function StarterDialog({ isOpen, setEoaAddress, joinRoom }: Props) {
  const { isConnected, connectWallet, address } = useMetaMask();

  // Handle joining a room
  const handleJoinRoom = (payload: JoinRoomPayload) => {
    console.log("Payload: ", payload);

    setEoaAddress(payload.eoa);

    // If creating a new room, mark as host
    if (payload.roomId === undefined) {
      console.log("Creating new room as host, payload:", payload);
    } else {
      console.log(
        "Joining existing room:",
        payload.roomId,
        "payload:",
        payload
      );
    }

    // Join room via WebSocket - pass the payload directly
    console.log("Sending WebSocket joinRoom with payload:", {
      roomId: payload.roomId,
      eoa: payload.eoa,
    });

    joinRoom({
      roomId: payload.roomId,
      eoa: payload.eoa,
    });
  };

  return (
    <Dialog open={isOpen}>
      <form>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Welcome to the game</DialogTitle>
            <DialogDescription>
              Connect your wallet to continue
            </DialogDescription>
          </DialogHeader>

          {!isConnected && (
            <div id="connect-wallet-part" className="flex flex-col gap-2">
              <p>Connect your wallet to continue</p>
              <Button onClick={connectWallet}>Connect Wallet</Button>
            </div>
          )}

          {isConnected && (
            <div id="content" className="flex flex-col gap-5">
              <div>You can create a new game or join an existing one</div>
              <div id="create-game-part" className="flex flex-col gap-2">
                <Button
                  onClick={() =>
                    handleJoinRoom({ roomId: undefined, eoa: address })
                  }
                >
                  Create Game
                </Button>
              </div>

              <div id="join-game-part" className="flex flex-col gap-2">
                <Input placeholder="Game ID" />
                <Button>Join Game</Button>
              </div>
            </div>
          )}
        </DialogContent>
      </form>
    </Dialog>
  );
}
