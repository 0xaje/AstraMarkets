import { ethers } from "ethers";
import fs from "fs";
import path from "path";
import dotenv from "dotenv";

dotenv.config();

const envPath = path.resolve(process.cwd(), ".env");

/**
 * Utility function to write or update variables in the local .env file.
 */
function updateEnvFile(key: string, value: string) {
  let content = "";
  if (fs.existsSync(envPath)) {
    content = fs.readFileSync(envPath, "utf8");
  }
  
  const regex = new RegExp(`^${key}=.*`, "m");
  if (regex.test(content)) {
    content = content.replace(regex, `${key}=${value}`);
  } else {
    if (content && !content.endsWith("\n")) {
      content += "\n";
    }
    content += `${key}=${value}`;
  }
  fs.writeFileSync(envPath, content.trim() + "\n", "utf8");
}

// ─── BLOCKCHAIN CONFIGURATION ──────────────────────────────────────
const SOMNIA_RPC_URL = process.env.SOMNIA_RPC_URL || "https://dream-rpc.somnia.network";
const provider = new ethers.JsonRpcProvider(SOMNIA_RPC_URL);

// Load or generate wallet private key
let privateKey = process.env.SOMNIA_PRIVATE_KEY;
if (!privateKey) {
  console.log("[Somnia L1] 🔑 No SOMNIA_PRIVATE_KEY found in environment. Generating a new wallet...");
  const randomWallet = ethers.Wallet.createRandom();
  privateKey = randomWallet.privateKey;
  updateEnvFile("SOMNIA_PRIVATE_KEY", privateKey);
  console.log(`[Somnia L1] 📝 Generated and saved new private key to .env`);
}

const wallet = new ethers.Wallet(privateKey, provider);
console.log(`[Somnia L1] 🟢 Connected wallet address: ${wallet.address}`);

// ─── COMPILED SMART CONTRACT PATHS ──────────────────────────────────
const abiPath = path.resolve(process.cwd(), "contracts/build/contracts_MarketFactory_sol_MarketFactory.abi");
const binPath = path.resolve(process.cwd(), "contracts/build/contracts_MarketFactory_sol_MarketFactory.bin");

let cachedContractAddress = process.env.SOMNIA_MARKET_FACTORY_ADDRESS;
let contractPromise: Promise<any> | null = null;

/**
 * Checks wallet balance and deploys/instantiates the MarketFactory contract.
 */
async function getOrDeployContract(): Promise<any> {
  if (cachedContractAddress) {
    const abi = JSON.parse(fs.readFileSync(abiPath, "utf8"));
    return new ethers.Contract(cachedContractAddress, abi, wallet);
  }

  if (contractPromise) {
    return contractPromise;
  }

  contractPromise = (async () => {
    // Re-check env in case it was written by another process
    dotenv.config();
    if (process.env.SOMNIA_MARKET_FACTORY_ADDRESS) {
      cachedContractAddress = process.env.SOMNIA_MARKET_FACTORY_ADDRESS;
      const abi = JSON.parse(fs.readFileSync(abiPath, "utf8"));
      return new ethers.Contract(cachedContractAddress, abi, wallet);
    }

    console.log("[Somnia L1] 🔍 Checking wallet balance for deployment...");
    const balance = await provider.getBalance(wallet.address);
    console.log(`[Somnia L1] 💰 Wallet balance: ${ethers.formatEther(balance)} STT`);

    const abi = JSON.parse(fs.readFileSync(abiPath, "utf8"));
    const bytecode = fs.readFileSync(binPath, "utf8").trim();

    if (balance === 0n) {
      console.warn(`
════════════════════════════════════════════════════════════════════════
[Somnia L1] ⚠️  WARNING: WALLET BALANCE IS 0 STT!
To support real on-chain market creation, please fund your wallet:
Address: ${wallet.address}
Faucet: https://testnet.somnia.network/ ( Shannon Testnet )
════════════════════════════════════════════════════════════════════════
      `);
      const dummyAddress = "0x0000000000000000000000000000000000000000";
      return new ethers.Contract(dummyAddress, abi, wallet);
    }

    console.log("[Somnia L1] 🚀 Deploying new MarketFactory smart contract to Somnia Shannon Testnet...");
    try {
      const factory = new ethers.ContractFactory(abi, bytecode, wallet);
      const contract = await factory.deploy();
      await contract.waitForDeployment();
      
      const deployedAddress = await contract.getAddress();
      console.log(`[Somnia L1] 🎉 Smart contract successfully deployed at: ${deployedAddress}`);
      
      cachedContractAddress = deployedAddress;
      updateEnvFile("SOMNIA_MARKET_FACTORY_ADDRESS", deployedAddress);
      return contract;
    } catch (deployErr: any) {
      console.error("[Somnia L1] ❌ Smart contract deployment failed:", deployErr);
      throw deployErr;
    }
  })();

  return contractPromise;
}

/**
 * Interface representing the returned structure from real market creation on-chain.
 */
export interface OnChainMarketResult {
  txHash: string;
  marketId?: number;
  confirmed: boolean;
}

/**
 * Creates a prediction market on the Somnia L1 blockchain.
 * Supports automated retries with exponential backoff on transaction failure.
 *
 * @param market The market proposal to deploy on-chain.
 */
export async function createMarketOnChain(market: any): Promise<OnChainMarketResult> {
  const title = market.title;
  const category = market.category || "crypto";
  const confidence = market.confidence || 50;
  const creator = "AI_AGENT";

  // Calculate duration in seconds until expiry
  const expiryDate = new Date(market.expiry);
  const now = new Date();
  let expiryDuration = Math.max(60, Math.floor((expiryDate.getTime() - now.getTime()) / 1000));
  
  // Bound expiry duration to minimum 60 seconds if it's invalid or past
  if (isNaN(expiryDuration) || expiryDuration <= 0) {
    expiryDuration = 14 * 24 * 3600; // Default 14 days
  }

  // Construct structured metadata payload inside the contract's description field
  const metadata = {
    category,
    confidence,
    creator,
    originalDescription: market.description || ""
  };
  const descriptionPayload = JSON.stringify(metadata);

  console.log(`[Somnia L1] 🛰️ Initiating on-chain market creation: "${title}"`);
  console.log(`[Somnia L1] Details: duration=${expiryDuration}s, category=${category}, confidence=${confidence}%`);

  const MAX_RETRIES = 3;
  let attempt = 0;

  while (attempt < MAX_RETRIES) {
    try {
      attempt++;
      const contract = await getOrDeployContract();

      if (contract.target === "0x0000000000000000000000000000000000000000") {
        throw new Error(`MarketFactory contract not deployed. Wallet ${wallet.address} has 0 STT balance. Please fund it via faucet.`);
      }

      // Send the transaction
      const tx = await contract.createMarket(title, descriptionPayload, expiryDuration);
      console.log(`[Somnia L1] 💸 Transaction broadcasted! Hash: ${tx.hash} (Attempt ${attempt}/${MAX_RETRIES})`);

      // Wait for confirmation
      console.log("[Somnia L1] ⏳ Waiting for transaction confirmation...");
      const receipt = await tx.wait();

      if (!receipt) {
        throw new Error("Transaction was confirmed but no receipt was returned.");
      }

      // Parse logs to retrieve the generated marketId
      let marketId: number | undefined;
      for (const log of receipt.logs) {
        try {
          const parsedLog = contract.interface.parseLog(log);
          if (parsedLog && parsedLog.name === "MarketCreated") {
            marketId = Number(parsedLog.args.marketId);
            console.log(`[Somnia L1] 🎯 MarketCreated Event Captured! On-Chain Market ID: ${marketId}`);
          }
        } catch {
          // Ignore logs from other/unrecognized events
        }
      }

      return {
        txHash: tx.hash,
        marketId,
        confirmed: true
      };

    } catch (err: any) {
      console.error(`[Somnia L1] Transaction attempt ${attempt} failed:`, err.message || err);
      
      if (attempt >= MAX_RETRIES) {
        throw new Error(`Failed to create market on-chain after ${MAX_RETRIES} attempts. Error: ${err.message || err}`);
      }

      const backoffMs = 1000 * Math.pow(2, attempt);
      console.log(`[Somnia L1] Retrying in ${backoffMs}ms...`);
      await new Promise((resolve) => setTimeout(resolve, backoffMs));
    }
  }

  throw new Error("Unexpected end of retry loop");
}

/**
 * Resolves a prediction market on the Somnia L1 blockchain.
 * Supports automated retries with exponential backoff on transaction failure.
 *
 * @param onChainMarketId The ID of the market on-chain.
 * @param outcome The resolved outcome of the prediction market (true for YES, false for NO).
 */
export async function resolveMarketOnChain(
  onChainMarketId: number,
  outcome: boolean
): Promise<{ txHash: string; confirmed: boolean }> {
  console.log(`[Somnia L1] 🛰️ Initiating on-chain market resolution: ID=${onChainMarketId}, outcome=${outcome ? "YES" : "NO"}`);
  
  const MAX_RETRIES = 3;
  let attempt = 0;

  while (attempt < MAX_RETRIES) {
    try {
      attempt++;
      const contract = await getOrDeployContract();

      if (contract.target === "0x0000000000000000000000000000000000000000") {
        throw new Error(`MarketFactory contract not deployed. Wallet ${wallet.address} has 0 STT balance. Please fund it via faucet.`);
      }

      // Send the transaction
      const tx = await contract.resolveMarket(onChainMarketId, outcome);
      console.log(`[Somnia L1] 💸 Resolution transaction broadcasted! Hash: ${tx.hash} (Attempt ${attempt}/${MAX_RETRIES})`);

      // Wait for confirmation
      console.log("[Somnia L1] ⏳ Waiting for transaction confirmation...");
      await tx.wait();

      return {
        txHash: tx.hash,
        confirmed: true
      };

    } catch (err: any) {
      console.error(`[Somnia L1] Resolution attempt ${attempt} failed:`, err.message || err);
      
      if (attempt >= MAX_RETRIES) {
        throw new Error(`Failed to resolve market on-chain after ${MAX_RETRIES} attempts. Error: ${err.message || err}`);
      }

      const backoffMs = 1000 * Math.pow(2, attempt);
      console.log(`[Somnia L1] Retrying in ${backoffMs}ms...`);
      await new Promise((resolve) => setTimeout(resolve, backoffMs));
    }
  }

  throw new Error("Unexpected end of retry loop");
}
