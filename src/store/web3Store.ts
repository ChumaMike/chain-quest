import { create } from 'zustand';

interface Web3Store {
  isConnected: boolean;
  walletAddress: string | null;
  cqtBalance: string;
  chainId: number | null;
  isCorrectNetwork: boolean;
  isLoading: boolean;
  error: string | null;

  setConnected: (address: string, chainId: number) => void;
  disconnect: () => void;
  setBalance: (balance: string) => void;
  setChainId: (id: number) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
}

const SEPOLIA_CHAIN_ID = 11155111;

export const useWeb3Store = create<Web3Store>((set) => ({
  isConnected: false,
  walletAddress: null,
  cqtBalance: '0',
  chainId: null,
  isCorrectNetwork: false,
  isLoading: false,
  error: null,

  setConnected: (address, chainId) =>
    set({
      isConnected: true,
      walletAddress: address,
      chainId,
      isCorrectNetwork: chainId === SEPOLIA_CHAIN_ID,
      error: null,
    }),

  disconnect: () =>
    set({ isConnected: false, walletAddress: null, cqtBalance: '0', chainId: null, isCorrectNetwork: false }),

  setBalance: (cqtBalance) => set({ cqtBalance }),

  setChainId: (chainId) =>
    set({ chainId, isCorrectNetwork: chainId === SEPOLIA_CHAIN_ID }),

  setLoading: (isLoading) => set({ isLoading }),

  setError: (error) => set({ error }),
}));
