import pkg from "hardhat";
const { ethers } = pkg;

async function main() {
  console.log("🚀 Starting AstraMarkets MarketFactory Deployment...");

  // Get the deploying account
  const [deployer] = await ethers.getSigners();
  console.log(`👤 Deploying contracts with account: ${deployer.address}`);

  // Fetch account balance to ensure enough gas
  const balance = await ethers.provider.getBalance(deployer.address);
  console.log(`💰 Account balance: ${ethers.formatEther(balance)} STT`);

  // Deploy the MarketFactory
  console.log("⏳ Deploying MarketFactory.sol to Somnia Testnet...");
  const MarketFactory = await ethers.getContractFactory("MarketFactory");
  
  // Deploy and wait for confirmation
  const marketFactory = await MarketFactory.deploy();
  await marketFactory.waitForDeployment();

  const contractAddress = await marketFactory.getAddress();
  
  console.log("✅ ==========================================");
  console.log(`🎉 MarketFactory Deployed Successfully!`);
  console.log(`📍 Contract Address: ${contractAddress}`);
  console.log("✅ ==========================================");
  
  console.log("\n⚠️ IMPORTANT: Update the MARKET_FACTORY_ADDRESS in your Next.js components and Node.js env to point to this new address!");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("❌ Deployment failed:", error);
    process.exit(1);
  });
