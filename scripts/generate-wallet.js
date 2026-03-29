/**
 * Chain Quest — Minter Wallet Generator
 * Run: node scripts/generate-wallet.js
 *
 * Generates a fresh Ethereum wallet to use as the game's server-side minter.
 * Fund it with Sepolia ETH, then deploy the CQT contract with it.
 */
const { ethers } = require('ethers');

const wallet = ethers.Wallet.createRandom();

console.log('\n╔══════════════════════════════════════════════════╗');
console.log('║       CHAIN QUEST — NEW MINTER WALLET            ║');
console.log('╚══════════════════════════════════════════════════╝');
console.log('');
console.log('  Address    :', wallet.address);
console.log('  Private Key:', wallet.privateKey);
console.log('');
console.log('────────────────────────────────────────────────────');
console.log('NEXT STEPS:');
console.log('');
console.log('1. Fund this wallet with Sepolia ETH (needed for gas):');
console.log('     https://sepoliafaucet.com           (Alchemy — free)');
console.log('     https://faucet.quicknode.com/ethereum/sepolia');
console.log('     https://faucets.chain.link/sepolia');
console.log('');
console.log('2. Add to your local .env (for contract deploy):');
console.log(`     MINTER_PRIVATE_KEY=${wallet.privateKey}`);
console.log('     SEPOLIA_RPC_URL=https://ethereum-sepolia-rpc.publicnode.com');
console.log('');
console.log('3. Deploy the CQT contract to Sepolia:');
console.log('     npm run deploy:sepolia');
console.log('');
console.log('4. Set these in Railway dashboard → Settings → Variables:');
console.log(`     MINTER_PRIVATE_KEY  = ${wallet.privateKey}`);
console.log('     SEPOLIA_RPC_URL     = https://ethereum-sepolia-rpc.publicnode.com');
console.log('     VITE_CQT_CONTRACT_ADDRESS = <address from deploy:sepolia output>');
console.log('     JWT_SECRET          = <any 32+ char random string>');
console.log('     NODE_ENV            = production');
console.log('');
console.log('5. Rebuild & redeploy on Railway (git push origin master).');
console.log('');
console.log('⚠  KEEP YOUR PRIVATE KEY SECRET. Do not commit it to git.');
console.log('────────────────────────────────────────────────────\n');
