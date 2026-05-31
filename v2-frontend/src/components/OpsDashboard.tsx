'use client';

import { useEffect, useState, useRef } from 'react';

interface LogEntry {
  id: number;
  timestamp: string;
  agent: string;
  level: string;
  message: string;
}

export function OpsDashboard() {
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [connected, setConnected] = useState(false);
  const logsEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Connect to the Server-Sent Events endpoint
    const eventSource = new EventSource('/api/events');

    eventSource.onopen = () => {
      setConnected(true);
    };

    eventSource.addEventListener('AGENT_LOG', (e) => {
      try {
        const data = JSON.parse(e.data);
        const newLog: LogEntry = {
          id: Date.now() + Math.random(),
          timestamp: new Date().toLocaleTimeString([], { hour12: false }),
          agent: data.agentName || 'SYSTEM',
          level: data.level || 'INFO',
          message: data.message
        };

        setLogs(prev => {
          const updated = [...prev, newLog];
          return updated.slice(-50); // Keep last 50 logs
        });
      } catch (err) {
        console.error("Failed to parse log", err);
      }
    });

    eventSource.onerror = () => {
      setConnected(false);
    };

    return () => {
      eventSource.close();
    };
  }, []);

  // Auto-scroll to bottom
  useEffect(() => {
    if (logsEndRef.current) {
      logsEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [logs]);

  const getLogColor = (agent: string, level: string) => {
    if (level === 'warn') return 'text-yellow-400';
    if (level === 'error') return 'text-red-400';
    if (agent === 'MacroCore' || agent === 'MacroAgent') return 'text-purple-400';
    if (agent === 'CryptoCore' || agent === 'CryptoAgent') return 'text-cyan-400';
    if (agent === 'SportsCore' || agent === 'SportsAgent') return 'text-primary';
    return 'text-white/70';
  };

  return (
    <div className="w-full flex flex-col bg-black/80 border border-white/10 rounded-2xl overflow-hidden backdrop-blur-md">
      {/* Header */}
      <div className="flex justify-between items-center px-4 py-3 border-b border-white/10 bg-white/5">
        <h3 className="font-mono text-sm font-bold flex items-center gap-2">
          <span className="material-symbols-outlined text-[16px]">terminal</span>
          Astra Swarm Terminal
        </h3>
        <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest font-mono">
          {connected ? (
            <span className="text-emerald-400 flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span> SSE CONNECTED
            </span>
          ) : (
            <span className="text-red-400 flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-red-400"></span> SSE DISCONNECTED
            </span>
          )}
        </div>
      </div>

      {/* Terminal Output */}
      <div className="flex flex-col p-4 h-[300px] overflow-y-auto font-mono text-[11px] md:text-xs tracking-tight space-y-1">
        {logs.length === 0 ? (
          <div className="text-white/30 italic flex items-center h-full justify-center">
            Awaiting consciousness stream from backend...
          </div>
        ) : (
          logs.map((log) => (
            <div key={log.id} className="flex gap-3 hover:bg-white/5 px-2 py-1 rounded transition-colors break-words">
              <span className="text-white/30 shrink-0">[{log.timestamp}]</span>
              <span className={`shrink-0 w-24 font-bold ${getLogColor(log.agent, log.level)}`}>
                {log.agent.toUpperCase()}
              </span>
              <span className="text-white/80">{log.message}</span>
            </div>
          ))
        )}
        <div ref={logsEndRef} />
      </div>
    </div>
  );
}
