// ============================================================
// StellarMesh — Dashboard Page (Swiss × Claymorphism)
// ============================================================
import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Plus, Zap, QrCode, RefreshCw,
  Clock, CheckCircle2, AlertTriangle, Activity,
  ArrowRightLeft, ArrowDownToLine, ArrowUpFromLine
} from 'lucide-react';
import { useAppStore, useIsOffline, useBalance, useWallet, useChannels } from '../store/app.store';
import { getAccountBalance } from '../lib/stellar';
import { ChannelRepo, VoucherRepo } from '../lib/db';
import { Skeleton } from '../components/ui';
import { stroopsToXlm } from '@stellar-mesh/voucher-protocol';
import type { Voucher } from '@stellar-mesh/shared';
import { formatDistanceToNow } from '../lib/utils';

function WalletCard() {
  const wallet = useWallet();
  const balance = useBalance();
  const balanceLoading = useAppStore((s) => s.balanceLoading);
  const setBalance = useAppStore((s) => s.setBalance);
  const setBalanceLoading = useAppStore((s) => s.setBalanceLoading);
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

  return (
    <div className="clay-card-blue p-6 flex flex-col justify-between h-full relative overflow-hidden">
      {/* Decorative background shapes */}
      <div className="absolute -top-10 -right-10 w-40 h-40 bg-white opacity-10 rounded-full blur-2xl pointer-events-none"></div>
      
      <div className="flex items-start justify-between relative z-10">
        <div>
          <p className="text-white/80 font-bold text-xs uppercase tracking-widest mb-2">Total Balance</p>
          {balanceLoading ? (
            <Skeleton className="w-32 h-10 bg-white/20" />
          ) : balance !== null ? (
            <div className="flex items-baseline gap-2">
              <span className="text-4xl font-black tracking-tight">
                ${(parseFloat(balance) * 0.12).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </span>
              <span className="text-xl font-bold text-white/80">USD</span>
            </div>
          ) : (
            <p className="text-3xl font-black opacity-50">—</p>
          )}
        </div>
        <div className="w-12 h-12 rounded-2xl bg-white/20 backdrop-blur-md flex items-center justify-center shadow-inner-clay">
          <span className="font-bold text-lg">$</span>
        </div>
      </div>

      <div className="flex gap-8 mt-8 relative z-10">
        <div>
          <p className="text-white/80 text-[11px] font-bold uppercase tracking-wider mb-1">Available</p>
          <p className="font-bold">{balance ? (parseFloat(balance) * 0.12).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '0.00'}</p>
        </div>
        <div>
          <p className="text-white/80 text-[11px] font-bold uppercase tracking-wider mb-1">Locked</p>
          <p className="font-bold">0.00</p>
        </div>
      </div>
    </div>
  );
}

function NetworkStatusCard() {
  const isOffline = useIsOffline();
  
  if (isOffline) {
    return (
      <div className="clay-card p-6 h-full flex flex-col justify-between" style={{ background: 'linear-gradient(145deg, #fef3c7 0%, #fde68a 100%)', boxShadow: '0 8px 0 0 #d97706, 0 14px 28px rgba(251,191,36,0.3), inset 0 1px 0 rgba(255,255,255,0.6)' }}>
         <div>
          <p className="text-[#d97706] font-bold text-xs uppercase tracking-widest mb-2">Network Health</p>
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 rounded-full bg-[#f59e0b] animate-pulse-slow shadow-[0_0_8px_#f59e0b]"></span>
            <span className="text-2xl font-black text-[#b45309] tracking-tight">Offline</span>
          </div>
        </div>
        <div className="mt-4">
           <p className="text-sm font-bold text-[#b45309]">Payments queued locally.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="clay-card-mint p-6 h-full flex flex-col justify-between relative overflow-hidden">
      <div className="absolute -bottom-10 -right-10 w-40 h-40 bg-white opacity-10 rounded-full blur-xl pointer-events-none"></div>
      
      <div className="relative z-10">
        <p className="text-white/80 font-bold text-xs uppercase tracking-widest mb-2">Network Health</p>
        <div className="flex items-center gap-2 mb-6">
          <span className="w-3 h-3 rounded-full bg-[#a7f3d0] animate-pulse-slow shadow-[0_0_8px_#a7f3d0]"></span>
          <span className="text-2xl font-black tracking-tight">Optimal</span>
        </div>
      </div>

      <div className="relative z-10">
        <p className="text-white/80 text-[11px] font-bold uppercase tracking-wider mb-1">Uptime</p>
        <p className="font-black text-2xl">99.98%</p>
      </div>
      
      {/* Decorative chart line */}
      <svg className="absolute bottom-6 right-6 w-24 h-12 opacity-50" viewBox="0 0 100 50">
        <path d="M0 40 L20 40 L30 35 L40 45 L50 20 L60 25 L70 10 L80 15 L90 5 L100 0" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </div>
  );
}

function QuickActions() {
  const navigate = useNavigate();
  const isOffline = useIsOffline();

  const actions = [
    { label: 'Transfer', icon: ArrowRightLeft, to: '/pay', accent: 'red', disabled: false },
    { label: 'Swap', icon: RefreshCw, to: '/', accent: 'red', disabled: isOffline },
    { label: 'Deposit', icon: ArrowDownToLine, to: '/', accent: 'blue', disabled: isOffline },
    { label: 'Withdraw', icon: ArrowUpFromLine, to: '/', accent: 'mint', disabled: isOffline },
  ];

  return (
    <div className="clay-card p-4">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {actions.map((action, i) => (
          <button
            key={i}
            onClick={() => navigate(action.to)}
            disabled={action.disabled}
            className={`
              flex items-center justify-center gap-2 py-4 rounded-[20px] font-bold text-[15px]
              transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed
              ${action.accent === 'red' ? 'bg-gradient-to-b from-[#f05060] to-[#e63946] text-white shadow-[0_6px_0_0_#c1121f,0_10px_20px_rgba(230,57,70,0.3),inset_0_1px_0_rgba(255,255,255,0.25)] hover:translate-y-[-2px] hover:shadow-[0_8px_0_0_#c1121f,0_14px_24px_rgba(230,57,70,0.35),inset_0_1px_0_rgba(255,255,255,0.25)] active:translate-y-[4px] active:shadow-[0_2px_0_0_#c1121f,0_4px_10px_rgba(230,57,70,0.25),inset_0_1px_0_rgba(255,255,255,0.25)]' : ''}
              ${action.accent === 'blue' ? 'bg-gradient-to-b from-[#6fa3f7] to-[#5b8def] text-white shadow-[0_6px_0_0_#3a6fd4,0_10px_20px_rgba(91,141,239,0.3),inset_0_1px_0_rgba(255,255,255,0.25)] hover:translate-y-[-2px] hover:shadow-[0_8px_0_0_#3a6fd4,0_14px_24px_rgba(91,141,239,0.35),inset_0_1px_0_rgba(255,255,255,0.25)] active:translate-y-[4px] active:shadow-[0_2px_0_0_#3a6fd4,0_4px_10px_rgba(91,141,239,0.25),inset_0_1px_0_rgba(255,255,255,0.25)]' : ''}
              ${action.accent === 'mint' ? 'bg-gradient-to-b from-[#4de0b5] to-[#36d4a7] text-white shadow-[0_6px_0_0_#1eb88c,0_10px_20px_rgba(54,212,167,0.3),inset_0_1px_0_rgba(255,255,255,0.25)] hover:translate-y-[-2px] hover:shadow-[0_8px_0_0_#1eb88c,0_14px_24px_rgba(54,212,167,0.35),inset_0_1px_0_rgba(255,255,255,0.25)] active:translate-y-[4px] active:shadow-[0_2px_0_0_#1eb88c,0_4px_10px_rgba(54,212,167,0.25),inset_0_1px_0_rgba(255,255,255,0.25)]' : ''}
            `}
          >
            <action.icon className="w-4 h-4" />
            {action.label}
          </button>
        ))}
      </div>
    </div>
  );
}

function RecentActivity() {
  const allVouchers = useAppStore((s) => s.vouchers);
  const vouchers = allVouchers
    .slice()
    .sort((a, b) => new Date(b.issuedAt).getTime() - new Date(a.issuedAt).getTime())
    .slice(0, 4);

  return (
    <div className="clay-card-cream p-6 h-full relative">
      <div className="absolute top-0 right-0 w-32 h-32 bg-white rounded-bl-[100px] shadow-[inset_0_-4px_12px_rgba(0,0,0,0.03)] opacity-50 pointer-events-none"></div>
      
      <h3 className="text-sm font-black text-[#e63946] mb-6 uppercase tracking-wider relative z-10">Recent Activity</h3>
      
      <div className="space-y-4 relative z-10">
        {vouchers.length === 0 ? (
          <p className="text-sm font-medium text-[#8888a8]">No recent activity</p>
        ) : (
          vouchers.map((v, i) => (
            <div key={v.voucherId} className="flex items-center gap-4 group">
              <div className={`w-10 h-10 rounded-[14px] flex items-center justify-center shadow-inner-clay
                ${v.localStatus === 'SETTLED' ? 'bg-[#36d4a7]/20 text-[#1eb88c]' : 'bg-[#5b8def]/20 text-[#3a6fd4]'}
              `}>
                {v.localStatus === 'SETTLED' ? <CheckCircle2 className="w-5 h-5" /> : <Clock className="w-5 h-5" />}
              </div>
              <div className="flex-1">
                <p className="text-sm font-bold text-[#1a1a2e]">
                  {v.localStatus === 'SETTLED' ? 'Voucher Settled' : 'Voucher Pending'}
                </p>
                <p className="text-xs font-semibold text-[#8888a8]">
                  {formatDistanceToNow(new Date(v.issuedAt))} ago
                </p>
              </div>
              <div className="text-right">
                <p className="text-sm font-black text-[#1a1a2e]">{stroopsToXlm(v.amount)} STR</p>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

export function DashboardPage() {
  const navigate = useNavigate();
  const wallet = useWallet();
  const isOffline = useIsOffline();
  const walletAddress = wallet?.address ?? null;

  useEffect(() => {
    void (async () => {
      const { setVouchers, setChannels } = useAppStore.getState();
      const [vouchers, channels] = await Promise.all([
        VoucherRepo.getAll(),
        ChannelRepo.getAll(),
      ]);
      setVouchers(vouchers);
      setChannels(channels);
    })();
  }, []);

  useEffect(() => {
    if (!walletAddress || isOffline) return;
    const { setBalance, setBalanceLoading } = useAppStore.getState();
    setBalanceLoading(true);
    getAccountBalance(walletAddress)
      .then(setBalance)
      .catch(() => {})
      .finally(() => setBalanceLoading(false));
  }, [walletAddress, isOffline]);

  if (!wallet) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-6 py-20 px-4">
        <div className="clay-card max-w-md w-full p-10 text-center relative overflow-hidden">
           <div className="w-20 h-20 rounded-3xl bg-gradient-to-br from-[#6fa3f7] to-[#5b8def] shadow-clay-blue mx-auto flex items-center justify-center mb-8 relative z-10 hover:animate-bounce-clay cursor-pointer">
             <Zap className="w-10 h-10 text-white" />
           </div>
           <h2 className="text-3xl font-black text-[#1a1a2e] mb-3 tracking-tight">StellarMesh</h2>
           <p className="text-[#4a4a6a] font-medium mb-8 leading-relaxed">
             Connect your Freighter wallet to start making fast, offline, clay-powered payments.
           </p>
           <button onClick={() => navigate('/wallet')} className="btn-clay-red w-full py-4 text-[16px]">
             Connect Wallet
           </button>
        </div>
      </div>
    );
  }

  return (
    <div className="p-8 max-w-6xl mx-auto space-y-8 animate-fade-in relative">
      
      <div className="grid grid-cols-1 md:grid-cols-12 gap-8">
        
        {/* Top left: Wallet */}
        <div className="md:col-span-8">
          <div className="mb-3">
             <span className="swiss-section-title">Wallet Balance</span>
          </div>
          <WalletCard />
        </div>

        {/* Top right: Network */}
        <div className="md:col-span-4">
          <div className="mb-3">
             <span className="swiss-section-title">Network Status</span>
          </div>
          <NetworkStatusCard />
        </div>
      </div>

      <div>
        <div className="mb-3">
             <span className="swiss-section-title">Quick Actions</span>
        </div>
        <QuickActions />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-12 gap-8">
         <div className="md:col-span-8">
            <div className="mb-3">
               <span className="swiss-section-title">Portfolio Overview</span>
            </div>
            <div className="clay-card p-6 h-[250px] flex flex-col items-center justify-center">
               <p className="font-bold text-[#8888a8]">Chart placeholder</p>
            </div>
         </div>
         <div className="md:col-span-4">
            <div className="mb-3 text-right">
               <span className="swiss-section-title text-right w-full block">Recent Activity</span>
            </div>
            <RecentActivity />
         </div>
      </div>
    </div>
  );
}
