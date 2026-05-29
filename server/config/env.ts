import dotenv from "dotenv";
import path from "path";
import fs from "fs";

// Load environment variables from root .env if it exists
const envPath = path.resolve(process.cwd(), ".env");
if (fs.existsSync(envPath)) {
  dotenv.config({ path: envPath });
} else {
  dotenv.config();
}

export interface EnvConfig {
  SOMNIA_RPC_URL: string;
  SOMNIA_PRIVATE_KEY: string;
  MARKET_FACTORY_ADDRESS: string;
  
  NEWS_API_KEY?: string;
  REDDIT_CLIENT_ID?: string;
  REDDIT_CLIENT_SECRET?: string;
  REDDIT_USER_AGENT: string;
  SERP_API_KEY?: string;
  OPENAI_API_KEY?: string;
  
  SIGNAL_PORT: number;
  AGENT_LLM_MODEL: string;
  AGENT_CYCLE_MS: number;
}

const missingKeys: string[] = [];

const SOMNIA_RPC_URL = process.env.SOMNIA_RPC_URL;
if (!SOMNIA_RPC_URL) {
  missingKeys.push("SOMNIA_RPC_URL");
}

const SOMNIA_PRIVATE_KEY = process.env.SOMNIA_PRIVATE_KEY;
if (!SOMNIA_PRIVATE_KEY) {
  missingKeys.push("SOMNIA_PRIVATE_KEY");
}

// Support both MARKET_FACTORY_ADDRESS and SOMNIA_MARKET_FACTORY_ADDRESS
const MARKET_FACTORY_ADDRESS = process.env.MARKET_FACTORY_ADDRESS || process.env.SOMNIA_MARKET_FACTORY_ADDRESS;
if (!MARKET_FACTORY_ADDRESS) {
  missingKeys.push("MARKET_FACTORY_ADDRESS (or SOMNIA_MARKET_FACTORY_ADDRESS)");
}

if (missingKeys.length > 0) {
  console.error("\n==================================================");
  console.error("❌ CRITICAL: MISSING SECURE BLOCKCHAIN CONFIGURATION");
  console.error("==================================================");
  missingKeys.forEach((key) => {
    console.error(` • Missing Required Environment Variable: ${key}`);
  });
  console.error("\n→ Action Required: Copy .env.example to .env and configure these secure keys.");
  console.error("==================================================\n");
  throw new Error(`CRITICAL CONFIGURATION ERROR: Missing required env keys: ${missingKeys.join(", ")}`);
}

export const env: EnvConfig = {
  SOMNIA_RPC_URL: SOMNIA_RPC_URL!,
  SOMNIA_PRIVATE_KEY: SOMNIA_PRIVATE_KEY!,
  MARKET_FACTORY_ADDRESS: MARKET_FACTORY_ADDRESS!,
  
  NEWS_API_KEY: process.env.NEWS_API_KEY || undefined,
  REDDIT_CLIENT_ID: process.env.REDDIT_CLIENT_ID || undefined,
  // Support both REDDIT_CLIENT_SECRET and REDDIT_SECRET alias
  REDDIT_CLIENT_SECRET: process.env.REDDIT_CLIENT_SECRET || process.env.REDDIT_SECRET || undefined,
  REDDIT_USER_AGENT: process.env.REDDIT_USER_AGENT || "AstraMarkets/1.0 by AstraBot",
  SERP_API_KEY: process.env.SERP_API_KEY || undefined,
  OPENAI_API_KEY: process.env.OPENAI_API_KEY || undefined,
  
  SIGNAL_PORT: parseInt(process.env.SIGNAL_PORT || "4000", 10),
  AGENT_LLM_MODEL: process.env.AGENT_LLM_MODEL || "gpt-4o-mini",
  AGENT_CYCLE_MS: parseInt(process.env.AGENT_CYCLE_MS || "15000", 10),
};
