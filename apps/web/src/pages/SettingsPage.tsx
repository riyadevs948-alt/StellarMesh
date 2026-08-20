import { useAppStore } from '../store/app.store';
import { Wifi, WifiOff } from 'lucide-react';
import toast from 'react-hot-toast';

export function SettingsPage() {
  const isSimulatingOffline = useAppStore((s) => s.isSimulatingOffline);
  const setSimulatingOffline = useAppStore((s) => s.setSimulatingOffline);

  const toggle = () => {
    const next = !isSimulatingOffline;
    setSimulatingOffline(next);
    toast(next ? '🔌 Offline simulation ON — payments will not settle until toggled off' : '🌐 Back online — settlement engine will resume', { duration: 4000 });
  };

  return (
    <div className="p-6 max-w-xl animate-fade-in">
      <h1 className="text-2xl font-bold mb-6">Settings</h1>
      <div className="card">
        <h3 className="text-sm font-semibold mb-4">Demo / Testnet Controls</h3>
        <div className="flex items-center justify-between py-3 border-b border-border-subtle">
          <div>
            <p className="text-sm font-medium text-text-primary">Simulate Offline Mode</p>
            <p className="text-xs text-text-muted mt-0.5">
              Temporarily put the app into offline mode for demo purposes.
              <br />
              <span className="text-accent-yellow">This is application-level simulation — Stellar network is not actually disconnected.</span>
            </p>
          </div>
          <button
            onClick={toggle}
            className={`relative w-12 h-6 rounded-full transition-colors ${isSimulatingOffline ? 'bg-accent-yellow' : 'bg-border-medium'}`}
            aria-label="Toggle offline simulation"
          >
            <span className={`absolute top-1 w-4 h-4 rounded-full bg-white shadow transition-transform ${isSimulatingOffline ? 'translate-x-7' : 'translate-x-1'}`} />
          </button>
        </div>
        <p className="text-xs text-text-muted mt-4">
          Network: <span className="text-text-primary">{import.meta.env['VITE_STELLAR_NETWORK'] ?? 'testnet'}</span><br />
          RPC: <span className="text-text-primary font-mono text-[11px]">{import.meta.env['VITE_STELLAR_RPC_URL'] ?? 'https://soroban-testnet.stellar.org'}</span>
        </p>
      </div>
    </div>
  );
}
