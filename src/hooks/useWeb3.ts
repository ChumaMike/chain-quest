import { useCallback } from 'react';
import { ethers } from 'ethers';
import { useWeb3Store } from '../store/web3Store';
import { useAuthStore } from '../store/authStore';

const CQT_ABI = [
  'function balanceOf(address account) view returns (uint256)',
  'function transfer(address to, uint256 amount) returns (bool)',
  'function approve(address spender, uint256 amount) returns (bool)',
];

const CONTRACT_ADDRESS = import.meta.env.VITE_CQT_CONTRACT_ADDRESS as string;
const SEPOLIA_CHAIN_ID = parseInt(import.meta.env.VITE_NETWORK_CHAIN_ID || '11155111');

export function useWeb3() {
  const store = useWeb3Store();
  const authStore = useAuthStore();

  const connectWallet = useCallback(async () => {
    if (!window.ethereum) {
      store.setError('MetaMask not detected. Please install MetaMask to use Web3 features.');
      return;
    }
    store.setLoading(true);
    store.setError(null);
    try {
      const provider = new ethers.BrowserProvider(window.ethereum);
      const accounts = await provider.send('eth_requestAccounts', []);
      if (!accounts.length) throw new Error('No accounts returned');

      const network = await provider.getNetwork();
      const chainId = Number(network.chainId);
      const address = accounts[0];

      store.setConnected(address, chainId);

      // Link wallet to user account
      if (authStore.token) {
        try {
          await fetch('/api/auth/wallet', {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${authStore.token}` },
            body: JSON.stringify({ walletAddress: address }),
          });
          authStore.updateWallet(address);
        } catch { /* non-critical */ }
      }

      // Fetch CQT balance
      if (CONTRACT_ADDRESS && CONTRACT_ADDRESS !== '0x0000000000000000000000000000000000000000') {
        await fetchBalance(provider, address);
      }

      // Listen for account/chain changes
      window.ethereum.on('accountsChanged', (accs: string[]) => {
        if (accs.length === 0) store.disconnect();
        else store.setConnected(accs[0], chainId);
      });
      window.ethereum.on('chainChanged', (hexChainId: string) => {
        store.setChainId(parseInt(hexChainId, 16));
      });
    } catch (err: any) {
      store.setError(err.message || 'Failed to connect wallet');
    } finally {
      store.setLoading(false);
    }
  }, []);

  const fetchBalance = async (provider: ethers.BrowserProvider, address: string) => {
    try {
      if (!CONTRACT_ADDRESS || CONTRACT_ADDRESS === '0x0000000000000000000000000000000000000000') {
        store.setBalance('0');
        return;
      }
      const contract = new ethers.Contract(CONTRACT_ADDRESS, CQT_ABI, provider);
      const balance = await contract.balanceOf(address);
      store.setBalance(ethers.formatEther(balance));
    } catch {
      store.setBalance('0');
    }
  };

  const refreshBalance = useCallback(async () => {
    if (!store.walletAddress || !window.ethereum) return;
    const provider = new ethers.BrowserProvider(window.ethereum);
    await fetchBalance(provider, store.walletAddress);
  }, [store.walletAddress]);

  const switchToSepolia = useCallback(async () => {
    if (!window.ethereum) return;
    try {
      await window.ethereum.request({
        method: 'wallet_switchEthereumChain',
        params: [{ chainId: `0x${SEPOLIA_CHAIN_ID.toString(16)}` }],
      });
    } catch (switchError: any) {
      if (switchError.code === 4902) {
        await window.ethereum.request({
          method: 'wallet_addEthereumChain',
          params: [{
            chainId: `0x${SEPOLIA_CHAIN_ID.toString(16)}`,
            chainName: 'Sepolia Testnet',
            nativeCurrency: { name: 'Sepolia ETH', symbol: 'ETH', decimals: 18 },
            rpcUrls: ['https://rpc.sepolia.org'],
            blockExplorerUrls: ['https://sepolia.etherscan.io'],
          }],
        });
      }
    }
  }, []);

  const claimReward = useCallback(async (worldId: number, token: string): Promise<{ success: boolean; txHash?: string; simulated?: boolean }> => {
    try {
      const res = await fetch(`/api/profile/${authStore.user?.id}/claim-reward`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ worldId }),
      });
      const data = await res.json();
      if (data.success) {
        setTimeout(refreshBalance, 3000);
        return { success: true, txHash: data.txHash, simulated: data.simulated };
      }
      return { success: false };
    } catch {
      return { success: false };
    }
  }, [authStore.user, refreshBalance]);

  return { ...store, connectWallet, refreshBalance, switchToSepolia, claimReward };
}

// Extend window for TypeScript
declare global {
  interface Window {
    ethereum?: any;
  }
}
