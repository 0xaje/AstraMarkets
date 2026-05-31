'use client';

import { useState } from 'react';
import { useWriteContract, useAccount } from 'wagmi';
import { parseEther } from 'viem';

const MARKET_FACTORY_ABI = [
  {
    "inputs": [
      { "internalType": "uint256", "name": "marketId", "type": "uint256" },
      { "internalType": "bool", "name": "position", "type": "bool" }
    ],
    "name": "buyShares",
    "outputs": [],
    "stateMutability": "payable",
    "type": "function"
  }
];

const MARKET_FACTORY_ADDRESS = "0x22e9725a264B91BEfE084D0D3F66B5E13C25d07a";

interface MarketProps {
  id: number;
  title: string;
  category: string;
  agent: string;
  yesOdds: number;
  noOdds: number;
  poolSize: number;
  reasoning: string;
  confidence: number;
}

export function MarketCard({ market }: { market: MarketProps }) {
  const { isConnected } = useAccount();
  const { writeContract, isPending } = useWriteContract();
  const [tradeAmount, setTradeAmount] = useState('1.0');
  const [showInsight, setShowInsight] = useState(false);

  const handleTrade = (position: boolean) => {
    if (!isConnected) return alert('Please connect wallet first.');
    if (!tradeAmount || isNaN(Number(tradeAmount))) return;

    writeContract({
      address: MARKET_FACTORY_ADDRESS,
      abi: MARKET_FACTORY_ABI,
      functionName: 'buyShares',
      args: [BigInt(market.id), position],
      value: parseEther(tradeAmount),
    });
  };

  return (
    <div className="bg-[#111] border border-white/10 rounded-xl p-5 flex flex-col gap-4 hover:border-white/20 transition-colors w-full">
      <div className="flex justify-between items-start">
        <span className="text-[10px] font-mono uppercase tracking-widest text-primary font-bold">
          {market.category} • ID {market.id}
        </span>
      </div>

      <h3 className="text-lg font-bold text-white leading-snug">
        {market.title}
      </h3>

      {/* Simplified Odds Bar */}
      <div className="flex flex-col gap-1">
        <div className="w-full h-1.5 rounded-full bg-white/10 overflow-hidden flex">
          <div 
            className="h-full bg-primary transition-all duration-500" 
            style={{ width: `${market.yesOdds * 100}%` }}
          ></div>
        </div>
        <div className="flex justify-between text-xs font-mono text-white/50">
          <span>YES {(market.yesOdds * 100).toFixed(0)}%</span>
          <span>NO {(market.noOdds * 100).toFixed(0)}%</span>
        </div>
      </div>

      {/* Trading Interface */}
      <div className="flex items-center gap-2 mt-2">
        <input 
          type="number" 
          value={tradeAmount}
          onChange={(e) => setTradeAmount(e.target.value)}
          className="bg-black border border-white/10 rounded-lg px-3 py-2 text-sm font-mono text-white outline-none w-20 text-center"
          step="0.1"
          placeholder="STT"
        />
        <button 
          onClick={() => handleTrade(true)}
          disabled={isPending}
          className="flex-1 bg-white/5 hover:bg-white/10 text-white border border-white/10 py-2 rounded-lg font-bold text-xs transition-colors disabled:opacity-50"
        >
          Buy YES
        </button>
        <button 
          onClick={() => handleTrade(false)}
          disabled={isPending}
          className="flex-1 bg-white/5 hover:bg-white/10 text-white border border-white/10 py-2 rounded-lg font-bold text-xs transition-colors disabled:opacity-50"
        >
          Buy NO
        </button>
      </div>

      {/* Insight Toggle (Tertiary Layer) */}
      <div className="border-t border-white/5 pt-3 mt-1">
        <button 
          onClick={() => setShowInsight(!showInsight)}
          className="text-xs text-white/40 hover:text-white/80 transition-colors flex items-center gap-1 w-full"
        >
          {showInsight ? '▼ Hide Insight' : '▶ View Insight'}
          <span className="ml-auto text-[10px] font-mono bg-white/5 px-2 rounded">
            {market.confidence}% CONF
          </span>
        </button>
        
        {showInsight && (
          <div className="mt-3 p-3 bg-black/50 rounded-lg border border-white/5 text-xs text-white/60 leading-relaxed font-mono">
            <span className="text-white/40 block mb-1">[{market.agent.toUpperCase()}]</span>
            {market.reasoning}
          </div>
        )}
      </div>
    </div>
  );
}
