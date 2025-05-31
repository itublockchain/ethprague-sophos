import { EthereumWalletConnectors } from "@dynamic-labs/ethereum";
import { DynamicContextProvider } from "@dynamic-labs/sdk-react-core";
import { PropsWithChildren } from "react";
import { NitroliteClientWrapper } from "@/context/NitroliteClientWrapper";
import { WebSocketProvider } from "@/context/WebSocketContext";

export default function WalletProvider({ children }: PropsWithChildren) {
  return (
    <DynamicContextProvider
      settings={{
        // Find your environment id at https://app.dynamic.xyz/dashboard/developer
        environmentId: process.env.NEXT_PUBLIC_DYNAMIC_ENVIRONMENT_ID as string,
        walletConnectors: [EthereumWalletConnectors],
      }}
    >
      <NitroliteClientWrapper>
        <WebSocketProvider>{children}</WebSocketProvider>
      </NitroliteClientWrapper>
    </DynamicContextProvider>
  );
}
