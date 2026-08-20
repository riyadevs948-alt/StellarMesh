// ============================================================
// StellarMesh — Wallet Management Page
// Connect/disconnect Freighter, multi-wallet support
// ============================================================
import { useState } from 'react';
import { Wallet, CheckCircle2, AlertCircle, ExternalLink, Copy, Trash2, RefreshCw } from 'lucide-react';
import {
  connectFreighter, getConnectedAddress, buildWalletSession,
} from '../../../packages/stellar-client/src/freighter';
import { getAccountBalance, explorerAccountUrl, fundWithFriendbot } from '../lib/stellar';
import { useAppStore, useWallet } from '../store/app.store';
import { WalletSessionRepo } from '../lib/db';
import { Spinner, ErrorBanner } from '../components/ui';
import { shortenAddress } from '../lib/utils';
import toast from 'react-hot-toast';

export function WalletPage() {
  const wallet = useWallet();
  const setSession = useAppStore((s) => s.setSession);
  const setBalance = useAppStore((s) => s.setBalance);
  const setBalanceLoading = useAppStore((s) => s.setBalanceLoading);
  const disconnect = useAppStore((s) => s.disconnect);

  const [connecting, setConnecting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [funding, setFunding] = useState(false);

  const handleConnect = async () => {
    setConnecting(true);
    setError(null);
    try {
      const { address, networkDetails } = await connectFreighter();
      const session = buildWalletSession(address, networkDetails);
      setSession(session);
      await WalletSessionRepo.save(session);

      // Load balance
      setBalanceLoading(true);
      try {
        const bal = await getAccountBalance(address);
        setBalance(bal);
      } catch {
        setBalance(null);
      } finally {
        setBalanceLoading(false);
      }

      toast.success('Wallet connected');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to connect wallet');
    } finally {
      setConnecting(false);
    }
  };

  const handleDisconnect = async () => {
    if (wallet) {
      await WalletSessionRepo.delete(wallet.id);
    }
    disconnect();
    toast.success('Wallet disconnected');
  };

  const handleFundFriendbot = async () => {
    if (!wallet) return;
    setFunding(true);
    try {
      await fundWithFriendbot(wallet.address);
      toast.success('Account funded! Refreshing balance...');
      const bal = await getAccountBalance(wallet.address);
      setBalance(bal);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Funding failed');
    } finally {
      setFunding(false);
    }
  };

  return (
    <div className="p-6 max-w-xl animate-fade-in">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-text-primary">Wallet</h1>
        <p className="text-text-muted text-sm">Manage your Freighter wallet connection.</p>
      </div>

      {!wallet ? (
        <div className="card text-center py-12">
          <div className="w-16 h-16 rounded-2xl bg-accent-blue/10 border border-accent-blue/20 flex items-center justify-center mx-auto mb-4">
            <Wallet className="w-8 h-8 text-accent-blue" />
          </div>
          <h2 className="text-lg font-semibold mb-2">Connect Freighter</h2>
          <p className="text-text-muted text-sm mb-6 max-w-xs mx-auto">
            StellarMesh uses Freighter wallet for signing transactions on Stellar Testnet.
          </p>
          {error && <ErrorBanner message={error} className="mb-4 text-left" />}
          <button onClick={handleConnect} disabled={connecting} className="btn-primary px-8 py-3">
            {connecting ? <><Spinner className="w-4 h-4" /> Connecting...</> : 'Connect Freighter'}
          </button>
          <p className="text-xs text-text-muted mt-4">
            Don't have Freighter?{' '}
            <a href="https://freighter.app" target="_blank" rel="noopener noreferrer" className="text-accent-blue hover:underline">
              Install it here
            </a>
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {/* Connected wallet card */}
          <div className="card border-accent-green/20">
            <div className="flex items-center gap-2 mb-4">
              <CheckCircle2 className="w-4 h-4 text-accent-green" />
              <span className="text-sm font-medium text-accent-green">Connected</span>
            </div>

            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-accent-blue to-accent-cyan flex items-center justify-center font-bold text-white">
                {wallet.address.slice(1, 3)}
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-mono text-sm text-text-primary truncate">{wallet.address}</p>
                <p className="text-xs text-text-muted">{wallet.network}</p>
              </div>
            </div>

            <div className="flex gap-2 flex-wrap">
              <button onClick={() => navigator.clipboard.writeText(wallet.address)} className="btn-ghost text-xs">
                <Copy className="w-3.5 h-3.5" /> Copy Address
              </button>
              <a
                href={explorerAccountUrl(wallet.address)}
                target="_blank"
                rel="noopener noreferrer"
                className="btn-ghost text-xs"
              >
                <ExternalLink className="w-3.5 h-3.5" /> View on Explorer
              </a>
              <button onClick={handleFundFriendbot} disabled={funding} className="btn-ghost text-xs">
                {funding ? <Spinner className="w-3.5 h-3.5" /> : <RefreshCw className="w-3.5 h-3.5" />}
                Fund via Friendbot
              </button>
            </div>
          </div>

          {/* Network info */}
          <div className="card">
            <h3 className="text-sm font-semibold mb-3">Network</h3>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-text-muted">Network</span>
                <span className="text-text-primary uppercase">{wallet.network}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-text-muted">Passphrase</span>
                <span className="text-text-secondary font-mono text-xs truncate max-w-40">{wallet.networkPassphrase.slice(0, 20)}...</span>
              </div>
              <div className="flex justify-between">
                <span className="text-text-muted">Connected at</span>
                <span className="text-text-secondary text-xs">{new Date(wallet.connectedAt).toLocaleString()}</span>
              </div>
            </div>
          </div>

          {/* Disconnect */}
          <button onClick={handleDisconnect} className="btn-danger w-full">
            <Trash2 className="w-4 h-4" /> Disconnect Wallet
          </button>
        </div>
      )}
    </div>
  );
}
