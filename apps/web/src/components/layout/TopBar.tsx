// ============================================================
// StellarMesh — Top Bar (header) with offline banner
// ============================================================
import { Wallet, RefreshCw } from 'lucide-react';
import { useAppStore, useIsOffline } from '../store/app.store';

interface TopBarProps {
  title?: string;
}

export function TopBar({ title }: TopBarProps) {
  const isOffline = useIsOffline();
  const networkState = useAppStore((s) => s.state);
  const latestLedger = useAppStore((s) => s.latestLedger);

  return (
    <>
      {/* Offline banner — matches reference amber bar */}
      {isOffline && (
        <div className="offline-banner">
          <span className="w-2 h-2 rounded-full bg-accent-yellow animate-pulse-slow" />
          <span>OFFLINE MODE — Payments will settle when connection returns.</span>
        </div>
      )}

      {/* Page header row */}
      {title && (
        <div className="flex items-center justify-between px-6 py-4 border-b border-border-subtle">
          <h1 className="text-xl font-semibold text-text-primary">{title}</h1>
          <div className="flex items-center gap-3 text-text-muted">
            {!isOffline && networkState === 'ONLINE' && latestLedger && (
              <span className="text-xs font-mono">
                Ledger: {latestLedger.toLocaleString()}
              </span>
            )}
          </div>
        </div>
      )}
    </>
  );
}
