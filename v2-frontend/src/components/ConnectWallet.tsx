'use client';

import { useAccount, useConnect, useDisconnect } from 'wagmi';

export function ConnectWallet() {
  const { address, isConnected } = useAccount();
  const { connectors, connect } = useConnect();
  const { disconnect } = useDisconnect();

  if (isConnected) {
    return (
      <div className="flex items-center gap-4 bg-white/5 border border-white/10 px-4 py-2 rounded-xl backdrop-blur-md">
        <span className="text-xs font-mono text-primary/80">
          {address?.slice(0, 6)}...{address?.slice(-4)}
        </span>
        <button
          onClick={() => disconnect()}
          className="text-xs font-bold text-white hover:text-red-400 transition-colors uppercase tracking-wider"
        >
          Disconnect
        </button>
      </div>
    );
  }

  return (
    <div className="flex gap-2">
      {connectors.map((connector) => (
        <button
          key={connector.uid}
          onClick={() => connect({ connector })}
          className="bg-primary/20 hover:bg-primary/30 border border-primary/40 text-primary font-bold text-xs px-6 py-2 rounded-xl transition-all uppercase tracking-wider"
        >
          Connect {connector.name}
        </button>
      ))}
    </div>
  );
}
