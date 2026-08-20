// ============================================================
// StellarMesh — useWalletInit Hook
// Restores wallet session from IndexedDB on app boot,
// then auto-loads balance and channels.
// ============================================================
import { useEffect } from 'react';
import { useAppStore } from '../store/app.store';
import { WalletSessionRepo, ChannelRepo, VoucherRepo } from '../lib/db';
import { getAccountBalance } from '../lib/stellar';
import { getConnectedAddress } from '@stellar-mesh/stellar-client';
import { startSettlementEngine } from '../lib/settlement.engine';

export function useWalletInit() {
  const setSession = useAppStore((s) => s.setSession);
  const setBalance = useAppStore((s) => s.setBalance);
  const setBalanceLoading = useAppStore((s) => s.setBalanceLoading);
  const setChannels = useAppStore((s) => s.setChannels);
  const setVouchers = useAppStore((s) => s.setVouchers);

  useEffect(() => {
    void (async () => {
      // 1. Restore session from IndexedDB
      const sessions = await WalletSessionRepo.getAll();
      if (sessions.length === 0) return;

      const latest = sessions.sort(
        (a, b) => new Date(b.connectedAt).getTime() - new Date(a.connectedAt).getTime()
      )[0];

      // 2. Verify Freighter still has access to this address
      let currentAddr: string | null = null;
      try {
        currentAddr = await getConnectedAddress();
      } catch {}

      if (!currentAddr || currentAddr !== latest.address) {
        // Freighter was disconnected; don't restore stale session
        return;
      }

      setSession({ ...latest, lastActive: new Date().toISOString() });

      // 3. Load balance (non-blocking)
      setBalanceLoading(true);
      getAccountBalance(latest.address)
        .then(setBalance)
        .catch(() => setBalance(null))
        .finally(() => setBalanceLoading(false));

      // 4. Load channels & vouchers from IDB
      const [channels, vouchers] = await Promise.all([
        ChannelRepo.getAll(),
        VoucherRepo.getAll(),
      ]);
      setChannels(channels);
      setVouchers(vouchers);

      // 5. Start settlement engine (will only run when ONLINE)
      startSettlementEngine();
    })();

    return () => {
      // Settlement engine cleanup is handled by its own stop function
    };
  }, []);
}
