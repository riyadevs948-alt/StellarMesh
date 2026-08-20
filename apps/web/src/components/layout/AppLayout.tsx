// ============================================================
// StellarMesh — App Layout Shell
// ============================================================
import { Outlet } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { TopBar } from './TopBar';
import { useNetworkMonitor } from '../../hooks/useNetworkMonitor';
import { useWalletInit } from '../../hooks/useWalletInit';

export function AppLayout() {
  useNetworkMonitor();
  useWalletInit(); // Restore wallet session + start settlement engine

  return (
    <div className="flex h-screen bg-bg-primary overflow-hidden">
      <Sidebar />
      <main className="flex-1 flex flex-col overflow-hidden">
        <TopBar />
        <div className="flex-1 overflow-y-auto">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
