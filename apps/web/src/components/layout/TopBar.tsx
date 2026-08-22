// ============================================================
// Veyra — TopBar (Swiss × Claymorphism)
// ============================================================
import { WifiOff, Wifi, RefreshCw, Menu } from 'lucide-react';
import { useAppStore, useIsOffline } from '../../store/app.store';

export function TopBar({ onMenuClick }: { onMenuClick?: () => void }) {
  const isOffline = useIsOffline();
  const networkState = useAppStore((s) => s.state);
  const latestLedger = useAppStore((s) => s.latestLedger);
  const rpcLatency = useAppStore((s) => s.rpcLatencyMs);

  return (
    <>
      {/* Offline Banner */}
      {isOffline && (
        <div className="offline-banner w-full">
          <WifiOff className="w-3.5 h-3.5" />
          <span>OFFLINE MODE — Vouchers will settle when connection returns.</span>
        </div>
      )}

      {/* Top Bar Area */}
      <div
        className="flex items-center justify-between px-4 md:px-6 py-3 w-full"
        style={{
          background: 'rgba(255,255,255,0.7)',
          backdropFilter: 'blur(12px)',
          borderBottom: '1px solid rgba(196,181,253,0.3)',
        }}
      >
        <div className="flex items-center gap-3">
          {/* Hamburger Menu (Mobile Only) */}
          <button 
            className="md:hidden p-2 -ml-2 text-[#4a4a6a] hover:text-[#1a1a2e] rounded-lg hover:bg-[#e8e2ff]"
            onClick={onMenuClick}
            aria-label="Open menu"
          >
            <Menu className="w-5 h-5" />
          </button>
          
          <span className="font-black text-lg text-[#1a1a2e] md:hidden">SM</span>
        </div>

        <div className="flex items-center gap-4">
          {!isOffline && networkState === 'ONLINE' && (
            <div className="flex items-center gap-3 bg-white/50 px-3 py-1.5 rounded-full border border-[#ddd6fe]">
              <div className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-[#1eb88c] animate-pulse-slow shadow-[0_0_8px_#1eb88c]" />
                <span className="text-xs font-bold text-[#1eb88c] hidden sm:inline">ONLINE</span>
              </div>
              {latestLedger && (
                <span className="text-xs font-mono text-[#8888a8] hidden md:inline border-l border-[#ddd6fe] pl-3">
                  Ledger #{latestLedger.toLocaleString()}
                </span>
              )}
              {rpcLatency && (
                <span className="text-xs font-medium text-[#8888a8] hidden sm:inline border-l border-[#ddd6fe] pl-3">
                  {rpcLatency}ms
                </span>
              )}
              <Wifi className="w-3.5 h-3.5 text-[#1eb88c]" />
            </div>
          )}

          {networkState === 'RECONNECTING' && (
            <div className="flex items-center gap-2 bg-white/50 px-3 py-1.5 rounded-full border border-[#ddd6fe]">
              <RefreshCw className="w-3.5 h-3.5 animate-spin text-[#5b8def]" />
              <span className="text-xs font-bold text-[#5b8def]">RECONNECTING...</span>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
