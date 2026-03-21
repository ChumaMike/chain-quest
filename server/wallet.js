const { ethers } = require('ethers');
require('dotenv').config();

let provider = null;
let minterWallet = null;
let tokenContract = null;

// Minimal ERC-20 ABI for minting
const TOKEN_ABI = [
  'function mint(address to, uint256 amount) external',
  'function balanceOf(address account) view returns (uint256)',
  'function totalSupply() view returns (uint256)',
  'event Transfer(address indexed from, address indexed to, uint256 value)',
];

function initWallet() {
  try {
    const rpcUrl = process.env.SEPOLIA_RPC_URL;
    const privateKey = process.env.MINTER_PRIVATE_KEY;
    const contractAddress = process.env.VITE_CQT_CONTRACT_ADDRESS;

    if (!rpcUrl || !privateKey || !contractAddress || contractAddress === '0x0000000000000000000000000000000000000000') {
      console.log('⚠️  Web3 wallet not configured — token rewards will be simulated (add .env values to enable)');
      return false;
    }

    provider = new ethers.JsonRpcProvider(rpcUrl);
    minterWallet = new ethers.Wallet(privateKey, provider);
    tokenContract = new ethers.Contract(contractAddress, TOKEN_ABI, minterWallet);

    console.log(`✅ Minter wallet connected: ${minterWallet.address}`);
    console.log(`✅ CQT Token contract: ${contractAddress}`);
    return true;
  } catch (err) {
    console.log('⚠️  Wallet init failed:', err.message);
    return false;
  }
}

async function mintTokens(toAddress, amount) {
  if (!tokenContract) {
    // Simulated mode — return fake tx hash
    return { success: true, txHash: '0xSIMULATED_' + Date.now(), simulated: true };
  }
  try {
    const amountWei = ethers.parseEther(amount.toString());
    const tx = await tokenContract.mint(toAddress, amountWei);
    const receipt = await tx.wait();
    return { success: true, txHash: receipt.hash, simulated: false };
  } catch (err) {
    console.error('Mint error:', err.message);
    return { success: false, error: err.message };
  }
}

async function getBalance(address) {
  if (!tokenContract) return '0';
  try {
    const balance = await tokenContract.balanceOf(address);
    return ethers.formatEther(balance);
  } catch {
    return '0';
  }
}

module.exports = { initWallet, mintTokens, getBalance };
