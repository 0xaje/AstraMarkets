'use client';

import { useEffect, useState } from "react";
import { ConnectWallet } from "@/components/ConnectWallet";
import { MarketCard } from "@/components/MarketCard";
import { AgentRoster } from "@/components/AgentRoster";

export default function Home() {
  const [markets, setMarkets] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchMarkets = async () => {
      try {
        const res = await fetch('/api/agents/markets');
        if (!res.ok) throw new Error("Failed to fetch");
        const data = await res.json();
        
        if (data && data.markets) {
          const formattedMarkets = data.markets.map((m: any, index: number) => ({
            id: m.onChainId || index + 1,
            title: m.title,
            category: m.category.toUpperCase(),
            agent: m.agent || "System",
            yesOdds: m.yesOdds || 0.5,
            noOdds: m.noOdds || 0.5,
            poolSize: m.liquidityPool || 1000,
            reasoning: m.reasoning || "Data models indicate a strong correlation with recent on-chain flows.",
            confidence: m.confidence || 85
          }));
          setMarkets(formattedMarkets);
        }
      } catch (err) {
        console.error("Failed to sync markets:", err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchMarkets();
    const interval = setInterval(fetchMarkets, 15000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="flex flex-col min-h-screen bg-[#0a0a0a] text-[#ededed] font-sans selection:bg-primary/30">
      <header className="flex items-center justify-between px-6 py-4 border-b border-white/5 bg-[#0a0a0a] sticky top-0 z-50">
        <div className="flex items-center gap-3">
          <div className="w-6 h-6 rounded-sm bg-gradient-to-tr from-emerald-400 to-cyan-400"></div>
          <span className="font-bold text-lg tracking-tight">AstraMarkets</span>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 text-xs font-mono text-emerald-400 bg-emerald-400/10 px-3 py-1.5 rounded-full">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
            SOMNIA TESTNET
          </div>
          <ConnectWallet />
        </div>
      </header>

      {/* Minimal Agent Status Bar */}
      <AgentRoster />

      <main className="flex flex-1 flex-col items-center px-6 py-8 mx-auto w-full max-w-7xl">
        <div className="w-full flex justify-between items-end mb-6 border-b border-white/5 pb-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Active Markets</h1>
            <p className="text-sm text-white/50 mt-1">Trade on verified AI-generated prediction pools.</p>
          </div>
          <div className="flex gap-4 text-sm font-medium">
            <button className="text-white border-b-2 border-primary pb-1">All Markets</button>
            <button className="text-white/40 hover:text-white transition-colors pb-1">Portfolio</button>
          </div>
        </div>

        {isLoading ? (
          <div className="flex justify-center items-center py-32 text-white/40 font-mono text-sm animate-pulse">
            Syncing intelligence...
          </div>
        ) : markets.length === 0 ? (
          <div className="flex justify-center items-center py-32 text-white/40 font-mono text-sm">
            No active markets available.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 w-full">
            {markets.map(market => (
              <MarketCard key={market.id} market={market} />
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
