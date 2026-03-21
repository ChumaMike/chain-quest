const hre = require('hardhat');

async function main() {
  const [deployer] = await hre.ethers.getSigners();
  console.log('Deploying ChainQuestToken with account:', deployer.address);
  console.log('Account balance:', hre.ethers.formatEther(await hre.ethers.provider.getBalance(deployer.address)), 'ETH');

  const ChainQuestToken = await hre.ethers.getContractFactory('ChainQuestToken');

  // Deployer is also the initial minter — can be changed with setMinter()
  const token = await ChainQuestToken.deploy(deployer.address);
  await token.waitForDeployment();

  const address = await token.getAddress();
  console.log('\n✅ ChainQuestToken deployed to:', address);
  console.log('   Network:', hre.network.name);
  console.log('   Minter:', deployer.address);
  console.log('\nAdd this to your .env file:');
  console.log(`VITE_CQT_CONTRACT_ADDRESS=${address}`);
  console.log('\nView on Sepolia Etherscan:');
  console.log(`https://sepolia.etherscan.io/address/${address}`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
