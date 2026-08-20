import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from 'react-hot-toast';
import { AppLayout } from './components/layout/AppLayout';
import { DashboardPage } from './pages/DashboardPage';
import { WalletPage } from './pages/WalletPage';
import { PayPage } from './pages/PayPage';
import { ReceivePage } from './pages/ReceivePage';
import { SettlementsPage } from './pages/SettlementsPage';
import { CreateChannelPage } from './pages/CreateChannelPage';
import { ChannelsPage } from './pages/ChannelsPage';
import { ActivityPage } from './pages/ActivityPage';
import { SettingsPage } from './pages/SettingsPage';
import { DocsPage } from './pages/DocsPage';
import { VouchersPage, VoucherDetailPage } from './pages/VouchersPage';
import { LandingPage } from './pages/LandingPage';
import { ErrorBoundary } from './components/ErrorBoundary';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      retry: 2,
      retryDelay: (attempt) => Math.min(1000 * 2 ** attempt, 10_000),
    },
  },
});

export default function App() {
  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <BrowserRouter>
          <Routes>
            {/* Landing page (no sidebar) */}
            <Route path="/landing" element={<LandingPage />} />

            {/* App shell */}
            <Route element={<AppLayout />}>
              <Route path="/" element={<DashboardPage />} />
              <Route path="/wallet" element={<WalletPage />} />
              <Route path="/channels" element={<ChannelsPage />} />
              <Route path="/channels/create" element={<CreateChannelPage />} />
              <Route path="/pay" element={<PayPage />} />
              <Route path="/receive" element={<ReceivePage />} />
              <Route path="/vouchers" element={<VouchersPage />} />
              <Route path="/vouchers/:id" element={<VoucherDetailPage />} />
              <Route path="/settlements" element={<SettlementsPage />} />
              <Route path="/activity" element={<ActivityPage />} />
              <Route path="/settings" element={<SettingsPage />} />
              <Route path="/docs" element={<DocsPage />} />
            </Route>

            {/* Fallback */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </BrowserRouter>

        <Toaster
          position="bottom-right"
          toastOptions={{
            style: {
              background: '#1a1a24',
              color: '#f8fafc',
              border: '1px solid #2a2a3a',
              borderRadius: '12px',
              fontSize: '14px',
            },
            success: { iconTheme: { primary: '#10b981', secondary: '#fff' } },
            error: { iconTheme: { primary: '#ef4444', secondary: '#fff' } },
          }}
        />
      </QueryClientProvider>
    </ErrorBoundary>
  );
}
