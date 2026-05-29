import { ethers } from "ethers";
import fs from "fs";
import path from "path";
// @ts-ignore
import solc from "solc";
import { env } from "../server/config/env.js";

async function main() {
  console.log("╔══════════════════════════════════════════════╗");
  console.log("║     AstraMarkets Smart Contract Deployer     ║");
  console.log("╚══════════════════════════════════════════════╝\n");

  const rpcUrl = env.SOMNIA_RPC_URL;
  const privateKey = env.SOMNIA_PRIVATE_KEY;

  if (!privateKey) {
    throw new Error("Missing SOMNIA_PRIVATE_KEY in environment!");
  }

  console.log(`[Deploy] Connecting to Somnia L1 RPC: ${rpcUrl}`);
  const provider = new ethers.JsonRpcProvider(rpcUrl);
  const wallet = new ethers.Wallet(privateKey, provider);
  console.log(`[Deploy] Wallet address: ${wallet.address}`);

  const balance = await provider.getBalance(wallet.address);
  console.log(`[Deploy] Wallet balance: ${ethers.formatEther(balance)} STT`);

  // 1. Read Solidity Source
  const contractPath = path.resolve(process.cwd(), "contracts/MarketFactory.sol");
  console.log(`[Deploy] Reading contract from: ${contractPath}`);
  const source = fs.readFileSync(contractPath, "utf8");

  // 2. Compile Contract with solc
  console.log("[Deploy] Compiling contract...");
  const input = {
    language: "Solidity",
    sources: {
      "MarketFactory.sol": {
        content: source,
      },
    },
    settings: {
      optimizer: {
        enabled: true,
        runs: 200,
      },
      viaIR: true,
      outputSelection: {
        "*": {
          "*": ["abi", "evm.bytecode"],
        },
      },
    },
  };

  const output = JSON.parse(solc.compile(JSON.stringify(input)));

  if (output.errors) {
    let hasError = false;
    for (const error of output.errors) {
      console.log(`[solc] ${error.severity.toUpperCase()}: ${error.formattedMessage}`);
      if (error.severity === "error") {
        hasError = true;
      }
    }
    if (hasError) {
      throw new Error("Compilation failed!");
    }
  }

  const contractFile = output.contracts["MarketFactory.sol"];
  if (!contractFile || !contractFile["MarketFactory"]) {
    throw new Error("MarketFactory contract not found in compilation output!");
  }

  const abi = contractFile["MarketFactory"].abi;
  const bytecode = contractFile["MarketFactory"].evm.bytecode.object;

  console.log("[Deploy] Compilation successful!");

  // 3. Save Compiled ABI & Bytecode to contracts/build
  const buildDir = path.resolve(process.cwd(), "contracts/build");
  if (!fs.existsSync(buildDir)) {
    fs.mkdirSync(buildDir, { recursive: true });
  }

  const abiPath = path.join(buildDir, "contracts_MarketFactory_sol_MarketFactory.abi");
  const binPath = path.join(buildDir, "contracts_MarketFactory_sol_MarketFactory.bin");

  fs.writeFileSync(abiPath, JSON.stringify(abi, null, 2), "utf8");
  fs.writeFileSync(binPath, bytecode, "utf8");

  console.log(`[Deploy] Exported ABI to: ${abiPath}`);
  console.log(`[Deploy] Exported Bytecode to: ${binPath}`);

  // 4. Deploy Smart Contract
  console.log("[Deploy] Sending deployment transaction...");
  const factory = new ethers.ContractFactory(abi, bytecode, wallet);
  const contract = await factory.deploy();
  
  console.log("[Deploy] Waiting for transaction to be mined...");
  await contract.waitForDeployment();

  const contractAddress = await contract.getAddress();
  const txHash = contract.deploymentTransaction()?.hash || "";

  console.log("\n==================================================");
  console.log("🎉 DEPLOYMENT SUCCESSFUL!");
  console.log("==================================================");
  console.log(`• Contract Address: ${contractAddress}`);
  console.log(`• Transaction Hash: ${txHash}`);
  console.log("==================================================\n");

  // 5. Test Contract with one sample market creation call
  console.log("[Deploy] Testing contract with one sample market creation...");
  const testTitle = "Will Ethereum Gas Spikes continue in Q3 2026?";
  const testCategory = "crypto";
  const testExpiry = Math.floor(Date.now() / 1000) + 14 * 24 * 60 * 60; // 14 days
  const testCreator = "AI_AGENT";
  const testConfidence = 88;

  // @ts-ignore
  const tx = await contract.createMarket(testTitle, testCategory, testExpiry, testCreator, testConfidence);
  console.log(`[Deploy] Test market creation tx sent: ${tx.hash}`);
  await tx.wait();
  console.log("[Deploy] Test market creation transaction successfully confirmed on-chain!");

  // 6. Output instruction to update env file
  console.log(`\n→ ACTION REQUIRED: Update MARKET_FACTORY_ADDRESS inside your .env with: ${contractAddress}\n`);
}

main().catch((err) => {
  console.error("[Deploy] Deployment failed:", err);
  process.exit(1);
});
