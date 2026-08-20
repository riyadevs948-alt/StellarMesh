// ============================================================
// StellarMesh — Dashboard Page
// Matches reference: wallet card, network status, channel overview, activity feed
// ============================================================
import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Plus, Zap, WifiOff, QrCode, RefreshCw,
  TrendingUp, Clock, CheckCircle2, AlertTriangle,
  Wifi, Activity,
} from 'lucide-react';
import { useAppStore, useIsOffline, useBalance, useWallet, useChannels } from '../store/app.store';
import { getAccountBalance, explorerTxUrl } from '../lib/stellar';
import { ChannelRepo, VoucherRepo } from '../lib/db';
import { Skeleton, EmptyState, TxHashDisplay, VoucherStatusBadge } from '../components/ui';
import { stroopsToXlm } from '@stellar-mesh/voucher-protocol';
import type { Voucher } from '@stellar-mesh/shared';
import { formatDistanceToNow } from '../lib/utils';

function WalletCard() {
  const wallet = useWallet();
  const balance = useBalance();
  const balanceLoading = useAppStore((s) => s.balanceLoading);
  const setBalance = useAppStore((s) => s.setBalance);
  const setBalanceLoading = useAppStore((s) => s.setBalanceLoading);
  const networkState = useAppStore((s) => s.state);
  const isOffline = useIsOffline();

  const refresh = async () => {
    if (!wallet || isOffline) return;
    setBalanceLoading(true);
    try {
      const b = await getAccountBalance(wallet.address);
      setBalance(b);
    } catch {
      // handled
    } finally {
      setBalanceLoading(false);
    }
  };

  const shortAddr = wallet
    ? `${wallet.address.slice(0, 4)}...${wallet.address.slice(-4)}`
    : null;

  return (
    <div className="card glow-blue col-span-2">
      <div className="flex items-start justify-between mb-4">
        <div>
          <p className="label">Wallet Balance</p>
          {balanceLoading ? (
            <Skeleton className="w-40 h-10 mt-1" />
          ) : balance !== null ? (
            <p className="text-4xl font-bold text-text-primary tracking-tight">
              {parseFloat(balance).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              <span className="text-xl text-text-secondary ml-2">XLM</span>
            </p>
          ) : (
            <p className="text-3xl font-bold text-text-muted mt-1">—</p>
          )}
        </div>
        <div className="flex items-center gap-2">
          <span className="badge badge-offline text-[10px] uppercase tracking-widest">
            {wallet?.network ?? 'TESTNET'}
          </span>
          <button
            onClick={refresh}
            disabled={isOffline || balanceLoading}
            className="btn-ghost p-2"
            aria-label="Refresh balance"
          >
            <RefreshCw className={`w-4 h-4 ${balanceLoading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {wallet ? (
        <div className="flex items-center gap-2">
          <code className="text-sm text-text-secondary font-mono">{shortAddr}</code>
          <button
            onClick={() => navigator.clipboard.writeText(wallet.address)}
            className="btn-ghost py-1 px-2 text-xs"
          >
            Copy
          </button>
        </div>
      ) : (
        <p className="text-sm text-text-muted">No wallet connected</p>
      )}
    </div>
  );
}

function NetworkStatusCard() {
  const networkState = useAppStore((s) => s.state);
  const isOffline = useIsOffline();
  const latestLedger = useAppStore((s) => s.latestLedger);
  const rpcLatency = useAppStore((s) => s.rpcLatencyMs);
  const pendingVouchers = useAppStore((s) =>
    s.vouchers.filter((v) => v.localStatus === 'PENDING_SETTLEMENT').length
  );

  return (
    <div className={`card ${isOffline ? 'border-accent-yellow/30' : 'border-accent-green/20'}`}>
      <div className="flex items-center gap-2 mb-3">
        <div className={`w-2 h-2 rounded-full ${isOffline ? 'bg-accent-yellow' : 'bg-accent-green'} animate-pulse-slow`} />
        <p className="text-sm font-semibold text-text-primary uppercase tracking-wider">
          {isOffline ? 'OFFLINE' : networkState}
        </p>
      </div>

      {isOffline ? (
        <>
          <p className="text-xs text-text-muted mb-2">Blockchain settlement unavailable</p>
          {pendingVouchers > 0 && (
            <p className="text-accent-yellow text-xs font-medium">
              {pendingVouchers} voucher{pendingVouchers !== 1 ? 's' : ''} queued
            </p>
          )}
        </>
      ) : (
        <>
          <p className="text-xs text-text-secondary mb-1">Stellar RPC Healthy</p>
          {latestLedger && (
            <p className="label mt-2">Latest Ledger</p>
          )}
          {latestLedger ? (
            <p className="text-sm font-mono text-text-primary">{latestLedger.toLocaleString()}</p>
          ) : (
            <Skeleton className="w-28 h-5 mt-1" />
          )}
          {rpcLatency && (
            <p className="text-[11px] text-text-muted mt-1">{rpcLatency}ms latency</p>
          )}
        </>
      )}
    </div>
  );
}

function QuickActions() {
  const navigate = useNavigate();
  const isOffline = useIsOffline();

  const actions = [
    { label: 'Create Channel', icon: Plus, to: '/channels/create', disabled: isOffline, accent: false },
    { label: 'Fund Channel', icon: Zap, to: '/channels', disabled: isOffline, accent: false },
    { label: 'Offline Payment', icon: WifiOff, to: '/pay', disabled: false, accent: true },
    { label: 'Scan Voucher', icon: QrCode, to: '/receive', disabled: false, accent: false },
  ] as const;

  return (
    <div className="grid grid-cols-4 gap-3">
      {actions.map(({ label, icon: Icon, to, disabled, accent }) => (
        <button
          key={label}
          onClick={() => navigate(to)}
          disabled={disabled}
          className={`card flex flex-col items-center gap-2 py-4 transition-all duration-200 cursor-pointer
            hover:border-border-medium hover:bg-bg-hover active:scale-95
            disabled:opacity-40 disabled:cursor-not-allowed
            ${accent ? 'border-accent-blue/40 bg-accent-blue/5 hover:bg-accent-blue/10' : ''}
          `}
        >
          <Icon className={`w-5 h-5 ${accent ? 'text-accent-blue' : 'text-text-secondary'}`} />
          <span className="text-xs font-medium text-text-primary text-center leading-tight">{label}</span>
        </button>
      ))}
    </div>
  );
}

function ChannelOverviewCard() {
  const channels = useChannels();
  const activeChannels = channels.filter((c) => c.status === 'ACTIVE');
  const totalLocked = activeChannels.reduce((sum, c) => sum + BigInt(c.totalDeposited), 0n);
  const totalPending = useAppStore((s) =>
    s.vouchers
      .filter((v) => v.localStatus === 'PENDING_SETTLEMENT')
      .reduce((sum, v) => sum + BigInt(v.amount), 0n)
  );

  return (
    <div className="card">
      <h3 className="text-sm font-semibold text-text-primary mb-4">Channel Overview</h3>
      <div className="space-y-3">
        <div className="flex items-center justify-between py-2 border-b border-border-subtle">
          <span className="text-sm text-text-secondary">Active Channels</span>
          <span className="text-sm font-semibold text-text-primary">{activeChannels.length}</span>
        </div>
        <div className="flex items-center justify-between py-2 border-b border-border-subtle">
          <span className="text-sm text-text-secondary">Locked Balance</span>
          <span className="text-sm font-semibold text-text-primary">
            {stroopsToXlm(totalLocked.toString())} XLM
          </span>
        </div>
        <div className="flex items-center justify-between py-2">
          <span className="text-sm text-text-secondary">Pending Settlement</span>
          <span className="text-sm font-semibold text-accent-cyan">
            {stroopsToXlm(totalPending.toString())} XLM
          </span>
        </div>
      </div>
    </div>
  );
}

function RecentActivity() {
  const vouchers = useAppStore((s) => s.vouchers.slice().sort(
    (a, b) => new Date(b.issuedAt).getTime() - new Date(a.issuedAt).getTime()
  ).slice(0, 5));
  const navigate = useNavigate();

  const getIcon = (v: Voucher) => {
    switch (v.localStatus) {
      case 'SETTLED': return <CheckCircle2 className="w-4 h-4 text-accent-green" />;
      case 'PENDING_SETTLEMENT': return <Clock className="w-4 h-4 text-accent-blue" />;
      case 'FAILED': return <AlertTriangle className="w-4 h-4 text-accent-red" />;
      default: return <Activity className="w-4 h-4 text-text-muted" />;
    }
  };

  return (
    <div className="card">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold text-text-primary">Recent Activity</h3>
        <button onClick={() => navigate('/activity')} className="btn-ghost text-xs">
          View All
        </button>
      </div>

      {vouchers.length === 0 ? (
        <div className="py-6 text-center text-text-muted text-sm">
          No recent activity yet
        </div>
      ) : (
        <div className="space-y-3">
          {vouchers.map((v) => (
            <div
              key={v.voucherId}
              onClick={() => navigate(`/vouchers/${v.voucherId}`)}
              className="flex items-center gap-3 cursor-pointer hover:bg-bg-hover rounded-lg p-2 -mx-2 transition-colors"
            >
              <div className="w-8 h-8 rounded-full bg-bg-tertiary border border-border-subtle flex items-center justify-center shrink-0">
                {getIcon(v)}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm text-text-primary font-medium truncate">
                  {v.localStatus === 'SETTLED' ? 'Voucher Settled' : 'Voucher Pending'}
                </p>
                <p className="text-xs text-text-muted">
                  {stroopsToXlm(v.amount)} XLM · {v.payer.slice(0, 8)}... → {v.payee.slice(0, 8)}...
                </p>
              </div>
              <span className="text-[11px] text-text-muted shrink-0">
                {formatDistanceToNow(new Date(v.issuedAt))}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export function DashboardPage() {
  const navigate = useNavigate();
  const wallet = useWallet();
  const isOffline = useIsOffline();
  const setVouchers = useAppStore((s) => s.setVouchers);
  const setChannels = useAppStore((s) => s.setChannels);
  const setBalance = useAppStore((s) => s.setBalance);
  const setBalanceLoading = useAppStore((s) => s.setBalanceLoading);

  // Load persisted data on mount
  useEffect(() => {
    void (async () => {
      const [vouchers, channels] = await Promise.all([
        VoucherRepo.getAll(),
        ChannelRepo.getAll(),
      ]);
      setVouchers(vouchers);
      setChannels(channels);
    })();
  }, []);

  // Load balance when wallet connects
  useEffect(() => {
    if (!wallet || isOffline) return;
    setBalanceLoading(true);
    getAccountBalance(wallet.address)
      .then(setBalance)
      .catch(() => {})
      .finally(() => setBalanceLoading(false));
  }, [wallet?.address, isOffline]);

  if (!wallet) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-6 py-20">
        <div className="text-center max-w-sm">
          <div className="w-16 h-16 rounded-2xl bg-accent-blue/10 border border-accent-blue/20 flex items-center justify-center mx-auto mb-4">
            <Zap className="w-8 h-8 text-accent-blue" />
          </div>
          <h2 className="text-2xl font-bold text-text-primary mb-2">Welcome to StellarMesh</h2>
          <p className="text-text-muted mb-6 text-sm">
            Connect your Freighter wallet to start creating offline payment channels.
          </p>
          <button onClick={() => navigate('/wallet')} className="btn-primary px-8 py-3">
            Connect Wallet
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-5 animate-fade-in">
      {/* Top row: wallet + network */}
      <div className="grid grid-cols-3 gap-4">
        <WalletCard />
        <NetworkStatusCard />
      </div>

      {/* Quick actions */}
      <QuickActions />

      {/* Bottom row: channels + activity */}
      <div className="grid grid-cols-2 gap-4">
        <ChannelOverviewCard />
        <RecentActivity />
      </div>
    </div>
  );
}
