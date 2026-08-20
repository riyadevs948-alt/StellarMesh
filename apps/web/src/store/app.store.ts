// ============================================================
// StellarMesh — Global Zustand Store
// ============================================================
import { create } from 'zustand';
import { subscribeWithSelector } from 'zustand/middleware';
import type {
  WalletSession, NetworkState, Channel, Voucher,
} from '@stellar-mesh/shared';

interface WalletState {
  session: WalletSession | null;
  isConnecting: boolean;
  balance: string | null; // XLM, null = not loaded
  balanceLoading: boolean;
  setSession: (session: WalletSession | null) => void;
  setConnecting: (v: boolean) => void;
  setBalance: (b: string | null) => void;
  setBalanceLoading: (v: boolean) => void;
  disconnect: () => void;
}

interface NetworkStateStore {
  state: NetworkState;
  rpcHealthy: boolean;
  latestLedger: number | null;
  latestLedgerTimestamp: string | null;
  rpcLatencyMs: number | null;
  isSimulatingOffline: boolean; // app-level offline simulation for demo
  setState: (s: NetworkState) => void;
  setRpcHealthy: (v: boolean) => void;
  setLatestLedger: (n: number, ts: string) => void;
  setLatencyMs: (ms: number) => void;
  setSimulatingOffline: (v: boolean) => void;
}

interface ChannelStore {
  channels: Channel[];
  activeChannelId: string | null;
  setChannels: (cs: Channel[]) => void;
  upsertChannel: (c: Channel) => void;
  setActiveChannelId: (id: string | null) => void;
}

interface VoucherStore {
  vouchers: Voucher[];
  setVouchers: (vs: Voucher[]) => void;
  upsertVoucher: (v: Voucher) => void;
}

type AppStore = WalletState & NetworkStateStore & ChannelStore & VoucherStore;

export const useAppStore = create<AppStore>()(
  subscribeWithSelector((set, get) => ({
    // ── Wallet ──────────────────────────────────────
    session: null,
    isConnecting: false,
    balance: null,
    balanceLoading: false,
    setSession: (session) => set({ session }),
    setConnecting: (v) => set({ isConnecting: v }),
    setBalance: (b) => set({ balance: b }),
    setBalanceLoading: (v) => set({ balanceLoading: v }),
    disconnect: () => set({ session: null, balance: null }),

    // ── Network ─────────────────────────────────────
    state: 'OFFLINE',
    rpcHealthy: false,
    latestLedger: null,
    latestLedgerTimestamp: null,
    rpcLatencyMs: null,
    isSimulatingOffline: false,
    setState: (s) => set({ state: s }),
    setRpcHealthy: (v) => set({ rpcHealthy: v }),
    setLatestLedger: (n, ts) => set({ latestLedger: n, latestLedgerTimestamp: ts }),
    setLatencyMs: (ms) => set({ rpcLatencyMs: ms }),
    setSimulatingOffline: (v) => set({ isSimulatingOffline: v }),

    // ── Channels ────────────────────────────────────
    channels: [],
    activeChannelId: null,
    setChannels: (cs) => set({ channels: cs }),
    upsertChannel: (c) =>
      set((s) => {
        const existing = s.channels.findIndex((x) => x.id === c.id);
        if (existing >= 0) {
          const next = [...s.channels];
          next[existing] = c;
          return { channels: next };
        }
        return { channels: [...s.channels, c] };
      }),
    setActiveChannelId: (id) => set({ activeChannelId: id }),

    // ── Vouchers ────────────────────────────────────
    vouchers: [],
    setVouchers: (vs) => set({ vouchers: vs }),
    upsertVoucher: (v) =>
      set((s) => {
        const existing = s.vouchers.findIndex((x) => x.voucherId === v.voucherId);
        if (existing >= 0) {
          const next = [...s.vouchers];
          next[existing] = v;
          return { vouchers: next };
        }
        return { vouchers: [...s.vouchers, v] };
      }),
  }))
);

// Derived selectors
export const useWallet = () => useAppStore((s) => s.session);
export const useNetworkState = () => useAppStore((s) => s.state);
export const useIsOffline = () =>
  useAppStore((s) => s.state === 'OFFLINE' || s.isSimulatingOffline);
export const useBalance = () => useAppStore((s) => s.balance);
export const useChannels = () => useAppStore((s) => s.channels);
export const useVouchers = () => useAppStore((s) => s.vouchers);
