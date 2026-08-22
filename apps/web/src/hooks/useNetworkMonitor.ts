// ============================================================
// Veyra — Network State Machine Hook
// Combines browser connectivity + actual RPC health checks
// ============================================================
import { useEffect, useRef, useCallback } from 'react';
import { useAppStore } from '../store/app.store';
import { checkRpcHealth } from '../lib/stellar';
import { NetworkSnapshotRepo } from '../lib/db';
import type { NetworkState } from '@stellar-mesh/shared';

const RPC_CHECK_INTERVAL = 15_000; // 15 seconds
const STALE_LEDGER_THRESHOLD_MS = 60_000; // 60 seconds

function computeNetworkState(params: {
  browserOnline: boolean;
  rpcHealthy: boolean;
  latestLedgerTimestamp: string | null;
  isSimulatingOffline: boolean;
}): NetworkState {
  const { browserOnline, rpcHealthy, latestLedgerTimestamp, isSimulatingOffline } = params;

  if (isSimulatingOffline) return 'OFFLINE';
  if (!browserOnline) return 'OFFLINE';
  if (!rpcHealthy) return 'DEGRADED';

  // Check ledger freshness
  if (latestLedgerTimestamp) {
    const age = Date.now() - new Date(latestLedgerTimestamp).getTime();
    if (age > STALE_LEDGER_THRESHOLD_MS) return 'DEGRADED';
  }

  return 'ONLINE';
}

export function useNetworkMonitor() {
  // Use a ref to the store so we never capture stale closures
  const isSimulatingOffline = useAppStore((s) => s.isSimulatingOffline);

  const intervalRef = useRef<number | null>(null);
  const isCheckingRef = useRef(false);

  const doHealthCheck = useCallback(async () => {
    if (isCheckingRef.current) return;
    isCheckingRef.current = true;

    // Read actions directly from store to avoid stale closure issues
    const { setState, setRpcHealthy, setLatestLedger, setLatencyMs, isSimulatingOffline: simOffline } =
      useAppStore.getState();

    const browserOnline = navigator.onLine;

    if (!browserOnline) {
      setRpcHealthy(false);
      setState('OFFLINE');
      isCheckingRef.current = false;
      return;
    }

    if (simOffline) {
      setState('OFFLINE');
      isCheckingRef.current = false;
      return;
    }

    setState('RECONNECTING');

    const result = await checkRpcHealth();

    setRpcHealthy(result.healthy);
    if (result.latencyMs) setLatencyMs(result.latencyMs);
    if (result.latestLedger && result.latestLedgerTimestamp) {
      setLatestLedger(result.latestLedger, result.latestLedgerTimestamp);
    }

    const newState = computeNetworkState({
      browserOnline,
      rpcHealthy: result.healthy,
      latestLedgerTimestamp: result.latestLedgerTimestamp,
      isSimulatingOffline: simOffline,
    });

    setState(newState);

    // Persist snapshot
    try {
      await NetworkSnapshotRepo.save({
        id: `snap-${Date.now()}`,
        capturedAt: new Date().toISOString(),
        browserOnline,
        rpcHealthy: result.healthy,
        latestLedger: result.latestLedger ?? undefined,
        latestLedgerTimestamp: result.latestLedgerTimestamp ?? undefined,
        rpcLatencyMs: result.latencyMs,
        networkState: newState,
      });
    } catch {
      // Ignore snapshot errors
    }

    isCheckingRef.current = false;
  }, []);

  useEffect(() => {
    // Initial check
    void doHealthCheck();

    // Scheduled checks
    intervalRef.current = window.setInterval(() => {
      void doHealthCheck();
    }, RPC_CHECK_INTERVAL);

    // Browser online/offline events
    const handleOnline = () => void doHealthCheck();
    const handleOffline = () => {
      const { setRpcHealthy, setState } = useAppStore.getState();
      setRpcHealthy(false);
      setState('OFFLINE');
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      if (intervalRef.current !== null) clearInterval(intervalRef.current);
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [doHealthCheck]);
}
