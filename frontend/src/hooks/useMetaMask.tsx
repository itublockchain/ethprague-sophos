import { useState, useEffect, useCallback, useRef } from "react";
import { Eip1193Provider, ethers } from "ethers";

interface NetworkInfo {
  chainId: string;
  chainName: string;
  isSupported: boolean;
}

interface MetaMaskState {
  isConnected: boolean;
  address: string;
  provider: ethers.BrowserProvider | null;
  signer: ethers.JsonRpcSigner | null;
  isConnecting: boolean;
  error: string | null;
  network: NetworkInfo | null;
  balance: string | null;
}

const SUPPORTED_NETWORKS: Record<string, string> = {
  "0x1": "Ethereum Mainnet",
  "0x5": "Goerli Testnet",
  "0xaa36a7": "Sepolia Testnet",
  "0x89": "Polygon Mainnet",
  "0x13881": "Polygon Mumbai",
};

export function useMetaMask() {
  const [state, setState] = useState<MetaMaskState>({
    isConnected: false,
    address: "",
    provider: null,
    signer: null,
    isConnecting: false,
    error: null,
    network: null,
    balance: null,
  });

  // Use ref to avoid stale closures in event handlers
  const stateRef = useRef(state);
  stateRef.current = state;

  // Check if we're in the browser
  const isBrowser = typeof window !== "undefined";

  // Check if MetaMask is installed
  const checkIfMetaMaskInstalled = useCallback((): boolean => {
    if (!isBrowser) return false;
    const { ethereum } = window;
    return Boolean(ethereum && ethereum.isMetaMask);
  }, [isBrowser]);

  // Get network information
  const getNetworkInfo = useCallback(
    async (provider: ethers.BrowserProvider): Promise<NetworkInfo> => {
      try {
        const network = await provider.getNetwork();
        const chainId = `0x${network.chainId.toString(16)}`;
        const chainName =
          SUPPORTED_NETWORKS[chainId] || `Unknown Network (${chainId})`;
        const isSupported = chainId in SUPPORTED_NETWORKS;

        return { chainId, chainName, isSupported };
      } catch (error) {
        console.error("Error getting network info:", error);
        return { chainId: "", chainName: "Unknown", isSupported: false };
      }
    },
    []
  );

  // Get balance
  const getBalance = useCallback(
    async (
      provider: ethers.BrowserProvider,
      address: string
    ): Promise<string> => {
      try {
        const balance = await provider.getBalance(address);
        return ethers.formatEther(balance);
      } catch (error) {
        console.error("Error getting balance:", error);
        return "0";
      }
    },
    []
  );

  // Connect to MetaMask
  const connectWallet = useCallback(async () => {
    if (!isBrowser) {
      console.warn("Cannot connect wallet on server side");
      return null;
    }

    try {
      setState((prev) => ({ ...prev, isConnecting: true, error: null }));

      if (!checkIfMetaMaskInstalled()) {
        throw new Error(
          "MetaMask is not installed. Please install MetaMask to continue."
        );
      }

      const { ethereum } = window;
      // @ts-expect-error - error is not typed
      const provider = new ethers.BrowserProvider(ethereum);

      // Request accounts access
      const accounts = await provider.send("eth_requestAccounts", []);
      if (!accounts || accounts.length === 0) {
        throw new Error(
          "No accounts found. Please make sure MetaMask is unlocked."
        );
      }

      const address = ethers.getAddress(accounts[0]);
      const signer = await provider.getSigner();

      // Get additional information
      const [networkInfo, balance] = await Promise.all([
        getNetworkInfo(provider),
        getBalance(provider, address),
      ]);

      // Update state with connection details
      setState({
        isConnected: true,
        address,
        provider,
        signer,
        isConnecting: false,
        error: null,
        network: networkInfo,
        balance,
      });

      return { address, network: networkInfo };
    } catch (error: unknown) {
      console.error("Error connecting to MetaMask:", error);
      const errorMessage =
        // @ts-expect-error - error is not typed
        error.code === 4001
          ? "Connection rejected by user"
          : // @ts-expect-error - error is not typed
            error.message || "Failed to connect to MetaMask";

      setState((prev) => ({
        ...prev,
        isConnecting: false,
        isConnected: false,
        error: errorMessage,
      }));
      return null;
    }
  }, [isBrowser, checkIfMetaMaskInstalled, getNetworkInfo, getBalance]);

  // Disconnect from MetaMask (clear local state)
  const disconnectWallet = useCallback(() => {
    setState({
      isConnected: false,
      address: "",
      provider: null,
      signer: null,
      isConnecting: false,
      error: null,
      network: null,
      balance: null,
    });

    // Note: MetaMask doesn't provide a programmatic way to disconnect.
    // Users need to manually disconnect from the MetaMask extension.
    if (isBrowser) {
      console.info(
        "Local state cleared. To fully disconnect, please disconnect from MetaMask extension."
      );
    }
  }, [isBrowser]);

  // Switch network
  const switchNetwork = useCallback(
    async (chainId: string) => {
      if (!isBrowser) {
        console.warn("Cannot switch network on server side");
        return;
      }

      try {
        if (!state.provider) {
          throw new Error("No provider available");
        }

        const { ethereum } = window;
        // @ts-expect-error - ethereum is not typed
        await ethereum.request({
          method: "wallet_switchEthereumChain",
          params: [{ chainId }],
        });
      } catch (error: unknown) {
        console.error("Error switching network:", error);
        // @ts-expect-error - error is not typed
        if (error.code === 4902) {
          // Network not added to MetaMask
          throw new Error(
            "Network not added to MetaMask. Please add it manually."
          );
        }
        throw error;
      }
    },
    [isBrowser, state.provider]
  );

  // Refresh balance
  const refreshBalance = useCallback(async () => {
    if (state.provider && state.address) {
      const balance = await getBalance(state.provider, state.address);
      setState((prev) => ({ ...prev, balance }));
    }
  }, [state.provider, state.address, getBalance]);

  // Handle account changes
  const handleAccountsChanged = useCallback(
    async (accounts: string[]) => {
      const currentState = stateRef.current;

      if (accounts.length === 0) {
        // User disconnected their wallet
        disconnectWallet();
      } else {
        const newAddress = ethers.getAddress(accounts[0]);
        if (newAddress !== currentState.address && currentState.provider) {
          // Account changed, update state
          const [balance] = await Promise.all([
            getBalance(currentState.provider, newAddress),
          ]);

          setState((prev) => ({
            ...prev,
            address: newAddress,
            balance,
            isConnected: true,
            error: null,
          }));
        }
      }
    },
    [disconnectWallet, getBalance]
  );

  // Handle chain changes
  const handleChainChanged = useCallback(async () => {
    const currentState = stateRef.current;

    if (currentState.provider && currentState.address) {
      try {
        const [networkInfo, balance] = await Promise.all([
          getNetworkInfo(currentState.provider),
          getBalance(currentState.provider, currentState.address),
        ]);

        setState((prev) => ({
          ...prev,
          network: networkInfo,
          balance,
          error: null,
        }));
      } catch (error) {
        console.error("Error handling chain change:", error);
        setState((prev) => ({
          ...prev,
          error: "Failed to update network information",
        }));
      }
    }
  }, [getNetworkInfo, getBalance]);

  // Initialize and set up event listeners
  useEffect(() => {
    // Only run on client side
    if (!isBrowser || !checkIfMetaMaskInstalled()) return;

    const { ethereum } = window;

    // Subscribe to events
    ethereum?.on("accountsChanged", handleAccountsChanged);
    ethereum?.on("chainChanged", handleChainChanged);

    // Check if already connected
    const checkConnection = async () => {
      try {
        const accounts = await ethereum?.request({ method: "eth_accounts" });
        if (accounts.length > 0) {
          const provider = new ethers.BrowserProvider(
            ethereum as Eip1193Provider
          );
          const address = ethers.getAddress(accounts[0]);
          const signer = await provider.getSigner();

          const [networkInfo, balance] = await Promise.all([
            getNetworkInfo(provider),
            getBalance(provider, address),
          ]);

          setState({
            isConnected: true,
            address,
            provider,
            signer,
            isConnecting: false,
            error: null,
            network: networkInfo,
            balance,
          });
        }
      } catch (err: unknown) {
        console.error("Error checking accounts:", err);
        setState((prev) => ({
          ...prev,
          error: "Failed to check existing connection",
        }));
      }
    };

    checkConnection();

    // Cleanup listeners on unmount
    return () => {
      if (ethereum?.removeListener) {
        ethereum.removeListener("accountsChanged", handleAccountsChanged);
        ethereum.removeListener("chainChanged", handleChainChanged);
      }
    };
  }, [
    isBrowser,
    checkIfMetaMaskInstalled,
    handleAccountsChanged,
    handleChainChanged,
    getNetworkInfo,
    getBalance,
  ]);

  return {
    ...state,
    connectWallet,
    disconnectWallet,
    switchNetwork,
    refreshBalance,
    isMetaMaskInstalled: checkIfMetaMaskInstalled(),
    supportedNetworks: SUPPORTED_NETWORKS,
  };
}
