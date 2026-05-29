import { ethers } from "ethers";
import fs from "fs";
import path from "path";
import { env } from "../../config/env.js";

// ─── CUSTOM STRUCTURED ERROR BOUNDARIES ─────────────────────────────
export class BlockchainError extends Error {
  public code: string;
  constructor(message: string, code: string) {
    super(message);
    this.name = "BlockchainError";
    this.code = code;
  }
}

// ─── CIRCUIT BREAKER & RPC MONITORING STATE ────────────────────────
let consecutiveFailures = 0;
const BREAKER_THRESHOLD = 3;
const COOLDOWN_PERIOD_MS = 30000; // 30 seconds
let isBreakerOpen = false;
let breakerResetTime = 0;

function checkCircuitState() {
  if (isBreakerOpen) {
    if (Date.now() > breakerResetTime) {
      isBreakerOpen = false;
      consecutiveFailures = 0;
      console.log("[Somnia L1] 🔌 Circuit Breaker: Cooldown expired. Retrying RPC health connection...");
    } else {
      throw new BlockchainError("RPC Circuit Breaker is OPEN. Requests blocked.", "CIRCUIT_BREAKER_OPEN");
    }
  }
}

function handleRpcSuccess() {
  consecutiveFailures = 0;
}

function handleRpcFailure(err: any) {
  consecutiveFailures++;
  console.error(`[Somnia L1] RPC Failure registered (Attempt ${consecutiveFailures}/${BREAKER_THRESHOLD}). Error:`, err.message || err);
  if (consecutiveFailures >= BREAKER_THRESHOLD) {
    isBreakerOpen = true;
    breakerResetTime = Date.now() + COOLDOWN_PERIOD_MS;
    console.error(`[Somnia L1] 🚨 CIRCUIT BREAKER TRIPPED! Disabling Somnia L1 RPC calls for ${COOLDOWN_PERIOD_MS / 1000}s.`);
  }
}

// ─── BLOCKCHAIN CONFIGURATION ──────────────────────────────────────
export let provider: ethers.JsonRpcProvider;
export let wallet: ethers.Wallet;

try {
  provider = new ethers.JsonRpcProvider(env.SOMNIA_RPC_URL);
  wallet = new ethers.Wallet(env.SOMNIA_PRIVATE_KEY, provider);
  console.log(`[Somnia L1] 🟢 Connection established. Wallet address: ${wallet.address}`);
} catch (err: any) {
  console.error("[Somnia L1] ❌ Initial RPC connection config failed:", err.message || err);
}

// ─── COMPILED SMART CONTRACT PATHS ──────────────────────────────────
const abiPath = path.resolve(process.cwd(), "contracts/build/contracts_MarketFactory_sol_MarketFactory.abi");
const binPath = path.resolve(process.cwd(), "contracts/build/contracts_MarketFactory_sol_MarketFactory.bin");

let cachedContractAddress = env.MARKET_FACTORY_ADDRESS;
let contractPromise: Promise<ethers.Contract> | null = null;

async function getOrDeployContract(): Promise<ethers.Contract> {
  checkCircuitState();

  if (cachedContractAddress) {
    const abi = JSON.parse(fs.readFileSync(abiPath, "utf8"));
    return new ethers.Contract(cachedContractAddress, abi, wallet);
  }

  if (contractPromise) {
    return contractPromise;
  }

  contractPromise = (async () => {
    if (env.MARKET_FACTORY_ADDRESS) {
      cachedContractAddress = env.MARKET_FACTORY_ADDRESS;
      const abi = JSON.parse(fs.readFileSync(abiPath, "utf8"));
      return new ethers.Contract(cachedContractAddress, abi, wallet);
    }

    console.log("[Somnia L1] 🔍 Checking wallet balance for deployment...");
    try {
      const balance = await provider.getBalance(wallet.address);
      console.log(`[Somnia L1] 💰 Wallet balance: ${ethers.formatEther(balance)} STT`);

      if (balance === 0n) {
        throw new BlockchainError(`Wallet ${wallet.address} has 0 STT balance. Funding required to deploy/interact with contract.`, "INSUFFICIENT_FUNDS");
      }

      const abi = JSON.parse(fs.readFileSync(abiPath, "utf8"));
      const bytecode = fs.readFileSync(binPath, "utf8").trim();

      console.log("[Somnia L1] 🚀 Deploying new MarketFactory smart contract to Somnia Shannon Testnet...");
      const factory = new ethers.ContractFactory(abi, bytecode, wallet);
      const contract = await factory.deploy();
      
      // Deploy timeout
      const deploymentReceipt = await contract.deploymentTransaction()?.wait(1);
      if (!deploymentReceipt) {
        throw new BlockchainError("Deployment receipt was not returned.", "DEPLOYMENT_NO_RECEIPT");
      }

      const deployedAddress = await contract.getAddress();
      console.log(`[Somnia L1] 🎉 Smart contract successfully deployed at: ${deployedAddress}`);
      
      cachedContractAddress = deployedAddress;
      handleRpcSuccess();
      return contract as ethers.Contract;
    } catch (deployErr: any) {
      handleRpcFailure(deployErr);
      contractPromise = null; // Reset promise so it can be retried
      throw new BlockchainError(`Smart contract deployment/access failed: ${deployErr.message || deployErr}`, "CONTRACT_ACCESS_FAILED");
    }
  })();

  return contractPromise;
}

// Transaction confirmation helper with strict timeout boundary
async function waitWithTimeout(
  tx: ethers.TransactionResponse,
  timeoutMs: number = 45000
): Promise<ethers.TransactionReceipt> {
  const timeoutPromise = new Promise<never>((_, reject) =>
    setTimeout(() => reject(new BlockchainError(`Transaction receipt timeout exceeded: ${timeoutMs}ms`, "TX_TIMEOUT")), timeoutMs)
  );

  const receipt = await Promise.race([
    tx.wait(),
    timeoutPromise
  ]);

  if (!receipt) {
    throw new BlockchainError("Transaction completed but did not return a valid receipt.", "NO_RECEIPT");
  }

  return receipt;
}

export interface OnChainMarketResult {
  txHash: string;
  marketId?: number;
  confirmed: boolean;
}

/**
 * Creates a prediction market on the Somnia L1 blockchain.
 */
export async function createMarketOnChain(market: any): Promise<OnChainMarketResult> {
  const title = market.title;
  const category = market.category || "crypto";
  const confidence = market.confidence || 50;
  const creator = "AI_AGENT";

  const expiryDate = new Date(market.expiry);
  const now = new Date();
  let expiryDuration = Math.max(60, Math.floor((expiryDate.getTime() - now.getTime()) / 1000));
  
  if (isNaN(expiryDuration) || expiryDuration <= 0) {
    expiryDuration = 14 * 24 * 3600; // Default 14 days
  }

  const metadata = {
    category,
    confidence,
    creator,
    originalDescription: market.description || ""
  };
  const descriptionPayload = JSON.stringify(metadata);

  console.log(`[Somnia L1] 🛰️ Initiating on-chain market creation: "${title}"`);

  const MAX_RETRIES = 3;
  let attempt = 0;

  while (attempt < MAX_RETRIES) {
    try {
      attempt++;
      checkCircuitState();
      
      const contract = await getOrDeployContract();
      const tx = await contract.createMarket(title, descriptionPayload, expiryDuration);
      console.log(`[Somnia L1] 💸 Transaction broadcasted! Hash: ${tx.hash} (Attempt ${attempt}/${MAX_RETRIES})`);

      const receipt = await waitWithTimeout(tx);
      let marketId: number | undefined;

      for (const log of receipt.logs) {
        try {
          const parsedLog = contract.interface.parseLog(log);
          if (parsedLog && parsedLog.name === "MarketCreated") {
            marketId = Number(parsedLog.args.marketId);
            console.log(`[Somnia L1] 🎯 MarketCreated Event Captured! On-Chain Market ID: ${marketId}`);
          }
        } catch {
          // Skip unrecognized event logs
        }
      }

      handleRpcSuccess();
      return {
        txHash: tx.hash,
        marketId,
        confirmed: true
      };

    } catch (err: any) {
      handleRpcFailure(err);
      if (attempt >= MAX_RETRIES) {
        throw new BlockchainError(`Failed to create market on-chain after ${MAX_RETRIES} attempts. Error: ${err.message || err}`, "CREATE_MARKET_MAX_RETRIES_EXCEEDED");
      }

      const backoffMs = 1500 * Math.pow(2, attempt);
      console.log(`[Somnia L1] Retrying market creation in ${backoffMs}ms...`);
      await new Promise((resolve) => setTimeout(resolve, backoffMs));
    }
  }

  throw new BlockchainError("Unexpected exit from retry loop", "UNEXPECTED_LOOP_EXIT");
}

/**
 * Resolves a prediction market on the Somnia L1 blockchain.
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
      checkCircuitState();

      const contract = await getOrDeployContract();
      const tx = await contract.resolveMarket(onChainMarketId, outcome);
      console.log(`[Somnia L1] 💸 Resolution transaction broadcasted! Hash: ${tx.hash} (Attempt ${attempt}/${MAX_RETRIES})`);

      await waitWithTimeout(tx);
      handleRpcSuccess();
      return {
        txHash: tx.hash,
        confirmed: true
      };

    } catch (err: any) {
      handleRpcFailure(err);
      if (attempt >= MAX_RETRIES) {
        throw new BlockchainError(`Failed to resolve market on-chain after ${MAX_RETRIES} attempts. Error: ${err.message || err}`, "RESOLVE_MARKET_MAX_RETRIES_EXCEEDED");
      }

      const backoffMs = 1500 * Math.pow(2, attempt);
      console.log(`[Somnia L1] Retrying market resolution in ${backoffMs}ms...`);
      await new Promise((resolve) => setTimeout(resolve, backoffMs));
    }
  }

  throw new BlockchainError("Unexpected exit from retry loop", "UNEXPECTED_LOOP_EXIT");
}

/**
 * Disputes a settled market outcome on-chain.
 */
export async function disputeMarketOnChain(marketId: number): Promise<{ txHash: string; confirmed: boolean }> {
  console.log(`[Somnia L1] 🛰️ Initiating on-chain market dispute: ID=${marketId}`);
  checkCircuitState();
  try {
    const contract = await getOrDeployContract();
    const tx = await contract.disputeMarket(marketId);
    await waitWithTimeout(tx);
    handleRpcSuccess();
    return { txHash: tx.hash, confirmed: true };
  } catch (err: any) {
    handleRpcFailure(err);
    throw new BlockchainError(`On-chain dispute initialization failed: ${err.message || err}`, "DISPUTE_FAILED");
  }
}

/**
 * Casts a dispute vote on-chain.
 */
export async function voteOnDisputeOnChain(marketId: number, voteOutcome: boolean): Promise<{ txHash: string; confirmed: boolean }> {
  console.log(`[Somnia L1] 🛰️ Submitting on-chain dispute vote: ID=${marketId}, vote=${voteOutcome ? "YES" : "NO"}`);
  checkCircuitState();
  try {
    const contract = await getOrDeployContract();
    const tx = await contract.voteOnDispute(marketId, voteOutcome);
    await waitWithTimeout(tx);
    handleRpcSuccess();
    return { txHash: tx.hash, confirmed: true };
  } catch (err: any) {
    handleRpcFailure(err);
    throw new BlockchainError(`On-chain dispute vote submission failed: ${err.message || err}`, "DISPUTE_VOTE_FAILED");
  }
}

/**
 * Finalizes a dispute voting window on-chain.
 */
export async function finalizeDisputeOnChain(marketId: number): Promise<{ txHash: string; confirmed: boolean }> {
  console.log(`[Somnia L1] 🛰️ Finalizing on-chain dispute: ID=${marketId}`);
  checkCircuitState();
  try {
    const contract = await getOrDeployContract();
    const tx = await contract.finalizeDispute(marketId);
    await waitWithTimeout(tx);
    handleRpcSuccess();
    return { txHash: tx.hash, confirmed: true };
  } catch (err: any) {
    handleRpcFailure(err);
    throw new BlockchainError(`On-chain dispute finalization failed: ${err.message || err}`, "DISPUTE_FINALIZE_FAILED");
  }
}

/**
 * Emergency guardian override resolution on-chain.
 */
export async function emergencyResolveMarketOnChain(marketId: number, outcome: boolean): Promise<{ txHash: string; confirmed: boolean }> {
  console.log(`[Somnia L1] 🛰️ Guardian emergency resolve: ID=${marketId}, outcome=${outcome ? "YES" : "NO"}`);
  checkCircuitState();
  try {
    const contract = await getOrDeployContract();
    const tx = await contract.emergencyResolveMarket(marketId, outcome);
    await waitWithTimeout(tx);
    handleRpcSuccess();
    return { txHash: tx.hash, confirmed: true };
  } catch (err: any) {
    handleRpcFailure(err);
    throw new BlockchainError(`On-chain emergency guardian resolve failed: ${err.message || err}`, "EMERGENCY_RESOLVE_FAILED");
  }
}
