'use client';

export function AgentRoster() {
  const agents = [
    { name: 'Crypto Core', status: 'Active' },
    { name: 'Macro Core', status: 'Active' },
    { name: 'Sports Core', status: 'Active' },
    { name: 'Risk Engine', status: 'Monitoring' }
  ];

  return (
    <div className="w-full bg-[#111] border-b border-white/5 py-2 px-6 flex justify-between items-center text-[11px] font-mono uppercase tracking-widest text-white/50">
      <div className="flex items-center gap-6">
        <span className="font-bold text-white/70">Swarm Status:</span>
        <div className="flex gap-4">
          {agents.map((agent) => (
            <div key={agent.name} className="flex items-center gap-1.5">
              <span className={`w-1.5 h-1.5 rounded-full ${agent.status === 'Active' ? 'bg-emerald-400' : 'bg-amber-400'}`}></span>
              {agent.name}
            </div>
          ))}
        </div>
      </div>
      <div className="flex items-center gap-2">
        <span className="text-emerald-400">●</span> Intelligence Syncing
      </div>
    </div>
  );
}
