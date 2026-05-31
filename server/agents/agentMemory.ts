import fs from "fs";
import path from "path";

export interface AgentMemoryRecord {
  predictionTitle: string;
  category: string;
  initialConfidence: number;
  initialOdds: number;
  outcome: boolean | null; // null = pending
  settlementTimestamp?: number;
  signalsUsed: string[];
  calibrationError?: number; // |(confidence/100) - (outcome?1:0)| * 100
  successfulPattern: boolean;
  liquidityGenerated: number;
  userParticipationGenerated: number;
  profitabilityScore: number;
}

export interface AgentMemory {
  records: AgentMemoryRecord[];
  averageAccuracy: number;       // Agent Accuracy Index
  totalCorrect: number;
  totalResolved: number;
  reputationScore: number;       // Agent Reputation Index
  economicImpactIndex: number;   // Agent Economic Impact Index
}

let dbInstance: any = null;
let memoryCache: Record<string, AgentMemory> = {};

function initDatabase() {
  const sqlite3 = require("sqlite3").verbose();
  const dbPath = process.env.DATABASE_PATH || path.join(process.cwd(), "astra_swarm_v2.db");
  dbInstance = new sqlite3.Database(dbPath);
  console.log(`[SQLite Database] 🗄️ Connected to structured persistence layer at: \${dbPath}`);

  dbInstance.serialize(() => {
    dbInstance.run(`
      CREATE TABLE IF NOT EXISTS agent_records (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        agent_name TEXT,
        prediction_title TEXT UNIQUE,
        category TEXT,
        initial_confidence INTEGER,
        initial_odds REAL,
        outcome INTEGER,
        settlement_timestamp INTEGER,
        signals_used TEXT,
        calibration_error INTEGER,
        successful_pattern INTEGER,
        liquidity_generated REAL,
        user_participation_generated INTEGER,
        profitability_score REAL
      )
    `);

    dbInstance.run(`
      CREATE TABLE IF NOT EXISTS agent_aggregates (
        agent_name TEXT PRIMARY KEY,
        average_accuracy INTEGER,
        total_correct INTEGER,
        total_resolved INTEGER,
        reputation_score REAL,
        economic_impact_index REAL
      )
    `);

    hydrateCacheFromSQLite();
  });
}

function hydrateCacheFromSQLite() {
  dbInstance.all("SELECT * FROM agent_aggregates", (err: any, aggregates: any[]) => {
    if (err) return;
    
    aggregates.forEach(agg => {
      memoryCache[agg.agent_name] = {
        records: [],
        averageAccuracy: agg.average_accuracy,
        totalCorrect: agg.total_correct,
        totalResolved: agg.total_resolved,
        reputationScore: agg.reputation_score || 50,
        economicImpactIndex: agg.economic_impact_index || 0
      };
    });

    dbInstance.all("SELECT * FROM agent_records ORDER BY id DESC", (err: any, rows: any[]) => {
      if (err) return;
      
      rows.forEach(row => {
        if (!memoryCache[row.agent_name]) {
          memoryCache[row.agent_name] = { 
            records: [], averageAccuracy: 80, totalCorrect: 10, totalResolved: 12,
            reputationScore: 50, economicImpactIndex: 0
          };
        }
        memoryCache[row.agent_name].records.push({
          predictionTitle: row.prediction_title,
          category: row.category,
          initialConfidence: row.initial_confidence,
          initialOdds: row.initial_odds,
          outcome: row.outcome === null ? null : (row.outcome === 1),
          settlementTimestamp: row.settlement_timestamp || undefined,
          signalsUsed: JSON.parse(row.signals_used || "[]"),
          calibrationError: row.calibration_error || undefined,
          successfulPattern: row.successful_pattern === 1,
          liquidityGenerated: row.liquidity_generated || 0,
          userParticipationGenerated: row.user_participation_generated || 0,
          profitabilityScore: row.profitability_score || 0
        });
      });
    });
  });
}

initDatabase();

export function loadAllAgentMemories(): Record<string, AgentMemory> {
  return memoryCache;
}

export function saveAllAgentMemories(memories: Record<string, AgentMemory>): void {
  memoryCache = memories;
  
  if (!dbInstance) return;

  dbInstance.serialize(() => {
    Object.entries(memories).forEach(([agentName, mem]) => {
      dbInstance.run(`
        INSERT OR REPLACE INTO agent_aggregates (
          agent_name, average_accuracy, total_correct, total_resolved, 
          reputation_score, economic_impact_index
        )
        VALUES (?, ?, ?, ?, ?, ?)
      `, agentName, mem.averageAccuracy, mem.totalCorrect, mem.totalResolved, mem.reputationScore, mem.economicImpactIndex);
      
      mem.records.forEach(rec => {
        dbInstance.run(`
          INSERT OR REPLACE INTO agent_records (
            agent_name, prediction_title, category, initial_confidence, 
            initial_odds, outcome, settlement_timestamp, signals_used, 
            calibration_error, successful_pattern, liquidity_generated, 
            user_participation_generated, profitability_score
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `,
          agentName,
          rec.predictionTitle,
          rec.category,
          rec.initialConfidence,
          rec.initialOdds,
          rec.outcome === null ? null : (rec.outcome ? 1 : 0),
          rec.settlementTimestamp || null,
          JSON.stringify(rec.signalsUsed),
          rec.calibrationError || null,
          rec.successfulPattern ? 1 : 0,
          rec.liquidityGenerated,
          rec.userParticipationGenerated,
          rec.profitabilityScore
        );
      });
    });
  });
}

export function recordPredictionMemory(
  agentName: string,
  title: string,
  category: string,
  confidence: number,
  odds: number,
  signals: string[]
): void {
  const memories = loadAllAgentMemories();
  if (!memories[agentName]) {
    memories[agentName] = { 
      records: [], averageAccuracy: 80, totalCorrect: 10, totalResolved: 12,
      reputationScore: 50, economicImpactIndex: 0
    };
  }

  memories[agentName].records.unshift({
    predictionTitle: title,
    category,
    initialConfidence: confidence,
    initialOdds: odds,
    outcome: null,
    signalsUsed: signals,
    successfulPattern: false,
    liquidityGenerated: 0,
    userParticipationGenerated: 0,
    profitabilityScore: 0
  });

  saveAllAgentMemories(memories);
}

export function recordResolutionMemory(
  agentName: string, 
  title: string, 
  outcome: boolean,
  liquidity: number = 0,
  users: number = 0
): void {
  const memories = loadAllAgentMemories();
  const agentMem = memories[agentName];
  if (!agentMem) return;

  const record = agentMem.records.find(r => r.predictionTitle === title && r.outcome === null);
  if (!record) return;

  record.outcome = outcome;
  record.settlementTimestamp = Date.now();
  record.liquidityGenerated = liquidity;
  record.userParticipationGenerated = users;

  const expectedProb = record.initialConfidence / 100;
  const actualProb = outcome ? 1.0 : 0.0;
  record.calibrationError = Math.round(Math.abs(expectedProb - actualProb) * 100);

  const isCorrect = (record.initialConfidence > 50) === outcome;
  record.successfulPattern = isCorrect;

  // Profitability Score based on correct prediction and liquidity generated
  record.profitabilityScore = isCorrect ? (liquidity * 0.05) : -(liquidity * 0.05);

  agentMem.totalResolved = agentMem.records.filter(r => r.outcome !== null).length + 10;
  const pastCorrectCount = agentMem.records.filter(r => r.outcome !== null && r.successfulPattern).length;
  
  const baseCorrectOffsets: Record<string, number> = { MacroAgent: 12, SocialAgent: 9, SportsAgent: 11, RiskAgent: 15 };
  agentMem.totalCorrect = pastCorrectCount + (baseCorrectOffsets[agentName] || 10);
  
  agentMem.averageAccuracy = Math.round((agentMem.totalCorrect / agentMem.totalResolved) * 100);

  // Economic Impact Index = Sum of all liquidity generated by agent
  agentMem.economicImpactIndex = agentMem.records.reduce((sum, r) => sum + r.liquidityGenerated, 0);

  // Reputation Score = (Accuracy * 0.5) + (Normalized Economic Impact * 0.3) + (Calibration * 0.2)
  const avgCalibration = agentMem.records.filter(r => r.outcome !== null).reduce((sum, r) => sum + (r.calibrationError || 0), 0) / Math.max(1, agentMem.totalResolved - 10);
  const calibrationScore = Math.max(0, 100 - avgCalibration);
  
  // Normalize impact to roughly 0-100 scale (assume 1000 liquidity = 100 score for this calculation)
  const impactScore = Math.min(100, (agentMem.economicImpactIndex / 1000) * 100);

  agentMem.reputationScore = Math.round((agentMem.averageAccuracy * 0.5) + (impactScore * 0.3) + (calibrationScore * 0.2));

  saveAllAgentMemories(memories);
}

export function adjustConfidenceViaMemory(
  agentName: string,
  baseConfidence: number,
  currentSignals: string[]
): { adjustedConfidence: number; memoryFactor: number; rationale: string } {
  const memories = loadAllAgentMemories();
  const agentMem = memories[agentName];
  if (!agentMem || agentMem.records.length === 0) {
    return { adjustedConfidence: baseConfidence, memoryFactor: 1.0, rationale: "Initial swarm baseline calibration." };
  }

  const resolved = agentMem.records.filter(r => r.outcome !== null);
  const recent = resolved.slice(0, 5);
  
  if (recent.length === 0) {
    return { adjustedConfidence: baseConfidence, memoryFactor: 1.0, rationale: "Initial calibration baseline loaded." };
  }

  const correctCount = recent.filter(r => r.successfulPattern).length;
  const recentAccuracy = (correctCount / recent.length);

  const avgCalibrationError = recent.reduce((sum, r) => sum + (r.calibrationError || 0), 0) / recent.length;

  let adjustment = 0;
  let rationale = "";

  // Adjust via Reputation Score
  if (agentMem.reputationScore > 80) {
    adjustment += 5;
    rationale += `High institutional reputation (Score: \${agentMem.reputationScore}) boosts confidence. `;
  } else if (agentMem.reputationScore < 40) {
    adjustment -= 8;
    rationale += `Poor institutional reputation (Score: \${agentMem.reputationScore}) penalizes confidence. `;
  }

  if (recentAccuracy >= 0.8) {
    adjustment += 3;
    rationale += `High recent swarm accuracy (+\${(recentAccuracy * 100).toFixed(0)}%) reinforces. `;
  }

  if (avgCalibrationError > 40) {
    adjustment -= 4;
    rationale += `High cognitive drift (\${avgCalibrationError.toFixed(0)}%) tempers output. `;
  }

  let patternFound = false;
  currentSignals.forEach(sig => {
    const historicalSuccess = resolved.some(r => r.signalsUsed.includes(sig.toLowerCase()) && r.successfulPattern);
    if (historicalSuccess) patternFound = true;
  });

  if (patternFound) {
    adjustment += 3;
    rationale += `Historical signal patterns recognized (+3%).`;
  }

  const adjustedConfidence = Math.max(10, Math.min(98, Math.round(baseConfidence + adjustment)));
  const memoryFactor = Number((adjustedConfidence / baseConfidence).toFixed(2)) || 1.0;

  return { adjustedConfidence, memoryFactor, rationale };
}
