// ============================================================
// Veyra — Sidebar (Swiss × Claymorphism)
// ============================================================
import { NavLink, Link } from 'react-router-dom';
import {
  LayoutDashboard, Wallet, Zap, QrCode, Activity,
  Settings, BookOpen, ArrowLeftRight, ChevronRight,
} from 'lucide-react';

const nav = [
  { to: '/dashboard',            label: 'Dashboard',  icon: LayoutDashboard },
  { to: '/wallet',      label: 'Wallet',     icon: Wallet },
  { to: '/channels',    label: 'Channels',   icon: ArrowLeftRight },
  { to: '/pay',         label: 'Payments',   icon: Zap },
  { to: '/receive',     label: 'Receive',    icon: QrCode },
  { to: '/activity',    label: 'Activity',   icon: Activity },
];

const bottom = [
  { to: '/settings', label: 'Settings', icon: Settings },
  { to: '/docs',     label: 'Support',  icon: BookOpen },
];

export function Sidebar({ onClose }: { onClose?: () => void }) {
  return (
    <aside
      className="w-[240px] shrink-0 flex flex-col py-6 px-4 h-full overflow-y-auto no-scrollbar"
      style={{
        background: 'linear-gradient(180deg, rgba(255,255,255,0.85) 0%, rgba(243,240,255,0.85) 100%)',
        backdropFilter: 'blur(20px)',
        borderRight: '2px solid rgba(196,181,253,0.3)',
        boxShadow: '4px 0 24px rgba(0,0,0,0.04)',
      }}
    >
      {/* Logo */}
      <Link to="/" onClick={onClose} className="flex items-center gap-2.5 px-2 mb-8 cursor-pointer hover:opacity-80 transition-opacity block w-max">
        <div className="w-9 h-9 rounded-xl flex items-center justify-center overflow-hidden bg-white shadow-sm border border-[#e5e7eb]">
          <img src="/logo.jpg" alt="Veyra Logo" className="w-full h-full object-cover" />
        </div>
        <div>
          <span className="font-black text-[15px] text-[#1a1a2e] tracking-tight">Veyra</span>
        </div>
      </Link>

      {/* Swiss section rule */}
      <div className="px-2 mb-4">
        <div className="swiss-section-title mb-2">Menu</div>
        <div className="swiss-grid-line" />
      </div>

      {/* Navigation */}
      <nav className="flex flex-col gap-1 flex-1">
        {nav.map(({ to, label, icon: Icon }) => (
          <NavLink
            key={to}
            to={to}
            end={to === '/dashboard'}
            onClick={onClose}
            className={({ isActive }) =>
              `sidebar-link ${isActive ? 'active' : ''}`
            }
          >
            <Icon className="w-4 h-4 shrink-0" />
            <span className="flex-1">{label}</span>
            <ChevronRight className="w-3 h-3 opacity-40" />
          </NavLink>
        ))}
      </nav>

      {/* Bottom links */}
      <div className="pt-4 border-t-2 border-[#ddd6fe] flex flex-col gap-1">
        {bottom.map(({ to, label, icon: Icon }) => (
          <NavLink
            key={to}
            to={to}
            onClick={onClose}
            className={({ isActive }) =>
              `sidebar-link ${isActive ? 'active' : ''}`
            }
          >
            <Icon className="w-4 h-4 shrink-0" />
            <span>{label}</span>
          </NavLink>
        ))}
      </div>

      {/* Create Offline Payment CTA */}
      <div className="mt-4 px-1">
        <NavLink to="/pay">
          <button className="btn-clay-red w-full text-sm py-3 px-4">
            <Zap className="w-4 h-4" />
            Create Offline Payment
          </button>
        </NavLink>
      </div>
    </aside>
  );
}
