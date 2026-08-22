// ============================================================
// StellarMesh — TopBar (Swiss × Claymorphism)
// ============================================================
import { WifiOff, Wifi, RefreshCw } from 'lucide-react';
import { useAppStore, useIsOffline } from '../../store/app.store';

export function TopBar() {
  const isOffline = useIsOffline();
  const networkState = useAppStore((s) => s.state);
  const latestLedger = useAppStore((s) => s.latestLedger);
  const rpcLatency = useAppStore((s) => s.rpcLatencyMs);

  return (
    <>
      {/* Offline Banner */}
      {isOffline && (
        <div className="offline-banner">
          <WifiOff className="w-3.5 h-3.5" />
          <span>OFFLINE MODE — Vouchers will settle when connection returns.</span>
        </div>
      )}

      {/* Online status chip */}
      {!isOffline && networkState === 'ONLINE' && (
        <div
          className="flex items-center gap-3 px-5 py-2.5"
          style={{
            background: 'rgba(255,255,255,0.6)',
            backdropFilter: 'blur(10px)',
            borderBottom: '1px solid rgba(196,181,253,0.25)',
          }}
        >
          <div className="flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-[#36d4a7] animate-pulse-slow" />
            <span className="text-xs font-700 text-[#1eb88c] font-bold">ONLINE</span>
          </div>
          {latestLedger && (
            <span className="text-xs font-mono text-[#8888a8]">
              Ledger #{latestLedger.toLocaleString()}
            </span>
          )}
          {rpcLatency && (
            <span className="text-xs text-[#8888a8]">{rpcLatency}ms</span>
          )}
          <Wifi className="w-3.5 h-3.5 text-[#36d4a7] ml-auto" />
        </div>
      )}

      {networkState === 'RECONNECTING' && (
        <div
          className="flex items-center gap-2 px-5 py-2.5"
          style={{
            background: 'rgba(255,255,255,0.6)',
            borderBottom: '1px solid rgba(196,181,253,0.25)',
          }}
        >
          <RefreshCw className="w-3.5 h-3.5 animate-spin text-[#5b8def]" />
          <span className="text-xs font-bold text-[#5b8def]">RECONNECTING...</span>
        </div>
      )}
    </>
  );
}
