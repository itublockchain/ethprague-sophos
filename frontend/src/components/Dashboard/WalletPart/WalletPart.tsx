import { Button } from "@/components/ui/button";
import { useMetaMask } from "@/hooks/useMetaMask";
import { IdCard } from "lucide-react";
import { toast } from "sonner";

export default function WalletPart() {
  const { connectWallet, disconnectWallet, address, isConnected } =
    useMetaMask();

  const handleConnectWalletButton = async () => {
    try {
      connectWallet();
    } catch (error) {
      console.error("Error connecting wallet", error);
      toast.error("Error connecting wallet: " + error);
    }
  };

  const handleDisconnectWalletButton = () => {
    if (!isConnected) {
      toast.error("No wallet connected");
      return;
    }
    try {
      disconnectWallet();
    } catch (error) {
      console.error("Error disconnecting wallet", error);
      toast.error("Error disconnecting wallet: " + error);
    }
  };

  if (!isConnected) {
    return (
      <div
        id="welcoming"
        className="flex flex-col w-full gap-5 border border-gray-500 rounded-lg p-5"
      >
        <div id="header-part" className="flex flex-col gap-1">
          <div id="label" className="text-xl font-semibold">
            Welcome to Sagittarius 👋
          </div>
          <div id="description" className="text-xs">
            Please connect your wallet to play the game. Click the
            &quot;Connect&quot; button below to get started!
          </div>
        </div>

        <Button onClick={handleConnectWalletButton} disabled={false}>
          Connect Wallet
        </Button>
      </div>
    );
  }

  return (
    <div
      id="connected-part"
      className="flex flex-col gap-5 border border-gray-500 rounded-lg p-5"
    >
      <div id="header-part" className="flex flex-col gap-3">
        <div id="label" className="text-xl font-semibold">
          Connected 🟢
        </div>

        <div id="descriptions" className="flex flex-col gap-1">
          <div id="address" className="flex flex-col gap-1">
            <IdCard className="size-4" />
            <div id="description" className="text-xs break-all">
              {address}
            </div>
          </div>
        </div>
      </div>

      <Button variant="outline" onClick={handleDisconnectWalletButton}>
        Disconnect
      </Button>
    </div>
  );
}
