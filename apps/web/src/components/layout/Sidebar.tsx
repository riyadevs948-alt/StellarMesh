// ============================================================
// StellarMesh — Sidebar Navigation (matches reference design)
// ============================================================
import { NavLink, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard, Zap, CreditCard, Activity,
  Settings, HelpCircle, Wifi, WifiOff, Loader2,
  ChevronRight,
} from 'lucide-react';
import clsx from 'clsx';
import { useAppStore, useIsOffline, useWallet } from '../store/app.store';

const NAV_ITEMS = [
  { to: '/', label: 'Dashboard', icon: LayoutDashboard, exact: true },
  { to: '/channels', label: 'Channels', icon: Zap },
  { to: '/pay', label: 'Payments', icon: CreditCard },
  { to: '/activity', label: 'Activity', icon: Activity },
] as const;

const BOTTOM_ITEMS = [
  { to: '/settings', label: 'Settings', icon: Settings },
  { to: '/docs', label: 'Support', icon: HelpCircle },
] as const;

function NetworkIndicator() {
  const networkState = useAppStore((s) => s.state);
  const isOffline = useIsOffline();

  return (
    <div className={clsx(
      'flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium',
      isOffline
        ? 'bg-accent-yellow/10 text-accent-yellow border border-accent-yellow/20'
        : networkState === 'ONLINE'
        ? 'bg-accent-green/10 text-accent-green'
        : 'bg-text-muted/10 text-text-muted'
    )}>
      {isOffline ? (
        <WifiOff className="w-3.5 h-3.5" />
      ) : networkState === 'RECONNECTING' || networkState === 'SYNCING' ? (
        <Loader2 className="w-3.5 h-3.5 animate-spin" />
      ) : (
        <Wifi className="w-3.5 h-3.5" />
      )}
      <span className="uppercase tracking-wider">
        {isOffline ? 'Offline' : networkState}
      </span>
    </div>
  );
}

export function Sidebar() {
  const wallet = useWallet();
  const navigate = useNavigate();

  const shortAddr = wallet?.address
    ? `${wallet.address.slice(0, 4)}...${wallet.address.slice(-4)}`
    : null;

  return (
    <aside className="w-56 bg-bg-secondary border-r border-border-subtle flex flex-col h-screen sticky top-0 overflow-hidden shrink-0">
      {/* Logo */}
      <div className="px-4 py-5 border-b border-border-subtle">
        <span className="text-lg font-bold text-text-primary tracking-tight">
          Stellar<span className="text-accent-blue">Mesh</span>
        </span>
      </div>

      {/* Wallet card */}
      {wallet ? (
        <div className="mx-3 mt-3 p-3 bg-bg-tertiary rounded-xl border border-border-subtle">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-7 h-7 rounded-full bg-gradient-to-br from-accent-blue to-accent-cyan flex items-center justify-center text-white text-xs font-bold">
              {wallet.address.slice(1, 3)}
            </div>
            <div className="min-w-0">
              <p className="text-xs font-medium text-text-primary truncate">Connected Wallet</p>
              <p className="text-[11px] text-text-muted font-mono">{shortAddr}</p>
            </div>
          </div>
          <NetworkIndicator />
        </div>
      ) : (
        <div className="mx-3 mt-3 p-3 bg-bg-tertiary rounded-xl border border-border-subtle">
          <p className="text-xs text-text-muted mb-2">No wallet connected</p>
          <button
            onClick={() => navigate('/wallet')}
            className="btn-primary w-full text-xs py-2"
          >
            Connect Wallet
          </button>
        </div>
      )}

      {/* Main nav */}
      <nav className="flex-1 px-2 py-3 space-y-0.5 overflow-y-auto no-scrollbar">
        {NAV_ITEMS.map(({ to, label, icon: Icon, exact }) => (
          <NavLink
            key={to}
            to={to}
            end={exact}
            className={({ isActive }) =>
              clsx('sidebar-link', isActive && 'active')
            }
          >
            <Icon className="w-4 h-4 shrink-0" />
            {label}
          </NavLink>
        ))}
      </nav>

      {/* CTA */}
      <div className="px-3 pb-3">
        <button
          onClick={() => navigate('/pay')}
          className="btn-primary w-full text-sm"
        >
          Create Offline Payment
        </button>
      </div>

      {/* Bottom nav */}
      <div className="px-2 pb-4 space-y-0.5 border-t border-border-subtle pt-3">
        {BOTTOM_ITEMS.map(({ to, label, icon: Icon }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) =>
              clsx('sidebar-link', isActive && 'active')
            }
          >
            <Icon className="w-4 h-4 shrink-0" />
            {label}
          </NavLink>
        ))}
      </div>
    </aside>
  );
}
