"use client";

import React, { createContext, useContext, useEffect, useState } from "react";
import {
  createPublicClient,
  createWalletClient,
  custom,
  http,
  type Hex,
} from "viem";
import { NitroliteClient, type ContractAddresses } from "@erc7824/nitrolite";
import { polygon } from "viem/chains";
import { useDynamicContext } from "@dynamic-labs/sdk-react-core";
import { ethers } from "ethers";

// Environment configuration
const APP_CONFIG = {
  CUSTODIES: {
    137:
      process.env.NEXT_PUBLIC_CUSTODY_ADDRESS ||
      "0x0000000000000000000000000000000000000000",
  },
  ADJUDICATORS: {
    137:
      process.env.NEXT_PUBLIC_ADJUDICATOR_ADDRESS ||
      "0x0000000000000000000000000000000000000000",
  },
  TOKENS: {
    137:
      process.env.NEXT_PUBLIC_USDC_TOKEN_ADDRESS ||
      "0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174",
  },
  CHANNEL: {
    DEFAULT_GUEST:
      process.env.NEXT_PUBLIC_DEFAULT_GUEST_ADDRESS ||
      "0x0000000000000000000000000000000000000000",
    CHALLENGE_PERIOD: parseInt(
      process.env.NEXT_PUBLIC_CHALLENGE_PERIOD || "300"
    ),
  },
};

// Generate ephemeral keypair for state signing
const generateKeyPair = async () => {
  const wallet = ethers.Wallet.createRandom();
  return {
    privateKey: wallet.privateKey,
    publicKey: wallet.publicKey,
    address: wallet.address,
  };
};

const CRYPTO_KEYPAIR_KEY = "sagittarius_crypto_keypair";

// Create context for the Nitrolite client
interface NitroliteContextType {
  client: NitroliteClient | null;
  loading: boolean;
  error: string | null;
  stateWallet: ethers.Wallet | null;
}

const NitroliteContext = createContext<NitroliteContextType>({
  client: null,
  loading: true,
  error: null,
  stateWallet: null,
});

// Hook for components to use the Nitrolite client
export const useNitrolite = () => useContext(NitroliteContext);

interface NitroliteClientWrapperProps {
  children?: React.ReactNode;
}

export function NitroliteClientWrapper({
  children,
}: NitroliteClientWrapperProps) {
  const [clientState, setClientState] = useState<NitroliteContextType>({
    client: null,
    loading: true,
    error: null,
    stateWallet: null,
  });

  // Use Dynamic wallet - check if wallet is connected
  const { primaryWallet } = useDynamicContext();
  const isAuthenticated = !!primaryWallet;

  const initializeKeys = async (): Promise<{
    keyPair: any;
    stateWallet: ethers.Wallet;
  }> => {
    try {
      let keyPair = null;
      const savedKeys = localStorage.getItem(CRYPTO_KEYPAIR_KEY);

      if (savedKeys) {
        try {
          keyPair = JSON.parse(savedKeys);
        } catch (error) {
          console.error("Failed to parse saved keys:", error);
        }
      }

      if (!keyPair) {
        keyPair = await generateKeyPair();
        localStorage.setItem(CRYPTO_KEYPAIR_KEY, JSON.stringify(keyPair));
      }

      const stateWallet = new ethers.Wallet(keyPair.privateKey);
      return { keyPair, stateWallet };
    } catch (error) {
      console.error("Failed to initialize keys:", error);
      throw error;
    }
  };

  useEffect(() => {
    const initializeNitrolite = async () => {
      try {
        setClientState((prev) => ({ ...prev, loading: true, error: null }));

        // Only proceed if wallet is connected
        if (!isAuthenticated || !primaryWallet) {
          setClientState((prev) => ({
            ...prev,
            loading: false,
            error: "Wallet not connected. Please connect your wallet.",
          }));
          return;
        }

        // Check if window.ethereum is available
        if (!(window as any).ethereum) {
          setClientState((prev) => ({
            ...prev,
            loading: false,
            error:
              "Ethereum provider not found. Please install MetaMask or use a Web3 browser.",
          }));
          return;
        }

        const { stateWallet } = await initializeKeys();

        const publicClient = createPublicClient({
          transport: http(),
          chain: polygon,
        });

        // Create wallet client using the ethereum provider
        const walletClient = createWalletClient({
          transport: custom((window as any).ethereum),
          chain: polygon,
          account: primaryWallet.address as Hex,
        });

        const addresses: ContractAddresses = {
          custody: APP_CONFIG.CUSTODIES[polygon.id] as Hex,
          adjudicator: APP_CONFIG.ADJUDICATORS[polygon.id] as Hex,
          guestAddress: APP_CONFIG.CHANNEL.DEFAULT_GUEST as Hex,
          tokenAddress: APP_CONFIG.TOKENS[polygon.id] as Hex,
        };

        const challengeDuration = APP_CONFIG.CHANNEL.CHALLENGE_PERIOD;

        console.log("Creating Nitrolite client with:", {
          account: primaryWallet.address,
          chainId: polygon.id,
          addresses,
        });

        // Create state wallet client for signing state updates
        const stateWalletClient = {
          ...stateWallet,
          account: {
            address: stateWallet.address as Hex,
          },
          signMessage: async ({
            message: { raw },
          }: {
            message: { raw: string };
          }) => {
            const signature = await stateWallet.signMessage(
              typeof raw === "string"
                ? raw
                : ethers.toUtf8String(raw as Uint8Array)
            );
            return signature as Hex;
          },
        };

        // Create the Nitrolite client
        const client = new NitroliteClient({
          publicClient,
          walletClient,
          // @ts-ignore - Type mismatch with stateWalletClient
          stateWalletClient,
          account: walletClient.account,
          chainId: polygon.id,
          challengeDuration: BigInt(challengeDuration),
          addresses,
        });

        console.log("Nitrolite client initialized successfully!");

        setClientState({
          client,
          loading: false,
          error: null,
          stateWallet,
        });
      } catch (error: unknown) {
        console.error("Failed to initialize Nitrolite client:", error);

        let errorMessage = "Failed to initialize Nitrolite client";
        if (error instanceof Error) {
          errorMessage = `Nitrolite client error: ${error.message}`;
        }

        setClientState({
          client: null,
          loading: false,
          error: errorMessage,
          stateWallet: null,
        });
      }
    };

    initializeNitrolite();
  }, [primaryWallet, isAuthenticated]);

  return (
    <NitroliteContext.Provider value={clientState}>
      {children}
    </NitroliteContext.Provider>
  );
}
